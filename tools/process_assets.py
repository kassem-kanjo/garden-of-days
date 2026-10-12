#!/usr/bin/env python3
"""Lift Midjourney renders into transparent sprites and build contact sheets.

usage: process_assets.py lift            # lift every assets-src/*.png into build/lifted/
       process_assets.py sheet <name>    # contact sheet of the 4 variants of <name> on the sky colour
       process_assets.py export <name>_<i> <out-name> <max-px> [--flip]
"""
import os, subprocess, sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets-src")
LIFTED = os.path.join(ROOT, "build", "lifted")
OUT = os.path.join(ROOT, "web", "assets", "sprites")
LIFT_BIN = os.environ.get("LIFT_BIN", os.path.join(ROOT, "build", "lift"))
SKY = (116, 137, 216, 255)


def lift_all():
    os.makedirs(LIFTED, exist_ok=True)
    for f in sorted(os.listdir(SRC)):
        if not f.endswith(".png"):
            continue
        dst = os.path.join(LIFTED, f)
        if os.path.exists(dst) and os.path.getmtime(dst) > os.path.getmtime(os.path.join(SRC, f)):
            continue
        r = subprocess.run([LIFT_BIN, os.path.join(SRC, f), dst], capture_output=True, text=True)
        print(f, r.stdout.strip() or r.stderr.strip())


def sheet(name):
    tiles = []
    for i in range(4):
        p = os.path.join(LIFTED, f"{name}_{i}.png")
        if os.path.exists(p):
            im = Image.open(p).convert("RGBA")
            im.thumbnail((420, 420))
            tiles.append(im)
    W = 460 * len(tiles)
    out = Image.new("RGBA", (W, 480), SKY)
    d = ImageDraw.Draw(out)
    for k, im in enumerate(tiles):
        x = k * 460 + (460 - im.width) // 2
        y = 30 + (420 - im.height) // 2
        out.alpha_composite(im, (x, y))
        d.text((k * 460 + 10, 6), f"{name}_{k}", fill=(22, 22, 31, 255))
    path = os.path.join(ROOT, "build", f"sheet-{name}.png")
    out.convert("RGB").save(path)
    print(path)


def export(src_name, out_name, max_px, flip=False):
    os.makedirs(OUT, exist_ok=True)
    im = Image.open(os.path.join(LIFTED, f"{src_name}.png")).convert("RGBA")
    bbox = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if bbox:
        im = im.crop(bbox)
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im.thumbnail((max_px, max_px), Image.LANCZOS)
    path = os.path.join(OUT, f"{out_name}.png")
    im.save(path, optimize=True)
    print(path, im.size, os.path.getsize(path) // 1024, "KB")


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "lift":
        lift_all()
    elif cmd == "sheet":
        for n in sys.argv[2:]:
            sheet(n)
    elif cmd == "export":
        export(sys.argv[2], sys.argv[3], int(sys.argv[4]), "--flip" in sys.argv)
