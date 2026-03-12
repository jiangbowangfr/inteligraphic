(function (global) {
  'use strict';

  global = global || (typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : (typeof self !== "undefined" ? self : {})));

  var NS = global.DFTFlowNavigatorBootstrap = global.DFTFlowNavigatorBootstrap || {};
  var lastUi = null;

  function isEditorUi(obj) {
    return !!(obj && typeof obj === 'object' && obj.editor && (obj._phase1 || obj.refresh));
  }

  function rememberUi(ui) {
    if (isEditorUi(ui)) {
      lastUi = ui;
      global.__DFTLastEditorUi = ui;
    }
  }

  function findUi() {
    var candidates = [
      global.App && global.App.editorUi,
      global.editorUi,
      global.ui,
      global.__DFTLastEditorUi,
      lastUi,
      global.EditorUi && global.EditorUi.prototype && global.EditorUi.prototype.__dftLastInstance
    ];
    for (var i = 0; i < candidates.length; i++) if (isEditorUi(candidates[i])) return candidates[i];
    for (var k in global) {
      if (!Object.prototype.hasOwnProperty.call(global, k)) continue;
      try {
        if (isEditorUi(global[k])) return global[k];
      } catch (e) {}
    }
    return null;
  }

  function modulesReady() {
    return !!(global.DFTFlowNavigator && global.DFTEnvEditorDialog);
  }

  function getHost(ui) {
    return ui && ui._phase1 ? ui._phase1.flowNavContainer : null;
  }

  function mount(reason, force) {
    var ui = findUi();
    if (!ui || !modulesReady()) return false;
    rememberUi(ui);
    var host = getHost(ui);
    if (!host) return false;
    if (!force && host.querySelector && host.querySelector('.dftflow-root')) return true;
    try {
      host.innerHTML = '';
    } catch (e) {}
    try {
      return !!global.DFTFlowNavigator.attach(ui, host);
    } catch (err) {
      if (global.console && console.warn) console.warn('[DFTFlowNavigatorBootstrap] attach failed (' + (reason || 'manual') + '):', err);
      return false;
    }
  }

  function patchLifecycle() {
    if (!global.EditorUi || !global.EditorUi.prototype || global.EditorUi.prototype.__dftFlowBootstrapPatched) return;
    var proto = global.EditorUi.prototype;
    proto.__dftFlowBootstrapPatched = true;

    var oldCreateUi = proto.createUi;
    proto.createUi = function () {
      var out = oldCreateUi.apply(this, arguments);
      proto.__dftLastInstance = this;
      rememberUi(this);
      setTimeout(function () { mount('createUi', true); }, 0);
      setTimeout(function () { mount('createUi-delayed', true); }, 80);
      return out;
    };

    var oldRefresh = proto.refresh;
    proto.refresh = function () {
      var out2 = oldRefresh.apply(this, arguments);
      proto.__dftLastInstance = this;
      rememberUi(this);
      setTimeout(function () { mount('refresh', false); }, 0);
      return out2;
    };
  }

  function startPolling() {
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      if (mount('poll-' + tries, false) || tries > 120) clearInterval(timer);
    }, 120);
  }

  NS.ensureMounted = function (reason, force) {
    return mount(reason || 'manual', !!force);
  };

  NS.diagnose = function () {
    var ui = findUi();
    var host = getHost(ui);
    return {
      hasUi: !!ui,
      hasHost: !!host,
      modulesReady: modulesReady(),
      hasFlowCore: !!global.DFTFlowNavigator,
      hasEnvEditor: !!global.DFTEnvEditorDialog,
      hostHasNavigator: !!(host && host.querySelector && host.querySelector('.dftflow-root')),
      activeStage: ui && ui.__dftFlowNavState ? ui.__dftFlowNavState.activeStage : null
    };
  };

  patchLifecycle();
  startPolling();
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : (typeof self !== "undefined" ? self : this)));
