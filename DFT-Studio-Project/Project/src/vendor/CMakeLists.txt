# vendor/CMakeLists.txt
# Compiles the trimmed OpenDB + utl_lib needed by dftodb.
#
# What we compile (all read-only, no SWIG, no TCL, no Tcl interp):
#   utl_lib  — Logger, Metrics, timer, etc.  (prometheus excluded)
#   lef      — LEF parser (pre-generated from lef.y; no Bison needed at build time)
#   lefzlib  — zlib wrapper for LEF
#   def      — DEF parser (pre-generated from def.y; no Bison needed at build time)
#   defzlib  — zlib wrapper for DEF
#   db       — OpenDB core data structures
#   zutil    — geometry utilities
#   lefin    — LEF importer (lef → db)
#   defin    — DEF importer (def → db)
#   cdl      — circuit description layer
#   defout   — DEF writer (needed transitively by some db internals)
#   lefout   — LEF writer (needed transitively by some db internals)
#
# Excluded:
#   3dblox   — requires OpenSTA + yaml-cpp
#   gdsin    — GDS input (not needed)
#   gdsout   — GDS output (not needed)
#   all SWIG / TCL plugin targets

cmake_minimum_required(VERSION 3.16)

# The entire OpenDB+utl codebase targets C++20 (std::ranges, std::span,
# std::erase_if, operator!= auto-generation from ==).
# This setting is scoped to this subdirectory; dft_api and tests remain C++17.
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# ── Silence warnings from upstream code we do not own ─────────────────────────
# Apply these only to targets defined in this file (not to dft_api or tests).
# Each flag in its own generator expression — spaces inside a single
# expression get passed as one broken argument to the compiler.
add_compile_options(
  $<$<CXX_COMPILER_ID:GNU,Clang,AppleClang>:-Wno-unused-parameter>
  $<$<CXX_COMPILER_ID:GNU,Clang,AppleClang>:-Wno-sign-compare>
)

# ─────────────────────────────────────────────────────────────────────────────
# 1.  utl_lib  (Logger, timer, metrics — no prometheus, no TCL)
# ─────────────────────────────────────────────────────────────────────────────
add_library(utl_lib
    utl/src/CallBackHandler.cpp
    utl/src/CallBack.cpp
    utl/src/Metrics.cpp
    utl/src/CFileUtils.cpp
    utl/src/ScopedTemporaryFile.cpp
    utl/src/SuppressStdout.cpp
    utl/src/Logger.cpp
    utl/src/Progress.cpp
    utl/src/CommandLineProgress.cpp
    utl/src/timer.cpp
    utl/src/mem_stats.cpp
    utl/src/decode.cpp
    utl/src/histogram.cpp
    utl/src/unionFind.cpp
    # LoggerCommon.cpp omitted: it calls ord::getLogger() which is only defined
    # in the full OpenROAD application (OpenRoad.i / Tcl binding).  The wrapper
    # functions (utl::open_metrics, utl::report, …) are not used in the
    # standalone dftodb build.
)

target_include_directories(utl_lib
    PUBLIC  utl/include
    PRIVATE utl/src
)

# DFTODB_NO_TCL: guard applied to our vendor copy of decode.cpp / decode.h
# (see patches/utl_decode_no_tcl.patch)
target_compile_definitions(utl_lib PUBLIC DFTODB_NO_TCL)

# DFTODB_NO_PROMETHEUS: guard preventing compilation of Prometheus metrics
# server code. metrics_server.cpp requires a full Prometheus C++ client library
# that is not vendored here.
target_compile_definitions(utl_lib PUBLIC DFTODB_NO_PROMETHEUS)

target_compile_definitions(utl_lib PUBLIC FMT_DEPRECATED_OSTREAM=1)

# DFTODB_NO_GZIP_STREAMS: removes the Boost::iostreams dependency from
# ScopedTemporaryFile.  The gzip stream path is guarded in the source;
# plain files work normally.  This is always set in the standalone build.
target_compile_definitions(utl_lib PUBLIC DFTODB_NO_GZIP_STREAMS)

target_link_libraries(utl_lib
    PUBLIC
        absl::synchronization
        spdlog::spdlog
        Boost::boost
)

set_target_properties(utl_lib PROPERTIES
    POSITION_INDEPENDENT_CODE ON
)

# ─────────────────────────────────────────────────────────────────────────────
# 2.  LEF parser
#     lef_parser.tab.cc / lef_parser.tab.hh are pre-generated from lef.y
#     using Bison 3.8.2 (vendor-prep step only — Bison not required at
#     build time). See tools/regen_parsers.sh to regenerate if lef.y changes.
# ─────────────────────────────────────────────────────────────────────────────
add_library(lef
    odb/src/lef/lef/crypt.cpp
    odb/src/lef/lef/lefiArray.cpp
    odb/src/lef/lef/lefiCrossTalk.cpp
    odb/src/lef/lef/lefiDebug.cpp
    odb/src/lef/lef/lefiEncryptInt.cpp
    odb/src/lef/lef/lefiLayer.cpp
    odb/src/lef/lef/lefiMacro.cpp
    odb/src/lef/lef/lefiMisc.cpp
    odb/src/lef/lef/lefiNonDefault.cpp
    odb/src/lef/lef/lefiProp.cpp
    odb/src/lef/lef/lefiPropType.cpp
    odb/src/lef/lef/lefiTBExt.cpp
    odb/src/lef/lef/lefiUnits.cpp
    odb/src/lef/lef/lefiVia.cpp
    odb/src/lef/lef/lefiViaRule.cpp
    odb/src/lef/lef/lef_keywords.cpp
    odb/src/lef/lef/lefrCallbacks.cpp
    odb/src/lef/lef/lefrData.cpp
    odb/src/lef/lef/lefrReader.cpp
    odb/src/lef/lef/lefrSettings.cpp
    odb/src/lef/lef/lefwWriterCalls.cpp
    odb/src/lef/lef/lefwWriter.cpp
    odb/src/lef/generated/lef_parser.cpp
)

target_include_directories(lef
    PUBLIC  odb/src/lef/lef
    PRIVATE odb/src/lef/generated  # for lef_parser.hpp
)

set_target_properties(lef PROPERTIES POSITION_INDEPENDENT_CODE ON)

add_library(lefzlib
    odb/src/lef/lefzlib/lefzlib.cpp
)

target_include_directories(lefzlib
    PUBLIC  odb/src/lef/lef
            odb/src/lef/lefzlib
)

target_link_libraries(lefzlib PUBLIC lef ZLIB::ZLIB)
set_target_properties(lefzlib PROPERTIES POSITION_INDEPENDENT_CODE ON)

# ─────────────────────────────────────────────────────────────────────────────
# 3.  DEF parser
#     def_parser.tab.cc / def_parser.tab.hh are pre-generated from def.y
#     using Bison 3.8.2 (vendor-prep step only — Bison not required at
#     build time). See tools/regen_parsers.sh to regenerate if def.y changes.
# ─────────────────────────────────────────────────────────────────────────────
add_library(def
    odb/src/def/def/defiAlias.cpp
    odb/src/def/def/defiAssertion.cpp
    odb/src/def/def/defiBlockage.cpp
    odb/src/def/def/defiComponent.cpp
    odb/src/def/def/defiDebug.cpp
    odb/src/def/def/defiFill.cpp
    odb/src/def/def/defiFPC.cpp
    odb/src/def/def/defiGroup.cpp
    odb/src/def/def/defiIOTiming.cpp
    odb/src/def/def/defiMisc.cpp
    odb/src/def/def/defiNet.cpp
    odb/src/def/def/defiNonDefault.cpp
    odb/src/def/def/defiPartition.cpp
    odb/src/def/def/defiPath.cpp
    odb/src/def/def/defiPinCap.cpp
    odb/src/def/def/defiPinProp.cpp
    odb/src/def/def/defiProp.cpp
    odb/src/def/def/defiPropType.cpp
    odb/src/def/def/defiRegion.cpp
    odb/src/def/def/defiRowTrack.cpp
    odb/src/def/def/defiScanchain.cpp
    odb/src/def/def/defiSite.cpp
    odb/src/def/def/defiSlot.cpp
    odb/src/def/def/defiTimingDisable.cpp
    odb/src/def/def/defiUtil.cpp
    odb/src/def/def/defiVia.cpp
    odb/src/def/def/def_keywords.cpp
    odb/src/def/def/defrCallbacks.cpp
    odb/src/def/def/defrData.cpp
    odb/src/def/def/defrReader.cpp
    odb/src/def/def/defrSettings.cpp
    odb/src/def/def/defwWriterCalls.cpp
    odb/src/def/def/defwWriter.cpp
    odb/src/def/generated/def_parser.cpp
)

target_include_directories(def
    PUBLIC  odb/src/def/def
    PRIVATE odb/src/def/generated  # for def_parser.hpp
)

set_target_properties(def PROPERTIES POSITION_INDEPENDENT_CODE ON)

add_library(defzlib
    odb/src/def/defzlib/defzlib.cpp
)

target_include_directories(defzlib
    PUBLIC  odb/src/def/def
            odb/src/def/defzlib
)

target_link_libraries(defzlib PUBLIC def ZLIB::ZLIB)
set_target_properties(defzlib PROPERTIES POSITION_INDEPENDENT_CODE ON)

# ─────────────────────────────────────────────────────────────────────────────
# 4.  db  (OpenDB core data-structures)
#     Source list matches upstream odb/src/db/CMakeLists.txt exactly.
# ─────────────────────────────────────────────────────────────────────────────
add_library(db
    odb/src/db/dbBTerm.cpp
    odb/src/db/dbStream.cpp
    odb/src/db/dbBTermItr.cpp
    odb/src/db/dbBPinItr.cpp
    odb/src/db/dbBlock.cpp
    odb/src/db/dbBlockItr.cpp
    odb/src/db/dbBox.cpp
    odb/src/db/dbBoxItr.cpp
    odb/src/db/dbITerm.cpp
    odb/src/db/dbITermItr.cpp
    odb/src/db/dbInst.cpp
    odb/src/db/dbInstHdr.cpp
    odb/src/db/dbLib.cpp
    odb/src/db/dbMPin.cpp
    odb/src/db/dbMPinItr.cpp
    odb/src/db/dbMTerm.cpp
    odb/src/db/dbMaster.cpp
    odb/src/db/dbInsertBuffer.cpp
    odb/src/db/dbNet.cpp
    odb/src/db/dbTech.cpp
    odb/src/db/dbTechLayerSpacingRule.cpp
    odb/src/db/dbTechLayerAntennaRule.cpp
    odb/src/db/dbTechMinCutOrAreaRule.cpp
    odb/src/db/dbTechLayerItr.cpp
    odb/src/db/dbTechVia.cpp
    odb/src/db/dbTypes.cpp
    odb/src/db/dbVia.cpp
    odb/src/db/dbWire.cpp
    odb/src/db/dbWireCodec.cpp
    odb/src/db/dbTrackGrid.cpp
    odb/src/db/dbBlockage.cpp
    odb/src/db/dbObstruction.cpp
    odb/src/db/dbObject.cpp
    odb/src/db/dbInstShapeItr.cpp
    odb/src/db/dbTransform.cpp
    odb/src/db/dbITermShapeItr.cpp
    odb/src/db/dbPolygonItr.cpp
    odb/src/db/dbSWire.cpp
    odb/src/db/dbSBox.cpp
    odb/src/db/dbSWireItr.cpp
    odb/src/db/dbSBoxItr.cpp
    odb/src/db/dbSite.cpp
    odb/src/db/dbCCSeg.cpp
    odb/src/db/dbCCSegItr.cpp
    odb/src/db/dbWireShapeItr.cpp
    odb/src/db/dbWirePathItr.cpp
    odb/src/db/dbTechNonDefaultRule.cpp
    odb/src/db/dbTechLayerRule.cpp
    odb/src/db/dbCapNode.cpp
    odb/src/db/dbCapNodeItr.cpp
    odb/src/db/dbRSeg.cpp
    odb/src/db/dbRSegItr.cpp
    odb/src/db/dbTechSameNetRule.cpp
    odb/src/db/dbRow.cpp
    odb/src/db/dbFill.cpp
    odb/src/db/dbShape.cpp
    odb/src/db/dbWireGraph.cpp
    odb/src/db/dbJournal.cpp
    odb/src/db/dbJournalLog.cpp
    odb/src/db/dbBlockCallBackObj.cpp
    odb/src/db/dbChipCallBackObj.cpp
    odb/src/db/dbRegion.cpp
    odb/src/db/dbRegionInstItr.cpp
    odb/src/db/dbExtControl.cpp
    odb/src/db/dbNullIterator.cpp
    odb/src/db/dbBPin.cpp
    odb/src/db/dbHierInstShapeItr.cpp
    odb/src/db/dbHier.cpp
    odb/src/db/dbTechViaRule.cpp
    odb/src/db/dbTechViaLayerRule.cpp
    odb/src/db/dbTechViaGenerateRule.cpp
    odb/src/db/dbViaParams.cpp
    odb/src/db/dbNameCache.cpp
    odb/src/db/dbPropertyItr.cpp
    odb/src/db/geom.cpp
    odb/src/db/tmg_conn.cpp
    odb/src/db/tmg_conn_g.cpp
    odb/src/db/tmg_conn_s.cpp
    odb/src/db/tmg_conn_w.cpp
    odb/src/db/wOrder.cpp
    odb/src/db/dbDatabase.cpp
    odb/src/db/dbChip.cpp
    odb/src/db/dbGCellGrid.cpp
    odb/src/db/dbProperty.cpp
    odb/src/db/dbTechLayer.cpp
    odb/src/db/dbTechLayerSpacingEolRule.cpp
    odb/src/db/dbTechLayerWrongDirSpacingRule.cpp
    odb/src/db/dbTechLayerMinStepRule.cpp
    odb/src/db/dbTechLayerCornerSpacingRule.cpp
    odb/src/db/dbTechLayerSpacingTablePrlRule.cpp
    odb/src/db/dbTechLayerCutClassRule.cpp
    odb/src/db/dbTechLayerCutSpacingRule.cpp
    odb/src/db/dbTechLayerCutSpacingTableDefRule.cpp
    odb/src/db/dbTechLayerCutSpacingTableOrthRule.cpp
    odb/src/db/dbTechLayerCutEnclosureRule.cpp
    odb/src/db/dbTechLayerEolExtensionRule.cpp
    odb/src/db/dbTechLayerEolKeepOutRule.cpp
    odb/src/db/dbTechLayerAreaRule.cpp
    odb/src/db/dbTechLayerArraySpacingRule.cpp
    odb/src/db/dbTechLayerForbiddenSpacingRule.cpp
    odb/src/db/dbTechLayerTwoWiresForbiddenSpcRule.cpp
    odb/src/db/dbTechLayerVoltageSpacing.cpp
    odb/src/db/dbTechLayerWidthTableRule.cpp
    odb/src/db/dbTechLayerMaxSpacingRule.cpp
    odb/src/db/dbTechLayerKeepOutZoneRule.cpp
    odb/src/db/dbTechLayerMinCutRule.cpp
    odb/src/db/dbGroup.cpp
    odb/src/db/dbGroupItr.cpp
    odb/src/db/dbGroupInstItr.cpp
    odb/src/db/dbGroupGroundNetItr.cpp
    odb/src/db/dbGroupPowerNetItr.cpp
    odb/src/db/dbGroupModInstItr.cpp
    odb/src/db/dbModule.cpp
    odb/src/db/dbModInst.cpp
    odb/src/db/dbModuleInstItr.cpp
    odb/src/db/dbModuleModInstItr.cpp
    odb/src/db/dbModBTerm.cpp
    odb/src/db/dbModITerm.cpp
    odb/src/db/dbModNet.cpp
    odb/src/db/dbModuleModNetItr.cpp
    odb/src/db/dbModuleModBTermItr.cpp
    odb/src/db/dbModuleModNetBTermItr.cpp
    odb/src/db/dbModuleModNetITermItr.cpp
    odb/src/db/dbModuleModNetModBTermItr.cpp
    odb/src/db/dbModuleModNetModITermItr.cpp
    odb/src/db/dbModuleModInstModITermItr.cpp
    odb/src/db/dbModulePortItr.cpp
    odb/src/db/dbModuleBusPortModBTermItr.cpp
    odb/src/db/dbBusPort.cpp
    odb/src/db/dbLogicPort.cpp
    odb/src/db/dbAccessPoint.cpp
    odb/src/db/dbGuide.cpp
    odb/src/db/dbGuideItr.cpp
    odb/src/db/dbNetTrack.cpp
    odb/src/db/dbNetTrackItr.cpp
    odb/src/db/dbRegionGroupItr.cpp
    odb/src/db/dbScanChain.cpp
    odb/src/db/dbScanInst.cpp
    odb/src/db/dbScanList.cpp
    odb/src/db/dbScanListScanInstItr.cpp
    odb/src/db/dbScanPartition.cpp
    odb/src/db/dbScanPin.cpp
    odb/src/db/dbDft.cpp
    odb/src/db/dbMarker.cpp
    odb/src/db/dbMarkerCategory.cpp
    odb/src/db/dbGlobalConnect.cpp
    odb/src/db/dbGDSLib.cpp
    odb/src/db/dbGDSStructure.cpp
    odb/src/db/dbGDSBoundary.cpp
    odb/src/db/dbGDSBox.cpp
    odb/src/db/dbGDSPath.cpp
    odb/src/db/dbGDSText.cpp
    odb/src/db/dbGDSSRef.cpp
    odb/src/db/dbGDSARef.cpp
    odb/src/db/dbPolygon.cpp
    odb/src/db/dbIsolation.cpp
    odb/src/db/dbPowerDomain.cpp
    odb/src/db/dbPowerSwitch.cpp
    odb/src/db/dbLevelShifter.cpp
    odb/src/db/dbMasterEdgeType.cpp
    odb/src/db/dbCellEdgeSpacing.cpp
    odb/src/db/dbMetalWidthViaMap.cpp
    odb/src/db/dbChipBump.cpp
    odb/src/db/dbChipBumpInst.cpp
    odb/src/db/dbChipBumpInstItr.cpp
    odb/src/db/dbChipConn.cpp
    odb/src/db/dbChipConnItr.cpp
    odb/src/db/dbChipInst.cpp
    odb/src/db/dbChipInstItr.cpp
    odb/src/db/dbChipNet.cpp
    odb/src/db/dbChipNetItr.cpp
    odb/src/db/dbChipRegion.cpp
    odb/src/db/dbChipRegionInst.cpp
    odb/src/db/dbChipRegionInstItr.cpp
    odb/src/db/dbSwapMasterSanityChecker.cpp
)

target_include_directories(db
    PUBLIC
        odb/include
    PRIVATE
        odb/src/db
)

target_link_libraries(db
    PUBLIC  utl_lib absl::synchronization
    PRIVATE Boost::boost
    # Boost::regex removed: dbMarkerCategory.cpp now uses std::regex
)

set_target_properties(db PROPERTIES POSITION_INDEPENDENT_CODE ON)

# ─────────────────────────────────────────────────────────────────────────────
# 5.  zutil  (polygon decomposition + misc geometry utils)
# ─────────────────────────────────────────────────────────────────────────────
add_library(zutil
    odb/src/zutil/poly_decomp.cpp
    odb/src/zutil/util.cpp
)

target_include_directories(zutil
    PUBLIC  odb/include
)

target_link_libraries(zutil
    PUBLIC  db utl_lib Boost::boost
)

set_target_properties(zutil PROPERTIES POSITION_INDEPENDENT_CODE ON)

# ─────────────────────────────────────────────────────────────────────────────
# 6.  lefin  (LEF → dbLib/dbTech importer)
# ─────────────────────────────────────────────────────────────────────────────
add_library(lefin
    odb/src/lefin/lefin.cpp
    odb/src/lefin/reader.cpp
    odb/src/lefin/lefTechLayerSpacingEolParser.cpp
    odb/src/lefin/lefTechLayerWrongDirSpacingParser.cpp
    odb/src/lefin/lefTechLayerMinStepParser.cpp
    odb/src/lefin/lefTechLayerMinWidthParser.cpp
    odb/src/lefin/lefTechLayerCornerSpacingParser.cpp
    odb/src/lefin/lefTechLayerSpacingTablePrlParser.cpp
    odb/src/lefin/lefTechLayerRightWayOnGridOnlyParser.cpp
    odb/src/lefin/lefTechLayerRectOnlyParser.cpp
    odb/src/lefin/lefTechLayerCutClassParser.cpp
    odb/src/lefin/lefTechLayerCutSpacingParser.cpp
    odb/src/lefin/lefTechLayerCutSpacingTableParser.cpp
    odb/src/lefin/lefTechLayerCutEnclosureParser.cpp
    odb/src/lefin/lefTechLayerTypeParser.cpp
    odb/src/lefin/lefTechLayerEolExtensionParser.cpp
    odb/src/lefin/lefTechLayerEolKeepOutRuleParser.cpp
    odb/src/lefin/lefTechLayerAreaRuleParser.cpp
    odb/src/lefin/lefTechLayerPitchRuleParser.cpp
    odb/src/lefin/lefTechLayerForbiddenSpacingRuleParser.cpp
    odb/src/lefin/lefTechLayerTwoWiresForbiddenSpcRuleParser.cpp
    odb/src/lefin/lefTechLayerVoltageSpacing.cpp
    odb/src/lefin/lefMacroClassParser.cpp
    odb/src/lefin/lefMacroEdgeTypeParser.cpp
    odb/src/lefin/CellEdgeSpacingTableParser.cpp
    odb/src/lefin/AntennaGateParser.cpp
    odb/src/lefin/ArraySpacingParser.cpp
    odb/src/lefin/WidthTableParser.cpp
    odb/src/lefin/MinCutParser.cpp
    odb/src/lefin/MetalWidthViaMapParser.cpp
    odb/src/lefin/KeepOutZoneParser.cpp
    odb/src/lefin/MaxSpacingParser.cpp
)

target_include_directories(lefin
    PUBLIC  odb/include
    PRIVATE odb/src/lefin
)

target_link_libraries(lefin
    PUBLIC  db zutil lef lefzlib utl_lib Boost::boost
)

set_target_properties(lefin PROPERTIES POSITION_INDEPENDENT_CODE ON)

# ─────────────────────────────────────────────────────────────────────────────
# 7.  defin  (DEF → dbBlock importer)
# ─────────────────────────────────────────────────────────────────────────────
add_library(defin
    odb/src/defin/definNet.cpp
    odb/src/defin/definSNet.cpp
    odb/src/defin/definComponent.cpp
    odb/src/defin/definComponentMaskShift.cpp
    odb/src/defin/definVia.cpp
    odb/src/defin/definPin.cpp
    odb/src/defin/definBlockage.cpp
    odb/src/defin/definFill.cpp
    odb/src/defin/definTracks.cpp
    odb/src/defin/definGCell.cpp
    odb/src/defin/definRow.cpp
    odb/src/defin/definRegion.cpp
    odb/src/defin/definGroup.cpp
    odb/src/defin/definNonDefaultRule.cpp
    odb/src/defin/definReader.cpp
    odb/src/defin/definBase.cpp
    odb/src/defin/create_box.cpp
    odb/src/defin/defin.cpp
    odb/src/defin/definPolygon.cpp
    odb/src/defin/definPropDefs.cpp
    odb/src/defin/definPinProps.cpp
)

target_include_directories(defin
    PUBLIC  odb/include
    PRIVATE odb/src/defin
)

target_link_libraries(defin
    PUBLIC  db zutil def defzlib utl_lib
)

set_target_properties(defin PROPERTIES POSITION_INDEPENDENT_CODE ON)

# ─────────────────────────────────────────────────────────────────────────────
# 8.  cdl  (Circuit Description Layer — used internally by some db objects)
# ─────────────────────────────────────────────────────────────────────────────
add_library(cdl
    odb/src/cdl/cdl.cpp
)

target_include_directories(cdl
    PUBLIC  odb/include
)

target_link_libraries(cdl
    PUBLIC  db utl_lib
)

set_target_properties(cdl PROPERTIES POSITION_INDEPENDENT_CODE ON)

# ─────────────────────────────────────────────────────────────────────────────
# 9.  defout / lefout  (writers — included for completeness; not used in
#     the read-only import path but may be needed by callers doing round-trips)
# ─────────────────────────────────────────────────────────────────────────────
add_library(defout
    odb/src/defout/defout.cpp
    odb/src/defout/defout_impl.cpp
)

target_include_directories(defout
    PUBLIC  odb/include
    PRIVATE odb/src/defout
)

target_link_libraries(defout PUBLIC db utl_lib)
set_target_properties(defout PROPERTIES POSITION_INDEPENDENT_CODE ON)

add_library(lefout
    odb/src/lefout/lefout.cpp
)

target_include_directories(lefout
    PUBLIC  odb/include
)

target_link_libraries(lefout PUBLIC db utl_lib Boost::boost)
set_target_properties(lefout PROPERTIES POSITION_INDEPENDENT_CODE ON)

# ─────────────────────────────────────────────────────────────────────────────
# 10. dftodb::opendb_core — the single INTERFACE target that consumers use
# ─────────────────────────────────────────────────────────────────────────────
add_library(opendb_core INTERFACE)
add_library(dftodb::opendb_core ALIAS opendb_core)

target_link_libraries(opendb_core
    INTERFACE
        db
        defin
        lefin
        zutil
        cdl
        utl_lib
        absl::synchronization
)

target_include_directories(opendb_core
    INTERFACE
        ${CMAKE_CURRENT_SOURCE_DIR}/odb/include
        ${CMAKE_CURRENT_SOURCE_DIR}/utl/include
)
