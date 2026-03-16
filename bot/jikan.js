const axios = require('axios');
const BASE_URL = 'https://api.jikan.moe/v4';

let lastRequestTime = 0;
const MIN_INTERVAL = 1000;

async function makeRequest(url) {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL - timeSinceLast));
  }
  lastRequestTime = Date.now();
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return makeRequest(url);
    }
    throw error;
  }
}

async function searchAnime(query) {
  const url = `${BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=5`;
  return makeRequest(url);
}

async function getAnimeById(id) {
  const url = `${BASE_URL}/anime/${id}`;
  return makeRequest(url);
}

module.exports = { searchAnime, getAnimeById };
