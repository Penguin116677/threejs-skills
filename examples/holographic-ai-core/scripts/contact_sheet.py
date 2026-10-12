#!/usr/bin/env python3
"""Build a labelled contact sheet from rendered PNG frames.
usage: contact_sheet.py OUT.jpg FRAME.png [FRAME.png ...] [--cols N] [--width W]"""
import sys, os
from PIL import Image, ImageDraw

args = [a for a in sys.argv[1:]]
cols, width = 3, 640
if '--cols' in args:
    i = args.index('--cols'); cols = int(args[i + 1]); del args[i:i + 2]
if '--width' in args:
    i = args.index('--width'); width = int(args[i + 1]); del args[i:i + 2]
out, files = args[0], args[1:]
thumbs = []
for f in files:
    im = Image.open(f).convert('RGB')
    h = round(im.height * width / im.width)
    im = im.resize((width, h), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    d.text((8, 6), os.path.basename(f), fill=(140, 170, 200))
    thumbs.append(im)
rows = (len(thumbs) + cols - 1) // cols
th = thumbs[0].height
sheet = Image.new('RGB', (cols * width + (cols + 1) * 4, rows * th + (rows + 1) * 4), (40, 40, 40))
for k, im in enumerate(thumbs):
    sheet.paste(im, (4 + (k % cols) * (width + 4), 4 + (k // cols) * (th + 4)))
sheet.save(out, quality=90)
print(out, sheet.size)
