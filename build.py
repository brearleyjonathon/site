#!/usr/bin/env python3
"""
Build the portfolio.

    python3 build.py           build into dist/
    python3 build.py --serve   build, then serve at http://localhost:8000

Reads every Markdown file in content/ (except those starting with "_"),
renders each one as a section of a single page, and writes dist/.

No dependencies. Python 3.8+. Nothing to install, nothing to keep updated.
"""

import html
import http.server
import os
import re
import shutil
import socketserver
import sys
from pathlib import Path

ROOT = Path(__file__).parent.resolve()
CONTENT = ROOT / "content"
TEMPLATES = ROOT / "templates"
ASSETS = ROOT / "assets"
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
# Block Markdown
# --------------------------------------------------------------------------

BULLET_RE = re.compile(r"^[-*+]\s+(.*)$")
NUMBER_RE = re.compile(r"^\d+[.)]\s+(.*)$")
HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
RULE_RE = re.compile(r"^(-{3,}|\*{3,}|_{3,})$")


def render_markdown(text, heading_offset=1):
    """Markdown to HTML. Headings are demoted by heading_offset levels."""
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
            out.append("<blockquote>%s</blockquote>" % render_markdown("\n".join(quote), heading_offset))
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
        rendered = render_markdown(body)
        if not rendered.strip():
            continue
        sections.append(
            '<section id="%s" class="section">\n%s\n</section>'
            % (html.escape(section_id(path), quote=True), rendered)
        )

    template = (TEMPLATES / "base.html").read_text(encoding="utf-8")

    name = site.get("name", "Portfolio")
    tagline = site.get("tagline", "")
    page = template
    page = page.replace("{{name}}", html.escape(name, quote=False))
    page = page.replace("{{title}}", html.escape(site.get("title", name), quote=True))
    page = page.replace("{{description}}", html.escape(site.get("description", ""), quote=True))
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
    page = page.replace("{{sections}}", "\n\n".join(sections))

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)
    (DIST / "index.html").write_text(page, encoding="utf-8")

    for asset in ASSETS.iterdir():
        if asset.is_file() and not asset.name.startswith("."):
            shutil.copy2(asset, DIST / asset.name)

    # Tell GitHub Pages not to run the output through Jekyll.
    (DIST / ".nojekyll").write_text("", encoding="utf-8")

    print("built dist/ -- %d section%s" % (len(sections), "" if len(sections) == 1 else "s"))
    for path in sources:
        print("  %s -> #%s" % (path.name, section_id(path)))


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

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(DIST), **kwargs)

        def do_GET(self):
            if self.path in ("/", "/index.html"):
                latest = newest_source_time()
                if latest > state["built"]:
                    try:
                        build()
                        state["built"] = latest
                    except SystemExit as error:
                        self.send_error(500, str(error))
                        return
            super().do_GET()

        def log_message(self, fmt, *args):
            pass  # keep the terminal quiet

    socketserver.TCPServer.allow_reuse_address = True
    try:
        server = socketserver.TCPServer(("", port), Handler)
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
