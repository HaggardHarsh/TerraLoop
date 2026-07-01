'use strict';

const express = require('express');
const { getDb } = require('../firebase');
const router = express.Router();

/**
 * POST /api/user/profile
 * Create or update a user profile.
 * Body: { userId, housing, pincode, greenSpace, bins, compostAvailable, pickupDays, tools, demographic }
 */
router.post('/profile', async (req, res, next) => {
  try {
    const {
      userId, housing, pincode, greenSpace,
      bins, compostAvailable, pickupDays, tools, demographic, fcmToken
    } = req.body;

    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const db = getDb();
    const profile = {
      userId, housing, pincode, greenSpace,
      bins: Number(bins) || 2,
      compostAvailable: Boolean(compostAvailable),
      pickupDays: pickupDays || [],
      tools: tools || [],
      demographic: demographic || 'adult',
      fcmToken: fcmToken || null,
      updatedAt: new Date().toISOString()
    };

    await db.collection('users').doc(userId).set(profile, { merge: true });

    res.status(201).json({ success: true, profile });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/user/:id
 * Fetch a user's profile.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const db = getDb();
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });
    res.json(doc.data());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
