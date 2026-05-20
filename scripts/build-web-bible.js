const fs = require('fs/promises');
const path = require('path');

const sourceUrl = 'https://www.gutenberg.org/cache/epub/8294/pg8294.txt';
const localSourcePath = path.join(__dirname, '..', 'web-gutenberg.txt');
const outputPath = path.join(__dirname, '..', 'src', 'web-bible.generated.json');

const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark',
  'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians',
  '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];

async function readSourceText() {
  try {
    return await fs.readFile(localSourcePath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`Could not download WEB source text: ${response.status}`);
  return response.text();
}

function cleanVerseText(value) {
  const withoutFootnotes = value
    .replace(/\{[^{}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (withoutFootnotes) return withoutFootnotes;

  return value
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseWebBible(sourceText) {
  const books = {};
  const knownBooks = new Set(BIBLE_BOOKS);
  const lines = sourceText.split(/\r?\n/);
  let inBibleText = false;
  let currentBook = '';
  let currentVerse = null;

  function finishVerse() {
    if (!currentVerse) return;
    const { book, chapter, verse, text } = currentVerse;
    const cleanedText = cleanVerseText(text);
    if (!cleanedText) throw new Error(`Empty verse text for ${book} ${chapter}:${verse}`);
    books[book][chapter][verse] = cleanedText;
    currentVerse = null;
  }

  for (const line of lines) {
    if (line.includes('*** START OF THE PROJECT GUTENBERG EBOOK')) {
      inBibleText = true;
      continue;
    }
    if (line.includes('*** END OF THE PROJECT GUTENBERG EBOOK')) {
      finishVerse();
      break;
    }
    if (!inBibleText) continue;

    const bookMatch = line.match(/^Book\s+\d+\s+(.+)$/);
    if (bookMatch) {
      finishVerse();
      currentBook = bookMatch[1].trim();
      if (!knownBooks.has(currentBook)) throw new Error(`Unexpected WEB book name: ${currentBook}`);
      books[currentBook] = {};
      continue;
    }

    const verseMatch = line.match(/^(\d{3}):(\d{3})\s+(.*)$/);
    if (verseMatch) {
      if (!currentBook) throw new Error(`Verse appeared before a book heading: ${line}`);
      finishVerse();
      const chapter = String(Number(verseMatch[1]));
      const verse = String(Number(verseMatch[2]));
      books[currentBook][chapter] ||= {};
      currentVerse = {
        book: currentBook,
        chapter,
        verse,
        text: verseMatch[3],
      };
      continue;
    }

    if (currentVerse && /^\s+\S/.test(line)) {
      currentVerse.text += ` ${line.trim()}`;
    }
  }

  const bookCount = Object.keys(books).length;
  const verseCount = Object.values(books).reduce((total, book) => (
    total + Object.values(book).reduce((bookTotal, chapter) => bookTotal + Object.keys(chapter).length, 0)
  ), 0);

  if (bookCount !== 66) throw new Error(`Expected 66 books, parsed ${bookCount}.`);
  if (verseCount < 31000) throw new Error(`Expected the full Bible, parsed only ${verseCount} verses.`);

  return { books, bookCount, verseCount };
}

async function main() {
  const sourceText = await readSourceText();
  const { books, bookCount, verseCount } = parseWebBible(sourceText);
  const bible = {
    translation: 'WEB',
    name: 'World English Bible',
    source: 'Project Gutenberg eBook #8294',
    sourceUrl,
    books,
  };

  await fs.writeFile(outputPath, `${JSON.stringify(bible)}\n`);
  console.log(`Wrote ${bookCount} WEB books and ${verseCount} verses to ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
