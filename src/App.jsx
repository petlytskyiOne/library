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
import TrashPage from './pages/TrashPage';
import AdminPage from './pages/AdminPage';

// ← компонент форми імені
function NameForm(props) {
  const [name, setName] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  async function handleSave() {
    if (!name().trim()) return;
    setLoading(true);
    await props.onSave(name().trim());
    setLoading(false);
  }

  return (
    <div style={{ 'margin-top': '1rem', display: 'flex', gap: '0.5rem' }}>
      <input
        class="login-input"
        type="text"
        placeholder="Ваше ім'я"
        value={name()}
        onInput={(e) => setName(e.target.value)}
      />
      <button class="btn-primary" onClick={handleSave} disabled={loading()}>
        {loading() ? '...' : 'Зберегти'}
      </button>
    </div>
  );
}

function App() {
  const [route, setRoute] = createSignal(parsePath(window.location.pathname));
  const [books, setBooks] = createSignal([]);
  const [trash, setTrash] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [user, setUser] = createSignal(null);
  const [userProfile, setUserProfile] = createSignal(null);
  const [authReady, setAuthReady] = createSignal(false);
  const [myBooks, setMyBooks] = createSignal([]);

  onMount(() => {
    let unsubBooks = () => {};
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      unsubBooks();
      if (!u) return;
      unsubBooks = onSnapshot(
        collection(db, 'users', u.uid, 'books'),
        (snap) => setMyBooks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => {}
      );
    });
    onCleanup(() => {
      unsubAuth();
      unsubBooks();
    });
  });

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
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const { doc, getDoc, setDoc } = await import('firebase/firestore');
        const ref = doc(db, 'users', u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setUserProfile(snap.data());
        } else {
          const profile = {
            email: u.email,
            role: 'user',
            approved: false,
            createdAt: new Date().toISOString(),
          };
          await setDoc(ref, profile);
          setUserProfile(profile);
        }
      } else {
        setUserProfile(null);
      }
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

  onMount(() => {
    const unsub = onSnapshot(
      collection(db, 'trash'),
      (snap) => setTrash(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    onCleanup(unsub);
  });

  const r = () => route();
  const isAdmin = () => userProfile()?.role === 'admin';
  const isApproved = () => userProfile()?.approved === true || isAdmin();

  const currentBook = () => books().find((b) => b.slug === r().bookSlug);
  const currentChapter = () => {
    const book = currentBook();
    const index = Number(r().chapterIndex);
    if (!book || isNaN(index)) return null;
    return book.chapters?.[index] ?? null;
  };

  async function saveName(name) {
    const { doc, updateDoc } = await import('firebase/firestore');
    const { updateProfile } = await import('firebase/auth');
    await updateDoc(doc(db, 'users', user().uid), { name });
    await updateProfile(auth.currentUser, { displayName: name });
    setUserProfile((p) => ({ ...p, name }));
  }

  async function deleteBook(id, isPersonal = false) {
    const { doc, getDoc, setDoc, deleteDoc } = await import(
      'firebase/firestore'
    );
    const bookRef = isPersonal
      ? doc(db, 'users', user().uid, 'books', id)
      : doc(db, 'books', id);
    const snap = await getDoc(bookRef);
    if (!snap.exists()) return;
    const trashRef = isPersonal
      ? doc(db, 'users', user().uid, 'trash', id)
      : doc(db, 'trash', id);
    await setDoc(trashRef, {
      ...snap.data(),
      deletedAt: new Date().toISOString(),
      isPersonal,
    });
    await deleteDoc(bookRef);
  }

  async function restoreBook(id) {
    const { doc, getDoc, setDoc, deleteDoc } = await import(
      'firebase/firestore'
    );
    const snap = await getDoc(doc(db, 'trash', id));
    if (!snap.exists()) return;
    const { deletedAt, ...bookData } = snap.data();
    await setDoc(doc(db, 'books', id), bookData);
    await deleteDoc(doc(db, 'trash', id));
  }

  async function deleteForever(id) {
    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'trash', id));
  }

  async function clearTrash() {
    const { doc, deleteDoc } = await import('firebase/firestore');
    await Promise.all(
      trash().map((book) => deleteDoc(doc(db, 'trash', book.id)))
    );
  }

  const loadingScreen = (
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
  );

  return (
    <Show when={authReady()} fallback={loadingScreen}>
      <Show when={!user()}>
        <LoginPage />
      </Show>

      <Show when={user()}>
        <Show when={userProfile() !== null} fallback={loadingScreen}>
          {/* не підтверджений */}
          <Show when={!isApproved()}>
            <div class="pending-wrap">
              <div class="pending-box">
                <p class="login-logo">bookshelf</p>
                <h2>Очікуйте підтвердження</h2>
                <p style={{ color: 'var(--text3)', 'margin-top': '0.5rem' }}>
                  Адміністратор ще не підтвердив ваш акаунт.
                </p>
                <button
                  class="btn-back"
                  style={{ 'margin-top': '1.5rem' }}
                  onClick={() => signOut(auth)}
                >
                  Вийти
                </button>
              </div>
            </div>
          </Show>

          {/* підтверджений але без імені */}
          <Show when={isApproved() && !userProfile()?.name}>
            <div class="pending-wrap">
              <div class="pending-box">
                <p class="login-logo">bookshelf</p>
                <h2>Як вас звати?</h2>
                <p style={{ color: 'var(--text3)', 'margin-top': '0.5rem' }}>
                  Введіть ваше ім'я щоб продовжити
                </p>
                <NameForm onSave={saveName} />
              </div>
            </div>
          </Show>

          {/* підтверджений і є ім'я */}
          <Show when={isApproved() && userProfile()?.name}>
            <Show when={!loading()} fallback={loadingScreen}>
              <Show when={r().type === null}>
                <BooksPage
                  books={books()}
                  myBooks={myBooks()}
                  trashCount={trash().length}
                  isAdmin={isAdmin()}
                  userId={user()?.uid}
                  userEmail={userProfile()?.name || user()?.email}
                  openBook={(b) => navigate(`/book/${b.slug}`)}
                  onUpload={() => navigate('/upload')}
                  onLogout={() => signOut(auth)}
                  onDeleteBook={(id, isPersonal) => deleteBook(id, isPersonal)}
                  onOpenTrash={() => navigate('/trash')}
                  onOpenAdmin={() => navigate('/admin')}
                />
              </Show>

              <Show when={r().type === 'upload'}>
                <UploadBook
                  onDone={() => navigate('/')}
                  onBack={() => navigate('/')}
                />
              </Show>

              <Show when={r().type === 'trash'}>
                <TrashPage
                  trash={trash()}
                  onRestore={restoreBook}
                  onDeleteForever={deleteForever}
                  onClearAll={clearTrash}
                  back={() => navigate('/')}
                />
              </Show>

              <Show when={r().type === 'admin' && isAdmin()}>
                <AdminPage back={() => navigate('/')} />
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
      </Show>
    </Show>
  );
}

export default App;
