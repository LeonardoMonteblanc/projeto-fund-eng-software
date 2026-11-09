#!/usr/bin/env node
/** Servidor estático mínimo para desenvolvimento local (sem dependências). */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = Number(process.env.PORT ?? 4173);
const HOST = process.env.HOST ?? '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf'
};

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let caminho = decodeURIComponent(url.pathname);
  if (caminho === '/') caminho = '/index.html';

  const destino = path.resolve(RAIZ, `.${caminho}`);
  if (!destino.startsWith(RAIZ)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Acesso negado.');
    return;
  }

  fs.stat(destino, (erro, info) => {
    if (erro || !info.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Arquivo não encontrado.');
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(destino).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    });
    fs.createReadStream(destino).pipe(res);
  });
});

servidor.listen(PORTA, HOST, () => {
  console.log(`LabUcs POC disponível em http://${HOST}:${PORTA}/`);
});
