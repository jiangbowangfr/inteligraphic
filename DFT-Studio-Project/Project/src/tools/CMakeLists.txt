# SPDX-License-Identifier: BSD-3-Clause
# DFT Studio — CLI tools

add_executable(dftodb-inspect dftodb_inspect.cpp)

set_target_properties(dftodb-inspect PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON)

target_link_libraries(dftodb-inspect PRIVATE dft_api)

target_include_directories(dftodb-inspect PRIVATE
    ${CMAKE_SOURCE_DIR}/dft_api/include
    ${CMAKE_SOURCE_DIR}/vendor/odb/include
    ${CMAKE_SOURCE_DIR}/vendor/utl/include)

# ── Self-contained static binary ─────────────────────────────────────────────────────
# When DFTODB_BUNDLE_DEPS=ON (the default), all third-party library code is
# already compiled as static archives and linked in.  Adding these flags makes
# the C++ standard library and GCC runtime also link statically, so the final
# binary only needs the kernel ABI (glibc, which is present on every Linux).
if(DFTODB_BUNDLE_DEPS)
    target_link_options(dftodb-inspect PRIVATE
        $<$<CXX_COMPILER_ID:GNU>:-static-libgcc>
        $<$<CXX_COMPILER_ID:GNU>:-static-libstdc++>
        $<$<CXX_COMPILER_ID:Clang>:-static-libgcc>
        $<$<CXX_COMPILER_ID:Clang>:-static-libc++>
    )
endif()

install(TARGETS dftodb-inspect
    RUNTIME DESTINATION bin)
