// SPDX-License-Identifier: BSD-3-Clause
// DFT Studio — OpenDB Integration Layer
#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace dftodb {

// ─── Coordinate types ────────────────────────────────────────────────────────
// All coordinates are in DBU (database units = dbu_per_micron × microns).
// Using int64_t avoids truncation for large designs.

struct Point {
    int64_t x = 0;
    int64_t y = 0;
};

struct Rect {
    Point ll;  // lower-left
    Point ur;  // upper-right

    int64_t width()  const { return ur.x - ll.x; }
    int64_t height() const { return ur.y - ll.y; }
    bool    valid()  const { return ur.x >= ll.x && ur.y >= ll.y; }
};

// ─── Placement status ───────────────────────────────────────────────────────
// Matches DEF PLACED / FIXED / COVER status on a component.
struct PlacementStatus {
    // FIXED = DEF FIXED keyword (maps to dbPlacementStatus::LOCKED internally).
    enum Value { UNPLACED, PLACED, FIXED, FIRM, COVER };
    Value v = UNPLACED;

    const char* to_string() const {
        switch (v) {
            case UNPLACED: return "UNPLACED";
            case PLACED:   return "PLACED";
            case FIXED:    return "FIXED";
            case FIRM:     return "FIRM";
            case COVER:    return "COVER";
        }
        return "UNPLACED";
    }
};

// ─── Orientation ─────────────────────────────────────────────────────────────
// Matches LEF/DEF standard orientations.
struct Orient {
    enum Value { N, S, E, W, FN, FS, FE, FW };
    Value v = N;

    const char* to_string() const {
        switch (v) {
            case N:  return "N";
            case S:  return "S";
            case E:  return "E";
            case W:  return "W";
            case FN: return "FN";
            case FS: return "FS";
            case FE: return "FE";
            case FW: return "FW";
        }
        return "N";
    }
};

// ─── Status ──────────────────────────────────────────────────────────────────
struct Status {
    bool        ok      = false;
    std::string message;

    static Status success() { return {true, {}}; }
    static Status error(std::string msg) { return {false, std::move(msg)}; }
};

// ─── Import options ──────────────────────────────────────────────────────────
struct ImportOptions {
    // Skip wire/net geometry during DEF import.
    // Reduces memory significantly; safe when only placement is needed.
    bool skip_wires         = true;
    bool skip_connections   = true;
    bool skip_special_wires = true;

    // When true, unfixable DEF errors print a warning but do not abort.
    bool continue_on_errors = false;
};

// ─── Info structs returned by Traverser callbacks ────────────────────────────

struct MasterInfo {
    // Name of the LEF macro (e.g. "NAND2X1").
    std::string name;

    // Bounding box in DBU, origin-relative (lower-left = origin of placement).
    Rect bbox;

    // DBU per micron used by this design.
    int64_t dbu_per_micron = 1000;
};

struct InstanceInfo {
    // Instance name from DEF COMPONENTS (e.g. "u_core/reg1").
    std::string name;

    // Master (macro) that this instance references.
    std::string master_name;

    // Placement origin in DBU (top-level coordinate system).
    Point origin;

    // Orientation of this instance.
    Orient orient;

    // Placement status: PLACED, FIXED, COVER, etc.
    PlacementStatus placement;

    // Region name this instance is assigned to, or empty string if none.
    std::string region_name;

    // Bounding box after applying orient + translation to top-level coordinates.
    // Only populated when Traverser::ForEachInstance is called with
    // compute_bbox = true.
    Rect bbox;
};

// ─── Region ──────────────────────────────────────────────────────────────────

struct RegionInfo {
    // Name of the DEF REGION (e.g. "R_LEFT").
    std::string name;

    // One or more bounding rectangles defining the region area, in DBU.
    std::vector<Rect> rects;
};

struct TopDieArea {
    // Bounding rectangle from DEF DIEAREA, in DBU.
    Rect area;
};

}  // namespace dftodb
