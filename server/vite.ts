import express, { type Express } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer, createLogger } from 'vite';
import { type Server } from 'http';
import viteConfig from '../vite.config';
import { nanoid } from 'nanoid';

const viteLogger = createLogger();

export function log(message: string, source = 'express') {
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    // use literal true so TypeScript infers the narrower true type expected by Vite
    allowedHosts: true as true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        // process.exit(1);
      },
    },
    server: serverOptions,
    appType: 'custom',
  });

  app.use(vite.middlewares);

  let cachedTemplate: string | null = null;
  const clientTemplate = path.resolve(import.meta.dirname, '..', 'client', 'index.html');

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // const clientTemplate = path.resolve(
      //   import.meta.dirname,
      //   "..",
      //   "client",
      //   "index.html"
      // );

      if (!cachedTemplate || process.env.NODE_ENV === 'development') {
        cachedTemplate = await fs.promises.readFile(clientTemplate, 'utf-8');
      }

      // always reload the index.html file from disk incase it changes
      // let template = await fs.promises.readFile(clientTemplate, "utf-8");
      let template = cachedTemplate;

      template = template.replace(
        `<head>`,
        `<head>
        <link rel="modulepreload" href="/src/main.tsx">
        <link rel="preload" href="/src/App.tsx" as="script" crossorigin />
        `
      );

      // Only modify the template if it contains the development script tag
      // if (template.includes('src="/src/main.tsx"')) {
      //   template = template.replace(
      //     `src="/src/main.tsx"`,
      //     `src="/src/main.tsx?v=${nanoid()}"`
      //   );
      // }

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, '..', 'client', 'dist');

  console.log(`Serving static files from: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(
    express.static(distPath, {
      maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
      etag: true,
      lastModified: true,
    })
  );

  // fall through to index.html if the file doesn't exist
  app.use('*', (_req, res) => {
    const indexPath = path.resolve(distPath, 'index.html');
    console.log(`Serving index.html from: ${indexPath}`);
    res.sendFile(indexPath);
  });
}
