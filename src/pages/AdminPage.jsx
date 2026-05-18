import { createSignal, onMount, For, Show } from 'solid-js';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function AdminPage(props) {
  const [users, setUsers] = createSignal([]);
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    const snap = await getDocs(collection(db, 'users'));
    setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  });

  async function toggleApproved(uid, current) {
    await updateDoc(doc(db, 'users', uid), { approved: !current });
    setUsers((list) =>
      list.map((u) => (u.id === uid ? { ...u, approved: !current } : u))
    );
  }

  async function toggleRole(uid, current) {
    const newRole = current === 'admin' ? 'user' : 'admin';
    await updateDoc(doc(db, 'users', uid), { role: newRole });
    setUsers((list) =>
      list.map((u) => (u.id === uid ? { ...u, role: newRole } : u))
    );
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
          <span style={{ color: 'var(--text3)', 'font-size': '0.85rem' }}>
            Адмін панель
          </span>
        </div>
      </header>

      <main class="books-main">
        <div class="section-title">
          <span>Користувачі</span>
          <span class="count">{users().length}</span>
        </div>

        <Show when={loading()}>
          <p style={{ color: 'var(--text3)', padding: '2rem 0' }}>
            Завантаження...
          </p>
        </Show>

        <Show when={!loading()}>
          <div class="users-list">
            <For each={users()}>
              {(u) => (
                <div class="user-row">
                  <div class="user-info">
                    <span class="user-email">{u.email}</span>
                    <div class="user-badges">
                      <span
                        class={`badge ${
                          u.approved ? 'badge-green' : 'badge-gray'
                        }`}
                      >
                        {u.approved ? 'підтверджений' : 'очікує'}
                      </span>
                      <span
                        class={`badge ${
                          u.role === 'admin' ? 'badge-blue' : 'badge-gray'
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>
                  </div>
                  <div class="user-actions">
                    <button
                      class={
                        u.approved
                          ? 'btn-action btn-danger'
                          : 'btn-action btn-success'
                      }
                      onClick={() => toggleApproved(u.id, u.approved)}
                    >
                      {u.approved ? 'Заблокувати' : 'Підтвердити'}
                    </button>
                    <button
                      class="btn-action btn-secondary"
                      onClick={() => toggleRole(u.id, u.role)}
                    >
                      {u.role === 'admin' ? '→ user' : '→ admin'}
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
