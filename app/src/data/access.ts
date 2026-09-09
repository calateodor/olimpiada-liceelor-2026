/**
 * Accesul la panoul de administrare.
 * Parola NU e aici: e doar amprenta ei PBKDF2-SHA256 (600.000 de iterații, sare aleatoare).
 * Din amprentă nu se poate reconstitui parola, deci fișierul poate sta liniștit în repo.
 * Pe Cloudflare, o parolă schimbată din panou se salvează în KV și are prioritate față de aceasta.
 */
export interface Access { user: string; salt: string; hash: string; iterations: number }

export const ACCESS: Access = {
  user: 'administrator',
  salt: 'p3usy1/iXGiKA76ShfNxhg==',
  hash: 'oiAfQN8lRd8fYLjk7l7g17w16z1/Cj4IOqP69+b6poM=',
  iterations: 600000,
};
