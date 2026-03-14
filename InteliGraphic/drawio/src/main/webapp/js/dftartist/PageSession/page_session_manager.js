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

    if (!page && typeof ui.duplicatePage === 'function') {
      var src = ui.currentPage || (ui.pages && ui.pages[0]);
      if (src) {
        try {
          page = ui.duplicatePage(src, pageName);
          clearGraphPage(ui);
        } catch (e) {
          emitLog('warn', 'Failed to duplicate a page tab shell.', e);
        }
      }
    }

    if (page) {
      try {
        var currentName = typeof page.getName === 'function' ? page.getName() : page.name;
        if (currentName !== pageName && typeof ui.renamePage === 'function') {
          ui.renamePage(page, pageName);
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

    ensurePageTab(ui, pageName);

    var abs = await resolvePageFileAbs(ui, designRef, pageName);
    try { ui._activeEnvCtx = null; } catch (envErr) {}
    setActiveContext(ui, designRef, pageName, abs || null);

    var exists = await pageExists(abs);
    if (exists) {
      var xml = await readPageXml(abs);
      await loadPageXmlToCurrent(ui, xml);
      emitLog('info', 'Loaded page "' + pageName + '" from disk.');
    } else {
      clearGraphPage(ui);
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
