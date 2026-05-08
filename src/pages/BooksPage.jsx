import { For, Show } from 'solid-js';

export default function BooksPage(props) {
  return (
    <div class="page-wrap">
      {/* Шапка */}
      <header class="site-header">
        <div class="header-inner">
          <span class="site-logo">bookshelf</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button class="btn-back" onClick={props.onLogout}>
              Вийти
            </button>
            <button class="btn-primary" onClick={props.onUpload}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1v8M3 5l4-4 4 4M1 11h12"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              Додати книгу
            </button>
          </div>
        </div>
      </header>

      <main class="books-main">
        {/* Порожня бібліотека */}
        <Show when={props.books.length === 0}>
          <div class="empty-state">
            <div class="empty-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect
                  x="6"
                  y="4"
                  width="22"
                  height="32"
                  rx="3"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
                <path
                  d="M10 12h14M10 18h14M10 24h8"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </div>
            <p class="empty-title">Бібліотека порожня</p>
            <p class="empty-sub">
              Завантажте першу книгу у форматі ZIP або папку з .md файлами
            </p>
            <button class="btn-primary" onClick={props.onUpload}>
              Додати книгу
            </button>
          </div>
        </Show>

        {/* Список книг */}
        <Show when={props.books.length > 0}>
          <div class="section-title">
            <span>Бібліотека</span>
            <span class="count">{props.books.length}</span>
          </div>

          <div class="books-grid">
            <For each={props.books}>
              {(book) => (
                <div class="book-card" onClick={() => props.openBook(book)}>
                  <div class="book-spine" />
                  <div class="book-body">
                    <p class="book-title">{book.title || 'Без назви'}</p>
                    <p class="book-author">{book.author || '—'}</p>
                    <p class="book-meta">{book.chapters?.length ?? 0} глав</p>
                    <Show when={book.description}>
                      <p class="book-desc">{book.description}</p>
                    </Show>
                  </div>
                  <div class="book-arrow">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3 8h10M9 4l4 4-4 4"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </main>
    </div>
  );
}
