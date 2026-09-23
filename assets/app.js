// Theme and typeface switches. Preferences persist in localStorage.
// The initial values are already applied by the inline script in <head>,
// so this file only handles clicks and keeps the buttons in sync.

(function () {
  var root = document.documentElement;

  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }

  // --- Fun mode ----------------------------------------------------------
  // The blobs drift on their own in CSS, through `transform`. Here we only
  // shove them away from the pointer, through the separate `translate`
  // property, so the two motions compose without fighting.
  //
  // A blob's own rect already includes the shove we applied last frame, so
  // we subtract it back off to get where the blob would be standing
  // undisturbed. Measuring from there is what keeps it from chasing itself.

  var REACH = 430;      // px: how close the pointer has to be to matter
  var SHOVE = 260;      // px: how far a blob is pushed at point-blank range
  var EASE = 0.09;

  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var cursor = { x: 0, y: 0, here: false };
  var blobs = [];
  var frame = null;
  var running = false;

  function collect() {
    blobs = [].map.call(document.querySelectorAll(".blob"), function (el) {
      return { el: el, x: 0, y: 0, toX: 0, toY: 0 };
    });
  }

  function aim() {
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      if (!cursor.here) { b.toX = b.toY = 0; continue; }

      var r = b.el.getBoundingClientRect();
      var dx = r.left + r.width / 2 - b.x - cursor.x;
      var dy = r.top + r.height / 2 - b.y - cursor.y;
      var away = Math.sqrt(dx * dx + dy * dy) || 1;
      var near = Math.max(0, 1 - away / REACH);
      var by = near * near * SHOVE;   // falls off fast, so only close blobs move

      b.toX = (dx / away) * by;
      b.toY = (dy / away) * by;
    }
  }

  function step() {
    aim();

    var settled = true;
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      b.x += (b.toX - b.x) * EASE;
      b.y += (b.toY - b.y) * EASE;
      b.el.style.translate = b.x.toFixed(1) + "px " + b.y.toFixed(1) + "px";
      if (Math.abs(b.toX - b.x) > 0.3 || Math.abs(b.toY - b.y) > 0.3) settled = false;
    }

    // While the pointer is on the page the blobs keep drifting under it, so
    // the loop has to keep looking. Once it leaves, we only run long enough
    // for everything to slide back.
    if (settled && !cursor.here) {
      frame = null;
      return;
    }
    frame = requestAnimationFrame(step);
  }

  function wake() {
    if (running && frame === null) frame = requestAnimationFrame(step);
  }

  function onPointerMove(event) {
    cursor.x = event.clientX;
    cursor.y = event.clientY;
    cursor.here = true;
    wake();
  }

  function onPointerOut(event) {
    if (event.relatedTarget === null) {   // actually left the window
      cursor.here = false;
      wake();
    }
  }

  function syncFun() {
    var wanted = root.getAttribute("data-theme") === "fun" && !motion.matches;
    if (wanted === running) return;
    running = wanted;

    if (running) {
      collect();
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerout", onPointerOut, { passive: true });
      wake();
    } else {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerOut);
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      cursor.here = false;
      blobs.forEach(function (b) { b.el.style.removeProperty("translate"); });
    }
  }

  function sync() {
    var theme = root.getAttribute("data-theme");
    var font = root.getAttribute("data-font");
    document.querySelectorAll("[data-set-theme]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.setTheme === theme));
    });
    document.querySelectorAll("[data-set-font]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.setFont === font));
    });
    syncFun();
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-set-theme], [data-set-font]");
    if (!button) return;

    if (button.dataset.setTheme) {
      root.setAttribute("data-theme", button.dataset.setTheme);
      save("theme", button.dataset.setTheme);
    } else {
      root.setAttribute("data-font", button.dataset.setFont);
      save("font", button.dataset.setFont);
    }
    sync();
  });

  // Follow the OS only while the visitor has not made their own choice.
  if (motion.addEventListener) motion.addEventListener("change", syncFun);

  var media = window.matchMedia("(prefers-color-scheme: dark)");
  var onSystemChange = function (event) {
    var chosen = null;
    try { chosen = localStorage.getItem("theme"); } catch (e) {}
    if (chosen) return;
    root.setAttribute("data-theme", event.matches ? "dark" : "light");
    sync();
  };
  if (media.addEventListener) media.addEventListener("change", onSystemChange);
  else if (media.addListener) media.addListener(onSystemChange);

  sync();

  // Enable colour transitions only after the first paint.
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { document.body.classList.add("ready"); });
  });
})();
