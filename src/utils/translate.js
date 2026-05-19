// src/utils/translate.js
// Тільки визначення мови і переклад.
// Всі speech функції перенесені в speech.js

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

// ── Переклад через Google Translate ─────────────────────────
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
