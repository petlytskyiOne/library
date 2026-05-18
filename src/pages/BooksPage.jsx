import { For, Show, createSignal } from 'solid-js';

export default function BooksPage(props) {
  const [tab, setTab] = createSignal('shared'); // 'shared' | 'my'

  const currentBooks = () => (tab() === 'shared' ? props.books : props.myBooks);

  return (
    <div class="page-wrap">
      <header class="site-header">
        <div class="header-inner">
          <span class="site-logo">bookshelf</span>
          <span class="user-greeting">Вітаємо, {props.userEmail}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Show when={props.isAdmin}>
              <button class="btn-back" onClick={props.onOpenAdmin}>
                Адмін
              </button>
            </Show>
            <button class="btn-back" onClick={props.onOpenTrash}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.7 7.5h6.6L11 4"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              Кошик
              <Show when={props.trashCount > 0}>
                <span class="trash-badge">{props.trashCount}</span>
              </Show>
            </button>
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
        {/* вкладки */}
        <div class="tabs">
          <button
            class={`tab ${tab() === 'shared' ? 'tab-active' : ''}`}
            onClick={() => setTab('shared')}
          >
            Спільні
            <span class="count">{props.books.length}</span>
          </button>
          <button
            class={`tab ${tab() === 'my' ? 'tab-active' : ''}`}
            onClick={() => setTab('my')}
          >
            Мої книги
            <span class="count">{props.myBooks.length}</span>
          </button>
        </div>

        {/* порожня бібліотека */}
        <Show when={currentBooks().length === 0}>
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

        {/* список книг */}
        <Show when={currentBooks().length > 0}>
          <div class="books-grid">
            <For each={currentBooks()}>
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
                  <button
                    class="btn-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onDeleteBook(book.id, tab() === 'my');
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.7 7.5h6.6L11 4"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
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
