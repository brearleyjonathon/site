"""Run the house through EnergyPlus, many times over.

    python tools/house_sweep/sweep.py --energyplus PATH/TO/energyplus \
        --weather PATH/TO/weather --n 800 --jobs 4

Draws n designs by Latin hypercube over the settings in PARAMS below (the same
ranges as PARAMS in assets/house.js), the same designs for every city, and runs
each through each city's hottest week twice, with the power on and with it
cut. Each run's hot week is read back from its SQLite output and written as
one line of runs/<city>.jsonl; the run's own folder is then deleted. Runs
already in the file are skipped, so a sweep can be stopped and picked up.
"""

import argparse
import json
import math
import os
import random
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from concurrent.futures import ProcessPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(__file__))
from house_idf import CITIES, hot_week, idf  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
COP = 3.0

# key: (low, high) for a slider, or a list of options for a switch.
PARAMS = {
    "turn": (0, 360), "ground": ["Raised", "Grade", "Sunken"], "overhang": (0, 2), "glazing": (0.1, 0.6),
    "shgc": (0.2, 0.7), "shade": (0, 1), "wallR": (0.5, 8), "floorR": (0, 5), "reflect": (0.05, 0.9),
    "mass": (20, 400), "setpoint": (20, 28), "air": (0, 1.5), "erv": (0, 0.9), "windows": ["Shut", "Day", "Night"],
}

VARS = {
    "Site Outdoor Air Drybulb Temperature": "tout",
    "Zone Mean Air Temperature": "tin",
    "Zone Ideal Loads Supply Air Total Cooling Energy": "cool",
    "Daylighting Reference Point 1 Illuminance": "luxFront",
    "Daylighting Reference Point 2 Illuminance": "luxBack",
    "Zone Ventilation Current Density Air Change Rate": "achWindows",
    "Zone Infiltration Current Density Air Change Rate": "achLeaks",
    "Zone Mechanical Ventilation Air Changes per Hour": "achFan",
}


def designs(n, seed=7):
    """n designs by Latin hypercube: each slider's range cut into n equal
    strata, one draw from each, shuffled; each switch's options dealt evenly."""
    rnd = random.Random(seed)
    cols = {}
    for key, spec in PARAMS.items():
        if isinstance(spec, list):
            col = [spec[i % len(spec)] for i in range(n)]
        else:
            lo, hi = spec
            col = [lo + (hi - lo) * (i + rnd.random()) / n for i in range(n)]
        rnd.shuffle(col)
        cols[key] = col
    out = []
    for i in range(n):
        d = {k: (round(v, 4) if isinstance(v, float) else v) for k, v in ((k, cols[k][i]) for k in PARAMS)}
        out.append(d)
    return out


def read_sql(path):
    con = sqlite3.connect(path)
    rows = con.execute(
        """SELECT d.Name, r.Value FROM ReportData r
           JOIN ReportDataDictionary d ON r.ReportDataDictionaryIndex = d.ReportDataDictionaryIndex
           JOIN Time t ON r.TimeIndex = t.TimeIndex
           WHERE t.WarmupFlag IS NULL OR t.WarmupFlag = 0
           ORDER BY d.Name, r.TimeIndex""").fetchall()
    con.close()
    series = {}
    for name, value in rows:
        series.setdefault(name, []).append(value)
    out = {}
    for name, key in VARS.items():
        vals = series.get(name, [])[-168:]
        if len(vals) < 168:
            vals = [0.0] * (168 - len(vals)) + vals   # a variable never reported (no windows, no fan) is zero
        out[key] = vals
    out["kw"] = [v / 3.6e6 / COP for v in out.pop("cool")]   # J an hour to average electric kW
    return out


def run_one(energyplus, epw, city, start, index, design, power):
    work = tempfile.mkdtemp(prefix="house-")
    try:
        path = os.path.join(work, "in.idf")
        with open(path, "w") as f:
            f.write(idf(design, city, power, start))
        proc = subprocess.run([energyplus, "-w", epw, "-d", work, path], capture_output=True, text=True)
        sql = os.path.join(work, "eplusout.sql")
        if proc.returncode != 0 or not os.path.exists(sql):
            err = os.path.join(work, "eplusout.err")
            tail = open(err).read()[-1500:] if os.path.exists(err) else proc.stdout[-1500:]
            return {"index": index, "power": power, "error": tail}
        res = read_sql(sql)
        return {"index": index, "power": power, "design": design,
                **{k: [round(v, 3) for v in vals] for k, vals in res.items()}}
    finally:
        shutil.rmtree(work, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--energyplus", required=True)
    ap.add_argument("--weather", required=True, help="folder holding the EPW files named in house_idf.CITIES")
    ap.add_argument("--n", type=int, default=800)
    ap.add_argument("--jobs", type=int, default=os.cpu_count())
    ap.add_argument("--cities", default=",".join(CITIES))
    ap.add_argument("--out", default=os.path.join(HERE, "runs"))
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    plan = designs(args.n)
    for city in args.cities.split(","):
        epw = os.path.join(args.weather, CITIES[city])
        start = hot_week(epw)
        path = os.path.join(args.out, city + ".jsonl")
        done = set()
        if os.path.exists(path):
            for line in open(path):
                r = json.loads(line)
                done.add((r["index"], r["power"]))
        todo = [(i, d, pw) for i, d in enumerate(plan) for pw in ("Off", "On") if (i, pw) not in done]
        print("%s: hot week from day %d, %d runs to do" % (city, start, len(todo)), flush=True)
        failed = 0
        with ProcessPoolExecutor(args.jobs) as pool, open(path, "a") as out:
            jobs = [pool.submit(run_one, args.energyplus, epw, city, start, i, d, pw) for i, d, pw in todo]
            for k, job in enumerate(as_completed(jobs), 1):
                r = job.result()
                if "error" in r:
                    failed += 1
                    if failed <= 3:
                        print("run %d %s failed:\n%s" % (r["index"], r["power"], r["error"]), flush=True)
                    continue
                r["city"] = city
                r["start"] = start
                out.write(json.dumps(r) + "\n")
                if k % 50 == 0:
                    out.flush()
                    print("  %s %d/%d" % (city, k, len(todo)), flush=True)
        print("%s: done, %d failed" % (city, failed), flush=True)


if __name__ == "__main__":
    main()
