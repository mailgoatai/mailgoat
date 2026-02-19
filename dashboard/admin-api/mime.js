function parseHeaders(raw) {
  if (!raw) return {};
  const separator = raw.indexOf('\r\n\r\n') >= 0 ? '\r\n\r\n' : '\n\n';
  const headerSection = raw.split(separator)[0] || '';
  const lines = headerSection.split(/\r?\n/);
  const headers = {};
  let currentKey = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    if (/^\s/.test(line) && currentKey) {
      headers[currentKey] = `${headers[currentKey]} ${line.trim()}`;
      continue;
    }

    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    headers[key] = value;
    currentKey = key;
  }

  return headers;
}

function getBodyOnly(raw) {
  if (!raw) return '';
  const separator = raw.indexOf('\r\n\r\n') >= 0 ? '\r\n\r\n' : '\n\n';
  const idx = raw.indexOf(separator);
  if (idx === -1) return raw;
  return raw.slice(idx + separator.length);
}

function extractMultipartParts(raw, contentType) {
  const boundaryMatch = contentType.match(/boundary="?([^";]+)"?/i);
  if (!boundaryMatch) {
    return { text: null, html: null };
  }

  const boundary = boundaryMatch[1];
  const body = getBodyOnly(raw);
  const chunks = body.split(`--${boundary}`);
  let text = null;
  let html = null;

  for (const chunk of chunks) {
    if (!chunk || chunk.trim() === '--') continue;
    const part = chunk.replace(/^\r?\n/, '').trim();
    const split = part.indexOf('\r\n\r\n') >= 0 ? '\r\n\r\n' : '\n\n';
    const splitIdx = part.indexOf(split);
    if (splitIdx === -1) continue;
    const partHeaders = parseHeaders(part.slice(0, splitIdx));
    const partBody = part.slice(splitIdx + split.length).trim();
    const partType = String(partHeaders['content-type'] || '').toLowerCase();

    if (partType.includes('text/plain') && text === null) {
      text = partBody;
    } else if (partType.includes('text/html') && html === null) {
      html = partBody;
    }
  }

  return { text, html };
}

function decodeBody(raw) {
  if (!raw) {
    return { headers: {}, textBody: null, htmlBody: null, rawBody: null };
  }

  const headers = parseHeaders(raw);
  const contentType = String(headers['content-type'] || '').toLowerCase();

  if (contentType.includes('multipart/')) {
    const { text, html } = extractMultipartParts(raw, contentType);
    return {
      headers,
      textBody: text,
      htmlBody: html,
      rawBody: getBodyOnly(raw),
    };
  }

  if (contentType.includes('text/html')) {
    return {
      headers,
      textBody: null,
      htmlBody: getBodyOnly(raw),
      rawBody: getBodyOnly(raw),
    };
  }

  return {
    headers,
    textBody: getBodyOnly(raw),
    htmlBody: null,
    rawBody: getBodyOnly(raw),
  };
}

module.exports = {
  decodeBody,
};
