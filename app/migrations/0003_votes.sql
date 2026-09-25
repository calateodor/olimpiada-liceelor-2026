-- Votul pentru hostess-a serii finale. Un rând pe vizitator (cheia primară): cine se răzgândește își mută
-- votul, nu mai adaugă unul. vote_counts ține totalurile gata numărate, ca pagina să citească 7 rânduri, nu
-- toate voturile. iph = amprenta hash-uită a IP-ului (fără IP în clar), doar ca panoul să poată vedea și
-- șterge voturile venite în masă dintr-o singură rețea; nu există limită automată pe rețea.
CREATE TABLE IF NOT EXISTS votes (
  visitor TEXT PRIMARY KEY,
  cand TEXT NOT NULL,
  iph TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  at INTEGER NOT NULL,
  changes INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS votes_cand ON votes(cand);
CREATE INDEX IF NOT EXISTS votes_iph ON votes(iph);
CREATE TABLE IF NOT EXISTS vote_counts (
  cand TEXT PRIMARY KEY,
  n INTEGER NOT NULL DEFAULT 0
);
