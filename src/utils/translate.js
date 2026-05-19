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

  // Захист від ділення на нуль
  if (totalWords === 0) return 'en';

  const ptScore = (ptCharMatches + ptWordMatches) / totalWords;

  return ptScore > 0.2 ? 'pt' : 'en';
}

// ── Перевірка підтримки Web Speech API ───────────────────────
function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// Перевірка підтримки onboundary (відсутня на iOS Safari)
function isBoundarySupported() {
  if (!isSpeechSupported()) return false;
  const u = new SpeechSynthesisUtterance('');
  return 'onboundary' in u;
}

// ── Безпечний cancel (iOS не любить cancel без speaking) ─────
function safeCancelAndSpeak(utterance) {
  if (!isSpeechSupported()) return;

  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
    // iOS потребує невеликої паузи після cancel перед новим speak
    setTimeout(() => window.speechSynthesis.speak(utterance), 50);
  } else {
    window.speechSynthesis.speak(utterance);
  }
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
// ФІКС: додано параметр rate (раніше був хардкод 0.88)
// ФІКС: виправлено race condition у charMap (text.indexOf з позицією замість slice+indexOf)
// ФІКС: на iOS (без підтримки onboundary) використовується таймерне підсвічування
export function speakSentence(text, lang, spans, rate = 0.88) {
  if (!isSpeechSupported()) return;

  // Будуємо charMap — тепер через text.indexOf(raw, from) без slice,
  // щоб уникнути неправильного зсуву при словах-дублікатах
  const charMap = [];
  let from = 0;

  spans.forEach((span) => {
    const raw = span.textContent;
    const pos = text.indexOf(raw, from); // ФІКС: використовуємо from як startIndex

    if (pos === -1) return;

    charMap.push({
      span,
      start: pos,
      end: pos + raw.length,
    });

    from = pos + raw.length;
  });

  spans.forEach((s) => s.classList.remove('word-active', 'word-done'));

  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'pt' ? 'pt-PT' : 'en-US';
  u.rate = rate; // ФІКС: використовуємо параметр, а не хардкод

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

  // ФІКС: на iOS onboundary не підтримується — робимо таймерне підсвічування
  if (isBoundarySupported()) {
    u.onboundary = (e) => {
      if (e.name !== 'word') return;
      highlightByCharIndex(e.charIndex ?? 0);
    };
  } else {
    // Таймерне підсвічування: рівномірно розподіляємо слова по часу
    // Тривалість = довжина тексту / rate / ~14 символів за секунду (приблизно)
    const estimatedDuration = (text.length / 14) * (1 / rate) * 1000;
    const intervalMs =
      charMap.length > 0 ? estimatedDuration / charMap.length : 0;
    let idx = 0;
    const timer = setInterval(() => {
      if (idx >= charMap.length) {
        clearInterval(timer);
        return;
      }
      highlightByCharIndex(charMap[idx].start);
      idx++;
    }, intervalMs);

    // Зберігаємо таймер щоб можна було зупинити
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

// ── Зупинка озвучення ────────────────────────────────────────
// ФІКС: приймає опціональний container щоб не зачіпати інші елементи на сторінці
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

// ── Озвучення повного тексту (з колбеком по позиції символу) ─
// ФІКС: onWord(null) викликається і при відсутній підтримці синтезу
// ФІКС: safeCancelAndSpeak замість прямого cancel()+speak()
export function speakFullText(text, lang, rate = 0.88, onWord) {
  // ФІКС: повідомляємо коллера якщо синтез недоступний
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
  // На iOS без boundary — коллер не отримає проміжні позиції,
  // але onend/onerror спрацюють коректно

  u.onend = () => onWord?.(null);
  u.onerror = () => onWord?.(null);

  safeCancelAndSpeak(u);
}
