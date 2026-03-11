# SPDX-License-Identifier: BSD-3-Clause
# DFT Studio — OpenDB Integration Layer
cmake_minimum_required(VERSION 3.16)
project(dftodb VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# ── Build options ─────────────────────────────────────────────────────────────
option(DFTODB_BUILD_TESTS  "Build unit/integration tests"  OFF)
option(DFTODB_BUILD_TOOLS  "Build command-line tools"      ON)

# ── Self-contained build option ───────────────────────────────────────────────
# When ON (default), all dependencies are downloaded from source via
# FetchContent and compiled into the binary.  The resulting dftodb-inspect
# needs no apt install on the machine it runs on.
# Set to OFF to use system-installed packages (traditional workflow).
option(DFTODB_BUNDLE_DEPS
    "Download and build all dependencies from source; produce a self-contained binary"
    ON)

# ── Dependencies ──────────────────────────────────────────────────────────────
# FindDependencies.cmake reads DFTODB_BUNDLE_DEPS and either includes
# cmake/BundledDeps.cmake (FetchContent) or runs find_package().
include(cmake/FindDependencies.cmake)

# ── Vendor (OpenDB + utl_lib, trimmed) ────────────────────────────────────────
add_subdirectory(vendor)

# ── Our public API layer ───────────────────────────────────────────────────────
add_subdirectory(dft_api)

# ── Tests ─────────────────────────────────────────────────────────────────────
if(DFTODB_BUILD_TESTS)
  enable_testing()
  add_subdirectory(tests)
endif()

# ── CLI tools ─────────────────────────────────────────────────────────────────
if(DFTODB_BUILD_TOOLS)
  add_subdirectory(tools)
endif()
