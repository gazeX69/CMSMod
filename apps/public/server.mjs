import http from 'node:http';

const port = Number(process.env.PUBLIC_PORT || 5174);
const host = process.env.PUBLIC_HOST || '127.0.0.1';
const apiBase = (process.env.VITE_API_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');

const server = http.createServer(async (request, response) => {
  try {
    const incoming = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);

    if (incoming.pathname.startsWith('/api/')) {
      const target = new URL(`${apiBase}${request.url}`);
      const body = request.method !== 'GET' && request.method !== 'HEAD'
        ? await new Promise((resolve) => {
            const chunks = [];
            request.on('data', (chunk) => chunks.push(chunk));
            request.on('end', () => resolve(Buffer.concat(chunks)));
          })
        : undefined;

      const headers = { ...request.headers };
      delete headers.host;

      const proxyRes = await fetch(target, {
        method: request.method,
        headers,
        body,
        redirect: 'manual'
      });

      response.statusCode = proxyRes.status;
      proxyRes.headers.forEach((value, key) => {
        response.setHeader(key, value);
      });
      response.end(Buffer.from(await proxyRes.arrayBuffer()));
      return;
    }

    const target = new URL(`${apiBase}/api/public/document`);
    target.searchParams.set('path', incoming.pathname);
    incoming.searchParams.forEach((value, key) => target.searchParams.append(key, value));
    const rendered = await fetch(target, { redirect: 'manual', headers: { accept: request.headers.accept || 'text/html', 'user-agent': request.headers['user-agent'] || 'ModernCMS Public Host' } });
    response.statusCode = rendered.status;
    response.setHeader('content-type', rendered.headers.get('content-type') || 'text/html; charset=utf-8');
    for (const header of ['location', 'cache-control', 'etag', 'last-modified']) {
      const value = rendered.headers.get(header);
      if (value) response.setHeader(header, value);
    }
    response.setHeader('x-moderncms-public-host', 'node-http-adapter-v1');
    response.end(Buffer.from(await rendered.arrayBuffer()));
  } catch (error) {
    response.statusCode = 502;
    response.setHeader('content-type', 'text/plain; charset=utf-8');
    response.end(`Public document host error: ${error instanceof Error ? error.message : String(error)}`);
  }
});

server.listen(port, host, () => {
  process.stdout.write(`ModernCMS public document host listening on http://${host}:${port}\n`);
});
