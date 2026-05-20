# Scripture Memorization

A lightweight, browser-based scripture memorization app for personal studies and groups like Radical Mentoring.

## Features

- Starts with the requested starter deck of 18 scripture references.
- Stores cards in the browser with `localStorage` so added passages and memorized progress persist locally.
- Uses GitHub Actions and a private GitHub secret to generate ESV passage text for the static GitHub Pages app.
- Generates a full public-domain World English Bible (WEB) lookup library during the GitHub Pages deploy, so brand-new references can be added without a live API call.
- Lets you add a card title/name, select a Bible book, chapter, and verse range, then fill scripture text from the generated GitHub passage libraries.
- Supports manual paste/edit when you want to supply your own text.
- Includes study modes for reading, hiding key words, and showing first-letter prompts.
- Tracks memorized cards and provides shuffle practice.

## Run locally

```bash
export ESV_API_TOKEN=your_private_token_here
npm run build:web
npm start
```

Run `npm run build:web` once to generate the local public-domain WEB lookup file. Set `ESV_API_TOKEN` in your shell before starting the app if you also want the local server to perform ESV lookup without exposing the token in the browser. Then open <http://127.0.0.1:4173>.

## Check syntax

```bash
npm run build
```

## Keep the ESV token private

Do not commit the ESV API token to this repository. A committed token is visible to anyone who can read the repository history, even if it is placed in a hidden file, minified file, or GitHub Pages build artifact.

Use one of these private options instead:

- **Local development:** copy `.env.example` to `.env`, put the real token in `.env`, and export it in your shell before running `npm start`. `.env` is ignored by git.
- **GitHub Pages deployment:** add the real token as a GitHub Actions repository secret named `ESV_API_TOKEN` under **Settings -> Secrets and variables -> Actions**. GitHub Actions reads that secret while generating passage text, without committing the token.

The `npm run build` command includes a secret scan that fails if a committed file contains a token-shaped value.

## Full-Bible lookup without a runtime API

The app cannot legally cache the full ESV Bible in this repository. The ESV API terms limit copying/downloading stored text to small portions of the Bible, so this project keeps ESV text limited to generated references.

For full-Bible lookup, the GitHub Pages workflow runs `npm run build:web` and generates `src/web-bible.generated.json` from Project Gutenberg's public-domain World English Bible (WEB). That generated file is uploaded with the GitHub Pages site, so visitors can look up new references from GitHub Pages without calling the ESV API or seeing any private token.

## Publish with GitHub Pages

This repository includes a GitHub Actions workflow at `.github/workflows/pages.yml` that publishes the static app to GitHub Pages whenever you push to `main` or `master`. The workflow uses the `ESV_API_TOKEN` secret to fetch ESV passage text during deployment and publishes the generated JSON file with the site.

1. Push this repository to GitHub.
2. In GitHub, open **Settings -> Secrets and variables -> Actions** and add a repository secret named `ESV_API_TOKEN` with your ESV API token as the value.
3. Open **Settings -> Pages** for the repository.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.
5. Push a commit to `main` or `master`, or run the **Deploy to GitHub Pages** workflow manually from the **Actions** tab.
6. After the workflow succeeds, open the Pages URL shown in the workflow summary or in **Settings -> Pages**.

The deploy workflow publishes both generated ESV references, when `ESV_API_TOKEN` is configured, and the generated WEB full-Bible lookup library.

## Add a new passage

For normal use, open the app, choose a book/chapter/verse range, click **Look up**, and save the card. If an ESV copy exists in the generated ESV library the app uses that; otherwise it uses the generated WEB library.

GitHub Pages is static, so it cannot safely call the ESV API with your private token from a visitor's browser. If you specifically want a new reference to use ESV text instead of the WEB fallback, use the included GitHub Actions workflow:

1. Open the repository on GitHub.
2. Go to **Actions**.
3. Select **Add ESV Passage**.
4. Click **Run workflow**.
5. Enter the Bible reference, such as `Romans 5:8`.
6. Optionally enter a card title, such as `Grace`.
7. Click **Run workflow**.
8. Wait for the workflow to commit the reference, fetch ESV text, rebuild the WEB library, and deploy GitHub Pages.
9. Open the app and look up that reference from the Add Scripture form.

You can also edit `src/extra-references.json` directly in GitHub, then run the **Deploy to GitHub Pages** workflow. The file should stay as a JSON array:

```json
[
  { "title": "Grace", "reference": "Romans 5:8" }
]
```
