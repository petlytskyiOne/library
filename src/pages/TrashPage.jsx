import { For, Show } from 'solid-js';

export default function TrashPage(props) {
  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('uk-UA');
  }

  return (
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
            Бібліотека
          </button>

          {/* ← додайте */}
          <Show when={props.trash.length > 0}>
            <button
              class="btn-action btn-danger"
              onClick={() => {
                if (confirm('Видалити всі книги з кошика назавжди?')) {
                  props.onClearAll();
                }
              }}
            >
              Очистити все
            </button>
          </Show>
        </div>
      </header>

      <main class="books-main">
        <div class="section-title">
          <span>Кошик</span>
          <span class="count">{props.trash.length}</span>
        </div>

        <Show when={props.trash.length === 0}>
          <div class="empty-state">
            <p class="empty-title">Кошик порожній</p>
            <p class="empty-sub">Видалені книги зберігаються тут</p>
          </div>
        </Show>

        <Show when={props.trash.length > 0}>
          <div class="books-grid">
            <For each={props.trash}>
              {(book) => (
                <div class="book-card">
                  <div class="book-spine" />
                  <div class="book-body">
                    <p class="book-title">{book.title || 'Без назви'}</p>
                    <p class="book-author">{book.author || '—'}</p>
                    <p class="book-meta">
                      Видалено: {formatDate(book.deletedAt)}
                    </p>
                  </div>
                  <div class="trash-actions">
                    <button
                      class="btn-restore"
                      onClick={() => props.onRestore(book.id)}
                      title="Відновити"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                      >
                        <path
                          d="M2 7a5 5 0 1 0 1-3M2 2v3h3"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      class="btn-delete-forever"
                      onClick={() => props.onDeleteForever(book.id)}
                      title="Видалити назавжди"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                      >
                        <path
                          d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.7 7.5h6.6L11 4"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </button>
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
