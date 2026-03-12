(function (global) {
  'use strict';

  var BOOT_FLAG = '__dftProjectExplorerBootstrapV2__';

  function log() {
    try {
      if (global.console && console.debug) console.debug.apply(console, ['[ProjectExplorerBootstrap]'].concat([].slice.call(arguments)));
    } catch (e) {}
  }

  function getUi() {
    return (global.App && global.App.editorUi) || null;
  }

  function getHost(ui) {
    if (!ui) return null;
    if (ui._phase1 && ui._phase1.projectShell) return ui._phase1.projectShell;
    if (ui._phase2ProjectExplorer && ui._phase2ProjectExplorer.host) return ui._phase2ProjectExplorer.host;
    return null;
  }

  function ensureGlobalBridge() {
    if (typeof global.DFTNotifyProjectExplorerRefresh !== 'function') {
      global.DFTNotifyProjectExplorerRefresh = function (ui, reason) {
        if (!ui) ui = getUi();
        if (!ui) return;
        if (typeof ui.refreshProjectExplorer === 'function') ui.refreshProjectExplorer();
        else if (global.DFTProjectExplorerPhase2 && typeof global.DFTProjectExplorerPhase2.notifyProjectChanged === 'function') {
          global.DFTProjectExplorerPhase2.notifyProjectChanged(ui, reason || '');
        }
      };
    }
  }

  function ensureUiBridge(ui) {
    if (!ui || !global.DFTProjectExplorerPhase2) return;
    if (typeof ui.refreshProjectExplorer !== 'function') {
      ui.refreshProjectExplorer = function () {
        global.DFTProjectExplorerPhase2.refresh(this);
      };
    }
    if (ui.format && typeof ui.format.refreshProject !== 'function') {
      ui.format.refreshProject = function () {
        if (typeof ui.refreshProjectExplorer === 'function') ui.refreshProjectExplorer();
      };
    } else if (ui.format && !ui.format.__dftRefreshProjectBridged) {
      var prev = ui.format.refreshProject;
      ui.format.refreshProject = function () {
        if (typeof ui.refreshProjectExplorer === 'function') ui.refreshProjectExplorer();
        else if (typeof prev === 'function') return prev.apply(this, arguments);
      };
      ui.format.__dftRefreshProjectBridged = true;
    }

    if (!ui.__dftOnProjectLoadedBridged) {
      var prevLoaded = ui.onProjectLoadedFromDisk;
      ui.onProjectLoadedFromDisk = function () {
        if (typeof prevLoaded === 'function') prevLoaded.apply(this, arguments);
        if (typeof ui.refreshProjectExplorer === 'function') ui.refreshProjectExplorer();
      };
      ui.__dftOnProjectLoadedBridged = true;
    }
  }

  function attachNow(ui, forceClear) {
    if (!ui || !global.DFTProjectExplorerPhase2 || typeof global.DFTProjectExplorerPhase2.attach !== 'function') return false;
    var host = getHost(ui);
    if (!host) return false;

    ensureUiBridge(ui);

    var alreadyMounted = ui._phase2ProjectExplorer &&
      ui._phase2ProjectExplorer.host === host &&
      host.querySelector &&
      host.querySelector('.phase2-project-host');

    if (alreadyMounted && !forceClear) {
      try { global.DFTProjectExplorerPhase2.refresh(ui); } catch (e) {}
      return true;
    }

    if (forceClear || !alreadyMounted) {
      try { host.innerHTML = ''; } catch (e2) {}
    }

    try {
      global.DFTProjectExplorerPhase2.attach(ui, host);
      try { if (typeof global.DFTProjectExplorerPhase2.refresh === 'function') global.DFTProjectExplorerPhase2.refresh(ui); } catch (e2) {}
      return true;
    } catch (e) {
      try { console.error(e); } catch (e3) {}
      return false;
    }
  }

  function patchPrototype() {
    if (!global.EditorUi || !global.DFTProjectExplorerPhase2) return false;
    var proto = global.EditorUi.prototype;
    ensureGlobalBridge();

    if (!proto[BOOT_FLAG]) {
      var prevCreateUi = proto.createUi;
      proto.createUi = function () {
        var res = prevCreateUi.apply(this, arguments);
        attachNow(this, true);
        return res;
      };

      var prevRefresh = proto.refresh;
      proto.refresh = function () {
        var res = prevRefresh.apply(this, arguments);
        var host = getHost(this);
        if (host && !host.querySelector('.phase2-project-host')) {
          attachNow(this, true);
        }
        return res;
      };

      proto[BOOT_FLAG] = true;
    }

    return true;
  }

  function install() {
    if (!global.DFTProjectExplorerPhase2) return false;
    patchPrototype();
    var ui = getUi();
    if (ui) {
      ensureUiBridge(ui);
      attachNow(ui, true);
      return true;
    }
    return false;
  }

  if (!install()) {
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      if (install() || tries > 150) {
        clearInterval(timer);
      }
    }, 100);
  }
})(window);
