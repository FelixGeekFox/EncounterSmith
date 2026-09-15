#!/usr/bin/env python3
"""
Derive every production web asset from the three supplied EncounterSmith files.

Originals live outside this repository and are never modified. Re-run this
script after replacing a source file; everything under public/ that it writes is
reproducible from it.

    python3 tools/build-assets.py

Requires Pillow.
"""
from __future__ import annotations

import os
from pathlib import Path
from PIL import Image, ImageOps

SRC = Path(os.environ.get("ES_ASSET_SRC", "/mnt/user-data/uploads/Assests"))
ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / "public"

BANNER = SRC / "Banner.png"
LOGO = SRC / "Logo.png"
GUIDE = SRC / "ChatGPT Image Sep 15, 2026, 11_15_33 AM.png"

PARCHMENT = (234, 220, 198)

# Geometry, in source pixels, chosen by inspecting the artwork rather than by
# guessing from the filename. Recorded here so a future crop can be adjusted.
HERO_CROP = (1252, 0, 2172, 724)      # the illustrated half, clear of baked type
GRAIN_PATCH = (500, 38, 756, 128)     # clean parchment between border and wordmark


def save_pair(img: Image.Image, dest_stem: Path, quality: int = 82) -> None:
    """Write a .webp and a .png of the same pixels, for <picture> fallbacks."""
    dest_stem.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest_stem.with_suffix(".webp"), "WEBP", quality=quality, method=6)
    png = img
    if png.mode == "RGBA":
        png.save(dest_stem.with_suffix(".png"), "PNG", optimize=True)
    else:
        png.convert("P", palette=Image.ADAPTIVE, colors=256).save(
            dest_stem.with_suffix(".png"), "PNG", optimize=True
        )


def report(path: Path) -> None:
    kb = path.stat().st_size / 1024
    with Image.open(path) as im:
        print(f"  {path.relative_to(ROOT)}  {im.size[0]}x{im.size[1]}  {kb:.0f} KB")


def build_hero(banner: Image.Image) -> None:
    scene = banner.crop(HERO_CROP)
    for width in (920, 640, 460):
        h = round(scene.height * width / scene.width)
        save_pair(scene.resize((width, h), Image.LANCZOS), PUB / "images" / f"hero-scene-{width}")
        report(PUB / "images" / f"hero-scene-{width}.webp")


def build_og(banner: Image.Image) -> None:
    """1200x630 social card: the whole banner letterboxed, never cropped."""
    card = Image.new("RGB", (1200, 630), PARCHMENT)
    scaled = banner.resize((1200, round(banner.height * 1200 / banner.width)), Image.LANCZOS)
    card.paste(scaled, (0, (630 - scaled.height) // 2))
    card.save(PUB / "images" / "og-encountersmith.jpg", "JPEG", quality=88, optimize=True)
    report(PUB / "images" / "og-encountersmith.jpg")


def build_emblem(logo: Image.Image) -> None:
    for size in (640, 320, 160):
        save_pair(logo.resize((size, size), Image.LANCZOS), PUB / "brand" / f"emblem-{size}")
        report(PUB / "brand" / f"emblem-{size}.webp")


def build_icons(logo: Image.Image) -> None:
    """Favicons and app icons: flattened onto parchment, since the emblem tile
    has transparent corners and several platforms composite onto black."""
    def flat(size: int, inset: float = 0.0) -> Image.Image:
        canvas = Image.new("RGB", (size, size), PARCHMENT)
        pad = round(size * inset)
        inner = size - pad * 2
        canvas.paste(logo.resize((inner, inner), Image.LANCZOS), (pad, pad), logo.resize((inner, inner), Image.LANCZOS))
        return canvas

    for name, size, inset in (
        ("favicon-32.png", 32, 0.0),
        ("favicon-64.png", 64, 0.0),
        ("apple-touch-icon.png", 180, 0.06),
        ("icon-192.png", 192, 0.04),
        ("icon-512.png", 512, 0.04),
    ):
        flat(size, inset).save(PUB / "brand" / name, "PNG", optimize=True)
        report(PUB / "brand" / name)


def build_texture(banner: Image.Image) -> None:
    """A seamless parchment grain, mirror-built from real paper in the artwork."""
    patch = banner.crop(GRAIN_PATCH)
    row = Image.new("RGB", (patch.width * 2, patch.height))
    row.paste(patch, (0, 0))
    row.paste(ImageOps.mirror(patch), (patch.width, 0))
    tile = row
    while tile.height < 360:
        stacked = Image.new("RGB", (tile.width, tile.height * 2))
        stacked.paste(tile, (0, 0))
        stacked.paste(ImageOps.flip(tile), (0, tile.height))
        tile = stacked
    tile = tile.crop((0, 0, 512, 360))
    tile.save(PUB / "textures" / "parchment.webp", "WEBP", quality=80, method=6)
    report(PUB / "textures" / "parchment.webp")


def build_guide_reference(guide: Image.Image) -> None:
    """Kept in docs/ for reference only. It is a spec sheet, not a site asset."""
    (ROOT / "docs").mkdir(exist_ok=True)
    guide.resize((1200, round(guide.height * 1200 / guide.width)), Image.LANCZOS).save(
        ROOT / "docs" / "brand-guide.jpg", "JPEG", quality=84, optimize=True
    )
    report(ROOT / "docs" / "brand-guide.jpg")


def main() -> None:
    banner = Image.open(BANNER).convert("RGB")
    logo = Image.open(LOGO).convert("RGBA")
    guide = Image.open(GUIDE).convert("RGB")
    print(f"source banner {banner.size}, logo {logo.size}, guide {guide.size}")
    build_hero(banner)
    build_og(banner)
    build_emblem(logo)
    build_icons(logo)
    build_texture(banner)
    build_guide_reference(guide)
    print("done")


if __name__ == "__main__":
    main()
