"""
Pune pozele si clipurile unei zile de competitie in site, ca fisiere statice (fara R2).

    python scripts/media-day.py "D:\\Teo\\PNL\\Olimpiada\\Ziua 2" 2026-09-16 [--poster 24] [--title "..."] [--caption "..."]

Ce face:
  - cauta subfoldere cu poze (Fotbal, HANDBAL, Baschet...) oriunde sub folderul dat; numele subfolderului
    spune proba (vezi EVENT_ALIASES); pozele se redimensioneaza la 1800px (+ miniatura 640px), fara EXIF,
    cu ora din EXIF pastrata pentru ordine, in public/foto/<data>/<proba>/
  - clipurile .mp4/.mov din folder devin HLS (1080p ~4.5 Mbps + 720p ~2 Mbps, segmente de 6 s, sub limita
    de 25 MB/fisier a Cloudflare Pages) in public/foto/<data>/video/, cu poster din secunda --poster
  - scrie public/foto/<data>/manifest.json si regenereaza src/data/media.ts din toate manifestele
Ruleaza de cate ori vrei: ce e deja facut nu se reface (sterge folderul public/foto/<data> ca sa refaci tot).
Titlul/descrierea clipului se pot schimba si din panou dupa publicare (raman in starea publicata).
Cere: Python 3 + Pillow, ffmpeg in PATH.
"""
import argparse, json, os, re, subprocess, sys, unicodedata
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))          # app/
FOTO = os.path.join(ROOT, 'public', 'foto')
MEDIA_TS = os.path.join(ROOT, 'src', 'data', 'media.ts')

EVENT_ALIASES = {
    'fotbal': 'fotbal', 'futsal': 'fotbal', 'volei': 'volei', 'handbal': 'handbal', 'baschet': 'baschet',
    'tenis fete': 'tenis-f', 'tenis f': 'tenis-f', 'tenis-f': 'tenis-f', 'tenis de masa fete': 'tenis-f',
    'tenis baieti': 'tenis-b', 'tenis b': 'tenis-b', 'tenis-b': 'tenis-b', 'tenis de masa baieti': 'tenis-b',
    'cros': 'cros', 'majorete': 'majorete', 'graffiti': 'graffiti', 'voluntariat': 'voluntariat',
    'miss': 'miss', 'mister': 'mister', 'miss mister': 'miss', 'dans': 'dans',
    'interpretare': 'interpretare', 'muzica': 'interpretare', 'interpretare muzicala': 'interpretare',
}
TIME_RE = re.compile(r'^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}')

def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[\s_]+', ' ', s).strip()

def event_for(folder):
    n = norm(folder)
    if n in EVENT_ALIASES: return EVENT_ALIASES[n]
    for k, v in EVENT_ALIASES.items():
        if n.startswith(k): return v
    return None

def exif_time(im):
    ex = im.getexif()
    try:
        d = ex.get_ifd(0x8769); t = d.get(36867) or d.get(36868)
    except Exception:
        t = None
    t = t or ex.get(306)
    return t if t and TIME_RE.match(t) else None

def do_photos(src, day, out_dir, manifest):
    done = {p['id'] for p in manifest['photos']}
    n = 0
    for dirpath, dirs, files in os.walk(src):
        jpgs = sorted(f for f in files if f.lower().endswith(('.jpg', '.jpeg')))
        if not jpgs: continue
        ev = event_for(os.path.basename(dirpath))
        if not ev:
            print(f'  ! folderul "{os.path.basename(dirpath)}" nu seamana cu nicio proba, sarit ({len(jpgs)} poze)'); continue
        os.makedirs(os.path.join(out_dir, ev, 't'), exist_ok=True)
        for i, f in enumerate(jpgs):
            name = re.sub(r'[^A-Za-z0-9_-]', '_', os.path.splitext(f)[0])
            pid = f'{day}-{ev}-{name.lower()}'
            if pid in done: continue
            im = Image.open(os.path.join(dirpath, f))
            t = exif_time(im)
            im = ImageOps.exif_transpose(im).convert('RGB')
            w, h = im.size
            s = min(1.0, 1800 / max(w, h)); big = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
            big.save(os.path.join(out_dir, ev, name + '.jpg'), 'JPEG', quality=82, optimize=True, progressive=True)
            s = min(1.0, 640 / max(w, h)); im.resize((round(w * s), round(h * s)), Image.LANCZOS).save(os.path.join(out_dir, ev, 't', name + '.jpg'), 'JPEG', quality=78, optimize=True, progressive=True)
            # ziua e cea a evenimentului (ceasul aparatului poate fi gresit); ora din EXIF da ordinea
            at = f'{day}T{t[11:19]}+03:00' if t else f'{day}T12:{i % 60:02d}:00+03:00'
            manifest['photos'].append({'id': pid, 'url': f'/foto/{day}/{ev}/{name}.jpg', 'thumb': f'/foto/{day}/{ev}/t/{name}.jpg', 'w': big.size[0], 'h': big.size[1], 'eventId': ev, 'createdAt': at})
            n += 1
        print(f'  {ev}: {len(jpgs)} poze')
    return n

def probe(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', path], capture_output=True, text=True, check=True)
    j = json.loads(r.stdout); st = j['streams'][0]
    return int(st['width']), int(st['height']), float(j['format']['duration'])

def do_videos(src, day, out_dir, manifest, args):
    vids = sorted(f for f in os.listdir(src) if f.lower().endswith(('.mp4', '.mov', '.m4v')))
    if not vids: return 0
    vdir = os.path.join(out_dir, 'video'); os.makedirs(vdir, exist_ok=True)
    n = 0
    for i, f in enumerate(vids):
        slug = re.sub(r'[^a-z0-9]+', '-', norm(os.path.splitext(f)[0])).strip('-')[:40] or f'clip-{i + 1}'
        vid = f'{day}-clip-{slug}'
        path = os.path.join(src, f)
        w, h, dur = probe(path)
        # landscape: 1920x1080 / 1280x720; portrait: 1080x1920 / 720x1280
        big, small = ((1920, 1080), (1280, 720)) if w >= h else ((1080, 1920), (720, 1280))
        master = os.path.join(vdir, f'{slug}.m3u8')
        if not os.path.exists(master):
            print(f'  {f}: {w}x{h}, {dur:.0f}s -> HLS (dureaza cateva minute)...')
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-stats', '-i', path,
                '-filter_complex', f'[0:v]split=2[a][b];[a]scale={big[0]}:{big[1]}:flags=lanczos[v1];[b]scale={small[0]}:{small[1]}:flags=lanczos[v2]',
                '-map', '[v1]', '-map', '0:a?', '-map', '[v2]', '-map', '0:a?',
                '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-level', '4.1', '-pix_fmt', 'yuv420p', '-g', '60', '-keyint_min', '60', '-sc_threshold', '0',
                '-crf:v:0', '24', '-maxrate:v:0', '4500k', '-bufsize:v:0', '9000k', '-crf:v:1', '25', '-maxrate:v:1', '2000k', '-bufsize:v:1', '4000k',
                '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
                '-f', 'hls', '-hls_time', '6', '-hls_playlist_type', 'vod', '-hls_flags', 'independent_segments',
                '-master_pl_name', f'{slug}.m3u8', '-var_stream_map', 'v:0,a:0,name:1080 v:1,a:1,name:720',
                '-hls_segment_filename', os.path.join(vdir, f'{slug}-%v-%03d.ts'), os.path.join(vdir, f'{slug}-%v.m3u8')], check=True)
        poster = os.path.join(vdir, f'{slug}-poster.jpg')
        if not os.path.exists(poster):
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', str(min(args.poster, max(0, dur - 1))), '-i', path, '-frames:v', '1', '-vf', f'scale={small[0]}:{small[1]}:flags=lanczos', '-q:v', '3', poster], check=True)
            im = Image.open(poster); im.save(poster, 'JPEG', quality=76, optimize=True, progressive=True)
        old = next((v for v in manifest['videos'] if v['id'] == vid), None)
        entry = {'id': vid, 'src': f'/foto/{day}/video/{slug}.m3u8', 'poster': f'/foto/{day}/video/{slug}-poster.jpg', 'w': big[0], 'h': big[1], 'duration': round(dur),
                 'title': args.title or (old or {}).get('title') or f'Clipul zilei', 'caption': args.caption or (old or {}).get('caption') or '',
                 'eventIds': (old or {}).get('eventIds') or sorted({p['eventId'] for p in manifest['photos']}), 'createdAt': (old or {}).get('createdAt') or f'{day}T20:00:00+03:00'}
        if old: manifest['videos'][manifest['videos'].index(old)] = entry
        else: manifest['videos'].append(entry)
        n += 1
    return n

def ts(v):
    return json.dumps(v, ensure_ascii=False)

def write_media_ts():
    days = sorted(d for d in os.listdir(FOTO) if os.path.exists(os.path.join(FOTO, d, 'manifest.json')))
    photos, videos = [], []
    for d in days:
        m = json.load(open(os.path.join(FOTO, d, 'manifest.json'), encoding='utf-8'))
        photos += sorted(m['photos'], key=lambda p: p['createdAt']); videos += m['videos']
    L = ["import type { Photo, Video } from '../lib/types';", "",
         "/* GENERAT de scripts/media-day.py — nu edita de mână; modifică manifest.json din public/foto/<zi>/ și rulează scriptul.",
         "   Materiale livrate ca fișiere statice ale site-ului (public/foto/<zi>/...), nu prin R2:",
         "   pozele redimensionate la 1800px (+ miniaturi 640px) și clipurile în HLS (1080p + 720p).",
         "   Se adaugă la starea publicată (vezi withDefaults) și pot fi etichetate, descrise sau șterse din panou;",
         "   o ștergere se ține minte în state.removedMedia, ca să nu reapară la următoarea încărcare. */", "",
         "export const STATIC_PHOTOS: Photo[] = ["]
    for p in photos:
        L.append(f"  {{ id: {ts(p['id'])}, url: {ts(p['url'])}, thumb: {ts(p['thumb'])}, w: {p['w']}, h: {p['h']}, eventId: {ts(p['eventId'])}, createdAt: {ts(p['createdAt'])} }},")
    L += ["];", "", "export const STATIC_VIDEOS: Video[] = ["]
    for v in videos:
        L.append(f"  {{ id: {ts(v['id'])}, src: {ts(v['src'])}, poster: {ts(v['poster'])}, w: {v['w']}, h: {v['h']}, duration: {v['duration']}, title: {ts(v['title'])}, caption: {ts(v['caption'])}, eventIds: {ts(v['eventIds'])}, createdAt: {ts(v['createdAt'])} }},")
    L += ["];", ""]
    open(MEDIA_TS, 'w', encoding='utf-8', newline='\n').write('\n'.join(L))
    print(f'src/data/media.ts: {len(photos)} poze, {len(videos)} clipuri, {len(days)} zile')

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('src', help='folderul zilei (cu subfoldere pe probe si clipuri)')
    ap.add_argument('day', help='data, AAAA-LL-ZZ')
    ap.add_argument('--poster', type=float, default=24, help='secunda din clip folosita ca poster (implicit 24)')
    ap.add_argument('--title', help='titlul clipului')
    ap.add_argument('--caption', help='descrierea clipului')
    args = ap.parse_args()
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', args.day): sys.exit('data trebuie sa fie AAAA-LL-ZZ')
    out_dir = os.path.join(FOTO, args.day); os.makedirs(out_dir, exist_ok=True)
    mp = os.path.join(out_dir, 'manifest.json')
    manifest = json.load(open(mp, encoding='utf-8')) if os.path.exists(mp) else {'day': args.day, 'photos': [], 'videos': []}
    print(f'{args.day} <- {args.src}')
    np_ = do_photos(args.src, args.day, out_dir, manifest)
    nv = do_videos(args.src, args.day, out_dir, manifest, args)
    json.dump(manifest, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'  {np_} poze noi, {nv} clipuri; manifest: {mp}')
    write_media_ts()
    print('Gata. Verifica local (npm run dev), apoi: git add -A && git commit && npm run deploy:pages')

if __name__ == '__main__':
    main()
