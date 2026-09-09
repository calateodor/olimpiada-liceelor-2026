"""Scoate complet granulatia 'coaja de portocala' coapta in sprite-urile monedelor, pastrand
muchiile (inelul, desenul). Trei treceri de filtru edge-preserving (domain transform), din ce
in ce mai fine, apoi un median care curata ce a mai ramas. Doar pe culoare; alfa ramane.
Sursele originale stau in assets-src/coins-original."""
import cv2, numpy as np, os
src='D:/Teo/PNL/Site-uri/Olimpiada Liceelor/assets-src/coins-original'
dst='D:/Teo/PNL/Site-uri/Olimpiada Liceelor/app/public/img/coins'
ep=lambda x,s,r: cv2.edgePreservingFilter(x, flags=cv2.RECURS_FILTER, sigma_s=s, sigma_r=r)
for f in sorted(os.listdir(src)):
    if not f.endswith('.png') or 'normal' in f: continue
    im=cv2.imread(os.path.join(src,f), cv2.IMREAD_UNCHANGED)
    bgr, a = im[:,:,:3], im[:,:,3]
    # pixelii transparenti sunt negri: ii umplem cu vecinii, altfel filtrul trage negru in inel
    bgr=cv2.inpaint(bgr, (a<8).astype(np.uint8), 3, cv2.INPAINT_TELEA)
    out=ep(ep(ep(bgr,60,0.35),40,0.25),30,0.15)
    out=cv2.medianBlur(out,5)
    cv2.imwrite(os.path.join(dst,f), np.dstack([out,a]), [cv2.IMWRITE_PNG_COMPRESSION,9])
    print(f, os.path.getsize(os.path.join(dst,f)))
