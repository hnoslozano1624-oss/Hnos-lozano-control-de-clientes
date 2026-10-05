// Worker de D&L Hnos. Lozano: API sobre D1 (documentos y archivos), correo con Resend
// y acceso con usuario y contraseña. La página estática la sirve ASSETS.

const COLLS = new Set(['clients', 'tasks', 'payments', 'expenses', 'settings', 'quotes', 'products', 'contacts', 'campaigns']);
const MAX_DOC = 1_900_000;   // D1 admite ~2 MB por fila
const MAX_FILE = 1_500_000;  // archivo binario antes de pasar a base64

const J = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...h } });

/* ───── usuario y contraseña (sesión firmada en una cookie) ───── */
const SESSION_DAYS = 14;
const enc = new TextEncoder();
const b64url = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); s += '='.repeat((4 - s.length % 4) % 4); return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
const parseUsers = env => {
  const m = new Map();
  String(env.USUARIOS || '').split(/[;\n]+/).forEach(l => { const i = l.indexOf(':'); if (i > 0) { const u = l.slice(0, i).trim().toLowerCase(), p = l.slice(i + 1).trim(); if (u && p) m.set(u, p); } });
  return m;
};
const sha = async s => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const same = (a, b) => { let d = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a[i] || 0) ^ (b[i] || 0); return d === 0; };
async function hmacKey(env) { return crypto.subtle.importKey('raw', await sha('dl-sesion|' + env.USUARIOS), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']); }
async function makeToken(env, user) {
  const p = b64url(enc.encode(JSON.stringify({ u: user, exp: Date.now() + SESSION_DAYS * 864e5 })));
  const s = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(p)));
  return p + '.' + b64url(s);
}
const notConfigured = { status: 503, body: { code: 'auth_not_configured', message: 'Falta configurar los usuarios del tablero (variable USUARIOS en el Worker). Por seguridad, el tablero no entrega datos hasta completarlo.' } };
async function authenticate(req, env) {
  if (!parseUsers(env).size) return notConfigured;
  const c = (req.headers.get('cookie') || '').match(/(?:^|;\s*)dl_session=([^;]+)/);
  if (!c) return { status: 401, body: { code: 'unauthorized', message: 'Inicie sesión.' } };
  try {
    const [p, s] = c[1].split('.');
    if (!(await crypto.subtle.verify('HMAC', await hmacKey(env), unb64url(s), enc.encode(p)))) throw new Error('firma');
    const d = JSON.parse(new TextDecoder().decode(unb64url(p)));
    if (!d.exp || d.exp < Date.now() || !parseUsers(env).has(d.u)) throw new Error('vencida');
    return { email: d.u };
  } catch (e) {
    return { status: 401, body: { code: 'unauthorized', message: 'Sesión no válida. Inicie sesión de nuevo.' } };
  }
}
const cookie = (v, age) => 'dl_session=' + v + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + age;
async function login(req, env) {
  const users = parseUsers(env); if (!users.size) return J(notConfigured.body, 503);
  const ip = req.headers.get('cf-connecting-ip') || 'x', now = Date.now(), WIN = 15 * 60e3, MAXF = 8;
  const row = await env.DB.prepare("SELECT data FROM docs WHERE coll='_login' AND id=?").bind(ip).first();
  let st = row ? JSON.parse(row.data) : { n: 0, t: 0 }; if (now - st.t > WIN) st = { n: 0, t: now };
  if (st.n >= MAXF) return J({ code: 'locked', message: 'Demasiados intentos fallidos. Espere 15 minutos e intente de nuevo.' }, 429);
  let b = {}; try { b = JSON.parse(await req.text()); } catch (e) {}
  const u = String(b.user || '').trim().toLowerCase(), p = String(b.pass || '');
  const expected = users.get(u);
  const ok = !!expected && same(await sha(p), await sha(expected));
  if (!ok) {
    st.n++; st.t = now;
    await env.DB.prepare("INSERT INTO docs(coll,id,data,updated) VALUES('_login',?,?,?) ON CONFLICT(coll,id) DO UPDATE SET data=excluded.data,updated=excluded.updated").bind(ip, JSON.stringify(st), now).run();
    await new Promise(r => setTimeout(r, 700));
    return J({ code: 'bad_login', message: 'Usuario o contraseña incorrectos.' }, 401);
  }
  if (row) await env.DB.prepare("DELETE FROM docs WHERE coll='_login' AND id=?").bind(ip).run();
  return J({ ok: true, user: u }, 200, { 'set-cookie': cookie(await makeToken(env, u), SESSION_DAYS * 86400) });
}

/* ───── utilidades ───── */
const rid = () => { const a = new Uint8Array(12); crypto.getRandomValues(a); return Array.from(a, b => (b % 36).toString(36)).join(''); };
function toB64(buf) { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
const bump = (env, coll) => env.DB.prepare('INSERT INTO meta(coll,rev) VALUES(?,1) ON CONFLICT(coll) DO UPDATE SET rev=rev+1').bind(coll);
const isEmail = e => /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/.test(e || '');

async function readJson(req) {
  const txt = await req.text();
  if (txt.length > MAX_DOC) throw Object.assign(new Error('El documento es demasiado grande.'), { status: 413, code: 'too_large' });
  try { return JSON.parse(txt); } catch (e) { throw Object.assign(new Error('JSON no válido.'), { status: 400, code: 'invalid_argument' }); }
}

/* ───── correo (Resend) ───── */
async function sendMail(req, env) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM) return J({ code: 'resend_not_configured', message: 'Falta RESEND_API_KEY o RESEND_FROM en el Worker.' }, 503);
  const b = await readJson(req);
  const to = [].concat(b.to || []).filter(isEmail);
  if (to.length !== 1) return J({ code: 'tool_error', message: 'Destinatario no válido.' }, 400);
  if (!b.subject || !(b.htmlBody || b.body)) return J({ code: 'tool_error', message: 'Falta el asunto o el contenido.' }, 400);
  const html = String(b.htmlBody || '');
  const inline = html.includes('cid:propuesta');
  const atts = [].concat(b.attachments || []).slice(0, 2).map((a, i) => {
    const o = { filename: String(a.filename || 'archivo').slice(0, 120), content: String(a.content || '') };
    if (a.mimeType) o.content_type = String(a.mimeType);
    if (inline && i === 0) o.content_id = 'propuesta';
    return o;
  });
  const payload = { from: env.RESEND_FROM, to, subject: String(b.subject).slice(0, 200), html, text: String(b.body || ''), attachments: atts };
  if (isEmail(env.REPLY_TO)) { payload.reply_to = env.REPLY_TO; payload.headers = { 'List-Unsubscribe': '<mailto:' + env.REPLY_TO + '?subject=BAJA>' }; }
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return J({ code: 'tool_error', message: String(j.message || j.error || ('Resend respondió ' + r.status)).slice(0, 300) }, 502);
  return J({ ok: true, id: j.id || '' });
}

/* ───── enrutador ───── */
async function handle(req, env, url) {
  const p = url.pathname, m = req.method;
  if (p === '/api/login' && m === 'POST') return login(req, env);
  if (p === '/api/logout') return J({ ok: true }, 200, { 'set-cookie': cookie('', 0) });
  const au = await authenticate(req, env); if (au.status) return J(au.body, au.status);

  if (p === '/api/me') return J({ email: au.email });
  if (p === '/api/revs' && m === 'GET') {
    const { results } = await env.DB.prepare('SELECT coll,rev FROM meta').all(); const o = {}; (results || []).forEach(r => { o[r.coll] = r.rev; }); return J(o);
  }
  let g;
  if ((g = p.match(/^\/api\/c\/([a-z]+)$/)) && m === 'GET') {
    const c = g[1]; if (!COLLS.has(c)) return J({ code: 'not_found', message: 'Colección desconocida.' }, 404);
    const rv = await env.DB.prepare('SELECT rev FROM meta WHERE coll=?').bind(c).first();
    const { results } = await env.DB.prepare('SELECT id,data FROM docs WHERE coll=?').bind(c).all();
    return J({ rev: rv ? rv.rev : 0, docs: (results || []).map(r => ({ id: r.id, data: JSON.parse(r.data) })) });
  }
  if (g = p.match(/^\/api\/c\/([a-z]+)\/([^/]{1,200})$/)) {
    const c = g[1], id = decodeURIComponent(g[2]); if (!COLLS.has(c)) return J({ code: 'not_found', message: 'Colección desconocida.' }, 404);
    if (m === 'PUT') {
      const b = await readJson(req); if (!b || typeof b.data !== 'object' || Array.isArray(b.data)) return J({ code: 'invalid_argument', message: 'Datos no válidos.' }, 400);
      await env.DB.batch([env.DB.prepare('INSERT INTO docs(coll,id,data,updated) VALUES(?,?,?,?) ON CONFLICT(coll,id) DO UPDATE SET data=excluded.data,updated=excluded.updated').bind(c, id, JSON.stringify(b.data), Date.now()), bump(env, c)]);
      return J({ ok: true });
    }
    if (m === 'PATCH') {
      const b = await readJson(req); if (!b || typeof b.data !== 'object' || Array.isArray(b.data)) return J({ code: 'invalid_argument', message: 'Datos no válidos.' }, 400);
      const cur = await env.DB.prepare('SELECT data FROM docs WHERE coll=? AND id=?').bind(c, id).first();
      if (!cur) return J({ code: 'not_found', message: 'El registro ya no existe.' }, 404);
      const merged = JSON.stringify(Object.assign(JSON.parse(cur.data), b.data));
      if (merged.length > MAX_DOC) return J({ code: 'too_large', message: 'El documento es demasiado grande.' }, 413);
      await env.DB.batch([env.DB.prepare('UPDATE docs SET data=?,updated=? WHERE coll=? AND id=?').bind(merged, Date.now(), c, id), bump(env, c)]);
      return J({ ok: true });
    }
    if (m === 'DELETE') {
      await env.DB.batch([env.DB.prepare('DELETE FROM docs WHERE coll=? AND id=?').bind(c, id), bump(env, c)]);
      return J({ ok: true });
    }
  }
  if (p === '/api/file' && m === 'POST') {
    const buf = await req.arrayBuffer();
    if (buf.byteLength > MAX_FILE) return J({ code: 'too_large', message: 'El archivo supera 1,4 MB.' }, 413);
    const id = rid(), type = (req.headers.get('content-type') || 'application/octet-stream').slice(0, 100);
    let name = 'archivo'; try { name = decodeURIComponent(req.headers.get('x-filename') || 'archivo').slice(0, 200); } catch (e) {}
    await env.DB.prepare('INSERT INTO files(id,name,type,size,data,created) VALUES(?,?,?,?,?,?)').bind(id, name, type, buf.byteLength, toB64(buf), Date.now()).run();
    return J({ id, contentType: type });
  }
  if (g = p.match(/^\/_blob\/([A-Za-z0-9]{6,40})$/)) {
    if (m !== 'GET') return J({ code: 'method', message: 'Método no permitido.' }, 405);
    const f = await env.DB.prepare('SELECT name,type,data FROM files WHERE id=?').bind(g[1]).first();
    if (!f) return new Response('No encontrado', { status: 404 });
    const bin = Uint8Array.from(atob(f.data), c => c.charCodeAt(0));
    return new Response(bin, { headers: { 'content-type': f.type, 'cache-control': 'private, max-age=31536000, immutable', 'x-content-type-options': 'nosniff', 'content-security-policy': 'sandbox', 'content-disposition': 'inline; filename*=UTF-8\'\'' + encodeURIComponent(f.name || 'archivo') } });
  }
  if (p === '/api/send' && m === 'POST') return sendMail(req, env);
  return J({ code: 'not_found', message: 'Ruta no encontrada.' }, 404);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_blob/')) {
      try { return await handle(req, env, url); }
      catch (e) { return J({ code: e.code || 'server_error', message: e.message || 'Error del servidor.' }, e.status || 500); }
    }
    return env.ASSETS.fetch(req);
  }
};
