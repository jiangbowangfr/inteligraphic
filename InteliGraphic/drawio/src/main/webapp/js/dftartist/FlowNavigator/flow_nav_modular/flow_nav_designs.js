(function (global) {
  'use strict';

  var Mod = global.DFTFlowNavMod = global.DFTFlowNavMod || {};
  var Shared = Mod.Shared;
  var Analysis = Mod.Analysis;
  var Markers = Mod.Markers;
  var Designs = Mod.Designs = Mod.Designs || {};
  if (!Shared || !Analysis) throw new Error('flow_nav_shared.js and flow_nav_analysis.js must be loaded before flow_nav_designs.js');

  function findTopLevelDesign(ui, name) {
    var pm = Shared.getProject(ui);
    var designs = pm && Array.isArray(pm.designs) ? pm.designs : [];
    for (var i = 0; i < designs.length; i++) {
      if (designs[i] && designs[i].__kind !== 'floorplan-container' && designs[i].name === name) return designs[i];
    }
    return null;
  }

  function getProjectRoot(ui) {
    var pm = Shared.getProject(ui);
    return (pm && pm.path) || ui._projectRootPath || ui._projectYamlDir || '';
  }

  async function ensureTopLevelDesign(ui, name) {
    var existing = findTopLevelDesign(ui, name);
    if (existing) return { design: existing, created: false };
    var root = getProjectRoot(ui);
    if (!root) throw new Error('Project root path is unavailable.');
    if (!global.DFTProjectExplorerPhase2 || typeof global.DFTProjectExplorerPhase2.createTopLevelDesign !== 'function') {
      throw new Error('Project Explorer createTopLevelDesign helper is not available.');
    }
    var design = await global.DFTProjectExplorerPhase2.createTopLevelDesign(ui, name, root);
    return { design: design, created: true };
  }

  async function ensurePage(ui, design, pageName) {
    pageName = pageName || 'main';
    design.pages = Array.isArray(design.pages) ? design.pages : [];
    var created = false;
    if (design.pages.indexOf(pageName) < 0) {
      design.pages.push(pageName);
      created = true;
      if (global.DFTProjectExplorerPhase2 && typeof global.DFTProjectExplorerPhase2.createPageFileSlot === 'function') {
        await global.DFTProjectExplorerPhase2.createPageFileSlot(ui, design, pageName);
      }
    }
    return { pageName: pageName, created: created };
  }

  function ensureFloorplanContainer(ui, parentDesign) {
    if (global.DFTProjectExplorerPhase2 && typeof global.DFTProjectExplorerPhase2.getFloorplanContainer === 'function') {
      return global.DFTProjectExplorerPhase2.getFloorplanContainer(ui, true, parentDesign || null);
    }
    return Shared.getFloorplanContainer(ui);
  }

  function captureCurrentPageCtx(ui) {
    var ctx = ui && ui._activeProjectPageCtx;
    return ctx ? { designRef: ctx.designRef, name: ctx.name } : null;
  }

  async function restorePageCtx(ui, ctx) {
    if (!ctx || !ctx.designRef || !ctx.name) return;
    if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.openPage === 'function') {
      await global.DFTPageSessionManager.openPage(ui, ctx.designRef, ctx.name, { source: 'flow-nav-restore' });
    }
  }

  async function withOpenedPage(ui, design, pageName, fn) {
    if (!global.DFTPageSessionManager || typeof global.DFTPageSessionManager.openPage !== 'function') {
      throw new Error('DFTPageSessionManager.openPage is required to materialize design pages.');
    }
    await global.DFTPageSessionManager.openPage(ui, design, pageName, { source: 'flow-nav-materialize' });
    try {
      return await fn();
    } finally {
      try {
        if (typeof global.DFTPageSessionManager.saveActivePage === 'function') {
          await global.DFTPageSessionManager.saveActivePage(ui, { reason: 'flow-nav-materialize-save' });
        }
      } catch (e) {}
    }
  }

  function clearCurrentGraph(ui) {
    var graph = Shared.graphOf(ui);
    var parent = Shared.getDefaultParent(ui);
    if (!graph || !parent) return;
    var model = graph.getModel();
    var doomed = [];
    var childCount = model.getChildCount(parent);
    for (var i = 0; i < childCount; i++) doomed.push(model.getChildAt(parent, i));
    if (!doomed.length) return;
    graph.removeCells(doomed, false);
  }

  function collectVertices(parent, model, out) {
    if (!parent || !model) return;
    var count = model.getChildCount(parent);
    for (var i = 0; i < count; i++) {
      var child = model.getChildAt(parent, i);
      if (child && child.vertex) out.push(child);
      collectVertices(child, model, out);
    }
  }

  function collectGeneratedMarkerMeta(ui) {
    var graph = Shared.graphOf(ui);
    if (!graph) return [];
    var layers = Shared.getTopLevelLayers(ui);
    var vertices = [];
    for (var i = 0; i < layers.length; i++) collectVertices(layers[i], graph.getModel(), vertices);
    var out = [];
    for (var j = 0; j < vertices.length; j++) {
      var meta = Markers && typeof Markers.extractMarkerMeta === 'function' ? Markers.extractMarkerMeta(vertices[j]) : null;
      if (!meta || !meta.moduleName) continue;
      out.push({ cell: vertices[j], meta: Shared.cloneJson(meta) });
    }
    return out;
  }

  function groupMarkersByModule(markerEntries) {
    var out = {};
    for (var i = 0; i < markerEntries.length; i++) {
      var entry = markerEntries[i];
      var name = String(entry && entry.meta && entry.meta.moduleName || '').trim();
      if (!name) continue;
      if (!out[name]) out[name] = [];
      out[name].push(entry);
    }
    return out;
  }

  function normalizeLayerName(name) {
    return String(name || '').trim().toLowerCase();
  }

  function groupMarkersByLayer(markerEntries) {
    var out = {};
    for (var i = 0; i < markerEntries.length; i++) {
      var entry = markerEntries[i];
      var layer = normalizeLayerName(entry && entry.meta && entry.meta.layerName);
      if (!layer) continue;
      if (!out[layer]) out[layer] = [];
      out[layer].push(entry);
    }
    return out;
  }

  function sortMarkersForSide(items) {
    items.sort(function (a, b) {
      var av = Number(a.meta && (a.meta.bundleCenterOffset != null ? a.meta.bundleCenterOffset : a.meta.offset));
      var bv = Number(b.meta && (b.meta.bundleCenterOffset != null ? b.meta.bundleCenterOffset : b.meta.offset));
      if (!isFinite(av)) av = 0.5;
      if (!isFinite(bv)) bv = 0.5;
      if (av !== bv) return av - bv;
      return String(a.meta && a.meta.interfaceType || '').localeCompare(String(b.meta && b.meta.interfaceType || ''));
    });
    return items;
  }

  function interfaceKeyFromMarker(meta) {
    var layer = String(meta && meta.layerName || '').toLowerCase();
    var type = String(meta && meta.interfaceType || '').toUpperCase();
    if (layer === 'ssn') {
      if (type === 'HI') return 'SSNHostInputInterface';
      if (type === 'HO') return 'SSNHostOutputInterface';
      if (type === 'SI') return 'SSNSlaveInputInterface';
      if (type === 'SO') return 'SSNSlaveOutputInterface';
    }
    if (layer === 'bscan') {
      if (type === 'HI') return 'BSCANHostInputInterface';
      if (type === 'HO') return 'BSCANHostOutputInterface';
      if (type === 'SI') return 'BSCANSlaveInputInterface';
      if (type === 'SO') return 'BSCANSlaveOutputInterface';
    }
    if (layer === 'ijtag') {
      if (type === 'HI') return 'IJTAGHostInputInterface';
      if (type === 'HO') return 'IJTAGHostOutputInterface';
      if (type === 'SI') return 'IJTAGSlaveInputInterface';
      if (type === 'SO') return 'IJTAGSlaveOutputInterface';
    }
    if (layer === 'bisr') {
      if (type === 'HI') return 'BISRHostInputInterface';
      if (type === 'HO') return 'BISRHostOutputInterface';
      if (type === 'SI') return 'BISRSlaveInputInterface';
      if (type === 'SO') return 'BISRSlaveOutputInterface';
    }
    return '';
  }

  function createFloorplanModuleCell(graph, moduleName, width, height) {
    if (!global.DftsFloorplan || typeof global.DftsFloorplan.createByKey !== 'function') {
      throw new Error('DftsFloorplan.createByKey is required to build module designs.');
    }
    var cell = global.DftsFloorplan.createByKey(graph, 'FloorplanModule', {
      label: moduleName,
      w: width,
      h: height,
      instanceName: ''
    });
    cell.geometry = new mxGeometry(0, 0, width, height);
    cell.style = mxUtils.setStyle(cell.style || '', 'fillColor', 'none');
    cell.style = mxUtils.setStyle(cell.style || '', 'strokeColor', '#111827');
    cell.style = mxUtils.setStyle(cell.style || '', 'strokeWidth', '2');
    cell.style = mxUtils.setStyle(cell.style || '', 'movable', '0');
    cell.style = mxUtils.setStyle(cell.style || '', 'resizable', '0');
    cell.style = mxUtils.setStyle(cell.style || '', 'rotatable', '0');
    cell.style = mxUtils.setStyle(cell.style || '', 'dftsFlowNavGeneratedModule', '1');
    return cell;
  }

  function createInterfaceCell(graph, markerMeta) {
    if (!global.DftsIP || typeof global.DftsIP.createByKey !== 'function') {
      throw new Error('DftsIP.createByKey is required to build interface designs.');
    }
    var key = interfaceKeyFromMarker(markerMeta);
    if (!key) throw new Error('Unsupported interface marker type: ' + String(markerMeta && markerMeta.layerName || '') + '/' + String(markerMeta && markerMeta.interfaceType || ''));
    var cell = global.DftsIP.createByKey(graph, key, {
      label: String(markerMeta.interfaceType || ''),
      pinLabel: markerMeta.sourceInstance || markerMeta.moduleName || '',
      deviceLabel: markerMeta.sourceInstance || markerMeta.moduleName || '',
      pdg: markerMeta.layerName || '',
      busWidth: 4
    });
    var geo = cell.geometry || new mxGeometry(0, 0, 190, 40);
    cell.geometry = new mxGeometry(0, 0, Number(geo.width || 190), Number(geo.height || 40));
    cell.style = mxUtils.setStyle(cell.style || '', 'movable', '0');
    cell.style = mxUtils.setStyle(cell.style || '', 'resizable', '0');
    cell.style = mxUtils.setStyle(cell.style || '', 'rotatable', '0');
    cell.style = mxUtils.setStyle(cell.style || '', 'flowGeneratedDesignInterface', '1');
    cell.style = mxUtils.setStyle(cell.style || '', 'flowModule', markerMeta.moduleName || '');
    cell.style = mxUtils.setStyle(cell.style || '', 'flowInterfaceType', markerMeta.interfaceType || '');
    cell.style = mxUtils.setStyle(cell.style || '', 'flowLayer', markerMeta.layerName || '');
    cell.style = mxUtils.setStyle(cell.style || '', 'flowPair', markerMeta.pairId || '');
    if (markerMeta.side === 'left') cell.style = mxUtils.setStyle(cell.style || '', 'rotation', '270');
    else if (markerMeta.side === 'right') cell.style = mxUtils.setStyle(cell.style || '', 'rotation', '90');
    else if (markerMeta.side === 'bottom') cell.style = mxUtils.setStyle(cell.style || '', 'rotation', '180');
    else cell.style = mxUtils.setStyle(cell.style || '', 'rotation', '0');
    cell.__flowDesignMarkerMeta = Shared.cloneJson(markerMeta);
    return cell;
  }

  function addCellAt(graph, parent, cell, x, y) {
    resetCellTreeIds(cell);
    var added = graph.addCell(cell, parent);
    var geo0 = graph.getCellGeometry(added) || cell.geometry || new mxGeometry();
    var geo = new mxGeometry(
      Number(geo0.x || 0),
      Number(geo0.y || 0),
      Number(geo0.width || 0),
      Number(geo0.height || 0)
    );
    geo.relative = !!geo0.relative;
    geo.sourcePoint = geo0.sourcePoint ? new mxPoint(Number(geo0.sourcePoint.x || 0), Number(geo0.sourcePoint.y || 0)) : null;
    geo.targetPoint = geo0.targetPoint ? new mxPoint(Number(geo0.targetPoint.x || 0), Number(geo0.targetPoint.y || 0)) : null;
    if (geo0.offset) geo.offset = new mxPoint(Number(geo0.offset.x || 0), Number(geo0.offset.y || 0));
    if (geo0.points && geo0.points.length) {
      geo.points = [];
      for (var i = 0; i < geo0.points.length; i++) {
        var pt = geo0.points[i];
        geo.points.push(new mxPoint(Number(pt && pt.x || 0), Number(pt && pt.y || 0)));
      }
    }
    geo.x = x;
    geo.y = y;
    graph.getModel().setGeometry(added, geo);
    return added;
  }

  function resetCellTreeIds(cell) {
    if (!cell) return;
    cell.id = null;
    if (cell.children && cell.children.length) {
      for (var i = 0; i < cell.children.length; i++) resetCellTreeIds(cell.children[i]);
    }
  }

  function pageMetrics(graph) {
    var fmt = graph && graph.pageFormat ? graph.pageFormat : null;
    return {
      width: Number(fmt && fmt.width || 1100),
      height: Number(fmt && fmt.height || 850),
      margin: 40,
      gap: 12
    };
  }

  function interfaceVisualSize(cell, side) {
    var geo = cell && cell.geometry ? cell.geometry : null;
    var w = Number(geo && geo.width || 190);
    var h = Number(geo && geo.height || 40);
    if (side === 'left' || side === 'right') return { width: h, height: w };
    return { width: w, height: h };
  }

  function countBySide(markers) {
    var out = { left: [], right: [], top: [], bottom: [] };
    for (var i = 0; i < markers.length; i++) {
      var side = String(markers[i] && markers[i].meta && markers[i].meta.side || 'right').toLowerCase();
      if (!out[side]) side = 'right';
      out[side].push(markers[i]);
    }
    sortMarkersForSide(out.left);
    sortMarkersForSide(out.right);
    sortMarkersForSide(out.top);
    sortMarkersForSide(out.bottom);
    return out;
  }

  function positionInterfacesAroundBody(bodyRect, bySide, prototypes) {
    var placements = [];

    function placeSide(side, list) {
      for (var i = 0; i < list.length; i++) {
        var entry = list[i];
        var cell = prototypes[entry.meta.id];
        if (!cell) continue;
        var size = interfaceVisualSize(cell, side);
        var offset = Number(entry.meta.bundleCenterOffset != null ? entry.meta.bundleCenterOffset : entry.meta.offset);
        if (!isFinite(offset)) offset = (i + 1) / (list.length + 1);
        var x = bodyRect.x;
        var y = bodyRect.y;
        if (side === 'left') {
          x = bodyRect.x - size.width - 12;
          y = bodyRect.y + Math.round(offset * bodyRect.height - size.height / 2);
        } else if (side === 'right') {
          x = bodyRect.x + bodyRect.width + 12;
          y = bodyRect.y + Math.round(offset * bodyRect.height - size.height / 2);
        } else if (side === 'top') {
          x = bodyRect.x + Math.round(offset * bodyRect.width - size.width / 2);
          y = bodyRect.y - size.height - 12;
        } else {
          x = bodyRect.x + Math.round(offset * bodyRect.width - size.width / 2);
          y = bodyRect.y + bodyRect.height + 12;
        }
        placements.push({ marker: entry, cell: cell, x: x, y: y });
      }
    }

    placeSide('left', bySide.left);
    placeSide('right', bySide.right);
    placeSide('top', bySide.top);
    placeSide('bottom', bySide.bottom);
    return placements;
  }

  function lockChildrenStyles(graph, cells) {
    for (var i = 0; i < cells.length; i++) {
      var style = cells[i].style || '';
      style = mxUtils.setStyle(style, 'movable', '0');
      style = mxUtils.setStyle(style, 'resizable', '0');
      style = mxUtils.setStyle(style, 'rotatable', '0');
      graph.getModel().setStyle(cells[i], style);
    }
  }

  function buildShellGroup(graph, moduleName, cells) {
    if (!cells.length) return null;
    var group = graph.groupCells(null, 0, cells);
    if (!group) return null;
    var style = group.style || '';
    style = mxUtils.setStyle(style, 'fillColor', 'none');
    style = mxUtils.setStyle(style, 'strokeColor', 'none');
    style = mxUtils.setStyle(style, 'rounded', '0');
    style = mxUtils.setStyle(style, 'movable', '1');
    style = mxUtils.setStyle(style, 'resizable', '1');
    style = mxUtils.setStyle(style, 'rotatable', '0');
    style = mxUtils.setStyle(style, 'aspect', 'fixed');
    style = mxUtils.setStyle(style, 'connectable', '0');
    style = mxUtils.setStyle(style, 'flowModuleShell', '1');
    style = mxUtils.setStyle(style, 'flowModule', moduleName || '');
    graph.getModel().setStyle(group, style);
    return group;
  }

  async function materializeModulePage(ui, moduleName, markerEntries, opts) {
    opts = opts || {};
    clearCurrentGraph(ui);
    var graph = Shared.graphOf(ui);
    var parent = Shared.getDefaultParent(ui);
    if (!graph || !parent) throw new Error('Graph is not ready for materialization.');

    var metrics = pageMetrics(graph);
    var includeInterfaces = opts.includeInterfaces !== false;
    var entries = Array.isArray(markerEntries) ? markerEntries : [];
    var bySide = countBySide(entries);
    var interfacePrototypes = {};
    if (includeInterfaces) {
      for (var i = 0; i < entries.length; i++) interfacePrototypes[entries[i].meta.id] = createInterfaceCell(graph, entries[i].meta);
    }

    var sideBand = 64;
    var topBand = 64;
    var bodyRect = {
      x: metrics.margin + sideBand,
      y: metrics.margin + topBand,
      width: Math.max(480, metrics.width - metrics.margin * 2 - sideBand * 2),
      height: Math.max(320, metrics.height - metrics.margin * 2 - topBand * 2)
    };

    graph.getModel().beginUpdate();
    try {
      var body = addCellAt(graph, parent, createFloorplanModuleCell(graph, moduleName, bodyRect.width, bodyRect.height), bodyRect.x, bodyRect.y);
      var addedInterfaces = [];
      if (includeInterfaces) {
        var placements = positionInterfacesAroundBody(bodyRect, bySide, interfacePrototypes);
        for (var p = 0; p < placements.length; p++) addedInterfaces.push(addCellAt(graph, parent, placements[p].cell, placements[p].x, placements[p].y));
      }
      var shellChildren = [body].concat(addedInterfaces);
      lockChildrenStyles(graph, shellChildren);
      var shell = buildShellGroup(graph, moduleName, shellChildren);
      return { body: body, interfaces: addedInterfaces, shell: shell };
    } finally {
      graph.getModel().endUpdate();
    }
  }

  Designs.collectGeneratedMarkerMeta = collectGeneratedMarkerMeta;
  Designs.collectDesignInputs = function collectDesignInputs(ui) {
    return groupMarkersByModule(collectGeneratedMarkerMeta(ui));
  };

  Designs.generateTopLevelDesigns = async function generateTopLevelDesigns(ui, analysis, opts) {
    opts = opts || {};
    analysis = analysis || Analysis.analyzeDataflow(ui);
    var designInputs = Designs.collectDesignInputs(ui);
    var moduleNames = Object.keys(designInputs).sort();
    if (!moduleNames.length) throw new Error('No generated floorplan interfaces found. Generate interfaces first.');
    var pageOrder = ['ssn', 'ijtag', 'bscan', 'bisr'];
    var previousCtx = captureCurrentPageCtx(ui);
    var results = [];
    try {
      for (var i = 0; i < moduleNames.length; i++) {
        var moduleName = moduleNames[i];
        var markerEntries = designInputs[moduleName];
        var layerInputs = groupMarkersByLayer(markerEntries);
        var ensured = await ensureTopLevelDesign(ui, moduleName);
        var design = ensured.design;
        var floorplan = ensureFloorplanContainer(ui, design);
        var shellPageName = Shared.sanitizeName ? (Shared.sanitizeName(moduleName) + '_floorplan') : (String(moduleName).replace(/[^a-zA-Z0-9]+/g, '_') + '_floorplan');
        if (floorplan) {
          await ensurePage(ui, floorplan, shellPageName);
          await withOpenedPage(ui, floorplan, shellPageName, (function () {
            return async function () {
              await materializeModulePage(ui, moduleName, [], {
                includeInterfaces: false
              });
            };
          })());
          results.push({
            module: moduleName,
            design: floorplan,
            createdDesign: false,
            page: shellPageName,
            markerCount: 0
          });
        }
        for (var j = 0; j < pageOrder.length; j++) {
          var pageName = pageOrder[j];
          var pageMarkers = layerInputs[pageName] || [];
          if (!pageMarkers.length) continue;
          await ensurePage(ui, design, pageName);
          await withOpenedPage(ui, design, pageName, (function (currentPageName, currentPageMarkers) {
            return async function () {
              await materializeModulePage(ui, moduleName, currentPageMarkers, {
                includeInterfaces: true
              });
            };
          })(pageName, pageMarkers));
          results.push({
            module: moduleName,
            design: design,
            createdDesign: ensured.created,
            page: pageName,
            markerCount: pageMarkers.length
          });
        }
      }
    } finally {
      await restorePageCtx(ui, previousCtx);
      try {
        if (global.DFTProjectExplorerPhase2 && typeof global.DFTProjectExplorerPhase2.notifyProjectChanged === 'function') {
          global.DFTProjectExplorerPhase2.notifyProjectChanged(ui, 'generate-top-level-designs');
        }
      } catch (e) {}
    }
    return { created: results, moduleCount: moduleNames.length };
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
