# Portfolio

A text portfolio. You write Markdown; a small Python script turns it into one
static page. No frameworks, no `npm install`, nothing that can rot.

## Editing

Everything you'll ever touch lives in `content/`.

| File | What it is |
|------|------------|
| `_site.md` | Your name, tagline, and defaults. Starts with `_`, so it isn't a section. |
| `01-about.md` | About: the bio |
| `02-work.md` | Work: lectures, publications, exhibitions |
| `03-cv.md` | Experience: jobs and education |
| `04-slop.md` | Slop: side projects, each with a one-line description |
| `05-contact.md` | Elsewhere: email and social links |

The rules are just:

- **One file = one section**, in filename order. `01-`, `02-`, `03-` set the order.
- **To add a section**, drop in a new file: `06-talks.md`. It appears at the end.
- **To reorder**, rename the number prefixes.
- **To hide a section**, rename it to start with `_`, e.g. `_05-contact.md`.
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
a clean index. That's what makes the work, CV and contact lists line up. Lists
without `::` stay as normal bullets, like Slop.

Titles in lists are bold. Where the title is the link, put the bold inside it:

```markdown
- [**HONK**](https://honkmyhorn.netlify.app/) - When you honk your horn in NYC...
```

Two small conveniences: `--` becomes an en dash (–) and `...` becomes an
ellipsis (…). URLs are left alone.

## Settings

In `content/_site.md`:

- `default_theme` — `auto` (follow the visitor's system), `light`, `dark`, or
  `fun` (see below). Currently `dark`.
- `default_font` — `sans` (Helvetica) or `serif` (Baskerville). Currently `serif`.
- `description` — used by Google and link previews
- `footer` — the line at the bottom

A visitor's own choice of theme and typeface is remembered in their browser and
overrides these.

## Fun mode

The third theme, for visitors who want to play. The type stays black on white;
everything else moves.

- **Colour.** The page sits in one soft family of colour: a single hue and its
  near neighbours, so overlaps never go muddy. It starts from the time of day
  and slowly turns as you move the pointer.
- **Source / Field.** A pill slides out beside the Fun button. *Field* fills the
  page with colour and the pointer clears paths through it. *Source* leaves the
  page white and the pointer paints the colour instead. Falling animals draw
  too: a ribbon down their fall and a bloom where they land. Switching gathers
  the colour into the button, or blooms it back out. The pill's outline is a
  hand-drawn scallop that creeps round it.
- **Words.** Words shuffle out of the pointer's way, and out of the way of
  anything falling past them.
- **Animals.** Click anywhere that isn't a link and a doodled animal cannonballs
  into the bottom of the window with a splash: bear, cat, rabbit, frog, duck,
  elephant, camel, giraffe, penguin, hippo, in turn. They stay afloat. In the
  serif they roam about on their own; in the sans they line up and swim
  together.

On phones and tablets it is lighter. The colour only moves while you touch or
scroll, your finger turns the hue but leaves no trail (only the animals draw),
and the words are only pushed by animals. It stops drawing once everything has
settled, to spare the battery.

None of it prints, and it all holds still for visitors whose system asks for
reduced motion.

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
