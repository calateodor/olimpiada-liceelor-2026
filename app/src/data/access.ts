/**
 * Accesul la panoul de administrare.
 * Parola NU e aici: e doar amprenta ei PBKDF2-SHA256 (100.000 de iterații, cât permite Cloudflare Workers; sare aleatoare).
 * Din amprentă nu se poate reconstitui parola, deci fișierul poate sta liniștit în repo.
 * Pe Cloudflare, o parolă schimbată din panou se salvează în KV și are prioritate față de aceasta.
 */
export interface Access { user: string; salt: string; hash: string; iterations: number }

export const ACCESS: Access = {
  user: 'administrator',
  salt: 'IC9D/grM432S7l76Zg84mQ==',
  hash: 'yq1cJtV79tZz+nd+IiFfsQ/Vo/5Rs7FajePEbhmO7QI=',
  iterations: 100000,
};
