-- Statistici de trafic proprii, anonime, fără cookie. `hits` = evenimentele brute (vizualizare de pagină,
-- clip pornit, poză deschisă, timp petrecut), păstrate câteva zile; `stats_daily` = totalurile pe zi, calculate
-- o singură dată pentru fiecare zi încheiată. vid = amprenta zilnică (hash cu secret din IP + browser + zi),
-- nu se poate lega de o persoană și nu se poate urmări de la o zi la alta; sid = identificator aleatoriu de sesiune (tab).
CREATE TABLE IF NOT EXISTS hits (
  at INTEGER NOT NULL,
  day TEXT NOT NULL,
  hour INTEGER NOT NULL,
  kind TEXT NOT NULL,
  path TEXT NOT NULL,
  target TEXT,
  sid TEXT NOT NULL,
  vid TEXT NOT NULL,
  src TEXT NOT NULL,
  dev TEXT NOT NULL,
  os TEXT NOT NULL,
  br TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS hits_day ON hits(day);
CREATE TABLE IF NOT EXISTS stats_daily (
  day TEXT NOT NULL,
  dim TEXT NOT NULL,
  key TEXT NOT NULL,
  a INTEGER NOT NULL DEFAULT 0,
  b INTEGER NOT NULL DEFAULT 0,
  c INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, dim, key)
);
