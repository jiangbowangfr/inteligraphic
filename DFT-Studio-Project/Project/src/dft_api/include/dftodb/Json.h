// SPDX-License-Identifier: BSD-3-Clause
// DFT Studio — OpenDB Integration Layer
#pragma once

#include <string>

#include "dftodb/Traverser.h"

namespace dftodb {

// ─── JSON serialisation ───────────────────────────────────────────────────────
//
// ToJson() collects the entire design (die area, all masters, all instances with
// bounding boxes, all regions) into a single JSON string.
//
// All coordinates and dimensions are in DBU (database units).
// The "dbu_per_micron" field lets callers convert to µm: value_um = dbu / dbu_per_micron.
//
// JSON schema:
// {
//   "dbu_per_micron": <int>,
//   "die": { "xMin": <int>, "yMin": <int>, "xMax": <int>, "yMax": <int> },
//   "masters": [
//     { "name": <str>, "bbox": { "xMin": <int>, "yMin": <int>,
//                                "xMax": <int>, "yMax": <int> } },
//     ...
//   ],
//   "instances": [
//     { "name": <str>, "master": <str>,
//       "origin": { "x": <int>, "y": <int> },
//       "orient": <str>,          // "N"|"S"|"E"|"W"|"FN"|"FS"|"FE"|"FW"
//       "placement": <str>,       // "PLACED"|"FIXED"|"COVER"|"FIRM"|"UNPLACED"
//       "region": <str>|null,     // region name, or null if unassigned
//       "bbox": { "xMin": <int>, "yMin": <int>,
//                 "xMax": <int>, "yMax": <int> } },
//     ...
//   ],
//   "regions": [
//     { "name": <str>,
//       "rects": [ { "xMin": <int>, "yMin": <int>,
//                    "xMax": <int>, "yMax": <int> }, ... ] },
//     ...
//   ]
// }
//
// pretty: when true (default) the output is indented for readability.
//         when false the output is compact (single line, no extraneous whitespace).
std::string ToJson(const Traverser& t, bool pretty = true);

}  // namespace dftodb
