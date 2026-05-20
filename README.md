# Scripture Memorization

A lightweight, browser-based scripture memorization app for personal studies and groups like Radical Mentoring.

## Features

- Starts with the requested starter deck of 18 ESV scripture references. ESV passage text is fetched or pasted locally rather than embedded in the repository.
- Stores cards in the browser with `localStorage` so added passages and memorized progress persist locally.
- Lets you add a card title/name, select a Bible book, chapter, and verse range, then look up the ESV passage automatically through a private server-side token.
- Supports manual ESV paste/edit when the online lookup service is unavailable.
- Includes study modes for reading, hiding key words, and showing first-letter prompts.
- Tracks memorized cards and provides shuffle practice.

## Run locally

```bash
export ESV_API_TOKEN=your_private_token_here
npm start
```

Set `ESV_API_TOKEN` in your shell before starting the app so the server can perform automatic ESV lookup without exposing the token in the browser. Then open <http://127.0.0.1:4173>.

## Check syntax

```bash
npm run build
```

## Keep the ESV token private

Do not commit the ESV API token to this repository. A committed token is visible to anyone who can read the repository history, even if it is placed in a hidden file, minified file, or GitHub Pages build artifact.

Use one of these private options instead:

- **Local development:** copy `.env.example` to `.env`, put the real token in `.env`, and export it in your shell before running `npm start`. `.env` is ignored by git.
- **Full public app:** deploy to Vercel and add the real token as a private project environment variable named `ESV_API_TOKEN`. Vercel runs `api/esv.js` as a serverless function, so new passage lookup works without exposing the token.
- **GitHub Pages static fallback:** add the real token as a GitHub Actions repository secret named `ESV_API_TOKEN` under **Settings -> Secrets and variables -> Actions**. The deployment workflow reads that secret without committing it, but Pages can only pre-generate the starter deck.

The `npm run build` command includes a secret scan that fails if a committed file contains a token-shaped value.

## Recommended: publish with Vercel for full lookup

Use Vercel when you want the public app to look up any new ESV reference from the Add Scripture form.

1. Go to <https://vercel.com/new> and import this GitHub repository.
2. Keep the framework preset as **Other** if Vercel does not auto-detect one.
3. Add a project environment variable named `ESV_API_TOKEN` with your private ESV API token as the value.
4. Deploy the project.
5. Open the Vercel URL and try adding a reference that is not in the starter deck.

The browser calls `/api/esv?reference=...`. On Vercel, that route is handled by `api/esv.js`, which reads `ESV_API_TOKEN` server-side and forwards the request to the ESV API. The token is never sent to the browser.

## Publish with GitHub Pages

This repository includes a GitHub Actions workflow at `.github/workflows/pages.yml` that publishes the static app to GitHub Pages whenever you push to `main` or `master`. The workflow can use a GitHub Actions secret named `ESV_API_TOKEN` to fetch the starter ESV passages during deployment without committing the token.

1. Push this repository to GitHub.
2. In GitHub, open **Settings -> Secrets and variables -> Actions** and add a repository secret named `ESV_API_TOKEN` with your ESV API token as the value.
3. Open **Settings -> Pages** for the repository.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.
5. Push a commit to `main` or `master`, or run the **Deploy to GitHub Pages** workflow manually from the **Actions** tab.
6. After the workflow succeeds, open the Pages URL shown in the workflow summary or in **Settings -> Pages**.

> Note: GitHub Pages hosts static files only. It can publish the generated starter ESV passages, but it cannot run the private `/api/esv` lookup route for brand-new references. Use Vercel for the full app experience.
