import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

out = Path(sys.argv[1])
font_path = sys.argv[2]
out.mkdir(parents=True, exist_ok=True)

SIZE = 500
IMAGES = [
    ("a.jpg", "A", (236, 72, 153), (124, 58, 237)),
    ("b.png", "B", (14, 165, 233), (16, 185, 129)),
    ("c.png", "C", (245, 158, 11), (239, 68, 68)),
    ("d.png", "D", (30, 41, 59), (71, 85, 105)),
]

for name, letter, start, end in IMAGES:
    img = Image.new("RGB", (SIZE, SIZE))
    px = img.load()
    for y in range(SIZE):
        for x in range(SIZE):
            t = (x + y) / (2 * (SIZE - 1))
            px[x, y] = tuple(round(s + (e - s) * t) for s, e in zip(start, end))
    draw = ImageDraw.Draw(img)
    big = ImageFont.truetype(font_path, 320)
    small = ImageFont.truetype(font_path, 28)
    draw.text((SIZE / 2, SIZE / 2 - 20), letter, font=big, fill="white", anchor="mm")
    draw.text((SIZE / 2, SIZE - 48), f"rive test image {letter}  {SIZE}x{SIZE}", font=small, fill="white", anchor="mm")
    path = out / name
    if name.endswith(".jpg"):
        img.save(path, quality=85, optimize=True)
    else:
        img.save(path, optimize=True)
    print(path, path.stat().st_size, "bytes")
