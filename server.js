require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');

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
      max_tokens: 512,
      temperature: 0.2
    })
  });
  
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Nvidia API Error: ${response.status} ${err}`);
  }
  return response.json();
}

const systemPrompt = `You are an expert AI recycling assistant. Analyze the item provided by the user.
You MUST provide exactly 4 recommendations. The first 3 MUST be "upcycle" or "reuse" ideas. The 4th MUST be a "recycle" idea.
CRITICAL RULE: Give HIGHEST priority to creative "upcycle" or "reuse" ideas for the first 3. 
CRITICAL RULE: For the 4th "recycle" idea, check the user's profile context. If they use a municipal corp/pick-up service (e.g. have pickup days), tell them how to store it safely until pickup. If they have no pickup service, advise if there's a recycling center nearby and how to prepare it.
CRITICAL RULE: The ideas MUST be influenced by the user's questionnaire profile (e.g. tools they have, living space).

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
      "steps": ["Step 1...", "Step 2..."]
    }
  ],
  "impact": "A short sentence about the environmental impact."
}`;

app.post('/api/user/profile', (req, res) => {
  res.json({ success: true });
});

app.post('/api/scan', upload.single('image'), async (req, res) => {
  try {
    let messages = [];
    let model = 'meta/llama-3.1-8b-instruct'; // Default for text
    
    // Parse user profile if provided
    let userProfileText = "";
    if (req.body && req.body.profile) {
      try {
        const profile = typeof req.body.profile === 'string' ? JSON.parse(req.body.profile) : req.body.profile;
        userProfileText = `\n\nUSER PROFILE (Tailor your ideas to this):\n- Housing: ${profile.housing || 'Unknown'}\n- Green Space: ${profile.greenSpace || 'Unknown'}\n- Household: ${profile.demo || 'Unknown'}\n- Available Tools: ${(profile.tools || []).join(', ') || 'None specified'}`;
      } catch(e) {
        console.error("Failed to parse profile", e);
      }
    }

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
            { type: 'text', text: `Identify this item and provide 3 creative reuse/upcycle ideas.${userProfileText}` },
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

// --- MOCK ENDPOINTS FOR UI ---
let garageItems = [
  { icon: '📦', name: 'Cardboard Box', material: 'Cardboard', status: 'Pending Upcycle', addedStr: '2 days ago' }
];

app.get('/api/garage', (req, res) => {
  res.json({ count: garageItems.length, items: garageItems });
});

app.post('/api/garage', (req, res) => {
  if (req.body) {
    garageItems.push({
      icon: req.body.icon || '♻️',
      name: req.body.name || 'Unknown Item',
      material: req.body.material || 'Unknown',
      status: 'Just Added',
      addedStr: 'Just now'
    });
  }
  res.json({ success: true });
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

app.get('/api/impact/summary', (req, res) => res.json({ totalItems: 42, kgDiverted: 12.5, points: 350 }));
app.get('/api/impact/activity', (req, res) => res.json({ max: 10, data: [2, 5, 8, 3, 10, 6, 9] }));
app.get('/api/impact/contributions', (req, res) => res.json({ list: [{ label: 'Plastic', count: 18 }, { label: 'Glass', count: 12 }, { label: 'Paper', count: 12 }] }));
app.get('/api/impact/materials', (req, res) => res.json({ list: [{ label: 'Cardboard', percent: 45 }, { label: 'PET Plastic', percent: 30 }, { label: 'Aluminum', percent: 25 }] }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});
