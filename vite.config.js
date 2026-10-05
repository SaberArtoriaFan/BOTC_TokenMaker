import { defineConfig } from 'vite';

const MAX_BYTES = 12 * 1024 * 1024;

function blocked(hostname) {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local')) return true;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

export default defineConfig({
  plugins: [{
    name: 'local-image-proxy',
    configureServer(server) {
      server.middlewares.use('/api/image', async (req, res) => {
        try {
          const source = new URL(req.url || '', 'http://localhost').searchParams.get('url');
          const target = new URL(source);
          if (!['http:', 'https:'].includes(target.protocol) || blocked(target.hostname)) throw new Error('Unsupported URL');
          let current = target; let response;
          for (let redirects = 0; redirects <= 3; redirects++) {
            response = await fetch(current, { redirect: 'manual', headers: { 'User-Agent': 'BOTC-TokenMaker-Web/3.0' } });
            if (response.status < 300 || response.status >= 400) break;
            const location = response.headers.get('location');
            if (!location) throw new Error('Invalid redirect');
            current = new URL(location, current);
            if (!['http:', 'https:'].includes(current.protocol) || blocked(current.hostname)) throw new Error('Unsupported redirect');
            response = undefined;
          }
          if (!response) throw new Error('Too many redirects');
          const type = response.headers.get('content-type') || '';
          if (!response.ok || !type.startsWith('image/')) throw new Error('Not an image');
          const bytes = Buffer.from(await response.arrayBuffer());
          if (bytes.byteLength > MAX_BYTES) throw new Error('Image too large');
          res.statusCode = 200; res.setHeader('Content-Type', type); res.setHeader('Cache-Control', 'public, max-age=3600'); res.end(bytes);
        } catch { res.statusCode = 502; res.end('Unable to fetch image'); }
      });
    }
  }]
});
