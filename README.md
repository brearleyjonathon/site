# Portfolio

A text portfolio. You write Markdown; a small Python script turns it into one
static page. No frameworks, no `npm install`, nothing that can rot.

## Editing

Everything you'll ever touch lives in `content/`.

| File | What it is |
|------|------------|
| `_site.md` | Your name, tagline, and defaults. Starts with `_`, so it isn't a section. |
| `01-about.md` | The About section |
| `02-writing.md` | Writing and projects |
| `03-cv.md` | Experience and education |
| `04-contact.md` | Links out |

The rules are just:

- **One file = one section**, in filename order. `01-`, `02-`, `03-` set the order.
- **To add a section**, drop in a new file: `05-talks.md`. It appears at the end.
- **To reorder**, rename the number prefixes.
- **To hide a section**, rename it to start with `_`, e.g. `_04-contact.md`.
- The **first `#` heading** in a file becomes that section's label.

## Preview while you write

```bash
python3 build.py --serve
```

Open <http://localhost:8000>. Edit any file in `content/`, save, refresh the
browser — the site rebuilds itself. Stop it with ctrl-c.

(It watches `content/`, `templates/` and `assets/`. If you ever edit `build.py`
itself, restart the server.)

## Markdown you can use

Standard Markdown: `#` headings, `**bold**`, `*italic*`, `[links](url)`,
`- bullets`, `1. numbered`, `> quotes`, `---` rules, `` `code` ``.

Plus one addition. **` :: ` splits a list item**, pushing whatever follows to
the right-hand column:

```markdown
- **Senior Analyst**, Acme Corp :: 2023 — present
```

> **Senior Analyst**, Acme Corp                        2023 — present

When *every* line in a list uses `::`, the list loses its bullets and reads as
a clean index. That's what makes the CV and the writing list line up. Lists
without `::` stay as normal bullets.

Two small conveniences: `--` becomes an en dash (–) and `...` becomes an
ellipsis (…). URLs are left alone.

## Settings

In `content/_site.md`:

- `default_theme` — `auto` (follow the visitor's system), `light`, `dark`, or
  `fun` (a rainbow that drifts and follows the cursor, under the same black type)
- `default_font` — `sans` (Helvetica) or `serif` (Baskerville)
- `description` — used by Google and link previews
- `footer` — the line at the bottom

A visitor's own choice of theme and typeface is remembered in their browser and
overrides these.

## Publishing

Pushing to `main` rebuilds and deploys the site automatically
(`.github/workflows/deploy.yml`). You never need to commit the built files —
`dist/` is generated and gitignored.

Which means **you can edit content straight on github.com** — open a `.md` file,
click the pencil, commit. The site updates in about a minute. No terminal, no
laptop.

## Layout

```
content/     what you write          <- you live here
templates/   the page shell
assets/      style.css, app.js
build.py     the build (one file, no dependencies)
dist/        generated output        <- never edit, never commit
```

## Printing

The CSS has a print stylesheet, so ⌘P on the page gives a clean black-on-white
CV with the toggles removed.
