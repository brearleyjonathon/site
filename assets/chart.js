// Charts on a project page. build.py turns an image line pointing at a
// .json into a <figure class="chart"> with the data inlined; this draws it
// as horizontal bars, in the page's ink, with switches for the views.
//
// The data:
//   switches  [{label, options: [...]}]   one switch per row of choices
//   legend    [[style, name], ...]        style "hollow" or "solid"
//   sets      {"Option / Option": {unit, axis, max, note, compare, rows}}
//             keyed by the pressed options, joined by " / "
//   rows      [{label, values: [...], style?}]
// A bar takes its row's style if it has one, else its legend entry's. axis
// is the line above the bars saying what they measure; max fixes the scale,
// so the same measure compares across views.
// compare, if given, is {to: "series" | "row", name}: hovering a bar says
// how it differs from the first series in its row, or from the first row.
(function () {
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function number(v) {
    return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  function draw(figure) {
    var data = JSON.parse(figure.querySelector("script").textContent);
    var switches = data.switches || [];
    var chosen = switches.map(function (s) { return s.options[0]; });
    var legend = data.legend || [];

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
          show();
        });
        group.appendChild(b);
        return b;
      });
      controls.appendChild(group);
      return list;
    });
    if (switches.length) figure.appendChild(controls);

    if (legend.length) {
      var keys = el("ul", "chart-legend");
      legend.forEach(function (entry) {
        var li = el("li");
        li.appendChild(el("span", "key " + entry[0]));
        li.appendChild(document.createTextNode(entry[1]));
        keys.appendChild(li);
      });
      figure.appendChild(keys);
    }

    var axis = el("p", "chart-axis");
    var plot = el("div", "chart-plot");
    var readout = el("p", "chart-readout");
    readout.setAttribute("aria-live", "polite");
    figure.appendChild(axis);
    figure.appendChild(plot);
    figure.appendChild(readout);

    var set, bars = [];

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
      bars.forEach(function (b) { b.classList.remove("on"); });
      readout.textContent = set.note || "";
    }

    function show() {
      buttons.forEach(function (list, i) {
        list.forEach(function (b) {
          b.setAttribute("aria-pressed", String(b.textContent === chosen[i]));
        });
      });
      set = data.sets[chosen.join(" / ")];
      axis.textContent = set.axis || set.unit;
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

      bars = [];
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
          bars.push(bar);
        });
      });
      rest();
    }

    function point(e) {
      var bar = e.currentTarget;
      figure.classList.add("pointing");
      bars.forEach(function (b) { b.classList.toggle("on", b === bar); });
      readout.textContent = say.apply(null, bar._say);
    }

    plot.addEventListener("mouseleave", function () {
      if (!plot.contains(document.activeElement)) rest();
    });
    plot.addEventListener("focusout", function (e) {
      if (!plot.contains(e.relatedTarget)) rest();
    });

    show();
  }

  document.querySelectorAll("figure.chart").forEach(function (figure) {
    try {
      draw(figure);
    } catch (e) {
      // A broken chart leaves its title, not a broken page.
      console.error(e);
    }
  });
})();
