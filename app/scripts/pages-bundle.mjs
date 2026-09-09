// Pune Worker-ul construit de Vite langa fisierele statice, ca `_worker.js` (modul avansat Cloudflare Pages),
// si scoate fisierul de deploy generat de plugin-ul Vite (.wrangler/deploy/config.json), altfel wrangler
// il gaseste in acelasi timp cu pages/wrangler.jsonc si refuza sa aleaga.
import { copyFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
const dir = readdirSync('dist').find(d => existsSync(`dist/${d}/index.js`) && d !== 'client');
if (!dir) throw new Error('Nu gasesc bundle-ul Worker-ului in dist/*/index.js (ruleaza npm run build fara PAGES_BASE).');
copyFileSync(`dist/${dir}/index.js`, 'dist/client/_worker.js');
rmSync('.wrangler/deploy/config.json', { force: true });
console.log(`_worker.js copiat din dist/${dir}/index.js`);
