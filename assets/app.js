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

  // A little animal, drawn as if doodled: the head is a loop that overshoots
  // itself rather than a circle, no stroke quite meets the next, and a
  // little turbulence roughens every edge so it reads as pencil rather than
  // as vector. Every animal shares one body, standing with its arms up and
  // then tucked into a ball for the cannonball, and differs only in the
  // face drawn on the head. Clicks take turns through the list.
  function ink(id) {
    return '<defs><filter id="' + id + '" x="-30%" y="-30%" width="160%" height="160%">' +
        '<feTurbulence type="fractalNoise" baseFrequency=".07" numOctaves="2" seed="4" result="n"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter></defs>' +
      '<g fill="none" stroke="currentColor" stroke-width="2.2" ' +
         'stroke-linecap="round" stroke-linejoin="round" filter="url(#' + id + ')">';
  }

  // The head loop, in the standing figure's coordinates. The tucked and
  // floating figures carry it 2.2 lower.
  var HEAD =
    '<path d="M26.6 6.4 C22.4 2.3 14.2 3.6 12.6 9 C11.1 14 15.4 18.8 20.6 18.4 ' +
             'C25.8 18 28.9 12.6 27 8 C26.8 7.6 26.6 7.2 26.3 6.8" stroke-width="2.1"/>';

  var EYES =
    '<path d="M17.3 10.4 L17.4 10.5" stroke-width="3"/>' +
    '<path d="M22.9 10.2 L23 10.3" stroke-width="3"/>';

  var FACES = {
    bear:
      '<path d="M13.6 6.4 C12.2 3.4 14.8 1.2 17.2 3.4"/>' +
      '<path d="M23.4 3.2 C25.8 1 28.6 3.2 27.2 6.2"/>' + EYES +
      '<path d="M19.3 13.1 C20 12.3 21 12.4 21.4 13.2 C20.9 13.8 19.8 13.8 19.3 13.1" stroke-width="1.8"/>' +
      '<path d="M18.4 15.4 C19.3 16.5 21.1 16.5 22 15.4" stroke-width="1.8"/>',
    cat:
      '<path d="M13.4 7.4 C12.6 5.2 12.2 3.2 12.6 1.4 C14.4 2.2 16 3.2 17.4 4.4"/>' +
      '<path d="M26.6 7.2 C27.4 5 27.8 3 27.4 1.2 C25.6 2 24 3 22.6 4.2"/>' + EYES +
      '<path d="M19.3 12.9 L20.7 12.9 L20 13.9 L19.3 12.9" stroke-width="1.6"/>' +
      '<path d="M20 13.9 C19.7 15 18.8 15.4 17.9 15" stroke-width="1.6"/>' +
      '<path d="M20 13.9 C20.3 15 21.2 15.4 22.1 15" stroke-width="1.6"/>' +
      '<path d="M9.4 12.4 L14 13" stroke-width="1.4"/>' +
      '<path d="M9.8 15 L14.2 14.2" stroke-width="1.4"/>' +
      '<path d="M30.6 12.4 L26 13" stroke-width="1.4"/>' +
      '<path d="M30.2 15 L25.8 14.2" stroke-width="1.4"/>',
    rabbit:
      '<path d="M15.4 4.8 C13.6 .8 13.4 -3 15.6 -4.2 C17.6 -5 18.8 -1.2 18.4 3.4"/>' +
      '<path d="M24.6 4.8 C26.4 .8 26.6 -3 24.4 -4.2 C22.4 -5 21.2 -1.2 21.6 3.4"/>' + EYES +
      '<path d="M19.3 12.7 C19.7 12.1 20.5 12.1 20.8 12.8" stroke-width="1.8"/>' +
      '<path d="M18 14.4 C19.2 15.6 20.8 15.6 22 14.4" stroke-width="1.6"/>' +
      '<path d="M19.2 15.4 L19.2 17" stroke-width="1.6"/>' +
      '<path d="M20.8 15.4 L20.8 17" stroke-width="1.6"/>',
    frog:
      '<path d="M13.2 7 C12.4 3.6 16 1.8 17.6 4.8" stroke-width="2"/>' +
      '<path d="M26.8 7 C27.6 3.6 24 1.8 22.4 4.8" stroke-width="2"/>' +
      '<path d="M15.3 5.2 L15.4 5.3" stroke-width="2.8"/>' +
      '<path d="M24.7 5.2 L24.8 5.3" stroke-width="2.8"/>' +
      '<path d="M14.6 12.8 C17 16.2 23 16.2 25.4 12.8" stroke-width="1.9"/>',
    duck:
      '<path d="M19 3.4 C19.4 1.4 20.8 .4 22.4 1.2" stroke-width="1.8"/>' + EYES +
      '<path d="M15.6 13.4 C17 11.6 23 11.6 24.4 13.4 C23 15.4 17 15.4 15.6 13.4" stroke-width="1.8"/>' +
      '<path d="M16.4 13.5 L23.6 13.5" stroke-width="1.3"/>'
  };

  var ANIMALS = ["bear", "cat", "rabbit", "frog", "duck"];
  var turn = 0;

  var BODY_STAND =
    '<path d="M15.4 19.4 C12.4 23.6 12.2 30.6 14.2 35.6 C16 40.2 24.2 40.2 25.9 35.6 C27.8 30.6 27.6 23.6 24.6 19.4"/>' +
    '<path d="M14.6 22.4 C11.2 19.6 9.2 16.2 8.2 12.2" stroke-width="2.3"/>' +
    '<path d="M25.4 22.4 C28.8 19.6 30.8 16.2 31.8 12.2" stroke-width="2.3"/>' +
    '<path d="M12.6 41.2 C13.6 39.6 16.6 39.6 17.8 41.4 C16.4 42.6 13.8 42.6 12.6 41.2" stroke-width="2"/>' +
    '<path d="M22.2 41.4 C23.4 39.6 26.4 39.6 27.4 41.2 C26.2 42.6 23.6 42.6 22.2 41.4" stroke-width="2"/>';

  var BODY_TUCK =
    '<path d="M15.2 20.8 C10.4 23.6 9 30 12.4 34.8 C16 39.8 24.4 40 28 35.4 C31.4 31 30.2 24.4 25.6 21.2"/>' +
    '<path d="M14.4 24.6 C15.6 29.6 20.2 31.8 25.6 30.6" stroke-width="2.3"/>' +
    '<path d="M25.8 23.4 C26.4 26.4 25.4 29 23.4 30.6" stroke-width="2.3"/>' +
    '<path d="M17.6 35.4 C18.8 33.4 21.8 33.6 22.6 35.8 C21.2 37.2 18.6 37 17.6 35.4" stroke-width="2"/>' +
    '<path d="M23.6 33.6 C25 31.8 27.8 32.4 28.2 34.6 C26.8 35.8 24.4 35.4 23.6 33.6" stroke-width="2"/>';

  // Afterwards it bobs in the water: head and shoulders over its own wave.
  var BODY_FLOAT =
    '<path d="M13.6 19.8 C11.2 20.8 8.8 22 6.6 23.6" stroke-width="2.3"/>' +
    '<path d="M26.4 19.8 C28.8 20.8 31.2 22 33.4 23.6" stroke-width="2.3"/>' +
    '<path d="M1.5 25.4 C4.5 21.8 7.5 21.8 10.5 25.2 C13.5 28.6 16.5 28.6 19.5 25.2 ' +
             'C22.5 21.8 25.5 21.8 28.5 25.2 C31.5 28.6 34.5 28.6 37.5 25.4"/>';

  function drawing(cls, box, width, height, id, strokes) {
    return '<svg class="' + cls + '" viewBox="' + box + '" width="' + width + '" height="' + height + '" aria-hidden="true">' +
      ink(id) + strokes + '</g></svg>';
  }

  function head(kind, lower) {
    var face = HEAD + FACES[kind];
    return lower ? '<g transform="translate(0 2.2)">' + face + '</g>' : face;
  }

  function jumper(kind) {
    return drawing("stand", "0 0 40 44", 44, 48, "sketch", head(kind, false) + BODY_STAND) +
           drawing("tuck", "0 0 40 44", 44, 48, "sketch", head(kind, true) + BODY_TUCK);
  }

  function floater(kind) {
    return drawing("float", "0 0 40 30", 44, 33, "sketch", head(kind, true) + BODY_FLOAT);
  }

  // The water the bear lands in: a wavy line that draws itself outward
  // from the point of impact, in two halves so it spreads both ways at once.
  var WATER =
    '<svg viewBox="0 0 96 18" aria-hidden="true">' + ink("sketch-water") +
      '<path pathLength="100" d="M48 9 C44.4 4.4 41 4.1 37.6 8.4 C34.2 12.7 30.8 12.9 27.4 8.9 C24 4.9 20.6 4.6 17.2 8.6 C13.8 12.6 10.4 12.8 7 8.8 C5.4 6.9 3.8 6.6 2.4 8.2"/>' +
      '<path pathLength="100" d="M48 9 C51.5 13.6 54.9 13.7 58.3 9.3 C61.7 4.9 65.1 4.8 68.5 8.8 C71.9 12.8 75.3 13 78.7 9.1 C82.1 5.2 85.5 5.1 88.9 9 C90.6 11 92.2 11.2 93.6 9.6"/>' +
    '</g></svg>';

  // The splash: seven short strokes that fly up and out of the landing.
  var FLICKS =
    '<svg viewBox="0 0 120 55" aria-hidden="true">' + ink("sketch-flicks") +
      '<path d="M49 50 C46 40 44.6 30 46.4 19"/>' +
      '<path d="M38 51 C31.6 44 26.4 37 21.4 29"/>' +
      '<path d="M26 52 C18.8 48.2 12.6 44 6.4 38.8"/>' +
      '<path d="M71 50 C74 40 75.4 30 73.6 19"/>' +
      '<path d="M82 51 C88.4 44 93.6 37 98.6 29"/>' +
      '<path d="M94 52 C101.2 48.2 107.4 44 113.6 38.8"/>' +
      '<path d="M60 48 C59.6 39 60.2 30 60.8 22"/>' +
    '</g></svg>';

  // The clearing the pointer opens in the colour. Its centre and radius are
  // both eased a frame at a time, which is what makes it trail the cursor
  // instead of snapping to it.
  var HOLE = 130;      // px: radius a clearing starts from
  var LIFE = 2300;     // ms a clearing takes to open out and go
  var SEED = 70;       // ms between clearings while the pointer is down here
  var STEP = 22;       // px of travel that also earns one
  var FROM = 0.40;     // it opens from this share of HOLE
  var TO = 1.85;       // out to this one

  // The attractor points. Each wanders a slow Lissajous path, which stays
  // smooth and bounded without any edge handling. One clock drives all
  // five, and scrolling winds that clock forward: at rest it runs at 1,
  // and a fast scroll takes it up to about ten times that before decaying.
  var RUSH = 8;        // how much faster the field moves at full scroll
  var CALM = 2.4;      // how quickly the rush bleeds off, per second
  var points = [];
  var drift = 0;       // the clock the paths are read from
  var rush = 0;

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
  var canvas = null;
  var ctx = null;
  var sprite = null;
  var grain = 1;       // canvas pixels per css pixel
  var last = { x: 0, y: 0, going: false, sown: 0 };
  var marks = [];
  var frame = null;
  var running = false;
  var clock = null;
  var typeWatch = null;

  // One clearing, drawn once at a good size and then scaled. Its edge runs
  // through several stops rather than two, so it reads as a value falling
  // off through a ramp rather than a disc with a blurred rim.
  var RAMP = [
    [0.00, 0.92], [0.22, 0.86], [0.40, 0.70],
    [0.58, 0.46], [0.74, 0.25], [0.88, 0.09], [1.00, 0]
  ];

  function cut() {
    var size = Math.ceil(HOLE * 2 * grain * TO);
    sprite = document.createElement("canvas");
    sprite.width = sprite.height = size;
    var edge = sprite.getContext("2d");
    var mid = size / 2;
    var glow = edge.createRadialGradient(mid, mid, 0, mid, mid, mid);
    RAMP.forEach(function (stop) {
      glow.addColorStop(stop[0], "rgba(255,255,255," + stop[1] + ")");
    });
    edge.fillStyle = glow;
    edge.fillRect(0, 0, size, size);
  }

  function fit() {
    if (!canvas) return;
    grain = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(window.innerWidth * grain);
    canvas.height = Math.round(window.innerHeight * grain);
    cut();
    last.going = false;
    marks.length = 0;
  }

  // Each clearing is kept rather than burned into the canvas, because it has
  // to keep opening out after it is made. The canvas is redrawn each frame
  // from the ones still alive.
  function sow(now) {
    if (!last.going) return;

    var dx = held.x - last.x;
    var dy = held.y - last.y;
    var far = Math.sqrt(dx * dx + dy * dy);
    if (now - last.sown < SEED && far < STEP) return;

    // Space them along the way the pointer came, so a quick sweep opens a
    // ribbon rather than a row of dots.
    var hops = Math.max(1, Math.min(Math.round(far / STEP), 12));
    for (var i = 1; i <= hops; i++) {
      marks.push({
        x: last.x + dx * (i / hops),
        y: last.y + dy * (i / hops),
        born: now - (hops - i) * 12   // the earliest is furthest along
      });
    }
    last.x = held.x;
    last.y = held.y;
    last.sown = now;
    if (marks.length > 90) marks.splice(0, marks.length - 90);
  }

  function paint(now) {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var alive = 0;
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      var age = (now - m.born) / LIFE;
      if (age >= 1) continue;
      marks[alive++] = m;

      // Opens out as it goes, and thins as it opens.
      var span = HOLE * (FROM + (TO - FROM) * age) * grain;
      var left = 1 - age;
      ctx.globalAlpha = left * left;
      ctx.drawImage(sprite, m.x * grain - span, m.y * grain - span, span * 2, span * 2);
    }
    marks.length = alive;
    ctx.globalAlpha = 1;
  }

  function plot() {
    points = [].map.call(document.querySelectorAll(".blob"), function (el, i) {
      return {
        el: el,
        ax: 0.34 + i * 0.04,             // how far it ranges, as a share of
        ay: 0.30 + ((i * 7) % 5) * 0.025, // the viewport
        fx: 0.125 + i * 0.024,           // and how fast, in radians a second
        fy: 0.094 + ((i * 3) % 5) * 0.019,
        px: i * 1.7,
        py: i * 2.9 + 1.1
      };
    });
  }

  function place() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    for (var i = 0; i < points.length; i++) {
      var pt = points[i];
      var x = Math.sin(drift * pt.fx + pt.px) * pt.ax * w;
      var y = Math.sin(drift * pt.fy + pt.py) * pt.ay * h;
      pt.el.style.translate = x.toFixed(1) + "px " + y.toFixed(1) + "px";
    }
  }

  function onScroll() {
    var y = window.scrollY;
    rush = Math.min(rush + Math.abs(y - (onScroll.was || 0)) * 0.05, RUSH);
    onScroll.was = y;
    scatterSoon();
  }

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
      var blend = [0, 0, 0];
      a.set.forEach(function (colour, n) {
        var now = mix(colour, b.set[n], t);
        root.style.setProperty("--c" + (n + 1), now);
        for (var c = 0; c < 3; c++) {
          blend[c] += parseInt(now.substr(1 + c * 2, 2), 16) / a.set.length;
        }
      });
      // The field sits on the average of the five, so it is colour to the
      // edges instead of blobs floating on white.
      root.style.setProperty("--base", "rgb(" + blend.map(Math.round).join(",") + ")");
      return;
    }
  }

  function step(now) {
    var gap = Math.min((now - (step.beat || now)) / 1000, 0.05);
    step.beat = now;

    drift += gap * (1 + rush);
    rush -= rush * CALM * gap;
    if (rush < 0.01) rush = 0;
    place();
    sow(now);
    paint(now);

    frame = requestAnimationFrame(step);
  }

  function wake() {
    if (motion.matches) return;   // the field holds still; nothing to run
    if (running && frame === null) {
      step.beat = 0;
      frame = requestAnimationFrame(step);
    }
  }

  function onPointerMove(event) {
    held.x = event.clientX;
    held.y = event.clientY;
    if (!last.going) {
      last.x = held.x;
      last.y = held.y;
      last.going = true;
    }
    scatterSoon();
    wake();
  }

  function onPointerOut(event) {
    if (event.relatedTarget === null) {   // actually left the window
      last.going = false;                 // stop cutting; the trail closes over
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

  // Children animate too, and their animationend bubbles, so only the
  // element's own last animation is allowed to take it away.
  function sink(el) {
    el.addEventListener("animationend", function (e) {
      if (e.target === el) el.remove();
    });
    document.body.appendChild(el);
  }

  // Where the animals end up. Each one surfaces along the bottom of the
  // window and takes the next place in the row; when the row is full the
  // first to arrive slips away and the rest shuffle along.
  var SLOT = 54;       // px from one animal to the next
  var EDGE = 14;       // px in from the left
  var swimmers = [];
  var surfacing = [];  // timers for animals still under water

  function surface(kind) {
    if (!running) return;
    var el = document.createElement("span");
    el.className = "swimmer";
    el.innerHTML = floater(kind);
    el.style.setProperty("--bob-delay", (-Math.random() * 3.2).toFixed(2) + "s");
    el.style.setProperty("--bob-time", (2.8 + Math.random() * 1.2).toFixed(2) + "s");
    el.style.left = (EDGE + swimmers.length * SLOT) + "px";
    swimmers.push(el);
    document.body.appendChild(el);
    lineUp();
  }

  function lineUp() {
    var fit = Math.max(1, Math.floor((window.innerWidth - EDGE * 2) / SLOT));
    while (swimmers.length > fit) {
      var gone = swimmers.shift();
      gone.classList.add("gone");
      window.setTimeout(function () { gone.remove(); }, 600);
    }
    swimmers.forEach(function (el, i) {
      el.style.left = (EDGE + i * SLOT) + "px";
    });
  }

  function clearRow() {
    surfacing.forEach(window.clearTimeout);
    surfacing = [];
    swimmers.forEach(function (el) { el.remove(); });
    swimmers = [];
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
    var kind = ANIMALS[turn++ % ANIMALS.length];
    diver.innerHTML = "<i>" + jumper(kind) + "</i>";
    sink(diver);
    surfacing.push(window.setTimeout(function () { surface(kind); }, 1500));

    var water = document.createElement("span");
    water.className = "splash";
    water.style.left = landX + "px";
    water.style.top = landY + "px";
    water.innerHTML = WATER;
    sink(water);

    var flicks = document.createElement("span");
    flicks.className = "flicks";
    flicks.style.left = landX + "px";
    flicks.style.top = landY + "px";
    flicks.innerHTML = FLICKS;
    sink(flicks);

    for (var i = 0; i < 7; i++) {
      var drop = document.createElement("span");
      drop.className = "drop";
      drop.style.left = landX + "px";
      drop.style.top = landY + "px";
      drop.style.setProperty("--ddx", ((i - 3) * 14 + (Math.random() - 0.5) * 12).toFixed(0) + "px");
      drop.style.setProperty("--ddup", (-30 - Math.random() * 36 - (3 - Math.abs(i - 3)) * 8).toFixed(0) + "px");
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
      plot();
      canvas = document.querySelector(".trail");
      ctx = canvas ? canvas.getContext("2d") : null;
      fit();
      place();   // put them somewhere sensible even if the loop never runs
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", fit);
      window.addEventListener("resize", lineUp);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerout", onPointerOut, { passive: true });
      if (!motion.matches) {
        shatter();
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
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", fit);
      window.removeEventListener("resize", lineUp);
      clearRow();
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      marks.length = 0;
      canvas = ctx = sprite = null;
      last.going = false;
      window.removeEventListener("resize", remeasure);
      if (typeWatch) { typeWatch.disconnect(); typeWatch = null; }
      mend();
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      rush = 0;
      points.forEach(function (pt) { pt.el.style.removeProperty("translate"); });
      points = [];
      [].forEach.call(document.querySelectorAll(".diver, .splash, .flicks, .drop"),
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
