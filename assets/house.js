// The house at the top of About: an axonometric of one room riding out a
// city's hottest week, with the power on or cut. house.html (in content/)
// is the markup and style; this is the model, the drawing, the chart and
// the plot of every house.
//
// The numbers come from EnergyPlus. tools/house_sweep runs the room through
// each city's hottest week hundreds of times and trains a small network on
// the runs; house-model.json is that network, and house-runs.json the runs
// themselves, for the plot. Until the model has loaded (or if it never
// does) a stand-in answers: two heat stores stepped every two minutes, with
// rough rules for daylight and air, which moves the right way and roughly
// the right amount.
//
// Four ways of looking, the lenses, each something that can't be seen: the
// air's temperature, the daylight on the floor, the air moving through, and
// the carbon already spent on the materials. The drawing is all line, in
// the page's ink; what each lens shows is painted on a canvas under it. The
// form eases toward the design rather than jumping, so the house is seen to
// change, and it builds itself the first time it comes into view.
(function () {
  var fig = document.querySelector(".house");
  if (!fig) return;

  var still = window.matchMedia("(prefers-reduced-motion: reduce)");
  var here = document.currentScript && document.currentScript.src;

  // ---------------------------------------------------------------- climate

  // Each city's hottest week in its typical-year weather file (the files the
  // sweep ran on): the first day, counted from 0 on January 1st, the daily
  // highs and lows for the stand-in, and the clock's offset from solar time.
  var CITIES = {
    DC:      { lat: 38.98, lon: -77.47, tz: -5, start: 179, ground: 15, clear: 0.78,
               hi: [35, 36, 31, 28, 31, 35, 37], lo: [20, 23, 19, 16, 14, 18, 21] },
    Miami:   { lat: 25.82, lon: -80.30, tz: -5, start: 204, ground: 26, clear: 0.72,
               hi: [34, 33, 33, 35, 35, 36, 34], lo: [24, 25, 26, 25, 25, 26, 26] },
    Fresno:  { lat: 36.78, lon: -119.72, tz: -8, start: 188, ground: 19, clear: 0.95,
               hi: [41, 41, 39, 39, 39, 39, 39], lo: [21, 22, 21, 19, 20, 21, 20] },
    Phoenix: { lat: 33.45, lon: -111.98, tz: -7, start: 200, ground: 26, clear: 0.95,
               hi: [42, 42, 43, 44, 43, 43, 42], lo: [26, 28, 30, 32, 32, 31, 29] }
  };
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  function dateOf(city, day) {
    var d = CITIES[city].start + day, m = 0;
    while (d >= DAYS[m]) { d -= DAYS[m]; m++; }
    return MONTHS[m] + " " + (d + 1);
  }

  var RAD = Math.PI / 180;

  // Sun altitude and azimuth (degrees, azimuth clockwise from north) at t
  // hours, clock time, into the city's week.
  function sun(c, t) {
    var doy = c.start + 1 + Math.floor(t / 24);
    var hour = (t % 24) + (c.lon - 15 * c.tz) / 15;
    var decl = 23.44 * Math.sin(RAD * 360 / 365 * (doy - 81));
    var ha = 15 * (hour - 12);
    var sa = Math.sin(c.lat * RAD) * Math.sin(decl * RAD) +
             Math.cos(c.lat * RAD) * Math.cos(decl * RAD) * Math.cos(ha * RAD);
    var alt = Math.asin(sa);
    var cz = (Math.sin(decl * RAD) - Math.sin(alt) * Math.sin(c.lat * RAD)) /
             (Math.cos(alt) * Math.cos(c.lat * RAD));
    var az = Math.acos(Math.max(-1, Math.min(1, cz))) / RAD;
    if (ha > 0) az = 360 - az;
    return { alt: alt / RAD, az: az };
  }

  // The stand-in's outdoor air: lowest at 6, highest at 15.
  function outdoor(c, t) {
    var day = Math.min(6, Math.floor(t / 24)), h = t - day * 24;
    var hi = c.hi[day], lo, f;
    if (h < 6) {
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

  // ------------------------------------------------------------- the design

  // Everything a visitor can change, in the order of the controls and of the
  // plot's axes; the same ranges as tools/house_sweep/sweep.py. adapt: false
  // keeps "Let it adapt" off it (the setpoint and the fresh air are what the
  // people inside want, not the design's to trade away).
  var COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  function pct(v) { return Math.round(v * 100) + "%"; }
  var PARAMS = [
    { key: "turn", name: "Turn", min: 0, max: 345, step: 15, start: 270,
      fmt: function (v) { return Math.round(v) + "° " + COMPASS[Math.round(v / 45) % 8]; },
      tick: function (v) { return COMPASS[Math.round(v / 45) % 8]; } },
    { key: "ground", name: "Ground", opts: ["Raised", "Grade", "Sunken"], show: ["Raised", "Grade", "Sunk"], start: "Grade" },
    { key: "overhang", name: "Overhang", min: 0, max: 2, step: 0.1, start: 0.3,
      fmt: function (v) { return v.toFixed(1) + " m"; } },
    { key: "glazing", name: "Glazing", min: 0.1, max: 0.6, step: 0.05, start: 0.4, fmt: pct },
    { key: "shgc", name: "SHGC", min: 0.2, max: 0.7, step: 0.05, start: 0.5,
      fmt: function (v) { return v.toFixed(2); } },
    { key: "shade", name: "Shading", min: 0, max: 1, step: 0.1, start: 0, fmt: pct },
    { key: "wallR", name: "Wall R", min: 0.5, max: 8, step: 0.5, start: 2.5,
      fmt: function (v) { return "R " + v.toFixed(1); } },
    { key: "floorR", name: "Floor R", min: 0, max: 5, step: 0.5, start: 0,
      fmt: function (v) { return "R " + v.toFixed(1); } },
    { key: "reflect", name: "Roof refl.", min: 0.05, max: 0.9, step: 0.05, start: 0.1, fmt: pct },
    { key: "mass", name: "Mass", min: 20, max: 400, step: 20, start: 140,
      fmt: function (v) { return Math.round(v) + " kJ/m²K"; }, tick: function (v) { return String(Math.round(v)); } },
    { key: "setpoint", name: "Setpoint", min: 20, max: 28, step: 0.5, start: 24.5, adapt: false,
      fmt: function (v) { return v.toFixed(1) + " °C"; }, tick: function (v) { return v + "°"; } },
    { key: "air", name: "Fresh air", min: 0, max: 1.5, step: 0.05, start: 0.35, adapt: false,
      fmt: function (v) { return v.toFixed(2) + " ach"; }, tick: function (v) { return v.toFixed(1); } },
    { key: "erv", name: "ERV", min: 0, max: 0.9, step: 0.05, start: 0, fmt: pct },
    { key: "windows", name: "Windows", opts: ["Shut", "Day", "Night"], show: ["Never", "Day", "Night"], start: "Day" }
  ];
  var BY = {};
  PARAMS.forEach(function (a) { BY[a.key] = a; });

  var L = 10, D = 7, H = 2.8, ROOF = 0.3;     // m: long side, short side, wall, roof plate
  var LEVEL = { Raised: 0.8, Grade: 0, Sunken: -0.4 };
  var LEAKS = 0.2;                             // air changes an hour through the cracks, always

  // The windows of each wall, in the wall's own frame: u along it from its
  // left end seen from outside, v up from the floor. Wall 0 is the front,
  // whose two big windows grow with the glazing ratio; then round
  // anticlockwise seen from above, with small ones that stay put. The same
  // as tools/house_sweep/house_idf.py.
  function windows(glazing) {
    var each = Math.min(4.6, glazing * L * H / 2 / 2.1);      // 2.1 m tall, sill 0.4, head 2.5
    return [[[2.5 - each / 2, 2.5 + each / 2, 0.4, 2.5], [7.5 - each / 2, 7.5 + each / 2, 0.4, 2.5]],
            [[2.9, 4.1, 1.1, 2.3]],
            [[2.0, 3.2, 1.1, 2.3], [6.8, 8.0, 1.1, 2.3]],
            [[2.9, 4.1, 1.1, 2.3]]];
  }
  function glassOf(ws) {
    return ws.reduce(function (s, q) { return s + (q[1] - q[0]) * (q[3] - q[2]); }, 0);
  }
  function visible(shgc) { return Math.min(0.8, 0.25 + shgc); }   // the glass's VT, as in the sweep

  // The four walls as [start, end] corners in the house's own frame (x
  // along the front, y back from it), each with its outward normal.
  var WALLS = [
    { a: [-L / 2, -D / 2], b: [L / 2, -D / 2], n: [0, -1], len: L },
    { a: [L / 2, -D / 2], b: [L / 2, D / 2], n: [1, 0], len: D },
    { a: [L / 2, D / 2], b: [-L / 2, D / 2], n: [0, 1], len: L },
    { a: [-L / 2, D / 2], b: [-L / 2, -D / 2], n: [-1, 0], len: D }
  ];
  // The daylight reference points, at desk height, 1.5 m in from the front
  // and back walls, as in the sweep.
  var DESKS = [[0, -D / 2 + 1.5, 0.8], [0, D / 2 - 1.5, 0.8]];

  // ----------------------------------------------------------------- carbon

  // Embodied carbon, A1 to A3 (making the materials), in kg CO2e, from the
  // quantities the design implies and typical factors (ICE and EC3 ranges):
  // concrete 300 kg/m³, mineral wool 1.6 kg per m² per unit of R, XPS under
  // the slab 4 kg per m² per unit of R, glass and frames 80 to 100 kg/m²,
  // aluminium blinds, a timber and steel overhang, the ERV and its ducts.
  // The frame, sheathing, cladding and finishes, the same in every design,
  // are one part.
  function carbon(d) {
    var area = L * D, wins = windows(d.glazing);
    var glass = wins.reduce(function (s, ws) { return s + glassOf(ws); }, 0);
    var wall = 2 * (L + D) * H - glass;
    var rim = (L + 2 * d.overhang) * (D + 2 * d.overhang) - area;
    var parts = [
      { key: "frame", name: "Frame and finishes", kg: 25 * wall + 20 * area },
      { key: "slab", name: "Concrete slab", kg: 300 * area * Math.max(0.01, d.mass / 2000) },
      { key: "base", name: { Raised: "Piers", Grade: "Footings", Sunken: "Dug-in foundation" }[d.ground],
        kg: { Raised: 900, Grade: 1200, Sunken: 2600 }[d.ground] },
      { key: "insul", name: "Wall and roof insulation", kg: 1.6 * d.wallR * wall + 1.6 * 1.5 * d.wallR * area },
      { key: "floor", name: "Floor insulation", kg: 4 * d.floorR * area },
      { key: "glass", name: "Glass and frames", kg: glass * (80 + 20 * (0.7 - d.shgc) / 0.5) },
      { key: "shade", name: "Blinds", kg: d.shade > 0.04 ? glass * (10 + 25 * d.shade) : 0 },
      { key: "eave", name: "Overhang", kg: 25 * rim },
      { key: "roof", name: "Cool roof coating", kg: 1.5 * d.reflect * area },
      { key: "erv", name: "Fan and ERV", kg: (d.air > 0.005 ? 60 : 0) + (d.erv > 0.01 ? 150 : 0) }
    ];
    var total = parts.reduce(function (s, p) { return s + p.kg; }, 0);
    return { total: total, perArea: total / area, parts: parts };
  }

  // ------------------------------------------------------------------ model

  var COP = 3, DT = 120;
  var PER_HOUR = 3600 / DT, PER_DAY = 24 * PER_HOUR, STEPS = 168 * PER_HOUR;
  var MODEL = null;      // house-model.json, once loaded

  // The weather and the sun for a city at every step of the week: from the
  // sweep's own weather file once the model has loaded, else made up from
  // the highs and lows and a clear sky. Worked out once a city.
  var WEATHER = {};
  function weather(city) {
    if (WEATHER[city]) return WEATHER[city];
    var c = CITIES[city], m = MODEL && MODEL.cities[city];
    var w = { to: new Float64Array(STEPS), ghi: new Float64Array(STEPS), dhi: new Float64Array(STEPS),
              dni: new Float64Array(STEPS), beam: [], prof: [], hourly: { to: [], dni: [], dhi: [] } };
    for (var j = 0; j < 24; j++) { w.beam.push(new Float64Array(STEPS)); w.prof.push(new Float64Array(STEPS)); }
    function at(arr, t) {   // an hourly series, read at t (hour-ending values)
      var x = Math.max(0, Math.min(167, t - 0.5)), i = Math.floor(x), f = x - i;
      return arr[i] + (arr[Math.min(167, i + 1)] - arr[i]) * f;
    }
    for (var k = 0; k < STEPS; k++) {
      var t = k / PER_HOUR;
      var s = sun(c, t), sa = Math.sin(Math.max(0, s.alt) * RAD);
      var dni, dhi;
      if (m) {
        w.to[k] = at(m.weather.tout, t);
        dni = s.alt > 0 ? at(m.weather.dni, t) : 0;
        dhi = s.alt > 0 ? at(m.weather.dhi, t) : 0;
      } else {
        w.to[k] = outdoor(c, t);
        dni = s.alt > 0 ? 900 * c.clear * Math.exp(-0.14 / Math.max(0.05, sa)) : 0;
        dhi = s.alt > 0 ? 60 + 140 * (1 - c.clear) + 40 * sa : 0;
      }
      w.dni[k] = dni; w.dhi[k] = dhi; w.ghi[k] = dni * sa + dhi;
      if (s.alt <= 0) continue;
      for (j = 0; j < 24; j++) {
        var dAz = (s.az - j * 15) * RAD;
        var cosi = Math.cos(s.alt * RAD) * Math.cos(dAz);
        w.beam[j][k] = cosi > 0 ? dni * cosi : 0;
        w.prof[j][k] = Math.tan(s.alt * RAD) / Math.max(0.02, Math.cos(dAz));
      }
    }
    for (var h = 0; h < 168; h++) {
      var k2 = Math.min(STEPS - 1, h * PER_HOUR + PER_HOUR / 2);
      w.hourly.to.push(w.to[k2]); w.hourly.dni.push(w.dni[k2]); w.hourly.dhi.push(w.dhi[k2]);
    }
    return (WEATHER[city] = w);
  }

  function isOpen(d, h) {
    if (d.windows === "Day") return h >= 8 && h < 19;
    if (d.windows === "Night") return h < 8 || h >= 19;
    return false;
  }
  function shaded(h) { return h >= 8 && h < 18; }

  // One week, hour by hour: outdoor air; indoor air with the power cut and
  // on; the cooling's electricity (kW); daylight at the front and back desks
  // (lux); air changes through the windows with the power cut and on; and
  // whether the windows are open. 168 values each.
  function simulate(d) {
    var m = MODEL && MODEL.cities[d.city];
    return m ? surrogate(m, d) : standIn(d);
  }

  function standIn(d) {
    var c = CITIES[d.city], w = weather(d.city);
    var wins = windows(d.glazing);
    var area = L * D, vol = area * H;
    var z0 = LEVEL[d.ground];
    var buried = z0 < 0 ? -z0 / H : 0;
    var turn = Math.round(d.turn / 15) % 24;
    var glass = wins.map(glassOf);
    var glassArea = glass.reduce(function (a, b) { return a + b; }, 0);
    var wallArea = 2 * (L + D) * H - glassArea;
    var above = wallArea * (1 - buried), below = wallArea * buried;
    var vent = function (ach) { return ach * vol / 3600 * 1200; };
    var openAch = 6 * glassArea / 17;
    var UA = {
      glass: 1.8 * glassArea,
      wall: above / (d.wallR + 0.3),
      roof: area / (1.5 * d.wallR + 0.5),
      floor: area / (d.floorR + (d.ground === "Raised" ? 0.4 : 1.2)),
      below: below / (d.wallR + 1.0),
      leak: vent(LEAKS), open: vent(openAch), mech: vent(d.air) * (1 - d.erv)
    };
    var Ca = vol * 1200 * 4;
    var Cm = 1000 * (d.mass * area + 30 * wallArea);
    var Ham = 3.5 * (area * 2 + wallArea);
    var roofAbs = 1 - d.reflect;
    var skyShade = 1 - 0.35 * Math.min(1, d.overhang / 1.5);

    var gGlass = new Float64Array(STEPS), gWall = new Float64Array(STEPS);
    var opens = new Uint8Array(PER_DAY);
    for (var k = 0; k < STEPS; k++) {
      var h = (k % PER_DAY) / PER_HOUR;
      if (k < PER_DAY) opens[k] = isOpen(d, h) ? 1 : 0;
      if (!w.ghi[k]) continue;
      var dhi = w.dhi[k], diffuse = 0.5 * dhi * skyShade + 0.1 * w.ghi[k], q = 0, v = 0;
      for (var i = 0; i < 4; i++) {
        var j = (turn + i * 6) % 24, beam = w.beam[j][k], lit = 1;
        if (beam > 0 && d.overhang > 0) {
          var win = wins[i][0], tall = win[3] - win[2];
          lit = 1 - Math.max(0, Math.min(1, (d.overhang * w.prof[j][k] - (H - win[3])) / tall));
        }
        q += glass[i] * d.shgc * (beam * lit + diffuse);
        v += (beam + 0.5 * dhi) / 4;
      }
      gGlass[k] = shaded(h) ? q * (1 - 0.85 * d.shade) : q;
      gWall[k] = v;
    }

    function run(power, Ta, Tm, from, to, keep) {
      var out = keep ? { tin: [], kw: [], ach: [] } : null;
      var sumT = 0, sumQ = 0, sumA = 0;
      var mech = power ? UA.mech : 0, people = power ? 500 : 250;
      for (var k = from; k < to; k++) {
        var To = w.to[k], g = gGlass[k];
        var tsaRoof = To + roofAbs * w.ghi[k] / 20 - 3;
        var tsaWall = To + 0.6 * gWall[k] / 20;
        var tFloor = d.ground === "Raised" ? To - 1 : c.ground;
        var open = opens[k % PER_DAY] && (!power || To < Ta);
        var air = (open ? UA.open : 0) + UA.leak + mech;
        var qa = (UA.glass + air) * (To - Ta) + UA.wall * 0.5 * (tsaWall - Ta) +
                 UA.roof * 0.6 * (tsaRoof - Ta) + Ham * (Tm - Ta) + 0.3 * g + 0.5 * people;
        var qm = UA.wall * 0.5 * (tsaWall - Tm) + UA.roof * 0.4 * (tsaRoof - Tm) +
                 UA.floor * (tFloor - Tm) + UA.below * (c.ground - Tm) +
                 Ham * (Ta - Tm) + 0.7 * g + 0.5 * people;
        var next = Ta + DT * qa / Ca, cool = 0;
        if (power && next > d.setpoint) { cool = (next - d.setpoint) * Ca / DT; next = d.setpoint; }
        Ta = next;
        Tm += DT * qm / Cm;
        if (keep) {
          sumT += Ta; sumQ += cool; sumA += open ? openAch : 0;
          if ((k - from) % PER_HOUR === PER_HOUR - 1) {
            out.tin.push(sumT / PER_HOUR); out.kw.push(sumQ / PER_HOUR / COP / 1000); out.ach.push(sumA / PER_HOUR);
            sumT = 0; sumQ = 0; sumA = 0;
          }
        }
      }
      return keep ? out : [Ta, Tm];
    }

    var s = [d.setpoint, d.setpoint];
    for (var n = 0; n < 3; n++) s = run(true, s[0], s[1], 0, PER_DAY, false);
    var off = run(false, s[0], s[1], 0, STEPS, true);
    var on = run(true, s[0], s[1], 0, STEPS, true);

    // Daylight: a daylight factor at each desk from the glass that sees it,
    // times the sky's light; the blinds and the overhang take their share.
    var vt = visible(d.shgc);
    var dfFront = vt * (0.35 * glass[0] + 0.05 * (glass[1] + glass[3])) / area;
    var dfBack = vt * (0.08 * glass[0] + 0.35 * glass[2] + 0.05 * (glass[1] + glass[3])) / area;
    var eave = 1 - 0.25 * Math.min(1, d.overhang / 2);
    var luxFront = [], luxBack = [], open = [];
    for (var hr = 0; hr < 168; hr++) {
      var sky = 120 * w.hourly.dhi[hr] + 40 * w.hourly.dni[hr];
      var f = eave * (shaded(hr % 24) ? 1 - 0.9 * d.shade : 1);
      luxFront.push(sky * dfFront * f);
      luxBack.push(sky * dfBack * f);
      open.push(isOpen(d, hr % 24));
    }
    return { tout: w.hourly.to.slice(), off: off.tin, on: on.tin, kw: on.kw,
             luxFront: luxFront, luxBack: luxBack, achOff: off.ach, achOn: on.ach, open: open };
  }

  // The trained network: the design, as numbers, through two hidden layers,
  // out to the weights of each output's principal components, which add up
  // to the week, hour by hour. See tools/house_sweep/train.py.
  function features(d) {
    var t = d.turn * RAD;
    return [Math.sin(t), Math.cos(t), d.ground === "Raised" ? 1 : 0, d.ground === "Grade" ? 1 : 0,
            d.ground === "Sunken" ? 1 : 0, d.overhang, d.glazing, d.shgc, d.shade, d.wallR, d.floorR,
            d.reflect, d.mass, d.setpoint, d.air, d.erv, d.windows === "Shut" ? 1 : 0,
            d.windows === "Day" ? 1 : 0, d.windows === "Night" ? 1 : 0];
  }
  function surrogate(m, d) {
    var x = features(d).map(function (v, i) { return (v - m.norm.mean[i]) / m.norm.std[i]; });
    m.layers.forEach(function (layer, li) {
      var y = new Array(layer.rows);
      for (var r = 0; r < layer.rows; r++) {
        var s = layer.b[r], row = r * layer.cols;
        for (var c2 = 0; c2 < layer.cols; c2++) s += layer.w[row + c2] * x[c2];
        y[r] = li < m.layers.length - 1 ? Math.tanh(s) : s;
      }
      x = y;
    });
    var out = { tout: m.weather.tout.slice() };
    m.outputs.forEach(function (o) {
      var series = new Array(168);
      for (var h = 0; h < 168; h++) {
        var s = o.mean[h];
        for (var j = 0; j < o.k; j++) s += x[o.at + j] * o.scale[j] * o.comps[j * 168 + h];
        series[h] = o.floor !== undefined ? Math.max(o.floor, s) : s;
      }
      out[o.key] = series;
    });
    // With the power on the room never runs warmer than the setpoint for long.
    out.on = out.on.map(function (v) { return Math.min(v, Math.max(d.setpoint, v)); });
    out.open = [];
    for (var h2 = 0; h2 < 168; h2++) out.open.push(isOpen(d, h2 % 24));
    return out;
  }

  function score(r, d) {
    var w = weather(d.city);
    var s = { hot: 0, peak: -99, kwh: 0, peakKw: 0, dh: 0, back300: 0, front300: 0, glare: 0,
              light: 0, achOff: 0, achOn: 0, openOff: 0 };
    for (var i = 0; i < 168; i++) {
      if (r.off[i] > 32) s.hot++;
      s.peak = Math.max(s.peak, r.off[i]);
      s.dh += Math.max(0, r.off[i] - 26);
      s.kwh += r.kw[i];
      s.peakKw = Math.max(s.peakKw, r.kw[i]);
      if (w.hourly.dhi[i] > 5) {
        s.light++;
        if (r.luxBack[i] >= 300) s.back300++;
        if (r.luxFront[i] >= 300) s.front300++;
        if (r.luxFront[i] > 3000) s.glare++;
      }
      s.achOff += (r.achOff[i] + LEAKS) / 168;
      s.achOn += (r.achOn[i] + LEAKS + d.air) / 168;
      if (r.achOff[i] > 0.3) s.openOff++;
    }
    s.kg = carbon(d).total;
    return s;
  }

  // Load the trained model and the runs it was trained on, once.
  // A page can carry them inline instead (tools/house_standalone.py does).
  var loading = null;
  function loadModel() {
    if (!loading && window.HOUSE_MODEL) { loading = true; MODEL = window.HOUSE_MODEL; WEATHER = {}; pool = {}; rerun(); return; }
    if (loading || !here || !window.fetch) return;
    loading = fetch(new URL("house-model.json", here)).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (m) {
        if (!m) return;
        MODEL = m;
        WEATHER = {};
        pool = {};
        rerun();
      }, function () {});
  }

  // ------------------------------------------------------------------ state

  var START = { power: "Off", city: "Phoenix" };
  PARAMS.forEach(function (a) { START[a.key] = a.start; });
  var p = Object.assign({}, START);    // the house as built
  var design = p;                      // the house shown: p, or one pointed at in the plot
  var result = simulate(design), stats = score(result, design), built = stats;
  var lens = "temp";

  // What the drawing shows, easing toward the design.
  var FORM = ["turn", "overhang", "glazing", "shgc", "shade", "wallR", "floorR", "reflect", "mass", "level"];
  function target() {
    var t = {};
    FORM.forEach(function (k) { t[k] = k === "level" ? LEVEL[design.ground] : design[k]; });
    return t;
  }
  var shown = target();
  shown.built = still.matches ? 1 : 0;   // 0 to 1 as the house goes up, the first time it is seen

  var spin = 38;          // degrees the view is turned round the house
  var EL = 32 * RAD;      // the view's elevation
  var hour = 13;          // the playhead, in hours from the start of the week
  var playing = !still.matches;
  var idleUntil = 0;

  // ------------------------------------------------------------- projection

  var W = 600, HT = 400, CX = 300, CY = 250, S = 21;

  function frame() {
    var a = spin * RAD;
    var beta = Math.PI - shown.turn * RAD;   // house frame to world
    return {
      R: [Math.cos(a), -Math.sin(a), 0],
      U: [Math.sin(a) * Math.sin(EL), Math.cos(a) * Math.sin(EL), Math.cos(EL)],
      cb: Math.cos(beta), sb: Math.sin(beta)
    };
  }
  var F = frame();

  function world(x, y, z) { return [x * F.cb - y * F.sb, x * F.sb + y * F.cb, z]; }
  function house(wx, wy) { return [wx * F.cb + wy * F.sb, -wx * F.sb + wy * F.cb]; }
  function screen(w) {
    return [CX + S * (w[0] * F.R[0] + w[1] * F.R[1]),
            CY - S * (w[0] * F.U[0] + w[1] * F.U[1] + w[2] * F.U[2])];
  }
  function at(x, y, z) { return screen(world(x, y, z)); }
  // The point on the level z under a point on the screen, in the house's frame.
  function unproject(sx, sy, z) {
    var a11 = F.R[0], a12 = F.R[1], b1 = (sx - CX) / S;
    var a21 = F.U[0], a22 = F.U[1], b2 = (CY - sy) / S - z * F.U[2];
    var det = a11 * a22 - a12 * a21;
    return house((b1 * a22 - a12 * b2) / det, (a11 * b2 - b1 * a21) / det);
  }
  function facing(n) {
    var w = world(n[0], n[1], 0), a = spin * RAD;
    return -w[0] * Math.sin(a) - w[1] * Math.cos(a) > 0;
  }
  // The sun's direction in the house's own frame.
  function sunHouse(s) {
    var a = s.alt * RAD, z = s.az * RAD;
    var hx = house(Math.cos(a) * Math.sin(z), Math.cos(a) * Math.cos(z));
    return [hx[0], hx[1], Math.sin(a)];
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

  // A point on wall i at (u along it, v above the floor, o out from its face),
  // in the house's frame.
  function wallPoint(i, u, v, o) {
    var w = WALLS[i], t = u / w.len;
    return [w.a[0] + (w.b[0] - w.a[0]) * t + w.n[0] * (o || 0),
            w.a[1] + (w.b[1] - w.a[1]) * t + w.n[1] * (o || 0), shown.level + v];
  }
  function onWall(i, u, v, o) { var q = wallPoint(i, u, v, o); return at(q[0], q[1], q[2]); }

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
  function inside(poly2, x, y) {
    var c = false;
    for (var i = 0, j = poly2.length - 1; i < poly2.length; j = i++) {
      var a = poly2[i], b = poly2[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }

  function ease(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  function phase(b, a0, a1) { return ease((b - a0) / (a1 - a0)); }

  // ---------------------------------------------------------------- drawing

  var stage = fig.querySelector(".house-stage");
  var draw = fig.querySelector(".house-draw");
  var canvas = fig.querySelector(".house-air");
  var ctx = canvas.getContext("2d");
  draw.setAttribute("viewBox", "0 0 " + W + " " + HT);

  function hourState(t) {
    var i = Math.max(0, Math.min(167, Math.floor(t)));
    var h = t % 24;
    var c = CITIES[p.city], on = p.power === "On";
    var win = (on ? result.achOn : result.achOff)[i];
    return {
      i: i, h: h, sun: sun(c, t),
      open: win > 0.3,
      shaded: shaded(h),
      cooling: on && result.kw[i] > 0.02,
      tin: on ? result.on[i] : result.off[i],
      tout: result.tout[i],
      lux: [result.luxFront[i], result.luxBack[i]],
      ach: { windows: win, leaks: LEAKS, fan: on ? design.air : 0 }
    };
  }

  // Lines along a wall, broken round its windows: v0 to v1 at u.
  function upWall(i, wins, u, v0, v1, cls) {
    var out = [], v = v0;
    wins.filter(function (q) { return u > q[0] && u < q[1]; })
        .sort(function (a, b) { return a[2] - b[2]; })
        .forEach(function (q) {
          if (q[3] <= v0 || q[2] >= v1) return;
          if (q[2] > v) out.push(line(onWall(i, u, v), onWall(i, u, Math.min(q[2], v1)), cls));
          v = Math.max(v, q[3]);
        });
    if (v < v1) out.push(line(onWall(i, u, v), onWall(i, u, v1), cls));
    return out.join("");
  }

  // Where the sun through each window falls on the floor, in the house's
  // frame: each window's outline carried down the sun's direction, its top
  // brought down by the overhang's shadow.
  function sunPatches(st, wins) {
    if (st.sun.alt <= 2) return [];
    var sv = sunHouse(st.sun), out = [];
    var z0 = shown.level;
    for (var i = 0; i < 4; i++) {
      var n = WALLS[i].n;
      var cosi = sv[0] * n[0] + sv[1] * n[1];
      if (cosi <= 0.02) continue;
      var prof = sv[2] / cosi;      // the tangent of the profile angle
      wins[i].forEach(function (q) {
        var top = Math.min(q[3], H - shown.overhang * prof);
        if (top <= q[2]) return;
        var corners = [[q[0], q[2]], [q[1], q[2]], [q[1], top], [q[0], top]].map(function (uv) {
          var w3 = wallPoint(i, uv[0], uv[1], 0), k = (w3[2] - z0) / sv[2];
          return [w3[0] - sv[0] * k, w3[1] - sv[1] * k, w3];
        });
        out.push({ wall: i, corners: corners, cosi: cosi, frac: (top - q[2]) / (q[3] - q[2]) });
      });
    }
    return out;
  }

  var room = [], flow = null, unitAt = [0, 0], airIn = 1, floorPoly = [], patches = [], stipple = [];

  function render() {
    F = frame();
    var st = hourState(hour);
    var b = shown.built;
    var rise = phase(b, 0.12, 0.55), wh = H * rise;
    var glassIn = phase(b, 0.45, 0.72), roofIn = phase(b, 0.62, 1);
    var z0 = shown.level, zt = z0 + H, P = shown.overhang;
    var lift = (1 - roofIn) * 2.4;
    var wins = windows(shown.glazing);
    var corners = [[-L / 2, -D / 2], [L / 2, -D / 2], [L / 2, D / 2], [-L / 2, D / 2]];
    var out = [];
    stipple = [];

    var G = 4.5;
    var plate = [at(-L / 2 - G, -D / 2 - G, 0), at(L / 2 + G, -D / 2 - G, 0),
                 at(L / 2 + G, D / 2 + G, 0), at(-L / 2 - G, D / 2 + G, 0)];
    out.push(poly(plate, "ground"));

    var bw = world(-L / 2 - 2.3, -D / 2 - 2.3, 0);
    var base = screen(bw), tip = screen([bw[0], bw[1] + 1.6, 0]), lab = screen([bw[0], bw[1] + 2.3, 0]);
    out.push(line(base, tip, "north"));
    out.push('<circle class="north-dot" cx="' + base[0].toFixed(1) + '" cy="' + base[1].toFixed(1) + '" r="2"/>');
    out.push('<text class="tag" x="' + lab[0].toFixed(1) + '" y="' + (lab[1] + 4).toFixed(1) + '" text-anchor="middle">N</text>');

    var c = CITIES[p.city], path = [];
    for (var q = 0; q <= 24; q += 0.25) {
      var sq = sun(c, Math.floor(hour / 24) * 24 + q);
      if (sq.alt > 0) path.push(sunPoint(sq, 8.5));
    }
    if (path.length > 1) out.push(polyline(path, "sunpath"));

    if (st.sun.alt > 0 && b > 0.2 && lens !== "carbon") {
      var sv = sunVector(st.sun), cast = [];
      var topZ = roofIn > 0.5 ? zt + ROOF : z0 + wh, reach = roofIn > 0.5 ? P : 0;
      var drop = function (x, y, z) {
        var wp = world(x, y, z), k = wp[2] / sv[2];
        cast.push(screen([wp[0] - sv[0] * k, wp[1] - sv[1] * k, 0]));
      };
      corners.forEach(function (xy) {
        drop(xy[0] + Math.sign(xy[0]) * reach, xy[1] + Math.sign(xy[1]) * reach, topZ);
        drop(xy[0], xy[1], Math.max(0, z0));
      });
      out.push('<clipPath id="house-ground"><polygon points="' + pts(plate) + '"/></clipPath>');
      out.push('<polygon class="shadow" clip-path="url(#house-ground)" points="' + pts(hull(cast)) + '"/>');
    }

    if (z0 > 0.01) {
      [[-L / 2, -D / 2], [0, -D / 2], [L / 2, -D / 2], [L / 2, D / 2], [0, D / 2], [-L / 2, D / 2]]
        .forEach(function (xy) { out.push(line(at(xy[0], xy[1], 0), at(xy[0], xy[1], z0 - 0.05), "pier")); });
      if (lens === "carbon") corners.forEach(function (xy) {
        stipple.push({ key: "base", poly: [at(xy[0] - 0.15, xy[1], 0), at(xy[0] + 0.15, xy[1], 0), at(xy[0] + 0.15, xy[1], z0), at(xy[0] - 0.15, xy[1], z0)] });
      });
    }

    var slab = 0.06 + 0.3 * (shown.mass - 20) / 380, below = 0.035 * shown.floorR;
    var floorIn = phase(b, 0, 0.2);
    floorPoly = corners.map(function (xy) { return at(xy[0], xy[1], z0); });
    out.push('<g class="slab-g" style="opacity:' + floorIn.toFixed(2) + '">');
    out.push(poly(floorPoly, "floor"));
    stipple.push({ key: "slab", poly: floorPoly });
    for (var e = 0; e < 4; e++) {
      if (!facing(WALLS[e].n)) continue;
      var A = WALLS[e].a, B = WALLS[e].b;
      var side = [at(A[0], A[1], z0), at(B[0], B[1], z0), at(B[0], B[1], z0 - slab), at(A[0], A[1], z0 - slab)];
      out.push(poly(side, "slab"));
      stipple.push({ key: "slab", poly: side });
      if (below > 0.005) {
        out.push(zigzag(function (t, o) {
          return at(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, z0 - slab - o);
        }, WALLS[e].len, below, "insul"));
        stipple.push({ key: "floor", poly: [at(A[0], A[1], z0 - slab), at(B[0], B[1], z0 - slab),
                                            at(B[0], B[1], z0 - slab - below), at(A[0], A[1], z0 - slab - below)] });
      }
      if (z0 <= 0.01) stipple.push({ key: "base", poly: [at(A[0], A[1], z0 - slab), at(B[0], B[1], z0 - slab),
                                                         at(B[0], B[1], z0 - slab - 0.35), at(A[0], A[1], z0 - slab - 0.35)] });
    }
    out.push("</g>");

    var coat = 0.03 * shown.wallR;
    var order = [0, 1, 2, 3].sort(function (a2, b2) { return facing(WALLS[a2].n) - facing(WALLS[b2].n); });
    order.forEach(function (i) {
      var w = WALLS[i], near = facing(w.n);
      out.push('<g class="wall ' + (near ? "near" : "far") + '">');
      if (wh > 0.01) {
        var face = [onWall(i, 0, 0), onWall(i, w.len, 0), onWall(i, w.len, wh), onWall(i, 0, wh)];
        out.push(poly(face, "face"));
        stipple.push({ key: "frame", poly: face, faint: !near });
        if (near) stipple.push({ key: "insul", poly: face });
      }
      if (near && wh > 0.01) {
        for (var u = 0.5; u < w.len; u += 0.5) out.push(upWall(i, glassIn > 0 ? wins[i] : [], u, Math.max(0, -z0), wh, "mat"));
        out.push(polyline([onWall(i, 0, 0, coat), onWall(i, 0, wh, coat), onWall(i, w.len, wh, coat), onWall(i, w.len, 0, coat)], "coat"));
        out.push(zigzag(function (t, o) { return onWall(i, t * w.len, wh, o); }, w.len, coat, "insul"));
      }
      if (near && z0 < -0.01 && wh > -z0) {
        var g0 = onWall(i, 0, -z0, coat), g1 = onWall(i, w.len, -z0, coat);
        var earth = [onWall(i, 0, 0, coat), onWall(i, w.len, 0, coat), g1, g0];
        out.push(poly(earth, "earth"));
        out.push(line(g0, g1, "grade"));
        stipple.push({ key: "base", poly: earth });
      }
      if (glassIn > 0) {
        out.push('<g style="opacity:' + glassIn.toFixed(2) + '">');
        wins[i].forEach(function (q2) {
          var pane = [onWall(i, q2[0], q2[2]), onWall(i, q2[1], q2[2]), onWall(i, q2[1], q2[3]), onWall(i, q2[0], q2[3])];
          out.push(poly(pane, "pane" + (st.open ? " open" : "")));
          out.push(line(onWall(i, (q2[0] + q2[1]) / 2, q2[2]), onWall(i, (q2[0] + q2[1]) / 2, q2[3]), "mullion"));
          stipple.push({ key: "glass", poly: pane });
          var streaks = Math.round((0.72 - shown.shgc) * 14);
          for (var s2 = 1; s2 <= streaks; s2++) {
            var su = q2[0] + (q2[1] - q2[0]) * s2 / (streaks + 1);
            out.push(line(onWall(i, su - 0.08, q2[2] + 0.15), onWall(i, su + 0.08, q2[3] - 0.15), "tint"));
          }
          var slats = st.shaded || lens === "carbon" ? Math.round(shown.shade * 14) : 0;
          for (s2 = 1; s2 <= slats; s2++) {
            var sv2 = q2[2] + (q2[3] - q2[2]) * s2 / (slats + 1);
            out.push(line(onWall(i, q2[0] - 0.05, sv2, coat + 0.08), onWall(i, q2[1] + 0.05, sv2, coat + 0.08), "louvre"));
          }
          if (slats) stipple.push({ key: "shade", poly: pane });
        });
        out.push("</g>");
      }
      out.push("</g>");
    });

    // Daylight: the sun's patches on the floor, the rays that make them, and
    // the two desks with what they read.
    patches = lens === "light" && glassIn > 0.9 ? sunPatches(st, wins) : [];
    if (lens === "light") {
      patches.forEach(function (pt) {
        var pg = pt.corners.map(function (q3) { return at(q3[0], q3[1], z0); });
        out.push(poly(pg, "sunpatch"));
        [0, 1].forEach(function (k) {
          var from = pt.corners[k + 2][2];
          out.push(line(at(from[0], from[1], from[2]), pg[k + 2], "lightray"));
        });
      });
      DESKS.forEach(function (dk, k) {
        var dp = at(dk[0], dk[1], z0 + dk[2]), fp = at(dk[0], dk[1], z0);
        out.push(line(fp, dp, "desk-leg"));
        out.push('<circle class="desk" cx="' + dp[0].toFixed(1) + '" cy="' + dp[1].toFixed(1) + '" r="3"/>');
        if (b >= 1) out.push('<text class="tag lux" x="' + (dp[0] + 6).toFixed(1) + '" y="' + (dp[1] - 5).toFixed(1) + '">' +
                             Math.round(st.lux[k]).toLocaleString("en-US") + " lx</text>");
      });
    }

    var handleAt = null;
    if (roofIn > 0) {
      var rz = zt + lift;
      var r0 = [[-L / 2 - P, -D / 2 - P], [L / 2 + P, -D / 2 - P], [L / 2 + P, D / 2 + P], [-L / 2 - P, D / 2 + P]];
      var under = r0.map(function (xy) { return at(xy[0], xy[1], rz); });
      var over = r0.map(function (xy) { return at(xy[0], xy[1], rz + ROOF); });
      out.push('<g style="opacity:' + roofIn.toFixed(2) + '">');
      out.push(poly(over, "roof"));
      for (e = 0; e < 4; e++) {
        if (facing(WALLS[e].n)) out.push(poly([under[e], under[(e + 1) % 4], over[(e + 1) % 4], over[e]], "roof-edge"));
        else out.push(line(under[e], under[(e + 1) % 4], "roof-under"));
      }
      for (e = 0; e < 4; e++) out.push(line(under[e], over[e], "roof-corner"));
      var strokes = Math.round((1 - shown.reflect) * 36);
      for (var rs = 1; rs <= strokes; rs++) {
        var rx = -L / 2 - P + (L + 2 * P) * rs / (strokes + 1);
        out.push(line(at(rx, -D / 2 - P, rz + ROOF), at(rx, D / 2 + P, rz + ROOF), "roof-hatch"));
      }
      var topIn = corners.map(function (xy) { return at(xy[0], xy[1], rz + ROOF); });
      stipple.push({ key: "insul", poly: topIn });
      stipple.push({ key: "roof", poly: topIn });
      stipple.push({ key: "frame", poly: topIn, faint: true });
      if (P > 0.05) [0, 1, 2, 3].forEach(function (e2) {
        stipple.push({ key: "eave", poly: [over[e2], over[(e2 + 1) % 4], topIn[(e2 + 1) % 4], topIn[e2]] });
      });
      if (design.air > 0.01) out.push(ervUnit(rz + ROOF, st));
      out.push("</g>");
      handleAt = at(0, -D / 2 - P, rz + ROOF / 2);
    }

    if (st.open && glassIn > 0.9 && lens !== "carbon" && lens !== "air") {
      [2.5, 7.5].forEach(function (u2) {
        var pth = [onWall(0, u2, 1.5, 2.2), onWall(0, u2, 1.5, 0), at(-L / 2 + u2, 0, z0 + 1.7),
                   onWall(2, L - u2, 1.6, 0), onWall(2, L - u2, 1.6, 2.2)];
        out.push('<path class="breeze" d="M' + pth.map(function (q4) { return q4[0].toFixed(1) + " " + q4[1].toFixed(1); }).join(" L") + '"/>');
        out.push(arrowHead(pth[3], pth[4]));
      });
    }

    var ux = L / 2 + 1.3, uy = D / 2 - 1.2;
    var box = [[ux, uy], [ux + 0.8, uy], [ux + 0.8, uy + 0.8], [ux, uy + 0.8]];
    var bLow = box.map(function (xy) { return at(xy[0], xy[1], 0); });
    var bTop = box.map(function (xy) { return at(xy[0], xy[1], 0.7); });
    out.push('<g class="unit' + (st.cooling ? " running" : "") + '">');
    out.push(poly(bTop, "unit-top"));
    for (var bi = 0; bi < 4; bi++) {
      if (facing(WALLS[bi].n)) out.push(poly([bLow[bi], bLow[(bi + 1) % 4], bTop[(bi + 1) % 4], bTop[bi]], "unit-side"));
    }
    var fc = at(ux + 0.4, uy + 0.4, 0.7), ry = 6 * Math.sin(EL);
    out.push('<g class="fan" style="transform-origin:' + fc[0].toFixed(1) + "px " + fc[1].toFixed(1) + 'px">');
    out.push('<ellipse cx="' + fc[0].toFixed(1) + '" cy="' + fc[1].toFixed(1) + '" rx="6" ry="' + ry.toFixed(1) + '"/>');
    out.push(line([fc[0] - 6, fc[1]], [fc[0] + 6, fc[1]]));
    out.push(line([fc[0], fc[1] - ry], [fc[0], fc[1] + ry]));
    out.push("</g>");
    if (p.power === "Off") out.push(line([fc[0] - 9, fc[1] - 9], [fc[0] + 9, fc[1] + 5], "cut"));
    out.push("</g>");

    if (st.sun.alt > 0 && lens !== "carbon") {
      var sp = sunPoint(st.sun, 8.5);
      out.push(line(sp, at(0, 0, zt), "ray"));
      out.push('<g class="sun"><circle cx="' + sp[0].toFixed(1) + '" cy="' + sp[1].toFixed(1) + '" r="7"/>');
      for (var ri = 0; ri < 8; ri++) {
        var ang = ri * Math.PI / 4;
        out.push(line([sp[0] + Math.cos(ang) * 10, sp[1] + Math.sin(ang) * 10],
                      [sp[0] + Math.cos(ang) * 14, sp[1] + Math.sin(ang) * 14]));
      }
      out.push("</g>");
    }

    if (handleAt && roofIn > 0.95) {
      var hp = handleAt, v = design.overhang;
      out.push('<g class="handle" tabindex="0" role="slider" aria-label="Overhang depth" aria-valuemin="0" ' +
               'aria-valuemax="2" aria-valuenow="' + v.toFixed(1) + '" aria-valuetext="' + v.toFixed(1) + ' metres">' +
               '<rect x="' + (hp[0] - 5).toFixed(1) + '" y="' + (hp[1] - 5).toFixed(1) + '" width="10" height="10"/>' +
               '<text class="tag" x="' + (hp[0] + 10).toFixed(1) + '" y="' + (hp[1] + 14).toFixed(1) + '">' +
               v.toFixed(1) + ' m</text></g>');
    }

    var focused = document.activeElement && document.activeElement.closest && document.activeElement.closest(".handle");
    draw.innerHTML = out.join("");
    if (focused) { var h2 = draw.querySelector(".handle"); if (h2) h2.focus(); }

    room = roomHull(wh);
    flow = { a: at(0, -D / 2, z0 + 1.4), b: at(0, D / 2, z0 + 1.4) };
    unitAt = at(-L / 2 + 0.6, D / 2 - 0.2, z0 + H - 0.4);
    airIn = rise;
    dotted = null;
  }

  function zigzag(f, len, depth, cls) {
    if (depth < 0.005) return "";
    var pitch = Math.max(0.14, depth), n = Math.max(2, Math.round(len / pitch)), ps = [];
    for (var k = 0; k <= n; k++) ps.push(f(k / n, k % 2 ? depth : 0));
    return polyline(ps, cls);
  }

  // Where the fresh air comes in: under the unit on the roof.
  var ERV = { x: L / 2 - 1.5, y: D / 2 - 1.25 };
  function ervUnit(z, st) {
    var x0 = ERV.x - 0.5, y0 = ERV.y - 0.35, w = 1.0, dd = 0.7, hh = 0.45, out = [];
    var low = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + dd], [x0, y0 + dd]];
    var lo = low.map(function (xy) { return at(xy[0], xy[1], z); });
    var hi = low.map(function (xy) { return at(xy[0], xy[1], z + hh); });
    out.push('<g class="erv">');
    for (var e = 0; e < 4; e++) {
      if (facing(WALLS[e].n)) out.push(poly([lo[e], lo[(e + 1) % 4], hi[(e + 1) % 4], hi[e]], "unit-side"));
    }
    out.push(poly(hi, "unit-top"));
    if (lens === "carbon") stipple.push({ key: "erv", poly: hull(lo.concat(hi)) });
    if (design.erv > 0.02) { out.push(line(hi[0], hi[2], "x")); out.push(line(hi[1], hi[3], "x")); }
    var a1 = at(x0 + 0.3, y0, z + hh / 2), a2 = at(x0 + 0.3, y0 - 0.9, z + hh / 2);
    var b1 = at(x0 + 0.7, y0 - 0.9, z + hh / 2), b2 = at(x0 + 0.7, y0, z + hh / 2);
    var live = p.power === "On" ? " live" : "";
    out.push(line(a1, a2, "duct" + live));
    out.push(line(b1, b2, "duct" + live));
    if (live) { out.push(arrowHead(a1, a2)); out.push(arrowHead(b1, b2)); }
    out.push("</g>");
    return out.join("");
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
    return screen([v[0] * r, v[1] * r, shown.level + H + v[2] * r]);
  }

  // ---------------------------------------------------------------- lenses

  var GW = 120, GH = 80;
  var field = document.createElement("canvas");
  field.width = GW; field.height = GH;
  var fctx = field.getContext("2d");
  var img = fctx.createImageData(GW, GH);

  function roomHull(wh) {
    var z0 = shown.level, ps = [];
    [[-L / 2, -D / 2], [L / 2, -D / 2], [L / 2, D / 2], [-L / 2, D / 2]].forEach(function (xy) {
      ps.push(at(xy[0], xy[1], z0), at(xy[0], xy[1], z0 + Math.max(0.05, wh)));
    });
    return hull(ps);
  }

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
  function ramp(stops, t) {
    if (t <= stops[0][0]) return stops[0][1];
    for (var i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        var a = stops[i - 1], b = stops[i], f = (t - a[0]) / (b[0] - a[0]);
        return a[1].map(function (v, k) { return v + (b[1][k] - v) * f; });
      }
    }
    return stops[stops.length - 1][1];
  }
  function tint(t) { return ramp(STOPS, t); }
  // Light to colour and opacity, on a log scale: dim amber to white-hot.
  var GLOW = [[1.7, [252, 199, 71, 0]], [2.2, [252, 199, 71, 70]], [2.5, [252, 199, 71, 140]],
              [3, [255, 222, 140, 190]], [3.5, [255, 246, 225, 225]], [4, [255, 255, 250, 240]]];

  function clearCanvas() {
    var scale = canvas.width / W;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }
  function blit(clip, blur) {
    fctx.putImageData(img, 0, 0);
    ctx.save();
    ctx.beginPath();
    clip.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
    ctx.closePath();
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.filter = "blur(" + blur + "px)";
    ctx.drawImage(field, 0, 0, W, HT);
    ctx.filter = "none";
    ctx.restore();
  }

  var clock = 0;
  function paint(dt) {
    clearCanvas();
    if (lens === "temp") paintAir(dt);
    else if (lens === "light") paintLight();
    else if (lens === "air") paintFlow(dt);
    else paintCarbon();
  }

  // Temperature: the air itself, warmer at the ceiling, drifting.
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
        var up = 1 - (y - minY) / (maxY - minY);
        var sx = x * 0.018, sy = y * 0.018;
        var drift = st.open ? [fx / fn * clock * 0.9, fy / fn * clock * 0.9] : [clock * 0.15, clock * 0.5];
        var n = noise(sx - drift[0], sy - drift[1]) * 0.65 + noise(sx * 2.3 + 11 - drift[0] * 1.7, sy * 2.3 - drift[1] * 1.7) * 0.35;
        var t = st.tin + strat * (up - 0.5) + (n - 0.5) * 3.6;
        var wisp = noise(sx * 0.7 + 40 + drift[1] * 0.5, sy * 0.7 - drift[0] * 0.5);
        if (st.open) {
          var s = ((x - flow.a[0]) * fx + (y - flow.a[1]) * fy) / fl;
          var mix = Math.exp(-2.2 * Math.max(0, s + 0.1)) * (0.55 + 0.45 * n);
          t += (st.tout - st.tin) * mix;
        }
        if (st.cooling) {
          var ddx = (x - unitAt[0]) / 120, ddy = (y - unitAt[1]) / 90;
          t -= 4.5 * Math.exp(-(ddx * ddx + ddy * ddy) * 1.6) * (0.6 + 0.8 * n);
        }
        var col = tint(t);
        d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = (70 + 165 * wisp * wisp) * airIn;
      }
    }
    blit(box, 6);
  }

  // Daylight on the floor: light from each window falling off with distance
  // and angle, scaled so the two desks read what the model says, and the
  // sun's patches on top, as bright as the beam through the glass.
  function paintLight() {
    var st = hourState(hour);
    if (!floorPoly.length || st.lux[0] + st.lux[1] < 5) return;
    var wins = windows(shown.glazing), vt = visible(shown.shgc), z0 = shown.level;
    var shadeF = st.shaded ? 1 - 0.9 * shown.shade : 1;
    var srcs = [];
    wins.forEach(function (ws, i) {
      ws.forEach(function (q) {
        var c = wallPoint(i, (q[0] + q[1]) / 2, (q[2] + q[3]) / 2, 0);
        srcs.push({ x: c[0], y: c[1], z: c[2] - z0, n: WALLS[i].n, a: (q[1] - q[0]) * (q[3] - q[2]) });
      });
    });
    function geo(x, y, zh) {
      var g = 0;
      srcs.forEach(function (s) {
        var dx = x - s.x, dy = y - s.y, dz = zh - s.z, r2 = dx * dx + dy * dy + dz * dz + 0.3;
        var cosW = -(dx * s.n[0] + dy * s.n[1]) / Math.sqrt(r2);
        if (cosW > 0) g += s.a * cosW * (-dz / Math.sqrt(r2) * 0.6 + 0.4) / r2;
      });
      return g;
    }
    var gF = geo(DESKS[0][0], DESKS[0][1], DESKS[0][2]), gB = geo(DESKS[1][0], DESKS[1][1], DESKS[1][2]);
    var kF = st.lux[0] / Math.max(1e-6, gF), kB = st.lux[1] / Math.max(1e-6, gB);
    var kk = Math.sqrt(Math.max(1e-6, kF) * Math.max(1e-6, kB));
    var sv = st.sun.alt > 0 ? sunHouse(st.sun) : null;
    var beam = weather(p.city).hourly.dni[st.i] * 105 * vt * shadeF;
    var d = img.data, k = 0;
    for (var gy = 0; gy < GH; gy++) {
      var y = gy / (GH - 1) * HT;
      for (var gx = 0; gx < GW; gx++, k += 4) {
        var x = gx / (GW - 1) * W;
        var hxy = unproject(x, y, z0);
        if (Math.abs(hxy[0]) > L / 2 + 0.3 || Math.abs(hxy[1]) > D / 2 + 0.3) { d[k + 3] = 0; continue; }
        var lux = kk * geo(hxy[0], hxy[1], 0);
        patches.forEach(function (pt) {
          if (inside(pt.corners, hxy[0], hxy[1])) lux += beam * pt.cosi * Math.max(0.1, sv ? sv[2] : 0);
        });
        var col = ramp(GLOW, Math.log10(Math.max(1, lux)));
        d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = col[3] * airIn;
      }
    }
    blit(floorPoly, 3);
  }

  // Air: motes carried through the room. Through the windows when they are
  // open, front to back; in at the cracks, slowly; down from the fresh-air
  // unit while there is power. Each takes the colour of the air it carries:
  // outdoor air at the outdoor temperature, warming or cooling to the
  // room's; the fan's tempered by the ERV.
  var motes = [];
  function spawn(kind, st) {
    var z0 = shown.level, m;
    if (kind === "windows") {
      var wins = windows(shown.glazing)[0], q = wins[Math.random() < 0.5 ? 0 : 1];
      var u = q[0] + Math.random() * (q[1] - q[0]), v = q[2] + Math.random() * (q[3] - q[2]);
      var w3 = wallPoint(0, u, v, 0.2);
      m = { x: w3[0], y: w3[1], z: w3[2] - z0, vx: 0, vy: 1, vz: 0, t: st.tout };
    } else if (kind === "leaks") {
      var i = Math.floor(Math.random() * 4), wl = WALLS[i];
      var w4 = wallPoint(i, Math.random() * wl.len, Math.random() < 0.5 ? 0.05 : H - 0.05, 0);
      m = { x: w4[0], y: w4[1], z: w4[2] - z0, vx: -wl.n[0] * 0.2, vy: -wl.n[1] * 0.2, vz: 0, t: st.tout };
    } else {
      var a = Math.random() * Math.PI * 2;
      m = { x: ERV.x, y: ERV.y, z: H - 0.05, vx: Math.cos(a) * 0.5, vy: Math.sin(a) * 0.5, vz: -0.8,
            t: st.tout - design.erv * (st.tout - st.tin) };
    }
    m.kind = kind; m.age = 0; m.trail = [];
    motes.push(m);
  }
  var spawnDebt = { windows: 0, leaks: 0, fan: 0 };
  function paintFlow(dt) {
    var st = hourState(hour);
    if (!still.matches && airIn >= 1) {
      ["windows", "leaks", "fan"].forEach(function (kind) {
        spawnDebt[kind] += st.ach[kind] * dt * 9;
        while (spawnDebt[kind] >= 1 && motes.length < 420) { spawn(kind, st); spawnDebt[kind] -= 1; }
        spawnDebt[kind] = Math.min(spawnDebt[kind], 3);
      });
    }
    var speed = 0.6 + 0.35 * Math.min(10, st.ach.windows);
    var z0 = shown.level;
    var back = windows(shown.glazing)[2].map(function (q) { return wallPoint(2, (q[0] + q[1]) / 2, (q[2] + q[3]) / 2, 0); });
    motes = motes.filter(function (m) {
      m.age += dt;
      if (m.kind === "windows") {
        // Toward the nearest window in the back wall, a little unsteady.
        var tgt = back.reduce(function (a, b) { return Math.abs(b[0] - m.x) < Math.abs(a[0] - m.x) ? b : a; });
        var tx = tgt[0] - m.x, ty = tgt[1] - m.y, tz = tgt[2] - z0 - m.z, tn = Math.hypot(tx, ty, tz) || 1;
        var wob = noise(m.x * 0.8 + clock, m.y * 0.8) - 0.5;
        m.vx += ((tx / tn) * speed - m.vx) * dt * 2 + wob * dt * 2;
        m.vy += ((ty / tn) * speed - m.vy) * dt * 2;
        m.vz += ((tz / tn) * speed - m.vz) * dt * 2;
        if (m.y > D / 2 + 0.4) return false;
      } else {
        m.vx += (noise(m.x + clock * 0.3, m.z) - 0.5) * dt * 1.2;
        m.vy += (noise(m.y + 9, m.z + clock * 0.3) - 0.5) * dt * 1.2;
        m.vz += (noise(m.x + 3, m.y + clock * 0.3) - 0.5) * dt * 1.2;
        m.vx *= 1 - dt * 0.4; m.vy *= 1 - dt * 0.4; m.vz *= 1 - dt * 0.6;
        if (m.age > 7) return false;
      }
      m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt;
      m.x = Math.max(-L / 2 + 0.05, Math.min(L / 2 - 0.05, m.x));
      m.z = Math.max(0.05, Math.min(H - 0.05, m.z));
      if (m.kind !== "windows") m.y = Math.max(-D / 2 + 0.05, Math.min(D / 2 - 0.05, m.y));
      m.t += (st.tin - m.t) * Math.min(1, dt * 0.35);
      m.trail.push(at(m.x, m.y, z0 + m.z));
      if (m.trail.length > 7) m.trail.shift();
      return m.age < 20;
    });
    clock += dt;
    ctx.lineCap = "round";
    motes.forEach(function (m) {
      if (m.trail.length < 2) return;
      var col = tint(m.t);
      ctx.strokeStyle = "rgba(" + (col[0] | 0) + "," + (col[1] | 0) + "," + (col[2] | 0) + "," + Math.min(1, m.age * 2) * 0.9 + ")";
      ctx.lineWidth = m.kind === "windows" ? 1.6 : 1.1;
      ctx.beginPath();
      m.trail.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
      ctx.stroke();
    });
    // Under reduced motion, the paths instead: lines from each opening.
    if (still.matches && st.ach.windows > 0.05) {
      ctx.strokeStyle = "rgba(110,155,209,.7)";
      ctx.lineWidth = 1.2;
      windows(shown.glazing)[0].forEach(function (q) {
        for (var k = 0; k < 4; k++) {
          var u = q[0] + (q[1] - q[0]) * (k + 0.5) / 4, a = wallPoint(0, u, 1.5, 0);
          ctx.beginPath();
          var s0 = at(a[0], a[1], a[2]), s1 = at(a[0], 0, a[2] + 0.2), s2 = at(back[0][0] + (k - 1.5) * 0.3, D / 2, back[0][2]);
          ctx.moveTo(s0[0], s0[1]); ctx.quadraticCurveTo(s1[0], s1[1], s2[0], s2[1]); ctx.stroke();
        }
      });
    }
  }

  // Carbon: soot in the materials, a dot for every 8 kg, laid in the parts
  // of the drawing each material makes, the same dots every time.
  var dotted = null;
  function paintCarbon() {
    if (!dotted) {
      var parts = carbon(design).parts, by = {};
      parts.forEach(function (pt) { by[pt.key] = pt.kg; });
      var groups = {};
      stipple.forEach(function (s) { (groups[s.key] = groups[s.key] || []).push(s); });
      dotted = [];
      var seed = 11;
      function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      Object.keys(groups).forEach(function (key) {
        var polys = groups[key], n = Math.round((by[key] || 0) / 8);
        var areas = polys.map(function (pg) {
          var a = 0, q = pg.poly;
          for (var i = 0, j = q.length - 1; i < q.length; j = i++) a += (q[j][0] + q[i][0]) * (q[j][1] - q[i][1]);
          return Math.abs(a / 2) * (pg.faint ? 0.3 : 1);
        });
        var total = areas.reduce(function (a, b) { return a + b; }, 0) || 1;
        polys.forEach(function (pg, pi) {
          var share = Math.round(n * areas[pi] / total);
          var xs = pg.poly.map(function (q) { return q[0]; }), ys = pg.poly.map(function (q) { return q[1]; });
          var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
          var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
          for (var tries = 0, made = 0; made < share && tries < share * 8; tries++) {
            var x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0);
            if (inside(pg.poly, x, y)) { dotted.push([x, y, key]); made++; }
          }
        });
      });
    }
    var ink = getComputedStyle(draw).color;
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.75 * airIn;
    dotted.forEach(function (q) { ctx.fillRect(q[0] - 0.6, q[1] - 0.6, 1.2, 1.2); });
    ctx.globalAlpha = 1;
  }

  function size() {
    var r = stage.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.width * HT / W * dpr);
    paint(0);
  }

  // ------------------------------------------------------------------ chart

  var plot = fig.querySelector(".house-plot");
  var PW = 600, PH = 230, PL = 40, PR = 8;
  var TOP = 8, BOT = 214;
  plot.setAttribute("viewBox", "0 0 " + PW + " " + PH);
  var keyList = fig.querySelector(".house-key");

  function px(i) { return PL + (PW - PL - PR) * i / 168; }
  function days(out) {
    for (var dd = 0; dd < 7; dd++) {
      out.push(line([px(dd * 24), TOP], [px(dd * 24), BOT], "day"));
      out.push('<text class="axis" x="' + (px(dd * 24) + 4) + '" y="' + (BOT + 13) + '">' + dateOf(p.city, dd) + "</text>");
    }
  }
  function series(vals, y, cls) {
    return polyline(vals.map(function (v, j) { return [px(j + 0.5), y(v)]; }), "series " + cls);
  }
  function grid(out, y, ticks, fmt) {
    ticks.forEach(function (g) {
      out.push(line([PL, y(g)], [PW - PR, y(g)], "grid"));
      out.push('<text class="axis" x="' + (PL - 6) + '" y="' + (y(g) + 3.5) + '" text-anchor="end">' + fmt(g) + "</text>");
    });
  }
  function keys(items) {
    keyList.innerHTML = items.map(function (it) {
      return '<li><span class="' + it[0] + '"' + (it[2] ? ' style="' + it[2] + '"' : "") + "></span>" + it[1] + "</li>";
    }).join("");
  }

  function chart() {
    var out = [], on = p.power === "On";
    if (lens === "temp") {
      var MID = 150, T0 = 20, T1 = 48, KW = 3;
      var ty = function (t) { return TOP + (MID - TOP) * (1 - (Math.max(T0, Math.min(T1, t)) - T0) / (T1 - T0)); };
      var ky = function (k) { return BOT - (BOT - MID - 14) * Math.min(1, k / KW); };
      grid(out, ty, [20, 24, 28, 32, 36, 40, 44, 48], String);
      out.push(line([PL, ty(32)], [PW - PR, ty(32)], "mark"));
      out.push('<text class="axis" x="' + (PW - PR) + '" y="' + (ty(32) - 4) + '" text-anchor="end">32 °C</text>');
      days(out);
      var bw = (PW - PL - PR) / 168, bars = [];
      for (var i = 0; i < 168; i++) {
        var k = result.kw[i];
        if (k <= 0.005) continue;
        bars.push('<rect x="' + (px(i) + 0.15).toFixed(2) + '" y="' + ky(k).toFixed(1) + '" width="' + (bw - 0.3).toFixed(2) +
                  '" height="' + (BOT - ky(k)).toFixed(1) + '"/>');
      }
      out.push('<g class="bars' + (on ? " live" : "") + '">' + bars.join("") + "</g>");
      out.push('<text class="axis" x="' + (PL - 6) + '" y="' + (ky(KW) + 3.5) + '" text-anchor="end">' + KW + " kW</text>");
      out.push(line([PL, BOT], [PW - PR, BOT], "base"));
      out.push(series(result.tout, ty, "outdoor"));
      out.push(series(result.off, ty, on ? "ghost" : "live"));
      out.push(series(result.on, ty, on ? "live" : "ghost"));
      keys([["key line dotted", "Outside"], ["key line solid", on ? "Inside, power on" : "Inside, power cut"],
            ["key line faint", on ? "Inside, power cut" : "Inside, power on"], ["key solid", "Cooling, kW"]]);
    } else if (lens === "light") {
      var ly = function (v) { var f = Math.log10(Math.max(10, v)) - 1; return BOT - (BOT - TOP) * Math.min(1, f / 3.3); };
      grid(out, ly, [10, 100, 300, 1000, 3000, 10000], function (g) { return g >= 1000 ? g / 1000 + "k" : String(g); });
      out.push(line([PL, ly(300)], [PW - PR, ly(300)], "mark"));
      out.push('<text class="axis" x="' + (PW - PR) + '" y="' + (ly(300) - 4) + '" text-anchor="end">300 lx, enough to read by</text>');
      days(out);
      out.push(series(result.luxFront, ly, "live"));
      out.push(series(result.luxBack, ly, "dashed"));
      keys([["key line solid", "Front desk, 1.5 m from the big windows"], ["key line dashed", "Back desk"]]);
    } else if (lens === "air") {
      var AMAX = 10, ay = function (v) { return BOT - (BOT - TOP) * Math.min(1, v / AMAX); };
      grid(out, ay, [0, 2, 4, 6, 8, 10], String);
      days(out);
      var win = on ? result.achOn : result.achOff, fan = on ? design.air : 0;
      var layer = function (lo, hi, cls) {
        var top = [], bot = [];
        for (var i2 = 0; i2 < 168; i2++) {
          top.push([px(i2), ay(hi(i2))], [px(i2 + 1), ay(hi(i2))]);
          bot.push([px(i2), ay(lo(i2))], [px(i2 + 1), ay(lo(i2))]);
        }
        return poly(top.concat(bot.reverse()), cls);
      };
      out.push(layer(function () { return 0; }, function () { return fan; }, "flow fan"));
      out.push(layer(function () { return fan; }, function () { return fan + LEAKS; }, "flow leaks"));
      out.push(layer(function () { return fan + LEAKS; }, function (i3) { return fan + LEAKS + win[i3]; }, "flow windows"));
      var other = on ? result.achOff : result.achOn, ofan = on ? 0 : design.air;
      out.push(series(other.map(function (v) { return v + LEAKS + ofan; }), ay, "ghost"));
      out.push('<text class="axis" x="' + (PL - 6) + '" y="' + (TOP - 0) + '" text-anchor="end">ach</text>');
      keys([["swatch flow-key windows", "Through the windows"], ["swatch flow-key leaks", "Through the cracks"],
            ["swatch flow-key fan", "By fan, through the ERV"], ["key line faint", on ? "All of it, power cut" : "All of it, power on"]]);
    } else {
      var cb = carbon(design), rows = cb.parts.filter(function (pt) { return pt.kg > 0.5; });
      var max = Math.max(4000, Math.max.apply(null, rows.map(function (pt) { return pt.kg; })));
      var rh = Math.min(20, (BOT - TOP) / rows.length);
      rows.forEach(function (pt, i4) {
        var y0 = TOP + i4 * rh, w = (PW - 200 - PR) * pt.kg / max;
        out.push('<text class="axis label" x="0" y="' + (y0 + rh * 0.65).toFixed(1) + '">' + pt.name + "</text>");
        out.push('<rect class="cbar" x="160" y="' + (y0 + rh * 0.2).toFixed(1) + '" width="' + Math.max(0.5, w).toFixed(1) +
                 '" height="' + (rh * 0.6).toFixed(1) + '"/>');
        out.push('<text class="axis" x="' + (166 + w).toFixed(1) + '" y="' + (y0 + rh * 0.65).toFixed(1) + '">' +
                 Math.round(pt.kg).toLocaleString("en-US") + " kg</text>");
      });
      keys([["key solid", "kg CO₂e to make, a dot for every 8 kg in the drawing"]]);
    }
    if (lens !== "carbon") out.push('<line class="playhead" x1="0" x2="0" y1="' + TOP + '" y2="' + BOT + '"/>');
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

  var slots = [].slice.call(fig.querySelectorAll(".house-stat"));
  var nowLine = fig.querySelector(".house-now");
  function fmtInt(v) { return Math.round(v).toLocaleString("en-US"); }
  function readout() {
    var s = stats, on = p.power === "On", cells;
    if (lens === "temp") {
      cells = [[s.hot, "hours over 32 °C", "Off"], [s.peak.toFixed(1), "°C at the hottest", "Off"],
               [fmtInt(s.kwh), "kWh to stay at " + design.setpoint.toFixed(1) + " °C", "On"], [s.peakKw.toFixed(1), "kW at the peak", "On"]];
    } else if (lens === "light") {
      cells = [[s.back300, "of " + s.light + " daylit hours, 300 lx at the back desk"], [s.front300, "at the front desk"],
               [s.glare, "hours the front is over 3,000 lx"], [fmtInt(result.luxBack[Math.floor(hour)]), "lx at the back desk now"]];
    } else if (lens === "air") {
      var ach = on ? s.achOn : s.achOff, vol = L * D * H;
      var fanShare = on ? design.air / Math.max(0.01, s.achOn) : 0;
      cells = [[ach.toFixed(1), "air changes an hour, on average"], [fmtInt(ach * vol * 168), "m³ of outside air in the week"],
               [(on ? result.achOn : result.achOff).filter(function (v) { return v > 0.3; }).length, "hours the windows let air through"],
               [Math.round(fanShare * 100) + "%", "of it by fan" + (on ? "" : ", none with the power cut")]];
    } else {
      var cb = carbon(design), big = cb.parts.reduce(function (a, b) { return b.kg > a.kg ? b : a; });
      cells = [[fmtInt(cb.total), "kg CO₂e to make the house"], [fmtInt(cb.perArea), "kg CO₂e per m² of floor"],
               [big.name, "the biggest part"], [Math.round(big.kg / cb.total * 100) + "%", "of the total"]];
    }
    slots.forEach(function (slot, i) {
      slot.querySelector("b").textContent = cells[i][0];
      slot.querySelector("span").textContent = cells[i][1];
      slot.classList.toggle("dim", !!cells[i][2] && cells[i][2] !== p.power);
    });
    fig.classList.toggle("previewing", design !== p);
    now();
  }
  function now() {
    var st = hourState(hour), h = Math.floor(st.h);
    var when = dateOf(p.city, Math.floor(hour / 24)) + ", " + (h % 12 || 12) + (h < 12 ? " am" : " pm");
    var bits;
    if (lens === "temp") {
      bits = [when, "outside " + st.tout.toFixed(1) + " °C", "inside " + st.tin.toFixed(1) + " °C"];
      if (st.cooling) bits.push("cooling " + result.kw[st.i].toFixed(1) + " kW");
      if (st.open) bits.push("windows open");
    } else if (lens === "light") {
      bits = [when, fmtInt(st.lux[0]) + " lx at the front desk", fmtInt(st.lux[1]) + " lx at the back"];
      if (patches.length) bits.push("sun on the floor");
      if (st.sun.alt <= 0) bits.push("night");
    } else if (lens === "air") {
      var a = st.ach, tot = a.windows + a.leaks + a.fan;
      bits = [when, tot.toFixed(1) + " air changes an hour", "windows " + a.windows.toFixed(1), "cracks " + a.leaks.toFixed(1), "fan " + a.fan.toFixed(2)];
    } else {
      bits = ["Spent before anyone moves in, the same every hour"];
    }
    nowLine.textContent = (design !== p ? "Trying a house from the plot. " : "") + bits.join(" · ");
  }

  // ---------------------------------------------------------------- control

  function show(d) {
    design = d;
    result = simulate(design);
    stats = score(result, design);
    if (design === p) built = stats;
    chart(); readout(); settle();
    dotted = null;
  }
  function rerun() { show(p); everyNow(); }

  function syncControls() {
    fig.querySelectorAll("[data-set]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(p[b.dataset.set] === b.dataset.value));
    });
    fig.querySelectorAll("[data-lens]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(lens === b.dataset.lens));
    });
    fig.querySelectorAll("input[data-key]").forEach(function (input) {
      input.value = p[input.dataset.key];
    });
    fig.querySelectorAll("[data-show]").forEach(function (o) {
      var a = BY[o.dataset.show];
      o.textContent = a.fmt(p[a.key]);
    });
  }

  fig.querySelectorAll("input[data-key]").forEach(function (input) {
    var a = BY[input.dataset.key];
    input.min = a.min; input.max = a.max; input.step = a.step;
    input.addEventListener("input", function () {
      cancelAdapt();
      p[a.key] = +input.value;
      syncControls();
      rerun();
    });
  });

  fig.addEventListener("click", function (e) {
    var b = e.target.closest("[data-set]");
    if (b) { cancelAdapt(); p[b.dataset.set] = b.dataset.value; syncControls(); rerun(); return; }
    var l = e.target.closest("[data-lens]");
    if (l) { lens = l.dataset.lens; motes = []; syncControls(); render(); chart(); readout(); paint(0); everyNow(); return; }
    var act = e.target.closest("[data-act]");
    if (!act) return;
    if (act.dataset.act === "adapt") adapt();
    if (act.dataset.act === "reset") { cancelAdapt(); p = Object.assign({}, START); design = p; syncControls(); rerun(); }
    if (act.dataset.act === "play") {
      playing = !playing;
      act.setAttribute("aria-pressed", String(playing));
      if (playing) wake();
    }
  });

  var drag = null;
  stage.addEventListener("pointerdown", function (e) {
    if (e.button > 0) return;
    var onHandle = e.target.closest(".handle");
    drag = { x: e.clientX, y: e.clientY, spin: spin, handle: !!onHandle, P: p.overhang };
    stage.setPointerCapture(e.pointerId);
    if (onHandle) e.preventDefault();
  });
  stage.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var k = W / stage.getBoundingClientRect().width;
    var dx = (e.clientX - drag.x) * k, dy = (e.clientY - drag.y) * k;
    if (drag.handle) {
      var a = at(0, -D / 2, 0), b = at(0, -D / 2 - 1, 0);
      var nx = b[0] - a[0], ny = b[1] - a[1];
      var P = Math.round(Math.max(0, Math.min(2, drag.P + (dx * nx + dy * ny) / (nx * nx + ny * ny))) * 10) / 10;
      if (P !== p.overhang) { p.overhang = P; syncControls(); rerun(); }
    } else {
      spin = drag.spin - dx * 0.4;
      render(); paint(0);
    }
  });
  function endDrag() { drag = null; }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  draw.addEventListener("keydown", function (e) {
    var onHandle = e.target.closest && e.target.closest(".handle");
    var step = { ArrowUp: 0.1, ArrowRight: 0.1, ArrowDown: -0.1, ArrowLeft: -0.1 }[e.key];
    if (onHandle && step) {
      p.overhang = Math.round(Math.max(0, Math.min(2, p.overhang + step)) * 10) / 10;
      syncControls(); rerun();
      e.preventDefault();
    }
  });
  stage.addEventListener("keydown", function (e) {
    if (e.target !== stage) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      spin += e.key === "ArrowLeft" ? -10 : 10;
      render(); paint(0);
      e.preventDefault();
    }
  });

  var scrub = false;
  function scrubTo(e) {
    if (lens === "carbon") return;
    var r = plot.getBoundingClientRect();
    var x = (e.clientX - r.left) * PW / r.width;
    hour = Math.max(0, Math.min(167.99, (x - PL) / (PW - PL - PR) * 168));
    idleUntil = performance.now() + 5000;
    moveHead(); render(); readout(); paint(0);
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
    moveHead(); render(); readout(); paint(0);
    e.preventDefault();
  });

  // ------------------------------------------------------------------ adapt

  // Let the house change itself: one setting at a time, take whichever value
  // scores best, until nothing helps. What it chases depends on the lens:
  // heat with the power cut, or electricity with it on; daylight at the back
  // desk without glare; the most air with the power cut; the least carbon
  // that keeps the hours over 32 °C where they are.
  function choices(a) {
    if (a.opts) return a.opts;
    var out = [];
    for (var i = 0; i <= 6; i++) out.push(Math.round((a.min + (a.max - a.min) * i / 6) / a.step) * a.step);
    return out;
  }
  var adapting = null;
  function cost(q, base) {
    var s = score(simulate(q), q);
    if (lens === "light") return -s.back300 - 0.3 * s.front300 + s.glare;
    if (lens === "air") return -s.achOff;
    if (lens === "carbon") return s.kg + 400 * Math.max(0, s.hot - base.hot);
    return p.power === "On" ? s.kwh : s.dh;
  }
  function adapt() {
    cancelAdapt();
    var steps = [], q = Object.assign({}, p), base = score(simulate(q), q), best = cost(q, base);
    for (var round = 0; round < 3; round++) {
      var changed = false;
      PARAMS.forEach(function (a) {
        if (a.adapt === false) return;
        var keep = q[a.key];
        choices(a).forEach(function (v) {
          if (v === q[a.key]) return;
          var r = Object.assign({}, q);
          r[a.key] = v;
          var c = cost(r, base);
          if (c < best - 1e-6) { best = c; keep = v; }
        });
        if (keep !== q[a.key]) { q[a.key] = keep; steps.push([a.key, keep]); changed = true; }
      });
      if (!changed) break;
    }
    var btn = fig.querySelector('[data-act="adapt"]');
    if (!steps.length) { flash(btn, "Already there"); return; }
    btn.setAttribute("aria-pressed", "true");
    adapting = setInterval(function () {
      var s = steps.shift();
      if (!s) { cancelAdapt(); return; }
      p[s[0]] = s[1];
      syncControls();
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

  // A parallel coordinates plot of the city's houses: the EnergyPlus runs
  // themselves once house-runs.json has loaded, else houses simulated here.
  // One line each, through its settings and on to what it scored for the
  // lens, tinted from the best (blue) to the worst (red) of the city's
  // houses by the lens's first result. Drag along an axis to keep only the
  // lines that cross it there, click the axis to let go. Pointing at a line
  // tries that house in the drawing above; a click builds it.
  function out(key, name, unit, better, fmt) {
    return { key: key, name: name, unit: unit, out: true, better: better,
             tick: fmt || function (v) { return String(Math.round(v)); } };
  }
  var OUTS = {
    temp: [out("hot", "Hours", "over 32 °C", "low"), out("peak", "Peak", "°C", "low"),
           out("kwh", "Energy", "kWh", "low"), out("peakKw", "Peak", "kW", "low", function (v) { return v.toFixed(1); })],
    light: [out("back300", "Back desk", "hours ≥ 300 lx", "high"), out("front300", "Front desk", "hours ≥ 300 lx", "high"),
            out("glare", "Glare", "hours > 3,000 lx", "low")],
    air: [out("achOff", "Air, cut", "ach", "high", function (v) { return v.toFixed(1); }),
          out("achOn", "Air, on", "ach", "high", function (v) { return v.toFixed(1); })],
    carbon: [out("kg", "Carbon", "kg CO₂e", "low"), out("hot", "Hours", "over 32 °C", "low")]
  };
  OUTS.temp[0].power = OUTS.temp[1].power = "Off";
  OUTS.temp[2].power = OUTS.temp[3].power = "On";
  var SAMPLES = 600;
  var VW = 600, VH = 290, ML = 12, MR = 62, MT = 72, MB = 14;

  var every = fig.querySelector(".house-every");
  var eCanvas = every.querySelector("canvas"), eCtx = eCanvas.getContext("2d");
  var eSvg = every.querySelector("svg"), eRead = every.querySelector(".house-every-read");
  eSvg.setAttribute("viewBox", "0 0 " + VW + " " + VH);
  var pool = {}, brushes = {}, hover = null, eVisible = false, growing = false, runs = null, runsLoading = null;

  function axes() { return PARAMS.concat(OUTS[lens]); }
  function gap() { return (VW - ML - MR) / (axes().length - 1); }
  function axisX(i) { return ML + i * gap(); }
  // The range of each result over the city's houses, rounded out.
  function range(a) {
    if (!a.out) return [a.min, a.max];
    var set = pool[p.city], lo = Infinity, hi = -Infinity;
    (set ? set.list : []).forEach(function (it) { lo = Math.min(lo, it.s[a.key]); hi = Math.max(hi, it.s[a.key]); });
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    if (hi - lo < 1e-6) hi = lo + 1;
    return [lo, hi];
  }
  function frac(a, v, rg) {
    if (a.opts) return 0.1 + 0.8 * a.opts.indexOf(v) / (a.opts.length - 1);
    var r = rg || range(a);
    return Math.max(0, Math.min(1, (v - r[0]) / (r[1] - r[0])));
  }
  function axisY(f) { return MT + (VH - MT - MB) * (1 - f); }
  function ysOf(item, rgs) {
    return axes().map(function (a, i) {
      var y = axisY(frac(a, a.out ? item.s[a.key] : item.q[a.key], rgs[i]));
      return a.opts ? y + (item.jit[i % item.jit.length] - 0.5) * 7 : y;
    });
  }
  function ranges() { return axes().map(range); }

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
  function jitter(rand) { var j = []; for (var i = 0; i < 24; i++) j.push(rand()); return j; }

  // The sweep's runs, once, if they are there.
  function loadRuns() {
    if (!runsLoading && window.HOUSE_RUNS) { runsLoading = true; runs = window.HOUSE_RUNS; pool = {}; grow(); return; }
    if (runsLoading || !here || !window.fetch) return;
    runsLoading = fetch(new URL("house-runs.json", here)).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        runs = data;
        pool = {};
        grow();
      }, function () {});
  }

  function grow() {
    var city = p.city, set = pool[city];
    if (!set) set = pool[city] = { list: [], rand: seeded(city), ran: false };
    if (runs && runs.cities[city] && !set.ran) {
      // The EnergyPlus runs: settings and the scores of the week, as run.
      var rc = runs.cities[city];
      set.list = rc.rows.map(function (row) {
        var q = { city: city, power: "Off" }, s = {};
        runs.params.forEach(function (k, i) { q[k] = BY[k].opts ? BY[k].opts[row[i]] : row[i]; });
        runs.scores.forEach(function (k, i) { s[k] = row[runs.params.length + i]; });
        s.kg = carbon(q).total;
        return { q: q, s: s, jit: jitter(set.rand) };
      });
      set.ran = true;
      lines(); overlay();
    }
    if (set.ran || set.list.length >= SAMPLES || growing) return;
    growing = true;
    (function chunk() {
      if (city !== p.city || pool[city] !== set || (runs && runs.cities[city])) { growing = false; grow(); return; }
      var t0 = performance.now();
      while (set.list.length < SAMPLES && performance.now() - t0 < 14) {
        var q = { city: city, power: "Off" };
        PARAMS.forEach(function (a) {
          if (a.opts) q[a.key] = a.opts[Math.floor(set.rand() * a.opts.length)];
          else q[a.key] = Math.round((a.min + set.rand() * (a.max - a.min)) / a.step) * a.step;
        });
        set.list.push({ q: q, s: score(simulate(q), q), jit: jitter(set.rand) });
      }
      lines(); overlay();
      if (set.list.length < SAMPLES) setTimeout(chunk, 0);
      else growing = false;
    })();
  }

  function kept(item, ys) {
    var ax = axes();
    for (var key in brushes) {
      var i = ax.findIndex(function (a) { return a.key === key; });
      if (i < 0) continue;
      var b = brushes[key], y = ys[i];
      if (y < b[0] - 3.5 || y > b[1] + 3.5) return false;
    }
    return true;
  }

  var drawnYs = [];
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
    drawnYs = [];
    if (!set) return;
    var rgs = ranges(), on = [], off = [], rank = OUTS[lens][0];
    set.list.forEach(function (item) {
      var ys = ysOf(item, rgs);
      drawnYs.push({ item: item, ys: ys, keep: kept(item, ys) });
    });
    drawnYs.forEach(function (d) { (d.keep ? on : off).push(d); });
    function trace(d) {
      eCtx.beginPath();
      d.ys.forEach(function (y, i) { if (i) eCtx.lineTo(axisX(i), y); else eCtx.moveTo(axisX(i), y); });
      eCtx.stroke();
    }
    eCtx.lineWidth = 0.75;
    eCtx.strokeStyle = getComputedStyle(eSvg).color;
    eCtx.globalAlpha = 0.05;
    off.forEach(trace);
    // Tinted from the city's best house by the lens's first result (blue) to
    // its worst (red); the worst on top.
    var rg = range(rank), sign = rank.better === "high" ? -1 : 1;
    var badness = function (d) { return sign * (d.item.s[rank.key] - (sign > 0 ? rg[0] : rg[1])) / (rg[1] - rg[0]); };
    eCtx.globalAlpha = Object.keys(brushes).length ? 0.55 : 0.3;
    on.sort(function (a, b) { return badness(a) - badness(b); });
    on.forEach(function (d) {
      var c = tint(21 + 15 * Math.max(0, Math.min(1, badness(d))));
      eCtx.strokeStyle = "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")";
      trace(d);
    });
    eCtx.globalAlpha = 1;
    every.dataset.kept = on.length;
  }

  function overlay() {
    var o = [], ax = axes(), rgs = ranges();
    ax.forEach(function (a, i) {
      var x = axisX(i), dim = a.power && a.power !== p.power ? " dim" : "";
      o.push('<g class="axis' + (a.out ? " out" : "") + dim + '">');
      o.push(line([x, MT], [x, VH - MB], "spine"));
      o.push('<text class="name" transform="translate(' + (x - 2) + "," + (MT - 10) + ') rotate(-40)">' + a.name +
             (a.unit ? ' <tspan class="unit">' + a.unit + "</tspan>" : "") + "</text>");
      var ticks = a.opts ? a.opts.map(function (op, j) { return [frac(a, op), (a.show || a.opts)[j]]; })
                         : [[0, (a.tick || a.fmt)(rgs[i][0])], [1, (a.tick || a.fmt)(rgs[i][1])]];
      ticks.forEach(function (t) {
        var y = axisY(t[0]);
        o.push(line([x - 2.5, y], [x + 2.5, y], "tick"));
        o.push('<text class="opt" x="' + (x + 3.5) + '" y="' + (y - 3) + '">' + t[1] + "</text>");
      });
      var b = brushes[a.key];
      if (b) o.push('<rect class="brush" x="' + (x - 5) + '" y="' + b[0].toFixed(1) + '" width="10" height="' + Math.max(1, b[1] - b[0]).toFixed(1) + '"/>');
      o.push("</g>");
    });
    if (hover) o.push(polyline(ysOf(hover, rgs).map(function (y, i) { return [axisX(i), y]; }), "hover"));
    var mine = ysOf({ q: p, s: built, jit: [0.5] }, rgs);
    o.push(polyline(mine.map(function (y, i) { return [axisX(i), y]; }), "current"));
    mine.forEach(function (y, i) { o.push('<circle class="node" cx="' + axisX(i).toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.25"/>'); });
    eSvg.innerHTML = o.join("");
    eReadout();
  }

  function describe(q, s) {
    var bits = PARAMS.map(function (a) {
      return a.opts ? a.name.toLowerCase() + " " + (a.show || a.opts)[a.opts.indexOf(q[a.key])].toLowerCase()
                    : a.name.toLowerCase() + " " + a.fmt(q[a.key]);
    });
    var res = OUTS[lens].map(function (a) { return (a.tick)(s[a.key]) + " " + (a.name + " " + a.unit).toLowerCase(); });
    return bits.join(", ") + ". " + res.join("; ") + ".";
  }

  function eReadout() {
    var set = pool[p.city], n = set ? set.list.length : 0;
    var source = runs && runs.cities[p.city] ? "EnergyPlus runs" : "houses";
    if (hover) { eRead.textContent = describe(hover.q, hover.s) + " Click to build it."; return; }
    if (!(runs && runs.cities[p.city]) && n < SAMPLES) { eRead.textContent = "Simulating " + p.city + ", " + n + " of " + SAMPLES + " houses…"; return; }
    var k = every.dataset.kept || n;
    eRead.textContent = Object.keys(brushes).length
      ? k + " of " + n + " " + source + " kept. Point at a line to try it above. Click an axis to let it go."
      : n + " " + source + " in " + p.city + ", from the best (blue) to the worst (red) by " + OUTS[lens][0].name.toLowerCase() +
        ". Point at a line to try it in the drawing, click to build it, drag along an axis to keep some.";
  }

  function eAt(e) {
    var r = eSvg.getBoundingClientRect();
    return [(e.clientX - r.left) * VW / r.width, (e.clientY - r.top) * VH / r.height];
  }
  function nearest(pt) {
    if (pt[0] < ML || pt[0] > VW - MR || pt[1] < MT - 4) return null;
    var n = axes().length, g = gap();
    var i = Math.min(n - 2, Math.floor((pt[0] - ML) / g)), f = (pt[0] - axisX(i)) / g;
    var best = null, d0 = 6;
    drawnYs.forEach(function (d) {
      if (!d.keep) return;
      var dist = Math.abs(d.ys[i] + (d.ys[i + 1] - d.ys[i]) * f - pt[1]);
      if (dist < d0) { d0 = dist; best = d.item; }
    });
    return best;
  }
  function point(item) {
    if (item === hover) return;
    hover = item;
    show(item ? Object.assign({}, p, item.q, { city: p.city, power: p.power }) : p);
    overlay();
  }

  var eDrag = null;
  eSvg.addEventListener("pointerdown", function (e) {
    if (e.button > 0) return;
    var pt = eAt(e), i = Math.round((pt[0] - ML) / gap());
    var onAxis = i >= 0 && i < axes().length && Math.abs(pt[0] - axisX(i)) < 7 && pt[1] > MT - 6;
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
        brushes[axes()[eDrag.axis].key] = [lo, hi];
        point(null);
        lines(); overlay();
      }
      return;
    }
    if (e.pointerType !== "touch") point(nearest(pt));
  });
  eSvg.addEventListener("pointerup", function (e) {
    var d = eDrag;
    eDrag = null;
    if (!d || d.moved) return;
    if (d.axis >= 0) { delete brushes[axes()[d.axis].key]; lines(); overlay(); return; }
    var pick = nearest(eAt(e));
    if (pick) build(pick.q);
  });
  eSvg.addEventListener("pointercancel", function () { eDrag = null; });
  eSvg.addEventListener("pointerleave", function () { if (!eDrag) point(null); });

  function build(q) {
    cancelAdapt();
    hover = null;
    PARAMS.forEach(function (a) { p[a.key] = q[a.key]; });
    syncControls();
    rerun();
  }

  function everyNow() {
    if (eVisible) grow();
    lines(); overlay();
  }

  new IntersectionObserver(function (es) {
    eVisible = es[0].isIntersecting;
    if (eVisible) { loadRuns(); grow(); }
  }).observe(every);

  // ------------------------------------------------------------------- loop

  function settle() {
    if (still.matches) { shown = Object.assign(target(), { built: 1 }); render(); paint(0); return; }
    wake();
  }
  function moving() {
    var t = target();
    return shown.built < 1 || FORM.some(function (k) { return Math.abs(t[k] - shown[k]) > 1e-3; });
  }
  function ease2(dt) {
    var t = target(), f = 1 - Math.exp(-dt * 7);
    FORM.forEach(function (k) {
      var g = t[k] - shown[k];
      if (k === "turn") g = ((g + 540) % 360) - 180;
      shown[k] = Math.abs(g) < 1e-3 ? t[k] : shown[k] + g * f;
      if (k === "turn") shown[k] = (shown[k] + 360) % 360;
    });
    if (seen && shown.built < 1) shown.built = Math.min(1, shown.built + dt / 2.2);
  }

  var visibleNow = false, seen = false, last = 0, raf = 0, drawnAt = -1;
  function step(t) {
    raf = 0;
    if (!visibleNow) return;
    var dt = last ? Math.min(0.1, (t - last) / 1000) : 0;
    last = t;
    var redraw = false;
    if (moving()) { ease2(dt); redraw = true; }
    if (playing && !scrub && !drag && t > idleUntil && shown.built >= 1 && lens !== "carbon") {
      hour = (hour + dt * 3) % 168;     // three hours a second
      moveHead();
      if (Math.abs(hour - drawnAt) > 0.08 || hour < drawnAt) {
        redraw = true; drawnAt = hour;
        if (lens === "light") readout(); else now();
      }
    }
    if (redraw) render();
    paint(dt);
    raf = requestAnimationFrame(step);   // not wake(), which restarts the clock
  }
  function wake() {
    if (!raf && visibleNow && !still.matches) { last = 0; raf = requestAnimationFrame(step); }
  }

  new IntersectionObserver(function (es) {
    visibleNow = es[0].isIntersecting;
    if (visibleNow) { seen = true; loadModel(); wake(); }
  }).observe(stage);

  new MutationObserver(function () { render(); chart(); lines(); overlay(); paint(0); }).observe(document.documentElement,
    { attributes: true, attributeFilter: ["data-theme", "data-font"] });
  window.addEventListener("resize", function () { size(); lines(); });

  fig.querySelector('[data-act="play"]').setAttribute("aria-pressed", String(playing));
  syncControls();
  render(); chart(); readout(); size(); overlay();
})();
