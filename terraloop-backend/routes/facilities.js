'use strict';

const express = require('express');
const { lookupFacilities } = require('../services/facilityService');
const router = express.Router();

/**
 * GET /api/facilities
 * Query: ?pincode=110001&type=ewaste
 * Returns nearby facilities for the given material type — no map, plain data.
 */
router.get('/', (req, res) => {
  const { pincode, type } = req.query;

  if (!pincode) return res.status(400).json({ error: 'pincode query parameter is required' });
  if (!type) return res.status(400).json({ error: 'type query parameter is required (e.g. ewaste, hazardous)' });

  const result = lookupFacilities(pincode, type);

  res.json({
    pincode,
    materialType: type,
    ...result
  });
});

module.exports = router;
