(function (global) {
  'use strict';

  var Mod = global.DFTFlowNavMod = global.DFTFlowNavMod || {};
  var Shared = Mod.Shared;
  var Analysis = Mod.Analysis;
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
    var targetPath = Shared.joinPath(root, Shared.sanitizeName(name));
    if (!global.DFTProjectExplorerPhase2 || typeof global.DFTProjectExplorerPhase2.createTopLevelDesign !== 'function') {
      throw new Error('Project Explorer createTopLevelDesign helper is not available.');
    }
    var design = await global.DFTProjectExplorerPhase2.createTopLevelDesign(ui, name, targetPath);
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

  function addBodyPlaceholder(ui, modulePlan) {
    var graph = Shared.graphOf(ui);
    var parent = Shared.getDefaultParent(ui);
    var rect = modulePlan.rect || { x: 120, y: 60, width: 960, height: 520 };
    var bodyX = 80, bodyY = 40, bodyW = Math.max(880, rect.width), bodyH = Math.max(480, rect.height);
    return graph.insertVertex(parent, null, modulePlan.moduleName, bodyX, bodyY, bodyW, bodyH,
      'rounded=0;whiteSpace=wrap;html=1;strokeColor=#111827;fillColor=#f3f4f6;fontSize=28;fontStyle=1;align=center;verticalAlign=middle;');
  }

  function bodyRectInPage(bodyCell) {
    return Shared.rectOfCell(bodyCell) || { left: 80, top: 40, right: 960, bottom: 560, width: 880, height: 520 };
  }

  function interfaceSize(role) {
    return role === 'host' ? { width: 132, height: 56 } : { width: 132, height: 56 };
  }

  function placeNearSide(bodyRect, markerMeta, size) {
    var x = bodyRect.left, y = bodyRect.top;
    var offset = markerMeta.bundleCenterOffset == null ? (markerMeta.offset == null ? 0.5 : Number(markerMeta.offset)) : Number(markerMeta.bundleCenterOffset);
    var isHost = markerMeta.role === 'host';
    var gap = 10;

    if (markerMeta.side === 'left') {
      x = isHost ? bodyRect.left - size.width + 8 : bodyRect.left - (size.width * 2) + 6;
      y = bodyRect.top + offset * bodyRect.height - size.height / 2;
    } else if (markerMeta.side === 'right') {
      x = isHost ? bodyRect.right - 8 : bodyRect.right + gap;
      y = bodyRect.top + offset * bodyRect.height - size.height / 2;
    } else if (markerMeta.side === 'top') {
      x = bodyRect.left + offset * bodyRect.width - size.width / 2;
      y = isHost ? bodyRect.top - size.height + 8 : bodyRect.top - (size.height * 2) + 6;
    } else {
      x = bodyRect.left + offset * bodyRect.width - size.width / 2;
      y = isHost ? bodyRect.bottom - 8 : bodyRect.bottom + gap;
    }
    return { x: x, y: y };
  }

  function roleToIpKey(role) {
    return role === 'host' ? 'SSN_HOST' : 'SSN_SLAVE';
  }

  function adapterCandidates() {
    var out = [];
    if (global.DFTIPLibrary && typeof global.DFTIPLibrary.addIPToCurrentPage === 'function') out.push(global.DFTIPLibrary.addIPToCurrentPage);
    if (global.DFTIPPalette && typeof global.DFTIPPalette.addIPToCurrentPage === 'function') out.push(global.DFTIPPalette.addIPToCurrentPage);
    if (global.DftsIP && typeof global.DftsIP.addIPToCurrentPage === 'function') out.push(global.DftsIP.addIPToCurrentPage);
    if (global.DftsIP && typeof global.DftsIP.insertIP === 'function') out.push(global.DftsIP.insertIP);
    return out;
  }

  function placeholderStyle(orientation) {
    var rotation = 0;
    if (orientation === 'north') rotation = -90;
    else if (orientation === 'south') rotation = 90;
    else if (orientation === 'west') rotation = 180;
    return 'rounded=0;whiteSpace=wrap;html=1;strokeColor=#111827;fillColor=#ffffff;fontSize=11;fontStyle=1;rotation=' + rotation + ';';
  }

  async function materializeIp(ui, spec) {
    var graph = Shared.graphOf(ui);
    var parent = Shared.getDefaultParent(ui);
    var candidates = adapterCandidates();
    for (var i = 0; i < candidates.length; i++) {
      try {
        var result = await candidates[i](ui, {
          typeKey: spec.typeKey,
          label: spec.label,
          x: spec.x,
          y: spec.y,
          width: spec.width,
          height: spec.height,
          orientation: spec.orientation,
          params: Shared.cloneJson(spec.params || {}),
          metadata: Shared.cloneJson(spec.metadata || {})
        });
        if (result) return result;
      } catch (e) {}
    }
    var cell = graph.insertVertex(parent, null, spec.label, spec.x, spec.y, spec.width, spec.height, placeholderStyle(spec.orientation));
    cell.__flowNavRealIp = { typeKey: spec.typeKey, params: spec.params, metadata: spec.metadata };
    return cell;
  }

  async function materializeSource(ui, bodyRect, sourceSpec) {
    var size = { width: 260, height: 120 };
    var x = bodyRect.left + 100;
    var y = bodyRect.top + bodyRect.height / 2 - size.height / 2;
    return materializeIp(ui, {
      typeKey: 'SSNPadSource',
      label: sourceSpec.name || 'SSNPadSource',
      x: x,
      y: y,
      width: size.width,
      height: size.height,
      orientation: 'east',
      params: { sourceName: sourceSpec.name || 'SSNPadSource' },
      metadata: { role: 'source', module: sourceSpec.moduleName || '' }
    });
  }

  async function materializeInterfaces(ui, bodyCell, modulePlan) {
    var bodyRect = bodyRectInPage(bodyCell);
    var created = [];
    for (var i = 0; i < modulePlan.markers.length; i++) {
      var marker = modulePlan.markers[i];
      var size = interfaceSize(marker.role);
      var pos = placeNearSide(bodyRect, marker, size);
      var label = marker.role === 'host' ? 'SSN HOST ' + i : 'SSN SLAVE ' + i;
      var cell = await materializeIp(ui, {
        typeKey: roleToIpKey(marker.role),
        label: label,
        x: pos.x,
        y: pos.y,
        width: size.width,
        height: size.height,
        orientation: marker.orientation,
        params: {
          role: marker.role,
          chainId: marker.chainId,
          pairId: marker.pairId,
          sourceInstance: marker.sourceInstance,
          clockSignal: marker.clockSignal,
          dataInSignal: marker.dataInSignal,
          dataOutSignal: marker.dataOutSignal,
          side: marker.side,
          offset: marker.offset,
          peerModule: marker.peerModule || '',
          peerMarkerId: marker.peerMarkerId || ''
        },
        metadata: marker
      });
      created.push(cell);
    }
    return created;
  }

  async function materializeModulePage(ui, modulePlan) {
    clearCurrentGraph(ui);
    var body = addBodyPlaceholder(ui, modulePlan);
    var createdSources = [];
    for (var i = 0; i < modulePlan.sources.length; i++) {
      modulePlan.sources[i].moduleName = modulePlan.moduleName;
      createdSources.push(await materializeSource(ui, bodyRectInPage(body), modulePlan.sources[i]));
    }
    var createdInterfaces = await materializeInterfaces(ui, body, modulePlan);
    return { body: body, sources: createdSources, interfaces: createdInterfaces };
  }

  Designs.generateTopLevelDesigns = async function generateTopLevelDesigns(ui, analysis, opts) {
    opts = opts || {};
    analysis = analysis || Analysis.analyzeDataflow(ui);
    var planMap = analysis.interfacePlan && analysis.interfacePlan.modulePlans || {};
    var moduleNames = Object.keys(planMap).sort();
    if (!moduleNames.length) throw new Error('No modules available for design generation.');
    var previousCtx = captureCurrentPageCtx(ui);
    var results = [];
    try {
      for (var i = 0; i < moduleNames.length; i++) {
        var moduleName = moduleNames[i];
        var modulePlan = planMap[moduleName];
        var ensured = await ensureTopLevelDesign(ui, moduleName);
        var design = ensured.design;
        await ensurePage(ui, design, 'main');
        await withOpenedPage(ui, design, 'main', async function () {
          await materializeModulePage(ui, modulePlan);
        });
        results.push({ module: moduleName, design: design, createdDesign: ensured.created, page: 'main', markerCount: modulePlan.markers.length, sourceCount: modulePlan.sources.length });
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
