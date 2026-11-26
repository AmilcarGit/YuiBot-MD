// Adaptado del archivo cnv.mjs proporcionado por el usuario.
const BASE_URL = 'https://cnv.cx';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';
const SERVERS = [
  { name: 'y2meta-uk', origin: 'https://iframe.y2meta-uk.com', referer: 'https://iframe.y2meta-uk.com/' },
  { name: 'mp3yt', origin: 'https://mp3yt.is', referer: 'https://mp3yt.is/' }
];
function headersFor(server) {
  return { Accept: '*/*', Origin: server.origin, Referer: server.referer,
    'User-Agent': USER_AGENT, 'Cache-Control': 'no-cache', Pragma: 'no-cache' };
}
function extractYouTubeId(value) {
  try {
    const u = new URL(String(value || '').trim());
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be') id = u.pathname.split('/').filter(Boolean)[0] || '';
    else if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
      else {
        const parts = u.pathname.split('/').filter(Boolean);
        if (['shorts','embed','live'].includes(parts[0])) id = parts[1] || '';
      }
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
  } catch { return ''; }
}
async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout])
    : timeout;
  try {
    return await fetch(url, { ...options, signal, redirect: 'follow' });
  } catch (error) {
    if (timeout.aborted) throw new Error('Timeout después de ' + timeoutMs + 'ms');
    // Abort del proveedor lento: transmitirlo al llamador para detenerlo.
    throw error;
  }
}
async function readJson(response, label) {
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(label + ': respuesta no JSON (' + response.status + ')'); }
  if (!response.ok) {
    const detail = data?.errorMsg || data?.error?.message || data?.message || ('HTTP ' + response.status);
    throw new Error(label + ': ' + detail);
  }
  return data;
}
async function freshKey(server, payload, signal) {
  const videoId = extractYouTubeId(payload?.link);
  if (!videoId) throw new Error(server.name + ' key: no se pudo obtener el video ID de YouTube');
  const keyUrl = new URL(BASE_URL + '/v2/sanity/key');
  keyUrl.searchParams.set('id', videoId);
  const response = await fetchWithTimeout(keyUrl.toString(),
    { method: 'GET', headers: headersFor(server), signal }, 10000);
  const data = await readJson(response, server.name + ' key');
  if (!data?.key || typeof data.key !== 'string') throw new Error(server.name + ': no devolvió una key válida');
  return data.key;
}
async function convertWithServer(server, payload, signal) {
  const key = await freshKey(server, payload, signal);
  const response = await fetchWithTimeout(BASE_URL + '/v2/converter', {
    method: 'POST',
    headers: { ...headersFor(server), 'Content-Type': 'application/x-www-form-urlencoded', key },
    body: new URLSearchParams(payload).toString(), signal
  }, 32000);
  const data = await readJson(response, server.name + ' converter');
  if (data?.error === true || !data?.url) {
    const detail = data?.errorMsg || data?.error?.message || data?.message || data?.status || 'el conversor no devolvió una URL';
    throw new Error(server.name + ': ' + detail);
  }
  return { ...data, provider: server.name };
}

// Los mismos origenes usados para convertir se usan al descargar el multimedia.
export const CNV_SERVERS = Object.freeze(SERVERS.map(s => Object.freeze({
  name: s.name, origin: s.origin, referer: s.referer
})));
export const CNV_USER_AGENT = USER_AGENT;

export async function cnvConvertFrom(payload, providerName, {signal}={}) {
  const server = SERVERS.find(s => s.name === providerName);
  if (!server) throw new Error('Proveedor CNV desconocido');
  return convertWithServer(server, payload, signal);
}

export async function cnvConvert(payload) {
  const startedAt = Date.now();
  const attempts = SERVERS.map(server =>
    convertWithServer(server, payload).catch(error => {
      throw new Error(server.name + ': ' + (error?.message || error));
    })
  );
  try { return await Promise.any(attempts); }
  catch (aggregate) {
    const errors = Array.isArray(aggregate?.errors)
      ? aggregate.errors.map(error => error?.message || String(error))
      : [aggregate?.message || 'Error desconocido'];
    throw new Error('Todos los conversores fallaron después de ' + (Date.now() - startedAt) + 'ms | ' + errors.join(' | '));
  }
}
