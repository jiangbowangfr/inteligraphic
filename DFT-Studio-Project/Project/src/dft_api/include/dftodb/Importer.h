// SPDX-License-Identifier: BSD-3-Clause
// DFT Studio — OpenDB Integration Layer
#pragma once

#include <string>
#include <utility>
#include <vector>

#include "dftodb/DesignHandle.h"
#include "dftodb/Types.h"

namespace dftodb {

// ─────────────────────────────────────────────────────────────────────────────
// Importer
//
// Static factory that loads LEF + DEF files into an OpenDB database and
// returns a DesignHandle owning the result.
//
// Usage:
//   auto [status, handle] = dftodb::Importer::LoadLefDef(
//       {"tech.lef", "macro.lef"}, "top.def");
//   if (!status.ok) { /* handle error */ }
//   dftodb::Traverser t(handle);
//
// Thread safety: LoadLefDef serialises the OpenDB DEF/LEF parser mutex
// internally (absl::Mutex). Concurrent calls from different threads are
// safe but will queue.
// ─────────────────────────────────────────────────────────────────────────────
class Importer {
 public:
    // Load one or more LEF files followed by one DEF file.
    //
    // lef_files: ordered list — tech LEF must appear before macro LEFs.
    // def_file:  path to the top-level DEF.
    // options:   controls which DEF sections are parsed.
    //
    // Returns: {Status, DesignHandle}
    //   On success  — Status.ok == true,  handle.is_valid() == true.
    //   On failure  — Status.ok == false, handle.is_valid() == false,
    //                 Status.message contains a human-readable description.
    static std::pair<Status, DesignHandle> LoadLefDef(
        const std::vector<std::string>& lef_files,
        const std::string&              def_file,
        const ImportOptions&            options = {});

    // Importer is a pure namespace; do not instantiate.
    Importer() = delete;
};

}  // namespace dftodb
