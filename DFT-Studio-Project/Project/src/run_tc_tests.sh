#!/usr/bin/env bash
# run_tc_tests.sh — Run dftodb-inspect against every test case in dft_opendb_testcases/
#
# Usage:
#   ./run_tc_tests.sh [OPTIONS] [TC_ID...]
#
# Options:
#   --json    Output JSON (default is --text for readable terminal output)
#   --compact Output compact JSON (no indentation)
#
# Examples:
#   ./run_tc_tests.sh              # run all test cases (text output)
#   ./run_tc_tests.sh 04 09        # run only TC-04 and TC-09
#   ./run_tc_tests.sh --json 04    # run TC-04 and print JSON output
#
# The script must be run from the Project/src directory (where the build/ folder is).
# Build first:  cmake --build build -j$(nproc)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSPECT="${SCRIPT_DIR}/build/tools/dftodb-inspect"
TC_ROOT="${SCRIPT_DIR}/../doc/def-tests/dft_opendb_testcases"

# ── Parse options ─────────────────────────────────────────────────────────────
OUTPUT_FLAG="--text"   # default: human-readable tables
TC_IDS=()

for arg in "$@"; do
    case "${arg}" in
        --json)    OUTPUT_FLAG="--json" ;;
        --compact) OUTPUT_FLAG="--compact" ;;
        --text)    OUTPUT_FLAG="--text" ;;
        *)         TC_IDS+=("${arg}") ;;
    esac
done

if [[ ! -x "${INSPECT}" ]]; then
    echo "ERROR: dftodb-inspect not found at ${INSPECT}" >&2
    echo "       Run: cmake --build build -j\$(nproc)  from ${SCRIPT_DIR}" >&2
    exit 1
fi

if [[ ! -d "${TC_ROOT}" ]]; then
    echo "ERROR: test case directory not found: ${TC_ROOT}" >&2
    exit 1
fi

# ── Collect requested test case directories ───────────────────────────────────
if [[ ${#TC_IDS[@]} -gt 0 ]]; then
    # User supplied specific TC IDs (e.g. 04 09)
    TC_DIRS=()
    for id in "${TC_IDS[@]}"; do
        match=$(find "${TC_ROOT}" -maxdepth 1 -type d -name "${id}_*" | sort | head -1)
        if [[ -z "${match}" ]]; then
            echo "WARNING: no test case directory matching '${id}_*' — skipping" >&2
        else
            TC_DIRS+=("${match}")
        fi
    done
else
    # Run all test cases in sorted order
    mapfile -t TC_DIRS < <(find "${TC_ROOT}" -maxdepth 1 -mindepth 1 -type d | sort)
fi

if [[ ${#TC_DIRS[@]} -eq 0 ]]; then
    echo "No test cases to run." >&2
    exit 1
fi

# ── Run each test case ────────────────────────────────────────────────────────
PASS=0
FAIL=0

for tc_dir in "${TC_DIRS[@]}"; do
    tc_name=$(basename "${tc_dir}")
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  TC: ${tc_name}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Collect LEF files in order (tech.lef first, then lib.lef / others)
    lef_args=()
    for lef in "${tc_dir}/tech.lef" "${tc_dir}/lib.lef"; do
        [[ -f "${lef}" ]] && lef_args+=(--lef "${lef}")
    done
    # Any additional .lef files not already included
    while IFS= read -r extra_lef; do
        already=false
        for already_added in "${lef_args[@]}"; do
            [[ "${already_added}" == "${extra_lef}" ]] && already=true && break
        done
        [[ "${already}" == false ]] && lef_args+=(--lef "${extra_lef}")
    done < <(find "${tc_dir}" -maxdepth 1 -name "*.lef" | sort)

    def_file="${tc_dir}/design.def"
    if [[ ! -f "${def_file}" ]]; then
        echo "  SKIP: no design.def found"
        continue
    fi

    if "${INSPECT}" "${lef_args[@]}" --def "${def_file}" "${OUTPUT_FLAG}" 2>/dev/null; then
        echo ""
        echo "  [PASS] ${tc_name}"
        (( PASS++ )) || true
    else
        echo ""
        echo "  [FAIL] ${tc_name} — dftodb-inspect exited with code $?"
        (( FAIL++ )) || true
    fi
    echo ""
done

# ── Summary ───────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Results: ${PASS} passed, ${FAIL} failed  (out of $((PASS + FAIL)) run)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

[[ ${FAIL} -eq 0 ]]
