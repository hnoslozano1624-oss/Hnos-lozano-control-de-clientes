// Genera el icono cuadrado (512x512) de la app a partir de assets/logo_sym.png, sin librerías externas.
import fs from 'node:fs';
import zlib from 'node:zlib';

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function decodePNG(buf) {
  let p = 8, w = 0, h = 0, ct = 0, bd = 0, il = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; il = d[12]; }
    else if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  if (bd !== 8 || il !== 0 || (ct !== 2 && ct !== 6)) throw new Error('PNG no compatible');
  const bpp = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], r = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), o = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[o + x - bpp] : 0, b = y ? out[o - stride + x] : 0, c = x >= bpp && y ? out[o - stride + x - bpp] : 0;
      let v = r[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      out[o + x] = v & 255;
    }
  }
  return { w, h, bpp, data: out };
}

function encodePNG(w, h, rgb) {
  const stride = w * 3, raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const chunk = (t, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(t, 4, 'latin1'); d.copy(b, 8); b.writeUInt32BE(crc32(b.subarray(4, 8 + d.length)), 8 + d.length); return b; };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

export function makeIcon(srcFile, size = 512) {
  const im = decodePNG(fs.readFileSync(srcFile));
  const srcH = im.h - Math.max(2, Math.round(im.h * 0.011)); // recorta la línea fina inferior del logo
  const px = (x, y) => { const i = (y * im.w + x) * im.bpp; return [im.data[i], im.data[i + 1], im.data[i + 2]]; };
  const bg = px(0, 0), out = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) { out[i * 3] = bg[0]; out[i * 3 + 1] = bg[1]; out[i * 3 + 2] = bg[2]; }
  const tw = Math.round(size * 0.70), th = Math.round(srcH * tw / im.w), ox = Math.floor((size - tw) / 2), oy = Math.floor((size - th) / 2), k = im.w / tw;
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const x0 = Math.floor(x * k), x1 = Math.max(x0 + 1, Math.floor((x + 1) * k)), y0 = Math.floor(y * k), y1 = Math.max(y0 + 1, Math.floor((y + 1) * k));
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = y0; yy < Math.min(y1, srcH); yy++) for (let xx = x0; xx < Math.min(x1, im.w); xx++) { const c = px(xx, yy); r += c[0]; g += c[1]; b += c[2]; n++; }
    if (!n) continue;
    const o = ((oy + y) * size + ox + x) * 3; out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n;
  }
  return encodePNG(size, size, out);
}
