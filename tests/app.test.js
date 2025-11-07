const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPrompt,
  analyzeLocally,
  splitSentences,
  computeWordFrequency,
  extractThemes,
  rankSentencesByKeywords,
  estimateSentiment,
  buildQuotes,
  deriveOpportunities,
  normalizeAnalysis,
  mapFreeformToAnalysis,
  goalCheckboxes,
  state
} = require('../analisis_cualitativo/app.js');

test('splitSentences separates text into clean sentences', () => {
  const sentences = splitSentences('Hola. ¿Cómo estás? Bien, gracias!');
  assert.deepEqual(sentences, ['Hola.', '¿Cómo estás?', 'Bien, gracias!']);
});

test('computeWordFrequency removes stopwords and counts occurrences', () => {
  const freq = computeWordFrequency('El servicio es bueno y el soporte es bueno');
  assert.equal(freq.bueno, 2);
  assert.equal(freq.servicio, 1);
  assert.ok(!('el' in freq));
});

test('extractThemes returns sorted keywords with descriptions', () => {
  const frequency = { velocidad: 4, soporte: 2, precio: 1 };
  const themes = extractThemes(frequency, 2);
  assert.equal(themes.length, 2);
  assert.equal(themes[0].name, 'velocidad');
  assert.match(themes[0].description, /4 menciones/);
});

test('rankSentencesByKeywords favors sentences containing themes', () => {
  const sentences = ['La velocidad es lenta', 'Buen precio', 'Soporte excelente'];
  const themes = [
    { name: 'velocidad' },
    { name: 'soporte' }
  ];
  const ranked = rankSentencesByKeywords(sentences, themes);
  assert.deepEqual(ranked, ['La velocidad es lenta', 'Soporte excelente']);
});

test('estimateSentiment calculates dominant tone', () => {
  const sentiment = estimateSentiment(['Estoy feliz con el servicio', 'El soporte es malo']);
  assert.ok(sentiment.score > 0 && sentiment.score < 1);
  assert.ok(Object.keys(sentiment.distribution).includes('positivo'));
});

test('deriveOpportunities uses instructions when available', () => {
  const themes = [
    { name: 'velocidad' },
    { name: 'soporte' },
    { name: 'precio' }
  ];
  const withInstructions = deriveOpportunities(themes, 'Mejorar onboarding');
  assert.ok(withInstructions[0].includes('velocidad'));
  assert.ok(withInstructions[0].includes('Mejorar onboarding'));

  const defaultOps = deriveOpportunities(themes);
  assert.ok(defaultOps[0].includes('Profundizar'));
});

test('buildPrompt respects goal selections and preserves transcripts', () => {
  goalCheckboxes.summary.checked = true;
  goalCheckboxes.sentiment.checked = false;
  const transcripts = [
    { id: 'A', participant: 'Ana', transcript: 'Texto' },
    { id: 'B', participant: 'Ben', transcript: 'Otro texto' }
  ];
  const prompt = buildPrompt(transcripts, 'Enfócate en satisfacción');
  const objectives = [...prompt.objectives].sort();
  assert.deepEqual(objectives, ['opportunities', 'summary', 'themes']);
  assert.equal(prompt.transcripts.length, 2);
  assert.equal(prompt.instructions, 'Enfócate en satisfacción');

  // reset stub state for other tests
  goalCheckboxes.sentiment.checked = true;
});

test('normalizeAnalysis fills missing fields', () => {
  const normalized = normalizeAnalysis({ summary: 'Hola' });
  assert.deepEqual(normalized.opportunities, []);
  assert.equal(normalized.summary, 'Hola');
  assert.equal(normalized.sentiment, null);
});

test('mapFreeformToAnalysis returns safe structure', () => {
  const fallback = mapFreeformToAnalysis('Texto libre');
  assert.equal(fallback.summary, 'Texto libre');
  assert.deepEqual(fallback.themes, []);
});

test('analyzeLocally produces coherent structure', () => {
  const transcripts = [
    {
      id: 'T1',
      participant: 'Carla',
      transcript: 'El soporte es bueno pero la velocidad es mala.'
    }
  ];
  const result = analyzeLocally(transcripts, 'Enfócate en soporte');
  assert.ok(result.summary.includes('•'));
  assert.ok(Array.isArray(result.themes));
  assert.ok(result.quotes.length >= 1);
});

test('buildQuotes extracts sentences containing keywords', () => {
  const transcripts = [
    {
      id: 'T1',
      participant: 'Carla',
      transcript: 'El soporte es bueno. La velocidad es mala.'
    }
  ];
  const themes = [{ name: 'soporte' }];
  const quotes = buildQuotes(transcripts, themes);
  assert.ok(quotes.some((item) => item.quote.includes('soporte')));
});

test('state is initialized with demo transcripts', () => {
  assert.ok(state.transcripts.length >= 1);
});
