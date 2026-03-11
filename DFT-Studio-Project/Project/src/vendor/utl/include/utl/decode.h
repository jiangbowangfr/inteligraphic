// SPDX-License-Identifier: BSD-3-Clause
// Copyright (c) 2025-2025, The OpenROAD Authors

#pragma once

#include <string>

namespace utl {

std::string base64_decode(const std::string& encoded_string);
std::string base64_decode(const char* encoded_strings[]);

#ifndef DFTODB_NO_TCL
struct Tcl_Interp;
void evalTclInit(Tcl_Interp* interp, const char* inits[]);
#endif

}  // namespace utl
