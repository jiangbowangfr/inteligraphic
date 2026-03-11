
if(NOT "/home/mingzhejiang/Projects/github/OpenROAD/DFT-Studio-Project/Project/src/build/_deps/bundled_spdlog-subbuild/bundled_spdlog-populate-prefix/src/bundled_spdlog-populate-stamp/bundled_spdlog-populate-gitinfo.txt" IS_NEWER_THAN "/home/mingzhejiang/Projects/github/OpenROAD/DFT-Studio-Project/Project/src/build/_deps/bundled_spdlog-subbuild/bundled_spdlog-populate-prefix/src/bundled_spdlog-populate-stamp/bundled_spdlog-populate-gitclone-lastrun.txt")
  message(STATUS "Avoiding repeated git clone, stamp file is up to date: '/home/mingzhejiang/Projects/github/OpenROAD/DFT-Studio-Project/Project/src/build/_deps/bundled_spdlog-subbuild/bundled_spdlog-populate-prefix/src/bundled_spdlog-populate-stamp/bundled_spdlog-populate-gitclone-lastrun.txt'")
  return()
endif()

execute_process(
  COMMAND ${CMAKE_COMMAND} -E rm -rf "/home/mingzhejiang/Projects/github/OpenROAD/DFT-Studio-Project/Project/src/build/_deps/bundled_spdlog-src"
  RESULT_VARIABLE error_code
  )
if(error_code)
  message(FATAL_ERROR "Failed to remove directory: '/home/mingzhejiang/Projects/github/OpenROAD/DFT-Studio-Project/Project/src/build/_deps/bundled_spdlog-src'")
endif()

# try the clone 3 times in case there is an odd git clone issue
set(error_code 1)
set(number_of_tries 0)
while(error_code AND number_of_tries LESS 3)
  execute_process(
    COMMAND "/usr/bin/git"  clone --no-checkout --depth 1 --no-single-branch --config "advice.detachedHead=false" "https://github.com/gabime/spdlog.git" "bundled_spdlog-src"
    WORKING_DIRECTORY "/home/mingzhejiang/Projects/github/OpenROAD/DFT-Studio-Project/Project/src/build/_deps"
    RESULT_VARIABLE error_code
    )
  math(EXPR number_of_tries "${number_of_tries} + 1")
endwhile()
if(number_of_tries GREATER 1)
  message(STATUS "Had to git clone more than once:
          ${number_of_tries} times.")
endif()
if(error_code)
  message(FATAL_ERROR "Failed to clone repository: 'https://github.com/gabime/spdlog.git'")
endif()

execute_process(
  COMMAND "/usr/bin/git"  checkout v1.14.1 --
  WORKING_DIRECTORY "/home/mingzhejiang/Projects/github/OpenROAD/DFT-Studio-Project/Project/src/build/_deps/bundled_spdlog-src"
  RESULT_VARIABLE error_code
  )
if(error_code)
  message(FATAL_ERROR "Failed to checkout tag: 'v1.14.1'")
endif()

set(init_submodules TRUE)
if(init_submodules)
  execute_process(
    COMMAND "/usr/bin/git"  submodule update --recursive --init 
    WORKING_DIRECTORY "/home/mingzhejiang/Projects/github/OpenROAD/DFT-Studio-Project/Project/src/build/_deps/bundled_spdlog-src"
    RESULT_VARIABLE error_code
    )
endif()
if(error_code)
  message(FATAL_ERROR "Failed to update submodules in: '/home/mingzhejiang/Projects/github/OpenROAD/DFT-Studio-Project/Project/src/build/_deps/bundled_spdlog-src'")
endif()

# Complete success, update the script-last-run stamp file:
#
execute_process(
  COMMAND ${CMAKE_COMMAND} -E copy
    "/home/mingzhejiang/Projects/github/OpenROAD/DFT-Studio-Project/Project/src/build/_deps/bundled_spdlog-subbuild/bundled_spdlog-populate-prefix/src/bundled_spdlog-populate-stamp/bundled_spdlog-populate-gitinfo.txt"
    "/home/mingzhejiang/Projects/github/OpenROAD/DFT-Studio-Project/Project/src/build/_deps/bundled_spdlog-subbuild/bundled_spdlog-populate-prefix/src/bundled_spdlog-populate-stamp/bundled_spdlog-populate-gitclone-lastrun.txt"
  RESULT_VARIABLE error_code
  )
if(error_code)
  message(FATAL_ERROR "Failed to copy script-last-run stamp file: '/home/mingzhejiang/Projects/github/OpenROAD/DFT-Studio-Project/Project/src/build/_deps/bundled_spdlog-subbuild/bundled_spdlog-populate-prefix/src/bundled_spdlog-populate-stamp/bundled_spdlog-populate-gitclone-lastrun.txt'")
endif()

