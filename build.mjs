// Compila el tablero: une src/partes, incrusta las imágenes de assets/ y genera dist/index.html
// Uso: node build.mjs            -> versión Cloudflare (con src/shim.js)
//      node build.mjs artifact   -> versión para claude.ai (sin shim), dist/artifact.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeIcon } from './src/icono.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const target = process.argv[2] === 'artifact' ? 'artifact' : 'cf';
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');

const parts = fs.readdirSync(path.join(root, 'src/partes')).filter(f => /^parte\d+\.html$/.test(f))
  .sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5)));
let html = parts.map(f => rd('src/partes/' + f)).join('');

const GAP = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const img = (file, mime) => {
  const p = path.join(root, 'assets', file);
  if (!fs.existsSync(p)) { console.warn('AVISO: falta assets/' + file + ' (se usa una imagen vacía)'); return GAP; }
  return 'data:' + mime + ';base64,' + fs.readFileSync(p).toString('base64');
};
html = html.replaceAll('__LOGO_H__', img('logo_h.png', 'image/png'))
           .replaceAll('__SYM__', img('logo_sym.png', 'image/png'))
           .replaceAll('__DYLIA__', img('dylia.jpg', 'image/jpeg'));

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
if (target === 'artifact') {
  fs.writeFileSync(path.join(root, 'dist/artifact.html'), html);
  console.log('dist/artifact.html', html.length);
} else {
  html = html.replace('hasta 20 MB', 'hasta 1,4 MB');
  const shim = rd('src/shim.js').replace(/<\/script/gi, '<\\/script');
  const doc = '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + '<script>\n' + shim + '\n</script>\n' + html + '\n</html>\n';
  // Icono para el celular (instalable en la pantalla de inicio)
  const pwa = '<meta name="theme-color" content="#1a1412">\n<link rel="manifest" href="/manifest.json">\n<link rel="icon" type="image/png" href="/icon-512.png">\n'
    + '<link rel="apple-touch-icon" href="/icon-512.png">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-capable" content="yes">\n'
    + '<meta name="apple-mobile-web-app-title" content="D&L Clientes">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n';
  const doc2 = doc.replace('<script>\n', pwa + '<script>\n');
  fs.writeFileSync(path.join(root, 'dist/index.html'), doc2);
  console.log('dist/index.html', doc2.length);
  const logoFile = path.join(root, 'assets/logo_h.png');
  if (fs.existsSync(logoFile)) fs.copyFileSync(logoFile, path.join(root, 'dist/logo-h.png'));
  const symFile = path.join(root, 'assets/logo_sym.png');
  if (fs.existsSync(symFile)) {
    fs.writeFileSync(path.join(root, 'dist/icon-512.png'), makeIcon(symFile, 512));
    fs.writeFileSync(path.join(root, 'dist/manifest.json'), JSON.stringify({
      name: 'D&L Clientes', short_name: 'D&L', description: 'Control de clientes D&L Hnos. Lozano',
      start_url: '/', scope: '/', display: 'standalone', orientation: 'any', lang: 'es',
      background_color: '#1a1412', theme_color: '#1a1412',
      icons: [
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    }, null, 2));
    console.log('dist/icon-512.png y dist/manifest.json');
  } else console.warn('AVISO: falta assets/logo_sym.png (sin icono para el celular)');
}
