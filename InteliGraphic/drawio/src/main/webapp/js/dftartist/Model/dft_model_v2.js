(function (global) {
  'use strict';
  global = global || (typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
  var NS = global.DFTModelV2 = global.DFTModelV2 || {};

  var FLOW_TEMPLATES = ['MBIST BSCAN', 'Logic Test', 'S8SYN and LEC', 'Scan', 'ATPG', 'SIM'];
  var ARCH_DOMAINS = ['SSN', 'BSCAN', 'JTAG', 'BISR'];

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
  function slug(name) { return String(name || '').trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_\-]/g, '_'); }
  function uniq(arr) {
    var out = [], seen = {};
    (arr || []).forEach(function (v) { var k = String(v); if (!seen[k]) { seen[k] = true; out.push(v); } });
    return out;
  }

  function ensureProjectModel(ui) {
    if (!ui.projectModel || typeof ui.projectModel !== 'object') {
      ui.projectModel = { name: '', path: '', state: 'none', designs: [], floorplan: null, ipConfigPages: [] };
    }
    var pm = ui.projectModel;
    if (!Array.isArray(pm.designs)) pm.designs = [];
    if (!Array.isArray(pm.ipConfigPages)) pm.ipConfigPages = [];
    if (pm.state == null) pm.state = pm.name ? 'created' : 'none';
    if (pm.floorplan == null && pm.pages && Array.isArray(pm.pages)) {
      // migrate old project-level pages into floorplan ssn pages if present
      pm.floorplan = { name: 'floorplan', structureType: 'Hierarchical', domains: ['SSN'], pages: [] };
      pm.pages.forEach(function (p) { pm.floorplan.pages.push({ name: p.name || 'floorplan_ssn', domain: 'SSN', kind: 'floorplan' }); });
    }
    if (pm.floorplan) {
      if (!Array.isArray(pm.floorplan.pages)) pm.floorplan.pages = [];
      pm.floorplan.domains = uniq(Array.isArray(pm.floorplan.domains) ? pm.floorplan.domains : pm.floorplan.pages.map(function (p) { return p.domain; }));
    }
    pm.designs.forEach(function (d) {
      if (!Array.isArray(d.archPages)) {
        d.archPages = [];
        if (Array.isArray(d.pages)) {
          d.pages.forEach(function (p) { d.archPages.push({ name: p.name || 'page', domain: (p.domain || 'SSN') }); });
        }
      }
      if (!Array.isArray(d.ipConfigPages)) d.ipConfigPages = [];
      if (!Array.isArray(d.flowPages) || !d.flowPages.length) d.flowPages = clone(FLOW_TEMPLATES);
      if (!d.env) d.env = { designName: d.name || '', language: 'Mixed' };
      if (!d.env_file) d.env_file = (d.path ? d.path.replace(/\/$/, '') : '') + '/env.json';
      if (d.ipConfigDir == null) d.ipConfigDir = ((d.path || '') ? String(d.path).replace(/\/$/, '') + '/' : '') + 'ip_config';
    });
    return pm;
  }

  function touch(ui, reason) {
    var pm = ensureProjectModel(ui);
    pm._lastChangeReason = reason || '';
    pm._lastChangeTs = Date.now();
    if (typeof ui.refreshProjectExplorer === 'function') ui.refreshProjectExplorer();
    if (global.DFTFlowNavigator && typeof global.DFTFlowNavigator.refresh === 'function') {
      try { global.DFTFlowNavigator.refresh(ui); } catch (e) {}
    }
    if (typeof ui._autoSaveProjectYaml === 'function') {
      try { ui._autoSaveProjectYaml(); } catch (e2) {}
    }
    return pm;
  }

  NS.getProjectState = function (ui) {
    var pm = ensureProjectModel(ui);
    if (!pm.name && !pm.path) return 'none';
    if (pm.state) return pm.state;
    return pm.designs.length ? 'opened' : 'created';
  };

  NS.getFlowTemplates = function () { return clone(FLOW_TEMPLATES); };
  NS.getArchDomains = function () { return clone(ARCH_DOMAINS); };
  NS.ensureProjectModel = ensureProjectModel;

  NS.createProject = function (ui, opts) {
    opts = opts || {};
    var name = String(opts.name || '').trim() || 'project';
    var path = String(opts.path || '').trim();
    ui.projectModel = {
      version: 2,
      name: name,
      path: path,
      state: 'created',
      designs: [],
      floorplan: null,
      ipConfigDir: (path ? path.replace(/\/$/, '') + '/' : '') + 'ip_config',
      ipConfigPages: []
    };
    if (typeof ui._projectRootPath === 'undefined') ui._projectRootPath = path;
    if (typeof ui._projectFilePath === 'undefined') ui._projectFilePath = path ? path.replace(/\/$/, '') + '/' + slug(name) + '.dftart' : '';
    return touch(ui, 'create-project');
  };

  NS.createDesign = function (ui, opts) {
    opts = opts || {};
    var pm = ensureProjectModel(ui);
    if (!pm.name) return null;
    var name = String(opts.name || '').trim();
    if (!name) return null;
    var dir = String(opts.path || '').trim() || ((pm.path ? pm.path.replace(/\/$/, '') + '/' : '') + 'designs/' + slug(name));
    var existing = pm.designs.filter(function (d) { return String(d.name).toLowerCase() === name.toLowerCase(); })[0];
    if (existing) return existing;
    var design = {
      name: name,
      path: dir,
      archPages: [],
      flowPages: clone(FLOW_TEMPLATES),
      ipConfigDir: dir.replace(/\/$/, '') + '/ip_config',
      ipConfigPages: [],
      env: { designName: name, language: 'Mixed' },
      env_file: dir.replace(/\/$/, '') + '/env.json'
    };
    pm.designs.push(design);
    touch(ui, 'create-design');
    return design;
  };

  NS.createProjectIpConfigPage = function (ui, name) {
    var pm = ensureProjectModel(ui); if (!pm.name) return null;
    name = String(name || '').trim(); if (!name) return null;
    var page = { name: name, kind: 'ip_config' };
    pm.ipConfigPages.push(page); touch(ui, 'create-project-ipconfig-page'); return page;
  };

  NS.ensureFloorplan = function (ui, opts) {
    opts = opts || {};
    var pm = ensureProjectModel(ui); if (!pm.name) return null;
    var fp = pm.floorplan = pm.floorplan || { name: 'floorplan', structureType: 'Hierarchical', domains: [], pages: [] };
    fp.name = String(opts.name || fp.name || 'floorplan').trim() || 'floorplan';
    fp.structureType = opts.structureType || fp.structureType || 'Hierarchical';
    var domains = uniq((opts.domains || fp.domains || ['SSN']).map(function (v) { return String(v).toUpperCase(); }));
    fp.domains = domains;
    fp.pages = domains.map(function (d) { return { name: 'floorplan_' + d.toLowerCase(), domain: d, kind: 'floorplan' }; });
    // auto-sync arch pages for existing designs (only add missing matching domains)
    pm.designs.forEach(function (design) {
      domains.forEach(function (d) {
        var has = (design.archPages || []).some(function (p) { return String(p.domain || '').toUpperCase() === d; });
        if (!has) {
          design.archPages.push({ name: design.name + '_' + d.toLowerCase(), domain: d, kind: 'arch' });
        }
      });
    });
    touch(ui, 'create-floorplan');
    return fp;
  };

  NS.addFloorplanDomainPage = function (ui, opts) {
    opts = opts || {};
    var pm = ensureProjectModel(ui); if (!pm.floorplan) return null;
    var domain = String(opts.domain || '').toUpperCase(); if (ARCH_DOMAINS.indexOf(domain) < 0) return null;
    var name = String(opts.name || ('floorplan_' + domain.toLowerCase())).trim();
    if (!Array.isArray(pm.floorplan.domains)) pm.floorplan.domains = [];
    if (pm.floorplan.domains.indexOf(domain) < 0) pm.floorplan.domains.push(domain);
    if (!Array.isArray(pm.floorplan.pages)) pm.floorplan.pages = [];
    var existing = pm.floorplan.pages.filter(function (p) { return String(p.name).toLowerCase() === name.toLowerCase(); })[0];
    if (existing) return existing;
    var page = { name: name, domain: domain, kind: 'floorplan' };
    pm.floorplan.pages.push(page);
    touch(ui, 'add-floorplan-page');
    return page;
  };

  NS.addArchPage = function (ui, design, opts) {
    opts = opts || {};
    if (!design) return null;
    var domain = String(opts.domain || '').toUpperCase(); if (ARCH_DOMAINS.indexOf(domain) < 0) return null;
    if (!Array.isArray(design.archPages)) design.archPages = [];
    var name = String(opts.name || (design.name + '_' + domain.toLowerCase())).trim();
    var existing = design.archPages.filter(function (p) { return String(p.name).toLowerCase() === name.toLowerCase(); })[0];
    if (existing) return existing;
    var page = { name: name, domain: domain, kind: 'arch' };
    design.archPages.push(page);
    touch(ui, 'add-arch-page');
    return page;
  };

  NS.addDesignIpConfigPage = function (ui, design, name) {
    if (!design) return null;
    name = String(name || '').trim(); if (!name) return null;
    if (!Array.isArray(design.ipConfigPages)) design.ipConfigPages = [];
    var existing = design.ipConfigPages.filter(function (p) { return String(p.name).toLowerCase() === name.toLowerCase(); })[0];
    if (existing) return existing;
    var page = { name: name, kind: 'ip_config' };
    design.ipConfigPages.push(page);
    touch(ui, 'add-design-ipconfig-page');
    return page;
  };

  NS.getDefaultDesign = function (ui) {
    var pm = ensureProjectModel(ui);
    return pm.designs && pm.designs[0] || null;
  };

  NS.openLogicalPage = function (ui, target) {
    if (!ui || !target) return false;
    var title = target.name || target.title || 'page';
    if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.ensurePageTab === 'function') {
      try { global.DFTPageSessionManager.ensurePageTab(ui, title); } catch (e) {}
    } else if (ui && typeof ui.createTabForPage === 'function') {
      try { ui.createTabForPage(title); } catch (e2) {}
    }
    if (ui && ui._phase1) ui._activeLogicalPage = target;
    if (ui && typeof ui.logDockOutput === 'function') {
      ui.logDockOutput('Opened ' + (target.kind || 'page') + ': ' + title, 'info');
    }
    touch(ui, 'open-logical-page');
    return true;
  };

  NS.getDesignByName = function (ui, name) {
    var pm = ensureProjectModel(ui);
    name = String(name || '').toLowerCase();
    return pm.designs.filter(function (d) { return String(d.name).toLowerCase() === name; })[0] || null;
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : this)));
