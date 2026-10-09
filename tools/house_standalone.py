"""The house on its own, as one HTML file, for testing.

    python tools/house_standalone.py              # writes house-test.html
    python tools/house_standalone.py --model DIR  # with DIR's house-model.json
                                                  # and house-runs.json inside

Bundles the site's stylesheet, content/house.html and assets/house.js into
one file that opens straight from disk, with Light and Dark and Sans and Serif
switches above it. Without a model it runs on the stand-in; with --model (or
when assets/ has the trained files) the model and the runs are written into
the page, so nothing has to be fetched. house-test.html is gitignored.
"""

import argparse
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(*parts):
    with open(os.path.join(ROOT, *parts), encoding="utf-8") as f:
        return f.read()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", help="folder holding house-model.json and house-runs.json (default: assets/, if there)")
    ap.add_argument("--out", default=os.path.join(ROOT, "house-test.html"))
    args = ap.parse_args()

    fragment = read("content", "house.html")
    fragment = "\n".join(line for line in fragment.splitlines() if "<script src=" not in line)
    fragment = fragment.replace("{{alt}}", "A one-room house in axonometric, drawn in line, the air inside coloured by its temperature")

    data = ""
    folder = args.model or os.path.join(ROOT, "assets")
    model, runs = os.path.join(folder, "house-model.json"), os.path.join(folder, "house-runs.json")
    if os.path.exists(model):
        data += "<script>window.HOUSE_MODEL = %s;</script>\n" % open(model, encoding="utf-8").read()
        if os.path.exists(runs):
            data += "<script>window.HOUSE_RUNS = %s;</script>\n" % open(runs, encoding="utf-8").read()
    source = "the trained model in " + os.path.relpath(folder, ROOT) if data else "the stand-in model"

    page = """<!doctype html>
<html lang="en" data-theme="dark" data-font="sans" data-page="home">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>House test</title>
<style>
%(css)s
  .test-bar { display: flex; justify-content: space-between; gap: .5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
  .test-note { font-size: .8125em; color: var(--muted); margin: 0 0 2rem; }
</style>
<script>
  // Remember the theme and face between reloads, like the site does.
  try {
    var t = localStorage.getItem("house-test-theme"), f = localStorage.getItem("house-test-font");
    if (t) document.documentElement.setAttribute("data-theme", t);
    if (f) document.documentElement.setAttribute("data-font", f);
  } catch (e) {}
</script>
</head>
<body>
<div class="page">
  <main>
    <div class="test-bar">
      <div class="switch" role="group" aria-label="Colour theme">
        <button type="button" data-test-theme="light">Light</button>
        <button type="button" data-test-theme="dark">Dark</button>
      </div>
      <div class="switch" role="group" aria-label="Typeface">
        <button type="button" data-test-font="sans">Sans</button>
        <button type="button" data-test-font="serif">Serif</button>
      </div>
    </div>
    <p class="test-note">The house on its own, running on %(source)s.</p>
    <section class="section" id="about">
<figure class="figure embed">
%(fragment)s
</figure>
    </section>
  </main>
</div>
%(data)s<script>
%(js)s
</script>
<script>
  (function () {
    var root = document.documentElement;
    function sync() {
      document.querySelectorAll("[data-test-theme]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.dataset.testTheme === root.getAttribute("data-theme")));
      });
      document.querySelectorAll("[data-test-font]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.dataset.testFont === root.getAttribute("data-font")));
      });
    }
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-test-theme]"), f = e.target.closest("[data-test-font]");
      try {
        if (t) { root.setAttribute("data-theme", t.dataset.testTheme); localStorage.setItem("house-test-theme", t.dataset.testTheme); }
        if (f) { root.setAttribute("data-font", f.dataset.testFont); localStorage.setItem("house-test-font", f.dataset.testFont); }
      } catch (err) {}
      sync();
    });
    sync();
  })();
</script>
</body>
</html>
""" % {"css": read("assets", "style.css"), "fragment": fragment, "data": data, "js": read("assets", "house.js"),
       "source": source}
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(page)
    print("wrote %s (%d KB), running on %s" % (os.path.relpath(args.out, ROOT), os.path.getsize(args.out) // 1024, source))


if __name__ == "__main__":
    main()
