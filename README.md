# Scripture Memorization

A lightweight, browser-based scripture memorization app for personal studies and groups like Radical Mentoring.

## Features

- Starts with the requested starter deck of 18 ESV scripture references. ESV passage text is fetched or pasted locally rather than embedded in the repository.
- Stores cards in the browser with `localStorage` so added passages and memorized progress persist locally.
- Lets you add a card title/name, select a Bible book, chapter, and verse range, then look up the ESV passage automatically with your ESV API token.
- Supports manual ESV paste/edit when the online lookup is unavailable or no token is configured.
- Includes study modes for reading, hiding key words, and showing first-letter prompts.
- Tracks memorized cards and provides shuffle practice.

## Run locally

```bash
npm start
```

Then open <http://127.0.0.1:4173>. For automatic ESV lookup, paste your token from <https://api.esv.org/> into the ESV API token field. The local app server proxies the lookup to avoid browser CORS issues; the token and fetched passages are stored only in your browser.

## Check syntax

```bash
npm run build
```

## Publish with GitHub Pages

This repository includes a GitHub Actions workflow at `.github/workflows/pages.yml` that publishes the static app to GitHub Pages whenever you push to `main` or `master`.

1. Push this repository to GitHub.
2. In GitHub, open **Settings → Pages** for the repository.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push a commit to `main` or `master`, or run the **Deploy to GitHub Pages** workflow manually from the **Actions** tab.
5. After the workflow succeeds, open the Pages URL shown in the workflow summary or in **Settings → Pages**.

> Note: GitHub Pages hosts static files only, so it will publish the deck, study modes, local browser storage, and manual ESV paste/edit flow. The local `server.js` ESV proxy cannot run on GitHub Pages. To keep automatic ESV lookup on the public site, deploy `server.js` to a separate Node host or serverless function and update `requestEsvText` in `src/app.js` to call that endpoint.
