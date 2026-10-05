const MAX_BYTES = 12 * 1024 * 1024;

function isBlockedHost(hostname) {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local')) return true;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

export async function onRequestGet({ request }) {
  const requestUrl = new URL(request.url);
  const source = requestUrl.searchParams.get('url');
  if (!source) return new Response('Missing image URL', { status: 400 });

  let target;
  try { target = new URL(source); } catch { return new Response('Invalid image URL', { status: 400 }); }
  if (!['http:', 'https:'].includes(target.protocol) || isBlockedHost(target.hostname)) {
    return new Response('Unsupported image URL', { status: 400 });
  }

  try {
    let current = target;
    let upstream;
    for (let redirects = 0; redirects <= 3; redirects++) {
      upstream = await fetch(current.toString(), {
        redirect: 'manual',
        headers: { 'User-Agent': 'BOTC-TokenMaker-Web/3.0' },
        cf: { cacheEverything: true, cacheTtl: 86400 }
      });
      if (upstream.status < 300 || upstream.status >= 400) break;
      const location = upstream.headers.get('location');
      if (!location) return new Response('Invalid image redirect', { status: 502 });
      current = new URL(location, current);
      if (!['http:', 'https:'].includes(current.protocol) || isBlockedHost(current.hostname)) {
        return new Response('Unsupported image redirect', { status: 400 });
      }
      upstream = undefined;
    }
    if (!upstream) return new Response('Too many redirects', { status: 502 });
    if (!upstream.ok) return new Response(`Image host returned ${upstream.status}`, { status: 502 });
    const type = upstream.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return new Response('URL is not an image', { status: 415 });
    const declaredLength = Number(upstream.headers.get('content-length') || 0);
    if (declaredLength > MAX_BYTES) return new Response('Image is too large', { status: 413 });
    const body = await upstream.arrayBuffer();
    if (body.byteLength > MAX_BYTES) return new Response('Image is too large', { status: 413 });
    return new Response(body, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch {
    return new Response('Unable to fetch image', { status: 502 });
  }
}
