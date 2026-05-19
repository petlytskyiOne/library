import { render } from 'solid-js/web';
import './index.css';
import App from './App';

const root = document.getElementById('root');

render(() => <App />, root);
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  // зберігаємо подію
  window._installPrompt = e;
});
