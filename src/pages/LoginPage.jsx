import { createSignal } from 'solid-js';
import { auth } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';

export default function LoginPage() {
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [showPassword, setShowPassword] = createSignal(false);
  const [error, setError] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [isRegister, setIsRegister] = createSignal(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister()) {
        await createUserWithEmailAndPassword(auth, email(), password());
      } else {
        await signInWithEmailAndPassword(auth, email(), password());
      }
    } catch (err) {
      const messages = {
        'auth/invalid-email': 'Невірний формат email',
        'auth/wrong-password': 'Невірний пароль',
        'auth/user-not-found': 'Користувача не знайдено',
        'auth/email-already-in-use': 'Email вже використовується',
        'auth/weak-password': 'Пароль мінімум 6 символів',
        'auth/invalid-credential': 'Невірний email або пароль',
        'auth/too-many-requests': 'Забагато спроб — спробуй пізніше',
        'auth/network-request-failed': 'Помилка мережі',
      };
      setError(messages[err.code] || `Помилка: ${err.code}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="login-wrap">
      <div class="login-box">
        <p class="login-logo">bookshelf</p>
        <h1 class="login-title">{isRegister() ? 'Реєстрація' : 'Вхід'}</h1>

        <form onSubmit={handleSubmit} class="login-form">
          <input
            class="login-input"
            type="email"
            placeholder="Email"
            value={email()}
            onInput={(e) => setEmail(e.target.value)}
            required
          />

          {/* Поле пароля з кнопкою показати */}
          <div class="password-wrap">
            <input
              class="login-input password-input"
              type={showPassword() ? 'text' : 'password'}
              placeholder="Пароль (мінімум 6 символів)"
              value={password()}
              onInput={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              class="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword() ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z"
                    stroke="currentColor"
                    stroke-width="1.3"
                  />
                  <circle
                    cx="8"
                    cy="8"
                    r="1.8"
                    stroke="currentColor"
                    stroke-width="1.3"
                  />
                  <path
                    d="M3 3l10 10"
                    stroke="currentColor"
                    stroke-width="1.3"
                    stroke-linecap="round"
                  />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z"
                    stroke="currentColor"
                    stroke-width="1.3"
                  />
                  <circle
                    cx="8"
                    cy="8"
                    r="1.8"
                    stroke="currentColor"
                    stroke-width="1.3"
                  />
                </svg>
              )}
            </button>
          </div>

          {error() && <p class="login-error">{error()}</p>}

          <button
            class="btn-primary login-btn"
            type="submit"
            disabled={loading()}
          >
            {loading() ? '...' : isRegister() ? 'Зареєструватись' : 'Увійти'}
          </button>
        </form>

        <button
          class="login-toggle"
          onClick={() => {
            setIsRegister((v) => !v);
            setError('');
          }}
        >
          {isRegister()
            ? 'Вже є акаунт? Увійти'
            : 'Немає акаунту? Зареєструватись'}
        </button>
      </div>
    </div>
  );
}
