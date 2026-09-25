#!/usr/bin/env python3
"""
Turn one project from the Adobe Portfolio archive into a project folder.

    python tools/import_project.py <archive project folder> [slug]

Writes content/projects/<slug>/: index.md, drafted from the archive's
text.md, and the images resized to WebP. The draft still wants a read: alt
text is left empty, and lines that were separate on the old site may need a
blank line between them to stay separate here.

Needs Pillow (pip install pillow). The site build does not use this file.

What it does, in order:
- Reads the old page (page.html) for its layout: single images, pairs (a
  "tree"), and justified grids (a "media collection"). Images that shared a
  row there are written on consecutive lines, so they share one here.
- Drops the second copy of a pair: the export saved each pair twice.
- Resizes to WebP, 1800px wide at most, 1200px for animations, flattened
  onto white. Videos (video-NN.mp4, downloaded separately) are copied as is.
"""

import re
import sys
from pathlib import Path

from PIL import Image, ImageSequence

SITE = Path(__file__).resolve().parent.parent
WIDTH = 1800
ANIMATED_WIDTH = 1200

# A grid row is filled until its images, at this height, span the width.
ROW_HEIGHT = 300
ROW_WIDTH = 960


def layout(page):
    """The old page's image modules, in order, as groups: one list per
    module, with (width, height) for grid items and None otherwise."""
    tokens = re.finditer(
        r'(?P<tree>class="tree-wrapper)'
        r'|(?P<child>class="tree-child-wrapper)'
        r'|(?P<grid>class="grid--main)'
        r'|class="grid__item-container[^>]*data-width="(?P<w>\d+)" data-height="(?P<h>\d+)"'
        r'|(?P<image>class="js-lightbox" data-src=)'
        r'|(?P<module>class="project-module module (?:text|video|media_collection)[ "])',
        page)
    groups, current, kind, children = [], None, None, 0
    for t in tokens:
        if t.group("tree") or t.group("grid"):
            current, kind = [], "tree" if t.group("tree") else "grid"
            groups.append((kind, current))
        elif t.group("child"):
            children += 1
        elif t.group("w"):
            current.append((int(t.group("w")), int(t.group("h"))))
        elif t.group("image"):
            if kind == "tree" and children:
                current.append(None)
                children -= 1
            else:
                current, kind = None, None
                groups.append(("single", [None]))
        elif t.group("module"):
            current, kind, children = None, None, 0
    return groups


def rows(sizes):
    """Split a grid into justified rows."""
    out, row, span = [], [], 0
    for w, h in sizes:
        width = ROW_HEIGHT * w / h
        if row and span + width > ROW_WIDTH * 1.15:
            out.append(row)
            row, span = [], 0
        row.append((w, h))
        span += width
    if row:
        out.append(row)
    return [len(r) for r in out]


def on_white(im):
    rgba = im.convert("RGBA")
    flat = Image.new("RGB", rgba.size, "white")
    flat.paste(rgba, mask=rgba.getchannel("A"))
    return flat


def shrink(src, dest):
    im = Image.open(src)
    animated = getattr(im, "n_frames", 1) > 1
    cap = ANIMATED_WIDTH if animated else WIDTH
    scale = min(1, cap / im.width)
    size = (round(im.width * scale), round(im.height * scale))
    if animated:
        frames, durations = [], []
        for frame in ImageSequence.Iterator(im):
            durations.append(frame.info.get("duration", 100))
            frames.append(on_white(frame).resize(size, Image.LANCZOS))
        frames[0].save(dest, save_all=True, append_images=frames[1:],
                       duration=durations, loop=0, quality=75, method=6,
                       minimize_size=True, allow_mixed=True)
    else:
        on_white(im).resize(size, Image.LANCZOS).save(dest, quality=82, method=6)
    return dest.stat().st_size


def main():
    src = Path(sys.argv[1]).resolve()
    slug = sys.argv[2] if len(sys.argv) > 2 else src.name
    out = SITE / "content" / "projects" / slug
    out.mkdir(parents=True, exist_ok=True)

    text = (src / "text.md").read_text(encoding="utf-8")
    head, _, body = text.partition("\n---\n")
    title = re.search(r"^# (.+)$", head, re.M).group(1).strip()
    lines = [l.strip() for l in head.splitlines()]
    date = next((l for l in lines if l and not l.startswith(("#", "Section:", "Original URL:"))), "")

    # The files in the order text.md shows them, matched to the old layout.
    files = re.findall(r"^!\[\]\(([^)]+)\)$", body, re.M)
    groups = layout((src / "page.html").read_text(encoding="utf-8"))
    group_of, skip, i = {}, set(), 0
    for n, (kind, members) in enumerate(groups):
        take = files[i:i + len(members)]
        i += len(take)
        if kind == "grid":
            start = 0
            for r, size in enumerate(rows(members)):
                for f in take[start:start + size]:
                    group_of[f] = "%d.%d" % (n, r)
                start += size
        else:
            for f in take:
                group_of[f] = str(n)
        if kind == "tree":
            again = files[i:i + len(take)]
            if len(again) == len(take) and all(
                    (src / a).read_bytes() == (src / b).read_bytes() for a, b in zip(take, again)):
                skip.update(again)
                i += len(again)
    if i != len(files):
        print("warning: the old layout has %d images, text.md %d; rows may be off" % (i, len(files)))

    # Resize, renumbering past the dropped copies.
    names, total, n = {}, 0, 0
    for f in files:
        if f in skip:
            continue
        n += 1
        names[f] = "%02d.webp" % n
        total += shrink(src / f, out / names[f])
    for video in sorted(src.glob("video-*.mp4")):
        (out / video.name).write_bytes(video.read_bytes())
        total += video.stat().st_size

    # The draft: text.md's body with the new names, rows kept together.
    md, previous = [], None
    for line in body.strip().splitlines():
        image = re.match(r"^!\[\]\(([^)]+)\)$", line.strip())
        video = re.match(r"^\[Video: ([^\]]+)\]\(([^)]+)\)$", line.strip())
        if image:
            f = image.group(1)
            if f in skip:
                continue
            if md and md[-1] == "" and previous is not None and group_of.get(f) == previous:
                md.pop()   # same row as the image above: no blank line between
            md.append("![](%s)" % names[f])
            previous = group_of.get(f)
            continue
        if video:
            md.append("![](%s)" % video.group(2))
        else:
            md.append(line.rstrip().replace("​", ""))
        if line.strip():
            previous = None

    front = ["---", "title: %s" % title]
    if date:
        front.append("date: %s" % date)
    front += ["description:", "---", ""]
    (out / "index.md").write_text("\n".join(front + md).rstrip() + "\n", encoding="utf-8")

    print("%s -> content/projects/%s/  %d images, %.1f MB" % (src.name, slug, n, total / 2**20))


if __name__ == "__main__":
    main()
