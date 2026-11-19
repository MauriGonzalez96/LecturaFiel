"""Genera iconos de Lektor (PNG + ICO multi-size)."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path('src-tauri/icons')
OUT.mkdir(parents=True, exist_ok=True)


def make(size: int) -> Image.Image:
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = max(1, size // 32)
    radius = max(4, size // 5)
    d.rounded_rectangle(
        [pad, pad, size - pad - 1, size - pad - 1],
        radius=radius,
        fill=(15, 24, 34, 255),
    )
    band = max(2, size // 7)
    d.rounded_rectangle(
        [pad, size - pad - band - 1, size - pad - 1, size - pad - 1],
        radius=max(2, radius // 3),
        fill=(15, 122, 108, 255),
    )
    try:
        font = ImageFont.truetype(
            'C:/Windows/Fonts/segoeuib.ttf',
            size=max(8, int(size * 0.52)),
        )
    except OSError:
        font = ImageFont.load_default()
    text = 'L'
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1] - size * 0.04
    d.text((x, y), text, font=font, fill=(238, 243, 248, 255))
    r = max(2, size // 18)
    cx, cy = int(size * 0.72), int(size * 0.28)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(45, 212, 191, 255))
    return img


def main() -> None:
    sizes_png = [
        (32, '32x32.png'),
        (128, '128x128.png'),
        (256, '128x128@2x.png'),
        (512, 'icon.png'),
    ]
    for size, name in sizes_png:
        make(size).save(OUT / name, format='PNG', optimize=True)

    ico_sizes = [16, 24, 32, 48, 64, 128, 256]
    images = [make(s) for s in ico_sizes]
    images[-1].save(
        OUT / 'icon.ico',
        format='ICO',
        sizes=[(s, s) for s in ico_sizes],
        append_images=images[:-1],
    )
    print('ok', [(p.name, p.stat().st_size) for p in sorted(OUT.iterdir())])


if __name__ == '__main__':
    main()
