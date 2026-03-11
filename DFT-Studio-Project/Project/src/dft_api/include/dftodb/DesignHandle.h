// SPDX-License-Identifier: BSD-3-Clause
// DFT Studio — OpenDB Integration Layer
#pragma once

#include <memory>

#include "odb/db.h"

namespace utl {
class Logger;
}

namespace dftodb {

// ─────────────────────────────────────────────────────────────────────────────
// DesignHandle
//
// Owns the OpenDB dbDatabase (and its Logger) created during import.
// The top-level dbBlock pointer is a non-owning view into the database.
//
// Lifetime contract:
//   - Any Traverser constructed from a DesignHandle must not outlive it.
//   - odb::dbBlock* returned by top_block() is valid while this handle lives.
//
// Thread safety: not thread-safe; treat as a single-owner object.
// ─────────────────────────────────────────────────────────────────────────────
class DesignHandle {
 public:
    // Default constructor produces an invalid handle.
    // Useful as a "not yet loaded" sentinel or as an error return.
    DesignHandle();

    ~DesignHandle();

    DesignHandle(DesignHandle&&) noexcept;
    DesignHandle& operator=(DesignHandle&&) noexcept;

    // Non-copyable (dbDatabase is not copyable).
    DesignHandle(const DesignHandle&)            = delete;
    DesignHandle& operator=(const DesignHandle&) = delete;

    // Returns false if this handle is in a moved-from (invalid) state.
    bool is_valid() const;

    // Direct access to the underlying OpenDB block for debugging or advanced
    // use. Do not store the raw pointer beyond the DesignHandle's lifetime.
    odb::dbBlock* top_block() const;

 private:
    friend class Importer;

    // Importer-facing constructor: takes owning pointers.
    // DbDatabase ownership is expressed as a shared_ptr so that Importer.cpp
    // can attach the correct odb::dbDatabase::destroy() deleter without
    // exposing it in this header.
    explicit DesignHandle(std::shared_ptr<odb::dbDatabase> db,
                          std::unique_ptr<utl::Logger>     logger,
                          odb::dbBlock*                    block);

    struct Impl;
    std::unique_ptr<Impl> impl_;
};

}  // namespace dftodb
