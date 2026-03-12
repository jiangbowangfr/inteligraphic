(function (global) {
  'use strict';

  global = global || (typeof globalThis !== 'undefined' ? globalThis : window);
  var Mod = global.DFTFlowNavMod = global.DFTFlowNavMod || {};
  var Shared = Mod.Shared;
  var Analysis = Mod.Analysis;
  var Markers = Mod.Markers;
  var Designs = Mod.Designs;
  var Dftspec = Mod.Dftspec;
  if (!Shared || !Analysis || !Markers || !Designs || !Dftspec) throw new Error('Load all modular Flow Navigator files before flow_navigator_core.modular.js');

  var NS = global.DFTFlowNavigator = global.DFTFlowNavigator || {};
  var STYLE_ID = 'dft-flow-nav-style-modular';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css = '' +
      '.dftflow-root{height:100%;display:flex;flex-direction:column;background:#fff;font-family:Helvetica,Arial,sans-serif;color:#374151;font-size:12px;}' +
      '.dftflow-head{height:40px;display:flex;align-items:center;padding:0 8px;border-bottom:1px solid #e5e7eb;flex:0 0 auto;box-sizing:border-box;}' +
      '.dftflow-title{font-size:12px;font-weight:600;line-height:1.2;color:#111827;}' +
      '.dftflow-scroll{flex:1;min-height:0;overflow:auto;padding:8px;box-sizing:border-box;}' +
      '.dftflow-group{margin-bottom:10px;}' +
      '.dftflow-group-title{font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin:4px 4px 6px;}' +
      '.dftflow-stage{border:1px solid #e5e7eb;border-radius:12px;background:#fff;margin-bottom:8px;overflow:hidden;}' +
      '.dftflow-stage.active{border-color:#dbeafe;background:#fafcff;}' +
      '.dftflow-stage-head{display:flex;align-items:flex-start;gap:8px;padding:9px 10px;cursor:pointer;box-sizing:border-box;}' +
      '.dftflow-dot{width:10px;height:10px;border-radius:999px;flex:0 0 auto;background:#cbd5e1;margin-top:3px;}' +
      '.dftflow-dot.ready{background:#60a5fa;}' +
      '.dftflow-dot.success{background:#22c55e;}' +
      '.dftflow-dot.warning{background:#f59e0b;}' +
      '.dftflow-dot.error{background:#ef4444;}' +
      '.dftflow-dot.blocked{background:#94a3b8;}' +
      '.dftflow-name{min-width:0;flex:1 1 auto;}' +
      '.dftflow-name .label{display:block;font-size:11px;font-weight:600;line-height:1.25;color:#111827;}' +
      '.dftflow-name .sub{display:block;font-size:11px;font-weight:400;line-height:1.35;color:#6b7280;margin-top:2px;}' +
      '.dftflow-stage-body{padding:0 10px 10px 28px;display:none;box-sizing:border-box;}' +
      '.dftflow-stage.active .dftflow-stage-body{display:block;}' +
      '.dftflow-desc{font-size:11px;font-weight:400;color:#6b7280;line-height:1.45;margin:0 0 8px 0;}' +
      '.dftflow-actions{display:flex;flex-wrap:wrap;gap:6px;}' +
      '.dftflow-mini-btn{height:28px;border:1px solid #cfd6e3;border-radius:9px;background:#fff;padding:0 10px;font-size:12px;font-weight:400;color:#374151;cursor:pointer;}' +
      '.dftflow-mini-btn.primary{background:#f8fafc;border-color:#bfdbfe;color:#1d4ed8;}' +
      '.dftflow-note{margin:2px 2px 10px;color:#6b7280;font-size:11px;line-height:1.45;}' +
      '.dftflow-empty{margin:4px 2px 10px;padding:10px;border:1px dashed #d1d5db;border-radius:10px;background:#fafafa;color:#6b7280;font-size:11px;line-height:1.45;}';
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  async function ensureFloorplanPage(ui) {
    if (!Shared.isProjectReady(ui)) throw new Error('Create or open a project first.');
    if (global.DFTProjectExplorerPhase2 && typeof global.DFTProjectExplorerPhase2.openDefaultFloorplan === 'function') {
      return global.DFTProjectExplorerPhase2.openDefaultFloorplan(ui);
    }
    throw new Error('Project Explorer floorplan helper is not available.');
  }

  function stageStatus(ui) {
    var st = Shared.ensureState(ui);
    var analysis = Shared.getActivePageReady(ui) ? Analysis.analyzeDataflow(ui) : {
      modules: [], dataSources: [], floorplanLines: [], interfaces: [], interfacePlan: { markers: [], pairs: [] }, issues: [], errorCount: 0, warningCount: 0, ok: false
    };
    var design = Shared.getCurrentDesign(ui);
    var floorplan = Shared.getFloorplanContainer(ui);
    var activePage = Shared.getActivePageName(ui);
    var out = {};

    out.projectManager = Shared.isProjectReady(ui) ? { state: 'success', text: 'Project loaded' } : { state: 'ready', text: 'Create project or design' };
    out.floorplan = !Shared.isProjectReady(ui)
      ? { state: 'blocked', text: 'No project' }
      : ((floorplan && floorplan.pages && floorplan.pages.length)
          ? { state: Shared.isFloorplanPageOpen(ui) ? 'success' : 'ready', text: Shared.isFloorplanPageOpen(ui) ? ('Open: ' + activePage) : (floorplan.pages.length + ' page(s)') }
          : { state: 'ready', text: 'Create floorplan page' });
    out.dataflow = !Shared.getActivePageReady(ui)
      ? { state: 'blocked', text: 'Open page first' }
      : (analysis.errorCount ? { state: 'error', text: analysis.issues.length + ' issue(s)' } : (analysis.warningCount ? { state: 'warning', text: analysis.issues.length + ' issue(s)' } : { state: 'success', text: 'Dataflow checked' }));
    out.generateInterface = !Shared.getActivePageReady(ui)
      ? { state: 'blocked', text: 'Open page first' }
      : !Shared.isFloorplanPageOpen(ui)
        ? { state: 'blocked', text: 'Open floorplan page first' }
        : (analysis.interfacePlan.markers.length
            ? { state: 'ready', text: analysis.interfacePlan.markers.length + ' planned marker(s)' }
            : { state: 'warning', text: 'No interface plan found' });
    out.generateDesigns = !Shared.getActivePageReady(ui)
      ? { state: 'blocked', text: 'Open page first' }
      : { state: analysis.modules.length ? 'ready' : 'warning', text: analysis.modules.length ? (analysis.modules.length + ' module design(s)') : 'No modules found' };
    out.generateDftspec = !Shared.isProjectReady(ui)
      ? { state: 'blocked', text: 'No project' }
      : (st.lastDftspec
          ? { state: 'success', text: 'Preview available' }
          : { state: Shared.getActivePageReady(ui) ? 'ready' : 'blocked', text: Shared.getActivePageReady(ui) ? 'Generate preview' : 'Open page first' });
    out.generateIpconfig = !Shared.isProjectReady(ui)
      ? { state: 'blocked', text: 'No project' }
      : !Shared.getActivePageReady(ui)
        ? { state: 'blocked', text: 'Open page first' }
        : !isIpconfigContext(ui)
          ? { state: 'blocked', text: 'Open ipconfig page first' }
          : (st.lastIpconfig
              ? { state: 'success', text: 'Preview available' }
              : { state: 'ready', text: 'Generate preview' });
    st.statuses = out;
    return out;
  }

  function checkDataflow(ui) {
    if (!Shared.getActivePageReady(ui)) throw new Error('Open a page before checking dataflow.');
    var analysis = Analysis.analyzeDataflow(ui);
    Shared.ensureState(ui).lastCheck = analysis;
    var level = analysis.errorCount ? 'error' : (analysis.warningCount ? 'warning' : 'success');
    Shared.logDock(ui, 'Dataflow check: ' + analysis.modules.length + ' module(s), ' + analysis.dataSources.length + ' data source(s), ' + analysis.interfacePlan.markers.length + ' marker(s), ' + analysis.interfacePlan.pairs.length + ' pair(s).', level);
    for (var i = 0; i < analysis.issues.length; i++) Shared.logDock(ui, analysis.issues[i].text, analysis.issues[i].level || 'warning');
    Shared.setReports(ui, [{ title: 'Dataflow Check', items: { modules: analysis.modules.length, dataSources: analysis.dataSources.length, plannedMarkers: analysis.interfacePlan.markers.length, pairs: analysis.interfacePlan.pairs.length, warnings: analysis.warningCount, errors: analysis.errorCount } }]);
    Shared.setJobs(ui, [{ name: 'dataflow_check', status: level, detail: analysis.issues.length + ' issue(s)', progress: 100 }]);
    return analysis;
  }

  function previewInterfaceGeneration(ui) {
    if (!Shared.getActivePageReady(ui)) throw new Error('Open a page before previewing interface generation.');
    var analysis = Analysis.analyzeDataflow(ui);
    Shared.logDock(ui, 'Preview: ' + analysis.interfacePlan.markers.length + ' marker(s), ' + analysis.interfacePlan.pairs.length + ' pair(s).', analysis.interfacePlan.markers.length ? 'info' : 'warning');
    Shared.setReports(ui, [{ title: 'Interface Preview', items: { markers: analysis.interfacePlan.markers.length, pairs: analysis.interfacePlan.pairs.length, modules: analysis.modules.length } }]);
    return analysis;
  }

  function runGenerateInterface(ui) {
    if (!Shared.getActivePageReady(ui)) throw new Error('Open a page before generating interfaces.');
    if (!Shared.isFloorplanPageOpen(ui)) throw new Error('Open a floorplan page before generating interfaces.');
    var analysis = Analysis.analyzeDataflow(ui);
    var result = Markers.createInterfaceMarkers(ui, analysis, { overwrite: true });
    Shared.ensureState(ui).lastInterfaceReport = result;
    Shared.logDock(ui, 'Generated ' + result.created.length + ' floorplan interface marker(s) from ' + result.plan.pairs.length + ' pair(s).', result.created.length ? 'success' : 'warning');
    Shared.setReports(ui, [{ title: 'Generate Interface', items: { markersCreated: result.created.length, pairs: result.plan.pairs.length } }]);
    Shared.setJobs(ui, [{ name: 'generate_interface', status: 'success', detail: result.created.length + ' marker(s)', progress: 100 }]);
    return result;
  }

  async function runGenerateDesigns(ui) {
    if (!Shared.getActivePageReady(ui)) throw new Error('Open a page before generating module designs.');
    var analysis = Analysis.analyzeDataflow(ui);
    var result = await Designs.generateTopLevelDesigns(ui, analysis, {});
    Shared.ensureState(ui).lastGeneratedDesigns = result;
    Shared.logDock(ui, 'Generated or refreshed ' + result.moduleCount + ' top-level design(s).', 'success');
    Shared.setReports(ui, [{ title: 'Generate Module Designs', items: { moduleCount: result.moduleCount, designsTouched: result.created.length } }]);
    Shared.setJobs(ui, [{ name: 'generate_module_designs', status: 'success', detail: result.moduleCount + ' design(s)', progress: 100 }]);
    return result;
  }

  function runPreviewDftspec(ui) {
    return runGenerateDftspecViaConverters(ui, false);
  }

  function getDiagramXmlForDftspec(ui) {
    var xml = '';
    try {
      if (ui && ui.editor && typeof mxUtils !== 'undefined' && mxUtils.getXml && typeof ui.editor.getGraphXml === 'function') {
        xml = '<mxfile><diagram>' + mxUtils.getXml(ui.editor.getGraphXml()) + '</diagram></mxfile>';
      }
    } catch (e) {}
    if (!xml) {
      try {
        if (ui && typeof ui.getFileData === 'function') xml = String(ui.getFileData(true) || '');
      } catch (e2) {}
    }
    return String(xml || '');
  }

  function sanitizeFileName(name) {
    try {
      if (typeof global._sanitizeFileName === 'function') return global._sanitizeFileName(name);
    } catch (e) {}
    return String(name == null ? '' : name).replace(/[\\/:*?"<>|]+/g, '_').trim() || 'page';
  }

  function sanitizeIdent(name, fallback) {
    var out = String(name == null ? '' : name).trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
    return out || String(fallback || 'item');
  }

  function getCellAttr(graph, cell, attr, dflt) {
    try {
      var model = graph && (graph.getModel ? graph.getModel() : graph.model);
      var value = model && model.getValue ? model.getValue(cell) : (cell ? cell.value : null);
      if (value && typeof value.getAttribute === 'function') {
        var raw = value.getAttribute(attr);
        if (raw != null && raw !== '') return raw;
      }
      if (value && typeof value === 'object' && value[attr] != null && value[attr] !== '') return value[attr];
    } catch (e) {}
    return dflt;
  }

  function parseStyleValue(raw, key) {
    raw = String(raw || '');
    key = String(key || '');
    if (!raw || !key) return '';
    var parts = raw.split(';');
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i];
      var idx = seg.indexOf('=');
      if (idx <= 0) continue;
      if (seg.slice(0, idx).trim() !== key) continue;
      return seg.slice(idx + 1).trim();
    }
    return '';
  }

  function tryParseSymbolModel(raw) {
    if (!raw) return null;
    if (typeof raw === 'object' && raw && Array.isArray(raw.pins)) return raw;
    var candidates = [String(raw)];
    try { candidates.push(decodeURIComponent(String(raw))); } catch (e) {}
    for (var i = 0; i < candidates.length; i++) {
      try {
        var parsed = JSON.parse(candidates[i]);
        if (parsed && Array.isArray(parsed.pins)) return parsed;
      } catch (e2) {}
    }
    return null;
  }

  function readPersistedSymbolModel(graph, cell) {
    try {
      var ns = global.DftsIP;
      var fromRuntime = tryParseSymbolModel(ns && ns.Symbol && typeof ns.Symbol.getModel === 'function' ? ns.Symbol.getModel(cell) : null);
      if (fromRuntime) return fromRuntime;
    } catch (e) {}
    var attr = getCellAttr(graph, cell, 'dftsIP_symbolModel', null);
    var style = cell && cell.style ? String(cell.style) : '';
    return tryParseSymbolModel(attr) || tryParseSymbolModel(parseStyleValue(style, 'dftsIP_symbolModel'));
  }

  function isIpconfigContext(ui) {
    var ctx = ui && ui._activeProjectPageCtx ? ui._activeProjectPageCtx : null;
    var designRef = ctx && ctx.designRef ? ctx.designRef : null;
    if (designRef && String(designRef.__kind || '') === 'ipconfig-container') return true;
    var segs = ctx && Array.isArray(ctx.segs) ? ctx.segs : [];
    return segs.length > 0 && String(segs[0] || '').toLowerCase() === 'ipconfig';
  }

  function dirnamePath(p) {
    var v = String(p || '').replace(/\\/g, '/').replace(/\/+$/, '');
    var idx = v.lastIndexOf('/');
    return idx > 0 ? v.substring(0, idx) : '';
  }

  function joinPath() {
    var parts = [];
    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i] != null && arguments[i] !== '') parts.push(String(arguments[i]));
    }
    return parts.join('/').replace(/\/+/g, '/');
  }

  function notifyGenerated(ui, targetAbs) {
    var msg = 'DFTSPEC generated successfully.';
    try {
      if (ui && typeof ui.showTemporaryMessage === 'function') {
        ui.showTemporaryMessage('DFTSPEC generated', 1800);
        return;
      }
    } catch (e) {}
    try {
      if (typeof global.mxUtils !== 'undefined' && global.mxUtils && typeof global.mxUtils.alert === 'function') {
        global.mxUtils.alert(msg);
        return;
      }
    } catch (e2) {}
    try { alert(msg); } catch (e3) {}
  }

  function notifyIpconfigGenerated(ui, targetAbs) {
    var msg = 'IPCONFIG YAML generated successfully.';
    try {
      if (ui && typeof ui.showTemporaryMessage === 'function') {
        ui.showTemporaryMessage('IPCONFIG generated', 1800);
        return;
      }
    } catch (e) {}
    try {
      if (typeof global.mxUtils !== 'undefined' && global.mxUtils && typeof global.mxUtils.alert === 'function') {
        global.mxUtils.alert(msg + (targetAbs ? '\n' + targetAbs : ''));
        return;
      }
    } catch (e2) {}
    try { alert(msg + (targetAbs ? '\n' + targetAbs : '')); } catch (e3) {}
  }

  async function saveDftspecToCurrentDesign(ui, text) {
    if (typeof global.requestSync !== 'function') throw new Error('requestSync unavailable');

    var pageName = Shared.getActivePageName(ui) || 'page-1';
    var fileName = sanitizeFileName(pageName) + '.dofile';
    var ctx = ui && ui._activeProjectPageCtx ? ui._activeProjectPageCtx : null;
    var designRef = ctx && ctx.designRef ? ctx.designRef : null;
    var pageAbs = '';

    if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.resolvePageFileAbs === 'function' && designRef) {
      pageAbs = await global.DFTPageSessionManager.resolvePageFileAbs(ui, designRef, pageName);
    } else if (ctx && ctx.abs) {
      pageAbs = String(ctx.abs);
    } else {
      var root = (ui && (ui._projectRootPath || ui._projectYamlDir)) || '';
      var segs = (ctx && Array.isArray(ctx.segs) ? ctx.segs.slice() : []);
      if (!root || !segs.length) throw new Error('Active design path is unavailable.');
      var base = joinPath.apply(null, [root].concat(segs));
      var isFloorplan = designRef && (designRef._isFloorplan || String(designRef.__kind || '') === 'floorplan-container');
      pageAbs = joinPath(base, isFloorplan ? fileName : joinPath('page', fileName));
    }

    var targetAbs = joinPath(dirnamePath(pageAbs), fileName);
    await global.requestSync({ action: 'ensureDirs', path: dirnamePath(targetAbs) });
    await global.requestSync({ action: 'writeFile', path: targetAbs, data: String(text || ''), enc: 'utf-8' });
    return targetAbs;
  }

  async function buildDftspecUsingConverters(ui) {
    if (!Shared.isProjectReady(ui)) throw new Error('Create or open a project first.');
    if (!Shared.getActivePageReady(ui)) throw new Error('Open a page before generating dftspec.');
    if (typeof global.convertXmlToyaml !== 'function') throw new Error('Missing convertXmlToyaml(xml, includeAttrs) function.');
    if (typeof global.convertYamlToDftspec !== 'function') throw new Error('Missing convertYamlToDftspec(yaml) function.');

    var xml = getDiagramXmlForDftspec(ui);
    if (!xml || !xml.trim()) throw new Error('XML data is empty.');

    var yaml = global.convertXmlToyaml(xml, true);
    if (yaml && typeof yaml.then === 'function') yaml = await yaml;
    if (!yaml || typeof yaml !== 'string' || yaml.trim() === '') throw new Error('YAML 数据为空或格式错误');

    var dftspec = global.convertYamlToDftspec(yaml);
    if (dftspec && typeof dftspec.then === 'function') dftspec = await dftspec;
    if (!dftspec || typeof dftspec !== 'string' || dftspec.trim() === '') throw new Error('DFTSPEC 数据为空或格式错误');

    return { yaml: yaml, dftspec: dftspec };
  }

  async function runGenerateDftspecViaConverters(ui, saveAfterBuild, showPreview) {
    if (!Shared.isProjectReady(ui)) throw new Error('Create or open a project first.');
    if (!Shared.getActivePageReady(ui)) throw new Error('Open a page before generating dftspec.');
    var built = await buildDftspecUsingConverters(ui);
    var text = built.dftspec;
    Shared.ensureState(ui).lastDftspec = text;
    if (showPreview !== false) Shared.showTextPreview('Generated DFTSPEC', text);
    Shared.logDock(ui, saveAfterBuild ? 'Generated DFTSPEC.' : 'Generated DFTSPEC preview.', 'success');
    Shared.setReports(ui, [{ title: 'Generate DFTSPEC', items: { bytes: text.length, lines: text.split('\n').length, status: 'generated' } }]);
    Shared.setJobs(ui, [{ name: 'generate_dftspec', status: 'success', detail: 'Preview ready', progress: 100 }]);
    return text;
  }

  async function runGenerateDftspec(ui) {
    if (!Shared.isProjectReady(ui)) throw new Error('Create or open a project first.');
    if (!Shared.getActivePageReady(ui)) throw new Error('Open a page before generating dftspec.');
    var text = await runGenerateDftspecViaConverters(ui, true, false);
    var target = await saveDftspecToCurrentDesign(ui, text);
    Shared.logDock(ui, 'Saved DFTSPEC: ' + target, 'success');
    notifyGenerated(ui, target);
    return true;
  }

  function resolveBodyForEndpoint(graph, cell) {
    if (!graph || !cell) return null;
    try {
      if (global.DftsIP && typeof global.DftsIP.findChipBodyForCell === 'function') {
        var found = global.DftsIP.findChipBodyForCell(graph, cell);
        if (found) return found;
      }
    } catch (e) {}
    var model = graph.getModel ? graph.getModel() : null;
    var cur = cell;
    while (cur && model && cur !== model.getRoot()) {
      if (Shared.isChipBody(graph, cur)) return cur;
      cur = model.getParent(cur);
    }
    return null;
  }

  function findPinMetaByKey(sym, pinKey) {
    var pins = sym && Array.isArray(sym.pins) ? sym.pins : [];
    for (var i = 0; i < pins.length; i++) {
      var pin = pins[i] || {};
      var key = Shared.trim(pin.key || pin.pinKey || pin.name || '');
      if (key && key === pinKey) return pin;
    }
    return null;
  }

  function getBodyInfo(graph, body) {
    var sym = readPersistedSymbolModel(graph, body) || Shared.getSymbolModel(body) || {};
    var title = Shared.trim(
      getCellAttr(graph, body, 'dftsIP_bodyLabel', null) ||
      getCellAttr(graph, body, 'bodyLabel', null) ||
      sym.title ||
      sym.label ||
      Shared.displayNameOfCell(graph, body) ||
      Shared.labelOf(body) || ''
    );
    var instanceName = Shared.trim(
      getCellAttr(graph, body, 'dftsIP_instanceName', null) ||
      getCellAttr(graph, body, 'instanceName', null) ||
      getCellAttr(graph, body, 'instance', null) ||
      sym.instanceName ||
      Shared.getCellStyleValue(graph, body, 'dftsIP_instanceName', '') ||
      Shared.getCellStyleValue(graph, body, 'instanceName', '')
    );
    var rect = Shared.rectOfCell(body) || { x: 0, y: 0 };
    return {
      body: body,
      id: String(body && body.id || ''),
      title: title || ('ip_' + String(body && body.id || '')),
      instanceName: instanceName,
      displayName: title || instanceName || ('ip_' + String(body && body.id || '')),
      moduleToken: sanitizeIdent(title || instanceName || ('ip_' + String(body && body.id || '')), 'ip'),
      cellType: sanitizeIdent(title || 'ip', 'ip'),
      isLogicGate: String(sym.bodyShape || '') === 'dftsLogicGate',
      x: Number(rect.x || 0),
      y: Number(rect.y || 0)
    };
  }

  function getEndpointMeta(graph, endpoint) {
    if (!graph || !endpoint) return null;
    var body = resolveBodyForEndpoint(graph, endpoint);
    if (!body) return null;
    var bodyInfo = getBodyInfo(graph, body);
    var style = endpoint.style || '';
    var pinKey = Shared.trim(Shared.styleValue(style, 'dftsIP_pinKey', endpoint.__dftsSymbolKey || ''));
    var sym = Shared.getSymbolModel(body) || {};
    var pinMeta = findPinMetaByKey(sym, pinKey) || {};
    var pinName = Shared.trim(pinMeta.name || pinMeta.displayName || Shared.labelOf(endpoint) || pinKey || 'pin');
    return {
      body: body,
      bodyId: bodyInfo.id,
      bodyName: bodyInfo.displayName,
      moduleName: bodyInfo.title,
      instanceName: bodyInfo.instanceName,
      pinKey: pinKey,
      pinName: pinName,
      persistentName: 'dfx_' + sanitizeIdent(bodyInfo.moduleToken, 'ip') + '_' + sanitizeIdent(pinName, 'pin') + '_persistent',
      bodyTitle: bodyInfo.title,
      bodyCellType: bodyInfo.cellType,
      isLogicGate: !!bodyInfo.isLogicGate,
      orderX: bodyInfo.x,
      orderY: bodyInfo.y
    };
  }

  function makeLogicGateModuleBase(targetMeta, gateMeta) {
    return 'dfx_' + sanitizeIdent(targetMeta.bodyTitle || targetMeta.moduleName, 'ip') +
      '_' + sanitizeIdent(targetMeta.pinName, 'pin') +
      '_persistent_' + sanitizeIdent(gateMeta.bodyCellType || gateMeta.bodyTitle, 'logic') + '_inst';
  }

  function buildIpconfigYaml(ui) {
    if (!Shared.isProjectReady(ui)) throw new Error('Create or open a project first.');
    if (!Shared.getActivePageReady(ui)) throw new Error('Open an ipconfig page first.');
    if (!isIpconfigContext(ui)) throw new Error('Open a page under the ipconfig design first.');

    var graph = Shared.graphOf(ui);
    if (!graph) throw new Error('Graph is not ready.');

    var bodyInfoById = {};
    var bodies = Shared.getChildVertices(ui).filter(function (cell) { return Shared.isChipBody(graph, cell); });
    for (var b = 0; b < bodies.length; b++) {
      var info = getBodyInfo(graph, bodies[b]);
      bodyInfoById[info.id] = info;
    }

    var links = [];
    var rawEdges = Shared.getChildEdges(ui) || [];
    for (var e = 0; e < rawEdges.length; e++) {
      var edge = rawEdges[e];
      if (!edge || !edge.source || !edge.target) continue;
      if (String(Shared.getCellStyleValue(graph, edge, 'floorplanLine', '0')) === '1') continue;
      var src = getEndpointMeta(graph, edge.source);
      var dst = getEndpointMeta(graph, edge.target);
      if (!src || !dst || !src.bodyId || !dst.bodyId || src.bodyId === dst.bodyId) continue;
      links.push({ edgeId: String(edge.id || ('edge_' + e)), source: src, target: dst });
    }

    var logicGateOutputLinks = {};
    for (e = 0; e < links.length; e++) {
      var lk = links[e];
      if (lk.source && lk.source.isLogicGate && Shared.trim(lk.source.pinName).toUpperCase() === 'Y') {
        logicGateOutputLinks[lk.source.bodyId] = logicGateOutputLinks[lk.source.bodyId] || [];
        logicGateOutputLinks[lk.source.bodyId].push(lk);
      }
    }

    var logicGateNameState = {};
    Object.keys(logicGateOutputLinks).forEach(function (bodyId) {
      var outs = logicGateOutputLinks[bodyId];
      if (!outs || !outs.length) return;
      var gateBodyInfo = bodyInfoById[bodyId];
      if (!gateBodyInfo) return;
      var base = makeLogicGateModuleBase(outs[0].target, {
        bodyCellType: gateBodyInfo.cellType,
        bodyTitle: gateBodyInfo.title
      });
      logicGateNameState[base] = logicGateNameState[base] || [];
      logicGateNameState[base].push(bodyId);
    });

    var logicGateModuleNames = {};
    Object.keys(logicGateNameState).forEach(function (base) {
      var ids = logicGateNameState[base];
      ids.sort(function (lhs, rhs) {
        var li = bodyInfoById[lhs] || { x: 0, y: 0 };
        var ri = bodyInfoById[rhs] || { x: 0, y: 0 };
        return li.x !== ri.x ? li.x - ri.x : li.y - ri.y;
      });
      if (ids.length === 1) {
        logicGateModuleNames[ids[0]] = base;
        return;
      }
      for (var gi = 0; gi < ids.length; gi++) logicGateModuleNames[ids[gi]] = base + String(gi);
    });

    function endpointRef(meta) {
      if (!meta) return '';
      var bodyName = meta.isLogicGate ? (logicGateModuleNames[meta.bodyId] || meta.bodyTitle || meta.moduleName) : (meta.bodyTitle || meta.moduleName);
      return bodyName + '/' + meta.pinName;
    }

    var graphAdj = {};
    function ensureAdj(id) {
      if (!graphAdj[id]) graphAdj[id] = [];
      return graphAdj[id];
    }
    Object.keys(bodyInfoById).forEach(function (id) { ensureAdj(id); });
    for (e = 0; e < links.length; e++) {
      ensureAdj(links[e].source.bodyId).push(links[e].target.bodyId);
      ensureAdj(links[e].target.bodyId).push(links[e].source.bodyId);
    }

    var visited = {};
    var components = [];
    Object.keys(bodyInfoById).forEach(function (id) {
      if (visited[id]) return;
      var queue = [id];
      var nodes = [];
      visited[id] = true;
      while (queue.length) {
        var cur = queue.shift();
        nodes.push(cur);
        var nexts = graphAdj[cur] || [];
        for (var i = 0; i < nexts.length; i++) {
          var nextId = nexts[i];
          if (visited[nextId]) continue;
          visited[nextId] = true;
          queue.push(nextId);
        }
      }
      components.push(nodes);
    });

    components.sort(function (lhs, rhs) {
      var li = bodyInfoById[lhs[0]] || { x: 0, y: 0 };
      var ri = bodyInfoById[rhs[0]] || { x: 0, y: 0 };
      return li.x !== ri.x ? li.x - ri.x : li.y - ri.y;
    });

    var lines = [];
    lines.push('# Auto-generated by Flow Navigator');
    lines.push('page: ' + JSON.stringify(Shared.getActivePageName(ui) || 'page'));
    lines.push('paths:');

    for (var c = 0; c < components.length; c++) {
      var componentIds = components[c].slice().sort(function (lhs, rhs) {
        var li = bodyInfoById[lhs] || { x: 0, y: 0 };
        var ri = bodyInfoById[rhs] || { x: 0, y: 0 };
        return li.x !== ri.x ? li.x - ri.x : li.y - ri.y;
      });
      var componentSet = {};
      for (var ci = 0; ci < componentIds.length; ci++) componentSet[componentIds[ci]] = true;
      var componentLinks = links.filter(function (link) { return componentSet[link.source.bodyId] && componentSet[link.target.bodyId]; });
      componentLinks.sort(function (lhs, rhs) {
        var lx = Math.min(lhs.source.orderX, lhs.target.orderX);
        var rx = Math.min(rhs.source.orderX, rhs.target.orderX);
        if (lx !== rx) return lx - rx;
        var ly = Math.min(lhs.source.orderY, lhs.target.orderY);
        var ry = Math.min(rhs.source.orderY, rhs.target.orderY);
        return ly - ry;
      });

      lines.push('  path' + (c + 1) + ':');
      lines.push('    ip:');
      for (var n = 0; n < componentIds.length; n++) {
        var bodyId = componentIds[n];
        var info3 = bodyInfoById[bodyId];
        var ipName = info3.isLogicGate ? (logicGateModuleNames[bodyId] || info3.title) : info3.title;
        lines.push('      - ' + JSON.stringify(ipName));
      }
      lines.push('    connections:');
      if (!componentLinks.length) {
        lines.push('      {}');
      } else {
        for (var p = 0; p < componentLinks.length; p++) {
          var link2 = componentLinks[p];
          lines.push('      pair' + (p + 1) + ':');
          lines.push('        from: ' + JSON.stringify(endpointRef(link2.source)));
          lines.push('        to: ' + JSON.stringify(endpointRef(link2.target)));
        }
      }
    }

    if (!components.length) lines.push('  {}');
    return lines.join('\n');
  }

  async function saveIpconfigYamlToCurrentPage(ui, text) {
    if (typeof global.requestSync !== 'function') throw new Error('requestSync unavailable');
    var pageName = Shared.getActivePageName(ui) || 'page';
    var ctx = ui && ui._activeProjectPageCtx ? ui._activeProjectPageCtx : null;
    var designRef = ctx && ctx.designRef ? ctx.designRef : null;
    if (!isIpconfigContext(ui)) throw new Error('Open a page under the ipconfig design first.');
    var pageAbs = '';
    if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.resolvePageFileAbs === 'function' && designRef) {
      pageAbs = await global.DFTPageSessionManager.resolvePageFileAbs(ui, designRef, pageName);
    } else if (ctx && ctx.abs) {
      pageAbs = String(ctx.abs);
    } else {
      var root = (ui && (ui._projectRootPath || ui._projectYamlDir)) || '';
      var segs = ctx && Array.isArray(ctx.segs) ? ctx.segs.slice() : ['ipconfig'];
      if (!root || !segs.length) throw new Error('Active ipconfig page path is unavailable.');
      pageAbs = joinPath.apply(null, [root].concat(segs).concat(['page', sanitizeFileName(pageName) + '.dftart']));
    }
    if (!pageAbs) throw new Error('Active ipconfig page path is unavailable.');
    var ipconfigBase = dirnamePath(dirnamePath(pageAbs));
    var yamlDir = joinPath(ipconfigBase, 'yaml');
    var targetAbs = joinPath(yamlDir, sanitizeFileName(pageName) + '.yaml');
    await global.requestSync({ action: 'ensureDirs', path: yamlDir });
    await global.requestSync({ action: 'writeFile', path: targetAbs, data: String(text || ''), enc: 'utf-8' });
    return targetAbs;
  }

  function runPreviewIpconfig(ui) {
    var text = buildIpconfigYaml(ui);
    var st = Shared.ensureState(ui);
    st.lastIpconfig = text;
    Shared.showTextPreview('Generated IPCONFIG YAML', text);
    Shared.logDock(ui, 'Generated IPCONFIG YAML preview.', 'success');
    Shared.setReports(ui, [{ title: 'Generate IPCONFIG', items: { bytes: text.length, lines: text.split('\n').length, status: 'preview' } }]);
    Shared.setJobs(ui, [{ name: 'generate_ipconfig', status: 'success', detail: 'Preview ready', progress: 100 }]);
    return text;
  }

  async function runGenerateIpconfig(ui) {
    var text = buildIpconfigYaml(ui);
    var target = await saveIpconfigYamlToCurrentPage(ui, text);
    var st = Shared.ensureState(ui);
    st.lastIpconfig = text;
    st.lastIpconfigPath = target;
    Shared.logDock(ui, 'Saved IPCONFIG YAML: ' + target, 'success');
    Shared.setReports(ui, [{ title: 'Generate IPCONFIG', items: { bytes: text.length, lines: text.split('\n').length, status: 'generated' } }]);
    Shared.setJobs(ui, [{ name: 'generate_ipconfig', status: 'success', detail: sanitizeFileName(Shared.getActivePageName(ui) || 'page') + '.yaml', progress: 100 }]);
    notifyIpconfigGenerated(ui, target);
    try {
      if (ui && typeof ui.refreshProjectExplorer === 'function') ui.refreshProjectExplorer();
    } catch (e) {}
    return target;
  }

  var GROUPS = [
    { title: 'Project', items: [
      { key: 'projectManager', label: 'Project Manager', desc: 'Create a new project, open an existing project, or save the current project.', actions: [
        { label: 'New', key: 'project:new', primary: true },
        { label: 'Open', key: 'project:open' },
        { label: 'Save', key: 'project:save' }
      ] }
    ] },
    { title: 'DFT Authoring', items: [
      { key: 'floorplan', label: 'Floorplan', desc: 'Open or create the floorplan page.', actions: [
        { label: 'Open Floorplan', key: 'floorplan:open', primary: true }
      ] },
      { key: 'dataflow', label: 'Dataflow Check', desc: 'Validate SSN loop, module coverage, and host uniqueness.', actions: [
        { label: 'Check', key: 'dataflow:check', primary: true }
      ] },
      { key: 'generateInterface', label: 'Generate Interface', desc: 'Generate boundary SSN host/slave marker pairs on the floorplan page.', actions: [
        { label: 'Preview', key: 'ifgen:preview' },
        { label: 'Generate', key: 'ifgen:run', primary: true }
      ] },
      { key: 'generateDesigns', label: 'Generate Module Designs', desc: 'Create top-level designs and materialize real SSN interface IPs on each module page.', actions: [
        { label: 'Generate', key: 'designs:run', primary: true }
      ] }
    ] },
    { title: 'Validation & Generation', items: [
      { key: 'generateDftspec', label: 'Generate DFTSPEC', desc: 'Build a spec preview including interface pairing and side/orientation metadata.', actions: [
        { label: 'Preview', key: 'dftspec:preview' },
        { label: 'Generate', key: 'dftspec:run', primary: true }
      ] },
      { key: 'generateIpconfig', label: 'Generate IPCONFIG', desc: 'Build an ip-to-ip connection YAML from the current ipconfig page and save it next to the page file.', actions: [
        { label: 'Preview', key: 'ipconfig:preview' },
        { label: 'Generate', key: 'ipconfig:run', primary: true }
      ] }
    ] }
  ];


function actionMaybe(ui, key) {
  try {
    if (ui && ui.actions && typeof ui.actions.get === 'function') {
      var a = ui.actions.get(key);
      if (a && typeof a.funct === 'function') { a.funct(); return true; }
    }
  } catch (e) {}
  return false;
}

function maybeSaveProject(ui) {
  try {
    if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.saveActivePage === 'function') {
      return global.DFTPageSessionManager.saveActivePage(ui, { reason: 'flow-nav-save' });
    }
  } catch (e) {}
  actionMaybe(ui, 'save');
  return Promise.resolve();
}

function projectSignature(ui) {
  if (!Shared.isProjectReady(ui)) return 'none';
  var pm = Shared.getProject(ui) || {};
  var designs = Array.isArray(pm.designs) ? pm.designs : [];
  var parts = [pm.name || '', pm.path || ui._projectRootPath || '', String(designs.length)];
  for (var i = 0; i < designs.length; i++) {
    var d = designs[i] || {};
    var pages = Array.isArray(d.pages) ? d.pages.length : 0;
    var subs = Array.isArray(d.sub_designs) ? d.sub_designs.length : 0;
    parts.push([d.name || '', d.__kind || '', pages, subs, d.env_file || '', d._absDir || ''].join(':'));
  }
  return parts.join('|');
}

function finalizeProjectRefresh(ui, reason) {
  try {
    if (ui && typeof ui.refreshProjectExplorer === 'function') ui.refreshProjectExplorer();
    else if (ui && ui.format && typeof ui.format.refreshProject === 'function') ui.format.refreshProject();
  } catch (e) {}
  try {
    if (ui && global.DFTEnvEditorDialog && typeof global.DFTEnvEditorDialog.refresh === 'function') {
      global.DFTEnvEditorDialog.refresh(ui);
    }
  } catch (e2) {}
  try { NS.refresh(ui); } catch (e3) {}
  if (reason) Shared.logDock(ui, reason, 'success');
}

function waitForProjectMutation(ui, beforeSig, opts) {
  opts = opts || {};
  var timeout = Number(opts.timeoutMs || 12000);
  var interval = Number(opts.intervalMs || 200);
  var started = Date.now();
  return new Promise(function (resolve) {
    (function tick() {
      var afterSig = projectSignature(ui);
      var changed = afterSig !== beforeSig && afterSig !== 'none';
      var hasProject = Shared.isProjectReady(ui);
      if (changed || (hasProject && beforeSig === 'none')) {
        finalizeProjectRefresh(ui, opts.successMessage || 'Project context updated.');
        return resolve(true);
      }
      if (Date.now() - started >= timeout) {
        if (hasProject) finalizeProjectRefresh(ui, null);
        return resolve(false);
      }
      setTimeout(tick, interval);
    })();
  });
}

function confirmReplaceCurrentProject(ui) {
  if (!Shared.isProjectReady(ui)) return true;
  return global.confirm('Close the current project and continue creating a new project or design?');
}

function runProjectManager(ui, action) {
  if (action === 'new') {
    if (!confirmReplaceCurrentProject(ui)) {
      Shared.logDock(ui, 'Cancelled creating a new project/design.', 'info');
      return Promise.resolve(null);
    }
    if (global.DFTProjectExplorerPhase2 && typeof global.DFTProjectExplorerPhase2.openNewEntryDialog === 'function') {
      return Promise.resolve(global.DFTProjectExplorerPhase2.openNewEntryDialog(ui, { replaceCurrent: true })).then(function (result) {
        if (!result) {
          Shared.logDock(ui, 'New dialog closed or cancelled.', 'info');
          return null;
        }
        finalizeProjectRefresh(ui, result.kind === 'design' ? 'Created design.' : 'Created project.');
        return result;
      }).catch(function (err) {
        Shared.logDock(ui, err && err.message ? err.message : String(err), 'warning');
      });
    }
    if (typeof global.newProjectmy === 'function') {
      try { global.newProjectmy(ui); } catch (e) {}
      return waitForProjectMutation(ui, projectSignature(ui), { successMessage: 'Created new project.' });
    }
    actionMaybe(ui, 'new');
    return Promise.resolve();
  }
  if (action === 'open') {
    var beforeOpen = projectSignature(ui);
    actionMaybe(ui, 'open');
    return waitForProjectMutation(ui, beforeOpen, { successMessage: 'Project loaded.' }).then(function (changed) {
      if (!changed) Shared.logDock(ui, 'Triggered open project.', 'info');
    });
  }
  if (action === 'save') {
    return Promise.resolve(maybeSaveProject(ui)).then(function () {
      finalizeProjectRefresh(ui, null);
      Shared.logDock(ui, 'Saved current page / project context.', 'success');
    });
  }
  return Promise.resolve();
}

async function execute(ui, cmd) {

    if (cmd === 'project:new') return runProjectManager(ui, 'new');
    if (cmd === 'project:open') return runProjectManager(ui, 'open');
    if (cmd === 'project:save') return runProjectManager(ui, 'save');
    if (cmd === 'floorplan:open') return ensureFloorplanPage(ui);
    if (cmd === 'dataflow:check') return checkDataflow(ui);
    if (cmd === 'ifgen:preview') return previewInterfaceGeneration(ui);
    if (cmd === 'ifgen:run') return runGenerateInterface(ui);
    if (cmd === 'designs:run') return runGenerateDesigns(ui);
    if (cmd === 'dftspec:preview') return runPreviewDftspec(ui);
    if (cmd === 'dftspec:run') return runGenerateDftspec(ui);
    if (cmd === 'ipconfig:preview') return runPreviewIpconfig(ui);
    if (cmd === 'ipconfig:run') return runGenerateIpconfig(ui);
    return null;
  }

  function render(ui, host) {
    injectStyle();
    var st = Shared.ensureState(ui);
    var statuses = stageStatus(ui);
    host.innerHTML = '';
    var root = document.createElement('div'); root.className = 'dftflow-root';
    var head = document.createElement('div'); head.className = 'dftflow-head';
    var title = document.createElement('div'); title.className = 'dftflow-title'; title.textContent = 'Flow Navigator (Modular)';
    head.appendChild(title); root.appendChild(head);
    var scroll = document.createElement('div'); scroll.className = 'dftflow-scroll'; root.appendChild(scroll);
    var project = Shared.getProject(ui);
    var design = Shared.getCurrentDesign(ui);
    var note = document.createElement('div');
    note.className = Shared.isProjectReady(ui) ? 'dftflow-note' : 'dftflow-empty';
    note.textContent = Shared.isProjectReady(ui)
      ? ('Project: ' + (project && project.name ? project.name : '—') + ' · Design: ' + (design && design.name ? design.name : '—') + ' · Page: ' + (Shared.getActivePageName(ui) || '—'))
      : 'Create or open a project first.';
    scroll.appendChild(note);

    for (var g = 0; g < GROUPS.length; g++) {
      var group = GROUPS[g];
      var wrap = document.createElement('div'); wrap.className = 'dftflow-group';
      var gt = document.createElement('div'); gt.className = 'dftflow-group-title'; gt.textContent = group.title; wrap.appendChild(gt);
      for (var i = 0; i < group.items.length; i++) {
        var item = group.items[i];
        var status = statuses[item.key] || { state: 'ready', text: 'Ready' };
        var card = document.createElement('div'); card.className = 'dftflow-stage' + (st.activeStage === item.key ? ' active' : '');
        card.setAttribute('data-stage', item.key);
        var headRow = document.createElement('div'); headRow.className = 'dftflow-stage-head';
        var dot = document.createElement('div'); dot.className = 'dftflow-dot ' + (status.state || 'ready');
        var name = document.createElement('div'); name.className = 'dftflow-name';
        name.innerHTML = '<span class="label">' + item.label + '</span><span class="sub">' + (status.text || '') + '</span>';
        headRow.appendChild(dot); headRow.appendChild(name); card.appendChild(headRow);
        var body = document.createElement('div'); body.className = 'dftflow-stage-body';
        var desc = document.createElement('p'); desc.className = 'dftflow-desc'; desc.textContent = item.desc; body.appendChild(desc);
        var actions = document.createElement('div'); actions.className = 'dftflow-actions';
        for (var a = 0; a < item.actions.length; a++) {
          var meta = item.actions[a];
          var btn = document.createElement('button');
          btn.className = 'dftflow-mini-btn' + (meta.primary ? ' primary' : '');
          btn.textContent = meta.label;
          btn.setAttribute('data-cmd', meta.key);
          if (status && status.state === 'blocked') {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
          }
          actions.appendChild(btn);
        }
        body.appendChild(actions); card.appendChild(body); wrap.appendChild(card);
      }
      scroll.appendChild(wrap);
    }
    host.appendChild(root);

    root.addEventListener('click', function (evt) {
      var cmd = evt.target && evt.target.getAttribute && evt.target.getAttribute('data-cmd');
      if (cmd) {
        evt.preventDefault(); evt.stopPropagation();
        execute(ui, cmd).then(function () { NS.refresh(ui); }).catch(function (err) { Shared.logDock(ui, err && err.message ? err.message : String(err), 'error'); NS.refresh(ui); });
        return;
      }
      var stageNode = evt.target;
      while (stageNode && stageNode !== root && !stageNode.getAttribute('data-stage')) stageNode = stageNode.parentNode;
      if (!stageNode || stageNode === root) return;
      st.activeStage = String(stageNode.getAttribute('data-stage'));
      NS.refresh(ui);
    });
  }

  NS.attach = function attach(ui, host) { if (!ui || !host) return false; render(ui, host); return true; };
  NS.refresh = function refresh(ui) { if (!ui || !ui._phase1 || !ui._phase1.flowNavContainer) return false; return NS.attach(ui, ui._phase1.flowNavContainer); };
  NS.execute = execute;
  NS.analyzeDataflow = Analysis.analyzeDataflow;
  NS.buildDataflowContext = Analysis.buildDataflowContext;
  NS.buildDftspec = Dftspec.build;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
