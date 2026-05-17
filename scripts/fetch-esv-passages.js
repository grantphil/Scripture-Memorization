const fs = require('fs/promises');
const path = require('path');

const token = process.env.ESV_API_TOKEN;
const referencesPath = path.join(__dirname, '..', 'src', 'starter-references.json');
const outputPath = path.join(__dirname, '..', 'src', 'starter-passages.generated.json');

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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
    console.log('ESV_API_TOKEN is not set; skipping generated ESV starter passage fetch.');
    await fs.rm(outputPath, { force: true });
    return;
  }

  const references = JSON.parse(await fs.readFile(referencesPath, 'utf8'));
  const passages = [];
  for (const { title, reference } of references) {
    passages.push({
      id: `${slugify(title)}-${slugify(reference)}`,
      title,
      reference,
      text: await fetchEsvText(reference),
      translation: 'ESV',
      memorized: false,
    });
  }
  await fs.writeFile(outputPath, `${JSON.stringify(passages, null, 2)}\n`);
  console.log(`Wrote ${passages.length} ESV starter passages to ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
