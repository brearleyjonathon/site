// Bubble Box: Eat & Watch, drawn live (build.py's render_live).
//
// The axonometric at the top of the page, 01.webp, rebuilt as a model and
// drawn afresh every frame in the drawing's own manner: flat colour, a
// light, a middle and a dark tone by which way a face turns, and a thin
// black line wherever one thing meets another or passes behind it.
//
// The model is traced from the drawing. traced() turns a point on the
// still, at a height, into a point in the model, through the axonometric
// the drawing was made in (VIEW), so from where it starts the live drawing
// lies over the still, and fading one into the other shows the drawing
// waking up. Letters, bubbles, the tube, the boxes and the funnels are
// placed that way; the stacked houses are a pile made to the same outline.
//
// It lives: the bubbles breathe, the tube sways and now and then swallows
// and blows a bubble out of its mouth, a wave runs along the letters, and
// people walk the street. A drag turns it (and it settles back to the
// drawing's view), and a click sets off whatever it lands on. The switch
// under it trades the diagram for the architecture the studio made of it:
// each volume is swept away from the ground up and its structure put in
// its place, and the people who were inside all along can be seen.
//
// Two passes (WebGL 2, nothing else):
//   1. every solid is drawn into three buffers: its colour, the way its
//      surface faces and which thing it is, and its depth.
//   2. one pass over the screen compares each pixel with its neighbours.
//      A different thing, a sharp turn in the surface or a jump in depth
//      makes a line.
// The ground is left clear, so the page shows through, as the paper does
// in the drawing.
(function () {
  "use strict";

  var figure = document.querySelector('.figure.live[data-script$="bubble-box.js"]');
  if (!figure) return;
  var stage = figure.querySelector(".stage");
  var still = stage.querySelector("img");
  var canvas = document.createElement("canvas");
  var gl = canvas.getContext("webgl2", {
    alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true
  });
  if (!gl) return;   // the still stays

  var DEG = Math.PI / 180;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var touch = window.matchMedia("(hover: none) and (pointer: coarse)");

  // --- Vectors and 3x3 matrices (column-major) -----------------------------

  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function length(a) { return Math.sqrt(dot(a, a)); }
  function norm(a) { var l = length(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function mix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  // A spring let go: from 0, past 1 and back, settling on 1.
  function elastic(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return 1 + Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3));
  }

  // One hop: up and down again over d seconds, 0 outside it.
  function hop(t, d) { return t > 0 && t < d ? Math.sin(Math.PI * t / d) : 0; }

  function columns(x, y, z) { return [x[0], x[1], x[2], y[0], y[1], y[2], z[0], z[1], z[2]]; }
  var IDENT = columns([1, 0, 0], [0, 1, 0], [0, 0, 1]);
  var UP = [0, 1, 0];

  function times(a, b) {
    var o = new Array(9);
    for (var c = 0; c < 3; c++) {
      for (var r = 0; r < 3; r++) {
        o[c * 3 + r] = a[r] * b[c * 3] + a[3 + r] * b[c * 3 + 1] + a[6 + r] * b[c * 3 + 2];
      }
    }
    return o;
  }

  function apply(m, v) {
    return [m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
            m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
            m[2] * v[0] + m[5] * v[1] + m[8] * v[2]];
  }

  function turn(axis, angle) {
    var a = norm(axis), x = a[0], y = a[1], z = a[2];
    var c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
    return [t * x * x + c, t * x * y + s * z, t * x * z - s * y,
            t * x * y - s * z, t * y * y + c, t * y * z + s * x,
            t * x * z + s * y, t * y * z - s * x, t * z * z + c];
  }

  function stretch(x, y, z) { return [x, 0, 0, 0, y, 0, 0, 0, z]; }

  function det(m) {
    return m[0] * (m[4] * m[8] - m[7] * m[5]) - m[3] * (m[1] * m[8] - m[7] * m[2]) +
           m[6] * (m[1] * m[5] - m[4] * m[2]);
  }

  // Normals go through the inverse transpose, so a squashed bubble still
  // faces the right way.
  function normalMatrix(m) {
    var a = m[0], b = m[3], c = m[6], d = m[1], e = m[4], f = m[7], g = m[2], h = m[5], i = m[8];
    var A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
    var dt = a * A + b * B + c * C || 1;
    return [A / dt, -(b * i - c * h) / dt, (b * f - c * e) / dt,
            B / dt, (a * i - c * g) / dt, -(a * f - c * d) / dt,
            C / dt, -(a * h - b * g) / dt, (a * e - b * d) / dt];
  }

  function hex(s) {
    var n = parseInt(s.slice(1), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  // A small steady random, so the model is the same on every visit.
  var seed = 7;
  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }
  function spread(a, b) { return a + (b - a) * rand(); }
  function pick(list) { return list[Math.floor(rand() * list.length)]; }

  // --- The drawing's view --------------------------------------------------
  // Measured off the still: its verticals stay vertical, the two rows of
  // letters run at about 31 degrees down and 20 up, and those are square
  // to each other on the ground, which puts the eye 27.5 degrees up and
  // 38.5 round. 58 of the still's pixels make a metre, so a letter is six
  // metres tall. The model's origin is on the ground under the middle of
  // the site, (876, 717) in the still, and the view turns about a point
  // straight above it, which the still has at its centre.

  var VIEW = { w: 1752, h: 1151, s: 58, az: -38.5 * DEG, el: 27.5 * DEG, ground: 717 };

  function basis(az, el) {
    var e = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
    var r = norm([e[2], 0, -e[0]]);
    return { e: e, r: r, u: cross(e, r) };
  }

  var drawn = basis(VIEW.az, VIEW.el);
  var PIVOT = [0, (VIEW.ground - VIEW.h / 2) / (VIEW.s * drawn.u[1]), 0];

  // The point in the model at height y that the still shows at (px, py).
  function traced(px, py, y) {
    var r = drawn.r, u = drawn.u;
    var a = (px - VIEW.w / 2) / VIEW.s;
    var b = (VIEW.h / 2 - py) / VIEW.s - u[1] * (y - PIVOT[1]);
    var d = r[0] * u[2] - r[2] * u[0];
    return [(a * u[2] - r[2] * b) / d, y, (r[0] * b - a * u[0]) / d];
  }

  // A metre of height, in the still's pixels.
  var RISE = VIEW.s * drawn.u[1];

  // The point the still shows at (px, py) that stands over the ground the
  // still shows at (px, g). A drawing can't say how far back a thing is,
  // only how high it would be if it stood here, so this is how depth is
  // given: g is where its foot would be drawn, and a bigger g is nearer.
  function over(px, py, g) { return traced(px, py, (g - py) / RISE); }

  // --- Geometry ------------------------------------------------------------
  // A shape is positions, normals and triangles. Each triangle is wound so
  // its front faces the way its normals point, whatever order it was
  // given in, so every solid's outside is its front and the open tube can
  // tell its inside by its back.

  function Shape() { this.p = []; this.n = []; this.i = []; }

  Shape.prototype.vert = function (p, n) {
    this.p.push(p[0], p[1], p[2]);
    this.n.push(n[0], n[1], n[2]);
    return this.p.length / 3 - 1;
  };

  Shape.prototype.tri = function (a, b, c) {
    var P = this.p, N = this.n;
    var ab = [P[b * 3] - P[a * 3], P[b * 3 + 1] - P[a * 3 + 1], P[b * 3 + 2] - P[a * 3 + 2]];
    var ac = [P[c * 3] - P[a * 3], P[c * 3 + 1] - P[a * 3 + 1], P[c * 3 + 2] - P[a * 3 + 2]];
    var facing = [N[a * 3] + N[b * 3] + N[c * 3], N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1],
                  N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2]];
    if (dot(cross(ab, ac), facing) < 0) this.i.push(a, c, b);
    else this.i.push(a, b, c);
  };

  Shape.prototype.quad = function (a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); };

  // The same, for a shape whose points are rewritten every frame: its
  // triangles are turned once, on the first frame, and it never folds far
  // enough to need it again.
  function orient(shape) {
    var P = shape.p, N = shape.n, I = shape.i;
    for (var k = 0; k < I.length; k += 3) {
      var a = I[k] * 3, b = I[k + 1] * 3, c = I[k + 2] * 3;
      var g = cross([P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]],
                    [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]]);
      var n = [N[a] + N[b] + N[c], N[a + 1] + N[b + 1] + N[c + 1], N[a + 2] + N[b + 2] + N[c + 2]];
      if (dot(g, n) < 0) { var t = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = t; }
    }
  }

  // A flat-sided solid: a convex outline in x, y, pushed through z0..z1.
  function prism(s, pts, z0, z1) {
    var n = pts.length, area = 0, k, p, q;
    for (k = 0; k < n; k++) {
      p = pts[k]; q = pts[(k + 1) % n];
      area += p[0] * q[1] - q[0] * p[1];
    }
    var sign = area > 0 ? 1 : -1, front = [], back = [];
    for (k = 0; k < n; k++) {
      front.push(s.vert([pts[k][0], pts[k][1], z1], [0, 0, 1]));
      back.push(s.vert([pts[k][0], pts[k][1], z0], [0, 0, -1]));
    }
    for (k = 1; k < n - 1; k++) {
      s.tri(front[0], front[k], front[k + 1]);
      s.tri(back[0], back[k], back[k + 1]);
    }
    for (k = 0; k < n; k++) {
      p = pts[k]; q = pts[(k + 1) % n];
      var out = norm([(q[1] - p[1]) * sign, -(q[0] - p[0]) * sign, 0]);
      s.quad(s.vert([p[0], p[1], z0], out), s.vert([q[0], q[1], z0], out),
             s.vert([q[0], q[1], z1], out), s.vert([p[0], p[1], z1], out));
    }
    return s;
  }

  function block(s, x0, y0, x1, y1, z0, z1) {
    return prism(s, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z0, z1);
  }

  // A box round a centre, spanned by three half-axes at right angles.
  function cuboid(s, c, ax, ay, az) {
    [[ax, ay, az], [ay, az, ax], [az, ax, ay]].forEach(function (f) {
      [1, -1].forEach(function (sg) {
        var n = scale(f[0], sg), mid = add(c, n), nn = norm(n);
        s.quad(s.vert(add(add(mid, f[1]), f[2]), nn), s.vert(sub(add(mid, f[1]), f[2]), nn),
               s.vert(sub(sub(mid, f[1]), f[2]), nn), s.vert(add(sub(mid, f[1]), f[2]), nn));
      });
    });
    return s;
  }

  // A straight member from a to b, w by h in section.
  function beam(s, a, b, w, h) {
    var axis = sub(b, a), dir = norm(axis);
    var u = norm(cross(dir, Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : UP)), v = cross(u, dir);
    return cuboid(s, scale(add(a, b), 0.5), scale(axis, 0.5), scale(u, w / 2), scale(v, h / 2));
  }

  // A band round an arc: centre c, in the plane of unit vectors u and v,
  // radius r, wide across the plane and thick toward the centre.
  function hoop(s, c, u, v, r, wide, thick, a0, a1, steps) {
    var w = norm(cross(u, v)), rows = [], k;
    for (k = 0; k <= steps; k++) {
      var a = lerp(a0, a1, k / steps), d = add(scale(u, Math.cos(a)), scale(v, Math.sin(a)));
      var o = add(c, scale(d, r)), i = add(c, scale(d, r - thick)), hw = scale(w, wide / 2);
      var nd = scale(d, -1), nw = scale(w, -1);
      rows.push([
        s.vert(add(o, hw), d), s.vert(sub(o, hw), d),
        s.vert(add(i, hw), nd), s.vert(sub(i, hw), nd),
        s.vert(add(o, hw), w), s.vert(add(i, hw), w),
        s.vert(sub(o, hw), nw), s.vert(sub(i, hw), nw)
      ]);
    }
    for (k = 0; k < steps; k++) {
      for (var f = 0; f < 8; f += 2) s.quad(rows[k][f], rows[k][f + 1], rows[k + 1][f + 1], rows[k + 1][f]);
    }
    return s;
  }

  // A round slab, standing on y0.
  function disk(s, c, r, y0, y1, n) {
    var top = s.vert([c[0], y1, c[2]], UP), bot = s.vert([c[0], y0, c[2]], [0, -1, 0]), k;
    var ring = [];
    for (k = 0; k <= n; k++) {
      var a = 2 * Math.PI * k / n, d = [Math.cos(a), 0, Math.sin(a)];
      var p = add(c, scale(d, r));
      ring.push([s.vert([p[0], y1, p[2]], UP), s.vert([p[0], y0, p[2]], [0, -1, 0]),
                 s.vert([p[0], y1, p[2]], d), s.vert([p[0], y0, p[2]], d)]);
    }
    for (k = 0; k < n; k++) {
      s.tri(top, ring[k][0], ring[k + 1][0]);
      s.tri(bot, ring[k][1], ring[k + 1][1]);
      s.quad(ring[k][2], ring[k + 1][2], ring[k + 1][3], ring[k][3]);
    }
    return s;
  }

  function sphere(lat, lon) {
    var s = new Shape(), rows = [], i, j;
    for (i = 0; i <= lat; i++) {
      var th = Math.PI * i / lat, row = [];
      for (j = 0; j <= lon; j++) {
        var ph = 2 * Math.PI * j / lon;
        var n = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
        row.push(s.vert(n, n));
      }
      rows.push(row);
    }
    for (i = 0; i < lat; i++) {
      for (j = 0; j < lon; j++) {
        if (i > 0) s.tri(rows[i][j], rows[i + 1][j], rows[i][j + 1]);
        if (i < lat - 1) s.tri(rows[i][j + 1], rows[i + 1][j], rows[i + 1][j + 1]);
      }
    }
    return s;
  }

  // Catmull-Rom through a few points: closed round (loop) or open (curve).
  function spline(p0, p1, p2, p3, t) {
    return [0, 1, 2].map(function (c) {
      return 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t +
        (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t * t +
        (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t * t * t);
    });
  }

  function loop(pts, n) {
    var out = [], m = pts.length;
    for (var k = 0; k < n; k++) {
      var f = k * m / n, i = Math.floor(f);
      out.push(spline(pts[(i - 1 + m) % m], pts[i], pts[(i + 1) % m], pts[(i + 2) % m], f - i));
    }
    return out;
  }

  function curve(pts, n) {
    var out = [], m = pts.length - 1;
    for (var k = 0; k <= n; k++) {
      var f = k * m / n, i = Math.min(Math.floor(f), m - 1);
      out.push(spline(pts[Math.max(i - 1, 0)], pts[i], pts[i + 1], pts[Math.min(i + 2, m)], f - i));
    }
    return out;
  }

  // A funnel: a flat top on an outline, narrowing straight down to a
  // smaller copy of it at the foot (the origin).
  function funnel(top, narrow) {
    var s = new Shape(), n = top.length, c = [0, 0, 0], k, j;
    top.forEach(function (p) { c = add(c, scale(p, 1 / n)); });
    var bottom = top.map(function (p) {
      var d = sub(p, c);
      return [d[0] * narrow, 0, d[2] * narrow];
    });
    var cap = s.vert(c, UP), rim = [];
    for (k = 0; k < n; k++) rim.push(s.vert(top[k], UP));
    for (k = 0; k < n; k++) s.tri(cap, rim[k], rim[(k + 1) % n]);
    var RINGS = 6, rings = [];
    for (j = 0; j <= RINGS; j++) {
      var t = j / RINGS, ring = [];
      for (k = 0; k < n; k++) {
        var a = mix(top[(k - 1 + n) % n], bottom[(k - 1 + n) % n], t);
        var b = mix(top[(k + 1) % n], bottom[(k + 1) % n], t);
        var nn = norm(cross(sub(bottom[k], top[k]), sub(b, a)));
        if (dot(nn, sub(top[k], c)) + dot(nn, bottom[k]) < 0) nn = scale(nn, -1);
        ring.push(s.vert(mix(top[k], bottom[k], t), nn));
      }
      rings.push(ring);
    }
    for (j = 0; j < RINGS; j++) {
      for (k = 0; k < n; k++) {
        s.quad(rings[j][k], rings[j][(k + 1) % n], rings[j + 1][(k + 1) % n], rings[j + 1][k]);
      }
    }
    var end = s.vert([0, 0, 0], [0, -1, 0]), sole = [];
    for (k = 0; k < n; k++) sole.push(s.vert(bottom[k], [0, -1, 0]));
    for (k = 0; k < n; k++) s.tri(end, sole[k], sole[(k + 1) % n]);
    return { shape: s, top: c };
  }

  // A house: walls and a pitched roof, w wide, l long, the eaves at h and
  // the ridge r above them. Its foot is at the origin, its ridge along z.
  function house(w, l, h, r) {
    return prism(new Shape(),
      [[-w / 2, 0], [w / 2, 0], [w / 2, h], [0, h + r], [-w / 2, h]], -l / 2, l / 2);
  }

  // The same house as the studio built it: "simple slabs and an internal,
  // load-bearing wall system". A floor, a ceiling, a wall down the middle
  // and the two roof planes; the outside walls are gone, so it can be seen
  // into.
  function houseFrame(w, l, h, r) {
    var s = new Shape(), T = 0.2;
    cuboid(s, [0, T / 2, 0], [w / 2, 0, 0], [0, T / 2, 0], [0, 0, l / 2]);
    cuboid(s, [0, h - T / 2, 0], [w / 2, 0, 0], [0, T / 2, 0], [0, 0, l / 2]);
    cuboid(s, [0, h / 2, 0], [0.13, 0, 0], [0, h / 2, 0], [0, 0, l / 2 - 0.3]);
    [-1, 1].forEach(function (side) {
      var eave = [side * w / 2, h, 0], ridge = [0, h + r, 0];
      var along = scale(sub(ridge, eave), 0.5), n = norm([side * r, w / 2, 0]);
      cuboid(s, add(scale(add(eave, ridge), 0.5), scale(n, T / 2)), along, scale(n, T / 2), [0, 0, l / 2]);
    });
    return s;
  }

  // --- Letters ---------------------------------------------------------
  // As the drawing has them: tall, narrow, one weight, with round bowls.
  // Each is a few blocks and bands pushed through together; where two
  // overlap they share a face, so the line finder sees one letter.

  // A band round part of an ellipse, t thick, pushed through z0..z1: the
  // round of a B, a U, an O. Its curved faces are smooth, so only its
  // edges draw.
  function band(s, cx, cy, rx, ry, t, a0, a1, z0, z1) {
    var steps = Math.max(6, Math.round((a1 - a0) / 8));
    var ix = Math.max(rx - t, 0.02), iy = Math.max(ry - t, 0.02);
    var rows = { outer: [], inner: [], front: [], back: [] }, k, a, c, sn, po, pi;
    for (k = 0; k <= steps; k++) {
      a = (a0 + (a1 - a0) * k / steps) * DEG; c = Math.cos(a); sn = Math.sin(a);
      po = [cx + rx * c, cy + ry * sn]; pi = [cx + ix * c, cy + iy * sn];
      var no = norm([c / rx, sn / ry, 0]), ni = norm([-c / ix, -sn / iy, 0]);
      rows.outer.push([s.vert([po[0], po[1], z0], no), s.vert([po[0], po[1], z1], no)]);
      rows.inner.push([s.vert([pi[0], pi[1], z0], ni), s.vert([pi[0], pi[1], z1], ni)]);
      rows.front.push([s.vert([po[0], po[1], z1], [0, 0, 1]), s.vert([pi[0], pi[1], z1], [0, 0, 1])]);
      rows.back.push([s.vert([po[0], po[1], z0], [0, 0, -1]), s.vert([pi[0], pi[1], z0], [0, 0, -1])]);
    }
    ["outer", "inner", "front", "back"].forEach(function (key) {
      var r = rows[key];
      for (var j = 0; j < steps; j++) s.quad(r[j][0], r[j + 1][0], r[j + 1][1], r[j][1]);
    });
    if (a1 - a0 < 360) {
      [[a0, -1], [a1, 1]].forEach(function (end) {
        a = end[0] * DEG; c = Math.cos(a); sn = Math.sin(a);
        var n = norm([-rx * sn * end[1], ry * c * end[1], 0]);
        po = [cx + rx * c, cy + ry * sn]; pi = [cx + ix * c, cy + iy * sn];
        s.quad(s.vert([po[0], po[1], z0], n), s.vert([pi[0], pi[1], z0], n),
               s.vert([pi[0], pi[1], z1], n), s.vert([po[0], po[1], z1], n));
      });
    }
    return s;
  }

  function glyph(ch, w, h, t) {
    var k = w * 0.55, m = h * 0.52, ww, tw;
    function R(x0, y0, x1, y1) { return ["block", x0, y0, x1, y1]; }
    function A(cx, cy, rx, ry, a0, a1) { return ["band", cx, cy, rx, ry, a0, a1]; }
    function D(x0, x1) {   // a slanted stroke from (x0, 0) up to (x1, h)
      var q = t * 0.62;
      return ["poly", [[x0 - q, 0], [x0 + q, 0], [x1 + q, h], [x1 - q, h]]];
    }
    switch (ch) {
      case "B": return { w: w, parts: [
        R(0, 0, t, h),
        R(0, h - t, w * 0.45, h), A(w * 0.45, (m + h) / 2, w * 0.5, (h - m) / 2, -90, 90),
        R(0, m, w * 0.45, m + t),
        R(0, 0, w * 0.4, t), A(w * 0.4, (m + t) / 2, w * 0.6, (m + t) / 2, -90, 90)] };
      case "U": return { w: w, parts: [
        R(0, k, t, h), R(w - t, k, w, h), A(w / 2, k, w / 2, k, 180, 360)] };
      case "L": return { w: w * 0.9, parts: [R(0, 0, t, h), R(0, 0, w * 0.9, t)] };
      case "E": return { w: w * 0.92, parts: [
        R(0, 0, t, h), R(0, h - t, w * 0.92, h), R(0, h * 0.5 - t / 2, w * 0.8, h * 0.5 + t / 2),
        R(0, 0, w * 0.92, t)] };
      case "O": return { w: w, parts: [
        R(0, k, t, h - k), R(w - t, k, w, h - k),
        A(w / 2, h - k, w / 2, k, 0, 180), A(w / 2, k, w / 2, k, 180, 360)] };
      case "X": return { w: w, parts: [D(t * 0.62, w - t * 0.62), D(w - t * 0.62, t * 0.62)] };
      case "A": return { w: w, parts: [
        R(0, 0, t, h - k), R(w - t, 0, w, h - k), A(w / 2, h - k, w / 2, k, 0, 180),
        R(0, h * 0.44, w, h * 0.44 + t)] };
      case "T": tw = w * 1.25; return { w: tw, parts: [
        R(tw / 2 - t / 2, 0, tw / 2 + t / 2, h), R(0, h - t, tw, h)] };
      case "H": return { w: w, parts: [
        R(0, 0, t, h), R(w - t, 0, w, h), R(0, h * 0.5 - t / 2, w, h * 0.5 + t / 2)] };
      case "C": return { w: w, parts: [
        A(w / 2, h - k, w / 2, k, 20, 180), R(0, k, t, h - k), A(w / 2, k, w / 2, k, 180, 340)] };
      case "W":
        ww = w * 1.5;
        var l = (ww / 2 + t / 2) / 2, rc = (ww / 2 - t / 2 + ww) / 2;
        return { w: ww, parts: [
          R(0, k, t, h), R(ww - t, k, ww, h), R(ww / 2 - t / 2, k, ww / 2 + t / 2, h * 0.72),
          A(l, k, l, k, 180, 360), A(rc, k, ww - rc, k, 180, 360)] };
      case "&": return { w: w * 1.1, parts: [
        A(w * 0.46, h * 0.79, w * 0.4, h * 0.21, 0, 360),
        ["poly", [[w * 0.12, h * 0.66], [w * 0.12 + t * 1.2, h * 0.66], [w * 1.1, 0], [w * 1.1 - t * 1.2, 0]]],
        A(w * 0.5, h * 0.27, w * 0.5, h * 0.27, 100, 350)] };
    }
    return { w: w * 0.7, parts: [] };   // a space
  }

  function letter(ch, w, h, t, depth) {
    var g = glyph(ch, w, h, t), s = new Shape();
    g.parts.forEach(function (p) {
      if (p[0] === "block") block(s, p[1], p[2], p[3], p[4], -depth / 2, depth / 2);
      else if (p[0] === "band") band(s, p[1], p[2], p[3], p[4], t, p[5], p[6], -depth / 2, depth / 2);
      else prism(s, p[1], -depth / 2, depth / 2);
    });
    return { shape: s, w: g.w };
  }

  // --- The tube --------------------------------------------------------
  // Rebuilt every frame as it sways and swallows: rings round a smooth
  // path, a round end where it starts and an open mouth where it ends. Its
  // other self, the lattice, follows the same path: ribs along it and
  // hoops round it.

  var TUBE = { steps: 72, sides: 30, cap: 8, ribs: 8, every: 6, seg: 26 };

  function frames(path) {
    var pts = curve(path, TUBE.steps), n = pts.length, tan = [], side = [], up = [];
    var s = norm(cross(norm(sub(pts[1], pts[0])), UP));
    for (var k = 0; k < n; k++) {
      var t = norm(sub(pts[Math.min(k + 1, n - 1)], pts[Math.max(k - 1, 0)]));
      s = norm(sub(s, scale(t, dot(s, t))));
      tan.push(t); side.push(s); up.push(cross(s, t));
    }
    return { pts: pts, tan: tan, side: side, up: up, n: n };
  }

  function writer(pos, nrm) {
    var at = 0;
    return function (p, n) {
      pos[at] = p[0]; pos[at + 1] = p[1]; pos[at + 2] = p[2];
      nrm[at] = n[0]; nrm[at + 1] = n[1]; nrm[at + 2] = n[2];
      at += 3;
    };
  }

  function around(f, k, ph) {
    return add(scale(f.side[k], Math.cos(ph)), scale(f.up[k], Math.sin(ph)));
  }

  function tubeSize() { return (TUBE.cap + TUBE.steps + 1) * (TUBE.sides + 1) + 1; }

  function tubeFill(f, rad, pos, nrm) {
    var put = writer(pos, nrm), sides = TUBE.sides, t0 = f.tan[0], r0 = rad[0], j, ph, d;
    put(sub(f.pts[0], scale(t0, r0)), scale(t0, -1));   // the pole of the round end
    for (var c = TUBE.cap; c >= 1; c--) {
      var a = (Math.PI / 2) * c / TUBE.cap;
      for (j = 0; j <= sides; j++) {
        ph = 2 * Math.PI * j / sides;
        var n = add(scale(around(f, 0, ph), Math.cos(a)), scale(t0, -Math.sin(a)));
        put(add(f.pts[0], scale(n, r0)), n);
      }
    }
    for (var k = 0; k < f.n; k++) {
      for (j = 0; j <= sides; j++) {
        ph = 2 * Math.PI * j / sides;
        d = around(f, k, ph);
        put(add(f.pts[k], scale(d, rad[k])), d);
      }
    }
  }

  function tubeIndex() {
    var idx = [], sides = TUBE.sides, rows = TUBE.cap + TUBE.steps + 1;
    for (var j = 0; j < sides; j++) idx.push(0, 1 + j + 1, 1 + j);
    for (var i = 0; i < rows - 1; i++) {
      for (j = 0; j < sides; j++) {
        var a = 1 + i * (sides + 1) + j, b = a + sides + 1;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    return idx;
  }

  function hoopsAt() {
    var list = [];
    for (var k = 1; k < TUBE.steps + 1; k += TUBE.every) list.push(k);
    list.push(TUBE.steps);
    return list;
  }

  function latticeSize() {
    return (TUBE.ribs * (TUBE.steps + 1) + hoopsAt().length * (TUBE.seg + 1)) * 8;
  }

  var RIB = { wide: 0.2, thick: 0.09 };

  function latticeFill(f, rad, pos, nrm) {
    var put = writer(pos, nrm), k, j;
    for (j = 0; j < TUBE.ribs; j++) {
      var ph = 2 * Math.PI * (j + 0.5) / TUBE.ribs;
      for (k = 0; k < f.n; k++) {
        var d = around(f, k, ph), t = around(f, k, ph + Math.PI / 2);
        var o = add(f.pts[k], scale(d, rad[k])), i = add(f.pts[k], scale(d, rad[k] - RIB.thick));
        var hw = scale(t, RIB.wide / 2), nd = scale(d, -1), nt = scale(t, -1);
        put(add(o, hw), d); put(sub(o, hw), d); put(add(i, hw), nd); put(sub(i, hw), nd);
        put(add(o, hw), t); put(add(i, hw), t); put(sub(o, hw), nt); put(sub(i, hw), nt);
      }
    }
    hoopsAt().forEach(function (k) {
      var tan = f.tan[k], hw = scale(tan, RIB.wide / 2), nt = scale(tan, -1);
      for (j = 0; j <= TUBE.seg; j++) {
        var d = around(f, k, 2 * Math.PI * j / TUBE.seg), nd = scale(d, -1);
        var o = add(f.pts[k], scale(d, rad[k] + 0.02)), i = add(f.pts[k], scale(d, rad[k] - RIB.thick - 0.02));
        put(add(o, hw), d); put(sub(o, hw), d); put(add(i, hw), nd); put(sub(i, hw), nd);
        put(add(o, hw), tan); put(add(i, hw), tan); put(sub(o, hw), nt); put(sub(i, hw), nt);
      }
    });
  }

  function latticeIndex() {
    var idx = [], base = 0, k, f;
    function strip(count) {
      for (k = 0; k < count - 1; k++) {
        var p = base + k * 8, q = p + 8;
        for (f = 0; f < 8; f += 2) idx.push(p + f, p + f + 1, q + f + 1, p + f, q + f + 1, q + f);
      }
      base += count * 8;
    }
    for (var j = 0; j < TUBE.ribs; j++) strip(TUBE.steps + 1);
    hoopsAt().forEach(function () { strip(TUBE.seg + 1); });
    return idx;
  }

  function dynamicShape(size, index) {
    var s = new Shape();
    s.p = new Float32Array(size * 3);
    s.n = new Float32Array(size * 3);
    s.i = index;
    s.dynamic = true;
    return s;
  }

  // --- Colour ------------------------------------------------------------

  var PAL = {
    letter: ["#feb482", "#fd8336", "#fea26a"],
    theater: ["#c9547e", "#c90072", "#a40e5c"],
    seats: ["#e889b4", "#d2609a", "#b94a83"],
    purple: ["#b24298", "#b200c9", "#78307a"],
    funnel: ["#fef67c", "#fdf21e", "#fdf21e"],
    concrete: ["#ece9df", "#cfcbbf", "#b6b1a4"],
    tube: ["#c93233", "#c93233", "#c93233", "#a1161a"],
    lattice: ["#ffbf8e", "#fd8336", "#ea6f25"],
    cage: ["#ff9fc9", "#ff4f9a", "#e2347e"],
    floor: ["#fbd6e5", "#f5bcd3", "#eba6c3"],
    greens: [
      ["#c6d92d", "#7bc900", "#659f35"],
      ["#7bc900", "#c6d92d", "#659f35"],
      ["#c6d92d", "#659f35", "#7bc900"],
      ["#7bc900", "#659f35", "#c6d92d"]
    ],
    bubbles: ["#f99f00", "#fcb116", "#f5811f"]
  };

  // The people wear what the studio's drawings put them in.
  var SHIRTS = ["#f6d31f", "#39b7a5", "#ff6fa8", "#3a78d0", "#6bbf4a", "#f4f1ea",
                "#ff8a3d", "#9a5bc4", "#e2463b", "#2fa0d8"];
  var LEGS = ["#2d3a4a", "#3a78d0", "#4a4a4a", "#6b5b4b", "#1f2a36", "#7a7f88", "#8a2a5e"];
  var SKIN = ["#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#ffdbac", "#a8683a"];

  // A single colour as the three tones: lighter on top, darker turned right.
  function tints(c) {
    var b = hex(c);
    return [mix(b, [1, 1, 1], 0.25), b, scale(b, 0.82)];
  }

  function tones(list) {
    var t = list.map(function (c) { return typeof c === "string" ? hex(c) : c; });
    while (t.length < 4) t.push(t[t.length - 1]);
    return t;
  }

  // --- The model ---------------------------------------------------------
  // Everything drawn is a thing: a shape, its tones, an id for the line
  // finder, and where it is (at, m), which is its body's place and pose
  // times its own (lp, lm). A body is what acts: a bubble, a letter, a
  // house, a person. It is what a click reaches and what the frame loop
  // moves. A thing shows in the diagram ("d"), in the architecture ("a"),
  // or in both.

  var things = [], bodies = [], owner = [];
  var nextId = 1;

  function body(kind, props) {
    var b = { kind: kind, things: [], at: [0, 0, 0], m: IDENT, t0: -99, lo: 0, hi: 0, delay: 0 };
    for (var k in props) b[k] = props[k];
    bodies.push(b);
    return b;
  }

  function thing(b, shape, pal, props) {
    var o = {
      body: b, shape: shape, tones: tones(pal), id: nextId++, show: "both",
      lp: [0, 0, 0], lm: IDENT, at: [0, 0, 0], m: IDENT, visible: true,
      hollow: false, wobble: 0, cut: 0, side: 0, direct: false, fine: false
    };
    for (var k in props) o[k] = props[k];
    things.push(o);
    b.things.push(o);
    owner[o.id] = b;
    return o;
  }

  // The bubbles: where each sits in the still, its radius there, and
  // where its foot would be drawn (see over), which sets how far back it
  // is and so which ones it cuts into.
  var BUBBLES = [
    [567, 250, 82, 800, "#f99f00"],
    [727, 342, 123, 805, "#fcb116"],
    [530, 386, 90, 815, "#f5811f"],
    [565, 392, 52, 835, "#fcb116"],
    [640, 392, 36, 830, "#f99f00"],
    [447, 484, 101, 830, "#f99f00"],
    [603, 505, 122, 850, "#f5811f"],
    [765, 458, 95, 850, "#f99f00"],
    [825, 435, 58, 872, "#fcb116"],
    [668, 610, 88, 881, "#f99f00"]
  ];

  // The tube's path in the still, with the same depths: from its round
  // end at the right, left along the front of the theater's lid, down and
  // back round to its mouth, which looks out to the right, so its inside
  // shows.
  var TUBE_PATH = [
    [1168, 432, 850], [1040, 452, 853], [900, 478, 858], [790, 520, 862],
    [760, 590, 870], [790, 650, 892], [848, 668, 905]
  ];

  // The letter rows, each from one end of its foot to the other.
  var ROWS = [
    { text: "BUBBLE", from: [38, 752], to: [440, 993] },
    { text: "BOX EAT & WATCH", from: [560, 1112], to: [1748, 672] }
  ];

  // Each house: where its foot is on the ground in the still, how high it
  // sits in the pile, then width, length, eaves and ridge, its turn and
  // its tilt. The four that stand level have someone at home.
  var PILE = [
    [1150, 720, 0, 4.6, 6, 3.2, 2, 20, 0],
    [1320, 690, 0, 4.6, 5.5, 3.4, 2.2, -10, 0],
    [1010, 690, 0, 4.2, 5, 3.2, 1.8, 55, 0],
    [1270, 660, 5.4, 4.4, 6, 2.8, 2.1, -5, 0],
    [1130, 680, 5.2, 4, 4.8, 2.8, 1.8, 35, -12],
    [960, 660, 5, 3.8, 4.4, 2.8, 1.8, 70, 10],
    [1060, 650, 8.8, 3.2, 3.8, 2.4, 1.5, -20, -18],
    [830, 630, 8.2, 3.2, 3.6, 2.4, 1.4, 40, 22],
    [1170, 640, 7.2, 3.4, 4.2, 2.4, 1.6, 50, 14]
  ];

  var unitBox = block(new Shape(), 0, 0, 1, 1, 0, 1);
  var cube = cuboid(new Shape(), [0, 0, 0], [0.5, 0, 0], [0, 0.5, 0], [0, 0, 0.5]);
  var ball = sphere(28, 48), head = sphere(8, 12);
  var cageShape = (function () {
    var s = new Shape(), k;
    for (k = 0; k < 5; k++) {
      var a = k * Math.PI / 5;
      hoop(s, [0, 0, 0], [Math.cos(a), 0, Math.sin(a)], UP, 1, 0.075, 0.05, 0, 2 * Math.PI, 56);
    }
    [-0.3, 0.35].forEach(function (y) {
      hoop(s, [0, y, 0], [1, 0, 0], [0, 0, 1], Math.sqrt(1 - y * y), 0.075, 0.05, 0, 2 * Math.PI, 48);
    });
    return s;
  })();
  var FLOOR = -0.36;   // a bubble's floor, as a share of its radius below the centre
  var floorShape = disk(new Shape(), [0, 0, 0], Math.sqrt(1 - FLOOR * FLOOR) - 0.03, FLOOR - 0.035, FLOOR, 40);

  var bubbles = [], letters = [], houses = [], funnels = [], people = [];
  var theater, purple, tube, rows = [], floaters = [], drops = [];

  function build() {
    // The theater: a box, traced by three corners of its lid and one foot.
    var foot = traced(493, 917, 0);
    var hb = (917 - 703) / RISE;
    var a = traced(493, 703, hb), b = traced(1012, 640, hb), c = traced(448, 583, hb);
    var along = sub(b, a), back = sub(c, a);
    back = sub(back, scale(along, dot(back, along) / dot(along, along)));
    theater = body("theater", { base: foot, lo: 0, hi: hb, middle: scale(add(along, back), 0.5) });
    thing(theater, unitBox, PAL.theater, { show: "d", lm: columns(along, [0, hb, 0], back) });
    buildTheater(along, back, hb);

    // The purple box at the top of the pile, traced by its lid, turning
    // about its own middle.
    var hp = (650 - 113) / RISE;
    var p4 = traced(983, 113, hp), e1 = sub(traced(903, 83, hp), p4), e2 = sub(traced(1035, 68, hp), p4);
    e2 = sub(e2, scale(e1, dot(e2, e1) / dot(e1, e1)));
    var mid = add(p4, add(scale(add(e1, e2), 0.5), [0, -1.3, 0]));
    purple = body("purple", { base: mid });
    thing(purple, unitBox, PAL.purple, { lm: columns(e1, [0, 2.6, 0], e2),
      lp: sub(add(p4, [0, -2.6, 0]), mid) });

    // The funnels, both standing on the ground: the wide one behind the
    // theater, the tall one coming to a point in front of the pile. In the
    // architecture they are concrete.
    var h1 = 9.3, f1 = traced(640, 223 + h1 * RISE, 0);
    addFunnel(f1, [[357, 272], [420, 180], [520, 146], [650, 145], [780, 172], [900, 215],
                   [820, 250], [680, 272], [540, 292], [420, 300]], h1, 0.28, 56);
    var h2 = (760 - 223) / RISE;
    addFunnel(traced(1003, 760, 0), [[906, 146], [1000, 190], [1106, 244], [1030, 282],
                                     [962, 300], [935, 230]], h2, 0.04, 48);

    // The bubbles, each a skin in the diagram and a pink rib cage with a
    // floor in the architecture.
    BUBBLES.forEach(function (bb, k) {
      var o = body("bubble", { home: over(bb[0], bb[1], bb[3]), r: bb[2] / VIEW.s, phase: k * 1.7,
        pop: -99, color: bb[4] });
      o.at = o.home;
      o.skin = thing(o, ball, [bb[4], bb[4], bb[4]], { show: "d", wobble: 0.018 });
      thing(o, cageShape, PAL.cage, { show: "a", fine: true });
      thing(o, floorShape, PAL.floor, { show: "a" });
      bubbles.push(o);
    });

    // The tube, and the lattice it becomes. Both are filled in each frame.
    tube = body("tube", { path: TUBE_PATH.map(function (p) { return over(p[0], p[1], p[2]); }),
      lo: 3.3, hi: 9.8, gulps: [] });
    tube.skin = thing(tube, dynamicShape(tubeSize(), tubeIndex()), PAL.tube, { show: "d", hollow: true });
    tube.ribs = thing(tube, dynamicShape(latticeSize(), latticeIndex()), PAL.lattice, { show: "a", fine: true });

    // The letters, spaced out along their rows, each a little off the
    // line and turned, as they are in the drawing.
    ROWS.forEach(function (row, ri) {
      var from = traced(row.from[0], row.from[1], 0), to = traced(row.to[0], row.to[1], 0);
      var dir = norm(sub(to, from)), out = cross(dir, UP);
      var len = length(sub(to, from));
      var made = row.text.split("").map(function (ch) {
        return { ch: ch, g: letter(ch, 1.4, 6.2 * spread(0.92, 1.1), 0.44, 0.6) };
      });
      var total = made.reduce(function (s, m) { return s + m.g.w; }, 0);
      var gap = (len - total) / (made.length - 1), x = 0, spaces = [];
      made.forEach(function (m, k) {
        if (m.ch === " ") {
          spaces.push(x + m.g.w / 2);
        } else {
          var at = add(add(from, scale(dir, x)), scale(out, spread(-0.5, 0.5)));
          var o = body("letter", { row: ri, index: k, base: at,
            frame: times(columns(dir, UP, out), turn(UP, spread(-6, 6) * DEG)) });
          thing(o, m.g.shape, PAL.letter);
          letters.push(o);
        }
        x += m.g.w + gap;
      });
      rows.push({ from: from, dir: dir, out: out, len: len, spaces: spaces });
    });

    // The stacked houses: a pile behind the right-hand row, to the
    // outline of the green in the still.
    PILE.forEach(function (h, k) {
      var rot = times(turn(UP, h[7] * DEG), turn([1, 0, 0.3], h[8] * DEG));
      var o = body("house", { base: add(traced(h[0], h[1], 0), [0, h[2], 0]), rot: rot,
        lo: h[2], hi: h[2] + h[5] + h[6], yaw: h[7] * DEG, level: !h[8] });
      o.at = o.base; o.m = rot;
      thing(o, house(h[3], h[4], h[5], h[6]), PAL.greens[k % 4], { show: "d" });
      thing(o, houseFrame(h[3], h[4], h[5], h[6]), PAL.greens[k % 4], { show: "a" });
      if (o.level) {
        o.home = [[h[3] * 0.25, 0.2, h[4] * 0.2, spread(0, 6)], [-h[3] * 0.25, 0.2, -h[4] * 0.15, spread(0, 6)]];
      }
      houses.push(o);
    });

    // Lower things turn first, so the architecture rises from the ground.
    bodies.forEach(function (o) { o.delay = clamp(o.lo / 16, 0, 0.45) + spread(0, 0.05); });

    buildPeople();

    // Bubbles blown out of the tube's mouth, and the drops a burst bubble
    // leaves: a few kept ready and hidden until wanted.
    for (var k = 0; k < 6; k++) {
      var fl = body("floater", { live: false });
      fl.skin = thing(fl, ball, PAL.bubbles, { wobble: 0.03, visible: false });
      floaters.push(fl);
    }
    for (k = 0; k < 36; k++) {
      var d = body("drop", { live: false });
      d.skin = thing(d, head, PAL.bubbles, { visible: false });
      drops.push(d);
    }
  }

  function addFunnel(foot, outline, h, narrow, n) {
    var top = loop(outline.map(function (p) { return sub(traced(p[0], p[1], h), foot); }), n);
    var made = funnel(top, narrow);
    var o = body("funnel", { base: foot, axis: norm(made.top), lo: 0, hi: h, phase: funnels.length * 2.1, spin: -99 });
    thing(o, made.shape, PAL.funnel, { show: "d" });
    thing(o, made.shape, PAL.concrete, { show: "a" });
    funnels.push(o);
  }

  // Inside the theater: "a room created by a cubic truss". The box is cut
  // into cubes of about two metres, a member on every edge of the outside
  // and a brace across every face, and inside it a screen at the left end
  // and seats stepping up away from it, with an audience.
  function buildTheater(along, back, hb) {
    var truss = new Shape(), inside = new Shape(), screen = new Shape();
    var na = Math.max(2, Math.round(length(along) / 2.2)), nb = Math.max(1, Math.round(length(back) / 2.2)), ny = 2;
    function P(i, j, k) { return add(add(scale(along, i / na), [0, hb * j / ny, 0]), scale(back, k / nb)); }
    var W = 0.2, i, j, k;
    for (i = 0; i <= na; i++) {
      for (j = 0; j <= ny; j++) {
        for (k = 0; k <= nb; k++) {
          if (i < na && (j === 0 || j === ny || k === 0 || k === nb)) beam(truss, P(i, j, k), P(i + 1, j, k), W, W);
          if (j < ny && (i === 0 || i === na || k === 0 || k === nb)) beam(truss, P(i, j, k), P(i, j + 1, k), W, W);
          if (k < nb && (i === 0 || i === na || j === 0 || j === ny)) beam(truss, P(i, j, k), P(i, j, k + 1), W, W);
        }
      }
    }
    for (i = 0; i < na; i++) {
      for (j = 0; j < ny; j++) {
        var flip = (i + j) % 2;
        beam(truss, P(i, j + flip, 0), P(i + 1, j + 1 - flip, 0), W * 0.7, W * 0.7);
        beam(truss, P(i, j + flip, nb), P(i + 1, j + 1 - flip, nb), W * 0.7, W * 0.7);
      }
    }
    for (k = 0; k < nb; k++) {
      for (j = 0; j < ny; j++) {
        beam(truss, P(0, j, k), P(0, j + 1, k + 1), W * 0.7, W * 0.7);
        beam(truss, P(na, j + 1, k), P(na, j, k + 1), W * 0.7, W * 0.7);
      }
    }
    for (i = 0; i < na; i++) {
      for (k = 0; k < nb; k++) beam(truss, P(i, ny, k), P(i + 1, ny, k + 1), W * 0.7, W * 0.7);
    }
    var ua = norm(along), la = length(along), half = scale(back, 0.44);
    cuboid(inside, add(scale(along, 0.5), add(scale(back, 0.5), [0, 0.08, 0])),
      scale(along, 0.49), [0, 0.08, 0], scale(back, 0.49));
    var seats = [];
    for (var q = 0; q < 4; q++) {
      var a0 = 0.42 + q * 0.14, top = 0.16 + (q + 1) * 0.42;
      cuboid(inside, add(scale(along, (a0 + 0.97) / 2), add(scale(back, 0.5), [0, top / 2, 0])),
        scale(along, (0.97 - a0) / 2), [0, top / 2, 0], half);
      seats.push([a0 + 0.06, top]);
    }
    cuboid(screen, add(scale(along, 0.05), add(scale(back, 0.5), [0, 2.35, 0])),
      scale(ua, 0.06), [0, 1.2, 0], scale(back, 0.4));
    thing(theater, truss, PAL.theater, { show: "a", fine: true });
    thing(theater, inside, PAL.seats, { show: "a" });
    theater.screen = thing(theater, screen, ["#fdfbf2", "#f4f1ea", "#e9e4d8"], { show: "a" });
    theater.seats = seats;
    theater.along = along; theater.back = back; theater.la = la;
  }

  // --- People ----------------------------------------------------------
  // Legs, a body and a head, each a block or a ball in the colours the
  // studio dressed its crowds in. Some walk the street in front of the
  // letters, back and forth; two come in through the gaps and go out
  // again; two stand talking at the corner. The rest are indoors, out of
  // sight in the diagram: an audience in the theater, diners in the
  // bubbles, someone at home in each level house, one walking the tube and
  // one sitting in its mouth, legs out, as in the model.

  function person(kind, props) {
    var o = body("person", props);
    o.role = kind;
    var legs = pick(LEGS), shirt = pick(SHIRTS), skin = pick(SKIN);
    o.parts = [
      thing(o, cube, tints(legs), { direct: true }),
      thing(o, cube, tints(legs), { direct: true }),
      thing(o, cube, tints(shirt), { direct: true }),
      thing(o, head, tints(skin), { direct: true })
    ];
    o.stride = spread(0, 6);
    people.push(o);
    return o;
  }

  // A walk: a line of points and how fast; back and forth unless it loops.
  function walk(pts, speed, loops) {
    var cum = [0];
    for (var k = 1; k < pts.length; k++) cum.push(cum[k - 1] + length(sub(pts[k], pts[k - 1])));
    return { pts: pts, cum: cum, total: cum[cum.length - 1], speed: speed, loops: !!loops, phase: spread(0, 200) };
  }

  function beside(row, x, off) { return add(add(row.from, scale(row.dir, x)), scale(row.out, off)); }

  // Where the drawing's camera puts a point, in the still's pixels.
  function drawnAt(p) {
    var d = sub(p, PIVOT);
    return [VIEW.w / 2 + dot(drawn.r, d) * VIEW.s, VIEW.h / 2 - dot(drawn.u, d) * VIEW.s];
  }

  // Inside the frame, feet and head, with room to spare for the view's sway.
  function framed(p) {
    var foot = drawnAt(p), top = drawnAt(add(p, [0, 1.8, 0]));
    return foot[0] > 50 && foot[0] < VIEW.w - 50 && foot[1] < VIEW.h - 40 && top[1] > 40;
  }

  // A street along a row, off metres out from it, as far as the frame
  // lets it run.
  function street(row, off) {
    var ends = [];
    for (var x = -3; x <= row.len + 3; x += 0.25) {
      if (framed(beside(row, x, off)) && framed(beside(row, x, off + 0.6))) ends.push(x);
    }
    return [beside(row, ends[0] + 0.5, off), beside(row, ends[ends.length - 1] - 0.5, off)];
  }

  function buildPeople() {
    var right = rows[1], left = rows[0], k;
    [[2.3, 1.15], [2.3, 1.3], [3.6, 1.05], [3.6, 1.25], [5, 1.2], [5, 1.4]].forEach(function (w) {
      person("walk", { walk: walk(street(right, w[0]), w[1]) });
    });
    [[2.2, 1.1], [3.4, 1.3]].forEach(function (w) {
      person("walk", { walk: walk(street(left, w[0]), w[1]) });
    });
    // In at one gap, along inside the letters, and out at the next.
    for (k = 0; k + 1 < right.spaces.length; k += 2) {
      var g0 = right.spaces[k], g1 = right.spaces[k + 1];
      var path = [beside(right, g0 - 1.5, 3), beside(right, g0, 0), beside(right, g0, -2.4),
                  beside(right, g1, -2.4), beside(right, g1, 0), beside(right, g1 + 1.5, 3), beside(right, g0 - 1.5, 3)];
      person("walk", { walk: walk(path, 1.1, true) });
      person("walk", { walk: walk(path, 0.95, true) });
    }
    // Two talking, out in front of the end of the left-hand row.
    var corner = beside(left, left.len - 1.5, 3.4);
    var talk = norm(sub(beside(left, left.len, 3.4), corner));
    var face = Math.atan2(talk[0], talk[2]);
    person("stand", { root: corner, yaw: face });
    person("stand", { root: add(corner, scale(talk, 0.9)), yaw: face + Math.PI });

    // The audience, facing the screen.
    face = Math.atan2(-theater.along[0], -theater.along[2]);
    theater.seats.forEach(function (s) {
      [0.3, 0.7].forEach(function (b) {
        var at = add(theater.base, add(scale(theater.along, s[0]), add(scale(theater.back, b), [0, s[1], 0])));
        person("seat", { root: at, yaw: face + spread(-0.2, 0.2), sits: true, place: theater, inside: theater });
      });
    });
    // Diners, in the biggest bubbles.
    [[1, 2], [6, 2], [5, 1], [7, 1]].forEach(function (d) {
      for (var j = 0; j < d[1]; j++) {
        var a = j * Math.PI + spread(0, 1);
        person("dine", { bubble: bubbles[d[0]], inside: bubbles[d[0]], sits: true,
          off: [Math.cos(a) * 0.4, Math.sin(a) * 0.4], yaw: a + Math.PI / 2 });
      }
    });
    houses.forEach(function (h) {
      (h.home || []).forEach(function (spot) { person("home", { house: h, inside: h, spot: spot }); });
    });
    person("tube", { from: 0.1, to: 0.6, speed: 0.9, phase: spread(0, 10), inside: tube });
    person("mouth", { sits: true });
  }

  // --- GL -----------------------------------------------------------------

  var SOLID_VS = [
    "#version 300 es",
    "layout(location = 0) in vec3 aPos;",
    "layout(location = 1) in vec3 aNormal;",
    "uniform mat4 uViewProj;",
    "uniform mat4 uModel;",
    "uniform mat3 uNormalMat;",
    "uniform mat3 uViewRot;",
    "uniform float uWobble;",
    "uniform float uTime;",
    "out vec3 vView;",
    "out vec3 vWorld;",
    "out vec3 vPos;",
    "void main() {",
    "  vec3 p = aPos;",
    "  if (uWobble > 0.0) {",
    "    float w = sin(3.1 * p.x + 1.7 * uTime) * sin(2.7 * p.y + 2.3 * uTime + 1.0)",
    "            * sin(3.3 * p.z + 1.3 * uTime + 2.0);",
    "    p += aNormal * w * uWobble;",
    "  }",
    "  vec3 n = normalize(uNormalMat * aNormal);",
    "  vWorld = n;",
    "  vView = uViewRot * n;",
    "  vec4 world = uModel * vec4(p, 1.0);",
    "  vPos = world.xyz;",
    "  gl_Position = uViewProj * world;",
    "}"
  ].join("\n");

  // uSide keeps what is above uCut (1) or below it (-1), for the sweep
  // from diagram to architecture; the diagram's edge at the cut is inked.
  var SOLID_FS = [
    "#version 300 es",
    "precision highp float;",
    "in vec3 vView;",
    "in vec3 vWorld;",
    "in vec3 vPos;",
    "uniform vec3 uTop, uLeft, uRight, uInner, uInk;",
    "uniform float uId;",
    "uniform bool uHollow;",
    "uniform float uCut;",
    "uniform float uSide;",
    "uniform float uFine;",
    "layout(location = 0) out vec4 outColor;",
    "layout(location = 1) out vec4 outInfo;",
    "void main() {",
    "  float over = (vPos.y - uCut) * uSide;",
    "  if (over < 0.0) discard;",
    "  vec3 n = normalize(vView);",
    "  vec3 w = normalize(vWorld);",
    "  if (!gl_FrontFacing) { n = -n; w = -w; }",
    "  vec3 c = w.y > 0.55 ? uTop : (n.x < 0.0 ? uLeft : uRight);",
    "  if (!gl_FrontFacing && uHollow) c = uInner;",
    "  if (uSide > 0.0 && over < 0.07) c = uInk;",
    "  outColor = vec4(c, 1.0);",
    "  outInfo = vec4(n.xy * 0.5 + 0.5, 1.0 - uFine, uId / 255.0);",
    "}"
  ].join("\n");

  // The line finder. Looks uR pixels each way (or only ahead, on a screen
  // of one pixel to the point, so a line is one pixel wide there too).
  var INK_VS = [
    "#version 300 es",
    "void main() {",
    "  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));",
    "  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);",
    "}"
  ].join("\n");

  var INK_FS = [
    "#version 300 es",
    "precision highp float;",
    "uniform sampler2D uColor, uInfo, uDepth;",
    "uniform int uR;",
    "uniform bool uBoth;",
    "uniform float uRange;",
    "uniform float uCrease;",
    "uniform float uGap;",
    "uniform vec3 uInk;",
    "out vec4 outColor;",
    "vec3 unpack(vec2 e) { vec2 xy = e * 2.0 - 1.0; return vec3(xy, sqrt(max(0.0, 1.0 - dot(xy, xy)))); }",
    "float apart(vec4 a, vec4 b) {",
    "  bool ca = a.a > 0.0, cb = b.a > 0.0;",
    "  if (ca != cb) return 1.0;",
    "  if (!ca) return 0.0;",
    "  if (abs(a.a - b.a) > 0.001) return 1.0;",
    "  if (a.b + b.b > 0.5 && dot(unpack(a.rg), unpack(b.rg)) < uCrease) return 1.0;",
    "  return 0.0;",
    "}",
    "void main() {",
    "  ivec2 p = ivec2(gl_FragCoord.xy);",
    "  ivec2 hi = textureSize(uInfo, 0) - 1;",
    "  ivec2 X = ivec2(uR, 0), Y = ivec2(0, uR);",
    "  ivec2 x1 = min(p + X, hi), x0 = max(p - X, ivec2(0));",
    "  ivec2 y1 = min(p + Y, hi), y0 = max(p - Y, ivec2(0));",
    "  vec4 c = texelFetch(uColor, p, 0);",
    "  vec4 i = texelFetch(uInfo, p, 0);",
    "  vec4 ix1 = texelFetch(uInfo, x1, 0), ix0 = texelFetch(uInfo, x0, 0);",
    "  vec4 iy1 = texelFetch(uInfo, y1, 0), iy0 = texelFetch(uInfo, y0, 0);",
    "  float e = max(apart(i, ix1), apart(i, iy1));",
    "  if (uBoth) e = max(e, max(apart(i, ix0), apart(i, iy0)));",
    "  if (i.a > 0.0 && e < 1.0) {",
    "    float d = texelFetch(uDepth, p, 0).r;",
    "    float dx = texelFetch(uDepth, x1, 0).r + texelFetch(uDepth, x0, 0).r - 2.0 * d;",
    "    float dy = texelFetch(uDepth, y1, 0).r + texelFetch(uDepth, y0, 0).r - 2.0 * d;",
    "    if (ix1.a == i.a && ix0.a == i.a && abs(dx) * uRange > uGap) e = 1.0;",
    "    if (iy1.a == i.a && iy0.a == i.a && abs(dy) * uRange > uGap) e = 1.0;",
    "  }",
    "  float a = max(c.a, e);",
    "  outColor = vec4(mix(c.rgb, uInk, e) * a, a);",
    "}"
  ].join("\n");

  var INK = [0.08, 0.06, 0.06];

  function compile(vs, fs) {
    var prog = gl.createProgram();
    [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(function (pair) {
      var sh = gl.createShader(pair[0]);
      gl.shaderSource(sh, pair[1]);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      gl.attachShader(prog, sh);
    });
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    var u = {}, n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (var k = 0; k < n; k++) {
      var name = gl.getActiveUniform(prog, k).name;
      u[name] = gl.getUniformLocation(prog, name);
    }
    return { prog: prog, u: u };
  }

  var solid, ink, blank;

  function upload(shape) {
    if (shape.vao) return;
    shape.vao = gl.createVertexArray();
    gl.bindVertexArray(shape.vao);
    var usage = shape.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW;
    shape.pb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shape.pb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(shape.p), usage);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    shape.nb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shape.nb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(shape.n), usage);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    var ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(shape.i), gl.STATIC_DRAW);
    shape.count = shape.i.length;
    gl.bindVertexArray(null);
    if (!shape.dynamic) { shape.p = shape.n = shape.i = null; }
  }

  function refill(shape) {
    gl.bindBuffer(gl.ARRAY_BUFFER, shape.pb);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, shape.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, shape.nb);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, shape.n);
  }

  // The three buffers the solids are drawn into.
  var target = { w: 0, h: 0 };

  function texture(internal, format, type, w, h) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  function targets(w, h) {
    if (target.w === w && target.h === h) return;
    if (target.fb) {
      gl.deleteFramebuffer(target.fb);
      [target.color, target.info, target.depth].forEach(function (t) { gl.deleteTexture(t); });
    }
    target.w = w; target.h = h;
    target.color = texture(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, w, h);
    target.info = texture(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, w, h);
    target.depth = texture(gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, w, h);
    target.fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.color, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, target.info, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, target.depth, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // --- The camera ---------------------------------------------------------

  var DEPTH = 80;   // metres either side of the pivot the depth buffer spans
  var view = { az: VIEW.az, el: VIEW.el, zoom: 1 };

  function camera(aspect) {
    var b = basis(view.az, view.el);
    // Fit the still's frame, whatever the canvas's shape.
    var halfH = Math.max(VIEW.h / 2, VIEW.w / 2 / aspect) / VIEW.s / view.zoom;
    var halfW = halfH * aspect;
    var m = new Float32Array(16);
    var rw = [scale(b.r, 1 / halfW), scale(b.u, 1 / halfH), scale(b.e, -1 / DEPTH)];
    for (var k = 0; k < 3; k++) {
      m[k] = rw[k][0]; m[4 + k] = rw[k][1]; m[8 + k] = rw[k][2];
      m[12 + k] = -dot(rw[k], PIVOT);
    }
    m[15] = 1;
    var rot = new Float32Array([b.r[0], b.u[0], b.e[0], b.r[1], b.u[1], b.e[1], b.r[2], b.u[2], b.e[2]]);
    return { viewProj: m, rot: rot };
  }

  // --- Motion -------------------------------------------------------------

  var state = { morph: 0, goal: 0, waves: [], nextWave: 7, nextGulp: 3.5 };

  // How far one body has got from diagram to architecture: lower ones go
  // first, so the change rises from the ground, and falls back from the
  // top on the way back.
  function share(o) { return smooth((state.morph * 1.6 - o.delay) / 1.1); }

  function tubeRadius(s) { return lerp(1.45, 0.98, smooth(s)); }

  function gulp(t) { tube.gulps.push({ t0: t, blown: false }); }

  function blow(f, rad) {
    var fl = floaters.filter(function (o) { return !o.live; })[0];
    if (!fl) return;
    var k = f.n - 1, t = f.tan[k];
    fl.live = true;
    fl.born = clock;
    fl.life = spread(4.5, 7);
    fl.r = spread(0.35, 0.62) * rad[k];
    fl.pos = add(f.pts[k], scale(t, 0.3));
    fl.vel = add(scale(t, 1.8), [0, 0.5, 0]);
    fl.skin.tones = tones(tints(pick(PAL.bubbles)));
  }

  function burst(at, r, color) {
    var n = 8;
    drops.filter(function (o) { return !o.live; }).slice(0, n).forEach(function (d, k) {
      var a = 2 * Math.PI * k / n + spread(0, 0.5), u = spread(-0.3, 0.9);
      var dir = norm([Math.cos(a), u, Math.sin(a)]);
      d.live = true;
      d.born = clock;
      d.pos = add(at, scale(dir, r));
      d.vel = add(scale(dir, spread(2.4, 3.6)), [0, 1.2, 0]);
      d.size = r * spread(0.1, 0.16);
      d.skin.tones = tones([color, color, color]);
    });
  }

  function place(o) {
    o.things.forEach(function (th) {
      if (th.direct) return;
      th.at = add(o.at, apply(o.m, th.lp));
      th.m = times(o.m, th.lm);
    });
  }

  function update(t, dt) {
    var arch = state.goal === 1;
    var step = reduce.matches ? 1 : dt / 2.6;
    state.morph = state.goal > state.morph ? Math.min(state.goal, state.morph + step)
      : Math.max(state.goal, state.morph - step);

    // Bubbles breathe and drift. Clicked, one bursts in the diagram and
    // grows back; in the architecture it shakes.
    bubbles.forEach(function (o) {
      var p = o.phase, f = 1 + 0.045 * Math.sin(t * 1.25 + p);
      var since = t - o.pop, size = 1;
      if (since < 0.1) size = 1 + 1.4 * since;
      else if (since < 1.8) size = 0;
      else if (since < 3) size = elastic((since - 1.8) / 1.2);
      if (since >= 0.1 && since < 1.8 && !o.burst) { o.burst = true; burst(o.at, o.r, o.color); }
      var j = t - o.t0, sq = j > 0 && j < 2 ? 0.16 * Math.sin(j * 13) * Math.exp(-j * 3) : 0;
      o.at = add(o.home, [0.08 * Math.sin(t * 0.7 + p), 0.1 * Math.sin(t * 0.9 + p * 2), 0.08 * Math.cos(t * 0.6 + p)]);
      var r = o.r * f * size;
      o.m = stretch(r * (1 + sq / 2), r * (1 - sq), r * (1 + sq / 2));
      o.lo = o.at[1] - o.r; o.hi = o.at[1] + o.r;
      o.things.forEach(function (th) { th.visible = size > 0.001; });
    });

    // The tube sways, and swallows now and then: a bulge runs down it and
    // a bubble comes out of its mouth.
    if (t > state.nextGulp) { gulp(t); state.nextGulp = t + spread(8, 13); }
    var path = tube.path.map(function (p, k) {
      var sway = Math.sin(t * 0.8 + k * 0.9) * 0.14 * smooth(k / 2);
      return add(p, [sway * 0.6, sway, -sway * 0.5]);
    });
    var f = frames(path), rad = new Array(f.n);
    for (var k = 0; k < f.n; k++) {
      var s = k / (f.n - 1), bulge = 0;
      tube.gulps.forEach(function (g) {
        var at = (t - g.t0) / 2.2 - 0.1;
        bulge += 0.34 * Math.exp(-Math.pow((s - at) / 0.075, 2));
      });
      rad[k] = tubeRadius(s) * (1 + bulge);
    }
    tube.gulps = tube.gulps.filter(function (g) {
      var at = (t - g.t0) / 2.2 - 0.1;
      if (at > 0.98 && !g.blown) { g.blown = true; blow(f, rad); }
      return at < 1.3;
    });
    tube.frames = f; tube.rad = rad;
    tube.len = 0;
    for (k = 1; k < f.n; k++) tube.len += length(sub(f.pts[k], f.pts[k - 1]));
    if (share(tube) < 1) tubeFill(f, rad, tube.skin.shape.p, tube.skin.shape.n);
    if (share(tube) > 0) latticeFill(f, rad, tube.ribs.shape.p, tube.ribs.shape.n);

    // A wave runs along the letters now and then, or from the one clicked.
    if (t > state.nextWave) {
      var l = pick(letters);
      state.waves.push({ row: l.row, from: l.index, t0: t });
      state.nextWave = t + spread(12, 18);
    }
    state.waves = state.waves.filter(function (w) { return t - w.t0 < 3; });
    letters.forEach(function (o) {
      var lift = 0;
      state.waves.forEach(function (w) {
        if (w.row === o.row) lift += 0.9 * hop(t - w.t0 - Math.abs(o.index - w.from) * 0.08, 0.55);
      });
      o.at = add(o.base, [0, lift, 0]);
      o.m = o.frame;
    });

    // The funnels turn a little either way, and all the way round when
    // clicked.
    funnels.forEach(function (o) {
      var a = 7 * DEG * Math.sin(t * 0.23 + o.phase) + 2 * Math.PI * smooth((t - o.spin) / 1.8);
      o.at = o.base;
      o.m = turn(o.axis, a);
    });

    // The theater jumps when clicked in the diagram; in the architecture
    // its audience does, and its screen flickers.
    var q = t - theater.t0, sq = q > 0 && q < 2 ? 0.14 * Math.sin(q * 12) * Math.exp(-q * 3.2) : 0;
    theater.m = stretch(1 + sq / 2, 1 - sq, 1 + sq / 2);
    theater.at = add(theater.base, sub(theater.middle, apply(theater.m, theater.middle)));
    var glow = 0.9 + 0.1 * Math.sin(t * 7) * Math.sin(t * 2.3);
    theater.screen.tones = tones([scale([1, 0.99, 0.95], glow), scale([0.96, 0.94, 0.9], glow), scale([0.92, 0.9, 0.85], glow)]);

    // A house clicked hops, turns and lands.
    houses.forEach(function (o) {
      var h = t - o.t0;
      o.at = add(o.base, [0, 1.3 * hop(h, 0.8), 0]);
      o.m = times(turn(UP, 14 * DEG * hop(h, 0.8)), o.rot);
    });

    // The purple box bobs, and jumps and spins when clicked.
    var pq = t - purple.t0;
    purple.at = add(purple.base, [0, 0.14 * Math.sin(t * 0.9) + 2.6 * hop(pq, 1.2), 0]);
    purple.m = turn(UP, 2 * Math.PI * smooth(pq / 1.2) + 4 * DEG * Math.sin(t * 0.5));

    // Bubbles blown out of the tube float up, wobbling, and burst.
    floaters.forEach(function (o) {
      o.skin.visible = o.live;
      if (!o.live) return;
      var age = t - o.born;
      if (age > o.life) {
        o.live = false;
        o.skin.visible = false;
        burst(o.pos, o.r, o.skin.tones[1]);
        return;
      }
      o.vel = [o.vel[0] * Math.exp(-dt * 0.8) + Math.sin(age * 2.1 + o.life) * 0.25 * dt,
               o.vel[1] + (0.9 - o.vel[1]) * dt * 0.8,
               o.vel[2] * Math.exp(-dt * 0.8) + Math.cos(age * 1.7) * 0.25 * dt];
      o.pos = add(o.pos, scale(o.vel, dt));
      var grow = elastic(age / 0.8), r = o.r * (0.2 + 0.8 * grow);
      o.at = o.pos;
      o.m = stretch(r, r, r);
    });

    drops.forEach(function (o) {
      o.skin.visible = o.live;
      if (!o.live) return;
      var age = t - o.born;
      if (age > 0.8 || o.pos[1] < 0) { o.live = false; o.skin.visible = false; return; }
      o.vel = add(o.vel, [0, -9.8 * dt, 0]);
      o.pos = add(o.pos, scale(o.vel, dt));
      var r = o.size * (1 - age / 0.8);
      o.at = o.pos;
      o.m = stretch(r, r, r);
    });

    bodies.forEach(function (o) {
      if (o.kind !== "person") place(o);
    });
    people.forEach(function (o) { pose(o, t, dt, arch); });

    // The sweep: in each body that changes, the diagram's things are cut
    // away from below and the architecture's grow up in their place.
    bodies.forEach(function (o) {
      var m = share(o), cut = lerp(o.lo - 0.05, o.hi + 0.05, m);
      o.things.forEach(function (th) {
        th.cut = cut;
        th.side = 0;
        th.gone = false;
        if (th.show === "d") {
          if (m >= 1) th.gone = true; else if (m > 0) th.side = 1;
        } else if (th.show === "a") {
          if (m <= 0) th.gone = true; else if (m < 1) th.side = -1;
        }
      });
    });
  }

  // Where each person is and how they stand, and their four parts put
  // there. Walkers step; the seated sit with their legs out in front.
  function pose(o, t, dt, arch) {
    // Indoors, in a room still solid, nobody can be seen: skip them.
    o.hidden = o.inside ? share(o.inside) <= 0 || (o.bubble && !o.bubble.skin.visible) : false;
    o.parts.forEach(function (th) { th.visible = !o.hidden; });
    if (o.hidden) return;
    var root, yaw, walking = false, sits = !!o.sits, lift = 0, dist = 0;
    var w = o.walk;
    if (w) {
      var span = w.loops ? w.total : 2 * w.total;
      var d = (t * w.speed + w.phase) % span, backward = !w.loops && d > w.total;
      if (backward) d = span - d;
      var k = 0;
      while (k < w.pts.length - 2 && d > w.cum[k + 1]) k++;
      var seg = w.cum[k + 1] - w.cum[k] || 1;
      root = mix(w.pts[k], w.pts[k + 1], clamp((d - w.cum[k]) / seg, 0, 1));
      var dir = norm(sub(w.pts[k + 1], w.pts[k]));
      if (backward) dir = scale(dir, -1);
      yaw = Math.atan2(dir[0], dir[2]);
      walking = true;
      dist = t * w.speed + w.phase;
    } else if (o.role === "dine") {
      var b = o.bubble, r = b.m[4];
      root = add(b.at, [o.off[0] * r, FLOOR * r, o.off[1] * r]);
      yaw = o.yaw;
    } else if (o.role === "home") {
      var h = o.house;
      root = add(h.at, apply(h.m, [o.spot[0], o.spot[1], o.spot[2]]));
      yaw = h.yaw + o.spot[3];
      lift = 0.5 * hop(t - h.t0, 0.8);
    } else if (o.role === "tube" || o.role === "mouth") {
      // On the tube's floor: the lowest point of its ring, where it is.
      var f = tube.frames, n = f.n, at = n - 1, back = false;
      if (o.role === "tube") {
        var u = (t * o.speed / (tube.len * (o.to - o.from)) + o.phase) % 2;
        back = u > 1;
        at = lerp(o.from, o.to, back ? 2 - u : u) * (n - 1);
        walking = true;
        dist = t * o.speed;
      }
      var j = Math.min(Math.floor(at), n - 2), fr = at - j;
      var tan = norm(mix(f.tan[j], f.tan[j + 1], fr)), rr = lerp(tube.rad[j], tube.rad[j + 1], fr);
      var down = norm(sub([0, -1, 0], scale(tan, -tan[1])));
      root = add(mix(f.pts[j], f.pts[j + 1], fr), scale(down, rr - 0.06));
      if (o.role === "mouth") root = sub(root, scale(tan, 0.35));
      var flat = norm([tan[0], 0, tan[2]]);
      if (back) flat = scale(flat, -1);
      yaw = Math.atan2(flat[0], flat[2]);
    } else {
      root = o.root;
      yaw = o.yaw;
      if (o.place === theater && arch) lift = 0.45 * hop(t - theater.t0 - (o.stride % 1) * 0.3, 0.5);
    }
    lift += 0.55 * hop(t - o.t0, 0.5);
    // Walkers turn round at the end of their street rather than flip.
    if (walking && o.facing != null && dt > 0) {
      var turnTo = Math.atan2(Math.sin(yaw - o.facing), Math.cos(yaw - o.facing));
      yaw = o.facing + turnTo * Math.min(1, dt * 7);
    }
    o.facing = yaw;
    dress(o, root, yaw, walking ? dist / 0.7 * Math.PI + o.stride : 0, sits, lift);
  }

  function dress(o, root, yaw, stride, sits, lift) {
    var R = turn(UP, yaw), hip = sits ? 0.14 : 0.84;
    var bob = sits ? 0 : Math.abs(Math.sin(stride)) * 0.04;
    var base = add(root, [0, lift + bob, 0]);
    [-1, 1].forEach(function (side, i) {
      var a = sits ? -Math.PI / 2 : Math.sin(stride) * 0.5 * side;
      var L = times(R, turn([1, 0, 0], a));
      var at = add(base, apply(R, [0.1 * side, hip, 0]));
      o.parts[i].at = add(at, apply(L, [0, -0.42, 0]));
      o.parts[i].m = times(L, stretch(0.15, 0.84, 0.17));
    });
    o.parts[2].at = add(base, apply(R, [0, hip + 0.31, 0]));
    o.parts[2].m = times(R, stretch(0.42, 0.62, 0.24));
    o.parts[3].at = add(base, [0, hip + 0.79, 0]);
    o.parts[3].m = stretch(0.15, 0.16, 0.15);
  }

  // --- Drawing -------------------------------------------------------------

  var model = new Float32Array(16), normal9 = new Float32Array(9);

  function draw(t) {
    var w = canvas.width, h = canvas.height;
    targets(w, h);
    var cam = camera(w / h);

    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
    gl.viewport(0, 0, w, h);
    gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]);
    gl.clearBufferfv(gl.COLOR, 1, [0, 0, 0, 0]);
    gl.clearBufferfv(gl.DEPTH, 0, [1]);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.useProgram(solid.prog);
    gl.uniformMatrix4fv(solid.u.uViewProj, false, cam.viewProj);
    gl.uniformMatrix3fv(solid.u.uViewRot, false, cam.rot);
    gl.uniform1f(solid.u.uTime, t);
    gl.uniform3fv(solid.u.uInk, INK);

    things.forEach(function (o) {
      if (!o.visible || o.gone) return;
      upload(o.shape);
      if (o.shape.dynamic) refill(o.shape);
      var m = o.m, at = o.at;
      model[0] = m[0]; model[1] = m[1]; model[2] = m[2];
      model[4] = m[3]; model[5] = m[4]; model[6] = m[5];
      model[8] = m[6]; model[9] = m[7]; model[10] = m[8];
      model[12] = at[0]; model[13] = at[1]; model[14] = at[2]; model[15] = 1;
      // A pose that mirrors (the traced boxes can) turns every triangle over.
      gl.frontFace(det(m) < 0 ? gl.CW : gl.CCW);
      var nm = normalMatrix(m);
      for (var k = 0; k < 9; k++) normal9[k] = nm[k];
      gl.uniformMatrix4fv(solid.u.uModel, false, model);
      gl.uniformMatrix3fv(solid.u.uNormalMat, false, normal9);
      gl.uniform3fv(solid.u.uTop, o.tones[0]);
      gl.uniform3fv(solid.u.uLeft, o.tones[1]);
      gl.uniform3fv(solid.u.uRight, o.tones[2]);
      gl.uniform3fv(solid.u.uInner, o.tones[3]);
      gl.uniform1f(solid.u.uId, o.id);
      gl.uniform1i(solid.u.uHollow, o.hollow ? 1 : 0);
      gl.uniform1f(solid.u.uWobble, o.wobble);
      gl.uniform1f(solid.u.uCut, o.cut);
      gl.uniform1f(solid.u.uSide, o.side);
      gl.uniform1f(solid.u.uFine, o.fine ? 1 : 0);
      gl.bindVertexArray(o.shape.vao);
      gl.drawElements(gl.TRIANGLES, o.shape.count, gl.UNSIGNED_INT, 0);
    });
    gl.bindVertexArray(null);
    gl.frontFace(gl.CCW);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.DEPTH_TEST);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(ink.prog);
    [target.color, target.info, target.depth].forEach(function (tex, k) {
      gl.activeTexture(gl.TEXTURE0 + k);
      gl.bindTexture(gl.TEXTURE_2D, tex);
    });
    gl.uniform1i(ink.u.uColor, 0);
    gl.uniform1i(ink.u.uInfo, 1);
    gl.uniform1i(ink.u.uDepth, 2);
    gl.uniform1i(ink.u.uR, 1);
    gl.uniform1i(ink.u.uBoth, ratio >= 1.5 ? 1 : 0);
    gl.uniform1f(ink.u.uRange, DEPTH * 2);
    gl.uniform1f(ink.u.uCrease, Math.cos(40 * DEG));
    gl.uniform1f(ink.u.uGap, 0.3);
    gl.uniform3fv(ink.u.uInk, INK);
    gl.bindVertexArray(blank);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  // What is under a point on the canvas: its id, read back from the last
  // frame's buffer, and the body it belongs to.
  var probe = new Uint8Array(4);

  function under(x, y) {
    if (!target.fb) return null;
    var rect = canvas.getBoundingClientRect();
    var px = Math.floor((x - rect.left) * canvas.width / rect.width);
    var py = canvas.height - 1 - Math.floor((y - rect.top) * canvas.height / rect.height);
    if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) return null;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, target.fb);
    gl.readBuffer(gl.COLOR_ATTACHMENT1);
    gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probe);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    return owner[probe[3]] || null;
  }

  // A click sets off whatever it lands on.
  function react(o) {
    var t = clock, arch = state.goal === 1;
    switch (o.kind) {
      case "bubble":
        if (arch) o.t0 = t;
        else if (t - o.pop > 3) { o.pop = t; o.burst = false; }
        break;
      case "floater": o.born = t - o.life - 1; break;
      case "tube": gulp(t); break;
      case "letter": state.waves.push({ row: o.row, from: o.index, t0: t }); break;
      case "funnel": if (t - o.spin > 1.8) o.spin = t; break;
      default: o.t0 = t;
    }
    if (o.kind === "bubble" && arch) {
      people.forEach(function (p) { if (p.bubble === o) p.t0 = t; });
    }
  }

  // --- Size and the frame loop -----------------------------------------------

  var ratio = 1;

  function resize() {
    var cw = stage.clientWidth, ch = stage.clientHeight;
    ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(5e6 / Math.max(1, cw * ch)));
    var w = Math.max(1, Math.round(cw * ratio)), h = Math.max(1, Math.round(ch * ratio));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  var clock = 0, last = 0, running = false, seen = false, dead = false;

  // The view: held where a drag leaves it, then eased back to the
  // drawing's own, swaying a little round it when nobody is holding it.
  // In full screen it stays where it is put.
  var hold = { on: false, until: 0 };

  function steer(dt) {
    if (hold.on || full || clock < hold.until) return;
    var k = 1 - Math.exp(-dt * 1.6);
    var az = VIEW.az + 3.5 * DEG * Math.sin(clock * 0.21) * smooth(clock / 6);
    var el = VIEW.el + 1.2 * DEG * Math.sin(clock * 0.13) * smooth(clock / 6);
    view.az += (az - view.az) * k;
    view.el += (el - view.el) * k;
    view.zoom += (1 - view.zoom) * k;
  }

  function frame(now) {
    if (!running || dead) return;
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    if (!reduce.matches) clock += dt;
    else if (!hold.on) hold.until = 0;
    var was = [view.az, view.el, view.zoom, state.morph];
    steer(dt);
    update(clock, reduce.matches ? 0 : dt);
    resize();
    draw(clock);
    // Held still, it sleeps once nothing is left moving; a hand wakes it.
    if (reduce.matches && !hold.on && Math.abs(was[0] - view.az) + Math.abs(was[1] - view.el) +
        Math.abs(was[2] - view.zoom) < 1e-4 && was[3] === state.morph) {
      running = false;
      return;
    }
    requestAnimationFrame(frame);
  }

  function start() {
    if (running || dead) return;
    running = true;
    last = 0;
    requestAnimationFrame(frame);
  }

  function stop() { running = false; }

  try {
    solid = compile(SOLID_VS, SOLID_FS);
    ink = compile(INK_VS, INK_FS);
  } catch (err) {
    return;   // the still stays
  }

  // --- Controls -------------------------------------------------------------
  // A switch for diagram or architecture, a button for full screen, and a
  // line saying what a hand can do. Made here, before app.js runs, so its
  // fitLabels() sizes these buttons with the rest.

  var full = false, fullscreened = false;
  var controls = document.createElement("div");
  controls.className = "live-controls";
  var modes = document.createElement("div");
  modes.className = "switch";
  modes.setAttribute("role", "group");
  modes.setAttribute("aria-label", "Show it as");
  var modeButtons = ["Diagram", "Architecture"].map(function (label, k) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.setAttribute("aria-pressed", String(k === 0));
    b.addEventListener("click", function () {
      state.goal = k;
      modeButtons.forEach(function (x, j) { x.setAttribute("aria-pressed", String(j === k)); });
      start();
    });
    modes.appendChild(b);
    return b;
  });
  var size = document.createElement("div");
  size.className = "switch";
  var bigButton = document.createElement("button");
  bigButton.type = "button";
  bigButton.textContent = "Full screen";
  bigButton.setAttribute("aria-pressed", "false");
  size.appendChild(bigButton);
  controls.appendChild(modes);
  controls.appendChild(size);
  var hint = document.createElement("p");
  hint.className = "live-hint";

  function say() {
    var hand = touch.matches ? "Tap" : "Click";
    hint.textContent = full
      ? (touch.matches ? "Drag to turn it, pinch to zoom. " : "Drag to turn it, scroll to zoom. ") + hand + " anything to set it off."
      : (touch.matches ? "Drag sideways to turn it. " : "Drag to turn it. ") + hand + " anything to set it off.";
  }

  function enlarge(on) {
    if (on === full) return;
    full = on;
    figure.classList.toggle("full", on);
    document.documentElement.classList.toggle("live-full", on);
    bigButton.textContent = on ? "Close" : "Full screen";
    bigButton.setAttribute("aria-pressed", String(on));
    if (on && figure.requestFullscreen && !touch.matches) {
      figure.requestFullscreen().then(function () { fullscreened = true; }, function () {});
    }
    if (!on && fullscreened) {
      fullscreened = false;
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    }
    if (!on) hold.until = clock + 0.3;
    say();
    resize();
    start();
    canvas.focus({ preventScroll: true });
  }

  bigButton.addEventListener("click", function () { enlarge(!full); });
  document.addEventListener("fullscreenchange", function () {
    if (!document.fullscreenElement && fullscreened) { fullscreened = false; enlarge(false); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && full) enlarge(false);
  });

  // --- Hands ---------------------------------------------------------------

  var pointers = {}, press = null, lastHover = 0;

  function spread2() {
    var ids = Object.keys(pointers);
    if (ids.length < 2) return 0;
    var a = pointers[ids[0]], b = pointers[ids[1]];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  canvas.addEventListener("pointerdown", function (e) {
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (Object.keys(pointers).length === 1) {
      press = { x: e.clientX, y: e.clientY, moved: 0, type: e.pointerType };
    } else {
      press = null;
      hold.pinch = spread2();
      hold.zoom = view.zoom;
    }
    hold.on = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    start();
  });

  canvas.addEventListener("pointermove", function (e) {
    var p = pointers[e.pointerId];
    if (!p) {
      // Hovering: the hand shows where a click would do something.
      if (e.pointerType === "mouse" && performance.now() - lastHover > 90) {
        lastHover = performance.now();
        canvas.style.cursor = under(e.clientX, e.clientY) ? "pointer" : "";
      }
      return;
    }
    var dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (Object.keys(pointers).length > 1) {
      if (full && hold.pinch) view.zoom = clamp(hold.zoom * spread2() / hold.pinch, 0.6, 5);
      return;
    }
    if (press) press.moved += Math.abs(dx) + Math.abs(dy);
    var turnBy = 0.36 * DEG * 800 / Math.max(stage.clientWidth, 400);
    view.az -= dx * turnBy;
    if (full || e.pointerType === "mouse") view.el = clamp(view.el + dy * turnBy * 0.7, 4 * DEG, 88 * DEG);
  });

  function release(e, click) {
    delete pointers[e.pointerId];
    if (click && press && press.moved < 6) {
      var o = under(e.clientX, e.clientY);
      if (o) react(o);
    }
    if (!Object.keys(pointers).length) {
      hold.on = false;
      hold.until = clock + (reduce.matches ? 0 : 1.6);
      press = null;
    }
  }

  canvas.addEventListener("pointerup", function (e) { release(e, true); });
  canvas.addEventListener("pointercancel", function (e) { release(e, false); });
  canvas.addEventListener("dblclick", function () {
    view.az = VIEW.az; view.el = VIEW.el; view.zoom = 1;
  });
  canvas.addEventListener("wheel", function (e) {
    if (!full) return;
    e.preventDefault();
    view.zoom = clamp(view.zoom * Math.exp(-e.deltaY * 0.0015), 0.6, 5);
  }, { passive: false });

  canvas.tabIndex = 0;
  canvas.addEventListener("keydown", function (e) {
    var k = e.key, done = true;
    if (k === "ArrowLeft") view.az += 8 * DEG;
    else if (k === "ArrowRight") view.az -= 8 * DEG;
    else if (k === "ArrowUp") view.el = clamp(view.el + 5 * DEG, 4 * DEG, 88 * DEG);
    else if (k === "ArrowDown") view.el = clamp(view.el - 5 * DEG, 4 * DEG, 88 * DEG);
    else if (k === "+" || k === "=") view.zoom = clamp(view.zoom * 1.2, 0.6, 5);
    else if (k === "-") view.zoom = clamp(view.zoom / 1.2, 0.6, 5);
    else if (k === "Enter" || k === " ") gulp(clock);
    else done = false;
    if (done) {
      e.preventDefault();
      hold.until = clock + 3;
      start();
    }
  });

  // --- Set up ---------------------------------------------------------------

  blank = gl.createVertexArray();
  build();
  update(0, 0);
  orient(tube.skin.shape);
  latticeFill(tube.frames, tube.rad, tube.ribs.shape.p, tube.ribs.shape.n);
  orient(tube.ribs.shape);
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", (still && still.alt ? still.alt + ". " : "") +
    "Drawn live: the bubbles breathe, the tube sways, and people walk past the letters. " +
    "Arrow keys turn it, Enter makes the tube blow a bubble.");
  stage.appendChild(canvas);
  figure.appendChild(controls);
  figure.appendChild(hint);
  say();
  resize();
  draw(0);
  figure.classList.add("on");
  if (still) still.setAttribute("aria-hidden", "true");

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      seen = entries[0].isIntersecting;
      if (seen && !document.hidden) start(); else stop();
    }).observe(figure);
  } else {
    seen = true;
    start();
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else if (seen || full) start();
  });
  if ("ResizeObserver" in window) {
    new ResizeObserver(function () { if (seen || full) start(); }).observe(stage);
  }
  if (touch.addEventListener) touch.addEventListener("change", say);

  // If the browser takes the GPU back (a phone putting the tab away can),
  // the still comes back and stays.
  canvas.addEventListener("webglcontextlost", function (e) {
    e.preventDefault();
    dead = true;
    enlarge(false);
    figure.classList.remove("on");
    if (still) still.removeAttribute("aria-hidden");
    controls.remove();
    hint.remove();
    canvas.remove();
  });
})();
