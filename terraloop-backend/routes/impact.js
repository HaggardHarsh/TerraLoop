'use strict';

const express = require('express');
const { getDb } = require('../firebase');
const router = express.Router();

/**
 * GET /api/impact/summary
 * Returns CO2 saved, items diverted, projects made, and streak for a user.
 */
router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const db = getDb();

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? (userDoc.data() || {}) : {};

    // Count garage items resolved = items diverted
    const garageSnap = await db.collection('garageItems').where('userId', '==', userId).get();
    const garageItems = garageSnap.docs.map(d => d.data());
    const itemsDiverted = garageItems.length;

    // Count posts = projects made
    const postsSnap = await db.collection('posts').where('userId', '==', userId).get();
    const posts = postsSnap.docs.map(d => d.data());
    const projectsMade = posts.length;

    // CO2 = sum of co2Saved from all posts
    const totalCo2 = posts.reduce((sum, p) => sum + (parseFloat(p.co2Saved) || 0), 0);

    res.json({
      co2Saved: parseFloat(totalCo2.toFixed(2)),
      itemsDiverted,
      projectsMade,
      streak: userData.streak || 0
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/impact/activity
 * Chronological log of scans, posts, and disposal events.
 */
router.get('/activity', async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const db = getDb();

    const [postsSnap, garageSnap] = await Promise.all([
      db.collection('posts').where('userId', '==', userId).get(),
      db.collection('garageItems').where('userId', '==', userId).get()
    ]);

    const events = [];

    postsSnap.docs.forEach(doc => {
      const d = doc.data();
      events.push({
        id: doc.id,
        icon: '🌱',
        action: `Posted "${d.title}"`,
        time: d.createdAt,
        tag: `${d.co2Saved ? d.co2Saved + ' kg CO₂' : '1 project'} saved`
      });
    });

    garageSnap.docs.forEach(doc => {
      const d = doc.data();
      events.push({
        id: doc.id,
        icon: '🔍',
        action: `Logged "${d.name}" to Garage`,
        time: d.createdAt,
        tag: '1 item tracked'
      });
    });

    events.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json({ events });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/impact/contributions
 * Per-project contribution cards (what each post saved).
 */
router.get('/contributions', async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const db = getDb();

    const postsSnap = await db.collection('posts').where('userId', '==', userId).get();
    const contributions = postsSnap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        title: d.title,
        co2: `${d.co2Saved || 0} kg CO₂ saved`,
        items: `1 ${d.sourceMaterial || 'item'} diverted`,
        material: d.sourceMaterial || 'Mixed',
        date: d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent'
      };
    });

    contributions.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ contributions });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/impact/materials
 * Breakdown of materials the user has handled.
 */
router.get('/materials', async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const db = getDb();

    const [garageSnap, postsSnap] = await Promise.all([
      db.collection('garageItems').where('userId', '==', userId).get(),
      db.collection('posts').where('userId', '==', userId).get()
    ]);

    const counts = {};
    const addMaterial = (m) => { counts[m] = (counts[m] || 0) + 1; };

    garageSnap.docs.forEach(d => addMaterial(d.data().material || 'Unknown'));
    postsSnap.docs.forEach(d => addMaterial(d.data().sourceMaterial || 'Unknown'));

    const maxCount = Math.max(...Object.values(counts), 1);
    const bars = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({
        label,
        count: `${count} item${count !== 1 ? 's' : ''}`,
        pct: Math.round((count / maxCount) * 100)
      }));

    res.json({ bars });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
