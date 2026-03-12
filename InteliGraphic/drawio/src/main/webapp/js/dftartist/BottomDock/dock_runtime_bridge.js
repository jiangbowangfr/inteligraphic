(function (global) {
  'use strict';

  var MODULE_KEY = '__DFTDockRuntimeBridge__';
  if (global[MODULE_KEY]) return;
  global[MODULE_KEY] = true;

  function pad2(n) {
    n = Number(n) || 0;
    return n < 10 ? '0' + n : '' + n;
  }

  function timeStamp() {
    var d = new Date();
    return '[' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + ']';
  }

  function clamp(v, min, max) {
    v = Number(v);
    if (!isFinite(v)) v = min;
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ensureArray(v) {
    return Array.isArray(v) ? v : (v == null ? [] : [v]);
  }

  function normalizeLevel(level) {
    var x = String(level || 'info').toLowerCase();
    if (x === 'err') x = 'error';
    if (x === 'warn') x = 'warning';
    if (x !== 'info' && x !== 'warning' && x !== 'error' && x !== 'debug' && x !== 'success') x = 'info';
    return x;
  }

  function levelPass(itemLevel, activeFilter) {
    if (!activeFilter || activeFilter === 'all') return true;
    return normalizeLevel(itemLevel) === activeFilter;
  }

  function createDiv(className, text) {
    var el = document.createElement('div');
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function setActiveTab(tabBar, panelHost, activeKey) {
    var tabs = tabBar.querySelectorAll('.phase1-tab');
    var panels = panelHost.querySelectorAll('.phase1-dock-panel');
    var i;
    for (i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('data-key') === activeKey) tabs[i].classList.add('active');
      else tabs[i].classList.remove('active');
    }
    for (i = 0; i < panels.length; i++) {
      if (panels[i].getAttribute('data-key') === activeKey) panels[i].classList.add('active');
      else panels[i].classList.remove('active');
    }
  }

  function injectStyles() {
    if (document.getElementById('dft-dock-runtime-styles')) return;
    var style = document.createElement('style');
    style.id = 'dft-dock-runtime-styles';
    style.textContent = [
      '.dft-dock-wrap{display:flex;flex-direction:column;height:100%;min-height:0;}',
      '.dft-dock-toolbar-note{font-size:12px;color:#6b7280;margin-left:8px;}',
      '.dft-dock-title-count{font-size:11px;color:#6b7280;margin-left:8px;}',
      '.dft-dock-panel-inner{display:flex;flex-direction:column;height:100%;min-height:0;}',
      '.dft-dock-scroll{flex:1 1 auto;min-height:0;overflow:auto;padding:10px 12px;}',
      '.dft-dock-line{white-space:pre-wrap;font-size:12px;line-height:1.6;}',
      '.dft-dock-line.error{color:#b91c1c;}',
      '.dft-dock-line.warning{color:#b45309;}',
      '.dft-dock-line.success{color:#047857;}',
      '.dft-dock-line.debug{color:#4b5563;}',
      '.dft-terminal-inputbar{display:flex;align-items:center;gap:8px;padding:8px 12px;border-top:1px solid #e5e7eb;background:#fafafa;}',
      '.dft-terminal-prompt{font-family:Menlo,Consolas,monospace;font-size:12px;color:#111827;}',
      '.dft-terminal-input{flex:1 1 auto;min-width:0;border:1px solid #d1d5db;border-radius:6px;padding:6px 8px;font:12px Menlo,Consolas,monospace;outline:none;}',
      '.dft-terminal-input:focus{border-color:#d89000;box-shadow:0 0 0 2px rgba(216,144,0,0.12);}',
      '.dft-run-btn{border:1px solid #d1d5db;background:#fff;border-radius:6px;padding:6px 10px;font-size:12px;cursor:pointer;}',
      '.dft-run-btn:hover{background:#f9fafb;}',
      '.dft-badge{display:inline-flex;align-items:center;justify-content:center;min-width:54px;padding:2px 6px;border-radius:999px;font-size:11px;font-weight:600;}',
      '.dft-badge.info{background:#eef2ff;color:#3730a3;}',
      '.dft-badge.warning{background:#fff7ed;color:#9a3412;}',
      '.dft-badge.error{background:#fef2f2;color:#b91c1c;}',
      '.dft-badge.success{background:#ecfdf5;color:#047857;}',
      '.dft-msg-item{display:flex;gap:10px;padding:10px 12px;border-bottom:1px solid #f3f4f6;cursor:default;}',
      '.dft-msg-main{flex:1 1 auto;min-width:0;}',
      '.dft-msg-text{font-size:12px;line-height:1.5;color:#111827;}',
      '.dft-msg-meta{font-size:11px;color:#6b7280;margin-top:4px;}',
      '.dft-msg-item.clickable{cursor:pointer;}',
      '.dft-msg-item.clickable:hover{background:#fffaf0;}',
      '.dft-report-section{padding:10px 12px;border-bottom:1px solid #f3f4f6;}',
      '.dft-report-title{font-size:12px;font-weight:700;color:#111827;margin-bottom:8px;}',
      '.dft-report-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;}',
      '.dft-report-card{border:1px solid #ececec;border-radius:8px;padding:8px 10px;background:#fff;}',
      '.dft-report-key{font-size:11px;color:#6b7280;}',
      '.dft-report-val{font-size:13px;color:#111827;margin-top:3px;}',
      '.dft-job-item{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #f3f4f6;}',
      '.dft-job-name{font-size:12px;color:#111827;font-weight:600;}',
      '.dft-job-meta{font-size:11px;color:#6b7280;margin-top:2px;}',
      '.dft-empty{padding:12px;color:#6b7280;font-size:12px;}',
      '.dft-filter-select{border:1px solid #d1d5db;border-radius:6px;padding:5px 6px;font-size:12px;background:#fff;}',
      '.dft-copy-area{position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;}'
    ].join('');
    document.head.appendChild(style);
  }

  var state = {
    activeTab: 'terminal',
    filter: 'all',
    autoScroll: true,
    terminalLines: [],
    outputLines: [],
    messages: [],
    reports: [],
    jobs: [],
    executor: null,
    ui: null,
    dom: null,
    history: [],
    historyIndex: -1,
    maxLines: 1200,
    maxMessages: 500
  };

  function trimBuffers() {
    if (state.terminalLines.length > state.maxLines) {
      state.terminalLines.splice(0, state.terminalLines.length - state.maxLines);
    }
    if (state.outputLines.length > state.maxLines) {
      state.outputLines.splice(0, state.outputLines.length - state.maxLines);
    }
    if (state.messages.length > state.maxMessages) {
      state.messages.splice(0, state.messages.length - state.maxMessages);
    }
    if (state.history.length > 200) {
      state.history.splice(0, state.history.length - 200);
    }
  }

  function appendLine(bucket, text, level, meta) {
    var item = {
      time: timeStamp(),
      text: String(text == null ? '' : text),
      level: normalizeLevel(level),
      meta: meta || null
    };
    bucket.push(item);
    trimBuffers();
    renderActivePanel();
  }

  function addMessage(entry) {
    if (typeof entry === 'string') entry = { text: entry };
    entry = entry || {};
    state.messages.push({
      id: 'm_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
      time: timeStamp(),
      text: String(entry.text || ''),
      level: normalizeLevel(entry.level),
      source: entry.source || '',
      location: entry.location || '',
      data: entry.data || null,
      onOpen: typeof entry.onOpen === 'function' ? entry.onOpen : null
    });
    trimBuffers();
    renderBadges();
    if (entry.switchTo !== false && (entry.level === 'error' || entry.level === 'warning')) {
      state.activeTab = 'messages';
      syncTabUI();
    }
    renderActivePanel();
  }

  function setReports(sections) {
    if (sections && !Array.isArray(sections)) {
      if (sections.sections && Array.isArray(sections.sections)) sections = sections.sections;
      else {
        var arr = [];
        Object.keys(sections).forEach(function (key) {
          if (key === 'sections') return;
          arr.push({ title: key, items: sections[key] });
        });
        sections = arr;
      }
    }
    state.reports = ensureArray(sections).map(function (sec) {
      sec = sec || {};
      return {
        title: String(sec.title || 'Report'),
        items: sec.items || sec.metrics || []
      };
    });
    renderActivePanel();
  }

  function setJobs(jobs) {
    state.jobs = ensureArray(jobs).map(function (job) {
      job = job || {};
      return {
        name: String(job.name || job.id || 'job'),
        status: normalizeLevel(job.status === 'running' ? 'info' : (job.status || 'info')),
        rawStatus: String(job.status || 'unknown'),
        detail: String(job.detail || job.stage || ''),
        progress: job.progress == null ? null : job.progress
      };
    });
    renderActivePanel();
  }

  function renderBadges() {
    if (!state.dom || !state.dom.tabs) return;
    var counts = {
      terminal: state.terminalLines.length,
      output: state.outputLines.length,
      messages: state.messages.length,
      reports: state.reports.length,
      jobs: state.jobs.length
    };
    Array.prototype.forEach.call(state.dom.tabs.querySelectorAll('.phase1-tab'), function (tab) {
      var key = tab.getAttribute('data-key');
      var bubble = tab.querySelector('.dft-dock-title-count');
      if (!bubble) {
        bubble = document.createElement('span');
        bubble.className = 'dft-dock-title-count';
        tab.appendChild(bubble);
      }
      bubble.textContent = counts[key] ? '(' + counts[key] + ')' : '';
    });
  }

  function toPlainTextLines(items) {
    return items.map(function (it) {
      return it.time + ' ' + String(it.level || 'info').toUpperCase() + '  ' + it.text;
    }).join('\n');
  }

  function copyText(text) {
    text = String(text || '');
    if (!text) return;
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)['catch'](function () {});
      return;
    }
    var ta = document.createElement('textarea');
    ta.className = 'dft-copy-area';
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  function panelText(key) {
    if (key === 'terminal') return toPlainTextLines(state.terminalLines);
    if (key === 'output') return toPlainTextLines(state.outputLines);
    if (key === 'messages') {
      return state.messages.map(function (m) {
        return m.time + ' ' + m.level.toUpperCase() + '  ' + m.text + (m.location ? ' @ ' + m.location : '');
      }).join('\n');
    }
    if (key === 'reports') return JSON.stringify(state.reports, null, 2);
    if (key === 'jobs') return JSON.stringify(state.jobs, null, 2);
    return '';
  }

  function clearActive() {
    if (state.activeTab === 'terminal') state.terminalLines = [];
    else if (state.activeTab === 'output') state.outputLines = [];
    else if (state.activeTab === 'messages') state.messages = [];
    else if (state.activeTab === 'reports') state.reports = [];
    else if (state.activeTab === 'jobs') state.jobs = [];
    renderBadges();
    renderActivePanel();
  }

  function filteredOutput(items) {
    return items.filter(function (it) { return levelPass(it.level, state.filter); });
  }

  function scrollToBottom(el) {
    if (!state.autoScroll || !el) return;
    el.scrollTop = el.scrollHeight;
  }

  function renderTerminal() {
    var wrap = state.dom.panels.terminal;
    wrap.innerHTML = '';
    var inner = createDiv('dft-dock-panel-inner');
    var scroll = createDiv('dft-dock-scroll phase1-dock-output phase1-mono');
    var lines = filteredOutput(state.terminalLines);
    if (!lines.length) {
      scroll.appendChild(createDiv('dft-empty', ''));
    } else {
      lines.forEach(function (item) {
        var line = createDiv('dft-dock-line ' + item.level);
        line.textContent = item.time + ' ' + item.text;
        scroll.appendChild(line);
      });
    }
    inner.appendChild(scroll);

    var inputBar = createDiv('dft-terminal-inputbar');
    var prompt = createDiv('dft-terminal-prompt', 'tcl>');
    var input = document.createElement('input');
    input.className = 'dft-terminal-input';
    input.type = 'text';
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.placeholder = '';

    var runBtn = document.createElement('button');
    runBtn.className = 'dft-run-btn';
    runBtn.type = 'button';
    runBtn.textContent = 'Run';

    inputBar.appendChild(prompt);
    inputBar.appendChild(input);
    inputBar.appendChild(runBtn);
    inner.appendChild(inputBar);
    wrap.appendChild(inner);

    function submit() {
      var cmd = input.value;
      input.value = '';
      executeCommand(cmd);
    }

    runBtn.onmousedown = function (evt) {
      if (evt) evt.preventDefault();
      submit();
    };

    input.onkeydown = function (evt) {
      evt = evt || window.event;
      if (evt.key === 'Enter') {
        if (evt.preventDefault) evt.preventDefault();
        submit();
      } else if (evt.key === 'ArrowUp') {
        if (evt.preventDefault) evt.preventDefault();
        if (!state.history.length) return;
        if (state.historyIndex < 0) state.historyIndex = state.history.length - 1;
        else state.historyIndex = Math.max(0, state.historyIndex - 1);
        input.value = state.history[state.historyIndex] || '';
      } else if (evt.key === 'ArrowDown') {
        if (evt.preventDefault) evt.preventDefault();
        if (!state.history.length) return;
        if (state.historyIndex < 0) {
          input.value = '';
          return;
        }
        state.historyIndex = Math.min(state.history.length, state.historyIndex + 1);
        input.value = state.historyIndex >= state.history.length ? '' : (state.history[state.historyIndex] || '');
      }
    };

    state.dom.terminalInput = input;
    scrollToBottom(scroll);
  }

  function renderOutput() {
    var wrap = state.dom.panels.output;
    wrap.innerHTML = '';
    var inner = createDiv('dft-dock-panel-inner');
    var scroll = createDiv('dft-dock-scroll phase1-dock-output phase1-mono');
    var lines = filteredOutput(state.outputLines);
    if (!lines.length) {
      scroll.appendChild(createDiv('dft-empty', ''));
    } else {
      lines.forEach(function (item) {
        var line = createDiv('dft-dock-line ' + item.level);
        var prefix = item.time + ' ' + item.level.toUpperCase() + '  ';
        line.textContent = prefix + item.text;
        scroll.appendChild(line);
      });
    }
    inner.appendChild(scroll);
    wrap.appendChild(inner);
    scrollToBottom(scroll);
  }

  function renderMessages() {
    var wrap = state.dom.panels.messages;
    wrap.innerHTML = '';
    var inner = createDiv('dft-dock-panel-inner');
    var scroll = createDiv('dft-dock-scroll');
    var items = state.messages.filter(function (m) { return levelPass(m.level, state.filter); });
    if (!items.length) {
      scroll.appendChild(createDiv('dft-empty', ''));
    } else {
      items.forEach(function (m) {
        var row = createDiv('dft-msg-item' + (m.onOpen ? ' clickable' : ''));
        var badge = createDiv('dft-badge ' + m.level, m.level.toUpperCase());
        var main = createDiv('dft-msg-main');
        var text = createDiv('dft-msg-text', m.text);
        var meta = createDiv('dft-msg-meta', [m.time, m.source, m.location].filter(Boolean).join(' · '));
        main.appendChild(text);
        if (meta.textContent) main.appendChild(meta);
        row.appendChild(badge);
        row.appendChild(main);
        if (m.onOpen) {
          row.onmousedown = function (evt) {
            if (evt) evt.preventDefault();
            try { m.onOpen(m); } catch (e) {}
          };
        }
        scroll.appendChild(row);
      });
    }
    inner.appendChild(scroll);
    wrap.appendChild(inner);
  }

  function normalizeReportItems(items) {
    if (!Array.isArray(items)) {
      if (items && typeof items === 'object') {
        return Object.keys(items).map(function (key) { return { key: key, value: items[key] }; });
      }
      return [];
    }
    return items.map(function (it) {
      if (it && typeof it === 'object' && !Array.isArray(it)) {
        return { key: String(it.key || it.name || 'item'), value: it.value == null ? '' : it.value };
      }
      return { key: 'item', value: it };
    });
  }

  function renderReports() {
    var wrap = state.dom.panels.reports;
    wrap.innerHTML = '';
    var inner = createDiv('dft-dock-panel-inner');
    var scroll = createDiv('dft-dock-scroll');
    if (!state.reports.length) {
      scroll.appendChild(createDiv('dft-empty', ''));
    } else {
      state.reports.forEach(function (sec) {
        var section = createDiv('dft-report-section');
        section.appendChild(createDiv('dft-report-title', sec.title));
        var grid = createDiv('dft-report-grid');
        normalizeReportItems(sec.items).forEach(function (it) {
          var card = createDiv('dft-report-card');
          card.appendChild(createDiv('dft-report-key', String(it.key)));
          card.appendChild(createDiv('dft-report-val', String(it.value)));
          grid.appendChild(card);
        });
        section.appendChild(grid);
        scroll.appendChild(section);
      });
    }
    inner.appendChild(scroll);
    wrap.appendChild(inner);
  }

  function renderJobs() {
    var wrap = state.dom.panels.jobs;
    wrap.innerHTML = '';
    var inner = createDiv('dft-dock-panel-inner');
    var scroll = createDiv('dft-dock-scroll');
    if (!state.jobs.length) {
      scroll.appendChild(createDiv('dft-empty', ''));
    } else {
      state.jobs.forEach(function (job) {
        var row = createDiv('dft-job-item');
        var left = createDiv();
        left.appendChild(createDiv('dft-job-name', job.name));
        var meta = [];
        if (job.detail) meta.push(job.detail);
        if (job.progress != null) meta.push(String(job.progress) + '%');
        left.appendChild(createDiv('dft-job-meta', meta.join(' · ')));
        row.appendChild(left);
        row.appendChild(createDiv('dft-badge ' + job.status, String(job.rawStatus || job.status).toUpperCase()));
        scroll.appendChild(row);
      });
    }
    inner.appendChild(scroll);
    wrap.appendChild(inner);
  }

  function renderActivePanel() {
    if (!state.dom || !state.dom.panels) return;
    renderBadges();
    if (state.activeTab === 'terminal') renderTerminal();
    else if (state.activeTab === 'output') renderOutput();
    else if (state.activeTab === 'messages') renderMessages();
    else if (state.activeTab === 'reports') renderReports();
    else if (state.activeTab === 'jobs') renderJobs();
  }

  function syncTabUI() {
    if (!state.dom) return;
    setActiveTab(state.dom.tabs, state.dom.body, state.activeTab);
    renderActivePanel();
  }

  function defaultExecutor(cmd) {
    var lower = String(cmd || '').trim().toLowerCase();
    if (!lower) return { stdout: '' };
    if (lower === 'help') {
      return {
        stdout: [
          'Available commands:',
          '  help',
          '  clear',
          '  run_floorplan_check',
          '  run_drc_check'
        ].join('\n')
      };
    }
    if (lower === 'clear') {
      state.terminalLines = [];
      state.outputLines = [];
      state.messages = [];
      state.reports = [];
      state.jobs = [];
      renderBadges();
      renderActivePanel();
      return { stdout: 'Dock buffers cleared.' };
    }
    if (lower === 'run_floorplan_check') {
      return {
        stdout: 'Running floorplan check...',
        output: [
          { text: 'Floorplan check started', level: 'info' },
          { text: 'Macro overlap check: 0 violations', level: 'success' },
          { text: 'Keep-out violation at MACRO_U12', level: 'warning' }
        ],
        messages: [
          { level: 'warning', text: 'Keep-out violation at MACRO_U12', source: 'floorplan', location: 'MACRO_U12' }
        ],
        reports: [
          { title: 'Floorplan Check', items: { overlap: 0, keepout: 1, offgrid: 0 } }
        ],
        jobs: [
          { name: 'floorplan_check_1', status: 'success', detail: 'completed', progress: 100 }
        ]
      };
    }
    if (lower === 'run_drc_check') {
      return {
        stdout: 'Running DRC check...',
        output: [
          { text: 'DRC started', level: 'info' },
          { text: 'Short violation at net scan_clk', level: 'error' }
        ],
        messages: [
          { level: 'error', text: 'Short violation at net scan_clk', source: 'drc', location: 'scan_clk' }
        ],
        reports: [
          { title: 'DRC Summary', items: { errors: 1, warnings: 0 } }
        ]
      };
    }
    return { stdout: 'No Tcl backend connected. Command received: ' + cmd };
  }

  function applyExecutorResult(result) {
    if (result == null) return;
    if (typeof result === 'string') {
      appendLine(state.terminalLines, result, 'info');
      return;
    }
    if (Array.isArray(result)) {
      result.forEach(function (line) { appendLine(state.terminalLines, line, 'info'); });
      return;
    }
    if (result.stdout) {
      String(result.stdout).split(/\r?\n/).forEach(function (line) {
        if (line) appendLine(state.terminalLines, line, 'info');
      });
    }
    if (result.stderr) {
      String(result.stderr).split(/\r?\n/).forEach(function (line) {
        if (line) appendLine(state.terminalLines, line, 'error');
      });
      state.activeTab = 'terminal';
      syncTabUI();
    }
    ensureArray(result.output).forEach(function (item) {
      if (item == null) return;
      if (typeof item === 'string') appendLine(state.outputLines, item, 'info');
      else appendLine(state.outputLines, item.text || '', item.level || 'info', item.meta);
    });
    ensureArray(result.messages).forEach(function (msg) { addMessage(msg); });
    if (result.reports) setReports(result.reports);
    if (result.jobs) setJobs(result.jobs);
  }

  function getExecutor(ui) {
    if (typeof state.executor === 'function') return state.executor;
    if (ui && typeof ui.runTclConsoleCommand === 'function' && ui.runTclConsoleCommand !== api.runTcl) return ui.runTclConsoleCommand;
    if (ui && typeof ui.runTclCommand === 'function') return ui.runTclCommand;
    return defaultExecutor;
  }

  function executeCommand(cmd) {
    cmd = String(cmd == null ? '' : cmd).trim();
    if (!cmd) return;
    state.history.push(cmd);
    state.historyIndex = state.history.length;
    appendLine(state.terminalLines, 'tcl> ' + cmd, 'debug');

    var ui = state.ui;
    var executor = getExecutor(ui);
    try {
      var result = executor(cmd, ui, api);
      if (result && typeof result.then === 'function') {
        result.then(function (res) {
          applyExecutorResult(res);
        }, function (err) {
          appendLine(state.terminalLines, String((err && err.message) || err || 'Command failed'), 'error');
        });
      } else {
        applyExecutorResult(result);
      }
    } catch (e) {
      appendLine(state.terminalLines, String((e && e.message) || e || 'Command failed'), 'error');
    }
  }


  function createElectronTclExecutor() {
    if (!global.tclBridge || typeof global.tclBridge.exec !== 'function') return null;
    return async function (cmd) {
      var text = String(cmd == null ? '' : cmd).trim();
      var lower = text.toLowerCase();
      if (!text) return { stdout: '' };

      if (lower === 'help') {
        return {
          stdout: [
            'Available commands:',
            '  help',
            '  clear',
            '  tcl:reset',
            '  tcl:stop',
            '  <any valid Tcl command>'
          ].join('\n')
        };
      }

      if (lower === 'clear') {
        state.terminalLines = [];
        state.outputLines = [];
        state.messages = [];
        state.reports = [];
        state.jobs = [];
        renderBadges();
        renderActivePanel();
        return { stdout: 'Dock buffers cleared.' };
      }

      if (lower === 'tcl:reset' && typeof global.tclBridge.reset === 'function') {
        await global.tclBridge.reset();
        return { stdout: 'Tcl session reset.' };
      }

      if (lower === 'tcl:stop' && typeof global.tclBridge.stop === 'function') {
        await global.tclBridge.stop();
        return { stdout: 'Tcl session stopped.' };
      }

      return global.tclBridge.exec(text, 30000);
    };
  }

  function maybeInstallElectronTclExecutor() {
    if (typeof state.executor === 'function') return;
    var executor = createElectronTclExecutor();
    if (executor) state.executor = executor;
  }

  function build(ui) {
    if (!ui || !ui._phase1 || !ui._phase1.dockShell) return false;
    injectStyles();

    var host = ui._phase1.dockShell;
    host.innerHTML = '';

    var wrap = createDiv('dft-dock-wrap');

    // var titlebar = createDiv('phase1-titlebar');
    // titlebar.appendChild(createDiv('', 'Bottom Dock'));
    // var right = createDiv();
    // var note = createDiv('dft-dock-toolbar-note', 'Terminal / Output / Messages / Reports / Jobs');
    // right.appendChild(note);
    // titlebar.appendChild(right);
    // wrap.appendChild(titlebar);

    var tabs = createDiv('phase1-tabbar');
    [
      ['Terminal', 'terminal'],
      ['Output', 'output'],
      ['Messages', 'messages'],
      ['Reports', 'reports'],
      ['Jobs', 'jobs']
    ].forEach(function (pair) {
      var tab = createDiv('phase1-tab', pair[0]);
      tab.setAttribute('data-key', pair[1]);
      tabs.appendChild(tab);
    });
    wrap.appendChild(tabs);

    var tools = createDiv('phase1-toolbar-row');

    function makeButton(label, title) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'phase1-tool-btn';
      btn.textContent = label;
      if (title) btn.title = title;
      return btn;
    }

    var clearBtn = makeButton('Clear', '清空当前面板');
    var copyBtn = makeButton('Copy', '复制当前面板内容');
    var filterSelect = document.createElement('select');
    filterSelect.className = 'dft-filter-select';
    [
      ['all', 'Filter: All'],
      ['info', 'Info'],
      ['warning', 'Warning'],
      ['error', 'Error'],
      ['success', 'Success'],
      ['debug', 'Debug']
    ].forEach(function (opt) {
      var o = document.createElement('option');
      o.value = opt[0];
      o.textContent = opt[1];
      filterSelect.appendChild(o);
    });
    filterSelect.value = state.filter;

    var autoBtn = makeButton('Auto Scroll✓', '自动滚动');
    var spacer = createDiv('phase1-tool-spacer');
    var collapseBtn = makeButton('×', '折叠 / 展开 Dock');

    tools.appendChild(clearBtn);
    tools.appendChild(copyBtn);
    tools.appendChild(filterSelect);
    tools.appendChild(autoBtn);
    tools.appendChild(spacer);
    tools.appendChild(collapseBtn);
    wrap.appendChild(tools);

    var body = createDiv('phase1-panel-body');
    var panels = {};
    ['terminal', 'output', 'messages', 'reports', 'jobs'].forEach(function (key) {
      var panel = createDiv('phase1-dock-panel');
      panel.setAttribute('data-key', key);
      body.appendChild(panel);
      panels[key] = panel;
    });
    wrap.appendChild(body);
    host.appendChild(wrap);

    state.ui = ui;
    state.dom = {
      host: host,
      wrap: wrap,
      tabs: tabs,
      body: body,
      panels: panels,
      filterSelect: filterSelect,
      autoBtn: autoBtn,
      clearBtn: clearBtn,
      copyBtn: copyBtn,
      collapseBtn: collapseBtn
    };

    maybeInstallElectronTclExecutor();

    tabs.onmousedown = function (evt) {
      var target = evt.target;
      while (target && target !== tabs && !target.getAttribute('data-key')) target = target.parentNode;
      if (!target || target === tabs) return;
      if (evt && evt.preventDefault) evt.preventDefault();
      state.activeTab = target.getAttribute('data-key') || 'terminal';
      if (ui._phase1 && ui._phase1.state) ui._phase1.state.dockTab = state.activeTab;
      syncTabUI();
    };

    clearBtn.onmousedown = function (evt) {
      if (evt && evt.preventDefault) evt.preventDefault();
      clearActive();
    };

    copyBtn.onmousedown = function (evt) {
      if (evt && evt.preventDefault) evt.preventDefault();
      copyText(panelText(state.activeTab));
    };

    filterSelect.onchange = function () {
      state.filter = filterSelect.value || 'all';
      renderActivePanel();
    };

    autoBtn.onmousedown = function (evt) {
      if (evt && evt.preventDefault) evt.preventDefault();
      state.autoScroll = !state.autoScroll;
      autoBtn.textContent = state.autoScroll ? 'Auto Scroll✓' : 'Auto Scroll';
      renderActivePanel();
    };

    collapseBtn.onmousedown = function (evt) {
      if (evt && evt.preventDefault) evt.preventDefault();
      if (global.DFTPanelRuntime && typeof global.DFTPanelRuntime.toggle === 'function') {
        global.DFTPanelRuntime.toggle(ui, 'dock');
      } else if (ui._phase1 && ui._phase1.state) {
        var st = ui._phase1.state;
        if (st.dockHeight > 0) {
          st._lastDockHeight = st.dockHeight;
          st.dockHeight = 0;
        } else {
          st.dockHeight = st._lastDockHeight || 220;
        }
      }
      if (typeof ui.refresh === 'function') ui.refresh(true);
    };

    // Bridge methods on ui for other flows (floorplan / checks / scripts)
    ui._dockRuntime = api;
    ui.refreshBottomDockRuntime = function () { api.refresh(); };
    ui.logDockOutput = function (text, level, meta) { api.output(text, level, meta); };
    ui.pushDockMessage = function (entry) { api.message(entry); };
    ui.setDockReports = function (sections) { api.setReports(sections); };
    ui.setDockJobs = function (jobs) { api.setJobs(jobs); };
    ui.runTclConsoleCommand = api.runTcl;
    ui.focusDockTab = function (key) { api.focusTab(key); };

    if (ui._phase1 && ui._phase1.state && ui._phase1.state.dockTab) {
      state.activeTab = ui._phase1.state.dockTab;
    }
    syncTabUI();
    renderBadges();
    return true;
  }

  var api = {
    attach: function (ui) {
      return build(ui || state.ui);
    },
    refresh: function () {
      renderBadges();
      renderActivePanel();
    },
    setExecutor: function (fn) {
      state.executor = typeof fn === 'function' ? fn : null;
    },
    runTcl: function (cmd) {
      executeCommand(cmd);
    },
    terminal: function (text, level, meta) {
      appendLine(state.terminalLines, text, level, meta);
    },
    output: function (text, level, meta) {
      appendLine(state.outputLines, text, level, meta);
      if (normalizeLevel(level) === 'error') {
        state.activeTab = 'output';
        syncTabUI();
      }
    },
    message: function (entry) {
      addMessage(entry);
    },
    report: function (title, items) {
      state.reports.push({ title: String(title || 'Report'), items: items || [] });
      renderBadges();
      renderActivePanel();
    },
    setReports: function (sections) {
      setReports(sections);
      renderBadges();
      renderActivePanel();
    },
    setJobs: function (jobs) {
      setJobs(jobs);
      renderBadges();
      renderActivePanel();
    },
    focusTab: function (key) {
      state.activeTab = String(key || 'terminal');
      if (state.ui && state.ui._phase1 && state.ui._phase1.state) {
        state.ui._phase1.state.dockTab = state.activeTab;
      }
      syncTabUI();
    },
    clear: function (key) {
      if (!key) { clearActive(); return; }
      var prev = state.activeTab;
      state.activeTab = key;
      clearActive();
      state.activeTab = prev;
      syncTabUI();
    },
    addCheckResult: function (checkName, summary) {
      summary = summary || {};
      api.output(checkName + ' started', 'info');
      var errors = Number(summary.errors || 0);
      var warnings = Number(summary.warnings || 0);
      var violations = Number(summary.violations || 0);
      if (violations || errors) {
        api.output(checkName + ' found issues: ' + (violations || errors) + ' issue(s)', errors ? 'error' : 'warning');
      } else {
        api.output(checkName + ' completed without blocking issues', 'success');
      }
      api.report(checkName, {
        errors: errors,
        warnings: warnings,
        violations: violations,
        status: summary.status || ((errors || violations) ? 'issue' : 'ok')
      });
      if (errors || warnings || violations) {
        api.message({
          level: errors ? 'error' : 'warning',
          text: checkName + ' reported ' + [
            errors ? errors + ' error(s)' : '',
            warnings ? warnings + ' warning(s)' : '',
            violations ? violations + ' violation(s)' : ''
          ].filter(Boolean).join(', '),
          source: checkName
        });
      }
    }
  };

  global.DFTDockRuntime = api;

  function tryAutoAttach() {
    var ui = (global.App && (global.App.editorUi || global.App.ui)) || null;
    if (!ui || !ui._phase1 || !ui._phase1.dockShell) return false;
    api.attach(ui);
    return true;
  }

  if (!tryAutoAttach()) {
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      if (tryAutoAttach() || tries > 200) clearInterval(timer);
    }, 100);
  }
})(window);
