#!/usr/bin/env bash
set -euo pipefail

BINARY="$(dirname "$0")/build/tools/dftodb-inspect"
TCDIR="$(dirname "$0")/../doc/def-tests/dft_opendb_testcases"

for tc in "$TCDIR"/*/; do
    name=$(basename "$tc")
    printf "=== %s ===\n" "$name"

    # Build ordered --lef argument string: tech.lef first, then others alphabetically
    lef_args=()
    if [[ -f "$tc/tech.lef" ]]; then
        lef_args+=("--lef" "$tc/tech.lef")
    fi
    for lf in "$tc"*.lef; do
        bn=$(basename "$lf")
        [[ "$bn" == "tech.lef" ]] && continue
        lef_args+=("--lef" "$lf")
    done

    outfile="$tc/actual-produced.json"

    if "$BINARY" "${lef_args[@]}" --def "$tc/design.def" --json \
            2>/tmp/gen_actual_stderr.txt \
            > "$outfile"; then
        printf "  PASS  -> actual-produced.json  (%d bytes)\n" "$(wc -c < "$outfile")"
    else
        rc=$?
        printf "  FAIL  (exit %d)\n" "$rc"
        printf "  stderr tail:\n"
        tail -5 /tmp/gen_actual_stderr.txt | sed 's/^/    /'
        # Write a JSON error object so the file always exists for the test team
        printf '{"error": "dftodb-inspect exited with code %d", "stderr": "%s"}\n' \
            "$rc" "$(tail -1 /tmp/gen_actual_stderr.txt | sed 's/"/\\"/g')" \
            > "$outfile"
    fi
done

printf "\nDone. Files written:\n"
for tc in "$TCDIR"/*/; do
    f="$tc/actual-produced.json"
    printf "  %s  (%d bytes)\n" "$f" "$(wc -c < "$f")"
done
