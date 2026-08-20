// services/enrichment/index.js
const axios = require('axios');

// Simple wrapper around HuggingFace Inference API (replace with actual token)
const HF_API_TOKEN = process.env.HF_API_TOKEN || '';
const HF_API_URL = 'https://api-inference.huggingface.co/models/nlp-community/bert-base-indonesian-uncased';

async function enrichText(text) {
  if (!HF_API_TOKEN) {
    // Fallback mock response
    return {
      industry: 'Technology',
      skills: ['Node.js', 'API Design', 'Prisma'],
      seniority: 'Mid-level',
      relatedRoles: ['Backend Engineer', 'Fullstack Developer'],
      salaryRange: '10-15M IDR',
      demandScore: 0.78,
      confidence: 0.92,
    };
  }
  try {
    const response = await axios.post(
      HF_API_URL,
      { inputs: text },
      { headers: { Authorization: `Bearer ${HF_API_TOKEN}` } }
    );
    // Simplified extraction – real implementation would parse model output
    const data = response.data;
    return data;
  } catch (err) {
    console.error('Enrichment error', err);
    throw err;
  }
}

module.exports = { enrichText };
