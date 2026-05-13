export function countUniqueWords(text) {
  if (!text) return 0;
  const words = text
    .toLowerCase()
    .replace(/[^a-zA-Zа-яА-ЯіІїЇєЄёЁ\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  return new Set(words).size;
}

export function deleteBook(slug) {
  const updated = books().filter(b => b.slug !== slug);
  setBooks(updated);
  localStorage.setItem('books', JSON.stringify(updated));
}

