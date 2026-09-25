#!/usr/bin/env python3
"""
Build the portfolio.

    python3 build.py           build into dist/
    python3 build.py --serve   build, then serve at http://localhost:8000

Reads every Markdown file in content/ (except those starting with "_"),
renders each one as a section of the home page, renders each folder in
content/projects/ as a page of its own, and writes dist/.

No dependencies. Python 3.8+. Nothing to install, nothing to keep updated.
"""

import html
import http.server
import json
import os
import re
import shutil
import struct
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).parent.resolve()
CONTENT = ROOT / "content"
TEMPLATES = ROOT / "templates"
ASSETS = ROOT / "assets"
PROJECTS = CONTENT / "projects"
DIST = ROOT / "dist"


# --------------------------------------------------------------------------
# Frontmatter
# --------------------------------------------------------------------------

def split_frontmatter(text):
    """Pull a leading --- key: value --- block off the front of a document."""
    meta = {}
    if not text.startswith("---"):
        return meta, text

    end = text.find("\n---", 3)
    if end == -1:
        return meta, text

    for line in text[3:end].strip().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip()

    rest = text[end + 4:]
    return meta, rest.lstrip("\n")


# --------------------------------------------------------------------------
# Inline Markdown
# --------------------------------------------------------------------------

LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")
BOLD_RE = re.compile(r"\*\*(?=\S)(.+?)(?<=\S)\*\*", re.S)
ITALIC_RE = re.compile(r"(?<![\*\w])\*(?=\S)([^\*]+?)(?<=\S)\*(?!\*)", re.S)


def render_inline(text):
    """Escape HTML, then apply code / links / bold / italic / typography."""
    code_spans = []
    urls = []

    def keep_code(match):
        code_spans.append(html.escape(match.group(1), quote=False))
        return "\x00%d\x00" % (len(code_spans) - 1)

    # Stash code spans first so their contents stay literal.
    text = re.sub(r"`([^`]+)`", keep_code, text)
    text = html.escape(text, quote=False)

    def link(match):
        label, url = match.group(1), match.group(2)
        external = url.startswith("http://") or url.startswith("https://")
        extra = ' target="_blank" rel="noopener noreferrer"' if external else ""
        urls.append(html.escape(url, quote=True))
        return '<a href="\x01%d\x01"%s>%s</a>' % (len(urls) - 1, extra, label)

    text = LINK_RE.sub(link, text)
    text = BOLD_RE.sub(r"<strong>\1</strong>", text)
    text = ITALIC_RE.sub(r"<em>\1</em>", text)

    # Typographic niceties. Safe here: URLs are stashed, so "--" inside a
    # link can't be turned into a dash.
    text = text.replace("--", "\u2013").replace("...", "\u2026")

    text = re.sub(r"\x01(\d+)\x01", lambda m: urls[int(m.group(1))], text)
    text = re.sub(r"\x00(\d+)\x00",
                  lambda m: "<code>%s</code>" % code_spans[int(m.group(1))], text)
    return text


def render_item(text):
    """A list item. ' :: ' splits it into main content and right-aligned meta."""
    if " :: " in text:
        main, meta = text.split(" :: ", 1)
        return (
            '<li class="row"><span class="item-main">%s</span>'
            '<span class="item-meta">%s</span></li>'
            % (render_inline(main.strip()), render_inline(meta.strip()))
        )
    return "<li>%s</li>" % render_inline(text)


# --------------------------------------------------------------------------
# Images
# --------------------------------------------------------------------------

def image_size(path):
    """(width, height) read from a PNG, GIF, WebP or JPEG header, else None.

    Written into the <img> tag so the page keeps its layout while images
    load: the Fun mode measures every word once, and a late image pushing
    the text down would leave those positions wrong.
    """
    try:
        data = path.read_bytes()
    except OSError:
        return None

    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return struct.unpack(">II", data[16:24])
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return struct.unpack("<HH", data[6:10])
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        chunk = data[12:16]
        if chunk == b"VP8X":
            w = int.from_bytes(data[24:27], "little") + 1
            h = int.from_bytes(data[27:30], "little") + 1
            return w, h
        if chunk == b"VP8L":
            bits = int.from_bytes(data[21:25], "little")
            return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
        if chunk == b"VP8 ":
            w, h = struct.unpack("<HH", data[26:30])
            return w & 0x3FFF, h & 0x3FFF
    if data[4:8] == b"ftyp":
        # MP4: the video track's header carries its display size, as 16.16
        # fixed point. The audio track's is zero, so take the first that isn't.
        for match in re.finditer(b"tkhd", data):
            at = match.end()
            skip = 76 if data[at] == 0 else 88   # version 0 or 1 header
            w, h = struct.unpack(">II", data[at + skip:at + skip + 8])
            if w and h:
                return w >> 16, h >> 16
        return None
    if data[:2] == b"\xff\xd8":
        i = 2
        while i + 9 < len(data):
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
                h, w = struct.unpack(">HH", data[i + 5:i + 9])
                return w, h
            i += 2 + struct.unpack(">H", data[i + 2:i + 4])[0]
    return None


IMAGE_RE = re.compile(r"^!\[([^\]]*)\]\(([^)\s]+)\)$")


def render_figure(images, base):
    """Consecutive image lines become one <figure>; two or more sit in a row.

    In a row each image's share of the width is its aspect ratio, so they
    all come out the same height. Each links to its own file, full size.
    An .mp4 or .webm in the same syntax becomes a video with controls, and
    a .json becomes a chart (see render_chart).
    """
    if len(images) == 1 and images[0][1].lower().endswith(".json"):
        return render_chart(images[0][0], images[0][1], base)
    parts = []
    for alt, src in images:
        size = image_size(base / src) if base and "://" not in src else None
        attrs = ' width="%d" height="%d"' % size if size else ""
        style = ' style="--ratio: %.4f"' % (size[0] / size[1]) if size and len(images) > 1 else ""
        label = html.escape(alt, quote=True)
        src = html.escape(src, quote=True)
        if src.lower().endswith((".mp4", ".webm")):
            # Played on request, like the old site's player. #t= makes
            # Safari show the first frame instead of a blank box.
            parts.append(
                '<span class="clip"%s><video src="%s#t=0.001" controls playsinline '
                'preload="metadata"%s%s></video></span>'
                % (style, src, attrs, ' aria-label="%s"' % label if label else "")
            )
            continue
        if size and len(images) == 1 and size[0] < 608:
            # Narrower than the column: never stretched past its own width.
            style = ' style="max-width: %dpx"' % size[0]
        parts.append(
            '<a href="%s"%s><img src="%s" alt="%s"%s loading="lazy" decoding="async"></a>'
            % (src, style, src, label, attrs)
        )
    css = "figure row" if len(images) > 1 else "figure"
    return '<figure class="%s">%s</figure>' % (css, "".join(parts))


def render_chart(title, src, base):
    """A chart: the .json beside the page, inlined for chart.js to draw.

    The alt text is the chart's title. Inlined rather than fetched, so the
    page needs no second request and works opened straight from disk.
    """
    data = (base / src).read_text(encoding="utf-8") if base else "{}"
    json.loads(data)  # fail the build on a broken file, not the page
    return (
        '<figure class="figure chart">\n<figcaption class="chart-title">%s</figcaption>\n'
        '<script type="application/json">%s</script>\n</figure>'
        % (render_inline(title), data.strip().replace("</", "<\\/"))
    )


# --------------------------------------------------------------------------
# Block Markdown
# --------------------------------------------------------------------------

BULLET_RE = re.compile(r"^[-*+]\s+(.*)$")
NUMBER_RE = re.compile(r"^\d+[.)]\s+(.*)$")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
RULE_RE = re.compile(r"^(-{3,}|\*{3,}|_{3,})$")


def render_markdown(text, heading_offset=1, base=None):
    """Markdown to HTML. Headings are demoted by heading_offset levels.

    base is the folder image paths are relative to, for reading their sizes.
    """
    lines = text.replace("\r\n", "\n").split("\n")
    out = []
    i = 0

    def is_block_start(line):
        s = line.strip()
        return (
            not s
            or HEADING_RE.match(s)
            or BULLET_RE.match(s)
            or NUMBER_RE.match(s)
            or RULE_RE.match(s)
            or IMAGE_RE.match(s)
            or s.startswith("> ")
        )

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        rule = RULE_RE.match(stripped)
        if rule:
            out.append("<hr>")
            i += 1
            continue

        heading = HEADING_RE.match(stripped)
        if heading:
            level = min(len(heading.group(1)) + heading_offset, 6)
            out.append("<h%d>%s</h%d>" % (level, render_inline(heading.group(2)), level))
            i += 1
            continue

        if stripped.startswith(">"):
            quote = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote.append(lines[i].strip().lstrip(">").strip())
                i += 1
            out.append("<blockquote>%s</blockquote>" % render_markdown("\n".join(quote), heading_offset, base))
            continue

        if IMAGE_RE.match(stripped):
            images = []
            while i < len(lines) and IMAGE_RE.match(lines[i].strip()):
                images.append(IMAGE_RE.match(lines[i].strip()).groups())
                i += 1
            out.append(render_figure(images, base))
            continue

        for pattern, tag in ((BULLET_RE, "ul"), (NUMBER_RE, "ol")):
            if not pattern.match(stripped):
                continue
            items = []
            current = None
            while i < len(lines):
                s = lines[i].strip()
                m = pattern.match(s)

                if m:
                    if current is not None:
                        items.append(render_item(" ".join(current)))
                    current = [m.group(1)]
                    i += 1
                    continue

                if not s:
                    # A blank line ends the list unless another item follows.
                    j = i
                    while j < len(lines) and not lines[j].strip():
                        j += 1
                    if j < len(lines) and pattern.match(lines[j].strip()):
                        i = j
                        continue
                    break

                # Any other block ends the list; anything else is a wrapped
                # continuation of the item above, indented or not.
                if is_block_start(lines[i]):
                    break
                current.append(s)
                i += 1

            if current is not None:
                items.append(render_item(" ".join(current)))

            # A list where every line uses " :: " is an index, not prose —
            # it gets flush-left, marker-free styling.
            all_rows = bool(items) and all(x.startswith('<li class="row"') for x in items)
            css = ' class="rows"' if all_rows else ""
            out.append("<%s%s>%s</%s>" % (tag, css, "".join(items), tag))
            break
        else:
            para = []
            while i < len(lines) and not is_block_start(lines[i]):
                para.append(lines[i].strip())
                i += 1
            if para:
                out.append("<p>%s</p>" % render_inline(" ".join(para)))

    return "\n".join(out)


# --------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------

def section_id(path):
    """01-about.md -> about"""
    name = path.stem
    return re.sub(r"^\d+[-_]", "", name).replace("_", "-")


def fill(template, site, sections, root="", title=None, description=None):
    """Put one page's sections into the template.

    root is the way back to the top of the site ("" on the home page, "../"
    on a project page), so the shared assets resolve from either. A page
    with a title of its own also gets the site name as a link home.
    """
    name = site.get("name", "Portfolio")
    tagline = site.get("tagline", "")
    site_title = site.get("title", name)
    heading = html.escape(name, quote=False)
    if title:
        heading = '<a href="%s">%s</a>' % (root or "./", heading)

    page = template
    page = page.replace("{{page}}", "project" if title else "home")
    page = page.replace("{{root}}", root)
    page = page.replace("{{name}}", heading)
    page = page.replace("{{title}}", html.escape(
        "%s – %s" % (title, site_title) if title else site_title, quote=True))
    page = page.replace("{{description}}", html.escape(
        description or site.get("description", ""), quote=True))
    page = page.replace("{{url}}", html.escape(site.get("url", ""), quote=True))
    page = page.replace("{{lang}}", html.escape(site.get("lang", "en"), quote=True))
    page = page.replace("{{default_theme}}", html.escape(site.get("default_theme", "auto"), quote=True))
    page = page.replace("{{default_font}}", html.escape(site.get("default_font", "sans"), quote=True))
    page = page.replace(
        "{{tagline}}",
        '<p class="tagline">%s</p>' % render_inline(tagline) if tagline else "",
    )
    page = page.replace(
        "{{footer}}",
        render_inline(site.get("footer", "")) if site.get("footer") else "",
    )
    return page.replace("{{sections}}", "\n\n".join(sections))


def build():
    site_file = CONTENT / "_site.md"
    if not site_file.exists():
        sys.exit("error: content/_site.md is missing.")
    site, _ = split_frontmatter(site_file.read_text(encoding="utf-8"))

    sources = sorted(p for p in CONTENT.glob("*.md") if not p.name.startswith("_"))
    if not sources:
        sys.exit("error: no content files found in content/.")

    sections = []
    for path in sources:
        meta, body = split_frontmatter(path.read_text(encoding="utf-8"))
        rendered = render_markdown(body, base=CONTENT)
        if not rendered.strip():
            continue
        sections.append(
            '<section id="%s" class="section">\n%s\n</section>'
            % (html.escape(section_id(path), quote=True), rendered)
        )

    template = (TEMPLATES / "base.html").read_text(encoding="utf-8")

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)
    (DIST / "index.html").write_text(fill(template, site, sections), encoding="utf-8")

    for asset in ASSETS.iterdir():
        if asset.is_file() and not asset.name.startswith("."):
            shutil.copy2(asset, DIST / asset.name)

    # Each folder in content/projects/ is a page at /<folder>/: its index.md
    # is the text, and everything else in the folder is copied beside it.
    projects = sorted(p for p in PROJECTS.glob("*/index.md")) if PROJECTS.exists() else []
    for path in projects:
        folder = path.parent
        meta, body = split_frontmatter(path.read_text(encoding="utf-8"))
        title = meta.get("title", folder.name)
        # The title and date come from the frontmatter, not the body.
        heading = "<h2>%s</h2>" % render_inline(title)
        if meta.get("date"):
            heading += '\n<p class="date">%s</p>' % render_inline(meta["date"])
        if meta.get("credit"):
            # Where the project was made, and with whom.
            heading += '\n<p class="credit">%s</p>' % render_inline(meta["credit"])
        article = (
            '<article id="%s" class="section project">\n%s\n%s\n</article>'
            % (html.escape(folder.name, quote=True), heading, render_markdown(body, base=folder))
        )
        out = DIST / folder.name
        out.mkdir()
        page = fill(template, site, [article], root="../",
                    title=title, description=meta.get("description"))
        (out / "index.html").write_text(page, encoding="utf-8")
        for item in folder.iterdir():
            if item.is_file() and item.name != "index.md" and not item.name.startswith("."):
                shutil.copy2(item, out / item.name)

    # Tell GitHub Pages not to run the output through Jekyll.
    (DIST / ".nojekyll").write_text("", encoding="utf-8")

    print("built dist/ -- %d section%s, %d project%s" % (
        len(sections), "" if len(sections) == 1 else "s",
        len(projects), "" if len(projects) == 1 else "s"))
    for path in sources:
        print("  %s -> #%s" % (path.name, section_id(path)))
    for path in projects:
        print("  projects/%s -> /%s/" % (path.parent.name, path.parent.name))


def newest_source_time():
    """Most recent mtime across everything the build reads."""
    newest = 0.0
    for folder in (CONTENT, TEMPLATES, ASSETS):
        if not folder.exists():
            continue
        for path in folder.rglob("*"):
            if path.is_file():
                newest = max(newest, path.stat().st_mtime)
    return newest


def serve(port=8000):
    """Serve dist/, rebuilding whenever a source file has changed.

    Edit a Markdown file, refresh the browser, see the change. No watcher
    process, no extra tooling — it just checks timestamps on each page load.
    """
    state = {"built": newest_source_time()}
    lock = threading.Lock()

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(DIST), **kwargs)

        def do_GET(self):
            # Any page, not just the home page: a project page is /<name>/.
            if self.path.split("?")[0].endswith(("/", ".html")):
                with lock:
                    latest = newest_source_time()
                    if latest > state["built"]:
                        try:
                            build()
                            state["built"] = latest
                        except SystemExit as error:
                            self.send_error(500, str(error))
                            return
            super().do_GET()

        def end_headers(self):
            # The whole promise of --serve is that a refresh shows your edit.
            # Without this the browser heuristically caches app.js/style.css
            # and quietly keeps serving the copy it already has.
            self.send_header("Cache-Control", "no-store, must-revalidate")
            super().end_headers()

        def log_message(self, fmt, *args):
            pass  # keep the terminal quiet

    # Threaded, so a browser's idle keep-alive or speculative connection
    # can't block every other request the way a single-threaded server does.
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    http.server.ThreadingHTTPServer.daemon_threads = True
    try:
        server = http.server.ThreadingHTTPServer(("", port), Handler)
    except OSError:
        sys.exit("error: port %d is already in use. Try: python3 build.py --serve --port 8001" % port)

    with server:
        print("\n  http://localhost:%d" % port)
        print("  edit any file in content/, then refresh. ctrl-c to stop.\n")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("stopped")


if __name__ == "__main__":
    build()
    if "--serve" in sys.argv:
        port = 8000
        if "--port" in sys.argv:
            port = int(sys.argv[sys.argv.index("--port") + 1])
        serve(port)
