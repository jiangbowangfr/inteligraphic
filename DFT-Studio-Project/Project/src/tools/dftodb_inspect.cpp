// SPDX-License-Identifier: BSD-3-Clause
// DFT Studio — OpenDB Integration Layer
//
// dftodb-inspect: command-line tool that loads LEF+DEF files through the
// dftodb API and prints design information to stdout.
//
// Usage:
//   dftodb-inspect --lef <lef> [--lef <lef> ...] --def <def> [OPTIONS]
//
// Required:
//   --lef <file>            LEF file (may be repeated; tech LEF must come first)
//   --def <file>            DEF file
//
// Output format (default: JSON):
//   --json                  Output full design as a JSON string (default)
//   --compact               JSON output without indentation
//   --text                  Human-readable tabular output
//
// Text-mode output control (only apply with --text; default: all sections):
//   --show-design           Print die area and DBU/µm
//   --show-masters          Print all LEF macros with dimensions
//   --show-instances        Print all DEF instances with placement
//   --show-regions          Print all DEF regions with bounding rects
//
// Number format (--text mode only):
//   --um                    Print coordinates in µm (default: DBU)
//
// DEF parser options:
//   --parse-wires           Parse net wire geometry (default: skipped)
//   --parse-connections     Parse pin-to-net connections (default: skipped)
//   --parse-special-wires   Parse power/ground routing (default: skipped)
//   --continue-on-errors    Warn on DEF errors instead of aborting
//
// Other:
//   -h, --help              Print this help message and exit

#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

#include "dftodb/DesignHandle.h"
#include "dftodb/Importer.h"
#include "dftodb/Json.h"
#include "dftodb/Traverser.h"
#include "dftodb/Types.h"

// ─── helpers ─────────────────────────────────────────────────────────────────

static void print_usage(const char* prog) {
    std::cout <<
        "Usage: " << prog << " --lef <lef> [--lef <lef> ...] --def <def> [OPTIONS]\n"
        "\n"
        "Required:\n"
        "  --lef <file>            LEF file (repeatable; tech LEF must come first)\n"
        "  --def <file>            DEF file\n"
        "\n"
        "Output format (default: JSON):\n"
        "  --json                  Output full design as a JSON string (default)\n"
        "  --compact               JSON output without indentation\n"
        "  --text                  Human-readable tabular output\n"
        "\n"
        "Text-mode output control (only with --text; default: all sections):\n"
        "  --show-design           Print die area and DBU/µm\n"
        "  --show-masters          Print LEF macros with dimensions\n"
        "  --show-instances        Print DEF instances with placement\n"
        "  --show-regions          Print DEF regions with bounding rects\n"
        "\n"
        "Number format (--text mode only):\n"
        "  --um                    Print coordinates in µm  (default: DBU)\n"
        "\n"
        "DEF parser options:\n"
        "  --parse-wires           Parse net wire geometry\n"
        "  --parse-connections     Parse pin-to-net connections\n"
        "  --parse-special-wires   Parse power/ground routing\n"
        "  --continue-on-errors    Warn on DEF errors instead of aborting\n"
        "\n"
        "  -h, --help              Print this message and exit\n";
}

// Format a DBU value for output.
static std::string dbu_str(int64_t dbu, bool use_um, int64_t dbu_per_micron) {
    if (!use_um) {
        return std::to_string(dbu);
    }
    // Print with enough decimal places to avoid loss; 3 dp covers 1nm DBU.
    double um = static_cast<double>(dbu) / static_cast<double>(dbu_per_micron);
    std::ostringstream ss;
    ss << std::fixed << std::setprecision(3) << um;
    return ss.str();
}

static const char* unit_label(bool use_um) {
    return use_um ? "µm" : "DBU";
}

// ─── sections ────────────────────────────────────────────────────────────────

static void print_design(const dftodb::Traverser& t, bool use_um) {
    int64_t dbu = t.GetDbuPerMicron();
    auto die = t.GetDieArea();
    const char* u = unit_label(use_um);

    std::cout << "=== Design ===\n";
    std::cout << "  DBU per µm : " << dbu << "\n";
    std::cout << "  Die area   : ("
              << dbu_str(die.area.ll.x, use_um, dbu) << ", "
              << dbu_str(die.area.ll.y, use_um, dbu) << ") -> ("
              << dbu_str(die.area.ur.x, use_um, dbu) << ", "
              << dbu_str(die.area.ur.y, use_um, dbu) << ") " << u << "\n";
    std::cout << "  Die size   : "
              << dbu_str(die.area.width(),  use_um, dbu) << " × "
              << dbu_str(die.area.height(), use_um, dbu) << " " << u << "\n";
    std::cout << "\n";
}

static void print_masters(const dftodb::Traverser& t, bool use_um) {
    int64_t dbu = t.GetDbuPerMicron();
    const char* u = unit_label(use_um);

    int count = 0;
    std::cout << "=== Masters (LEF macros) ===\n";
    std::cout << std::left
              << std::setw(32) << "Name"
              << std::setw(20) << ("Width (" + std::string(u) + ")")
              << std::setw(20) << ("Height (" + std::string(u) + ")")
              << "\n";
    std::cout << std::string(72, '-') << "\n";

    t.ForEachMaster([&](const dftodb::MasterInfo& m) {
        std::cout << std::left
                  << std::setw(32) << m.name
                  << std::setw(20) << dbu_str(m.bbox.width(),  use_um, dbu)
                  << std::setw(20) << dbu_str(m.bbox.height(), use_um, dbu)
                  << "\n";
        ++count;
        return true;
    });
    std::cout << "  Total: " << count << " master(s)\n\n";
}

static void print_instances(const dftodb::Traverser& t, bool use_um) {
    int64_t dbu = t.GetDbuPerMicron();
    const char* u = unit_label(use_um);

    int count = 0;
    std::cout << "=== Instances (DEF components) ===\n";
    std::cout << std::left
              << std::setw(32) << "Instance"
              << std::setw(20) << "Master"
              << std::setw(10) << "Status"
              << std::setw(8)  << "Orient"
              << std::setw(20) << ("Origin (" + std::string(u) + ")")
              << std::setw(20) << "Region"
              << "BBox LL->UR (" + std::string(u) + ")"
              << "\n";
    std::cout << std::string(120, '-') << "\n";

    t.ForEachInstance([&](const dftodb::InstanceInfo& inst) {
        std::string origin_str =
            "(" + dbu_str(inst.origin.x, use_um, dbu) +
            ", " + dbu_str(inst.origin.y, use_um, dbu) + ")";
        std::string bbox_str =
            "(" + dbu_str(inst.bbox.ll.x, use_um, dbu) +
            "," + dbu_str(inst.bbox.ll.y, use_um, dbu) + ")->(" +
            dbu_str(inst.bbox.ur.x, use_um, dbu) +
            "," + dbu_str(inst.bbox.ur.y, use_um, dbu) + ")";
        std::string region_str = inst.region_name.empty() ? "-" : inst.region_name;

        std::cout << std::left
                  << std::setw(32) << inst.name
                  << std::setw(20) << inst.master_name
                  << std::setw(10) << inst.placement.to_string()
                  << std::setw(8)  << inst.orient.to_string()
                  << std::setw(20) << origin_str
                  << std::setw(20) << region_str
                  << bbox_str
                  << "\n";
        ++count;
        return true;
    }, /* compute_bbox = */ true);

    std::cout << "  Total: " << count << " instance(s)\n\n";
}

static void print_regions(const dftodb::Traverser& t, bool use_um) {
    int64_t dbu = t.GetDbuPerMicron();
    const char* u = unit_label(use_um);

    int count = 0;
    std::cout << "=== Regions (DEF REGIONS) ===\n";

    t.ForEachRegion([&](const dftodb::RegionInfo& r) {
        std::cout << "  " << r.name << " (" << r.rects.size() << " rect(s))\n";
        for (const auto& rect : r.rects) {
            std::cout << "    ("
                      << dbu_str(rect.ll.x, use_um, dbu) << ", "
                      << dbu_str(rect.ll.y, use_um, dbu) << ") -> ("
                      << dbu_str(rect.ur.x, use_um, dbu) << ", "
                      << dbu_str(rect.ur.y, use_um, dbu) << ") " << u << "\n";
        }
        ++count;
        return true;
    });

    if (count == 0) {
        std::cout << "  (none)\n";
    }
    std::cout << "  Total: " << count << " region(s)\n\n";
}

// ─── main ────────────────────────────────────────────────────────────────────

int main(int argc, char* argv[]) {
    // ── Parse arguments ───────────────────────────────────────────────────────
    std::vector<std::string> lef_files;
    std::string              def_file;
    dftodb::ImportOptions    opts;

    enum class OutputMode { JSON, COMPACT_JSON, TEXT };
    OutputMode output_mode = OutputMode::JSON;

    bool show_design    = false;
    bool show_masters   = false;
    bool show_instances = false;
    bool show_regions   = false;
    bool use_um         = false;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];

        auto need_next = [&](const char* flag) -> std::string {
            if (i + 1 >= argc) {
                std::cerr << "error: " << flag << " requires an argument\n";
                std::exit(1);
            }
            return argv[++i];
        };

        if (arg == "-h" || arg == "--help") {
            print_usage(argv[0]);
            return 0;
        } else if (arg == "--lef") {
            lef_files.push_back(need_next("--lef"));
        } else if (arg == "--def") {
            def_file = need_next("--def");
        } else if (arg == "--json") {
            output_mode = OutputMode::JSON;
        } else if (arg == "--compact") {
            output_mode = OutputMode::COMPACT_JSON;
        } else if (arg == "--text") {
            output_mode = OutputMode::TEXT;
        } else if (arg == "--show-design") {
            show_design = true;
        } else if (arg == "--show-masters") {
            show_masters = true;
        } else if (arg == "--show-instances") {
            show_instances = true;
        } else if (arg == "--show-regions") {
            show_regions = true;
        } else if (arg == "--um") {
            use_um = true;
        } else if (arg == "--parse-wires") {
            opts.skip_wires = false;
        } else if (arg == "--parse-connections") {
            opts.skip_connections = false;
        } else if (arg == "--parse-special-wires") {
            opts.skip_special_wires = false;
        } else if (arg == "--continue-on-errors") {
            opts.continue_on_errors = true;
        } else {
            std::cerr << "error: unknown argument '" << arg << "'\n";
            print_usage(argv[0]);
            return 1;
        }
    }

    // ── Validate required arguments ───────────────────────────────────────────
    if (lef_files.empty()) {
        std::cerr << "error: at least one --lef file is required\n";
        print_usage(argv[0]);
        return 1;
    }
    if (def_file.empty()) {
        std::cerr << "error: --def file is required\n";
        print_usage(argv[0]);
        return 1;
    }

    // In TEXT mode, if no --show-* flags given, show everything.
    if (output_mode == OutputMode::TEXT &&
        !show_design && !show_masters && !show_instances && !show_regions) {
        show_design = show_masters = show_instances = show_regions = true;
    }

    // ── Load ──────────────────────────────────────────────────────────────────
    std::cerr << "Loading " << lef_files.size() << " LEF file(s) + DEF...\n";
    auto [status, handle] = dftodb::Importer::LoadLefDef(lef_files, def_file, opts);

    if (!status.ok) {
        std::cerr << "error: " << status.message << "\n";
        return 1;
    }

    // ── Report ────────────────────────────────────────────────────────────────
    dftodb::Traverser t(handle);

    if (output_mode == OutputMode::JSON) {
        std::cout << dftodb::ToJson(t, /* pretty= */ true);
    } else if (output_mode == OutputMode::COMPACT_JSON) {
        std::cout << dftodb::ToJson(t, /* pretty= */ false);
    } else {
        // TEXT mode
        if (show_design)    print_design(t, use_um);
        if (show_masters)   print_masters(t, use_um);
        if (show_instances) print_instances(t, use_um);
        if (show_regions)   print_regions(t, use_um);
    }

    return 0;
}
