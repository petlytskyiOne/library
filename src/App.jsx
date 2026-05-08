import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { parsePath } from './router';
import { db, auth } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import BooksPage from './pages/BooksPage';
import BookPage from './pages/BookPage';
import ChapterPage from './pages/ChapterPage';
import UploadBook from './components/UploadBook';
import LoginPage from './pages/LoginPage';

function App() {
  const [route, setRoute] = createSignal(parsePath(window.location.pathname));
  const [books, setBooks] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [user, setUser] = createSignal(null);
  const [authReady, setAuthReady] = createSignal(false);

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

  onMount(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    onCleanup(unsub);
  });

  onMount(() => {
    const unsub = onSnapshot(
      collection(db, 'books'),
      (snap) => {
        setBooks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    onCleanup(unsub);
  });

  const r = () => route();
  const currentBook = () => books().find((b) => b.slug === r().bookSlug);
  const currentChapter = () => {
    const book = currentBook();
    const index = Number(r().chapterIndex);
    if (!book || isNaN(index)) return null;
    return book.chapters?.[index] ?? null;
  };

  return (
    <Show
      when={authReady()}
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
      <Show when={!user()}>
        <LoginPage />
      </Show>

      <Show when={user()}>
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
          <Show when={r().type === null}>
            <BooksPage
              books={books()}
              openBook={(b) => navigate(`/book/${b.slug}`)}
              onUpload={() => navigate('/upload')}
              onLogout={() => signOut(auth)}
            />
          </Show>

          <Show when={r().type === 'upload'}>
            <UploadBook
              onDone={() => navigate('/')}
              onBack={() => navigate('/')}
            />
          </Show>

          <Show when={r().type === 'book' && r().chapterIndex === null}>
            <BookPage
              book={currentBook()}
              openChapter={(_, i) =>
                navigate(`/book/${r().bookSlug}/chapter/${i}`)
              }
              back={() => navigate('/')}
            />
          </Show>

          <Show when={r().type === 'book' && r().chapterIndex !== null}>
            <ChapterPage
              chapter={currentChapter()}
              back={() => navigate(`/book/${r().bookSlug}`)}
            />
          </Show>
        </Show>
      </Show>
    </Show>
  );
}

export default App;
