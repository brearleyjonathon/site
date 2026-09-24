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
- The sections now are `01-about`, `02-work` (lectures, publications, exhibitions), `03-cv` (heading "Experience"), `04-slop` (side projects) and `05-contact` (heading "Elsewhere"). Titles in the list sections are bold: `**Title**, …` in work and CV, and `[**Title**](url)` where the title is itself the link (education, slop).

**Custom Markdown parser, not a library.** Only the following is supported: headings, paragraphs, `-`/`*`/`+` bullets, numbered lists, blockquotes, `---` rules, inline code, links, bold, italic. No fenced code blocks, images, tables, or nested lists. If a content change "doesn't render", check whether the syntax is in this list before touching the parser.
- ` :: ` inside a list item splits it into `.item-main` / `.item-meta` (right-aligned). When *every* item in a list uses `::`, the list gets `class="rows"` and loses its bullets; otherwise it is a normal list. This is what makes the work, CV and contact lists align. The slop list separates with ` - ` instead, so it stays a bulleted list.
- Inline rendering escapes HTML first, stashes code spans and URLs, then applies `--` → en dash and `...` → ellipsis, so those substitutions never touch code or links. External links get `target="_blank" rel="noopener noreferrer"`.
- Wrapped continuation lines (indented or not) are joined into the item above; a blank line ends a list only if the next non-blank line is not another item.

**Template.** `templates/base.html` is plain HTML with `{{placeholder}}` tokens replaced by string substitution in `build()`. Adding a new site setting means adding both a `{{token}}` in the template and a `page.replace(...)` line in `build()`. `{{tagline}}` and `{{footer}}` are rendered through `render_inline`, so they accept inline Markdown.

**Theme and font.** An inline script in `<head>` sets `data-theme` (`light`, `dark`, `fun`), `data-font` (`sans`, `serif`) and `data-fun` (`field`, `source`) on `<html>` before first paint from localStorage, falling back to the `_site.md` defaults, which are dark and serif (`auto` follows the OS). `assets/style.css` keys everything off those attributes via CSS custom properties, and includes a print stylesheet.

- The two typefaces share one declared `--step` and `--leading`; the serif is matched to the sans optically with `font-size-adjust` (`--x-height`, set from `--serif-x-height`) so switching does not reflow the page. A `@supports` block restores the old manual size bump where `font-size-adjust` is missing. Buttons need `font-size-adjust` set explicitly, because the browser's button `font` shorthand resets it.
- The switch buttons follow the page face. `fitLabels()` in `assets/app.js` measures every label in both faces once (and again when web fonts finish loading) and fixes each button's `min-width` to the wider, so the controls never shift when the face changes.

**Fun mode.** Everything below lives in `assets/app.js` and the Fun part of `assets/style.css`. None of it prints, and the moving parts sit out under `prefers-reduced-motion`.

- **The colour field.** Five `.blob` pools inside `.blobs > .pools`, each a soft radial of one colour, moved by `place()` on slow Lissajous paths read from one shared clock (not by CSS). Scrolling winds the clock forward, up to about ten times its resting rate, and it decays back. The frame loop (`step()`, started by `wake()`) runs continuously while Fun is on, except on touch, where it sleeps when idle (see **Touch**); if the pools sit still, check that loop, not a keyframe.
- **One hue.** `--c1`..`--c5` are one anchor hue and two neighbours either side, 18° apart, converted from OKLCH so lightness is even round the wheel; `--base` under them is the same hue, pale. The hue starts from the time of day (`HOURS`) and turns as the pointer travels (`SPIN`, degrees per px), so the field is always one analogous family and never averages to grey.
- **Source and Field.** A pill sub-switch (`.fun-controls` inside `.theme-group`) slides in beside the theme buttons in Fun. State is `data-fun` and localStorage `fun-mode` (an old value `cursor` is read as `source`). In `field` the pools show and the pointer clears them to white; in `source` the pools are clipped away, the page stays white, and the pointer lays the colour down. `.pools` is clipped to a circle centred on the button last pressed (`--px`/`--py`), and the clip transitions, so the colour gathers into the button or blooms out of it.
- **The trail.** A `.trail` canvas above the pools. Each mark is kept in a list and redrawn every frame larger and fainter, because it keeps opening out after it is made. Marks are one pre-rendered sprite per colour (`stamp()`), with an edge ramp of seven stops: white in `field`, the hue the mark was made in for `source`. Two things draw: the pointer and the animals. `sow()` takes a source (`{x, y, going, sown}`), a `size` against `HOLE` and a spacing; each mark carries its own `size` and `life`. While an animal is in the air, `trailAnimals()` lays a narrower ribbon (`WAKE`) down its fall and turns the hue by the distance it travels, and when it lands `bloom()` opens one wide, longer-lived mark (`BLOOM`) at the water.
- **The pill.** Its CSS border is transparent (width kept for layout). The outline is `.pill-line`, one closed scalloped path traced just inside the pill by `outline()` (a wave along the normal, a whole number of bumps), drawn once and again on resize or a face change, with `pathLength="1000"`. CSS dashes it 720/280 and animates `stroke-dashoffset`, so three quarters of the line shows and travels round every nine seconds with no script per frame.
- **The thumb.** The pressed side is a `.thumb` under the labels, painted with the live `--c1`/`--c3`/`--c5` gradient, spanning the pill's height and running to the pill's edge on its outer side. `trim()` clips it to `thumbShape()`: the pill's own wave along the top, bottom and outer end, so it meets the line bump for bump, and a phased scalloped cap on the inner end, so there is no seam. `seat()` puts the pressed button's box into `--tx`/`--tw` and, on a switch, the old box into `--fx`/`--fw` (measured before the target moves) and adds `.hop`: the thumb draws in to a circle, the circle crosses, then it opens out. It is re-clipped every frame while hopping and once more on `animationend`.
- **Words.** Every word in `main` is wrapped in a `.shard` span while Fun is on and unwrapped when it is off. Words near the pointer, or near any animal still in the air (`flying`), are nudged with `left`/`top` and eased back by a transition. The shards stay `display: inline` deliberately: `inline-block` would allow rotation, but a browser may break a line between atomic inlines even with a word joiner, which orphaned punctuation after links. Positions are measured once, while nothing is displaced, and again on resize and on a face change.
- **The animals.** A click sends a doodled animal off the pointer: it hops, cross-fades from standing to tucked, spins, falls to the bottom of the window and lands bottom-first, with a wavy water line drawn outward, splash strokes and droplets. The flight time (`--flight`, set inline per dive) grows with the distance to fall, and the splash waits the same. Clicks take turns through ten animals: six share one body and differ in `FACES`, and the camel, giraffe, penguin and hippo have their own `SHAPES`. Every `stroke-width` is scaled by `THIN`, and the `.ink` group is roughened by the `#ink-sketch` filter in the template. `--size` is wired through but fixed at 1.
- **Afloat.** Half a second after landing each animal surfaces as a `.swimmer` along the bottom, backed by a solid shape in `--bg` (`BACKS`) so the one in front hides the one behind. `lineUp()` sets `left`: in the sans a row from the left in landing order, in the serif where each landed. `swim()` adds a `translate` on top: in the serif each roams on its own, rests and sets off again, turned to face its way; in the sans the whole row swims together at `PACE` and turns at the edges. Past forty afloat, the oldest slips away. All of them are cleared when Fun is switched off.
- **Grain and warp.** Grain is `body::after`; a displacement filter sits on `main`.
- **Touch.** Under `(hover: none) and (pointer: coarse)` the warp on `main` is dropped and the grain holds still (end of the Fun CSS), and `step()` draws at about 30fps (`FRAME`). The pools have no pace of their own there: `drift` advances only on `rush`, which scrolling and finger travel wind up, so they shift while touched or swiped and then hold still. The loop goes to sleep when `busy()` is false (nothing winding, no trail, no animal in the air or afloat) and `wake()` restarts it; anything new that should move on touch has to call `wake()` and be counted in `busy()`. The finger stands in for the pointer through `touchstart`/`touchmove`, which keep firing while the page scrolls even though the browser cancels the pointer, so the hue follows the thumb, but the finger leaves no trail: on touch only the animals draw. `touchend` lets go. The finger does not push words (`pushers()` skips it on touch), so only animals scatter them. The trail canvas is drawn at 1x and keeps at most 60 marks. Touch `pointerout` is ignored because it fires as soon as a scroll starts. On every device `paint()` skips the canvas when the trail is empty (`drawn`), and `place()` only runs when `drift` has changed.

**Fun mode pitfalls.** Each of these has broken the page silently at least once.

- Keep the `.shard`, `.diver`, `.splash`, `.flicks`, `.drop` and `.swimmer` rules below the field section. Two rewrites of that section swept them away without an error: the spans and figures were still built, they just had no `position` or animation, so nothing moved.
- Never animate in CSS a property that script also sets inline. A filled animation outranks inline style for good: the swimmers' rise once animated `translate`, which `swim()` also sets, so they never swam. The rise uses `transform` now.
- When checking, read rendered geometry (`getBoundingClientRect()`, `getComputedStyle()`), not the inline value just written, and check that a word or animal actually moved rather than that the elements exist.
- The in-app browser preview often stops delivering animation frames while looking live. `requestAnimationFrame` never fires, so the field, the swimming and the fall all freeze. Check whether frames are firing before debugging a "broken" animation there.

**Dev server.** `serve()` has no file watcher. On each request for `/` it compares the newest mtime under `content/`, `templates/`, and `assets/` to the last build time and rebuilds if newer. Changes to `build.py` itself require restarting the server. Assets are copied flat into `dist/` (no subdirectories), and a `.nojekyll` file is written so GitHub Pages serves the output verbatim.
