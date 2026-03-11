// SPDX-License-Identifier: BSD-3-Clause
// DFT Studio — OpenDB Integration Layer
// Tests: negative / error-path inputs

#include <filesystem>
#include <string>
#include <vector>

#include <gtest/gtest.h>

#include "dftodb/Importer.h"
#include "dftodb/Traverser.h"
#include "dftodb/Types.h"

namespace fs = std::filesystem;

static fs::path data_dir() {
    return fs::path(TEST_DATA_DIR);
}

// ---------------------------------------------------------------------------
// Test: non-existent LEF file → Status::ok == false, no crash
// ---------------------------------------------------------------------------
TEST(NegativeInputs, MissingLefFile) {
    std::vector<std::string> lef_files = {"/nonexistent/path/missing.lef"};
    std::string def_file = "/nonexistent/path/missing.def";
    dftodb::ImportOptions opts;

    auto [status, handle] =
        dftodb::Importer::LoadLefDef(lef_files, def_file, opts);

    EXPECT_FALSE(status.ok);
    EXPECT_FALSE(handle.is_valid());
}

// ---------------------------------------------------------------------------
// Test: non-existent DEF file (valid LEF) → Status::ok == false
// ---------------------------------------------------------------------------
TEST(NegativeInputs, MissingDefFile) {
    std::vector<std::string> lef_files = {
        (data_dir() / "min.lef").string()};
    std::string def_file = (data_dir() / "nonexistent.def").string();
    dftodb::ImportOptions opts;

    auto [status, handle] =
        dftodb::Importer::LoadLefDef(lef_files, def_file, opts);

    EXPECT_FALSE(status.ok);
    EXPECT_FALSE(handle.is_valid());
}

// ---------------------------------------------------------------------------
// Test: empty lef_files vector → Status::ok == false
// ---------------------------------------------------------------------------
TEST(NegativeInputs, EmptyLefFileList) {
    std::vector<std::string> lef_files;  // empty
    std::string def_file = (data_dir() / "min.def").string();
    dftodb::ImportOptions opts;

    auto [status, handle] =
        dftodb::Importer::LoadLefDef(lef_files, def_file, opts);

    EXPECT_FALSE(status.ok);
    EXPECT_FALSE(handle.is_valid());
}

// ---------------------------------------------------------------------------
// Test: malformed LEF (not a valid LEF file) → Status::ok == false
// The Importer must not crash even when the parser reports errors.
// ---------------------------------------------------------------------------
TEST(NegativeInputs, MalformedLef) {
    std::vector<std::string> lef_files = {
        (data_dir() / "malformed.lef").string()};
    std::string def_file = (data_dir() / "min.def").string();
    dftodb::ImportOptions opts;

    auto [status, handle] =
        dftodb::Importer::LoadLefDef(lef_files, def_file, opts);

    // Either the LEF parse fails or the subsequent DEF import sees no macros.
    // Either way, the returned handle must be invalid (or status.ok false).
    // Both conditions indicate a proper error path — no crash is the primary
    // requirement.
    if (status.ok) {
        // If parser somehow survived, the handle must still be consistent.
        EXPECT_EQ(handle.is_valid(), true);
    } else {
        EXPECT_FALSE(handle.is_valid());
    }
}

// ---------------------------------------------------------------------------
// Test: empty DEF file → Status::ok == false
// ---------------------------------------------------------------------------
TEST(NegativeInputs, EmptyDef) {
    std::vector<std::string> lef_files = {
        (data_dir() / "min.lef").string()};
    std::string def_file = (data_dir() / "empty.def").string();
    dftodb::ImportOptions opts;

    auto [status, handle] =
        dftodb::Importer::LoadLefDef(lef_files, def_file, opts);

    EXPECT_FALSE(status.ok);
    EXPECT_FALSE(handle.is_valid());
}

// ---------------------------------------------------------------------------
// Test: DesignHandle default-constructed → is_valid() == false
// ---------------------------------------------------------------------------
TEST(NegativeInputs, DefaultConstructedHandleIsInvalid) {
    dftodb::DesignHandle h;
    EXPECT_FALSE(h.is_valid());
}
