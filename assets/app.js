// Theme and typeface switches. Preferences persist in localStorage.
// The initial values are already applied by the inline script in <head>,
// so this file only handles clicks and keeps the buttons in sync.

(function () {
  var root = document.documentElement;

  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }

  // --- Fun mode ----------------------------------------------------------
  // The background is left to itself: five blobs drifting on CSS animations,
  // in colours mixed from the time of day. The only thing that answers the
  // visitor is the click, which sends a small figure off the pointer, into
  // the page and under.

  // Anchors through the day. Between them the colours are mixed by the
  // hour, so the page warms up and cools down rather than jumping.
  var HOURS = [
    { at: 3,  set: ["#5566cc", "#3f8fb0", "#6f57bd", "#4a74d6", "#8460c8"] },
    { at: 8,  set: ["#ff7a8a", "#ffb36b", "#ffd166", "#f78fb3", "#8fc9bd"] },
    { at: 13, set: ["#ff2d55", "#ffb300", "#00c853", "#2979ff", "#aa00ff"] },
    { at: 19, set: ["#ff5c7a", "#ff8a3d", "#d94fd0", "#8a5cff", "#ff4f9a"] }
  ];

  var FIGURE =
    '<svg viewBox="0 0 24 34" width="26" height="37" aria-hidden="true">' +
      '<circle cx="12" cy="6" r="3.6" fill="currentColor"/>' +
      '<path d="M12 10.5 V23 M12 13 L5.5 7.5 M12 13 L18.5 7.5 ' +
              'M12 23 L8.4 32 M12 23 L15.6 32" ' +
            'fill="none" stroke="currentColor" stroke-width="2.2" ' +
            'stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var running = false;
  var clock = null;

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
      a.set.forEach(function (colour, n) {
        root.style.setProperty("--c" + (n + 1), mix(colour, b.set[n], t));
      });
      return;
    }
  }

  function sink(el) {
    el.addEventListener("animationend", function () { el.remove(); });
    document.body.appendChild(el);
  }

  function dive(event) {
    if (root.getAttribute("data-theme") !== "fun" || motion.matches) return;
    if (event.target.closest("[data-set-theme], [data-set-font], a")) return;

    var across = (Math.random() < 0.5 ? -1 : 1) * (42 + Math.random() * 52);
    var down = 150 + Math.random() * 70;
    var landX = event.clientX + across;
    var landY = event.clientY + down;

    var diver = document.createElement("span");
    diver.className = "diver";
    diver.style.left = event.clientX + "px";
    diver.style.top = event.clientY + "px";
    diver.style.setProperty("--dx", across.toFixed(0) + "px");
    diver.style.setProperty("--dy", down.toFixed(0) + "px");
    diver.innerHTML = "<i>" + FIGURE + "</i>";
    sink(diver);

    var ring = document.createElement("span");
    ring.className = "splash";
    ring.style.left = landX + "px";
    ring.style.top = landY + "px";
    sink(ring);

    for (var i = 0; i < 5; i++) {
      var drop = document.createElement("span");
      drop.className = "drop";
      drop.style.left = landX + "px";
      drop.style.top = landY + "px";
      drop.style.setProperty("--ddx", ((i - 2) * 11 + (Math.random() - 0.5) * 12).toFixed(0) + "px");
      drop.style.setProperty("--ddup", (-20 - Math.random() * 22).toFixed(0) + "px");
      drop.style.animationDelay = (0.9 + Math.random() * 0.06).toFixed(2) + "s";
      sink(drop);
    }
  }

  document.addEventListener("click", dive);

  function syncFun() {
    var wanted = root.getAttribute("data-theme") === "fun";
    if (wanted === running) return;
    running = wanted;

    if (running) {
      paintClock();
      clock = window.setInterval(paintClock, 240000);   // keep up with the hour
    } else {
      window.clearInterval(clock);
      [].forEach.call(document.querySelectorAll(".diver, .splash, .drop"),
        function (el) { el.remove(); });
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
