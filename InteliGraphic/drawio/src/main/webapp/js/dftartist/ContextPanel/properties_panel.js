(function (global) {
  'use strict';

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function getGraph(ui) {
    return ui && ui.editor && ui.editor.graph ? ui.editor.graph : null;
  }

  function hasSelection(ui) {
    try {
      var graph = getGraph(ui);
      return !!(graph && typeof graph.isSelectionEmpty === 'function' && !graph.isSelectionEmpty());
    } catch (e) {
      return false;
    }
  }

  function create(ui) {
    var api = {};
    var root = null;
    var body = null;
    var mounted = false;
    var watchTimer = null;
    var lastMode = '';

    function buildPlaceholder() {
      var box = el('div', 'dftctx-props-placeholder');
      var tabs = el('div', 'dftctx-props-tabshell');
      tabs.appendChild(el('div', 'dftctx-props-tab active', 'Style'));
      tabs.appendChild(el('div', 'dftctx-props-tab', 'Text'));
      tabs.appendChild(el('div', 'dftctx-props-tab', 'Arrange'));
      box.appendChild(tabs);

      var content = el('div', 'dftctx-props-emptybox');
    //   content.innerHTML =
        // '<div class="dftctx-empty-title">Select an object</div>' +
        // '<div class="dftctx-empty-sub">Pick any shape or IP on the canvas to edit <b>Style</b>, <b>Text</b>, and <b>Arrange</b>. The Project panel is intentionally hidden here.</div>';
      box.appendChild(content);
      return box;
    }

    function ensureBuilt() {
      if (root) return;
      root = el('div', 'dftctx-panel dftctx-properties');
      body = el('div', 'dftctx-panel-body tight');
      root.appendChild(body);
    }

    function renderMode(force) {
      ensureBuilt();
      var mode = hasSelection(ui) ? 'format' : 'placeholder';
      if (!force && mode === lastMode) return;
      lastMode = mode;
      body.innerHTML = '';

      if (mode === 'format' && ui && ui.formatContainer) {
        var formatContainer = ui.formatContainer;
        try {
          formatContainer.style.display = 'block';
          formatContainer.style.position = 'relative';
          formatContainer.style.left = '';
          formatContainer.style.top = '';
          formatContainer.style.right = '';
          formatContainer.style.bottom = '';
          formatContainer.style.width = '100%';
          formatContainer.style.height = '100%';
          formatContainer.style.overflow = 'auto';
          formatContainer.removeAttribute('data-key');
        } catch (e) {}
        body.appendChild(formatContainer);

        try {
          if (ui && ui.format) {
            if (typeof ui.format.immediateRefresh === 'function') ui.format.immediateRefresh();
            if (typeof ui.format.refresh === 'function') ui.format.refresh();
          }
        } catch (e2) {
          if (global.console && console.warn) console.warn('[Context.Properties] refresh failed', e2);
        }
      } else {
        body.appendChild(buildPlaceholder());
      }
    }

    function startWatch() {
      if (watchTimer) return;
      watchTimer = global.setInterval(function () {
        if (!mounted) return;
        renderMode(false);
      }, 300);
    }

    function stopWatch() {
      if (!watchTimer) return;
      global.clearInterval(watchTimer);
      watchTimer = null;
    }

    function mount(host) {
      ensureBuilt();
      if (!host) return;
      if (root.parentNode !== host) host.appendChild(root);
      mounted = true;
      renderMode(true);
      startWatch();
    }

    function show() {
      if (!root) return;
      root.style.display = 'flex';
      mounted = true;
      renderMode(true);
      startWatch();
    }

    function hide() {
      if (!root) return;
      root.style.display = 'none';
      mounted = false;
      stopWatch();
    }

    function refresh() {
      renderMode(true);
    }

    function destroy() {
      mounted = false;
      stopWatch();
      if (root && root.parentNode) root.parentNode.removeChild(root);
      root = null;
      body = null;
    }

    api.key = 'properties';
    api.label = 'Properties';
    api.mount = mount;
    api.show = show;
    api.hide = hide;
    api.refresh = refresh;
    api.destroy = destroy;
    api.isMounted = function () { return mounted; };
    return api;
  }

  var moduleApi = { create: create };
  global.__DFTContextPropertiesPanel__ = moduleApi;
  global.DFTContextPropertiesPanel = moduleApi;
})(window);
