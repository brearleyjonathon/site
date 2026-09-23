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

  // The clearing the pointer opens in the colour. Its centre and radius are
  // both eased a frame at a time, which is what makes it trail the cursor
  // instead of snapping to it.
  var HOLE = 190;      // px: radius of the clearing once it is fully open
  var EASE = 0.12;

  // The words scatter out of the pointer's way. Each is wrapped in a span
  // only while Fun is on, and put back when it is off. Words rather than
  // letters: a span per letter makes some screen readers spell the page out.
  var BLAST = 118;     // px: how close the pointer has to be to move a word
  var SHOVE = 34;      // px: how far the nearest word is pushed
  var shards = [];
  var page = null;
  var queued = false;
  var held = { x: -9999, y: -9999 };

  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var point = { x: 50, y: 50, atX: 50, atY: 50, open: 1, want: 1 };
  var frame = null;
  var running = false;
  var clock = null;
  var typeWatch = null;

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

  function step() {
    point.atX += (point.x - point.atX) * EASE;
    point.atY += (point.y - point.atY) * EASE;
    point.open += (point.want - point.open) * EASE;

    root.style.setProperty("--mx", point.atX.toFixed(2) + "%");
    root.style.setProperty("--my", point.atY.toFixed(2) + "%");
    root.style.setProperty("--hole", point.open.toFixed(1) + "px");

    if (Math.abs(point.x - point.atX) < 0.04 &&
        Math.abs(point.y - point.atY) < 0.04 &&
        Math.abs(point.want - point.open) < 0.4) {
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
    point.want = HOLE;
    held.x = event.clientX;
    held.y = event.clientY;
    scatterSoon();
    wake();
  }

  function onPointerOut(event) {
    if (event.relatedTarget === null) {   // actually left the window
      point.want = 1;                     // the colour closes back over
      held.x = held.y = -9999;            // and the words fall back in line
      scatterSoon();
      wake();
    }
  }

  // --- Words ---------------------------------------------------------------

  function shatter() {
    if (shards.length) return;
    page = document.querySelector("main");
    if (!page) return;

    var walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT, null);
    var texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);

    texts.forEach(function (node) {
      if (!/\S/.test(node.nodeValue)) return;
      var frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach(function (bit) {
        if (!bit) return;
        if (!/\S/.test(bit)) {
          frag.appendChild(document.createTextNode(bit));
          return;
        }
        var word = document.createElement("span");
        word.className = "shard";
        word.textContent = bit;
        frag.appendChild(word);
      });
      node.parentNode.replaceChild(frag, node);
    });

    shards = [].map.call(page.querySelectorAll(".shard"), function (el) {
      // A little variation per word, so they do not all fly out evenly.
      return { el: el, x: 0, y: 0, moved: false,
               force: 0.65 + Math.random() * 0.7,
               skew: (Math.random() - 0.5) * 0.9 };
    });
    measure();
  }

  function mend() {
    shards.forEach(function (sh) {
      sh.el.replaceWith(document.createTextNode(sh.el.textContent));
    });
    shards = [];
    if (page) page.normalize();   // stitch the text nodes back together
  }

  // Positions are taken once, in page coordinates, while nothing is pushed
  // aside. Reading them every frame would be both slow and wrong, since a
  // word's box already includes wherever we last shoved it.
  function measure() {
    var sx = window.scrollX, sy = window.scrollY;
    shards.forEach(function (sh) {
      if (sh.moved) {
        sh.el.style.removeProperty("left");
        sh.el.style.removeProperty("top");
        sh.moved = false;
      }
      var r = sh.el.getBoundingClientRect();
      sh.x = r.left + r.width / 2 + sx;
      sh.y = r.top + r.height / 2 + sy;
    });
  }

  function scatter() {
    var cx = held.x + window.scrollX;
    var cy = held.y + window.scrollY;
    var reach = BLAST * BLAST;

    for (var i = 0; i < shards.length; i++) {
      var sh = shards[i];
      var dx = sh.x - cx;
      var dy = sh.y - cy;
      var gap = dx * dx + dy * dy;

      if (gap < reach) {
        var far = Math.sqrt(gap) || 1;
        var force = 1 - far / BLAST;
        var by = force * force * SHOVE * sh.force;
        // Skew the direction a little so the words scatter rather than
        // radiating out in a tidy circle.
        var ax = dx / far, ay = dy / far;
        sh.el.style.left = ((ax - ay * sh.skew) * by).toFixed(1) + "px";
        sh.el.style.top = ((ay + ax * sh.skew) * by).toFixed(1) + "px";
        sh.moved = true;
      } else if (sh.moved) {
        sh.el.style.removeProperty("left");
        sh.el.style.removeProperty("top");
        sh.moved = false;
      }
    }
  }

  function scatterSoon() {
    if (queued || !shards.length) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      scatter();
    });
  }

  var settling = null;
  function remeasure() {
    window.clearTimeout(settling);
    settling = window.setTimeout(function () {
      if (shards.length) { measure(); scatter(); }
    }, 160);
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
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerout", onPointerOut, { passive: true });
      if (!motion.matches) {
        shatter();
        window.addEventListener("scroll", scatterSoon, { passive: true });
        window.addEventListener("resize", remeasure);
        // The typeface switch changes every word's box, so take them again.
        typeWatch = new MutationObserver(remeasure);
        typeWatch.observe(root, { attributes: true, attributeFilter: ["data-font"] });
      }
      wake();
    } else {
      window.clearInterval(clock);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("scroll", scatterSoon);
      window.removeEventListener("resize", remeasure);
      if (typeWatch) { typeWatch.disconnect(); typeWatch = null; }
      mend();
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      point.open = point.want = 1;
      ["--mx", "--my", "--hole"].forEach(function (name) {
        root.style.removeProperty(name);
      });
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
