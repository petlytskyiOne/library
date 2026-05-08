import { onMount, onCleanup, Show } from 'solid-js';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

export default function ChapterPage(props) {
  onMount(() => {
    hljs.highlightAll();

    // відновлення позиції скролу
    const saved = localStorage.getItem(`scroll-${props.chapter?.slug}`);
    if (saved) window.scrollTo(0, Number(saved));

    // зберігаємо позицію скролу
    const onScroll = () => {
      localStorage.setItem(`scroll-${props.chapter?.slug}`, window.scrollY);
    };
    window.addEventListener('scroll', onScroll);
    onCleanup(() => window.removeEventListener('scroll', onScroll));

    // кнопки copy на блоках коду
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
        {/* Шапка */}
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
          </div>
        </header>

        <main class="chapter-main">
          <div
            class="markdown-body"
            innerHTML={marked.parse(props.chapter.content)}
          />
        </main>
      </div>
    </Show>
  );
}
