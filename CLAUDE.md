# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page static portfolio. Markdown in `content/` is rendered by `build.py` (one file, standard library only, Python 3.8+) into `dist/`. There is no package manager, no test suite, and no linter. `dist/` is gitignored and must never be committed.

## Commands

```bash
python3 build.py            # build into dist/
python3 build.py --serve    # build, then serve at http://localhost:8000
python3 build.py --serve --port 8001
```

The in-app preview config (`.claude/launch.json`) is named `portfolio` and runs the serve command on port 8000.

Deployment is automatic: pushing to `main` runs `.github/workflows/deploy.yml`, which builds with Python 3.12 and publishes `dist/` to GitHub Pages.

## Architecture

**Pipeline** (all in `build.py`, top to bottom): `split_frontmatter` → `render_markdown` (block level) → `render_inline` (spans) → `build` (template substitution, copy assets) → `serve` (optional dev server).

**Content model**
- `content/_site.md` holds site settings as a `key: value` frontmatter block only (name, title, tagline, description, url, lang, default_theme, default_font, footer). Any file starting with `_` is skipped as a section.
- Every other `*.md` in `content/` becomes one `<section>` on the page, in filename order. The section `id` is the filename with the numeric prefix stripped (`01-about.md` → `#about`). Sections that render to nothing are dropped.
- Headings in content files are demoted by one level, so `#` in a file becomes `<h2>` (the page `<h1>` is the site name).

**Custom Markdown parser, not a library.** Only the following is supported: headings, paragraphs, `-`/`*`/`+` bullets, numbered lists, blockquotes, `---` rules, inline code, links, bold, italic. No fenced code blocks, images, tables, or nested lists. If a content change "doesn't render", check whether the syntax is in this list before touching the parser.
- ` :: ` inside a list item splits it into `.item-main` / `.item-meta` (right-aligned). When *every* item in a list uses `::`, the list gets `class="rows"` and loses its bullets; otherwise it is a normal list. This is what makes the CV and writing lists align.
- Inline rendering escapes HTML first, stashes code spans and URLs, then applies `--` → en dash and `...` → ellipsis, so those substitutions never touch code or links. External links get `target="_blank" rel="noopener noreferrer"`.
- Wrapped continuation lines (indented or not) are joined into the item above; a blank line ends a list only if the next non-blank line is not another item.

**Template.** `templates/base.html` is plain HTML with `{{placeholder}}` tokens replaced by string substitution in `build()`. Adding a new site setting means adding both a `{{token}}` in the template and a `page.replace(...)` line in `build()`. `{{tagline}}` and `{{footer}}` are rendered through `render_inline`, so they accept inline Markdown.

**Theme and font.** An inline script in `<head>` sets `data-theme` (`light`, `dark`, `fun`) and `data-font` (`sans`, `serif`) on `<html>` before first paint from localStorage, falling back to the `_site.md` defaults (`auto` follows the OS). `assets/style.css` keys everything off those two attributes via CSS custom properties, and includes a print stylesheet.

- The two typefaces share one declared `--step` and `--leading`; the serif is matched to the sans optically with `font-size-adjust` (`--x-height`) so switching does not reflow the page. A `@supports` block restores the old manual size bump where `font-size-adjust` is missing.
- `data-theme="fun"` keeps the black-on-white tokens and adds a fixed `body::before` of layered radial gradients. `assets/app.js` eases `--mx` / `--my` toward the pointer a frame at a time; the loop parks itself once it catches up and is torn down when the theme changes or the visitor prefers reduced motion.

**Dev server.** `serve()` has no file watcher. On each request for `/` it compares the newest mtime under `content/`, `templates/`, and `assets/` to the last build time and rebuilds if newer. Changes to `build.py` itself require restarting the server. Assets are copied flat into `dist/` (no subdirectories), and a `.nojekyll` file is written so GitHub Pages serves the output verbatim.
