// src/utils/translate.js

// ── Визначення мови ──────────────────────────────────────────
export function detectLang(text) {
  if (!text || !text.trim()) return 'en';

  const ptChars = /[ãõáéíóúâêôàçü]/gi;
  const ptWords =
    /\b(de|da|do|em|um|uma|com|para|que|não|isso|este|esta|ser|ter|por|como|mais|mas|seu|sua)\b/gi;

  const ptCharMatches = (text.match(ptChars) || []).length;
  const ptWordMatches = (text.match(ptWords) || []).length;
  const words = text.trim().split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  if (totalWords === 0) return 'en';

  const ptScore = (ptCharMatches + ptWordMatches) / totalWords;
  return ptScore > 0.2 ? 'pt' : 'en';
}

// ── Перевірка підтримки ──────────────────────────────────────
function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function isBoundarySupported() {
  if (!isSpeechSupported()) return false;
  const u = new SpeechSynthesisUtterance('');
  return 'onboundary' in u;
}

// ── iOS-безпечний speak ──────────────────────────────────────
// ВАЖЛИВО: на iOS speak() ОБОВ'ЯЗКОВО викликається синхронно
// в обробнику кліку. Жодних setTimeout/await перед speak() — інакше iOS блокує.
function safeCancelAndSpeak(utterance) {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

// ── Озвучення слова ──────────────────────────────────────────
export function speakWord(word, lang) {
  if (!word || !isSpeechSupported()) return;

  const u = new SpeechSynthesisUtterance(word);
  u.lang = lang === 'pt' ? 'pt-PT' : 'en-US';
  u.rate = 0.9;

  safeCancelAndSpeak(u);
}

// ── Озвучення речення з підсвічуванням слів ──────────────────
export function speakSentence(text, lang, spans, rate = 0.88) {
  if (!isSpeechSupported()) return;

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
  u.rate = rate;

  const highlightByCharIndex = (ci) => {
    if (ci == null) return;
    let best = null;
    let bestDist = Infinity;

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

  const clearHighlights = () => {
    spans.forEach((s) => {
      s.classList.remove('word-active');
      s.classList.add('word-done');
    });
    setTimeout(
      () => spans.forEach((s) => s.classList.remove('word-done')),
      800
    );
  };

  if (isBoundarySupported()) {
    u.onboundary = (e) => {
      if (e.name !== 'word') return;
      highlightByCharIndex(e.charIndex ?? 0);
    };
  } else {
    // Таймерне підсвічування для iOS (без onboundary)
    const estimatedDuration = (text.length / 14) * (1 / rate) * 1000;
    const intervalMs =
      charMap.length > 0 ? estimatedDuration / charMap.length : 300;
    let idx = 0;
    const timer = setInterval(() => {
      if (idx >= charMap.length) {
        clearInterval(timer);
        return;
      }
      highlightByCharIndex(charMap[idx].start);
      idx++;
    }, intervalMs);
    u._fallbackTimer = timer;
  }

  u.onend = () => {
    if (u._fallbackTimer) clearInterval(u._fallbackTimer);
    clearHighlights();
  };
  u.onerror = () => {
    if (u._fallbackTimer) clearInterval(u._fallbackTimer);
    spans.forEach((s) => s.classList.remove('word-active', 'word-done'));
  };

  safeCancelAndSpeak(u);
}

// ── Зупинка ──────────────────────────────────────────────────
export function stopSpeaking(container = document) {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
  container.querySelectorAll('.word-active, .word-done').forEach((s) => {
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
    if (!Array.isArray(data?.[0])) return '—';
    return (
      data[0]
        .map((d) => d?.[0])
        .filter(Boolean)
        .join('') || '—'
    );
  } catch {
    return '—';
  }
}

// ── Озвучення повного тексту ─────────────────────────────────
// КРИТИЧНО для iOS: speakFullText має викликатись НАПРЯМУ в onClick,
// без жодного await чи setTimeout між кліком і цим викликом.
export function speakFullText(text, lang, rate = 0.88, onWord) {
  if (!isSpeechSupported()) {
    onWord?.(null);
    return;
  }

  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'pt' ? 'pt-PT' : 'en-US';
  u.rate = rate;

  if (isBoundarySupported()) {
    u.onboundary = (e) => {
      if (e.name !== 'word') return;
      onWord?.(e.charIndex);
    };
  }

  u.onend = () => onWord?.(null);
  u.onerror = () => onWord?.(null);

  safeCancelAndSpeak(u);
}
