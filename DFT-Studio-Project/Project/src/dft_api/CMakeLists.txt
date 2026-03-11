# dft_api/CMakeLists.txt
include(${CMAKE_SOURCE_DIR}/cmake/CompilerOptions.cmake)

add_library(dft_api
    src/DesignHandle.cpp
    src/Importer.cpp
    src/Json.cpp
    src/Traverser.cpp
)

add_library(dftodb::dft_api ALIAS dft_api)

target_include_directories(dft_api
    PUBLIC  include
    PRIVATE src
)

target_link_libraries(dft_api
    PUBLIC  dftodb::opendb_core
)

dftodb_set_compiler_options(dft_api)

set_target_properties(dft_api PROPERTIES
    POSITION_INDEPENDENT_CODE ON
    # odb/db.h transitively includes geom.h which uses C++20 (std::numbers,
    # spaceship operator). dft_api must match.
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
)
