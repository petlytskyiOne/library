// ─────────────────────────────────────────────
// Speech utils (UNIFIED VERSION)
// ─────────────────────────────────────────────

function isSpeechSupported() {
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

    map.push({
      span,
      start: pos,
      end: pos + raw.length,
    });

    from = pos + raw.length;
  });

  return map;
}

function highlight(map, ci) {
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

  setTimeout(() => {
    spans.forEach((s) => s.classList.remove('word-done'));
  }, 600);
}

// ─────────────────────────────────────────────
// MAIN SPEAK FUNCTION (ALL-IN-ONE)
// ─────────────────────────────────────────────

export function speak({
  text,
  lang = 'en',
  mode = 'text', // word | sentence | full
  rate = 0.88,
  spans = [],
  onWord,
}) {
  if (!isSpeechSupported() || !text) return;

  // ❗ ВАЖЛИВО: тільки один cancel на старті
  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);

  u.lang = lang === 'pt' ? 'pt-PT' : 'en-US';
  u.rate = rate;

  // ─────────────────────────────
  // MODE 1: WORD
  // ─────────────────────────────
  if (mode === 'word') {
    window.speechSynthesis.speak(u);
    return;
  }

  // ─────────────────────────────
  // MODE 2: FULL TEXT
  // ─────────────────────────────
  if (mode === 'full') {
    u.onboundary = (e) => {
      if (e.name === 'word') {
        onWord?.(e.charIndex);
      }
    };

    u.onend = () => onWord?.(null);
    u.onerror = () => onWord?.(null);

    window.speechSynthesis.speak(u);
    return;
  }

  // ─────────────────────────────
  // MODE 3: SENTENCE (with highlight)
  // ─────────────────────────────

  spans.forEach((s) => s.classList.remove('word-active', 'word-done'));

  const charMap = buildCharMap(text, spans);

  const highlightByIndex = (ci) => {
    let best = null;

    for (const e of charMap) {
      if (ci >= e.start && ci < e.end) {
        best = e;
        break;
      }
    }

    if (!best) return;

    charMap.forEach((e) => {
      if (e === best) {
        e.span.classList.add('word-active');
        e.span.classList.remove('word-done');
      } else if (e.start < best.start) {
        e.span.classList.add('word-done');
        e.span.classList.remove('word-active');
      }
    });
  };

  if (isBoundarySupported()) {
    u.onboundary = (e) => {
      if (e.name === 'word') {
        highlightByIndex(e.charIndex);
      }
    };
  } else {
    // fallback (iOS)
    const duration = (text.length / 14) * (1 / rate) * 1000;
    const step = charMap.length ? duration / charMap.length : 300;

    let i = 0;

    const timer = setInterval(() => {
      if (i >= charMap.length) {
        clearInterval(timer);
        return;
      }

      highlightByIndex(charMap[i].start);
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
}

// ─────────────────────────────────────────────
// STOP
// ─────────────────────────────────────────────

export function stopSpeaking(container = document) {
  if (!isSpeechSupported()) return;

  window.speechSynthesis.cancel();

  container.querySelectorAll('.word-active, .word-done').forEach((s) => {
    s.classList.remove('word-active', 'word-done');
  });
}
