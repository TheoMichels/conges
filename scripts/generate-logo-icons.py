#!/usr/bin/env python3
"""Regenerate Holy icons from the isolated olive boat (requires Pillow)."""
import argparse
import shutil
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--input", required=True, type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
assets = root / "assets"
pearl = "#F5F5EE"
source = Image.open(args.input).convert("RGBA")
# Remove negligible generated alpha noise, keeping the pale sail highlights.
alpha = source.getchannel("A").point(lambda value: 0 if value <= 16 else value)
source.putalpha(alpha)
source = source.crop(alpha.getbbox())
source.thumbnail((798, 798), Image.Resampling.LANCZOS)
transparent = Image.new("RGBA", (1024, 1024))
transparent.alpha_composite(source, ((1024-source.width)//2, (1024-source.height)//2))
solid = Image.new("RGBA", (1024, 1024), pearl)
solid.alpha_composite(transparent)
solid = solid.convert("RGB")
solid.save(assets / "master-icon-solid.png", optimize=True)
transparent.save(assets / "master-icon-transparent.png", optimize=True)
variants = {"icon.png": (solid, 1024), "apple-touch-icon.png": (solid, 180),
    "apple-touch-icon-precomposed.png": (solid, 180), "favicon.png": (solid, 64),
    "favicon-32.png": (solid, 32), "favicon-16.png": (solid, 16),
    "favicon-192.png": (solid, 192), "icon-512.png": (solid, 512),
    "splash-icon.png": (transparent, 512), "home-boat-logo.png": (transparent, 1024),
    "android-icon-foreground.png": (transparent, 432)}
for name, (image, size) in variants.items():
    image.resize((size, size), Image.Resampling.LANCZOS).save(assets / name, optimize=True)
Image.new("RGB", (432, 432), pearl).save(assets / "android-icon-background.png")
monochrome = Image.new("RGBA", (432, 432), "#66723A")
monochrome.putalpha(transparent.getchannel("A").resize((432, 432), Image.Resampling.LANCZOS))
monochrome.save(assets / "android-icon-monochrome.png", optimize=True)
solid.save(assets / "favicon.ico", format="ICO", sizes=[(16,16), (32,32), (48,48)])
for directory in (root / "public", root / "public/assets"):
    directory.mkdir(exist_ok=True)
    for name in (*variants, "android-icon-background.png", "android-icon-monochrome.png", "favicon.ico"):
        shutil.copyfile(assets / name, directory / name)
print("Generated synchronized Holy icons on pearl #F5F5EE with 78% safe zone.")
