'use strict';

const express = require('express');
const multer = require('multer');
const { classifyImage, classifyText, getMaterialData } = require('../services/classifierService');
const { lookupFacilities } = require('../services/facilityService');
const { getDb } = require('../firebase');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * POST /api/scan
 * Accepts: { image: "<base64>" } OR { description: "empty plastic bottle" }
 * Returns: material data + profile-filtered recommendations
 */
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';

    // Fetch user profile from DB for context-aware recommendations
    let userProfile = {};
    try {
      const db = getDb();
      const doc = await db.collection('users').doc(userId).get();
      if (doc.exists) userProfile = doc.data();
    } catch (e) {
      // Profile fetch failure is non-fatal — proceed with defaults
    }

    let materialKey;

    if (req.file) {
      // Image upload — base64 encode and send to Vision API
      const base64 = req.file.buffer.toString('base64');
      materialKey = await classifyImage(base64);
    } else if (req.body.image) {
      // Base64 string in JSON body
      materialKey = await classifyImage(req.body.image);
    } else if (req.body.description) {
      // Text description
      materialKey = classifyText(req.body.description);
    } else {
      return res.status(400).json({ error: 'Provide either "image" (base64) or "description" (text)' });
    }

    const materialData = getMaterialData(materialKey, userProfile);

    // If fallback item — do facility lookup inline
    if (materialData.fallback) {
      const facilityResult = lookupFacilities(userProfile.pincode, materialData.fallbackType);
      return res.json({
        ...materialData,
        facilityLookup: facilityResult
      });
    }

    res.json(materialData);

  } catch (err) {
    next(err);
  }
});

module.exports = router;
