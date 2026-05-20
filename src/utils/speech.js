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
// WakeLock
// ─────────────────────────────────────────────
let wakeLock = null;

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    document.addEventListener(
      'visibilitychange',
      async () => {
        if (document.visibilityState === 'visible' && wakeLock === null) {
          try {
            wakeLock = await navigator.wakeLock.request('screen');
          } catch {}
        }
      },
      { once: true }
    );
  } catch {}
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
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
// Chunks — розбиття по ~3000 символів
// ─────────────────────────────────────────────
const CHUNK_SIZE = 3000;

function splitIntoChunks(text) {
  if (text.length <= CHUNK_SIZE) return [{ text, offset: 0 }];

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
  if (current.trim())
    chunks.push({ text: current.trim(), offset: currentOffset });
  return chunks;
}

// ─────────────────────────────────────────────
// Timer highlight fallback (мобільні без onboundary)
// Повертає { stop, getCurrentWordIndex }
// ─────────────────────────────────────────────
function startTimerHighlight({ chunkText, offset, rate, fullCharMap, onWord }) {
  const chunkEnd = offset + chunkText.length;
  const chunkWords = fullCharMap.filter(
    (e) => e.start >= offset && e.start < chunkEnd
  );
  if (chunkWords.length === 0)
    return { stop: () => {}, getCurrentCharPos: () => offset };

  const estimatedMs = (chunkText.length / 14) * (1 / rate) * 1000;
  const stepMs = estimatedMs / chunkWords.length;
  let i = 0;

  const timer = setInterval(() => {
    if (i >= chunkWords.length) {
      clearInterval(timer);
      return;
    }
    onWord?.(chunkWords[i].start);
    i++;
  }, stepMs);

  return {
    stop: () => clearInterval(timer),
    // Повертає абсолютну позицію останнього озвученого слова
    getCurrentCharPos: () => (i > 0 ? chunkWords[i - 1].start : offset),
  };
}

// ─────────────────────────────────────────────
// MediaSession
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
// Warmup
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
  releaseWakeLock();
  container.querySelectorAll('.word-active, .word-done').forEach((s) => {
    s.classList.remove('word-active', 'word-done');
  });
}

// ─────────────────────────────────────────────
// PAUSE — просто cancel, позицію зберігає компонент
// ─────────────────────────────────────────────
export function pauseSpeaking() {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  clearMediaSession();
  releaseWakeLock();
}

// ─────────────────────────────────────────────
// MAIN SPEAK
//
// startFromCharPos — абсолютна позиція символу з якої відновлюємось.
// speak() знаходить перший chunk що містить цю позицію і починає з нього,
// пропускаючи слова до startFromCharPos.
// ─────────────────────────────────────────────
export function speak({
  text,
  lang = 'en',
  mode = 'word',
  rate = 0.88,
  spans = [],
  onWord,
  onStop,
  onPause,
  isCancelled,
  chapterTitle,
  fullCharMap = [],
  startFromCharPos = 0,
}) {
  if (!isSpeechSupported() || !text) return null;

  const uLang = lang === 'pt' ? 'pt-PT' : 'en-US';
  const boundaryOk = isBoundarySupported();

  // ── MODE: WORD ───────────────────────────────
  if (mode === 'word') {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = uLang;
    u.rate = rate;
    window.speechSynthesis.speak(u);
    return null;
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
    return null;
  }

  // ── MODE: FULL TEXT ──────────────────────────
  const chunks = splitIntoChunks(text);

  // Знаходимо chunk з якого починати
  let startChunkIdx = 0;
  if (startFromCharPos > 0) {
    for (let i = chunks.length - 1; i >= 0; i--) {
      if (chunks[i].offset <= startFromCharPos) {
        startChunkIdx = i;
        break;
      }
    }
  }

  // Поточна позиція в символах — оновлюється під час озвучки
  let currentCharPos = startFromCharPos;
  let currentTimerRef = null;
  let paused = false;

  requestWakeLock();

  setupMediaSession({
    title: chapterTitle,
    onPause: () => {
      paused = true;
      if (currentTimerRef) currentTimerRef.stop();
      pauseSpeaking();
      onPause?.(currentCharPos);
    },
    onStop: () => onStop?.(),
  });

  function playChunk(idx) {
    if (paused || isCancelled?.()) {
      clearMediaSession();
      releaseWakeLock();
      return;
    }

    if (idx >= chunks.length) {
      onWord?.(null);
      clearMediaSession();
      releaseWakeLock();
      return;
    }

    const { text: chunkText, offset } = chunks[idx];

    // Якщо відновлюємось з середини — обрізаємо chunk з потрібної позиції
    let speakText = chunkText;
    let speakOffset = offset;

    if (idx === startChunkIdx && startFromCharPos > offset) {
      const cutFrom = startFromCharPos - offset;
      // Обрізаємо по межі слова щоб не різати посередині
      const wordBoundary = chunkText.indexOf(' ', cutFrom);
      if (wordBoundary !== -1) {
        speakText = chunkText.slice(wordBoundary + 1);
        speakOffset = offset + wordBoundary + 1;
      }
    }

    const u = new SpeechSynthesisUtterance(speakText);
    u.lang = uLang;
    u.rate = rate;

    if (boundaryOk) {
      u.onboundary = (e) => {
        if (e.name === 'word') {
          currentCharPos = speakOffset + (e.charIndex ?? 0);
          onWord?.(currentCharPos);
        }
      };
    } else {
      const hl = startTimerHighlight({
        chunkText: speakText,
        offset: speakOffset,
        rate,
        fullCharMap,
        onWord: (pos) => {
          currentCharPos = pos;
          onWord?.(pos);
        },
      });
      currentTimerRef = hl;
      u._timerRef = hl;
    }

    u.onend = () => {
      if (u._timerRef) u._timerRef.stop();
      if (paused || isCancelled?.()) {
        clearMediaSession();
        releaseWakeLock();
        return;
      }
      playChunk(idx + 1);
    };

    u.onerror = (e) => {
      if (u._timerRef) u._timerRef.stop();
      if (e.error === 'interrupted') return;
      onWord?.(null);
      clearMediaSession();
      releaseWakeLock();
    };

    window.speechSynthesis.speak(u);
  }

  playChunk(startChunkIdx);

  return {
    getCurrentCharPos: () => currentCharPos,
    pause: () => {
      paused = true;
      if (currentTimerRef) currentTimerRef.stop();
    },
  };
}
