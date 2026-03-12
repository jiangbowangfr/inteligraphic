(function (global) {
  'use strict';

  var Mod = global.DFTFlowNavMod = global.DFTFlowNavMod || {};
  var Shared = Mod.Shared;
  var Analysis = Mod.Analysis = Mod.Analysis || {};
  if (!Shared) throw new Error('flow_nav_shared.js must be loaded before flow_nav_analysis.js');

  function normalizeTypeList(list) {
    var out = [];
    if (!Array.isArray(list)) list = list == null ? [] : [list];
    for (var i = 0; i < list.length; i++) {
      var v = Shared.trim(list[i]).toLowerCase();
      if (!v || out.indexOf(v) >= 0) continue;
      out.push(v);
    }
    return out;
  }

  function getDataflowRuleConfig() {
    var cfg = Mod.dataflowRuleConfig || {};
    var pairs = Array.isArray(cfg.loopPinPairs) && cfg.loopPinPairs.length ? cfg.loopPinPairs : [
      { startTypes: ['data_out'], returnTypes: ['data_in'], label: 'data_out -> data_in' },
      { startTypes: ['data_in'], returnTypes: ['data_out'], label: 'data_in -> data_out' }
    ];
    var normalizedPairs = [];
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i] || {};
      var startTypes = normalizeTypeList(pair.startTypes);
      var returnTypes = normalizeTypeList(pair.returnTypes);
      if (!startTypes.length || !returnTypes.length) continue;
      normalizedPairs.push({
        startTypes: startTypes,
        returnTypes: returnTypes,
        label: Shared.trim(pair.label || (startTypes.join('/') + ' -> ' + returnTypes.join('/')))
      });
    }
    if (!normalizedPairs.length) normalizedPairs.push({ startTypes: ['data_out'], returnTypes: ['data_in'], label: 'data_out -> data_in' });
    return {
      endpointTolerance: Math.max(6, Number(cfg.endpointTolerance || 18)),
      moduleHitPadding: Math.max(0, Number(cfg.moduleHitPadding || 0)),
      requireSameDataSourceForLoop: cfg.requireSameDataSourceForLoop !== false,
      loopPinPairs: normalizedPairs,
      interiorEpsilon: Math.max(0.01, Number(cfg.interiorEpsilon || 0.5)),
      markerTangentGap: Math.max(8, Number(cfg.markerTangentGap || 18))
    };
  }

  function isLikelyInterface(cell, graph) {
    var txt = Shared.displayNameOfCell(graph, cell).toLowerCase();
    if (/ssn\s*host|ssn\s*slave|host|slave/.test(txt)) return true;
    if (String(Shared.getCellStyleValue(graph, cell, 'flowMarker', '0')) === '1') return true;
    var sym = Shared.getSymbolModel(cell) || {};
    var typeName = Shared.trim(Shared.getCellStyleValue(graph, cell, 'dftsIP_type', '')) || Shared.trim(sym.dftsType || '');
    return /interface/.test(typeName);
  }

  function isFloorplanModule(graph, cell) {
    if (!cell) return false;
    return String(Shared.getCellStyleValue(graph, cell, 'floorplan', '0')) === '1' &&
      String(Shared.getCellStyleValue(graph, cell, 'dftsFloorplanRect', '0')) === '1';
  }

  function isDataSourceBody(graph, cell) {
    if (!cell || !Shared.isChipBody(graph, cell)) return false;
    var category = Shared.trim(Shared.getCellStyleValue(graph, cell, 'dftsIP_category', ''));
    if (category === 'data_source') return true;
    var sym = Shared.getSymbolModel(cell) || {};
    if (Shared.trim(sym.category || '') === 'data_source') return true;
    var dftsType = Shared.trim(Shared.getCellStyleValue(graph, cell, 'dftsIP_type', '')) || Shared.trim(sym.dftsType || '');
    if (/data[_\s-]*source/i.test(dftsType)) return true;
    var defKey = Shared.trim(Shared.getCellStyleValue(graph, cell, 'dftsIP_defKey', ''));
    return /DataSource|PadSource|SSNPadSource/i.test(defKey);
  }

  function isLikelySource(cell, graph) {
    if (isDataSourceBody(graph, cell)) return true;
    return /padsource|source/.test(Shared.displayNameOfCell(graph, cell).toLowerCase());
  }

  function isLikelyBlock(cell, graph) {
    if (!cell || isLikelySource(cell, graph) || isLikelyInterface(cell, graph)) return false;
    if (isFloorplanModule(graph, cell)) return true;
    var geo = cell.geometry;
    var txt = Shared.displayNameOfCell(graph, cell);
    if (!geo || !geo.width || !geo.height) return false;
    if (geo.width < 80 || geo.height < 40) return false;
    if (!txt || !String(txt).trim()) return false;
    return true;
  }

  function isFloorplanLine(graph, edge) {
    return !!edge && !!edge.edge && String(Shared.getCellStyleValue(graph, edge, 'floorplanLine', '0')) === '1';
  }

  function hasMeaningfulPolyline(graph, edge) {
    var pts = getEdgePolyline(graph, edge);
    if (!pts.length || pts.length < 2) return false;
    var len = 0;
    for (var i = 0; i < pts.length - 1; i++) len += Shared.pointDistance(pts[i], pts[i + 1]);
    return len >= 6;
  }

  function collectBodyPins(graph, body) {
    var out = [];
    if (!graph || !body) return out;
    var model = graph.getModel();
    var sym = Shared.getSymbolModel(body) || {};
    var pinMeta = {};
    if (Array.isArray(sym.pins)) {
      for (var i = 0; i < sym.pins.length; i++) {
        var meta = sym.pins[i] || {};
        var key = Shared.trim(meta.key || meta.pinKey || meta.name || '');
        if (key) pinMeta[key] = meta;
      }
    }
    var count = model.getChildCount(body);
    for (var j = 0; j < count; j++) {
      var child = model.getChildAt(body, j);
      var isPort = !!(child && child.__dftsSymbolChild && child.__dftsSymbolKind === 'port');
      if (!isPort && !Shared.isPinCell(graph, child)) continue;
      var style = graph.getCellStyle(child);
      var key = Shared.trim(Shared.styleValue(style, 'dftsIP_pinKey', child.__dftsSymbolKey || ''));
      var meta2 = pinMeta[key] || {};
      var name = Shared.trim(meta2.name || Shared.labelOf(child) || key);
      var typeName = Shared.trim(Shared.styleValue(style, 'dftsIP_pinType', meta2.type || ''));
      var dirName = Shared.trim(Shared.styleValue(style, 'dftsIP_pin_direction', meta2.dir || ''));
      var sideName = Shared.trim(Shared.styleValue(style, 'dftsIP_pin_location', meta2.side || Shared.styleValue(style, 'dftsIP_symbolSide', '')));
      var exit = Shared.getPinExitPoint(graph, child);
      out.push({ cell: child, body: body, key: key, name: name, type: typeName, dir: dirName, side: sideName, exit: exit });
    }
    return out;
  }

  function getEdgePolyline(graph, edge) {
    var geo = graph && graph.getCellGeometry ? graph.getCellGeometry(edge) : (edge && edge.geometry);
    var points = [];
    function pushPoint(pt) {
      if (!pt) return;
      var x = Number(pt.x), y = Number(pt.y);
      if (!isFinite(x) || !isFinite(y)) return;
      var last = points.length ? points[points.length - 1] : null;
      if (last && last.x === x && last.y === y) return;
      points.push({ x: x, y: y });
    }
    if (!geo) return points;
    if (geo.sourcePoint) pushPoint(geo.sourcePoint);
    else if (edge && edge.source) pushPoint(Shared.centerOfCell(edge.source));
    if (geo.points && geo.points.length) for (var i = 0; i < geo.points.length; i++) pushPoint(geo.points[i]);
    if (geo.targetPoint) pushPoint(geo.targetPoint);
    else if (edge && edge.target) pushPoint(Shared.centerOfCell(edge.target));
    return points;
  }

  function matchPointToPins(point, pins, tolerance, graph) {
    var out = [];
    if (!point) return out;
    for (var i = 0; i < pins.length; i++) {
      var pin = pins[i];
      if (!pin.exit) continue;
      var dist = Shared.pointDistance(point, pin.exit);
      if (dist > tolerance) continue;
      out.push({
        body: pin.body,
        bodyName: Shared.displayNameOfCell(graph, pin.body) || Shared.trim(Shared.labelOf(pin.body)),
        pin: pin.cell,
        pinKey: pin.key,
        pinName: pin.name,
        pinType: Shared.trim(pin.type).toLowerCase(),
        distance: dist
      });
    }
    out.sort(function (a, b) { return a.distance - b.distance; });
    return out;
  }

  function filterMatchesByTypes(matches, types) {
    var out = [];
    types = normalizeTypeList(types);
    for (var i = 0; i < matches.length; i++) if (types.indexOf(matches[i].pinType) >= 0) out.push(matches[i]);
    return out;
  }

  function pickCompatibleEndpointPair(startMatches, returnMatches, requireSameDataSourceForLoop) {
    for (var i = 0; i < startMatches.length; i++) {
      for (var j = 0; j < returnMatches.length; j++) {
        var sm = startMatches[i], rm = returnMatches[j];
        if (!requireSameDataSourceForLoop || sm.body === rm.body) return { start: sm, back: rm };
      }
    }
    return null;
  }

  function edgeAnchorMeta(edge) {
    var styleText = edge && edge.style ? String(edge.style) : '';
    return {
      sourceBodyId: Shared.trim(Shared.styleValue(styleText, 'dftFloorplanAnchor_source_bodyId', '')),
      sourcePinKey: Shared.trim(Shared.styleValue(styleText, 'dftFloorplanAnchor_source_pinKey', '')),
      sinkBodyId: Shared.trim(Shared.styleValue(styleText, 'dftFloorplanAnchor_sink_bodyId', '')),
      sinkPinKey: Shared.trim(Shared.styleValue(styleText, 'dftFloorplanAnchor_sink_pinKey', ''))
    };
  }

  function findPinMatchByAnchor(pins, bodyId, pinKey) {
    if (!bodyId || !pinKey) return [];
    var out = [];
    pinKey = Shared.trim(pinKey);
    for (var i = 0; i < pins.length; i++) {
      var pin = pins[i];
      if (!pin || !pin.body || !pin.body.id) continue;
      if (String(pin.body.id) !== String(bodyId)) continue;
      if (Shared.trim(pin.key) !== pinKey) continue;
      out.push({
        body: pin.body,
        bodyName: Shared.displayNameOfCell(null, pin.body) || Shared.trim(Shared.labelOf(pin.body)),
        pin: pin.cell,
        pinKey: pin.key,
        pinName: pin.name,
        pinType: Shared.trim(pin.type).toLowerCase(),
        distance: 0,
        anchored: true
      });
    }
    return out;
  }

  function mergeEndpointMatches(anchorMatches, pointMatches) {
    var out = [];
    var seen = {};
    var lists = [anchorMatches || [], pointMatches || []];
    for (var i = 0; i < lists.length; i++) {
      var arr = lists[i];
      for (var j = 0; j < arr.length; j++) {
        var item = arr[j];
        var key = [item.body && item.body.id, item.pinKey, item.pinType].join('|');
        if (seen[key]) continue;
        seen[key] = true;
        out.push(item);
      }
    }
    out.sort(function (a, b) { return Number(a.distance || 0) - Number(b.distance || 0); });
    return out;
  }

  function analyzeFloorplanLine(edge, ctx, index) {
    var points = getEdgePolyline(ctx.graph, edge);
    var head = points.length ? points[0] : null;
    var tail = points.length ? points[points.length - 1] : null;
    var anchors = edgeAnchorMeta(edge);
    var endpointMatches = {
      head: mergeEndpointMatches(findPinMatchByAnchor(ctx.dataSourcePins, anchors.sourceBodyId, anchors.sourcePinKey), matchPointToPins(head, ctx.dataSourcePins, ctx.config.endpointTolerance, ctx.graph)),
      tail: mergeEndpointMatches(findPinMatchByAnchor(ctx.dataSourcePins, anchors.sinkBodyId, anchors.sinkPinKey), matchPointToPins(tail, ctx.dataSourcePins, ctx.config.endpointTolerance, ctx.graph))
    };
    if (!endpointMatches.tail.length && anchors.sourceBodyId && anchors.sourcePinKey) {
      endpointMatches.tail = matchPointToPins(tail, ctx.dataSourcePins, Math.max(ctx.config.endpointTolerance, 32), ctx.graph);
    }
    if (!endpointMatches.head.length && anchors.sinkBodyId && anchors.sinkPinKey) {
      endpointMatches.head = matchPointToPins(head, ctx.dataSourcePins, Math.max(ctx.config.endpointTolerance, 32), ctx.graph);
    }
    var loopMatch = null;
    for (var i = 0; i < ctx.config.loopPinPairs.length; i++) {
      var pair = ctx.config.loopPinPairs[i];
      var headStart = filterMatchesByTypes(endpointMatches.head, pair.startTypes);
      var tailReturn = filterMatchesByTypes(endpointMatches.tail, pair.returnTypes);
      var direct = pickCompatibleEndpointPair(headStart, tailReturn, ctx.config.requireSameDataSourceForLoop);
      if (direct) {
        loopMatch = { pair: pair, orientation: 'head-start-tail-return', start: direct.start, back: direct.back };
        break;
      }
      var tailStart = filterMatchesByTypes(endpointMatches.tail, pair.startTypes);
      var headReturn = filterMatchesByTypes(endpointMatches.head, pair.returnTypes);
      var reverse = pickCompatibleEndpointPair(tailStart, headReturn, ctx.config.requireSameDataSourceForLoop);
      if (reverse) {
        loopMatch = { pair: pair, orientation: 'tail-start-head-return', start: reverse.start, back: reverse.back };
        break;
      }
    }
    var allStartTypes = [];
    var allReturnTypes = [];
    for (var p = 0; p < ctx.config.loopPinPairs.length; p++) {
      var cfg = ctx.config.loopPinPairs[p];
      for (var s = 0; s < cfg.startTypes.length; s++) if (allStartTypes.indexOf(cfg.startTypes[s]) < 0) allStartTypes.push(cfg.startTypes[s]);
      for (var r = 0; r < cfg.returnTypes.length; r++) if (allReturnTypes.indexOf(cfg.returnTypes[r]) < 0) allReturnTypes.push(cfg.returnTypes[r]);
    }
    var touchesStartPin = !!(filterMatchesByTypes(endpointMatches.head, allStartTypes).length || filterMatchesByTypes(endpointMatches.tail, allStartTypes).length);
    var touchesReturnPin = !!(filterMatchesByTypes(endpointMatches.head, allReturnTypes).length || filterMatchesByTypes(endpointMatches.tail, allReturnTypes).length);
    return {
      edge: edge,
      index: index,
      points: points,
      endpointMatches: endpointMatches,
      touchesDataSource: !!(endpointMatches.head.length || endpointMatches.tail.length),
      touchesStartPin: touchesStartPin,
      touchesReturnPin: touchesReturnPin,
      validLoop: !!loopMatch,
      loopMatch: loopMatch
    };
  }

  function pathLength(points) {
    var out = 0;
    for (var i = 0; i < points.length - 1; i++) out += Shared.pointDistance(points[i], points[i + 1]);
    return out;
  }

  function pointAtT(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function computeRectSideOffset(rect, side, point) {
    if (side === 'left' || side === 'right') return rect.height ? (point.y - rect.top) / rect.height : 0.5;
    return rect.width ? (point.x - rect.left) / rect.width : 0.5;
  }

  function sideToOrientation(side) {
    if (side === 'left') return 'west';
    if (side === 'right') return 'east';
    if (side === 'top') return 'north';
    return 'south';
  }

  function intersectSegmentWithRectSides(a, b, rect) {
    var out = [];
    var dx = b.x - a.x, dy = b.y - a.y;
    function add(side, t, x, y) {
      if (!isFinite(t) || t < 0 || t > 1) return;
      for (var i = 0; i < out.length; i++) {
        if (Math.abs(out[i].point.x - x) < 0.001 && Math.abs(out[i].point.y - y) < 0.001) {
          if ((side === 'left' || side === 'right') && (out[i].side === 'top' || out[i].side === 'bottom')) out[i].side = side;
          return;
        }
      }
      out.push({ side: side, t: t, point: { x: x, y: y } });
    }
    if (Math.abs(dx) > 1e-9) {
      var tLeft = (rect.left - a.x) / dx;
      var yLeft = a.y + dy * tLeft;
      if (yLeft >= rect.top - 1e-6 && yLeft <= rect.bottom + 1e-6) add('left', tLeft, rect.left, yLeft);
      var tRight = (rect.right - a.x) / dx;
      var yRight = a.y + dy * tRight;
      if (yRight >= rect.top - 1e-6 && yRight <= rect.bottom + 1e-6) add('right', tRight, rect.right, yRight);
    }
    if (Math.abs(dy) > 1e-9) {
      var tTop = (rect.top - a.y) / dy;
      var xTop = a.x + dx * tTop;
      if (xTop >= rect.left - 1e-6 && xTop <= rect.right + 1e-6) add('top', tTop, xTop, rect.top);
      var tBottom = (rect.bottom - a.y) / dy;
      var xBottom = a.x + dx * tBottom;
      if (xBottom >= rect.left - 1e-6 && xBottom <= rect.right + 1e-6) add('bottom', tBottom, xBottom, rect.bottom);
    }
    out.sort(function (x, y) { return x.t - y.t; });
    return out;
  }

  function collectBoundaryEvents(points, modules, config) {
    function rectContainsRect(outer, inner, tol) {
      tol = Number(tol || 0);
      if (!outer || !inner) return false;
      return inner.left >= outer.left - tol &&
        inner.right <= outer.right + tol &&
        inner.top >= outer.top - tol &&
        inner.bottom <= outer.bottom + tol;
    }
    function pointInOrOnRect(pt, rect, tol) {
      tol = Number(tol || 0);
      if (!pt || !rect) return false;
      return pt.x >= rect.left - tol && pt.x <= rect.right + tol &&
        pt.y >= rect.top - tol && pt.y <= rect.bottom + tol;
    }
    var moduleInfo = [];
    for (var mi = 0; mi < modules.length; mi++) {
      var mRect = Shared.rectOfCell(modules[mi]);
      if (!mRect) continue;
      moduleInfo.push({ cell: modules[mi], rect: mRect, children: [] });
    }
    for (mi = 0; mi < moduleInfo.length; mi++) {
      for (var mj = 0; mj < moduleInfo.length; mj++) {
        if (mi === mj) continue;
        var a = moduleInfo[mi], b = moduleInfo[mj];
        var aArea = Math.max(0, Number(a.rect.width || 0)) * Math.max(0, Number(a.rect.height || 0));
        var bArea = Math.max(0, Number(b.rect.width || 0)) * Math.max(0, Number(b.rect.height || 0));
        if (!(bArea < aArea)) continue;
        if (rectContainsRect(a.rect, b.rect, 1.2)) a.children.push(b);
      }
    }

    var events = [];
    var pathCursor = 0;
    for (var i = 0; i < points.length - 1; i++) {
      var a = points[i], b = points[i + 1];
      var segLen = Shared.pointDistance(a, b);
      if (!segLen) continue;
      for (var m = 0; m < moduleInfo.length; m++) {
        var info = moduleInfo[m];
        var moduleCell = info.cell;
        var rect = info.rect;
        var hits = intersectSegmentWithRectSides(a, b, rect);
        for (var h = 0; h < hits.length; h++) {
          var hit = hits[h];
          var coveredByChild = false;
          var infoArea = Math.max(0, Number(info.rect.width || 0)) * Math.max(0, Number(info.rect.height || 0));
          for (var c = 0; c < moduleInfo.length; c++) {
            var childInfo = moduleInfo[c];
            if (childInfo === info) continue;
            var childArea = Math.max(0, Number(childInfo.rect.width || 0)) * Math.max(0, Number(childInfo.rect.height || 0));
            if (!(childArea < infoArea)) continue;
            if (pointInOrOnRect(hit.point, childInfo.rect, 1.2)) { coveredByChild = true; break; }
          }
          if (coveredByChild) continue;
          var stepT = Math.max(0.002, Math.min(0.05, (Math.max(1, Number(config.interiorEpsilon || 0)) + 1) / segLen));
          var before = pointAtT(a, b, Math.max(0, hit.t - stepT));
          var after = pointAtT(a, b, Math.min(1, hit.t + stepT));
          var insideBefore = Shared.pointInRectInterior(before, rect, config.interiorEpsilon);
          var insideAfter = Shared.pointInRectInterior(after, rect, config.interiorEpsilon);
          if (insideBefore === insideAfter) continue;
          events.push({
            moduleCell: moduleCell,
            moduleName: Shared.displayNameOfCell(null, moduleCell) || Shared.labelOf(moduleCell) || ('MODULE_' + (m + 1)),
            rect: rect,
            point: hit.point,
            side: hit.side,
            offset: Math.max(0, Math.min(1, computeRectSideOffset(rect, hit.side, hit.point))),
            orientation: sideToOrientation(hit.side),
            segmentIndex: i,
            pathDistance: pathCursor + segLen * hit.t,
            role: insideBefore && !insideAfter ? 'slave' : 'host'
          });
        }
      }
      pathCursor += segLen;
    }
    events.sort(function (aEvt, bEvt) { return aEvt.pathDistance - bEvt.pathDistance; });
    return events;
  }

  function orderedPointsForLine(line) {
    if (!line || !line.validLoop || !line.loopMatch) return line && line.points ? line.points.slice() : [];
    if (line.loopMatch.orientation === 'head-start-tail-return') return line.points.slice();
    return line.points.slice().reverse();
  }

  function findContainingModule(cell, modules) {
    var center = Shared.centerOfCell(cell);
    if (!center) return null;
    var best = null;
    var bestArea = Infinity;
    for (var i = 0; i < modules.length; i++) {
      var rect = Shared.rectOfCell(modules[i]);
      if (!rect || !Shared.pointInRectInterior(center, rect, 0.01)) continue;
      var area = Math.max(0, Number(rect.width || 0)) * Math.max(0, Number(rect.height || 0));
      if (!best || area < bestArea) {
        best = modules[i];
        bestArea = area;
      }
    }
    return best;
  }

  function axisValueForSide(point, side) {
    return (side === 'left' || side === 'right') ? Number(point && point.y || 0) : Number(point && point.x || 0);
  }

  function midpoint(a, b) {
    return { x: (Number(a.x || 0) + Number(b.x || 0)) / 2, y: (Number(a.y || 0) + Number(b.y || 0)) / 2 };
  }


  function makeMarkerFromEvent(evt, chainIndex, markerIndex, line, sourceModuleName) {
    return {
      id: 'marker_' + chainIndex + '_' + markerIndex,
      chainId: 'ssn_chain_' + chainIndex,
      order: markerIndex,
      role: evt.role,
      moduleName: evt.moduleName,
      moduleCell: evt.moduleCell,
      moduleId: evt.moduleCell && evt.moduleCell.id,
      point: evt.point,
      side: evt.side,
      rawOffset: evt.offset,
      offset: evt.offset,
      orientation: evt.orientation,
      anchorX: evt.point.x,
      anchorY: evt.point.y,
      label: evt.role === 'host' ? 'SSN Host' : 'SSN Slave',
      sourceInstance: line.loopMatch && line.loopMatch.start ? line.loopMatch.start.bodyName : '',
      clockSignal: 'ssn_bus_clock',
      dataInSignal: 'ssn_data_in',
      dataOutSignal: 'ssn_data_out',
      channelIndex: chainIndex,
      busWidthIn: null,
      busWidthOut: null,
      sourceModule: sourceModuleName,
      peerMarkerId: '',
      pairId: ''
    };
  }

  function buildPairsForChain(events, chainIndex, line, sourceModuleName, issues) {
    var markers = [];
    var pairs = [];
    var markerCounter = 0;
    var pendingSlave = null;

    function emitPair(firstEvt, secondEvt) {
      var pairId = 'pair_' + chainIndex + '_' + pairs.length;
      var firstMarker = makeMarkerFromEvent(firstEvt, chainIndex, markerCounter++, line, sourceModuleName);
      var secondMarker = makeMarkerFromEvent(secondEvt, chainIndex, markerCounter++, line, sourceModuleName);
      firstMarker.pairId = pairId;
      secondMarker.pairId = pairId;
      firstMarker.peerMarkerId = secondMarker.id;
      secondMarker.peerMarkerId = firstMarker.id;
      firstMarker.peerModule = secondMarker.moduleName;
      secondMarker.peerModule = firstMarker.moduleName;
      firstMarker.peerRole = secondMarker.role;
      secondMarker.peerRole = firstMarker.role;
      markers.push(firstMarker, secondMarker);
      pairs.push({
        id: pairId,
        chainId: firstMarker.chainId,
        kind: firstMarker.role + '-' + secondMarker.role,
        a: firstMarker.id,
        b: secondMarker.id,
        endpoints: [
          { markerId: firstMarker.id, moduleName: firstMarker.moduleName, moduleId: firstMarker.moduleId, side: firstMarker.side, role: firstMarker.role },
          { markerId: secondMarker.id, moduleName: secondMarker.moduleName, moduleId: secondMarker.moduleId, side: secondMarker.side, role: secondMarker.role }
        ]
      });
    }

    for (var i = 0; i < events.length; i++) {
      var evt = events[i];
      if (evt.role === 'slave') {
        if (pendingSlave) {
          emitPair(pendingSlave, evt);
          pendingSlave = null;
        } else {
          pendingSlave = evt;
        }
        continue;
      }
      if (evt.role === 'host') {
        if (pendingSlave) {
          emitPair(pendingSlave, evt);
          pendingSlave = null;
        } else {
          issues.push({ level: 'error', text: 'SSN chain #' + (chainIndex + 1) + ' encounters a host boundary event without an upstream slave.', ruleKey: 'pairing', moduleId: evt.moduleCell && evt.moduleCell.id });
        }
      }
    }

    if (pendingSlave) {
      issues.push({ level: 'error', text: 'SSN chain #' + (chainIndex + 1) + ' ends with an unmatched slave endpoint.', ruleKey: 'pairing', moduleId: pendingSlave.moduleCell && pendingSlave.moduleCell.id });
    }

    return { markers: markers, pairs: pairs };
  }

  function sameModuleCell(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.id != null && b.id != null) return String(a.id) === String(b.id);
    return false;
  }

  function normalizeBoundaryRoles(events, sourceModule, issues, chainIndex) {
    var firstSeen = {};
    for (var i = 0; i < events.length; i++) {
      var evt = events[i];
      var moduleKey = String((evt.moduleCell && evt.moduleCell.id) || evt.moduleName || '');
      if (!moduleKey) continue;

      // Data source owner module always emits internal slave at boundary.
      if (sourceModule && sameModuleCell(evt.moduleCell, sourceModule)) {
        if (evt.role !== 'slave') {
          evt.role = 'slave';
          evt.rolePolicy = 'source-module-forced-slave';
        }
        continue;
      }

      if (!firstSeen[moduleKey]) {
        if (evt.role !== 'host') {
          evt.role = 'host';
          evt.rolePolicy = 'first-boundary-forced-host';
        }
        firstSeen[moduleKey] = true;
      } else {
        if (evt.role !== 'slave') {
          evt.role = 'slave';
          evt.rolePolicy = 'non-first-forced-slave';
        }
      }
    }
  }

  function chooseNearestSlave(host, slaves) {
    if (!slaves.length) return -1;
    var best = 0;
    var bestDist = Math.abs(Number(host.offset || 0) - Number(slaves[0].offset || 0));
    for (var i = 1; i < slaves.length; i++) {
      var dist = Math.abs(Number(host.offset || 0) - Number(slaves[i].offset || 0));
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    return best;
  }

  function buildBundleFromMembers(bundleId, chainId, moduleName, moduleCell, moduleId, side, members) {
    members.sort(function (a, b) { return Number(a.offset || 0) - Number(b.offset || 0) || Number(a.order || 0) - Number(b.order || 0); });
    var centerPoint = midpoint(members[0].point, members[1].point);
    var span = Math.abs(axisValueForSide(members[0].point, side) - axisValueForSide(members[1].point, side));
    var centerOffset = (Number(members[0].offset || 0) + Number(members[1].offset || 0)) / 2;
    var orientation = (side === 'left' || side === 'right') ? 'vertical' : 'horizontal';
    var sameRolePair = members.length === 2 && String(members[0].role || '') === String(members[1].role || '');
    for (var i = 0; i < members.length; i++) {
      members[i].bundleId = bundleId;
      members[i].bundleCenterOffset = centerOffset;
      members[i].bundleCenterX = centerPoint.x;
      members[i].bundleCenterY = centerPoint.y;
      members[i].bundleSpan = span;
      members[i].layoutMode = 'side_bundle';
      // Keep same-role bundles on the same normal-axis rule as host-slave:
      // left/right -> left-right, top/bottom -> up-down.
      members[i].layoutSlot = sameRolePair ? (i === 0 ? 'inner' : 'outer') : (members[i].role === 'host' ? 'inner' : 'outer');
      members[i].anchorX = centerPoint.x;
      members[i].anchorY = centerPoint.y;
      members[i].offset = centerOffset;
      members[i].orientation = orientation;
    }
    return {
      id: bundleId,
      chainId: chainId,
      moduleName: moduleName,
      moduleCell: moduleCell,
      moduleId: moduleId,
      side: side,
      orientation: orientation,
      center: centerPoint,
      centerOffset: centerOffset,
      span: span,
      markerIds: members.map(function (m) { return m.id; }),
      roles: members.map(function (m) { return m.role; })
    };
  }

  function buildSideBundlesForChain(markers, chainId, chainIndex, issues) {
    var grouped = {};
    var bundles = [];
    var bundleCounter = 0;
    for (var i = 0; i < markers.length; i++) {
      var marker = markers[i];
      var groupKey = [chainId, marker.moduleId || marker.moduleName, marker.side].join('|');
      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(marker);
    }
    Object.keys(grouped).forEach(function (groupKey) {
      var items = grouped[groupKey].slice();
      if (!items.length) return;
      items.sort(function (a, b) { return Number(a.offset || 0) - Number(b.offset || 0) || Number(a.order || 0) - Number(b.order || 0); });
      var moduleName = items[0].moduleName;
      var moduleCell = items[0].moduleCell;
      var moduleId = items[0].moduleId;
      var side = items[0].side;
      var hosts = [];
      var slaves = [];
      var locals = [];
      var used = {};
      var byPair = {};

      for (var i = 0; i < items.length; i++) {
        var pid = String(items[i].pairId || '');
        if (!pid) continue;
        if (!byPair[pid]) byPair[pid] = [];
        byPair[pid].push(items[i]);
      }

      // Priority: keep original chain pairing on the same side/module.
      Object.keys(byPair).forEach(function (pid) {
        var arr = byPair[pid];
        if (arr.length !== 2) return;
        locals.push([arr[0], arr[1]]);
        used[arr[0].id] = true;
        used[arr[1].id] = true;
      });

      for (i = 0; i < items.length; i++) {
        if (used[items[i].id]) continue;
        if (items[i].role === 'host') hosts.push(items[i]);
        else if (items[i].role === 'slave') slaves.push(items[i]);
      }

      while (hosts.length && slaves.length) {
        var host = hosts.shift();
        var slaveIndex = chooseNearestSlave(host, slaves);
        var slave = slaves.splice(slaveIndex, 1)[0];
        locals.push([host, slave]);
      }
      while (slaves.length >= 2) {
        locals.push([slaves.shift(), slaves.shift()]);
      }

      for (var pIndex = 0; pIndex < locals.length; pIndex++) {
        bundles.push(buildBundleFromMembers('bundle_' + chainIndex + '_' + (bundleCounter++), chainId, moduleName, moduleCell, moduleId, side, locals[pIndex]));
      }
      if (hosts.length) {
        for (var h = 0; h < hosts.length; h++) issues.push({ level: 'error', text: 'Module "' + moduleName + '" side "' + side + '" leaves an unmatched SSN host marker; host-host or single-host bundles are not allowed.', ruleKey: 'side-bundle', moduleId: moduleId });
      }
      if (slaves.length) {
        for (var s = 0; s < slaves.length; s++) issues.push({ level: 'error', text: 'Module "' + moduleName + '" side "' + side + '" leaves an unmatched SSN slave marker; single-slave bundles are not allowed.', ruleKey: 'side-bundle', moduleId: moduleId });
      }
    });
    return bundles;
  }

  function buildChainPlan(ctx, line, chainIndex) {
    var issues = [];
    var orientedPoints = orderedPointsForLine(line);
    var sourceBody = line.loopMatch ? line.loopMatch.start.body : null;
    var sourceModule = sourceBody ? findContainingModule(sourceBody, ctx.modules) : null;
    var events = collectBoundaryEvents(orientedPoints, ctx.modules, ctx.config);
    if (!sourceModule && events.length) sourceModule = events[0].moduleCell || null;
    if (sourceModule && events.length) {
      var firstSourceEvent = null;
      for (var e = 0; e < events.length; e++) {
        if (sameModuleCell(events[e].moduleCell, sourceModule)) {
          firstSourceEvent = events[e];
          break;
        }
      }
      // Keep chain direction consistent with datasource outbound behavior.
      if (firstSourceEvent && firstSourceEvent.role !== 'slave') {
        orientedPoints = orientedPoints.slice().reverse();
        events = collectBoundaryEvents(orientedPoints, ctx.modules, ctx.config);
      }
    }
    // Path-first fallback: source owner follows the first boundary module on chain.
    if (events.length) sourceModule = events[0].moduleCell || sourceModule;
    var sourceModuleName = sourceModule ? Shared.displayNameOfCell(ctx.graph, sourceModule) : '';
    normalizeBoundaryRoles(events, sourceModule, issues, chainIndex);
    if (!events.length) {
      issues.push({ level: 'error', text: 'No module boundary crossings detected for SSN chain #' + (chainIndex + 1) + '.', ruleKey: 'chain-plan' });
    }
    var built = buildPairsForChain(events, chainIndex, line, sourceModuleName, issues);
    var markers = built.markers;
    var pairs = built.pairs;
    for (var i = 0; i < pairs.length; i++) {
      var kind = pairs[i].kind;
      if (kind !== 'slave-host' && kind !== 'slave-slave') {
        issues.push({ level: 'error', text: 'Pair #' + (i + 1) + ' of SSN chain #' + (chainIndex + 1) + ' resolves to an invalid role combination "' + kind + '".', ruleKey: 'pair-kind' });
      }
    }
    var bundles = buildSideBundlesForChain(markers, 'ssn_chain_' + chainIndex, chainIndex, issues);
    if (!bundles.length && markers.length) {
      issues.push({ level: 'error', text: 'No valid same-side SSN bundle could be formed for chain #' + (chainIndex + 1) + '.', ruleKey: 'side-bundle' });
    }
    return {
      id: 'ssn_chain_' + chainIndex,
      lineIndex: line.index,
      sourceBody: sourceBody,
      sourceModule: sourceModule,
      sourceModuleName: sourceModuleName,
      points: orientedPoints,
      events: events,
      markers: markers,
      bundles: bundles,
      pairs: pairs,
      issues: issues,
      length: pathLength(orientedPoints)
    };
  }

  function buildInterfacePlan(ctx) {
    var validLines = [];
    for (var i = 0; i < ctx.lineAnalyses.length; i++) if (ctx.lineAnalyses[i].validLoop) validLines.push(ctx.lineAnalyses[i]);
    var issues = [];
    var chains = [];
    var markers = [];
    var bundles = [];
    var pairs = [];
    for (var c = 0; c < validLines.length; c++) {
      var plan = buildChainPlan(ctx, validLines[c], c);
      chains.push(plan);
      for (var p = 0; p < plan.issues.length; p++) issues.push(plan.issues[p]);
      for (var m = 0; m < plan.markers.length; m++) markers.push(plan.markers[m]);
      for (var b = 0; b < plan.bundles.length; b++) bundles.push(plan.bundles[b]);
      for (var q = 0; q < plan.pairs.length; q++) pairs.push(plan.pairs[q]);
    }
    var modulePlans = {};
    for (var j = 0; j < ctx.modules.length; j++) {
      var moduleCell = ctx.modules[j];
      var moduleName = Shared.displayNameOfCell(ctx.graph, moduleCell) || ('MODULE_' + (j + 1));
      modulePlans[moduleName] = {
        moduleName: moduleName,
        moduleCell: moduleCell,
        moduleId: moduleCell && moduleCell.id,
        rect: Shared.rectOfCell(moduleCell),
        markers: [],
        bundles: [],
        sources: []
      };
    }
    for (j = 0; j < markers.length; j++) {
      if (modulePlans[markers[j].moduleName]) modulePlans[markers[j].moduleName].markers.push(markers[j]);
    }
    for (j = 0; j < bundles.length; j++) {
      if (modulePlans[bundles[j].moduleName]) modulePlans[bundles[j].moduleName].bundles.push(bundles[j]);
    }
    for (j = 0; j < ctx.dataSources.length; j++) {
      var body = ctx.dataSources[j];
      var container = findContainingModule(body, ctx.modules);
      if (!container) continue;
      var ownerName = Shared.displayNameOfCell(ctx.graph, container);
      if (modulePlans[ownerName]) {
        modulePlans[ownerName].sources.push({
          body: body,
          name: Shared.displayNameOfCell(ctx.graph, body) || Shared.labelOf(body),
          center: Shared.centerOfCell(body),
          symbol: Shared.getSymbolModel(body),
          rect: Shared.rectOfCell(body)
        });
      }
    }
    return { chains: chains, markers: markers, bundles: bundles, pairs: pairs, modulePlans: modulePlans, issues: issues };
  }

  function buildDataflowContext(ui) {

    var graph = Shared.graphOf(ui);
    var vertices = Shared.getChildVertices(ui);
    var edges = Shared.getChildEdges(ui);
    var modules = [];
    var dataSources = [];
    var interfaces = [];
    var floorplanLines = [];
    var i;
    for (i = 0; i < vertices.length; i++) {
      var cell = vertices[i];
      if (isDataSourceBody(graph, cell)) dataSources.push(cell);
      else if (isLikelyInterface(cell, graph)) interfaces.push(cell);
      else if (isLikelyBlock(cell, graph)) modules.push(cell);
    }
    for (i = 0; i < edges.length; i++) {
      if (isFloorplanLine(graph, edges[i]) && hasMeaningfulPolyline(graph, edges[i])) floorplanLines.push(edges[i]);
    }
    var dataSourcePins = [];
    for (i = 0; i < dataSources.length; i++) {
      var pins = collectBodyPins(graph, dataSources[i]);
      for (var p = 0; p < pins.length; p++) dataSourcePins.push(pins[p]);
    }
    var ctx = {
      ui: ui,
      graph: graph,
      vertices: vertices,
      edges: edges,
      modules: modules,
      dataSources: dataSources,
      interfaces: interfaces,
      floorplanLines: floorplanLines,
      dataSourcePins: dataSourcePins,
      config: getDataflowRuleConfig()
    };
    ctx.lineAnalyses = [];
    for (i = 0; i < floorplanLines.length; i++) ctx.lineAnalyses.push(analyzeFloorplanLine(floorplanLines[i], ctx, i));
    ctx.moduleCoverage = [];
    for (i = 0; i < modules.length; i++) {
      var moduleCell = modules[i];
      var rect = Shared.rectOfCell(moduleCell);
      var visited = false;
      for (var l = 0; l < ctx.lineAnalyses.length; l++) {
        var pts = orderedPointsForLine(ctx.lineAnalyses[l]);
        for (var k = 0; k < pts.length; k++) {
          if (Shared.pointInRect(pts[k], Shared.expandRect(rect, ctx.config.moduleHitPadding), 0)) { visited = true; break; }
        }
        if (!visited) {
          for (k = 0; k < pts.length - 1; k++) {
            var events = intersectSegmentWithRectSides(pts[k], pts[k + 1], rect);
            if (events.length) { visited = true; break; }
          }
        }
        if (visited) break;
      }
      ctx.moduleCoverage.push({ module: moduleCell, name: Shared.displayNameOfCell(graph, moduleCell) || ('MODULE_' + (i + 1)), visited: visited });
    }
    ctx.interfacePlan = buildInterfacePlan(ctx);
    return ctx;
  }

  function runRules(ctx) {
    var issues = [];
    function issue(level, textValue, meta) {
      var item = { level: level || 'warning', text: textValue };
      if (meta) for (var k in meta) if (Object.prototype.hasOwnProperty.call(meta, k)) item[k] = meta[k];
      issues.push(item);
    }
    if (!ctx.modules.length) issue('warning', 'No floorplan modules detected on the current page.', { ruleKey: 'modules-present' });
    if (!ctx.dataSources.length) issue('error', 'No data source detected on the current floorplan page.', { ruleKey: 'datasource-present' });
    if (!ctx.floorplanLines.length) issue('warning', 'No floorplan lines detected on the current page.', { ruleKey: 'floorplan-lines-present' });
    var validLoops = 0;
    for (var i = 0; i < ctx.lineAnalyses.length; i++) {
      var line = ctx.lineAnalyses[i];
      var lineName = 'Floorplan line #' + (line.index + 1);
      if (line.validLoop) { validLoops++; continue; }
      if (!line.touchesDataSource) {
        issue('warning', lineName + ' is not attached to a data source endpoint.', { ruleKey: 'datasource-loop', edgeId: line.edge && line.edge.id });
      } else {
        issue('error', lineName + ' touches data source endpoints but does not form a valid data source out->in loop.', { ruleKey: 'datasource-loop', edgeId: line.edge && line.edge.id });
      }
    }
    if (ctx.floorplanLines.length && !validLoops) issue('error', 'No floorplan line forms a complete data source in/out loop.', { ruleKey: 'datasource-loop' });
    for (i = 0; i < ctx.moduleCoverage.length; i++) {
      if (!ctx.moduleCoverage[i].visited) issue('warning', 'Module "' + ctx.moduleCoverage[i].name + '" is not covered by any floorplan dataflow line.', { ruleKey: 'module-coverage', moduleId: ctx.moduleCoverage[i].module && ctx.moduleCoverage[i].module.id });
    }
    for (i = 0; i < ctx.interfacePlan.issues.length; i++) issues.push(ctx.interfacePlan.issues[i]);
    return issues;
  }

  Analysis.buildDataflowContext = buildDataflowContext;
  Analysis.analyzeDataflow = function analyzeDataflow(ui) {
    var ctx = buildDataflowContext(ui);
    var issues = runRules(ctx);
    var warningCount = 0, errorCount = 0;
    for (var i = 0; i < issues.length; i++) {
      if (issues[i].level === 'error') errorCount++;
      else warningCount++;
    }
    return {
      modules: ctx.modules,
      blocks: ctx.modules,
      sources: ctx.dataSources,
      dataSources: ctx.dataSources,
      interfaces: ctx.interfaces,
      edges: ctx.floorplanLines,
      floorplanLines: ctx.floorplanLines,
      dataSourcePins: ctx.dataSourcePins,
      lineAnalyses: ctx.lineAnalyses,
      moduleCoverage: ctx.moduleCoverage,
      interfacePlan: ctx.interfacePlan,
      config: ctx.config,
      issues: issues,
      warningCount: warningCount,
      errorCount: errorCount,
      ok: issues.length === 0,
      pass: errorCount === 0
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
