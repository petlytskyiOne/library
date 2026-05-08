import { For, Show } from 'solid-js';

export default function BookPage(props) {
  return (
    <Show
      when={props.book}
      fallback={
        <div class="page-wrap">
          <p style={{ padding: '4rem', color: 'var(--text3)' }}>
            Книгу не знайдено
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
              Бібліотека
            </button>
          </div>
        </header>

        <main class="book-main">
          {/* Інфо про книгу */}
          <div class="book-hero">
            <h1 class="book-hero-title">{props.book.title}</h1>
            <Show when={props.book.author}>
              <p class="book-hero-author">{props.book.author}</p>
            </Show>
            <Show when={props.book.description}>
              <p class="book-hero-desc">{props.book.description}</p>
            </Show>
            <div class="book-hero-meta">
              <span>{props.book.chapters?.length ?? 0} глав</span>
            </div>
          </div>

          {/* Список глав */}
          <p class="section-label">Зміст</p>
          <div class="chapters-list">
            <For each={props.book.chapters}>
              {(ch, i) => (
                <div
                  class="chapter-item"
                  onClick={() => props.openChapter(ch, i())}
                >
                  <span class="chapter-num">
                    {String(i() + 1).padStart(2, '0')}
                  </span>
                  <span class="chapter-title">{ch.title}</span>
                  <svg
                    class="chapter-arrow"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
              )}
            </For>
          </div>
        </main>
      </div>
    </Show>
  );
}
