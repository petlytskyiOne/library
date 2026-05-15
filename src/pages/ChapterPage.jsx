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
} from '../utils/translate.js';

marked.setOptions({ breaks: true });

export default function ChapterPage(props) {
  const [tooltip, setTooltip] = createSignal(null);

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
      // copy кнопки на блоках коду
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

      // обгортаємо кожне слово у <span class="word">
      // і кожне речення у <span class="sentence">
      const markdownEl = document.querySelector('.markdown-body');
      if (!markdownEl) return;

      markdownEl.querySelectorAll('p, li, h1, h2, h3').forEach((block) => {
        // збираємо всі дочірні вузли включно з <br>
        const childNodes = Array.from(block.childNodes);
        block.innerHTML = '';

        childNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
            // <br> залишаємо як є
            block.appendChild(node.cloneNode());
            return;
          }

          if (node.nodeType === Node.TEXT_NODE) {
            // текстовий вузол — розбиваємо на речення і слова
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

              // розбиваємо на слова
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

              // кнопка озвучення
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
                speakSentence(text, lang, spans);

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
          // інші елементи (em, strong тощо) — залишаємо як є
          block.appendChild(node.cloneNode(true));
        });
      });
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
            <span class="word-count">
              {countUniqueWords(props.chapter.content)} унікальних слів
            </span>
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
