"""Tile screenshots into contact sheets for review.
  python tools/sheet.py <out.png> <cols> <width_each> name1 name2 ...
"""
import os, sys
from PIL import Image, ImageDraw

here = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '_shots')
out, cols, wid = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
names = sys.argv[4:]
ims = []
for n in names:
    im = Image.open(os.path.join(here, n + '.png')).convert('RGB')
    h = int(im.height * wid / im.width)
    ims.append((n, im.resize((wid, h), Image.LANCZOS)))
rows = [ims[i:i + cols] for i in range(0, len(ims), cols)]
H = sum(max(im.height for _, im in r) + 28 for r in rows) + 10
W = cols * (wid + 10) + 10
sheet = Image.new('RGB', (W, H), (180, 180, 180))
d = ImageDraw.Draw(sheet)
y = 10
for r in rows:
    x = 10
    for n, im in r:
        d.text((x, y), n, fill=(0, 0, 0))
        sheet.paste(im, (x, y + 16))
        x += wid + 10
    y += max(im.height for _, im in r) + 28
sheet.save(os.path.join(here, out))
print(out, sheet.size)
