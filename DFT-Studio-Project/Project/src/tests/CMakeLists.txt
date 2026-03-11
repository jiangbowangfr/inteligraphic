cmake_minimum_required(VERSION 3.16)

# ─── Find GTest ───────────────────────────────────────────────────────────────
find_package(GTest REQUIRED)

# Path to test data directory — injected as a compile-time string so tests can
# resolve fixture files regardless of the working directory at runtime.
set(TEST_DATA_DIR "${CMAKE_CURRENT_SOURCE_DIR}/data")

# Path to integration-level testcase data (doc/def-tests/).
set(TC_DATA_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../doc/def-tests/dft_opendb_testcases")

# ─── test_import_and_traverse ─────────────────────────────────────────────────
add_executable(test_import_and_traverse
    test_import_and_traverse.cpp
)

target_include_directories(test_import_and_traverse
    PRIVATE
        "${CMAKE_CURRENT_SOURCE_DIR}/../dft_api/include"
)

target_compile_definitions(test_import_and_traverse
    PRIVATE
        TEST_DATA_DIR="${TEST_DATA_DIR}"
        TC_DATA_DIR="${TC_DATA_DIR}"
)

target_link_libraries(test_import_and_traverse
    PRIVATE
        dftodb::dft_api
        GTest::gtest
        GTest::gtest_main
)

set_target_properties(test_import_and_traverse PROPERTIES
    # odb/db.h transitively includes C++20 features (geom.h uses std::numbers,
    # spaceship operator). Any consumer of dft_api headers must compile C++20.
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
)

add_test(
    NAME  test_import_and_traverse
    COMMAND test_import_and_traverse
)

# ─── test_negative_inputs ─────────────────────────────────────────────────────
add_executable(test_negative_inputs
    test_negative_inputs.cpp
)

target_include_directories(test_negative_inputs
    PRIVATE
        "${CMAKE_CURRENT_SOURCE_DIR}/../dft_api/include"
)

target_compile_definitions(test_negative_inputs
    PRIVATE
        TEST_DATA_DIR="${TEST_DATA_DIR}"
)

target_link_libraries(test_negative_inputs
    PRIVATE
        dftodb::dft_api
        GTest::gtest
        GTest::gtest_main
)

set_target_properties(test_negative_inputs PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
)

add_test(
    NAME  test_negative_inputs
    COMMAND test_negative_inputs
)
