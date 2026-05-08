import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { parsePath } from './router';
import { db } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';

import BooksPage from './pages/BooksPage';
import BookPage from './pages/BookPage';
import ChapterPage from './pages/ChapterPage';
import UploadBook from './components/UploadBook';

function App() {
  const [route, setRoute] = createSignal(parsePath(window.location.pathname));
  const [books, setBooks] = createSignal([]);
  const [loading, setLoading] = createSignal(true);

  // ── Навігація ──────────────────────────────────────
  function navigate(path) {
    window.history.pushState({}, '', path);
    setRoute(parsePath(path));
    window.scrollTo(0, 0);
  }

  onMount(() => {
    const handler = () => setRoute(parsePath(window.location.pathname));
    window.addEventListener('popstate', handler);
    onCleanup(() => window.removeEventListener('popstate', handler));
  });

  // ── Firebase: real-time підписка ───────────────────
  onMount(() => {
    const unsub = onSnapshot(
      collection(db, 'books'),
      (snap) => {
        setBooks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('Firebase error:', err);
        setLoading(false);
      }
    );
    onCleanup(unsub);
  });

  // ── Хелпери ────────────────────────────────────────
  const r = () => route();

  const currentBook = () => books().find((b) => b.slug === r().bookSlug);

  const currentChapter = () => {
    const book = currentBook();
    const index = Number(r().chapterIndex);
    if (!book || isNaN(index)) return null;
    return book.chapters?.[index] ?? null;
  };

  // ── UI ─────────────────────────────────────────────
  return (
    <Show
      when={!loading()}
      fallback={
        <div
          style={{
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            height: '100vh',
            color: 'var(--text3)',
          }}
        >
          завантаження...
        </div>
      }
    >
      {/* Головна — список книг */}
      <Show when={r().type === null}>
        <BooksPage
          books={books()}
          openBook={(b) => navigate(`/book/${b.slug}`)}
          onUpload={() => navigate('/upload')}
        />
      </Show>

      {/* Завантаження книги */}
      <Show when={r().type === 'upload'}>
        <UploadBook onDone={() => navigate('/')} onBack={() => navigate('/')} />
      </Show>

      {/* Сторінка книги */}
      <Show when={r().type === 'book' && r().chapterIndex === null}>
        <BookPage
          book={currentBook()}
          openChapter={(_, i) => navigate(`/book/${r().bookSlug}/chapter/${i}`)}
          back={() => navigate('/')}
        />
      </Show>

      {/* Сторінка глави */}
      <Show when={r().type === 'book' && r().chapterIndex !== null}>
        <ChapterPage
          chapter={currentChapter()}
          back={() => navigate(`/book/${r().bookSlug}`)}
        />
      </Show>
    </Show>
  );
}

export default App;
