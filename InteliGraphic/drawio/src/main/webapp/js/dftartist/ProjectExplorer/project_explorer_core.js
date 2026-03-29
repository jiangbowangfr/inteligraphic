(function (global) {
  'use strict';

  var NS = global.DFTProjectExplorerPhase2 = global.DFTProjectExplorerPhase2 || {};
  var DESIGN_META_FILE = '.dftdesign.json';
  var STYLE_ID = 'dft-phase2-project-explorer-style';

  function ensureCss() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '.phase2-project-host{display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;background:#fff;}' +
      '.geDarkMode .phase2-project-host{background:#111827;color:#e5e7eb;}' +
      '.phase2-project-titlebar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;border-bottom:1px solid rgba(0,0,0,.08);font-weight:600;flex:0 0 auto;}' +
      '.geDarkMode .phase2-project-titlebar{border-bottom-color:rgba(255,255,255,.08);}' +
      '.phase2-project-tabbar{display:flex;align-items:center;gap:4px;padding:6px 8px;border-bottom:1px solid rgba(0,0,0,.06);flex:0 0 auto;}' +
      '.geDarkMode .phase2-project-tabbar{border-bottom-color:rgba(255,255,255,.06);}' +
      '.phase2-project-toolbar{display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid rgba(0,0,0,.06);flex:0 0 auto;}' +
      '.geDarkMode .phase2-project-toolbar{border-bottom-color:rgba(255,255,255,.06);}' +
      '.phase2-project-search{flex:1 1 auto;min-width:0;height:28px;border:1px solid rgba(0,0,0,.14);border-radius:8px;padding:0 8px;background:#fff;}' +
      '.geDarkMode .phase2-project-search{background:#111827;color:#e5e7eb;border-color:rgba(255,255,255,.14);}' +
      '.phase2-project-body{flex:1 1 auto;min-height:0;overflow:auto;padding:8px;}' +
      '.phase2-project-btn{display:inline-flex;align-items:center;justify-content:center;height:26px;min-width:26px;padding:0 8px;border:1px solid rgba(0,0,0,.08);border-radius:8px;background:#fff;cursor:pointer;user-select:none;font-size:12px;line-height:1;}' +
      '.phase2-project-btn:hover{background:rgba(0,0,0,.05);}' +
      '.geDarkMode .phase2-project-btn{background:#1f2937;color:#e5e7eb;border-color:rgba(255,255,255,.08);}' +
      '.geDarkMode .phase2-project-btn:hover{background:rgba(255,255,255,.08);}' +
      '.phase2-project-btn.ghost{border-style:dashed;}' +
      '.phase2-project-tab{padding:5px 10px;border-radius:999px;cursor:pointer;font-size:12px;user-select:none;}' +
      '.phase2-project-tab:hover{background:rgba(0,0,0,.05);}' +
      '.phase2-project-tab.active{background:#e5eefc;color:#1d4ed8;font-weight:600;}' +
      '.geDarkMode .phase2-project-tab:hover{background:rgba(255,255,255,.06);}' +
      '.geDarkMode .phase2-project-tab.active{background:rgba(59,130,246,.18);color:#93c5fd;}' +
      '.phase2-tree{display:flex;flex-direction:column;gap:2px;min-height:0;}' +
      '.phase2-node{display:flex;align-items:center;gap:6px;min-height:28px;padding:2px 6px;border-radius:8px;cursor:default;user-select:none;}' +
      '.phase2-node:hover{background:rgba(0,0,0,.05);}' +
      '.geDarkMode .phase2-node:hover{background:rgba(255,255,255,.06);}' +
      '.phase2-node.selected{background:rgba(59,130,246,.12);}' +
      '.geDarkMode .phase2-node.selected{background:rgba(59,130,246,.18);}' +
      '.phase2-node.active-page{background:rgba(16,185,129,.14);}' +
      '.geDarkMode .phase2-node.active-page{background:rgba(16,185,129,.20);}' +
      '.phase2-node.dim{opacity:.7;}' +
      '.phase2-node .caret{width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;opacity:.85;}' +
      '.phase2-node .icon{width:16px;display:inline-flex;align-items:center;justify-content:center;opacity:.85;font-size:12px;}' +
      '.phase2-node .label{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;}' +
      '.phase2-node .meta{font-size:11px;opacity:.65;}' +
      '.phase2-node .actions{display:flex;align-items:center;gap:4px;opacity:0;transition:opacity .12s ease;}' +
      '.phase2-node:hover .actions,.phase2-node.selected .actions,.phase2-node.active-page .actions{opacity:1;}' +
      '.phase2-node .action{width:20px;height:20px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;}' +
      '.phase2-node .action:hover{background:rgba(0,0,0,.06);}' +
      '.geDarkMode .phase2-node .action:hover{background:rgba(255,255,255,.08);}' +
      '.phase2-empty{padding:16px 10px;border:1px dashed rgba(0,0,0,.12);border-radius:10px;color:#6b7280;background:rgba(0,0,0,.02);}' +
      '.geDarkMode .phase2-empty{border-color:rgba(255,255,255,.12);color:#9ca3af;background:rgba(255,255,255,.03);}' +
      '.phase2-section-title{padding:4px 6px 6px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;opacity:.6;}' +
      '.phase2-context-menu{position:fixed;z-index:3000;min-width:180px;padding:6px;background:#fff;border:1px solid rgba(0,0,0,.10);box-shadow:0 12px 28px rgba(0,0,0,.16);border-radius:10px;}' +
      '.geDarkMode .phase2-context-menu{background:#111827;color:#e5e7eb;border-color:rgba(255,255,255,.08);box-shadow:0 12px 28px rgba(0,0,0,.38);}' +
      '.phase2-context-item{padding:7px 10px;border-radius:8px;cursor:pointer;font-size:12px;}' +
      '.phase2-context-item:hover{background:rgba(0,0,0,.05);}' +
      '.geDarkMode .phase2-context-item:hover{background:rgba(255,255,255,.06);}' +
      '.phase2-run-item{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border:1px solid rgba(0,0,0,.06);border-radius:10px;margin-bottom:8px;}' +
      '.geDarkMode .phase2-run-item{border-color:rgba(255,255,255,.08);}' +
      '.phase2-badge{padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:rgba(59,130,246,.12);color:#1d4ed8;}' +
      '.phase2-badge.success{background:rgba(16,185,129,.14);color:#047857;}' +
      '.phase2-badge.warn{background:rgba(245,158,11,.16);color:#b45309;}' +
      '.phase2-badge.error{background:rgba(239,68,68,.16);color:#b91c1c;}' +
      '.phase2-file-note{display:block;font-size:11px;opacity:.65;margin-top:2px;}' +
      '.phase2-dlg{padding:12px;box-sizing:border-box;display:flex;flex-direction:column;gap:10px;min-width:460px;}' +
      '.phase2-dlg h3{margin:0;font-size:14px;line-height:1.3;}' +
      '.phase2-dlg-note{font-size:12px;opacity:.75;line-height:1.45;}' +
      '.phase2-dlg-grid{display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center;}' +
      '.phase2-dlg-grid .full{grid-column:1 / -1;}' +
      '.phase2-dlg-label{font-size:12px;font-weight:600;}' +
      '.phase2-dlg-path{display:flex;gap:8px;align-items:center;min-width:0;}' +
      '.phase2-dlg-path-view{flex:1 1 auto;min-width:0;border:1px solid rgba(0,0,0,.12);border-radius:8px;padding:6px 8px;background:rgba(0,0,0,.02);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.geDarkMode .phase2-dlg-path-view{border-color:rgba(255,255,255,.12);background:rgba(255,255,255,.03);}' +
      '.phase2-dlg-choice{display:flex;gap:8px;flex-wrap:wrap;}' +
      '.phase2-dlg-choice label{display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;}' +
      '.phase2-dlg-checks{display:flex;flex-wrap:wrap;gap:10px 14px;}' +
      '.phase2-dlg-checks label{display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;}' +
      '.phase2-dlg-actions{display:flex;justify-content:flex-end;gap:10px;padding-top:8px;}' +
      '.phase2-spacer{flex:1 1 auto;}' +
      '.phase2-dlg{width:100%;height:100%;box-sizing:border-box;min-width:0;max-width:none;padding:24px 28px 20px;background:transparent;box-shadow:none;border-radius:0;color:#111827;}' +
      '.geDarkMode .phase2-dlg{background:transparent;color:#e5e7eb;box-shadow:none;}' +
      '.phase2-dlg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:6px;}' +
      '.phase2-dlg-title{margin:0;font-size:28px;line-height:1.15;font-weight:700;letter-spacing:-.02em;}' +
      '.phase2-dlg-body{display:flex;flex-direction:column;gap:14px;}' +
      '.phase2-dlg-note{font-size:14px;line-height:1.55;opacity:.78;margin:0;}' +
      '.phase2-dlg-grid{display:grid;grid-template-columns:140px minmax(0,1fr);gap:14px 16px;align-items:start;}' +
      '.phase2-dlg-label{padding-top:10px;font-size:13px;font-weight:700;color:#374151;}' +
      '.geDarkMode .phase2-dlg-label{color:#d1d5db;}' +
      '.phase2-input{width:100%;height:42px;box-sizing:border-box;border:1px solid rgba(148,163,184,.45);border-radius:12px;padding:0 14px;background:#fff;color:#111827;font-size:15px;outline:none;transition:border-color .15s ease, box-shadow .15s ease, background .15s ease;}' +
      '.phase2-input:focus{border-color:#2563eb;box-shadow:0 0 0 4px rgba(37,99,235,.12);}' +
      '.geDarkMode .phase2-input{background:#0b1220;color:#e5e7eb;border-color:rgba(148,163,184,.24);}' +
      '.phase2-path-picker{display:flex;align-items:center;gap:10px;min-width:0;}' +
      '.phase2-dlg-path-view{display:flex;align-items:center;min-height:42px;padding:0 14px;border:1px solid rgba(148,163,184,.30);border-radius:12px;background:rgba(148,163,184,.08);font-size:14px;color:#334155;}' +
      '.geDarkMode .phase2-dlg-path-view{background:rgba(148,163,184,.10);border-color:rgba(148,163,184,.22);color:#cbd5e1;}' +
      '.phase2-choice-grid{display:flex;flex-wrap:wrap;gap:10px;}' +
      '.phase2-choice-card{position:relative;display:inline-flex;align-items:center;gap:10px;min-height:42px;padding:0 16px;border:1px solid rgba(148,163,184,.32);border-radius:14px;background:#fff;cursor:pointer;font-size:14px;font-weight:600;color:#374151;transition:all .15s ease;}' +
      '.phase2-choice-card:hover{border-color:#94a3b8;background:#f8fafc;transform:translateY(-1px);}' +
      '.phase2-choice-card.active{border-color:#2563eb;background:rgba(37,99,235,.08);color:#1d4ed8;box-shadow:0 0 0 3px rgba(37,99,235,.10);}' +
      '.phase2-choice-card input{margin:0;}' +
      '.geDarkMode .phase2-choice-card{background:#0b1220;color:#d1d5db;border-color:rgba(148,163,184,.18);}' +
      '.geDarkMode .phase2-choice-card:hover{background:#111a2d;border-color:rgba(148,163,184,.34);}' +
      '.geDarkMode .phase2-choice-card.active{background:rgba(37,99,235,.18);color:#93c5fd;border-color:#3b82f6;}' +
      '.phase2-check-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;}' +
      '.phase2-check-card{display:flex;align-items:center;gap:10px;min-height:48px;padding:0 14px;border:1px solid rgba(148,163,184,.30);border-radius:14px;background:#fff;cursor:pointer;font-size:14px;font-weight:600;color:#374151;transition:all .15s ease;}' +
      '.phase2-check-card:hover{border-color:#94a3b8;background:#f8fafc;transform:translateY(-1px);}' +
      '.phase2-check-card.active{border-color:#2563eb;background:rgba(37,99,235,.08);color:#1d4ed8;box-shadow:0 0 0 3px rgba(37,99,235,.10);}' +
      '.phase2-check-card input{margin:0;}' +
      '.geDarkMode .phase2-check-card{background:#0b1220;color:#d1d5db;border-color:rgba(148,163,184,.18);}' +
      '.geDarkMode .phase2-check-card:hover{background:#111a2d;border-color:rgba(148,163,184,.34);}' +
      '.geDarkMode .phase2-check-card.active{background:rgba(37,99,235,.18);color:#93c5fd;border-color:#3b82f6;}' +
      '.phase2-btn{display:inline-flex;align-items:center;justify-content:center;min-width:96px;height:40px;padding:0 16px;border-radius:12px;border:1px solid rgba(148,163,184,.34);background:#fff;color:#334155;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s ease;}' +
      '.phase2-btn:hover{transform:translateY(-1px);background:#f8fafc;}' +
      '.phase2-btn.primary{background:#2563eb;border-color:#2563eb;color:#fff;box-shadow:0 8px 18px rgba(37,99,235,.24);}' +
      '.phase2-btn.primary:hover{background:#1d4ed8;border-color:#1d4ed8;}' +
      '.phase2-btn.ghost{background:transparent;}' +
      '.geDarkMode .phase2-btn{background:#0b1220;color:#e5e7eb;border-color:rgba(148,163,184,.22);}' +
      '.geDarkMode .phase2-btn:hover{background:#111a2d;}' +
      '.geDarkMode .phase2-btn.primary{background:#2563eb;border-color:#2563eb;color:#eff6ff;}' +
      '.phase2-inline-error{font-size:12px;color:#dc2626;font-weight:600;margin-top:-4px;}' +
      '.geDarkMode .phase2-inline-error{color:#fca5a5;}' +
      '.phase2-dlg-divider{height:1px;background:rgba(148,163,184,.20);margin:2px 0;}' +
      '.phase2-field-stack{display:flex;flex-direction:column;gap:8px;min-width:0;}';
    document.head.appendChild(style);
  }

  function text(v) { return v == null ? '' : String(v); }
  function contains(hay, needle) { return text(hay).toLowerCase().indexOf(text(needle).toLowerCase()) >= 0; }

  function normalizedName(value) { return text(value).trim().toLowerCase(); }
  var ROOT_FLOORPLAN_DIR = 'top';

  function looksLikeFloorplanEnv(envFile) {
    envFile = normalizePath(text(envFile)).toLowerCase();
    return !envFile || /(^|\/)(floorplan|top)\/env\.json$/.test(envFile);
  }

  function isFloorplanDesign(design) {
    if (!design) return false;
    if (design.__kind === 'floorplan-container') return true;
    if (normalizedName(design.name) !== 'floorplan' && normalizedName(design.name) !== ROOT_FLOORPLAN_DIR) return false;

    var dirRel = Array.isArray(design._dirRel) ? design._dirRel.join('/').toLowerCase() : '';
    var absDir = normalizePath(design._absDir || '').toLowerCase();
    var envFile = normalizePath(design.env_file || '').toLowerCase();

    var match = dirRel === 'floorplan'
      || dirRel === ROOT_FLOORPLAN_DIR
      || /(^|\/)(floorplan|top)$/.test(dirRel)
      || /(^|\/)(floorplan|top)$/.test(absDir)
      || looksLikeFloorplanEnv(envFile);

    if (match) design.__kind = 'floorplan-container';
    return match;
  }

  function isIpconfigDesign(design) {
    if (!design) return false;
    if (design.__kind === 'ipconfig-container') return true;
    if (normalizedName(design.name) !== 'ipconfig') return false;

    var dirRel = Array.isArray(design._dirRel) ? design._dirRel.join('/').toLowerCase() : '';
    var absDir = normalizePath(design._absDir || '').toLowerCase();
    var envFile = normalizePath(design.env_file || '').toLowerCase();

    var match = dirRel === 'ipconfig'
      || /(^|\/)ipconfig$/.test(dirRel)
      || /(^|\/)ipconfig$/.test(absDir)
      || /(^|\/)ipconfig\/env\.json$/.test(envFile);

    if (match) design.__kind = 'ipconfig-container';
    return match;
  }

  function usesProjectFlow(design) {
    return !!(design && design.__kind === 'module-design');
  }

  function getDesignPageDir(ui, designRef) {
    var base = getDesignAbsDir(ui, designRef);
    if (!base) return '';
    if (isFloorplanDesign(designRef)) return base;
    return usesProjectFlow(designRef) ? joinPath(base, 'arch') : joinPath(base, 'page');
  }

  function getDesignYamlDir(ui, designRef) {
    var base = getDesignAbsDir(ui, designRef);
    return base ? joinPath(base, 'yaml') : '';
  }

  function getDesignSpecDir(ui, designRef) {
    var base = getDesignAbsDir(ui, designRef);
    return base ? joinPath(base, 'spec') : '';
  }

  function getDftspecSidecarFileNames(pageName) {
    var base = sanitizeName(pageName);
    var suffixes = ['bisr', 'tap', 'ist', 'lbist', 'occ', 'scan', 'edt'];
    var files = [];
    for (var i = 0; i < suffixes.length; i++) {
      files.push(base + '.' + suffixes[i] + '.dofile');
    }
    return files;
  }

  function getProjectFlowRelPath(ui) {
    var model = ensureModel(ui);
    return text(model && model.flow_file || 'env.json') || 'env.json';
  }

  function getProjectFlowAbsPath(ui) {
    var root = getProjectStorageRoot(ui);
    if (!root) return '';
    return joinPath(root, getProjectFlowRelPath(ui));
  }

  function sanitizeName(name) {
    if (typeof global._sanitizeFileName === 'function') {
      try { return global._sanitizeFileName(name); } catch (e) {}
    }
    return text(name).replace(/[\\/:*?"<>|]+/g, '_').trim() || 'item';
  }

  function validateScopedName(name, kind, opts) {
    opts = opts || {};
    var raw = text(name);
    var trimmed = raw.trim();
    var label = kind || 'Name';

    if (!trimmed) return label + ' is required.';
    if (raw !== trimmed) return label + ' cannot start or end with spaces.';
    if (/\s/.test(trimmed)) return label + ' cannot contain spaces.';
    if (/[\\/:*?"<>|]/.test(trimmed)) return label + ' contains invalid characters: \\ / : * ? " < > |';
    if (sanitizeName(trimmed) !== trimmed) return label + ' contains unsupported characters.';
    if (opts.disallowReserved) {
      var lower = trimmed.toLowerCase();
      if (lower === 'floorplan' || lower === ROOT_FLOORPLAN_DIR || lower === 'ipconfig') return label + ' "' + trimmed + '" is reserved.';
    }
    return '';
  }

  function normalizePath(path) {
    var v = text(path).replace(/\\/g, '/').replace(/\/+/g, '/');
    if (!v) return '';
    return v.replace(/\/$/, '');
  }

  function joinPath() {
    if (typeof global._joinPath === 'function') {
      try { return normalizePath(global._joinPath.apply(global, arguments)); } catch (e) {}
    }
    var parts = [];
    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i] != null && arguments[i] !== '') parts.push(String(arguments[i]));
    }
    return normalizePath(parts.join('/'));
  }

  function splitPath(path) {
    path = normalizePath(path);
    if (!path) return [];
    return path.split('/').filter(function (v) { return v !== ''; });
  }

  function dirnamePath(path) {
    path = normalizePath(path);
    if (!path) return '';
    var parts = splitPath(path);
    if (!parts.length) return '';
    parts.pop();
    if (!parts.length) {
      return /^(?:[A-Za-z]:)$/.test(path.slice(0, 2)) ? path.slice(0, 2) : '';
    }
    var joined = parts.join('/');
    if (/^[A-Za-z]:/.test(path) && !/^[A-Za-z]:/.test(joined)) joined = path.slice(0, 2) + '/' + joined;
    if (path.charAt(0) === '/' && joined.charAt(0) !== '/') joined = '/' + joined;
    return normalizePath(joined);
  }

  function basenamePath(path) {
    path = normalizePath(path);
    if (!path) return '';
    var parts = splitPath(path);
    return parts.length ? parts[parts.length - 1] : '';
  }

  function pathWithinRoot(root, abs) {
    root = normalizePath(root);
    abs = normalizePath(abs);
    if (!root || !abs) return false;
    return abs === root || abs.indexOf(root + '/') === 0;
  }

  function relSegsFromRoot(root, abs) {
    root = normalizePath(root);
    abs = normalizePath(abs);
    if (!pathWithinRoot(root, abs)) return null;
    if (abs === root) return [];
    return abs.slice(root.length + 1).split('/').filter(Boolean);
  }

  function request(payload) {
    if (typeof global.requestSync === 'function') {
      return global.requestSync(payload);
    }
    return Promise.reject(new Error('requestSync unavailable'));
  }

  async function requestAny(candidates) {
    var lastError = null;
    for (var i = 0; i < candidates.length; i++) {
      try {
        return await request(candidates[i]);
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error('request failed');
  }

  function createEl(tag, className, textContent) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (textContent != null) el.textContent = textContent;
    return el;
  }

  function escapeHtml(str) {
    return text(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function isPlaceholderModel(model) {
    return !!(model && model.__placeholder);
  }

  function markProjectReady(model) {
    if (!model) return;
    model.__placeholder = false;
    model.__createdByProjectExplorer = true;
  }

  function getProjectRoot(ui) {
    return normalizePath((ui && (ui._projectRootPath || ui._projectYamlDir)) || '');
  }

  function getProjectStorageRoot(ui) {
    var dbRoot = normalizePath((ui && ui._projectDbDirPath) || '');
    if (dbRoot) return dbRoot;
    var root = getProjectRoot(ui);
    return root ? joinPath(root, 'db') : '';
  }

  function isProjectReady(ui) {
    var model = ui && ui.projectModel;
    if (!model) return false;
    if (isPlaceholderModel(model)) return false;
    if (text(model.path).trim()) return true;
    if (getProjectRoot(ui)) return true;
    return !!(Array.isArray(model.designs) && model.designs.length);
  }

  function ensureModel(ui) {
    if (!ui.projectModel) {
      ui.projectModel = { name: '', path: '', designs: [], __placeholder: true };
    }
    if (!Array.isArray(ui.projectModel.designs)) {
      ui.projectModel.designs = Array.isArray(ui.projectModel.cores) ? ui.projectModel.cores : [];
    }
    if (ui.projectModel.__placeholder == null) {
      ui.projectModel.__placeholder = !text(ui.projectModel.path).trim() && (!ui.projectModel.designs || !ui.projectModel.designs.length);
    }
    hydrateDesignDirs(ui);
    return ui.projectModel;
  }

  function getDesignAbsDir(ui, design) {
    if (!design) return '';
    if (design._absDir) return normalizePath(design._absDir);
    var root = getProjectStorageRoot(ui);
    var segs = Array.isArray(design._dirRel) ? design._dirRel.slice() : [];
    if (isFloorplanDesign(design)) {
      if (root && isTopLevelFloorplanDesign(ui, design)) return joinPath(root, ROOT_FLOORPLAN_DIR);
      return joinPath.apply(null, segs.length ? segs : [isTopLevelFloorplanDesign(ui, design) ? ROOT_FLOORPLAN_DIR : 'floorplan']);
    }
    if (root && segs.length) return joinPath.apply(null, [root].concat(segs));
    if (root && design.name) return joinPath(root, sanitizeName(design.name));
    return '';
  }

  function getDesignKey(design) {
    if (!design) return 'design:none';
    if (design._absDir) return 'design:abs:' + normalizePath(design._absDir);
    var segs = Array.isArray(design._dirRel) ? design._dirRel.slice() : [sanitizeName(design.name || 'design')];
    return 'design:rel:' + segs.join('/');
  }

  function hydrateDesignDirs(ui) {
    var model = ui.projectModel || {};
    var designs = Array.isArray(model.designs) ? model.designs : [];
    var root = getProjectStorageRoot(ui) || normalizePath(model.path || '');

    function walk(design, parentSegs) {
      if (!design) return;
      if (!Array.isArray(design.pages)) design.pages = [];
      if (!Array.isArray(design.sub_designs)) design.sub_designs = [];
      if (!design._containers || typeof design._containers !== 'object') design._containers = {};
      if (!design.page_meta || typeof design.page_meta !== 'object') design.page_meta = {};

      if (design.abs_dir && !design._absDir) design._absDir = normalizePath(design.abs_dir);
      else if (design._absDir) design._absDir = normalizePath(design._absDir);

      if (design._absDir && !Array.isArray(design._dirRel)) {
        var rel = root ? relSegsFromRoot(root, design._absDir) : null;
        design._dirRel = rel || (parentSegs || []).concat([sanitizeName(design.name || 'design')]);
      } else if (typeof design.env_file === 'string' && design.env_file && !Array.isArray(design._dirRel)) {
        var envSegs = normalizePath(design.env_file).split('/');
        envSegs.pop();
        design._dirRel = envSegs;
      } else if (!Array.isArray(design._dirRel)) {
        design._dirRel = (parentSegs || []).concat([sanitizeName(design.name || 'design')]);
      }

      if (isFloorplanDesign(design)) {
        var isTopLevelFloorplan = !(parentSegs && parentSegs.length);
        var floorplanDirName = isTopLevelFloorplan ? ROOT_FLOORPLAN_DIR : 'floorplan';
        design.name = floorplanDirName;
        if (!Array.isArray(design._dirRel) || !design._dirRel.length || normalizedName(design._dirRel[design._dirRel.length - 1]) !== floorplanDirName) {
          design._dirRel = (parentSegs || []).concat([floorplanDirName]);
        }
        if (!design._absDir && root) design._absDir = joinPath.apply(null, [root].concat(design._dirRel));
        design.env_file = '';
      } else if (isIpconfigDesign(design)) {
        design.name = 'ipconfig';
        if (!Array.isArray(design._dirRel) || !design._dirRel.length || normalizedName(design._dirRel[design._dirRel.length - 1]) !== 'ipconfig') {
          design._dirRel = (parentSegs || []).concat(['ipconfig']);
        }
        if (!design._absDir && root) design._absDir = joinPath.apply(null, [root].concat(design._dirRel));
        design.env_file = '';
      } else {
        design.env_file = usesProjectFlow(design)
          ? ''
          : joinPath.apply(null, (design._dirRel || [sanitizeName(design.name || 'design')]).concat(['env.json']));
      }

      if (!isFloorplanDesign(design) && !isIpconfigDesign(design)) {
        if (design._containers.floorplan) walk(design._containers.floorplan, design._dirRel || []);
        if (design._containers.ipconfig) walk(design._containers.ipconfig, design._dirRel || []);
      }

      for (var i = 0; i < design.sub_designs.length; i++) walk(design.sub_designs[i], design._dirRel || []);
    }

    for (var j = 0; j < designs.length; j++) walk(designs[j], []);
  }

  function getFloorplanContainer(ui, createIfMissing, parentDesign) {
    if (parentDesign && !isFloorplanDesign(parentDesign) && !isIpconfigDesign(parentDesign)) {
      ensureDesignContainers(parentDesign, ui);
      hydrateDesignDirs(ui);
      var direct = findDirectContainer(parentDesign, 'floorplan');
      if (direct || !createIfMissing) return direct || null;
      parentDesign._containers.floorplan = makeContainerDesignRecord('floorplan', parentDesign, ui);
      hydrateDesignDirs(ui);
      return parentDesign._containers.floorplan;
    }
    var model = ensureModel(ui);
    for (var i = 0; i < model.designs.length; i++) {
      if (model.designs[i] && isFloorplanDesign(model.designs[i])) return model.designs[i];
    }
    if (!createIfMissing) return null;
    var fp = {
      name: ROOT_FLOORPLAN_DIR,
      __kind: 'floorplan-container',
      pages: [],
      sub_designs: [],
      env_file: '',
      page_meta: {}
    };
    fp._dirRel = [ROOT_FLOORPLAN_DIR];
    if (getProjectStorageRoot(ui)) fp._absDir = joinPath(getProjectStorageRoot(ui), ROOT_FLOORPLAN_DIR);
    model.designs.unshift(fp);
    markProjectReady(model);
    hydrateDesignDirs(ui);
    return fp;
  }

  function getIpconfigContainer(ui, createIfMissing) {
    var model = ensureModel(ui);
    for (var i = 0; i < model.designs.length; i++) {
      if (model.designs[i] && isIpconfigDesign(model.designs[i])) return model.designs[i];
    }
    if (!createIfMissing) return null;
    var ipc = {
      name: 'ipconfig',
      __kind: 'ipconfig-container',
      pages: [],
      sub_designs: [],
      env_file: '',
      page_meta: {}
    };
    if (getProjectStorageRoot(ui)) ipc._absDir = joinPath(getProjectStorageRoot(ui), 'ipconfig');
    model.designs.push(ipc);
    markProjectReady(model);
    hydrateDesignDirs(ui);
    return ipc;
  }

  function getCurrentDesign(ui) {
    var ctx = ui && ui._activeProjectPageCtx;
    if (ctx && ctx.designRef && !isFloorplanDesign(ctx.designRef)) return ctx.designRef;
    var model = ensureModel(ui);
    for (var i = 0; i < model.designs.length; i++) {
      if (model.designs[i] && !isFloorplanDesign(model.designs[i]) && !isIpconfigDesign(model.designs[i])) return model.designs[i];
    }
    return null;
  }

  function getState(ui) {
    var root = ui._phase2ProjectExplorer || (ui._phase2ProjectExplorer = {});
    if (!root.state) {
      root.state = {
        activeTab: (ui._phase1 && ui._phase1.state && ui._phase1.state.projectTab) || 'sources',
        searchText: '',
        scrollTopByTab: {},
        pendingRestoreByTab: {},
        renderedTab: '',
        expanded: {},
        selectedKey: '',
        menuBound: false
      };
    }
    return root.state;
  }

  function setStatus(ui, msg) {
    try {
      if (ui && ui.editor && typeof ui.editor.setStatus === 'function') ui.editor.setStatus(msg);
    } catch (e) {}
  }

  async function maybeSaveActivePage(ui, reason) {
    if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.saveActivePage === 'function') {
      return global.DFTPageSessionManager.saveActivePage(ui, { reason: reason, silentIfUnmapped: true });
    }
    try {
      var modified = !ui || !ui.editor || typeof ui.editor.isModified !== 'function' ? true : !!ui.editor.isModified();
      if (!modified) return;
      if (typeof global.DftSaveProjectIndividually === 'function') {
        await global.DftSaveProjectIndividually(ui, { silentIfUnmapped: true });
        setStatus(ui, 'Autosaved before: ' + (reason || 'action'));
      }
    } catch (e) {
      console.warn('[ProjectExplorer] autosave failed:', e);
    }
  }

  function activePageName(ui) {
    if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.getActivePageName === 'function') {
      return global.DFTPageSessionManager.getActivePageName(ui);
    }
    if (ui && ui._activeProjectPageCtx && ui._activeProjectPageCtx.name) return ui._activeProjectPageCtx.name;
    try {
      if (ui && ui.currentPage) return typeof ui.currentPage.getName === 'function' ? ui.currentPage.getName() : ui.currentPage.name;
    } catch (e) {}
    return '';
  }

  function activePageCtx(ui) {
    if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.getActiveContext === 'function') {
      return global.DFTPageSessionManager.getActiveContext(ui);
    }
    return ui && ui._activeProjectPageCtx ? ui._activeProjectPageCtx : null;
  }

  function isActiveDesignPage(ui, designRef, pageName) {
    if (!ui || !designRef || !pageName) return false;
    if (ui._activeEnvCtx) return false;
    var activeName = activePageName(ui);
    var ctx = activePageCtx(ui);

    if (normalizedName(activeName) !== normalizedName(pageName)) return false;
    if (!ctx) return true;

    var targetDesignKey = getDesignKey(designRef);
    if (ctx.designRef) return getDesignKey(ctx.designRef) === targetDesignKey;
    if (ctx.designKey) return text(ctx.designKey) === targetDesignKey;

    var ctxAbs = normalizePath(ctx.abs || '');
    if (ctxAbs) return ctxAbs === normalizePath(resolveLocalPageFileAbs(ui, designRef, pageName));

    var ctxSegs = Array.isArray(ctx.segs) ? ctx.segs.join('/') : '';
    var designSegs = Array.isArray(designRef._dirRel) ? designRef._dirRel.join('/') : '';
    if (ctxSegs && designSegs) return ctxSegs === designSegs;

    return false;
  }

  function designPageGroupLabel(design) {
    if (isFloorplanDesign(design)) return 'FPArch';
    if (isIpconfigDesign(design)) return 'Config';
    return 'Arch';
  }

  function isTopLevelFloorplanDesign(ui, design) {
    var model = ensureModel(ui);
    var designs = model && Array.isArray(model.designs) ? model.designs : [];
    return !!design && isFloorplanDesign(design) && designs.indexOf(design) >= 0;
  }

  function designDisplayLabel(ui, design) {
    if (isTopLevelFloorplanDesign(ui, design)) return ROOT_FLOORPLAN_DIR;
    if (isFloorplanDesign(design)) return 'floorplan';
    if (isIpconfigDesign(design)) return 'ipconfig';
    return design && design.name ? design.name : 'design';
  }

  function isModuleDesign(design) {
    return !!design && String(design.__kind || '').toLowerCase() === 'module-design';
  }

  function renderPageLeaf(ui, panel, state, key, depth, designRef, pageName) {
    var meta = designRef && designRef.page_meta && designRef.page_meta[pageName] && designRef.page_meta[pageName].structure
      ? ('[' + designRef.page_meta[pageName].structure + ']') : '';
    panel.appendChild(createNode(ui, {
      key: key,
      depth: depth,
      icon: '□',
      label: pageName,
      meta: meta,
      activePage: isActiveDesignPage(ui, designRef, pageName),
      onClick: function () { state.selectedKey = key; openPage(ui, designRef, pageName); },
      menuItems: [
        { label: 'Open', handler: function () { openPage(ui, designRef, pageName); } },
        { label: 'Rename', handler: function () { renamePage(ui, designRef, pageName); } },
        { label: 'Duplicate', handler: function () { duplicatePage(ui, designRef, pageName); } },
        { label: 'Delete', handler: function () { deletePageAction(ui, designRef, pageName); } }
      ]
    }));
  }

  function setActivePageCtx(ui, designRef, pageName, absPath) {
    if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.setActiveContext === 'function') {
      return global.DFTPageSessionManager.setActiveContext(ui, designRef, pageName, absPath);
    }
    ui._activeProjectPageCtx = {
      name: pageName,
      abs: absPath || null,
      designKey: getDesignKey(designRef),
      designRef: designRef,
      segs: Array.isArray(designRef && designRef._dirRel) ? designRef._dirRel.slice() : []
    };
    return ui._activeProjectPageCtx;
  }

  function clearGraphPage(ui) {
    if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.clearGraphPage === 'function') {
      return global.DFTPageSessionManager.clearGraphPage(ui);
    }
    try {
      var graph = ui.editor.graph;
      var parent = graph.getDefaultParent();
      graph.getModel().beginUpdate();
      try {
        var cells = graph.getChildCells(parent, true, true);
        if (cells && cells.length) graph.removeCells(cells, true);
      } finally {
        graph.getModel().endUpdate();
      }
    } catch (e) {}
  }

  function ensurePageTab(ui, pageName) {
    if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.ensurePageTab === 'function') {
      return global.DFTPageSessionManager.ensurePageTab(ui, pageName);
    }
    var pages = ui.pages || [];
    var page = null;
    for (var i = 0; i < pages.length; i++) {
      var nm = typeof pages[i].getName === 'function' ? pages[i].getName() : pages[i].name;
      if (nm === pageName) { page = pages[i]; break; }
    }
    if (!page && typeof ui.duplicatePage === 'function') {
      var src = ui.currentPage || (ui.pages && ui.pages[0]);
      if (src) {
        page = ui.duplicatePage(src, pageName);
        clearGraphPage(ui);
      }
    }
    if (page) {
      try {
        var currentName = typeof page.getName === 'function' ? page.getName() : page.name;
        if (currentName !== pageName && typeof ui.renamePage === 'function') ui.renamePage(page, pageName);
      } catch (e) {}
      if (typeof ui.selectPage === 'function') ui.selectPage(page);
    }
    return page;
  }

  async function ensureDirs(absPath) {
    if (!absPath) return;
    try {
      await requestAny([
        { action: 'ensureDirs', path: absPath },
        { action: 'mkdir', path: absPath, recursive: true },
        { action: 'ensureDir', path: absPath }
      ]);
    } catch (e) {}
  }

  async function writeTextFile(absPath, content) {
    if (!absPath) return;
    await requestAny([
      { action: 'writeFile', path: absPath, data: content, enc: 'utf-8' },
      { action: 'writeFile', filename: absPath, data: content, enc: 'utf-8' },
      { action: 'writeFile', path: absPath, data: content, enc: 'utf8' },
      { action: 'writeFile', filename: absPath, data: content, enc: 'utf8' },
      { action: 'writeFile', filename: absPath, data: content, encoding: 'utf-8' },
      { action: 'writeFile', path: absPath, data: content, encoding: 'utf-8' },
      { action: 'writeFile', filename: absPath, text: content, encoding: 'utf-8' },
      { action: 'writeFile', path: absPath, text: content, encoding: 'utf-8' },
      { action: 'writeFile', filename: absPath, content: content, encoding: 'utf-8' },
      { action: 'writeFile', path: absPath, content: content, encoding: 'utf-8' }
    ]);
  }

  async function readTextFile(absPath) {
    if (!absPath) throw new Error('Path is empty');
    return requestAny([
      { action: 'readFile', filename: absPath, encoding: 'utf-8' },
      { action: 'readFile', path: absPath, encoding: 'utf-8' },
      { action: 'readFile', file: absPath, encoding: 'utf-8' }
    ]);
  }

  async function statExists(absPath) {
    if (!absPath) return false;
    try {
      await requestAny([
        { action: 'fileStat', file: absPath },
        { action: 'fileStat', path: absPath },
        { action: 'stat', path: absPath }
      ]);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function deleteFile(absPath) {
    if (!absPath) return;
    try {
      await requestAny([
        { action: 'deleteFile', file: absPath },
        { action: 'deleteFile', path: absPath },
        { action: 'unlink', path: absPath }
      ]);
    } catch (e) {}
  }

  async function deleteDir(absPath) {
    if (!absPath) return;
    try {
      await requestAny([
        { action: 'deleteDir', path: absPath },
        { action: 'deleteDir', file: absPath }
      ]);
    } catch (e) {}
  }

  async function writeTextFileExact(absPath, content) {
    if (!absPath) return;
    await request({ action: 'writeFile', path: absPath, data: String(content == null ? '' : content), enc: 'utf-8' });
  }

  async function readTextFileExact(absPath) {
    if (!absPath) throw new Error('Path is empty');
    return request({ action: 'readFile', filename: absPath, encoding: 'utf-8' });
  }

  async function statExistsExact(absPath) {
    if (!absPath) return false;
    try {
      await request({ action: 'fileStat', file: absPath });
      return true;
    } catch (e) {
      return false;
    }
  }

  function blankPageXml(pageName) {
    return '<mxfile host="app.diagrams.net"><diagram id="' + sanitizeName(pageName) + '" name="' + escapeHtml(pageName) + '"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>';
  }

  function floorplanBlankPageXml(pageName) {
    var layerNames = ['base', 'ssn', 'bscan', 'ijtag', 'bisr', 'other'];
    var root = ['<mxCell id="0"/>'];
    for (var i = 0; i < layerNames.length; i++) {
      root.push('<mxCell id="' + String(i + 1) + '" value="' + escapeHtml(layerNames[i]) + '" parent="0"/>');
    }
    return '<mxfile host="app.diagrams.net"><diagram id="' + sanitizeName(pageName) + '" name="' + escapeHtml(pageName) + '"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0"><root>' + root.join('') + '</root></mxGraphModel></diagram></mxfile>';
  }

  function initialPageXml(designRef, pageName) {
    return isFloorplanDesign(designRef) ? floorplanBlankPageXml(pageName) : blankPageXml(pageName);
  }

  async function listDir(absPath) {
    if (!absPath) return [];
    var result = await requestAny([
      { action: 'readDir', path: absPath },
      { action: 'readdir', path: absPath },
      { action: 'listDir', path: absPath },
      { action: 'listFiles', path: absPath }
    ]);
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.entries)) return result.entries;
    if (Array.isArray(result.files)) return result.files;
    if (Array.isArray(result.children)) return result.children;
    return [];
  }

  function parseDirEntry(base, entry) {
    if (!entry) return null;
    if (typeof entry === 'string') {
      return { name: basenamePath(entry), path: normalizePath(entry), isDir: false };
    }
    var name = text(entry.name || entry.basename || entry.label || basenamePath(entry.path || entry.file || ''));
    var path = normalizePath(entry.path || entry.file || (name ? joinPath(base, name) : ''));
    var type = text(entry.type || entry.kind).toLowerCase();
    var isDir = !!entry.isDirectory || !!entry.dir || type === 'directory' || type === 'dir' || type === 'folder';
    return { name: name, path: path, isDir: isDir };
  }

  async function copyFileOnDisk(src, dst) {
    var content = await readTextFile(src);
    await ensureDirs(dirnamePath(dst));
    await writeTextFile(dst, content);
  }

  async function copyDirRecursive(srcDir, dstDir) {
    var entries = [];
    try { entries = await listDir(srcDir); } catch (e) { entries = []; }
    await ensureDirs(dstDir);
    for (var i = 0; i < entries.length; i++) {
      var entry = parseDirEntry(srcDir, entries[i]);
      if (!entry || !entry.name) continue;
      var src = entry.path || joinPath(srcDir, entry.name);
      var dst = joinPath(dstDir, entry.name);
      if (entry.isDir) await copyDirRecursive(src, dst);
      else await copyFileOnDisk(src, dst);
    }
  }

  function designCopyChildName(designRef) {
    if (isFloorplanDesign(designRef)) return 'floorplan';
    if (isIpconfigDesign(designRef)) return 'ipconfig';
    return text(designRef && designRef.name || '');
  }

  function findMatchingCopyChild(targetParent, sourceChild) {
    var kids = Array.isArray(targetParent && targetParent.sub_designs) ? targetParent.sub_designs : [];
    var wanted = normalizedName(designCopyChildName(sourceChild));
    for (var i = 0; i < kids.length; i++) {
      if (normalizedName(designCopyChildName(kids[i])) === wanted) return kids[i];
    }
    return null;
  }

  async function copyIfExists(srcAbs, dstAbs) {
    if (!srcAbs || !dstAbs) return false;
    if (!await statExists(srcAbs)) return false;
    await ensureDirs(dirnamePath(dstAbs));
    try {
      await request({ action: 'copyFile', src: srcAbs, dst: dstAbs });
    } catch (e) {
      var content = await readTextFile(srcAbs);
      await writeTextFile(dstAbs, content);
    }
    return true;
  }

  async function copyDesignFilesByModel(ui, sourceDesign, targetDesign) {
    if (!sourceDesign || !targetDesign) return;

    var sourceAbs = getDesignAbsDir(ui, sourceDesign);
    var targetAbs = getDesignAbsDir(ui, targetDesign);
    if (targetAbs) await ensureDirs(targetAbs);

    if (!isFloorplanDesign(sourceDesign) && !isIpconfigDesign(sourceDesign)) {
      await copyIfExists(joinPath(sourceAbs, 'env.json'), joinPath(targetAbs, 'env.json'));
    }

    var pages = Array.isArray(sourceDesign.pages) ? sourceDesign.pages.slice() : [];
    for (var i = 0; i < pages.length; i++) {
      var pageName = pages[i];
      await copyIfExists(resolveLocalPageFileAbs(ui, sourceDesign, pageName), resolveLocalPageFileAbs(ui, targetDesign, pageName));
      if (isIpconfigDesign(sourceDesign)) {
        await copyIfExists(
          joinPath(getDesignYamlDir(ui, sourceDesign), sanitizeName(pageName) + '.yaml'),
          joinPath(getDesignYamlDir(ui, targetDesign), sanitizeName(pageName) + '.yaml')
        );
      } else if (usesProjectFlow(sourceDesign)) {
        await copyIfExists(
          joinPath(getDesignYamlDir(ui, sourceDesign), sanitizeName(pageName) + '.modules.yaml'),
          joinPath(getDesignYamlDir(ui, targetDesign), sanitizeName(pageName) + '.modules.yaml')
        );
        await copyIfExists(
          joinPath(getDesignYamlDir(ui, sourceDesign), sanitizeName(pageName) + '.interface-pairs.yaml'),
          joinPath(getDesignYamlDir(ui, targetDesign), sanitizeName(pageName) + '.interface-pairs.yaml')
        );
        await copyIfExists(
          joinPath(getDesignSpecDir(ui, sourceDesign), sanitizeName(pageName) + '.dofile'),
          joinPath(getDesignSpecDir(ui, targetDesign), sanitizeName(pageName) + '.dofile')
        );
        var sidecars = getDftspecSidecarFileNames(pageName);
        for (var sc = 0; sc < sidecars.length; sc++) {
          await copyIfExists(
            joinPath(getDesignSpecDir(ui, sourceDesign), sidecars[sc]),
            joinPath(getDesignSpecDir(ui, targetDesign), sidecars[sc])
          );
        }
      }
    }

    var sourceFloorplan = findDirectContainer(sourceDesign, 'floorplan');
    var targetFloorplan = findDirectContainer(targetDesign, 'floorplan');
    if (sourceFloorplan && targetFloorplan) {
      var fpPages = Array.isArray(sourceFloorplan.pages) ? sourceFloorplan.pages.slice() : [];
      for (var fp = 0; fp < fpPages.length; fp++) {
        await copyIfExists(resolveLocalPageFileAbs(ui, sourceFloorplan, fpPages[fp]), resolveLocalPageFileAbs(ui, targetFloorplan, fpPages[fp]));
      }
    }

    var sourceIpconfig = findDirectContainer(sourceDesign, 'ipconfig');
    var targetIpconfig = findDirectContainer(targetDesign, 'ipconfig');
    if (sourceIpconfig && targetIpconfig) {
      var ipcPages = Array.isArray(sourceIpconfig.pages) ? sourceIpconfig.pages.slice() : [];
      for (var ip = 0; ip < ipcPages.length; ip++) {
        await copyIfExists(resolveLocalPageFileAbs(ui, sourceIpconfig, ipcPages[ip]), resolveLocalPageFileAbs(ui, targetIpconfig, ipcPages[ip]));
        await copyIfExists(
          joinPath(getDesignAbsDir(ui, sourceIpconfig), 'yaml', sanitizeName(ipcPages[ip]) + '.yaml'),
          joinPath(getDesignAbsDir(ui, targetIpconfig), 'yaml', sanitizeName(ipcPages[ip]) + '.yaml')
        );
      }
    }

    var srcKids = Array.isArray(sourceDesign.sub_designs) ? sourceDesign.sub_designs : [];
    for (var j = 0; j < srcKids.length; j++) {
      var srcChild = srcKids[j];
      var dstChild = findMatchingCopyChild(targetDesign, srcChild);
      if (!dstChild) continue;
      await copyDesignFilesByModel(ui, srcChild, dstChild);
    }
  }

  function resolveLocalPageFileAbs(ui, designRef, pageName) {
    if (!ui) throw new Error('UI not ready');
    if (!designRef) throw new Error('designRef is required');
    if (!pageName) throw new Error('pageName is required');
    var pageDir = getDesignPageDir(ui, designRef);
    if (!pageDir) throw new Error('Please create or open a project first.');
    return joinPath(pageDir, sanitizeName(pageName) + '.dftart');
  }

  async function createPageFileSlot(ui, designRef, pageName) {
    if (typeof global._createPageFileSlot === 'function') {
      try { return await global._createPageFileSlot(ui, designRef, pageName); } catch (e) {}
    }
    var abs = resolveLocalPageFileAbs(ui, designRef, pageName);
    await ensureDirs(dirnamePath(abs));
    if (!await statExists(abs)) {
      try { await writeTextFile(abs, initialPageXml(designRef, pageName)); } catch (e2) {}
    }
    return abs;
  }

  function serializeDesign(design) {
    var out = {
      name: design.name || '',
      pages: Array.isArray(design.pages) ? design.pages.slice() : [],
      sub_designs: [],
      env_file: (isFloorplanDesign(design) || isIpconfigDesign(design)) ? '' : text(design.env_file || ''),
      page_meta: design.page_meta || {}
    };
    if (design.__kind) out.kind = design.__kind;
    if (design._absDir) out.abs_dir = normalizePath(design._absDir);
    for (var i = 0; i < (design.sub_designs || []).length; i++) out.sub_designs.push(serializeDesign(design.sub_designs[i]));
    return out;
  }

  function cloneDesignRecord(source, nameOverride, absDirOverride, dirRelOverride) {
    var isFloorplan = isFloorplanDesign(source);
    var isIpconfig = isIpconfigDesign(source);
    var clone = {
      name: nameOverride != null ? nameOverride : (source.name || ''),
      pages: Array.isArray(source.pages) ? source.pages.slice() : [],
      sub_designs: [],
      env_file: (isFloorplan || isIpconfig) ? '' : text(source.env_file || ''),
      page_meta: source.page_meta ? JSON.parse(JSON.stringify(source.page_meta)) : {}
    };
    if (source.__kind) clone.__kind = source.__kind;
    if (absDirOverride) clone._absDir = normalizePath(absDirOverride);
    if (dirRelOverride) clone._dirRel = dirRelOverride.slice();
    clone._containers = {};
    if (source._containers && source._containers.floorplan) clone._containers.floorplan = cloneDesignRecord(source._containers.floorplan, 'floorplan');
    if (source._containers && source._containers.ipconfig) clone._containers.ipconfig = cloneDesignRecord(source._containers.ipconfig, 'ipconfig');
    return clone;
  }

  function designMetaPath(absDir) {
    return absDir ? joinPath(absDir, DESIGN_META_FILE) : '';
  }

  function findDirectContainer(designRef, kind) {
    if (!designRef) return null;
    if (designRef._containers && kind === 'floorplan' && designRef._containers.floorplan) return designRef._containers.floorplan;
    if (designRef._containers && kind === 'ipconfig' && designRef._containers.ipconfig) return designRef._containers.ipconfig;
    return null;
  }

  function buildDesignManifest(designRef) {
    var floorplan = findDirectContainer(designRef, 'floorplan');
    var ipconfig = findDirectContainer(designRef, 'ipconfig');
    var out = {
      type: 'dftartist-design',
      schemaVersion: 1,
      createdBy: 'dftartist',
      name: text(designRef && designRef.name || ''),
      pages: Array.isArray(designRef && designRef.pages) ? designRef.pages.slice() : [],
      page_meta: designRef && designRef.page_meta ? JSON.parse(JSON.stringify(designRef.page_meta)) : {},
      containers: {
        floorplan: {
          pages: Array.isArray(floorplan && floorplan.pages) ? floorplan.pages.slice() : [],
          page_meta: floorplan && floorplan.page_meta ? JSON.parse(JSON.stringify(floorplan.page_meta)) : {}
        },
        ipconfig: {
          pages: Array.isArray(ipconfig && ipconfig.pages) ? ipconfig.pages.slice() : [],
          page_meta: ipconfig && ipconfig.page_meta ? JSON.parse(JSON.stringify(ipconfig.page_meta)) : {}
        }
      },
      children: Array.isArray(designRef && designRef.sub_designs)
        ? designRef.sub_designs.filter(function (child) { return child && !isFloorplanDesign(child) && !isIpconfigDesign(child); }).map(function (child) {
            return { name: text(child.name || ''), ref: sanitizeName(child.name || '') };
          })
        : [],
      updatedAt: new Date().toISOString()
    };
    if (designRef && designRef.__kind) out.kind = designRef.__kind;
    return out;
  }

  function isValidDesignManifest(meta) {
    return !!(meta &&
      meta.type === 'dftartist-design' &&
      Number(meta.schemaVersion) === 1 &&
      meta.createdBy === 'dftartist' &&
      text(meta.name).trim());
  }

  async function readDesignManifest(absDir) {
    var metaPath = designMetaPath(absDir);
    if (!metaPath || !await statExistsExact(metaPath)) throw new Error('Design metadata not found.');
    var raw = await readTextFileExact(metaPath);
    if (!text(raw).trim()) throw new Error('Design metadata file is empty.');
    var meta = null;
    try { meta = JSON.parse(raw); } catch (e) { throw new Error('Design metadata is not valid JSON.'); }
    if (!isValidDesignManifest(meta)) throw new Error('Design metadata is missing required DFTArtist fields.');
    return meta;
  }

  async function syncDesignMetadataTree(ui, designRef) {
    if (!designRef || isFloorplanDesign(designRef) || isIpconfigDesign(designRef)) return;
    var absDir = getDesignAbsDir(ui, designRef);
    if (absDir) {
      await ensureDirs(absDir);
      try {
        var metaFile = designMetaPath(absDir);
        var payload = JSON.stringify(buildDesignManifest(designRef), null, 2);
        await writeTextFileExact(metaFile, payload);
        var written = await readTextFileExact(metaFile);
        if (!text(written).trim()) await writeTextFileExact(metaFile, payload);
      } catch (e) {}
    }
    var kids = Array.isArray(designRef.sub_designs) ? designRef.sub_designs : [];
    for (var i = 0; i < kids.length; i++) await syncDesignMetadataTree(ui, kids[i]);
  }

  async function filterExistingPagesForDesign(ui, designRef, pages, pageMeta) {
    pages = Array.isArray(pages) ? pages.slice() : [];
    pageMeta = pageMeta && typeof pageMeta === 'object' ? pageMeta : {};
    var keptPages = [];
    var keptMeta = {};
    for (var i = 0; i < pages.length; i++) {
      var pageName = text(pages[i]).trim();
      if (!pageName) continue;
      var abs = '';
      try { abs = resolveLocalPageFileAbs(ui, designRef, pageName); } catch (e) { abs = ''; }
      if (!abs || !await statExists(abs)) continue;
      keptPages.push(pageName);
      if (pageMeta[pageName] != null) keptMeta[pageName] = pageMeta[pageName];
    }
    return { pages: keptPages, page_meta: keptMeta };
  }

  async function reconcileDesignTreeWithDisk(ui, designRef) {
    if (!designRef) return designRef;
    var own = await filterExistingPagesForDesign(ui, designRef, designRef.pages, designRef.page_meta);
    designRef.pages = own.pages;
    designRef.page_meta = own.page_meta;

    var kids = Array.isArray(designRef.sub_designs) ? designRef.sub_designs : [];
    for (var i = 0; i < kids.length; i++) await reconcileDesignTreeWithDisk(ui, kids[i]);
    return designRef;
  }

  async function materializeSourceDesignBeforeCopy(ui, sourceDesign) {
    if (!ui || !sourceDesign) return;
    await maybeSaveActivePage(ui, 'copy-design');
    await reconcileDesignTreeWithDisk(ui, sourceDesign);
  }

  function triggerDesignMetadataSync(ui) {
    Promise.resolve().then(async function () {
      var model = ensureModel(ui);
      var designs = Array.isArray(model.designs) ? model.designs : [];
      for (var i = 0; i < designs.length; i++) await syncDesignMetadataTree(ui, designs[i]);
    }).catch(function () {});
  }

  async function fallbackSaveProjectFile(ui) {
    var model = ensureModel(ui);
    var root = getProjectStorageRoot(ui);
    if (!root) return;
    var file = ui._projectYamlFilePath || joinPath(root, sanitizeName(model.name || 'project') + '.dftart');
    ui._projectYamlFilePath = file;
    ui._projectYamlDir = root;
    var payload = {
      name: model.name || '',
      path: model.path || root,
      designs: [],
      ip_config_file: text(model.ip_config_file || 'ip_config.json')
    };
    for (var i = 0; i < model.designs.length; i++) payload.designs.push(serializeDesign(model.designs[i]));
    try {
      await ensureDirs(root);
      await writeTextFile(file, JSON.stringify(payload, null, 2));
    } catch (e) {}
  }

  function saveProjectYaml(ui, reason) {
    if (typeof global._autoSaveProjectYaml === 'function') {
      try { global._autoSaveProjectYaml(ui, reason || 'projectExplorer'); triggerDesignMetadataSync(ui); return; } catch (e) {}
    }
    fallbackSaveProjectFile(ui);
    triggerDesignMetadataSync(ui);
  }

  async function ensureProjectScaffoldOnDisk(ui) {
    var projectRoot = getProjectRoot(ui);
    var root = getProjectStorageRoot(ui);
    if (projectRoot) await ensureDirs(projectRoot);
    if (!root) return;
    await ensureDirs(root);
    var flowAbs = getProjectFlowAbsPath(ui);
    if (flowAbs && !await statExists(flowAbs)) {
      try { await writeTextFile(flowAbs, JSON.stringify({ project: ensureModel(ui).name || 'project' }, null, 2)); } catch (e) {}
    }
  }

  async function ensureIpConfigFile(ui) {
    var model = ensureModel(ui);
    var root = getProjectStorageRoot(ui);
    if (!root) return '';
    var rel = text(model.ip_config_file || 'ip_config.json') || 'ip_config.json';
    model.ip_config_file = rel;
    var abs = joinPath(root, rel);
    if (!await statExists(abs)) {
      try { await writeTextFile(abs, JSON.stringify({ pages: {} }, null, 2)); } catch (e) {}
    }
    return abs;
  }

  async function ensureIpconfigStorage(ui) {
    var ipc = getIpconfigContainer(ui, true);
    var base = getDesignAbsDir(ui, ipc);
    if (!base) return ipc;
    await ensureDirs(base);
    await ensureDirs(joinPath(base, 'page'));
    await ensureDirs(joinPath(base, 'yaml'));
    return ipc;
  }

  function getExistingRootIpconfigContainer(ui) {
    var model = ensureModel(ui);
    for (var i = 0; i < model.designs.length; i++) {
      var design = model.designs[i];
      if (!design || !isIpconfigDesign(design)) continue;
      var segs = Array.isArray(design._dirRel) ? design._dirRel : [];
      if (segs.length === 1 && normalizedName(segs[0]) === 'ipconfig') return design;
    }
    return null;
  }

  function ensureIpconfigScaffoldIfNeeded(ui) {
    var root = getProjectStorageRoot(ui);
    if (!root || !isProjectReady(ui)) return;
    var ipc = getExistingRootIpconfigContainer(ui);
    if (!ipc) return;
    var key = normalizePath(root);
    if (ui._ipconfigScaffoldEnsuredFor === key) return;
    ui._ipconfigScaffoldEnsuredFor = key;
    Promise.resolve()
      .then(function () {
        var base = getDesignAbsDir(ui, ipc);
        if (!base) return ipc;
        return ensureDirs(base)
          .then(function () { return ensureDirs(joinPath(base, 'page')); })
          .then(function () { return ensureDirs(joinPath(base, 'yaml')); })
          .then(function () { return ipc; });
      })
      .then(function () {
        saveProjectYaml(ui, 'ensureIpconfig');
        NS.refresh(ui);
      })
      .catch(function () {});
  }

  async function ensureFloorplanStorage(ui, parentDesign) {
    var fp = getFloorplanContainer(ui, true, parentDesign);
    var base = getDesignAbsDir(ui, fp);
    if (base) await ensureDirs(base);
    return fp;
  }

  function ensureProjectUiState(ui) {
    var root = ui._phase2ProjectExplorer || (ui._phase2ProjectExplorer = {});
    var st = getState(ui);
    st.expanded['project:root'] = true;
    root.state = st;
  }

  function clearProjectContext(ui) {
    if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.resetWorkspace === 'function') {
      try { global.DFTPageSessionManager.resetWorkspace(ui, 'Page-1'); } catch (e) {}
    }
    ui.projectModel = { name: '', path: '', designs: [], __placeholder: true };
    ui._projectRootPath = '';
    ui._projectYamlDir = '';
    ui._projectYamlFilePath = '';
    ui._projectDbDirPath = '';
    ui._projectDbFilePath = '';
    ui._projectRootDirHandle = null;
    ui._projectDbDirHandle = null;
    ui._projectDbFileHandle = null;
    ui._activeProjectPageCtx = null;
    ui._ipconfigScaffoldEnsuredFor = '';
    ensureProjectUiState(ui);
  }

    async function requestAny(payloads) {
        payloads = Array.isArray(payloads) ? payloads : [payloads];

        for (var i = 0; i < payloads.length; i++) {
            var payload = payloads[i];
            if (!payload) continue;

            try {
                var result = await request(payload);
                if (result == null) continue;
                if (typeof result === 'string' && !result.trim()) continue;
                if (Array.isArray(result) && !result.length) continue;

                if (typeof result === 'object') {
                    var filePaths = Array.isArray(result.filePaths)
                        ? result.filePaths
                        : (Array.isArray(result.paths) ? result.paths : null);

                    if (filePaths && !filePaths.length) continue;
                    if (!filePaths && !result.path && !result.filePath && !result.filename && !result.value && result.canceled === true) continue;
                }

                return result;
            } catch (e) {
                // keep trying the next picker backend
            }
        }

        return null;
    }

    async function chooseFolderPath(opts) {
        opts = opts || {};
        var title = opts.title || 'Select folder';

        try {
            var picked = await requestAny([
                { action: 'chooseDir', title: title },
                { action: 'pickFolder', title: title },
                { action: 'selectFolder', title: title },
                { action: 'showOpenDialog', title: title, properties: ['openDirectory', 'createDirectory'] }
            ]);

            if (Array.isArray(picked)) picked = picked[0];
            if (picked && typeof picked === 'object') {
                if (Array.isArray(picked.filePaths)) picked = picked.filePaths[0];
                else if (Array.isArray(picked.paths)) picked = picked.paths[0];
                else picked = picked.path || picked.filePath || picked.filename || picked.value || '';
            }

            picked = normalizePath(picked);
            if (picked) return picked;
        } catch (e) {
            // fall through
        }

        try {
            if (typeof global.showDirectoryPicker === 'function') {
                var handle = await global.showDirectoryPicker({
                    id: opts.pickerId || 'dft-project-folder',
                    mode: 'readwrite'
                });

                if (handle) {
                    var nativePath = normalizePath(handle.path || handle.fullPath || '');
                    if (nativePath) return nativePath;
                }
            }
        } catch (e2) {
            // fall through
        }

        // Final fallback: do not crash if prompt exists but is disabled in this runtime.
        try {
            if (typeof global.prompt === 'function') {
                var fallback = global.prompt(
                    title + '\n\nCurrent runtime did not return a folder path. Paste the folder path only if needed.',
                    opts.initialPath || ''
                );
                return normalizePath(fallback || '');
            }
        } catch (e3) {
            // prompt() exists but this runtime blocks it; just fail gracefully
        }

        return '';
    }


  function showDialog(ui, title, width, height, buildBody) {
    return new Promise(function (resolve) {
      var settled = false;
      function done(value) {
        if (settled) return;
        settled = true;
        try { if (ui && typeof ui.hideDialog === 'function') ui.hideDialog(); } catch (e) {}
        resolve(value);
      }

      if (!ui || typeof ui.showDialog !== 'function') {
        resolve(null);
        return;
      }

      var wrap = createEl('div', 'phase2-dlg');
      wrap.setAttribute('role', 'dialog');
      wrap.setAttribute('aria-label', title || 'Dialog');

      var head = createEl('div', 'phase2-dlg-head');
      head.appendChild(createEl('h3', 'phase2-dlg-title', title || 'Dialog'));
      wrap.appendChild(head);

      var body = createEl('div', 'phase2-dlg-body');
      wrap.appendChild(body);

      buildBody(body, done);
      ui.showDialog(wrap, width || 620, height || 320, true, true);
    });
  }

  function promptValue(ui, title, placeholder, initialValue) {
    return showDialog(ui, title || 'Input', 560, 220, function (body, done) {
      if (placeholder) body.appendChild(createEl('div', 'phase2-dlg-note', placeholder));

      var stack = createEl('div', 'phase2-field-stack');
      body.appendChild(stack);

      var input = createEl('input', 'phase2-input');
      input.type = 'text';
      input.value = initialValue || '';
      stack.appendChild(input);

      var actions = createEl('div', 'phase2-dlg-actions');
      body.appendChild(actions);

      var cancelBtn = createEl('button', 'phase2-btn ghost', (global.mxResources && global.mxResources.get ? (global.mxResources.get('cancel') || 'Cancel') : 'Cancel'));
      var okBtn = createEl('button', 'phase2-btn primary', (global.mxResources && global.mxResources.get ? (global.mxResources.get('apply') || 'Apply') : 'Apply'));

      cancelBtn.onclick = function () { done(null); };
      okBtn.onclick = function () { done(text(input.value).trim() || null); };

      actions.appendChild(cancelBtn);
      actions.appendChild(okBtn);

      input.onkeydown = function (evt) {
        if (evt.key === 'Enter') { evt.preventDefault(); done(text(input.value).trim() || null); }
        else if (evt.key === 'Escape') { evt.preventDefault(); done(null); }
      };
      setTimeout(function () { try { input.focus(); input.select(); } catch (e) {} }, 0);
    });
  }

  function makeDesignRecord(name, absDir, opts) {
    opts = opts || {};
    var design = {
      name: name,
      pages: [],
      sub_designs: [],
      env_file: '',
      page_meta: {}
    };
    if (opts.kind) design.__kind = opts.kind;
    if (absDir) design._absDir = normalizePath(absDir);
    if (opts.dirRel) design._dirRel = opts.dirRel.slice();
    return design;
  }

  function makeContainerDesignRecord(kind, parentDesign, ui) {
    var containerName = kind === 'floorplan' ? 'floorplan' : 'ipconfig';
    var parentDirRel = parentDesign && Array.isArray(parentDesign._dirRel) ? parentDesign._dirRel.slice() : [];
    var dirRel = parentDirRel.concat([containerName]);
    var parentAbs = parentDesign ? getDesignAbsDir(ui, parentDesign) : getProjectStorageRoot(ui);
    var absDir = parentAbs ? joinPath(parentAbs, containerName) : '';
    return makeDesignRecord(containerName, absDir, {
      dirRel: dirRel,
      kind: containerName + '-container'
    });
  }

  function ensureDesignContainers(designRef, ui) {
    if (!designRef || isFloorplanDesign(designRef) || isIpconfigDesign(designRef)) return designRef;
    if (!designRef._containers || typeof designRef._containers !== 'object') designRef._containers = {};
    if (!usesProjectFlow(designRef) && !designRef._containers.floorplan) designRef._containers.floorplan = makeContainerDesignRecord('floorplan', designRef, ui);
    if (!designRef._containers.ipconfig && !usesProjectFlow(designRef)) designRef._containers.ipconfig = makeContainerDesignRecord('ipconfig', designRef, ui);
    return designRef;
  }

  function ensureDefaultContainerChildren(designRef, ui) {
    if (!designRef || isFloorplanDesign(designRef) || isIpconfigDesign(designRef)) return designRef;
    return ensureDesignContainers(designRef, ui);
  }

  async function ensureNestedContainerStorage(ui, designRef) {
    if (!designRef || isFloorplanDesign(designRef) || isIpconfigDesign(designRef)) return;
    ensureDesignContainers(designRef, ui);
    hydrateDesignDirs(ui);

    var children = [];
    if (designRef._containers && designRef._containers.floorplan) children.push(designRef._containers.floorplan);
    if (designRef._containers && designRef._containers.ipconfig) children.push(designRef._containers.ipconfig);
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      var childBase = getDesignAbsDir(ui, child);
      if (!childBase) continue;
      await ensureDirs(childBase);
      if (isIpconfigDesign(child)) {
        await ensureDirs(joinPath(childBase, 'page'));
        await ensureDirs(joinPath(childBase, 'yaml'));
      }
    }
  }

  function findDesignByKey(list, key) {
    list = Array.isArray(list) ? list : [];
    for (var i = 0; i < list.length; i++) {
      var design = list[i];
      if (!design) continue;
      if (getDesignKey(design) === key) return design;
      var found = findDesignByKey(design.sub_designs, key);
      if (found) return found;
    }
    return null;
  }

  function findDesignByName(list, name) {
    list = Array.isArray(list) ? list : [];
    for (var i = 0; i < list.length; i++) {
      var design = list[i];
      if (!design) continue;
      if (!isFloorplanDesign(design) && !isIpconfigDesign(design) && text(design.name) === text(name)) return design;
      var found = findDesignByName(design.sub_designs, name);
      if (found) return found;
    }
    return null;
  }

  function collectDesignNames(list, out) {
    list = Array.isArray(list) ? list : [list];
    out = out || [];
    for (var i = 0; i < list.length; i++) {
      var design = list[i];
      if (!design || isFloorplanDesign(design) || isIpconfigDesign(design)) continue;
      out.push(text(design.name || ''));
      collectDesignNames(design.sub_designs, out);
    }
    return out;
  }

  function findOwningDesignBySelectedKey(list, selectedKey) {
    list = Array.isArray(list) ? list : [];
    for (var i = 0; i < list.length; i++) {
      var design = list[i];
      if (!design) continue;
      var key = getDesignKey(design);
      if (selectedKey === key || selectedKey.indexOf(key + ':') === 0) return design;
      var found = findOwningDesignBySelectedKey(design.sub_designs, selectedKey);
      if (found) return found;
    }
    return null;
  }

  function findParentDesignForChild(list, childRef) {
    list = Array.isArray(list) ? list : [];
    for (var i = 0; i < list.length; i++) {
      var design = list[i];
      if (!design) continue;
      var kids = Array.isArray(design.sub_designs) ? design.sub_designs : [];
      for (var j = 0; j < kids.length; j++) {
        if (kids[j] === childRef) return design;
      }
      var found = findParentDesignForChild(kids, childRef);
      if (found) return found;
    }
    return null;
  }

  function getAddDesignParent(ui) {
    return null;
  }

  function collectCopyableDesigns(list, out, prefix) {
    list = Array.isArray(list) ? list : [];
    out = out || [];
    prefix = prefix || [];
    for (var i = 0; i < list.length; i++) {
      var design = list[i];
      if (!design || isFloorplanDesign(design) || isIpconfigDesign(design)) continue;
      var pathSegs = prefix.concat([design.name || 'design']);
      out.push({ design: design, label: pathSegs.join(' / ') });
      collectCopyableDesigns(design.sub_designs, out, pathSegs);
    }
    return out;
  }

  function siblingListForParent(ui, parentDesign) {
    if (parentDesign) {
      parentDesign.sub_designs = Array.isArray(parentDesign.sub_designs) ? parentDesign.sub_designs : [];
      return parentDesign.sub_designs;
    }
    var model = ensureModel(ui);
    model.designs = Array.isArray(model.designs) ? model.designs : [];
    return model.designs;
  }

  async function ensureDesignFiles(ui, designRef) {
    if (!designRef) return;
    var designAbs = getDesignAbsDir(ui, designRef);
    if (!designAbs) return;
    await ensureDirs(designAbs);
    if (usesProjectFlow(designRef)) {
      await ensureDirs(getDesignPageDir(ui, designRef));
      await ensureDirs(getDesignYamlDir(ui, designRef));
      await ensureDirs(getDesignSpecDir(ui, designRef));
    } else if (!isFloorplanDesign(designRef)) {
      await ensureDirs(getDesignPageDir(ui, designRef));
    }
    if (isIpconfigDesign(designRef)) await ensureDirs(joinPath(designAbs, 'yaml'));
    if (!isFloorplanDesign(designRef) && !isIpconfigDesign(designRef) && !usesProjectFlow(designRef)) {
      var storageRoot = getProjectStorageRoot(ui);
      var envAbs = pathWithinRoot(storageRoot, designAbs) ? joinPath(storageRoot, designRef.env_file) : joinPath(designAbs, 'env.json');
      if (!await statExists(envAbs)) {
        try { await writeTextFile(envAbs, JSON.stringify({ design: designRef.name }, null, 2)); } catch (e) {}
      }
    }
    await syncDesignMetadataTree(ui, designRef);
  }

  async function loadExternalDesignTree(ui, absDir, ctx) {
    ctx = ctx || {};
    var meta = await readDesignManifest(absDir);
    var design = makeDesignRecord(meta.name, absDir, { dirRel: [sanitizeName(meta.name)], kind: text(meta.kind || '') || null });
    design.pages = Array.isArray(meta.pages) ? meta.pages.slice() : [];
    design.page_meta = meta.page_meta && typeof meta.page_meta === 'object' ? JSON.parse(JSON.stringify(meta.page_meta)) : {};
    ensureDesignContainers(design, ui);

    var floorplan = findDirectContainer(design, 'floorplan');
    if (floorplan && meta.containers && meta.containers.floorplan) {
      floorplan.pages = Array.isArray(meta.containers.floorplan.pages) ? meta.containers.floorplan.pages.slice() : [];
      floorplan.page_meta = meta.containers.floorplan.page_meta && typeof meta.containers.floorplan.page_meta === 'object'
        ? JSON.parse(JSON.stringify(meta.containers.floorplan.page_meta)) : {};
    }
    var ipconfig = findDirectContainer(design, 'ipconfig');
    if (ipconfig && meta.containers && meta.containers.ipconfig) {
      ipconfig.pages = Array.isArray(meta.containers.ipconfig.pages) ? meta.containers.ipconfig.pages.slice() : [];
      ipconfig.page_meta = meta.containers.ipconfig.page_meta && typeof meta.containers.ipconfig.page_meta === 'object'
        ? JSON.parse(JSON.stringify(meta.containers.ipconfig.page_meta)) : {};
    }

    var loadRoot = normalizePath(ctx.rootDir || dirnamePath(absDir));
    var visited = ctx.visited || Object.create(null);
    var visitKey = normalizePath(absDir);
    if (visited[visitKey]) return design;
    visited[visitKey] = true;

    var children = Array.isArray(meta.children) ? meta.children : [];
    for (var i = 0; i < children.length; i++) {
      var childRef = text(children[i] && (children[i].ref || children[i].name) || '').trim();
      if (!childRef) continue;
      var childAbs = joinPath(loadRoot, sanitizeName(childRef));
      if (!await statExistsExact(designMetaPath(childAbs))) throw new Error('Child design metadata not found: ' + childRef);
      design.sub_designs.push(await loadExternalDesignTree(ui, childAbs, { rootDir: loadRoot, visited: visited }));
    }
    await reconcileDesignTreeWithDisk(ui, design);
    return design;
  }

  function buildClonedDesignTree(ui, sourceDesign, targetName, targetAbs, targetDirRel) {
    var clone = cloneDesignRecord(sourceDesign, targetName, targetAbs, targetDirRel);
    var srcKids = Array.isArray(sourceDesign.sub_designs) ? sourceDesign.sub_designs : [];
    for (var i = 0; i < srcKids.length; i++) {
      var child = srcKids[i];
      var childName = child.name || 'design';
      var childAbs = joinPath(getProjectStorageRoot(ui), sanitizeName(childName));
      clone.sub_designs.push(buildClonedDesignTree(ui, child, childName, childAbs, [sanitizeName(childName)]));
    }
    if (!isFloorplanDesign(clone) && !isIpconfigDesign(clone)) ensureDesignContainers(clone, ui);
    return clone;
  }

  async function createDesignInContext(ui, parentDesign, name, sourceDesign, opts) {
    opts = opts || {};
    name = text(name).trim();
    var designNameError = validateScopedName(name, 'Design name', { disallowReserved: true });
    if (designNameError) throw new Error(designNameError);

    var siblings = siblingListForParent(ui, parentDesign);
    var existingByName = findDesignByName(ensureModel(ui).designs, name);
    if (existingByName) throw new Error('Design already exists: ' + name);
    if (sourceDesign) {
      var importNames = collectDesignNames(sourceDesign.sub_designs || [], []);
      for (var n = 0; n < importNames.length; n++) {
        if (findDesignByName(ensureModel(ui).designs, importNames[n])) {
          throw new Error('Import name conflict: ' + importNames[n]);
        }
      }
    }

    var storageRoot = getProjectStorageRoot(ui);
    if (!storageRoot) throw new Error('Create or open a project first.');
    var targetAbs = joinPath(storageRoot, sanitizeName(name));
    var sourceAbs = sourceDesign ? getDesignAbsDir(ui, sourceDesign) : '';
    if (sourceAbs && pathWithinRoot(sourceAbs, targetAbs)) {
      throw new Error('Cannot copy a design into itself or one of its descendants.');
    }
    var targetDirRel = [sanitizeName(name)];

    var design = sourceDesign
      ? buildClonedDesignTree(ui, sourceDesign, name, targetAbs, targetDirRel)
      : makeDesignRecord(name, targetAbs, { dirRel: targetDirRel, kind: opts.kind || '' });

    if (!sourceDesign) ensureDesignContainers(design, ui);
    siblings.push(design);
    markProjectReady(ensureModel(ui));
    hydrateDesignDirs(ui);

    if (sourceDesign) {
      await materializeSourceDesignBeforeCopy(ui, sourceDesign);
      await copyDesignFilesByModel(ui, sourceDesign, design);
      await ensureDesignFiles(ui, design);
      await ensureNestedContainerStorage(ui, design);
      await reconcileDesignTreeWithDisk(ui, design);
      await syncDesignMetadataTree(ui, design);
    }
    else {
      await ensureDesignFiles(ui, design);
      await ensureNestedContainerStorage(ui, design);
    }

    var st = getState(ui);
    if (parentDesign) st.expanded[getDesignKey(parentDesign)] = true;
    st.expanded[getDesignKey(design)] = true;
    st.expanded[getDesignKey(design) + ':pages'] = true;
    saveProjectYaml(ui, sourceDesign ? 'copyDesign' : 'addDesign');
    setStatus(ui, (sourceDesign ? 'Copied design: ' : 'Added design: ') + name);
    NS.refresh(ui);
    return design;
  }

  async function createProject(ui, projectName, parentPath) {
    projectName = text(projectName).trim();
    parentPath = normalizePath(parentPath);
    var projectNameError = validateScopedName(projectName, 'Project name');
    if (projectNameError) throw new Error(projectNameError);
    if (!parentPath) throw new Error('Please select a project path.');

    var rootPath = joinPath(parentPath, sanitizeName(projectName));
    var model = { name: projectName, path: rootPath, designs: [], ip_config_file: 'ip_config.json', flow_file: 'env.json', __placeholder: false, __createdByProjectExplorer: true };
    ui.projectModel = model;
    ui._projectRootPath = rootPath;
    ui._projectYamlDir = joinPath(rootPath, 'db');
    ui._projectYamlFilePath = joinPath(rootPath, 'db', sanitizeName(projectName) + '.dftart');
    ui._projectDbDirPath = joinPath(rootPath, 'db');
    ui._projectDbFilePath = joinPath(rootPath, 'db', 'project.db');
    ui._projectRootDirHandle = null;
    ui._projectDbDirHandle = null;
    ui._projectDbFileHandle = null;
    ui._activeProjectPageCtx = null;

    ensureProjectUiState(ui);
    hydrateDesignDirs(ui);
    await ensureProjectScaffoldOnDisk(ui);
    await ensureFloorplanStorage(ui);
    await ensureIpconfigStorage(ui);
    await ensureIpConfigFile(ui);
    saveProjectYaml(ui, 'createProject');
    if (typeof ui.updatePageTabs === 'function') ui.updatePageTabs();
    NS.refresh(ui);
    return model;
  }

  async function createTopLevelDesign(ui, designName, targetPath, opts) {
    opts = opts || {};
    designName = text(designName).trim();
    targetPath = normalizePath(targetPath);
    var designNameError = validateScopedName(designName, 'Design name', { disallowReserved: true });
    if (designNameError) throw new Error(designNameError);
    if (!targetPath) throw new Error('Please select a design path.');

    var designDirName = sanitizeName(designName);
    var designAbsPath = joinPath(targetPath, designDirName);

    var model = ensureModel(ui);
    if (!isProjectReady(ui)) {
      model = {
        name: designName,
        path: designAbsPath,
        designs: [],
        flow_file: 'env.json',
        __placeholder: false,
        __createdByProjectExplorer: true
      };
      ui.projectModel = model;
      ui._projectRootPath = designAbsPath;
      ui._projectYamlDir = joinPath(designAbsPath, 'db');
      ui._projectYamlFilePath = joinPath(designAbsPath, 'db', designDirName + '.dftart');
      ui._projectDbDirPath = joinPath(designAbsPath, 'db');
      ui._projectDbFilePath = joinPath(designAbsPath, 'db', 'project.db');
      ui._projectRootDirHandle = null;
      ui._projectDbDirHandle = null;
      ui._projectDbFileHandle = null;
      ui._activeProjectPageCtx = null;
      ensureProjectUiState(ui);
    }

    for (var i = 0; i < model.designs.length; i++) {
      if (model.designs[i] && !isFloorplanDesign(model.designs[i]) && model.designs[i].name === designName) {
        throw new Error('Design already exists: ' + designName);
      }
    }

    var storageRoot = getProjectStorageRoot(ui);
    var designStorageAbsPath = joinPath(storageRoot, designDirName);
    var dirRel = relSegsFromRoot(storageRoot, designStorageAbsPath);
    var design = makeDesignRecord(designName, designStorageAbsPath, {
      dirRel: dirRel || [designDirName],
      kind: opts.kind || ''
    });
    model.designs.push(design);
    markProjectReady(model);
    ensureDesignContainers(design, ui);
    hydrateDesignDirs(ui);

    var designAbs = getDesignAbsDir(ui, design);
    if (designAbs) {
      await ensureDirs(designAbs);
      await ensureDirs(joinPath(designAbs, 'page'));
      if (design.env_file && !isIpconfigDesign(design) && !usesProjectFlow(design)) {
        var envAbs = joinPath(storageRoot, design.env_file);
        if (!pathWithinRoot(storageRoot, designAbs)) envAbs = joinPath(designAbs, 'env.json');
        if (!await statExists(envAbs)) {
          try { await writeTextFile(envAbs, JSON.stringify({ design: design.name }, null, 2)); } catch (e2) {}
        }
      }
    }
    await ensureNestedContainerStorage(ui, design);
    await syncDesignMetadataTree(ui, design);

    var st = getState(ui);
    st.expanded[getDesignKey(design)] = true;
    st.expanded[getDesignKey(design) + ':pages'] = true;
    saveProjectYaml(ui, 'addTopDesign');
    setStatus(ui, 'Added design: ' + designName);
    NS.refresh(ui);
    return design;
  }

  async function addSubDesign(ui, designRef) {
    if (!designRef) return;
    var name = await promptValue(ui, 'New sub-design for "' + designRef.name + '"', 'Enter sub-design name', '');
    if (!name) return;
    var subDesignError = validateScopedName(name, 'Sub-design name', { disallowReserved: true });
    if (subDesignError) {
      global.alert(subDesignError);
      return;
    }
    designRef.sub_designs = Array.isArray(designRef.sub_designs) ? designRef.sub_designs : [];
    if (findDesignByName(ensureModel(ui).designs, name)) {
      global.alert('Design already exists: ' + name);
      return;
    }
    var child = makeDesignRecord(name, joinPath(getProjectStorageRoot(ui), sanitizeName(name)), { dirRel: [sanitizeName(name)] });
    designRef.sub_designs.push(child);
    ensureDesignContainers(child, ui);
    hydrateDesignDirs(ui);
    try {
      await ensureDirs(getDesignAbsDir(ui, child));
      await ensureDirs(joinPath(getDesignAbsDir(ui, child), 'page'));
    } catch (e) {}
    try { await ensureNestedContainerStorage(ui, child); } catch (e2) {}
    try { await syncDesignMetadataTree(ui, child); } catch (e3) {}
    var state = getState(ui);
    state.expanded[getDesignKey(designRef)] = true;
    state.expanded[getDesignKey(child)] = true;
    state.expanded[getDesignKey(child) + ':pages'] = true;
    saveProjectYaml(ui, 'addSubDesign');
    setStatus(ui, 'Added sub-design: ' + name);
    NS.refresh(ui);
  }

  async function openPage(ui, designRef, pageName) {
    if (!ui || !designRef || !pageName) return;
    if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.openPage === 'function') {
      try {
        await global.DFTPageSessionManager.openPage(ui, designRef, pageName, { source: 'project-explorer' });
        NS.refresh(ui);
        return;
      } catch (e) {
        if (ui && typeof ui.handleError === 'function') ui.handleError(e, true);
        else console.error(e);
        return;
      }
    }
    try {
      await maybeSaveActivePage(ui, 'open-page');
      ensurePageTab(ui, pageName);
      var abs = resolveLocalPageFileAbs(ui, designRef, pageName);
      setActivePageCtx(ui, designRef, pageName, abs || null);
      var exists = await statExists(abs);
      if (exists) {
        var xml = await readTextFile(abs);
        if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.loadPageXmlToCurrent === 'function') await global.DFTPageSessionManager.loadPageXmlToCurrent(ui, xml);
        else if (typeof global._loadPageXmlToCurrent === 'function') await global._loadPageXmlToCurrent(ui, xml);
      } else {
        clearGraphPage(ui);
      }
      if (typeof ui.updatePageTabs === 'function') ui.updatePageTabs();
      setStatus(ui, 'Opened page: ' + pageName);
      NS.refresh(ui);
    } catch (e2) {
      if (ui && typeof ui.handleError === 'function') ui.handleError(e2, true);
      else console.error(e2);
    }
  }

  function ensurePageRecord(designRef, pageName) {
    designRef.pages = Array.isArray(designRef.pages) ? designRef.pages : [];
    if (designRef.pages.indexOf(pageName) >= 0) return false;
    designRef.pages.push(pageName);
    return true;
  }

  async function addStandardPage(ui, designRef, pageName) {
    if (!designRef || !pageName) return false;
    if (Array.isArray(designRef.pages) && designRef.pages.indexOf(pageName) >= 0) throw new Error('Page already exists: ' + pageName);
    await maybeSaveActivePage(ui, 'add-page');
    ensurePageRecord(designRef, pageName);
    await createPageFileSlot(ui, designRef, pageName);
    var key = getDesignKey(designRef);
    var state = getState(ui);
    state.expanded[key] = true;
    state.expanded[key + ':pages'] = true;
    saveProjectYaml(ui, isFloorplanDesign(designRef) ? 'addFloorplanPage' : 'addPage');
    if (typeof ui.updatePageTabs === 'function') ui.updatePageTabs();
    NS.refresh(ui);
    return true;
  }

  function floorplanPageName(ownerDesign) {
    return 'dataflow';
  }

  async function showFloorplanPageDialog(ui) {
    return showDialog(ui, 'Create Floorplan Page', 640, 360, function (body, done) {
      body.appendChild(createEl('div', 'phase2-dlg-note', 'Choose the floorplan structure to generate. A single floorplan page will be created, and DFT content can be managed with layers inside that page.'));

      var grid = createEl('div', 'phase2-dlg-grid');
      body.appendChild(grid);

      var structures = ['Hierarchical', 'Tiling'];
      var selectedStructure = 'Hierarchical';
      var structureCards = [];

      function syncStructureCards() {
        for (var i = 0; i < structureCards.length; i++) {
          var item = structureCards[i];
          item.card.className = item.value === selectedStructure ? 'phase2-choice-card active' : 'phase2-choice-card';
          item.input.checked = item.value === selectedStructure;
        }
      }

      grid.appendChild(createEl('div', 'phase2-dlg-label', 'Structure'));
      var structureWrap = createEl('div', 'phase2-choice-grid');
      for (var i = 0; i < structures.length; i++) {
        (function (value) {
          var label = createEl('label', 'phase2-choice-card');
          var radio = createEl('input');
          radio.type = 'radio';
          radio.name = 'phase2-floorplan-structure';
          radio.checked = value === selectedStructure;
          radio.onchange = function () { if (radio.checked) { selectedStructure = value; syncStructureCards(); } };
          label.appendChild(radio);
          label.appendChild(createEl('span', null, value));
          label.onclick = function () { selectedStructure = value; syncStructureCards(); };
          structureWrap.appendChild(label);
          structureCards.push({ value: value, card: label, input: radio });
        })(structures[i]);
      }
      grid.appendChild(structureWrap);

      var actions = createEl('div', 'phase2-dlg-actions');
      body.appendChild(actions);
      var cancelBtn = createEl('button', 'phase2-btn ghost', (global.mxResources && global.mxResources.get ? (global.mxResources.get('cancel') || 'Cancel') : 'Cancel'));
      var okBtn = createEl('button', 'phase2-btn primary', (global.mxResources && global.mxResources.get ? (global.mxResources.get('create') || 'Create') : 'Create'));

      function submit() {
        done({ structure: selectedStructure });
      }

      cancelBtn.onclick = function () { done(null); };
      okBtn.onclick = submit;
      actions.appendChild(cancelBtn);
      actions.appendChild(okBtn);
      syncStructureCards();
    });
  }

  async function createFloorplanPages(ui, selection, opts) {
    opts = opts || {};
    var model = ensureModel(ui);
    if (!isProjectReady(ui)) throw new Error('Create or open a project first.');
    selection = selection || await showFloorplanPageDialog(ui);
    if (!selection) return { created: [], skipped: [] };
    var targetDesign = opts.targetDesign || null;
    var fp = null;
    var pageOwner = null;
    if (targetDesign && isFloorplanDesign(targetDesign)) {
      fp = targetDesign;
      pageOwner = opts.parentDesign || findParentDesignForChild(model.designs, targetDesign);
    }
    else if (targetDesign && !isIpconfigDesign(targetDesign)) {
      pageOwner = targetDesign;
      fp = await ensureFloorplanStorage(ui, targetDesign);
    }
    else {
      fp = await ensureFloorplanStorage(ui);
    }
    fp.page_meta = fp.page_meta || {};
    var created = [];
    var skipped = [];
    var pageName = floorplanPageName(pageOwner || null);
    if (Array.isArray(fp.pages) && fp.pages.indexOf(pageName) >= 0) {
      skipped.push(pageName);
      fp.page_meta[pageName] = { structure: selection.structure, kind: 'floorplan' };
    }
    else {
      await addStandardPage(ui, fp, pageName);
      fp.page_meta[pageName] = { structure: selection.structure, kind: 'floorplan' };
      created.push(pageName);
    }
    saveProjectYaml(ui, 'createFloorplanPages');
    if (created.length && opts.openFirst !== false) await openPage(ui, fp, created[0]);
    setStatus(ui, created.length ? ('Created floorplan page: ' + created[0]) : 'Floorplan page already exists.');
    NS.refresh(ui);
    return { design: fp, owner: pageOwner, created: created, skipped: skipped, selection: selection };
  }

  async function openDefaultFloorplan(ui) {
    var fp = getFloorplanContainer(ui, true);
    if (!fp.pages || !fp.pages.length) return createFloorplanPages(ui, null, { openFirst: true });
    return openPage(ui, fp, fp.pages[0]);
  }

  async function addPage(ui, designRef) {
    if (!designRef) return;
    if (isFloorplanDesign(designRef)) {
      return createFloorplanPages(ui, null, { openFirst: true });
    }
    var name = await promptValue(ui, 'New page for "' + designRef.name + '"', 'Enter page name', '');
    if (!name) return;
    var pageNameError = validateScopedName(name, 'Page name');
    if (pageNameError) {
      global.alert(pageNameError);
      return;
    }
    try {
      await addStandardPage(ui, designRef, name);
      await openPage(ui, designRef, name);
    } catch (e) {
      global.alert(e && e.message ? e.message : String(e));
    }
  }

  async function duplicatePage(ui, designRef, pageName) {
    if (!designRef || !pageName) return;
    var newName = await promptValue(ui, 'Duplicate page "' + pageName + '"', 'New page name', pageName + '_copy');
    if (!newName || newName === pageName) return;
    var duplicateNameError = validateScopedName(newName, 'Page name');
    if (duplicateNameError) {
      global.alert(duplicateNameError);
      return;
    }
    if (Array.isArray(designRef.pages) && designRef.pages.indexOf(newName) >= 0) {
      global.alert('Page already exists: ' + newName);
      return;
    }
    var src = resolveLocalPageFileAbs(ui, designRef, pageName);
    var dst = resolveLocalPageFileAbs(ui, designRef, newName);
    try {
      var xml = await readTextFile(src);
      ensurePageRecord(designRef, newName);
      await ensureDirs(dirnamePath(dst));
      await writeTextFile(dst, xml);
      saveProjectYaml(ui, 'duplicatePage');
      await openPage(ui, designRef, newName);
    } catch (e) {
      global.alert('Failed to duplicate page: ' + (e && e.message ? e.message : e));
    }
    NS.refresh(ui);
  }

  async function renamePage(ui, designRef, pageName) {
    if (!designRef || !pageName) return;
    var newName = await promptValue(ui, 'Rename page "' + pageName + '"', 'New page name', pageName);
    if (!newName || newName === pageName) return;
    var renameNameError = validateScopedName(newName, 'Page name');
    if (renameNameError) {
      global.alert(renameNameError);
      return;
    }
    if (Array.isArray(designRef.pages) && designRef.pages.indexOf(newName) >= 0) {
      global.alert('Page already exists: ' + newName);
      return;
    }
    try {
      var src = resolveLocalPageFileAbs(ui, designRef, pageName);
      var dst = resolveLocalPageFileAbs(ui, designRef, newName);
      var xml = await readTextFile(src);
      await ensureDirs(dirnamePath(dst));
      await writeTextFile(dst, xml);
      await deleteFile(src);
      designRef.pages = (designRef.pages || []).map(function (v) { return v === pageName ? newName : v; });
      if (designRef.page_meta && designRef.page_meta[pageName]) {
        designRef.page_meta[newName] = designRef.page_meta[pageName];
        delete designRef.page_meta[pageName];
      }
      saveProjectYaml(ui, 'renamePage');
      if (activePageName(ui) === pageName) await openPage(ui, designRef, newName);
      NS.refresh(ui);
    } catch (e) {
      global.alert('Failed to rename page: ' + (e && e.message ? e.message : e));
    }
  }

  async function deletePageAction(ui, designRef, pageName) {
    if (!designRef || !pageName) return;
    if (!global.confirm('Delete page "' + pageName + '" ?')) return;
    designRef.pages = (designRef.pages || []).filter(function (v) { return v !== pageName; });
    if (designRef.page_meta && designRef.page_meta[pageName]) delete designRef.page_meta[pageName];
    try { await deleteFile(resolveLocalPageFileAbs(ui, designRef, pageName)); } catch (e) {}
    saveProjectYaml(ui, 'deletePage');
    NS.refresh(ui);
  }

  function designContainsActiveContext(ui, designRef) {
    if (!ui || !designRef) return false;
    var ctx = activePageCtx(ui);
    if (!ctx) return false;

    var targetKey = getDesignKey(designRef);
    if (ctx.designRef) {
      var activeDesignKey = getDesignKey(ctx.designRef);
      return activeDesignKey === targetKey || activeDesignKey.indexOf(targetKey + '/') === 0;
    }
    if (ctx.designKey) {
      return text(ctx.designKey) === targetKey || text(ctx.designKey).indexOf(targetKey + '/') === 0;
    }

    var ctxSegs = Array.isArray(ctx.segs) ? ctx.segs : [];
    var designSegs = Array.isArray(designRef._dirRel) ? designRef._dirRel : [];
    if (!ctxSegs.length || !designSegs.length || ctxSegs.length < designSegs.length) return false;
    for (var i = 0; i < designSegs.length; i++) {
      if (ctxSegs[i] !== designSegs[i]) return false;
    }
    return true;
  }

  function removeDesignFromTree(list, designRef) {
    list = Array.isArray(list) ? list : [];
    var idx = list.indexOf(designRef);
    if (idx >= 0) {
      list.splice(idx, 1);
      return true;
    }
    for (var i = 0; i < list.length; i++) {
      var design = list[i];
      if (design && removeDesignFromTree(design.sub_designs, designRef)) return true;
    }
    return false;
  }

  async function deleteDesignAction(ui, designRef) {
    if (!ui || !designRef || isFloorplanDesign(designRef) || isIpconfigDesign(designRef)) return;
    if (!global.confirm('Delete design "' + designRef.name + '" and all its pages/sub-designs?')) return;

    await maybeSaveActivePage(ui, 'delete-design');

    var model = ensureModel(ui);
    if (!removeDesignFromTree(model.designs, designRef)) return;

    if (designContainsActiveContext(ui, designRef)) {
      ui._activeProjectPageCtx = null;
      clearGraphPage(ui);
    }

    closeContextMenu(ui);
    try { await deleteDir(getDesignAbsDir(ui, designRef)); } catch (e) {}

    var state = getState(ui);
    delete state.expanded[getDesignKey(designRef)];
    delete state.expanded[getDesignKey(designRef) + ':pages'];

    saveProjectYaml(ui, 'deleteDesign');
    setStatus(ui, 'Deleted design: ' + (designRef.name || 'design'));
    NS.refresh(ui);
  }

  function showTextDialog(ui, title, textContent) {
    if (!ui || typeof ui.showDialog !== 'function') {
      global.alert(title + '\n\n' + textContent);
      return;
    }
    var wrap = createEl('div', 'phase2-dlg');
    wrap.style.minWidth = '560px';
    wrap.appendChild(createEl('h3', null, title));
    var ta = createEl('textarea');
    ta.className = 'geInput';
    ta.style.width = '100%';
    ta.style.height = '260px';
    ta.value = textContent || '';
    wrap.appendChild(ta);
    var btns = createEl('div', 'phase2-dlg-actions');
    var closeBtn = global.mxUtils && typeof global.mxUtils.button === 'function'
      ? global.mxUtils.button((global.mxResources && global.mxResources.get ? (global.mxResources.get('close') || 'Close') : 'Close'), function () { ui.hideDialog(); })
      : createEl('button', null, 'Close');
    if (!closeBtn.onclick) closeBtn.onclick = function () { ui.hideDialog(); };
    btns.appendChild(closeBtn);
    wrap.appendChild(btns);
    ui.showDialog(wrap, 600, 380, true, true);
    ta.focus(); ta.select();
  }

  async function openProjectEnv(ui) {
    if (!ui) return;
    try {
      if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.captureActiveViewState === 'function') {
        global.DFTPageSessionManager.captureActiveViewState(ui);
      }
    } catch (captureErr) {}
    var model = ensureModel(ui);
    var designBase = getProjectStorageRoot(ui) || '';
    var envRef = getProjectFlowRelPath(ui);
    var abs = getProjectFlowAbsPath(ui);
    if (typeof global.dftArtistOpenWorkspaceEmbedTab === 'function' && typeof global.dftArtistMountLoadPanel === 'function') {
      var tabKey = 'env:project:' + normalizePath(abs || envRef || model.name || 'project');
      var tabLabel = 'Flow';
      var frameTitle = 'Flow';
      try {
        ui._activeEnvCtx = {
          designKey: 'project:flow',
          designRef: null,
          abs: abs || null
        };
      } catch (ctxErr) {}
      global.dftArtistOpenWorkspaceEmbedTab({
        ui: ui,
        key: tabKey,
        label: tabLabel,
        title: frameTitle,
        closable: true,
        render: function (panel) {
          global.dftArtistMountLoadPanel(panel, {
            title: frameTitle,
            designName: model.name || 'project',
            envFile: envRef || 'env.json',
            designDir: designBase || ''
          });
        }
      });
      if (typeof ui.refreshProjectExplorer === 'function') ui.refreshProjectExplorer();
      return;
    }
    var content = 'env_file: ' + (envRef || 'env.json');
    try {
      var txt = await readTextFile(abs);
      content = txt || content;
    } catch (e) {}
    try {
      ui._activeEnvCtx = {
        designKey: 'project:flow',
        designRef: null,
        abs: abs || null
      };
    } catch (ctxErr2) {}
    if (typeof ui.refreshProjectExplorer === 'function') ui.refreshProjectExplorer();
    showTextDialog(ui, 'Flow', content);
  }

  async function openEnv(ui, designRef) {
    if (!ui || !designRef) return;
    if (usesProjectFlow(designRef)) return openProjectEnv(ui);
    try {
      if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.captureActiveViewState === 'function') {
        global.DFTPageSessionManager.captureActiveViewState(ui);
      }
    } catch (captureErr) {}
    if (isFloorplanDesign(designRef) || isIpconfigDesign(designRef)) {
      showTextDialog(ui, 'ip_config', JSON.stringify({ file: ensureModel(ui).ip_config_file || 'ip_config.json' }, null, 2));
      return;
    }
    var rootPath = getProjectStorageRoot(ui) || '';
    var designBase = getDesignAbsDir(ui, designRef);
    var envRef = text(designRef && designRef.env_file || '').trim();
    var abs = '';
    if (envRef) {
      abs = pathWithinRoot(rootPath, designBase) ? joinPath(rootPath, envRef) : joinPath(designBase, envRef);
    } else {
      abs = joinPath(designBase, 'env.json');
    }
    if (!/\.[A-Za-z0-9]+$/.test(abs)) abs = joinPath(abs, 'env.json');
    if (typeof global.dftArtistOpenWorkspaceEmbedTab === 'function' && typeof global.dftArtistMountLoadPanel === 'function') {
      var tabKey = 'env:' + normalizePath(abs || designRef.env_file || designRef.name || 'design');
      var tabLabel = 'Flow: ' + (designRef.name || 'design');
      var frameTitle = tabLabel;
      try {
        ui._activeEnvCtx = {
          designKey: getDesignKey(designRef),
          designRef: designRef,
          abs: abs || null
        };
      } catch (ctxErr) {}
      global.dftArtistOpenWorkspaceEmbedTab({
        ui: ui,
        key: tabKey,
        label: tabLabel,
        title: frameTitle,
        closable: true,
        render: function (panel) {
          global.dftArtistMountLoadPanel(panel, {
            title: frameTitle,
            designName: designRef.name || 'design',
            envFile: designRef.env_file || 'env.json',
            designDir: designBase || ''
          });
        }
      });
      if (typeof ui.refreshProjectExplorer === 'function') ui.refreshProjectExplorer();
      return;
    }
    var content = 'env_file: ' + (designRef.env_file || 'env.json');
    try {
      var txt = await readTextFile(abs);
      content = txt || content;
    } catch (e) {}
    try {
      ui._activeEnvCtx = {
        designKey: getDesignKey(designRef),
        designRef: designRef,
        abs: abs || null
      };
    } catch (ctxErr2) {}
    if (typeof ui.refreshProjectExplorer === 'function') ui.refreshProjectExplorer();
    showTextDialog(ui, 'Flow: ' + designRef.name, content);
  }

  function openDesignSpec(ui) {
    if (!ui) return;
    try {
      if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.captureActiveViewState === 'function') {
        global.DFTPageSessionManager.captureActiveViewState(ui);
      }
    } catch (captureErr) {}
    if (typeof global.dftArtistOpenWorkspaceEmbedTab === 'function' && typeof global.dftArtistMountStatusPanel === 'function') {
      global.dftArtistOpenWorkspaceEmbedTab({
        ui: ui,
        key: 'project:dft_design_spec',
        label: 'DFT_Design_Spec',
        title: 'DFT_Design_Spec',
        closable: true,
        render: function (panel) {
          global.dftArtistMountStatusPanel(panel, {
            title: 'DFT_Design_Spec',
            subtitle: ensureModel(ui).name || 'project'
          });
        }
      });
      return;
    }
    if (typeof global.dftArtistAnalysis === 'function') {
      global.dftArtistAnalysis();
      return;
    }
    if (global.DFTAnalysis && typeof global.DFTAnalysis.open === 'function') {
      global.DFTAnalysis.open();
      return;
    }
    showTextDialog(ui, 'DFT_Design_Spec', 'DFT_Design_Spec is unavailable.');
  }

  function designMatchesQuery(design, query) {
    if (!query) return true;
    if (isFloorplanDesign(design) && contains(ROOT_FLOORPLAN_DIR, query)) return true;
    if (contains(design.name, query) || (!isIpconfigDesign(design) && contains(design.env_file, query)) || contains(isFloorplanDesign(design) ? 'floorplan-container' : design.__kind, query)) return true;
    var pages = Array.isArray(design.pages) ? design.pages : [];
    for (var i = 0; i < pages.length; i++) if (contains(pages[i], query)) return true;
    var kids = Array.isArray(design.sub_designs) ? design.sub_designs : [];
    for (var j = 0; j < kids.length; j++) if (designMatchesQuery(kids[j], query)) return true;
    return false;
  }

  function isExpanded(state, key, def) {
    return Object.prototype.hasOwnProperty.call(state.expanded, key) ? !!state.expanded[key] : !!def;
  }

  function toggleExpanded(ui, key, def) {
    var state = getState(ui);
    state.expanded[key] = !isExpanded(state, key, def);
    NS.refresh(ui);
  }

  function closeContextMenu(ui) {
    var root = ui._phase2ProjectExplorer;
    if (root && root.menuEl && root.menuEl.parentNode) root.menuEl.parentNode.removeChild(root.menuEl);
    if (root) root.menuEl = null;
  }

  function showContextMenu(ui, evt, items) {
    evt.preventDefault();
    evt.stopPropagation();
    closeContextMenu(ui);
    if (!items || !items.length) return;
    var menu = createEl('div', 'phase2-context-menu');
    menu.onmousedown = function (e) { if (e) e.stopPropagation(); };
    for (var i = 0; i < items.length; i++) {
      if (!items[i] || items[i].hidden) continue;
      var item = createEl('div', 'phase2-context-item', items[i].label);
      (function (handler) {
        item.onmousedown = function (e) {
          if (e) { e.preventDefault(); e.stopPropagation(); }
          closeContextMenu(ui);
          if (typeof handler === 'function') handler();
        };
        item.onclick = function (e) { if (e) { e.preventDefault(); e.stopPropagation(); } };
      })(items[i].handler);
      menu.appendChild(item);
    }
    if (!menu.childNodes.length) return;
    menu.style.left = evt.clientX + 'px';
    menu.style.top = evt.clientY + 'px';
    document.body.appendChild(menu);
    var rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) menu.style.left = Math.max(8, window.innerWidth - rect.width - 8) + 'px';
    if (rect.bottom > window.innerHeight - 8) menu.style.top = Math.max(8, window.innerHeight - rect.height - 8) + 'px';
    ui._phase2ProjectExplorer.menuEl = menu;
  }

  function ensureMenuBinding(ui) {
    var state = getState(ui);
    if (state.menuBound) return;
    document.addEventListener('mousedown', function (evt) {
      var root = ui._phase2ProjectExplorer;
      if (!root || !root.menuEl) return;
      var target = evt && evt.target;
      if (target && root.menuEl.contains(target)) return;
      closeContextMenu(ui);
    });
    state.menuBound = true;
  }

  function createNode(ui, config) {
    var state = getState(ui);
    var row = createEl('div', 'phase2-node');
    if (config.key) row.setAttribute('data-node-key', config.key);
    row.style.paddingLeft = (6 + (config.depth || 0) * 16) + 'px';
    if (config.key && (state.selectedKey === config.key || (ui && ui._activeWorkspaceKey === config.key))) row.className += ' selected';
    if (config.activePage) row.className += ' active-page';
    if (config.dim) row.className += ' dim';

    var caret = createEl('span', 'caret', config.hasChildren ? (config.open ? '▾' : '▸') : '');
    if (config.hasChildren && typeof config.onToggle === 'function') caret.onclick = function (evt) { evt.preventDefault(); evt.stopPropagation(); config.onToggle(); };
    row.appendChild(caret);
    row.appendChild(createEl('span', 'icon', config.icon || ''));

    var label = createEl('span', 'label', config.label || '');
    if (config.meta) {
      var meta = createEl('span', 'meta', '  ' + config.meta);
      label.appendChild(meta);
    }
    var invokeClick = function (evt) {
      if (evt) { evt.preventDefault(); evt.stopPropagation(); }
      if (config.key) state.selectedKey = config.key;
      if (typeof config.onClick === 'function') config.onClick(evt);
      else NS.refresh(ui);
    };
    label.onclick = invokeClick;
    row.onclick = invokeClick;
    row.appendChild(label);

    var actions = createEl('span', 'actions');
    if (config.primaryAction) {
      var primary = createEl('span', 'action', config.primaryAction.label);
      primary.title = config.primaryAction.title || '';
      primary.onclick = function (evt) { evt.preventDefault(); evt.stopPropagation(); if (typeof config.primaryAction.handler === 'function') config.primaryAction.handler(evt); };
      actions.appendChild(primary);
    }
    if (config.menuItems && config.menuItems.length) {
      var dots = createEl('span', 'action', '⋮');
      dots.title = 'More';
      dots.onclick = function (evt) { showContextMenu(ui, evt, config.menuItems); };
      actions.appendChild(dots);
      row.oncontextmenu = function (evt) { showContextMenu(ui, evt, config.menuItems); return false; };
    }
    row.appendChild(actions);
    return row;
  }

  function renderEmpty(panel, message) {
    panel.appendChild(createEl('div', 'phase2-empty', message));
  }

  function appendFilesBlock(panel, title, files, query) {
    if (!files || !files.length) return;
    var shown = 0;
    for (var i = 0; i < files.length; i++) {
      if (!query || contains(files[i].label, query) || contains(files[i].path, query)) {
        if (shown === 0) panel.appendChild(createEl('div', 'phase2-section-title', title));
        var row = createEl('div', 'phase2-node dim');
        row.style.paddingLeft = '8px';
        row.appendChild(createEl('span', 'caret', ''));
        row.appendChild(createEl('span', 'icon', files[i].icon || '📄'));
        var label = createEl('span', 'label');
        label.innerHTML = escapeHtml(files[i].label) + '<span class="phase2-file-note">' + escapeHtml(files[i].path) + '</span>';
        row.appendChild(label);
        row.onclick = (function (path) { return function () { if (path) showTextDialog((global.App && global.App.editorUi) || null, 'Logical Path', path); }; })(files[i].path);
        panel.appendChild(row);
        shown++;
      }
    }
  }

  function renderDesignBranch(ui, panel, design, depth, query) {
    if (!designMatchesQuery(design, query)) return false;
    var state = getState(ui);
    var designKey = getDesignKey(design);
    var openDesign = query ? true : isExpanded(state, designKey, true);
    var isFloorplan = isFloorplanDesign(design);
    var isIpconfig = isIpconfigDesign(design);
    var isContainerDesign = isFloorplan || isIpconfig;
    var sharedFlowDesign = usesProjectFlow(design);

    var designMenu = isContainerDesign
      ? [
          { label: 'No extra actions yet', handler: function () {} }
        ]
      : [
          { label: 'Add page', handler: function () { addPage(ui, design); } },
          { label: 'Delete design', handler: function () { deleteDesignAction(ui, design); } },
          { label: 'Refresh', handler: function () { NS.refresh(ui); } }
        ];
    if (!sharedFlowDesign) designMenu.splice(1, 0, { label: 'Open env', handler: function () { openEnv(ui, design); } });

    panel.appendChild(createNode(ui, {
      key: designKey,
      depth: depth,
      icon: isFloorplan ? '▦' : (isIpconfig ? '◆' : '◆'),
      label: designDisplayLabel(ui, design),
      hasChildren: true,
      open: openDesign,
      onToggle: function () { toggleExpanded(ui, designKey, true); },
      onClick: function () { state.selectedKey = designKey; toggleExpanded(ui, designKey, true); },
      primaryAction: { label: '+', title: isFloorplan ? 'Create floorplan page' : 'Add page', handler: function () { if (isFloorplan) createFloorplanPages(ui, null, { openFirst: true, targetDesign: design, parentDesign: findParentDesignForChild(ensureModel(ui).designs, design) }); else addPage(ui, design); } },
      menuItems: designMenu
    }));

    if (!openDesign) return true;

    if (!isContainerDesign && !sharedFlowDesign) {
      var envPath = design.env_file || joinPath.apply(null, (design._dirRel || [sanitizeName(design.name)]).concat(['env.json']));
      if (!query || contains('env', query) || contains(envPath, query)) {
        panel.appendChild(createNode(ui, {
          key: designKey + ':env',
          depth: depth + 1,
          icon: '⚙',
          label: 'Flow',
          onClick: function () { state.selectedKey = designKey + ':env'; openEnv(ui, design); },
          menuItems: [{ label: 'Open env', handler: function () { openEnv(ui, design); } }]
        }));
      }
    }

    var pages = Array.isArray(design.pages) ? design.pages : [];
    var moduleFloorplan = isModuleDesign(design) ? findDirectContainer(design, 'floorplan') : null;
    var moduleFloorplanPages = Array.isArray(moduleFloorplan && moduleFloorplan.pages) ? moduleFloorplan.pages : [];
    var flattenPages = isModuleDesign(design) || isTopLevelFloorplanDesign(ui, design);

    if (flattenPages) {
      var flatPages = [];
      for (var fp = 0; fp < pages.length; fp++) {
        if (!query || contains(pages[fp], query)) flatPages.push({ designRef: design, pageName: pages[fp] });
      }
      if (moduleFloorplan) {
        for (var mf = 0; mf < moduleFloorplanPages.length; mf++) {
          if (!query || contains(moduleFloorplanPages[mf], query)) flatPages.push({ designRef: moduleFloorplan, pageName: moduleFloorplanPages[mf] });
        }
      }
      for (var fl = 0; fl < flatPages.length; fl++) {
        renderPageLeaf(ui, panel, state, designKey + ':flat:' + fl + ':' + flatPages[fl].pageName, depth + 1, flatPages[fl].designRef, flatPages[fl].pageName);
      }
      if (isModuleDesign(design)) {
        var childDesigns = Array.isArray(design.sub_designs) ? design.sub_designs : [];
        for (var cd = 0; cd < childDesigns.length; cd++) renderDesignBranch(ui, panel, childDesigns[cd], depth + 1, query);
      }
      return true;
    }

    if (isIpconfig) {
      return true;
    }

    var visiblePages = [];
    var pageGroupLabel = designPageGroupLabel(design);
    for (var i = 0; i < pages.length; i++) if (!query || contains(pages[i], query) || contains(pageGroupLabel, query)) visiblePages.push(pages[i]);
    var pagesKey = designKey + ':pages';
    var showPagesHeader = !query || visiblePages.length || contains(pageGroupLabel, query);
    if (showPagesHeader) {
      var openPages = query ? true : isExpanded(state, pagesKey, true);
      panel.appendChild(createNode(ui, {
        key: pagesKey,
        depth: depth + 1,
        icon: isFloorplan ? '▤' : '▤',
        label: pageGroupLabel,
        meta: '(' + pages.length + ')',
        hasChildren: visiblePages.length > 0,
        open: openPages,
        onToggle: function () { toggleExpanded(ui, pagesKey, true); },
        onClick: function () { state.selectedKey = pagesKey; toggleExpanded(ui, pagesKey, true); },
        primaryAction: { label: '+', title: isFloorplan ? 'Create floorplan page' : 'Add page', handler: function () { if (isFloorplan) createFloorplanPages(ui, null, { openFirst: true, targetDesign: design, parentDesign: findParentDesignForChild(ensureModel(ui).designs, design) }); else addPage(ui, design); } },
        menuItems: [{ label: isFloorplan ? 'Create floorplan page' : 'Add page', handler: function () { if (isFloorplan) createFloorplanPages(ui, null, { openFirst: true, targetDesign: design, parentDesign: findParentDesignForChild(ensureModel(ui).designs, design) }); else addPage(ui, design); } }]
      }));
      if (openPages) {
        for (var p = 0; p < visiblePages.length; p++) {
          (function (pageName) {
            renderPageLeaf(ui, panel, state, pagesKey + ':' + pageName, depth + 2, design, pageName);
          })(visiblePages[p]);
        }
      }
    }

    if (!isContainerDesign && !isModuleDesign(design)) {
      var kids = Array.isArray(design.sub_designs) ? design.sub_designs : [];
      for (var k = 0; k < kids.length; k++) renderDesignBranch(ui, panel, kids[k], depth + 1, query);
    }
    return true;
  }

  function renderProjectSummary(panel, model, ui) {
    if (!isProjectReady(ui)) {
      renderEmpty(panel, 'No project loaded. Click New to create a project or a design.');
      return;
    }
    var box = createEl('div', 'phase2-empty');
    box.style.padding = '10px 12px';
    box.style.borderStyle = 'solid';
    box.style.background = '#fafcff';
    box.style.borderColor = '#dbeafe';
    var title = createEl('div', null, model && model.name ? model.name : 'project');
    title.style.fontSize = '14px';
    title.style.fontWeight = '600';
    title.style.color = '#111827';
    box.appendChild(title);
    var meta = [];
    if (model && model.path) meta.push(model.path);
    meta.push(((model && model.designs && model.designs.filter(function (d) { return !isFloorplanDesign(d) && !isIpconfigDesign(d); }).length) || 0) + ' design(s)');
    if (model && model.ip_config_file) meta.push('ip_config');
    var sub = createEl('div', null, meta.join(' · '));
    sub.style.marginTop = '4px';
    sub.style.fontSize = '12px';
    sub.style.lineHeight = '1.45';
    sub.style.color = '#6b7280';
    box.appendChild(sub);
    panel.appendChild(box);
  }

  function renderSources(ui, panel) {
    var model = ensureModel(ui);
    var state = getState(ui);
    var query = state.searchText;
    panel.appendChild(createEl('div', 'phase2-section-title', 'Project'));
    renderProjectSummary(panel, model, ui);
    if (!isProjectReady(ui)) return;
    var rendered = false;
    if (!query || contains('dft_design_spec', query) || contains('design spec', query)) {
      panel.appendChild(createNode(ui, {
        key: 'project:dft_design_spec',
        depth: 0,
        icon: '▣',
        label: 'dft_design_spec',
        onClick: function () { state.selectedKey = 'project:dft_design_spec'; openDesignSpec(ui); },
        menuItems: [{ label: 'Open', handler: function () { openDesignSpec(ui); } }]
      }));
      rendered = true;
    }
    if (!query || contains('flow', query) || contains(getProjectFlowRelPath(ui), query)) {
      panel.appendChild(createNode(ui, {
        key: 'project:flow',
        depth: 0,
        icon: '⚙',
        label: 'Flow',
        onClick: function () { state.selectedKey = 'project:flow'; openProjectEnv(ui); },
        menuItems: [{ label: 'Open', handler: function () { openProjectEnv(ui); } }]
      }));
      rendered = true;
    }
    for (var i = 0; i < model.designs.length; i++) rendered = renderDesignBranch(ui, panel, model.designs[i], 0, query) || rendered;
    if (!rendered) renderEmpty(panel, 'No source items match "' + query + '".');
  }

  function renderHierarchyBranch(ui, panel, design, depth, query) {
    if (!designMatchesQuery(design, query)) return false;
    var state = getState(ui);
    var key = getDesignKey(design) + ':hier';
    var open = query ? true : isExpanded(state, key, true);
    panel.appendChild(createNode(ui, {
      key: key,
      depth: depth,
      icon: isFloorplanDesign(design) ? '▦' : (isIpconfigDesign(design) ? '◆' : '◇'),
      label: isFloorplanDesign(design) ? designDisplayLabel(ui, design) : (isIpconfigDesign(design) ? 'ipconfig' : (design.name || 'design')),
      hasChildren: !!((design.sub_designs && design.sub_designs.length) || (design.pages && design.pages.length)),
      open: open,
      onToggle: function () { toggleExpanded(ui, key, true); },
      onClick: function () { state.selectedKey = key; toggleExpanded(ui, key, true); }
    }));
    if (!open) return true;
    var pages = Array.isArray(design.pages) ? design.pages : [];
    for (var i = 0; i < pages.length; i++) {
      if (!query || contains(pages[i], query)) {
        (function (pageName) {
          panel.appendChild(createNode(ui, {
            key: key + ':page:' + pageName,
            depth: depth + 1,
            icon: '□',
            label: pageName,
            activePage: isActiveDesignPage(ui, design, pageName),
            onClick: function () { openPage(ui, design, pageName); }
          }));
        })(pages[i]);
      }
    }
    if (!isFloorplanDesign(design) && !isIpconfigDesign(design)) {
      var kids = Array.isArray(design.sub_designs) ? design.sub_designs : [];
      for (var j = 0; j < kids.length; j++) renderHierarchyBranch(ui, panel, kids[j], depth + 1, query);
    }
    return true;
  }

  function renderHierarchy(ui, panel) {
    var model = ensureModel(ui);
    var query = getState(ui).searchText;
    panel.appendChild(createEl('div', 'phase2-section-title', 'Design Hierarchy'));
    if (!isProjectReady(ui)) {
      renderEmpty(panel, 'No hierarchy to show yet.');
      return;
    }
    var rendered = false;
    for (var i = 0; i < model.designs.length; i++) rendered = renderHierarchyBranch(ui, panel, model.designs[i], 0, query) || rendered;
    if (!rendered) renderEmpty(panel, 'No hierarchy items match "' + query + '".');
  }

  function renderRuns(ui, panel) {
    var query = getState(ui).searchText;
    panel.appendChild(createEl('div', 'phase2-section-title', 'Runs'));
    var runs = null;
    if (Array.isArray(ui._dftRuns)) runs = ui._dftRuns;
    else if (Array.isArray(ui._runQueue)) runs = ui._runQueue;
    else if (Array.isArray(ui.runQueue)) runs = ui.runQueue;
    if (!runs || !runs.length) {
      renderEmpty(panel, 'No run data is connected yet.');
      return;
    }
    var shown = 0;
    for (var i = 0; i < runs.length; i++) {
      var run = runs[i] || {};
      var name = run.name || run.id || ('run_' + (i + 1));
      var status = text(run.status || run.state || 'idle');
      if (query && !contains(name, query) && !contains(status, query)) continue;
      var item = createEl('div', 'phase2-run-item');
      var left = createEl('div');
      left.innerHTML = '<div style="font-weight:600;">' + escapeHtml(name) + '</div><div class="phase2-file-note">' + escapeHtml(run.detail || run.description || '') + '</div>';
      var badgeClass = 'phase2-badge';
      if (/success|done|complete/i.test(status)) badgeClass += ' success';
      else if (/warn/i.test(status)) badgeClass += ' warn';
      else if (/error|fail/i.test(status)) badgeClass += ' error';
      item.appendChild(left);
      item.appendChild(createEl('div', badgeClass, status));
      panel.appendChild(item);
      shown++;
    }
    if (!shown) renderEmpty(panel, 'No runs match "' + query + '".');
  }

  function collectLogicalFiles(ui) {
    var model = ensureModel(ui);
    var files = [];
    if (!isProjectReady(ui)) return files;
    if (ui._projectYamlFilePath) files.push({ icon: '🧾', label: (model.name || 'project') + '.dftart', path: ui._projectYamlFilePath });
    var projectFlowAbs = getProjectFlowAbsPath(ui);
    if (projectFlowAbs) files.push({ icon: '⚙', label: 'Flow', path: projectFlowAbs });
    if (model.ip_config_file) files.push({ icon: '🧩', label: 'ip_config.json', path: joinPath(getProjectStorageRoot(ui), model.ip_config_file) });
    var flowState = ui && ui.__dftFlowNavState ? ui.__dftFlowNavState : null;
    function walk(design) {
      if (!design) return;
      var base = getDesignAbsDir(ui, design) || joinPath.apply(null, design._dirRel || []);
      if (!isFloorplanDesign(design) && !isIpconfigDesign(design) && !usesProjectFlow(design)) files.push({ icon: '⚙', label: (design.name || 'design') + ' / Flow', path: pathWithinRoot(getProjectStorageRoot(ui), base) ? joinPath(getProjectStorageRoot(ui), design.env_file) : joinPath(base, 'env.json') });
      if (isIpconfigDesign(design)) {
        files.push({ icon: '🗂', label: 'ipconfig / yaml', path: joinPath(base, 'yaml') });
        if (flowState && flowState.lastIpconfigPath) files.push({ icon: '📄', label: basenamePath(flowState.lastIpconfigPath), path: flowState.lastIpconfigPath });
      }
      var pages = Array.isArray(design.pages) ? design.pages : [];
      for (var i = 0; i < pages.length; i++) {
        files.push({ icon: '📄', label: pages[i] + '.dftart', path: resolveLocalPageFileAbs(ui, design, pages[i]) });
      }
      if (!isFloorplanDesign(design) && !isIpconfigDesign(design)) {
        var kids = Array.isArray(design.sub_designs) ? design.sub_designs : [];
        for (var j = 0; j < kids.length; j++) walk(kids[j]);
      }
    }
    for (var k = 0; k < model.designs.length; k++) walk(model.designs[k]);
    return files;
  }

  function renderFiles(ui, panel) {
    var query = getState(ui).searchText;
    panel.appendChild(createEl('div', 'phase2-section-title', 'Logical Files'));
    var files = collectLogicalFiles(ui);
    if (!files.length) {
      renderEmpty(panel, 'No logical files are mapped yet.');
      return;
    }
    appendFilesBlock(panel, 'Mapped Files', files, query);
    if (!panel.querySelector('.phase2-node')) renderEmpty(panel, 'No files match "' + query + '".');
  }

  function renderActiveTab(ui) {
    var root = ui._phase2ProjectExplorer;
    if (!root || !root.dom) return;
    var state = getState(ui);
    var previousTab = state.renderedTab || state.activeTab;
    state.scrollTopByTab = state.scrollTopByTab || {};
    state.pendingRestoreByTab = state.pendingRestoreByTab || {};
    var hasPendingSaveSkip = Object.prototype.hasOwnProperty.call(state.pendingRestoreByTab, previousTab);
    var hasPendingRestore = Object.prototype.hasOwnProperty.call(state.pendingRestoreByTab, state.activeTab);
    if (ui._phase1 && ui._phase1.state) ui._phase1.state.projectTab = state.activeTab;
    if (!hasPendingSaveSkip && root.dom.body) state.scrollTopByTab[previousTab] = root.dom.body.scrollTop || 0;
    var tabs = root.dom.tabBar.querySelectorAll('.phase2-project-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].className = tabs[i].getAttribute('data-key') === state.activeTab ? 'phase2-project-tab active' : 'phase2-project-tab';
    root.dom.search.value = state.searchText || '';
    root.dom.body.innerHTML = '';
    var panel = createEl('div', 'phase2-tree');
    root.dom.body.appendChild(panel);
    if (state.activeTab === 'sources') renderSources(ui, panel);
    else if (state.activeTab === 'hierarchy') renderHierarchy(ui, panel);
    else if (state.activeTab === 'runs') renderRuns(ui, panel);
    else renderFiles(ui, panel);
    state.renderedTab = state.activeTab;
    var restoreTop = hasPendingRestore
      ? Number(state.pendingRestoreByTab[state.activeTab] || 0)
      : Number(state.scrollTopByTab[state.activeTab] || 0);
    if (hasPendingRestore) {
      state.scrollTopByTab[state.activeTab] = restoreTop;
      delete state.pendingRestoreByTab[state.activeTab];
    }
    var restoreKey = state.selectedKey || '';
    function applyScrollRestore() {
      root.dom.body.scrollTop = restoreTop;
      var selectedNode = null;
      if (!restoreTop && restoreKey) {
        var candidates = root.dom.body.querySelectorAll('[data-node-key]');
        for (var c = 0; c < candidates.length; c++) {
          if (candidates[c].getAttribute('data-node-key') === restoreKey) {
            selectedNode = candidates[c];
            break;
          }
        }
        if (selectedNode && typeof selectedNode.scrollIntoView === 'function') {
          selectedNode.scrollIntoView({ block: 'nearest' });
        }
      }
    }
    applyScrollRestore();
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function () { applyScrollRestore(); });
    } else {
      setTimeout(function () { applyScrollRestore(); }, 0);
    }
  }

  async function openNewEntryDialog(ui, opts) {
    opts = opts || {};
    var result = await showDialog(ui, 'New', 680, 360, function (body, done) {
      body.appendChild(createEl('div', 'phase2-dlg-note', 'Create a new project or create a new design directly. Path is always selected from a folder picker.'));

      var grid = createEl('div', 'phase2-dlg-grid');
      body.appendChild(grid);

      var mode = 'project';
      var projectRoot = normalizePath(getProjectRoot(ui) || '');
      var selectedPath = projectRoot;
      var modeLabel = createEl('div', 'phase2-dlg-label', 'Project Name');
      var pathLabel = createEl('div', 'phase2-dlg-label', 'Project Path');

      grid.appendChild(createEl('div', 'phase2-dlg-label', 'Create'));
      var modeWrap = createEl('div', 'phase2-choice-grid');
      grid.appendChild(modeWrap);

      grid.appendChild(modeLabel);
      var nameStack = createEl('div', 'phase2-field-stack');
      var nameInput = createEl('input', 'phase2-input');
      nameInput.type = 'text';
      nameStack.appendChild(nameInput);
      grid.appendChild(nameStack);

      grid.appendChild(pathLabel);
      var pathWrap = createEl('div', 'phase2-path-picker');
      var pathView = createEl('div', 'phase2-dlg-path-view', 'Select a folder');
      var pathBtn = createEl('button', 'phase2-btn', 'Select…');
      pathWrap.appendChild(pathView);
      pathWrap.appendChild(pathBtn);
      grid.appendChild(pathWrap);

      var inlineError = createEl('div', 'phase2-inline-error');
      inlineError.style.display = 'none';
      body.appendChild(inlineError);

      var modeCards = [];
      function syncMode(next) {
        mode = next;
        modeLabel.textContent = next === 'project' ? 'Project Name' : 'Design Name';
        pathLabel.textContent = next === 'project' ? 'Project Path' : 'Design Path';
        pathView.textContent = selectedPath || 'Select a folder';
        inlineError.style.display = 'none';
        for (var i = 0; i < modeCards.length; i++) {
          var item = modeCards[i];
          item.input.checked = item.value === mode;
          item.card.className = item.value === mode ? 'phase2-choice-card active' : 'phase2-choice-card';
        }
      }

      function addModeChoice(value, labelText) {
        var label = createEl('label', 'phase2-choice-card');
        var radio = createEl('input');
        radio.type = 'radio';
        radio.name = 'phase2-new-kind';
        radio.checked = value === mode;
        radio.onchange = function () { if (radio.checked) syncMode(value); };
        label.appendChild(radio);
        label.appendChild(createEl('span', null, labelText));
        label.onclick = function () { syncMode(value); };
        modeWrap.appendChild(label);
        modeCards.push({ value: value, card: label, input: radio });
      }

      addModeChoice('project', 'Project');
      addModeChoice('design', 'Design');

      pathBtn.onclick = async function () {
        var picked = await chooseFolderPath({
          title: mode === 'project' ? 'Select parent folder for the new project' : 'Select parent folder for the new design',
          pickerId: mode === 'project' ? 'dft-new-project-parent' : 'dft-new-design-folder',
          initialPath: selectedPath
        });
        selectedPath = normalizePath(picked);
        pathView.textContent = selectedPath || 'Select a folder';
      };

      var actions = createEl('div', 'phase2-dlg-actions');
      body.appendChild(actions);
      var cancelBtn = createEl('button', 'phase2-btn ghost', (global.mxResources && global.mxResources.get ? (global.mxResources.get('cancel') || 'Cancel') : 'Cancel'));
      var createBtn = createEl('button', 'phase2-btn primary', (global.mxResources && global.mxResources.get ? (global.mxResources.get('create') || 'Create') : 'Create'));

      function submit() {
        var name = text(nameInput.value).trim();
        var nameError = validateScopedName(
          nameInput.value,
          mode === 'project' ? 'Project name' : 'Design name',
          { disallowReserved: mode === 'design' }
        );
        if (nameError) {
          inlineError.textContent = nameError;
          inlineError.style.display = '';
          try { nameInput.focus(); } catch (e) {}
          return;
        }
        if (!selectedPath) {
          inlineError.textContent = 'Please select a folder path.';
          inlineError.style.display = '';
          return;
        }
        done({ kind: mode, name: name, path: selectedPath });
      }

      cancelBtn.onclick = function () { done(null); };
      createBtn.onclick = submit;
      actions.appendChild(cancelBtn);
      actions.appendChild(createBtn);
      syncMode(mode);
      setTimeout(function () { try { nameInput.focus(); } catch (e) {} }, 0);
    });

    if (!result) return null;
    if (opts.replaceCurrent) clearProjectContext(ui);
    if (result.kind === 'project') {
      await createProject(ui, result.name, result.path);
      setStatus(ui, 'Created project: ' + result.name);
      return { kind: 'project', model: ensureModel(ui) };
    }
    var design = await createTopLevelDesign(ui, result.name, result.path);
    setStatus(ui, 'Created design: ' + result.name);
    return { kind: 'design', design: design, model: ensureModel(ui) };
  }

  async function openAddDesignDialog(ui) {
    if (!isProjectReady(ui)) throw new Error('Create or open a project first.');
    var parentDesign = getAddDesignParent(ui);
    var copyable = collectCopyableDesigns(ensureModel(ui).designs, []).filter(function (item) {
      return !parentDesign || item.design !== parentDesign;
    });
    var result = await showDialog(ui, 'Add Design', 720, 420, function (body, done) {
      body.appendChild(createEl('div', 'phase2-dlg-note', parentDesign
        ? ('Add a new design under "' + parentDesign.name + '".')
        : 'Add a new top-level design under the current project.'));

      var grid = createEl('div', 'phase2-dlg-grid');
      body.appendChild(grid);

      grid.appendChild(createEl('div', 'phase2-dlg-label', 'Design Name'));
      var nameWrap = createEl('div', 'phase2-field-stack');
      var nameInput = createEl('input', 'phase2-input');
      nameInput.type = 'text';
      nameWrap.appendChild(nameInput);
      grid.appendChild(nameWrap);

      grid.appendChild(createEl('div', 'phase2-dlg-label', 'Source'));
      var sourceWrap = createEl('div', 'phase2-field-stack');
      var sourceModeWrap = createEl('div', 'phase2-choice-grid');
      sourceWrap.appendChild(sourceModeWrap);

      var sourceLocationWrap = createEl('div', 'phase2-choice-grid');
      sourceLocationWrap.style.display = 'none';
      sourceWrap.appendChild(sourceLocationWrap);

      var sourceSelect = createEl('select', 'phase2-input');
      sourceSelect.style.display = 'none';
      for (var i = 0; i < copyable.length; i++) {
        var opt = createEl('option');
        opt.value = String(i);
        opt.textContent = copyable[i].label;
        sourceSelect.appendChild(opt);
      }
      sourceWrap.appendChild(sourceSelect);

      var folderWrap = createEl('div', 'phase2-path-picker');
      folderWrap.style.display = 'none';
      var folderView = createEl('div', 'phase2-dlg-path-view', 'Select a design folder');
      var folderBtn = createEl('button', 'phase2-btn', 'Select…');
      folderWrap.appendChild(folderView);
      folderWrap.appendChild(folderBtn);
      sourceWrap.appendChild(folderWrap);
      grid.appendChild(sourceWrap);

      var inlineError = createEl('div', 'phase2-inline-error');
      inlineError.style.display = 'none';
      body.appendChild(inlineError);

      var sourceMode = 'empty';
      var sourceLocation = 'workspace';
      var externalFolder = '';
      var sourceCards = [];
      function syncSourceMode(next) {
        sourceMode = next;
        sourceLocationWrap.style.display = next === 'copy' ? '' : 'none';
        sourceSelect.style.display = next === 'copy' && sourceLocation === 'workspace' ? '' : 'none';
        folderWrap.style.display = next === 'copy' && sourceLocation === 'folder' ? '' : 'none';
        inlineError.style.display = 'none';
        for (var j = 0; j < sourceCards.length; j++) {
          var item = sourceCards[j];
          item.input.checked = item.value === sourceMode;
          item.card.className = item.value === sourceMode ? 'phase2-choice-card active' : 'phase2-choice-card';
        }
      }
      function syncSourceLocation(next) {
        sourceLocation = next;
        sourceSelect.style.display = sourceMode === 'copy' && next === 'workspace' ? '' : 'none';
        folderWrap.style.display = sourceMode === 'copy' && next === 'folder' ? '' : 'none';
        inlineError.style.display = 'none';
        for (var k = 0; k < sourceLocationCards.length; k++) {
          var item = sourceLocationCards[k];
          item.input.checked = item.value === sourceLocation;
          item.card.className = item.value === sourceLocation ? 'phase2-choice-card active' : 'phase2-choice-card';
        }
      }
      function addSourceChoice(value, labelText) {
        var label = createEl('label', 'phase2-choice-card');
        var radio = createEl('input');
        radio.type = 'radio';
        radio.name = 'phase2-add-design-source';
        radio.checked = value === sourceMode;
        radio.onchange = function () { if (radio.checked) syncSourceMode(value); };
        label.appendChild(radio);
        label.appendChild(createEl('span', null, labelText));
        label.onclick = function () { syncSourceMode(value); };
        sourceModeWrap.appendChild(label);
        sourceCards.push({ value: value, card: label, input: radio });
      }
      addSourceChoice('empty', 'Empty design');
      addSourceChoice('copy', 'Copy existing design');

      var sourceLocationCards = [];
      function addLocationChoice(value, labelText) {
        var label = createEl('label', 'phase2-choice-card');
        var radio = createEl('input');
        radio.type = 'radio';
        radio.name = 'phase2-add-design-location';
        radio.checked = value === sourceLocation;
        radio.onchange = function () { if (radio.checked) syncSourceLocation(value); };
        label.appendChild(radio);
        label.appendChild(createEl('span', null, labelText));
        label.onclick = function () { syncSourceLocation(value); };
        sourceLocationWrap.appendChild(label);
        sourceLocationCards.push({ value: value, card: label, input: radio });
      }
      addLocationChoice('workspace', 'Current workspace');
      addLocationChoice('folder', 'Choose folder');

      folderBtn.onclick = async function () {
        var picked = await chooseFolderPath({
          title: 'Select a DFTArtist design folder',
          pickerId: 'dft-copy-design-folder',
          initialPath: externalFolder || getProjectRoot(ui)
        });
        externalFolder = normalizePath(picked);
        folderView.textContent = externalFolder || 'Select a design folder';
      };

      var actions = createEl('div', 'phase2-dlg-actions');
      body.appendChild(actions);
      var cancelBtn = createEl('button', 'phase2-btn ghost', (global.mxResources && global.mxResources.get ? (global.mxResources.get('cancel') || 'Cancel') : 'Cancel'));
      var createBtn = createEl('button', 'phase2-btn primary', (global.mxResources && global.mxResources.get ? (global.mxResources.get('create') || 'Create') : 'Create'));

      function submit() {
        var name = text(nameInput.value).trim();
        var nameError = validateScopedName(nameInput.value, 'Design name', { disallowReserved: true });
        if (nameError) {
          inlineError.textContent = nameError;
          inlineError.style.display = '';
          return;
        }
        if (sourceMode === 'copy' && sourceLocation === 'workspace' && !copyable.length) {
          inlineError.textContent = 'No existing design is available to copy.';
          inlineError.style.display = '';
          return;
        }
        if (sourceMode === 'copy' && sourceLocation === 'folder' && !externalFolder) {
          inlineError.textContent = 'Please select a design folder.';
          inlineError.style.display = '';
          return;
        }
        var sourceDesign = sourceMode === 'copy' && sourceLocation === 'workspace'
          ? copyable[Number(sourceSelect.value || 0)].design
          : null;
        done({
          name: name,
          sourceDesign: sourceDesign,
          parentDesign: parentDesign,
          sourceLocation: sourceLocation,
          externalFolder: externalFolder
        });
      }

      cancelBtn.onclick = function () { done(null); };
      createBtn.onclick = submit;
      actions.appendChild(cancelBtn);
      actions.appendChild(createBtn);
      syncSourceMode(copyable.length ? 'empty' : 'empty');
      syncSourceLocation('workspace');
      setTimeout(function () { try { nameInput.focus(); } catch (e) {} }, 0);
    });

    if (!result) return null;
    var sourceDesign = result.sourceDesign || null;
    if (result.sourceLocation === 'folder') sourceDesign = await loadExternalDesignTree(ui, result.externalFolder);
    var design = await createDesignInContext(ui, result.parentDesign, result.name, sourceDesign);
    return { kind: 'design', design: design, model: ensureModel(ui) };
  }

  function buildChrome(ui, host) {
    ensureCss();
    ensureMenuBinding(ui);
    host.innerHTML = '';
    host.className = host.className.replace(/\s?phase1-panel-shell/g, '');
    if (host.className.indexOf('phase2-project-host') < 0) host.className += ' phase2-project-host';
    var root = ui._phase2ProjectExplorer || (ui._phase2ProjectExplorer = {});
    root.host = host;

    var titlebar = createEl('div', 'phase2-project-titlebar');
    titlebar.appendChild(createEl('span', null, 'Project Explorer'));
    var titleActions = createEl('div');
    var collapseBtn = createEl('span', 'phase2-project-btn ghost', '▸');
    collapseBtn.title = 'Collapse / Expand project area';
    collapseBtn.onclick = function () {
      if (!ui._phase1 || !ui._phase1.state) return;
      if (ui._phase1.state.projectWidth <= ui._phase1.state.minProjectWidth) ui._phase1.state.projectWidth = 280;
      else ui._phase1.state.projectWidth = ui._phase1.state.minProjectWidth;
      if (typeof ui.refresh === 'function') ui.refresh(true);
    };
    var moreBtn = createEl('span', 'phase2-project-btn ghost', '⋮');
    moreBtn.title = 'Project actions';
    moreBtn.onclick = function (evt) {
      showContextMenu(ui, evt, [
        { label: 'Add design', handler: function () { openAddDesignDialog(ui).catch(function (e) { global.alert(e && e.message ? e.message : String(e)); }); } },
        { label: 'Create floorplan page', handler: function () { createFloorplanPages(ui, null, { openFirst: true }); } },
        { label: 'Refresh explorer', handler: function () { NS.refresh(ui); } }
      ]);
    };
    titleActions.appendChild(collapseBtn); titleActions.appendChild(moreBtn); titlebar.appendChild(titleActions); host.appendChild(titlebar);

    var tabBar = createEl('div', 'phase2-project-tabbar');
    var tabs = [['sources', 'Sources'], ['hierarchy', 'Hierarchy'], ['runs', 'Runs'], ['files', 'Files']];
    for (var i = 0; i < tabs.length; i++) {
      var tab = createEl('div', 'phase2-project-tab', tabs[i][1]);
      tab.setAttribute('data-key', tabs[i][0]);
      tab.onclick = (function (key) { return function () { getState(ui).activeTab = key; NS.refresh(ui); }; })(tabs[i][0]);
      tabBar.appendChild(tab);
    }
    host.appendChild(tabBar);

    var toolbar = createEl('div', 'phase2-project-toolbar');
    var search = createEl('input', 'phase2-project-search');
    search.type = 'text';
    search.placeholder = 'Search current tab';
    search.oninput = function () { getState(ui).searchText = search.value || ''; renderActiveTab(ui); };
    toolbar.appendChild(search);

    var addBtn = createEl('div', 'phase2-project-btn', '+');
    addBtn.title = 'Add design in current project or design';
    addBtn.onclick = function () {
      openAddDesignDialog(ui).catch(function (e) {
        global.alert(e && e.message ? e.message : String(e));
      });
    };
    toolbar.appendChild(addBtn);

    var refreshBtn = createEl('div', 'phase2-project-btn', '⟳');
    refreshBtn.title = 'Refresh';
    refreshBtn.onclick = function () { NS.refresh(ui); };
    toolbar.appendChild(refreshBtn);

    var clearBtn = createEl('div', 'phase2-project-btn ghost', '✕');
    clearBtn.title = 'Clear search';
    clearBtn.onclick = function () { getState(ui).searchText = ''; search.value = ''; renderActiveTab(ui); };
    toolbar.appendChild(clearBtn);
    host.appendChild(toolbar);

    var body = createEl('div', 'phase2-project-body');
    body.onscroll = function () {
      var state = getState(ui);
      state.scrollTopByTab = state.scrollTopByTab || {};
      state.scrollTopByTab[state.activeTab] = body.scrollTop || 0;
    };
    host.appendChild(body);
    root.dom = { titlebar: titlebar, tabBar: tabBar, toolbar: toolbar, search: search, body: body };
  }

  function wireLegacyRefresh(ui) {
    var root = ui._phase2ProjectExplorer || (ui._phase2ProjectExplorer = {});
    if (root.refreshBridgeInstalled) return;
    ui.refreshProjectExplorer = function () { NS.refresh(ui); };
    if (ui.format) {
      ui.format._legacyRefreshProject = ui.format.refreshProject;
      ui.format.refreshProject = function () { NS.refresh(ui); };
    }
    root.refreshBridgeInstalled = true;
  }

  NS.attach = function (ui, host) {
    if (!ui || !host) return;
    ensureModel(ui);
    getState(ui);
    buildChrome(ui, host);
    wireLegacyRefresh(ui);
    ensureIpconfigScaffoldIfNeeded(ui);
    renderActiveTab(ui);
  };

  NS.refresh = function (ui) {
    if (!ui) ui = global.App && global.App.editorUi;
    if (!ui) return;
    ensureModel(ui);
    ensureIpconfigScaffoldIfNeeded(ui);
    var root = ui._phase2ProjectExplorer;
    if (!root || !root.host || !root.dom) return;
    renderActiveTab(ui);
  };

  NS.notifyProjectChanged = function (ui, reason) {
    if (!ui) ui = global.App && global.App.editorUi;
    if (!ui) return;
    if (reason) setStatus(ui, 'Project updated: ' + reason);
    saveProjectYaml(ui, reason || 'notifyProjectChanged');
    NS.refresh(ui);
  };

  NS.isProjectReady = isProjectReady;
  NS.getFloorplanContainer = getFloorplanContainer;
  NS.getCurrentDesign = getCurrentDesign;
  NS.openDefaultFloorplan = openDefaultFloorplan;
  NS.openNewEntryDialog = openNewEntryDialog;
  NS.openAddDesignDialog = openAddDesignDialog;
  NS.createProject = createProject;
  NS.createTopLevelDesign = createTopLevelDesign;
  NS.createDesignInContext = createDesignInContext;
  NS.createFloorplanPages = createFloorplanPages;
  NS.resolvePageFileAbs = resolveLocalPageFileAbs;
  NS.createPageFileSlot = createPageFileSlot;
  NS.loadExternalDesignTree = loadExternalDesignTree;
  NS.promptValue = promptValue;
  NS.validateScopedName = validateScopedName;
})(window);
