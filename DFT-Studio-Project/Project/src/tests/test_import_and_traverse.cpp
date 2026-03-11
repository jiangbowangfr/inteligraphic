// SPDX-License-Identifier: BSD-3-Clause
// DFT Studio — OpenDB Integration Layer
// Tests: happy-path import and traversal using min.lef / min.def

#include <filesystem>
#include <map>
#include <string>
#include <vector>

#include <gtest/gtest.h>

#include "dftodb/DesignHandle.h"
#include "dftodb/Importer.h"
#include "dftodb/Traverser.h"
#include "dftodb/Types.h"

namespace fs = std::filesystem;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Tests are run from CMake's binary dir. Data files are found relative to the
// source dir, which is injected at compile time via TEST_DATA_DIR.
static fs::path data_dir() {
    return fs::path(TEST_DATA_DIR);
}

// ---------------------------------------------------------------------------
// Fixture: loads min.lef + min.def once, shared by all test cases.
// ---------------------------------------------------------------------------
class ImportTraverseTest : public ::testing::Test {
 protected:
    static void SetUpTestSuite() {
        std::vector<std::string> lef_files = {
            (data_dir() / "min.lef").string()};
        std::string def_file = (data_dir() / "min.def").string();

        dftodb::ImportOptions opts;
        auto [status, handle] =
            dftodb::Importer::LoadLefDef(lef_files, def_file, opts);

        ASSERT_TRUE(status.ok) << "LoadLefDef failed: " << status.message;
        ASSERT_TRUE(handle.is_valid());

        s_handle_ = std::make_unique<dftodb::DesignHandle>(std::move(handle));
    }

    static void TearDownTestSuite() { s_handle_.reset(); }

    const dftodb::DesignHandle& handle() const { return *s_handle_; }

    static std::unique_ptr<dftodb::DesignHandle> s_handle_;
};

// static member definition
std::unique_ptr<dftodb::DesignHandle> ImportTraverseTest::s_handle_;

// ---------------------------------------------------------------------------
// Test: handle is valid after successful import
// ---------------------------------------------------------------------------
TEST_F(ImportTraverseTest, HandleIsValid) {
    EXPECT_TRUE(handle().is_valid());
}

// ---------------------------------------------------------------------------
// Test: DBU per micron matches UNITS DISTANCE MICRONS 1000 in min.def
// ---------------------------------------------------------------------------
TEST_F(ImportTraverseTest, DbuPerMicron) {
    dftodb::Traverser t(handle());
    EXPECT_EQ(t.GetDbuPerMicron(), 1000);
}

// ---------------------------------------------------------------------------
// Test: die area matches DIEAREA ( 0 0 ) ( 1000 1000 ) in min.def
// (coordinates are already in DBU — DEF uses DBU when UNITS=1000)
// ---------------------------------------------------------------------------
TEST_F(ImportTraverseTest, DieArea) {
    dftodb::Traverser t(handle());
    auto die = t.GetDieArea();
    EXPECT_EQ(die.area.ll.x, 0);
    EXPECT_EQ(die.area.ll.y, 0);
    EXPECT_EQ(die.area.ur.x, 1000);
    EXPECT_EQ(die.area.ur.y, 1000);
}

// ---------------------------------------------------------------------------
// Test: exactly 2 masters, alphabetical order B1 then B2
// ---------------------------------------------------------------------------
TEST_F(ImportTraverseTest, MasterCount) {
    dftodb::Traverser t(handle());
    int count = 0;
    t.ForEachMaster([&](const dftodb::MasterInfo&) {
        ++count;
        return true;
    });
    EXPECT_EQ(count, 2);
}

TEST_F(ImportTraverseTest, MasterOrderAndSize) {
    dftodb::Traverser t(handle());
    std::vector<dftodb::MasterInfo> masters;
    t.ForEachMaster([&](const dftodb::MasterInfo& m) {
        masters.push_back(m);
        return true;
    });

    ASSERT_EQ(masters.size(), 2u);

    // Alphabetical order: B1 < B2
    EXPECT_EQ(masters[0].name, "B1");
    EXPECT_EQ(masters[1].name, "B2");

    // B1: SIZE 100 BY 80, UNITS=1000 → stored as-is by OpenDB (tech units)
    // LEF SIZE is in microns; OpenDB stores in DBU → 100*1000=100000, 80*1000=80000
    EXPECT_EQ(masters[0].bbox.width(),  100000);
    EXPECT_EQ(masters[0].bbox.height(), 80000);

    // B2: SIZE 40 BY 50 → 40000 × 50000 DBU
    EXPECT_EQ(masters[1].bbox.width(),  40000);
    EXPECT_EQ(masters[1].bbox.height(), 50000);
}

// ---------------------------------------------------------------------------
// Test: early-exit from ForEachMaster
// ---------------------------------------------------------------------------
TEST_F(ImportTraverseTest, MasterEarlyExit) {
    dftodb::Traverser t(handle());
    int count = 0;
    t.ForEachMaster([&](const dftodb::MasterInfo&) {
        ++count;
        return false;  // stop after first
    });
    EXPECT_EQ(count, 1);
}

// ---------------------------------------------------------------------------
// Test: exactly 2 instances
// ---------------------------------------------------------------------------
TEST_F(ImportTraverseTest, InstanceCount) {
    dftodb::Traverser t(handle());
    int count = 0;
    t.ForEachInstance([&](const dftodb::InstanceInfo&) {
        ++count;
        return true;
    }, /*compute_bbox=*/false);
    EXPECT_EQ(count, 2);
}

// ---------------------------------------------------------------------------
// Test: instance names and master names
// ---------------------------------------------------------------------------
TEST_F(ImportTraverseTest, InstanceNamesAndMasters) {
    dftodb::Traverser t(handle());
    std::map<std::string, std::string> inst_to_master;
    t.ForEachInstance([&](const dftodb::InstanceInfo& info) {
        inst_to_master[std::string(info.name)] =
            std::string(info.master_name);
        return true;
    }, /*compute_bbox=*/false);

    ASSERT_EQ(inst_to_master.size(), 2u);
    EXPECT_EQ(inst_to_master.at("u_b1"), "B1");
    EXPECT_EQ(inst_to_master.at("u_b2"), "B2");
}

// ---------------------------------------------------------------------------
// Test: instance origins (DEF PLACED coordinates, in DBU)
//   u_b1 PLACED ( 100 200 ) N  → origin = (100, 200) DBU
//   u_b2 PLACED ( 400 100 ) N  → origin = (400, 100) DBU
// ---------------------------------------------------------------------------
TEST_F(ImportTraverseTest, InstanceOrigins) {
    dftodb::Traverser t(handle());
    std::map<std::string, dftodb::Point> origins;
    t.ForEachInstance([&](const dftodb::InstanceInfo& info) {
        origins[std::string(info.name)] = info.origin;
        return true;
    }, /*compute_bbox=*/false);

    ASSERT_EQ(origins.size(), 2u);
    EXPECT_EQ(origins.at("u_b1").x, 100);
    EXPECT_EQ(origins.at("u_b1").y, 200);
    EXPECT_EQ(origins.at("u_b2").x, 400);
    EXPECT_EQ(origins.at("u_b2").y, 100);
}

// ---------------------------------------------------------------------------
// Test: instance bounding boxes with compute_bbox = true
//   u_b1: orient N, origin (100,200), master B1 (100000×80000 DBU)
//         → bbox ll=(100,200), ur=(100+100000, 200+80000) = (100100, 80200)
//   u_b2: orient N, origin (400,100), master B2 (40000×50000 DBU)
//         → bbox ll=(400,100), ur=(400+40000, 100+50000)  = (40400, 50100)
//
// Note: DEF PLACED coordinates in min.def are small integers (100, 200 etc.)
// because UNITS=1000 and the values are already expressed in DBU.
// Master sizes from LEF are scaled to DBU by OpenDB (multiplied by dbu/μm).
// ---------------------------------------------------------------------------
TEST_F(ImportTraverseTest, InstanceBoundingBoxes) {
    dftodb::Traverser t(handle());
    std::map<std::string, dftodb::Rect> bboxes;
    t.ForEachInstance([&](const dftodb::InstanceInfo& info) {
        bboxes[std::string(info.name)] = info.bbox;
        return true;
    }, /*compute_bbox=*/true);

    ASSERT_EQ(bboxes.size(), 2u);

    const auto& b1 = bboxes.at("u_b1");
    EXPECT_EQ(b1.ll.x, 100);
    EXPECT_EQ(b1.ll.y, 200);
    EXPECT_EQ(b1.ur.x, 100 + 100000);
    EXPECT_EQ(b1.ur.y, 200 + 80000);

    const auto& b2 = bboxes.at("u_b2");
    EXPECT_EQ(b2.ll.x, 400);
    EXPECT_EQ(b2.ll.y, 100);
    EXPECT_EQ(b2.ur.x, 400 + 40000);
    EXPECT_EQ(b2.ur.y, 100 + 50000);
}

// ---------------------------------------------------------------------------
// Test: instance orientations
// ---------------------------------------------------------------------------
TEST_F(ImportTraverseTest, InstanceOrientations) {
    dftodb::Traverser t(handle());
    t.ForEachInstance([&](const dftodb::InstanceInfo& info) {
        EXPECT_EQ(info.orient.v, dftodb::Orient::N)
            << "Expected N orientation for " << info.name;
        return true;
    }, /*compute_bbox=*/false);
}

// ---------------------------------------------------------------------------
// Test: early-exit from ForEachInstance
// ---------------------------------------------------------------------------
TEST_F(ImportTraverseTest, InstanceEarlyExit) {
    dftodb::Traverser t(handle());
    int count = 0;
    t.ForEachInstance([&](const dftodb::InstanceInfo&) {
        ++count;
        return false;
    });
    EXPECT_EQ(count, 1);
}

// ---------------------------------------------------------------------------
// Test: Traverser can be created from a const DesignHandle ref
// (exercises the const-correctness contract in the API)
// ---------------------------------------------------------------------------
TEST_F(ImportTraverseTest, TraverserFromConstHandle) {
    const dftodb::DesignHandle& ch = handle();
    dftodb::Traverser t(ch);
    EXPECT_EQ(t.GetDbuPerMicron(), 1000);
}

// ---------------------------------------------------------------------------
// Fixture: TC-02 — 8 orientations (N, S, E, W, FN, FS, FE, FW)
// Uses doc/def-tests/dft_opendb_testcases/02_orientations_8cases/
// ---------------------------------------------------------------------------
static fs::path tc_dir(const char* name) {
    return fs::path(TC_DATA_DIR) / name;
}

class OrientationsTest : public ::testing::Test {
 protected:
    static void SetUpTestSuite() {
        const auto dir = tc_dir("02_orientations_8cases");
        std::vector<std::string> lef_files = {
            (dir / "tech.lef").string(),
            (dir / "lib.lef").string()};
        std::string def_file = (dir / "design.def").string();

        dftodb::ImportOptions opts;
        auto [status, handle] =
            dftodb::Importer::LoadLefDef(lef_files, def_file, opts);

        ASSERT_TRUE(status.ok) << "LoadLefDef failed: " << status.message;
        ASSERT_TRUE(handle.is_valid());

        s_handle_ = std::make_unique<dftodb::DesignHandle>(std::move(handle));
    }

    static void TearDownTestSuite() { s_handle_.reset(); }

    const dftodb::DesignHandle& handle() const { return *s_handle_; }

    static std::unique_ptr<dftodb::DesignHandle> s_handle_;
};

std::unique_ptr<dftodb::DesignHandle> OrientationsTest::s_handle_;

TEST_F(OrientationsTest, AllEightOrientations) {
    // DEF: u0→N  u1→S  u2→E  u3→W  u4→FN  u5→FS  u6→FE  u7→FW
    const std::map<std::string, dftodb::Orient::Value> expected = {
        {"u0", dftodb::Orient::N},
        {"u1", dftodb::Orient::S},
        {"u2", dftodb::Orient::E},
        {"u3", dftodb::Orient::W},
        {"u4", dftodb::Orient::FN},
        {"u5", dftodb::Orient::FS},
        {"u6", dftodb::Orient::FE},
        {"u7", dftodb::Orient::FW},
    };

    dftodb::Traverser t(handle());
    int seen = 0;

    t.ForEachInstance([&](const dftodb::InstanceInfo& info) {
        auto it = expected.find(info.name);
        EXPECT_NE(it, expected.end()) << "Unexpected instance: " << info.name;
        if (it != expected.end()) {
            EXPECT_EQ(info.orient.v, it->second)
                << "Orient mismatch for " << info.name;
            ++seen;
        }
        return true;
    }, /*compute_bbox=*/false);

    EXPECT_EQ(seen, static_cast<int>(expected.size()));
}
