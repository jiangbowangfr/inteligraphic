(function (global) {
  'use strict';

  global = global || (typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : (typeof self !== "undefined" ? self : {})));

  var NS = global.DFTEnvEditorDialog = global.DFTEnvEditorDialog || {};
  var STYLE_ID = 'dft-env-editor-style';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css = '' +
      '.dftenv-overlay{position:fixed;inset:0;background:rgba(15,23,42,.32);z-index:10002;display:flex;align-items:center;justify-content:center;}' +
      '.dftenv-dialog{width:min(900px,92vw);height:min(680px,88vh);background:#fff;border:1px solid #d0d7e2;border-radius:14px;box-shadow:0 18px 48px rgba(15,23,42,.18);display:flex;flex-direction:column;overflow:hidden;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;}' +
      '.dftenv-head{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:700;color:#111827;}' +
      '.dftenv-head .sub{font-size:12px;font-weight:500;color:#6b7280;margin-left:8px;}' +
      '.dftenv-body{display:flex;min-height:0;flex:1;}' +
      '.dftenv-tabs{width:188px;border-right:1px solid #e5e7eb;background:#fafbfc;padding:10px;box-sizing:border-box;overflow:auto;}' +
      '.dftenv-tab{height:36px;border-radius:10px;padding:0 12px;display:flex;align-items:center;cursor:pointer;color:#374151;font-size:13px;font-weight:600;}' +
      '.dftenv-tab:hover{background:#eef2ff;}' +
      '.dftenv-tab.active{background:#dbeafe;color:#1d4ed8;}' +
      '.dftenv-main{flex:1;min-width:0;display:flex;flex-direction:column;}' +
      '.dftenv-scroll{flex:1;min-height:0;overflow:auto;padding:18px;box-sizing:border-box;}' +
      '.dftenv-grid{display:grid;grid-template-columns:190px minmax(0,1fr);gap:12px 14px;align-items:center;}' +
      '.dftenv-label{font-size:12px;font-weight:700;color:#374151;}' +
      '.dftenv-input,.dftenv-textarea,.dftenv-select{width:100%;height:34px;border:1px solid #cfd6e3;border-radius:10px;padding:0 10px;box-sizing:border-box;font-size:13px;color:#111827;background:#fff;}' +
      '.dftenv-textarea{height:92px;padding:10px;resize:vertical;}' +
      '.dftenv-note{font-size:12px;color:#6b7280;line-height:1.5;margin:0 0 14px 0;}' +
      '.dftenv-section{border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:14px;background:#fff;}' +
      '.dftenv-section h4{margin:0 0 12px 0;font-size:13px;color:#111827;}' +
      '.dftenv-row{display:flex;gap:10px;align-items:center;}' +
      '.dftenv-check{display:flex;align-items:center;gap:8px;font-size:13px;color:#111827;}' +
      '.dftenv-foot{height:60px;border-top:1px solid #e5e7eb;padding:0 16px;display:flex;align-items:center;justify-content:space-between;}' +
      '.dftenv-actions{display:flex;gap:10px;}' +
      '.dftenv-btn{height:36px;border:1px solid #cfd6e3;border-radius:10px;padding:0 14px;background:#fff;cursor:pointer;font-size:13px;font-weight:700;color:#111827;}' +
      '.dftenv-btn.primary{background:#2563eb;border-color:#2563eb;color:#fff;}' +
      '.dftenv-status{font-size:12px;color:#6b7280;}' +
      '.dftenv-inline{display:flex;gap:10px;}' +
      '.dftenv-inline > *{flex:1;}' +
      '.dftenv-path{font-size:12px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.dftenv-help{margin-top:10px;padding:10px 12px;border-radius:10px;background:#f8fafc;color:#475569;font-size:12px;line-height:1.5;}' +
      '.dftenv-hidden{display:none !important;}';
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  function shallowClone(obj) {
    var out = {};
    if (!obj) return out;
    for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
    return out;
  }

  function defaultsForDesign(design) {
    var name = design && design.name ? String(design.name) : 'design';
    return {
      general: {
        designName: name,
        topModule: name,
        targetFlow: 'DFT',
        language: 'Mixed',
        pageGeneration: 'per-block',
        namingRule: 'snake_case'
      },
      libraries: {
        rtlIncludePath: '',
        customIpPath: '',
        techLibrary: '',
        enableBuiltinIp: true
      },
      rules: {
        autoPairHostSlave: true,
        interfaceNaming: 'auto',
        pageNaming: 'inherit-block-name',
        overwriteExistingInterfaces: false,
        overwriteExistingPages: false
      },
      floorplanDefaults: {
        defaultBlockWidth: 320,
        defaultBlockHeight: 160,
        defaultInterfaceSide: 'auto',
        minSpacing: 16,
        labelStyle: 'name-only'
      },
      output: {
        dftspecDir: 'out/dftspec',
        pagesDir: 'out/pages',
        reportsDir: 'out/reports',
        emitIntermediateYaml: true
      }
    };
  }

  function mergeEnv(base, override) {
    var out = defaultsForDesign({ name: base && base.general ? base.general.designName : '' });
    var topKeys = ['general', 'libraries', 'rules', 'floorplanDefaults', 'output'];
    var i;
    for (i = 0; i < topKeys.length; i++) {
      var sec = topKeys[i];
      if (base && base[sec]) {
        for (var bk in base[sec]) if (Object.prototype.hasOwnProperty.call(base[sec], bk)) out[sec][bk] = base[sec][bk];
      }
      if (override && override[sec]) {
        for (var ok in override[sec]) if (Object.prototype.hasOwnProperty.call(override[sec], ok)) out[sec][ok] = override[sec][ok];
      }
    }
    return out;
  }

  function getCurrentDesign(ui) {
    if (!ui || !ui.projectModel) return null;
    var ctx = ui._activeProjectPageCtx;
    if (ctx && ctx.designRef) return ctx.designRef;
    if (ui.projectModel.designs && ui.projectModel.designs.length) return ui.projectModel.designs[0];
    return null;
  }

  function getProjectRoot(ui) {
    if (!ui) return '';
    return ui._projectRootPath || (ui.projectModel && ui.projectModel.path) || '';
  }

  function joinPath() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) {
      var part = arguments[i];
      if (!part && part !== 0) continue;
      part = String(part);
      if (!part) continue;
      if (out.length === 0) {
        out.push(part.replace(/[\\/]+$/, ''));
      } else {
        out.push(part.replace(/^[\\/]+|[\\/]+$/g, ''));
      }
    }
    return out.join('/');
  }

  function resolveEnvPath(ui, design) {
    if (!design) return '';
    var root = getProjectRoot(ui);
    var relDir = design._dirRel || design.name || '';
    if (design.env_file) {
      if (/^([a-zA-Z]:)?[\\/]/.test(design.env_file)) return design.env_file;
      return joinPath(root, design.env_file);
    }
    return joinPath(root, relDir, 'env.json');
  }

  function requestSyncMaybe(payload) {
    try {
      if (typeof global.requestSync === 'function') return global.requestSync(payload);
    } catch (e) {}
    return null;
  }

  function readEnvFromDisk(ui, design) {
    var path = resolveEnvPath(ui, design);
    if (!path) return null;
    var res = requestSyncMaybe({ action: 'readFile', path: path, encoding: 'utf8' });
    if (!res) return null;
    var txt = typeof res === 'string' ? res : (res.data || res.content || res.text || '');
    if (!txt) return null;
    try { return JSON.parse(txt); } catch (e) { return null; }
  }

  function writeEnvToDisk(ui, design, envObj) {
    var path = resolveEnvPath(ui, design);
    if (!path) return { ok: false, reason: 'No env path' };
    try {
      var json = JSON.stringify(envObj, null, 2);
      var res = requestSyncMaybe({ action: 'writeFile', path: path, data: json, encoding: 'utf8' });
      if (res && res.error) return { ok: false, reason: String(res.error) };
      return { ok: true, path: path };
    } catch (e) {
      return { ok: false, reason: e.message || String(e) };
    }
  }

  function buildInput(type, value) {
    var el = document.createElement(type === 'textarea' ? 'textarea' : (type === 'select' ? 'select' : 'input'));
    if (type !== 'textarea' && type !== 'select') el.type = 'text';
    if (type === 'textarea') el.className = 'dftenv-textarea';
    else if (type === 'select') el.className = 'dftenv-select';
    else el.className = 'dftenv-input';
    if (type !== 'select' && value != null) el.value = String(value);
    return el;
  }

  function renderSectionHost(main, env, sectionKey) {
    main.innerHTML = '';
    var scroll = document.createElement('div');
    scroll.className = 'dftenv-scroll';
    main.appendChild(scroll);

    function addField(grid, label, input) {
      var l = document.createElement('div');
      l.className = 'dftenv-label';
      l.textContent = label;
      grid.appendChild(l);
      grid.appendChild(input);
      return input;
    }

    if (sectionKey === 'general') {
      var sec = document.createElement('div'); sec.className = 'dftenv-section';
      sec.innerHTML = '<h4>General</h4><p class="dftenv-note">Define the design identity and the default generation behavior for this design.</p>';
      var grid = document.createElement('div'); grid.className = 'dftenv-grid'; sec.appendChild(grid);
      addField(grid, 'Design Name', buildInput('text', env.general.designName)).setAttribute('data-bind', 'general.designName');
      addField(grid, 'Top Module', buildInput('text', env.general.topModule)).setAttribute('data-bind', 'general.topModule');
      var flowSel = buildInput('select'); flowSel.setAttribute('data-bind', 'general.targetFlow');
      ['DFT','Synthesis','P&R'].forEach(function (v) { var o = document.createElement('option'); o.value = v; o.text = v; if (v === env.general.targetFlow) o.selected = true; flowSel.appendChild(o); });
      addField(grid, 'Target Flow', flowSel);
      var langSel = buildInput('select'); langSel.setAttribute('data-bind', 'general.language');
      ['Mixed','Verilog','VHDL'].forEach(function (v) { var o = document.createElement('option'); o.value = v; o.text = v; if (v === env.general.language) o.selected = true; langSel.appendChild(o); });
      addField(grid, 'Language', langSel);
      var pageSel = buildInput('select'); pageSel.setAttribute('data-bind', 'general.pageGeneration');
      ['per-block','per-subdesign','manual'].forEach(function (v) { var o = document.createElement('option'); o.value = v; o.text = v; if (v === env.general.pageGeneration) o.selected = true; pageSel.appendChild(o); });
      addField(grid, 'Page Generation', pageSel);
      var namingSel = buildInput('select'); namingSel.setAttribute('data-bind', 'general.namingRule');
      ['snake_case','preserve','UpperCamelCase'].forEach(function (v) { var o = document.createElement('option'); o.value = v; o.text = v; if (v === env.general.namingRule) o.selected = true; namingSel.appendChild(o); });
      addField(grid, 'Naming Rule', namingSel);
      scroll.appendChild(sec);
    }

    if (sectionKey === 'libraries') {
      var sec2 = document.createElement('div'); sec2.className = 'dftenv-section';
      sec2.innerHTML = '<h4>Libraries</h4><p class="dftenv-note">Configure search paths and libraries used by import, auto-generation, and custom IP lookup.</p>';
      var grid2 = document.createElement('div'); grid2.className = 'dftenv-grid'; sec2.appendChild(grid2);
      addField(grid2, 'RTL Include Path', buildInput('text', env.libraries.rtlIncludePath)).setAttribute('data-bind', 'libraries.rtlIncludePath');
      addField(grid2, 'Custom IP Path', buildInput('text', env.libraries.customIpPath)).setAttribute('data-bind', 'libraries.customIpPath');
      addField(grid2, 'Tech Library', buildInput('text', env.libraries.techLibrary)).setAttribute('data-bind', 'libraries.techLibrary');
      var row = document.createElement('div'); row.className = 'dftenv-label'; row.textContent = 'Built-in IP';
      var checkWrap = document.createElement('label'); checkWrap.className = 'dftenv-check';
      var chk = document.createElement('input'); chk.type = 'checkbox'; chk.checked = !!env.libraries.enableBuiltinIp; chk.setAttribute('data-bind', 'libraries.enableBuiltinIp');
      checkWrap.appendChild(chk); checkWrap.appendChild(document.createTextNode('Enable built-in DFT IP library'));
      grid2.appendChild(row); grid2.appendChild(checkWrap);
      scroll.appendChild(sec2);
    }

    if (sectionKey === 'rules') {
      var sec3 = document.createElement('div'); sec3.className = 'dftenv-section';
      sec3.innerHTML = '<h4>Rules</h4><p class="dftenv-note">Drive how interfaces, pages, and code generation behave. These settings are consumed by Flow Navigator actions.</p>';
      var grid3 = document.createElement('div'); grid3.className = 'dftenv-grid'; sec3.appendChild(grid3);
      var r1 = document.createElement('label'); r1.className = 'dftenv-check';
      var r1c = document.createElement('input'); r1c.type = 'checkbox'; r1c.checked = !!env.rules.autoPairHostSlave; r1c.setAttribute('data-bind', 'rules.autoPairHostSlave');
      r1.appendChild(r1c); r1.appendChild(document.createTextNode('Auto-pair SSN Host / SSN Slave'));
      grid3.appendChild((function(){ var x=document.createElement('div'); x.className='dftenv-label'; x.textContent='Auto Pair'; return x; })()); grid3.appendChild(r1);
      var ifSel = buildInput('select'); ifSel.setAttribute('data-bind', 'rules.interfaceNaming'); ['auto','block-port','custom'].forEach(function (v) { var o = document.createElement('option'); o.value=v; o.text=v; if (v===env.rules.interfaceNaming) o.selected = true; ifSel.appendChild(o); });
      addField(grid3, 'Interface Naming', ifSel);
      var pgSel = buildInput('select'); pgSel.setAttribute('data-bind', 'rules.pageNaming'); ['inherit-block-name','prefix-design-name','manual'].forEach(function (v) { var o = document.createElement('option'); o.value=v; o.text=v; if (v===env.rules.pageNaming) o.selected = true; pgSel.appendChild(o); });
      addField(grid3, 'Page Naming', pgSel);
      var r2 = document.createElement('label'); r2.className = 'dftenv-check';
      var r2c = document.createElement('input'); r2c.type = 'checkbox'; r2c.checked = !!env.rules.overwriteExistingInterfaces; r2c.setAttribute('data-bind', 'rules.overwriteExistingInterfaces');
      r2.appendChild(r2c); r2.appendChild(document.createTextNode('Overwrite existing generated interfaces'));
      grid3.appendChild((function(){ var x=document.createElement('div'); x.className='dftenv-label'; x.textContent='Interfaces'; return x; })()); grid3.appendChild(r2);
      var r3 = document.createElement('label'); r3.className = 'dftenv-check';
      var r3c = document.createElement('input'); r3c.type = 'checkbox'; r3c.checked = !!env.rules.overwriteExistingPages; r3c.setAttribute('data-bind', 'rules.overwriteExistingPages');
      r3.appendChild(r3c); r3.appendChild(document.createTextNode('Overwrite existing generated pages'));
      grid3.appendChild((function(){ var x=document.createElement('div'); x.className='dftenv-label'; x.textContent='Pages'; return x; })()); grid3.appendChild(r3);
      scroll.appendChild(sec3);
    }

    if (sectionKey === 'floorplanDefaults') {
      var sec4 = document.createElement('div'); sec4.className = 'dftenv-section';
      sec4.innerHTML = '<h4>Floorplan Defaults</h4><p class="dftenv-note">Default dimensions and placement hints used when auto-creating blocks, interfaces, and pages.</p>';
      var grid4 = document.createElement('div'); grid4.className = 'dftenv-grid'; sec4.appendChild(grid4);
      addField(grid4, 'Default Block Width', buildInput('text', env.floorplanDefaults.defaultBlockWidth)).setAttribute('data-bind', 'floorplanDefaults.defaultBlockWidth');
      addField(grid4, 'Default Block Height', buildInput('text', env.floorplanDefaults.defaultBlockHeight)).setAttribute('data-bind', 'floorplanDefaults.defaultBlockHeight');
      var sideSel = buildInput('select'); sideSel.setAttribute('data-bind', 'floorplanDefaults.defaultInterfaceSide'); ['auto','left','right','top','bottom'].forEach(function (v) { var o = document.createElement('option'); o.value=v; o.text=v; if (v===env.floorplanDefaults.defaultInterfaceSide) o.selected = true; sideSel.appendChild(o); });
      addField(grid4, 'Default Interface Side', sideSel);
      addField(grid4, 'Min Spacing', buildInput('text', env.floorplanDefaults.minSpacing)).setAttribute('data-bind', 'floorplanDefaults.minSpacing');
      var lsSel = buildInput('select'); lsSel.setAttribute('data-bind', 'floorplanDefaults.labelStyle'); ['name-only','name+type','compact'].forEach(function (v) { var o = document.createElement('option'); o.value=v; o.text=v; if (v===env.floorplanDefaults.labelStyle) o.selected = true; lsSel.appendChild(o); });
      addField(grid4, 'Label Style', lsSel);
      scroll.appendChild(sec4);
    }

    if (sectionKey === 'output') {
      var sec5 = document.createElement('div'); sec5.className = 'dftenv-section';
      sec5.innerHTML = '<h4>Output</h4><p class="dftenv-note">These folders are used by Generate Module Pages, reports, and Generate DFTSPEC.</p>';
      var grid5 = document.createElement('div'); grid5.className = 'dftenv-grid'; sec5.appendChild(grid5);
      addField(grid5, 'DFTSPEC Dir', buildInput('text', env.output.dftspecDir)).setAttribute('data-bind', 'output.dftspecDir');
      addField(grid5, 'Pages Dir', buildInput('text', env.output.pagesDir)).setAttribute('data-bind', 'output.pagesDir');
      addField(grid5, 'Reports Dir', buildInput('text', env.output.reportsDir)).setAttribute('data-bind', 'output.reportsDir');
      var row2 = document.createElement('div'); row2.className = 'dftenv-label'; row2.textContent = 'Intermediate';
      var checkWrap2 = document.createElement('label'); checkWrap2.className = 'dftenv-check';
      var chk2 = document.createElement('input'); chk2.type = 'checkbox'; chk2.checked = !!env.output.emitIntermediateYaml; chk2.setAttribute('data-bind', 'output.emitIntermediateYaml');
      checkWrap2.appendChild(chk2); checkWrap2.appendChild(document.createTextNode('Emit intermediate YAML / JSON artifacts'));
      grid5.appendChild(row2); grid5.appendChild(checkWrap2);
      var help = document.createElement('div'); help.className = 'dftenv-help';
      help.textContent = 'Tip: keep output folders inside the project root so generated pages and dftspec artifacts remain portable.';
      sec5.appendChild(help);
      scroll.appendChild(sec5);
    }
  }

  function harvest(dialog, env) {
    var nodes = dialog.querySelectorAll('[data-bind]');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var path = String(node.getAttribute('data-bind') || '').split('.');
      if (path.length !== 2) continue;
      var sec = path[0], key = path[1];
      if (!env[sec]) env[sec] = {};
      var value;
      if (node.type === 'checkbox') value = !!node.checked;
      else value = node.value;
      if (/^(defaultBlockWidth|defaultBlockHeight|minSpacing)$/.test(key)) {
        var num = Number(value);
        value = isNaN(num) ? value : num;
      }
      env[sec][key] = value;
    }
    return env;
  }

  function logToDock(ui, text, level) {
    level = level || 'info';
    try {
      if (ui && typeof ui.logDockOutput === 'function') ui.logDockOutput(text, level);
      if (ui && typeof ui.pushDockMessage === 'function' && (level === 'warning' || level === 'error' || level === 'success')) {
        ui.pushDockMessage({ level: level, text: text, source: 'env' });
      }
    } catch (e) {}
  }

  NS.open = function (ui, opts) {
    injectStyle();
    opts = opts || {};
    var design = opts.design || getCurrentDesign(ui);
    if (!design) {
      logToDock(ui, 'Environment editor requires an active design.', 'warning');
      return null;
    }

    var env = mergeEnv(defaultsForDesign(design), design.env || readEnvFromDisk(ui, design) || null);
    var overlay = document.createElement('div');
    overlay.className = 'dftenv-overlay';
    var dialog = document.createElement('div');
    dialog.className = 'dftenv-dialog';
    overlay.appendChild(dialog);

    var head = document.createElement('div');
    head.className = 'dftenv-head';
    head.innerHTML = '<div>Environment <span class="sub">' + (design.name || 'design') + '</span></div>';
    var closeBtn = document.createElement('button'); closeBtn.className = 'dftenv-btn'; closeBtn.textContent = 'Close';
    head.appendChild(closeBtn);
    dialog.appendChild(head);

    var body = document.createElement('div'); body.className = 'dftenv-body'; dialog.appendChild(body);
    var tabs = document.createElement('div'); tabs.className = 'dftenv-tabs'; body.appendChild(tabs);
    var main = document.createElement('div'); main.className = 'dftenv-main'; body.appendChild(main);

    var footer = document.createElement('div'); footer.className = 'dftenv-foot';
    var status = document.createElement('div'); status.className = 'dftenv-status'; status.textContent = resolveEnvPath(ui, design) || 'In-memory env';
    var actions = document.createElement('div'); actions.className = 'dftenv-actions';
    var saveMem = document.createElement('button'); saveMem.className = 'dftenv-btn'; saveMem.textContent = 'Apply';
    var saveDisk = document.createElement('button'); saveDisk.className = 'dftenv-btn primary'; saveDisk.textContent = 'Save to env.json';
    actions.appendChild(saveMem); actions.appendChild(saveDisk);
    footer.appendChild(status); footer.appendChild(actions); dialog.appendChild(footer);

    var sections = [
      ['general', 'General'],
      ['libraries', 'Libraries'],
      ['rules', 'Rules'],
      ['floorplanDefaults', 'Floorplan Defaults'],
      ['output', 'Output']
    ];

    var active = (opts.section && String(opts.section)) || 'general';
    function renderTabs() {
      tabs.innerHTML = '';
      for (var i = 0; i < sections.length; i++) {
        (function (key, label) {
          var t = document.createElement('div');
          t.className = 'dftenv-tab' + (key === active ? ' active' : '');
          t.textContent = label;
          t.onclick = function () {
            harvest(dialog, env);
            active = key;
            renderTabs();
            renderSectionHost(main, env, active);
          };
          tabs.appendChild(t);
        })(sections[i][0], sections[i][1]);
      }
    }

    function applyOnly() {
      harvest(dialog, env);
      design.env = shallowClone(env);
      if (ui && typeof ui.refreshProjectExplorer === 'function') ui.refreshProjectExplorer();
      logToDock(ui, 'Environment updated for design ' + (design.name || 'design') + '.', 'success');
      status.textContent = 'Applied to model · ' + (resolveEnvPath(ui, design) || 'in-memory');
    }

    function saveToDiskNow() {
      applyOnly();
      var res = writeEnvToDisk(ui, design, env);
      if (res.ok) {
        design.env_file = design.env_file || ((design._dirRel || design.name || '') + '/env.json');
        status.textContent = 'Saved · ' + res.path;
        logToDock(ui, 'Saved env.json for design ' + (design.name || 'design') + '.', 'success');
      } else {
        status.textContent = 'Save failed · ' + res.reason;
        logToDock(ui, 'Failed to save env.json: ' + res.reason, 'warning');
      }
    }

    renderTabs();
    renderSectionHost(main, env, active);

    function close() {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    closeBtn.onclick = close;
    overlay.addEventListener('mousedown', function (evt) { if (evt.target === overlay) close(); });
    saveMem.onclick = applyOnly;
    saveDisk.onclick = saveToDiskNow;

    document.body.appendChild(overlay);
    return {
      overlay: overlay,
      dialog: dialog,
      close: close,
      apply: applyOnly,
      saveToDisk: saveToDiskNow,
      env: env,
      design: design
    };
  };

  NS.getCurrentDesign = getCurrentDesign;
  NS.resolveEnvPath = resolveEnvPath;
  NS.readEnvFromDisk = readEnvFromDisk;
  NS.writeEnvToDisk = writeEnvToDisk;
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : (typeof self !== "undefined" ? self : this)));
