(function (global) {
  'use strict';

  var BOOT = global.DFTContextPanelBootstrapV3 || {};
  var PATCHED_FLAG = '__DFTContextPanelBootstrapV3Patched__';
  var timer = null;
  var observer = null;

  function log() {
    try { if (global.console && console.log) console.log.apply(console, ['[ContextPanelV3]'].concat([].slice.call(arguments))); } catch (e) {}
  }
  function warn() {
    try { if (global.console && console.warn) console.warn.apply(console, ['[ContextPanelV3]'].concat([].slice.call(arguments))); } catch (e) {}
  }

  function rememberUi(ui) {
    if (!ui) return ui;
    BOOT.lastUi = ui;
    global.__DFT_LAST_EDITOR_UI__ = ui;
    if (global.EditorUi && global.EditorUi.prototype) {
      global.EditorUi.prototype.__dftLastInstance = ui;
    }
    return ui;
  }

  function looksLikeUi(obj) {
    return !!(obj && obj.editor && obj.editor.graph && obj._phase1 && obj._phase1.contextShell);
  }

  function scanWindowForUi() {
    var keys;
    try { keys = Object.keys(global); } catch (e) { return null; }
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var val;
      try { val = global[key]; } catch (e2) { continue; }
      if (looksLikeUi(val)) return val;
      if (val && typeof val === 'object') {
        try {
          if (looksLikeUi(val.ui)) return val.ui;
          if (looksLikeUi(val.editorUi)) return val.editorUi;
        } catch (e3) {}
      }
    }
    return null;
  }

  function getUi() {
    var ui = null;
    if (BOOT.lastUi && looksLikeUi(BOOT.lastUi)) return BOOT.lastUi;
    if (global.__DFT_LAST_EDITOR_UI__ && looksLikeUi(global.__DFT_LAST_EDITOR_UI__)) return rememberUi(global.__DFT_LAST_EDITOR_UI__);
    if (global.App && looksLikeUi(global.App.editorUi)) return rememberUi(global.App.editorUi);
    if (looksLikeUi(global.editorUi)) return rememberUi(global.editorUi);
    if (looksLikeUi(global.ui)) return rememberUi(global.ui);
    if (global.EditorUi && global.EditorUi.prototype && looksLikeUi(global.EditorUi.prototype.__dftLastInstance)) {
      return rememberUi(global.EditorUi.prototype.__dftLastInstance);
    }
    ui = scanWindowForUi();
    if (ui) return rememberUi(ui);
    return null;
  }

  function getHost(ui) {
    return ui && ui._phase1 && ui._phase1.contextShell ? ui._phase1.contextShell : null;
  }

  function modulesReady() {
    return !!(global.DFTContextPanelCore && global.DFTContextPropertiesPanel && global.DFTContextIPLibraryPanel && global.DFTContextViewFilterPanel);
  }

  function hostHasNewPanel(host) {
    return !!(host && host.querySelector && host.querySelector('.dftctx-root'));
  }

  function diagnostics() {
    var ui = getUi();
    var host = getHost(ui);
    return {
      hasUi: !!ui,
      hasHost: !!host,
      modulesReady: modulesReady(),
      hasCore: !!global.DFTContextPanelCore,
      hasProperties: !!global.DFTContextPropertiesPanel,
      hasIP: !!global.DFTContextIPLibraryPanel,
      hasView: !!global.DFTContextViewFilterPanel,
      hostHasNewPanel: !!hostHasNewPanel(host),
      hostChildren: host ? host.childNodes.length : -1
    };
  }

  function isReady(ui) {
    return !!(ui && getHost(ui) && modulesReady());
  }

  function attach(ui, reason, force) {
    ui = rememberUi(ui || getUi());
    if (!isReady(ui)) {
      var d = diagnostics();
      warn('attach skipped:', reason || '', d);
      return false;
    }

    var host = getHost(ui);
    try {
      if (force || !hostHasNewPanel(host)) {
        host.innerHTML = '';
      }
      if (ui._dftContextPanel && typeof ui._dftContextPanel.mount === 'function') {
        ui._dftContextPanel.mount(host);
      } else {
        global.DFTContextPanelCore.create(ui, host);
      }
      host.setAttribute('data-dftctx-mounted', '1');
      installObserver(ui);
      if (reason) log('attached:', reason);
      return true;
    } catch (e) {
      warn('attach failed:', e);
      return false;
    }
  }

  function ensureMounted(reason, force) {
    var ui = getUi();
    if (!isReady(ui)) {
      warn('ensureMounted false:', reason || '', diagnostics());
      return false;
    }
    var host = getHost(ui);
    if (force || !hostHasNewPanel(host) || !ui._dftContextPanel) {
      return attach(ui, reason || 'ensure', !!force);
    }
    return true;
  }

  function installObserver(ui) {
    var host = getHost(ui);
    if (!host || typeof MutationObserver === 'undefined') return;
    if (observer && observer._host === host) return;
    if (observer) {
      try { observer.disconnect(); } catch (e) {}
      observer = null;
    }
    observer = new MutationObserver(function () {
      if (!hostHasNewPanel(host)) {
        setTimeout(function () { ensureMounted('mutation', true); }, 0);
      }
    });
    observer.observe(host, { childList: true, subtree: false });
    observer._host = host;
  }

  function startPolling() {
    if (timer) return;
    var tries = 0;
    timer = setInterval(function () {
      tries += 1;
      if (ensureMounted('poll-' + tries, false) || tries > 300) {
        clearInterval(timer);
        timer = null;
      }
    }, 100);
  }

  function patchEditorUi() {
    var EditorUi = global.EditorUi;
    if (!EditorUi || !EditorUi.prototype) return false;

    var proto = EditorUi.prototype;
    if (proto[PATCHED_FLAG]) return true;

    var prevCreateUi = proto.createUi;
    var prevRefresh = proto.refresh;

    proto.createUi = function () {
      rememberUi(this);
      var ret = prevCreateUi ? prevCreateUi.apply(this, arguments) : undefined;
      var self = this;
      setTimeout(function () { attach(self, 'createUi+0', true); }, 0);
      setTimeout(function () { attach(self, 'createUi+80', true); }, 80);
      setTimeout(function () { attach(self, 'createUi+250', true); }, 250);
      return ret;
    };

    proto.refresh = function () {
      rememberUi(this);
      var ret = prevRefresh ? prevRefresh.apply(this, arguments) : undefined;
      var host = getHost(this);
      if (host && (!hostHasNewPanel(host) || !this._dftContextPanel)) {
        setTimeout(function () { attach(this, 'refresh', true); }.bind(this), 0);
      }
      return ret;
    };

    proto[PATCHED_FLAG] = true;
    log('patched EditorUi lifecycle');
    return true;
  }

  function init() {
    patchEditorUi();
    startPolling();
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(function () { ensureMounted('dom-ready', false); }, 0);
      setTimeout(function () { ensureMounted('dom-ready-force', true); }, 120);
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        ensureMounted('dom-content-loaded', false);
        setTimeout(function () { ensureMounted('dom-content-loaded-force', true); }, 120);
      }, { once: true });
    }
    global.addEventListener('load', function () {
      ensureMounted('window-load', false);
      setTimeout(function () { ensureMounted('window-load-force', true); }, 120);
    }, { once: true });
  }

  BOOT.attach = attach;
  BOOT.ensureMounted = ensureMounted;
  BOOT.start = init;
  BOOT.patchEditorUi = patchEditorUi;
  BOOT.diagnose = diagnostics;
  global.DFTContextPanelBootstrapV3 = BOOT;

  init();
})(window);
