-- Reacții cu emoji la poze și clipuri. Cheia primară (item, emoji, visitor) = un vizitator poate reacționa o singură dată cu un emoji la un element; iph = amprenta hash-uită a IP-ului (fără IP în clar), pentru limite anti-abuz.
CREATE TABLE IF NOT EXISTS reactions (
  item TEXT NOT NULL,
  emoji TEXT NOT NULL,
  visitor TEXT NOT NULL,
  iph TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (item, emoji, visitor)
);
CREATE INDEX IF NOT EXISTS reactions_item ON reactions(item);
CREATE INDEX IF NOT EXISTS reactions_visitor_at ON reactions(visitor, at);
CREATE INDEX IF NOT EXISTS reactions_iph_at ON reactions(iph, at);
