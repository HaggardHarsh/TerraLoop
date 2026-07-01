'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../firebase');
const router = express.Router();

/**
 * GET /api/garage
 * List all pending garage items for a user.
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const db = getDb();

    const snapshot = await db.collection('garageItems')
      .where('userId', '==', userId)
      .get();

    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort by createdAt descending
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ items, count: items.length });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/garage
 * Add a new item to the digital garage (triggered when no reuse path found).
 */
router.post('/', async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const { icon, name, material, grade, tags, instructions, fallbackType } = req.body;

    if (!name) return res.status(400).json({ error: 'name is required' });

    const db = getDb();
    const item = {
      userId,
      id: uuidv4(),
      icon: icon || '📦',
      name,
      material: material || name,
      grade: grade || '',
      tags: tags || [],
      instructions: instructions || 'Store safely until a facility is found.',
      fallbackType: fallbackType || 'ewaste',
      status: 'pending',
      statusLabel: 'Awaiting Disposal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const ref = await db.collection('garageItems').add(item);
    res.status(201).json({ success: true, item: { ...item, id: ref.id } });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/garage/:id
 * Update an item's status (e.g. resolved, alert).
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { status, statusLabel } = req.body;
    const db = getDb();

    await db.collection('garageItems').doc(req.params.id).update({
      status, statusLabel, updatedAt: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/garage/:id
 * Remove a resolved item from the garage.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const db = getDb();
    await db.collection('garageItems').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
