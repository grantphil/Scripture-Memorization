const fs = require('fs/promises');
const path = require('path');

const token = process.env.ESV_API_TOKEN;
const starterReferencesPath = path.join(__dirname, '..', 'src', 'starter-references.json');
const extraReferencesPath = path.join(__dirname, '..', 'src', 'extra-references.json');
const outputPath = path.join(__dirname, '..', 'src', 'starter-passages.generated.json');

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function normalizeReference(reference) {
  return reference.replace(/\s+/g, ' ').trim().toLowerCase();
}

async function readReferences(filePath) {
  try {
    const references = JSON.parse(await fs.readFile(filePath, 'utf8'));
    if (!Array.isArray(references)) throw new Error(`${filePath} must contain a JSON array.`);
    return references;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function loadReferences() {
  const references = [
    ...await readReferences(starterReferencesPath),
    ...await readReferences(extraReferencesPath),
  ];
  const seen = new Set();
  return references.filter(({ reference }) => {
    if (!reference) return false;
    const key = normalizeReference(reference);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchEsvText(reference) {
  const params = new URLSearchParams({
    q: reference,
    'include-passage-references': 'false',
    'include-verse-numbers': 'false',
    'include-footnotes': 'false',
    'include-headings': 'false',
    'include-short-copyright': 'true',
  });
  const response = await fetch(`https://api.esv.org/v3/passage/text/?${params}`, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!response.ok) throw new Error(`ESV lookup failed for ${reference}: ${response.status}`);
  const data = await response.json();
  const text = data.passages?.join(' ').replace(/\s+/g, ' ').trim();
  if (!text) throw new Error(`No ESV text returned for ${reference}`);
  return text;
}

async function main() {
  if (!token) {
    console.log('ESV_API_TOKEN is not set; skipping generated ESV passage fetch.');
    await fs.rm(outputPath, { force: true });
    return;
  }

  const references = await loadReferences();
  const passages = [];
  for (const { title, reference } of references) {
    passages.push({
      id: `${slugify(title)}-${slugify(reference)}`,
      title: title || reference,
      reference,
      text: await fetchEsvText(reference),
      translation: 'ESV',
      memorized: false,
    });
  }
  await fs.writeFile(outputPath, `${JSON.stringify(passages, null, 2)}\n`);
  console.log(`Wrote ${passages.length} ESV passages to ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
