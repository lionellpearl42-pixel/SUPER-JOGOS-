const axios = require("axios");

async function narrate(text) {
  try {
    const res = await axios.post(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
      { inputs: text },
      { headers: { Authorization: `Bearer ${process.env.HF_TOKEN}` } }
    );
    return res.data[0].generated_text;
  } catch {
    return text;
  }
}

module.exports = { narrate };
