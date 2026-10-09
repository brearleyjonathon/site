"""The house on the About page, as an EnergyPlus model.

One room, 10 x 7 m and 2.8 m high, the same box house.js draws. Its design is
the fourteen settings of PARAMS in assets/house.js; idf(design, city, power)
writes the input file for one run through the city's hottest week.

Each run is fourteen days: the week before the hot week, with the power on,
so the house arrives at the hot week cooled, then the hot week itself, either
with the power on throughout or cut at midnight as it begins ("power cut").
Only the hot week is read back.

What models what:
  ground      Kiva (Foundation:Kiva) for a slab on grade or sunk 0.4 m; a
              raised floor is open to the air beneath, out of the sun
  cooling     ideal loads to the setpoint, with the fresh air (air changes
              an hour) through a sensible ERV; both stop with the power
  windows     ZoneVentilation:WindandStackOpenArea on the schedule chosen; with
              the power on, only while it is cooler outside than in
  shading     an exterior shade on every window from 8 to 18, its opacity the
              slider's
  overhang    a shading surface round the roof edge
  daylight    two reference points at desk height, 1.5 m in from the front
              and back walls
"""

import math

L, D, H = 10.0, 7.0, 2.8
SUNK = 0.4                     # how far a sunken floor sits below grade
LAMBDA = 0.04                  # W/mK of the insulation, so thickness = R * LAMBDA
RHO_C = 2000.0                 # kJ/m3K of concrete, so slab thickness = mass / RHO_C

CITIES = {
    "DC":      "USA_VA_Sterling-Washington.Dulles.Intl.AP.724030_TMY3.epw",
    "Miami":   "USA_FL_Miami.Intl.AP.722020_TMY3.epw",
    "Fresno":  "USA_CA_Fresno.Air.Terminal.723890_TMY3.epw",
    "Phoenix": "USA_AZ_Phoenix-Sky.Harbor.Intl.AP.722780_TMY3.epw",
}

MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


def day_to_date(day):
    """Day of the year, from 0, to (month, day of month)."""
    for m, n in enumerate(MONTH_DAYS):
        if day < n:
            return m + 1, day + 1
        day -= n
    raise ValueError(day)


def read_epw(path):
    """Hourly dry-bulb (C), direct normal and diffuse horizontal (W/m2)."""
    rows = [line.split(",") for line in open(path, encoding="latin-1").read().splitlines()[8:] if line]
    return {
        "t": [float(r[6]) for r in rows],
        "dni": [float(r[14]) for r in rows],
        "dhi": [float(r[15]) for r in rows],
        "header": open(path, encoding="latin-1").readline().split(","),
    }


def hot_week(path):
    """The first day (0 to 364) of the seven with the highest mean daily high,
    with a week before it to settle in."""
    t = read_epw(path)["t"]
    highs = [max(t[d * 24:(d + 1) * 24]) for d in range(365)]
    best = max(range(7, 358), key=lambda d: sum(highs[d:d + 7]))
    return best


def windows(glazing):
    """The windows of each wall as (u0, u1, v0, v1): u along the wall from its
    left end seen from outside, v up from the floor. The same as house.js."""
    each = min(4.6, glazing * L * H / 2 / 2.1)
    return [
        [(2.5 - each / 2, 2.5 + each / 2, 0.4, 2.5), (7.5 - each / 2, 7.5 + each / 2, 0.4, 2.5)],
        [(2.9, 4.1, 1.1, 2.3)],
        [(2.0, 3.2, 1.1, 2.3), (6.8, 8.0, 1.1, 2.3)],
        [(2.9, 4.1, 1.1, 2.3)],
    ]


def on_wall(i, u, v):
    """A point on wall i (front, right, back, left) in the zone's frame: the
    front wall along y = 0, facing -y."""
    return [(u, 0.0, v), (L, u, v), (L - u, D, v), (0.0, D - u, v)][i]


WALL_LEN = [L, D, L, D]


def obj(kind, *fields):
    parts = [str(f) for f in fields]
    return kind + ",\n    " + ",\n    ".join(parts) + ";\n"


def verts(points):
    return [len(points)] + [round(c, 4) for p in points for c in p]


def idf(d, city, power, start_day):
    """The input file for one run. d holds the design (the keys of PARAMS);
    power is "On" or "Off"; start_day is the first day of the hot week."""
    out = []
    add = out.append
    north = (d["turn"] - 180) % 360

    begin_m, begin_d = day_to_date(start_day - 7)
    end_m, end_d = day_to_date(start_day + 6)
    cut_m, cut_d = day_to_date(start_day - 1)

    add(obj("Version", "27.1"))
    add(obj("SimulationControl", "No", "No", "No", "No", "Yes", "No", 1))
    add(obj("Building", "House", round(north, 2), "Suburbs", 0.04, 0.4, "FullInteriorAndExterior", 25, 6, ""))
    add(obj("Timestep", 6))
    add(obj("GlobalGeometryRules", "UpperLeftCorner", "Counterclockwise", "Relative"))
    add(obj("RunPeriod", "Hot", begin_m, begin_d, "", end_m, end_d, "", "Monday", "No", "No", "No", "No", "No", "No"))

    # Schedules.
    add(obj("ScheduleTypeLimits", "Fraction", 0, 1, "Continuous"))
    add(obj("ScheduleTypeLimits", "Temperature", -60, 200, "Continuous"))
    add(obj("ScheduleTypeLimits", "Control", 0, 4, "Discrete"))
    add(obj("Schedule:Compact", "AlwaysOn", "Fraction", "Through: 12/31", "For: AllDays", "Until: 24:00", 1))
    if power == "On":
        add(obj("Schedule:Compact", "Power", "Fraction", "Through: 12/31", "For: AllDays", "Until: 24:00", 1))
    else:
        add(obj("Schedule:Compact", "Power", "Fraction",
                "Through: %d/%d" % (cut_m, cut_d), "For: AllDays", "Until: 24:00", 1,
                "Through: 12/31", "For: AllDays", "Until: 24:00", 0))
    add(obj("Schedule:Compact", "ControlType", "Control", "Through: 12/31", "For: AllDays", "Until: 24:00", 4))
    add(obj("Schedule:Compact", "HeatSP", "Temperature", "Through: 12/31", "For: AllDays", "Until: 24:00", 10))
    add(obj("Schedule:Compact", "CoolSP", "Temperature", "Through: 12/31", "For: AllDays", "Until: 24:00", d["setpoint"]))
    add(obj("Schedule:Compact", "ByDay", "Fraction", "Through: 12/31", "For: AllDays",
            "Until: 08:00", 0, "Until: 18:00", 1, "Until: 24:00", 0))
    if d["windows"] == "Day":
        add(obj("Schedule:Compact", "Vent", "Fraction", "Through: 12/31", "For: AllDays",
                "Until: 08:00", 0, "Until: 19:00", 1, "Until: 24:00", 0))
    elif d["windows"] == "Night":
        add(obj("Schedule:Compact", "Vent", "Fraction", "Through: 12/31", "For: AllDays",
                "Until: 08:00", 1, "Until: 19:00", 0, "Until: 24:00", 1))

    # Materials and constructions.
    t_wall = max(0.005, d["wallR"] * LAMBDA)
    t_roof = max(0.005, 1.5 * d["wallR"] * LAMBDA)
    t_slab = max(0.01, d["mass"] / RHO_C)
    absorb = round(1 - d["reflect"], 3)
    add(obj("Material", "Gypsum", "Smooth", 0.0127, 0.16, 800, 1090, 0.9, 0.7, 0.7))
    add(obj("Material", "Plywood", "Rough", 0.012, 0.12, 545, 1210, 0.9, 0.7, 0.7))
    add(obj("Material", "Siding", "MediumRough", 0.02, 0.14, 530, 900, 0.9, 0.6, 0.6))
    add(obj("Material", "WallInsulation", "Rough", round(t_wall, 4), LAMBDA, 30, 840, 0.9, 0.7, 0.7))
    add(obj("Material", "RoofInsulation", "Rough", round(t_roof, 4), LAMBDA, 30, 840, 0.9, 0.7, 0.7))
    add(obj("Material", "Membrane", "Smooth", 0.003, 0.2, 1100, 1500, 0.9, absorb, absorb))
    add(obj("Material", "Slab", "MediumRough", round(t_slab, 4), 1.4, 2300, 880, 0.9, 0.7, 0.7))
    add(obj("Material", "FoundationConcrete", "MediumRough", 0.2, 1.4, 2300, 880, 0.9, 0.7, 0.7))
    add(obj("WindowMaterial:SimpleGlazingSystem", "Glass", 1.8, d["shgc"], round(min(0.8, 0.25 + 1.0 * d["shgc"]), 3)))
    add(obj("Construction", "Wall", "Siding", "Plywood", "WallInsulation", "Gypsum"))
    add(obj("Construction", "Roof", "Membrane", "Plywood", "RoofInsulation", "Gypsum"))
    add(obj("Construction", "FoundationWall", "FoundationConcrete"))
    add(obj("Construction", "Window", "Glass"))
    floor_layers = ["Slab"]
    if d["ground"] == "Raised":
        if d["floorR"] > 0:
            add(obj("Material", "FloorInsulation", "Rough", round(d["floorR"] * LAMBDA, 4), LAMBDA, 30, 840, 0.9, 0.7, 0.7))
            floor_layers = ["Plywood", "FloorInsulation", "Slab"]
        else:
            floor_layers = ["Plywood", "Slab"]
    elif d["floorR"] > 0:
        add(obj("Material", "FloorInsulation", "Rough", round(d["floorR"] * LAMBDA, 4), LAMBDA, 30, 840, 0.9, 0.7, 0.7))
    add(obj("Construction", "Floor", *floor_layers))

    # The zone and its surfaces.
    add(obj("Zone", "Room", 0, 0, 0, 0, 1, 1, H, "autocalculate", "autocalculate", "", "", "Yes"))

    grade = d["ground"] != "Raised"
    sunk = d["ground"] == "Sunken"
    for i, name in enumerate(["Front", "Right", "Back", "Left"]):
        n = WALL_LEN[i]
        bottom = SUNK if sunk else 0.0
        pts = [on_wall(i, 0, H), on_wall(i, 0, bottom), on_wall(i, n, bottom), on_wall(i, n, H)]
        add(obj("BuildingSurface:Detailed", name, "Wall", "Wall", "Room", "", "Outdoors", "",
                "SunExposed", "WindExposed", "autocalculate", *verts(pts)))
        if sunk:
            low = [on_wall(i, 0, SUNK), on_wall(i, 0, 0), on_wall(i, n, 0), on_wall(i, n, SUNK)]
            add(obj("BuildingSurface:Detailed", name + "Below", "Wall", "FoundationWall", "Room", "", "Foundation",
                    "Ground", "NoSun", "NoWind", "", *verts(low)))
        for k, (u0, u1, v0, v1) in enumerate(windows(d["glazing"])[i]):
            w = [on_wall(i, u0, v1), on_wall(i, u0, v0), on_wall(i, u1, v0), on_wall(i, u1, v1)]
            add(obj("FenestrationSurface:Detailed", "%s%d" % (name, k), "Window", "Window", name, "",
                    "autocalculate", "", 1, *verts(w)))

    add(obj("BuildingSurface:Detailed", "Roof", "Roof", "Roof", "Room", "", "Outdoors", "", "SunExposed", "WindExposed",
            "autocalculate", *verts([(0, D, H), (0, 0, H), (L, 0, H), (L, D, H)])))
    floor_pts = verts([(L, D, 0), (L, 0, 0), (0, 0, 0), (0, D, 0)])
    if grade:
        add(obj("BuildingSurface:Detailed", "Floor", "Floor", "Floor", "Room", "", "Foundation", "Ground",
                "NoSun", "NoWind", "", *floor_pts))
        add(obj("SurfaceProperty:ExposedFoundationPerimeter", "Floor", "TotalExposedPerimeter", 2 * (L + D), "", ""))
        kiva = ["Ground", 22]
        if d["floorR"] > 0:
            kiva += ["FloorInsulation", round(t_slab, 4), 5.0]
        else:
            kiva += ["", "", ""]
        kiva += ["", "", "", "", "", "", ""]
        kiva += [0.0 if sunk else 0.2, 0.2, "FoundationWall", "", ""]
        add(obj("Foundation:Kiva", *kiva))
    else:
        add(obj("BuildingSurface:Detailed", "Floor", "Floor", "Floor", "Room", "", "Outdoors", "",
                "NoSun", "WindExposed", "autocalculate", *floor_pts))

    # The roof's overhang: a strip along each wall's head.
    p = d["overhang"]
    if p > 0.01:
        rims = [
            [(-p, -p, H), (L + p, -p, H), (L, 0, H), (0, 0, H)],
            [(L + p, -p, H), (L + p, D + p, H), (L, D, H), (L, 0, H)],
            [(L + p, D + p, H), (-p, D + p, H), (0, D, H), (L, D, H)],
            [(-p, D + p, H), (-p, -p, H), (0, 0, H), (0, D, H)],
        ]
        for i, (name, rim) in enumerate(zip(["Front", "Right", "Back", "Left"], rims)):
            add(obj("Shading:Zone:Detailed", name + "Eave", name, "", *verts(rim)))

    # Exterior shades by day, as opaque as the slider says.
    names = ["%s%d" % (n, k) for i, n in enumerate(["Front", "Right", "Back", "Left"])
             for k in range(len(windows(d["glazing"])[i]))]
    if d["shade"] > 0.04:
        tau = round(1 - 0.9 * d["shade"], 3)
        rho = round(0.6 * (1 - tau), 3)
        add(obj("WindowMaterial:Shade", "Blind", tau, rho, tau, rho, 0.9, 0.0, 0.005, 0.1, 0.05, 0.5, 0.5, 0.5, 0.5, 0))
        add(obj("WindowShadingControl", "Blinds", "Room", 1, "ExteriorShade", "", "OnIfScheduleAllows", "ByDay", "",
                "Yes", "No", "Blind", "", "", "", "", "Group", *names))

    # Gains: three people, always; the fridge and the rest while there is power.
    add(obj("OtherEquipment", "People", "None", "Room", "AlwaysOn", "EquipmentLevel", 240, "", "", 0.35, 0.3, 0, 0, "People"))
    add(obj("ElectricEquipment", "Plugs", "Room", "Power", "EquipmentLevel", 260, "", "", 0, 0.3, 0, "Plugs"))
    add(obj("ZoneInfiltration:DesignFlowRate", "Leaks", "Room", "AlwaysOn", "AirChanges/Hour", "", "", "", 0.2, 1, 0, 0, 0))

    # Windows open on their schedule; with the power on, only while it is
    # cooler outside.
    if d["windows"] in ("Day", "Night"):
        glass = sum((u1 - u0) * (v1 - v0) for ws in windows(d["glazing"]) for (u0, u1, v0, v1) in ws)
        add(obj("ZoneVentilation:WindandStackOpenArea", "Windows", "Room", round(0.4 * glass, 3), "Vent",
                "autocalculate", round(d["turn"] % 360, 1), 1.0, "autocalculate", 18, "", 100, "", -100 if power == "Off" else 0,
                "", -100, "", 100, "", 40))

    # Cooling and fresh air: ideal loads, to the setpoint, the fresh air through
    # the ERV. Both stop when the power does.
    add(obj("ZoneControl:Thermostat", "Thermostat", "Room", "ControlType", "ThermostatSetpoint:DualSetpoint", "Setpoints"))
    add(obj("ThermostatSetpoint:DualSetpoint", "Setpoints", "HeatSP", "CoolSP"))
    oa = ""
    if d["air"] > 0.005:
        add(obj("DesignSpecification:OutdoorAir", "FreshAir", "AirChanges/Hour", "", "", "", round(d["air"], 3)))
        oa = "FreshAir"
    erv = "Sensible" if d["erv"] > 0.01 and oa else "None"
    add(obj("ZoneHVAC:IdealLoadsAirSystem", "Cooling", "Power", "SupplyNode", "ExhaustNode", "", 50, 13, 0.015, 0.009,
            "NoLimit", "", "", "NoLimit", "", "", "", "", "ConstantSensibleHeatRatio", 0.7, "None", oa,
            "OANode" if oa else "", "None", "NoEconomizer", erv, round(d["erv"], 3) if erv != "None" else 0.7, 0.65))
    add(obj("ZoneHVAC:EquipmentList", "Equipment", "SequentialLoad", "ZoneHVAC:IdealLoadsAirSystem", "Cooling", 1, 1, "", ""))
    add(obj("ZoneHVAC:EquipmentConnections", "Room", "Equipment", "SupplyNode", "ExhaustNode", "RoomAirNode", ""))

    # Daylight at desk height, 1.5 m in from the front and back walls.
    add(obj("Daylighting:ReferencePoint", "FrontDesk", "Room", L / 2, 1.5, 0.8))
    add(obj("Daylighting:ReferencePoint", "BackDesk", "Room", L / 2, D - 1.5, 0.8))
    add(obj("Daylighting:Controls", "Daylight", "Room", "SplitFlux", "AlwaysOn", "Continuous", 0.3, 0.2, "", 1.0, "",
            "", "", "", "FrontDesk", 0.5, 300, "BackDesk", 0.5, 300))

    for var in ["Site Outdoor Air Drybulb Temperature", "Zone Mean Air Temperature",
                "Zone Ideal Loads Supply Air Total Cooling Energy", "Daylighting Reference Point 1 Illuminance",
                "Daylighting Reference Point 2 Illuminance", "Zone Ventilation Current Density Air Change Rate",
                "Zone Infiltration Current Density Air Change Rate", "Zone Mechanical Ventilation Air Changes per Hour"]:
        add(obj("Output:Variable", "*", var, "Hourly"))
    add(obj("Output:SQLite", "Simple"))
    return "\n".join(out)
