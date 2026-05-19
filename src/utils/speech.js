// src/utils/speech.js
// ─────────────────────────────────────────────
// Unified Speech Utils
// ─────────────────────────────────────────────

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
// iOS/Android warmup
//
// На мобільних браузерах (iOS Safari, Android Chrome) Web Speech API
// вимагає що speak() відбувся синхронно в user gesture.
// SolidJS (і React) синтетичні події іноді розривають цей ланцюжок.
//
// Рішення: викликати warmup() ПЕРШИМ РЯДКОМ в onClick компонента,
// до будь-якої іншої логіки. Це "відкриває" сесію синтезу.
// Після цього speak() всередині speak() можна викликати асинхронно.
//
// Використання в компоненті:
//   function handlePlay() {
//     speechWarmup();       // ← перший рядок, синхронно
//     setIsSpeaking(true);
//     speak({ ... });       // ← тепер працює на iOS і Android
//   }
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
// MAIN SPEAK FUNCTION
// ─────────────────────────────────────────────
//
// mode: 'word' | 'sentence' | 'full'
//
// 'word'     — просте озвучення одного слова
// 'sentence' — озвучення речення з підсвічуванням слів (потрібен spans)
// 'full'     — озвучення великого тексту, колбек onWord(charIndex | null)
//
// ВАЖЛИВО: для mode='full' викликати speechWarmup() перед speak() в onClick.
// Для 'word' і 'sentence' warmup не потрібен — вони вже мають прямий onclick.
// ─────────────────────────────────────────────
export function speak({
  text,
  lang = 'en',
  mode = 'word',
  rate = 0.88,
  spans = [],
  onWord,
}) {
  if (!isSpeechSupported() || !text) return;

  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'pt' ? 'pt-PT' : 'en-US';
  u.rate = rate;

  // ── MODE: WORD ───────────────────────────────
  if (mode === 'word') {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return;
  }

  // ── MODE: FULL TEXT ──────────────────────────
  // Не робимо cancel() тут — warmup вже зроблений в компоненті.
  // Зайвий cancel() вбив би warmup utterance і заблокував iOS.
  if (mode === 'full') {
    if (isBoundarySupported()) {
      u.onboundary = (e) => {
        if (e.name === 'word') onWord?.(e.charIndex);
      };
    }
    // На iOS onboundary недоступний — колбек onWord не буде викликатись
    // для підсвічування, але озвучка працюватиме.
    u.onend = () => onWord?.(null);
    u.onerror = () => onWord?.(null);

    window.speechSynthesis.speak(u);
    return;
  }

  // ── MODE: SENTENCE ───────────────────────────
  window.speechSynthesis.cancel();

  spans.forEach((s) => s.classList.remove('word-active', 'word-done'));

  const charMap = buildCharMap(text, spans);

  if (isBoundarySupported()) {
    u.onboundary = (e) => {
      if (e.name === 'word') highlightByIndex(charMap, e.charIndex);
    };
  } else {
    // Таймерне підсвічування для iOS (без onboundary)
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
