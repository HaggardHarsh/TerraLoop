'use strict';

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { getDb, getStorage, getIsFirebaseReady } = require('../firebase');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

/**
 * GET /api/posts
 * Fetch community posts, optionally filtered/searched.
 * Query params: ?q=search&type=creative|quick|functional&limit=20
 */
router.get('/', async (req, res, next) => {
  try {
    const { q, type, limit = 20 } = req.query;
    const userId = req.headers['x-user-id'];
    const db = getDb();

    let snapshot;
    if (type) {
      snapshot = await db.collection('posts').where('type', '==', type).get();
    } else {
      snapshot = await db.collection('posts').orderBy('createdAt').get();
    }

    let posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Text search (client-side filter — in production, use Algolia or Firestore full-text)
    if (q) {
      const lower = q.toLowerCase();
      posts = posts.filter(p =>
        p.title?.toLowerCase().includes(lower) ||
        p.sourceMaterial?.toLowerCase().includes(lower) ||
        p.type?.includes(lower)
      );
    }

    // Sort by likes descending, newest first as tiebreaker
    posts.sort((a, b) => (b.likes || 0) - (a.likes || 0) || new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ posts: posts.slice(0, Number(limit)), total: posts.length });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/posts
 * Create a new community post.
 * Multipart: image file + JSON fields in body
 */
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const { title, type, time, tools, sourceMaterial, description, co2Saved } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });

    let imageUrl = null;

    if (req.file && getIsFirebaseReady()) {
      // Upload to Firebase Storage
      const bucket = getStorage();
      if (bucket) {
        const filename = `posts/${uuidv4()}_${req.file.originalname}`;
        const fileRef = bucket.file(filename);
        await fileRef.save(req.file.buffer, { contentType: req.file.mimetype, public: true });
        imageUrl = `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${filename}`;
      }
    }

    const db = getDb();
    const now = new Date().toISOString();

    const post = {
      userId,
      title,
      type: type || 'creative',
      time: time || '',
      tools: typeof tools === 'string' ? JSON.parse(tools) : (tools || []),
      sourceMaterial: sourceMaterial || '',
      description: description || '',
      co2Saved: parseFloat(co2Saved) || 0,
      imageUrl,
      likes: 0,
      saves: 0,
      likedBy: [],
      isReel: false,
      createdAt: now,
      updatedAt: now
    };

    const ref = await db.collection('posts').add(post);

    // Update user's impact stats
    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const current = userDoc.exists ? (userDoc.data() || {}) : {};
      await userRef.set({
        projectsCompleted: (current.projectsCompleted || 0) + 1,
        totalCo2Saved: ((current.totalCo2Saved || 0) + (parseFloat(co2Saved) || 0)).toFixed(2)
      }, { merge: true });
    } catch (e) { /* non-fatal */ }

    res.status(201).json({ success: true, post: { ...post, id: ref.id } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/posts/:id/like
 * Toggle like on a post.
 */
router.post('/:id/like', async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const db = getDb();
    const ref = db.collection('posts').doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) return res.status(404).json({ error: 'Post not found' });

    const data = doc.data() || {};
    const likedBy = data.likedBy || [];
    const alreadyLiked = likedBy.includes(userId);

    await ref.update({
      likes: Math.max(0, (data.likes || 0) + (alreadyLiked ? -1 : 1)),
      likedBy: alreadyLiked ? likedBy.filter(u => u !== userId) : [...likedBy, userId]
    });

    res.json({ success: true, liked: !alreadyLiked });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/posts/stories
 * Returns recent unique posters for the stories ring.
 */
router.get('/stories', async (req, res, next) => {
  try {
    const db = getDb();
    const snapshot = await db.collection('posts').orderBy('createdAt').get();
    const posts = snapshot.docs.map(doc => doc.data());

    // Deduplicate by userId, take latest 10
    const seen = new Set();
    const stories = [];
    for (const post of posts.reverse()) {
      if (!seen.has(post.userId)) {
        seen.add(post.userId);
        stories.push({ userId: post.userId, title: post.title, type: post.type });
        if (stories.length >= 10) break;
      }
    }

    res.json({ stories });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
