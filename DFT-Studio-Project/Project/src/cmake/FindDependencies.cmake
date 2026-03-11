# cmake/FindDependencies.cmake
#
# When DFTODB_BUNDLE_DEPS=ON (default), all dependencies are built from source
# via FetchContent — no apt install required on the build machine.
#
# When DFTODB_BUNDLE_DEPS=OFF, the traditional find_package() approach is used
# (requires the corresponding *-dev packages to be installed).

if(DFTODB_BUNDLE_DEPS)
    include(cmake/BundledDeps.cmake)
else()
    # ── System packages ───────────────────────────────────────────────────────
    find_package(ZLIB REQUIRED)

    # iostreams and regex removed from REQUIRED: those compiled Boost libraries
    # are no longer used (regex → std::regex; iostreams → guarded out).
    find_package(Boost 1.71 REQUIRED)

    find_package(spdlog REQUIRED)

    find_package(absl REQUIRED)
endif()
