const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark',
  'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians',
  '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation'
];

const STARTER_REFERENCES = [
  { title: 'Truth', reference: 'John 8:31-32' },
  { title: 'Grace', reference: 'John 1:16' },
  { title: 'Brotherhood', reference: 'Proverbs 18:24' },
  { title: 'Relational Obedience', reference: 'Proverbs 27:17' },
  { title: 'Adoption', reference: 'Romans 8:15-16' },
  { title: 'Ambassador', reference: '2 Corinthians 5:20' },
  { title: 'Things Above', reference: 'Colossians 3:1' },
  { title: 'Worship', reference: 'Romans 12:1-2' },
  { title: 'Prayer', reference: 'Philippians 4:6-7' },
  { title: 'Listening to God', reference: 'John 10:27' },
  { title: 'Priorities', reference: 'Ephesians 5:15-16' },
  { title: 'First', reference: 'Matthew 6:33' },
  { title: 'Blessing', reference: '1 Peter 3:7' },
  { title: 'Purpose', reference: 'Genesis 2:15' },
  { title: 'Work', reference: 'Colossians 3:23-24' },
  { title: 'Example', reference: 'Deuteronomy 6:5-7' },
  { title: 'Catalyst', reference: '1 Corinthians 15:10' },
  { title: 'Abide', reference: 'John 15:4' },
];
const STARTER_PASSAGES = STARTER_REFERENCES.map(({ title, reference }) => ({
  id: `${slugify(title)}-${slugify(reference)}`,
  title,
  reference,
  text: '',
  translation: 'ESV',
  memorized: false,
}));
const STORAGE_KEY = 'scripture-memory-passages-v2-esv';
const OFFLINE_BIBLE_PATH = 'src/web-bible.generated.json';

let passages = loadPassages();
let activeId = passages[0]?.id;
let studyMode = 'read';
let revealed = true;
let generatedPassagesPromise;
let offlineBiblePromise;
let pendingTranslation = 'ESV';
const generatedPassageCache = new Map();

const elements = {
  progressPercent: document.querySelector('#progressPercent'),
  progressCopy: document.querySelector('#progressCopy'),
  progressBar: document.querySelector('#progressBar'),
  cardCount: document.querySelector('#cardCount'),
  searchBox: document.querySelector('#searchBox'),
  passageList: document.querySelector('#passageList'),
  studyCard: document.querySelector('#studyCard'),
  addForm: document.querySelector('#addForm'),
  titleInput: document.querySelector('#titleInput'),
  bookSelect: document.querySelector('#bookSelect'),
  chapterInput: document.querySelector('#chapterInput'),
  startVerseInput: document.querySelector('#startVerseInput'),
  endVerseInput: document.querySelector('#endVerseInput'),
  lookupButton: document.querySelector('#lookupButton'),
  clearButton: document.querySelector('#clearButton'),
  lookupMessage: document.querySelector('#lookupMessage'),
  scriptureText: document.querySelector('#scriptureText'),
};

function loadPassages() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return Array.isArray(saved) && saved.length ? saved : STARTER_PASSAGES;
  } catch (error) {
    return STARTER_PASSAGES;
  }
}

function persist(nextPassages) {
  passages = nextPassages;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(passages));
  render();
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function normalizeReference(reference) {
  return reference.replace(/\s+/g, ' ').trim().toLowerCase();
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character]));
}

function currentReference() {
  const book = elements.bookSelect.value;
  const chapter = elements.chapterInput.value || 1;
  const startVerse = elements.startVerseInput.value || 1;
  const endVerse = elements.endVerseInput.value ? `-${elements.endVerseInput.value}` : '';
  return `${book} ${chapter}:${startVerse}${endVerse}`;
}

function parseReference(reference) {
  const normalized = reference.replace(/\s+/g, ' ').trim();
  const lowerReference = normalized.toLowerCase();
  const book = [...BIBLE_BOOKS]
    .sort((left, right) => right.length - left.length)
    .find((candidate) => lowerReference.startsWith(`${candidate.toLowerCase()} `));

  if (!book) return null;

  const verseRange = normalized.slice(book.length).trim().match(/^(\d+):(\d+)(?:\s*-\s*(\d+))?$/);
  if (!verseRange) return null;

  const chapter = Number(verseRange[1]);
  const startVerse = Number(verseRange[2]);
  const endVerse = Number(verseRange[3] || verseRange[2]);
  if (!chapter || !startVerse || !endVerse || endVerse < startVerse || endVerse - startVerse > 250) return null;

  return {
    book,
    chapter: String(chapter),
    startVerse,
    endVerse,
  };
}

function setMessage(message) {
  elements.lookupMessage.textContent = message;
  elements.lookupMessage.classList.toggle('hidden', !message);
}

function hiddenPassageHtml(text) {
  return text.split(/(\s+)/).map((word, index) => {
    if (/^\s+$/.test(word)) return word;
    const clean = word.replace(/[^A-Za-z0-9]/g, '');
    if (!clean) return escapeHtml(word);
    if (studyMode === 'firstLetters') {
      const suffix = word.match(/[^A-Za-z0-9]+$/)?.[0] || '';
      return `<span class="hint-word">${escapeHtml(word[0])}${'_'.repeat(Math.max(clean.length - 1, 1))}${escapeHtml(suffix)}</span>`;
    }
    if (index % 4 === 0 || clean.length > 6) {
      return '<span class="blank-word" aria-label="hidden word">&nbsp;</span>';
    }
    return escapeHtml(word);
  }).join('');
}

function renderDeck() {
  const search = elements.searchBox.value.trim().toLowerCase();
  const filtered = search
    ? passages.filter((passage) => `${passage.title} ${passage.reference} ${passage.text}`.toLowerCase().includes(search))
    : passages;

  elements.passageList.innerHTML = filtered.map((passage) => `
    <button class="passage-row ${passage.id === activeId ? 'active' : ''}" data-select-id="${passage.id}">
      <strong>${escapeHtml(passage.title)}</strong>
      <span>${escapeHtml(passage.reference)}</span>
      ${passage.memorized ? '<span class="memorized-badge" aria-label="memorized">\u2713</span>' : ''}
    </button>
  `).join('') || '<p class="empty-state">No cards match that search.</p>';
}

function renderStudyCard() {
  const activePassage = passages.find((passage) => passage.id === activeId) || passages[0];
  if (!activePassage) {
    elements.studyCard.innerHTML = '<p>Add your first passage to begin.</p>';
    return;
  }

  const hasText = Boolean(activePassage.text);
  const scriptureHtml = hasText
    ? (revealed || studyMode === 'read' ? escapeHtml(activePassage.text) : hiddenPassageHtml(activePassage.text))
    : 'Scripture text is not loaded yet. Use automatic lookup, or paste text manually.';
  elements.studyCard.innerHTML = `
    <div class="study-header">
      <div>
        <p class="eyebrow">\u2630 ${escapeHtml(activePassage.reference)} \u00b7 ${escapeHtml(activePassage.translation || 'ESV')}</p>
        <h2>${escapeHtml(activePassage.title)}</h2>
      </div>
      <button class="icon-button danger" data-delete-id="${activePassage.id}" aria-label="delete passage">\u{1f5d1}</button>
    </div>

    <div class="mode-switcher" aria-label="study modes">
      <button class="${studyMode === 'read' ? 'selected' : ''}" data-mode="read">Read</button>
      <button class="${studyMode === 'blanks' ? 'selected' : ''}" data-mode="blanks">Hide Words</button>
      <button class="${studyMode === 'firstLetters' ? 'selected' : ''}" data-mode="firstLetters">First Letters</button>
    </div>

    <blockquote class="scripture-text">${scriptureHtml}</blockquote>

    <div class="study-actions">
      <button data-toggle-reveal ${hasText ? '' : 'disabled'}>${revealed ? '\u{1f648} Practice hidden' : '\u{1f441} Reveal text'}</button>
      <button data-fetch-active>\u{1f50e} Fetch scripture text</button>
      <button data-shuffle>\u{1f500} Shuffle</button>
      <button data-toggle-memorized class="${activePassage.memorized ? 'success' : ''}">\u2713 ${activePassage.memorized ? 'Memorized' : 'Mark memorized'}</button>
    </div>
  `;
}

function renderProgress() {
  const memorizedCount = passages.filter((passage) => passage.memorized).length;
  const progress = passages.length ? Math.round((memorizedCount / passages.length) * 100) : 0;
  elements.progressPercent.textContent = `${progress}%`;
  elements.progressCopy.textContent = `${memorizedCount} of ${passages.length} marked memorized`;
  elements.progressBar.style.width = `${progress}%`;
  elements.cardCount.textContent = `${passages.length} cards`;
}

function render() {
  if (!passages.find((passage) => passage.id === activeId)) activeId = passages[0]?.id;
  renderProgress();
  renderDeck();
  renderStudyCard();
  elements.lookupButton.textContent = `\u{1f50e} Look up ${currentReference()}`;
}

async function loadOfflineBible() {
  if (!offlineBiblePromise) {
    offlineBiblePromise = fetch(OFFLINE_BIBLE_PATH, { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error('The offline Bible library has not been generated yet.');
        return response.json();
      })
      .catch((error) => {
        offlineBiblePromise = null;
        throw error;
      });
  }

  return offlineBiblePromise;
}

async function requestOfflineBibleText(reference) {
  const parsedReference = parseReference(reference);
  if (!parsedReference) throw new Error(`${reference} is not a supported lookup format.`);

  const bible = await loadOfflineBible();
  const chapter = bible.books?.[parsedReference.book]?.[parsedReference.chapter];
  if (!chapter) throw new Error(`${reference} was not found in the offline Bible library.`);

  const verses = [];
  for (let verse = parsedReference.startVerse; verse <= parsedReference.endVerse; verse += 1) {
    const verseText = chapter[String(verse)];
    if (!verseText) throw new Error(`${reference} was not found in the offline Bible library.`);
    verses.push(verseText);
  }

  return {
    text: verses.join(' '),
    translation: bible.translation || 'WEB',
  };
}

async function requestScriptureText(reference) {
  const normalizedReference = normalizeReference(reference);
  let cachedPassage = generatedPassageCache.get(normalizedReference);
  if (!cachedPassage && generatedPassagesPromise) {
    await generatedPassagesPromise;
    cachedPassage = generatedPassageCache.get(normalizedReference);
  }
  if (cachedPassage?.text) {
    return {
      text: cachedPassage.text,
      translation: cachedPassage.translation || 'ESV',
    };
  }

  const savedPassage = passages.find((passage) => normalizeReference(passage.reference) === normalizedReference && passage.text);
  if (savedPassage) {
    return {
      text: savedPassage.text,
      translation: savedPassage.translation || 'ESV',
    };
  }

  try {
    return await requestOfflineBibleText(reference);
  } catch (offlineError) {
    // Local development can still use the small private-token server when the generated WEB file is absent.
  }

  const response = await fetch(`/api/esv?reference=${encodeURIComponent(reference)}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`${reference} is not in the generated scripture libraries yet. Run the GitHub Pages deploy workflow, or paste text manually.`);
    }
    throw new Error('Scripture lookup was unavailable.');
  }
  const data = await response.json();
  const passage = data.passages?.join(' ').replace(/\s+/g, ' ').trim();
  if (!passage) throw new Error('No ESV scripture text came back for that reference.');
  return {
    text: passage,
    translation: 'ESV',
  };
}

async function fetchScripture() {
  const reference = currentReference();
  setMessage(`Looking up ${reference}...`);
  elements.lookupButton.disabled = true;
  try {
    const passage = await requestScriptureText(reference);
    elements.scriptureText.value = passage.text;
    pendingTranslation = passage.translation;
    setMessage(`Found ${reference} in the ${passage.translation}. Add a title, review the text, then save it.`);
  } catch (error) {
    setMessage(`${error.message} You can still paste scripture text below and save it.`);
  } finally {
    elements.lookupButton.disabled = false;
  }
}

async function fetchActivePassage() {
  const activePassage = passages.find((passage) => passage.id === activeId);
  if (!activePassage) return;
  setMessage(`Looking up ${activePassage.reference}...`);
  try {
    const passage = await requestScriptureText(activePassage.reference);
    updatePassage(activePassage.id, { text: passage.text, translation: passage.translation });
    setMessage(`${activePassage.title} now has ${passage.translation} text.`);
  } catch (error) {
    setMessage(`${error.message} You can paste scripture text into the add form if needed.`);
  }
}

function addPassage(event) {
  event.preventDefault();
  const reference = currentReference();
  const title = elements.titleInput.value.trim() || reference;
  const text = elements.scriptureText.value.trim();
  if (!text) {
    setMessage('Add or look up the scripture text before saving this card.');
    return;
  }
  const newPassage = {
    id: `${slugify(title)}-${slugify(reference)}-${Date.now()}`,
    title,
    reference,
    text,
    translation: pendingTranslation,
    memorized: false,
  };
  activeId = newPassage.id;
  studyMode = 'read';
  revealed = true;
  elements.titleInput.value = '';
  elements.scriptureText.value = '';
  pendingTranslation = 'ESV';
  setMessage(`${title} was added to your memory deck.`);
  persist([newPassage, ...passages]);
}

function chooseRandomPassage() {
  if (passages.length < 2) return;
  const activePassage = passages.find((passage) => passage.id === activeId) || passages[0];
  const choices = passages.filter((passage) => passage.id !== activePassage.id);
  activeId = choices[Math.floor(Math.random() * choices.length)].id;
  revealed = studyMode === 'read';
  render();
}

function updatePassage(id, changes) {
  persist(passages.map((passage) => passage.id === id ? { ...passage, ...changes } : passage));
}

function removePassage(id) {
  persist(passages.filter((passage) => passage.id !== id));
}

function wireEvents() {
  BIBLE_BOOKS.forEach((book) => {
    const option = document.createElement('option');
    option.value = book;
    option.textContent = book;
    option.selected = book === 'John';
    elements.bookSelect.append(option);
  });

  elements.searchBox.addEventListener('input', renderDeck);
  [elements.bookSelect, elements.chapterInput, elements.startVerseInput, elements.endVerseInput].forEach((field) => {
    field.addEventListener('input', render);
  });
  elements.lookupButton.addEventListener('click', fetchScripture);
  elements.clearButton.addEventListener('click', () => {
    elements.scriptureText.value = '';
    pendingTranslation = 'ESV';
    setMessage('');
  });
  elements.scriptureText.addEventListener('input', () => {
    pendingTranslation = 'Custom';
  });
  elements.addForm.addEventListener('submit', addPassage);

  document.addEventListener('click', (event) => {
    const selectButton = event.target.closest('[data-select-id]');
    const modeButton = event.target.closest('[data-mode]');
    const deleteButton = event.target.closest('[data-delete-id]');
    const activePassage = passages.find((passage) => passage.id === activeId) || passages[0];

    if (selectButton) {
      activeId = selectButton.dataset.selectId;
      revealed = studyMode === 'read';
      render();
    }
    if (modeButton) {
      studyMode = modeButton.dataset.mode;
      revealed = studyMode === 'read';
      render();
    }
    if (event.target.closest('[data-toggle-reveal]')) {
      revealed = !revealed;
      render();
    }
    if (event.target.closest('[data-fetch-active]')) fetchActivePassage();
    if (event.target.closest('[data-shuffle]')) chooseRandomPassage();
    if (event.target.closest('[data-toggle-memorized]') && activePassage) {
      updatePassage(activePassage.id, { memorized: !activePassage.memorized });
    }
    if (deleteButton) removePassage(deleteButton.dataset.deleteId);
  });
}

async function loadGeneratedStarterPassages() {
  try {
    const response = await fetch('src/starter-passages.generated.json', { cache: 'no-store' });
    if (!response.ok) return;
    const generatedPassages = await response.json();
    if (!Array.isArray(generatedPassages) || !generatedPassages.length) return;
    rememberGeneratedPassages(generatedPassages);

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (Array.isArray(saved) && saved.length) {
      if (mergeGeneratedTextIntoDeck()) render();
      return;
    }

    passages = generatedPassages;
    activeId = passages[0]?.id;
    render();
  } catch (error) {
    // The generated file is optional for local development and Pages builds without a secret.
  }
}

function rememberGeneratedPassages(generatedPassages) {
  generatedPassages.forEach((passage) => {
    if (passage?.reference && passage?.text) {
      generatedPassageCache.set(normalizeReference(passage.reference), passage);
    }
  });
}

function mergeGeneratedTextIntoDeck() {
  let changed = false;
  passages = passages.map((passage) => {
    if (passage.text) return passage;
    const generatedPassage = generatedPassageCache.get(normalizeReference(passage.reference));
    if (!generatedPassage?.text) return passage;
    changed = true;
    return {
      ...passage,
      text: generatedPassage.text,
      translation: generatedPassage.translation || passage.translation || 'ESV',
    };
  });
  if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(passages));
  return changed;
}

async function hydrateMissingStarterText() {
  const missing = passages.filter((passage) => !passage.text);
  if (!missing.length) return;

  let changed = false;
  for (const passage of missing) {
    const generatedPassage = generatedPassageCache.get(normalizeReference(passage.reference));
    if (!generatedPassage?.text) continue;
    passages = passages.map((candidate) => (
      candidate.id === passage.id
        ? { ...candidate, text: generatedPassage.text, translation: generatedPassage.translation || candidate.translation || 'ESV' }
        : candidate
    ));
    changed = true;
  }

  if (changed) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(passages));
    render();
  }
}

wireEvents();
render();
generatedPassagesPromise = loadGeneratedStarterPassages();
generatedPassagesPromise.then(hydrateMissingStarterText);
