// The house at the top of About: an axonometric of one room riding out a
// city's hottest week, with the power on or cut. house.html (in content/)
// is the markup and style; this is the model, the drawing and the chart.
//
// The model is a stand-in. Two heat stores, the air and the mass of the
// room, are stepped every two minutes through a synthetic hot week (the
// Table 1 weeks of the thesis, typed-in highs and lows, clear-sky sun). It
// moves the right way and roughly the right amount, and it is meant to be
// replaced by a surrogate trained on EnergyPlus runs: simulate(p) is the
// only thing that would change, so long as it returns the same arrays.
//
// The drawing is all line, in the page's ink, except the air: a canvas
// under the SVG, clipped to the room, painted from the air temperature at
// the playhead, warmer at the ceiling, drifting with noise, and streaked
// by outdoor air when the windows are open or by the cooling when it runs.
(function () {
  var fig = document.querySelector(".house");
  if (!fig) return;

  var SVG = "http://www.w3.org/2000/svg";
  var still = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ---------------------------------------------------------------- climate

  // The thesis's hot weeks (Table 1). Highs and lows are typed in for each
  // day; the ground is the slab's late-summer temperature; clear is how much
  // of the clear-sky sun gets through.
  var CITIES = {
    DC:      { lat: 38.9, doy: 208, start: "Jul 27", ground: 19, clear: 0.82,
               hi: [33, 34, 36, 37, 38, 36, 34], lo: [23, 24, 25, 26, 27, 26, 25] },
    Miami:   { lat: 25.8, doy: 235, start: "Aug 23", ground: 27, clear: 0.74,
               hi: [32, 33, 33, 34, 34, 33, 33], lo: [27, 27, 28, 28, 28, 28, 27] },
    Austin:  { lat: 30.3, doy: 206, start: "Jul 25", ground: 25, clear: 0.88,
               hi: [37, 38, 39, 40, 41, 39, 38], lo: [25, 26, 26, 27, 27, 26, 26] },
    Phoenix: { lat: 33.4, doy: 217, start: "Aug 5", ground: 29, clear: 0.97,
               hi: [42, 43, 45, 46, 46, 44, 43], lo: [30, 31, 32, 33, 33, 32, 31] }
  };
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  function dateOf(city, day) {
    var bits = CITIES[city].start.split(" ");
    var m = MONTHS.indexOf(bits[0]), d = +bits[1] + day;
    if (d > DAYS[m]) { d -= DAYS[m]; m += 1; }
    return MONTHS[m] + " " + d;
  }

  var RAD = Math.PI / 180;

  // Sun altitude and azimuth (degrees, azimuth clockwise from north) at a
  // solar hour on a day of the year.
  function sun(lat, doy, hour) {
    var decl = 23.44 * Math.sin(RAD * 360 / 365 * (doy - 81));
    var ha = 15 * (hour - 12);
    var sa = Math.sin(lat * RAD) * Math.sin(decl * RAD) +
             Math.cos(lat * RAD) * Math.cos(decl * RAD) * Math.cos(ha * RAD);
    var alt = Math.asin(sa);
    var cz = (Math.sin(decl * RAD) - Math.sin(alt) * Math.sin(lat * RAD)) /
             (Math.cos(alt) * Math.cos(lat * RAD));
    var az = Math.acos(Math.max(-1, Math.min(1, cz))) / RAD;
    if (ha > 0) az = 360 - az;
    return { alt: alt / RAD, az: az };
  }

  // Outdoor air at an hour of the week: lowest at 6, highest at 15.
  function outdoor(c, t) {
    var day = Math.min(6, Math.floor(t / 24)), h = t - day * 24;
    var hi = c.hi[day], lo, f;
    if (h < 6) {           // falling from yesterday's high to today's low
      var prev = c.hi[Math.max(0, day - 1)];
      lo = c.lo[day];
      f = (h + 9) / 15;
      return prev - (prev - lo) * (1 - Math.cos(Math.PI * f)) / 2;
    }
    if (h < 15) {
      lo = c.lo[day];
      f = (h - 6) / 9;
      return lo + (hi - lo) * (1 - Math.cos(Math.PI * f)) / 2;
    }
    lo = c.lo[Math.min(6, day + 1)];
    f = (h - 15) / 15;
    return hi - (hi - lo) * (1 - Math.cos(Math.PI * f)) / 2;
  }

  // ------------------------------------------------------------------ house

  var L = 10, D = 7, H = 2.8, ROOF = 0.3;     // m: long side, short side, wall, roof plate
  var FLOOR = { Raised: 0.8, Grade: 0, Sunken: -0.6 };
  var WALL = {          // U (W/m²K), heat capacity seen by the room (kJ/m²K), share of it on the mass
    Frame: { u: 0.30, c: 15,  link: 0.2 },
    Block: { u: 0.45, c: 120, link: 0.7 },
    Earth: { u: 0.75, c: 260, link: 0.9 }
  };
  var FACES = { N: 0, E: 90, S: 180, W: 270 };

  // The windows of each wall, in the wall's own frame: u along it from its
  // left end seen from outside, v up from the floor. Wall 0 is the front,
  // the one with the big windows; then round anticlockwise seen from above.
  function windows(p) {
    var big = p.glass === "Large"
      ? [[1.2, 4.4, 0.6, 2.3], [5.6, 8.8, 0.6, 2.3]]
      : [[1.8, 3.2, 0.9, 2.3], [6.8, 8.2, 0.9, 2.3]];
    return [big, [[2.9, 4.1, 1.1, 2.3]], [[2.0, 3.2, 1.1, 2.3], [6.8, 8.0, 1.1, 2.3]], [[2.9, 4.1, 1.1, 2.3]]];
  }

  // The four walls as [start, end] corners in the house's own frame (x
  // along the front, y back from it), each with its outward normal.
  var WALLS = [
    { a: [-L / 2, -D / 2], b: [L / 2, -D / 2], n: [0, -1], len: L },
    { a: [L / 2, -D / 2], b: [L / 2, D / 2], n: [1, 0], len: D },
    { a: [L / 2, D / 2], b: [-L / 2, D / 2], n: [0, 1], len: L },
    { a: [-L / 2, D / 2], b: [-L / 2, -D / 2], n: [-1, 0], len: D }
  ];

  // ------------------------------------------------------------------ model

  var SETPOINT = 24.5, COP = 3, DT = 120;
  var PER_HOUR = 3600 / DT, STEPS = 168 * PER_HOUR;

  // The weather and the sun for a city at every step of the week, worked
  // out once: the outdoor air, sun on the roof, and for each way a wall
  // can face (N, E, S, W) the beam on it and the tangent of the sun's
  // profile angle, which says how far an overhang's shadow falls. The
  // design only changes what is done with these, so a run is arithmetic.
  var WEATHER = {};
  function weather(city) {
    if (WEATHER[city]) return WEATHER[city];
    var c = CITIES[city];
    var w = { to: new Float64Array(STEPS), ghi: new Float64Array(STEPS), dhi: new Float64Array(STEPS),
              beam: [], prof: [] };
    for (var j = 0; j < 4; j++) { w.beam.push(new Float64Array(STEPS)); w.prof.push(new Float64Array(STEPS)); }
    for (var k = 0; k < STEPS; k++) {
      var t = k / PER_HOUR;
      w.to[k] = outdoor(c, t);
      var s = sun(c.lat, c.doy + Math.floor(t / 24), t % 24);
      if (s.alt <= 0) continue;
      var sa = Math.sin(s.alt * RAD);
      var dni = 900 * c.clear * Math.exp(-0.14 / Math.max(0.05, sa));
      w.dhi[k] = 60 + 140 * (1 - c.clear) + 40 * sa;
      w.ghi[k] = dni * sa + w.dhi[k];
      for (j = 0; j < 4; j++) {
        var dAz = (s.az - j * 90) * RAD;
        var cosi = Math.cos(s.alt * RAD) * Math.cos(dAz);
        w.beam[j][k] = cosi > 0 ? dni * cosi : 0;
        w.prof[j][k] = Math.tan(s.alt * RAD) / Math.max(0.02, Math.cos(dAz));
      }
    }
    return (WEATHER[city] = w);
  }

  // One week, hour by hour, for both power states. Returns outdoor, indoor
  // with the power off and on, the electricity the cooling draws (kW), and
  // whether the windows are open, for each of 168 hours.
  function simulate(p) {
    var c = CITIES[p.city], wall = WALL[p.walls], w = weather(p.city);
    var wins = windows(p);
    var area = L * D, vol = area * H;
    var z0 = FLOOR[p.floor];
    var buried = z0 < 0 ? -z0 / H : 0;     // share of the walls below ground
    var turn = FACES[p.faces] / 90;        // the front wall faces this way, in quarters

    var glass = wins.map(function (ws) {
      return ws.reduce(function (s, q) { return s + (q[1] - q[0]) * (q[3] - q[2]); }, 0);
    });
    var glassArea = glass.reduce(function (a, b) { return a + b; }, 0);
    var wallArea = 2 * (L + D) * H - glassArea;
    var above = wallArea * (1 - buried), below = wallArea * buried;

    var UA = {
      glass: 2.0 * glassArea,
      wall: wall.u * above,
      roof: 0.18 * area,
      floor: (p.floor === "Raised" ? 0.35 : 0.5) * area,
      below: 0.6 * below,
      leak: 0.35 * vol / 3600 * 1200,
      open: 6 * vol / 3600 * 1200
    };
    var Ca = vol * 1200 * 4;   // the air and the furniture in it
    var Cm = 1000 * ((p.floor === "Raised" ? 20 : 150) * area + wall.c * wallArea + 40 * area);
    var Ham = 3.5 * (area * 2 + wallArea);
    var roofAbs = p.roof === "Cool" ? 0.3 : 0.9;
    var shade = 1 - 0.35 * Math.min(1, p.overhang / 1.5);

    function isOpen(h) {
      if (p.windows === "Day") return h >= 8 && h < 19;
      if (p.windows === "Night") return h < 8 || h >= 19;
      return false;
    }

    // Sun through the glass, and on the walls, at every step: the same
    // for both runs, so worked out once. The overhang shades the top of
    // each window; the head is 0.5 m under it.
    var gGlass = new Float64Array(STEPS), gWall = new Float64Array(STEPS);
    var opens = new Uint8Array(24 * PER_HOUR), byDay = p.shutters === "Shut by day";
    for (var k = 0; k < STEPS; k++) {
      var h = (k % (24 * PER_HOUR)) / PER_HOUR;
      if (k < 24 * PER_HOUR) opens[k] = isOpen(h) ? 1 : 0;
      if (!w.ghi[k]) continue;
      var dhi = w.dhi[k], diffuse = 0.5 * dhi * shade + 0.1 * w.ghi[k], q = 0, v = 0;
      for (var i = 0; i < 4; i++) {
        var j = (turn + i) % 4, beam = w.beam[j][k], lit = 1;
        if (beam > 0 && p.overhang > 0) {
          var tall = wins[i][0][3] - wins[i][0][2];
          lit = 1 - Math.max(0, Math.min(1, (p.overhang * w.prof[j][k] - 0.5) / tall));
        }
        q += glass[i] * 0.5 * (beam * lit + diffuse);
        v += (beam + 0.5 * dhi) / 4;
      }
      gGlass[k] = byDay && h >= 8 && h < 18 ? q * 0.15 : q;
      gWall[k] = v;
    }

    function run(power, Ta, Tm, from, to, keep) {
      var out = keep ? { tin: [], kw: [] } : null;
      var sumT = 0, sumQ = 0;
      for (var k = from; k < to; k++) {
        var To = w.to[k], g = gGlass[k];
        var tsaRoof = To + roofAbs * w.ghi[k] / 20 - 3;
        var tsaWall = To + 0.6 * gWall[k] / 20;
        var tFloor = p.floor === "Raised" ? To - 1 : c.ground;
        // With the cooling on, the windows open on schedule only when the
        // air outside is cooler than in.
        var vent = opens[k % (24 * PER_HOUR)] && (!power || To < Ta) ? UA.open : UA.leak;
        var people = power ? 500 : 250;

        var qa = (UA.glass + vent) * (To - Ta) +
                 UA.wall * (1 - wall.link) * (tsaWall - Ta) +
                 UA.roof * 0.6 * (tsaRoof - Ta) +
                 Ham * (Tm - Ta) + 0.3 * g + 0.5 * people;
        var qm = UA.wall * wall.link * (tsaWall - Tm) +
                 UA.roof * 0.4 * (tsaRoof - Tm) +
                 UA.floor * (tFloor - Tm) + UA.below * (c.ground - Tm) +
                 Ham * (Ta - Tm) + 0.7 * g + 0.5 * people;

        var next = Ta + DT * qa / Ca, cool = 0;
        if (power && next > SETPOINT) {
          cool = (next - SETPOINT) * Ca / DT;
          next = SETPOINT;
        }
        Ta = next;
        Tm += DT * qm / Cm;
        if (keep) {
          sumT += Ta; sumQ += cool;
          if ((k - from) % PER_HOUR === PER_HOUR - 1) {
            out.tin.push(sumT / PER_HOUR);
            out.kw.push(sumQ / PER_HOUR / COP / 1000);
            sumT = 0; sumQ = 0;
          }
        }
      }
      return keep ? out : [Ta, Tm];
    }

    // Three days of the first day's weather with the power on, to settle
    // the mass; the cut, if there is one, comes at midnight.
    var s = [SETPOINT, SETPOINT];
    for (var n = 0; n < 3; n++) s = run(true, s[0], s[1], 0, 24 * PER_HOUR, false);
    var off = run(false, s[0], s[1], 0, STEPS, true);
    var on = run(true, s[0], s[1], 0, STEPS, true);

    var tout = [], open = [];
    for (var hr = 0; hr < 168; hr++) {
      tout.push(outdoor(c, hr + 0.5));
      open.push(isOpen(hr % 24));
    }
    return { tout: tout, off: off.tin, on: on.tin, kw: on.kw, open: open };
  }

  function score(r) {
    var hot = 0, peak = -99, kwh = 0, peakKw = 0, dh = 0;
    for (var i = 0; i < 168; i++) {
      if (r.off[i] > 32) hot++;
      peak = Math.max(peak, r.off[i]);
      dh += Math.max(0, r.off[i] - 26);
      kwh += r.kw[i];
      peakKw = Math.max(peakKw, r.kw[i]);
    }
    return { hot: hot, peak: peak, kwh: kwh, peakKw: peakKw, dh: dh };
  }

  // ------------------------------------------------------------------ state

  var START = {
    power: "Off", city: "Austin", faces: "W", glass: "Large", walls: "Frame",
    roof: "Dark", floor: "Grade", shutters: "Open", windows: "Day", overhang: 0.3
  };
  var p = Object.assign({}, START);
  var result = simulate(p), stats = score(result);

  var view = 38;          // degrees the view is turned round the house
  var EL = 32 * RAD;      // the view's elevation
  var hour = 13;          // the playhead, in hours from the start of the week
  var playing = !still.matches;
  var idleUntil = 0;

  // ------------------------------------------------------------- projection

  var W = 600, HT = 400, CX = 300, CY = 250, S = 21;

  function frame() {
    var a = view * RAD;
    var beta = Math.PI - FACES[p.faces] * RAD;   // house frame to world
    return {
      R: [Math.cos(a), -Math.sin(a), 0],
      U: [Math.sin(a) * Math.sin(EL), Math.cos(a) * Math.sin(EL), Math.cos(EL)],
      C: [0, 0, 0],
      cb: Math.cos(beta), sb: Math.sin(beta)
    };
  }
  var F = frame();

  // House frame to world (x east, y north, z up).
  function world(x, y, z) {
    return [x * F.cb - y * F.sb, x * F.sb + y * F.cb, z];
  }
  function screen(w) {
    return [CX + S * (w[0] * F.R[0] + w[1] * F.R[1]),
            CY - S * (w[0] * F.U[0] + w[1] * F.U[1] + w[2] * F.U[2])];
  }
  function at(x, y, z) { return screen(world(x, y, z)); }
  // Which way the viewer is, so a wall can tell whether it faces them.
  function facing(n) {
    // Toward the camera is R x U, whose level part is (-sin a, -cos a).
    var w = world(n[0], n[1], 0), a = view * RAD;
    return -w[0] * Math.sin(a) - w[1] * Math.cos(a) > 0;
  }

  function pts(list) {
    return list.map(function (q) { return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" ");
  }
  function line(a, b, cls) {
    return '<line class="' + (cls || "") + '" x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) +
           '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '"/>';
  }
  function poly(list, cls) { return '<polygon class="' + (cls || "") + '" points="' + pts(list) + '"/>'; }
  function polyline(list, cls) { return '<polyline class="' + (cls || "") + '" points="' + pts(list) + '"/>'; }

  // A point on wall i at (u along it, v above the floor).
  function onWall(i, u, v, out) {
    var w = WALLS[i], t = u / w.len, o = out || 0;
    var x = w.a[0] + (w.b[0] - w.a[0]) * t + w.n[0] * o;
    var y = w.a[1] + (w.b[1] - w.a[1]) * t + w.n[1] * o;
    return at(x, y, FLOOR[p.floor] + v);
  }

  // The hull of some screen points (gift wrap; there are only a few).
  function hull(ps) {
    ps = ps.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lo = [], up = [];
    ps.forEach(function (q) {
      while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
      lo.push(q);
    });
    for (var i = ps.length - 1; i >= 0; i--) {
      var q = ps[i];
      while (up.length > 1 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
      up.push(q);
    }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }

  // ---------------------------------------------------------------- drawing

  var stage = fig.querySelector(".house-stage");
  var draw = fig.querySelector(".house-draw");
  var canvas = fig.querySelector(".house-air");
  var ctx = canvas.getContext("2d");
  draw.setAttribute("viewBox", "0 0 " + W + " " + HT);

  function hourState(t) {
    var i = Math.max(0, Math.min(167, Math.floor(t)));
    var h = t % 24;
    var c = CITIES[p.city];
    return {
      i: i, h: h,
      sun: sun(c.lat, c.doy + Math.floor(t / 24), h),
      open: result.open[i],
      shut: p.shutters === "Shut by day" && h >= 8 && h < 18,
      cooling: p.power === "On" && result.kw[i] > 0.02,
      tin: p.power === "On" ? result.on[i] : result.off[i],
      tout: result.tout[i]
    };
  }

  // The lines inside a wall that say what it is made of, broken round the
  // windows: boards for the frame, coursing for block, strata for earth.
  function hatch(i, wins, top) {
    var w = WALLS[i], out = [];
    function seg(u0, v0, u1, v1) {
      out.push(line(onWall(i, u0, v0), onWall(i, u1, v1), "mat"));
    }
    // Horizontal runs at height v, skipping windows.
    function across(v) {
      var cuts = wins.filter(function (q) { return v > q[2] && v < q[3]; })
                     .sort(function (a, b) { return a[0] - b[0]; });
      var u = 0;
      cuts.forEach(function (q) { if (q[0] > u) seg(u, v, q[0], v); u = q[1]; });
      if (u < w.len) seg(u, v, w.len, v);
    }
    // Vertical runs at u between v0 and v1, skipping windows.
    function up(u, v0, v1) {
      var cuts = wins.filter(function (q) { return u > q[0] && u < q[1]; })
                     .sort(function (a, b) { return a[2] - b[2]; });
      var v = v0;
      cuts.forEach(function (q) {
        if (q[3] <= v0 || q[2] >= v1) return;
        if (q[2] > v) seg(u, v, u, Math.min(q[2], v1));
        v = Math.max(v, q[3]);
      });
      if (v < v1) seg(u, v, u, v1);
    }
    var bottom = Math.max(0, -FLOOR[p.floor]);
    if (p.walls === "Frame") {
      for (var u = 0.45; u < w.len; u += 0.45) up(u, bottom, top);
    } else if (p.walls === "Block") {
      var row = 0;
      for (var v = bottom + 0.4; v < top; v += 0.4, row++) {
        across(v);
        for (var b = (row % 2) * 0.4 + 0.4; b < w.len; b += 0.8) up(b, v - 0.4, v);
      }
    } else {
      // Earth: strata of uneven depth, the same every time.
      var vs = 0, k = 0;
      while (true) {
        vs += 0.12 + 0.2 * Math.abs(Math.sin(k * 2.7 + 1.3));
        k++;
        if (vs + bottom >= top) break;
        across(vs + bottom);
      }
    }
    return out.join("");
  }

  function render() {
    F = frame();
    var st = hourState(hour);
    var z0 = FLOOR[p.floor], zt = z0 + H, P = p.overhang;
    var wins = windows(p);
    var out = [];

    // Ground: a plate round the house, with north on it.
    var G = 4.5;
    var ground = [at(-L / 2 - G, -D / 2 - G, 0), at(L / 2 + G, -D / 2 - G, 0),
                  at(L / 2 + G, D / 2 + G, 0), at(-L / 2 - G, D / 2 + G, 0)];
    out.push(poly(ground, "ground"));

    // North: an arrow on the ground off the house's corner.
    var nb = world(0, 0, 0), na = [nb[0], nb[1] + 1, 0];
    var base = at(-L / 2 - 2.3, -D / 2 - 2.3, 0);
    var tipW = [na[0] - nb[0], na[1] - nb[1], 0];
    var bw = world(-L / 2 - 2.3, -D / 2 - 2.3, 0);
    var tip = screen([bw[0] + tipW[0] * 1.6, bw[1] + tipW[1] * 1.6, 0]);
    out.push(line(base, tip, "north"));
    out.push('<circle class="north-dot" cx="' + base[0].toFixed(1) + '" cy="' + base[1].toFixed(1) + '" r="2"/>');
    var lab = screen([bw[0] + tipW[0] * 2.3, bw[1] + tipW[1] * 2.3, 0]);
    out.push('<text class="tag" x="' + lab[0].toFixed(1) + '" y="' + (lab[1] + 4).toFixed(1) + '" text-anchor="middle">N</text>');

    // The sun, its path through the day, and the shadow it casts.
    var c = CITIES[p.city], dayStart = Math.floor(hour / 24) * 24;
    var path = [];
    for (var q = 0; q <= 24; q += 0.25) {
      var sq = sun(c.lat, c.doy + Math.floor(hour / 24), q);
      if (sq.alt > 0) path.push(sunPoint(sq, 8.5));
    }
    if (path.length > 1) out.push(polyline(path, "sunpath"));

    if (st.sun.alt > 0) {
      var sv = sunVector(st.sun);
      var top = [];
      [[-L / 2 - P, -D / 2 - P], [L / 2 + P, -D / 2 - P], [L / 2 + P, D / 2 + P], [-L / 2 - P, D / 2 + P]]
        .forEach(function (xy) {
          var w = world(xy[0], xy[1], zt + ROOF);
          var k = w[2] / sv[2];
          top.push(screen([w[0] - sv[0] * k, w[1] - sv[1] * k, 0]));
        });
      [[-L / 2, -D / 2], [L / 2, -D / 2], [L / 2, D / 2], [-L / 2, D / 2]].forEach(function (xy) {
        var w = world(xy[0], xy[1], Math.max(0, z0));
        var k = w[2] / sv[2];
        top.push(screen([w[0] - sv[0] * k, w[1] - sv[1] * k, 0]));
      });
      out.push(poly(hull(top), "shadow"));
    }

    // Piers under a raised floor.
    if (z0 > 0) {
      [[-L / 2, -D / 2], [0, -D / 2], [L / 2, -D / 2], [L / 2, D / 2], [0, D / 2], [-L / 2, D / 2]]
        .forEach(function (xy) { out.push(line(at(xy[0], xy[1], 0), at(xy[0], xy[1], z0), "pier")); });
    }

    // The floor.
    var floor = [at(-L / 2, -D / 2, z0), at(L / 2, -D / 2, z0), at(L / 2, D / 2, z0), at(-L / 2, D / 2, z0)];
    out.push(poly(floor, "floor"));

    // Walls: the ones turned away first, faint; then the near ones, with
    // what they are made of. Glass is seen through, so are the walls.
    var order = [0, 1, 2, 3].sort(function (a, b) { return facing(WALLS[a].n) - facing(WALLS[b].n); });
    order.forEach(function (i) {
      var w = WALLS[i], near = facing(w.n);
      var cls = near ? "wall near" : "wall far";
      out.push('<g class="' + cls + '">');
      out.push(poly([onWall(i, 0, 0), onWall(i, w.len, 0), onWall(i, w.len, H), onWall(i, 0, H)], "face"));
      if (near) out.push(hatch(i, wins[i], H));
      if (near && z0 < 0) {
        // Below grade: the earth against the wall, and the ground line.
        var g0 = onWall(i, 0, -z0, 0), g1 = onWall(i, w.len, -z0, 0);
        out.push(poly([onWall(i, 0, 0, 0.02), onWall(i, w.len, 0, 0.02), g1, g0], "earth"));
        out.push(line(g0, g1, "grade"));
      }
      wins[i].forEach(function (q) {
        var a = onWall(i, q[0], q[2]), b = onWall(i, q[1], q[2]), cc = onWall(i, q[1], q[3]), d = onWall(i, q[0], q[3]);
        out.push(poly([a, b, cc, d], "pane" + (st.open ? " open" : "")));
        var m0 = onWall(i, (q[0] + q[1]) / 2, q[2]), m1 = onWall(i, (q[0] + q[1]) / 2, q[3]);
        out.push(line(m0, m1, "mullion"));
        if (st.shut) {
          for (var v = q[2] + 0.12; v < q[3]; v += 0.14) {
            out.push(line(onWall(i, q[0] - 0.05, v, 0.08), onWall(i, q[1] + 0.05, v, 0.08), "louvre"));
          }
        }
      });
      out.push("</g>");
    });

    // The roof: a plate on the walls, reaching out by the overhang.
    var r0 = [[-L / 2 - P, -D / 2 - P], [L / 2 + P, -D / 2 - P], [L / 2 + P, D / 2 + P], [-L / 2 - P, D / 2 + P]];
    var under = r0.map(function (xy) { return at(xy[0], xy[1], zt); });
    var over = r0.map(function (xy) { return at(xy[0], xy[1], zt + ROOF); });
    out.push(poly(over, "roof"));
    for (var e = 0; e < 4; e++) {
      var n = WALLS[e].n;
      if (facing(n)) {
        var a2 = under[e], b2 = under[(e + 1) % 4];
        out.push(poly([a2, b2, over[(e + 1) % 4], over[e]], "roof-edge"));
      } else {
        out.push(line(under[e], under[(e + 1) % 4], "roof-under"));
      }
    }
    for (e = 0; e < 4; e++) out.push(line(under[e], over[e], "roof-corner"));
    // The roof's colour, as a hatch on its top: dark is dense.
    if (p.roof === "Dark") {
      for (var rx = -L / 2 - P + 0.35; rx < L / 2 + P; rx += 0.35) {
        out.push(line(at(rx, -D / 2 - P, zt + ROOF), at(rx, D / 2 + P, zt + ROOF), "roof-hatch"));
      }
    }

    // Air through open windows, front to back.
    if (st.open) {
      [2.8, 7.2].forEach(function (u) {
        var pth = [onWall(0, u, 1.5, 2.2), onWall(0, u, 1.5, 0)];
        var mid = at(-L / 2 + u, 0, z0 + 1.7);
        var back = WALLS[2], ub = back.len - u;
        pth.push(mid, onWall(2, ub, 1.6, 0), onWall(2, ub, 1.6, 2.2));
        out.push('<path class="breeze" d="M' + pth.map(function (q) { return q[0].toFixed(1) + " " + q[1].toFixed(1); }).join(" L") + '"/>');
        var end = pth[pth.length - 1], pre = pth[pth.length - 2];
        out.push(arrowHead(pre, end));
      });
    }

    // The cooling's outdoor unit, beside the house: its fan turns while it
    // runs; with the power cut it is crossed out.
    var ux = L / 2 + 1.3, uy = D / 2 - 1.2, uz = 0;
    var box = [];
    [[0, 0], [0.8, 0], [0.8, 0.8], [0, 0.8]].forEach(function (d) { box.push([ux + d[0], uy + d[1]]); });
    var bLow = box.map(function (xy) { return at(xy[0], xy[1], uz); });
    var bTop = box.map(function (xy) { return at(xy[0], xy[1], uz + 0.7); });
    out.push('<g class="unit' + (p.power === "On" ? " on" : " off") + (st.cooling ? " running" : "") + '">');
    out.push(poly(bTop, "unit-top"));
    for (var bi = 0; bi < 4; bi++) {
      if (facing(WALLS[bi].n)) out.push(poly([bLow[bi], bLow[(bi + 1) % 4], bTop[(bi + 1) % 4], bTop[bi]], "unit-side"));
    }
    var fc = at(ux + 0.4, uy + 0.4, uz + 0.7);
    out.push('<g class="fan" style="transform-origin:' + fc[0].toFixed(1) + "px " + fc[1].toFixed(1) + 'px">');
    out.push('<ellipse cx="' + fc[0].toFixed(1) + '" cy="' + fc[1].toFixed(1) + '" rx="6" ry="' + (6 * Math.sin(EL)).toFixed(1) + '"/>');
    out.push(line([fc[0] - 6, fc[1]], [fc[0] + 6, fc[1]]));
    out.push(line([fc[0], fc[1] - 6 * Math.sin(EL)], [fc[0], fc[1] + 6 * Math.sin(EL)]));
    out.push("</g>");
    if (p.power === "Off") out.push(line([fc[0] - 9, fc[1] - 9], [fc[0] + 9, fc[1] + 5], "cut"));
    out.push("</g>");

    // The sun itself, last, over everything.
    if (st.sun.alt > 0) {
      var sp = sunPoint(st.sun, 8.5);
      var hc = at(0, 0, zt);
      out.push(line(sp, hc, "ray"));
      out.push('<g class="sun"><circle cx="' + sp[0].toFixed(1) + '" cy="' + sp[1].toFixed(1) + '" r="7"/>');
      for (var ri = 0; ri < 8; ri++) {
        var ang = ri * Math.PI / 4;
        out.push(line([sp[0] + Math.cos(ang) * 10, sp[1] + Math.sin(ang) * 10],
                      [sp[0] + Math.cos(ang) * 14, sp[1] + Math.sin(ang) * 14]));
      }
      out.push("</g>");
    }

    // The overhang's handle: on the middle of the front edge of the roof.
    var hp = at(0, -D / 2 - P, zt + ROOF / 2);
    out.push('<g class="handle" tabindex="0" role="slider" aria-label="Overhang depth" aria-valuemin="0" ' +
             'aria-valuemax="1.5" aria-valuenow="' + P.toFixed(1) + '" aria-valuetext="' + P.toFixed(1) + ' metres">' +
             '<rect x="' + (hp[0] - 5).toFixed(1) + '" y="' + (hp[1] - 5).toFixed(1) + '" width="10" height="10"/>' +
             '<text class="tag" x="' + (hp[0] + 10).toFixed(1) + '" y="' + (hp[1] + 14).toFixed(1) + '">' +
             P.toFixed(1) + ' m</text></g>');

    draw.innerHTML = out.join("");
    room = roomHull();
    flow = flowLine();
    unitAt = at(-L / 2 + 0.6, D / 2 - 0.2, z0 + H - 0.4);
    handle = draw.querySelector(".handle");
  }

  function arrowHead(a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
    dx /= m; dy /= m;
    var l = [b[0] - dx * 7 - dy * 4, b[1] - dy * 7 + dx * 4];
    var r = [b[0] - dx * 7 + dy * 4, b[1] - dy * 7 - dx * 4];
    return polyline([l, b, r], "breeze-head");
  }

  function sunVector(s) {
    var a = s.alt * RAD, z = s.az * RAD;
    return [Math.cos(a) * Math.sin(z), Math.cos(a) * Math.cos(z), Math.sin(a)];
  }
  function sunPoint(s, r) {
    var v = sunVector(s);
    return screen([v[0] * r * 1.0, v[1] * r * 1.0, FLOOR[p.floor] + H + v[2] * r]);
  }

  // ------------------------------------------------------------------ air

  var room = [], flow = null, unitAt = [0, 0], handle = null;
  var GW = 120, GH = 80;
  var field = document.createElement("canvas");
  field.width = GW; field.height = GH;
  var fctx = field.getContext("2d");
  var img = fctx.createImageData(GW, GH);

  function roomHull() {
    var z0 = FLOOR[p.floor], ps = [];
    [[-L / 2, -D / 2], [L / 2, -D / 2], [L / 2, D / 2], [-L / 2, D / 2]].forEach(function (xy) {
      ps.push(at(xy[0], xy[1], z0), at(xy[0], xy[1], z0 + H));
    });
    return hull(ps);
  }
  // The line air takes across the room when the windows are open: from
  // the front wall to the back, on screen.
  function flowLine() {
    var z0 = FLOOR[p.floor];
    return { a: at(0, -D / 2, z0 + 1.4), b: at(0, D / 2, z0 + 1.4) };
  }

  // Smooth value noise, from a fixed table.
  var PERM = [];
  (function () {
    var seed = 7;
    for (var i = 0; i < 256; i++) { seed = (seed * 16807) % 2147483647; PERM.push(seed / 2147483647); }
  })();
  function hash(x, y) { return PERM[((x * 73 + y * 151) & 255 ^ (y * 17)) & 255]; }
  function noise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  // Temperature to colour: blue when cool, through yellow and orange, to red.
  var STOPS = [
    [21, [33, 70, 141]], [24.5, [110, 155, 209]], [27, [252, 199, 71]],
    [30, [242, 124, 56]], [34, [217, 59, 43]], [40, [122, 20, 32]]
  ];
  function tint(t) {
    if (t <= STOPS[0][0]) return STOPS[0][1];
    for (var i = 1; i < STOPS.length; i++) {
      if (t <= STOPS[i][0]) {
        var a = STOPS[i - 1], b = STOPS[i], f = (t - a[0]) / (b[0] - a[0]);
        return [a[1][0] + (b[1][0] - a[1][0]) * f, a[1][1] + (b[1][1] - a[1][1]) * f, a[1][2] + (b[1][2] - a[1][2]) * f];
      }
    }
    return STOPS[STOPS.length - 1][1];
  }

  var clock = 0;
  function paintAir(dt) {
    var st = hourState(hour);
    clock += dt * (st.open ? 2.4 : st.cooling ? 1.6 : 0.6);
    var box = room;
    if (!box.length) return;
    var minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    box.forEach(function (q) { minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]); minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]); });
    var strat = st.open ? 1.2 : st.cooling ? 3 : 2.6;
    var fx = flow.b[0] - flow.a[0], fy = flow.b[1] - flow.a[1], fl = fx * fx + fy * fy;
    var fn = Math.sqrt(fl) || 1;
    var d = img.data, k = 0;
    for (var gy = 0; gy < GH; gy++) {
      var y = gy / (GH - 1) * HT;
      for (var gx = 0; gx < GW; gx++, k += 4) {
        var x = gx / (GW - 1) * W;
        if (x < minX - 10 || x > maxX + 10 || y < minY - 10 || y > maxY + 10) { d[k + 3] = 0; continue; }
        var up = 1 - (y - minY) / (maxY - minY);          // 0 at the floor's lowest, 1 at the top
        // The noise drifts along the breeze when there is one, else rises.
        var sx = x * 0.018, sy = y * 0.018;
        var drift = st.open ? [fx / fn * clock * 0.9, fy / fn * clock * 0.9] : [clock * 0.15, clock * 0.5];
        var n = noise(sx - drift[0], sy - drift[1]) * 0.65 + noise(sx * 2.3 + 11 - drift[0] * 1.7, sy * 2.3 - drift[1] * 1.7) * 0.35;
        var t = st.tin + strat * (up - 0.5) + (n - 0.5) * 3.6;
        // A second, slower noise thins the colour into wisps.
        var wisp = noise(sx * 0.7 + 40 + drift[1] * 0.5, sy * 0.7 - drift[0] * 0.5);
        if (st.open) {
          var s = ((x - flow.a[0]) * fx + (y - flow.a[1]) * fy) / fl;   // 0 at the front wall, 1 at the back
          var mix = Math.exp(-2.2 * Math.max(0, s + 0.1)) * (0.55 + 0.45 * n);
          t += (st.tout - st.tin) * mix;
        }
        if (st.cooling) {
          var ddx = (x - unitAt[0]) / 120, ddy = (y - unitAt[1]) / 90;
          var plume = Math.exp(-(ddx * ddx + ddy * ddy) * 1.6) * (0.6 + 0.8 * n);
          t -= 4.5 * plume;
        }
        var col = tint(t);
        d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 70 + 165 * wisp * wisp;
      }
    }
    fctx.putImageData(img, 0, 0);

    var scale = canvas.width / W;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.save();
    ctx.beginPath();
    box.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
    ctx.closePath();
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.filter = "blur(6px)";
    ctx.drawImage(field, 0, 0, W, HT);
    ctx.filter = "none";
    ctx.restore();
  }

  function size() {
    var r = stage.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.width * HT / W * dpr);
    paintAir(0);
  }

  // ------------------------------------------------------------------ chart

  var plot = fig.querySelector(".house-plot");
  var PW = 600, PH = 230, PL = 34, PR = 8, T0 = 20, T1 = 48, KW = 3;
  var TOP = 8, MID = 150, BOT = 214;
  plot.setAttribute("viewBox", "0 0 " + PW + " " + PH);

  function px(i) { return PL + (PW - PL - PR) * i / 168; }
  function ty(t) { return TOP + (MID - TOP) * (1 - (Math.max(T0, Math.min(T1, t)) - T0) / (T1 - T0)); }
  function ky(k) { return BOT - (BOT - MID - 14) * Math.min(1, k / KW); }

  function chart() {
    var out = [], on = p.power === "On";
    for (var g = T0; g <= T1; g += 4) {
      out.push(line([PL, ty(g)], [PW - PR, ty(g)], "grid"));
      out.push('<text class="axis" x="' + (PL - 6) + '" y="' + (ty(g) + 3.5) + '" text-anchor="end">' + g + "</text>");
    }
    out.push(line([PL, ty(32)], [PW - PR, ty(32)], "mark"));
    out.push('<text class="axis" x="' + (PW - PR) + '" y="' + (ty(32) - 4) + '" text-anchor="end">32 °C</text>');
    for (var dd = 0; dd < 7; dd++) {
      out.push(line([px(dd * 24), TOP], [px(dd * 24), BOT], "day"));
      out.push('<text class="axis" x="' + (px(dd * 24) + 4) + '" y="' + (BOT + 13) + '">' + dateOf(p.city, dd) + "</text>");
    }
    // Cooling, as bars underneath: solid with the power on; hollow, as
    // what it would have cost, with it off.
    var bw = (PW - PL - PR) / 168;
    var bars = [];
    for (var i = 0; i < 168; i++) {
      var k = result.kw[i];
      if (k <= 0.005) continue;
      bars.push('<rect x="' + (px(i) + 0.15).toFixed(2) + '" y="' + ky(k).toFixed(1) + '" width="' + (bw - 0.3).toFixed(2) +
                '" height="' + (BOT - ky(k)).toFixed(1) + '"/>');
    }
    out.push('<g class="bars' + (on ? " live" : "") + '">' + bars.join("") + "</g>");
    out.push('<text class="axis" x="' + (PL - 6) + '" y="' + (ky(KW) + 3.5) + '" text-anchor="end">' + KW + " kW</text>");
    out.push(line([PL, BOT], [PW - PR, BOT], "base"));

    function series(vals, cls) {
      return polyline(vals.map(function (v, i) { return [px(i + 0.5), ty(v)]; }), "series " + cls);
    }
    out.push(series(result.tout, "outdoor"));
    out.push(series(result.off, on ? "ghost" : "live"));
    out.push(series(result.on, on ? "live" : "ghost"));
    out.push('<line class="playhead" x1="0" x2="0" y1="' + TOP + '" y2="' + BOT + '"/>');
    plot.innerHTML = out.join("");
    head = plot.querySelector(".playhead");
    moveHead();
  }
  var head = null;
  function moveHead() {
    if (!head) return;
    var x = px(hour).toFixed(1);
    head.setAttribute("x1", x); head.setAttribute("x2", x);
  }

  // ---------------------------------------------------------------- readout

  var read = {
    hot: fig.querySelector("[data-read=hot]"), peak: fig.querySelector("[data-read=peak]"),
    kwh: fig.querySelector("[data-read=kwh]"), kw: fig.querySelector("[data-read=kw]"),
    now: fig.querySelector(".house-now")
  };
  function readout() {
    read.hot.textContent = stats.hot;
    read.peak.textContent = stats.peak.toFixed(1);
    read.kwh.textContent = Math.round(stats.kwh);
    read.kw.textContent = stats.peakKw.toFixed(1);
    fig.querySelectorAll(".house-stat").forEach(function (s) {
      s.classList.toggle("dim", s.dataset.power !== p.power);
    });
    now();
  }
  function now() {
    var st = hourState(hour), h = Math.floor(st.h);
    var clockText = (h % 12 || 12) + (h < 12 ? " am" : " pm");
    var bits = [dateOf(p.city, Math.floor(hour / 24)) + ", " + clockText,
                "outside " + st.tout.toFixed(1) + " °C", "inside " + st.tin.toFixed(1) + " °C"];
    if (st.cooling) bits.push("cooling " + result.kw[st.i].toFixed(1) + " kW");
    if (st.open) bits.push("windows open");
    read.now.textContent = bits.join(" · ");
  }

  // ---------------------------------------------------------------- control

  function rerun() {
    result = simulate(p);
    stats = score(result);
    render(); chart(); readout(); paintAir(0);
    everyNow();
  }

  function press(group, value) {
    p[group] = value;
    fig.querySelectorAll('[data-set="' + group + '"]').forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.value === value));
    });
  }
  function syncButtons() {
    fig.querySelectorAll("[data-set]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(p[b.dataset.set] === b.dataset.value));
    });
  }

  fig.addEventListener("click", function (e) {
    var b = e.target.closest("[data-set]");
    if (b) { press(b.dataset.set, b.dataset.value); rerun(); return; }
    var act = e.target.closest("[data-act]");
    if (!act) return;
    if (act.dataset.act === "adapt") adapt();
    if (act.dataset.act === "reset") { cancelAdapt(); p = Object.assign({}, START); syncButtons(); rerun(); }
    if (act.dataset.act === "play") {
      playing = !playing;
      act.setAttribute("aria-pressed", String(playing));
      if (playing) wake();
    }
  });

  // Turn the view by dragging the drawing; drag the handle for the overhang.
  var drag = null;
  stage.addEventListener("pointerdown", function (e) {
    if (e.button > 0) return;
    var onHandle = e.target.closest(".handle");
    drag = { x: e.clientX, y: e.clientY, view: view, handle: !!onHandle, P: p.overhang };
    stage.setPointerCapture(e.pointerId);
    if (onHandle) e.preventDefault();
  });
  stage.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var k = W / stage.getBoundingClientRect().width;
    var dx = (e.clientX - drag.x) * k, dy = (e.clientY - drag.y) * k;
    if (drag.handle) {
      // Along the front wall's outward normal, on screen.
      var a = at(0, -D / 2, 0), b = at(0, -D / 2 - 1, 0);
      var nx = b[0] - a[0], ny = b[1] - a[1];
      var P = drag.P + (dx * nx + dy * ny) / (nx * nx + ny * ny);
      p.overhang = Math.round(Math.max(0, Math.min(1.5, P)) * 10) / 10;
      render(); paintAir(0);
    } else {
      view = drag.view - dx * 0.4;
      render(); paintAir(0);
    }
  });
  function endDrag() {
    if (!drag) return;
    var was = drag;
    drag = null;
    if (was.handle && was.P !== p.overhang) rerun();
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  draw.addEventListener("keydown", function (e) {
    var onHandle = e.target.closest && e.target.closest(".handle");
    if (onHandle && (e.key === "ArrowUp" || e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "ArrowLeft")) {
      var step = e.key === "ArrowUp" || e.key === "ArrowRight" ? 0.1 : -0.1;
      p.overhang = Math.round(Math.max(0, Math.min(1.5, p.overhang + step)) * 10) / 10;
      rerun();
      draw.querySelector(".handle").focus();
      e.preventDefault();
    }
  });
  stage.addEventListener("keydown", function (e) {
    if (e.target !== stage) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      view += e.key === "ArrowLeft" ? -10 : 10;
      render(); paintAir(0);
      e.preventDefault();
    }
  });

  // Scrub the week on the chart.
  var scrub = false;
  function scrubTo(e) {
    var r = plot.getBoundingClientRect();
    var x = (e.clientX - r.left) * PW / r.width;
    hour = Math.max(0, Math.min(167.99, (x - PL) / (PW - PL - PR) * 168));
    idleUntil = performance.now() + 5000;
    moveHead(); render(); now(); paintAir(0);
  }
  plot.addEventListener("pointerdown", function (e) { scrub = true; plot.setPointerCapture(e.pointerId); scrubTo(e); });
  plot.addEventListener("pointermove", function (e) { if (scrub) scrubTo(e); });
  plot.addEventListener("pointerup", function () { scrub = false; });
  plot.addEventListener("pointercancel", function () { scrub = false; });
  plot.addEventListener("keydown", function (e) {
    var step = { ArrowLeft: -1, ArrowRight: 1, PageDown: -24, PageUp: 24 }[e.key];
    if (!step) return;
    hour = (hour + step + 168) % 168;
    idleUntil = performance.now() + 5000;
    moveHead(); render(); now(); paintAir(0);
    e.preventDefault();
  });

  // ------------------------------------------------------------------ adapt

  // Let the house change itself: one setting at a time, take whichever
  // option scores best, until nothing helps. With the power cut it chases
  // heat (degree hours over 26 °C); with it on, the electricity. Each
  // change is shown before the next, so the form is seen to move.
  var SPACE = {
    faces: ["N", "E", "S", "W"], glass: ["Small", "Large"], walls: ["Frame", "Block", "Earth"],
    roof: ["Dark", "Cool"], floor: ["Raised", "Grade", "Sunken"], shutters: ["Open", "Shut by day"],
    windows: ["Shut", "Day", "Night"], overhang: [0, 0.3, 0.6, 0.9, 1.2, 1.5]
  };
  var adapting = null;
  function cost(q) {
    var s = score(simulate(q));
    return p.power === "On" ? s.kwh : s.dh;
  }
  function adapt() {
    cancelAdapt();
    var steps = [], q = Object.assign({}, p), best = cost(q);
    for (var round = 0; round < 3; round++) {
      var changed = false;
      Object.keys(SPACE).forEach(function (key) {
        var keep = q[key];
        SPACE[key].forEach(function (v) {
          if (v === q[key]) return;
          var r = Object.assign({}, q);
          r[key] = v;
          var c = cost(r);
          if (c < best - 1e-6) { best = c; keep = v; }
        });
        if (keep !== q[key]) { q[key] = keep; steps.push([key, keep]); changed = true; }
      });
      if (!changed) break;
    }
    var btn = fig.querySelector('[data-act="adapt"]');
    if (!steps.length) { flash(btn, "Already there"); return; }
    btn.setAttribute("aria-pressed", "true");
    adapting = setInterval(function () {
      var s = steps.shift();
      if (!s) { cancelAdapt(); return; }
      if (s[0] === "overhang") p.overhang = s[1];
      else press(s[0], s[1]);
      rerun();
    }, still.matches ? 0 : 650);
  }
  function cancelAdapt() {
    if (adapting) clearInterval(adapting);
    adapting = null;
    var btn = fig.querySelector('[data-act="adapt"]');
    if (btn) btn.setAttribute("aria-pressed", "false");
  }
  function flash(btn, text) {
    var was = btn.textContent;
    btn.textContent = text;
    setTimeout(function () { btn.textContent = was; }, 1400);
  }

  // ------------------------------------------------------------ every house

  // A parallel coordinates plot of a few hundred houses in the chosen city,
  // simulated here as the plot comes into view: one line each, through its
  // settings and on to what it scored, tinted by its hottest hour like the
  // air. Drag along an axis to keep only the lines that cross it there,
  // click the axis to let go; click a line to build that house, which is
  // then the heavy line. With the EnergyPlus sweep this would draw the
  // sweep's own runs.
  var AXES = [
    { key: "faces", name: "Faces", opts: ["N", "E", "S", "W"] },
    { key: "glass", name: "Glass", opts: ["Small", "Large"] },
    { key: "walls", name: "Walls", opts: ["Frame", "Block", "Earth"] },
    { key: "roof", name: "Roof", opts: ["Dark", "Cool"] },
    { key: "floor", name: "Floor", opts: ["Raised", "Grade", "Sunken"], show: ["Raised", "Grade", "Sunk"] },
    { key: "shutters", name: "Shutters", opts: ["Open", "Shut by day"], show: ["Open", "Shut"] },
    { key: "windows", name: "Windows", opts: ["Shut", "Day", "Night"], show: ["Never", "Day", "Night"] },
    { key: "overhang", name: "Overhang", range: [0, 1.5], fmt: function (v) { return v.toFixed(1) + " m"; } },
    { key: "hot", name: "Hours", unit: "over 32 °C", out: "Off", range: [0, 168], fmt: function (v) { return String(Math.round(v)); } },
    { key: "peak", name: "Peak", unit: "°C", out: "Off", range: [26, 54], fmt: function (v) { return String(Math.round(v)); } },
    { key: "kwh", name: "Energy", unit: "kWh", out: "On", range: [0, 220], fmt: function (v) { return String(Math.round(v)); } },
    { key: "peakKw", name: "Peak", unit: "kW", out: "On", range: [0, 2], fmt: function (v) { return v.toFixed(1); } }
  ];
  var SAMPLES = 600;
  var VW = 600, VH = 250, ML = 16, MR = 30, MT = 38, MB = 14;
  var GAP = (VW - ML - MR) / (AXES.length - 1);

  var every = fig.querySelector(".house-every");
  var eCanvas = every.querySelector("canvas"), eCtx = eCanvas.getContext("2d");
  var eSvg = every.querySelector("svg"), eRead = every.querySelector(".house-every-read");
  eSvg.setAttribute("viewBox", "0 0 " + VW + " " + VH);
  var pool = {}, brushes = {}, hover = null, eVisible = false, growing = false;

  function axisX(i) { return ML + i * GAP; }
  // Where a value sits up its axis, 0 at the foot and 1 at the head.
  function frac(a, v) {
    if (a.opts) return 0.1 + 0.8 * a.opts.indexOf(v) / (a.opts.length - 1);
    return Math.max(0, Math.min(1, (v - a.range[0]) / (a.range[1] - a.range[0])));
  }
  function axisY(f) { return MT + (VH - MT - MB) * (1 - f); }
  function valueOf(a, q, s) { return a.out ? s[a.key] : q[a.key]; }

  function ys(q, s, rand) {
    return AXES.map(function (a) {
      var y = axisY(frac(a, valueOf(a, q, s)));
      return a.opts && rand ? y + (rand() - 0.5) * 7 : y;   // a little spread, so a choice reads as a bundle
    });
  }

  // The same houses every time for a city.
  function seeded(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return function () {
      h += 0x6D2B79F5;
      var t = h;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Simulate the city's houses a few at a time, drawing as they come.
  function grow() {
    var city = p.city, set = pool[city];
    if (!set) set = pool[city] = { list: [], rand: seeded(city) };
    if (set.list.length >= SAMPLES || growing) return;
    growing = true;
    (function chunk() {
      if (city !== p.city) { growing = false; grow(); return; }
      var t0 = performance.now();
      while (set.list.length < SAMPLES && performance.now() - t0 < 14) {
        var q = { city: city, power: "Off" };
        AXES.forEach(function (a) {
          if (a.opts) q[a.key] = a.opts[Math.floor(set.rand() * a.opts.length)];
          else if (!a.out) q[a.key] = Math.round(set.rand() * 15) / 10;
        });
        var sc = score(simulate(q));
        set.list.push({ q: q, s: sc, y: ys(q, sc, set.rand) });
      }
      lines(); overlay();
      if (set.list.length < SAMPLES) setTimeout(chunk, 0);
      else growing = false;
    })();
  }

  function kept(item) {
    for (var key in brushes) {
      var i = AXES.findIndex(function (a) { return a.key === key; });
      var b = brushes[key], y = item.y[i];
      if (y < b[0] - 3.5 || y > b[1] + 3.5) return false;
    }
    return true;
  }

  function lines() {
    var r = eCanvas.getBoundingClientRect();
    if (!r.width) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (eCanvas.width !== w || eCanvas.height !== h) { eCanvas.width = w; eCanvas.height = h; }
    var k = w / VW;
    eCtx.setTransform(1, 0, 0, 1, 0, 0);
    eCtx.clearRect(0, 0, w, h);
    eCtx.setTransform(k, 0, 0, k, 0, 0);
    eCtx.lineJoin = "round";
    var set = pool[p.city];
    if (!set) return;
    var ink = getComputedStyle(eSvg).color, on = [], off = [];
    set.list.forEach(function (item) { (kept(item) ? on : off).push(item); });
    function trace(item) {
      eCtx.beginPath();
      item.y.forEach(function (y, i) { if (i) eCtx.lineTo(axisX(i), y); else eCtx.moveTo(axisX(i), y); });
      eCtx.stroke();
    }
    eCtx.lineWidth = 0.75;
    eCtx.strokeStyle = ink;
    eCtx.globalAlpha = 0.05;
    off.forEach(trace);
    // Tinted from the coolest of the city's houses (blue) to the hottest
    // (red), so the colour ranks them; the air's own scale would leave
    // Phoenix all red.
    var lo = Infinity, hi = -Infinity;
    set.list.forEach(function (item) { lo = Math.min(lo, item.s.peak); hi = Math.max(hi, item.s.peak); });
    eCtx.globalAlpha = Object.keys(brushes).length ? 0.55 : 0.32;
    on.sort(function (a, b) { return a.s.peak - b.s.peak; });   // the hottest on top
    on.forEach(function (item) {
      var c = tint(21 + 15 * (item.s.peak - lo) / Math.max(1, hi - lo));
      eCtx.strokeStyle = "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")";
      trace(item);
    });
    eCtx.globalAlpha = 1;
    every.dataset.kept = on.length;
  }

  function overlay() {
    var out = [];
    AXES.forEach(function (a, i) {
      var x = axisX(i), dim = a.out && a.out !== p.power ? " dim" : "";
      out.push('<g class="axis' + (a.out ? " out" : "") + dim + '">');
      out.push(line([x, MT], [x, VH - MB], "spine"));
      out.push('<text class="name" x="' + x + '" y="12" text-anchor="middle">' + a.name + "</text>");
      if (a.unit) out.push('<text class="unit" x="' + x + '" y="24" text-anchor="middle">' + a.unit + "</text>");
      var ticks = a.opts ? a.opts.map(function (o, j) { return [frac(a, o), (a.show || a.opts)[j]]; })
                         : [[0, a.fmt(a.range[0])], [1, a.fmt(a.range[1])]];
      ticks.forEach(function (t) {
        var y = axisY(t[0]);
        out.push(line([x - 2.5, y], [x + 2.5, y], "tick"));
        out.push('<text class="opt" x="' + (x + 4) + '" y="' + (y - 3) + '">' + t[1] + "</text>");
      });
      var b = brushes[a.key];
      if (b) out.push('<rect class="brush" x="' + (x - 6) + '" y="' + b[0].toFixed(1) + '" width="12" height="' + Math.max(1, b[1] - b[0]).toFixed(1) + '"/>');
      out.push("</g>");
    });
    if (hover) {
      out.push(polyline(hover.y.map(function (y, i) { return [axisX(i), y]; }), "hover"));
    }
    var now = ys(p, stats);
    out.push(polyline(now.map(function (y, i) { return [axisX(i), y]; }), "current"));
    now.forEach(function (y, i) { out.push('<circle class="node" cx="' + axisX(i).toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.5"/>'); });
    eSvg.innerHTML = out.join("");
    eReadout();
  }

  function describe(q, s) {
    var a = { Small: "small glass", Large: "large glass" };
    var bits = [
      "big windows " + q.faces, a[q.glass], q.walls.toLowerCase() + " walls", q.roof.toLowerCase() + " roof",
      { Raised: "raised floor", Grade: "on grade", Sunken: "sunken floor" }[q.floor],
      q.shutters === "Open" ? "no shutters" : "shutters by day",
      { Shut: "windows shut", Day: "windows open by day", Night: "windows open at night" }[q.windows],
      q.overhang.toFixed(1) + " m overhang"
    ];
    return bits.join(", ") + ". " + Math.round(s.hot) + " hours over 32 °C, " + s.peak.toFixed(1) +
           " °C at the hottest; " + Math.round(s.kwh) + " kWh, " + s.peakKw.toFixed(1) + " kW with the power on.";
  }

  function eReadout() {
    var set = pool[p.city], n = set ? set.list.length : 0;
    if (hover) { eRead.textContent = describe(hover.q, hover.s) + " Click to build it."; return; }
    if (n < SAMPLES) { eRead.textContent = "Simulating " + p.city + ", " + n + " of " + SAMPLES + " houses…"; return; }
    var k = every.dataset.kept || n;
    eRead.textContent = (Object.keys(brushes).length ? k + " of " + n + " houses kept. Click an axis to let it go."
      : n + " houses in " + p.city + ", from the coolest at its hottest hour (blue) to the hottest (red). Drag along an axis to keep some, click a line to build that house.");
  }

  // The view box point under the pointer.
  function eAt(e) {
    var r = eSvg.getBoundingClientRect();
    return [(e.clientX - r.left) * VW / r.width, (e.clientY - r.top) * VH / r.height];
  }
  function nearest(pt) {
    var set = pool[p.city];
    if (!set || pt[0] < ML || pt[0] > VW - MR) return null;
    var i = Math.min(AXES.length - 2, Math.floor((pt[0] - ML) / GAP)), f = (pt[0] - axisX(i)) / GAP;
    var best = null, gap = 6;
    set.list.forEach(function (item) {
      if (!kept(item)) return;
      var d = Math.abs(item.y[i] + (item.y[i + 1] - item.y[i]) * f - pt[1]);
      if (d < gap) { gap = d; best = item; }
    });
    return best;
  }

  var eDrag = null;
  eSvg.addEventListener("pointerdown", function (e) {
    if (e.button > 0) return;
    var pt = eAt(e), i = Math.round((pt[0] - ML) / GAP);
    var onAxis = i >= 0 && i < AXES.length && Math.abs(pt[0] - axisX(i)) < 10 && pt[1] > MT - 8;
    eDrag = { pt: pt, axis: onAxis ? i : -1, moved: false };
    eSvg.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  eSvg.addEventListener("pointermove", function (e) {
    var pt = eAt(e);
    if (eDrag) {
      if (Math.abs(pt[1] - eDrag.pt[1]) > 3 || Math.abs(pt[0] - eDrag.pt[0]) > 3) eDrag.moved = true;
      if (eDrag.axis >= 0 && eDrag.moved) {
        var lo = Math.max(MT, Math.min(pt[1], eDrag.pt[1])), hi = Math.min(VH - MB, Math.max(pt[1], eDrag.pt[1]));
        brushes[AXES[eDrag.axis].key] = [lo, hi];
        hover = null;
        lines(); overlay();
      }
      return;
    }
    var near = e.pointerType === "touch" ? null : nearest(pt);
    if (near !== hover) { hover = near; overlay(); }
  });
  eSvg.addEventListener("pointerup", function (e) {
    var d = eDrag;
    eDrag = null;
    if (!d || d.moved) return;
    if (d.axis >= 0) { delete brushes[AXES[d.axis].key]; lines(); overlay(); return; }
    var pick = nearest(eAt(e));
    if (pick) build(pick.q);
  });
  eSvg.addEventListener("pointercancel", function () { eDrag = null; });
  eSvg.addEventListener("pointerleave", function () { if (hover && !eDrag) { hover = null; overlay(); } });

  function build(q) {
    cancelAdapt();
    hover = null;
    AXES.forEach(function (a) {
      if (a.out) return;
      if (a.opts) press(a.key, q[a.key]);
      else p[a.key] = q[a.key];
    });
    rerun();
  }

  // Called by rerun: the heavy line follows the house, and a new city
  // gets its own houses.
  function everyNow() {
    if (!every) return;
    if (eVisible) grow();
    lines(); overlay();
  }

  new IntersectionObserver(function (es) {
    eVisible = es[0].isIntersecting;
    if (eVisible) grow();
  }).observe(every);

  // ------------------------------------------------------------------- loop

  var visible = false, last = 0, raf = 0, drawnAt = -1;
  function step(t) {
    raf = 0;
    if (!visible) return;
    var dt = last ? Math.min(0.1, (t - last) / 1000) : 0;
    last = t;
    if (playing && !scrub && !drag && t > idleUntil) {
      hour = (hour + dt * 3) % 168;     // three hours a second
      moveHead();
      if (Math.abs(hour - drawnAt) > 0.08 || hour < drawnAt) { render(); now(); drawnAt = hour; }
    }
    if (!still.matches) paintAir(dt);
    wake();
  }
  function wake() {
    if (!raf && visible && !still.matches) { last = 0; raf = requestAnimationFrame(step); }
  }

  new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting;
    if (visible) wake();
  }).observe(stage);

  // Repaint when the theme or face changes, since the ink follows them.
  new MutationObserver(function () { render(); chart(); lines(); overlay(); }).observe(document.documentElement,
    { attributes: true, attributeFilter: ["data-theme", "data-font"] });
  window.addEventListener("resize", function () { size(); lines(); });

  fig.querySelector('[data-act="play"]').setAttribute("aria-pressed", String(playing));
  syncButtons();
  render(); chart(); readout(); size(); overlay();
})();
