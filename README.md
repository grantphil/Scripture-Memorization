# Scripture Memorization

A lightweight, browser-based scripture memorization app for personal studies and groups like Radical Mentoring.

## Features

- Starts with the requested starter deck of 18 ESV scripture references.
- Stores cards in the browser with `localStorage` so added passages and memorized progress persist locally.
- Uses GitHub Actions and a private GitHub secret to generate ESV passage text for the static GitHub Pages app.
- Lets you add a card title/name, select a Bible book, chapter, and verse range, then fill ESV text from the generated GitHub passage library when available.
- Links directly to the selected passage on ESV.org so you can copy and paste ESV text for references that are not generated yet.
- Supports manual paste/edit when you want to supply ESV text yourself.
- Includes study modes for reading, hiding key words, and showing first-letter prompts.
- Tracks memorized cards and provides shuffle practice.

## Run locally

```bash
export ESV_API_TOKEN=your_private_token_here
npm start
```

Set `ESV_API_TOKEN` in your shell before starting the app if you want the local server to perform ESV lookup without exposing the token in the browser. Then open <http://127.0.0.1:4173>.

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

## ESV-only lookup without exposing the token

The app cannot legally cache the full ESV Bible in this repository, and GitHub Pages cannot safely call the ESV API from a visitor's browser because the token must stay private.

To keep the app ESV-only, the Add Scripture form now works in two ways:

- If the reference is already in the generated ESV library, **Auto-fill saved ESV** fills the text automatically.
- If it is not generated yet, the form links directly to the selected passage on ESV.org so the user can copy the ESV text, paste it into the app, and save the card.

## Publish with GitHub Pages

This repository includes a GitHub Actions workflow at `.github/workflows/pages.yml` that publishes the static app to GitHub Pages whenever you push to `main` or `master`. The workflow uses the `ESV_API_TOKEN` secret to fetch ESV passage text during deployment and publishes the generated ESV JSON file with the site.

1. Push this repository to GitHub.
2. In GitHub, open **Settings -> Secrets and variables -> Actions** and add a repository secret named `ESV_API_TOKEN` with your ESV API token as the value.
3. Open **Settings -> Pages** for the repository.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.
5. Push a commit to `main` or `master`, or run the **Deploy to GitHub Pages** workflow manually from the **Actions** tab.
6. After the workflow succeeds, open the Pages URL shown in the workflow summary or in **Settings -> Pages**.

The deploy workflow publishes generated ESV references when `ESV_API_TOKEN` is configured.

## Add a new passage

For normal use, open the app, choose a book/chapter/verse range, then either click **Auto-fill saved ESV** or open the passage on ESV.org and paste the ESV text into the app.

If you want a new reference to auto-fill from the generated ESV library in the future, use the included GitHub Actions workflow:

1. Open the repository on GitHub.
2. Go to **Actions**.
3. Select **Add ESV Passage**.
4. Click **Run workflow**.
5. Enter the Bible reference, such as `Romans 5:8`.
6. Optionally enter a card title, such as `Grace`.
7. Click **Run workflow**.
8. Wait for the workflow to commit the reference, fetch ESV text, and deploy GitHub Pages.
9. Open the app and look up that reference from the Add Scripture form.

You can also edit `src/extra-references.json` directly in GitHub, then run the **Deploy to GitHub Pages** workflow. The file should stay as a JSON array:

```json
[
  { "title": "Grace", "reference": "Romans 5:8" }
]
```
