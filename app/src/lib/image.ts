/** Redimensionează o imagine în browser (canvas) înainte de upload. */
export async function resizeImage(file: File, maxSide: number, quality = 0.84): Promise<{ blob: Blob; w: number; h: number }> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions).catch(() => null);
  const img = bmp ?? (await loadImg(file));
  const iw = 'width' in img ? img.width : 0, ih = 'height' in img ? img.height : 0;
  const scale = Math.min(1, maxSide / Math.max(iw, ih));
  const w = Math.round(iw * scale), h = Math.round(ih * scale);
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!; ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', quality));
  if (bmp) bmp.close();
  return { blob, w, h };
}

function loadImg(file: File) {
  return new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
}

export async function uploadBlob(blob: Blob, name: string, token: string): Promise<string> {
  const fd = new FormData(); fd.append('file', blob, name);
  const r = await fetch('/api/upload', { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: fd });
  if (!r.ok) throw new Error(`Upload eșuat (${r.status})`);
  return ((await r.json()) as { url: string }).url;
}
