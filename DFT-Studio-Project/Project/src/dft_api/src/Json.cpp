// SPDX-License-Identifier: BSD-3-Clause
// DFT Studio — OpenDB Integration Layer

#include "dftodb/Json.h"

#include <sstream>
#include <string>

#include "dftodb/Traverser.h"
#include "dftodb/Types.h"

namespace dftodb {

// ── Internal helpers ──────────────────────────────────────────────────────────

// Escape a C++ string for inclusion as a JSON string value.
// Handles the characters required by RFC 8259 §7.
static std::string json_escape(const std::string& s)
{
    std::string out;
    out.reserve(s.size() + 2);
    out += '"';
    for (unsigned char c : s) {
        if      (c == '"')  out += "\\\"";
        else if (c == '\\') out += "\\\\";
        else if (c == '\n') out += "\\n";
        else if (c == '\r') out += "\\r";
        else if (c == '\t') out += "\\t";
        else if (c < 0x20) {
            // Other control characters → \uXXXX
            char buf[8];
            std::snprintf(buf, sizeof(buf), "\\u%04x", static_cast<unsigned>(c));
            out += buf;
        } else {
            out += static_cast<char>(c);
        }
    }
    out += '"';
    return out;
}

// Emit a JSON bbox object: { "xMin": n, "yMin": n, "xMax": n, "yMax": n }
static std::string json_bbox(const Rect& r)
{
    std::ostringstream o;
    o << "{\"xMin\": " << r.ll.x
      << ", \"yMin\": " << r.ll.y
      << ", \"xMax\": " << r.ur.x
      << ", \"yMax\": " << r.ur.y
      << "}";
    return o.str();
}

// ── Public API ────────────────────────────────────────────────────────────────

std::string ToJson(const Traverser& t, bool pretty)
{
    const std::string nl  = pretty ? "\n"   : "";
    const std::string ind = pretty ? "  "   : "";   // 2-space indent level 1
    const std::string in2 = pretty ? "    " : "";   // 4-space indent level 2
    const std::string sp  = pretty ? " "    : "";   // space after ":"

    std::ostringstream o;

    const int64_t dbu = t.GetDbuPerMicron();
    const TopDieArea die_area = t.GetDieArea();

    o << "{" << nl;

    // ── dbu_per_micron ────────────────────────────────────────────────────────
    o << ind << "\"dbu_per_micron\":" << sp << dbu << "," << nl;

    // ── die ───────────────────────────────────────────────────────────────────
    o << ind << "\"die\":" << sp << json_bbox(die_area.area) << "," << nl;

    // ── masters ───────────────────────────────────────────────────────────────
    o << ind << "\"masters\":" << sp << "[" << nl;
    {
        bool first = true;
        t.ForEachMaster([&](const MasterInfo& m) {
            if (!first) o << "," << nl;
            first = false;
            o << in2 << "{"
              << "\"name\":" << sp << json_escape(m.name)
              << ", \"bbox\":" << sp << json_bbox(m.bbox)
              << "}";
            return true;
        });
    }
    o << nl << ind << "]," << nl;

    // ── instances ─────────────────────────────────────────────────────────────
    o << ind << "\"instances\":" << sp << "[" << nl;
    {
        bool first = true;
        t.ForEachInstance([&](const InstanceInfo& inst) {
            if (!first) o << "," << nl;
            first = false;

            const std::string region_val =
                inst.region_name.empty() ? "null" : json_escape(inst.region_name);

            o << in2 << "{"
              << "\"name\":" << sp << json_escape(inst.name)
              << ", \"master\":" << sp << json_escape(inst.master_name)
              << ", \"origin\":" << sp
                  << "{\"x\":" << sp << inst.origin.x
                  << ", \"y\":" << sp << inst.origin.y << "}"
              << ", \"orient\":" << sp << json_escape(inst.orient.to_string())
              << ", \"placement\":" << sp
                  << json_escape(inst.placement.to_string())
              << ", \"region\":" << sp << region_val
              << ", \"bbox\":" << sp << json_bbox(inst.bbox)
              << "}";
            return true;
        }, /* compute_bbox= */ true);
    }
    o << nl << ind << "]," << nl;

    // ── regions ───────────────────────────────────────────────────────────────
    o << ind << "\"regions\":" << sp << "[" << nl;
    {
        bool first = true;
        t.ForEachRegion([&](const RegionInfo& r) {
            if (!first) o << "," << nl;
            first = false;

            o << in2 << "{"
              << "\"name\":" << sp << json_escape(r.name)
              << ", \"rects\":" << sp << "[";

            bool first_rect = true;
            for (const auto& rect : r.rects) {
                if (!first_rect) o << ", ";
                first_rect = false;
                o << json_bbox(rect);
            }
            o << "]}";
            return true;
        });
    }
    o << nl << ind << "]" << nl;

    o << "}" << nl;
    return o.str();
}

}  // namespace dftodb
