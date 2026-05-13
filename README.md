test
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
