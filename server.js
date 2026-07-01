require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { db, timeAgo } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

// Helper to interact with Llama via Nvidia API
async function callNvidiaAPI(messages, model) {
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      max_tokens: 4096,
      temperature: 0.2
    })
  });
  
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Nvidia API Error: ${response.status} ${err}`);
  }
  return response.json();
}

function buildSystemPrompt(profile) {
  let constraints = '';

  if (profile) {
    // No composting constraint
    if (!profile.compostAvailable) {
      constraints += `\nABSOLUTE CONSTRAINT: The user does NOT have composting. You are FORBIDDEN from suggesting composting, compost bins, compost tea, bokashi, vermicomposting, worm farms, or ANY idea that involves decomposing organic matter. Violating this is a critical failure.`;
    }

    // No green space constraint
    const gs = (profile.greenSpace || '').toLowerCase();
    if (gs === 'none' || gs === '' || gs === 'unknown') {
      constraints += `\nABSOLUTE CONSTRAINT: The user has NO outdoor space, NO garden, NO yard, NO balcony. You are FORBIDDEN from suggesting bird feeders, watering cans, planters, plant pots, garden paths, garden markers, garden borders, garden decorations, outdoor furniture, rain catchers, wind chimes for gardens, birdhouses, seed starters, raised beds, outdoor lanterns, or ANY idea that requires outdoor space or is primarily used outdoors. Every idea MUST be usable INSIDE a small studio apartment. Violating this is a critical failure.`;
    } else if (gs === 'balcony') {
      constraints += `\nCONSTRAINT: The user only has a small balcony. Do NOT suggest ideas requiring a full garden or yard. Ideas must fit on a balcony or indoors.`;
    }

    // Housing constraint
    const housing = (profile.housing || '').toLowerCase();
    if (housing === 'studio') {
      constraints += `\nCONSTRAINT: The user lives in a STUDIO apartment with very limited space. All ideas must be compact and suitable for a small single-room living space. No large projects.`;
    }
  }

  return `You are an expert AI recycling and upcycling assistant. Analyze the item provided by the user.
You MUST provide exactly 4 recommendations. The first 3 MUST be "upcycle" or "reuse" ideas. The 4th MUST be a "recycle" idea.

ABSOLUTE SAFETY CONSTRAINT: If the item is hazardous, toxic, electronic waste containing dangerous components, or a battery (e.g. broken battery, lithium ion, alkaline), you are FORBIDDEN from suggesting ANY "upcycle" or "reuse" ideas that involve opening, cutting, puncturing, or manipulating the dangerous components. For such items, ALL 4 recommendations MUST be "recycle" or "safe disposal" focused. Do NOT suggest making jewelry or lamps out of broken batteries. Safety is paramount.

CRITICAL RULE: For safe items, give HIGHEST priority to creative "upcycle" or "reuse" ideas for the first 3. 
CRITICAL RULE: AVOID cliché and overused upcycle ideas like "planters", "vases", "pen/pencil holders", "storage boxes", or "storage containers". You are FORBIDDEN from suggesting "planters" or "storage" in your upcycle ideas. Instead, provide highly creative, unique, practical, and unusual upcycle ideas (e.g., woven baskets, phone amplifiers, jewelry, lampshades, puzzle toys, wall art, loom tools, cleaning gadgets). Think outside the box!
CRITICAL RULE: For the "recycle" or disposal ideas, check the user's profile context. If they use a municipal corp/pick-up service (e.g. have pickup days), tell them how to store it safely until pickup. If they have no pickup service, advise if there's a recycling center nearby and how to prepare it.
CRITICAL RULE: The ideas MUST be influenced by the user's questionnaire profile (e.g. tools they have, living space).
${constraints}

Return ONLY a valid JSON object in this exact format, with no markdown formatting or other text:
{
  "item": "Name of the item",
  "material": "Material type",
  "recyclable": true or false,
  "recommendations": [
    {
      "type": "upcycle", // or "reuse", or "recycle"
      "typeLabel": "Upcycle", 
      "title": "Creative Title of the Idea",
      "desc": "A short summary of what to do.",
      "tools": ["scissors"], // Tools required
      "effort": 60, // Estimated effort 0-100
      "time": "15 mins", // Estimated time
      "steps": [
        "Step 1: Detailed instruction...",
        "Step 2: Detailed instruction..."
        // CRITICAL: You MUST provide a highly detailed, 8 to 15 step explanation for how to complete the idea. The complexity and number of steps MUST strongly correlate with the 'effort' value.
      ]
    }
  ],
  "impact": "A short sentence about the environmental impact."
}`;
}

app.post('/api/user/profile', (req, res) => {
  try {
    const profileData = JSON.stringify(req.body);
    // Simple upsert for user 1
    const stmt = db.prepare(`
      INSERT INTO users (id, profile_data) VALUES (1, ?)
      ON CONFLICT(id) DO UPDATE SET profile_data = excluded.profile_data
    `);
    stmt.run(profileData);
    res.json({ success: true });
  } catch (err) {
    console.error('DB Error:', err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

app.post('/api/scan', upload.single('image'), async (req, res) => {
  try {
    let messages = [];
    let model = 'meta/llama-3.1-8b-instruct'; // Default for text
    
    // Parse user profile if provided
    let profile = null;
    let userProfileText = "";
    if (req.body && req.body.profile) {
      try {
        profile = typeof req.body.profile === 'string' ? JSON.parse(req.body.profile) : req.body.profile;
        userProfileText = `\n\nUSER PROFILE:\n- Housing: ${profile.housing || 'Unknown'}\n- Green Space: ${profile.greenSpace || 'Unknown'}\n- Household: ${profile.demographic || profile.demo || 'Unknown'}\n- Available Tools: ${(profile.tools || []).join(', ') || 'None specified'}\n- Composting Available: ${profile.compostAvailable ? 'Yes' : 'No'}\n- Municipal Pickup Days: ${(profile.pickupDays || []).join(', ') || 'None'}\n- Waste Bins Available: ${profile.bins || 'Unknown'}\n- Location (Pincode): ${profile.pincode || 'Unknown'}`;
      } catch(e) {
        console.error("Failed to parse profile", e);
      }
    }

    const systemPrompt = buildSystemPrompt(profile);

    if (req.file) {
      // Image scan
      model = 'meta/llama-3.2-90b-vision-instruct';
      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      
      messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Identify this item and provide recommendations based on the system instructions.${userProfileText}` },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
          ]
        }
      ];
    } else if (req.body && req.body.description) {
      // Text scan
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Item description: ${req.body.description}${userProfileText}` }
      ];
    } else {
      return res.status(400).json({ error: 'No image or description provided.' });
    }

    const data = await callNvidiaAPI(messages, model);
    let resultText = data.choices[0].message.content;

    // Clean up response if it contains markdown JSON blocks
    resultText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();

    let jsonResult;
    try {
      jsonResult = JSON.parse(resultText);
    } catch (parseError) {
      console.error('Failed to parse JSON from LLM:', resultText);
      return res.status(500).json({ error: 'AI returned invalid format.' });
    }

    res.json(jsonResult);
  } catch (error) {
    console.error('Scan Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- DATABASE ENDPOINTS ---
app.get('/api/garage', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM garage_items ORDER BY created_at DESC').all();
    const formattedItems = items.map(item => ({
      ...item,
      addedStr: timeAgo(item.created_at)
    }));
    res.json({ count: formattedItems.length, items: formattedItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/garage', (req, res) => {
  try {
    if (req.body) {
      const stmt = db.prepare('INSERT INTO garage_items (icon, name, material, status) VALUES (?, ?, ?, ?)');
      stmt.run(
        req.body.icon || '📦',
        req.body.name || 'Unknown Item',
        req.body.material || 'Unknown',
        'pending'
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/garage/:id/resolve', (req, res) => {
  try {
    const id = req.params.id;
    const stmt = db.prepare('UPDATE garage_items SET status = ? WHERE id = ?');
    stmt.run('resolved', id);
    
    // Reward impact points only when actually disposed
    const impactStmt = db.prepare('INSERT INTO impact_logs (action_type, points, kg_diverted) VALUES (?, ?, ?)');
    impactStmt.run('disposed_item', 5, 0.5);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications', (req, res) => {
  res.json({ notifications: [
    { type: 'alert', title: 'New Local Drop-off', desc: 'A glass recycling center opened nearby.', time: '1h ago' },
    { type: 'success', title: 'Goal Reached!', desc: 'You diverted 10kg of plastic this month.', time: '1d ago' }
  ]});
});

app.get('/api/posts', (req, res) => {
  res.json({ posts: [
    { image: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=400&q=80', title: 'Upcycled planters', author: '@eco_jane', likes: 124 },
    { image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&q=80', title: 'Glass bottle lamp', author: '@diy_dave', likes: 89 }
  ]});
});

app.get('/api/posts/stories', (req, res) => {
  res.json({ stories: [
    { image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&q=80', label: 'Local', active: true },
    { image: 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=100&q=80', label: 'Trending', active: false }
  ]});
});

app.get('/api/impact/summary', (req, res) => {
  try {
    const totalItems = db.prepare('SELECT COUNT(*) as count FROM garage_items').get().count;
    const totals = db.prepare('SELECT SUM(points) as pts, SUM(kg_diverted) as kg FROM impact_logs').get();
    
    res.json({ 
      totalItems: totalItems || 0, 
      kgDiverted: totals.kg || 0, 
      points: totals.pts || 0 
    });
  } catch (err) {
    res.json({ totalItems: 0, kgDiverted: 0, points: 0 });
  }
});
app.get('/api/impact/activity', (req, res) => res.json({ max: 10, data: [2, 5, 8, 3, 10, 6, 9] }));
app.get('/api/impact/contributions', (req, res) => {
  try {
    const stats = db.prepare('SELECT material as label, COUNT(*) as count FROM garage_items GROUP BY material ORDER BY count DESC LIMIT 5').all();
    res.json({ list: stats.length ? stats : [{ label: 'Plastic', count: 0 }] });
  } catch(err) {
    res.json({ list: [] });
  }
});
app.get('/api/impact/materials', (req, res) => res.json({ list: [{ label: 'Cardboard', percent: 45 }, { label: 'PET Plastic', percent: 30 }, { label: 'Aluminum', percent: 25 }] }));

app.get('/api/user/profile', (req, res) => {
  try {
    const row = db.prepare('SELECT profile_data FROM users WHERE id = 1').get();
    if (row && row.profile_data) {
      res.json(JSON.parse(row.profile_data));
    } else {
      res.json(null);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/user/profile', (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = 1').run();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});
