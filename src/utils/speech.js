// src/utils/speech.js

export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function isBoundarySupported() {
  if (!isSpeechSupported()) return false;
  const u = new SpeechSynthesisUtterance('');
  return 'onboundary' in u;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function buildCharMap(text, spans) {
  let from = 0;
  const map = [];
  spans.forEach((span) => {
    const raw = span.textContent;
    const pos = text.indexOf(raw, from);
    if (pos === -1) return;
    map.push({ span, start: pos, end: pos + raw.length });
    from = pos + raw.length;
  });
  return map;
}

function highlightByIndex(map, ci) {
  if (ci == null) return;
  let best = null;
  for (const e of map) {
    if (ci >= e.start && ci < e.end) {
      best = e;
      break;
    }
  }
  if (!best) return;
  map.forEach((e) => {
    if (e === best) {
      e.span.classList.remove('word-done');
      e.span.classList.add('word-active');
    } else if (e.start < best.start) {
      e.span.classList.remove('word-active');
      e.span.classList.add('word-done');
    } else {
      e.span.classList.remove('word-active', 'word-done');
    }
  });
}

function clearHighlights(spans) {
  spans.forEach((s) => {
    s.classList.remove('word-active');
    s.classList.add('word-done');
  });
  setTimeout(() => spans.forEach((s) => s.classList.remove('word-done')), 600);
}

// ─────────────────────────────────────────────
// Розбивка тексту на chunks (~3000 символів)
// Android Chrome обрізає utterance > ~4000 символів
// ─────────────────────────────────────────────
const CHUNK_SIZE = 3000;

function splitIntoChunks(text) {
  if (text.length <= CHUNK_SIZE) {
    return [{ text, offset: 0 }];
  }

  const chunks = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = '';
  let currentOffset = 0;
  let offset = 0;

  for (const sent of sentences) {
    if ((current + ' ' + sent).length > CHUNK_SIZE && current) {
      chunks.push({ text: current.trim(), offset: currentOffset });
      currentOffset = offset;
      current = sent;
    } else {
      if (!current) currentOffset = offset;
      current = current ? current + ' ' + sent : sent;
    }
    offset += sent.length + 1;
  }

  if (current.trim()) {
    chunks.push({ text: current.trim(), offset: currentOffset });
  }

  return chunks;
}

// ─────────────────────────────────────────────
// Таймерний fallback для підсвічування
//
// На мобільних (iOS Safari, Android Chrome) onboundary не підтримується.
// Замість нього рівномірно проходимо по словах через setInterval.
// Повертає функцію stop() щоб зупинити таймер ззовні.
// ─────────────────────────────────────────────
function startTimerHighlight({ chunkText, offset, rate, fullCharMap, onWord }) {
  // Знаходимо слова які належать цьому chunk по offset
  const chunkEnd = offset + chunkText.length;
  const chunkWords = fullCharMap.filter(
    (e) => e.start >= offset && e.start < chunkEnd
  );

  if (chunkWords.length === 0) return { stop: () => {} };

  // Розраховуємо час на chunk і крок між словами
  const estimatedMs = (chunkText.length / 14) * (1 / rate) * 1000;
  const stepMs = estimatedMs / chunkWords.length;

  let i = 0;
  const timer = setInterval(() => {
    if (i >= chunkWords.length) {
      clearInterval(timer);
      return;
    }
    // Передаємо абсолютну позицію в повному тексті
    onWord?.(chunkWords[i].start);
    i++;
  }, stepMs);

  return {
    stop: () => clearInterval(timer),
  };
}

// ─────────────────────────────────────────────
// MediaSession — керування з локскріна Android
// ─────────────────────────────────────────────
function setupMediaSession({ title, onPause, onStop }) {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: title || 'Озвучення',
    artist: 'Reader',
  });

  navigator.mediaSession.setActionHandler('pause', () => onPause?.());
  navigator.mediaSession.setActionHandler('stop', () => onStop?.());
  navigator.mediaSession.setActionHandler('play', () => {});
  navigator.mediaSession.playbackState = 'playing';
}

function clearMediaSession() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = 'none';
  ['pause', 'stop', 'play'].forEach((a) =>
    navigator.mediaSession.setActionHandler(a, null)
  );
}

// ─────────────────────────────────────────────
// Warmup — розблоковує iOS/Android
// Викликати ПЕРШИМ рядком в onClick компонента
// ─────────────────────────────────────────────
export function speechWarmup() {
  if (!isSpeechSupported()) return;
  const u = new SpeechSynthesisUtterance('');
  u.volume = 0;
  u.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

// ─────────────────────────────────────────────
// STOP
// ─────────────────────────────────────────────
export function stopSpeaking(container = document) {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  clearMediaSession();
  container.querySelectorAll('.word-active, .word-done').forEach((s) => {
    s.classList.remove('word-active', 'word-done');
  });
}

// ─────────────────────────────────────────────
// MAIN SPEAK FUNCTION
// ─────────────────────────────────────────────
export function speak({
  text,
  lang = 'en',
  mode = 'word',
  rate = 0.88,
  spans = [],
  onWord,
  onStop,
  isCancelled,
  chapterTitle,
  // fullCharMap потрібен для mode:'full' щоб таймер знав які spans підсвічувати
  fullCharMap = [],
}) {
  if (!isSpeechSupported() || !text) return;

  const uLang = lang === 'pt' ? 'pt-PT' : 'en-US';
  const boundaryOk = isBoundarySupported();

  // ── MODE: WORD ───────────────────────────────
  if (mode === 'word') {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = uLang;
    u.rate = rate;
    window.speechSynthesis.speak(u);
    return;
  }

  // ── MODE: SENTENCE ───────────────────────────
  if (mode === 'sentence') {
    window.speechSynthesis.cancel();
    spans.forEach((s) => s.classList.remove('word-active', 'word-done'));

    const charMap = buildCharMap(text, spans);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = uLang;
    u.rate = rate;

    if (boundaryOk) {
      u.onboundary = (e) => {
        if (e.name === 'word') highlightByIndex(charMap, e.charIndex);
      };
    } else {
      // Таймерний fallback для мобільних
      const duration = (text.length / 14) * (1 / rate) * 1000;
      const step = charMap.length ? duration / charMap.length : 300;
      let i = 0;
      const timer = setInterval(() => {
        if (i >= charMap.length) {
          clearInterval(timer);
          return;
        }
        highlightByIndex(charMap, charMap[i].start);
        i++;
      }, step);
      u._timer = timer;
    }

    u.onend = () => {
      if (u._timer) clearInterval(u._timer);
      clearHighlights(spans);
    };
    u.onerror = () => {
      if (u._timer) clearInterval(u._timer);
      spans.forEach((s) => s.classList.remove('word-active', 'word-done'));
    };

    window.speechSynthesis.speak(u);
    return;
  }

  // ── MODE: FULL TEXT (з chunks + таймерний fallback) ──
  const chunks = splitIntoChunks(text);

  setupMediaSession({
    title: chapterTitle,
    onPause: () => onStop?.(),
    onStop: () => onStop?.(),
  });

  let currentTimer = null;

  function playChunk(idx) {
    if (isCancelled?.()) {
      clearMediaSession();
      return;
    }

    if (idx >= chunks.length) {
      onWord?.(null);
      clearMediaSession();
      return;
    }

    const { text: chunkText, offset } = chunks[idx];
    const u = new SpeechSynthesisUtterance(chunkText);
    u.lang = uLang;
    u.rate = rate;

    if (boundaryOk) {
      // Desktop / Android з підтримкою boundary
      u.onboundary = (e) => {
        if (e.name === 'word') {
          onWord?.(offset + (e.charIndex ?? 0));
        }
      };
    } else {
      // Мобільний fallback — таймерне підсвічування по словах chunk
      const hl = startTimerHighlight({
        chunkText,
        offset,
        rate,
        fullCharMap,
        onWord,
      });
      currentTimer = hl;
      u._timerRef = hl;
    }

    u.onend = () => {
      if (u._timerRef) u._timerRef.stop();
      if (isCancelled?.()) {
        clearMediaSession();
        return;
      }
      playChunk(idx + 1);
    };

    u.onerror = (e) => {
      if (u._timerRef) u._timerRef.stop();
      if (e.error === 'interrupted') return;
      onWord?.(null);
      clearMediaSession();
    };

    window.speechSynthesis.speak(u);
  }

  playChunk(0);
}
