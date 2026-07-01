'use strict';

const fetch = require('node-fetch');
const materials = require('../data/materials.json');

// ── Vision API labels → material key mapping ──
const LABEL_MAP = [
  { keywords: ['plastic bottle', 'bottle', 'pet', 'polyethylene'], material: 'pet_plastic' },
  { keywords: ['cardboard', 'corrugated', 'box', 'carton'], material: 'cardboard' },
  { keywords: ['glass', 'jar', 'bottle', 'vial'], material: 'glass' },
  { keywords: ['electronic', 'laptop', 'computer', 'phone', 'circuit', 'cable', 'device', 'battery', 'charger'], material: 'ewaste' },
  { keywords: ['hazardous', 'chemical', 'paint', 'solvent', 'pesticide', 'aerosol'], material: 'hazardous' },
  { keywords: ['paper', 'newspaper', 'magazine', 'document'], material: 'paper' },
  { keywords: ['can', 'tin', 'aluminium', 'aluminum', 'steel', 'metal'], material: 'metal' },
  { keywords: ['fabric', 'cloth', 'textile', 'clothing', 'shirt', 'jeans', 'denim'], material: 'textile' },
];

// ── Text description → material key mapping ──
const TEXT_MAP = [
  { keywords: ['plastic bottle', 'pet bottle', 'water bottle', 'soda bottle', '2l', 'plastic'], material: 'pet_plastic' },
  { keywords: ['cardboard', 'card box', 'carton', 'box', 'corrugated'], material: 'cardboard' },
  { keywords: ['glass jar', 'jar', 'glass bottle', 'glass'], material: 'glass' },
  { keywords: ['laptop', 'phone', 'e-waste', 'ewaste', 'electronic', 'computer', 'tablet', 'cable', 'charger', 'battery'], material: 'ewaste' },
  { keywords: ['hazardous', 'chemical', 'paint', 'solvent', 'pesticide', 'aerosol', 'motor oil'], material: 'hazardous' },
  { keywords: ['paper', 'newspaper', 'magazine', 'document', 'leaflet'], material: 'paper' },
  { keywords: ['can', 'tin', 'aluminium', 'aluminum', 'metal', 'steel'], material: 'metal' },
  { keywords: ['fabric', 'cloth', 'textile', 'clothing', 'shirt', 'jeans', 'denim', 'clothes'], material: 'textile' },
];

/**
 * Classify an image using Google Cloud Vision API.
 * Falls back to a mock classifier if VISION_API_KEY is not set.
 */
async function classifyImage(base64Image) {
  const apiKey = process.env.VISION_API_KEY;

  if (!apiKey) {
    console.log('   ℹ️  Vision API key not set — using mock classifier');
    return mockImageClassify();
  }

  try {
    const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
    const body = {
      requests: [{
        image: { content: base64Image },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 15 },
          { type: 'OBJECT_LOCALIZATION', maxResults: 5 }
        ]
      }]
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`Vision API error: ${res.status}`);

    const data = await res.json();
    const labels = (data.responses?.[0]?.labelAnnotations || []).map(l => l.description.toLowerCase());
    const objects = (data.responses?.[0]?.localizedObjectAnnotations || []).map(o => o.name.toLowerCase());
    const allTerms = [...labels, ...objects];

    return matchMaterialFromTerms(allTerms, LABEL_MAP);

  } catch (err) {
    console.error('Vision API error:', err.message, '— falling back to mock');
    return mockImageClassify();
  }
}

/**
 * Classify from a text description.
 */
function classifyText(description) {
  const lower = description.toLowerCase();
  return matchMaterialFromTerms([lower], TEXT_MAP);
}

function matchMaterialFromTerms(terms, map) {
  for (const entry of map) {
    for (const keyword of entry.keywords) {
      if (terms.some(t => t.includes(keyword))) {
        return entry.material;
      }
    }
  }
  return 'pet_plastic'; // default fallback
}

function mockImageClassify() {
  const keys = Object.keys(materials);
  // Cycle through non-hazardous materials for a realistic demo
  const safeKeys = keys.filter(k => !['hazardous'].includes(k));
  return safeKeys[Math.floor(Math.random() * safeKeys.length)];
}

/**
 * Get material data and filter/rank recommendations based on user profile.
 */
function getMaterialData(materialKey, userProfile) {
  const mat = materials[materialKey] || materials['pet_plastic'];

  if (!mat.recommendations) {
    return { ...mat };
  }

  const userTools = userProfile?.tools || [];
  const userGreenSpace = userProfile?.greenSpace || 'none';
  const hasCompost = userProfile?.compostAvailable || false;

  // Filter and score recommendations
  const scoredRecs = mat.recommendations.map(rec => {
    let score = 100;

    // Boost if user has all required tools
    const toolMatch = (rec.tools || []).every(t => userTools.includes(t));
    if (!toolMatch) score -= 20;

    // Hide composting recs if user has no compost
    if (rec.requiredCompost && !hasCompost) score -= 50;

    // Hide garden-space recs if user has none
    if (rec.requiredGreenSpace && !rec.requiredGreenSpace.includes(userGreenSpace)) score -= 30;

    return { ...rec, score, toolMatch };
  });

  const filtered = scoredRecs
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return { ...mat, recommendations: filtered };
}

module.exports = { classifyImage, classifyText, getMaterialData };
