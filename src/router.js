export function parsePath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const type = parts[0];

  // /upload
  if (type === 'upload') {
    return { type: 'upload' };
  }

  // /trash ← сюди
  if (type === 'trash') {
    return { type: 'trash', bookSlug: null, chapterIndex: null };
  }
  if (type === 'admin') {
    return { type: 'admin', bookSlug: null, chapterIndex: null };
  }

  // /book/slug  або  /book/slug/chapter/0
  if (type === 'book') {
    const bookSlug = parts[1];

    if (!parts[2]) {
      return { type, bookSlug, chapterIndex: null };
    }

    if (parts[2] === 'chapter') {
      return { type, bookSlug, chapterIndex: parts[3] ?? null };
    }
  }

  // / — головна
  return { type: null };
}
