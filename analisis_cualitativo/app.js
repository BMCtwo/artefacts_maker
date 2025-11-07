const form = document.getElementById('transcriptForm');
const tableBody = document.getElementById('transcriptTable');
const fileImport = document.getElementById('fileImport');
const analyzeBtn = document.getElementById('analyzeBtn');
const statusEl = document.getElementById('analysisStatus');
const exportBtn = document.getElementById('exportReport');

const resultIds = ['summary', 'themes', 'sentiment', 'opportunities', 'quotes'];
const goalCheckboxes = {
  summary: document.getElementById('goalSummary'),
  themes: document.getElementById('goalThemes'),
  sentiment: document.getElementById('goalSentiment'),
  opportunities: document.getElementById('goalOpportunities')
};

const demoTranscripts = [
  {
    id: 'E01',
    participant: 'Lucía · Servicio al cliente',
    transcript:
      'Me gusta mucho cómo nos atienden, pero siento que la plataforma tarda en cargar cuando hay mucha gente conectada. Aun así, valoro el acompañamiento del equipo de soporte.',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'E02',
    participant: 'Marco · Docente remoto',
    transcript:
      'El material es completo, sin embargo, navegar entre módulos resulta confuso. Cuando tengo dudas, debo escribir varias veces para obtener respuesta. Eso me genera frustración.',
    lastUpdated: new Date().toISOString()
  }
];

const state = {
  transcripts: [...demoTranscripts],
  analysis: null
};

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const id = form.inputId.value.trim();
  const participant = form.inputParticipant.value.trim();
  const transcript = form.inputTranscript.value.trim();

  if (!id || !participant || !transcript) {
    return;
  }

  const existingIndex = state.transcripts.findIndex((item) => item.id === id);
  const entry = {
    id,
    participant,
    transcript,
    lastUpdated: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    state.transcripts[existingIndex] = entry;
  } else {
    state.transcripts.push(entry);
  }

  form.reset();
  renderTranscripts();
});

fileImport.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const text = await file.text();
  try {
    if (file.name.endsWith('.json')) {
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      items.forEach((item, index) => {
        if (!item.transcript && !item.text) return;
        const id = item.id || `${file.name}-${index + 1}`;
        const participant = item.participant || item.speaker || 'Participante sin nombre';
        state.transcripts.push({
          id,
          participant,
          transcript: item.transcript || item.text,
          lastUpdated: new Date().toISOString()
        });
      });
    } else {
      state.transcripts.push({
        id: file.name.replace(/\.[^.]+$/, ''),
        participant: 'Participante sin nombre',
        transcript: text,
        lastUpdated: new Date().toISOString()
      });
    }
    renderTranscripts();
  } catch (error) {
    console.error('Error importing file:', error);
    alert('No fue posible importar el archivo. Verifica que tenga formato JSON válido o texto plano.');
  } finally {
    fileImport.value = '';
  }
});

function renderTranscripts() {
  tableBody.innerHTML = '';
  if (!state.transcripts.length) {
    const emptyRow = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'Aún no se han agregado entrevistas.';
    cell.style.textAlign = 'center';
    cell.style.opacity = '0.7';
    emptyRow.appendChild(cell);
    tableBody.appendChild(emptyRow);
    return;
  }

  state.transcripts.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.id}</td>
      <td>${item.participant}</td>
      <td>${item.transcript.split(/\s+/).length} palabras</td>
      <td><span class="badge">${new Date(item.lastUpdated).toLocaleString()}</span></td>
      <td class="text-right">
        <button data-action="edit" data-index="${index}">Editar</button>
        <button data-action="delete" data-index="${index}">Eliminar</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

tableBody.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const action = target.dataset.action;
  if (!action) return;

  const index = Number(target.dataset.index);
  const entry = state.transcripts[index];
  if (!entry) return;

  if (action === 'edit') {
    form.inputId.value = entry.id;
    form.inputParticipant.value = entry.participant;
    form.inputTranscript.value = entry.transcript;
    form.inputTranscript.focus();
  }

  if (action === 'delete') {
    const confirmation = confirm(`¿Eliminar la entrevista "${entry.id}"?`);
    if (confirmation) {
      state.transcripts.splice(index, 1);
      renderTranscripts();
    }
  }
});

analyzeBtn.addEventListener('click', async () => {
  if (!state.transcripts.length) {
    alert('Agrega al menos una entrevista antes de ejecutar el análisis.');
    return;
  }

  statusEl.textContent = 'Procesando…';
  toggleLoading(true);

  const instructions = document.getElementById('instructions').value.trim();
  const requestPayload = buildPrompt(state.transcripts, instructions);
  const endpoint = document.getElementById('apiEndpoint').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();
  const model = document.getElementById('model').value.trim();
  const temperature = Number(document.getElementById('temperature').value);

  try {
    let analysis;
    if (endpoint && apiKey) {
      analysis = await analyzeWithLLM({ endpoint, apiKey, model, temperature, payload: requestPayload });
    } else {
      analysis = analyzeLocally(state.transcripts, instructions);
    }
    state.analysis = analysis;
    renderAnalysis(analysis);
    statusEl.textContent = 'Análisis completado';
  } catch (error) {
    console.error(error);
    statusEl.textContent = 'Ocurrió un error al generar el análisis';
    alert('No fue posible completar el análisis. Revisa la consola para más detalles.');
  } finally {
    toggleLoading(false);
  }
});

function toggleLoading(isLoading) {
  analyzeBtn.disabled = isLoading;
  analyzeBtn.textContent = isLoading ? 'Analizando…' : 'Ejecutar análisis';
}

function buildPrompt(transcripts, instructions) {
  const transcriptSummaries = transcripts.map((item) => ({
    id: item.id,
    participant: item.participant,
    excerpt: item.transcript.slice(0, 500) + (item.transcript.length > 500 ? '…' : '')
  }));

  const goals = Object.entries(goalCheckboxes)
    .filter(([, checkbox]) => checkbox.checked)
    .map(([key]) => key);

  return {
    objectives: goals,
    instructions,
    transcripts: transcripts.map(({ id, participant, transcript }) => ({ id, participant, transcript })),
    overview: transcriptSummaries
  };
}

async function analyzeWithLLM({ endpoint, apiKey, model, temperature, payload }) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        {
          role: 'system',
          content: 'Eres una asistente experta en análisis cualitativo. Identifica patrones, emociones, tensiones y oportunidades accionables. Devuelve el resultado en formato JSON con las claves summary, themes, sentiment, opportunities, quotes.'
        },
        {
          role: 'user',
          content: `Analiza las siguientes entrevistas con los objetivos ${payload.objectives.join(', ') || 'por defecto'}. Instrucciones adicionales: ${payload.instructions || 'Ninguna'}. Datos: ${JSON.stringify(payload.transcripts)}`
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;

  try {
    const parsed = JSON.parse(rawContent);
    return normalizeAnalysis(parsed);
  } catch (error) {
    console.warn('La IA no devolvió un JSON válido. Intentando interpretar el texto libre.');
    return mapFreeformToAnalysis(rawContent);
  }
}

function analyzeLocally(transcripts, instructions) {
  const combinedText = transcripts.map((item) => item.transcript).join('\n\n');
  const sentences = splitSentences(combinedText);
  const wordFrequency = computeWordFrequency(combinedText);
  const mainThemes = extractThemes(wordFrequency, 6);
  const topSentences = rankSentencesByKeywords(sentences, mainThemes);
  const sentiment = estimateSentiment(sentences);
  const quotes = buildQuotes(transcripts, mainThemes);

  const fallbackSentences = sentences.slice(0, 3);
  const selectedSentences = topSentences.length ? topSentences.slice(0, 3) : fallbackSentences;
  const summary = selectedSentences.map((sentence) => `• ${sentence}`).join('\n');
  const opportunities = deriveOpportunities(mainThemes, instructions);

  return normalizeAnalysis({
    summary,
    themes: mainThemes,
    sentiment,
    opportunities,
    quotes
  });
}

function renderAnalysis(analysis) {
  resultIds.forEach((id) => {
    const container = document.getElementById(id);
    container.innerHTML = '';
    if (!goalCheckboxes[id]?.checked && id !== 'quotes') {
      container.innerHTML = '<p class="muted">Se omitió este entregable.</p>';
      return;
    }

    const content = analysis[id];
    if (!content) {
      container.innerHTML = '<p class="muted">Sin datos disponibles.</p>';
      return;
    }

    if (typeof content === 'string') {
      container.innerHTML = markdownToHTML(content);
      return;
    }

    if (id === 'quotes' && Array.isArray(content)) {
      const template = document.getElementById('quoteTemplate');
      content.forEach((item) => {
        const clone = template.content.cloneNode(true);
        clone.querySelector('blockquote').textContent = item.quote || item.text;
        clone.querySelector('figcaption').textContent = item.source || item.id || 'Entrevista';
        container.appendChild(clone);
      });
      return;
    }

    if (Array.isArray(content)) {
      const list = document.createElement('ul');
      content.forEach((item) => {
        const li = document.createElement('li');
        if (typeof item === 'string') {
          li.textContent = item;
        } else if (typeof item === 'object') {
          li.innerHTML = `<strong>${item.label || item.name || 'Tema'}:</strong> ${item.description || item.detail || ''}`;
          if (item.keywords) {
            const chips = item.keywords.map((keyword) => `<span class="theme-chip">${keyword}</span>`).join(' ');
            li.innerHTML += `<div class="chip-group">${chips}</div>`;
          }
        }
        list.appendChild(li);
      });
      container.appendChild(list);
      return;
    }

    if (typeof content === 'object' && id === 'sentiment') {
      const { score, tone, distribution } = content;
      const sentimentEl = document.createElement('div');
      sentimentEl.innerHTML = `
        <p><strong>Tono dominante:</strong> ${tone}</p>
        <p><strong>Índice compuesto:</strong> ${(score * 100).toFixed(1)} / 100</p>
      `;
      if (distribution) {
        const list = document.createElement('ul');
        Object.entries(distribution).forEach(([key, value]) => {
          const li = document.createElement('li');
          li.textContent = `${key}: ${(value * 100).toFixed(1)}%`;
          list.appendChild(li);
        });
        sentimentEl.appendChild(list);
      }
      container.appendChild(sentimentEl);
      return;
    }
  });
}

function markdownToHTML(text) {
  if (!text) return '';
  return text
    .split(/\n{2,}/)
    .map((paragraph) => {
      const formatted = paragraph
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
      return `<p>${formatted}</p>`;
    })
    .join('');
}

function splitSentences(text) {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function computeWordFrequency(text) {
  const stopWords = new Set(['el','la','los','las','un','una','unos','unas','de','del','y','o','en','para','por','con','que','se','su','sus','es','no','sí','muy','pero','ya','al','lo','le','les','como','más','menos','cuando','donde','qué','cuál','quién','porque','sobre','este','esta','estos','estas','hay','haber','fue','son','era','ser','si','nos','me','te','mi','tu','su','también']);
  return text
    .toLowerCase()
    .replace(/[^a-záéíóúñü\s]/gi, '')
    .split(/\s+/)
    .filter((word) => word && !stopWords.has(word))
    .reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});
}

function extractThemes(frequencyMap, limit = 5) {
  const sorted = Object.entries(frequencyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  if (!sorted.length) {
    return [
      {
        name: 'Sin temas dominantes',
        description: 'No se detectaron palabras recurrentes destacadas.',
        keywords: []
      }
    ];
  }
  return sorted.map(([keyword, occurrences]) => ({
    name: keyword,
    description: `Tema recurrente con ${occurrences} menciones`,
    keywords: [keyword]
  }));
}

function rankSentencesByKeywords(sentences, themes) {
  const keywords = new Set(themes.map((theme) => theme.name));
  return sentences
    .map((sentence) => {
      const score = sentence
        .toLowerCase()
        .split(/\W+/)
        .reduce((acc, token) => acc + (keywords.has(token) ? 1 : 0), 0);
      return { sentence, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.sentence);
}

function estimateSentiment(sentences) {
  const positiveWords = ['bien','bueno','excelente','satisfecho','satisfecha','agradó','gusta','feliz','positivo','mejoró','útil','aprendí','tranquilo'];
  const negativeWords = ['mal','malo','deficiente','insatisfecho','insatisfecha','frustrado','frustrada','difícil','negativo','peor','complicado','estresado'];

  let positive = 0;
  let negative = 0;

  sentences.forEach((sentence) => {
    const tokens = sentence.toLowerCase().split(/\W+/);
    tokens.forEach((token) => {
      if (positiveWords.includes(token)) positive += 1;
      if (negativeWords.includes(token)) negative += 1;
    });
  });

  const total = positive + negative || 1;
  const score = (positive - negative + total) / (2 * total);
  const tone = score > 0.55 ? 'Mayormente positivo' : score < 0.45 ? 'Mayormente negativo' : 'Equilibrado / mixto';

  return {
    score,
    tone,
    distribution: {
      positivo: positive / total,
      negativo: negative / total,
      neutro: Math.max(0, 1 - positive / total - negative / total)
    }
  };
}

function buildQuotes(transcripts, themes) {
  const keywords = themes.map((theme) => theme.name);
  const quotes = [];

  transcripts.forEach((item) => {
    const sentences = splitSentences(item.transcript);
    sentences.forEach((sentence) => {
      const containsKeyword = keywords.some((keyword) => sentence.toLowerCase().includes(keyword));
      if (containsKeyword && quotes.length < 10) {
        quotes.push({
          quote: sentence,
          source: `${item.id} · ${item.participant}`
        });
      }
    });
  });

  if (!quotes.length && transcripts.length) {
    const first = transcripts[0];
    quotes.push({ quote: first.transcript.slice(0, 180) + '…', source: `${first.id} · ${first.participant}` });
  }

  return quotes;
}

function deriveOpportunities(themes, instructions) {
  if (!instructions) {
    return themes.slice(0, 3).map((theme) => `Profundizar en "${theme.name}" con entrevistas adicionales.`);
  }

  return themes.slice(0, 3).map((theme) => `Relacionar el tema "${theme.name}" con la instrucción: ${instructions.slice(0, 120)}${instructions.length > 120 ? '…' : ''}`);
}

function normalizeAnalysis(data) {
  return {
    summary: data.summary || '',
    themes: data.themes || [],
    sentiment: data.sentiment || null,
    opportunities: data.opportunities || [],
    quotes: data.quotes || []
  };
}

function mapFreeformToAnalysis(text) {
  const safeText = text || 'No se pudo interpretar la respuesta del modelo.';
  return {
    summary: safeText,
    themes: [],
    sentiment: null,
    opportunities: [],
    quotes: []
  };
}

exportBtn.addEventListener('click', () => {
  if (!state.analysis) {
    alert('Genera un análisis antes de exportar.');
    return;
  }

  const payload = {
    metadata: {
      generatedAt: new Date().toISOString(),
      transcripts: state.transcripts.length
    },
    inputs: state.transcripts,
    analysis: state.analysis
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `informe-cualitativo-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});

document.querySelectorAll('button.copy').forEach((button) => {
  button.addEventListener('click', () => {
    const targetId = button.dataset.target;
    const container = document.getElementById(targetId);
    const text = container.innerText.trim();
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      button.textContent = 'Copiado ✓';
      setTimeout(() => (button.textContent = 'Copiar'), 1600);
    });
  });
});

renderTranscripts();

const initialAnalysis = analyzeLocally(state.transcripts, '');
state.analysis = initialAnalysis;
renderAnalysis(initialAnalysis);
statusEl.textContent = 'Análisis preliminar generado con el motor heurístico integrado.';
