// Theme and typeface switches. Preferences persist in localStorage.
// The initial values are already applied by the inline script in <head>,
// so this file only handles clicks and keeps the buttons in sync.

(function () {
  var root = document.documentElement;

  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }

  // --- Fun mode ----------------------------------------------------------
  // The backdrop itself is drawn in CSS from --mx / --my. All we do here is
  // ease those two numbers toward the pointer a frame at a time, so the
  // colour trails the cursor instead of snapping to it. The loop parks
  // itself once it has caught up, and a pointer move wakes it again.

  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var point = { x: 50, y: 50, atX: 50, atY: 50 };
  var frame = null;
  var running = false;

  function step() {
    var dx = point.x - point.atX;
    var dy = point.y - point.atY;
    point.atX += dx * 0.06;
    point.atY += dy * 0.06;
    root.style.setProperty("--mx", point.atX.toFixed(2) + "%");
    root.style.setProperty("--my", point.atY.toFixed(2) + "%");

    if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
      frame = null;   // caught up; idle until the pointer moves again
      return;
    }
    frame = requestAnimationFrame(step);
  }

  function wake() {
    if (running && frame === null) frame = requestAnimationFrame(step);
  }

  function onPointerMove(event) {
    point.x = (event.clientX / window.innerWidth) * 100;
    point.y = (event.clientY / window.innerHeight) * 100;
    wake();
  }

  function syncFun() {
    var wanted = root.getAttribute("data-theme") === "fun" && !motion.matches;
    if (wanted === running) return;
    running = wanted;

    if (running) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      wake();
    } else {
      window.removeEventListener("pointermove", onPointerMove);
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      root.style.removeProperty("--mx");
      root.style.removeProperty("--my");
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
