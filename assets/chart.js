// Charts on a project page. build.py turns an image line pointing at a
// .json into a <figure class="chart"> with the data inlined; this draws it
// in the page's ink, with switches for its views.
//
// Every chart:
//   switches  [{label, options: [...]}]   one switch per row of choices
//   sets      {"Option / Option": {...}}  keyed by the pressed options,
//                                         joined by " / "
//   axis      the line above the plot saying what it measures (a set's
//             own axis wins)
//
// Bars (the default type): each set is {unit, max, note, compare, rows},
// rows [{label, values: [...], style?}], and the chart has a legend
// [[style, name], ...] with style "hollow" or "solid". A bar takes its
// row's style if it has one, else its legend entry's. max fixes the scale,
// so one measure compares across views. compare, if given, is
// {to: "series" | "row", name}: pointing at a bar says how it differs from
// the first series in its row, or from the first row.
//
// Lines (type "lines"): x {max, step, label}, y {min, max, ticks}, unit,
// marks [{y, label}] for level lines, event {x, label} for a moment, and
// each set is {note, series: [{name, style, values}]}, one value per step
// of x, style "dotted", "thin", "dashed" or "solid". The lines draw on from
// the left when the chart first comes into view and on every switch.
(function () {
  var SVG = "http://www.w3.org/2000/svg";
  var still = window.matchMedia("(prefers-reduced-motion: reduce)");
  var uid = 0;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function svg(tag, attrs, parent) {
    var e = document.createElementNS(SVG, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function number(v) {
    return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  // The switch rows, the axis line, the legend and the readout that every
  // chart has. show() is called with the chosen set on every switch.
  function frame(figure, data, show) {
    var switches = data.switches || [];
    var chosen = switches.map(function (s) { return s.options[0]; });
    var parts = {};

    var controls = el("div", "chart-controls");
    var buttons = switches.map(function (s, i) {
      var group = el("div", "switch");
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", s.label);
      var list = s.options.map(function (option) {
        var b = el("button", null, option);
        b.type = "button";
        b.addEventListener("click", function () {
          chosen[i] = option;
          choose();
        });
        group.appendChild(b);
        return b;
      });
      controls.appendChild(group);
      return list;
    });
    if (switches.length) figure.appendChild(controls);

    parts.legend = el("ul", "chart-legend");
    parts.axis = el("p", "chart-axis");
    parts.plot = el("div", "chart-plot");
    parts.readout = el("p", "chart-readout");
    parts.readout.setAttribute("aria-live", "polite");
    [parts.legend, parts.axis, parts.plot, parts.readout].forEach(function (p) {
      figure.appendChild(p);
    });

    parts.keys = function (entries) {
      parts.legend.textContent = "";
      entries.forEach(function (entry) {
        var li = el("li");
        li.appendChild(el("span", "key " + entry[0]));
        li.appendChild(document.createTextNode(entry[1]));
        parts.legend.appendChild(li);
      });
    };

    function choose() {
      buttons.forEach(function (list, i) {
        list.forEach(function (b) {
          b.setAttribute("aria-pressed", String(b.textContent === chosen[i]));
        });
      });
      var set = data.sets[chosen.join(" / ")];
      parts.axis.textContent = set.axis || data.axis || set.unit || "";
      show(set);
    }

    parts.choose = choose;
    return parts;
  }

  // ------------------------------------------------------------------ bars

  function bars(figure, data) {
    var legend = data.legend || [];
    var set, all = [];
    var parts = frame(figure, data, show);
    var plot = parts.plot, readout = parts.readout;
    if (legend.length) parts.keys(legend);

    function differ(v, base, name) {
      if (!base) return "";
      var change = Math.round((v - base) / base * 100);
      if (change === 0) return ", the same as " + name;
      return ", " + Math.abs(change) + "% " + (change < 0 ? "less" : "more") + " than " + name;
    }

    function say(row, j, r) {
      var v = row.values[j];
      var name = legend[j] && row.values.length > 1 ? legend[j][1] + ", " : "";
      var text = name + row.label + ": " + number(v) + " " + set.unit;
      var c = set.compare;
      if (c && c.to === "series" && j > 0) text += differ(v, row.values[0], c.name);
      if (c && c.to === "row" && r > 0) text += differ(v, set.rows[0].values[j], c.name);
      return text + ".";
    }

    function rest() {
      figure.classList.remove("pointing");
      all.forEach(function (b) { b.classList.remove("on"); });
      readout.textContent = set.note || "";
    }

    function point(e) {
      var bar = e.currentTarget;
      figure.classList.add("pointing");
      all.forEach(function (b) { b.classList.toggle("on", b === bar); });
      readout.textContent = say.apply(null, bar._say);
    }

    function show(chosen) {
      set = chosen;
      var max = set.max || Math.max.apply(null, set.rows.map(function (r) {
        return Math.max.apply(null, r.values);
      }));

      // Same rows as last time: move the bars rather than rebuild them, so
      // switching views animates from one to the other.
      var same = plot.childElementCount === set.rows.length &&
        set.rows.every(function (row, r) {
          return plot.children[r].querySelectorAll(".bar").length === row.values.length;
        });
      if (!same) {
        plot.textContent = "";
        set.rows.forEach(function () {
          var line = el("div", "chart-row");
          line.appendChild(el("span", "chart-label"));
          line.appendChild(el("span", "chart-bars"));
          plot.appendChild(line);
        });
      }

      all = [];
      set.rows.forEach(function (row, r) {
        var line = plot.children[r];
        line.querySelector(".chart-label").textContent = row.label;
        var holder = line.querySelector(".chart-bars");
        row.values.forEach(function (v, j) {
          var bar = same ? holder.children[j] : null;
          if (!bar) {
            bar = el("button", "bar");
            bar.type = "button";
            bar.appendChild(el("span", "bar-fill"));
            bar.appendChild(el("span", "bar-value"));
            holder.appendChild(bar);
            bar.addEventListener("mouseenter", point);
            bar.addEventListener("focus", point);
            bar.addEventListener("click", point);
          }
          bar.className = "bar " + (row.style || (legend[j] || ["solid"])[0]);
          bar.style.setProperty("--v", String(max ? v / max : 0));
          bar.querySelector(".bar-value").textContent = number(v);
          bar.setAttribute("aria-label", say(row, j, r));
          bar._say = [row, j, r];
          all.push(bar);
        });
      });
      rest();
    }

    plot.addEventListener("mouseleave", function () {
      if (!plot.contains(document.activeElement)) rest();
    });
    plot.addEventListener("focusout", function (e) {
      if (!plot.contains(e.relatedTarget)) rest();
    });

    parts.choose();
  }

  // ----------------------------------------------------------------- lines

  function lines(figure, data) {
    var id = "chart-clip-" + (++uid);
    var x = data.x, y = data.y;
    var set, box, reveal, hour = null, seen = false, timer = 0;
    var parts = frame(figure, data, show);
    var plot = parts.plot, readout = parts.readout;
    plot.classList.add("lines");
    plot.tabIndex = 0;

    // Room for the tick labels on the left and below.
    var pad = { l: 26, r: 6, t: 18, b: 22 };

    function sx(v) { return pad.l + v / x.max * (box.w - pad.l - pad.r); }
    function sy(v) { return pad.t + (y.max - v) / (y.max - y.min) * (box.h - pad.t - pad.b); }

    function draw() {
      var w = plot.clientWidth;
      if (!w) return;
      box = { w: w, h: Math.round(Math.max(210, Math.min(330, w * 0.56))) };
      plot.textContent = "";
      var s = svg("svg", { width: box.w, height: box.h, viewBox: "0 0 " + box.w + " " + box.h,
        role: "img", "aria-label": (figure.querySelector(".chart-title") || {}).textContent + ". " + (set.note || "") }, plot);

      var grid = svg("g", { "class": "grid" }, s);
      y.ticks.forEach(function (t) {
        svg("line", { x1: pad.l, x2: box.w - pad.r, y1: sy(t), y2: sy(t) }, grid);
        svg("text", { x: pad.l - 6, y: sy(t), dy: "0.32em", "text-anchor": "end" }, grid).textContent = t;
      });
      for (var t = 0; t <= x.max; t += x.step) {
        svg("text", { x: sx(t), y: box.h - 6, "text-anchor": t === 0 ? "start" : t === x.max ? "end" : "middle" }, grid)
          .textContent = t;
      }

      (data.marks || []).forEach(function (m) {
        var g = svg("g", { "class": "mark" }, s);
        svg("line", { x1: pad.l, x2: box.w - pad.r, y1: sy(m.y), y2: sy(m.y) }, g);
        // Labelled at the left, where the week has not yet begun to cross it.
        svg("text", { x: pad.l + 4, y: sy(m.y) - 4 }, g).textContent = m.label;
      });
      if (data.event) {
        var g = svg("g", { "class": "event" }, s);
        svg("line", { x1: sx(data.event.x), x2: sx(data.event.x), y1: pad.t - 4, y2: box.h - pad.b }, g);
        svg("text", { x: sx(data.event.x) + 4, y: pad.t - 6 }, g).textContent = data.event.label;
      }

      // The lines, under a clip that opens from the left to draw them on.
      var clip = svg("clipPath", { id: id }, svg("defs", {}, s));
      reveal = svg("rect", { x: 0, y: 0, width: seen ? box.w : 0, height: box.h }, clip);
      var group = svg("g", { "clip-path": "url(#" + id + ")" }, s);
      set.series.forEach(function (series) {
        var d = series.values.map(function (v, i) {
          return (i ? "L" : "M") + sx(i * x.max / (series.values.length - 1)).toFixed(1) + " " + sy(v).toFixed(1);
        }).join("");
        svg("path", { d: d, "class": "series " + series.style }, group);
      });

      svg("line", { "class": "cross", y1: pad.t, y2: box.h - pad.b }, s);
      if (hour != null) mark(hour);
    }

    // Draw the lines on, left to right, as if the week were passing.
    function sweep() {
      seen = true;
      cancelAnimationFrame(timer);
      if (!reveal) draw();   // it had no width when the page loaded
      if (!reveal) return;
      var full = box.w;
      if (still.matches) { reveal.setAttribute("width", full); return; }
      var start = performance.now(), length = 2600;
      reveal.setAttribute("width", 0);
      (function step(now) {
        var p = Math.min(1, (now - start) / length);
        p = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        reveal.setAttribute("width", full * p);
        if (p < 1) timer = requestAnimationFrame(step);
      })(start);
    }

    function show(chosen) {
      set = chosen;
      parts.keys(set.series.map(function (s) { return ["line " + s.style, s.name]; }));
      draw();
      if (seen) sweep();
      rest();
    }

    function rest() {
      hour = null;
      var cross = plot.querySelector(".cross");
      if (cross) cross.classList.remove("on");
      readout.textContent = set.note || "";
    }

    function mark(h) {
      hour = Math.max(0, Math.min(x.max, h));
      var cross = plot.querySelector(".cross");
      cross.setAttribute("x1", sx(hour));
      cross.setAttribute("x2", sx(hour));
      cross.classList.add("on");
      var i = Math.round(hour / x.max * (set.series[0].values.length - 1));
      readout.textContent = (x.label ? x.label.charAt(0).toUpperCase() + x.label.slice(1) + " " : "") + hour + ": " +
        set.series.map(function (s) {
          return s.name + " " + number(s.values[i]);
        }).join(", ") + " " + data.unit + ".";
    }

    function at(e) {
      if (!box) return;
      var r = plot.getBoundingClientRect();
      var v = (e.clientX - r.left - pad.l) / (box.w - pad.l - pad.r) * x.max;
      if (v >= -2 && v <= x.max + 2) mark(Math.round(v));
    }

    plot.addEventListener("pointermove", at);
    plot.addEventListener("pointerdown", at);
    plot.addEventListener("pointerleave", function (e) {
      if (e.pointerType === "mouse") rest();
    });
    plot.addEventListener("keydown", function (e) {
      var step = e.shiftKey ? 24 : 1;
      if (!box) return;
      if (e.key === "ArrowRight") mark(hour == null ? 0 : hour + step);
      else if (e.key === "ArrowLeft") mark(hour == null ? x.max : hour - step);
      else if (e.key === "Escape") rest();
      else return;
      e.preventDefault();
    });
    plot.addEventListener("blur", rest);

    parts.choose();

    var width = plot.clientWidth;
    function resized() {
      if (plot.clientWidth !== width) { width = plot.clientWidth; draw(); }
    }
    window.addEventListener("resize", resized);
    if ("ResizeObserver" in window) new ResizeObserver(resized).observe(plot);
    if ("IntersectionObserver" in window) {
      var watch = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { watch.disconnect(); sweep(); }
      }, { threshold: 0.5 });
      watch.observe(plot);
    } else {
      sweep();
    }
  }

  document.querySelectorAll("figure.chart").forEach(function (figure) {
    try {
      var data = JSON.parse(figure.querySelector("script").textContent);
      (data.type === "lines" ? lines : bars)(figure, data);
    } catch (e) {
      // A broken chart leaves its title, not a broken page.
      console.error(e);
    }
  });
})();
