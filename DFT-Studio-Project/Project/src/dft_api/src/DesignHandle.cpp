// SPDX-License-Identifier: BSD-3-Clause
// DFT Studio — OpenDB Integration Layer
#include "dftodb/DesignHandle.h"

#include "odb/db.h"
#include "utl/Logger.h"

namespace dftodb {

// ─────────────────────────────────────────────────────────────────────────────
// Impl
//
// db is held in a shared_ptr<dbDatabase> whose custom deleter calls
// odb::dbDatabase::destroy().  This is set up in Importer.cpp when the
// shared_ptr is constructed — Impl itself is oblivious to the deleter.
// ─────────────────────────────────────────────────────────────────────────────
struct DesignHandle::Impl {
    std::shared_ptr<odb::dbDatabase> db;
    std::unique_ptr<utl::Logger>     logger;
    odb::dbBlock*                    top_block = nullptr;
};

// ─────────────────────────────────────────────────────────────────────────────
// Constructors / destructor
// ─────────────────────────────────────────────────────────────────────────────

DesignHandle::DesignHandle()
    : impl_(std::make_unique<Impl>())
{}

DesignHandle::DesignHandle(std::shared_ptr<odb::dbDatabase> db,
                           std::unique_ptr<utl::Logger>     logger,
                           odb::dbBlock*                    block)
    : impl_(std::make_unique<Impl>())
{
    impl_->db        = std::move(db);
    impl_->logger    = std::move(logger);
    impl_->top_block = block;
}

DesignHandle::~DesignHandle() = default;

DesignHandle::DesignHandle(DesignHandle&&) noexcept            = default;
DesignHandle& DesignHandle::operator=(DesignHandle&&) noexcept = default;

// ─────────────────────────────────────────────────────────────────────────────
// Public accessors
// ─────────────────────────────────────────────────────────────────────────────

bool DesignHandle::is_valid() const
{
    return impl_ && impl_->db && impl_->top_block;
}

odb::dbBlock* DesignHandle::top_block() const
{
    return impl_ ? impl_->top_block : nullptr;
}

}  // namespace dftodb

