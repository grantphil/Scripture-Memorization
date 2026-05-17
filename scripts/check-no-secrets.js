const { execFileSync } = require('child_process');
const fs = require('fs');

const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const secretPatterns = [
  {
    name: 'ESV API token literal',
    pattern: /Token\s+[a-f0-9]{40}\b/i,
  },
  {
    name: 'bare 40-character hex token',
    pattern: /\b[a-f0-9]{40}\b/i,
  },
];

let foundSecret = false;
for (const filePath of trackedFiles) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) continue;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const { name, pattern } of secretPatterns) {
    if (pattern.test(content)) {
      console.error(`Potential ${name} found in tracked file: ${filePath}`);
      foundSecret = true;
    }
  }
}

if (foundSecret) {
  console.error('Refusing to continue because secrets must be stored in environment variables or GitHub Secrets, not committed files.');
  process.exit(1);
}

console.log('No committed secret-like ESV tokens found.');
