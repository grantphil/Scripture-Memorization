const fs = require('fs/promises');
const path = require('path');

const extraReferencesPath = path.join(__dirname, '..', 'src', 'extra-references.json');

function normalizeReference(reference) {
  return reference.replace(/\s+/g, ' ').trim().toLowerCase();
}

async function readExtraReferences() {
  try {
    const references = JSON.parse(await fs.readFile(extraReferencesPath, 'utf8'));
    if (!Array.isArray(references)) throw new Error('src/extra-references.json must contain a JSON array.');
    return references;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function main() {
  const reference = (process.env.PASSAGE_REFERENCE || process.argv[2] || '').trim();
  const title = (process.env.PASSAGE_TITLE || process.argv[3] || reference).trim();

  if (!reference) throw new Error('PASSAGE_REFERENCE is required.');
  if (reference.length > 120) throw new Error('PASSAGE_REFERENCE is too long.');
  if (title.length > 80) throw new Error('PASSAGE_TITLE is too long.');

  const references = await readExtraReferences();
  const nextReference = { title: title || reference, reference };
  const existing = references.find((candidate) => normalizeReference(candidate.reference || '') === normalizeReference(reference));

  if (existing) {
    console.log(`${reference} is already listed in src/extra-references.json.`);
    return;
  }

  references.push(nextReference);
  await fs.writeFile(extraReferencesPath, `${JSON.stringify(references, null, 2)}\n`);
  console.log(`Added ${reference} to src/extra-references.json.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
