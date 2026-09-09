"""Adaptation des calques standard, sans supprimer ni écraser de PNG existant.

Nécessite Pillow. Sans --write : produit seulement une planche de travail dans tmp.
Avec --write : ajoute les fichiers manquants dans medium_large.
Les vêtements existants et leurs masques de coloration restent inchangés.
"""

from pathlib import Path
import argparse
import json
import hashlib

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets/sprites/rugby-player"
SOURCE = ASSETS / "medium_standard"
DESTINATION = ASSETS / "medium_large"
SIZE = (200, 400)
NEAREST = Image.Resampling.NEAREST

# Centre horizontal, largeur, hauteur, repères verticaux standard puis large.
# Le déplacement et les proportions de la tête sont propres à chaque pose.
HEAD_GEOMETRY = {
    "stand_front": (100, 1.20, 1.14, 59, 60),
    "hand": (100, 1.18, 1.10, 51, 71),
    "hooker_throw_back": (100, 1.15, 1.15, 104, 93),
    "lifter_front": (101, 1.20, 1.20, 95, 78),
}
HEAD_LAYERS = ("casque", "chauve", "mulet", "chignon", "strap", "barbe", "moustache")


def read(path):
    with Image.open(path) as image:
        return image.convert("RGBA")


def adapt_head(image, pose):
    center, scale_x, scale_y, source_y, target_y = HEAD_GEOMETRY[pose]
    # Transformation inverse : chaque pixel destination prélève un pixel source.
    return image.transform(SIZE, Image.Transform.AFFINE, (
        1 / scale_x, 0, 85 - center / scale_x,
        0, 1 / scale_y, source_y - target_y / scale_y,
    ), resample=NEAREST)


def bald_body(pose, frame=""):
    body = read(DESTINATION / pose / f"body{frame}.png")
    original = read(SOURCE / pose / "body.png")
    bald = read(SOURCE / pose / "bodychauve.png")
    # On transfère uniquement les retouches de la tête, jamais la tenue standard.
    # La version debout contient aussi une tenue blanche : elle est hors masque.
    changed = Image.new("L", original.size)
    original_pixels, bald_pixels = original.load(), bald.load()
    changed_pixels = changed.load()
    head_bottom = {"stand_front": 116, "hand": 108,
                   "hooker_throw_back": 139, "lifter_front": 136}[pose]
    for y in range(40, head_bottom):
        for x in range(50, 121):
            if original_pixels[x, y] != bald_pixels[x, y]:
                changed_pixels[x, y] = 255
    body.paste(adapt_head(bald, pose), (0, 0), adapt_head(changed, pose))
    # La chevelure large dépasse légèrement le contour standard : remplacer
    # aussi toute sa partie supérieure évite des pixels de cheveux flottants.
    cap = {
        "stand_front": (64, 54, 139, 114),
        "hand": (64, 65, 138, 117),
        "hooker_throw_back": (66, 90, 135, 133),
        "lifter_front": (65, 74, 138, 128),
    }[pose]
    body.paste(adapt_head(bald, pose).crop(cap), cap[:2])
    return body


def adapt_jumper(image):
    # Tous les calques suivent exactement le même élargissement : tête modérée,
    # torse et jambes plus larges. Le prélèvement au plus proche garde le pixel art.
    result = Image.new("RGBA", SIZE)
    source_pixels, target_pixels = image.load(), result.load()
    for y in range(SIZE[1]):
        source_y = min(369, int(y * 370 / 400))
        progress = max(0, min(1, (source_y - 130) / 70))
        scale_x = 1.18 + 0.22 * progress
        for x in range(SIZE[0]):
            source_x = int((x - 100) / scale_x + 85)
            if 0 <= source_x < image.width:
                target_pixels[x, y] = source_pixels[source_x, source_y]
    return result


def create_variants():
    variants = {}
    for pose in HEAD_GEOMETRY:
        variants[f"{pose}/bodychauve.png"] = bald_body(pose)
        for name in HEAD_LAYERS:
            path = SOURCE / pose / f"{name}.png"
            if path.exists():
                variants[f"{pose}/{name}.png"] = adapt_head(read(path), pose)
    for frame in ("-gauche", "-droite"):
        variants[f"hand/bodychauve{frame}.png"] = bald_body("hand", frame)
    for path in sorted((SOURCE / "jumper").glob("*.png")):
        variants[f"jumper/{path.name}"] = adapt_jumper(read(path))
    return variants


def tinted(image, color):
    image = image.copy()
    image.putdata([
        (r * color[0] // 255, g * color[1] // 255, b * color[2] // 255, a)
        for r, g, b, a in image.getdata()
    ])
    return image


def compose(variants, pose, hair=None, accessories=(), frame=""):
    def layer(name):
        key = f"{pose}/{name}.png"
        return variants[key] if key in variants else read(DESTINATION / key)

    body = layer(("bodychauve" if hair else "body") + frame).copy()
    for name in ("jersey", "shorts", "socks", "details"):
        suffix = frame if name in ("socks", "details") else ""
        color = (235, 190, 40) if name == "details" else (20, 110, 185)
        body.alpha_composite(tinted(layer(name + suffix), color))
    if hair:
        body.alpha_composite(layer(hair))
    for accessory in accessories:
        if f"{pose}/{accessory}.png" in variants:
            body.alpha_composite(layer(accessory))
    return body


def preview(variants):
    styles = [("Court", None, ()), ("Chauve", "chauve", ()),
              ("Mulet", "mulet", ()), ("Chignon", "chignon", ()),
              ("Casque", None, ("casque",)),
              ("Strap et barbe", None, ("strap", "barbe")),
              ("Moustache", None, ("moustache",))]
    poses = list(HEAD_GEOMETRY) + ["jumper"]
    sheet = Image.new("RGB", (len(styles) * 210, len(poses) * 440), (65, 71, 81))
    draw = ImageDraw.Draw(sheet)
    for row, pose in enumerate(poses):
        for col, (label, hair, accessories) in enumerate(styles):
            draw.text((col * 210 + 8, row * 440 + 5), f"{pose} / {label}", fill="white")
            player = compose(variants, pose, hair, accessories)
            sheet.paste(player, (col * 210 + 5, row * 440 + 30), player)
    directory = ROOT / "tmp"
    directory.mkdir(exist_ok=True)
    # Un nouveau nom à chaque exécution, même pour la planche de travail.
    index = 1
    while (directory / f"medium-large-planche-{index}.png").exists():
        index += 1
    path = directory / f"medium-large-planche-{index}.png"
    sheet.save(path)
    print(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    variants = create_variants()
    if args.write:
        existing = {path: hashlib.sha256(path.read_bytes()).hexdigest()
                    for path in ASSETS.rglob("*.png")}
        created = []
        for relative, image in variants.items():
            path = DESTINATION / relative
            if path.exists():
                continue
            path.parent.mkdir(parents=True, exist_ok=True)
            # Le mode exclusif protège aussi contre un fichier créé entre-temps.
            with path.open("xb") as output:
                image.save(output, format="PNG")
            created.append(relative)
        for path, digest in existing.items():
            if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
                raise RuntimeError(f"Fichier existant altéré : {path}")
        print(json.dumps({"created": created, "preserved": len(existing)}, indent=2))
    else:
        preview(variants)


if __name__ == "__main__":
    main()
