(function (global) {
  'use strict';

  if (!global || global.__DFT_PHASE1_SHELL_MODULAR__) {
    return;
  }
  global.__DFT_PHASE1_SHELL_MODULAR__ = true;

  var API_NAME = 'DFTPhase1Shell';
  var REGION_KEYS = ['flow', 'project', 'workspace', 'context', 'dock', 'status'];
  var registry = {};
  var bootstrapTimer = null;
  var patchInstalled = false;

  function noop() {}

  function each(arr, fn) {
    for (var i = 0; i < arr.length; i++) {
      fn(arr[i], i);
    }
  }

  function clamp(val, min, max) {
    val = Number(val);
    if (!isFinite(val)) val = min;
    if (val < min) return min;
    if (val > max) return max;
    return val;
  }

  function safeCall(fn, args, fallback) {
    try {
      if (typeof fn === 'function') {
        return fn.apply(null, args || []);
      }
    } catch (e) {
      try {
        console.error('[DFTPhase1Shell] callback failed', e);
      } catch (_ignore) {}
    }
    return fallback;
  }

  function getUi() {
    try {
      return global.App && global.App.editorUi ? global.App.editorUi : null;
    } catch (e) {
      return null;
    }
  }

  function createDiv(ui, className) {
    if (ui && typeof ui.createDiv === 'function') {
      return ui.createDiv(className);
    }
    var el = document.createElement('div');
    if (className) el.className = className;
    return el;
  }

  function makeButton(label, title, className) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className || 'phase1-tool-btn';
    btn.textContent = label;
    if (title) btn.title = title;
    return btn;
  }

  function ensureStyle() {
    if (document.getElementById('phase1-layout-shell-modular-style')) {
      return;
    }

    var style = document.createElement('style');
    style.id = 'phase1-layout-shell-modular-style';
    style.type = 'text/css';
    style.textContent = [
      '.phase1-shell,.phase1-shell *{box-sizing:border-box;}',
      '.phase1-shell{position:absolute;inset:0;display:flex;flex-direction:column;background:#f5f6f8;color:#111827;font-family:Inter,Arial,Helvetica,sans-serif;}',
      '.phase1-region{position:relative;overflow:hidden;min-width:0;min-height:0;}',
      '.phase1-menubar-shell{flex:0 0 auto;min-height:34px;border-bottom:1px solid #d7dce3;background:#fafbfc;}',
      '.phase1-toolbar-shell{flex:0 0 auto;min-height:42px;border-bottom:1px solid #d7dce3;background:#fff;}',
      '.phase1-body{flex:1 1 auto;display:flex;min-height:0;min-width:0;}',
      '.phase1-flow-nav{flex:0 0 auto;width:208px;min-width:68px;border-right:1px solid #d7dce3;background:#f8fafc;display:flex;flex-direction:column;overflow:hidden;}',
      '.phase1-right-host{flex:1 1 auto;display:flex;flex-direction:column;min-width:0;min-height:0;}',
      '.phase1-top-area{flex:1 1 auto;display:flex;min-width:0;min-height:0;background:#eef2f7;}',
      '.phase1-project-shell{flex:0 0 auto;width:280px;min-width:220px;background:#fff;display:flex;flex-direction:column;}',
      '.phase1-workspace-shell{flex:1 1 auto;background:#fff;display:flex;flex-direction:column;}',
      '.phase1-context-shell{flex:0 0 auto;width:320px;min-width:260px;background:#fff;display:flex;flex-direction:column;}',
      '.phase1-dock-shell{flex:0 0 auto;height:220px;background:#fff;display:flex;flex-direction:column;border-top:0;}',
      '.phase1-status-shell{flex:0 0 auto;min-height:24px;border-top:1px solid #d7dce3;background:#fafbfc;display:flex;align-items:center;}',
      '.phase1-splitter-v{flex:0 0 6px;cursor:col-resize;background:#eef2f7;border-left:1px solid #d7dce3;border-right:1px solid #d7dce3;}',
      '.phase1-splitter-v:hover,.phase1-splitter-v.phase1-dragging{background:#dbeafe;}',
      '.phase1-splitter-h{flex:0 0 6px;cursor:row-resize;background:#eef2f7;border-top:1px solid #d7dce3;border-bottom:1px solid #d7dce3;}',
      '.phase1-splitter-h:hover,.phase1-splitter-h.phase1-dragging{background:#dbeafe;}',
      '.phase1-titlebar{flex:0 0 32px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;border-bottom:1px solid #e5e7eb;background:#f8fafc;font-size:12px;font-weight:600;color:#111827;}',
      '.phase1-titlebar .label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.phase1-toolbar-row{flex:0 0 32px;display:flex;align-items:center;gap:6px;padding:0 8px;border-bottom:1px solid #eef2f7;background:#fff;}',
      '.phase1-tabbar{flex:0 0 32px;display:flex;align-items:end;gap:4px;padding:0 8px;border-bottom:1px solid #e5e7eb;background:#f8fafc;}',
      '.phase1-tab{padding:6px 10px;border:1px solid transparent;border-bottom:none;border-radius:6px 6px 0 0;font-size:12px;line-height:1;cursor:pointer;color:#4b5563;user-select:none;}',
      '.phase1-tab.closable{display:inline-flex;align-items:center;gap:6px;}',
      '.phase1-tab-close{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:999px;font-size:12px;line-height:1;color:#6b7280;}',
      '.phase1-tab-close:hover{background:#e5e7eb;color:#111827;}',
      '.phase1-tab:hover{background:#eef2ff;color:#111827;}',
      '.phase1-tab.active{background:#fff;border-color:#d7dce3;color:#111827;font-weight:600;}',
      '.phase1-tool-btn{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 8px;border:1px solid #d7dce3;border-radius:8px;background:#fff;color:#111827;font-size:12px;cursor:pointer;}',
      '.phase1-tool-btn:hover{background:#eff6ff;border-color:#93c5fd;}',
      '.phase1-tool-btn.ghost{background:transparent;border-style:dashed;border-color:#d7dce3;color:#374151;}',
      '.phase1-search{flex:1 1 auto;min-width:0;height:28px;padding:0 10px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;outline:none;}',
      '.phase1-search:focus{border-color:#60a5fa;box-shadow:0 0 0 3px rgba(96,165,250,.15);}',
      '.phase1-panel-body{flex:1 1 auto;min-height:0;min-width:0;display:flex;flex-direction:column;}',
      '.phase1-scroll-panel{flex:1 1 auto;min-height:0;overflow:auto;padding:12px;}',
      '.phase1-empty{display:flex;align-items:center;justify-content:center;min-height:100%;padding:12px;text-align:center;color:#6b7280;font-size:12px;}',
      '.phase1-flow-list{flex:1 1 auto;overflow:auto;padding:10px 8px 12px;}',
      '.phase1-flow-item{padding:8px;border:1px solid transparent;border-radius:10px;cursor:pointer;margin-bottom:6px;background:transparent;}',
      '.phase1-flow-item:hover{background:#eef2ff;border-color:#dbeafe;}',
      '.phase1-flow-item.active{background:#eff6ff;border-color:#bfdbfe;}',
      '.phase1-flow-title{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;}',
      '.phase1-flow-desc{margin-left:18px;margin-top:4px;color:#6b7280;font-size:11px;line-height:1.4;}',
      '.phase1-dot{display:inline-block;width:8px;height:8px;border-radius:999px;background:#cbd5e1;}',
      '.phase1-dot.active{background:#2563eb;}',
      '.phase1-status-line{padding:0 10px;font-size:11px;color:#4b5563;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.phase1-menubar-shell > *,.phase1-toolbar-shell > *{width:100%;height:100%;}',
      '.phase1-menubar-shell .geMenubarContainer,.phase1-menubar-shell .geMenubar{position:static !important;display:flex !important;align-items:center;min-width:0;width:100% !important;height:100% !important;overflow-x:auto;overflow-y:hidden;}',
      '.phase1-toolbar-shell .geToolbarContainer,.phase1-toolbar-shell .geToolbar{position:static !important;display:flex !important;align-items:center;min-width:0;width:100% !important;height:100% !important;overflow-x:auto;overflow-y:hidden;padding:0 6px;gap:2px;}',
      '.phase1-toolbar-shell .geToolbar a,.phase1-toolbar-shell .geToolbar img{flex:0 0 auto;}',
      '.phase1-flow-mini .phase1-flow-desc{display:none;}',
      '.phase1-flow-mini .phase1-flow-title .label{display:none;}',
      '.phase1-flow-mini .phase1-titlebar .label{display:none;}',
      '.phase1-flow-mini .phase1-titlebar{justify-content:center;padding:0 4px;}',
      '.phase1-flow-mini .phase1-flow-list{padding:8px 4px;}',
      '.phase1-flow-mini .phase1-flow-item{padding:10px 6px;display:flex;justify-content:center;}',
      '.phase1-flow-mini .phase1-dot{width:10px;height:10px;}',
      '.phase1-flow-mini .phase1-titlebar > div:last-child .phase1-tool-btn:not(:first-child){display:none;}',
      '.phase1-host-content{flex:1 1 auto;min-height:0;min-width:0;display:flex;flex-direction:column;overflow:hidden;}',
      '.phase1-hidden{display:none !important;}',
      '.phase1-workspace-tab-panel{flex:1 1 auto;min-height:0;min-width:0;display:flex;flex-direction:column;overflow:hidden;}',
      '.phase1-workspace-embed{width:100%;height:100%;border:0;background:#fff;display:block;}'
    ].join('');
    document.head.appendChild(style);
  }

  function defaultWorkspaceTabs() {
    return [
      { key: 'design', label: 'Design: floorplan', kind: 'design', closable: false },
      { key: 'rtl', label: 'RTL', kind: 'placeholder', closable: false, emptyText: 'RTL 未接入' },
      { key: 'wave', label: 'Waveform', kind: 'placeholder', closable: false, emptyText: 'Waveform 未接入' },
      { key: 'report', label: 'Report', kind: 'placeholder', closable: false, emptyText: 'Report 未接入' }
    ];
  }

  function ensureWorkspaceTabs(ui) {
    if (!ui || !ui._phase1) return defaultWorkspaceTabs();
    var tabs = ui._phase1.workspaceTabs;
    if (!Array.isArray(tabs) || !tabs.length) {
      tabs = defaultWorkspaceTabs();
      ui._phase1.workspaceTabs = tabs;
    }
    return tabs;
  }

  function getWorkspaceTab(ui, key) {
    var tabs = ensureWorkspaceTabs(ui);
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i] && tabs[i].key === key) return tabs[i];
    }
    return null;
  }

  function setActiveWorkspaceTab(ui, key) {
    if (!ui || !ui._phase1 || !ui._phase1.state) return false;
    var tabs = ensureWorkspaceTabs(ui);
    var target = getWorkspaceTab(ui, key);
    if (!target) target = tabs[0] || null;
    ui._phase1.state.activeWorkspaceTab = target ? target.key : 'design';
    return !!target;
  }

  function closeWorkspaceTab(ui, key) {
    if (!ui || !ui._phase1) return false;
    var tabs = ensureWorkspaceTabs(ui);
    var next = [];
    var removed = null;
    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      if (tab && tab.key === key) {
        if (tab.closable === false) return false;
        removed = tab;
        continue;
      }
      next.push(tab);
    }
    if (!removed) return false;
    ui._phase1.workspaceTabs = next;
    if (ui._phase1.state.activeWorkspaceTab === key) {
      ui._phase1.state.activeWorkspaceTab = next.length ? next[Math.max(0, next.length - 1)].key : 'design';
    }
    if (typeof removed.onClose === 'function') safeCall(removed.onClose, [ui, removed], null);
    refreshRegion(ui, 'workspace');
    return true;
  }

  function createState(ui) {
    var src = ui && ui._phase1 && ui._phase1.state ? ui._phase1.state : null;
    return {
      flowNavCollapsed: src ? !!src.flowNavCollapsed : false,
      flowNavWidth: src ? Number(src.flowNavWidth) || 208 : 208,
      projectWidth: src ? Number(src.projectWidth) || 280 : 280,
      contextWidth: src ? Number(src.contextWidth) || 320 : 320,
      dockHeight: src ? (src.dockHeight == null ? 220 : Number(src.dockHeight)) : 220,
      minFlowCollapsed: 68,
      minFlowExpanded: 180,
      minProjectWidth: 220,
      minContextWidth: 260,
      minDockHeight: 120,
      maxDockRatio: 0.55,
      activeProjectTab: src && src.activeProjectTab ? src.activeProjectTab : 'sources',
      activeWorkspaceTab: src && src.activeWorkspaceTab ? src.activeWorkspaceTab : 'design',
      activeContextTab: src && src.activeContextTab ? src.activeContextTab : 'properties',
      activeDockTab: src && src.activeDockTab ? src.activeDockTab : 'terminal'
    };
  }

  function renderDefaultFlow(ui, host) {
    host.innerHTML = '';
    var header = document.createElement('div');
    header.className = 'phase1-titlebar';

    var title = document.createElement('div');
    title.className = 'label';
    title.textContent = 'Flow Navigator';

    var actions = document.createElement('div');
    var toggle = makeButton('≡', '折叠 / 展开', 'phase1-tool-btn ghost');
    toggle.addEventListener('click', function () {
      ui._phase1.state.flowNavCollapsed = !ui._phase1.state.flowNavCollapsed;
      applyLayout(ui);
    });
    var more = makeButton('⋮', '更多', 'phase1-tool-btn ghost');
    actions.appendChild(toggle);
    actions.appendChild(more);

    header.appendChild(title);
    header.appendChild(actions);
    host.appendChild(header);

    var list = document.createElement('div');
    list.className = 'phase1-flow-list';
    var steps = [
      ['project', 'Project Manager', '新建 / 打开项目'],
      ['entry', 'Design Entry', '添加源文件 / 约束'],
      ['ip', 'IP Integration', '添加 IP / 配置'],
      ['sim', 'Simulation', '运行仿真 / 波形'],
      ['synth', 'Synthesis', '综合 / 查看网表'],
      ['impl', 'Implementation', '布局布线 / Floorplan'],
      ['timing', 'Timing / DRC', '时序 / DRC 报告'],
      ['signoff', 'Signoff / Debug', '导出 / 调试']
    ];

    each(steps, function (step, idx) {
      var item = document.createElement('div');
      item.className = 'phase1-flow-item' + (idx === 0 ? ' active' : '');

      var titleRow = document.createElement('div');
      titleRow.className = 'phase1-flow-title';
      var dot = document.createElement('span');
      dot.className = 'phase1-dot' + (idx === 0 ? ' active' : '');
      var label = document.createElement('span');
      label.className = 'label';
      label.textContent = step[1];
      titleRow.appendChild(dot);
      titleRow.appendChild(label);

      var desc = document.createElement('div');
      desc.className = 'phase1-flow-desc';
      desc.textContent = step[2];

      item.appendChild(titleRow);
      item.appendChild(desc);
      list.appendChild(item);
    });

    host.appendChild(list);
  }

  function createTabbedPanel(title, tabs, activeKey, searchPlaceholder) {
    var wrap = document.createElement('div');
    wrap.className = 'phase1-host-content';

    var titlebar = document.createElement('div');
    titlebar.className = 'phase1-titlebar';
    titlebar.innerHTML = '<span class="label"></span><span></span>';
    titlebar.firstChild.textContent = title;
    wrap.appendChild(titlebar);

    var tabbar = document.createElement('div');
    tabbar.className = 'phase1-tabbar';
    var panels = {};

    each(tabs, function (tab) {
      var btn = document.createElement('div');
      btn.className = 'phase1-tab' + (tab.key === activeKey ? ' active' : '');
      btn.textContent = tab.label;
      btn.setAttribute('data-key', tab.key);
      tabbar.appendChild(btn);
    });
    wrap.appendChild(tabbar);

    var tools = document.createElement('div');
    tools.className = 'phase1-toolbar-row';
    var input = document.createElement('input');
    input.className = 'phase1-search';
    input.type = 'text';
    input.placeholder = searchPlaceholder || 'Search';
    tools.appendChild(input);
    tools.appendChild(makeButton('＋', '添加'));
    tools.appendChild(makeButton('⟳', '刷新'));
    tools.appendChild(makeButton('⋮', '更多', 'phase1-tool-btn ghost'));
    wrap.appendChild(tools);

    var body = document.createElement('div');
    body.className = 'phase1-panel-body';
    each(tabs, function (tab) {
      var panel = document.createElement('div');
      panel.className = 'phase1-scroll-panel' + (tab.key === activeKey ? '' : ' phase1-hidden');
      panel.setAttribute('data-key', tab.key);
      if (tab.html) {
        panel.innerHTML = tab.html;
      } else {
        var empty = document.createElement('div');
        empty.className = 'phase1-empty';
        empty.textContent = tab.emptyText || (tab.label + ' 暂未接入');
        panel.appendChild(empty);
      }
      body.appendChild(panel);
      panels[tab.key] = panel;
    });
    wrap.appendChild(body);

    function activate(key) {
      each(tabbar.children, function (node) {
        if (node.nodeType !== 1) return;
        var active = node.getAttribute('data-key') === key;
        if (active) node.classList.add('active');
        else node.classList.remove('active');
      });
      Object.keys(panels).forEach(function (panelKey) {
        if (panelKey === key) panels[panelKey].classList.remove('phase1-hidden');
        else panels[panelKey].classList.add('phase1-hidden');
      });
    }

    tabbar.addEventListener('click', function (evt) {
      var t = evt.target;
      while (t && t !== tabbar && !t.getAttribute('data-key')) {
        t = t.parentNode;
      }
      if (t && t !== tabbar) activate(t.getAttribute('data-key'));
    });

    return {
      root: wrap,
      titlebar: titlebar,
      tabbar: tabbar,
      tools: tools,
      body: body,
      panels: panels,
      activate: activate,
      searchInput: input
    };
  }

  function renderDefaultProject(ui, host) {
    host.innerHTML = '';
    var panel = createTabbedPanel('Project Explorer', [
      { key: 'sources', label: 'Sources', html: '<div class="phase1-empty">外部 Project Explorer 模块未挂载</div>' },
      { key: 'hierarchy', label: 'Hierarchy', emptyText: 'Hierarchy 暂未接入' },
      { key: 'runs', label: 'Runs', emptyText: 'Runs 暂未接入' },
      { key: 'files', label: 'Files', emptyText: 'Files 暂未接入' }
    ], ui._phase1.state.activeProjectTab, 'Search current tab');

    panel.tabbar.addEventListener('click', function (evt) {
      var t = evt.target;
      while (t && t !== panel.tabbar && !t.getAttribute('data-key')) t = t.parentNode;
      if (t && t !== panel.tabbar) ui._phase1.state.activeProjectTab = t.getAttribute('data-key');
    });

    host.appendChild(panel.root);
    ui._phase1.projectView = panel;
  }

  function renderDefaultContext(ui, host) {
    host.innerHTML = '';
    var panel = createTabbedPanel('Context Panel', [
      { key: 'properties', label: 'Properties', emptyText: 'Properties 未接入' },
      { key: 'ip', label: 'IP', emptyText: 'IP 面板未接入' },
      { key: 'view', label: 'View', emptyText: 'View 过滤器未接入' }
    ], ui._phase1.state.activeContextTab, 'Search context');

    panel.tabbar.addEventListener('click', function (evt) {
      var t = evt.target;
      while (t && t !== panel.tabbar && !t.getAttribute('data-key')) t = t.parentNode;
      if (t && t !== panel.tabbar) ui._phase1.state.activeContextTab = t.getAttribute('data-key');
    });

    host.appendChild(panel.root);
    ui._phase1.contextView = panel;

    // legacy format/sidebar 可以由外部模块替换，这里先提供宿主占位
    var propertiesPanel = panel.panels.properties;
    var legacyHost = document.createElement('div');
    legacyHost.className = 'phase1-host-content';
    propertiesPanel.innerHTML = '';
    propertiesPanel.appendChild(legacyHost);
    ui._phase1.legacyPropertiesHost = legacyHost;

    var ipPanel = panel.panels.ip;
    var legacyIpHost = document.createElement('div');
    legacyIpHost.className = 'phase1-host-content';
    ipPanel.innerHTML = '';
    ipPanel.appendChild(legacyIpHost);
    ui._phase1.legacyIpHost = legacyIpHost;
  }

  function renderDefaultWorkspace(ui, host) {
    host.innerHTML = '';
    var workspaceTabs = ensureWorkspaceTabs(ui);
    if (!getWorkspaceTab(ui, ui._phase1.state.activeWorkspaceTab)) {
      ui._phase1.state.activeWorkspaceTab = workspaceTabs.length ? workspaceTabs[0].key : 'design';
    }

    var tabbar = document.createElement('div');
    tabbar.className = 'phase1-tabbar';
    each(workspaceTabs, function (tab, idx) {
      var node = document.createElement('div');
      var active = ui._phase1.state.activeWorkspaceTab === tab.key || (!ui._phase1.state.activeWorkspaceTab && idx === 0);
      node.className = 'phase1-tab' + (active ? ' active' : '') + (tab.closable === false ? '' : ' closable');
      node.setAttribute('data-key', tab.key);
      node.title = tab.title || tab.label || tab.key;
      var label = document.createElement('span');
      label.textContent = tab.label || tab.key;
      node.appendChild(label);
      if (tab.closable !== false) {
        var close = document.createElement('span');
        close.className = 'phase1-tab-close';
        close.setAttribute('data-close-key', tab.key);
        close.textContent = '×';
        node.appendChild(close);
      }
      tabbar.appendChild(node);
    });
    var spacer = document.createElement('div');
    spacer.style.flex = '1 1 auto';
    tabbar.appendChild(spacer);
    tabbar.appendChild(makeButton('+', '新建页签', 'phase1-tool-btn ghost'));
    tabbar.appendChild(makeButton('Split▼', '分屏', 'phase1-tool-btn ghost'));
    tabbar.appendChild(makeButton('⋮', '更多', 'phase1-tool-btn ghost'));

    var tools = document.createElement('div');
    tools.className = 'phase1-toolbar-row';
    tools.appendChild(makeButton('Pointer', 'Pointer'));
    tools.appendChild(makeButton('Pan', 'Pan'));
    tools.appendChild(makeButton('Wire', 'Wire'));
    tools.appendChild(makeButton('Rect', 'Rect'));
    tools.appendChild(makeButton('Text', 'Text'));
    var toolsSpacer = document.createElement('div');
    toolsSpacer.style.flex = '1 1 auto';
    tools.appendChild(toolsSpacer);
    tools.appendChild(makeButton('Zoom-', 'Zoom Out'));
    tools.appendChild(makeButton('100%▼', 'Zoom'));
    tools.appendChild(makeButton('Zoom+', 'Zoom In'));
    tools.appendChild(makeButton('Fit', 'Fit'));

    var body = document.createElement('div');
    body.className = 'phase1-panel-body';
    var workspacePanels = {};
    each(workspaceTabs, function (tab, idx) {
      var panel = document.createElement('div');
      var active = ui._phase1.state.activeWorkspaceTab === tab.key || (!ui._phase1.state.activeWorkspaceTab && idx === 0);
      panel.className = 'phase1-workspace-tab-panel' + (active ? '' : ' phase1-hidden');
      panel.setAttribute('data-key', tab.key);

      if (tab.kind === 'design') {
        var legacyHost = document.createElement('div');
        legacyHost.className = 'phase1-host-content';
        panel.appendChild(legacyHost);
        ui._phase1.legacyWorkspaceHost = legacyHost;
      } else if (tab.kind === 'custom' && typeof tab.render === 'function') {
        safeCall(tab.render, [panel, tab, ui], null);
      } else {
        var empty = document.createElement('div');
        empty.className = 'phase1-empty';
        empty.textContent = tab.emptyText || ((tab.label || tab.key) + ' 未接入');
        panel.appendChild(empty);
      }

      workspacePanels[tab.key] = panel;
      body.appendChild(panel);
    });

    host.appendChild(tabbar);
    host.appendChild(tools);
    host.appendChild(body);
    ui._phase1.workspaceTabbar = tabbar;
    ui._phase1.workspacePanels = workspacePanels;

    function activateWorkspaceTab(key) {
      if (!setActiveWorkspaceTab(ui, key)) return;
      each(tabbar.children, function (node) {
        if (node.nodeType !== 1 || !node.getAttribute('data-key')) return;
        if (node.getAttribute('data-key') === ui._phase1.state.activeWorkspaceTab) node.classList.add('active');
        else node.classList.remove('active');
      });
      Object.keys(workspacePanels).forEach(function (panelKey) {
        if (panelKey === ui._phase1.state.activeWorkspaceTab) workspacePanels[panelKey].classList.remove('phase1-hidden');
        else workspacePanels[panelKey].classList.add('phase1-hidden');
      });
      applyLayout(ui);
    }

    tabbar.addEventListener('click', function (evt) {
      var closeKey = evt.target && evt.target.getAttribute ? evt.target.getAttribute('data-close-key') : null;
      if (closeKey) {
        if (evt.stopPropagation) evt.stopPropagation();
        closeWorkspaceTab(ui, closeKey);
        return;
      }
      var t = evt.target;
      while (t && t !== tabbar && !t.getAttribute('data-key')) t = t.parentNode;
      if (t && t !== tabbar) activateWorkspaceTab(t.getAttribute('data-key'));
    });
  }

  function renderDefaultDock(ui, host) {
    host.innerHTML = '';
    var panel = createTabbedPanel('Bottom Dock', [
      { key: 'terminal', label: 'Terminal', emptyText: 'Terminal 未接入' },
      { key: 'output', label: 'Output', emptyText: 'Output 未接入' },
      { key: 'messages', label: 'Messages', emptyText: 'Messages 未接入' },
      { key: 'reports', label: 'Reports', emptyText: 'Reports 未接入' },
      { key: 'jobs', label: 'Jobs', emptyText: 'Jobs 未接入' }
    ], ui._phase1.state.activeDockTab, 'Filter');

    panel.tabbar.addEventListener('click', function (evt) {
      var t = evt.target;
      while (t && t !== panel.tabbar && !t.getAttribute('data-key')) t = t.parentNode;
      if (t && t !== panel.tabbar) ui._phase1.state.activeDockTab = t.getAttribute('data-key');
    });

    host.appendChild(panel.root);
    ui._phase1.dockView = panel;
  }

  function renderDefaultStatus(ui, host) {
    host.innerHTML = '';
    var line = document.createElement('div');
    line.className = 'phase1-status-line';
    line.textContent = 'Ready';
    host.appendChild(line);
    ui._phase1.statusLine = line;
  }

  function callRenderer(ui, key) {
    if (!ui || !ui._phase1) return;
    var hostMap = {
      flow: ui._phase1.flowNavContainer,
      project: ui._phase1.projectShell,
      workspace: ui._phase1.workspaceShell,
      context: ui._phase1.contextShell,
      dock: ui._phase1.dockShell,
      status: ui._phase1.statusShell
    };

    var defaultMap = {
      flow: renderDefaultFlow,
      project: renderDefaultProject,
      workspace: renderDefaultWorkspace,
      context: renderDefaultContext,
      dock: renderDefaultDock,
      status: renderDefaultStatus
    };

    var host = hostMap[key];
    if (!host) return;

    if (ui._phase1.cleanups && typeof ui._phase1.cleanups[key] === 'function') {
      safeCall(ui._phase1.cleanups[key], []);
      ui._phase1.cleanups[key] = null;
    }

    host.innerHTML = '';
    var reg = registry[key];
    var cleanup = null;

    if (reg && typeof reg.render === 'function') {
      cleanup = safeCall(reg.render, [ui, host, api], null);
      if (cleanup && typeof cleanup === 'function') {
        ui._phase1.cleanups[key] = cleanup;
      }
      if (host.childNodes.length) {
        return;
      }
    }

    safeCall(defaultMap[key], [ui, host], null);
  }

  function hookVerticalSplitter(ui, splitter, side) {
    splitter.onmousedown = function (evt) {
      evt = evt || window.event;
      var startX = evt.clientX;
      var st = ui._phase1.state;
      var startValue = side === 'project' ? st.projectWidth : st.contextWidth;
      splitter.classList.add('phase1-dragging');

      function onMove(moveEvt) {
        moveEvt = moveEvt || window.event;
        var dx = moveEvt.clientX - startX;
        if (side === 'project') {
          st.projectWidth = startValue + dx;
        } else {
          st.contextWidth = startValue - dx;
        }
        applyLayout(ui);
      }

      function onUp() {
        splitter.classList.remove('phase1-dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      if (evt.preventDefault) evt.preventDefault();
      return false;
    };
  }

  function hookHorizontalSplitter(ui, splitter) {
    splitter.onmousedown = function (evt) {
      evt = evt || window.event;
      var startY = evt.clientY;
      var startHeight = ui._phase1.state.dockHeight || 0;
      splitter.classList.add('phase1-dragging');

      function onMove(moveEvt) {
        moveEvt = moveEvt || window.event;
        var dy = startY - moveEvt.clientY;
        ui._phase1.state.dockHeight = Math.max(0, startHeight + dy);
        applyLayout(ui);
      }

      function onUp() {
        splitter.classList.remove('phase1-dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      if (evt.preventDefault) evt.preventDefault();
      return false;
    };
  }

  function moveExistingNode(node, newParent) {
    if (!node || !newParent) return;
    try {
      newParent.appendChild(node);
      node.style.position = 'relative';
      node.style.left = '';
      node.style.top = '';
      node.style.right = '';
      node.style.bottom = '';
      node.style.width = '100%';
      node.style.height = '100%';
      node.style.display = '';
      node.style.visibility = '';
      node.classList.remove('phase1-hidden');
    } catch (e) {}
  }

  function attachLegacyContent(ui) {
    if (!ui || !ui._phase1) return;

    // workspace: 挂原 diagram
    if (ui.diagramContainer && ui.diagramContainer.parentNode !== ui._phase1.legacyWorkspaceHost) {
      moveExistingNode(ui.diagramContainer, ui._phase1.legacyWorkspaceHost);
    }

    // context: 默认挂旧 format 到 properties
    if (ui.formatContainer && ui._phase1.legacyPropertiesHost && ui.formatContainer.parentNode !== ui._phase1.legacyPropertiesHost) {
      moveExistingNode(ui.formatContainer, ui._phase1.legacyPropertiesHost);
    }

    // context: 默认挂旧 sidebar 到 IP
    if (ui.sidebarContainer && ui._phase1.legacyIpHost && ui.sidebarContainer.parentNode !== ui._phase1.legacyIpHost) {
      moveExistingNode(ui.sidebarContainer, ui._phase1.legacyIpHost);
    }
  }

  function applyFlowCollapse(ui) {
    var st = ui._phase1.state;
    var host = ui._phase1.flowNavContainer;
    if (!host) return;
    host.style.width = (st.flowNavCollapsed ? st.minFlowCollapsed : st.flowNavWidth) + 'px';
    if (st.flowNavCollapsed) host.classList.add('phase1-flow-mini');
    else host.classList.remove('phase1-flow-mini');
  }

  function applyLayout(ui) {
    if (!ui || !ui._phase1 || !ui._phase1.shell) {
      return;
    }

    var st = ui._phase1.state;
    applyFlowCollapse(ui);

    var bodyRect = ui._phase1.body.getBoundingClientRect();
    var topRect = ui._phase1.topArea.getBoundingClientRect();

    var flowMax = Math.max(st.minFlowExpanded, Math.floor(bodyRect.width * 0.28));
    st.flowNavWidth = clamp(st.flowNavWidth, st.minFlowExpanded, flowMax);
    if (!st.flowNavCollapsed) {
      ui._phase1.flowNavContainer.style.width = st.flowNavWidth + 'px';
    }

    var splitAllowance = 12;
    var availableTopWidth = Math.max(320, topRect.width);
    var projectMax = Math.max(st.minProjectWidth, availableTopWidth - st.minContextWidth - 220 - splitAllowance);
    var contextMax = Math.max(st.minContextWidth, availableTopWidth - st.minProjectWidth - 220 - splitAllowance);

    st.projectWidth = clamp(st.projectWidth, st.minProjectWidth, projectMax);
    st.contextWidth = clamp(st.contextWidth, st.minContextWidth, contextMax);

    ui._phase1.projectShell.style.width = st.projectWidth + 'px';
    ui._phase1.contextShell.style.width = st.contextWidth + 'px';

    var maxDock = Math.max(st.minDockHeight, Math.floor(bodyRect.height * st.maxDockRatio));
    if (st.dockHeight > 0) {
      st.dockHeight = clamp(st.dockHeight, st.minDockHeight, maxDock);
      ui._phase1.dockShell.style.height = st.dockHeight + 'px';
      ui._phase1.dockShell.style.display = '';
      ui._phase1.dockSplitter.style.display = '';
    } else {
      ui._phase1.dockShell.style.height = '0px';
      ui._phase1.dockShell.style.display = 'none';
      ui._phase1.dockSplitter.style.display = 'none';
    }

    attachLegacyContent(ui);

    try {
      if (ui.editor && ui.editor.graph && typeof ui.editor.graph.sizeDidChange === 'function') {
        ui.editor.graph.sizeDidChange();
      } else if (ui.graph && typeof ui.graph.sizeDidChange === 'function') {
        ui.graph.sizeDidChange();
      }
    } catch (e) {}
  }

  function createShell(ui) {
    ensureStyle();

    var shell = createDiv(ui, 'phase1-shell');
    var menubarShell = createDiv(ui, 'phase1-region phase1-menubar-shell');
    var toolbarShell = createDiv(ui, 'phase1-region phase1-toolbar-shell');
    var body = createDiv(ui, 'phase1-region phase1-body');
    var flow = createDiv(ui, 'phase1-region phase1-flow-nav');
    var rightHost = createDiv(ui, 'phase1-region phase1-right-host');
    var topArea = createDiv(ui, 'phase1-region phase1-top-area');

    var projectShell = createDiv(ui, 'phase1-region phase1-project-shell');
    var projectSplitter = createDiv(ui, 'phase1-splitter-v');
    var workspaceShell = createDiv(ui, 'phase1-region phase1-workspace-shell');
    var contextSplitter = createDiv(ui, 'phase1-splitter-v');
    var contextShell = createDiv(ui, 'phase1-region phase1-context-shell');

    var dockSplitter = createDiv(ui, 'phase1-splitter-h');
    var dockShell = createDiv(ui, 'phase1-region phase1-dock-shell');
    var statusShell = createDiv(ui, 'phase1-region phase1-status-shell');

    shell.appendChild(menubarShell);
    shell.appendChild(toolbarShell);
    shell.appendChild(body);
    shell.appendChild(statusShell);

    body.appendChild(flow);
    body.appendChild(rightHost);
    rightHost.appendChild(topArea);
    rightHost.appendChild(dockSplitter);
    rightHost.appendChild(dockShell);

    topArea.appendChild(projectShell);
    topArea.appendChild(projectSplitter);
    topArea.appendChild(workspaceShell);
    topArea.appendChild(contextSplitter);
    topArea.appendChild(contextShell);

    ui._phase1 = ui._phase1 || {};
    ui._phase1.state = createState(ui);
    ui._phase1.cleanups = ui._phase1.cleanups || {};

    ui._phase1.shell = shell;
    ui._phase1.menubarShell = menubarShell;
    ui._phase1.toolbarShell = toolbarShell;
    ui._phase1.body = body;
    ui._phase1.flowNavContainer = flow;
    ui._phase1.rightHost = rightHost;
    ui._phase1.topArea = topArea;
    ui._phase1.projectShell = projectShell;
    ui._phase1.projectSplitter = projectSplitter;
    ui._phase1.workspaceShell = workspaceShell;
    ui._phase1.contextSplitter = contextSplitter;
    ui._phase1.contextShell = contextShell;
    ui._phase1.dockSplitter = dockSplitter;
    ui._phase1.dockShell = dockShell;
    ui._phase1.statusShell = statusShell;

    hookVerticalSplitter(ui, projectSplitter, 'project');
    hookVerticalSplitter(ui, contextSplitter, 'context');
    hookHorizontalSplitter(ui, dockSplitter);

    return shell;
  }

  function mountShell(ui) {
    if (!ui || !ui.container) return false;
    ensureStyle();

    if (!ui._phase1 || !ui._phase1.shell) {
      createShell(ui);
    }

    var shell = ui._phase1.shell;
    if (shell.parentNode !== ui.container) {
      // 先移除 root 里其它直接子节点，随后统一重新挂到壳里
      while (ui.container.firstChild) {
        ui.container.removeChild(ui.container.firstChild);
      }
      ui.container.appendChild(shell);
    }

    if (ui.menubarContainer) moveExistingNode(ui.menubarContainer, ui._phase1.menubarShell);
    if (ui.toolbarContainer) moveExistingNode(ui.toolbarContainer, ui._phase1.toolbarShell);
    if (ui.statusContainer) moveExistingNode(ui.statusContainer, ui._phase1.statusShell);

    each(REGION_KEYS, function (key) { callRenderer(ui, key); });
    attachLegacyContent(ui);
    applyLayout(ui);
    return true;
  }

  function refreshRegion(ui, key) {
    if (!ui || !ui._phase1 || !ui._phase1.shell) return false;
    if (REGION_KEYS.indexOf(key) < 0) return false;
    callRenderer(ui, key);
    attachLegacyContent(ui);
    applyLayout(ui);
    return true;
  }

  function retrofitIfReady() {
    var ui = getUi();
    if (!ui) return false;
    mountShell(ui);
    return true;
  }

  function installPrototypePatch() {
    if (patchInstalled || !global.EditorUi || !global.EditorUi.prototype) {
      return false;
    }

    var proto = global.EditorUi.prototype;
    if (proto.__DFTPhase1ShellPatched) {
      patchInstalled = true;
      return true;
    }
    proto.__DFTPhase1ShellPatched = true;

    var prevCreateUi = proto.createUi;
    var prevRefresh = proto.refresh;

    proto.createUi = function () {
      if (typeof prevCreateUi === 'function') {
        prevCreateUi.apply(this, arguments);
      }
      mountShell(this);
      this.refresh(true);
    };

    proto.refresh = function () {
      if (this && this._phase1 && this._phase1.shell) {
        applyLayout(this);
        return;
      }
      if (typeof prevRefresh === 'function') {
        return prevRefresh.apply(this, arguments);
      }
    };

    patchInstalled = true;
    return true;
  }

  function ensureBootstrapped() {
    installPrototypePatch();
    if (retrofitIfReady()) {
      if (bootstrapTimer) {
        clearInterval(bootstrapTimer);
        bootstrapTimer = null;
      }
      return;
    }

    if (!bootstrapTimer) {
      var tries = 0;
      bootstrapTimer = setInterval(function () {
        tries += 1;
        installPrototypePatch();
        if (retrofitIfReady() || tries > 120) {
          clearInterval(bootstrapTimer);
          bootstrapTimer = null;
        }
      }, 100);
    }
  }

  var api = {
    register: function (regionKey, renderer) {
      if (REGION_KEYS.indexOf(regionKey) < 0) {
        throw new Error('Unsupported region: ' + regionKey);
      }
      if (typeof renderer === 'function') {
        registry[regionKey] = { render: renderer };
      } else if (renderer && typeof renderer.render === 'function') {
        registry[regionKey] = renderer;
      } else {
        throw new Error('Renderer must be a function or object with render()');
      }
      var ui = getUi();
      if (ui && ui._phase1 && ui._phase1.shell) {
        refreshRegion(ui, regionKey);
      }
      return api;
    },
    unregister: function (regionKey) {
      if (REGION_KEYS.indexOf(regionKey) < 0) return api;
      delete registry[regionKey];
      var ui = getUi();
      if (ui && ui._phase1 && ui._phase1.shell) {
        refreshRegion(ui, regionKey);
      }
      return api;
    },
    refresh: function (regionKey) {
      var ui = getUi();
      if (!ui) return false;
      if (!regionKey) {
        if (!ui._phase1 || !ui._phase1.shell) mountShell(ui);
        each(REGION_KEYS, function (key) { refreshRegion(ui, key); });
        return true;
      }
      return refreshRegion(ui, regionKey);
    },
    mountNow: function (ui) {
      return mountShell(ui || getUi());
    },
    getUi: getUi,
    getRegistry: function () { return registry; },
    listRegions: function () { return REGION_KEYS.slice(); },
    setStatusText: function (text) {
      var ui = getUi();
      if (ui && ui._phase1 && ui._phase1.statusLine) {
        ui._phase1.statusLine.textContent = text || '';
        return true;
      }
      return false;
    },
    openWorkspaceTab: function (opts) {
      var ui = (opts && opts.ui) || getUi();
      if (!ui) return false;
      mountShell(ui);
      if (!ui._phase1) return false;
      opts = opts || {};
      var key = String(opts.key || '');
      if (!key) return false;
      try {
        console.log('[DFTPhase1Shell] openWorkspaceTab', {
          key: key,
          label: opts.label,
          title: opts.title,
          closable: opts.closable
        });
      } catch (e) {}
      var tabs = ensureWorkspaceTabs(ui);
      var existing = getWorkspaceTab(ui, key);
      if (existing) {
        if (opts.label) existing.label = String(opts.label);
        if (opts.title) existing.title = String(opts.title);
        if (typeof opts.render === 'function') existing.render = opts.render;
        if (typeof opts.onClose === 'function') existing.onClose = opts.onClose;
      } else {
        tabs.push({
          key: key,
          label: String(opts.label || key),
          title: String(opts.title || opts.label || key),
          kind: 'custom',
          closable: opts.closable === false ? false : true,
          render: typeof opts.render === 'function' ? opts.render : noop,
          onClose: typeof opts.onClose === 'function' ? opts.onClose : null
        });
      }
      ui._phase1.workspaceTabs = tabs;
      ui._phase1.state.activeWorkspaceTab = key;
      refreshRegion(ui, 'workspace');
      return true;
    },
    closeWorkspaceTab: function (key) {
      var ui = getUi();
      return closeWorkspaceTab(ui, key);
    },
    activateWorkspaceTab: function (key) {
      var ui = getUi();
      if (!ui || !ui._phase1) return false;
      if (!setActiveWorkspaceTab(ui, key)) return false;
      refreshRegion(ui, 'workspace');
      return true;
    }
  };

  global[API_NAME] = api;
  ensureBootstrapped();
})(typeof window !== 'undefined' ? window : this);
