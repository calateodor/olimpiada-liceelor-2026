import type { Access } from '../data/access';

/* Verificare utilizator + parolă cu WebCrypto (merge identic în browser și în Worker).
   Derivăm PBKDF2 din parola introdusă cu sarea memorată și comparăm amprentele în timp constant. */

const enc = new TextEncoder();
const b64 = {
  dec: (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0)),
  enc: (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))),
};

export async function deriveHash(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
}

function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function verifyCredentials(user: string, password: string, access: Access) {
  if (!user || !password) return false;
  if (!safeEq(user.trim().toLowerCase(), access.user.toLowerCase())) return false;
  const h = await deriveHash(password, b64.dec(access.salt), access.iterations);
  return safeEq(b64.enc(h), access.hash);
}

/** Amprentă nouă pentru o parolă nouă (schimbarea parolei din panou). */
export async function makeAccess(user: string, password: string, iterations = 100000): Promise<Access> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const h = await deriveHash(password, salt, iterations);
  return { user: user.trim().toLowerCase(), salt: b64.enc(salt.buffer), hash: b64.enc(h), iterations };
}
