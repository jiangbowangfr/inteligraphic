// SPDX-License-Identifier: BSD-3-Clause
// DFT Studio — OpenDB Integration Layer
#include "dftodb/Traverser.h"

#include <algorithm>
#include <limits>
#include <string>
#include <vector>

#include "dftodb/DesignHandle.h"
#include "odb/db.h"
#include "odb/dbTransform.h"

namespace dftodb {

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

// Convert odb::dbOrientType::Value → dftodb::Orient::Value.
static Orient::Value orient_from_odb(odb::dbOrientType odb_orient)
{
    switch (odb_orient.getValue()) {
        case odb::dbOrientType::R0:    return Orient::N;
        case odb::dbOrientType::R180:  return Orient::S;
        case odb::dbOrientType::R90:   return Orient::W;  // 90° CCW = West
        case odb::dbOrientType::R270:  return Orient::E;  // 270° CCW = East
        case odb::dbOrientType::MY:    return Orient::FN;
        case odb::dbOrientType::MX:    return Orient::FS;
        case odb::dbOrientType::MYR90: return Orient::FE;
        case odb::dbOrientType::MXR90: return Orient::FW;
    }
    return Orient::N;
}

// Convert odb::dbPlacementStatus → dftodb::PlacementStatus::Value.
// Note: OpenDB maps DEF's FIXED keyword to dbPlacementStatus::LOCKED.
// We re-expose this as PlacementStatus::FIXED to match the DEF/expected.json vocabulary.
static PlacementStatus::Value placement_from_odb(odb::dbPlacementStatus s)
{
    switch (s.getValue()) {
        case odb::dbPlacementStatus::PLACED:    return PlacementStatus::PLACED;
        case odb::dbPlacementStatus::FIRM:      return PlacementStatus::FIXED;   // DEF FIXED keyword → ODB FIRM
        case odb::dbPlacementStatus::LOCKED:    return PlacementStatus::FIXED;   // treat LOCKED same as FIXED
        case odb::dbPlacementStatus::COVER:     return PlacementStatus::COVER;
        case odb::dbPlacementStatus::NONE:
        case odb::dbPlacementStatus::UNPLACED:
        case odb::dbPlacementStatus::SUGGESTED:
        default:                                return PlacementStatus::UNPLACED;
    }
}

// Compute the placed bounding box of an instance in top-level DBU coordinates.
// This applies the dbTransform (orient + origin) to the master's origin-relative bbox.
static Rect compute_bbox(odb::dbInst* inst)
{
    odb::dbMaster* master = inst->getMaster();

    // Master bbox in origin-relative DBU.
    odb::Rect odb_master_bbox;
    master->getPlacementBoundary(odb_master_bbox);

    // Build transform: orient + placement origin.
    odb::dbTransform transform(inst->getOrient(), inst->getOrigin());
    transform.apply(odb_master_bbox);

    Rect bbox;
    bbox.ll = {static_cast<int64_t>(odb_master_bbox.xMin()),
               static_cast<int64_t>(odb_master_bbox.yMin())};
    bbox.ur = {static_cast<int64_t>(odb_master_bbox.xMax()),
               static_cast<int64_t>(odb_master_bbox.yMax())};
    return bbox;
}

// ─────────────────────────────────────────────────────────────────────────────
// Traverser
// ─────────────────────────────────────────────────────────────────────────────

Traverser::Traverser(const DesignHandle& handle)
    : block_(handle.top_block())
{}

// ── Design-level ──────────────────────────────────────────────────────────────

TopDieArea Traverser::GetDieArea() const
{
    TopDieArea result;
    if (!block_) {
        return result;
    }

    odb::Rect odb_die = block_->getDieArea();

    result.area.ll = {static_cast<int64_t>(odb_die.xMin()),
                     static_cast<int64_t>(odb_die.yMin())};
    result.area.ur = {static_cast<int64_t>(odb_die.xMax()),
                     static_cast<int64_t>(odb_die.yMax())};
    return result;
}

int64_t Traverser::GetDbuPerMicron() const
{
    if (!block_) {
        return 1000;
    }
    odb::dbTech* tech = block_->getDb()->getTech();
    return tech ? static_cast<int64_t>(tech->getDbUnitsPerMicron()) : 1000;
}

// ── Masters ───────────────────────────────────────────────────────────────────

void Traverser::ForEachMaster(
    std::function<bool(const MasterInfo&)> callback) const
{
    if (!block_ || !callback) {
        return;
    }

    const int64_t dbu = GetDbuPerMicron();
    odb::dbDatabase* db = block_->getDb();

    // Collect all masters across all libraries.
    // We sort by name so iteration order is deterministic.
    std::vector<odb::dbMaster*> masters;
    for (odb::dbLib* lib : db->getLibs()) {
        for (odb::dbMaster* master : lib->getMasters()) {
            masters.push_back(master);
        }
    }
    std::sort(masters.begin(), masters.end(),
              [](odb::dbMaster* a, odb::dbMaster* b) {
                  return std::string_view(a->getName()) < std::string_view(b->getName());
              });

    for (odb::dbMaster* master : masters) {
        odb::Rect odb_bbox;
        master->getPlacementBoundary(odb_bbox);

        MasterInfo info;
        info.name           = master->getName();
        info.dbu_per_micron = dbu;
        info.bbox.ll        = {static_cast<int64_t>(odb_bbox.xMin()),
                               static_cast<int64_t>(odb_bbox.yMin())};
        info.bbox.ur        = {static_cast<int64_t>(odb_bbox.xMax()),
                               static_cast<int64_t>(odb_bbox.yMax())};

        if (!callback(info)) {
            return;  // early exit requested
        }
    }
}

// ── Instances ─────────────────────────────────────────────────────────────────

void Traverser::ForEachInstance(
    std::function<bool(const InstanceInfo&)> callback,
    bool compute_bbox_flag) const
{
    if (!block_ || !callback) {
        return;
    }

    for (odb::dbInst* inst : block_->getInsts()) {
        odb::dbMaster* master = inst->getMaster();

        InstanceInfo info;
        info.name        = inst->getName();
        info.master_name = master->getName();

        info.orient.v    = orient_from_odb(inst->getOrient());
        info.placement.v = placement_from_odb(inst->getPlacementStatus());

        odb::dbRegion* region = inst->getRegion();
        if (region) {
            info.region_name = region->getName();
        }

        // Always compute bbox to derive the DEF-origin (placed bbox lower-left).
        // ODB stores an internal adjusted origin that differs for non-N orientations.
        info.bbox = compute_bbox(inst);
        info.origin = info.bbox.ll;

        if (!compute_bbox_flag) {
            // Caller didn't request bbox; zero it out but keep origin.
            info.bbox = {};
        }

        if (!callback(info)) {
            return;  // early exit requested
        }
    }
}

// ── Regions ───────────────────────────────────────────────────────────────────────

void Traverser::ForEachRegion(
    std::function<bool(const RegionInfo&)> callback) const
{
    if (!block_ || !callback) {
        return;
    }

    for (odb::dbRegion* region : block_->getRegions()) {
        RegionInfo info;
        info.name = region->getName();

        // Compute the bounding envelope across all boundary sub-boxes so that
        // polygon-defined regions (which ODB decomposes into multiple boxes)
        // yield a single, non-degenerate rectangle.
        int64_t xMin = std::numeric_limits<int64_t>::max();
        int64_t yMin = std::numeric_limits<int64_t>::max();
        int64_t xMax = std::numeric_limits<int64_t>::min();
        int64_t yMax = std::numeric_limits<int64_t>::min();

        for (odb::dbBox* box : region->getBoundaries()) {
            xMin = std::min(xMin, static_cast<int64_t>(box->xMin()));
            yMin = std::min(yMin, static_cast<int64_t>(box->yMin()));
            xMax = std::max(xMax, static_cast<int64_t>(box->xMax()));
            yMax = std::max(yMax, static_cast<int64_t>(box->yMax()));
        }

        if (xMin <= xMax && yMin <= yMax) {
            Rect r;
            r.ll = {xMin, yMin};
            r.ur = {xMax, yMax};
            info.rects.push_back(r);
        }

        if (!callback(info)) {
            return;  // early exit requested
        }
    }
}

}  // namespace dftodb
