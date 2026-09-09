"""Poza cu multimea si cupa -> fundal de hero: duoton mov/bleumarin (tema site-ului), vinieta,
blur usor de adancime ca sa nu se vada ca sursa are doar 1000px. Sursa: assets-src/fundal."""
from PIL import Image, ImageOps, ImageEnhance, ImageFilter
import numpy as np
src='D:/Teo/PNL/Site-uri/Olimpiada Liceelor/assets-src/fundal/multime-cupa.webp'
dst='D:/Teo/PNL/Site-uri/Olimpiada Liceelor/app/src/assets/fundal-hero.webp'
im=Image.open(src).convert('RGB')
im=im.resize((1600,1200),Image.LANCZOS)                       # marim fin, apoi blur: scalarea in browser ramane lina
g=ImageOps.grayscale(im); g=ImageEnhance.Contrast(g).enhance(1.22)
duo=ImageOps.colorize(g, black=(11,14,34), white=(170,120,255), mid=(76,29,149), midpoint=138)
duo=duo.filter(ImageFilter.GaussianBlur(1.8))
W,H=duo.size; y,x=np.mgrid[0:H,0:W]; d=np.sqrt(((x-W/2)/(W/2))**2+((y-H/2)/(H/2))**2)
m=np.clip(1-0.6*np.clip(d-0.3,0,1)**1.5,0,1)[...,None]
out=Image.fromarray((np.asarray(duo).astype(np.float32)*m).astype(np.uint8))
out.save(dst,'WEBP',quality=80,method=6)
import os; print(out.size, os.path.getsize(dst))
