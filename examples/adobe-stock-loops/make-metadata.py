#!/usr/bin/env python3
"""Writes out/metadata.csv (Adobe Stock contributor CSV: Filename, Title, Keywords, Category).

Category uses Adobe Stock's numeric IDs, which the CSV importer expects:
19 = Technology, 8 = Graphic Resources, 2 = Buildings and Architecture.
"""
import csv, pathlib

COMMON_TAIL = ["motion graphics", "animation", "cgi", "3d render", "backdrop", "modern", "concept",
               "science fiction", "cyber", "virtual", "network", "innovation", "data", "light", "glow", "dark",
               "4k", "hd", "no people", "copy space"]

CLIPS = {
    "A-blueprint-grid-loop": dict(
        title="Glowing cyan wireframe icosahedron over infinite grid, seamless loop",
        category=19,
        kw=["wireframe", "3d", "abstract", "technology", "grid", "loop", "futuristic", "digital", "background",
            "blueprint", "icosahedron", "geometric", "polyhedron", "cyan", "blue", "engineering", "design",
            "hologram", "geometry", "seamless"]),
    "B-hologram-knot-loop": dict(
        title="Holographic torus knot over glowing projector rings, seamless loop",
        category=19,
        kw=["hologram", "3d", "abstract", "technology", "torus knot", "loop", "futuristic", "digital", "background",
            "wireframe", "holographic", "projection", "cyan", "teal", "scan", "particles", "rings", "interface",
            "hud", "seamless"]),
    "C-synthwave-horizon-loop": dict(
        title="Retro synthwave neon grid, striped sun and wireframe mountains, loop",
        category=8,
        kw=["synthwave", "retro", "neon", "grid", "loop", "80s", "futuristic", "sunset", "background", "abstract",
            "retrowave", "outrun", "vaporwave", "sun", "mountains", "wireframe", "pink", "purple", "3d", "seamless"]),
    "D-wireframe-city-buildup": dict(
        title="Glowing blue wireframe city skyline growing from a digital grid",
        category=19,
        kw=["wireframe", "city", "3d", "technology", "buildings", "growth", "futuristic", "digital", "skyline",
            "smart city", "abstract", "urban", "architecture", "construction", "development", "skyscraper",
            "hologram", "blue", "grid", "build up"]),
    "E-morph-sphere-loop": dict(
        title="Morphing wireframe sphere in pink and cyan gradient, seamless loop",
        category=8,
        kw=["wireframe", "sphere", "3d", "abstract", "morph", "loop", "futuristic", "digital", "background", "neon",
            "geodesic", "mesh", "organic", "wave", "liquid", "pink", "purple", "cyan", "gradient", "seamless"]),
    "F-tunnel-warp-loop": dict(
        title="Neon wireframe tunnel flight with warp speed surge, seamless loop",
        category=8,
        kw=["tunnel", "warp", "3d", "abstract", "neon", "loop", "futuristic", "speed", "background", "wireframe",
            "hyperspace", "flight", "travel", "portal", "wormhole", "magenta", "cyan", "motion", "vj loop", "seamless"]),
}


def keywords(base):
    out = []
    for k in base + COMMON_TAIL:
        if k not in out:
            out.append(k)
    assert 30 <= len(out) <= 49, len(out)
    return out


rows = []
for res in ("1080p", "4k"):
    for stem, c in CLIPS.items():
        kw = keywords(c["kw"])
        if res == "1080p":
            kw = [k for k in kw if k != "4k"] + ["full hd"]
        assert len(c["title"]) <= 70, c["title"]
        rows.append([f"{stem}-{res}.mov", c["title"], ", ".join(kw), c["category"]])

out = pathlib.Path(__file__).parent / "out" / "metadata.csv"
out.parent.mkdir(exist_ok=True)
with out.open("w", newline="", encoding="utf-8") as f:
    w = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
    w.writerow(["Filename", "Title", "Keywords", "Category"])
    w.writerows(rows)
print(f"wrote {out} ({len(rows)} rows)")
for r in rows: print(len(r[1]), len(r[2].split(', ')), r[0])
