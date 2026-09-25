/* Cloudflare Turnstile, verificarea anti-robot a votului. Opțională: pornește doar când panoul a primit
   cheile (Vot hostess → Protecție anti-roboți). De obicei nu se vede nimic; dacă Cloudflare are dubii,
   apare jos pe ecran o căsuță de bifat, apoi votul pleacă singur. */
type Ts = {
  render: (el: HTMLElement, o: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
let loader: Promise<Ts> | null = null;
function load(): Promise<Ts> {
  return (loader ??= new Promise<Ts>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve((window as unknown as { turnstile: Ts }).turnstile);
    s.onerror = () => { loader = null; reject(new Error('Verificarea anti-robot nu s-a încărcat. Verifică internetul și încearcă din nou.')); };
    document.head.appendChild(s);
  }));
}

export async function turnstileToken(sitekey: string): Promise<string> {
  const ts = await load();
  let box = document.getElementById('ol-ts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'ol-ts';
    box.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:400';
    document.body.appendChild(box);
  }
  return new Promise<string>((resolve, reject) => {
    let id = '';
    const done = () => setTimeout(() => { try { ts.remove(id); } catch { /* deja scos */ } }, 0);
    id = ts.render(box!, {
      sitekey, appearance: 'interaction-only', language: 'ro',
      callback: (t: string) => { done(); resolve(t); },
      'error-callback': () => { done(); reject(new Error('Verificarea anti-robot a eșuat. Mai apasă o dată pe VOTE.')); },
      'timeout-callback': () => { done(); reject(new Error('Verificarea anti-robot a expirat. Mai apasă o dată pe VOTE.')); },
    });
  });
}
