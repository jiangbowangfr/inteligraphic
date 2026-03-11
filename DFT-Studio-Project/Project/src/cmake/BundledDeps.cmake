# cmake/BundledDeps.cmake
#
# Downloads and builds all COMPILED runtime dependencies from source so the
# build machine needs only: cmake >= 3.16, a C++20 compiler, internet access
# on first configure, and libboost-dev (Boost headers; header-only, no compiled
# Boost library is needed since Boost::regex → std::regex and
# Boost::iostreams → guarded out by DFTODB_NO_GZIP_STREAMS).
#
# After this file is included, the following targets are available:
#   ZLIB::ZLIB             (static, from source)
#   spdlog::spdlog         (static, from source)
#   absl::synchronization  and all other absl:: targets (static, from source)
#   Boost::boost           (header-only, from system libboost-dev)
#
# The final dftodb-inspect binary links everything statically and carries all
# library code inside the .elf file — no apt install on the target machine.

include(FetchContent)

# Force all FetchContent'd sub-projects to build static libraries.
set(BUILD_SHARED_LIBS OFF CACHE BOOL "Force static libraries" FORCE)

# ── zlib 1.3.1 ────────────────────────────────────────────────────────────────
# madler/zlib builds a 'zlibstatic' target.  We alias it to ZLIB::ZLIB so the
# rest of the CMakeLists.txt sees the same target name as find_package(ZLIB).
FetchContent_Declare(
    bundled_zlib
    GIT_REPOSITORY https://github.com/madler/zlib.git
    GIT_TAG        v1.3.1
    GIT_SHALLOW    TRUE
)
FetchContent_GetProperties(bundled_zlib)
if(NOT bundled_zlib_POPULATED)
    FetchContent_Populate(bundled_zlib)
    set(ZLIB_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
    add_subdirectory(${bundled_zlib_SOURCE_DIR} ${bundled_zlib_BINARY_DIR} EXCLUDE_FROM_ALL)
endif()
if(NOT TARGET ZLIB::ZLIB)
    add_library(ZLIB::ZLIB ALIAS zlibstatic)
endif()
target_include_directories(zlibstatic INTERFACE
    $<BUILD_INTERFACE:${bundled_zlib_SOURCE_DIR}>
    $<BUILD_INTERFACE:${bundled_zlib_BINARY_DIR}>)

# ── spdlog v1.14.1 ────────────────────────────────────────────────────────────
set(SPDLOG_BUILD_SHARED   OFF CACHE BOOL "" FORCE)
set(SPDLOG_INSTALL        OFF CACHE BOOL "" FORCE)
set(SPDLOG_FMT_EXTERNAL   OFF CACHE BOOL "" FORCE)
FetchContent_Declare(
    bundled_spdlog
    GIT_REPOSITORY https://github.com/gabime/spdlog.git
    GIT_TAG        v1.14.1
    GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(bundled_spdlog)

# ── Abseil 20240722.0 ─────────────────────────────────────────────────────────
set(ABSL_PROPAGATE_CXX_STD ON  CACHE BOOL "" FORCE)
set(ABSL_BUILD_TESTING      OFF CACHE BOOL "" FORCE)
set(ABSL_BUILD_EXAMPLES     OFF CACHE BOOL "" FORCE)
FetchContent_Declare(
    bundled_absl
    GIT_REPOSITORY https://github.com/abseil/abseil-cpp.git
    GIT_TAG        20240722.0
    GIT_SHALLOW    TRUE
)
FetchContent_MakeAvailable(bundled_absl)

# ── Boost headers (via system libboost-dev) ───────────────────────────────────
# Boost::regex and Boost::iostreams (the only two compiled Boost libraries)
# have been eliminated from the vendor code:
#   - boost::regex       → std::regex (dbMarkerCategory.cpp)
#   - boost::iostreams   → DFTODB_NO_GZIP_STREAMS guard (ScopedTemporaryFile)
#
# The remaining Boost usage is purely header-only (geometry, polygon, spirit,
# bind, container, algorithm).  Even the headers are compile-time only: all
# template code is inlined into the .o files — Boost does NOT appear in the
# final binary's shared-library dependencies.
#
# Build requirement: apt install libboost-dev   (header package, ~10 MB,
# no compiled .so/.a involved — Boost headers are baked into the .elf).
find_package(Boost 1.71 REQUIRED)

message(STATUS "[BundledDeps] zlib → FetchContent (static)")
message(STATUS "[BundledDeps] spdlog → FetchContent (static)")
message(STATUS "[BundledDeps] abseil → FetchContent (static)")
message(STATUS "[BundledDeps] Boost headers → system libboost-dev (compile-time only)")
