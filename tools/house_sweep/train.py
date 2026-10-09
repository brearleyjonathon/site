"""Turn the sweep's runs into what the page loads.

    python tools/house_sweep/train.py

Reads runs/<city>.jsonl (from sweep.py) and writes two files to assets/:

house-model.json  For each city: the hot week's weather (outdoor air, direct
                  and diffuse sun, hour by hour, from the EPW), and a small
                  network that takes a design to the week, hour by hour:
                  indoor air with the power cut and on, the cooling's
                  electricity, daylight at the two desks, and air changes
                  through the windows with the power cut and on. Each of those
                  is squeezed to its first principal components; the network
                  (two tanh layers) predicts their weights. assets/house.js,
                  surrogate(), runs it.
house-runs.json   For the plot of every house: each run's settings and the
                  scores of its week, in compact rows.

It holds back a fifth of the runs, reports how far the network's weeks are
from EnergyPlus's on those, then refits on everything.
"""

import json
import math
import os
import sys

import numpy as np
from sklearn.neural_network import MLPRegressor

sys.path.insert(0, os.path.dirname(__file__))
from house_idf import CITIES, read_epw  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
WEATHER = os.environ.get("HOUSE_WEATHER", "/home/user/natlabrockies/energyplus/weather")
RUNS = os.environ.get("HOUSE_RUNS", os.path.join(HERE, "runs"))
OUT = os.environ.get("HOUSE_OUT", os.path.join(ROOT, "assets"))

PARAMS = ["turn", "ground", "overhang", "glazing", "shgc", "shade", "wallR", "floorR", "reflect",
          "mass", "setpoint", "air", "erv", "windows"]
OPTS = {"ground": ["Raised", "Grade", "Sunken"], "windows": ["Shut", "Day", "Night"]}
# key in the page, (power, key in the run), components kept, lowest value
OUTPUTS = [
    ("off", ("Off", "tin"), 12, None),
    ("on", ("On", "tin"), 10, None),
    ("kw", ("On", "kw"), 12, 0),
    ("luxFront", ("Off", "luxFront"), 12, 0),
    ("luxBack", ("Off", "luxBack"), 12, 0),
    ("achOff", ("Off", "achWindows"), 10, 0),
    ("achOn", ("On", "achWindows"), 10, 0),
]
LEAKS = 0.2


def features(d):
    t = math.radians(d["turn"])
    return [math.sin(t), math.cos(t)] + [1.0 if d["ground"] == o else 0.0 for o in OPTS["ground"]] + [
        d["overhang"], d["glazing"], d["shgc"], d["shade"], d["wallR"], d["floorR"], d["reflect"],
        d["mass"], d["setpoint"], d["air"], d["erv"]] + [1.0 if d["windows"] == o else 0.0 for o in OPTS["windows"]]


def scores(off, on, d, light):
    """The same scores as score() in house.js, from EnergyPlus's week."""
    s = {"hot": int(sum(1 for v in off["tin"] if v > 32)), "peak": max(off["tin"]),
         "dh": sum(max(0, v - 26) for v in off["tin"]), "kwh": sum(on["kw"]), "peakKw": max(on["kw"]),
         "back300": sum(1 for h in range(168) if light[h] and off["luxBack"][h] >= 300),
         "front300": sum(1 for h in range(168) if light[h] and off["luxFront"][h] >= 300),
         "glare": sum(1 for h in range(168) if light[h] and off["luxFront"][h] > 3000),
         "achOff": sum(v + LEAKS for v in off["achWindows"]) / 168,
         "achOn": sum(v + LEAKS + d["air"] for v in on["achWindows"]) / 168}
    return s


SCORES = ["hot", "peak", "dh", "kwh", "peakKw", "back300", "front300", "glare", "achOff", "achOn"]


def pack(a):
    return [float("%.5g" % v) for v in np.asarray(a).ravel()]


def fit_city(city, runs):
    pairs = {}
    for r in runs:
        pairs.setdefault(r["index"], {})[r["power"]] = r
    both = [v for v in pairs.values() if "Off" in v and "On" in v]
    designs = [v["Off"]["design"] for v in both]
    X = np.array([features(d) for d in designs])
    Ys = {}
    for key, (power, field), k, floor in OUTPUTS:
        Ys[key] = np.array([v[power][field] for v in both])

    # Weather: the hot week from the EPW, hour-ending, as EnergyPlus read it.
    epw = read_epw(os.path.join(WEATHER, CITIES[city]))
    start = both[0]["Off"]["start"]
    sl = slice(start * 24, start * 24 + 168)
    weather = {"tout": [round(v, 2) for v in epw["t"][sl]], "dni": [round(v) for v in epw["dni"][sl]],
               "dhi": [round(v) for v in epw["dhi"][sl]]}
    light = [v > 5 for v in weather["dhi"]]

    mean, std = X.mean(0), X.std(0) + 1e-9
    Xn = (X - mean) / std
    n = len(X)
    rng = np.random.default_rng(1)
    order = rng.permutation(n)
    test, trainset = order[: n // 5], order[n // 5:]

    def compress(idx):
        comps, targets = {}, []
        for key, _, k, _ in OUTPUTS:
            Y = Ys[key][idx]
            mu = Y.mean(0)
            U, S, Vt = np.linalg.svd(Y - mu, full_matrices=False)
            k = min(k, len(S))
            Z = (Y - mu) @ Vt[:k].T
            scale = Z.std(0) + 1e-9
            comps[key] = (mu, Vt[:k], scale)
            targets.append(Z / scale)
        return comps, np.hstack(targets)

    def net():
        return MLPRegressor(hidden_layer_sizes=(64, 64), activation="tanh", alpha=1e-4,
                            learning_rate_init=2e-3, max_iter=3000, early_stopping=True,
                            validation_fraction=0.1, n_iter_no_change=60, random_state=1)

    def predict(model, comps, Xin):
        Z = model.predict(Xin)
        out, at = {}, 0
        for key, _, k, floor in OUTPUTS:
            mu, V, scale = comps[key]
            kk = len(scale)
            Y = mu + (Z[:, at:at + kk] * scale) @ V
            if floor is not None:
                Y = np.maximum(floor, Y)
            out[key] = Y
            at += kk
        return out

    # How good it is: fit on four fifths, compare on the rest.
    comps, T = compress(trainset)
    model = net().fit(Xn[trainset], T)
    pred = predict(model, comps, Xn[test])
    report = {}
    for key, *_ in OUTPUTS:
        err = np.abs(pred[key] - Ys[key][test])
        report[key] = {"mae": round(float(err.mean()), 3), "p95": round(float(np.percentile(err, 95)), 3)}
    hot_true = (Ys["off"][test] > 32).sum(1)
    hot_pred = (pred["off"] > 32).sum(1)
    report["hoursOver32"] = {"mae": round(float(np.abs(hot_true - hot_pred).mean()), 2)}
    print(city, json.dumps(report))

    # Then on everything, for the page.
    comps, T = compress(np.arange(n))
    model = net().fit(Xn, T)
    layers = [{"rows": W.shape[1], "cols": W.shape[0], "w": pack(W.T), "b": pack(b)}
              for W, b in zip(model.coefs_, model.intercepts_)]
    outputs, at = [], 0
    for key, _, k, floor in OUTPUTS:
        mu, V, scale = comps[key]
        o = {"key": key, "at": at, "k": len(scale), "mean": pack(mu), "scale": pack(scale), "comps": pack(V)}
        if floor is not None:
            o["floor"] = floor
        outputs.append(o)
        at += len(scale)

    rows = []
    for v in both:
        d = v["Off"]["design"]
        s = scores(v["Off"], v["On"], d, light)
        row = [OPTS[p].index(d[p]) if p in OPTS else round(d[p], 3) for p in PARAMS]
        row += [round(s[k], 2) for k in SCORES]
        rows.append(row)

    return ({"start": start, "weather": weather, "norm": {"mean": pack(mean), "std": pack(std)},
             "layers": layers, "outputs": outputs, "error": report, "runs": n},
            {"rows": rows})


def main():
    model = {"version": 1, "features": ["sin turn", "cos turn", "raised", "grade", "sunken", "overhang", "glazing",
                                        "shgc", "shade", "wallR", "floorR", "reflect", "mass", "setpoint", "air",
                                        "erv", "windows shut", "windows day", "windows night"], "cities": {}}
    runs_out = {"params": PARAMS, "scores": SCORES, "cities": {}}
    for city in CITIES:
        path = os.path.join(RUNS, city + ".jsonl")
        if not os.path.exists(path):
            print(city, "has no runs yet")
            continue
        runs = [json.loads(line) for line in open(path)]
        m, r = fit_city(city, runs)
        model["cities"][city] = m
        runs_out["cities"][city] = r
    with open(os.path.join(OUT, "house-model.json"), "w") as f:
        json.dump(model, f, separators=(",", ":"))
    with open(os.path.join(OUT, "house-runs.json"), "w") as f:
        json.dump(runs_out, f, separators=(",", ":"))
    print("wrote house-model.json (%d KB) and house-runs.json (%d KB)" % (
        os.path.getsize(os.path.join(OUT, "house-model.json")) // 1024,
        os.path.getsize(os.path.join(OUT, "house-runs.json")) // 1024))


if __name__ == "__main__":
    main()
