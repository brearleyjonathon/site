// Theme and typeface switches. Preferences persist in localStorage.
// The initial values are already applied by the inline script in <head>,
// so this file only handles clicks and keeps the buttons in sync.

(function () {
  var root = document.documentElement;

  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }

  // --- Fun mode ----------------------------------------------------------
  // A small thermal model. The pointer is a heat source: blobs near it warm
  // up, and warm blobs swell and rise, because that is what warm air does.
  // Heat bleeds away on its own, so they sink back once you move on. Leave
  // the page alone and everything drifts toward the middle and evens out,
  // which is what equilibrium looks like.
  //
  // The blobs also drift on their own through CSS `transform`. We only ever
  // write the separate `translate` and `scale` properties, so the two
  // motions compose and neither has to know about the other.

  var REACH = 300;        // px: how close the pointer has to be to warm a blob
  var GAIN = 2.6;         // heat picked up per second at point-blank range
  var COOL = 0.55;        // share of a blob's heat lost per second
  var LIFT = 125;         // px a fully warm blob rises
  var SWELL = 0.04;       // how much a fully warm blob widens
  var STRETCH = 0.30;     // how much it draws itself out as it rises
  var SWAY = 30;          // px it wanders sideways on the way up
  var SPRING = 40;        // pull toward where it wants to be
  var DRAG = 8.5;         // damping, a little under critical, so it overshoots
  var SETTLE = 0.34;      // how far toward the middle they drift once calm
  var CALM_AFTER = 1200;  // ms of stillness before they start settling
  var CALM_OVER = 4500;   // ms from there to full equilibrium
  var PLUME_EVERY = 250;  // ms between puffs while the pointer lingers
  var PLUME_MAX = 20;

  // Anchors through the day. Between them the colours are mixed by the
  // hour, so the page warms up and cools down rather than jumping.
  var HOURS = [
    { at: 3,  set: ["#5566cc", "#3f8fb0", "#6f57bd", "#4a74d6", "#8460c8"] },
    { at: 8,  set: ["#ff7a8a", "#ffb36b", "#ffd166", "#f78fb3", "#8fc9bd"] },
    { at: 13, set: ["#ff2d55", "#ffb300", "#00c853", "#2979ff", "#aa00ff"] },
    { at: 19, set: ["#ff5c7a", "#ff8a3d", "#d94fd0", "#8a5cff", "#ff4f9a"] }
  ];

  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var cursor = { x: 0, y: 0, here: false, plumeX: 0, plumeY: 0 };
  var blobs = [];
  var field = null;
  var colours = HOURS[2].set;
  var frame = null;
  var running = false;
  var clock = null;
  var lastFrame = 0;
  var lastMove = 0;
  var lastPlume = 0;

  function mix(a, b, t) {
    var out = "#";
    for (var i = 1; i < 7; i += 2) {
      var from = parseInt(a.substr(i, 2), 16);
      var to = parseInt(b.substr(i, 2), 16);
      var v = Math.round(from + (to - from) * t).toString(16);
      out += v.length < 2 ? "0" + v : v;
    }
    return out;
  }

  function paintClock() {
    var now = new Date();
    var hour = now.getHours() + now.getMinutes() / 60;

    for (var i = 0; i < HOURS.length; i++) {
      var a = HOURS[i];
      var b = HOURS[(i + 1) % HOURS.length];
      var span = (b.at - a.at + 24) % 24;
      var into = (hour - a.at + 24) % 24;
      if (into >= span) continue;

      var t = into / span;
      colours = a.set.map(function (colour, n) { return mix(colour, b.set[n], t); });
      colours.forEach(function (colour, n) {
        root.style.setProperty("--c" + (n + 1), colour);
      });
      return;
    }
  }

  function puff(now) {
    if (!field || now - lastPlume < PLUME_EVERY) return;
    // Only where the pointer lingers, not along every sweep of it.
    var travelled = Math.hypot(cursor.x - cursor.plumeX, cursor.y - cursor.plumeY);
    if (travelled > 120) {
      cursor.plumeX = cursor.x;
      cursor.plumeY = cursor.y;
      return;
    }
    if (field.querySelectorAll(".plume").length >= PLUME_MAX) return;

    lastPlume = now;
    cursor.plumeX = cursor.x;
    cursor.plumeY = cursor.y;

    var warm = colours[Math.floor(Math.random() * colours.length)];
    var puffEl = document.createElement("span");
    puffEl.className = "plume";
    puffEl.style.left = (cursor.x + (Math.random() - 0.5) * 34) + "px";
    puffEl.style.top = (cursor.y + (Math.random() - 0.5) * 20) + "px";
    puffEl.style.background = "radial-gradient(closest-side, " + warm + ", transparent)";
    // No two puffs rise the same way, so the stream never looks stamped out.
    puffEl.style.setProperty("--drift", ((Math.random() - 0.5) * 120).toFixed(0) + "px");
    puffEl.style.setProperty("--climb", (-170 - Math.random() * 120).toFixed(0) + "px");
    puffEl.style.animationDuration = (2.4 + Math.random() * 1.6).toFixed(2) + "s";
    puffEl.style.width = puffEl.style.height = (5 + Math.random() * 5).toFixed(1) + "rem";
    puffEl.addEventListener("animationend", function () { puffEl.remove(); });
    field.appendChild(puffEl);
  }

  function step(now) {
    var gap = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;

    var still = now - lastMove;
    var calm = Math.max(0, Math.min((still - CALM_AFTER) / CALM_OVER, 1));
    var midX = window.innerWidth / 2;
    var midY = window.innerHeight / 2;
    var resting = calm >= 1;

    // A pointer left sitting there stops counting as a heat source, so the
    // page can actually reach equilibrium rather than being held warm.
    var source = 1 - calm;
    if (cursor.here && source > 0.4) puff(now);

    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      var r = b.el.getBoundingClientRect();
      // Where the blob would be standing with no heat applied. Measuring
      // from here is what stops it chasing its own displacement.
      var cx = r.left + r.width / 2 - b.x;
      var cy = r.top + r.height / 2 - b.y;

      if (cursor.here) {
        var away = Math.hypot(cx - cursor.x, cy - cursor.y);
        var near = Math.max(0, 1 - away / REACH);
        b.heat += near * near * GAIN * gap * source;
      }
      b.heat -= b.heat * COOL * gap;
      if (b.heat > 1) b.heat = 1;
      if (b.heat < 0.0008) b.heat = 0;

      // Warm air does not travel straight up. The sway is widest when the
      // blob is hottest and dies away as it cools.
      var wander = Math.sin(now / 1100 + b.phase) * SWAY * b.heat;
      var toX = (midX - cx) * SETTLE * calm + wander;
      var toY = (midY - cy) * SETTLE * calm - b.heat * LIFT;

      // A spring rather than a straight ease, damped just under critical, so
      // a blob carries past where it was headed and rolls back into place.
      b.vx += (toX - b.x) * SPRING * gap;
      b.vy += (toY - b.y) * SPRING * gap;
      b.vx -= b.vx * DRAG * gap;
      b.vy -= b.vy * DRAG * gap;
      b.x += b.vx * gap;
      b.y += b.vy * gap;

      b.el.style.translate = b.x.toFixed(1) + "px " + b.y.toFixed(1) + "px";
      b.el.style.scale = (1 + b.heat * SWELL).toFixed(3) + " " +
                         (1 + b.heat * STRETCH).toFixed(3);

      if (b.heat > 0 || Math.abs(toX - b.x) > 0.5 || Math.abs(toY - b.y) > 0.5 ||
          Math.abs(b.vx) > 1 || Math.abs(b.vy) > 1) {
        resting = false;
      }
    }

    // Nothing left to change until the pointer moves again.
    if (resting) {
      frame = null;
      return;
    }
    frame = requestAnimationFrame(step);
  }

  function wake() {
    if (!running || frame !== null) return;
    lastFrame = performance.now();
    frame = requestAnimationFrame(step);
  }

  function onPointerMove(event) {
    cursor.x = event.clientX;
    cursor.y = event.clientY;
    cursor.here = true;
    lastMove = performance.now();
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
      field = document.querySelector(".blobs");
      blobs = [].map.call(document.querySelectorAll(".blob"), function (el) {
        return { el: el, x: 0, y: 0, vx: 0, vy: 0, heat: 0, phase: Math.random() * 6.28 };
      });
      paintClock();
      clock = window.setInterval(paintClock, 240000);   // keep up with the hour
      lastMove = performance.now() - CALM_AFTER - CALM_OVER;
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerout", onPointerOut, { passive: true });
      wake();
    } else {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerOut);
      window.clearInterval(clock);
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      cursor.here = false;
      if (field) {
        [].forEach.call(field.querySelectorAll(".plume"), function (el) { el.remove(); });
      }
      blobs.forEach(function (b) {
        b.el.style.removeProperty("translate");
        b.el.style.removeProperty("scale");
      });
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
