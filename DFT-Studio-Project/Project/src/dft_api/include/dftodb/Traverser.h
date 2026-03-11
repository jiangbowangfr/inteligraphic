// SPDX-License-Identifier: BSD-3-Clause
// DFT Studio — OpenDB Integration Layer
#pragma once

#include <functional>

#include "dftodb/DesignHandle.h"
#include "dftodb/Types.h"

namespace dftodb {

// ─────────────────────────────────────────────────────────────────────────────
// Traverser
//
// Read-only view over a loaded design.  Does not own the DesignHandle.
//
// Lifetime contract: the Traverser must not outlive the DesignHandle it
// was constructed from.
//
// Iteration is callback-based (visitor pattern):
//   - The callback receives a const reference to an info struct.
//   - Return true  → continue iteration.
//   - Return false → stop iteration early (like "break" in a range-for).
//   - The structs passed to the callback are stack-local; do not store
//     pointers/references to them beyond the callback.
//   - name/master_name fields in the info structs are copied std::string
//     values (dbMaster/dbInst::getName() returns by value).
// ─────────────────────────────────────────────────────────────────────────────
class Traverser {
 public:
    explicit Traverser(const DesignHandle& handle);

    // ── Design-level information ──────────────────────────────────────────────

    // Returns the die area declared in DEF DIEAREA, in DBU.
    TopDieArea GetDieArea() const;

    // Returns the DBU-per-micron factor stored in the design tech.
    int64_t GetDbuPerMicron() const;

    // ── Masters (LEF macros) ──────────────────────────────────────────────────

    // Iterates over all masters across all loaded libraries.
    // Order is deterministic (alphabetical by master name).
    // callback(MasterInfo) → bool (true=continue, false=stop)
    void ForEachMaster(
        std::function<bool(const MasterInfo&)> callback) const;

    // ── Instances (DEF COMPONENTS) ────────────────────────────────────────────

    // Iterates over all placed instances in the top block.
    // compute_bbox: when true, InstanceInfo::bbox is computed by applying
    //   the instance's orient + origin transform to the master bounding box.
    //   When false, bbox is left zero-initialised (faster if caller does not
    //   need geometry).
    // callback(InstanceInfo) → bool (true=continue, false=stop)
    void ForEachInstance(
        std::function<bool(const InstanceInfo&)> callback,
        bool compute_bbox = true) const;

    // ── Regions (DEF REGIONS) ─────────────────────────────────────────────────

    // Iterates over all regions defined in the top block.
    // callback(RegionInfo) → bool (true=continue, false=stop)
    void ForEachRegion(
        std::function<bool(const RegionInfo&)> callback) const;

 private:
    // Non-owning pointer to the top block.  Valid as long as the
    // DesignHandle that was passed to the constructor is alive.
    odb::dbBlock* block_;
};

}  // namespace dftodb
