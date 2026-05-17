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
  ['Truth', 'John 8:31-32'],
  ['Grace', 'John 1:16'],
  ['Brotherhood', 'Proverbs 18:24'],
  ['Relational Obedience', 'Proverbs 27:17'],
  ['Adoption', 'Romans 8:15-16'],
  ['Ambassador', '2 Corinthians 5:20'],
  ['Things Above', 'Colossians 3:1'],
  ['Worship', 'Romans 12:1-2'],
  ['Prayer', 'Philippians 4:6-7'],
  ['Listening to God', 'John 10:27'],
  ['Priorities', 'Ephesians 5:15-16'],
  ['First', 'Matthew 6:33'],
  ['Blessing', '1 Peter 3:7'],
  ['Purpose', 'Genesis 2:15'],
  ['Work', 'Colossians 3:23-24'],
  ['Example', 'Deuteronomy 6:5-7'],
  ['Catalyst', '1 Corinthians 15:10'],
  ['Abide', 'John 15:4'],
];

const STARTER_PASSAGES = STARTER_REFERENCES.map(([title, reference]) => ({
  id: `${slugify(title)}-${slugify(reference)}`,
  title,
  reference,
  text: '',
  translation: 'ESV',
  memorized: false,
}));
const STORAGE_KEY = 'scripture-memory-passages-v2-esv';
const ESV_API_TOKEN_KEY = 'scripture-memory-esv-api-token';

let passages = loadPassages();
let activeId = passages[0]?.id;
let studyMode = 'read';
let revealed = true;

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
  esvTokenInput: document.querySelector('#esvTokenInput'),
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
      ${passage.memorized ? '<span class="memorized-badge" aria-label="memorized">✓</span>' : ''}
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
    : 'ESV text is not embedded for copyright reasons. Add an ESV API token below and fetch this passage, or paste ESV text manually.';
  elements.studyCard.innerHTML = `
    <div class="study-header">
      <div>
        <p class="eyebrow">☰ ${escapeHtml(activePassage.reference)} · ${escapeHtml(activePassage.translation || 'ESV')}</p>
        <h2>${escapeHtml(activePassage.title)}</h2>
      </div>
      <button class="icon-button danger" data-delete-id="${activePassage.id}" aria-label="delete passage">🗑</button>
    </div>

    <div class="mode-switcher" aria-label="study modes">
      <button class="${studyMode === 'read' ? 'selected' : ''}" data-mode="read">Read</button>
      <button class="${studyMode === 'blanks' ? 'selected' : ''}" data-mode="blanks">Hide Words</button>
      <button class="${studyMode === 'firstLetters' ? 'selected' : ''}" data-mode="firstLetters">First Letters</button>
    </div>

    <blockquote class="scripture-text">${scriptureHtml}</blockquote>

    <div class="study-actions">
      <button data-toggle-reveal ${hasText ? '' : 'disabled'}>${revealed ? '🙈 Practice hidden' : '👁 Reveal text'}</button>
      <button data-fetch-active>🔎 Fetch ESV text</button>
      <button data-shuffle>🔀 Shuffle</button>
      <button data-toggle-memorized class="${activePassage.memorized ? 'success' : ''}">✓ ${activePassage.memorized ? 'Memorized' : 'Mark memorized'}</button>
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
  elements.lookupButton.textContent = `🔎 Look up ${currentReference()}`;
}

function getEsvToken() {
  return elements.esvTokenInput.value.trim();
}

function saveEsvToken() {
  const token = getEsvToken();
  if (token) {
    localStorage.setItem(ESV_API_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ESV_API_TOKEN_KEY);
  }
}

async function requestEsvText(reference) {
  const token = getEsvToken();
  if (!token) {
    throw new Error('Add an ESV API token before automatic lookup.');
  }

  const response = await fetch(`/api/esv?reference=${encodeURIComponent(reference)}`, {
    headers: { 'X-ESV-Token': token },
  });
  if (!response.ok) throw new Error('ESV passage lookup was unavailable.');
  const data = await response.json();
  const passage = data.passages?.join(' ').replace(/\s+/g, ' ').trim();
  if (!passage) throw new Error('No ESV scripture text came back for that reference.');
  return passage;
}

async function fetchScripture() {
  const reference = currentReference();
  saveEsvToken();
  setMessage(`Looking up ${reference} in the ESV...`);
  elements.lookupButton.disabled = true;
  try {
    elements.scriptureText.value = await requestEsvText(reference);
    setMessage(`Found ${reference} in the ESV. Add a title, review the text, then save it.`);
  } catch (error) {
    setMessage(`${error.message} You can still paste ESV text below and save it.`);
  } finally {
    elements.lookupButton.disabled = false;
  }
}

async function fetchActivePassage() {
  const activePassage = passages.find((passage) => passage.id === activeId);
  if (!activePassage) return;
  saveEsvToken();
  setMessage(`Looking up ${activePassage.reference} in the ESV...`);
  try {
    const text = await requestEsvText(activePassage.reference);
    updatePassage(activePassage.id, { text, translation: 'ESV' });
    setMessage(`${activePassage.title} now has ESV text.`);
  } catch (error) {
    setMessage(`${error.message} You can paste ESV text into the add form if needed.`);
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
    translation: 'ESV',
    memorized: false,
  };
  activeId = newPassage.id;
  studyMode = 'read';
  revealed = true;
  elements.titleInput.value = '';
  elements.scriptureText.value = '';
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
  elements.esvTokenInput.value = localStorage.getItem(ESV_API_TOKEN_KEY) || '';
  elements.esvTokenInput.addEventListener('input', saveEsvToken);
  elements.lookupButton.addEventListener('click', fetchScripture);
  elements.clearButton.addEventListener('click', () => {
    elements.scriptureText.value = '';
    setMessage('');
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

wireEvents();
render();
