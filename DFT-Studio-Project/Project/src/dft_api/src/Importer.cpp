// SPDX-License-Identifier: BSD-3-Clause
// DFT Studio — OpenDB Integration Layer
#include "dftodb/Importer.h"

#include <cstring>
#include <fstream>
#include <iterator>
#include <stdexcept>
#include <string>
#include <unistd.h>

#include "dftodb/DesignHandle.h"
#include "odb/db.h"
#include "odb/defin.h"
#include "odb/lefin.h"
#include "utl/Logger.h"
namespace dftodb {

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

// Strip all `BLOCKAGES … END BLOCKAGES` sections from a DEF string.
// ODB's defin parser does not support the BLOCKAGES statement (results in
// ODB-0421).  The physical blockage geometry is irrelevant for the component /
// region traversal this library performs, so removing it is safe.
static std::string strip_blockages_section(const std::string& s)
{
    std::string out;
    out.reserve(s.size());
    std::size_t pos = 0;

    while (pos < s.size()) {
        std::size_t bs = s.find("BLOCKAGES", pos);
        if (bs == std::string::npos) {
            out.append(s, pos, s.size() - pos);
            break;
        }
        // Guard against false positives: BLOCKAGES must start at a line boundary.
        if (bs > 0 && s[bs - 1] != '\n' && s[bs - 1] != '\r') {
            out.append(s, pos, bs - pos + 1);
            pos = bs + 1;
            continue;
        }
        // Copy content before this section.
        out.append(s, pos, bs - pos);

        // Find the matching "END BLOCKAGES".
        std::size_t es = s.find("END BLOCKAGES", bs);
        if (es == std::string::npos) {
            // Malformed DEF with no closing marker — leave the remainder as-is.
            out.append(s, bs, s.size() - bs);
            pos = s.size();
            break;
        }
        // Advance past "END BLOCKAGES" and consume the rest of that line.
        pos = es + std::strlen("END BLOCKAGES");
        while (pos < s.size() && s[pos] != '\n') { ++pos; }
        if (pos < s.size() && s[pos] == '\n')    { ++pos; }
    }
    return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// LoadLefDef
std::pair<Status, DesignHandle> Importer::LoadLefDef(
    const std::vector<std::string>& lef_files,
    const std::string&              def_file,
    const ImportOptions&            options)
{
    if (lef_files.empty()) {
        return {Status::error("lef_files must not be empty"), DesignHandle{}};
    }
    if (def_file.empty()) {
        return {Status::error("def_file must not be empty"), DesignHandle{}};
    }

    try {
    auto logger = std::make_unique<utl::Logger>();
    // Redirect all ODB INFO/WARN/ERROR messages to stderr so that stdout
    // carries only the application's JSON or text output.
    logger->setRedirectSink(std::cerr);

    // ── Create OpenDB database ────────────────────────────────────────────────
    // Wrap the raw pointer immediately in a shared_ptr whose deleter calls
    // odb::dbDatabase::destroy(), which performs proper OpenDB teardown.
    odb::dbDatabase* raw_db = odb::dbDatabase::create();
    if (!raw_db) {
        return {Status::error("Failed to create OpenDB database"), DesignHandle{}};
    }
    std::shared_ptr<odb::dbDatabase> db(
        raw_db,
        [](odb::dbDatabase* p) { odb::dbDatabase::destroy(p); });

    // ── Read LEF files ────────────────────────────────────────────────────────
    // lefinReader(db, logger, ignore_non_routing_layers)
    odb::lefinReader lef_reader(db.get(), logger.get(),
                                /*ignore_non_routing_layers=*/false);

    odb::dbLib* lib = nullptr;

    for (std::size_t i = 0; i < lef_files.size(); ++i) {
        const std::string& lef_path = lef_files[i];

        if (i == 0) {
            // First LEF: try to create tech+lib together.
            // If the first file is a pure tech LEF (no macros), createTechAndLib
            // returns nullptr even though the tech was loaded successfully.
            // Detect this by checking whether tech was created.
            lib = lef_reader.createTechAndLib("techlib", "lib", lef_path.c_str());
            if (!lib) {
                // Distinguish a real error from a tech-only first LEF.
                if (!db->getTech()) {
                    return {Status::error("Failed to read first LEF (tech+lib): " + lef_path),
                            DesignHandle{}};
                }
                // Tech loaded but no macros — this is a pure tech LEF (e.g. layer-only).
                // lib stays nullptr until a macro LEF is read.
            }
        } else if (!lib) {
            // Tech is already present; this LEF should start the macro library.
            lib = lef_reader.createLib(db->getTech(), "lib", lef_path.c_str());
            if (!lib) {
                return {Status::error("Failed to read LEF (create lib): " + lef_path),
                        DesignHandle{}};
            }
        } else {
            // Subsequent LEFs add macros to the existing library.
            if (!lef_reader.updateTechAndLib(lib, lef_path.c_str())) {
                return {Status::error("Failed to read LEF (macros): " + lef_path),
                        DesignHandle{}};
            }
        }
    }

    // ── Ensure a chip object exists (required by defin) ───────────────────────
    odb::dbChip* chip = db->getChip();
    if (!chip) {
        odb::dbTech* tech = db->getTech();
        if (!tech) {
            return {Status::error("No tech loaded; LEF must be read before creating chip"),
                    DesignHandle{}};
        }
        chip = odb::dbChip::create(db.get(), tech);
    }
    if (!chip) {
        return {Status::error("Failed to create dbChip"), DesignHandle{}};
    }

    // ── Preprocess DEF: strip unsupported BLOCKAGES sections ─────────────────
    // ODB's defin does not handle BLOCKAGES (ODB-0421).  Read the DEF, strip
    // every BLOCKAGES…END BLOCKAGES block, and (if anything was removed) write
    // to a temp file so the remainder can be parsed cleanly.
    std::string effective_def = def_file;

    // RAII guard: delete the temp file when it goes out of scope.
    std::string temp_def_path;
    struct TempGuard {
        std::string& path;
        ~TempGuard() { if (!path.empty()) ::unlink(path.c_str()); }
    } temp_guard{temp_def_path};

    {
        std::ifstream ifs(def_file, std::ios::in);
        if (!ifs) {
            return {Status::error("Cannot open DEF file: " + def_file), DesignHandle{}};
        }
        std::string content((std::istreambuf_iterator<char>(ifs)), {});
        ifs.close();

        if (content.find("BLOCKAGES") != std::string::npos) {
            std::string stripped = strip_blockages_section(content);

            char tmp[] = "/tmp/dftodb_XXXXXX";
            int  fd    = ::mkstemp(tmp);
            if (fd == -1) {
                return {Status::error("Cannot create temp file for DEF preprocessing"),
                        DesignHandle{}};
            }
            temp_def_path = tmp;  // TempGuard will unlink this

            const auto written = ::write(fd, stripped.data(), stripped.size());
            ::close(fd);
            if (static_cast<std::size_t>(written) != stripped.size()) {
                return {Status::error("Failed to write stripped DEF to temp file"),
                        DesignHandle{}};
            }
            effective_def = temp_def_path;
        }
    }

    // ── Read DEF ──────────────────────────────────────────────────────────────
    odb::defin def_reader(db.get(), logger.get(), odb::defin::DEFAULT);

    if (options.skip_wires)         { def_reader.skipWires(); }
    if (options.skip_connections)   { def_reader.skipConnections(); }
    if (options.skip_special_wires) { def_reader.skipSpecialWires(); }
    if (options.continue_on_errors) { def_reader.continueOnErrors(); }

    std::vector<odb::dbLib*> search_libs = {lib};
    def_reader.readChip(search_libs, effective_def.c_str(), chip);

    // ── Validate result ───────────────────────────────────────────────────────
    odb::dbBlock* top_block = chip->getBlock();
    if (!top_block) {
        return {Status::error("DEF import produced no top block. "
                              "Verify that DEF DESIGN name matches and that "
                              "all macro names in DEF are present in the LEF."),
                DesignHandle{}};
    }

    // ── Hand ownership to DesignHandle ────────────────────────────────────────
    return {Status::success(),
            DesignHandle(std::move(db), std::move(logger), top_block)};
    } catch (const std::exception& e) {
        return {Status::error(std::string("OpenDB exception: ") + e.what()),
                DesignHandle{}};
    } catch (...) {
        return {Status::error("Unknown exception during LEF/DEF import"),
                DesignHandle{}};
    }
}

}  // namespace dftodb
