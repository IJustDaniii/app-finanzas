"""Generate matching Windows and PWA icons for the Bolsillo wallet mark."""

from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
SIZE = 1024
SCALE = SIZE / 64


def box(*values):
    return tuple(round(value * SCALE) for value in values)


image = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle(box(0, 0, 64, 64), radius=round(18 * SCALE), fill='#10241e')
draw.rounded_rectangle(box(15, 15, 50, 41), radius=round(6 * SCALE), fill='#8fcf57')
draw.rounded_rectangle(box(14, 23, 52, 51), radius=round(7 * SCALE), fill='#b8f56c')
draw.rounded_rectangle(box(39, 30, 54, 45), radius=round(7 * SCALE), fill='#10241e', outline='#b8f56c', width=round(2 * SCALE))
draw.ellipse(box(43, 35.5, 47, 39.5), fill='#b8f56c')

image.save(ROOT / 'desktop' / 'icon.ico', format='ICO', sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
image.resize((192, 192), Image.Resampling.LANCZOS).save(ROOT / 'public' / 'icon-192.png')
image.resize((512, 512), Image.Resampling.LANCZOS).save(ROOT / 'public' / 'icon-512.png')
