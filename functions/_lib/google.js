const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(bytes) {
  let s = '';
  bytes.forEach(b => s += String.fromCharCode(b));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}
function fromB64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const raw = atob(s);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
async function cryptoKey(secret) {
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt','decrypt']);
}
export async function seal(value, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await cryptoKey(secret);
  const ct = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, enc.encode(value)));
  const out = new Uint8Array(iv.length + ct.length); out.set(iv); out.set(ct, iv.length);
  return b64url(out);
}
export async function unseal(value, secret) {
  try {
    const data = fromB64url(value), iv = data.slice(0,12), ct = data.slice(12);
    const key = await cryptoKey(secret);
    return dec.decode(await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, ct));
  } catch { return null; }
}
export function cookie(name, value, maxAge=60*60*24*180) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export function readCookie(request, name) {
  const all = request.headers.get('Cookie') || '';
  const m = all.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}
export function json(data, status=200, headers={}) {
  return new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8', ...headers}});
}
export async function refreshAccessToken(env, request) {
  const sealed = readCookie(request, 'solveire_google_refresh');
  if (!sealed) return null;
  const refresh = await unseal(sealed, env.GOOGLE_CLIENT_SECRET);
  if (!refresh) return null;
  const body = new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,refresh_token:refresh,grant_type:'refresh_token'});
  const r = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
  if (!r.ok) return null;
  return r.json();
}
export const REDIRECT_URI = 'https://afspraken.solveire.nl/api/google/callback';
export const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
