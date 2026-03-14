(function (global) {
  'use strict';

  var STYLE_ID = 'dft-context-panel-style-v2';

  function ensureStyle() {
    var old = document.getElementById('dft-context-panel-style');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = '' +
      '.dftctx-root{display:flex;flex-direction:column;height:100%;width:100%;overflow:hidden;background:#fff;color:#111827;font-family:Helvetica,Arial,sans-serif;font-size:12px;}' +
      '.dftctx-titlebar{display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid rgba(0,0,0,.08);background:#fff;flex:0 0 auto;}' +
      '.dftctx-title{font-size:12px;font-weight:700;letter-spacing:.01em;}' +
      '.dftctx-spacer{flex:1 1 auto;min-width:8px;}' +
      '.dftctx-btn,.dftctx-iconbtn{appearance:none;display:inline-flex;align-items:center;justify-content:center;height:28px;min-width:28px;border:1px solid rgba(0,0,0,.10);background:#fff;color:#111827;border-radius:8px;cursor:pointer;line-height:1;padding:0 10px;font-size:12px;}' +
      '.dftctx-btn:hover,.dftctx-iconbtn:hover{background:rgba(0,0,0,.05);}' +
      '.dftctx-btn.primary{background:#2563eb;border-color:#2563eb;color:#fff;}' +
      '.dftctx-btn.primary:hover{background:#1d4ed8;}' +
      '.dftctx-btn.ghost{background:#f8fafc;}' +
      '.dftctx-tabs{display:flex;align-items:center;justify-content:center;gap:10px;padding:6px 12px;border-bottom:1px solid rgba(0,0,0,.06);background:#fff;flex:0 0 auto;}' +
      '.dftctx-tab{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-width:84px;border:1px solid transparent;background:transparent;color:#374151;padding:5px 12px;border-radius:999px;cursor:pointer;font-size:12px;font-weight:600;text-align:center;}' +
      '.dftctx-tab:hover{background:rgba(0,0,0,.05);}' +
      '.dftctx-tab.active{background:#e5eefc;border-color:#dbeafe;color:#1d4ed8;}' +
      '.dftctx-body{flex:1 1 auto;min-height:0;position:relative;overflow:hidden;background:#fff;}' +
      '.dftctx-host{position:absolute;inset:0;display:none;overflow:hidden;background:#fff;}' +
      '.dftctx-host.active{display:flex;}' +
      '.dftctx-panel{display:flex;flex-direction:column;height:100%;width:100%;min-width:0;min-height:0;background:#fff;}' +
      '.dftctx-panel-toolbar{display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid rgba(0,0,0,.06);background:#fff;flex:0 0 auto;}' +
      '.dftctx-panel-toolbar.compact{padding:6px 8px;}' +
      '.dftctx-panel-title{font-size:12px;font-weight:700;color:#111827;}' +
      '.dftctx-panel-body{flex:1 1 auto;min-height:0;overflow:auto;padding:8px;background:#fff;}' +
      '.dftctx-panel-body.tight{padding:0;background:#fff;}' +
      '.dftctx-empty{margin:12px;border:1px dashed rgba(0,0,0,.12);border-radius:10px;background:#fff;padding:14px;text-align:center;color:#6b7280;}' +
      '.dftctx-empty-title{font-weight:700;margin-bottom:6px;color:#111827;font-size:12px;}' +
      '.dftctx-empty-sub{font-size:12px;line-height:1.5;}' +
      '.dftctx-search-wrap{flex:1 1 auto;min-width:0;}' +
      '.dftctx-search{width:100%;box-sizing:border-box;height:28px;border:1px solid rgba(0,0,0,.14);border-radius:8px;padding:0 10px;font-size:12px;outline:none;background:#fff;}' +
      '.dftctx-search:focus{border-color:#93c5fd;box-shadow:0 0 0 3px rgba(147,197,253,.20);}' +
      '.dftctx-hint{padding:6px 8px;border-bottom:1px solid rgba(0,0,0,.06);font-size:11px;color:#6b7280;background:#fff;flex:0 0 auto;}' +
      '.dftctx-ip-previewbox{padding:8px;border-bottom:1px solid rgba(0,0,0,.06);background:#fafafa;flex:0 0 auto;}' +
      '.dftctx-ip-preview-empty{font-size:11px;color:#6b7280;padding:8px 4px;line-height:1.5;}' +
      '.dftctx-ip-preview-title{font-size:12px;font-weight:700;color:#111827;margin-bottom:6px;}' +
      '.dftctx-ip-preview-graphic{display:flex;justify-content:center;padding:4px 0 6px;}' +
      '.dftctx-ip-preview-desc{font-size:11px;line-height:1.5;color:#6b7280;}' +
      '.dftctx-ip-list{display:block;}' +
      '.dftctx-section{margin-bottom:4px;}' +
      '.dftctx-section-header{width:100%;display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid rgba(0,0,0,.08);border-radius:10px;background:#fff;cursor:pointer;text-align:left;}' +
      '.dftctx-section-title{font-size:12px;font-weight:700;color:#111827;text-transform:none;}' +
      '.dftctx-section-count{margin-left:auto;font-size:11px;font-weight:700;color:#6b7280;background:#f3f4f6;border-radius:999px;padding:2px 8px;}' +
      '.dftctx-section-body{padding:2px 0 0 0;}' +
      '.dftctx-section-body .dftctx-ip-item{margin-left:12px;width:calc(100% - 12px);}' +
      '.dftctx-ip-item{display:flex;align-items:center;gap:8px;width:100%;padding:4px 8px;margin-bottom:1px;border:none;outline:none;box-shadow:none;border-radius:6px;background:transparent;cursor:pointer;text-align:left;}' +
      '.dftctx-ip-item:hover{background:#f8fafc;}' +
      '.dftctx-ip-item.selected{background:#eceff3;box-shadow:none;}' +
      '.dftctx-ip-item.simple{justify-content:flex-start;}' +
      '.dftctx-ip-item.disabled{opacity:.55;cursor:not-allowed;}' +
      '.dftctx-ip-name{font-size:11px;font-weight:700;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.05;}' +
      '.dftctx-note{margin-top:12px;padding:12px;border:1px dashed #cbd5e1;border-radius:12px;background:#fff;font-size:12px;line-height:1.6;color:#6b7280;}' +
      '.dftctx-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:12px;color:#111827;}' +
      '.dftctx-toggle-row:last-of-type{border-bottom:none;}' +
      '.dftctx-toggle-label{font-weight:600;}' +
      '.dftctx-properties .geFormatContainer,.dftctx-properties .geSidebarContainer{height:100% !important;width:100% !important;}' +
      '.dftctx-properties .geFormatContainer{border:none !important;}' +
      '.dftctx-caret{width:12px;text-align:center;color:#6b7280;}' +
      '.dftctx-props-placeholder{display:flex;flex-direction:column;height:100%;min-height:0;background:#fff;}' +
      '.dftctx-props-tabshell{display:flex;align-items:center;gap:0;border-bottom:1px solid rgba(0,0,0,.06);background:#fff;}' +
      '.dftctx-props-tab{flex:1 1 0;padding:10px 8px;text-align:center;font-size:12px;font-weight:600;color:#4b5563;border-right:1px solid rgba(0,0,0,.06);background:#fafafa;}' +
      '.dftctx-props-tab:last-child{border-right:none;}' +
      '.dftctx-props-tab.active{background:#fff;color:#111827;}' +
      '.dftctx-props-emptybox{padding:16px;}' +
      '.dftctx-ip-tooltip{position:fixed;z-index:4000;width:220px;border:1px solid rgba(0,0,0,.10);border-radius:10px;background:#fff;box-shadow:0 12px 28px rgba(0,0,0,.16);padding:10px;pointer-events:none;}' +
      '.dftctx-ip-tooltip-title{font-size:12px;font-weight:700;color:#111827;margin-bottom:6px;}' +
      '.dftctx-ip-tooltip-svg{display:flex;justify-content:center;margin-bottom:6px;}' +
      '.dftctx-ip-tooltip-desc{font-size:11px;line-height:1.5;color:#6b7280;}' +
      '';
    document.head.appendChild(style);
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function getPanelFactory(key) {
    if (key === 'properties') return global.DFTContextPropertiesPanel;
    if (key === 'ip') return global.DFTContextIPLibraryPanel;
    if (key === 'view') return global.DFTContextViewFilterPanel;
    return null;
  }

  function create(ui, host) {
    ensureStyle();
    var state = { active: (ui && ui._phase1 && ui._phase1.state && ui._phase1.state.contextTab) || 'properties', pinned: false };

    var root = el('div', 'dftctx-root');
    var titlebar = el('div', 'dftctx-titlebar');
    titlebar.appendChild(el('div', 'dftctx-title', 'Context Panel'));
    titlebar.appendChild(el('div', 'dftctx-spacer'));

    var refreshBtn = el('button', 'dftctx-iconbtn', '⟳');
    refreshBtn.type = 'button';
    refreshBtn.title = 'Refresh current tab';
    titlebar.appendChild(refreshBtn);

    var pinBtn = el('button', 'dftctx-iconbtn', 'Pin');
    pinBtn.type = 'button';
    pinBtn.title = 'Pin current tab';
    titlebar.appendChild(pinBtn);
    root.appendChild(titlebar);

    var tabsBar = el('div', 'dftctx-tabs');
    root.appendChild(tabsBar);

    var body = el('div', 'dftctx-body');
    root.appendChild(body);

    var panelKeys = ['properties', 'ip', 'view'];
    var panels = {};
    var hosts = {};
    var tabs = {};

    panelKeys.forEach(function (key) {
      var factory = getPanelFactory(key);
      if (!factory || typeof factory.create !== 'function') return;
      var panel = factory.create(ui);
      panels[key] = panel;

      var tab = el('button', 'dftctx-tab', panel.label || key);
      tab.type = 'button';
      tab.onmousedown = function (evt) {
        if (evt && evt.preventDefault) evt.preventDefault();
        if (!state.pinned || key === state.active) activate(key);
      };
      tabs[key] = tab;
      tabsBar.appendChild(tab);

      var panelHost = el('div', 'dftctx-host');
      hosts[key] = panelHost;
      body.appendChild(panelHost);
      panel.mount(panelHost);
    });

    function activate(key) {
      if (!panels[key]) key = panels.properties ? 'properties' : (panels.ip ? 'ip' : 'view');
      state.active = key;
      if (ui && ui._phase1 && ui._phase1.state) ui._phase1.state.contextTab = key;

      Object.keys(tabs).forEach(function (tabKey) {
        tabs[tabKey].className = 'dftctx-tab' + (tabKey === key ? ' active' : '');
      });
      Object.keys(hosts).forEach(function (hostKey) {
        hosts[hostKey].className = 'dftctx-host' + (hostKey === key ? ' active' : '');
      });
      Object.keys(panels).forEach(function (panelKey) {
        if (panelKey === key) panels[panelKey].show();
        else panels[panelKey].hide();
      });
    }

    refreshBtn.onmousedown = function (evt) {
      if (evt && evt.preventDefault) evt.preventDefault();
      if (panels[state.active] && typeof panels[state.active].refresh === 'function') panels[state.active].refresh();
    };

    pinBtn.onmousedown = function (evt) {
      if (evt && evt.preventDefault) evt.preventDefault();
      state.pinned = !state.pinned;
      pinBtn.className = state.pinned ? 'dftctx-btn primary' : 'dftctx-iconbtn';
      pinBtn.textContent = state.pinned ? 'Pinned' : 'Pin';
    };

    if (host) {
      host.innerHTML = '';
      host.appendChild(root);
    }
    activate(state.active);

    var api = {
      mount: function (nextHost) {
        host = nextHost || host;
        if (!host) return;
        host.innerHTML = '';
        host.appendChild(root);
        activate(state.active);
      },
      refresh: function (key) {
        var target = key || state.active;
        if (panels[target] && typeof panels[target].refresh === 'function') panels[target].refresh();
      },
      activate: activate,
      destroy: function () {
        Object.keys(panels).forEach(function (key) {
          if (panels[key] && typeof panels[key].destroy === 'function') panels[key].destroy();
        });
        if (root && root.parentNode) root.parentNode.removeChild(root);
      }
    };

    if (ui) {
      ui._dftContextPanel = api;
      ui.refreshContextPanel = function (key) { api.refresh(key); };
    }

    return api;
  }

  var moduleApi = { create: create };
  global.__DFTContextPanelCore__ = moduleApi;
  global.DFTContextPanelCore = moduleApi;
})(window);
