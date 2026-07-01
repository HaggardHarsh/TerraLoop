'use strict';

const facilitiesDb = require('../data/facilities.json');

/**
 * Look up disposal facilities for a given material type and pincode.
 * Strategy:
 *   1. Exact pincode match
 *   2. Same pincode prefix (first 3 digits) — same city/region
 *   3. DEFAULT fallback
 */
function lookupFacilities(pincode, materialType) {
  const typeData = facilitiesDb[materialType] || facilitiesDb['DEFAULT'] || {};
  const pin = String(pincode || '').trim();

  // 1. Exact match
  if (typeData[pin]) return { found: true, facilities: typeData[pin] };

  // 2. City-level match (3-digit prefix)
  const prefix = pin.slice(0, 3);
  const cityMatch = Object.entries(typeData).find(([key]) =>
    key !== 'DEFAULT' && key.startsWith(prefix)
  );
  if (cityMatch) return { found: true, facilities: cityMatch[1] };

  // 3. Default
  if (typeData['DEFAULT'] && typeData['DEFAULT'].length > 0) {
    return { found: true, facilities: typeData['DEFAULT'] };
  }

  return { found: false, facilities: [] };
}

/**
 * Check all material types for a given pincode.
 * Used for proactive Digital Garage notifications.
 */
function checkAreaFacilities(pincode) {
  const results = {};
  const types = Object.keys(facilitiesDb);
  for (const type of types) {
    results[type] = lookupFacilities(pincode, type);
  }
  return results;
}

module.exports = { lookupFacilities, checkAreaFacilities };
