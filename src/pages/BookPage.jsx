import { For, Show } from 'solid-js';
import JSZip from 'jszip';

export default function BookPage(props) {
  async function downloadBook() {
    const zip = new JSZip();
    const folder = zip.folder(props.book.slug);

    // book.md — метадані
    const meta = [
      `# ${props.book.title}`,
      `author: ${props.book.author || ''}`,
      `description: ${props.book.description || ''}`,
    ].join('\n');
    folder.file('book.md', meta);

    // глави
    props.book.chapters.forEach((ch, i) => {
      const num = String(i + 1).padStart(2, '0');
      folder.file(`${num}-${ch.slug}.md`, ch.content);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${props.book.slug}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

            {/* Кнопка завантаження */}
            <button class="btn-download" onClick={downloadBook}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1v8M3 9l4 4 4-4M1 13h12"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              Завантажити .md
            </button>
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
