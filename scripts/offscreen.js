// scripts/offscreen.js
import { getMiniLMPipeline } from './modelManager.js';

console.log('Offscreen document loaded and ready');

let classifier;
let interestEmbeddings = [];
let spamList = [];
let threshold = 0.35;

/* ------------------------------------------------ *
 * Receive commands from background                 *
 * ------------------------------------------------ */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SET_INTERESTS') {
    recalcEmbeddings(msg.interests || []);
    spamList = msg.spamKeywords || [];
    threshold = msg.threshold ?? 0.35;
    return;
  }

  if (msg.type === 'PRELOAD_MODEL') {
    console.log('Offscreen: Received preload request, starting model load...');
    (async () => {
      try {
        await ensureModel();
        console.log('Offscreen: Model preload complete');
        sendResponse({ success: true });
      } catch (err) {
        console.error('Offscreen: Model preload failed:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // async response
  }

  if (msg.type === 'CLASSIFY') {
    (async () => {
      await ensureModel();      // lazy initialisation
      const result = classify(msg.text);
      sendResponse({ ...result, id: msg.id });
    })();
    return true; // async response
  }
});

const ensureModel = async () => {
  if (classifier) return;
  try {
    console.log('Offscreen: Ensuring model is loaded...');
    classifier = await getMiniLMPipeline();
    console.log('Offscreen: Model loaded successfully');
  } catch (err) {
    console.error('Offscreen: Failed to load model:', err);
    throw err;
  }
};

const recalcEmbeddings = (interests) => {
  if (!classifier) return; // will recalc after model ready
  interestEmbeddings = interests.map(t => ({
    t,
    emb: classifier(t, { pooling: 'mean', normalize: true })[0]
  }));
};

// Core logic
const classify = (tweet) => {
  const lower = tweet.toLowerCase();
  if (spamList.some(k => lower.includes(k)))
    return { isUninteresting: true, reason: 'Spam' };

  if (!interestEmbeddings.length)
    return { isUninteresting: false, reason: 'No interests' };

  const emb = classifier(tweet, { pooling: 'mean', normalize: true })[0];
  let maxSim = -1;
  for (const i of interestEmbeddings) {
    const sim = cosine(emb, i.emb);
    if (sim > maxSim) maxSim = sim;
  }
  return {
    isUninteresting: maxSim < threshold,
    reason: `sim=${maxSim.toFixed(2)}`
  };
};

// Fast cosine (Float32Array)
const cosine = (a, b) => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; ++i) {
    dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
};