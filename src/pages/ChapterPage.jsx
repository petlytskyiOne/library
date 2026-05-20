import { onMount, onCleanup, Show, createSignal } from 'solid-js';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { countUniqueWords } from '../utils/text.js';
import { detectLang, translateText } from '../utils/translate.js';
import {
  speak,
  speechWarmup,
  stopSpeaking,
  pauseSpeaking,
} from '../utils/speech.js';

marked.setOptions({ breaks: true });

export default function ChapterPage(props) {
  const [tooltip, setTooltip] = createSignal(null);
  const [isSpeaking, setIsSpeaking] = createSignal(false);
  const [isPaused, setIsPaused] = createSignal(false);
  const [rate, setRate] = createSignal(0.88);

  let fullText = '';
  let fullLang = 'en';
  let charMap = [];
  let cancelled = false;

  // Зберігаємо позицію в символах для відновлення
  let pausedAtCharPos = 0;
  let speakHandle = null;

  // Подвійний клік
  let lastTapTime = 0;
  const DOUBLE_TAP_MS = 400;

  function buildFullCharMap() {
    const markdownEl = document.querySelector('.markdown-body');
    if (!markdownEl) return;

    const allWords = Array.from(markdownEl.querySelectorAll('.word'));
    charMap = [];
    let pos = 0;
    const parts = [];

    allWords.forEach((span) => {
      const raw = span.textContent;
      charMap.push({ span, start: pos, end: pos + raw.length });
      parts.push(raw);
      pos += raw.length + 1;
    });

    fullText = parts.join(' ');
    fullLang = detectLang(fullText);
  }

  function stopAll() {
    cancelled = true;
    if (speakHandle) {
      speakHandle.pause();
      speakHandle = null;
    }
    pausedAtCharPos = 0;
    stopSpeaking();
    setIsSpeaking(false);
    setIsPaused(false);
  }

  function startSpeaking(fromCharPos = 0) {
    cancelled = false;
    setIsSpeaking(true);
    setIsPaused(false);

    speakHandle = speak({
      text: fullText,
      lang: fullLang,
      mode: 'full',
      rate: rate(),
      chapterTitle: props.chapter?.title || 'Озвучення',
      isCancelled: () => cancelled,
      fullCharMap: charMap,
      startFromCharPos: fromCharPos,

      onPause: (charPos) => {
        pausedAtCharPos = charPos;
        speakHandle = null;
        setIsSpeaking(false);
        setIsPaused(true);
      },

      onStop: () => stopAll(),

      onWord: (charIndex) => {
        if (charIndex === null) {
          speakHandle = null;
          pausedAtCharPos = 0;
          setIsSpeaking(false);
          setIsPaused(false);
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
      },
    });
  }

  function handleSpeakChapter() {
    if (!fullText) return;

    const now = Date.now();
    const isDoubleTap = now - lastTapTime < DOUBLE_TAP_MS;
    lastTapTime = now;

    // Подвійний клік — завжди з початку
    if (isDoubleTap) {
      stopAll();
      speechWarmup();
      startSpeaking(0);
      return;
    }

    if (isSpeaking()) {
      // Грає → пауза, зберігаємо поточну позицію
      const charPos = speakHandle?.getCurrentCharPos() ?? pausedAtCharPos;
      pausedAtCharPos = charPos;
      cancelled = true;
      if (speakHandle) {
        speakHandle.pause();
        speakHandle = null;
      }
      pauseSpeaking();
      setIsSpeaking(false);
      setIsPaused(true);
      return;
    }

    if (isPaused()) {
      // На паузі → продовжуємо з збереженої позиції
      speechWarmup();
      startSpeaking(pausedAtCharPos);
      return;
    }

    // Не грає → старт з початку
    speechWarmup();
    startSpeaking(0);
  }

  onMount(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    hljs.highlightAll();

    const saved = localStorage.getItem(`scroll-${props.chapter?.slug}`);
    if (saved) window.scrollTo(0, Number(saved));

    const onScroll = () => {
      localStorage.setItem(`scroll-${props.chapter?.slug}`, window.scrollY);
    };
    window.addEventListener('scroll', onScroll);
    onCleanup(() => window.removeEventListener('scroll', onScroll));

    queueMicrotask(() => {
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
                speak({ text, lang, mode: 'sentence', rate: rate(), spans });

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

      buildFullCharMap();
    });

    const handleWordClick = async (e) => {
      const wordEl = e.target.closest('.word');
      if (!wordEl) return;
      e.stopPropagation();

      const word = wordEl.textContent.trim();
      const lang = detectLang(word);
      speak({ text: word, lang, mode: 'word' });

      const TOOLTIP_W = 200;
      const TOOLTIP_H = 72;
      const GAP = 12;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let x = e.clientX;
      let y = e.clientY + GAP;

      if (x + TOOLTIP_W > vw - 8) x = vw - TOOLTIP_W - 8;
      if (y + TOOLTIP_H > vh - 8) y = e.clientY - TOOLTIP_H - GAP;
      if (x < 8) x = 8;

      setTooltip({ word, translation: '...', x, y });
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
      cancelled = true;
      stopSpeaking();
    });
  });

  function getButtonIcon() {
    if (isSpeaking()) {
      return (
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
      );
    }
    if (isPaused()) {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 2.5l10 5.5-10 5.5V2.5z" fill="currentColor" />
          <rect x="1" y="2" width="2" height="12" rx="1" fill="currentColor" />
        </svg>
      );
    }
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 2.5l10 5.5-10 5.5V2.5z" fill="currentColor" />
      </svg>
    );
  }

  function getButtonTitle() {
    if (isSpeaking()) return 'Пауза (двічі — спочатку)';
    if (isPaused()) return 'Продовжити (двічі — спочатку)';
    return 'Озвучити главу';
  }

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

              <button
                class={`btn-speak-chapter ${isSpeaking() ? 'speaking' : ''} ${
                  isPaused() ? 'paused' : ''
                }`}
                onClick={handleSpeakChapter}
                title={getButtonTitle()}
              >
                {getButtonIcon()}
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
              top: `${tooltip().y}px`,
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
