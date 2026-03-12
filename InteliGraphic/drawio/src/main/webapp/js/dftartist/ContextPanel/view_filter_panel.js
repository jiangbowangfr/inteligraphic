(function (global) {
  'use strict';

  var MODULE_KEY = '__DFTContextViewFilterPanel__';
  if (global[MODULE_KEY]) {
    global.DFTContextViewFilterPanel = global[MODULE_KEY];
    return;
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function getGraph(ui) {
    return ui && ui.editor && ui.editor.graph ? ui.editor.graph : null;
  }

  function create(ui) {
    var root = null;
    var state = {
      grid: true,
      pageView: true,
      tooltips: true,
      connectable: true,
      labels: true
    };

    function ensureBuilt() {
      if (root) return;
      root = el('div', 'dftctx-panel dftctx-view');
      var toolbar = el('div', 'dftctx-panel-toolbar');
      toolbar.appendChild(el('div', 'dftctx-panel-title', 'View Filter'));
      var spacer = el('div', 'dftctx-spacer');
      toolbar.appendChild(spacer);
      var refreshBtn = el('button', 'dftctx-btn', 'Sync');
      refreshBtn.type = 'button';
      refreshBtn.onclick = syncFromGraph;
      toolbar.appendChild(refreshBtn);
      root.appendChild(toolbar);

      var body = el('div', 'dftctx-panel-body');
      body.appendChild(makeToggle('Grid', 'grid', function (v, graph) {
        if (graph) {
          graph.setGridEnabled(!!v);
          if (typeof graph.refresh === 'function') graph.refresh();
        }
      }));
      body.appendChild(makeToggle('Page View', 'pageView', function (v, graph) {
        if (ui) ui.pageVisible = !!v;
        if (graph && typeof graph.refresh === 'function') graph.refresh();
      }));
      body.appendChild(makeToggle('Tooltips', 'tooltips', function (v, graph) {
        if (graph) graph.setTooltips(!!v);
      }));
      body.appendChild(makeToggle('Connectable', 'connectable', function (v, graph) {
        if (graph) graph.setConnectable(!!v);
      }));
      body.appendChild(makeToggle('Labels', 'labels', function (v, graph) {
        if (graph && typeof graph.setHtmlLabels === 'function') {
          graph.setHtmlLabels(!!v);
          graph.refresh();
        }
      }));

    //   var note = el('div', 'dftctx-note');
    //   note.innerHTML = '后续可以继续扩展：<br>• Floorplan 图层显示<br>• Macro / Net / Pin 过滤<br>• 检查结果高亮开关';
    //   body.appendChild(note);
      root.appendChild(body);
    }

    function makeToggle(label, key, onChange) {
      var row = el('label', 'dftctx-toggle-row');
      var left = el('span', 'dftctx-toggle-label', label);
      row.appendChild(left);
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!state[key];
      input.onchange = function () {
        state[key] = !!input.checked;
        var graph = getGraph(ui);
        try { onChange(state[key], graph); } catch (e) {
          if (global.console && console.warn) console.warn('[Context.View] toggle failed', key, e);
        }
      };
      row.appendChild(input);
      return row;
    }

    function syncFromGraph() {
      var graph = getGraph(ui);
      if (!graph) return;
      state.grid = !!graph.isGridEnabled();
      state.tooltips = !!graph.tooltipHandler;
      state.connectable = !!graph.connectionHandler && graph.connectionHandler.isEnabled ? graph.connectionHandler.isEnabled() : state.connectable;
      if (root && root.parentNode) {
        var host = root.parentNode;
        host.removeChild(root);
        root = null;
        ensureBuilt();
        host.appendChild(root);
      }
    }

    function mount(host) {
      ensureBuilt();
      if (root.parentNode !== host) host.appendChild(root);
      syncFromGraph();
    }

    function show() { if (root) root.style.display = 'flex'; }
    function hide() { if (root) root.style.display = 'none'; }
    function refresh() { syncFromGraph(); }
    function destroy() { if (root && root.parentNode) root.parentNode.removeChild(root); root = null; }

    return {
      key: 'view',
      label: 'View',
      mount: mount,
      show: show,
      hide: hide,
      refresh: refresh,
      destroy: destroy
    };
  }

  var moduleApi = { create: create };
  global[MODULE_KEY] = moduleApi;
  global.DFTContextViewFilterPanel = moduleApi;
})(window);
