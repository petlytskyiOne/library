import { onMount, onCleanup, Show, createSignal } from 'solid-js';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { countUniqueWords } from '../utils/text.js';
import {
  speakWord,
  speakSentence,
  stopSpeaking,
  translateText,
  detectLang,
  speakFullText,
} from '../utils/translate.js';

marked.setOptions({ breaks: true });

export default function ChapterPage(props) {
  const [tooltip, setTooltip] = createSignal(null);
  const [isSpeaking, setIsSpeaking] = createSignal(false);
  const [rate, setRate] = createSignal(0.88);

  // charMap і текст будуємо один раз в onMount — щоб onClick був синхронним
  let fullText = '';
  let fullLang = 'en';
  let charMap = [];

  function buildCharMap() {
    const markdownEl = document.querySelector('.markdown-body');
    if (!markdownEl) return;

    fullText = markdownEl.textContent;
    fullLang = detectLang(fullText);

    const allWords = Array.from(markdownEl.querySelectorAll('.word'));
    charMap = [];
    let from = 0;

    allWords.forEach((span) => {
      const raw = span.textContent;
      const pos = fullText.indexOf(raw, from);
      if (pos === -1) return;
      charMap.push({ span, start: pos, end: pos + raw.length });
      from = pos + raw.length;
    });
  }

  function handleSpeakChapter() {
    if (isSpeaking()) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    if (!fullText) return;

    // ── iOS warmup ────────────────────────────────────────────
    // iOS дозволяє speechSynthesis.speak() лише синхронно в user gesture.
    // SolidJS синтетичні події іноді розривають цей ланцюжок.
    // Рішення: запускаємо порожній беззвучний utterance прямо тут —
    // це "розблоковує" Web Speech API для цієї сесії.
    // Після цього speakFullText може speak() вже без обмежень.
    const warmup = new SpeechSynthesisUtterance('');
    warmup.volume = 0;
    warmup.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(warmup);
    // ─────────────────────────────────────────────────────────

    setIsSpeaking(true);

    speakFullText(fullText, fullLang, rate(), (charIndex) => {
      if (charIndex === null) {
        setIsSpeaking(false);
        setTimeout(() => {
          charMap.forEach((e) =>
            e.span.classList.remove('word-active', 'word-done')
          );
        }, 800);
        return;
      }

      let best = null;
      let bestDist = Infinity;

      charMap.forEach((entry) => {
        if (charIndex >= entry.start && charIndex < entry.end) {
          best = entry;
          bestDist = 0;
        } else {
          const d = Math.min(
            Math.abs(charIndex - entry.start),
            Math.abs(charIndex - entry.end)
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
    });
  }

  onMount(() => {
    hljs.highlightAll();

    const saved = localStorage.getItem(`scroll-${props.chapter?.slug}`);
    if (saved) window.scrollTo(0, Number(saved));

    const onScroll = () => {
      localStorage.setItem(`scroll-${props.chapter?.slug}`, window.scrollY);
    };
    window.addEventListener('scroll', onScroll);
    onCleanup(() => window.removeEventListener('scroll', onScroll));

    queueMicrotask(() => {
      // Copy buttons для code blocks
      document.querySelectorAll('pre').forEach((block) => {
        if (block.querySelector('.copy-btn')) return;
        const btn = document.createElement('button');
        btn.innerText = 'copy';
        btn.className = 'copy-btn';
        btn.onclick = () => {
          navigator.clipboard.writeText(block.innerText);
          btn.innerText = 'copied!';
          setTimeout(() => (btn.innerText = 'copy'), 1500);
        };
        block.style.position = 'relative';
        block.appendChild(btn);
      });

      const markdownEl = document.querySelector('.markdown-body');
      if (!markdownEl) return;

      // Розбиваємо текст на речення і слова
      markdownEl.querySelectorAll('p, li, h1, h2, h3').forEach((block) => {
        const childNodes = Array.from(block.childNodes);
        block.innerHTML = '';

        childNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
            block.appendChild(node.cloneNode());
            return;
          }

          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (!text.trim()) {
              block.appendChild(document.createTextNode(text));
              return;
            }

            const sentences = text.split(/(?<=[.!?])\s+/);
            sentences.forEach((sent) => {
              if (!sent.trim()) return;
              const sentSpan = document.createElement('span');
              sentSpan.className = 'sentence';

              const parts = sent.split(
                /([a-zA-Zа-яА-ЯіІїЇєЄёЁãõáéíóúâêôàçüÃÕÁÉÍÓÚÂÊÔÀÇÜ'-]+)/
              );
              parts.forEach((part) => {
                if (!part) return;
                if (
                  /[a-zA-Zа-яА-ЯіІїЇєЄёЁãõáéíóúâêôàçüÃÕÁÉÍÓÚÂÊÔÀÇÜ'-]+/.test(
                    part
                  )
                ) {
                  const wordSpan = document.createElement('span');
                  wordSpan.className = 'word';
                  wordSpan.textContent = part;
                  sentSpan.appendChild(wordSpan);
                } else {
                  sentSpan.appendChild(document.createTextNode(part));
                }
              });

              const btn = document.createElement('button');
              btn.className = 'btn-speak-sentence';
              btn.title = 'Озвучити речення';
              btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M3 5.5h2l3-3v11l-3-3H3v-5zM11 5.5c1 .8 1.5 1.8 1.5 2.5S12 9.7 11 10.5"
                  stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>`;
              btn.onclick = async (e) => {
                e.stopPropagation();
                const text = sentSpan.textContent.trim();
                const lang = detectLang(text);
                const spans = Array.from(sentSpan.querySelectorAll('.word'));
                speakSentence(text, lang, spans, rate());

                const existing = sentSpan.querySelector(
                  '.sentence-translation'
                );
                if (existing) {
                  existing.remove();
                  return;
                }
                const div = document.createElement('div');
                div.className = 'sentence-translation';
                div.textContent = '...';
                sentSpan.appendChild(div);
                const translation = await translateText(text, lang);
                div.textContent = translation;
              };
              sentSpan.appendChild(btn);
              block.appendChild(sentSpan);
              block.appendChild(document.createTextNode(' '));
            });
            return;
          }

          block.appendChild(node.cloneNode(true));
        });
      });

      // Будуємо charMap після того як DOM готовий
      buildCharMap();
    });

    const handleWordClick = async (e) => {
      const wordEl = e.target.closest('.word');
      if (!wordEl) return;
      e.stopPropagation();

      const word = wordEl.textContent.trim();
      const lang = detectLang(word);
      speakWord(word, lang);

      setTooltip({ word, translation: '...', x: e.clientX, y: e.clientY });
      const translation = await translateText(word, lang);
      setTooltip((t) => t && { ...t, translation });
    };

    const markdownEl = document.querySelector('.markdown-body');
    markdownEl?.addEventListener('click', handleWordClick);
    onCleanup(() => markdownEl?.removeEventListener('click', handleWordClick));

    const closeTooltip = (e) => {
      if (!e.target.closest('.word-tooltip')) setTooltip(null);
    };
    document.addEventListener('click', closeTooltip);
    onCleanup(() => {
      document.removeEventListener('click', closeTooltip);
      stopSpeaking();
    });
  });

  return (
    <Show
      when={props.chapter}
      fallback={
        <div class="page-wrap">
          <p style={{ padding: '4rem', color: 'var(--text3)' }}>
            Главу не знайдено
          </p>
        </div>
      }
    >
      <div class="page-wrap">
        <header class="site-header">
          <div class="header-inner">
            <button class="btn-back" onClick={props.back}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M13 8H3M7 4L3 8l4 4"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              Назад
            </button>

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                'align-items': 'center',
              }}
            >
              <span class="word-count">
                {countUniqueWords(props.chapter.content)}
              </span>

              {/* Перемикач швидкості */}
              <div class="rate-control">
                <button
                  class={`rate-btn ${rate() === 0.6 ? 'rate-active' : ''}`}
                  onClick={() => setRate(0.6)}
                >
                  0.6x
                </button>
                <button
                  class={`rate-btn ${rate() === 0.88 ? 'rate-active' : ''}`}
                  onClick={() => setRate(0.88)}
                >
                  1x
                </button>
                <button
                  class={`rate-btn ${rate() === 1.4 ? 'rate-active' : ''}`}
                  onClick={() => setRate(1.4)}
                >
                  1.4x
                </button>
              </div>

              {/* Кнопка Play/Pause */}
              <button
                class={`btn-speak-chapter ${isSpeaking() ? 'speaking' : ''}`}
                onClick={handleSpeakChapter}
                title={isSpeaking() ? 'Зупинити' : 'Озвучити главу'}
              >
                {isSpeaking() ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect
                      x="2"
                      y="2"
                      width="4"
                      height="12"
                      rx="1.5"
                      fill="currentColor"
                    />
                    <rect
                      x="10"
                      y="2"
                      width="4"
                      height="12"
                      rx="1.5"
                      fill="currentColor"
                    />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 2.5l10 5.5-10 5.5V2.5z" fill="currentColor" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </header>

        <main class="chapter-main">
          <div
            class="markdown-body"
            innerHTML={marked.parse(props.chapter.content)}
          />
        </main>

        <Show when={tooltip()}>
          <div
            class="word-tooltip"
            style={{
              position: 'fixed',
              left: `${tooltip().x}px`,
              top: `${tooltip().y + 16}px`,
            }}
          >
            <span class="tooltip-word">{tooltip().word}</span>
            <span class="tooltip-translation">{tooltip().translation}</span>
          </div>
        </Show>
      </div>
    </Show>
  );
}
