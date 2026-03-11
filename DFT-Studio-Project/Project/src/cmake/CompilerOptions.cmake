# cmake/CompilerOptions.cmake
# Shared compiler warning / diagnostic settings for dftodb targets.
# Include this file from any target that wants consistent flags, e.g.:
#   include(cmake/CompilerOptions.cmake)
#   dftodb_set_compiler_options(my_target)

function(dftodb_set_compiler_options target)
  target_compile_options(${target} PRIVATE
    $<$<CXX_COMPILER_ID:GNU,Clang,AppleClang>:
      -Wall
      -Wextra
      -Wno-unused-parameter
    >
  )
endfunction()
