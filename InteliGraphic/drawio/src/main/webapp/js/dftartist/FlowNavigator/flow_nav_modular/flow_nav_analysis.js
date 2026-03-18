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
    var layerRules = cfg.layerRules || {};
    function normalizeRule(name, fallback) {
      var rule = layerRules[name] || {};
      var allowedKinds = normalizeTypeList(rule.allowedKinds && rule.allowedKinds.length ? rule.allowedKinds : fallback.allowedKinds);
      return {
        name: name,
        allowedKinds: allowedKinds.length ? allowedKinds : fallback.allowedKinds,
        minSources: Math.max(0, Number(rule.minSources == null ? fallback.minSources : rule.minSources)),
        maxSources: Math.max(0, Number(rule.maxSources == null ? fallback.maxSources : rule.maxSources)),
        requireSameSource: rule.requireSameSource == null ? !!fallback.requireSameSource : !!rule.requireSameSource
      };
    }
    var normalizedLayerRules = {
      ssn: normalizeRule('ssn', { allowedKinds: ['padsource'], minSources: 1, maxSources: 2, requireSameSource: false }),
      bscan: normalizeRule('bscan', { allowedKinds: ['tap'], minSources: 1, maxSources: 1, requireSameSource: true }),
      ijtag: normalizeRule('ijtag', { allowedKinds: ['tap'], minSources: 1, maxSources: 1, requireSameSource: true }),
      bisr: normalizeRule('bisr', { allowedKinds: ['bisrcsource'], minSources: 1, maxSources: 1, requireSameSource: true })
    };
    return {
      endpointTolerance: Math.max(6, Number(cfg.endpointTolerance || 18)),
      moduleHitPadding: Math.max(0, Number(cfg.moduleHitPadding || 0)),
      interiorEpsilon: Math.max(0.01, Number(cfg.interiorEpsilon || 0.5)),
      markerTangentGap: Math.max(8, Number(cfg.markerTangentGap || 18)),
      layerRules: normalizedLayerRules
    };
  }

  function normalizeLayerName(name) {
    return Shared.trim(name).toLowerCase();
  }

  function getLayerRule(ctx, layerName) {
    layerName = normalizeLayerName(layerName);
    return (ctx && ctx.config && ctx.config.layerRules && ctx.config.layerRules[layerName]) || null;
  }

  function dataSourceKindLabel(kind) {
    if (kind === 'padsource') return 'PadSource';
    if (kind === 'tap') return 'TapSource';
    if (kind === 'bisrcsource') return 'BISRCSource';
    return 'UnknownSource';
  }

  function detectDataSourceKind(graph, cell) {
    if (!cell) return 'unknown';
    var sym = Shared.getSymbolModel(cell) || {};
    var typeName = Shared.trim(Shared.getCellStyleValue(graph, cell, 'dftsIP_type', '')) || Shared.trim(sym.dftsType || '');
    var defKey = Shared.trim(Shared.getCellStyleValue(graph, cell, 'dftsIP_defKey', ''));
    var title = Shared.trim(sym.title || Shared.displayNameOfCell(graph, cell) || Shared.labelOf(cell));
    var hint = (typeName + '|' + defKey + '|' + title).toLowerCase();
    if (/padsource|ssnpadsource/.test(hint)) return 'padsource';
    if (/tapsource|\btap\b/.test(hint)) return 'tap';
    if (/bisrcsource|bisrsource|bisrc/.test(hint)) return 'bisrcsource';
    return 'unknown';
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

  function describeDataSource(graph, cell, layerName) {
    return {
      cell: cell,
      layerName: normalizeLayerName(layerName),
      kind: detectDataSourceKind(graph, cell),
      name: Shared.displayNameOfCell(graph, cell) || Shared.labelOf(cell) || ('DATASOURCE_' + String(cell && cell.id || ''))
    };
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

  function edgeAnchorMeta(edge) {
    var styleText = edge && edge.style ? String(edge.style) : '';
    return {
      sourceBodyId: Shared.trim(Shared.styleValue(styleText, 'dftFloorplanAnchor_source_bodyId', '')),
      sinkBodyId: Shared.trim(Shared.styleValue(styleText, 'dftFloorplanAnchor_sink_bodyId', '')),
      sourcePinKey: Shared.trim(Shared.styleValue(styleText, 'dftFloorplanAnchor_source_pinKey', '')),
      sinkPinKey: Shared.trim(Shared.styleValue(styleText, 'dftFloorplanAnchor_sink_pinKey', ''))
    };
  }

  function pointDistanceToRect(point, rect) {
    if (!point || !rect) return Infinity;
    var dx = 0;
    if (point.x < rect.left) dx = rect.left - point.x;
    else if (point.x > rect.right) dx = point.x - rect.right;
    var dy = 0;
    if (point.y < rect.top) dy = rect.top - point.y;
    else if (point.y > rect.bottom) dy = point.y - rect.bottom;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function findDataSourceMatchByAnchor(dataSources, bodyId, graph) {
    if (!bodyId) return [];
    var out = [];
    for (var i = 0; i < dataSources.length; i++) {
      var ds = dataSources[i];
      var body = ds && ds.cell;
      if (!body || body.id == null) continue;
      if (String(body.id) !== String(bodyId)) continue;
      out.push({
        body: body,
        bodyName: Shared.displayNameOfCell(graph, body) || Shared.trim(Shared.labelOf(body)),
        kind: ds.kind,
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
        var key = [item.body && item.body.id, item.kind || ''].join('|');
        if (seen[key]) continue;
        seen[key] = true;
        out.push(item);
      }
    }
    out.sort(function (a, b) { return Number(a.distance || 0) - Number(b.distance || 0); });
    return out;
  }

  function matchPointToDataSources(point, dataSources, tolerance, graph) {
    var out = [];
    if (!point) return out;
    tolerance = Math.max(0, Number(tolerance || 0));
    for (var i = 0; i < dataSources.length; i++) {
      var ds = dataSources[i] || {};
      var body = ds.cell;
      var rect = Shared.rectOfCell(body);
      if (!body || !rect) continue;
      var dist = pointDistanceToRect(point, rect);
      if (dist > tolerance) continue;
      out.push({
        body: body,
        bodyName: Shared.displayNameOfCell(graph, body) || Shared.trim(Shared.labelOf(body)),
        kind: ds.kind,
        distance: dist
      });
    }
    out.sort(function (a, b) { return Number(a.distance || 0) - Number(b.distance || 0); });
    return out;
  }

  function pickBestEndpointPair(headMatches, tailMatches, layerRule) {
    if (!headMatches.length || !tailMatches.length) return null;
    var i, j;
    var filteredHead = headMatches;
    var filteredTail = tailMatches;
    if (layerRule && layerRule.allowedKinds && layerRule.allowedKinds.length) {
      filteredHead = [];
      filteredTail = [];
      for (i = 0; i < headMatches.length; i++) {
        if (layerRule.allowedKinds.indexOf(headMatches[i].kind) >= 0) filteredHead.push(headMatches[i]);
      }
      for (j = 0; j < tailMatches.length; j++) {
        if (layerRule.allowedKinds.indexOf(tailMatches[j].kind) >= 0) filteredTail.push(tailMatches[j]);
      }
    }
    if (!filteredHead.length || !filteredTail.length) return null;
    for (i = 0; i < filteredHead.length; i++) {
      for (j = 0; j < filteredTail.length; j++) {
        var head = filteredHead[i];
        var tail = filteredTail[j];
        var sameBody = head.body && tail.body && String(head.body.id) === String(tail.body.id);
        if (layerRule && layerRule.requireSameSource && !sameBody) continue;
        return { start: head, back: tail, sameBody: sameBody };
      }
    }
    return null;
  }

  function analyzeFloorplanLine(edge, ctx, index) {
    var points = getEdgePolyline(ctx.graph, edge);
    var head = points.length ? points[0] : null;
    var tail = points.length ? points[points.length - 1] : null;
    var anchors = edgeAnchorMeta(edge);
    var layerName = normalizeLayerName(ctx.lineLayerNameByEdgeId[String(edge && edge.id || '')] || '');
    var layerRule = getLayerRule(ctx, layerName);
    var layerDataSources = ctx.dataSourceByLayer[layerName] || [];
    var endpointMatches = {
      head: mergeEndpointMatches(findDataSourceMatchByAnchor(layerDataSources, anchors.sourceBodyId, ctx.graph), matchPointToDataSources(head, layerDataSources, ctx.config.endpointTolerance, ctx.graph)),
      tail: mergeEndpointMatches(findDataSourceMatchByAnchor(layerDataSources, anchors.sinkBodyId, ctx.graph), matchPointToDataSources(tail, layerDataSources, ctx.config.endpointTolerance, ctx.graph))
    };
    var crossLayerAnchor = false;
    if (anchors.sourceBodyId && ctx.dataSourceByBodyId[anchors.sourceBodyId] && ctx.dataSourceByBodyId[anchors.sourceBodyId].layerName !== layerName) crossLayerAnchor = true;
    if (anchors.sinkBodyId && ctx.dataSourceByBodyId[anchors.sinkBodyId] && ctx.dataSourceByBodyId[anchors.sinkBodyId].layerName !== layerName) crossLayerAnchor = true;
    var pairMatch = pickBestEndpointPair(endpointMatches.head, endpointMatches.tail, layerRule);
    var validationErrors = [];
    if (!layerRule) validationErrors.push('Layer "' + (layerName || '?') + '" does not have a dataflow rule.');
    if (crossLayerAnchor) validationErrors.push('Line references a datasource from a different layer.');
    if (!endpointMatches.head.length || !endpointMatches.tail.length) validationErrors.push('Both endpoints must attach to datasource bodies in the same layer.');
    if (layerRule && !pairMatch && endpointMatches.head.length && endpointMatches.tail.length) {
      validationErrors.push('Line endpoints do not satisfy the layer datasource rule.');
    }
    if (pairMatch && layerRule && !pairMatch.sameBody && layerRule.requireSameSource) {
      validationErrors.push('Line must start and end on the same datasource for this layer.');
    }
    var loopMatch = pairMatch ? {
      orientation: 'head-start-tail-return',
      start: pairMatch.start,
      back: pairMatch.back
    } : null;
    return {
      edge: edge,
      index: index,
      layerName: layerName,
      layerRule: layerRule,
      points: points,
      endpointMatches: endpointMatches,
      touchesDataSource: !!(endpointMatches.head.length || endpointMatches.tail.length),
      touchesStartPin: !!endpointMatches.head.length,
      touchesReturnPin: !!endpointMatches.tail.length,
      validLoop: !!loopMatch,
      loopMatch: loopMatch,
      validationErrors: validationErrors
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
          for (var c = 0; c < info.children.length; c++) {
            var childInfo = info.children[c];
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

  function collectLeafModules(modules) {
    function rectContainsRect(outer, inner, tol) {
      tol = Number(tol || 0);
      if (!outer || !inner) return false;
      return inner.left >= outer.left - tol &&
        inner.right <= outer.right + tol &&
        inner.top >= outer.top - tol &&
        inner.bottom <= outer.bottom + tol;
    }
    var info = [];
    var i, j;
    for (i = 0; i < modules.length; i++) {
      var rect = Shared.rectOfCell(modules[i]);
      if (!rect) continue;
      info.push({ cell: modules[i], rect: rect, hasChild: false });
    }
    for (i = 0; i < info.length; i++) {
      for (j = 0; j < info.length; j++) {
        if (i === j) continue;
        var aArea = Math.max(0, Number(info[i].rect.width || 0)) * Math.max(0, Number(info[i].rect.height || 0));
        var bArea = Math.max(0, Number(info[j].rect.width || 0)) * Math.max(0, Number(info[j].rect.height || 0));
        if (!(bArea < aArea)) continue;
        if (rectContainsRect(info[i].rect, info[j].rect, 1.2)) info[i].hasChild = true;
      }
    }
    var out = [];
    for (i = 0; i < info.length; i++) {
      if (!info[i].hasChild) out.push(info[i].cell);
    }
    return out.length ? out : modules.slice();
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

  function sameModuleCell(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.id != null && b.id != null) return String(a.id) === String(b.id);
    return false;
  }

  function interfaceRoleClass(interfaceType) {
    return interfaceType === 'HI' || interfaceType === 'HO' ? 'host' : 'slave';
  }

  function layerSignalPrefix(layerName) {
    layerName = normalizeLayerName(layerName);
    if (!layerName) return 'flow';
    return layerName;
  }

  function buildInterfaceLabel(layerName, interfaceType) {
    return String(interfaceType || '') + ' [' + String(layerName || '').toUpperCase() + ']';
  }

  function readModuleInstanceName(moduleCell, fallback) {
    var style = moduleCell && moduleCell.style ? String(moduleCell.style) : '';
    var value = Shared.trim(Shared.styleValue(style, 'dftsFloorplan_instanceName', ''));
    return value || Shared.trim(fallback || '');
  }

  function createInterfaceMarker(evt, interfaceType, chainId, chainIndex, markerIndex, line, sourceModuleName) {
    var prefix = layerSignalPrefix(line.layerName);
    var sourceName = line.loopMatch && line.loopMatch.start ? line.loopMatch.start.bodyName : '';
    var moduleInstanceName = readModuleInstanceName(evt.moduleCell, evt.moduleName);
    return {
      id: 'marker_' + chainId + '_' + markerIndex,
      chainId: chainId,
      order: markerIndex,
      role: interfaceRoleClass(interfaceType),
      interfaceType: interfaceType,
      layerName: line.layerName,
      moduleName: evt.moduleName,
      moduleInstanceName: moduleInstanceName || evt.moduleName,
      moduleCell: evt.moduleCell,
      moduleId: evt.moduleCell && evt.moduleCell.id,
      point: evt.point,
      side: evt.side,
      direction: evt.direction,
      rawOffset: evt.offset,
      offset: evt.offset,
      orientation: evt.orientation,
      anchorX: evt.point.x,
      anchorY: evt.point.y,
      label: buildInterfaceLabel(line.layerName, interfaceType),
      sourceInstance: sourceName,
      clockSignal: prefix + '_clock',
      dataInSignal: prefix + '_data_in',
      dataOutSignal: prefix + '_data_out',
      channelIndex: chainIndex,
      busWidthIn: null,
      busWidthOut: null,
      sourceModule: sourceModuleName,
      peerMarkerId: '',
      pairId: '',
      name: '',
      interfaceIndex: 0
    };
  }

  function buildMarkerBundle(marker, bundleIndex) {
    marker.bundleId = 'bundle_' + bundleIndex;
    marker.bundleCenterOffset = marker.offset;
    marker.bundleCenterX = marker.point.x;
    marker.bundleCenterY = marker.point.y;
    marker.bundleSpan = 0;
    marker.layoutMode = 'single_marker';
    marker.layoutSlot = marker.role === 'host' ? 'inner' : 'outer';
    return {
      id: marker.bundleId,
      chainId: marker.chainId,
      moduleName: marker.moduleName,
      moduleCell: marker.moduleCell,
      moduleId: marker.moduleId,
      side: marker.side,
      orientation: (marker.side === 'left' || marker.side === 'right') ? 'vertical' : 'horizontal',
      center: { x: marker.point.x, y: marker.point.y },
      centerOffset: marker.offset,
      span: 0,
      markerIds: [marker.id],
      roles: [marker.interfaceType]
    };
  }

  function assignSideStackMetadata(markers) {
    var grouped = {};
    var i;
    for (i = 0; i < markers.length; i++) {
      var marker = markers[i];
      var key = [marker.layerName || '', marker.moduleId || marker.moduleName || '', marker.side || ''].join('|');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(marker);
    }
    Object.keys(grouped).forEach(function (key) {
      var items = grouped[key];
      items.sort(function (a, b) {
        return Number(a.offset || 0) - Number(b.offset || 0) || Number(a.order || 0) - Number(b.order || 0);
      });
      for (var j = 0; j < items.length; j++) {
        items[j].sideStackIndex = j;
        items[j].sideStackCount = items.length;
      }
    });
  }

  function assignInterfaceNames(markers) {
    var grouped = {};
    var i;
    for (i = 0; i < markers.length; i++) {
      var marker = markers[i];
      var key = [marker.moduleId || marker.moduleName || '', marker.side || ''].join('|');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(marker);
    }
    Object.keys(grouped).forEach(function (key) {
      var items = grouped[key];
      items.sort(function (a, b) {
        return Number(a.offset || 0) - Number(b.offset || 0) || Number(a.order || 0) - Number(b.order || 0);
      });
      for (var j = 0; j < items.length; j++) {
        var marker = items[j];
        marker.interfaceIndex = j + 1;
        marker.name = String(marker.moduleInstanceName || marker.moduleName || 'module') +
          '_' + String(marker.layerName || 'layer').toLowerCase() +
          '_' + String(marker.side || 'side') +
          '_' + String(j + 1);
      }
    });
  }

  function buildPairsForMarkers(chainId, layerName, markers) {
    var out = [];
    var ordered = markers.slice().sort(function (a, b) {
      return Number(a.order || 0) - Number(b.order || 0);
    });
    var pairIndex = 1;
    for (var i = 0; i < ordered.length - 1; i++) {
      var from = ordered[i];
      var to = ordered[i + 1];
      if (!from || !to) continue;
      if (String(from.moduleId || '') === String(to.moduleId || '')) continue;
      if (from.direction !== 'exit' || to.direction !== 'entry') continue;
      var pairId = chainId + '_pair_' + pairIndex;
      pairIndex++;
      from.pairId = pairId;
      to.pairId = pairId;
      from.peerMarkerId = to.id;
      to.peerMarkerId = from.id;
      from.peerModule = to.moduleName || '';
      to.peerModule = from.moduleName || '';
      from.peerRole = to.role || '';
      to.peerRole = from.role || '';
      out.push({
        id: pairId,
        chainId: chainId,
        layerName: layerName || '',
        fromMarkerId: from.id,
        toMarkerId: to.id,
        from: {
          moduleName: from.moduleName || '',
          moduleInstanceName: from.moduleInstanceName || '',
          interfaceName: from.name || '',
          interfaceType: from.interfaceType || '',
          side: from.side || '',
          sideIndex: from.interfaceIndex || 0
        },
        to: {
          moduleName: to.moduleName || '',
          moduleInstanceName: to.moduleInstanceName || '',
          interfaceName: to.name || '',
          interfaceType: to.interfaceType || '',
          side: to.side || '',
          sideIndex: to.interfaceIndex || 0
        }
      });
    }
    return out;
  }

  function classifyModuleInterfaces(moduleEvents, line, chainId, chainIndex, sourceModuleName, markerCounterRef, issues, opt) {
    opt = opt || {};
    var markers = [];
    var entryCount = 0;
    var exitCount = 0;
    var forceSlaveOnly = !!opt.forceSlaveOnly;
    var i;
    for (i = 0; i < moduleEvents.length; i++) {
      if (forceSlaveOnly) moduleEvents[i].direction = moduleEvents[i].role === 'slave' ? 'entry' : 'exit';
      else moduleEvents[i].direction = moduleEvents[i].role === 'host' ? 'entry' : 'exit';
      if (moduleEvents[i].direction === 'entry') entryCount++;
      else exitCount++;
    }
    if (moduleEvents.length < 2 || !entryCount || !exitCount) {
      issues.push({ level: 'error', text: 'Module "' + moduleEvents[0].moduleName + '" on layer "' + line.layerName + '" must have at least one entry and one exit.', ruleKey: 'interface-module-io', moduleId: moduleEvents[0].moduleCell && moduleEvents[0].moduleCell.id });
      return markers;
    }
    if (moduleEvents.length % 2 !== 0 || entryCount !== exitCount) {
      issues.push({ level: 'error', text: 'Module "' + moduleEvents[0].moduleName + '" on layer "' + line.layerName + '" has an odd or unbalanced entry/exit count. Branch cases are not supported yet.', ruleKey: 'interface-branch-unsupported', moduleId: moduleEvents[0].moduleCell && moduleEvents[0].moduleCell.id });
      return markers;
    }
    if (moduleEvents[0].direction !== 'entry' || moduleEvents[moduleEvents.length - 1].direction !== 'exit') {
      issues.push({ level: 'error', text: 'Module "' + moduleEvents[0].moduleName + '" on layer "' + line.layerName + '" does not begin with an entry and end with an exit.', ruleKey: 'interface-direction-order', moduleId: moduleEvents[0].moduleCell && moduleEvents[0].moduleCell.id });
      return markers;
    }
    for (i = 0; i < moduleEvents.length; i++) {
      var evt = moduleEvents[i];
      var interfaceType = '';
      if (forceSlaveOnly) {
        interfaceType = evt.direction === 'entry' ? 'SI' : 'SO';
      } else if (evt.direction === 'entry') {
        interfaceType = i === 0 ? 'HI' : 'SI';
      } else {
        interfaceType = i === moduleEvents.length - 1 ? 'HO' : 'SO';
      }
      markers.push(createInterfaceMarker(evt, interfaceType, chainId, chainIndex, markerCounterRef.value++, line, sourceModuleName));
    }
    return markers;
  }

  function buildChainPlan(ctx, line, chainIndex) {
    var issues = [];
    var targetModules = (ctx.leafModules && ctx.leafModules.length) ? ctx.leafModules : ctx.modules;
    var orientedPoints = orderedPointsForLine(line);
    var sourceBody = line.loopMatch ? line.loopMatch.start.body : null;
    var sourceModule = sourceBody ? findContainingModule(sourceBody, targetModules) : null;
    var events = collectBoundaryEvents(orientedPoints, targetModules, ctx.config);
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
        events = collectBoundaryEvents(orientedPoints, targetModules, ctx.config);
      }
    }
    var sourceModuleName = sourceModule ? Shared.displayNameOfCell(ctx.graph, sourceModule) : '';
    if (!events.length) {
      issues.push({ level: 'error', text: 'No module boundary crossings detected for ' + String((line.layerName || 'flow').toUpperCase()) + ' chain #' + (chainIndex + 1) + '.', ruleKey: 'chain-plan' });
    }
    var chainId = (line.layerName || 'flow') + '_chain_' + chainIndex;
    var markers = [];
    var pairs = [];
    var bundles = [];
    var grouped = {};
    var orderedModuleKeys = [];
    var markerCounterRef = { value: 0 };
    for (var i = 0; i < events.length; i++) {
      var evt = events[i];
      var moduleKey = String((evt.moduleCell && evt.moduleCell.id) || evt.moduleName || '');
      if (!moduleKey) continue;
      if (!grouped[moduleKey]) {
        grouped[moduleKey] = {
          events: [],
          isSourceModule: !!(sourceModule && sameModuleCell(evt.moduleCell, sourceModule))
        };
        orderedModuleKeys.push(moduleKey);
      }
      grouped[moduleKey].events.push(evt);
      if (sourceModule && sameModuleCell(evt.moduleCell, sourceModule)) grouped[moduleKey].isSourceModule = true;
    }
    for (i = 0; i < orderedModuleKeys.length; i++) {
      var moduleGroup = grouped[orderedModuleKeys[i]];
      var moduleMarkers = classifyModuleInterfaces(
        moduleGroup.events,
        line,
        chainId,
        chainIndex,
        sourceModuleName,
        markerCounterRef,
        issues,
        { forceSlaveOnly: !!moduleGroup.isSourceModule }
      );
      for (var m = 0; m < moduleMarkers.length; m++) markers.push(moduleMarkers[m]);
    }
    for (i = 0; i < markers.length; i++) {
      bundles.push(buildMarkerBundle(markers[i], chainIndex + '_' + i));
    }
    assignSideStackMetadata(markers);
    assignInterfaceNames(markers);
    pairs = buildPairsForMarkers(chainId, line.layerName, markers);
    if (!markers.length && !issues.length) {
      issues.push({ level: 'error', text: 'No interface marker was generated for ' + String((line.layerName || 'flow').toUpperCase()) + ' chain #' + (chainIndex + 1) + '.', ruleKey: 'interface-empty-chain' });
    }
    return {
      id: chainId,
      layerName: line.layerName,
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
    for (var i = 0; i < ctx.lineAnalyses.length; i++) {
      var line = ctx.lineAnalyses[i];
      if (!line.validLoop) continue;
      validLines.push(line);
    }
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
    var layers = Shared.getTopLevelLayers(ui);
    var vertices = [];
    var edges = [];
    var modules = [];
    var dataSources = [];
    var dataSourceInfos = [];
    var dataSourceByBodyId = {};
    var dataSourceByLayer = {};
    var interfaces = [];
    var floorplanLines = [];
    var lineLayerNameByEdgeId = {};
    var i;

    function pushUnique(list, cell, seenMap) {
      if (!cell || cell.id == null) return;
      var key = String(cell.id);
      if (seenMap[key]) return;
      seenMap[key] = true;
      list.push(cell);
    }

    var seenVertices = {};
    var seenEdges = {};
    var seenModules = {};
    var seenSources = {};
    var seenInterfaces = {};

    for (i = 0; i < layers.length; i++) {
      var layerCell = layers[i];
      var layerName = normalizeLayerName(Shared.getLayerName(layerCell));
      var layerVertices = Shared.getLayerVertices(ui, layerCell);
      var layerEdges = Shared.getLayerEdges(ui, layerCell);
      for (var v = 0; v < layerVertices.length; v++) {
        var cell = layerVertices[v];
        pushUnique(vertices, cell, seenVertices);
        if (isDataSourceBody(graph, cell)) {
          pushUnique(dataSources, cell, seenSources);
          var info = describeDataSource(graph, cell, layerName);
          dataSourceInfos.push(info);
          dataSourceByBodyId[String(cell.id)] = info;
          if (!dataSourceByLayer[layerName]) dataSourceByLayer[layerName] = [];
          dataSourceByLayer[layerName].push(info);
          continue;
        }
        if (isLikelyInterface(cell, graph)) {
          pushUnique(interfaces, cell, seenInterfaces);
          continue;
        }
        if (isLikelyBlock(cell, graph)) {
          pushUnique(modules, cell, seenModules);
        }
      }
      for (var e = 0; e < layerEdges.length; e++) {
        var edge = layerEdges[e];
        pushUnique(edges, edge, seenEdges);
        if (isFloorplanLine(graph, edge) && hasMeaningfulPolyline(graph, edge)) {
          floorplanLines.push(edge);
          lineLayerNameByEdgeId[String(edge.id)] = layerName;
        }
      }
    }

    for (i = 0; i < dataSourceInfos.length; i++) {
      var dsInfo = dataSourceInfos[i];
      if (!dataSourceByLayer[dsInfo.layerName]) dataSourceByLayer[dsInfo.layerName] = [];
    }

    var config = getDataflowRuleConfig();
    var configRules = config.layerRules || {};
    for (var knownLayer in configRules) {
      if (!Object.prototype.hasOwnProperty.call(configRules, knownLayer)) continue;
      if (!dataSourceByLayer[knownLayer]) dataSourceByLayer[knownLayer] = [];
    }

    var dataSourcePins = [];
    for (i = 0; i < dataSources.length; i++) {
      var pins = collectBodyPins(graph, dataSources[i]);
      for (var p = 0; p < pins.length; p++) dataSourcePins.push(pins[p]);
    }

    var ctx = {
      ui: ui,
      graph: graph,
      layers: layers,
      vertices: vertices,
      edges: edges,
      modules: modules,
      dataSources: dataSources,
      dataSourceInfos: dataSourceInfos,
      dataSourceByBodyId: dataSourceByBodyId,
      dataSourceByLayer: dataSourceByLayer,
      interfaces: interfaces,
      floorplanLines: floorplanLines,
      lineLayerNameByEdgeId: lineLayerNameByEdgeId,
      dataSourcePins: dataSourcePins,
      config: config
    };
    ctx.lineAnalyses = [];
    for (i = 0; i < floorplanLines.length; i++) ctx.lineAnalyses.push(analyzeFloorplanLine(floorplanLines[i], ctx, i));
    ctx.leafModules = collectLeafModules(modules);
    ctx.moduleCoverage = [];
    for (i = 0; i < modules.length; i++) {
      var moduleCell = modules[i];
      var rect = Shared.rectOfCell(moduleCell);
      var visited = false;
      for (var l = 0; l < ctx.lineAnalyses.length; l++) {
        if (!ctx.lineAnalyses[l].validLoop) continue;
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
    if (!ctx.dataSources.length) issue('warning', 'No data source detected on the current floorplan page.', { ruleKey: 'datasource-present' });
    if (!ctx.floorplanLines.length) issue('warning', 'No floorplan lines detected on the current page.', { ruleKey: 'floorplan-lines-present' });
    var layerRules = ctx.config.layerRules || {};
    for (var layerName in layerRules) {
      if (!Object.prototype.hasOwnProperty.call(layerRules, layerName)) continue;
      var rule = layerRules[layerName];
      var items = ctx.dataSourceByLayer[layerName] || [];
      var allowedCount = 0;
      for (var d = 0; d < items.length; d++) {
        if (rule.allowedKinds.indexOf(items[d].kind) >= 0) {
          allowedCount++;
          continue;
        }
        issue('error',
          'Layer "' + layerName + '" only allows ' + dataSourceKindLabel(rule.allowedKinds[0]) +
          ', but found "' + (items[d].name || 'unknown') + '" (' + dataSourceKindLabel(items[d].kind) + ').',
          { ruleKey: 'datasource-layer-type', datasourceId: items[d].cell && items[d].cell.id });
      }
      if (allowedCount < rule.minSources || allowedCount > rule.maxSources) {
        var expected = rule.minSources === rule.maxSources
          ? String(rule.minSources)
          : String(rule.minSources) + '~' + String(rule.maxSources);
        issue(allowedCount === 0 ? 'warning' : 'error',
          'Layer "' + layerName + '" requires ' + expected + ' ' + dataSourceKindLabel(rule.allowedKinds[0]) +
          ' datasource(s), but found ' + String(allowedCount) + '.',
          { ruleKey: 'datasource-layer-count', layerName: layerName });
      }
      var layerLineCount = 0;
      for (var ll = 0; ll < ctx.lineAnalyses.length; ll++) {
        if (ctx.lineAnalyses[ll].layerName === layerName) layerLineCount++;
      }
      if (items.length > 0 && !layerLineCount) {
        issue('warning',
          'Layer "' + layerName + '" contains datasource(s) but no floorplan line.',
          { ruleKey: 'datasource-layer-no-line', layerName: layerName });
      }
    }
    var validLoops = 0;
    for (var i = 0; i < ctx.lineAnalyses.length; i++) {
      var line = ctx.lineAnalyses[i];
      var lineName = 'Floorplan line #' + (line.index + 1) + (line.layerName ? ' [' + line.layerName + ']' : '');
      if (line.validLoop) {
        validLoops++;
        continue;
      }
      if (!line.touchesDataSource) {
        issue('error', lineName + ' is not attached to datasource endpoints.', { ruleKey: 'datasource-loop', edgeId: line.edge && line.edge.id });
      } else if (line.validationErrors && line.validationErrors.length) {
        for (var ve = 0; ve < line.validationErrors.length; ve++) {
          issue('error', lineName + ': ' + line.validationErrors[ve], { ruleKey: 'datasource-loop', edgeId: line.edge && line.edge.id });
        }
      } else {
        issue('error', lineName + ' does not satisfy the layer datasource rule.', { ruleKey: 'datasource-loop', edgeId: line.edge && line.edge.id });
      }
    }
    if (ctx.floorplanLines.length && !validLoops) {
      issue('error', 'No floorplan line satisfies datasource rules.', { ruleKey: 'datasource-loop' });
    }
    for (i = 0; i < ctx.moduleCoverage.length; i++) {
      if (!ctx.moduleCoverage[i].visited) issue('warning', 'Module "' + ctx.moduleCoverage[i].name + '" is not covered by any floorplan dataflow line.', { ruleKey: 'module-coverage', moduleId: ctx.moduleCoverage[i].module && ctx.moduleCoverage[i].module.id });
    }
    return issues;
  }

  Analysis.buildDataflowContext = buildDataflowContext;
  Analysis.analyzeDataflow = function analyzeDataflow(ui) {
    var ctx = buildDataflowContext(ui);
    var issues = runRules(ctx);
    if (ctx.interfacePlan && Array.isArray(ctx.interfacePlan.issues) && ctx.interfacePlan.issues.length) {
      for (var ip = 0; ip < ctx.interfacePlan.issues.length; ip++) issues.push(ctx.interfacePlan.issues[ip]);
    }
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
