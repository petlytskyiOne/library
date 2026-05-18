import { createSignal } from 'solid-js';
import JSZip from 'jszip';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

function parseBookMeta(content) {
  const get = (key) => {
    const m = content.match(new RegExp(`^${key}:\\s*(.+)`, 'm'));
    return m ? m[1].trim() : '';
  };
  const titleMatch = content.match(/^#\s+(.+)/m);
  return {
    title: titleMatch ? titleMatch[1].trim() : 'Без назви',
    author: get('author'),
    description: get('description'),
  };
}

function parseChapter(fileName, content) {
  const titleMatch = content.match(/^#\s+(.+)/m);
  const orderMatch = fileName.match(/^(\d+)/);
  return {
    slug: fileName.replace('.md', '').replace(/^\d+[-_]?/, ''),
    title: titleMatch ? titleMatch[1].trim() : fileName.replace('.md', ''),
    content: content,
    order: orderMatch ? Number(orderMatch[1]) : 99,
  };
}

function buildBook(files) {
  let meta = { title: 'Без назви', author: '', description: '' };
  const chapters = [];
  for (const [name, content] of Object.entries(files)) {
    if (name === 'book.md') {
      meta = parseBookMeta(content);
    } else if (name.endsWith('.md')) {
      chapters.push(parseChapter(name, content));
    }
  }
  chapters.sort((a, b) => a.order - b.order);
  return {
    ...meta,
    slug: meta.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, ''),
    chapters: chapters.map(({ order, ...rest }) => rest),
  };
}

async function saveToFirebase(book, isPersonal) {
  const user = auth.currentUser;
  const col = isPersonal
    ? collection(db, 'users', user.uid, 'books')
    : collection(db, 'books');
  return addDoc(col, { ...book, uploadedAt: serverTimestamp() });
}

export default function UploadBook(props) {
  const [status, setStatus] = createSignal('');
  const [phase, setPhase] = createSignal('idle');
  const [dragging, setDragging] = createSignal(false);
  const [destination, setDestination] = createSignal('shared');

  async function handleFolder(e) {
    const files = [...e.target.files];
    if (!files.length) return;
    setPhase('loading');
    setStatus('Читаємо файли...');
    const map = {};
    for (const f of files) {
      if (f.name.endsWith('.md')) map[f.name] = await f.text();
    }
    await upload(map);
  }

  async function handleZip(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhase('loading');
    setStatus('Розпаковуємо ZIP...');
    const zip = await JSZip.loadAsync(file);
    const map = {};
    for (const [path, entry] of Object.entries(zip.files)) {
      if (!entry.dir && path.endsWith('.md')) {
        map[path.split('/').pop()] = await entry.async('string');
      }
    }
    await upload(map);
  }

  function onDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  async function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = [...e.dataTransfer.files].find((f) => f.name.endsWith('.zip'));
    if (!file) {
      setPhase('err');
      setStatus('Перетягніть .zip файл');
      return;
    }
    handleZip({ target: { files: [file] } });
  }

  async function upload(files) {
    try {
      if (!Object.keys(files).length)
        throw new Error('Не знайдено жодного .md файлу');
      setStatus('Парсимо структуру...');
      const book = buildBook(files);
      if (!book.chapters.length) throw new Error('Не знайдено жодної глави');
      setStatus(`Зберігаємо "${book.title}"...`);
      await saveToFirebase(book, destination() === 'personal');
      setPhase('ok');
      setStatus(`Завантажено: "${book.title}" (${book.chapters.length} глав)`);
      setTimeout(() => props.onDone?.(), 1800);
    } catch (err) {
      setPhase('err');
      setStatus(err.message);
    }
  }

  return (
    <div class="page-wrap">
      <header class="site-header">
        <div class="header-inner">
          <button class="btn-back" onClick={props.onBack}>
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

      <main class="upload-main">
        <h1 class="upload-heading">Додати книгу</h1>
        <p class="upload-sub">ZIP архів або папка з Markdown файлами</p>

        <div class="destination-toggle">
          <button
            class={`dest-btn ${
              destination() === 'shared' ? 'dest-active' : ''
            }`}
            onClick={() => setDestination('shared')}
          >
            Спільна бібліотека
          </button>
          <button
            class={`dest-btn ${
              destination() === 'personal' ? 'dest-active' : ''
            }`}
            onClick={() => setDestination('personal')}
          >
            Мої книги
          </button>
        </div>

        <div
          class={`drop-zone${dragging() ? ' drag-over' : ''}${
            phase() === 'loading' ? ' is-loading' : ''
          }`}
          onDragOver={onDragOver}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <svg
            class="drop-icon"
            width="36"
            height="36"
            viewBox="0 0 36 36"
            fill="none"
          >
            <path
              d="M18 4v18M10 10l8-8 8 8"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M4 26v4a2 2 0 002 2h24a2 2 0 002-2v-4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <p class="drop-text">Перетягніть ZIP сюди</p>
          <p class="drop-hint">або оберіть спосіб нижче</p>
        </div>

        <div class="upload-methods">
          <label
            class={`method-card${phase() === 'loading' ? ' disabled' : ''}`}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path
                d="M4 6h14M4 10h14M4 14h8"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
            <span>ZIP архів</span>
            <input
              type="file"
              accept=".zip"
              onInput={handleZip}
              disabled={phase() === 'loading'}
              style={{ display: 'none' }}
            />
          </label>

          <label
            class={`method-card${phase() === 'loading' ? ' disabled' : ''}`}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect
                x="3"
                y="3"
                width="16"
                height="16"
                rx="2"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path
                d="M7 8h8M7 12h5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
            <span>Папка з .md</span>
            <input
              type="file"
              webkitdirectory
              multiple
              onInput={handleFolder}
              disabled={phase() === 'loading'}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {status() && (
          <div class={`upload-status phase-${phase()}`}>
            {phase() === 'loading' && <span class="spinner" />}
            {phase() === 'ok' && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8l4 4 6-7"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            )}
            {phase() === 'err' && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
                <path
                  d="M8 5v3M8 10v1"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            )}
            {status()}
          </div>
        )}

        <details class="format-hint">
          <summary>Структура файлів</summary>
          <pre class="format-pre">{`my-book/
  book.md          ← метадані
  # Назва книги
  author: Автор
  description: Опис

  01-intro.md      ← глави
  02-basics.md
  03-advanced.md`}</pre>
        </details>
      </main>
    </div>
  );
}
