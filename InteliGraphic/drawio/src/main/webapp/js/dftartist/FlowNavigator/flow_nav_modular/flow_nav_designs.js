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
        var graph = Shared.graphOf(ui);
        var parent = Shared.getDefaultParent(ui);
        var childCount = 0;
        if (graph && parent && typeof graph.getModel === 'function') {
          childCount = graph.getModel().getChildCount(parent);
        }
        if (global.console && typeof global.console.log === 'function') {
          console.log('[FlowNavDesigns] save-before', {
            pageName: pageName,
            designName: design && design.name ? design.name : '',
            activeCtx: ui && ui._activeProjectPageCtx ? {
              name: ui._activeProjectPageCtx.name,
              abs: ui._activeProjectPageCtx.abs || '',
              designKey: ui._activeProjectPageCtx.designKey || ''
            } : null,
            childCount: childCount
          });
        }
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

  function currentGraphSummary(ui) {
    var graph = Shared.graphOf(ui);
    var parent = Shared.getDefaultParent(ui);
    var out = {
      pageName: ui && ui._activeProjectPageCtx ? ui._activeProjectPageCtx.name || '' : '',
      childCount: 0,
      cells: []
    };
    if (!graph || !parent || !graph.getModel) return out;
    var model = graph.getModel();
    var count = model.getChildCount(parent);
    out.childCount = count;
    for (var i = 0; i < count; i++) {
      var cell = model.getChildAt(parent, i);
      if (!cell) continue;
      var geo = cell.geometry || null;
      out.cells.push({
        id: cell.id || '',
        vertex: !!cell.vertex,
        edge: !!cell.edge,
        style: String(cell.style || '').slice(0, 160),
        x: geo ? Number(geo.x || 0) : null,
        y: geo ? Number(geo.y || 0) : null,
        width: geo ? Number(geo.width || 0) : null,
        height: geo ? Number(geo.height || 0) : null
      });
      if (out.cells.length >= 10) break;
    }
    return out;
  }

  function emitDesignLog(label, meta) {
    try {
      if (global.console && typeof global.console.log === 'function') {
        console.log('[FlowNavDesigns] ' + label, meta);
      }
    } catch (e) {}
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

  function makeMetaKey(meta) {
    if (!meta) return '';
    return [
      String(meta.moduleName || '').trim(),
      String(meta.layerName || '').trim().toLowerCase(),
      String(meta.interfaceType || '').trim().toUpperCase(),
      String(meta.pairId || '').trim(),
      String(meta.bundleId || '').trim(),
      String(meta.chainId || '').trim(),
      String(meta.sideStackIndex == null ? '' : meta.sideStackIndex)
    ].join('|');
  }

  function extractGeneratedInterfaceMeta(graph, cell) {
    if (!cell) return null;
    var style = String(cell.style || '');
    if (style.indexOf('dftsIP_chipBody=1') < 0) return null;
    var direct = cell.__flowDesignMarkerMeta ? Shared.cloneJson(cell.__flowDesignMarkerMeta) : null;
    if (direct && direct.moduleName) return direct;
    if (String(Shared.getCellStyleValue(graph, cell, 'flowGeneratedDesignInterface', '0')) !== '1') return null;
    var fromStyle = {
      moduleName: String(Shared.getCellStyleValue(graph, cell, 'flowModule', '') || ''),
      layerName: String(Shared.getCellStyleValue(graph, cell, 'flowLayer', '') || ''),
      interfaceType: String(Shared.getCellStyleValue(graph, cell, 'flowInterfaceType', '') || ''),
      pairId: String(Shared.getCellStyleValue(graph, cell, 'flowPair', '') || ''),
      side: '',
      bundleId: '',
      chainId: ''
    };
    if (!fromStyle.moduleName || !fromStyle.layerName || !fromStyle.interfaceType) return null;
    return fromStyle;
  }

  function collectGeneratedMarkerMeta(ui) {
    var graph = Shared.graphOf(ui);
    if (!graph) return [];
    var layers = Shared.getTopLevelLayers(ui);
    var vertices = [];
    for (var i = 0; i < layers.length; i++) collectVertices(layers[i], graph.getModel(), vertices);
    var out = [];
    var actualByKey = Object.create(null);
    var markerByKey = Object.create(null);
    for (var j = 0; j < vertices.length; j++) {
      var actualMeta = extractGeneratedInterfaceMeta(graph, vertices[j]);
      if (actualMeta && actualMeta.moduleName) {
        var actualKey = makeMetaKey(actualMeta);
        if (actualKey && !actualByKey[actualKey]) {
          emitDesignLog('collect-actual-interface', {
            key: actualKey,
            moduleName: actualMeta.moduleName,
            layerName: actualMeta.layerName,
            interfaceType: actualMeta.interfaceType,
            cellId: vertices[j].id || '',
            style: String(vertices[j].style || '').slice(0, 220),
            geometry: vertices[j].geometry ? {
              x: Number(vertices[j].geometry.x || 0),
              y: Number(vertices[j].geometry.y || 0),
              width: Number(vertices[j].geometry.width || 0),
              height: Number(vertices[j].geometry.height || 0)
            } : null
          });
          actualByKey[actualKey] = { cell: vertices[j], meta: actualMeta };
        }
        continue;
      }
      var meta = Markers && typeof Markers.extractMarkerMeta === 'function' ? Markers.extractMarkerMeta(vertices[j]) : null;
      if (!meta || !meta.moduleName) continue;
      var markerKey = makeMetaKey(meta);
      if (markerKey && !markerByKey[markerKey]) {
        emitDesignLog('collect-marker-fallback', {
          key: markerKey,
          moduleName: meta.moduleName,
          layerName: meta.layerName,
          interfaceType: meta.interfaceType,
          cellId: vertices[j].id || '',
          style: String(vertices[j].style || '').slice(0, 220),
          geometry: vertices[j].geometry ? {
            x: Number(vertices[j].geometry.x || 0),
            y: Number(vertices[j].geometry.y || 0),
            width: Number(vertices[j].geometry.width || 0),
            height: Number(vertices[j].geometry.height || 0)
          } : null
        });
        markerByKey[markerKey] = { cell: vertices[j], meta: Shared.cloneJson(meta) };
      }
    }
    var actualKeys = Object.keys(actualByKey);
    for (var a = 0; a < actualKeys.length; a++) out.push(actualByKey[actualKeys[a]]);
    var markerKeys = Object.keys(markerByKey);
    for (var m = 0; m < markerKeys.length; m++) {
      if (actualByKey[markerKeys[m]]) continue;
      out.push(markerByKey[markerKeys[m]]);
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

  function interfaceTitleFromMarker(meta) {
    var layer = String(meta && meta.layerName || '').toUpperCase();
    var type = String(meta && meta.interfaceType || '').toUpperCase();
    return layer && type ? (layer + '_' + type) : (type || layer || '');
  }

  function makeModuleShellStyle(style) {
    style = style || '';
    style = mxUtils.setStyle(style, 'fillColor', 'none');
    style = mxUtils.setStyle(style, 'opacity', '100');
    style = mxUtils.setStyle(style, 'strokeColor', '#111827');
    style = mxUtils.setStyle(style, 'strokeWidth', '2');
    style = mxUtils.setStyle(style, 'movable', '0');
    style = mxUtils.setStyle(style, 'resizable', '0');
    style = mxUtils.setStyle(style, 'rotatable', '0');
    style = mxUtils.setStyle(style, 'connectable', '0');
    style = mxUtils.setStyle(style, 'dftsFlowNavGeneratedModule', '1');
    return style;
  }

  function createFloorplanModuleCell(graph, moduleName, width, height, sourceModuleCell) {
    if (sourceModuleCell && typeof sourceModuleCell.clone === 'function') {
      var cloned = sourceModuleCell.clone();
      resetCellTreeIds(cloned);
      cloned.style = makeModuleShellStyle(cloned.style || '');
      var srcGeo = sourceModuleCell.geometry || cloned.geometry || new mxGeometry(0, 0, width, height);
      cloned.geometry = new mxGeometry(0, 0, Number(srcGeo.width || width), Number(srcGeo.height || height));
      if (srcGeo.points && srcGeo.points.length) {
        cloned.geometry.points = [];
        for (var pi = 0; pi < srcGeo.points.length; pi++) {
          var srcPt = srcGeo.points[pi];
          cloned.geometry.points.push(new mxPoint(Number(srcPt && srcPt.x || 0), Number(srcPt && srcPt.y || 0)));
        }
      }
      return cloned;
    }

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
    cell.style = makeModuleShellStyle(cell.style || '');
    return cell;
  }

  function makeInterfaceStyle(style, markerMeta) {
    style = style || '';
    style = mxUtils.setStyle(style, 'movable', '0');
    style = mxUtils.setStyle(style, 'resizable', '0');
    style = mxUtils.setStyle(style, 'rotatable', '0');
    style = mxUtils.setStyle(style, 'flowGeneratedDesignInterface', '1');
    style = mxUtils.setStyle(style, 'flowModule', markerMeta && markerMeta.moduleName || '');
    style = mxUtils.setStyle(style, 'flowInterfaceType', markerMeta && markerMeta.interfaceType || '');
    style = mxUtils.setStyle(style, 'flowLayer', markerMeta && markerMeta.layerName || '');
    style = mxUtils.setStyle(style, 'flowPair', markerMeta && markerMeta.pairId || '');
    return style;
  }

  function sourceStyleValue(styleText, key, fallback) {
    return Shared.styleValue ? Shared.styleValue(styleText, key, fallback) : fallback;
  }

  function applyMarkerAppearanceToInterface(graph, cell, sourceCell, markerMeta) {
    if (!graph || !cell || !sourceCell) return;
    var sourceGeo = sourceCell.geometry || null;
    var sourceStyle = String(sourceCell.style || '');
    var model = graph.getModel();
    if (sourceGeo) {
      var nextGeo = (cell.geometry && typeof cell.geometry.clone === 'function') ? cell.geometry.clone() : new mxGeometry();
      nextGeo.width = Number(sourceGeo.width || nextGeo.width || 0);
      nextGeo.height = Number(sourceGeo.height || nextGeo.height || 0);
      model.setGeometry(cell, nextGeo);
    }
    var nextStyle = String(cell.style || '');
    var fillColor = sourceStyleValue(sourceStyle, 'fillColor', '');
    var strokeColor = sourceStyleValue(sourceStyle, 'strokeColor', '');
    var rotation = sourceStyleValue(sourceStyle, 'rotation', '');
    var fontSize = sourceStyleValue(sourceStyle, 'fontSize', '');
    if (fillColor) nextStyle = mxUtils.setStyle(nextStyle, 'fillColor', fillColor);
    if (strokeColor) nextStyle = mxUtils.setStyle(nextStyle, 'strokeColor', strokeColor);
    if (rotation !== '') nextStyle = mxUtils.setStyle(nextStyle, 'rotation', rotation);
    if (fontSize !== '') nextStyle = mxUtils.setStyle(nextStyle, 'fontSize', fontSize);
    nextStyle = makeInterfaceStyle(nextStyle, markerMeta);
    model.setStyle(cell, nextStyle);

    if (global.DftsIP && global.DftsIP.Symbol) {
      try {
        var sym = global.DftsIP.Symbol;
        var symModel = sym.getModel && sym.getModel(cell);
        if (symModel) {
          symModel = Shared.cloneJson(symModel);
          if (!symModel.transform) symModel.transform = {};
          if (rotation !== '') symModel.transform.rotation = Number(rotation || 0);
          if (sym.setModel) sym.setModel(cell, symModel);
          if (sym.relayout) sym.relayout(graph, cell);
        }
      } catch (e) {
        emitDesignLog('interface-marker-appearance-error', {
          moduleName: markerMeta && markerMeta.moduleName || '',
          layerName: markerMeta && markerMeta.layerName || '',
          interfaceType: markerMeta && markerMeta.interfaceType || '',
          error: e && e.message ? e.message : String(e)
        });
      }
    }

    emitDesignLog('interface-marker-appearance-applied', {
      moduleName: markerMeta && markerMeta.moduleName || '',
      layerName: markerMeta && markerMeta.layerName || '',
      interfaceType: markerMeta && markerMeta.interfaceType || '',
      sourceGeometry: sourceGeo ? {
        width: Number(sourceGeo.width || 0),
        height: Number(sourceGeo.height || 0)
      } : null,
      resultGeometry: cell.geometry ? {
        width: Number(cell.geometry.width || 0),
        height: Number(cell.geometry.height || 0)
      } : null,
      sourceStyle: {
        fillColor: fillColor,
        strokeColor: strokeColor,
        rotation: rotation,
        fontSize: fontSize
      },
      resultStyle: String(cell.style || '').slice(0, 260)
    });
  }

  function cloneInterfaceCellFromSource(sourceCell, markerMeta) {
    if (!sourceCell || typeof sourceCell.clone !== 'function') return null;
    var sourceStyle = String(sourceCell.style || '');
    if (sourceStyle.indexOf('flowMarker=1') >= 0) return null;
    if (sourceStyle.indexOf('dftsType=') < 0 && sourceStyle.indexOf('dftsIP_type=') < 0 && sourceStyle.indexOf('dftsIP_symbolModel=') < 0) {
      return null;
    }
    emitDesignLog('clone-interface-source', {
      moduleName: markerMeta && markerMeta.moduleName || '',
      layerName: markerMeta && markerMeta.layerName || '',
      interfaceType: markerMeta && markerMeta.interfaceType || '',
      sourceCellId: sourceCell.id || '',
      sourceStyle: sourceStyle.slice(0, 260),
      sourceGeometry: sourceCell.geometry ? {
        x: Number(sourceCell.geometry.x || 0),
        y: Number(sourceCell.geometry.y || 0),
        width: Number(sourceCell.geometry.width || 0),
        height: Number(sourceCell.geometry.height || 0)
      } : null
    });
    var cloned = sourceCell.clone();
    resetCellTreeIds(cloned);
    cloned.style = makeInterfaceStyle(cloned.style || '', markerMeta);
    if (cloned.geometry) {
      cloned.geometry = new mxGeometry(
        Number(cloned.geometry.x || 0),
        Number(cloned.geometry.y || 0),
        Number(cloned.geometry.width || 190),
        Number(cloned.geometry.height || 40)
      );
    } else {
      cloned.geometry = new mxGeometry(0, 0, 190, 40);
    }
    cloned.__flowDesignMarkerMeta = Shared.cloneJson(markerMeta);
    emitDesignLog('clone-interface-result', {
      moduleName: markerMeta && markerMeta.moduleName || '',
      layerName: markerMeta && markerMeta.layerName || '',
      interfaceType: markerMeta && markerMeta.interfaceType || '',
      geometry: cloned.geometry ? {
        x: Number(cloned.geometry.x || 0),
        y: Number(cloned.geometry.y || 0),
        width: Number(cloned.geometry.width || 0),
        height: Number(cloned.geometry.height || 0)
      } : null,
      style: String(cloned.style || '').slice(0, 260)
    });
    return cloned;
  }

  function createInterfaceCell(graph, markerEntry) {
    var markerMeta = markerEntry && markerEntry.meta ? markerEntry.meta : markerEntry;
    var sourceCell = markerEntry && markerEntry.cell ? markerEntry.cell : null;
    var cloned = cloneInterfaceCellFromSource(sourceCell, markerMeta);
    if (cloned) {
      emitDesignLog('create-interface-using-clone', {
        moduleName: markerMeta && markerMeta.moduleName || '',
        layerName: markerMeta && markerMeta.layerName || '',
        interfaceType: markerMeta && markerMeta.interfaceType || ''
      });
      return cloned;
    }
    if (!global.DftsIP || typeof global.DftsIP.createByKey !== 'function') {
      throw new Error('DftsIP.createByKey is required to build interface designs.');
    }
    var key = interfaceKeyFromMarker(markerMeta);
    if (!key) throw new Error('Unsupported interface marker type: ' + String(markerMeta && markerMeta.layerName || '') + '/' + String(markerMeta && markerMeta.interfaceType || ''));
    emitDesignLog('create-interface-using-factory', {
      moduleName: markerMeta && markerMeta.moduleName || '',
      layerName: markerMeta && markerMeta.layerName || '',
      interfaceType: markerMeta && markerMeta.interfaceType || '',
      key: key,
      sourceCellId: sourceCell && sourceCell.id ? sourceCell.id : '',
      sourceStyle: String(sourceCell && sourceCell.style || '').slice(0, 220)
    });
    var cell = global.DftsIP.createByKey(graph, key, {
      label: interfaceTitleFromMarker(markerMeta),
      bodyLabel: interfaceTitleFromMarker(markerMeta),
      pinLabel: markerMeta.sourceInstance || markerMeta.moduleName || '',
      deviceLabel: markerMeta.sourceInstance || markerMeta.moduleName || '',
      pdg: markerMeta.layerName || '',
      busWidth: 4
    });
    var geo = cell.geometry || new mxGeometry(0, 0, 190, 40);
    cell.geometry = new mxGeometry(0, 0, Number(geo.width || 190), Number(geo.height || 40));
    cell.style = makeInterfaceStyle(cell.style || '', markerMeta);
    if (markerMeta.side === 'left') cell.style = mxUtils.setStyle(cell.style || '', 'rotation', '270');
    else if (markerMeta.side === 'right') cell.style = mxUtils.setStyle(cell.style || '', 'rotation', '90');
    else if (markerMeta.side === 'bottom') cell.style = mxUtils.setStyle(cell.style || '', 'rotation', '180');
    else cell.style = mxUtils.setStyle(cell.style || '', 'rotation', '0');
    cell.__flowDesignMarkerMeta = Shared.cloneJson(markerMeta);
    emitDesignLog('create-interface-factory-result', {
      moduleName: markerMeta && markerMeta.moduleName || '',
      layerName: markerMeta && markerMeta.layerName || '',
      interfaceType: markerMeta && markerMeta.interfaceType || '',
      geometry: cell.geometry ? {
        x: Number(cell.geometry.x || 0),
        y: Number(cell.geometry.y || 0),
        width: Number(cell.geometry.width || 0),
        height: Number(cell.geometry.height || 0)
      } : null,
      style: String(cell.style || '').slice(0, 260)
    });
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

  function parsePolyPoints(styleText, width, height) {
    var parts = String(styleText || '').split(';');
    var raw = '';
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i];
      var idx = seg.indexOf('=');
      if (idx <= 0) continue;
      if (seg.slice(0, idx).trim() === 'polyPoints') {
        raw = seg.slice(idx + 1).trim();
        break;
      }
    }
    if (!raw) return [];
    var tokens = raw.split(/\s+/);
    var out = [];
    for (var j = 0; j < tokens.length; j++) {
      var xy = tokens[j].split(',');
      if (xy.length < 2) continue;
      var x = Number(xy[0]);
      var y = Number(xy[1]);
      if (!isFinite(x) || !isFinite(y)) continue;
      out.push({ x: x * width, y: y * height });
    }
    return out;
  }

  function segmentAxisHit(a, b, axis, value) {
    if (!a || !b) return null;
    if (axis === 'y') {
      var ay = Number(a.y), by = Number(b.y);
      if (ay === by || value < Math.min(ay, by) || value > Math.max(ay, by)) return null;
      var ty = (value - ay) / (by - ay);
      return { x: Number(a.x) + (Number(b.x) - Number(a.x)) * ty, y: value };
    }
    var ax = Number(a.x), bx = Number(b.x);
    if (ax === bx || value < Math.min(ax, bx) || value > Math.max(ax, bx)) return null;
    var tx = (value - ax) / (bx - ax);
    return { x: value, y: Number(a.y) + (Number(b.y) - Number(a.y)) * tx };
  }

  function boundaryAnchorForSide(bodyCell, side, offset) {
    var geo = bodyCell && bodyCell.geometry;
    if (!geo) return null;
    var width = Number(geo.width || 0);
    var height = Number(geo.height || 0);
    var points = parsePolyPoints(bodyCell.style || '', width, height);
    if (!points.length) return null;
    var axis = (side === 'left' || side === 'right') ? 'y' : 'x';
    var target = axis === 'y' ? (offset * height) : (offset * width);
    var hits = [];
    for (var i = 0; i < points.length; i++) {
      var a = points[i];
      var b = points[(i + 1) % points.length];
      var hit = segmentAxisHit(a, b, axis, target);
      if (hit) hits.push(hit);
    }
    if (!hits.length) return null;
    var best = hits[0];
    for (var j = 1; j < hits.length; j++) {
      if (side === 'left' && hits[j].x < best.x) best = hits[j];
      else if (side === 'right' && hits[j].x > best.x) best = hits[j];
      else if (side === 'top' && hits[j].y < best.y) best = hits[j];
      else if (side === 'bottom' && hits[j].y > best.y) best = hits[j];
    }
    return { x: Number(geo.x || 0) + best.x, y: Number(geo.y || 0) + best.y };
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

  function relativeInterfacePlacement(sourceModuleCell, markerEntry) {
    var srcModuleGeo = sourceModuleCell && sourceModuleCell.geometry;
    var srcCell = markerEntry && markerEntry.cell;
    var srcGeo = srcCell && srcCell.geometry;
    if (!srcModuleGeo || !srcGeo) return null;
    var out = {
      x: Number(srcGeo.x || 0) - Number(srcModuleGeo.x || 0),
      y: Number(srcGeo.y || 0) - Number(srcModuleGeo.y || 0)
    };
    emitDesignLog('relative-interface-placement', {
      moduleName: markerEntry && markerEntry.meta ? markerEntry.meta.moduleName || '' : '',
      layerName: markerEntry && markerEntry.meta ? markerEntry.meta.layerName || '' : '',
      interfaceType: markerEntry && markerEntry.meta ? markerEntry.meta.interfaceType || '' : '',
      sourceModuleGeo: {
        x: Number(srcModuleGeo.x || 0),
        y: Number(srcModuleGeo.y || 0),
        width: Number(srcModuleGeo.width || 0),
        height: Number(srcModuleGeo.height || 0)
      },
      sourceInterfaceGeo: {
        x: Number(srcGeo.x || 0),
        y: Number(srcGeo.y || 0),
        width: Number(srcGeo.width || 0),
        height: Number(srcGeo.height || 0)
      },
      relative: out
    });
    return out;
  }

  function positionInterfacesAroundBody(bodyRect, bySide, prototypes, bodyCell, sourceModuleCell) {
    var placements = [];

    function placeSide(side, list) {
      for (var i = 0; i < list.length; i++) {
        var entry = list[i];
        var cell = prototypes[entry.meta.id];
        if (!cell) continue;
        var size = interfaceVisualSize(cell, side);
        var relative = relativeInterfacePlacement(sourceModuleCell, entry);
        if (relative) {
          placements.push({
            marker: entry,
            cell: cell,
            x: Math.round(bodyRect.x + relative.x),
            y: Math.round(bodyRect.y + relative.y)
          });
          continue;
        }
        var offset = Number(entry.meta.bundleCenterOffset != null ? entry.meta.bundleCenterOffset : entry.meta.offset);
        if (!isFinite(offset)) offset = (i + 1) / (list.length + 1);
        var x = bodyRect.x;
        var y = bodyRect.y;
        var anchor = bodyCell ? boundaryAnchorForSide(bodyCell, side, offset) : null;
        if (anchor) {
          if (side === 'left') {
            x = Math.round(anchor.x - size.width - 12);
            y = Math.round(anchor.y - size.height / 2);
          } else if (side === 'right') {
            x = Math.round(anchor.x + 12);
            y = Math.round(anchor.y - size.height / 2);
          } else if (side === 'top') {
            x = Math.round(anchor.x - size.width / 2);
            y = Math.round(anchor.y - size.height - 12);
          } else {
            x = Math.round(anchor.x - size.width / 2);
            y = Math.round(anchor.y + 12);
          }
        } else if (side === 'left') {
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
    emitDesignLog('materialize-start', {
      moduleName: moduleName,
      includeInterfaces: opts.includeInterfaces !== false,
      markerCount: Array.isArray(markerEntries) ? markerEntries.length : 0,
      activeCtx: ui && ui._activeProjectPageCtx ? {
        name: ui._activeProjectPageCtx.name,
        abs: ui._activeProjectPageCtx.abs || ''
      } : null,
      before: currentGraphSummary(ui)
    });
    clearCurrentGraph(ui);
    emitDesignLog('after-clear', currentGraphSummary(ui));
    var graph = Shared.graphOf(ui);
    var parent = Shared.getDefaultParent(ui);
    if (!graph || !parent) throw new Error('Graph is not ready for materialization.');

    var metrics = pageMetrics(graph);
    var includeInterfaces = opts.includeInterfaces !== false;
    var entries = Array.isArray(markerEntries) ? markerEntries : [];
    var bySide = countBySide(entries);
    var interfacePrototypes = {};
    if (includeInterfaces) {
      for (var i = 0; i < entries.length; i++) {
        try {
          interfacePrototypes[entries[i].meta.id] = createInterfaceCell(graph, entries[i]);
        } catch (protoErr) {
          emitDesignLog('interface-prototype-error', {
            moduleName: moduleName,
            pageName: ui && ui._activeProjectPageCtx ? ui._activeProjectPageCtx.name || '' : '',
            index: i,
            markerMeta: entries[i] && entries[i].meta ? entries[i].meta : null,
            error: protoErr && protoErr.message ? protoErr.message : String(protoErr),
            stack: protoErr && protoErr.stack ? String(protoErr.stack) : ''
          });
          throw protoErr;
        }
      }
    }

    var sourceModuleCell = opts.sourceModuleCell || null;
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
      var body = addCellAt(graph, parent, createFloorplanModuleCell(graph, moduleName, bodyRect.width, bodyRect.height, sourceModuleCell), bodyRect.x, bodyRect.y);
      emitDesignLog('body-added', {
        moduleName: moduleName,
        pageName: ui && ui._activeProjectPageCtx ? ui._activeProjectPageCtx.name || '' : '',
        bodyGeo: body && body.geometry ? {
          x: Number(body.geometry.x || 0),
          y: Number(body.geometry.y || 0),
          width: Number(body.geometry.width || 0),
          height: Number(body.geometry.height || 0)
        } : null,
        graph: currentGraphSummary(ui)
      });
      var addedInterfaces = [];
      if (includeInterfaces) {
        var placements = positionInterfacesAroundBody(bodyRect, bySide, interfacePrototypes, body, sourceModuleCell);
        emitDesignLog('interface-placements', {
          moduleName: moduleName,
          pageName: ui && ui._activeProjectPageCtx ? ui._activeProjectPageCtx.name || '' : '',
          placements: placements.map(function (it) {
            return {
              markerId: it && it.marker && it.marker.meta ? it.marker.meta.id || '' : '',
              side: it && it.marker && it.marker.meta ? it.marker.meta.side || '' : '',
              layer: it && it.marker && it.marker.meta ? it.marker.meta.layerName || '' : '',
              x: it ? it.x : null,
              y: it ? it.y : null,
              width: it && it.cell && it.cell.geometry ? Number(it.cell.geometry.width || 0) : null,
              height: it && it.cell && it.cell.geometry ? Number(it.cell.geometry.height || 0) : null
            };
          })
        });
        for (var p = 0; p < placements.length; p++) {
          var addedInterface = addCellAt(graph, parent, placements[p].cell, placements[p].x, placements[p].y);
          applyMarkerAppearanceToInterface(graph, addedInterface, placements[p].marker && placements[p].marker.cell ? placements[p].marker.cell : null, placements[p].marker && placements[p].marker.meta ? placements[p].marker.meta : null);
          addedInterfaces.push(addedInterface);
        }
      }
      emitDesignLog('interfaces-added', {
        moduleName: moduleName,
        pageName: ui && ui._activeProjectPageCtx ? ui._activeProjectPageCtx.name || '' : '',
        interfaceCount: addedInterfaces.length,
        graph: currentGraphSummary(ui)
      });
      var shellChildren = [body].concat(addedInterfaces);
      lockChildrenStyles(graph, shellChildren);
      var shell = buildShellGroup(graph, moduleName, shellChildren);
      emitDesignLog('shell-built', {
        moduleName: moduleName,
        pageName: ui && ui._activeProjectPageCtx ? ui._activeProjectPageCtx.name || '' : '',
        hasShell: !!shell,
        shellId: shell && shell.id ? shell.id : '',
        graph: currentGraphSummary(ui)
      });
      return { body: body, interfaces: addedInterfaces, shell: shell };
    } catch (err) {
      emitDesignLog('materialize-error', {
        moduleName: moduleName,
        pageName: ui && ui._activeProjectPageCtx ? ui._activeProjectPageCtx.name || '' : '',
        includeInterfaces: includeInterfaces,
        markerCount: entries.length,
        error: err && err.message ? err.message : String(err),
        stack: err && err.stack ? String(err.stack) : '',
        graph: currentGraphSummary(ui)
      });
      throw err;
    } finally {
      graph.getModel().endUpdate();
      emitDesignLog('materialize-end', {
        moduleName: moduleName,
        pageName: ui && ui._activeProjectPageCtx ? ui._activeProjectPageCtx.name || '' : '',
        graph: currentGraphSummary(ui)
      });
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
    var modulePlans = analysis && analysis.interfacePlan && analysis.interfacePlan.modulePlans ? analysis.interfacePlan.modulePlans : {};
    try {
      for (var i = 0; i < moduleNames.length; i++) {
        var moduleName = moduleNames[i];
        var markerEntries = designInputs[moduleName];
        var layerInputs = groupMarkersByLayer(markerEntries);
        var modulePlan = modulePlans[moduleName] || null;
        var sourceModuleCell = modulePlan && modulePlan.moduleCell ? modulePlan.moduleCell : null;
        var ensured = await ensureTopLevelDesign(ui, moduleName);
        var design = ensured.design;
        var floorplan = ensureFloorplanContainer(ui, design);
        var shellPageName = Shared.sanitizeName ? (Shared.sanitizeName(moduleName) + '_floorplan') : (String(moduleName).replace(/[^a-zA-Z0-9]+/g, '_') + '_floorplan');
        if (floorplan) {
          await ensurePage(ui, floorplan, shellPageName);
          await withOpenedPage(ui, floorplan, shellPageName, (function () {
            return async function () {
              await materializeModulePage(ui, moduleName, [], {
                includeInterfaces: false,
                sourceModuleCell: sourceModuleCell
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
          await withOpenedPage(ui, design, pageName, (function (currentPageName, currentPageMarkers, currentSourceModuleCell) {
            return async function () {
              await materializeModulePage(ui, moduleName, currentPageMarkers, {
                includeInterfaces: true,
                sourceModuleCell: currentSourceModuleCell
              });
            };
          })(pageName, pageMarkers, sourceModuleCell));
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
