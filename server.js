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
Return ONLY a valid JSON object in this exact format, with no markdown formatting or other text:
{
  "item": "Name of the item",
  "material": "Material type (e.g. PET Plastic, Glass, Cardboard, Mixed/Unknown Material)",
  "recyclable": true or false,
  "instructions": ["Step 1", "Step 2", "Step 3"],
  "impact": "A short sentence about the environmental impact of recycling this."
}`;

app.post('/api/user/profile', (req, res) => {
  res.json({ success: true });
});

app.post('/api/scan', upload.single('image'), async (req, res) => {
  try {
    let messages = [];
    let model = 'meta/llama-3.1-8b-instruct'; // Default for text

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
            { type: 'text', text: 'Identify this item and provide recycling instructions.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
          ]
        }
      ];
    } else if (req.body && req.body.description) {
      // Text scan
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Item description: ${req.body.description}` }
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});
