"""Resize icon-main.png into the three sizes required by manifest.json."""
from PIL import Image
from pathlib import Path

base = Path(__file__).parent
src = Image.open(base / 'icon-main.png').convert('RGBA')

for size in [16, 48, 128]:
    resized = src.resize((size, size), Image.LANCZOS)
    resized.save(base / f'icon-{size}.png')
    print(f'icon-{size}.png written')
