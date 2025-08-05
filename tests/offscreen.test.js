/**
 * Basic test to ensure the architecture works
 */

// Simple test for the cosine similarity function
test('cosine similarity calculation', () => {
  // Simple cosine function (copied from offscreen.js logic)
  const cosine = (a, b) => {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; ++i) {
      dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2;
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  };

  const vec1 = new Float32Array([1, 0, 0, 0]);
  const vec2 = new Float32Array([1, 0, 0, 0]);
  const vec3 = new Float32Array([0, 1, 0, 0]);

  expect(cosine(vec1, vec2)).toBeCloseTo(1.0, 5); // identical vectors
  expect(cosine(vec1, vec3)).toBeCloseTo(0.0, 5); // orthogonal vectors
});

// Test spam detection logic
test('spam detection works correctly', () => {
  const spamKeywords = ['sponsored', 'promoted', 'buy now'];
  
  const isSpam = (text, keywords) => {
    const lower = text.toLowerCase();
    return keywords.some(k => lower.includes(k));
  };

  expect(isSpam('This is a sponsored post', spamKeywords)).toBe(true);
  expect(isSpam('Buy now for limited time!', spamKeywords)).toBe(true);
  expect(isSpam('Just sharing some cool tech news', spamKeywords)).toBe(false);
});

// Test basic classification logic
test('classification threshold logic', () => {
  const classify = (similarity, threshold = 0.35) => {
    return {
      isUninteresting: similarity < threshold,
      reason: `sim=${similarity.toFixed(2)}`
    };
  };

  expect(classify(0.8).isUninteresting).toBe(false);
  expect(classify(0.2).isUninteresting).toBe(true);
  expect(classify(0.35).isUninteresting).toBe(false);
  expect(classify(0.34).isUninteresting).toBe(true);
});