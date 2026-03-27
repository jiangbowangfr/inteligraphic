(function (global) {
  'use strict';

  var Mod = global.DFTFlowNavMod = global.DFTFlowNavMod || {};
  var Shared = Mod.Shared;
  var Analysis = Mod.Analysis;
  var Markers = Mod.Markers;
  var Designs = Mod.Designs = Mod.Designs || {};
  var MODULE_LAYER_ORDER = ['base', 'ssn', 'bscan', 'ijtag', 'bisr', 'other'];
  var MODULE_INTERFACE_LAYER_ORDER = ['ssn', 'bscan', 'ijtag', 'bisr', 'other'];
  var MODULE_INTERFACE_OUTER_GAP = 0;
  var MODULE_INTERFACE_EDGE_OVERLAP = 0;
  var GENERATED_INTERFACE_DEFAULT_WIDTH = 44;
  var GENERATED_INTERFACE_DEFAULT_HEIGHT = 30;
  if (!Shared || !Analysis) throw new Error('flow_nav_shared.js and flow_nav_analysis.js must be loaded before flow_nav_designs.js');

  function findTopLevelDesign(ui, name) {
    var pm = Shared.getProject(ui);
    var designs = pm && Array.isArray(pm.designs) ? pm.designs : [];
    for (var i = 0; i < designs.length; i++) {
      if (designs[i] && designs[i].__kind !== 'floorplan-container' && designs[i].name === name) return designs[i];
    }
    return null;
  }

  function normalizePathText(value) {
    return String(value == null ? '' : value).replace(/\\/g, '/').replace(/\/+$/, '');
  }

  function designDirKey(design) {
    if (!design) return '';
    if (Array.isArray(design._dirRel) && design._dirRel.length) return design._dirRel.join('/');
    if (design._absDir) return normalizePathText(design._absDir);
    return '';
  }

  function sameDesignRef(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    var aDirKey = designDirKey(a);
    var bDirKey = designDirKey(b);
    if (aDirKey && bDirKey && aDirKey === bDirKey) return true;
    var aKind = String(a.__kind || '').toLowerCase();
    var bKind = String(b.__kind || '').toLowerCase();
    if (aKind && bKind && aKind === bKind && String(a.name || '') === String(b.name || '')) {
      var aAbs = normalizePathText(a._absDir || '');
      var bAbs = normalizePathText(b._absDir || '');
      if (aAbs && bAbs && aAbs === bAbs) return true;
    }
    return false;
  }

  function walkProjectDesigns(ui, visitor) {
    var roots = ((Shared.getProject(ui) || {}).designs || []);
    function walk(design, parentDesign) {
      if (!design) return null;
      var result = visitor(design, parentDesign);
      if (result) return result;
      if (design._containers) {
        result = walk(design._containers.floorplan, design);
        if (result) return result;
        result = walk(design._containers.ipconfig, design);
        if (result) return result;
      }
      var kids = Array.isArray(design.sub_designs) ? design.sub_designs : [];
      for (var i = 0; i < kids.length; i++) {
        result = walk(kids[i], design);
        if (result) return result;
      }
      return null;
    }
    for (var i = 0; i < roots.length; i++) {
      var match = walk(roots[i], null);
      if (match) return match;
    }
    return null;
  }

  function resolveProjectDesignRef(ui, designRef) {
    if (!designRef) return null;
    return walkProjectDesigns(ui, function (candidate) {
      return sameDesignRef(candidate, designRef) ? candidate : null;
    }) || null;
  }

  function findParentDesign(ui, childRef, list) {
    childRef = resolveProjectDesignRef(ui, childRef) || childRef;
    if (!childRef) return null;
    if (!Array.isArray(list)) {
      return walkProjectDesigns(ui, function (candidate, parentDesign) {
        return sameDesignRef(candidate, childRef) ? (parentDesign || null) : null;
      });
    }
    for (var i = 0; i < list.length; i++) {
      var design = list[i];
      if (!design) continue;
      if (design._containers) {
        if (sameDesignRef(design._containers.floorplan, childRef) || sameDesignRef(design._containers.ipconfig, childRef)) return design;
      }
      var kids = Array.isArray(design.sub_designs) ? design.sub_designs : [];
      for (var j = 0; j < kids.length; j++) {
        if (sameDesignRef(kids[j], childRef)) return design;
      }
      var found = findParentDesign(ui, childRef, kids);
      if (found) return found;
    }
    return null;
  }

  function findDesignByName(list, name) {
    list = Array.isArray(list) ? list : [];
    for (var i = 0; i < list.length; i++) {
      var design = list[i];
      if (!design) continue;
      if (String(design.name || '') === String(name || '')) return design;
      var found = findDesignByName(design.sub_designs, name);
      if (found) return found;
    }
    return null;
  }

  function getGenerationOwner(ui) {
    var ctx = ui && ui._activeProjectPageCtx ? ui._activeProjectPageCtx : null;
    var designRef = ctx && ctx.designRef ? ctx.designRef : (Shared.getCurrentDesign ? Shared.getCurrentDesign(ui) : null);
    if (!designRef) return null;
    designRef = resolveProjectDesignRef(ui, designRef) || designRef;
    var kind = String(designRef.__kind || '').toLowerCase();
    if (kind === 'module-design') return designRef;
    if (kind === 'floorplan-container') return findParentDesign(ui, designRef);
    return null;
  }

  function normalizeModuleDesignShape(design) {
    if (!design) return design;
    design.__kind = 'module-design';
    design.env_file = '';
    var kids = Array.isArray(design.sub_designs) ? design.sub_designs : [];
    design.sub_designs = kids.filter(function (child) {
      if (!child) return false;
      var kind = String(child.__kind || '').toLowerCase();
      var name = String(child.name || '').trim().toLowerCase();
      return kind !== 'ipconfig-container' &&
        kind !== 'floorplan-container' &&
        name !== 'ipconfig' &&
        name !== 'floorplan';
    });
    if (design._containers) {
      delete design._containers.floorplan;
      delete design._containers.ipconfig;
    }
    return design;
  }

  function getProjectRoot(ui) {
    var pm = Shared.getProject(ui);
    return (pm && pm.path) || ui._projectRootPath || ui._projectYamlDir || '';
  }

  async function ensureTopLevelDesign(ui, name, parentDesign) {
    var existing = findDesignByName((Shared.getProject(ui) || {}).designs || [], name);
    if (existing) return { design: normalizeModuleDesignShape(existing), created: false };
    var root = getProjectRoot(ui);
    if (!root) throw new Error('Project root path is unavailable.');
    if (!global.DFTProjectExplorerPhase2 || typeof global.DFTProjectExplorerPhase2.createDesignInContext !== 'function') {
      throw new Error('Project Explorer createDesignInContext helper is not available.');
    }
    var design = await global.DFTProjectExplorerPhase2.createDesignInContext(ui, parentDesign || null, name, null, { kind: 'module-design' });
    design.__kind = 'module-design';
    return { design: normalizeModuleDesignShape(design), created: true };
  }

  async function promptForUniqueModuleNames(ui, moduleNames, parentDesign) {
    var project = Shared.getProject(ui) || {};
    var roots = Array.isArray(project.designs) ? project.designs : [];
    var used = Object.create(null);
    var out = [];
    for (var i = 0; i < moduleNames.length; i++) {
      var original = String(moduleNames[i] || '').trim();
      if (!original) continue;
      var candidate = original;
      while (true) {
        var existing = findDesignByName(roots, candidate);
        var conflictWithProject = existing && existing !== parentDesign && findParentDesign(ui, existing) !== parentDesign;
        var conflictInBatch = !!used[candidate];
        if (!conflictWithProject && !conflictInBatch) break;
        if (!global.DFTProjectExplorerPhase2 || typeof global.DFTProjectExplorerPhase2.promptValue !== 'function') {
          throw new Error('Duplicate module name: ' + candidate);
        }
        candidate = await global.DFTProjectExplorerPhase2.promptValue(
          ui,
          'Rename module "' + original + '"',
          'Enter a unique module name',
          candidate
        );
        candidate = String(candidate || '').trim();
        var nameError = global.DFTProjectExplorerPhase2.validateScopedName
          ? global.DFTProjectExplorerPhase2.validateScopedName(candidate, 'Module name', { disallowReserved: true })
          : '';
        if (!candidate) throw new Error('Module generation cancelled.');
        if (nameError) {
          global.alert(nameError);
          continue;
        }
      }
      used[candidate] = true;
      out.push(candidate);
    }
    return out;
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
        if (global.console && typeof global.console.debug === 'function') {
          var graph = Shared.graphOf(ui);
          var parent = Shared.getDefaultParent(ui);
          var savedCells = [];
          if (graph && parent && graph.getModel) {
            var model = graph.getModel();
            var count = model.getChildCount(parent);
            for (var i = 0; i < count; i++) {
              var cell = model.getChildAt(parent, i);
              savedCells.push({
                id: cell && cell.id ? cell.id : '',
                value: cell && cell.value != null ? String(cell.value).slice(0, 80) : '',
                style: cell && cell.style ? String(cell.style) : '',
                geo: cell && cell.geometry ? {
                  x: Number(cell.geometry.x || 0),
                  y: Number(cell.geometry.y || 0),
                  width: Number(cell.geometry.width || 0),
                  height: Number(cell.geometry.height || 0)
                } : null
              });
            }
          }
          global.console.debug('[FlowNavDesigns] before saveActivePage', {
            designName: design && design.name ? design.name : '',
            pageName: pageName,
            cells: savedCells
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

  function clearParentContents(graph, parent) {
    if (!graph || !parent || !graph.getModel) return;
    var model = graph.getModel();
    var doomed = [];
    var childCount = model.getChildCount(parent);
    for (var i = 0; i < childCount; i++) doomed.push(model.getChildAt(parent, i));
    if (!doomed.length) return;
    graph.removeCells(doomed, false);
  }

  function ensureNamedLayers(ui, layerNames) {
    var graph = Shared.graphOf(ui);
    var model = graph && graph.getModel ? graph.getModel() : null;
    var defaultParent = Shared.getDefaultParent(ui);
    var layerRoot = Shared.getLayerRoot ? Shared.getLayerRoot(ui) : null;
    var out = Object.create(null);
    if (!graph || !model || !defaultParent) return out;
    if (!layerRoot) {
      out[String(layerNames && layerNames[0] || 'default').toLowerCase()] = defaultParent;
      return out;
    }

    var existing = Shared.getTopLevelLayers ? Shared.getTopLevelLayers(ui) : [];
    var unnamedDefault = existing.length === 1 && !String(Shared.getLayerName(existing[0]) || '').trim() ? existing[0] : null;
    model.beginUpdate();
    try {
      for (var i = 0; i < layerNames.length; i++) {
        var layerName = String(layerNames[i] || '').trim();
        if (!layerName) continue;
        var normalized = layerName.toLowerCase();
        var layerCell = null;
        for (var j = 0; j < existing.length; j++) {
          if (String(Shared.getLayerName(existing[j]) || '').trim().toLowerCase() === normalized) {
            layerCell = existing[j];
            break;
          }
        }
        if (!layerCell && unnamedDefault) {
          layerCell = unnamedDefault;
          model.setValue(layerCell, layerName);
          unnamedDefault = null;
        }
        if (!layerCell) {
          layerCell = new mxCell(layerName);
          layerCell.setVisible(true);
          layerCell.setConnectable(false);
          model.add(layerRoot, layerCell);
          existing.push(layerCell);
        }
        out[normalized] = layerCell;
      }
    } finally {
      model.endUpdate();
    }
    return out;
  }

  function isFlowModuleShell(cell) {
    return !!cell && String(Shared.styleValue(cell.style || '', 'flowModuleShell', '0')) === '1';
  }

  function isGeneratedModuleBody(cell) {
    if (!cell) return false;
    var style = String(cell.style || '');
    return String(Shared.styleValue(style, 'dftsFlowNavGeneratedModule', '0')) === '1';
  }

  function trimString(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalizeGeneratedInterfaceMeta(meta, graph, cell) {
    if (!meta || typeof meta !== 'object') return null;
    var out = {
      moduleName: trimString(meta.moduleName || meta.sourceModule || ''),
      layerName: trimString(meta.layerName || ''),
      interfaceType: trimString(meta.interfaceType || ''),
      pairId: trimString(meta.pairId || ''),
      side: trimString(meta.side || ''),
      bundleId: trimString(meta.bundleId || ''),
      chainId: trimString(meta.chainId || ''),
      sideStackIndex: Number(meta.sideStackIndex == null || meta.sideStackIndex === '' ? 0 : meta.sideStackIndex),
      id: trimString(meta.id || meta.markerId || '')
    };
    if (!isFinite(out.sideStackIndex)) out.sideStackIndex = 0;
    if ((!out.moduleName || !out.layerName || !out.interfaceType) && graph && cell) {
      var style = String(cell.style || '');
      if (!out.moduleName) out.moduleName = trimString(Shared.styleValue(style, 'flowModule', '') || Shared.styleValue(style, 'dftsFloorplan_moduleName', '') || '');
      if (!out.layerName) out.layerName = trimString(Shared.styleValue(style, 'flowLayer', '') || '');
      if (!out.interfaceType) out.interfaceType = trimString(Shared.styleValue(style, 'flowInterfaceType', '') || '');
    }
    if (!out.moduleName || !out.layerName || !out.interfaceType) return null;
    return out;
  }

  function readPersistedGeneratedInterfaceMeta(graph, cell) {
    if (!cell || typeof cell !== 'object') return null;
    var candidates = [];
    if (cell.__flowDesignMarkerMeta && typeof cell.__flowDesignMarkerMeta === 'object') candidates.push(cell.__flowDesignMarkerMeta);
    if (cell.value && typeof cell.value === 'object') candidates.push(cell.value);
    for (var key in cell) {
      if (!Object.prototype.hasOwnProperty.call(cell, key)) continue;
      if (key === '__flowDesignMarkerMeta' || key === 'value' || key === 'children' || key === 'parent' || key === 'source' || key === 'target') continue;
      var value = cell[key];
      if (!value || typeof value !== 'object') continue;
      if (value.moduleName || value.layerName || value.interfaceType || value.sourceModule) candidates.push(value);
    }
    for (var i = 0; i < candidates.length; i++) {
      var normalized = normalizeGeneratedInterfaceMeta(candidates[i], graph, cell);
      if (normalized) return normalized;
    }
    return null;
  }

  function isGeneratedDesignInterface(cell) {
    if (!cell) return false;
    if (readPersistedGeneratedInterfaceMeta(null, cell)) return true;
    return String(Shared.styleValue(cell.style || '', 'flowGeneratedDesignInterface', '0')) === '1';
  }

  function moduleNameForCell(cell) {
    if (!cell) return '';
    var style = String(cell.style || '');
    return String(
      Shared.styleValue(style, 'flowModule', '') ||
      Shared.styleValue(style, 'dftsFloorplan_moduleName', '') ||
      cell.value ||
      ''
    ).trim();
  }

  function getTopLevelLayersForGraph(graph) {
    if (!graph || !graph.getModel || !graph.getDefaultParent) return [];
    var model = graph.getModel();
    var defaultParent = graph.getDefaultParent();
    var layerRoot = null;
    try {
      layerRoot = model && defaultParent ? model.getParent(defaultParent) : null;
    } catch (e) {
      layerRoot = null;
    }
    if (!layerRoot) return defaultParent ? [defaultParent] : [];
    var out = [];
    try {
      var count = model.getChildCount(layerRoot);
      for (var i = 0; i < count; i++) {
        var child = model.getChildAt(layerRoot, i);
        if (child) out.push(child);
      }
    } catch (e2) {}
    return out.length ? out : (defaultParent ? [defaultParent] : []);
  }

  function isDescendantOf(model, cell, ancestor) {
    if (!model || !cell || !ancestor) return false;
    var cur = cell;
    while (cur) {
      if (cur === ancestor) return true;
      try {
        cur = model.getParent(cur);
      } catch (e) {
        cur = null;
      }
    }
    return false;
  }

  function isDescendantOfAny(model, cell, ancestors) {
    if (!ancestors || !ancestors.length) return false;
    for (var i = 0; i < ancestors.length; i++) {
      if (isDescendantOf(model, cell, ancestors[i])) return true;
    }
    return false;
  }

  function collectModuleInterfacesForTransform(graph, moduleName, excludedRoots) {
    if (!graph || !moduleName) return [];
    var model = graph.getModel ? graph.getModel() : null;
    if (!model) return [];
    var layers = getTopLevelLayersForGraph(graph);
    var vertices = [];
    for (var i = 0; i < layers.length; i++) collectVertices(layers[i], model, vertices);
    var out = [];
    for (var j = 0; j < vertices.length; j++) {
      var cell = vertices[j];
      if (!isGeneratedDesignInterface(cell)) continue;
      var meta = extractGeneratedInterfaceMeta(graph, cell);
      if (!meta || String(meta.moduleName || '').trim() !== moduleName) continue;
      if (isDescendantOfAny(model, cell, excludedRoots)) continue;
      out.push(cell);
    }
    emitDesignLog('collect-module-interfaces-for-transform', {
      moduleName: moduleName,
      layerCount: layers.length,
      excludedRootIds: (excludedRoots || []).map(function (cell) { return cell && cell.id ? cell.id : ''; }),
      matchedCount: out.length,
      matches: out.map(function (cell) {
        var meta = extractGeneratedInterfaceMeta(graph, cell);
        var geo = model.getGeometry(cell);
        return {
          cellId: cell && cell.id ? cell.id : '',
          moduleName: meta && meta.moduleName ? meta.moduleName : '',
          layerName: meta && meta.layerName ? meta.layerName : '',
          interfaceType: meta && meta.interfaceType ? meta.interfaceType : '',
          x: geo ? Number(geo.x || 0) : null,
          y: geo ? Number(geo.y || 0) : null,
          width: geo ? Number(geo.width || 0) : null,
          height: geo ? Number(geo.height || 0) : null
        };
      })
    });
    return out;
  }

  function pushUniqueCells(target, cells) {
    target = Array.isArray(target) ? target : [];
    cells = Array.isArray(cells) ? cells : [];
    for (var i = 0; i < cells.length; i++) {
      if (cells[i] && target.indexOf(cells[i]) < 0) target.push(cells[i]);
    }
    return target;
  }

  function collectLinkedModuleMoveCells(graph, cells) {
    var out = Array.isArray(cells) ? cells.slice() : [];
    if (!graph || !out.length) return out;
    var handledModules = Object.create(null);
    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      if (!isFlowModuleShell(cell) && !isGeneratedModuleBody(cell)) continue;
      var moduleName = moduleNameForCell(cell);
      if (!moduleName || handledModules[moduleName]) continue;
      handledModules[moduleName] = true;
      pushUniqueCells(out, collectModuleInterfacesForTransform(graph, moduleName, [cell]));
    }
    return out;
  }

  function movedCellsContainLinkedInterfaces(graph, cells, moduleName, excludedRoots) {
    if (!graph || !moduleName || !cells || !cells.length) return false;
    var model = graph.getModel ? graph.getModel() : null;
    if (!model) return false;
    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      if (!isGeneratedDesignInterface(cell)) continue;
      var meta = extractGeneratedInterfaceMeta(graph, cell);
      if (!meta || String(meta.moduleName || '').trim() !== moduleName) continue;
      if (isDescendantOfAny(model, cell, excludedRoots)) continue;
      return true;
    }
    return false;
  }

  function cloneRectLike(geo) {
    return geo && geo.clone ? geo.clone() : new mxGeometry(geo.x, geo.y, geo.width, geo.height);
  }

  function toAbsoluteRect(model, cell, geo) {
    var out = cloneRectLike(geo);
    var cur = cell;
    while (cur && model) {
      try {
        cur = model.getParent(cur);
      } catch (e0) {
        cur = null;
      }
      if (!cur) break;
      var parentGeo = null;
      try {
        parentGeo = model.getGeometry(cur);
      } catch (e1) {
        parentGeo = null;
      }
      if (!parentGeo) continue;
      out.x = Number(out.x || 0) + Number(parentGeo.x || 0);
      out.y = Number(out.y || 0) + Number(parentGeo.y || 0);
    }
    return out;
  }

  function transformGeometryBetweenRects(geo, fromRect, toRect) {
    if (!geo || !fromRect || !toRect) return geo;
    var out = cloneRectLike(geo);
    var sx = Number(fromRect.width || 0) ? (Number(toRect.width || 0) / Number(fromRect.width || 1)) : 1;
    var sy = Number(fromRect.height || 0) ? (Number(toRect.height || 0) / Number(fromRect.height || 1)) : 1;
    out.x = Math.round(Number(toRect.x || 0) + (Number(geo.x || 0) - Number(fromRect.x || 0)) * sx);
    out.y = Math.round(Number(toRect.y || 0) + (Number(geo.y || 0) - Number(fromRect.y || 0)) * sy);
    out.width = Math.max(1, Math.round(Number(geo.width || 0) * sx));
    out.height = Math.max(1, Math.round(Number(geo.height || 0) * sy));
    return out;
  }

  function moveGeometryByDelta(geo, dx, dy) {
    if (!geo) return geo;
    var out = cloneRectLike(geo);
    out.x = Math.round(Number(geo.x || 0) + Number(dx || 0));
    out.y = Math.round(Number(geo.y || 0) + Number(dy || 0));
    return out;
  }

  function scaleCellChildrenGeometries(model, parentCell, sx, sy) {
    if (!model || !parentCell) return;
    sx = isFinite(Number(sx)) && Number(sx) > 0 ? Number(sx) : 1;
    sy = isFinite(Number(sy)) && Number(sy) > 0 ? Number(sy) : 1;
    var childCount = model.getChildCount(parentCell);
    for (var i = 0; i < childCount; i++) {
      var child = model.getChildAt(parentCell, i);
      var childGeo = model.getGeometry(child);
      if (!child || !childGeo) continue;
      var nextGeo = childGeo.clone ? childGeo.clone() : new mxGeometry(childGeo.x, childGeo.y, childGeo.width, childGeo.height);
      nextGeo.x = Math.round(Number(childGeo.x || 0) * sx);
      nextGeo.y = Math.round(Number(childGeo.y || 0) * sy);
      nextGeo.width = Math.max(1, Math.round(Number(childGeo.width || 0) * sx));
      nextGeo.height = Math.max(1, Math.round(Number(childGeo.height || 0) * sy));
      model.setGeometry(child, nextGeo);
    }
  }

  function syncLinkedModuleInterfacesByResize(graph, moduleName, fromRect, toRect, excludedRoots) {
    if (!graph || !moduleName || !fromRect || !toRect) return;
    var model = graph.getModel ? graph.getModel() : null;
    if (!model) return;
    var sx = Number(fromRect.width || 0) ? (Number(toRect.width || 0) / Number(fromRect.width || 1)) : 1;
    var sy = Number(fromRect.height || 0) ? (Number(toRect.height || 0) / Number(fromRect.height || 1)) : 1;
    var targets = collectModuleInterfacesForTransform(graph, moduleName, excludedRoots);
    emitDesignLog('sync-linked-module-interfaces-resize', {
      moduleName: moduleName,
      fromRect: fromRect ? { x: fromRect.x, y: fromRect.y, width: fromRect.width, height: fromRect.height } : null,
      toRect: toRect ? { x: toRect.x, y: toRect.y, width: toRect.width, height: toRect.height } : null,
      sx: sx,
      sy: sy,
      targetCount: targets.length
    });
    if (!targets.length) return;
    for (var i = 0; i < targets.length; i++) {
      var geo = model.getGeometry(targets[i]);
      if (!geo) continue;
      var nextGeo = transformGeometryBetweenRects(geo, fromRect, toRect);
      emitDesignLog('sync-linked-module-interfaces-resize-target', {
        moduleName: moduleName,
        index: i,
        cellId: targets[i] && targets[i].id ? targets[i].id : '',
        before: { x: Number(geo.x || 0), y: Number(geo.y || 0), width: Number(geo.width || 0), height: Number(geo.height || 0) },
        after: { x: Number(nextGeo.x || 0), y: Number(nextGeo.y || 0), width: Number(nextGeo.width || 0), height: Number(nextGeo.height || 0) }
      });
      model.setGeometry(targets[i], nextGeo);
      scaleCellChildrenGeometries(model, targets[i], sx, sy);
      persistGeneratedInterfaceMeta(graph, targets[i], extractGeneratedInterfaceMeta(graph, targets[i]));
    }
    try {
      if (typeof graph.refresh === 'function') graph.refresh();
      if (graph.view && typeof graph.view.validate === 'function') graph.view.validate();
      if (typeof graph.sizeDidChange === 'function') graph.sizeDidChange();
    } catch (e2) {}
  }

  function syncLinkedModuleInterfacesByMove(graph, moduleName, dx, dy, excludedRoots) {
    if (!graph || !moduleName) return;
    if (!dx && !dy) return;
    var model = graph.getModel ? graph.getModel() : null;
    if (!model) return;
    var targets = collectModuleInterfacesForTransform(graph, moduleName, excludedRoots);
    emitDesignLog('sync-linked-module-interfaces-move', {
      moduleName: moduleName,
      dx: Number(dx || 0),
      dy: Number(dy || 0),
      targetCount: targets.length
    });
    if (!targets.length) return;
    for (var i = 0; i < targets.length; i++) {
      var geo = model.getGeometry(targets[i]);
      if (!geo) continue;
      var nextGeo = moveGeometryByDelta(geo, dx, dy);
      emitDesignLog('sync-linked-module-interfaces-move-target', {
        moduleName: moduleName,
        index: i,
        cellId: targets[i] && targets[i].id ? targets[i].id : '',
        before: { x: Number(geo.x || 0), y: Number(geo.y || 0), width: Number(geo.width || 0), height: Number(geo.height || 0) },
        after: { x: Number(nextGeo.x || 0), y: Number(nextGeo.y || 0), width: Number(nextGeo.width || 0), height: Number(nextGeo.height || 0) }
      });
      model.setGeometry(targets[i], nextGeo);
      persistGeneratedInterfaceMeta(graph, targets[i], extractGeneratedInterfaceMeta(graph, targets[i]));
    }
    try {
      if (typeof graph.refresh === 'function') graph.refresh();
      if (graph.view && typeof graph.view.validate === 'function') graph.view.validate();
      if (typeof graph.sizeDidChange === 'function') graph.sizeDidChange();
    } catch (e2) {}
  }

  function resizeCellDebugMeta(cell, geo) {
    var style = String(cell && cell.style || '');
    return {
      id: cell && cell.id ? cell.id : '',
      value: cell && cell.value != null ? String(cell.value).slice(0, 80) : '',
      isModuleShell: isFlowModuleShell(cell),
      isGeneratedModule: String(Shared.styleValue(style, 'dftsFlowNavGeneratedModule', '0')) === '1',
      isChipBody: String(Shared.styleValue(style, 'dftsIP_chipBody', '0')) === '1',
      isGeneratedInterface: String(Shared.styleValue(style, 'flowGeneratedDesignInterface', '0')) === '1',
      flowModule: String(Shared.styleValue(style, 'flowModule', '')),
      flowLayer: String(Shared.styleValue(style, 'flowLayer', '')),
      flowInterfaceType: String(Shared.styleValue(style, 'flowInterfaceType', '')),
      x: geo ? Number(geo.x || 0) : null,
      y: geo ? Number(geo.y || 0) : null,
      width: geo ? Number(geo.width || 0) : null,
      height: geo ? Number(geo.height || 0) : null,
      style: style.slice(0, 220)
    };
  }

  function installLinkedModuleMovePreviewBehavior(graph) {
    var handler = graph && graph.graphHandler ? graph.graphHandler : null;
    if (!handler || handler.__flowLinkedModuleMovePreviewInstalled) return;
    handler.__flowLinkedModuleMovePreviewInstalled = true;
    if (typeof handler.maxLivePreview === 'number') handler.maxLivePreview = Math.max(handler.maxLivePreview, 256);
    handler.allowLivePreview = true;
    var originalGetCells = handler.getCells;
    if (typeof originalGetCells !== 'function') return;
    handler.getCells = function (cell, cells) {
      var moved = originalGetCells.apply(this, arguments);
      var expanded = collectLinkedModuleMoveCells(this.graph || graph, moved);
      emitDesignLog('graph-handler-get-cells', {
        requestedCount: moved ? moved.length : 0,
        expandedCount: expanded ? expanded.length : 0
      });
      return expanded;
    };
  }

  function installShellResizeBehavior(graph) {
    if (!graph || graph.__flowModuleShellResizeInstalled) return;
    graph.__flowModuleShellResizeInstalled = true;
    installLinkedModuleMovePreviewBehavior(graph);
    var originalCellsResized = graph.cellsResized;
    var originalCellsMoved = graph.cellsMoved;
    var originalResizeCell = graph.resizeCell;
    emitDesignLog('install-shell-resize-behavior', {
      hasCellsResized: typeof originalCellsResized === 'function',
      hasCellsMoved: typeof originalCellsMoved === 'function',
      hasResizeCell: typeof originalResizeCell === 'function'
    });

    graph.resizeCell = function (cell, bounds, recurse) {
      emitDesignLog('resize-cell-invoked', {
        cell: resizeCellDebugMeta(cell, this.getModel && cell ? this.getModel().getGeometry(cell) : null),
        bounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null,
        recurse: !!recurse
      });
      return originalResizeCell.call(this, cell, bounds, recurse);
    };

    graph.cellsResized = function (cells, bounds, recurse, constrain, extend) {
      var shellPlans = [];
      emitDesignLog('cells-resized-hook-enter', {
        cellCount: cells ? cells.length : 0,
        boundCount: bounds ? bounds.length : 0,
        cells: (cells || []).map(function (cell) {
          return resizeCellDebugMeta(cell, graph.getModel && cell ? graph.getModel().getGeometry(cell) : null);
        }),
        bounds: (bounds || []).map(function (bound) {
          return bound ? { x: bound.x, y: bound.y, width: bound.width, height: bound.height } : null;
        })
      });
      if (cells && bounds && cells.length === bounds.length && this.getModel) {
        var model = this.getModel();
        for (var i = 0; i < cells.length; i++) {
          var cell = cells[i];
          if (!isFlowModuleShell(cell) && !isGeneratedModuleBody(cell)) continue;
          var oldGeo = model.getGeometry(cell);
          var newGeo = bounds[i];
          if (!oldGeo || !newGeo) continue;
          shellPlans.push({
            shell: cell,
            moduleName: moduleNameForCell(cell),
            oldGeo: toAbsoluteRect(model, cell, oldGeo),
            newGeo: toAbsoluteRect(model, cell, new mxGeometry(newGeo.x, newGeo.y, newGeo.width, newGeo.height))
          });
        }
      }
      emitDesignLog('cells-resized-hook-targets', {
        matchedCount: shellPlans.length,
        targets: shellPlans.map(function (plan) {
          return {
            shellId: plan.shell && plan.shell.id ? plan.shell.id : '',
            moduleName: plan.moduleName,
            oldGeo: plan.oldGeo ? { x: plan.oldGeo.x, y: plan.oldGeo.y, width: plan.oldGeo.width, height: plan.oldGeo.height } : null,
            newGeo: plan.newGeo ? { x: plan.newGeo.x, y: plan.newGeo.y, width: plan.newGeo.width, height: plan.newGeo.height } : null
          };
        })
      });

      var result = originalCellsResized.call(this, cells, bounds, recurse, constrain, extend);

      if (!shellPlans.length) {
        emitDesignLog('cells-resized-hook-no-target', { reason: 'No flow shell or generated module matched current resize selection.' });
        return result;
      }

      var model2 = this.getModel();
      model2.beginUpdate();
      try {
        for (var p = 0; p < shellPlans.length; p++) {
          var plan = shellPlans[p];
          var shell = plan.shell;
          var moduleName = plan.moduleName;
          var oldGeo2 = plan.oldGeo;
          var newGeo2 = plan.newGeo;
          var sx = oldGeo2.width ? (newGeo2.width / oldGeo2.width) : 1;
          var sy = oldGeo2.height ? (newGeo2.height / oldGeo2.height) : 1;
          var childCount = model2.getChildCount(shell);
          var beforeChildren = [];
          for (var bc = 0; bc < childCount; bc++) {
            var beforeChild = model2.getChildAt(shell, bc);
            beforeChildren.push(resizeCellDebugMeta(beforeChild, model2.getGeometry(beforeChild)));
          }
          emitDesignLog('shell-resize-plan', {
            shellId: shell.id || '',
            oldGeo: { x: oldGeo2.x, y: oldGeo2.y, width: oldGeo2.width, height: oldGeo2.height },
            newGeo: { x: newGeo2.x, y: newGeo2.y, width: newGeo2.width, height: newGeo2.height },
            sx: sx,
            sy: sy,
            childCount: childCount
          });
          emitDesignLog('shell-resize-children-before', {
            shellId: shell.id || '',
            children: beforeChildren
          });
          for (var c = 0; c < childCount; c++) {
            var child = model2.getChildAt(shell, c);
            var childGeo = model2.getGeometry(child);
            if (!child || !childGeo) continue;
            emitDesignLog('shell-resize-child-step', {
              shellId: shell.id || '',
              index: c,
              before: resizeCellDebugMeta(child, childGeo),
              after: resizeCellDebugMeta(child, childGeo)
            });
            if (global.DftsIP && global.DftsIP.Symbol && typeof global.DftsIP.Symbol.relayout === 'function') {
              try {
                if (String(Shared.styleValue(child.style || '', 'dftsIP_chipBody', '0')) === '1') {
                  global.DftsIP.Symbol.relayout(graph, child);
                }
              } catch (e) {}
            }
          }
          var afterChildren = [];
          for (var ac = 0; ac < childCount; ac++) {
            var afterChild = model2.getChildAt(shell, ac);
            afterChildren.push(resizeCellDebugMeta(afterChild, model2.getGeometry(afterChild)));
          }
          emitDesignLog('shell-resize-children-after', {
            shellId: shell.id || '',
            children: afterChildren
          });
          syncLinkedModuleInterfacesByResize(this, moduleName, oldGeo2, newGeo2, [shell]);
        }
      } finally {
        model2.endUpdate();
      }

      return result;
    };

    graph.cellsMoved = function (cells, dx, dy, disconnect, constrain, extend) {
      var movePlans = [];
      emitDesignLog('cells-moved-hook-enter', {
        cellCount: cells ? cells.length : 0,
        dx: Number(dx || 0),
        dy: Number(dy || 0),
        cells: (cells || []).map(function (cell) {
          return resizeCellDebugMeta(cell, graph.getModel && cell ? graph.getModel().getGeometry(cell) : null);
        })
      });
      if (cells && cells.length && this.getModel) {
        var model = this.getModel();
        for (var i = 0; i < cells.length; i++) {
          var cell = cells[i];
          if (!isFlowModuleShell(cell) && !isGeneratedModuleBody(cell)) continue;
          var geo = model.getGeometry(cell);
          if (!geo) continue;
          movePlans.push({
            shell: cell,
            moduleName: moduleNameForCell(cell),
            oldGeo: toAbsoluteRect(model, cell, geo)
          });
        }
      }
      emitDesignLog('cells-moved-hook-targets', {
        matchedCount: movePlans.length,
        targets: movePlans.map(function (plan) {
          return {
            shellId: plan.shell && plan.shell.id ? plan.shell.id : '',
            moduleName: plan.moduleName,
            oldGeo: plan.oldGeo ? { x: plan.oldGeo.x, y: plan.oldGeo.y, width: plan.oldGeo.width, height: plan.oldGeo.height } : null
          };
        })
      });

      var result = originalCellsMoved.call(this, cells, dx, dy, disconnect, constrain, extend);

      if (!movePlans.length) {
        emitDesignLog('cells-moved-hook-no-target', { reason: 'No flow shell or generated module matched current move selection.' });
        return result;
      }

      var model2 = this.getModel();
      model2.beginUpdate();
      try {
        for (var p = 0; p < movePlans.length; p++) {
          var plan = movePlans[p];
          var newGeo = model2.getGeometry(plan.shell);
          if (!newGeo) continue;
          var absoluteNewGeo = toAbsoluteRect(model2, plan.shell, newGeo);
          var actualDx = Number(absoluteNewGeo.x || 0) - Number(plan.oldGeo.x || 0);
          var actualDy = Number(absoluteNewGeo.y || 0) - Number(plan.oldGeo.y || 0);
          if (movedCellsContainLinkedInterfaces(this, cells, plan.moduleName, [plan.shell])) {
            emitDesignLog('cells-moved-hook-skip-linked-sync', {
              moduleName: plan.moduleName,
              reason: 'Linked interfaces already participated in the drag move.'
            });
            continue;
          }
          syncLinkedModuleInterfacesByMove(this, plan.moduleName, actualDx, actualDy, [plan.shell]);
        }
      } finally {
        model2.endUpdate();
      }

      return result;
    };
  }

  function ensureArchInteractionHooks(ui) {
    var graph = Shared.graphOf(ui);
    var pageName = ui && ui._activeProjectPageCtx ? String(ui._activeProjectPageCtx.name || '') : '';
    emitDesignLog('ensure-arch-interaction-hooks', {
      pageName: pageName,
      hasGraph: !!graph
    });
    if (!graph) return false;
    installShellResizeBehavior(graph);
    return true;
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

  function markerPrototypeKey(meta) {
    var key = makeMetaKey(meta);
    return key || String(meta && meta.id || '').trim();
  }

  function extractGeneratedInterfaceMeta(graph, cell) {
    if (!cell) return null;
    var style = String(cell.style || '');
    if (style.indexOf('dftsIP_chipBody=1') < 0) return null;
    var direct = readPersistedGeneratedInterfaceMeta(graph, cell);
    if (direct) return direct;
    if (String(Shared.getCellStyleValue(graph, cell, 'flowGeneratedDesignInterface', '0')) !== '1') return null;
    var fromStyle = {
      moduleName: String(Shared.getCellStyleValue(graph, cell, 'flowModule', '') || ''),
      layerName: String(Shared.getCellStyleValue(graph, cell, 'flowLayer', '') || ''),
      interfaceType: String(Shared.getCellStyleValue(graph, cell, 'flowInterfaceType', '') || ''),
      pairId: String(Shared.getCellStyleValue(graph, cell, 'flowPair', '') || ''),
      side: String(Shared.getCellStyleValue(graph, cell, 'flowSide', '') || ''),
      bundleId: String(Shared.getCellStyleValue(graph, cell, 'flowBundle', '') || ''),
      chainId: String(Shared.getCellStyleValue(graph, cell, 'flowChain', '') || ''),
      sideStackIndex: Number(Shared.getCellStyleValue(graph, cell, 'flowSideStackIndex', '') || 0),
      id: String(Shared.getCellStyleValue(graph, cell, 'flowMarkerId', '') || '')
    };
    return normalizeGeneratedInterfaceMeta(fromStyle, graph, cell);
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
    var normalized = String(name || '').trim().toLowerCase();
    if (normalized === 'iftag' || normalized === 'jtag') return 'ijtag';
    return normalized;
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

  function makeModuleShellStyle(style, opts) {
    opts = opts || {};
    var interactive = !!opts.interactive;
    try {
      if (global.console && typeof global.console.debug === 'function') {
        global.console.debug('[FlowNavDesigns] makeModuleShellStyle', {
          interactive: interactive,
          before: String(style || '')
        });
      }
    } catch (e) {}
    style = style || '';
    style = mxUtils.setStyle(style, 'fillColor', 'none');
    style = mxUtils.setStyle(style, 'opacity', '100');
    style = mxUtils.setStyle(style, 'strokeColor', '#111827');
    style = mxUtils.setStyle(style, 'strokeWidth', '2');
    style = mxUtils.setStyle(style, 'aspect', 'fixed');
    style = mxUtils.setStyle(style, 'movable', interactive ? '1' : '0');
    style = mxUtils.setStyle(style, 'resizable', interactive ? '1' : '0');
    style = mxUtils.setStyle(style, 'rotatable', '0');
    style = mxUtils.setStyle(style, 'connectable', '0');
    style = mxUtils.setStyle(style, 'dftsFlowNavGeneratedModule', '1');
    try {
      if (global.console && typeof global.console.debug === 'function') {
        global.console.debug('[FlowNavDesigns] makeModuleShellStyle:after', {
          interactive: interactive,
          after: String(style || '')
        });
      }
    } catch (e2) {}
    return style;
  }

  function createFloorplanModuleCell(graph, moduleName, width, height, sourceModuleCell, opts) {
    opts = opts || {};
    try {
      if (global.console && typeof global.console.debug === 'function') {
        global.console.debug('[FlowNavDesigns] createFloorplanModuleCell', {
          moduleName: moduleName,
          interactive: !!opts.interactive,
          hasSourceModuleCell: !!sourceModuleCell
        });
      }
    } catch (e) {}
    if (sourceModuleCell && typeof sourceModuleCell.clone === 'function') {
      var cloned = cloneCellTree(sourceModuleCell);
      tagClonedCellTreeWithSourceRefs(sourceModuleCell, cloned);
      resetCellTreeIds(cloned);
      cloned.style = makeModuleShellStyle(cloned.style || '', opts);
      cloned.style = mxUtils.setStyle(cloned.style || '', 'flowModule', moduleName || '');
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
    cell.style = makeModuleShellStyle(cell.style || '', opts);
    cell.style = mxUtils.setStyle(cell.style || '', 'flowModule', moduleName || '');
    return cell;
  }

  function cloneCellTree(cell) {
    if (!cell || typeof cell.clone !== 'function') return null;
    var cloned = cell.clone();
    cloned.children = null;
    if (cell.children && cell.children.length && typeof cloned.insert === 'function') {
      for (var i = 0; i < cell.children.length; i++) {
        var childClone = cloneCellTree(cell.children[i]);
        if (childClone) cloned.insert(childClone);
      }
    }
    return cloned;
  }

  function tagClonedCellTreeWithSourceRefs(sourceCell, clonedCell) {
    if (!sourceCell || !clonedCell) return;
    clonedCell.__flowSourceCellId = sourceCell.id != null ? String(sourceCell.id) : '';
    clonedCell.__flowSourceCellName = Shared.displayNameOfCell(null, sourceCell) || Shared.labelOf(sourceCell) || '';
    var sourceChildren = sourceCell.children || [];
    var clonedChildren = clonedCell.children || [];
    var count = Math.min(sourceChildren.length, clonedChildren.length);
    for (var i = 0; i < count; i++) tagClonedCellTreeWithSourceRefs(sourceChildren[i], clonedChildren[i]);
  }

  function isFloorplanModuleCell(cell) {
    if (!cell || !cell.vertex) return false;
    var style = String(cell.style || '');
    return style.indexOf('dftsFloorplan_type=module') >= 0 || style.indexOf('dftsIP_type=floorplan_module') >= 0;
  }

  function collectModuleCellsInTree(root, out) {
    if (!root) return;
    if (isFloorplanModuleCell(root)) out.push(root);
    var children = root.children || [];
    for (var i = 0; i < children.length; i++) collectModuleCellsInTree(children[i], out);
  }

  function buildModuleCellLookup(root) {
    var lookup = {
      bySourceId: Object.create(null),
      byId: Object.create(null),
      byName: Object.create(null)
    };
    var cells = [];
    collectModuleCellsInTree(root, cells);
    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      var cellId = cell && cell.id != null ? String(cell.id) : '';
      var sourceId = cell && cell.__flowSourceCellId != null ? String(cell.__flowSourceCellId) : '';
      var name = String(Shared.displayNameOfCell(null, cell) || Shared.labelOf(cell) || '').trim();
      if (sourceId && !lookup.bySourceId[sourceId]) lookup.bySourceId[sourceId] = cell;
      if (cellId && !lookup.byId[cellId]) lookup.byId[cellId] = cell;
      if (name && !lookup.byName[name]) lookup.byName[name] = cell;
    }
    return lookup;
  }

  function resolveMarkerModuleCell(lookup, markerMeta, fallbackCell) {
    if (!lookup) return fallbackCell || null;
    var moduleId = String(markerMeta && markerMeta.moduleId || '').trim();
    var moduleName = String(markerMeta && markerMeta.moduleName || '').trim();
    if (moduleId && lookup.bySourceId[moduleId]) return lookup.bySourceId[moduleId];
    if (moduleId && lookup.byId[moduleId]) return lookup.byId[moduleId];
    if (moduleName && lookup.byName[moduleName]) return lookup.byName[moduleName];
    return fallbackCell || null;
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
    style = mxUtils.setStyle(style, 'flowBundle', markerMeta && markerMeta.bundleId || '');
    style = mxUtils.setStyle(style, 'flowChain', markerMeta && markerMeta.chainId || '');
    style = mxUtils.setStyle(style, 'flowSide', markerMeta && markerMeta.side || '');
    style = mxUtils.setStyle(style, 'flowSideStackIndex', markerMeta && markerMeta.sideStackIndex == null ? '' : String(markerMeta.sideStackIndex));
    style = mxUtils.setStyle(style, 'flowMarkerId', markerMeta && markerMeta.id || '');
    return style;
  }

  function sourceStyleValue(styleText, key, fallback) {
    return Shared.styleValue ? Shared.styleValue(styleText, key, fallback) : fallback;
  }

  function persistGeneratedInterfaceMeta(graph, cell, markerMeta) {
    if (!graph || !cell || !markerMeta) return;
    var normalized = normalizeGeneratedInterfaceMeta(markerMeta, graph, cell);
    if (!normalized) return;
    cell.__flowDesignMarkerMeta = Shared.cloneJson(normalized);
    var model = graph.getModel ? graph.getModel() : null;
    var nextStyle = makeInterfaceStyle(String(cell.style || ''), normalized);
    if (model && typeof model.setStyle === 'function') model.setStyle(cell, nextStyle);
    else cell.style = nextStyle;
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
    persistGeneratedInterfaceMeta(graph, cell, markerMeta);

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
    var cloned = cloneCellTree(sourceCell);
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
    var sourceIsGeneratedInterface = !!extractGeneratedInterfaceMeta(graph, sourceCell);
    var cloned = cloneInterfaceCellFromSource(sourceCell, markerMeta);
    if (cloned) {
      cloned.__flowPreserveSourceAppearance = sourceIsGeneratedInterface ? 1 : 0;
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

  function normalizeGeneratedInterfaceWithoutSource(graph, cell, markerMeta) {
    if (!graph || !cell) return;
    var model = graph.getModel ? graph.getModel() : null;
    var currentGeo = graph.getCellGeometry ? graph.getCellGeometry(cell) : (cell.geometry || null);
    var nextGeo = currentGeo && typeof currentGeo.clone === 'function'
      ? currentGeo.clone()
      : new mxGeometry(
        Number(currentGeo && currentGeo.x || 0),
        Number(currentGeo && currentGeo.y || 0),
        Number(currentGeo && currentGeo.width || 0),
        Number(currentGeo && currentGeo.height || 0)
      );
    nextGeo.width = GENERATED_INTERFACE_DEFAULT_WIDTH;
    nextGeo.height = GENERATED_INTERFACE_DEFAULT_HEIGHT;
    if (model && typeof model.setGeometry === 'function') model.setGeometry(cell, nextGeo);
    else cell.geometry = nextGeo;

    if (global.DftsIP && global.DftsIP.Symbol) {
      try {
        var sym = global.DftsIP.Symbol;
        var symModel = sym.getModel && sym.getModel(cell);
        if (symModel) {
          symModel = Shared.cloneJson(symModel);
          if (!symModel.transform) symModel.transform = {};
          symModel.transform.rotation = sideRotationDegrees(String(markerMeta && markerMeta.side || '').toLowerCase());
          if (sym.setModel) sym.setModel(cell, symModel);
        }
        if (sym.relayout) sym.relayout(graph, cell);
      } catch (e) {
        emitDesignLog('normalize-generated-interface-without-source-error', {
          moduleName: markerMeta && markerMeta.moduleName || '',
          layerName: markerMeta && markerMeta.layerName || '',
          interfaceType: markerMeta && markerMeta.interfaceType || '',
          error: e && e.message ? e.message : String(e)
        });
      }
    }

    persistGeneratedInterfaceMeta(graph, cell, markerMeta);
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

  function fitShellToPage(graph, shell, metrics) {
    if (!graph || !shell || !metrics) return;
    installShellResizeBehavior(graph);
    var geo = graph.getCellGeometry(shell);
    if (!geo) return;
    var availW = Math.max(100, Number(metrics.width || 0) - Number(metrics.margin || 0) * 2);
    var availH = Math.max(100, Number(metrics.height || 0) - Number(metrics.margin || 0) * 2);
    var sx = availW / Math.max(1, Number(geo.width || 1));
    var sy = availH / Math.max(1, Number(geo.height || 1));
    var scale = Math.min(sx, sy);
    if (!isFinite(scale) || scale <= 0) scale = 1;
    var nextW = Math.max(1, Math.round(Number(geo.width || 0) * scale));
    var nextH = Math.max(1, Math.round(Number(geo.height || 0) * scale));
    var nextX = Math.round(Number(metrics.margin || 0) + (availW - nextW) / 2);
    var nextY = Math.round(Number(metrics.margin || 0) + (availH - nextH) / 2);
    emitDesignLog('fit-shell-to-page', {
      shellId: shell.id || '',
      from: { x: geo.x, y: geo.y, width: geo.width, height: geo.height },
      to: { x: nextX, y: nextY, width: nextW, height: nextH },
      scale: scale,
      page: { width: metrics.width, height: metrics.height, margin: metrics.margin }
    });
    graph.resizeCell(shell, new mxRectangle(nextX, nextY, nextW, nextH), false);
  }

  function normalizeRotationDegrees(rotation) {
    var value = Number(rotation);
    if (!isFinite(value)) value = 0;
    value = value % 360;
    if (value < 0) value += 360;
    return value;
  }

  function sideRotationDegrees(side) {
    if (side === 'left') return 270;
    if (side === 'right') return 90;
    if (side === 'bottom') return 180;
    return 0;
  }

  function interfacePlacementMetrics(cell, side, sourceCell) {
    var geo = sourceCell && sourceCell.geometry ? sourceCell.geometry : (cell && cell.geometry ? cell.geometry : null);
    var w = Number(geo && geo.width || 190);
    var h = Number(geo && geo.height || 40);
    var styleText = String(sourceCell && sourceCell.style != null ? sourceCell.style : (cell && cell.style || ''));
    var rotation = normalizeRotationDegrees(sourceStyleValue(styleText, 'rotation', sideRotationDegrees(side)));
    var vertical = rotation === 90 || rotation === 270;
    return {
      width: vertical ? h : w,
      height: vertical ? w : h,
      offsetX: vertical ? (w - h) / 2 : 0,
      offsetY: vertical ? (h - w) / 2 : 0
    };
  }

  function placeInterfaceGeometry(metrics, visibleX, visibleY) {
    metrics = metrics || { offsetX: 0, offsetY: 0 };
    return {
      x: Math.round(Number(visibleX || 0) - Number(metrics.offsetX || 0)),
      y: Math.round(Number(visibleY || 0) - Number(metrics.offsetY || 0))
    };
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
    var rect = bodyCell ? Shared.rectOfCell(bodyCell) : null;
    if (!rect) return null;
    var width = Number(rect.width || 0);
    var height = Number(rect.height || 0);
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
    return { x: Number(rect.x || 0) + best.x, y: Number(rect.y || 0) + best.y };
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

  function relativeInterfacePlacement(sourceModuleCell, markerEntry, side, size) {
    var srcModuleRect = sourceModuleCell ? Shared.rectOfCell(sourceModuleCell) : null;
    var srcCell = markerEntry && markerEntry.cell;
    var srcRect = srcCell ? Shared.rectOfCell(srcCell) : null;
    if (!srcModuleRect) return null;
    var out = null;
    if (srcRect) {
      out = {
        x: Number(srcRect.x || 0) - Number(srcModuleRect.x || 0),
        y: Number(srcRect.y || 0) - Number(srcModuleRect.y || 0)
      };
    } else if (markerEntry && markerEntry.meta) {
      var anchorX = Number(markerEntry.meta.anchorX);
      var anchorY = Number(markerEntry.meta.anchorY);
      if (isFinite(anchorX) && isFinite(anchorY)) {
        size = size || { width: 0, height: 0 };
        out = {
          x: (side === 'top' || side === 'bottom')
            ? Math.round(anchorX - Number(srcModuleRect.x || 0) - Number(size.width || 0) / 2)
            : Math.round(anchorX - Number(srcModuleRect.x || 0)),
          y: (side === 'left' || side === 'right')
            ? Math.round(anchorY - Number(srcModuleRect.y || 0) - Number(size.height || 0) / 2)
            : Math.round(anchorY - Number(srcModuleRect.y || 0))
        };
      }
    }
    if (!out) return null;
    emitDesignLog('relative-interface-placement', {
      moduleName: markerEntry && markerEntry.meta ? markerEntry.meta.moduleName || '' : '',
      layerName: markerEntry && markerEntry.meta ? markerEntry.meta.layerName || '' : '',
      interfaceType: markerEntry && markerEntry.meta ? markerEntry.meta.interfaceType || '' : '',
      sourceModuleGeo: {
        x: Number(srcModuleRect.x || 0),
        y: Number(srcModuleRect.y || 0),
        width: Number(srcModuleRect.width || 0),
        height: Number(srcModuleRect.height || 0)
      },
      sourceInterfaceGeo: srcRect ? {
        x: Number(srcRect.x || 0),
        y: Number(srcRect.y || 0),
        width: Number(srcRect.width || 0),
        height: Number(srcRect.height || 0)
      } : null,
      relative: out
    });
    return out;
  }

  function clampNumber(value, min, max) {
    if (!isFinite(value)) return min;
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  function effectiveBodyRect(bodyRect, bodyCell) {
    var rect = bodyCell ? Shared.rectOfCell(bodyCell) : null;
    if (rect) {
      return {
        x: Number(rect.x || 0),
        y: Number(rect.y || 0),
        width: Number(rect.width || 0),
        height: Number(rect.height || 0)
      };
    }
    return bodyRect || null;
  }

  function placeRelativeOutsideBody(bodyRect, bodyCell, side, size, relative) {
    var rect = effectiveBodyRect(bodyRect, bodyCell);
    if (!rect || !size || !relative) return null;
    var gap = MODULE_INTERFACE_OUTER_GAP;
    if (side === 'left' || side === 'right') {
      return {
        x: side === 'left'
          ? Math.round(rect.x - size.width - gap + MODULE_INTERFACE_EDGE_OVERLAP)
          : Math.round(rect.x + rect.width + gap - MODULE_INTERFACE_EDGE_OVERLAP),
        y: Math.round(clampNumber(
          rect.y + Number(relative.y || 0),
          rect.y - size.height / 2,
          rect.y + rect.height - size.height / 2
        ))
      };
    }
    return {
      x: Math.round(clampNumber(
        rect.x + Number(relative.x || 0),
        rect.x - size.width / 2,
        rect.x + rect.width - size.width / 2
      )),
      y: side === 'top'
        ? Math.round(rect.y - size.height - gap + MODULE_INTERFACE_EDGE_OVERLAP)
        : Math.round(rect.y + rect.height + gap - MODULE_INTERFACE_EDGE_OVERLAP)
    };
  }

  function positionInterfacesAroundBody(bodyRect, bySide, prototypes, bodyCell, sourceModuleCell) {
    var placements = [];
    var sourceLookup = buildModuleCellLookup(sourceModuleCell);
    var targetLookup = buildModuleCellLookup(bodyCell);

    function placeSide(side, list) {
      for (var i = 0; i < list.length; i++) {
        var entry = list[i];
        var cell = prototypes[markerPrototypeKey(entry && entry.meta ? entry.meta : null)];
        if (!cell) continue;
        var targetModuleCell = resolveMarkerModuleCell(targetLookup, entry && entry.meta, bodyCell);
        var sourcePlacementModule = resolveMarkerModuleCell(sourceLookup, entry && entry.meta, sourceModuleCell);
        var targetRect = effectiveBodyRect(bodyRect, targetModuleCell || bodyCell);
        if (!targetRect) continue;
        var metrics = interfacePlacementMetrics(cell, side, entry && entry.cell ? entry.cell : null);
        var size = { width: metrics.width, height: metrics.height };
        var relative = relativeInterfacePlacement(sourcePlacementModule || sourceModuleCell, entry, side, size);
        if (relative) {
          var relativeOutside = placeRelativeOutsideBody(targetRect, targetModuleCell || bodyCell, side, size, relative);
          var relativeGeo = placeInterfaceGeometry(metrics, relativeOutside.x, relativeOutside.y);
          placements.push({
            marker: entry,
            cell: cell,
            x: relativeGeo.x,
            y: relativeGeo.y
          });
          continue;
        }
        var offset = Number(entry.meta.bundleCenterOffset != null ? entry.meta.bundleCenterOffset : entry.meta.offset);
        if (!isFinite(offset)) offset = (i + 1) / (list.length + 1);
        var x = targetRect.x;
        var y = targetRect.y;
        var anchor = targetModuleCell ? boundaryAnchorForSide(targetModuleCell, side, offset) : null;
        if (anchor) {
          if (side === 'left') {
            x = Math.round(anchor.x - size.width - MODULE_INTERFACE_OUTER_GAP + MODULE_INTERFACE_EDGE_OVERLAP);
            y = Math.round(anchor.y - size.height / 2);
          } else if (side === 'right') {
            x = Math.round(anchor.x + MODULE_INTERFACE_OUTER_GAP - MODULE_INTERFACE_EDGE_OVERLAP);
            y = Math.round(anchor.y - size.height / 2);
          } else if (side === 'top') {
            x = Math.round(anchor.x - size.width / 2);
            y = Math.round(anchor.y - size.height - MODULE_INTERFACE_OUTER_GAP + MODULE_INTERFACE_EDGE_OVERLAP);
          } else {
            x = Math.round(anchor.x - size.width / 2);
            y = Math.round(anchor.y + MODULE_INTERFACE_OUTER_GAP - MODULE_INTERFACE_EDGE_OVERLAP);
          }
        } else if (side === 'left') {
          x = targetRect.x - size.width - MODULE_INTERFACE_OUTER_GAP + MODULE_INTERFACE_EDGE_OVERLAP;
          y = targetRect.y + Math.round(offset * targetRect.height - size.height / 2);
        } else if (side === 'right') {
          x = targetRect.x + targetRect.width + MODULE_INTERFACE_OUTER_GAP - MODULE_INTERFACE_EDGE_OVERLAP;
          y = targetRect.y + Math.round(offset * targetRect.height - size.height / 2);
        } else if (side === 'top') {
          x = targetRect.x + Math.round(offset * targetRect.width - size.width / 2);
          y = targetRect.y - size.height - MODULE_INTERFACE_OUTER_GAP + MODULE_INTERFACE_EDGE_OVERLAP;
        } else {
          x = targetRect.x + Math.round(offset * targetRect.width - size.width / 2);
          y = targetRect.y + targetRect.height + MODULE_INTERFACE_OUTER_GAP - MODULE_INTERFACE_EDGE_OVERLAP;
        }
        var placedGeo = placeInterfaceGeometry(metrics, x, y);
        placements.push({ marker: entry, cell: cell, x: placedGeo.x, y: placedGeo.y });
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
    style = mxUtils.setStyle(style, 'aspect', 'fixed');
    style = mxUtils.setStyle(style, 'rotatable', '0');
    style = mxUtils.setStyle(style, 'recursiveResize', '1');
    style = mxUtils.setStyle(style, 'connectable', '0');
    style = mxUtils.setStyle(style, 'flowModuleShell', '1');
    style = mxUtils.setStyle(style, 'flowModule', moduleName || '');
    graph.getModel().setStyle(group, style);
    return group;
  }

  async function materializeModulePage(ui, moduleName, markerEntries, opts) {
    opts = opts || {};
    var includeBody = opts.includeBody !== false;
    emitDesignLog('materialize-start', {
      moduleName: moduleName,
      includeBody: includeBody,
      includeInterfaces: opts.includeInterfaces !== false,
      markerCount: Array.isArray(markerEntries) ? markerEntries.length : 0,
      activeCtx: ui && ui._activeProjectPageCtx ? {
        name: ui._activeProjectPageCtx.name,
        abs: ui._activeProjectPageCtx.abs || ''
      } : null,
      before: currentGraphSummary(ui)
    });
    var graph = Shared.graphOf(ui);
    var parent = opts.targetParent || Shared.getDefaultParent(ui);
    if (opts.clearMode === 'layer') clearParentContents(graph, parent);
    else clearCurrentGraph(ui);
    emitDesignLog('after-clear', currentGraphSummary(ui));
    if (!graph || !parent) throw new Error('Graph is not ready for materialization.');
    installShellResizeBehavior(graph);

    var metrics = pageMetrics(graph);
    var includeInterfaces = opts.includeInterfaces !== false;
    var entries = Array.isArray(markerEntries) ? markerEntries : [];
    var bySide = countBySide(entries);
    var interfacePrototypes = {};
    if (includeInterfaces) {
      for (var i = 0; i < entries.length; i++) {
        try {
          interfacePrototypes[markerPrototypeKey(entries[i] && entries[i].meta ? entries[i].meta : null)] = createInterfaceCell(graph, entries[i]);
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
    var referenceBodyCell = opts.referenceBodyCell || null;
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
      var body = null;
      if (includeBody) {
        body = addCellAt(graph, parent, createFloorplanModuleCell(graph, moduleName, bodyRect.width, bodyRect.height, sourceModuleCell, {
          interactive: !includeInterfaces
        }), bodyRect.x, bodyRect.y);
        try {
          if (global.console && typeof global.console.debug === 'function') {
            global.console.debug('[FlowNavDesigns] materialize body', {
              moduleName: moduleName,
              pageName: ui && ui._activeProjectPageCtx ? ui._activeProjectPageCtx.name || '' : '',
              includeInterfaces: includeInterfaces,
              bodyStyle: body && body.style ? String(body.style) : '',
              bodyGeo: body && body.geometry ? {
                x: Number(body.geometry.x || 0),
                y: Number(body.geometry.y || 0),
                width: Number(body.geometry.width || 0),
                height: Number(body.geometry.height || 0)
              } : null
            });
          }
        } catch (bodyLogErr) {}
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
      }
      var addedInterfaces = [];
      if (includeInterfaces) {
        var placementBody = body || referenceBodyCell || null;
        var placements = positionInterfacesAroundBody(bodyRect, bySide, interfacePrototypes, placementBody, sourceModuleCell);
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
          var sourceInterfaceCell = placements[p].marker && placements[p].marker.cell ? placements[p].marker.cell : null;
          var markerMeta = placements[p].marker && placements[p].marker.meta ? placements[p].marker.meta : null;
          if (addedInterface && addedInterface.__flowPreserveSourceAppearance) {
            persistGeneratedInterfaceMeta(
              graph,
              addedInterface,
              markerMeta
            );
          } else if (!sourceInterfaceCell) {
            normalizeGeneratedInterfaceWithoutSource(graph, addedInterface, markerMeta);
          } else {
            applyMarkerAppearanceToInterface(graph, addedInterface, sourceInterfaceCell, markerMeta);
          }
          addedInterfaces.push(addedInterface);
        }
      }
      emitDesignLog('interfaces-added', {
        moduleName: moduleName,
        pageName: ui && ui._activeProjectPageCtx ? ui._activeProjectPageCtx.name || '' : '',
        interfaceCount: addedInterfaces.length,
        graph: currentGraphSummary(ui)
      });
      var shellChildren = [];
      if (body) shellChildren.push(body);
      Array.prototype.push.apply(shellChildren, addedInterfaces);
      if (includeInterfaces && body && shellChildren.length > 1) lockChildrenStyles(graph, shellChildren);
      var shell = body ? buildShellGroup(graph, moduleName, shellChildren) : null;
      if (shell) fitShellToPage(graph, shell, metrics);
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
  Designs.ensureArchInteractionHooks = ensureArchInteractionHooks;
  Designs.collectDesignInputs = function collectDesignInputs(ui) {
    return groupMarkersByModule(collectGeneratedMarkerMeta(ui));
  };

  function collectModuleDesignInputsFromAnalysis(ui, analysis) {
    var owner = getGenerationOwner(ui);
    var ownerKind = owner && owner.__kind ? String(owner.__kind).toLowerCase() : '';
    if (ownerKind !== 'module-design' || !owner || !owner.name || !analysis || !analysis.interfacePlan || !Array.isArray(analysis.interfacePlan.markers) || !analysis.interfacePlan.markers.length) {
      return null;
    }
    var ownerName = String(owner.name);
    var existingEntries = collectGeneratedMarkerMeta(ui);
    var existingByKey = Object.create(null);
    for (var i = 0; i < existingEntries.length; i++) {
      var existingKey = makeMetaKey(existingEntries[i] && existingEntries[i].meta ? existingEntries[i].meta : null);
      if (existingKey && !existingByKey[existingKey]) existingByKey[existingKey] = existingEntries[i];
    }
    var out = Object.create(null);
    var usedKeys = Object.create(null);
    out[ownerName] = [];
    analysis.interfacePlan.markers.forEach(function (marker) {
      var markerMeta = Shared.cloneJson(marker);
      var key = makeMetaKey(markerMeta);
      var existing = key ? existingByKey[key] : null;
      var entry = {
        meta: markerMeta,
        cell: existing && existing.cell ? existing.cell : null,
        __fromAnalysis: true
      };
      var moduleName = String(markerMeta && markerMeta.moduleName || '').trim();
      out[ownerName].push(entry);
      if (moduleName && moduleName !== ownerName) {
        if (!out[moduleName]) out[moduleName] = [];
        out[moduleName].push({
          meta: Shared.cloneJson(markerMeta),
          cell: existing && existing.cell ? existing.cell : null,
          __fromAnalysis: true
        });
      }
      if (key) usedKeys[key] = true;
    });
    for (i = 0; i < existingEntries.length; i++) {
      var existingEntry = existingEntries[i];
      var existingMeta = existingEntry && existingEntry.meta ? existingEntry.meta : null;
      if (!existingMeta || String(existingMeta.moduleName || '') !== ownerName) continue;
      var existingOwnerKey = makeMetaKey(existingMeta);
      if (existingOwnerKey && usedKeys[existingOwnerKey]) continue;
      if (existingOwnerKey) usedKeys[existingOwnerKey] = true;
      out[ownerName].push({
        meta: Shared.cloneJson(existingMeta),
        cell: existingEntry && existingEntry.cell ? existingEntry.cell : null,
        __fromExistingOwner: true
      });
    }
    return out;
  }

  async function populateModuleDesignPage(ui, moduleName, sourceModuleCell, layerInputs, pageOrder, layerOrder) {
    var pageLayers = Array.isArray(layerOrder) && layerOrder.length ? layerOrder : MODULE_LAYER_ORDER;
    var interfaceLayers = Array.isArray(pageOrder) && pageOrder.length ? pageOrder : MODULE_INTERFACE_LAYER_ORDER;
    var layerParents = ensureNamedLayers(ui, pageLayers);
    var baseLayerParent = layerParents.base || Shared.getDefaultParent(ui);
    var baseResult = await materializeModulePage(ui, moduleName, [], {
      includeBody: true,
      includeInterfaces: false,
      sourceModuleCell: sourceModuleCell,
      targetParent: baseLayerParent,
      clearMode: 'layer'
    });
    for (var j = 0; j < interfaceLayers.length; j++) {
      var pageName = interfaceLayers[j];
      var pageMarkers = layerInputs[pageName] || [];
      var layerParent = layerParents[String(pageName || '').toLowerCase()] || Shared.getDefaultParent(ui);
      await materializeModulePage(ui, moduleName, pageMarkers, {
        includeBody: false,
        includeInterfaces: true,
        sourceModuleCell: sourceModuleCell,
        referenceBodyCell: baseResult && baseResult.body ? baseResult.body : null,
        targetParent: layerParent,
        clearMode: 'layer'
      });
    }
    return baseResult;
  }

  Designs.generateTopLevelDesigns = async function generateTopLevelDesigns(ui, analysis, opts) {
    opts = opts || {};
    analysis = analysis || Analysis.analyzeDataflow(ui);
    var designInputs = collectModuleDesignInputsFromAnalysis(ui, analysis) || Designs.collectDesignInputs(ui);
    var sourceModuleNames = Object.keys(designInputs).sort();
    var parentDesign = getGenerationOwner(ui);
    var moduleNames = await promptForUniqueModuleNames(ui, sourceModuleNames, parentDesign);
    if (!moduleNames.length) throw new Error('No generated floorplan interfaces found. Generate interfaces first.');
    var pageOrder = MODULE_INTERFACE_LAYER_ORDER.slice();
    var archLayerOrder = MODULE_LAYER_ORDER.slice();
    var previousCtx = captureCurrentPageCtx(ui);
    var results = [];
    var modulePlans = analysis && analysis.interfacePlan && analysis.interfacePlan.modulePlans ? analysis.interfacePlan.modulePlans : {};
    try {
      for (var i = 0; i < moduleNames.length; i++) {
        var moduleName = moduleNames[i];
        var sourceModuleName = sourceModuleNames[i];
        var archPageName = 'arch';
        var markerEntries = designInputs[sourceModuleName];
        var layerInputs = groupMarkersByLayer(markerEntries);
        var modulePlan = modulePlans[sourceModuleName] || null;
        var sourceModuleCell = modulePlan && modulePlan.moduleCell ? modulePlan.moduleCell : null;
        var ensured = await ensureTopLevelDesign(ui, moduleName, parentDesign);
        var design = ensured.design;
        var shellPageName = 'dataflow';
        var shellPageState = await ensurePage(ui, design, shellPageName);
        if (shellPageState && shellPageState.created) {
          await withOpenedPage(ui, design, shellPageName, (function (currentSourceModuleCell, currentLayerInputs, currentPageOrder, currentArchLayerOrder) {
            return async function () {
              await populateModuleDesignPage(ui, moduleName, currentSourceModuleCell, currentLayerInputs, currentPageOrder, currentArchLayerOrder);
            };
          })(sourceModuleCell, layerInputs, pageOrder, archLayerOrder));
        }
        results.push({
          module: moduleName,
          design: design,
          createdDesign: ensured.created,
          page: shellPageName,
          markerCount: markerEntries.length,
          updated: !!(shellPageState && shellPageState.created)
        });
        await ensurePage(ui, design, archPageName);
        await withOpenedPage(ui, design, archPageName, (function (currentSourceModuleCell, currentLayerInputs) {
          return async function () {
            await populateModuleDesignPage(ui, moduleName, currentSourceModuleCell, currentLayerInputs, pageOrder, archLayerOrder);
          };
        })(sourceModuleCell, layerInputs));
        results.push({
          module: moduleName,
          design: design,
          createdDesign: false,
          page: archPageName,
          markerCount: markerEntries.length
        });
        var legacyPrefix = Shared.sanitizeName ? Shared.sanitizeName(moduleName) : String(moduleName).replace(/[^a-zA-Z0-9]+/g, '_');
        var legacyNamedPages = [legacyPrefix + '_arch', legacyPrefix + '_dataflow', legacyPrefix + '_floorplan'];
        for (var lp = 0; lp < legacyNamedPages.length; lp++) {
          var legacyNamedPage = legacyNamedPages[lp];
          var legacyNamedIdx = Array.isArray(design.pages) ? design.pages.indexOf(legacyNamedPage) : -1;
          if (legacyNamedIdx >= 0) design.pages.splice(legacyNamedIdx, 1);
          if (design.page_meta && design.page_meta[legacyNamedPage]) delete design.page_meta[legacyNamedPage];
        }
        var legacyPageOrder = ['ssn', 'ijtag', 'bscan', 'bisr'];
        for (var k = 0; k < legacyPageOrder.length; k++) {
          var legacyPageName = legacyPageOrder[k];
          var idx = Array.isArray(design.pages) ? design.pages.indexOf(legacyPageName) : -1;
          if (idx >= 0) design.pages.splice(idx, 1);
          if (design.page_meta && design.page_meta[legacyPageName]) delete design.page_meta[legacyPageName];
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
