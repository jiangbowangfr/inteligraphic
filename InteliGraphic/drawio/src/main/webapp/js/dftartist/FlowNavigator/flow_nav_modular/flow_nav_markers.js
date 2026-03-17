(function (global) {
  'use strict';

  var Mod = global.DFTFlowNavMod = global.DFTFlowNavMod || {};
  var Shared = Mod.Shared;
  var Analysis = Mod.Analysis;
  var Markers = Mod.Markers = Mod.Markers || {};
  if (!Shared || !Analysis) throw new Error('flow_nav_shared.js and flow_nav_analysis.js must be loaded before flow_nav_markers.js');

  function isMarkerCell(graph, cell) {
    if (!cell) return false;
    if (String(Shared.getCellStyleValue(graph, cell, 'flowMarker', '0')) === '1') return true;
    if (cell.__flowNavMarker) return true;
    try {
      if (cell.value && cell.value.nodeType === 1 && cell.value.getAttribute) return cell.value.getAttribute('kind') === 'ssn_interface_marker';
    } catch (e) {}
    return false;
  }

  function createMarkerValue(meta) {
    try {
      var doc = document.implementation.createDocument('', '', null);
      var node = doc.createElement('FlowNavMarker');
      node.setAttribute('kind', 'ssn_interface_marker');
      node.setAttribute('label', meta.label || '');
      node.setAttribute('role', meta.role || '');
      node.setAttribute('module', meta.moduleName || '');
      node.setAttribute('pairId', meta.pairId || '');
      node.setAttribute('chainId', meta.chainId || '');
      node.setAttribute('interfaceType', meta.interfaceType || '');
      node.setAttribute('layerName', meta.layerName || '');
      node.setAttribute('side', meta.side || '');
      node.setAttribute('offset', String(meta.offset == null ? '' : meta.offset));
      node.setAttribute('orientation', meta.orientation || '');
      node.setAttribute('sourceInstance', meta.sourceInstance || '');
      node.setAttribute('bundleId', meta.bundleId || '');
      node.setAttribute('bundleSpan', String(meta.bundleSpan == null ? '' : meta.bundleSpan));
      node.setAttribute('bundleCenterOffset', String(meta.bundleCenterOffset == null ? '' : meta.bundleCenterOffset));
      node.setAttribute('layoutSlot', meta.layoutSlot || '');
      node.setAttribute('sideStackIndex', String(meta.sideStackIndex == null ? '' : meta.sideStackIndex));
      node.setAttribute('sideStackCount', String(meta.sideStackCount == null ? '' : meta.sideStackCount));
      node.setAttribute('peerRole', meta.peerRole || '');
      node.setAttribute('peerModule', meta.peerModule || '');
      return node;
    } catch (e) {
      return meta.label || '';
    }
  }

  function markerVisualOrientation(meta) {
    if (meta && meta.orientation) return String(meta.orientation);
    return (meta && (meta.side === 'left' || meta.side === 'right')) ? 'vertical' : 'horizontal';
  }

  function markerPalette(meta) {
    var type = String(meta && meta.interfaceType || meta && meta.role || '').toUpperCase();
    if (type === 'HI') return { stroke: '#b45309', fill: '#fef3c7' };
    if (type === 'HO') return { stroke: '#92400e', fill: '#fde68a' };
    if (type === 'SI') return { stroke: '#1d4ed8', fill: '#dbeafe' };
    if (type === 'SO') return { stroke: '#0369a1', fill: '#cffafe' };
    return meta && meta.role === 'host'
      ? { stroke: '#7c3aed', fill: '#ede9fe' }
      : { stroke: '#2563eb', fill: '#dbeafe' };
  }

  function createMarkerStyle(meta) {
    var vertical = markerVisualOrientation(meta) === 'vertical';
    var palette = markerPalette(meta);
    return [
      'rounded=1','whiteSpace=wrap','html=1','fontSize=9','fontStyle=1',
      'strokeColor=' + palette.stroke,'fillColor=' + palette.fill,
      'flowMarker=1','flowRole=' + meta.role,'flowInterfaceType=' + (meta.interfaceType || ''),'flowLayer=' + (meta.layerName || ''),'flowModule=' + Shared.sanitizeName(meta.moduleName || ''),
      'flowPair=' + Shared.sanitizeName(meta.pairId || ''),'flowSide=' + (meta.side || ''),
      'verticalLabelPosition=middle','verticalAlign=middle',
      vertical ? 'rotation=90' : 'rotation=0'
    ].join(';') + ';';
  }

  function markerSize(meta) {
    var span = Math.max(0, Number(meta.bundleSpan || 0));
    if (meta.side === 'left' || meta.side === 'right') {
      var visual = { width: 30, height: Math.max(44, Math.ceil(span + 12)) };
      return { visual: visual, geometry: { width: visual.height, height: visual.width }, orientation: 'vertical' };
    }
    var visualH = { width: Math.max(44, Math.ceil(span + 12)), height: 30 };
    return { visual: visualH, geometry: { width: visualH.width, height: visualH.height }, orientation: 'horizontal' };
  }

  function computeBounds(meta, bundle, memberIndex, memberCount) {
    var size = markerSize(meta);
    var visual = size.visual;
    var geometry = size.geometry;
    var cx = Number(meta.bundleCenterX != null ? meta.bundleCenterX : (meta.anchorX || 0));
    var cy = Number(meta.bundleCenterY != null ? meta.bundleCenterY : (meta.anchorY || 0));

    if (meta.side === 'left') {
      cx += visual.width / 2;
    } else if (meta.side === 'right') {
      cx += -visual.width / 2;
    } else if (meta.side === 'top') {
      cy += visual.height / 2;
    } else {
      cy += -visual.height / 2;
    }

    return {
      x: Math.round(cx - geometry.width / 2),
      y: Math.round(cy - geometry.height / 2),
      width: Math.round(geometry.width),
      height: Math.round(geometry.height)
    };
  }

  function removeExistingMarkers(ui, analysis) {
    var graph = Shared.graphOf(ui);
    var vertices = [];
    var layers = Shared.getTopLevelLayers(ui);
    for (var l = 0; l < layers.length; l++) {
      var layerVertices = Shared.getLayerVertices(ui, layers[l]);
      for (var i = 0; i < layerVertices.length; i++) vertices.push(layerVertices[i]);
    }
    var doomed = [];
    for (var j = 0; j < vertices.length; j++) if (isMarkerCell(graph, vertices[j])) doomed.push(vertices[j]);
    if (!doomed.length) return 0;
    try { graph.removeCells(doomed, false); } catch (e) {}
    if (analysis && analysis.interfaces) analysis.interfaces = analysis.interfaces.filter(function (c) { return doomed.indexOf(c) < 0; });
    return doomed.length;
  }

  function findLayerParent(ui, layerName) {
    var layers = Shared.getTopLevelLayers(ui);
    var normalized = Shared.trim(layerName).toLowerCase();
    for (var i = 0; i < layers.length; i++) {
      if (Shared.trim(Shared.getLayerName(layers[i])).toLowerCase() === normalized) return layers[i];
    }
    return Shared.getDefaultParent(ui);
  }

  Markers.extractMarkerMeta = function extractMarkerMeta(cell) {
    if (!cell) return null;
    if (cell.__flowNavMarker) return cell.__flowNavMarker;
    try {
      if (cell.value && cell.value.nodeType === 1 && cell.value.getAttribute) {
        return {
          label: cell.value.getAttribute('label') || '', role: cell.value.getAttribute('role') || '',
          moduleName: cell.value.getAttribute('module') || '', pairId: cell.value.getAttribute('pairId') || '',
          chainId: cell.value.getAttribute('chainId') || '', side: cell.value.getAttribute('side') || '',
          interfaceType: cell.value.getAttribute('interfaceType') || '', layerName: cell.value.getAttribute('layerName') || '',
          offset: Number(cell.value.getAttribute('offset') || 0), orientation: cell.value.getAttribute('orientation') || '',
          sideStackIndex: Number(cell.value.getAttribute('sideStackIndex') || 0), sideStackCount: Number(cell.value.getAttribute('sideStackCount') || 1),
          sourceInstance: cell.value.getAttribute('sourceInstance') || '', bundleId: cell.value.getAttribute('bundleId') || '',
          bundleSpan: Number(cell.value.getAttribute('bundleSpan') || 0), bundleCenterOffset: Number(cell.value.getAttribute('bundleCenterOffset') || 0),
          layoutSlot: cell.value.getAttribute('layoutSlot') || '',
          peerRole: cell.value.getAttribute('peerRole') || '', peerModule: cell.value.getAttribute('peerModule') || ''
        };
      }
    } catch (e) {}
    return null;
  };

  Markers.createInterfaceMarkers = function createInterfaceMarkers(ui, analysis, opts) {
    opts = opts || {};
    analysis = analysis || Analysis.analyzeDataflow(ui);
    var graph = Shared.graphOf(ui);
    var defaultParent = Shared.getDefaultParent(ui);
    if (!graph || !defaultParent) throw new Error('Graph is not ready.');
    var plan = analysis.interfacePlan || { markers: [], bundles: [], pairs: [] };
    if (!plan.bundles || !plan.bundles.length) throw new Error('No floorplan interface markers are planned from the current dataflow.');
    var markerById = {};
    for (var i = 0; i < plan.markers.length; i++) markerById[plan.markers[i].id] = plan.markers[i];
    var created = [];
    graph.getModel().beginUpdate();
    try {
      if (opts.overwrite) removeExistingMarkers(ui, analysis);
      for (var b = 0; b < plan.bundles.length; b++) {
        var bundle = plan.bundles[b];
        var members = [];
        for (var m = 0; m < bundle.markerIds.length; m++) if (markerById[bundle.markerIds[m]]) members.push(markerById[bundle.markerIds[m]]);
        members.sort(function (a, b) {
          if (a.role !== b.role) return a.role === 'host' ? -1 : 1;
          return Number(a.order || 0) - Number(b.order || 0);
        });
        for (var j = 0; j < members.length; j++) {
          var meta = Shared.cloneJson(members[j]);
          meta.bundleId = bundle.id;
          meta.bundleSpan = bundle.span;
          meta.bundleCenterOffset = bundle.centerOffset;
          meta.bundleCenterX = bundle.center.x;
          meta.bundleCenterY = bundle.center.y;
          meta.offset = bundle.centerOffset;
          meta.orientation = bundle.orientation;
          var bounds = computeBounds(meta, bundle, j, members.length);
          var parent = findLayerParent(ui, meta.layerName);
          var cell = graph.insertVertex(parent, null, createMarkerValue(meta), bounds.x, bounds.y, bounds.width, bounds.height, createMarkerStyle(meta));
          cell.__flowNavMarker = meta;
          created.push({ meta: meta, cell: cell });
        }
      }
    } finally {
      graph.getModel().endUpdate();
    }
    return { created: created, plan: plan };
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
