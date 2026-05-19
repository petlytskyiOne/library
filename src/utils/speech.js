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
// Розбивка тексту на chunks
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
// MediaSession — керування з локскріна Android
//
// Реєструємо додаток як медіаплеєр. Android тоді:
// 1. Не призупиняє Web Speech API при вимкненому екрані
// 2. Показує кнопки Play/Pause/Stop на локскрині
// 3. Дозволяє керувати з шторки сповіщень
// ─────────────────────────────────────────────
function setupMediaSession({ title, onPause, onStop }) {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: title || 'Озвучення',
    artist: 'Reader',
  });

  navigator.mediaSession.setActionHandler('pause', () => {
    onPause?.();
  });

  navigator.mediaSession.setActionHandler('stop', () => {
    onStop?.();
  });

  navigator.mediaSession.setActionHandler('play', () => {
    // play не відновлює — просто ігноруємо,
    // бо відновлення з середини потребує окремої логіки
  });

  navigator.mediaSession.playbackState = 'playing';
}

function clearMediaSession() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = 'none';
  navigator.mediaSession.setActionHandler('pause', null);
  navigator.mediaSession.setActionHandler('stop', null);
  navigator.mediaSession.setActionHandler('play', null);
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
  onStop, // колбек коли юзер зупиняє з локскріна
  isCancelled,
  chapterTitle, // для MediaSession (назва на локскрині)
}) {
  if (!isSpeechSupported() || !text) return;

  const uLang = lang === 'pt' ? 'pt-PT' : 'en-US';

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

    if (isBoundarySupported()) {
      u.onboundary = (e) => {
        if (e.name === 'word') highlightByIndex(charMap, e.charIndex);
      };
    } else {
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

  // ── MODE: FULL TEXT ──────────────────────────
  const chunks = splitIntoChunks(text);

  // Реєструємо MediaSession — Android показує керування на локскрині
  setupMediaSession({
    title: chapterTitle,
    onPause: () => {
      onStop?.(); // компонент скидає isSpeaking і зупиняє
    },
    onStop: () => {
      onStop?.();
    },
  });

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

    if (isBoundarySupported()) {
      u.onboundary = (e) => {
        if (e.name === 'word') {
          onWord?.(offset + (e.charIndex ?? 0));
        }
      };
    }

    u.onend = () => {
      if (isCancelled?.()) {
        clearMediaSession();
        return;
      }
      playChunk(idx + 1);
    };

    u.onerror = (e) => {
      if (e.error === 'interrupted') return;
      onWord?.(null);
      clearMediaSession();
    };

    window.speechSynthesis.speak(u);
  }

  playChunk(0);
}
