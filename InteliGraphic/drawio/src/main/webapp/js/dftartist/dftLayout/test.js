
(function () {
  if (typeof window === 'undefined' || typeof window.EditorUi === 'undefined') {
    return;
  }

  var proto = window.EditorUi.prototype;
  if (proto.__phase1LayoutShellPatched) {
    return;
  }
  proto.__phase1LayoutShellPatched = true;

  var prevCreateDivs = proto.createDivs;
  var prevCreateUi = proto.createUi;
  var prevRefresh = proto.refresh;

  function createDiv(ui, className) {
    if (typeof ui.createDiv === 'function') {
      return ui.createDiv(className);
    }
    var el = document.createElement('div');
    el.className = className || '';
    return el;
  }

  function ensureStyle() {
    if (document.getElementById('phase1-layout-shell-style')) {
      return;
    }

    var style = document.createElement('style');
    style.id = 'phase1-layout-shell-style';
    style.type = 'text/css';
    style.textContent = [
      '.phase1-shell,.phase1-shell *{box-sizing:border-box;}',
      '.phase1-shell{position:absolute;inset:0;display:flex;flex-direction:column;font-family:Arial,Helvetica,sans-serif;background:#f5f6f8;color:#1f2937;}',
      '.phase1-region{position:relative;overflow:hidden;background:#fff;}',
      '.phase1-menubar-shell{flex:0 0 34px;min-height:38px;border-bottom:1px solid #d7dce3;margin-bottom:4px;background:#fafbfc;}',
      '.phase1-toolbar-shell{flex:0 0 42px;min-height:42px;border-bottom:1px solid #d7dce3;background:#ffffff;}',
      '.phase1-body{flex:1 1 auto;min-height:0;display:flex;align-items:stretch;}',
      '.phase1-flow-nav{flex:0 0 auto;width:208px;min-width:56px;border-right:1px solid #d7dce3;background:#f8fafc;display:flex;flex-direction:column;}',
      '.phase1-right-host{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;}',
      '.phase1-top-area{flex:1 1 auto;min-height:0;display:flex;align-items:stretch;background:#eef2f7;}',
      '.phase1-splitter-v{flex:0 0 6px;cursor:col-resize;background:#eef2f7;border-left:1px solid #d7dce3;border-right:1px solid #d7dce3;}',
      '.phase1-splitter-v:hover,.phase1-splitter-v.phase1-dragging{background:#dbeafe;}',
      '.phase1-splitter-h{flex:0 0 6px;cursor:row-resize;background:#eef2f7;border-top:1px solid #d7dce3;border-bottom:1px solid #d7dce3;}',
      '.phase1-splitter-h:hover,.phase1-splitter-h.phase1-dragging{background:#dbeafe;}',
      '.phase1-project-shell{flex:0 0 auto;width:280px;min-width:220px;border-right:0;background:#ffffff;display:flex;flex-direction:column;min-height:0;}',
      '.phase1-workspace-shell{flex:1 1 auto;min-width:0;background:#ffffff;display:flex;flex-direction:column;min-height:0;border-right:0;}',
      '.phase1-context-shell{flex:0 0 auto;width:320px;min-width:260px;background:#ffffff;display:flex;flex-direction:column;min-height:0;}',
      '.phase1-dock-shell{flex:0 0 auto;height:220px;min-height:0;background:#ffffff;border-top:0;display:flex;flex-direction:column;}',
      '.phase1-status-shell{flex:0 0 24px;min-height:24px;border-top:1px solid #d7dce3;background:#fafbfc;display:flex;align-items:center;}',
      '.phase1-titlebar{flex:0 0 32px;min-height:32px;padding:0 10px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;background:#f8fafc;font-size:12px;font-weight:600;color:#111827;}',
      '.phase1-toolbar-row{flex:0 0 32px;min-height:32px;padding:0 8px;border-bottom:1px solid #eef2f7;display:flex;align-items:center;gap:6px;background:#ffffff;}',
      '.phase1-tabbar{flex:0 0 32px;min-height:32px;padding:0 8px;border-bottom:1px solid #e5e7eb;display:flex;align-items:end;gap:4px;background:#f8fafc;}',
      '.phase1-tab{border:1px solid transparent;border-bottom:none;border-radius:6px 6px 0 0;padding:6px 10px;font-size:12px;line-height:1;color:#4b5563;cursor:pointer;user-select:none;}',
      '.phase1-tab:hover{background:#eef2ff;color:#111827;}',
      '.phase1-tab.active{background:#ffffff;border-color:#d7dce3;color:#111827;font-weight:600;}',
      '.phase1-tool-btn{display:inline-flex;align-items:center;justify-content:center;height:24px;padding:0 8px;border:1px solid #d7dce3;border-radius:4px;background:#ffffff;font-size:12px;color:#374151;cursor:pointer;user-select:none;}',
      '.phase1-tool-btn:hover{background:#f3f4f6;}',
      '.phase1-tool-btn.ghost{border-color:transparent;background:transparent;}',
      '.phase1-tool-btn.ghost:hover{background:#eef2f7;}',
      '.phase1-tool-spacer{flex:1 1 auto;}',
      '.phase1-panel-body{position:relative;flex:1 1 auto;min-height:0;overflow:hidden;background:#ffffff;}',
      '.phase1-scroll-panel{position:absolute;inset:0;overflow:auto;padding:10px;font-size:12px;}',
      '.phase1-placeholder{padding:10px;font-size:12px;color:#4b5563;}',
      '.phase1-tree{list-style:none;margin:0;padding:0;font-size:12px;line-height:1.7;color:#374151;}',
      '.phase1-tree li{padding-left:2px;white-space:nowrap;}',
      '.phase1-tree ul{list-style:none;margin:0 0 0 14px;padding:0;}',
      '.phase1-mono{font-family:Consolas,Monaco,monospace;}',
      '.phase1-dock-output{white-space:pre-wrap;font-size:12px;line-height:1.6;color:#111827;}',
      '.phase1-flow-list{flex:1 1 auto;overflow:auto;padding:8px;}',
      '.phase1-flow-item{padding:8px;border:1px solid transparent;border-radius:6px;margin-bottom:6px;background:transparent;cursor:pointer;}',
      '.phase1-flow-item:hover{background:#eef2ff;border-color:#dbeafe;}',
      '.phase1-flow-item.active{background:#eaf2ff;border-color:#bfdbfe;}',
      '.phase1-flow-title{font-size:12px;font-weight:600;color:#111827;display:flex;align-items:center;gap:6px;}',
      '.phase1-flow-sub{margin-top:4px;font-size:11px;color:#6b7280;line-height:1.5;}',
      '.phase1-dot{display:inline-block;width:8px;height:8px;border-radius:999px;background:#9ca3af;}',
      '.phase1-dot.active{background:#2563eb;}',
      '.phase1-dot.done{background:#10b981;}',
      '.phase1-workspace-tabstrip{flex:0 0 32px;min-height:32px;padding:0 8px;border-bottom:1px solid #e5e7eb;display:flex;align-items:end;gap:4px;background:#f8fafc;}',
      '.phase1-workspace-tools{flex:0 0 34px;min-height:34px;padding:0 8px;border-bottom:1px solid #eef2f7;display:flex;align-items:center;gap:6px;background:#ffffff;}',
      '.phase1-workspace-body{position:relative;flex:1 1 auto;min-height:0;background:#ffffff;}',
      '.phase1-workspace-body > .geDiagramContainer{position:absolute !important;inset:0;}',
      '.phase1-status-shell .geStatus{position:static !important;display:flex;align-items:center;height:100%;padding:0 10px;font-size:12px;color:#4b5563;}',
      '.phase1-menubar-shell .geMenubarContainer,.phase1-toolbar-shell .geToolbarContainer{position:static !important;}',
      '.phase1-context-content{position:absolute;inset:0;}',
      '.phase1-context-panel{position:absolute;inset:0;display:none;}',
      '.phase1-context-panel.active{display:block;}',
      '.phase1-project-panel{position:absolute;inset:0;display:none;overflow:auto;}',
      '.phase1-project-panel.active{display:block;}',
      '.phase1-dock-panel{position:absolute;inset:0;display:none;overflow:auto;}',
      '.phase1-dock-panel.active{display:block;}',
      '.phase1-properties-fallback,.phase1-ip-fallback,.phase1-view-fallback{padding:10px;font-size:12px;color:#4b5563;}',
      '.phase1-hidden{display:none !important;}',
      '.phase1-search{height:24px;padding:0 8px;border:1px solid #d7dce3;border-radius:4px;font-size:12px;outline:none;min-width:120px;}',
      '.phase1-kbd{display:inline-block;padding:1px 4px;border:1px solid #d1d5db;border-radius:4px;background:#f9fafb;font-size:11px;font-family:Consolas,Monaco,monospace;}',
      '.phase1-context-shell .geSidebarContainer,.phase1-context-shell .geFormatContainer{position:absolute !important;inset:0 !important;width:auto !important;height:auto !important;left:0 !important;right:0 !important;top:0 !important;bottom:0 !important;border:0 !important;}',
      '.phase1-context-shell .geSidebar,.phase1-context-shell .geFormat{position:absolute !important;inset:0 !important;}',
      '.phase1-workspace-overlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;padding:20px;z-index:2;background:rgba(255,255,255,0.92);color:#4b5563;font-size:14px;text-align:center;}',
      '.phase1-flow-mini .phase1-flow-sub{display:none;}',
      '.phase1-flow-mini .phase1-flow-title .label{display:none;}',
      '.phase1-flow-mini .phase1-titlebar .label{display:none;}',
      '.phase1-flow-mini .phase1-titlebar{justify-content:center;padding:0;}',
      '.phase1-flow-mini .phase1-flow-list{padding:8px 4px;}',
      '.phase1-flow-mini .phase1-flow-item{padding:8px 6px;display:flex;justify-content:center;}',
      '.phase1-flow-mini .phase1-dot{width:10px;height:10px;}',
      '.phase1-flow-mini .phase1-tool-btn:not(.phase1-flow-toggle){display:none;}'
    ].join('');
    document.head.appendChild(style);
  }

  function createState(ui) {
    return {
      flowNavWidth: 208,
      flowNavCollapsed: false,
      projectWidth: 280,
      contextWidth: 320,
      dockHeight: 220,
      minFlowExpanded: 180,
      minFlowCollapsed: 56,
      minProjectWidth: 220,
      minContextWidth: 260,
      minDockHeight: 120,
      maxDockRatio: 0.55,
      projectTab: 'sources',
      contextTab: (ui.format ? 'properties' : (ui.sidebar ? 'ip' : 'view')),
      dockTab: 'terminal'
    };
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function makeToolBtn(label, title) {
    var btn = document.createElement('div');
    btn.className = 'phase1-tool-btn';
    btn.textContent = label;
    if (title) {
      btn.title = title;
    }
    return btn;
  }

  function makeGhostBtn(label, title) {
    var btn = makeToolBtn(label, title);
    btn.className += ' ghost';
    return btn;
  }

  function makeTab(label, key) {
    var tab = document.createElement('div');
    tab.className = 'phase1-tab';
    tab.setAttribute('data-key', key);
    tab.textContent = label;
    return tab;
  }

  function buildFlowNavigator(ui) {
    var host = ui._phase1.flowNavContainer;
    host.innerHTML = '';

    var header = document.createElement('div');
    header.className = 'phase1-titlebar';

    var title = document.createElement('div');
    title.className = 'label';
    title.textContent = 'Flow Navigator';

    var actions = document.createElement('div');
    var toggle = makeGhostBtn('≡', '折叠 / 展开流程向导');
    toggle.className += ' phase1-flow-toggle';
    var more = makeGhostBtn('⋮', '更多');
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

    for (var i = 0; i < steps.length; i++) {
      var item = document.createElement('div');
      item.className = 'phase1-flow-item' + (i === 0 ? ' active' : '');
      item.setAttribute('data-key', steps[i][0]);

      var titleRow = document.createElement('div');
      titleRow.className = 'phase1-flow-title';

      var dot = document.createElement('span');
      dot.className = 'phase1-dot' + (i === 0 ? ' active' : '');
      var label = document.createElement('span');
      label.className = 'label';
      label.textContent = steps[i][1];
      titleRow.appendChild(dot);
      titleRow.appendChild(label);

      var sub = document.createElement('div');
      sub.className = 'phase1-flow-sub';
      sub.textContent = steps[i][2];

      item.appendChild(titleRow);
      item.appendChild(sub);
      list.appendChild(item);
    }

    host.appendChild(list);

    toggle.onclick = function () {
      ui._phase1.state.flowNavCollapsed = !ui._phase1.state.flowNavCollapsed;
      applyFlowCollapse(ui);
      ui.refresh(true);
    };

    list.onclick = function (evt) {
      var target = evt.target;
      while (target && target !== list && !target.getAttribute('data-key')) {
        target = target.parentNode;
      }
      if (!target || target === list) {
        return;
      }
      var items = list.querySelectorAll('.phase1-flow-item');
      for (var j = 0; j < items.length; j++) {
        items[j].className = items[j].className.replace(/\s?active/g, '');
        var d = items[j].querySelector('.phase1-dot');
        if (d) d.className = d.className.replace(/\s?active/g, '');
      }
      target.className += ' active';
      var dotNode = target.querySelector('.phase1-dot');
      if (dotNode) dotNode.className += ' active';
    };
  }

  function applyFlowCollapse(ui) {
    var st = ui._phase1.state;
    if (!ui._phase1 || !ui._phase1.flowNavContainer) {
      return;
    }
    if (st.flowNavCollapsed) {
      st.flowNavWidth = st.minFlowCollapsed;
      ui._phase1.flowNavContainer.className = ui._phase1.flowNavContainer.className.replace(/\s?phase1-flow-mini/g, '') + ' phase1-flow-mini';
    } else {
      if (st.flowNavWidth < st.minFlowExpanded) {
        st.flowNavWidth = 208;
      }
      ui._phase1.flowNavContainer.className = ui._phase1.flowNavContainer.className.replace(/\s?phase1-flow-mini/g, '');
    }
  }

  function buildProjectExplorer(ui) {
    var host = ui._phase1.projectShell;
    host.innerHTML = '';

    var titlebar = document.createElement('div');
    titlebar.className = 'phase1-titlebar';
    titlebar.innerHTML = '<span>Project Explorer</span><span class="phase1-tool-btn ghost" title="更多">⋮</span>';
    host.appendChild(titlebar);

    var tabs = document.createElement('div');
    tabs.className = 'phase1-tabbar';
    tabs.appendChild(makeTab('Sources', 'sources'));
    tabs.appendChild(makeTab('Hierarchy', 'hierarchy'));
    tabs.appendChild(makeTab('Runs', 'runs'));
    tabs.appendChild(makeTab('Files', 'files'));
    host.appendChild(tabs);

    var tools = document.createElement('div');
    tools.className = 'phase1-toolbar-row';
    var search = document.createElement('input');
    search.className = 'phase1-search';
    search.type = 'text';
    search.placeholder = 'Search';
    tools.appendChild(search);
    tools.appendChild(makeToolBtn('＋', '添加'));
    tools.appendChild(makeToolBtn('⟳', '刷新'));
    tools.appendChild(makeGhostBtn('⋮', '更多'));
    host.appendChild(tools);

    var body = document.createElement('div');
    body.className = 'phase1-panel-body';

    var sources = document.createElement('div');
    sources.className = 'phase1-project-panel';
    sources.setAttribute('data-key', 'sources');
    sources.innerHTML =
      '<div class="phase1-scroll-panel">' +
      '<ul class="phase1-tree">' +
      '<li>chip853' +
      '  <ul>' +
      '    <li>Design Sources' +
      '      <ul>' +
      '        <li>top.v</li>' +
      '        <li>core.v</li>' +
      '        <li>dft_wrapper.v</li>' +
      '      </ul>' +
      '    </li>' +
      '    <li>Constraints' +
      '      <ul>' +
      '        <li>top.sdc</li>' +
      '        <li>floorplan.tcl</li>' +
      '      </ul>' +
      '    </li>' +
      '    <li>Simulation Sources' +
      '      <ul><li>tb_top.v</li></ul>' +
      '    </li>' +
      '    <li>Generated Files' +
      '      <ul><li>synth_netlist.v</li></ul>' +
      '    </li>' +
      '  </ul>' +
      '</li>' +
      '</ul>' +
      '</div>';

    var hierarchy = document.createElement('div');
    hierarchy.className = 'phase1-project-panel';
    hierarchy.setAttribute('data-key', 'hierarchy');
    hierarchy.innerHTML =
      '<div class="phase1-scroll-panel">' +
      '<ul class="phase1-tree">' +
      '<li>top' +
      '  <ul>' +
      '    <li>u_core</li>' +
      '    <li>u_dft_wrap' +
      '      <ul>' +
      '        <li>u_tap</li>' +
      '        <li>u_occ</li>' +
      '      </ul>' +
      '    </li>' +
      '  </ul>' +
      '</li>' +
      '</ul>' +
      '</div>';

    var runs = document.createElement('div');
    runs.className = 'phase1-project-panel';
    runs.setAttribute('data-key', 'runs');
    runs.innerHTML =
      '<div class="phase1-scroll-panel">' +
      '<div class="phase1-placeholder">' +
      '<div><strong>synth_1</strong> — Completed</div>' +
      '<div><strong>impl_1</strong> — Idle</div>' +
      '<div style="margin-top:8px;color:#6b7280;">Phase 1 仅放占位内容，后续接真实运行队列。</div>' +
      '</div>' +
      '</div>';

    var files = document.createElement('div');
    files.className = 'phase1-project-panel';
    files.setAttribute('data-key', 'files');
    files.innerHTML =
      '<div class="phase1-scroll-panel">' +
      '<ul class="phase1-tree">' +
      '<li>/project/chip853/' +
      '  <ul>' +
      '    <li>rtl/</li>' +
      '    <li>constraints/</li>' +
      '    <li>scripts/</li>' +
      '    <li>reports/</li>' +
      '  </ul>' +
      '</li>' +
      '</ul>' +
      '</div>';

    body.appendChild(sources);
    body.appendChild(hierarchy);
    body.appendChild(runs);
    body.appendChild(files);
    host.appendChild(body);

    ui._phase1.projectTabs = tabs;
    ui._phase1.projectPanels = body;

    tabs.onclick = function (evt) {
      var target = evt.target;
      if (target && target.getAttribute('data-key')) {
        ui._phase1.state.projectTab = target.getAttribute('data-key');
        activateTabSet(tabs, body, ui._phase1.state.projectTab, 'phase1-project-panel');
      }
    };

    activateTabSet(tabs, body, ui._phase1.state.projectTab, 'phase1-project-panel');
  }

  function buildWorkspace(ui) {
    var host = ui._phase1.workspaceShell;
    host.innerHTML = '';

    var tabs = document.createElement('div');
    tabs.className = 'phase1-workspace-tabstrip';
    tabs.appendChild(makeTab('Design: floorplan', 'design'));
    tabs.appendChild(makeTab('RTL', 'rtl'));
    tabs.appendChild(makeTab('Waveform', 'wave'));
    tabs.appendChild(makeTab('Report', 'report'));
    var spacer = document.createElement('div');
    spacer.className = 'phase1-tool-spacer';
    tabs.appendChild(spacer);
    tabs.appendChild(makeGhostBtn('+', '新建页签'));
    tabs.appendChild(makeGhostBtn('Split▼', '分屏'));
    tabs.appendChild(makeGhostBtn('⋮', '更多'));
    host.appendChild(tabs);

    var tools = document.createElement('div');
    tools.className = 'phase1-workspace-tools';
    tools.appendChild(makeToolBtn('Pointer', '选择'));
    tools.appendChild(makeToolBtn('Pan', '平移'));
    tools.appendChild(makeToolBtn('Wire', '连线'));
    tools.appendChild(makeToolBtn('Rect', '矩形'));
    tools.appendChild(makeToolBtn('Text', '文本'));
    var toolsSpacer = document.createElement('div');
    toolsSpacer.className = 'phase1-tool-spacer';
    tools.appendChild(toolsSpacer);
    tools.appendChild(makeToolBtn('Zoom-', '缩小'));
    tools.appendChild(makeToolBtn('100%▼', '缩放'));
    tools.appendChild(makeToolBtn('Zoom+', '放大'));
    tools.appendChild(makeToolBtn('Fit', '适配'));
    host.appendChild(tools);

    var body = document.createElement('div');
    body.className = 'phase1-workspace-body';

    ui.diagramContainer.style.position = 'absolute';
    ui.diagramContainer.style.left = '0';
    ui.diagramContainer.style.right = '0';
    ui.diagramContainer.style.top = '0';
    ui.diagramContainer.style.bottom = '0';
    ui.diagramContainer.style.width = 'auto';
    ui.diagramContainer.style.height = 'auto';
    ui.diagramContainer.style.display = ui._noProjectMode ? 'none' : '';
    body.appendChild(ui.diagramContainer);

    var overlay = document.createElement('div');
    overlay.className = 'phase1-workspace-overlay';
    overlay.innerHTML = '<div><div style="font-weight:600;margin-bottom:8px;">Workspace</div><div>Phase 1 已完成布局壳。当前若无项目，可在这里显示欢迎页/占位页。</div></div>';
    body.appendChild(overlay);

    if (ui._splashContainer) {
      ui._splashContainer.style.display = 'flex';
      ui._splashContainer.style.position = 'absolute';
      ui._splashContainer.style.left = '0';
      ui._splashContainer.style.right = '0';
      ui._splashContainer.style.top = '0';
      ui._splashContainer.style.bottom = '0';
      ui._splashContainer.style.zIndex = '3';
      ui._splashContainer.style.background = 'rgba(255,255,255,0.92)';
      body.appendChild(ui._splashContainer);
    }

    host.appendChild(body);
    ui._phase1.workspaceBody = body;
    ui._phase1.workspaceOverlay = overlay;

    var firstTab = tabs.querySelector('.phase1-tab');
    if (firstTab) {
      firstTab.className += ' active';
    }
  }

  function buildContextPanel(ui) {
    var host = ui._phase1.contextShell;
    host.innerHTML = '';

    var titlebar = document.createElement('div');
    titlebar.className = 'phase1-titlebar';
    titlebar.innerHTML = '<span>Context Panel</span><span class="phase1-tool-btn ghost" title="更多">⋮</span>';
    host.appendChild(titlebar);

    var tabs = document.createElement('div');
    tabs.className = 'phase1-tabbar';
    if (ui.format) tabs.appendChild(makeTab('Properties', 'properties'));
    tabs.appendChild(makeTab('IP', 'ip'));
    tabs.appendChild(makeTab('View', 'view'));
    host.appendChild(tabs);

    var tools = document.createElement('div');
    tools.className = 'phase1-toolbar-row';
    var search = document.createElement('input');
    search.className = 'phase1-search';
    search.type = 'text';
    search.placeholder = 'Search';
    tools.appendChild(search);
    tools.appendChild(makeToolBtn('Pin', '固定当前页签'));
    tools.appendChild(makeGhostBtn('⋮', '更多'));
    host.appendChild(tools);

    var body = document.createElement('div');
    body.className = 'phase1-panel-body';

    var content = document.createElement('div');
    content.className = 'phase1-context-content';

    if (ui.format) {
      ui.formatContainer.className += ' phase1-context-panel';
      ui.formatContainer.setAttribute('data-key', 'properties');
      ui.formatContainer.style.display = 'none';
      ui.formatContainer.style.overflow = 'hidden';
      content.appendChild(ui.formatContainer);
    } else {
      var propFallback = document.createElement('div');
      propFallback.className = 'phase1-context-panel phase1-properties-fallback';
      propFallback.setAttribute('data-key', 'properties');
      propFallback.innerHTML = 'Properties 面板未启用。';
      content.appendChild(propFallback);
    }

    if (ui.sidebar) {
      ui.sidebarContainer.className += ' phase1-context-panel';
      ui.sidebarContainer.setAttribute('data-key', 'ip');
      ui.sidebarContainer.style.display = 'none';
      ui.sidebarContainer.style.overflow = 'hidden';
      content.appendChild(ui.sidebarContainer);
    } else {
      var ipFallback = document.createElement('div');
      ipFallback.className = 'phase1-context-panel phase1-ip-fallback';
      ipFallback.setAttribute('data-key', 'ip');
      ipFallback.innerHTML = 'IP 面板未启用。';
      content.appendChild(ipFallback);
    }

    var viewPanel = document.createElement('div');
    viewPanel.className = 'phase1-context-panel phase1-view-fallback';
    viewPanel.setAttribute('data-key', 'view');
    viewPanel.innerHTML =
      '<div style="padding:10px;">' +
      '<div style="font-weight:600;margin-bottom:8px;">View Filter</div>' +
      '<div><label><input type="checkbox" checked> Nets</label></div>' +
      '<div><label><input type="checkbox" checked> Pins</label></div>' +
      '<div><label><input type="checkbox" checked> Labels</label></div>' +
      '<div style="margin-top:10px;color:#6b7280;">Phase 1 先放占位内容，后续接图层/过滤器。</div>' +
      '</div>';
    content.appendChild(viewPanel);

    body.appendChild(content);
    host.appendChild(body);

    ui._phase1.contextTabs = tabs;
    ui._phase1.contextPanels = content;

    tabs.onclick = function (evt) {
      var target = evt.target;
      if (target && target.getAttribute('data-key')) {
        ui._phase1.state.contextTab = target.getAttribute('data-key');
        activateTabSet(tabs, content, ui._phase1.state.contextTab, 'phase1-context-panel');
      }
    };

    if (!ui.format && ui._phase1.state.contextTab === 'properties') {
      ui._phase1.state.contextTab = 'ip';
    }
    activateTabSet(tabs, content, ui._phase1.state.contextTab, 'phase1-context-panel');
  }

  function buildBottomDock(ui) {
    var host = ui._phase1.dockShell;
    host.innerHTML = '';

    // var titlebar = document.createElement('div');
    // titlebar.className = 'phase1-titlebar';
    // titlebar.innerHTML = '<span>Bottom Dock</span><span class="phase1-tool-btn ghost" title="更多">⋮</span>';
    // host.appendChild(titlebar);

    var tabs = document.createElement('div');
    tabs.className = 'phase1-tabbar';
    tabs.appendChild(makeTab('Terminal', 'terminal'));
    tabs.appendChild(makeTab('Output', 'output'));
    tabs.appendChild(makeTab('Messages', 'messages'));
    tabs.appendChild(makeTab('Reports', 'reports'));
    tabs.appendChild(makeTab('Jobs', 'jobs'));
    host.appendChild(tabs);

    var tools = document.createElement('div');
    tools.className = 'phase1-toolbar-row';
    tools.appendChild(makeToolBtn('Clear', '清空'));
    tools.appendChild(makeToolBtn('Copy', '复制'));
    tools.appendChild(makeToolBtn('Filter▼', '过滤'));
    tools.appendChild(makeToolBtn('Auto Scroll✓', '自动滚动'));
    var dockSpacer = document.createElement('div');
    dockSpacer.className = 'phase1-tool-spacer';
    tools.appendChild(dockSpacer);
    var collapseBtn = makeToolBtn('×', '折叠 / 展开 Dock');
    tools.appendChild(collapseBtn);
    host.appendChild(tools);

    var body = document.createElement('div');
    body.className = 'phase1-panel-body';

    var terminal = document.createElement('div');
    terminal.className = 'phase1-dock-panel';
    terminal.setAttribute('data-key', 'terminal');
    terminal.innerHTML =
      '<div class="phase1-scroll-panel phase1-dock-output phase1-mono">' +
      '&gt; source setup.tcl\n' +
      '&gt; run_synthesis --top top\n' +
      '[12:01:10] INFO  Reading HDL files...\n' +
      '[12:01:12] INFO  Checking constraints...\n' +
      '[12:01:20] WARN  Port scan_en is unconnected\n' +
      '[12:01:24] INFO  Synthesis completed\n' +
      '&gt; ' +
      '</div>';

    var output = document.createElement('div');
    output.className = 'phase1-dock-panel';
    output.setAttribute('data-key', 'output');
    output.innerHTML =
      '<div class="phase1-scroll-panel phase1-dock-output phase1-mono">' +
      '[Run] Starting implementation...\n' +
      '[Place] Utilization: 61%\n' +
      '[Route] Congestion: Low\n' +
      '[Done] Implementation finished.' +
      '</div>';

    var messages = document.createElement('div');
    messages.className = 'phase1-dock-panel';
    messages.setAttribute('data-key', 'messages');
    messages.innerHTML =
      '<div class="phase1-scroll-panel">' +
      '<div>WARN  Unconnected port <span class="phase1-kbd">scan_en</span></div>' +
      '<div style="margin-top:8px;">INFO  点击后续版本可定位到对象 / 文件。</div>' +
      '</div>';

    var reports = document.createElement('div');
    reports.className = 'phase1-dock-panel';
    reports.setAttribute('data-key', 'reports');
    reports.innerHTML =
      '<div class="phase1-scroll-panel">' +
      '<div><strong>Timing Summary</strong></div>' +
      '<div>WNS: 0.132 ns</div>' +
      '<div>TNS: 0.000 ns</div>' +
      '<div style="margin-top:8px;"><strong>DRC</strong>: 0 Errors / 12 Warnings</div>' +
      '</div>';

    var jobs = document.createElement('div');
    jobs.className = 'phase1-dock-panel';
    jobs.setAttribute('data-key', 'jobs');
    jobs.innerHTML =
      '<div class="phase1-scroll-panel">' +
      '<div><strong>synth_1</strong> — Completed</div>' +
      '<div><strong>impl_1</strong> — Pending</div>' +
      '<div style="margin-top:8px;color:#6b7280;">后续可接真实后台任务状态。</div>' +
      '</div>';

    body.appendChild(terminal);
    body.appendChild(output);
    body.appendChild(messages);
    body.appendChild(reports);
    body.appendChild(jobs);
    host.appendChild(body);

    ui._phase1.dockTabs = tabs;
    ui._phase1.dockPanels = body;

    tabs.onclick = function (evt) {
      var target = evt.target;
      if (target && target.getAttribute('data-key')) {
        ui._phase1.state.dockTab = target.getAttribute('data-key');
        activateTabSet(tabs, body, ui._phase1.state.dockTab, 'phase1-dock-panel');
      }
    };

    collapseBtn.onclick = function () {
      var st = ui._phase1.state;
      if (st.dockHeight > 0) {
        st._lastDockHeight = st.dockHeight;
        st.dockHeight = 0;
      } else {
        st.dockHeight = st._lastDockHeight || 220;
      }
      ui.refresh(true);
    };

    activateTabSet(tabs, body, ui._phase1.state.dockTab, 'phase1-dock-panel');
  }

  function activateTabSet(tabBar, panelHost, activeKey, panelClass) {
    var tabs = tabBar.querySelectorAll('.phase1-tab');
    var i;
    for (i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('data-key') === activeKey) {
        if (tabs[i].className.indexOf('active') < 0) {
          tabs[i].className += ' active';
        }
      } else {
        tabs[i].className = tabs[i].className.replace(/\s?active/g, '');
      }
    }

    var panels = panelHost.querySelectorAll('.' + panelClass);
    for (i = 0; i < panels.length; i++) {
      if (panels[i].getAttribute('data-key') === activeKey) {
        if (panels[i].className.indexOf('active') < 0) {
          panels[i].className += ' active';
        }
        panels[i].style.display = '';
      } else {
        panels[i].className = panels[i].className.replace(/\s?active/g, '');
        panels[i].style.display = 'none';
      }
    }
  }

  function applyLayout(ui) {
    if (!ui._phase1 || !ui._phase1.shell) {
      return;
    }

    var st = ui._phase1.state;
    applyFlowCollapse(ui);

    var bodyRect = ui._phase1.body.getBoundingClientRect();
    var rightHostRect = ui._phase1.rightHost.getBoundingClientRect();
    var topAreaRect = ui._phase1.topArea.getBoundingClientRect();

    var flowWidth = st.flowNavCollapsed ? st.minFlowCollapsed : clamp(st.flowNavWidth, st.minFlowExpanded, Math.max(st.minFlowExpanded, bodyRect.width * 0.25));
    st.flowNavWidth = flowWidth;
    ui._phase1.flowNavContainer.style.width = flowWidth + 'px';

    var availableRightWidth = Math.max(200, rightHostRect.width);
    var availableTopWidth = Math.max(200, topAreaRect.width);
    var splitAllowance = 12;
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

    syncWorkspaceOverlay(ui);

    if (ui.editor && ui.editor.graph && typeof ui.editor.graph.sizeDidChange === 'function') {
      ui.editor.graph.sizeDidChange();
    }
  }

  function syncWorkspaceOverlay(ui) {
    if (!ui._phase1) {
      return;
    }
    var noProject = !!ui._noProjectMode;
    if (ui._phase1.workspaceOverlay) {
      ui._phase1.workspaceOverlay.style.display = noProject && !ui._splashContainer ? 'flex' : 'none';
    }
    if (ui._splashContainer) {
      ui._splashContainer.style.display = noProject ? 'flex' : 'none';
      ui._splashContainer.style.zIndex = '3';
    }
    ui.diagramContainer.style.display = noProject ? 'none' : '';
  }

  function bindSplitters(ui) {
    var doc = document;
    var drag = null;

    function onMove(evt) {
      if (!drag || !ui._phase1) {
        return;
      }

      var st = ui._phase1.state;
      if (drag.type === 'project') {
        var rect = ui._phase1.topArea.getBoundingClientRect();
        var x = evt.clientX - rect.left;
        var max = rect.width - st.minContextWidth - 220 - 12;
        st.projectWidth = clamp(x, st.minProjectWidth, max);
      } else if (drag.type === 'context') {
        var rect2 = ui._phase1.topArea.getBoundingClientRect();
        var rightSpace = rect2.right - evt.clientX;
        var max2 = rect2.width - st.minProjectWidth - 220 - 12;
        st.contextWidth = clamp(rightSpace, st.minContextWidth, max2);
      } else if (drag.type === 'dock') {
        var rect3 = ui._phase1.rightHost.getBoundingClientRect();
        var bottomSpace = rect3.bottom - evt.clientY;
        var maxDock = Math.max(st.minDockHeight, Math.floor(rect3.height * st.maxDockRatio));
        st.dockHeight = clamp(bottomSpace, st.minDockHeight, maxDock);
      }
      ui.refresh(true);
    }

    function onUp() {
      if (!drag) {
        return;
      }
      if (drag.el) {
        drag.el.className = drag.el.className.replace(/\s?phase1-dragging/g, '');
      }
      drag = null;
    }

    function start(type, el, evt) {
      evt.preventDefault();
      drag = { type: type, el: el };
      if (el.className.indexOf('phase1-dragging') < 0) {
        el.className += ' phase1-dragging';
      }
    }

    ui._phase1.projectSplitter.onmousedown = function (evt) {
      start('project', ui._phase1.projectSplitter, evt || window.event);
    };
    ui._phase1.contextSplitter.onmousedown = function (evt) {
      start('context', ui._phase1.contextSplitter, evt || window.event);
    };
    ui._phase1.dockSplitter.onmousedown = function (evt) {
      start('dock', ui._phase1.dockSplitter, evt || window.event);
    };

    doc.addEventListener('mousemove', onMove);
    doc.addEventListener('mouseup', onUp);

    if (ui.destroyFunctions && ui.destroyFunctions.push) {
      ui.destroyFunctions.push(function () {
        doc.removeEventListener('mousemove', onMove);
        doc.removeEventListener('mouseup', onUp);
      });
    }
  }

  function buildStatusBar(ui) {
    var host = ui._phase1.statusShell;
    host.innerHTML = '';

    if (ui.statusContainer) {
      ui.statusContainer.style.position = 'static';
      ui.statusContainer.style.right = 'auto';
      ui.statusContainer.style.left = 'auto';
      ui.statusContainer.style.top = 'auto';
      ui.statusContainer.style.bottom = 'auto';
      ui.statusContainer.style.width = '100%';
      ui.statusContainer.style.height = '24px';
      host.appendChild(ui.statusContainer);
    } else {
      var fallback = document.createElement('div');
      fallback.className = 'phase1-placeholder';
      fallback.textContent = 'Project: chip853 | Mode: Floorplan | Jobs: 0 | 100%';
      host.appendChild(fallback);
    }
  }

  function assembleShell(ui) {
    ensureStyle();

    if (ui._phase1 && ui._phase1.shell) {
      return;
    }

    ui._phase1 = ui._phase1 || {};
    ui._phase1.state = ui._phase1.state || createState(ui);

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

    ui.container.style.position = 'relative';
    ui.container.style.overflow = 'hidden';
    ui.container.appendChild(shell);

    // Move existing regions created by the legacy createUi into the new shell.
    if (ui.menubarContainer) {
      ui.menubarContainer.style.position = 'relative';
      ui.menubarContainer.style.width = '100%';
      ui.menubarContainer.style.height = '100%';
      ui.menubarContainer.style.display = 'flex';
      ui.menubarContainer.style.alignItems = 'center';
      ui.menubarContainer.style.padding = '0 8px';
      menubarShell.appendChild(ui.menubarContainer);
      menubarShell.appendChild(ui.menubarContainer);
    }
    if (ui.toolbarContainer) {
      ui.toolbarContainer.style.position = 'relative';
      ui.toolbarContainer.style.width = '100%';
      ui.toolbarContainer.style.height = '100%';
      toolbarShell.appendChild(ui.toolbarContainer);
    }

    if (ui.hsplit) {
      ui.hsplit.style.display = 'none';
    }

    buildFlowNavigator(ui);
    buildProjectExplorer(ui);
    buildWorkspace(ui);
    buildContextPanel(ui);
    buildBottomDock(ui);
    buildStatusBar(ui);
    bindSplitters(ui);
  }

  proto.createDivs = function () {
    prevCreateDivs.apply(this, arguments);
    this._phase1 = this._phase1 || {};
    this._phase1.state = this._phase1.state || createState(this);
  };

  proto.createUi = function () {
    prevCreateUi.apply(this, arguments);
    assembleShell(this);
    this.refresh(true);
  };

  proto.refresh = function (force) {
    if (!this._phase1 || !this._phase1.shell) {
      return prevRefresh.apply(this, arguments);
    }
    applyLayout(this);
  };
})();
