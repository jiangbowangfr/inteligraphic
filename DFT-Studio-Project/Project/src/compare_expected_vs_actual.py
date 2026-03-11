#!/usr/bin/env python3
# SPDX-License-Identifier: BSD-3-Clause
# DFT Studio — compare expected.json vs actual-produced.json for each test case.
#
# Usage:
#   python3 compare_expected_vs_actual.py [--tc-dir PATH]
#
# Exits:
#   0 — all compared fields match (or only expected-missing fields differ)
#   1 — at least one field mismatch found
#
# Notes on field mapping (expected → actual format):
#   units.def_units_distance_microns → dbu_per_micron
#   die_bbox                         → die
#   instances[].inst                 → instances[].name
#   masters[].{w,h} (µm)            → masters[].bbox.{xMax,yMax} / dbu_per_micron
#   regions[].rects as [[x1,y1,x2,y2]] → rects as [{xMin,yMin,xMax,yMax}]
#   pins / blockages: not yet extracted by the tool — skipped in comparison.

import argparse
import json
import os
import sys
from pathlib import Path

# ─── helpers ──────────────────────────────────────────────────────────────────

def rect_from_expected(r):
    """Normalise an expected rect to (xMin, yMin, xMax, yMax)."""
    if isinstance(r, (list, tuple)):
        return tuple(r[:4])
    return (r["xMin"], r["yMin"], r["xMax"], r["yMax"])


def rect_from_actual(r):
    """Normalise an actual rect to (xMin, yMin, xMax, yMax)."""
    if isinstance(r, (list, tuple)):
        return tuple(r[:4])
    return (r["xMin"], r["yMin"], r["xMax"], r["yMax"])


# ─── per-TC comparison ────────────────────────────────────────────────────────

def compare_tc(tc_path: Path):
    """
    Returns (pass: bool, list_of_failure_strings).
    """
    exp_path = tc_path / "expected.json"
    act_path = tc_path / "actual-produced.json"

    if not exp_path.exists():
        return True, ["[SKIP] no expected.json"]
    if not act_path.exists():
        return False, ["actual-produced.json missing"]

    with open(exp_path) as f:
        exp = json.load(f)
    with open(act_path) as f:
        act = json.load(f)

    # If the tool exited with an error, report immediately.
    if "error" in act:
        return False, [f"tool error: {act['error']}"]

    failures = []

    # ── DBU per micron ────────────────────────────────────────────────────────
    e_dbu = exp.get("units", {}).get("def_units_distance_microns")
    a_dbu = act.get("dbu_per_micron")
    if e_dbu is not None and a_dbu is not None and e_dbu != a_dbu:
        failures.append(f"dbu_per_micron: expected {e_dbu}, got {a_dbu}")
    dbu = a_dbu or 1000  # fallback for further conversions

    # ── Die bounding box ─────────────────────────────────────────────────────
    e_die = exp.get("die_bbox")
    a_die = act.get("die")
    if e_die and a_die:
        for key in ("xMin", "yMin", "xMax", "yMax"):
            ev, av = e_die.get(key), a_die.get(key)
            if ev is not None and av is not None and ev != av:
                failures.append(f"die.{key}: expected {ev}, got {av}")

    # ── Masters ──────────────────────────────────────────────────────────────
    a_masters = {m["name"]: m for m in act.get("masters", [])}
    for em in exp.get("masters", []):
        name = em["name"]
        if name not in a_masters:
            failures.append(f"master '{name}': missing in actual")
            continue
        am = a_masters[name]
        # Expected w/h are in microns; actual bbox coordinates are in DBU.
        e_w, e_h = em.get("w"), em.get("h")
        a_bbox = am.get("bbox")
        if e_w is not None and a_bbox is not None:
            a_w = a_bbox["xMax"] / dbu
            if abs(a_w - e_w) > 1e-6:
                failures.append(
                    f"master '{name}' width: expected {e_w} µm, "
                    f"got {a_bbox['xMax']} DBU ({a_w:.3f} µm)"
                )
        if e_h is not None and a_bbox is not None:
            a_h = a_bbox["yMax"] / dbu
            if abs(a_h - e_h) > 1e-6:
                failures.append(
                    f"master '{name}' height: expected {e_h} µm, "
                    f"got {a_bbox['yMax']} DBU ({a_h:.3f} µm)"
                )

    # ── Instances ────────────────────────────────────────────────────────────
    a_insts = {i["name"]: i for i in act.get("instances", [])}
    for ei in exp.get("instances", []):
        iname = ei.get("inst") or ei.get("name")
        if iname not in a_insts:
            failures.append(f"instance '{iname}': missing in actual")
            continue
        ai = a_insts[iname]

        # origin
        eo, ao = ei.get("origin"), ai.get("origin")
        if eo and ao:
            for ax in ("x", "y"):
                ev, av = eo.get(ax), ao.get(ax)
                if ev is not None and av is not None and ev != av:
                    failures.append(
                        f"instance '{iname}' origin.{ax}: expected {ev}, got {av}"
                    )

        # orient
        if ei.get("orient") and ai.get("orient") and ei["orient"] != ai["orient"]:
            failures.append(
                f"instance '{iname}' orient: expected {ei['orient']}, got {ai['orient']}"
            )

        # placement
        if (ei.get("placement") and ai.get("placement")
                and ei["placement"] != ai["placement"]):
            failures.append(
                f"instance '{iname}' placement: expected {ei['placement']}, "
                f"got {ai['placement']}"
            )

        # region assignment
        if "region" in ei and "region" in ai and ei["region"] != ai["region"]:
            failures.append(
                f"instance '{iname}' region: expected {ei['region']!r}, "
                f"got {ai['region']!r}"
            )

    # ── Regions ──────────────────────────────────────────────────────────────
    a_regions = {r["name"]: r for r in act.get("regions", [])}
    for er in exp.get("regions", []):
        rname = er["name"]
        if rname not in a_regions:
            failures.append(f"region '{rname}': missing in actual")
            continue
        ar = a_regions[rname]

        e_rects = [rect_from_expected(r) for r in er.get("rects", [])]
        a_rects = [rect_from_actual(r) for r in ar.get("rects", [])]

        if len(e_rects) != len(a_rects):
            failures.append(
                f"region '{rname}' rect count: expected {len(e_rects)}, "
                f"got {len(a_rects)}"
            )
        else:
            for idx, (er_r, ar_r) in enumerate(zip(e_rects, a_rects)):
                if er_r != ar_r:
                    failures.append(
                        f"region '{rname}' rect[{idx}]: expected {er_r}, got {ar_r}"
                    )

    # pins and blockages: not yet extracted by the tool — skip silently.

    return len(failures) == 0, failures


# ─── main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Compare expected.json vs actual-produced.json for all TCs."
    )
    parser.add_argument(
        "--tc-dir",
        default=os.path.join(
            os.path.dirname(__file__),
            "..", "doc", "def-tests", "dft_opendb_testcases"
        ),
        help="Path to the directory that contains the TC-* subdirectories.",
    )
    args = parser.parse_args()

    tc_root = Path(args.tc_dir).resolve()
    if not tc_root.is_dir():
        print(f"ERROR: tc-dir not found: {tc_root}", file=sys.stderr)
        sys.exit(2)

    tc_dirs = sorted(d for d in tc_root.iterdir() if d.is_dir())
    if not tc_dirs:
        print(f"ERROR: no subdirectories found in {tc_root}", file=sys.stderr)
        sys.exit(2)

    col_w = max(len(d.name) for d in tc_dirs) + 2
    header = f"{'Test Case':<{col_w}}  {'Result':<8}  Details"
    print(header)
    print("-" * len(header))

    all_pass = True
    for tc in tc_dirs:
        passed, failures = compare_tc(tc)
        result = "PASS" if passed else "FAIL"
        detail = ""
        if failures:
            detail = failures[0]
            if len(failures) > 1:
                detail += f"  (+{len(failures)-1} more)"
        print(f"{tc.name:<{col_w}}  {result:<8}  {detail}")
        if not passed:
            all_pass = False
            for msg in failures[1:]:
                print(f"{'':>{col_w}}           {msg}")

    print()
    if all_pass:
        print("All test cases passed.")
        sys.exit(0)
    else:
        print("One or more test cases FAILED.")
        sys.exit(1)


if __name__ == "__main__":
    main()
