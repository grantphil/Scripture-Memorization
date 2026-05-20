const ESV_API_URL = 'https://api.esv.org/v3/passage/text/';
const MAX_REFERENCE_LENGTH = 120;

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function corsHeaders(request) {
  const origin = request.headers.origin;
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!origin || !allowedOrigins.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

module.exports = async function handler(request, response) {
  const headers = corsHeaders(request);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Only GET requests are supported.' }, headers);
    return;
  }

  const reference = String(request.query?.reference || '').trim();
  if (!reference) {
    sendJson(response, 400, { error: 'Reference is required.' }, headers);
    return;
  }
  if (reference.length > MAX_REFERENCE_LENGTH) {
    sendJson(response, 400, { error: 'Reference is too long.' }, headers);
    return;
  }

  const token = process.env.ESV_API_TOKEN;
  if (!token) {
    sendJson(response, 503, { error: 'ESV lookup is not configured.' }, headers);
    return;
  }

  const params = new URLSearchParams({
    q: reference,
    'include-passage-references': 'false',
    'include-verse-numbers': 'false',
    'include-footnotes': 'false',
    'include-headings': 'false',
    'include-short-copyright': 'true',
  });

  try {
    const esvResponse = await fetch(`${ESV_API_URL}?${params}`, {
      headers: { Authorization: `Token ${token}` },
    });
    if (!esvResponse.ok) {
      sendJson(response, esvResponse.status, { error: 'ESV lookup failed.' }, headers);
      return;
    }

    const data = await esvResponse.json();
    sendJson(response, 200, data, headers);
  } catch (error) {
    sendJson(response, 502, { error: 'ESV lookup failed.' }, headers);
  }
};
