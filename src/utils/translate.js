// src/utils/translate.js

// ── Визначення мови ──────────────────────────────────────────
export function detectLang(text) {
  if (!text) return 'en';

  const ptChars = /[ãõáéíóúâêôàçü]/gi;
  const ptWords =
    /\b(de|da|do|em|um|uma|com|para|que|não|isso|este|esta|ser|ter|por|como|mais|mas|seu|sua)\b/gi;

  const ptCharMatches = (text.match(ptChars) || []).length;
  const ptWordMatches = (text.match(ptWords) || []).length;
  const totalWords = text.split(/\s+/).length;

  const ptScore = (ptCharMatches + ptWordMatches) / totalWords;

  return ptScore > 0.2 ? 'pt' : 'en';
}
// ── Озвучення ────────────────────────────────────────────────
export function speakWord(word, lang) {
  if (!word || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = lang === 'pt' ? 'pt-PT' : 'en-US';
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

export function speakSentence(text, lang, spans) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  // будуємо charMap щоб підсвічувати слова
  const charMap = [];
  let from = 0;
  spans.forEach((span) => {
    const raw = span.textContent;
    const pos = text.indexOf(raw, from);
    if (pos === -1) return;
    charMap.push({ span, start: pos, end: pos + raw.length });
    from = pos + raw.length;
  });

  spans.forEach((s) => s.classList.remove('word-active', 'word-done'));

  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'pt' ? 'pt-PT' : 'en-US';
  u.rate = 0.88;

  u.onboundary = (e) => {
    if (e.name !== 'word') return;
    const ci = e.charIndex;
    let best = null,
      bestDist = Infinity;
    charMap.forEach((entry) => {
      if (ci >= entry.start && ci < entry.end) {
        best = entry;
        bestDist = 0;
      } else {
        const d = Math.min(
          Math.abs(ci - entry.start),
          Math.abs(ci - entry.end)
        );
        if (d < bestDist) {
          bestDist = d;
          best = entry;
        }
      }
    });
    if (!best) return;
    charMap.forEach((entry) => {
      if (entry === best) {
        entry.span.classList.remove('word-done');
        entry.span.classList.add('word-active');
      } else if (entry.start < best.start) {
        entry.span.classList.remove('word-active');
        entry.span.classList.add('word-done');
      } else {
        entry.span.classList.remove('word-active', 'word-done');
      }
    });
  };

  u.onend = () => {
    spans.forEach((s) => {
      s.classList.remove('word-active');
      s.classList.add('word-done');
    });
    setTimeout(
      () => spans.forEach((s) => s.classList.remove('word-done')),
      800
    );
  };

  u.onerror = () =>
    spans.forEach((s) => s.classList.remove('word-active', 'word-done'));

  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  document.querySelectorAll('.word-active, .word-done').forEach((s) => {
    s.classList.remove('word-active', 'word-done');
  });
}

// ── Переклад ─────────────────────────────────────────────────
export async function translateText(text, sourceLang) {
  try {
    const sl = sourceLang === 'pt' ? 'pt' : 'en';
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=uk&dt=t&q=${encodeURIComponent(
      text
    )}`;
    const res = await fetch(url);
    const data = await res.json();
    return data[0].map((d) => d[0]).join('') || '—';
  } catch {
    return '—';
  }
}

// src/utils/translate.js — додайте

export function speakFullText(text, lang, rate = 0.88, onWord) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'pt' ? 'pt-PT' : 'en-US';
  u.rate = rate; // ← використовуємо параметр

  u.onboundary = (e) => {
    if (e.name !== 'word') return;
    onWord?.(e.charIndex, e.charLength);
  };

  u.onend = () => onWord?.(null);
  u.onerror = () => onWord?.(null);

  window.speechSynthesis.speak(u);
}
