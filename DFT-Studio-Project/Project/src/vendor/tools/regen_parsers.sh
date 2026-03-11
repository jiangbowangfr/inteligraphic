#!/usr/bin/env bash
# tools/regen_parsers.sh
#
# Re-generates the pre-built Bison parser sources from the .y grammar files.
# Run this ONLY when lef/lef.y or def/def.y is updated from upstream OpenROAD.
# Bison >= 3.0 is required (tested with 3.8.2).
#
# Usage:
#   cd DFT-Studio-Project/Project/src/vendor
#   bash tools/regen_parsers.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENDOR_DIR="$(dirname "$SCRIPT_DIR")"

if ! command -v bison &>/dev/null; then
    echo "ERROR: bison not found in PATH. Install bison >= 3.0 to continue." >&2
    exit 1
fi

BISON_VER=$(bison --version | head -1 | grep -oP '\d+\.\d+')
echo "Using $(bison --version | head -1)"

# LEF parser
mkdir -p "$VENDOR_DIR/odb/src/lef/generated"
bison \
    --output="$VENDOR_DIR/odb/src/lef/generated/lef_parser.cpp" \
    --defines="$VENDOR_DIR/odb/src/lef/generated/lef_parser.hpp" \
    "$VENDOR_DIR/odb/src/lef/lef/lef.y"
echo "Generated: odb/src/lef/generated/lef_parser.cpp (.hpp)"

# DEF parser
mkdir -p "$VENDOR_DIR/odb/src/def/generated"
bison \
    --output="$VENDOR_DIR/odb/src/def/generated/def_parser.cpp" \
    --defines="$VENDOR_DIR/odb/src/def/generated/def_parser.hpp" \
    "$VENDOR_DIR/odb/src/def/def/def.y"
echo "Generated: odb/src/def/generated/def_parser.cpp (.hpp)"

echo "Done. Commit the generated files together with any .y changes."
