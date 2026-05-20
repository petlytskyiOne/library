## Cloudflare Pages

- майже безлімітний CDN-трафік
- дуже швидкий
- GitHub інтеграція
- підтримка React/Vite/Vue/Astro
- безкоштовний SSL
- можна працювати навіть без бекенду
- є Cloudflare Workers

cons:

- трохи складніший за Netlify
- SSR налаштовується не так просто

## GitHub Pages

Найпростіший варіант для статичних сайтів.

- повністю безкоштовний
- працює прямо з GitHub
- ідеально для HTML/CSS/JS
- можна хостити документацію або SPA

cons:

- немає серверної частини
- є обмеження по bandwidth
- для React Router потрібен workaround

Добре підходить якщо хочеш працювати «напряму з GitHub».

## Vercel

Дуже хороший для React і Next.js.

- автоматичний deploy
- швидкий CDN
- preview builds
- дуже зручний UI

cons:

- є ліміти по трафіку
- для простих сайтів інколи overkill

Особливо хороший якщо у тебе React/Vite або Next.js.

## Render

Добрий варіант якщо потрібен Node.js бекенд.

- можна запускати Express/Node сервер
- є статичний хостинг
- GitHub deploy

cons:

- free sleep mode
- повільніший старт сервера

## Firebase Hosting

Добре для SPA і мобільних/web додатків.

- швидкий CDN
- HTTPS
- легко інтегрувати auth/database

cons:

- прив’язка до екосистеми Google

## Surge.sh

Надпростий deploy через команду.

npm install -g surge
surge

- дуже швидкий deploy
- простий
- хороший для тестів

cons:

мало функцій

не для великих проєктів

Для тебе, з урахуванням того що ти робиш React/Vite/Node.js проєкти:

фронтенд → Cloudflare Pages або Vercel

прості HTML/JS → GitHub Pages

Node.js backend → Render або Railway

fullstack → Cloudflare + Supabase/Render

І так — можна повністю обійти Netlify та працювати напряму через GitHub репозиторій:

push у GitHub

Cloudflare/Vercel автоматично робить deploy

Без ручного завантаження файлів.

Також у Cloudflare Pages зараз одна з найкращих безкоштовних моделей по трафіку.

Крок 1 — створення проєкту ← ти тут
Крок 2 — vite.config.js + jsconfig.json
Крок 3 — firebase.js
Крок 4 — index.css (стилі)
Крок 5 — router.js
Крок 6 — index.jsx (точка входу)
Крок 7 — App.jsx
Крок 8 — BooksPage.jsx
Крок 9 — BookPage.jsx + ChapterPage.jsx
Крок 10 — UploadBook.jsx

## Usage

Those templates dependencies are maintained via [pnpm](https://pnpm.io) via `pnpm up -Lri`.

This is the reason you see a `pnpm-lock.yaml`. That being said, any package manager will work. This file can be safely be removed once you clone a template.

1. Open the terminal and run:

```bash
pnpm create vite@latest my-library -- --template solid
pnpm install
```

1. Next, set up the dependencies we need:

```bash
pnpm install firebase marked highlight.js jszip

```

### Learn more on the [Solid Website](https://solidjs.com) and come chat with us on our [Discord](https://discord.com/invite/solidjs)

## Available Scripts

In the project directory, you can run:

### `npm run dev` or `npm start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>

### `npm run build`

Builds the app for production to the `dist` folder.<br>
It correctly bundles Solid in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

## Deployment

You can deploy the `dist` folder to any static host provider (netlify, surge, now, etc.)
