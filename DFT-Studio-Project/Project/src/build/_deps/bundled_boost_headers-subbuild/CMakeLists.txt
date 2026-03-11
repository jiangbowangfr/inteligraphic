# Distributed under the OSI-approved BSD 3-Clause License.  See accompanying
# file Copyright.txt or https://cmake.org/licensing for details.

cmake_minimum_required(VERSION 3.22.1)

# We name the project and the target for the ExternalProject_Add() call
# to something that will highlight to the user what we are working on if
# something goes wrong and an error message is produced.

project(bundled_boost_headers-populate NONE)



include(ExternalProject)
ExternalProject_Add(bundled_boost_headers-populate
                     "UPDATE_DISCONNECTED" "False" "URL" "https://github.com/boostorg/boost/releases/download/boost-1.85.0/boost-1.85.0-cmake.tar.gz" "DOWNLOAD_EXTRACT_TIMESTAMP" "TRUE"
                    SOURCE_DIR          "/home/mingzhejiang/Projects/github/OpenROAD/DFT-Studio-Project/Project/src/build/_deps/bundled_boost_headers-src"
                    BINARY_DIR          "/home/mingzhejiang/Projects/github/OpenROAD/DFT-Studio-Project/Project/src/build/_deps/bundled_boost_headers-build"
                    CONFIGURE_COMMAND   ""
                    BUILD_COMMAND       ""
                    INSTALL_COMMAND     ""
                    TEST_COMMAND        ""
                    USES_TERMINAL_DOWNLOAD  YES
                    USES_TERMINAL_UPDATE    YES
)


