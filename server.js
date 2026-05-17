const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 4173;
const ROOT = __dirname;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function send(response, status, body, type = 'application/json; charset=utf-8') {
  response.writeHead(status, { 'Content-Type': type });
  response.end(body);
}

function serveStatic(requestPath, response) {
  const safePath = path.normalize(requestPath).replace(/^\.{2,}(\/|\\|$)/, '');
  const filePath = path.join(ROOT, safePath === '/' ? 'index.html' : safePath);
  if (!filePath.startsWith(ROOT)) {
    send(response, 403, 'Forbidden', 'text/plain; charset=utf-8');
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      send(response, 404, 'Not found', 'text/plain; charset=utf-8');
      return;
    }
    send(response, 200, content, TYPES[path.extname(filePath)] || 'application/octet-stream');
  });
}

function fetchEsv(reference, token, response) {
  const params = new URLSearchParams({
    q: reference,
    'include-passage-references': 'false',
    'include-verse-numbers': 'false',
    'include-footnotes': 'false',
    'include-headings': 'false',
    'include-short-copyright': 'true',
  });
  const options = {
    hostname: 'api.esv.org',
    path: `/v3/passage/text/?${params}`,
    method: 'GET',
    headers: { Authorization: `Token ${token}` },
  };

  const esvRequest = https.request(options, (esvResponse) => {
    let body = '';
    esvResponse.on('data', (chunk) => { body += chunk; });
    esvResponse.on('end', () => {
      send(response, esvResponse.statusCode || 502, body);
    });
  });
  esvRequest.on('error', () => {
    send(response, 502, JSON.stringify({ error: 'ESV lookup failed.' }));
  });
  esvRequest.end();
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === '/api/esv') {
    const reference = url.searchParams.get('reference');
    const token = request.headers['x-esv-token'];
    if (!reference || !token) {
      send(response, 400, JSON.stringify({ error: 'Reference and ESV token are required.' }));
      return;
    }
    fetchEsv(reference, token, response);
    return;
  }
  serveStatic(url.pathname, response);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Scripture Memorization running at http://127.0.0.1:${PORT}`);
});
