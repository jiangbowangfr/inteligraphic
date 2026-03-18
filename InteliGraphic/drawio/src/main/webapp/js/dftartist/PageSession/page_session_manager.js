(function (global) {
  'use strict';

  var NS = global.DFTPageSessionManager = global.DFTPageSessionManager || {};

  function text(v) {
    return v == null ? '' : String(v);
  }

  function getViewStateStore(ui) {
    if (!ui) return null;
    if (!ui._dftPageViewState) ui._dftPageViewState = {};
    return ui._dftPageViewState;
  }

  function getPersistentViewStateKey(key) {
    return key ? ('dft:pageView:' + String(key)) : '';
  }

  function writePersistentViewState(key, state) {
    if (!key || !state || !global.localStorage) return;
    try {
      global.localStorage.setItem(getPersistentViewStateKey(key), JSON.stringify(state));
    } catch (e) {}
  }

  function readPersistentViewState(key) {
    if (!key || !global.localStorage) return null;
    try {
      var raw = global.localStorage.getItem(getPersistentViewStateKey(key));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function makeViewStateKey(designRef, pageName, absPath) {
    var abs = text(absPath).trim();
    if (abs) return 'abs:' + abs;
    var segs = Array.isArray(designRef && designRef._dirRel) ? designRef._dirRel.join('/') : '';
    return 'rel:' + segs + '::' + text(pageName).trim();
  }

  function captureViewState(ui, key) {
    if (!ui || !key || !ui.editor || !ui.editor.graph) return;
    var graph = ui.editor.graph;
    var container = graph.container;
    var view = graph.view;
    if (!container || !view) return;
    var store = getViewStateStore(ui);
    if (!store) return;
    store[key] = {
      scale: Number(view.scale || 1),
      tx: Number(view.translate ? view.translate.x : 0),
      ty: Number(view.translate ? view.translate.y : 0),
      scrollLeft: Number(container.scrollLeft || 0),
      scrollTop: Number(container.scrollTop || 0)
    };
    writePersistentViewState(key, store[key]);
  }

  function restoreViewState(ui, key) {
    if (!ui || !key || !ui.editor || !ui.editor.graph) return false;
    var graph = ui.editor.graph;
    var container = graph.container;
    var view = graph.view;
    var store = getViewStateStore(ui);
    var state = store && store[key];
    if (!state) {
      state = readPersistentViewState(key);
      if (state && store) store[key] = state;
    }
    if (!container || !view || !state) return false;

    try {
      if (typeof graph.getModel === 'function' && graph.getModel() && typeof graph.getModel().beginUpdate === 'function') {
        graph.getModel().beginUpdate();
        try {
          if (view.translate) {
            view.translate.x = Number(state.tx || 0);
            view.translate.y = Number(state.ty || 0);
          }
          view.scale = Number(state.scale || 1);
        } finally {
          graph.getModel().endUpdate();
        }
      } else {
        if (view.translate) {
          view.translate.x = Number(state.tx || 0);
          view.translate.y = Number(state.ty || 0);
        }
        view.scale = Number(state.scale || 1);
      }
    } catch (e) {}

    try {
      if (typeof graph.view.validate === 'function') graph.view.validate();
      if (typeof graph.sizeDidChange === 'function') graph.sizeDidChange();
      if (typeof graph.refresh === 'function') graph.refresh();
      container.scrollLeft = Number(state.scrollLeft || 0);
      container.scrollTop = Number(state.scrollTop || 0);
    } catch (e2) {}

    [0, 30, 120].forEach(function (delay) {
      setTimeout(function () {
        try {
          if (view.translate) {
            view.translate.x = Number(state.tx || 0);
            view.translate.y = Number(state.ty || 0);
          }
          view.scale = Number(state.scale || 1);
          if (typeof graph.view.validate === 'function') graph.view.validate();
          if (typeof graph.sizeDidChange === 'function') graph.sizeDidChange();
          container.scrollLeft = Number(state.scrollLeft || 0);
          container.scrollTop = Number(state.scrollTop || 0);
        } catch (e3) {}
      }, delay);
    });
    return true;
  }

  function captureActiveViewState(ui) {
    if (ui && ui._activeEnvCtx) return;
    var ctx = getActiveContext(ui);
    if (!ctx || !ctx.name) return;
    var designRef = ctx.designRef || null;
    var key = makeViewStateKey(designRef, ctx.name, ctx.abs || '');
    captureViewState(ui, key);
  }

  function sanitizeName(name) {
    if (typeof global._sanitizeFileName === 'function') {
      try { return global._sanitizeFileName(name); } catch (e) {}
    }
    return text(name).replace(/[\\/:*?"<>|]+/g, '_').trim() || 'page';
  }

  function isFloorplanRef(designRef) {
    if (!designRef) return false;
    if (designRef._isFloorplan) return true;
    if (text(designRef.name).trim().toLowerCase() === 'floorplan') return true;
    var segs = Array.isArray(designRef._dirRel) ? designRef._dirRel.join('/').toLowerCase() : '';
    return segs === 'floorplan' || /(^|\/)floorplan$/.test(segs);
  }

  function activateDrawingWorkspace(ui) {
    try { if (ui) ui._activeWorkspaceKey = null; } catch (_) { }
    var shell = ui && ui._phase1 && ui._phase1.workspaceShell ? ui._phase1.workspaceShell : document;
    var body = ui && ui._phase1 && ui._phase1.workspaceBody
      ? ui._phase1.workspaceBody
      : shell.querySelector('.phase1-workspace-body');
    var tabstrip = shell.querySelector('.phase1-workspace-tabstrip');
    if (!body || !tabstrip) return;

    Array.prototype.forEach.call(tabstrip.querySelectorAll('.phase1-tab[data-key]'), function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-key') === 'design');
    });
    Array.prototype.forEach.call(body.querySelectorAll('.phase1-workspace-embed-panel[data-key]'), function (panel) {
      panel.classList.remove('active');
    });
    Array.prototype.forEach.call(body.children || [], function (child) {
      if (!child || child.getAttribute('data-dft-workspace-panel') === '1') return;
      if (!child.hasAttribute('data-dft-display-before-embed')) {
        child.setAttribute('data-dft-display-before-embed', child.style.display || '');
      }
      child.style.display = child.getAttribute('data-dft-display-before-embed');
    });

    try {
      var graph = ui && ui.editor ? ui.editor.graph : null;
      if (graph && graph.container) {
        graph.container.style.pointerEvents = 'auto';
        graph.container.offsetWidth;
        if (graph.view && typeof graph.view.validate === 'function') graph.view.validate();
        if (typeof graph.sizeDidChange === 'function') graph.sizeDidChange();
      }
      if (typeof ui.refresh === 'function') ui.refresh();
      if (ui && typeof ui.refreshProjectExplorer === 'function') ui.refreshProjectExplorer();
      if (global.window && typeof global.window.dispatchEvent === 'function' && typeof global.Event === 'function') {
        global.window.dispatchEvent(new global.Event('resize'));
      }
    } catch (e) {}
  }

  function syncLayersDialogForPage(ui, designRef) {
    if (!ui) return;
    if (!isFloorplanRef(designRef)) {
      try {
        if (ui.actions && ui.actions.layersWindow && ui.actions.layersWindow.window && ui.actions.layersWindow.window.isVisible()) {
          ui.actions.layersWindow.window.setVisible(false);
        }
      } catch (e0) {}
      return;
    }
    if (typeof ui.showLayersDialog !== 'function') return;
    setTimeout(function () {
      try { ui.showLayersDialog(); } catch (e) {}
    }, 0);
  }
    
  function resetUndoHistoryForCurrentPage(ui, reason) {
    if (!ui || !ui.editor || !ui.editor.undoManager) return;
    try {
        ui.editor.undoManager.clear();
    } catch (e0) {}

    try {
        if (ui.currentPage) {
        ui.currentPage.__dftUndoState = { history: [], indexOfNextAdd: 0 };
        }
    } catch (e1) {}

    try {
        if (typeof console !== "undefined" && console.log) {
        console.log("[dft-page-session]", {
            stage: "reset-undo-history",
            reason: reason || "page-open",
            page:
            ui.currentPage && typeof ui.currentPage.getName === "function"
                ? ui.currentPage.getName()
                : (ui.currentPage && ui.currentPage.name) || "(unknown)",
        });
        }
    } catch (e2) {}
    }

  function getPageAbsPath(page) {
    if (!page) return '';
    try {
      return text(page.__dftPageAbs || '').trim();
    } catch (e) {
      return '';
    }
  }

  function markPageSession(page, absPath, loaded) {
    if (!page) return;
    try {
      if (absPath) page.__dftPageAbs = absPath;
      if (loaded != null) page.__dftLoadedOnce = !!loaded;
    } catch (e) {}
  }

  function findPageByAbs(ui, absPath) {
    if (!ui || !Array.isArray(ui.pages) || !absPath) return null;
    for (var i = 0; i < ui.pages.length; i++) {
      if (getPageAbsPath(ui.pages[i]) === absPath) {
        return ui.pages[i];
      }
    }
    return null;
  }
    
  function getProjectStorageRoot(ui) {
    var dbRoot = ui && ui._projectDbDirPath ? String(ui._projectDbDirPath) : '';
    if (dbRoot) return dbRoot.replace(/\\/g, '/').replace(/\/+/g, '/');
    var root = ui && (ui._projectRootPath || ui._projectYamlDir) ? String(ui._projectRootPath || ui._projectYamlDir) : '';
    root = root.replace(/\\/g, '/').replace(/\/+/g, '/');
    return root ? joinPath(root, 'db') : '';
  }

  function joinPath() {
    if (typeof global._joinPath === 'function') {
      try { return global._joinPath.apply(global, arguments); } catch (e) {}
    }
    var parts = [];
    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i] != null && arguments[i] !== '') parts.push(String(arguments[i]));
    }
    return parts.join('/').replace(/\/+/g, '/');
  }

  function request(payload) {
    if (typeof global.requestSync === 'function') {
      return global.requestSync(payload);
    }
    return Promise.reject(new Error('requestSync unavailable'));
  }

  function setStatus(ui, msg) {
    try {
      if (ui && ui.editor && typeof ui.editor.setStatus === 'function') {
        ui.editor.setStatus(msg);
      }
    } catch (e) {}
  }

  function emitLog(level, message, meta) {
    try {
      if (level === 'info') return;
      var prefix = '[PageSession]';
      var fn = level === 'error' ? 'error' : (level === 'warn' ? 'warn' : 'log');
      if (global.console && typeof console[fn] === 'function') {
        if (meta !== undefined) console[fn](prefix, message, meta);
        else console[fn](prefix, message);
      }
    } catch (e) {}

    try {
      if (global.DFTDockRuntimeBridge && typeof global.DFTDockRuntimeBridge.pushLine === 'function') {
        global.DFTDockRuntimeBridge.pushLine(level || 'info', '[PageSession] ' + message);
      }
    } catch (e2) {}
  }

  function summarizeXmlIds(xml) {
    var summary = {
      totalIds: 0,
      duplicateCount: 0,
      duplicates: [],
      cellCount: 0
    };
    try {
      if (!xml || !global.mxUtils || typeof global.mxUtils.parseXml !== 'function') return summary;
      var doc = global.mxUtils.parseXml(String(xml));
      var root = doc && doc.documentElement;
      if (!root) return summary;
      var ids = Object.create(null);

      function walk(node) {
        if (!node || node.nodeType !== 1) return;
        if (node.nodeName === 'mxCell') summary.cellCount++;
        var id = node.getAttribute && node.getAttribute('id');
        if (id != null && id !== '') {
          summary.totalIds++;
          if (ids[id]) {
            ids[id]++;
          } else {
            ids[id] = 1;
          }
        }
        for (var child = node.firstChild; child != null; child = child.nextSibling) walk(child);
      }

      walk(root);

      var keys = Object.keys(ids);
      for (var i = 0; i < keys.length; i++) {
        if (ids[keys[i]] > 1) {
          summary.duplicateCount++;
          if (summary.duplicates.length < 10) {
            summary.duplicates.push({ id: keys[i], count: ids[keys[i]] });
          }
        }
      }
    } catch (e) {
      summary.error = e && e.message ? e.message : String(e);
    }
    return summary;
  }

  function makeUniqueXmlId(base, used) {
    var seed = text(base || 'cell').trim() || 'cell';
    var candidate = seed;
    var idx = 1;
    while (used[candidate]) {
      candidate = seed + '_dup' + idx;
      idx++;
    }
    used[candidate] = true;
    return candidate;
  }

  function rewriteRefsInSubtree(node, idMap) {
    if (!node || node.nodeType !== 1 || !idMap) return;
    var attrs = ['parent', 'source', 'target'];
    for (var i = 0; i < attrs.length; i++) {
      var key = attrs[i];
      var raw = node.getAttribute && node.getAttribute(key);
      if (raw != null && idMap[raw]) node.setAttribute(key, idMap[raw]);
    }
    for (var child = node.firstChild; child != null; child = child.nextSibling) {
      rewriteRefsInSubtree(child, idMap);
    }
  }

  function repairDuplicateIdsInXml(xml) {
    var result = {
      changed: false,
      xml: String(xml || ''),
      before: summarizeXmlIds(xml),
      after: null,
      rewrites: []
    };
    if (!result.before.duplicateCount || !global.mxUtils || typeof global.mxUtils.parseXml !== 'function' || typeof global.mxUtils.getXml !== 'function') {
      result.after = result.before;
      return result;
    }

    try {
      var doc = global.mxUtils.parseXml(String(xml || ''));
      var root = doc && doc.documentElement;
      if (!root) {
        result.after = result.before;
        return result;
      }

      var used = Object.create(null);
      (function markUsed(node) {
        if (!node || node.nodeType !== 1) return;
        var id = node.getAttribute && node.getAttribute('id');
        if (id != null && id !== '' && !used[id]) used[id] = true;
        for (var child = node.firstChild; child != null; child = child.nextSibling) markUsed(child);
      })(root);

      var seen = Object.create(null);
      (function repair(node) {
        if (!node || node.nodeType !== 1) return;
        var id = node.getAttribute && node.getAttribute('id');
        if (id != null && id !== '') {
          if (seen[id]) {
            var nextId = makeUniqueXmlId(id, used);
            node.setAttribute('id', nextId);
            var map = {};
            map[id] = nextId;
            rewriteRefsInSubtree(node, map);
            result.changed = true;
            if (result.rewrites.length < 20) result.rewrites.push({ from: id, to: nextId });
          } else {
            seen[id] = true;
          }
        }
        for (var child = node.firstChild; child != null; child = child.nextSibling) repair(child);
      })(root);

      result.xml = global.mxUtils.getXml(root);
      result.after = summarizeXmlIds(result.xml);
      return result;
    } catch (e) {
      result.error = e && e.message ? e.message : String(e);
      result.after = result.before;
      return result;
    }
  }

  function isModified(ui) {
    try {
      return !!(ui && ui.editor && typeof ui.editor.isModified === 'function' && ui.editor.isModified());
    } catch (e) {
      return false;
    }
  }

  function getActiveContext(ui) {
    return ui && ui._activeProjectPageCtx ? ui._activeProjectPageCtx : null;
  }

  function getActivePageName(ui) {
    var ctx = getActiveContext(ui);
    if (ctx && ctx.name) return ctx.name;
    try {
      if (ui && ui.currentPage) {
        return typeof ui.currentPage.getName === 'function' ? ui.currentPage.getName() : ui.currentPage.name;
      }
    } catch (e) {}
    return '';
  }

  function setActiveContext(ui, designRef, pageName, absPath) {
    if (!ui || !designRef || !pageName) return null;

    if (typeof global._setActivePageCtx === 'function') {
      try {
        global._setActivePageCtx(ui, designRef, pageName, absPath);
        return ui._activeProjectPageCtx || null;
      } catch (e) {
        emitLog('warn', '_setActivePageCtx failed; using fallback context.', e);
      }
    }

    var segs = (designRef && Array.isArray(designRef._dirRel) && designRef._dirRel.slice()) ||
      (designRef && typeof designRef.env_file === 'string' && designRef.env_file
        ? designRef.env_file.replace(/\\/g, '/').split('/').slice(0, -1)
        : [sanitizeName(designRef && designRef.name || 'design')]);

    ui._activeProjectPageCtx = {
      name: pageName,
      segs: segs,
      designRef: designRef || null
    };

    if (absPath) ui._activeProjectPageCtx.abs = absPath;
    if (designRef) ui._activeProjectPageCtx.designKey = (Array.isArray(segs) ? segs.join('/') : '');
    return ui._activeProjectPageCtx;
  }

  function ensureWorkspaceReady(ui) {
    if (!ui) return;
    try {
      if (ui._noProjectMode && typeof ui._exitNoProjectMode === 'function') {
        ui._exitNoProjectMode();
        emitLog('info', 'Exited no-project mode.');
        return;
      }
    } catch (e) {
      emitLog('warn', '_exitNoProjectMode failed.', e);
    }

    try {
      if (ui && ui._noProjectMode) ui._noProjectMode = false;
    } catch (e2) {}
  }

  function clearGraphPage(ui) {
    if (!ui || !ui.editor || !ui.editor.graph) return;
    try {
      var graph = ui.editor.graph;
      var parent = graph.getDefaultParent();
      graph.getModel().beginUpdate();
      try {
        var cells = graph.getChildCells(parent, true, true);
        if (cells && cells.length) graph.removeCells(cells, true);
      } finally {
        graph.getModel().endUpdate();
      }
    } catch (e) {
      emitLog('warn', 'Failed to clear graph.', e);
    }
  }

  function enterNoProjectMode(ui) {
    if (!ui) return;

    try { ui._noProjectMode = true; } catch (e0) {}

    try {
      if (ui.editor && ui.editor.graph) ui.editor.graph.setEnabled(false);
    } catch (e1) {}

    try {
      if (ui.diagramContainer) ui.diagramContainer.style.display = 'none';
    } catch (e2) {}

    try {
      if (ui._splashContainer) {
        ui._splashContainer.style.display = 'flex';
        ui._splashContainer.style.position = 'absolute';
        ui._splashContainer.style.left = '0';
        ui._splashContainer.style.right = '0';
        ui._splashContainer.style.top = '0';
        ui._splashContainer.style.bottom = '0';
        ui._splashContainer.style.zIndex = '3';
        ui._splashContainer.style.background = 'rgba(255,255,255,0.92)';
        var splashParent = (ui._phase1 && ui._phase1.workspaceBody) || ui.container;
        if (splashParent && ui._splashContainer.parentNode !== splashParent) {
          splashParent.appendChild(ui._splashContainer);
        }
      }
    } catch (e3) {}

    try {
      if (ui._phase1 && ui._phase1.designTab) {
        ui._phase1.designTab.textContent = 'Design';
        ui._phase1.designTab.title = '';
      }
    } catch (e4) {}

    try {
      if (typeof ui.refresh === 'function') ui.refresh(true);
    } catch (e5) {}
  }

  function renamePageSilently(ui, page, pageName) {
    if (!ui || !page || !pageName) return;
    try {
      if (typeof page.setName === 'function') page.setName(pageName);
      else page.name = pageName;
    } catch (e0) {}
    try {
      if (page.node && typeof page.node.setAttribute === 'function') {
        page.node.setAttribute('name', pageName);
      }
    } catch (e1) {}
    try {
      if (typeof ui.updatePageTabs === 'function') ui.updatePageTabs();
    } catch (e2) {}
  }

  function resetPageDiagramData(ui, page) {
    if (!ui || !page) return;

    try {
      if (page.viewState) {
        page.viewState.scale = 1;
        delete page.viewState.scrollLeft;
        delete page.viewState.scrollTop;
        delete page.viewState.currentRoot;
        delete page.viewState.defaultParent;
      }
    } catch (e0) {}

    try {
      if (typeof ui.initDiagramNode === 'function' && typeof global.mxCodec === 'function' &&
        typeof global.mxUtils !== 'undefined' && typeof global.mxGraphModel === 'function') {
        var doc = global.mxUtils.createXmlDocument();
        var codec = new global.mxCodec(doc);
        var emptyModel = new global.mxGraphModel();
        ui.initDiagramNode(page, codec.encode(emptyModel));
      } else if (page.node && page.node.ownerDocument && typeof page.node.ownerDocument.createElement === 'function') {
        var replacement = page.node.ownerDocument.createElement('diagram');
        var pageName = typeof page.getName === 'function' ? page.getName() : page.name;
        replacement.setAttribute('name', pageName || 'Page-1');
        page.node = replacement;
      }
    } catch (e1) {}
  }

  function resetWorkspace(ui, pageName) {
    if (!ui) return;

    try { ui._activeProjectPageCtx = null; } catch (e0) {}
    try { ui._activeEnvCtx = null; } catch (e1) {}

    var targetName = text(pageName).trim() || 'Page-1';
    var blankPage = createBlankPageTab(ui, targetName);
    if (!blankPage) {
      blankPage = ui.currentPage || (ui.pages && ui.pages[0]) || null;
      if (blankPage) {
        renamePageSilently(ui, blankPage, targetName);
        resetPageDiagramData(ui, blankPage);
      }
    }

    if (blankPage && typeof ui.selectPage === 'function') {
      try { ui.selectPage(blankPage, true); } catch (e2) {}
    }

    clearGraphPage(ui);

    if (blankPage) {
      resetPageDiagramData(ui, blankPage);
    }

    if (Array.isArray(ui.pages) && ui.pages.length > 1 && typeof ui.removePage === 'function') {
      for (var i = ui.pages.length - 1; i >= 0; i--) {
        var page = ui.pages[i];
        if (!page || page === blankPage) continue;
        try { ui.removePage(page); } catch (e3) {}
      }
    }

    try {
      if (typeof ui.updatePageTabs === 'function') ui.updatePageTabs();
    } catch (e4) {}

    enterNoProjectMode(ui);
  }

  function createBlankPageTab(ui, pageName) {
    if (!ui || !pageName) return null;
    if (typeof ui.createPage === 'function' && typeof ui.insertPage === 'function') {
      try {
        var created = ui.createPage(pageName);
        var index0 = mxUtils.indexOf(ui.pages || [], ui.currentPage);
        if (index0 < 0) index0 = (ui.pages && ui.pages.length) ? ui.pages.length - 1 : 0;
        return ui.insertPage(created, index0 + 1);
      } catch (e0) {
        emitLog('warn', 'ui.createPage failed; falling back to manual page creation.', e0);
      }
    }
    if (typeof global.DiagramPage !== 'function' || typeof ui.insertPage !== 'function') return null;

    try {
      var doc = global.mxUtils && typeof global.mxUtils.createXmlDocument === 'function'
        ? global.mxUtils.createXmlDocument()
        : document.implementation.createDocument('', '', null);
      var node = doc.createElement('diagram');
      node.setAttribute('name', pageName);

      var page = new global.DiagramPage(node);
      if (typeof page.setName === 'function') page.setName(pageName);
      else page.name = pageName;

      if (ui.currentPage && ui.currentPage.node) {
        var srcNode = ui.currentPage.node.cloneNode(false);
        srcNode.removeAttribute && srcNode.removeAttribute('id');
        srcNode.setAttribute('name', pageName);
        page.node = srcNode;
      }

      if (typeof ui.initDiagramNode === 'function') {
        var emptyModel = new mxGraphModel();
        ui.initDiagramNode(page, new mxCodec(global.mxUtils.createXmlDocument()).encode(emptyModel));
      }

      var index = mxUtils.indexOf(ui.pages || [], ui.currentPage);
      if (index < 0) index = (ui.pages && ui.pages.length) ? ui.pages.length - 1 : 0;
      return ui.insertPage(page, index + 1);
    } catch (e) {
      emitLog('warn', 'Failed to create blank page tab.', e);
      return null;
    }
  }

  function ensurePageTab(ui, pageName) {
    if (!ui || !pageName) return null;

    var pages = ui.pages || [];
    var page = null;

    for (var i = 0; i < pages.length; i++) {
      var nm = typeof pages[i].getName === 'function' ? pages[i].getName() : pages[i].name;
      if (nm === pageName) {
        page = pages[i];
        break;
      }
    }

    if (!page) {
      page = createBlankPageTab(ui, pageName);
      if (page) {
        emitLog('info', 'Created blank page tab shell for "' + pageName + '".');
      }
    }

    if (page) {
      try {
        var currentName = typeof page.getName === 'function' ? page.getName() : page.name;
        if (currentName !== pageName) {
          if (typeof page.setName === 'function') page.setName(pageName);
          else page.name = pageName;
        }
      } catch (e2) {}

      try {
        if (typeof ui.selectPage === 'function') ui.selectPage(page);
      } catch (e3) {}
    }

    return page;
  }

  async function resolvePageFileAbs(ui, designRef, pageName) {
    if (typeof global._resolvePageFileAbs === 'function') {
      return global._resolvePageFileAbs(ui, designRef, pageName);
    }

    if (!ui) throw new Error('UI not ready');
    var root = getProjectStorageRoot(ui);
    if (!root) throw new Error('Please save project first.');

    if (isFloorplanRef(designRef)) {
      var floorplanDir = joinPath(root, 'floorplan');
      try { await request({ action: 'ensureDirs', path: floorplanDir }); } catch (e0) {}
      return joinPath(floorplanDir, sanitizeName(pageName) + '.dftart');
    }

    var segs = (designRef && Array.isArray(designRef._dirRel) && designRef._dirRel.slice()) ||
      (designRef && typeof designRef.env_file === 'string' && designRef.env_file
        ? designRef.env_file.replace(/\\/g, '/').split('/').slice(0, -1)
        : [sanitizeName(designRef && designRef.name || 'design')]);

    var pageDir = joinPath.apply(null, [root].concat(segs).concat(['page']));
    try { await request({ action: 'ensureDirs', path: pageDir }); } catch (e) {}
    return joinPath(pageDir, sanitizeName(pageName) + '.dftart');
  }

  async function loadPageXmlToCurrent(ui, xml) {
    var xmlSummary = summarizeXmlIds(xml);
    emitLog(
      xmlSummary.duplicateCount ? 'warn' : 'info',
      'Preparing to load page XML.',
      xmlSummary
    );

    if (typeof global._loadPageXmlToCurrent === 'function') {
      return global._loadPageXmlToCurrent(ui, xml);
    }

    if (ui && ui.editor && typeof ui.editor.setGraphXml === 'function' && typeof global.mxUtils !== 'undefined') {
      var doc = global.mxUtils.parseXml(xml);
      var node = doc && doc.documentElement;
      if (node && node.nodeName === 'mxfile') {
        var models = node.getElementsByTagName('mxGraphModel');
        node = models && models.length ? models[0] : node;
      }
      if (node) {
        ui.editor.setGraphXml(node);
        return;
      }
    }

    clearGraphPage(ui);

    if (ui && typeof ui.importXml === 'function') {
      ui.importXml(xml);
      return;
    }

    throw new Error('No page xml loader available.');
  }

  async function pageExists(absPath) {
    if (!absPath) return false;
    try {
      await request({ action: 'fileStat', file: absPath });
      return true;
    } catch (e) {
      return false;
    }
  }

  async function readPageXml(absPath) {
    if (!absPath) throw new Error('Page path is empty');
    return request({ action: 'readFile', filename: absPath, encoding: 'utf-8' });
  }

  async function saveActivePage(ui, opts) {
    opts = opts || {};

    var modified = isModified(ui);
    if (!modified && !opts.force) return { saved: false, reason: 'clean' };

    if (typeof global.DftSaveProjectIndividually === 'function') {
      await global.DftSaveProjectIndividually(ui, {
        silentIfUnmapped: opts.silentIfUnmapped !== false
      });
      var tag = modified ? 'Autosaved before: ' : 'Auto-synced before: ';
      setStatus(ui, tag + (opts.reason || 'action'));
      emitLog('info', (modified ? 'Autosaved' : 'Auto-synced') + ' active page before ' + (opts.reason || 'action') + '.');
      return { saved: true };
    }

    emitLog('warn', 'DftSaveProjectIndividually unavailable; skipped autosave.');
    return { saved: false, reason: 'unavailable' };
  }

  function ensureHelpersBound(ui) {
    if (!ui) return null;
    if (!ui.pageSession) {
      ui.pageSession = {
        openPage: function (designRef, pageName, opts) { return NS.openPage(ui, designRef, pageName, opts); },
        switchPage: function (designRef, pageName, opts) { return NS.switchPage(ui, designRef, pageName, opts); },
        saveActivePage: function (opts) { return NS.saveActivePage(ui, opts); },
        reloadActivePage: function (opts) { return NS.reloadActivePage(ui, opts); },
        getActiveContext: function () { return NS.getActiveContext(ui); },
        getActivePageName: function () { return NS.getActivePageName(ui); }
      };
    }
    return ui.pageSession;
  }

  async function openPage(ui, designRef, pageName, opts) {
    opts = opts || {};
    if (!ui) throw new Error('EditorUi unavailable');
    if (!designRef) throw new Error('designRef is required');
    if (!pageName) throw new Error('pageName is required');

    ensureWorkspaceReady(ui);
    ensureHelpersBound(ui);
    captureActiveViewState(ui);

    if (!opts.skipSave) {
      await saveActivePage(ui, {
        force: true,
        reason: opts.reason || opts.source || 'open-page',
        silentIfUnmapped: opts.silentIfUnmapped !== false
      });
    }

    var abs = await resolvePageFileAbs(ui, designRef, pageName);
    var page = findPageByAbs(ui, abs);

    if (!page) {
      page = ensurePageTab(ui, pageName);
    } else if (page !== ui.currentPage && typeof ui.selectPage === 'function') {
      try { ui.selectPage(page); } catch (reuseSelectErr) {}
    }

    if (page) {
      markPageSession(page, abs, page.__dftLoadedOnce === true);
    }

    emitLog('info', 'Opening page.', {
      pageName: pageName,
      absPath: abs,
      designName: designRef && designRef.name ? designRef.name : '',
      source: opts.source || opts.reason || 'open-page'
    });
    try { ui._activeEnvCtx = null; } catch (envErr) {}
    setActiveContext(ui, designRef, pageName, abs || null);

    if (page && page.__dftLoadedOnce) {
      emitLog('info', 'Reusing in-memory page session.', {
        pageName: pageName,
        absPath: abs
      });

      try {
        if (typeof ui.updatePageTabs === 'function') ui.updatePageTabs();
      } catch (reuseTabsErr) {}

      setStatus(ui, 'Opened page: ' + pageName);

      try {
        if (typeof ui.refreshProjectExplorer === 'function') ui.refreshProjectExplorer();
      } catch (reuseExplorerErr) {}

      activateDrawingWorkspace(ui);
      restoreViewState(ui, makeViewStateKey(designRef, pageName, abs || ''));
      syncLayersDialogForPage(ui, designRef);

      return {
        pageName: pageName,
        absPath: abs,
        exists: true,
        context: getActiveContext(ui)
      };
    }

    var exists = await pageExists(abs);
    if (exists) {
      var xml = await readPageXml(abs);
      var repair = repairDuplicateIdsInXml(xml);
      if (repair.changed) {
        emitLog('warn', 'Repaired duplicate IDs in page XML before load.', {
          pageName: pageName,
          absPath: abs,
          rewrites: repair.rewrites,
          before: repair.before,
          after: repair.after
        });
        xml = repair.xml;
        try {
          await request({ action: 'writeFile', path: abs, data: xml, enc: 'utf-8' });
        } catch (repairWriteErr) {
          emitLog('warn', 'Failed to persist repaired page XML.', repairWriteErr);
        }
      }
      emitLog('info', 'Read page XML from disk.', Object.assign({
        pageName: pageName,
        absPath: abs,
        xmlLength: String(xml || '').length
      }, summarizeXmlIds(xml)));
      await loadPageXmlToCurrent(ui, xml);
      if (ui && ui.currentPage) {
        markPageSession(ui.currentPage, abs, true);
      }
      emitLog('info', 'Loaded page "' + pageName + '" from disk.');
    } else {
      clearGraphPage(ui);
      if (ui && ui.currentPage) {
        markPageSession(ui.currentPage, abs, true);
      }
      emitLog('warn', 'Page file does not exist yet; opened blank page shell for "' + pageName + '".');
    }

    try {
      if (typeof ui.updatePageTabs === 'function') ui.updatePageTabs();
    } catch (e1) {}

    setStatus(ui, 'Opened page: ' + pageName);

    try {
      if (typeof ui.refreshProjectExplorer === 'function') ui.refreshProjectExplorer();
    } catch (e2) {}

    activateDrawingWorkspace(ui);
    restoreViewState(ui, makeViewStateKey(designRef, pageName, abs || ''));
    syncLayersDialogForPage(ui, designRef);
    resetUndoHistoryForCurrentPage(ui, exists ? 'open-page-loaded' : 'open-page-blank');
    
    return {
      pageName: pageName,
      absPath: abs,
      exists: exists,
      context: getActiveContext(ui)
    };
  }

  async function switchPage(ui, designRef, pageName, opts) {
    return openPage(ui, designRef, pageName, opts || {});
  }

  async function reloadActivePage(ui, opts) {
    var ctx = getActiveContext(ui);
    if (!ctx || !ctx.name) throw new Error('No active project page');

    var model = ui && ui.projectModel;
    var designRef = null;

    function walk(list) {
      if (!Array.isArray(list) || designRef) return;
      for (var i = 0; i < list.length; i++) {
        var item = list[i];
        var segs = (item && Array.isArray(item._dirRel) && item._dirRel.slice()) || [];
        if (ctx.segs && segs.join('/') === ctx.segs.join('/')) {
          designRef = item;
          return;
        }
        walk(item && item.sub_designs);
      }
    }

    walk(model && model.designs);
    if (!designRef && ctx.segs && ctx.segs.join('/') === 'floorplan') {
      designRef = { name: 'floorplan', _dirRel: ['floorplan'], _isFloorplan: true };
    }
    if (!designRef) throw new Error('Active design not found in project model');

    return openPage(ui, designRef, ctx.name, Object.assign({}, opts || {}, { skipSave: true, reason: 'reload-active-page' }));
  }

  NS.ensureHelpersBound = ensureHelpersBound;
  NS.ensureWorkspaceReady = ensureWorkspaceReady;
  NS.clearGraphPage = clearGraphPage;
  NS.enterNoProjectMode = enterNoProjectMode;
  NS.renamePageSilently = renamePageSilently;
  NS.resetWorkspace = resetWorkspace;
  NS.ensurePageTab = ensurePageTab;
  NS.resolvePageFileAbs = resolvePageFileAbs;
  NS.loadPageXmlToCurrent = loadPageXmlToCurrent;
  NS.pageExists = pageExists;
  NS.readPageXml = readPageXml;
  NS.getActiveContext = getActiveContext;
  NS.getActivePageName = getActivePageName;
  NS.captureActiveViewState = captureActiveViewState;
  NS.setActiveContext = setActiveContext;
  NS.saveActivePage = saveActivePage;
  NS.openPage = openPage;
  NS.switchPage = switchPage;
  NS.reloadActivePage = reloadActivePage;
  NS.attachToUi = ensureHelpersBound;
})(window);
