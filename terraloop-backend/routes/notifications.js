'use strict';

const express = require('express');
const { getDb } = require('../firebase');
const router = express.Router();

/**
 * GET /api/notifications
 * Returns notifications for a user, newest first.
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const db = getDb();

    const snapshot = await db.collection('notifications').where('userId', '==', userId).get();
    const notifications = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ notifications });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notifications (internal — used by background jobs)
 * Create a new notification for a user.
 */
router.post('/', async (req, res, next) => {
  try {
    const { userId, dot, message, type } = req.body;
    if (!userId || !message) return res.status(400).json({ error: 'userId and message are required' });

    const db = getDb();
    const notif = {
      userId, dot: dot || 'green', message, type: type || 'info',
      read: false, createdAt: new Date().toISOString()
    };

    const ref = await db.collection('notifications').add(notif);
    res.status(201).json({ success: true, notification: { ...notif, id: ref.id } });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read.
 */
router.patch('/:id/read', async (req, res, next) => {
  try {
    const db = getDb();
    await db.collection('notifications').doc(req.params.id).update({ read: true });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
