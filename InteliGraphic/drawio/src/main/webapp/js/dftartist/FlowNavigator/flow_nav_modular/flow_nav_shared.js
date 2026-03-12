(function (global) {
  'use strict';

  global = global || (typeof globalThis !== 'undefined' ? globalThis : window);
  var Mod = global.DFTFlowNavMod = global.DFTFlowNavMod || {};
  var Shared = Mod.Shared = Mod.Shared || {};

  function text(v) { return v == null ? '' : String(v); }
  function trim(v) { return text(v).replace(/^\s+|\s+$/g, ''); }

  Shared.text = text;
  Shared.trim = trim;

  Shared.ensureState = function ensureState(ui) {
    if (!ui.__dftFlowNavState) {
      ui.__dftFlowNavState = {
        activeStage: 'projectManager',
        statuses: {},
        lastCheck: null,
        lastInterfaceReport: null,
        lastGeneratedDesigns: null,
        lastDftspec: null,
        lastIpconfig: null,
        lastIpconfigPath: ''
      };
    }
    return ui.__dftFlowNavState;
  };

  Shared.logDock = function logDock(ui, textValue, level) {
    level = level || 'info';
    try {
      if (ui && typeof ui.logDockOutput === 'function') ui.logDockOutput(textValue, level, { source: 'flow-nav' });
      if (ui && typeof ui.pushDockMessage === 'function' && (level === 'warning' || level === 'error' || level === 'success')) {
        ui.pushDockMessage({ level: level, text: textValue, source: 'flow-nav' });
      }
      if (ui && typeof ui.focusDockTab === 'function') {
        if (level === 'warning' || level === 'error') ui.focusDockTab('messages');
        else ui.focusDockTab('output');
      }
    } catch (e) {}
  };

  Shared.setReports = function setReports(ui, sections) {
    try { if (ui && typeof ui.setDockReports === 'function') ui.setDockReports(sections); } catch (e) {}
  };

  Shared.setJobs = function setJobs(ui, jobs) {
    try { if (ui && typeof ui.setDockJobs === 'function') ui.setDockJobs(jobs); } catch (e) {}
  };

  Shared.getProject = function getProject(ui) {
    return ui && ui.projectModel ? ui.projectModel : null;
  };

  Shared.isProjectReady = function isProjectReady(ui) {
    var pm = Shared.getProject(ui);
    if (!pm) return false;
    if (pm.__placeholder) return false;
    var root = trim((pm.path && String(pm.path)) || (ui && (ui._projectRootPath || ui._projectYamlDir)) || '');
    if (!root) return false;

    if (global.DFTProjectExplorerPhase2 && typeof global.DFTProjectExplorerPhase2.isProjectReady === 'function') {
      try { return !!global.DFTProjectExplorerPhase2.isProjectReady(ui); } catch (e) {}
    }
    return true;
  };

  Shared.getCurrentDesign = function getCurrentDesign(ui) {
    var design = null;
    if (global.DFTProjectExplorerPhase2 && typeof global.DFTProjectExplorerPhase2.getCurrentDesign === 'function') {
      try {
        design = global.DFTProjectExplorerPhase2.getCurrentDesign(ui);
        if (design && design.__kind !== 'floorplan-container') return design;
      } catch (e) {}
    }
    if (global.DFTEnvEditorDialog && typeof global.DFTEnvEditorDialog.getCurrentDesign === 'function') {
      try {
        design = global.DFTEnvEditorDialog.getCurrentDesign(ui);
        if (design && design.__kind !== 'floorplan-container') return design;
      } catch (e2) {}
    }
    var pm = Shared.getProject(ui);
    if (!pm) return null;
    var ctx = ui && ui._activeProjectPageCtx;
    if (ctx && ctx.designRef && ctx.designRef.__kind !== 'floorplan-container') return ctx.designRef;
    var designs = Array.isArray(pm.designs) ? pm.designs : [];
    for (var i = 0; i < designs.length; i++) {
      if (designs[i] && designs[i].__kind !== 'floorplan-container') return designs[i];
    }
    return null;
  };

  Shared.getFloorplanContainer = function getFloorplanContainer(ui) {
    if (global.DFTProjectExplorerPhase2 && typeof global.DFTProjectExplorerPhase2.getFloorplanContainer === 'function') {
      try { return global.DFTProjectExplorerPhase2.getFloorplanContainer(ui, false); } catch (e) {}
    }
    var pm = Shared.getProject(ui);
    var designs = pm && pm.designs || [];
    for (var i = 0; i < designs.length; i++) if (designs[i] && designs[i].__kind === 'floorplan-container') return designs[i];
    return null;
  };

  Shared.getActivePageName = function getActivePageName(ui) {
    try {
      if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.getActivePageName === 'function') {
        return trim(global.DFTPageSessionManager.getActivePageName(ui));
      }
    } catch (e) {}
    return ui && ui._activeProjectPageCtx && ui._activeProjectPageCtx.name ? String(ui._activeProjectPageCtx.name) : '';
  };

  Shared.isFloorplanPageOpen = function isFloorplanPageOpen(ui) {
    var pageName = Shared.getActivePageName(ui);
    if (!pageName) return false;
    var ctx = ui && ui._activeProjectPageCtx;
    if (ctx && ctx.designRef && ctx.designRef.__kind === 'floorplan-container') return true;
    var floorplan = Shared.getFloorplanContainer(ui);
    return !!(floorplan && Array.isArray(floorplan.pages) && floorplan.pages.indexOf(pageName) >= 0);
  };

  Shared.getActivePageReady = function getActivePageReady(ui) {
    return !!Shared.getActivePageName(ui);
  };

  Shared.graphOf = function graphOf(ui) {
    return ui && ui.editor ? ui.editor.graph : (ui && ui.graph ? ui.graph : null);
  };

  Shared.getDefaultParent = function getDefaultParent(ui) {
    var graph = Shared.graphOf(ui);
    if (!graph || !graph.getDefaultParent) return null;
    try { return graph.getDefaultParent(); } catch (e) { return null; }
  };

  Shared.getChildVertices = function getChildVertices(ui) {
    var graph = Shared.graphOf(ui);
    var parent = Shared.getDefaultParent(ui);
    if (!graph || !parent || !graph.getChildVertices) return [];
    try { return graph.getChildVertices(parent) || []; } catch (e) { return []; }
  };

  Shared.getChildEdges = function getChildEdges(ui) {
    var graph = Shared.graphOf(ui);
    var parent = Shared.getDefaultParent(ui);
    if (!graph || !parent || !graph.getChildEdges) return [];
    try { return graph.getChildEdges(parent) || []; } catch (e) { return []; }
  };

  Shared.labelOf = function labelOf(cell) {
    if (!cell) return '';
    if (cell.value == null) return '';
    if (typeof cell.value === 'string') return cell.value;
    try {
      if (cell.value.nodeType === 1 && cell.value.getAttribute) {
        return cell.value.getAttribute('label') || cell.value.getAttribute('value') || cell.value.textContent || '';
      }
    } catch (e) {}
    return String(cell.value || '');
  };

  Shared.styleMapOf = function styleMapOf(styleText) {
    var out = {};
    if (!styleText) return out;
    var parts = String(styleText).split(';');
    for (var i = 0; i < parts.length; i++) {
      var item = parts[i];
      if (!item) continue;
      var idx = item.indexOf('=');
      if (idx < 0) continue;
      out[item.substring(0, idx)] = item.substring(idx + 1);
    }
    return out;
  };

  Shared.styleValue = function styleValue(style, key, fallback) {
    if (style == null) return fallback;
    if (typeof style === 'string') {
      var map = Shared.styleMapOf(style);
      return map[key] != null ? map[key] : fallback;
    }
    if (typeof mxUtils !== 'undefined' && mxUtils.getValue) return mxUtils.getValue(style, key, fallback);
    return style[key] != null ? style[key] : fallback;
  };

  Shared.getCellStyleValue = function getCellStyleValue(graph, cell, key, fallback) {
    if (!graph || !cell) return fallback;
    try { return Shared.styleValue(graph.getCellStyle(cell), key, fallback); } catch (e) { return fallback; }
  };

  Shared.isChipBody = function isChipBody(graph, cell) {
    if (!cell) return false;
    try {
      if (global.DftsIP && typeof global.DftsIP.isChipBody === 'function') {
        var byApi = !!global.DftsIP.isChipBody(graph, cell);
        if (byApi) return true;
      }
    } catch (e) {}
    return String(Shared.getCellStyleValue(graph, cell, 'dftsIP_chipBody', '0')) === '1';
  };

  Shared.isPinCell = function isPinCell(graph, cell) {
    if (!cell) return false;
    try {
      if (global.DftsIP && typeof global.DftsIP.isPinCell === 'function') {
        var byApi = !!global.DftsIP.isPinCell(graph, cell);
        if (byApi) return true;
      }
    } catch (e) {}
    return String(Shared.getCellStyleValue(graph, cell, 'dftsIP_pin', Shared.getCellStyleValue(graph, cell, 'pin', '0'))) === '1';
  };

  Shared.getSymbolModel = function getSymbolModel(cell) {
    try {
      if (global.DftsIP && global.DftsIP.Symbol && typeof global.DftsIP.Symbol.getModel === 'function') {
        var model = global.DftsIP.Symbol.getModel(cell);
        if (model) return model;
      }
    } catch (e) {}
    try {
      if (cell && cell.__dftsSymbolModel) return cell.__dftsSymbolModel;
    } catch (e2) {}
    try {
      var styleText = cell && cell.style ? String(cell.style) : '';
      var raw2 = Shared.styleValue(styleText, 'dftsIP_symbolModel', '');
      if (raw2) return JSON.parse(decodeURIComponent(raw2));
    } catch (e4) {}
    return null;
  };

  Shared.displayNameOfCell = function displayNameOfCell(graph, cell) {
    var txt = trim(Shared.labelOf(cell));
    if (txt) return txt;
    var sym = Shared.getSymbolModel(cell);
    if (sym && trim(sym.title)) return trim(sym.title);
    return txt;
  };

  Shared.getPinExitPoint = function getPinExitPoint(graph, pin) {
    var geo = pin && pin.geometry;
    var manual = null;
    if (geo) {
      var x = Number(geo.x || 0) + Number(geo.width || 0) / 2;
      var y = Number(geo.y || 0) + Number(geo.height || 0) / 2;
      var parent = pin && pin.parent;
      while (parent && parent.geometry) {
        x += Number(parent.geometry.x || 0);
        y += Number(parent.geometry.y || 0);
        parent = parent.parent;
      }
      if (isFinite(x) && isFinite(y)) manual = { x: x, y: y };
    }
    try {
      if (global.DftsIP && typeof global.DftsIP.getPinExitPoint === 'function') {
        var pt = global.DftsIP.getPinExitPoint(graph, pin);
        if (pt && isFinite(pt.x) && isFinite(pt.y)) {
          pt = { x: Number(pt.x), y: Number(pt.y) };
          if (!manual) return pt;
          if (Shared.pointDistance(pt, manual) <= 24) return pt;
        }
      }
    } catch (e) {}
    return manual;
  };

  Shared.rectOfCell = function rectOfCell(cell) {
    var geo = cell && cell.geometry;
    if (!geo) return null;
    var x = Number(geo.x || 0), y = Number(geo.y || 0), w = Number(geo.width || 0), h = Number(geo.height || 0);
    return { x: x, y: y, width: w, height: h, left: x, top: y, right: x + w, bottom: y + h };
  };

  Shared.centerOfCell = function centerOfCell(cell) {
    var rect = Shared.rectOfCell(cell);
    return rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : null;
  };

  Shared.pointDistance = function pointDistance(a, b) {
    if (!a || !b) return Infinity;
    var dx = Number(a.x || 0) - Number(b.x || 0);
    var dy = Number(a.y || 0) - Number(b.y || 0);
    return Math.sqrt(dx * dx + dy * dy);
  };

  Shared.pointInRect = function pointInRect(point, rect, eps) {
    eps = Number(eps || 0);
    if (!point || !rect) return false;
    return point.x >= rect.left - eps && point.x <= rect.right + eps && point.y >= rect.top - eps && point.y <= rect.bottom + eps;
  };

  Shared.pointInRectInterior = function pointInRectInterior(point, rect, eps) {
    eps = Number(eps == null ? 0.01 : eps);
    if (!point || !rect) return false;
    return point.x > rect.left + eps && point.x < rect.right - eps && point.y > rect.top + eps && point.y < rect.bottom - eps;
  };

  Shared.expandRect = function expandRect(rect, pad) {
    pad = Number(pad || 0);
    return { left: rect.left - pad, top: rect.top - pad, right: rect.right + pad, bottom: rect.bottom + pad };
  };

  Shared.joinPath = function joinPath() {
    var parts = [];
    for (var i = 0; i < arguments.length; i++) {
      var value = trim(arguments[i]);
      if (!value) continue;
      parts.push(value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''));
    }
    if (!parts.length) return '';
    var leadingSlash = String(arguments[0] || '').indexOf('/') === 0 ? '/' : '';
    return leadingSlash + parts.join('/');
  };

  Shared.sanitizeName = function sanitizeName(name) {
    return trim(name).replace(/[^A-Za-z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '') || 'item';
  };

  Shared.cloneJson = function cloneJson(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (e) { return value; }
  };

  Shared.showTextPreview = function showTextPreview(title, textValue) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.28);z-index:10003;display:flex;align-items:center;justify-content:center;';
    var panel = document.createElement('div');
    panel.style.cssText = 'width:min(980px,92vw);height:min(680px,88vh);background:#fff;border:1px solid #d0d7e2;border-radius:14px;box-shadow:0 18px 48px rgba(15,23,42,.18);display:flex;flex-direction:column;overflow:hidden;';
    var head = document.createElement('div');
    head.style.cssText = 'height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;border-bottom:1px solid #e5e7eb;font:600 12px Helvetica,Arial,sans-serif;color:#111827;';
    head.textContent = title;
    var buttons = document.createElement('div');
    buttons.style.cssText = 'display:flex;gap:8px;';
    var copy = document.createElement('button'); copy.textContent = 'Copy'; copy.className = 'dftflow-mini-btn';
    var close = document.createElement('button'); close.textContent = 'Close'; close.className = 'dftflow-mini-btn';
    buttons.appendChild(copy); buttons.appendChild(close); head.appendChild(buttons); panel.appendChild(head);
    var ta = document.createElement('textarea');
    ta.value = textValue;
    ta.style.cssText = 'flex:1;min-height:0;border:0;outline:none;padding:14px;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;color:#111827;resize:none;';
    panel.appendChild(ta);
    overlay.appendChild(panel);
    close.onclick = function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };
    copy.onclick = function () { try { ta.select(); document.execCommand('copy'); } catch (e) {} };
    overlay.addEventListener('mousedown', function (evt) { if (evt.target === overlay) close.onclick(); });
    document.body.appendChild(overlay);
    return overlay;
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
