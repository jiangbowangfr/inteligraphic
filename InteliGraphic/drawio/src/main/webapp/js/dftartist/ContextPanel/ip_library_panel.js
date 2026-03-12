(function (global) {
    'use strict';

    var THIRD_PARTY_CATEGORY = 'third_party_ip';
    var SOFTWARE_STORAGE_KEY = 'dft.third_party_ip_registry.v1';
    var PREF_STORAGE_KEY = 'dft.third_party_ip_import_prefs.v1';
    var PROJECT_REGISTRY_FILE = 'third_party_ip_registry.json';

    function el(tag, cls, text) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text != null) node.textContent = text;
        return node;
    }

    function safeText(v) {
        return v == null ? '' : String(v);
    }

    function normalize(v) {
        return safeText(v).toLowerCase();
    }

    function stop(evt) {
        if (!evt) return;
        if (evt.preventDefault) evt.preventDefault();
        if (evt.stopPropagation) evt.stopPropagation();
    }

    function cloneJson(v) {
        try { return JSON.parse(JSON.stringify(v)); } catch (e) { return null; }
    }

    function request(msg) {
        if (typeof global.requestSync === 'function') {
            return global.requestSync(msg);
        }
        if (global.electron && typeof global.electron.requestPromise === 'function') {
            return global.electron.requestPromise(msg);
        }
        return Promise.reject(new Error('IPC bridge unavailable'));
    }

    function parseTextList(text) {
        return safeText(text)
            .split(/\r?\n|;/)
            .map(function (line) { return safeText(line).trim(); })
            .filter(Boolean);
    }

    function basename(filePath) {
        var s = safeText(filePath).replace(/\\/g, '/');
        var idx = s.lastIndexOf('/');
        return idx >= 0 ? s.slice(idx + 1) : s;
    }

    function dirname(filePath) {
        var s = safeText(filePath).replace(/\\/g, '/');
        var idx = s.lastIndexOf('/');
        return idx > 0 ? s.slice(0, idx) : '';
    }

    function joinPath() {
        var parts = [];
        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i] != null && arguments[i] !== '') parts.push(String(arguments[i]));
        }
        return parts.join('/').replace(/\\/g, '/').replace(/\/+/g, '/');
    }

    function slugify(v) {
        var s = safeText(v).trim().replace(/\n/g, ' ');
        s = s.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        return s ? s.toLowerCase() : 'ip';
    }

    function sanitizeFileName(v) {
        var s = safeText(v).trim();
        s = s.replace(/[\\/:*?"<>|]+/g, '_');
        return s || 'page';
    }

    function uniqueName(baseName, existingNames, preferredIndex) {
        var base = safeText(baseName).trim() || 'module';
        var set = existingNames || {};
        if (!set[normalize(base)] && !preferredIndex) return base;
        var idx = Math.max(2, preferredIndex || 2);
        var next = base + '_' + idx;
        while (set[normalize(next)]) {
            idx += 1;
            next = base + '_' + idx;
        }
        return next;
    }

    function getGraph(ui) {
        return ui && ui.editor && ui.editor.graph ? ui.editor.graph : null;
    }

    function getProjectRoot(ui) {
        return safeText((ui && (ui._projectRootPath || ui._projectYamlDir)) || (ui && ui.projectModel && ui.projectModel.path) || '').trim();
    }

    function ensureProjectDesigns(model) {
        if (!model) return [];
        if (!Array.isArray(model.designs) && Array.isArray(model.cores)) model.designs = model.cores;
        if (!Array.isArray(model.designs)) model.designs = [];
        return model.designs;
    }

    function isIpConfigDesign(design) {
        if (!design) return false;
        if (normalize(design.__kind) === 'ipconfig-container') return true;
        if (normalize(design.name) === 'ipconfig') return true;
        if (Array.isArray(design._dirRel) && normalize(design._dirRel.join('/')) === 'ipconfig') return true;
        return false;
    }

    function ensureIpConfigDesign(ui) {
        var model = ui && ui.projectModel;
        if (!model) return null;
        var designs = ensureProjectDesigns(model);
        for (var i = 0; i < designs.length; i++) {
            if (isIpConfigDesign(designs[i])) return designs[i];
        }

        var root = getProjectRoot(ui);
        var design = {
            name: 'ipconfig',
            __kind: 'ipconfig-container',
            pages: [],
            sub_designs: [],
            env_file: '',
            page_meta: {},
            _dirRel: ['ipconfig']
        };
        if (root) design._absDir = joinPath(root, 'ipconfig');
        designs.push(design);
        return design;
    }

    async function ensureIpConfigPageSlot(ui, designRef, pageName) {
        if (!ui || !designRef || !pageName) return '';
        if (global.DFTProjectExplorerPhase2 && typeof global.DFTProjectExplorerPhase2.createPageFileSlot === 'function') {
            return global.DFTProjectExplorerPhase2.createPageFileSlot(ui, designRef, pageName);
        }
        if (typeof global._createPageFileSlot === 'function') {
            return global._createPageFileSlot(ui, designRef, pageName);
        }

        var root = getProjectRoot(ui);
        if (!root) return '';
        var pageDir = joinPath(root, 'ipconfig', 'page');
        var abs = joinPath(pageDir, sanitizeFileName(pageName) + '.dftart');
        await request({ action: 'ensureDirs', path: pageDir });

        var exists = true;
        try { await request({ action: 'fileStat', file: abs }); } catch (e) { exists = false; }
        if (!exists) {
            await request({ action: 'writeFile', path: abs, data: '<mxGraphModel><root/></mxGraphModel>', enc: 'utf-8' });
        }
        return abs;
    }

    async function ensureIpConfigPagesForProjectItems(ui, items) {
        var root = getProjectRoot(ui);
        if (!root || !Array.isArray(items) || !items.length) return [];

        var design = ensureIpConfigDesign(ui);
        if (!design) return [];
        design.pages = Array.isArray(design.pages) ? design.pages : [];
        design.page_meta = design.page_meta || {};

        var created = [];
        var taken = {};
        (design.pages || []).forEach(function (name) { taken[normalize(name)] = true; });

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (!item || normalize(item.scope) !== 'project') continue;

            var baseName = safeText(item.moduleName || item.sourceModuleName || item.dftsType || item.key).trim() || 'third_party_ip';
            var pageName = baseName;
            if (taken[normalize(pageName)]) continue;

            pageName = uniqueName(baseName, taken);
            taken[normalize(pageName)] = true;

            design.pages.push(pageName);
            design.page_meta[pageName] = {
                kind: 'third_party_ip',
                source_key: safeText(item.key),
                source_type: safeText(item.dftsType),
                source_path: safeText(item.sourcePath)
            };
            await ensureIpConfigPageSlot(ui, design, pageName);
            created.push(pageName);
        }

        if (created.length) {
            if (typeof global._autoSaveProjectYaml === 'function') {
                try { global._autoSaveProjectYaml(ui, 'thirdPartyImport'); } catch (e2) { }
            }
            if (typeof global.DFTNotifyProjectExplorerRefresh === 'function') {
                try { global.DFTNotifyProjectExplorerRefresh(ui, 'thirdPartyImport'); } catch (e3) { }
            }
        }
        return created;
    }

    function getRegistry() {
        var defs = [];
        var seen = {};

        function pushDefs(ns, sourceName, defaultCategory) {
            if (!ns || !ns._defsByKey) return;
            for (var key in ns._defsByKey) {
                if (!Object.prototype.hasOwnProperty.call(ns._defsByKey, key)) continue;
                var def = ns._defsByKey[key];
                if (!def || seen[key]) continue;
                var copy = {};
                for (var name in def) {
                    if (Object.prototype.hasOwnProperty.call(def, name)) copy[name] = def[name];
                }
                copy.__panelSource = sourceName;
                if (!copy.category && defaultCategory) copy.category = defaultCategory;
                defs.push(copy);
                seen[key] = true;
            }
        }

        pushDefs(global.DftsIP, 'ip', 'other');
        pushDefs(global.DftsFloorplan, 'floorplan', 'floorplan');

        defs.sort(function (a, b) {
            var order = {
                functional: 1,
                logic_gate: 2,
                floorplan: 3,
                third_party_ip: 4,
                interface: 5,
                data_source: 6,
                other: 99
            };
            var ca = normalize(a.category || 'other');
            var cb = normalize(b.category || 'other');
            var oa = order[ca] || order.other;
            var ob = order[cb] || order.other;
            if (oa !== ob) return oa - ob;
            var la = normalize((a.defaultLabel || a.key || '').replace(/\n/g, ' '));
            var lb = normalize((b.defaultLabel || b.key || '').replace(/\n/g, ' '));
            return la < lb ? -1 : (la > lb ? 1 : 0);
        });
        return defs;
    }

    function getCategoryLabel(cat) {
        var key = normalize(cat);
        if (key === 'functional') return 'DftArt IP';
        if (key === 'logic_gate') return 'Logic Gate';
        if (key === 'floorplan') return 'Floorplan';
        if (key === THIRD_PARTY_CATEGORY) return '3rd Party IP';
        if (key === 'interface') return 'Floorplan Interface';
        if (key === 'data_source') return 'Floorplan Source';
        return cat || 'Other';
    }

    function getActivePageContext(ui) {
        try {
            if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.getActiveContext === 'function') {
                return global.DFTPageSessionManager.getActiveContext(ui);
            }
        } catch (e) { }
        return ui && ui._activeProjectPageCtx ? ui._activeProjectPageCtx : null;
    }

    function hasOpenPage(ui) {
        var ctx = getActivePageContext(ui);
        return !!(ctx && ctx.name);
    }

    function dockInfo(ui, level, text, meta) {
        try {
            if (ui && typeof ui.logDockOutput === 'function') {
                ui.logDockOutput(text, level || 'info', meta || { source: 'ip-library' });
            }
        } catch (e) { }
        try {
            if (ui && typeof ui.pushDockMessage === 'function' && (level === 'warning' || level === 'error')) {
                ui.pushDockMessage({ level: level, text: text, source: 'ip-library' });
            }
        } catch (e2) { }
        try {
            if (ui && typeof ui.focusDockTab === 'function') {
                ui.focusDockTab(level === 'warning' || level === 'error' ? 'messages' : 'output');
            }
        } catch (e3) { }
    }

    function countPins(def) {
        var out = { west: 0, east: 0, north: 0, south: 0, total: 0 };
        if (!def) return out;

        try {
            if (typeof def.pinsFactory === 'function') {
                var pins = def.pinsFactory() || {};
                ['west', 'east', 'north', 'south'].forEach(function (side) {
                    var arr = Array.isArray(pins[side]) ? pins[side] : [];
                    out[side] = arr.length;
                    out.total += arr.length;
                });
                return out;
            }
        } catch (e) { }

        try {
            if (normalize(def.category) === 'logic_gate') {
                var LG = global.DftsIP && global.DftsIP.LogicGate;
                var Model = LG && LG.Model;
                if (Model && typeof Model.buildPins === 'function') {
                    var pins2 = Model.buildPins(def, {
                        gateKind: def.gateKind,
                        params: def.defaultParams || {}
                    }) || [];
                    (pins2 || []).forEach(function (pin) {
                        var side = normalize(pin && pin.side || 'west');
                        if (!Object.prototype.hasOwnProperty.call(out, side)) side = 'west';
                        out[side] += 1;
                        out.total += 1;
                    });
                }
            }
        } catch (e2) { }

        return out;
    }

    function buildIntro(def) {
        if (!def) return '';
        if (def.description) return safeText(def.description);
        var pins = countPins(def);
        var parts = [];
        parts.push(getCategoryLabel(def.category));
        if (def.__thirdPartyScope) {
            parts.push(def.__thirdPartyScope === 'software' ? 'Software IP' : 'Project IP');
        }
        if (pins.total) {
            parts.push('Pins ' + pins.total + ' (L' + pins.west + '/R' + pins.east + '/T' + pins.north + '/B' + pins.south + ')');
        }
        if (def.configKey) parts.push('Supports configuration');
        if (def.dftsType) parts.push('Type ' + safeText(def.dftsType));
        return parts.join(' · ');
    }

    function previewSvg(def) {
        var pins = countPins(def);
        var w = 170, h = 84;
        var rx = def && def.rounded ? Math.max(2, Math.min(14, parseInt(def.rounded, 10) || 0)) : 2;
        var bw = 92, bh = 40;
        var bx = 39, by = 22;
        var label = safeText((def && (def.defaultLabel || def.key)) || 'IP').replace(/\n/g, ' ');
        if (label.length > 16) label = label.slice(0, 15) + '…';
        var lines = [];
        var i;
        for (i = 0; i < pins.west; i++) {
            var wy = by + ((i + 1) * bh / (pins.west + 1));
            lines.push('<line x1="12" y1="' + wy.toFixed(1) + '" x2="' + bx + '" y2="' + wy.toFixed(1) + '" stroke="#64748b" stroke-width="1.5" />');
        }
        for (i = 0; i < pins.east; i++) {
            var ey = by + ((i + 1) * bh / (pins.east + 1));
            lines.push('<line x1="' + (bx + bw) + '" y1="' + ey.toFixed(1) + '" x2="158" y2="' + ey.toFixed(1) + '" stroke="#64748b" stroke-width="1.5" />');
        }
        for (i = 0; i < pins.north; i++) {
            var nx = bx + ((i + 1) * bw / (pins.north + 1));
            lines.push('<line x1="' + nx.toFixed(1) + '" y1="10" x2="' + nx.toFixed(1) + '" y2="' + by + '" stroke="#64748b" stroke-width="1.5" />');
        }
        for (i = 0; i < pins.south; i++) {
            var sx = bx + ((i + 1) * bw / (pins.south + 1));
            lines.push('<line x1="' + sx.toFixed(1) + '" y1="' + (by + bh) + '" x2="' + sx.toFixed(1) + '" y2="74" stroke="#64748b" stroke-width="1.5" />');
        }
        return '' +
            '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">' +
            '<rect x="0.5" y="0.5" width="169" height="83" rx="12" fill="#ffffff" stroke="#e2e8f0"/>' +
            lines.join('') +
            '<rect x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + bh + '" rx="' + rx + '" fill="#f8fafc" stroke="#334155" stroke-width="1.6" />' +
            '<text x="85" y="47" text-anchor="middle" font-size="11" font-family="Arial,Helvetica,sans-serif" fill="#0f172a">' +
            label.replace(/[&<>]/g, function (s) { return s === '&' ? '&amp;' : (s === '<' ? '&lt;' : '&gt;'); }) +
            '</text>' +
            '</svg>';
    }

    function insertDefinition(ui, def) {
        var graph = getGraph(ui);
        var isFloorplan = !!(def && def.__panelSource === 'floorplan');
        var NS = isFloorplan ? global.DftsFloorplan : global.DftsIP;
        if (!NS || !graph || !def || !def.key || typeof NS.createByKey !== 'function') {
            throw new Error('IP registry / graph unavailable');
        }

        if (!isFloorplan) {
            if (typeof NS.ensureGraphPatches === 'function') NS.ensureGraphPatches(graph);
            if (typeof NS.installEditingPolicy === 'function') NS.installEditingPolicy(ui);
            if (typeof NS.installConfigAction === 'function') NS.installConfigAction(ui);
        }

        var cell = NS.createByKey(graph, def.key, {});
        var parent = graph.getDefaultParent ? graph.getDefaultParent() : null;
        var geo = cell && cell.geometry ? cell.geometry.clone() : null;
        var w = geo ? (geo.width || 220) : 220;
        var h = geo ? (geo.height || 120) : 120;
        var scale = (graph.view && graph.view.scale) || 1;
        var tr = (graph.view && graph.view.translate) || { x: 0, y: 0 };
        var c = graph.container;
        var x = 60;
        var y = 60;
        if (c) {
            x = ((c.scrollLeft || 0) + c.clientWidth / 2) / scale - tr.x - w / 2;
            y = ((c.scrollTop || 0) + c.clientHeight / 2) / scale - tr.y - h / 2;
        }

        var inserted = null;
        if (typeof graph.importCells === 'function') {
            var arr = graph.importCells([cell], x, y, parent) || [];
            inserted = arr[0] || null;
        } else {
            var model = graph.getModel && graph.getModel();
            if (geo && model) {
                geo.x = x; geo.y = y; cell.geometry = geo;
                model.beginUpdate();
                try { model.add(parent, cell); } finally { model.endUpdate(); }
                inserted = cell;
            }
        }

        if (inserted && typeof graph.setSelectionCell === 'function') graph.setSelectionCell(inserted);
        dockInfo(ui, 'success', 'Added IP to current page: ' + safeText(def.defaultLabel || def.key), { source: 'ip-library' });
        return inserted;
    }

    function insertDefinitionAtClientPoint(ui, def, clientX, clientY) {
        var graph = getGraph(ui);
        var isFloorplan = !!(def && def.__panelSource === 'floorplan');
        var NS = isFloorplan ? global.DftsFloorplan : global.DftsIP;
        if (!NS || !graph || !def || !def.key || typeof NS.createByKey !== 'function') throw new Error('IP registry / graph unavailable');
        if (!isFloorplan) {
            if (typeof NS.ensureGraphPatches === 'function') NS.ensureGraphPatches(graph);
            if (typeof NS.installEditingPolicy === 'function') NS.installEditingPolicy(ui);
            if (typeof NS.installConfigAction === 'function') NS.installConfigAction(ui);
        }

        var cell = NS.createByKey(graph, def.key, {});
        var parent = graph.getDefaultParent ? graph.getDefaultParent() : null;
        var geo = cell && cell.geometry ? cell.geometry.clone() : null;
        var w = geo ? (geo.width || 220) : 220;
        var h = geo ? (geo.height || 120) : 120;
        var scale = (graph.view && graph.view.scale) || 1;
        var tr = (graph.view && graph.view.translate) || { x: 0, y: 0 };
        var rect = graph.container && graph.container.getBoundingClientRect ? graph.container.getBoundingClientRect() : { left: 0, top: 0 };
        var x = (clientX - rect.left) / scale - tr.x - w / 2;
        var y = (clientY - rect.top) / scale - tr.y - h / 2;

        var arr = graph.importCells([cell], x, y, parent) || [];
        var inserted = arr[0] || null;
        if (inserted && typeof graph.setSelectionCell === 'function') graph.setSelectionCell(inserted);
        return inserted;
    }

    function create(ui) {
        var api = {};
        var state = {
            query: '',
            sections: {},
            selectedKey: '',
            hoverKey: '',
            thirdParty: {
                items: [],
                loadedRoot: null,
                loadedKeys: [],
                loading: false
            },
            manager: {
                draft: [],
                selectedIds: {},
                activeId: '',
                overlay: null,
                dialog: null,
                listHost: null,
                scopeSelect: null,
                slangInput: null,
                definesBox: null,
                includeBox: null,
                detailTitle: null,
                detailMeta: null,
                detailPorts: null,
                detailDiag: null,
                detailScope: null,
                footerHint: null,
                saveBtn: null,
                shown: false
            }
        };

        var root = null;
        var listHost = null;
        var searchInput = null;
        var statusText = null;
        var previewBox = null;

        function getImportPrefs() {
            try {
                var raw = global.localStorage ? global.localStorage.getItem(PREF_STORAGE_KEY) : '';
                var parsed = raw ? JSON.parse(raw) : {};
                return {
                    slangPath: safeText(parsed && parsed.slangPath).trim(),
                    defines: Array.isArray(parsed && parsed.defines) ? parsed.defines.slice() : [],
                    includeDirs: Array.isArray(parsed && parsed.includeDirs) ? parsed.includeDirs.slice() : []
                };
            } catch (e) {
                return { slangPath: '', defines: [], includeDirs: [] };
            }
        }

        function saveImportPrefs(prefs) {
            try {
                if (!global.localStorage) return;
                global.localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify({
                    slangPath: safeText(prefs && prefs.slangPath).trim(),
                    defines: Array.isArray(prefs && prefs.defines) ? prefs.defines.slice() : [],
                    includeDirs: Array.isArray(prefs && prefs.includeDirs) ? prefs.includeDirs.slice() : []
                }));
            } catch (e) { }
        }

        function readSoftwareItems() {
            try {
                if (!global.localStorage) return [];
                var raw = global.localStorage.getItem(SOFTWARE_STORAGE_KEY);
                if (!raw) return [];
                var parsed = JSON.parse(raw);
                var arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed && parsed.items) ? parsed.items : []);
                return normalizeStoredItems(arr, 'software');
            } catch (e) {
                dockInfo(ui, 'warning', 'Failed to read Software IP registry: ' + e.message, { source: 'ip-library' });
                return [];
            }
        }

        function writeSoftwareItems(items) {
            if (!global.localStorage) throw new Error('localStorage unavailable');
            global.localStorage.setItem(SOFTWARE_STORAGE_KEY, JSON.stringify({ version: 1, items: items || [] }));
        }

        function getProjectRegistryPath() {
            var rootPath = getProjectRoot(ui);
            if (!rootPath) return '';
            return joinPath(rootPath, 'ip_config', PROJECT_REGISTRY_FILE);
        }

        async function readProjectItems() {
            var filePath = getProjectRegistryPath();
            if (!filePath) return [];
            try {
                var text = await request({ action: 'readFile', filename: filePath, encoding: 'utf-8' });
                if (!text) return [];
                var parsed = JSON.parse(text);
                var arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed && parsed.items) ? parsed.items : []);
                return normalizeStoredItems(arr, 'project');
            } catch (e) {
                if (/ENOENT|no such file|not found/i.test(safeText(e && e.message))) return [];
                dockInfo(ui, 'warning', 'Failed to read Project IP registry: ' + e.message, { source: 'ip-library' });
                return [];
            }
        }

        async function writeProjectItems(items) {
            var filePath = getProjectRegistryPath();
            if (!filePath) {
                if ((items || []).length) throw new Error('Open or save a project before saving Project IP.');
                return;
            }
            var dirPath = joinPath(getProjectRoot(ui), 'ip_config');
            await request({ action: 'ensureDirs', path: dirPath });
            await request({ action: 'writeFile', path: filePath, data: JSON.stringify({ version: 1, items: items || [] }, null, 2), enc: 'utf-8' });
        }

        function normalizeStoredItems(items, defaultScope) {
            var out = [];
            (items || []).forEach(function (item) {
                if (!item) return;
                var scope = normalize(item.scope) === 'software' ? 'software' : 'project';
                if (!scope && defaultScope) scope = defaultScope;
                if (!scope) scope = 'project';
                var moduleName = safeText(item.moduleName || item.displayLabel || item.name).trim();
                if (!moduleName) return;
                var ports = Array.isArray(item.ports) ? item.ports : [];
                var diagnostics = Array.isArray(item.diagnostics) ? item.diagnostics : [];
                var norm = buildThirdPartyItem({
                    moduleName: moduleName,
                    sourceFileName: safeText(item.sourceFileName || basename(item.sourcePath)),
                    sourcePath: safeText(item.sourcePath),
                    ports: cloneJson(ports) || [],
                    diagnostics: cloneJson(diagnostics) || [],
                    scope: scope,
                    key: safeText(item.key),
                    dftsType: safeText(item.dftsType),
                    createdAt: safeText(item.createdAt),
                    sourceModuleName: safeText(item.sourceModuleName || moduleName)
                }, out);
                out.push(norm);
            });
            return out;
        }

        function buildThirdPartyItem(src, existingItems) {
            var existing = Array.isArray(existingItems) ? existingItems : [];
            var moduleName = safeText(src.moduleName || src.name).trim() || 'module';
            var scope = normalize(src.scope) === 'software' ? 'software' : 'project';
            var allNames = {};
            var allKeys = {};
            var allTypes = {};
            existing.forEach(function (item) {
                if (!item) return;
                allNames[normalize(item.scope + '::' + item.moduleName)] = true;
                allKeys[normalize(item.key)] = true;
                allTypes[normalize(item.dftsType)] = true;
            });
            var explicitKey = safeText(src.key).trim();
            var explicitType = safeText(src.dftsType).trim();
            var keyBase = 'third_party_ip__' + scope + '__' + slugify(moduleName);
            var typeBase = 'third_party_' + scope + '_' + slugify(moduleName);
            var key = explicitKey || keyBase;
            var dftsType = explicitType || typeBase;
            var suffix = 2;
            while (!explicitKey && allKeys[normalize(key)]) {
                key = keyBase + '_' + suffix;
                suffix += 1;
            }
            suffix = 2;
            while (!explicitType && allTypes[normalize(dftsType)]) {
                dftsType = typeBase + '_' + suffix;
                suffix += 1;
            }
            return {
                id: key,
                key: key,
                dftsType: dftsType,
                category: THIRD_PARTY_CATEGORY,
                scope: scope,
                moduleName: moduleName,
                sourceModuleName: safeText(src.sourceModuleName || moduleName) || moduleName,
                sourceFileName: safeText(src.sourceFileName || basename(src.sourcePath)),
                sourcePath: safeText(src.sourcePath),
                ports: Array.isArray(src.ports) ? cloneJson(src.ports) || [] : [],
                diagnostics: Array.isArray(src.diagnostics) ? cloneJson(src.diagnostics) || [] : [],
                createdAt: safeText(src.createdAt || new Date().toISOString()),
                language: safeText(src.language || 'verilog') || 'verilog',
                generator: safeText(src.generator),
                derivedFrom: safeText(src.derivedFrom),
                generatedArtifacts: cloneJson(src.generatedArtifacts) || null
            };
        }

        function makePinsFactory(ports) {
            var grouped = { west: [], east: [], north: [], south: [] };
            (ports || []).forEach(function (port, idx) {
                if (!port || !port.name) return;
                var side = normalize(port.side);
                if (!grouped[side]) side = (normalize(port.direction) === 'output') ? 'east' : (normalize(port.direction) === 'inout' ? 'south' : 'west');
                grouped[side].push({
                    name: safeText(port.name || ('pin_' + (idx + 1))),
                    displayName: safeText(port.displayName || port.name || ('pin_' + (idx + 1))),
                    type: safeText(port.pinType || port.type || (normalize(port.direction) === 'output' ? 'data_out' : (normalize(port.direction) === 'inout' ? 'inout' : 'data_in'))),
                    dir: safeText(port.direction || port.dir || ''),
                    pinKey: safeText(port.pinKey || slugify(port.name || ('pin_' + (idx + 1)))),
                    range: safeText(port.range || port.bus || ''),
                    busWidth: port.busWidth != null ? Number(port.busWidth) : undefined,
                    side: side
                });
            });
            return function () {
                return {
                    west: cloneJson(grouped.west) || [],
                    east: cloneJson(grouped.east) || [],
                    north: cloneJson(grouped.north) || [],
                    south: cloneJson(grouped.south) || []
                };
            };
        }

        function computeDefSize(item) {
            var west = 0, east = 0, north = 0, south = 0;
            (item.ports || []).forEach(function (port) {
                var side = normalize(port.side);
                if (side === 'east') east += 1;
                else if (side === 'north') north += 1;
                else if (side === 'south') south += 1;
                else west += 1;
            });
            var maxVertical = Math.max(west, east, 1);
            var maxHorizontal = Math.max(north, south, 0);
            var h = Math.max(90, 46 + maxVertical * 28);
            var w = Math.max(230, 170 + maxHorizontal * 28);
            return { w: w, h: h };
        }

        function makeThirdPartyDef(item) {
            var NS = global.DftsIP || {};
            var size = computeDefSize(item);
            var scopeLabel = item.scope === 'software' ? 'Software IP' : 'Project IP';
            return {
                key: item.key,
                dftsType: item.dftsType,
                defaultLabel: item.moduleName,
                category: THIRD_PARTY_CATEGORY,
                labelPolicy: NS.POLICY ? NS.POLICY.LABEL_FIXED : 'fixed',
                instancePolicy: NS.POLICY ? NS.POLICY.INSTANCE_DISABLED : 'disabled',
                lockBodyLabel: false,
                rounded: 8,
                strokeWidth: 1,
                bodyFont: 18,
                pinFont: 14,
                w: size.w,
                h: size.h,
                description: scopeLabel + ' · ' + (item.sourceFileName || 'Verilog') + ' · ' + (item.ports || []).length + ' port(s)',
                pinsFactory: makePinsFactory(item.ports || []),
                __thirdPartyManaged: true,
                __thirdPartyScope: item.scope,
                __thirdPartySourcePath: item.sourcePath,
                __thirdPartyItem: cloneJson(item)
            };
        }

        function estimateGeneratedPaths(payload) {
            payload = payload || {};
            var sourceItem = payload.sourceItem || null;
            var scope = normalize(payload.scope) === 'software' ? 'software' : 'project';
            var moduleName = safeText(payload.moduleName || (sourceItem && sourceItem.moduleName) || 'wrapper').trim() || 'wrapper';
            var projectRoot = getProjectRoot(ui);
            var outDir = '';
            if (scope === 'project' && projectRoot) {
                outDir = joinPath(projectRoot, 'ip_config', 'generated');
            }
            if (!outDir) {
                var srcDir = dirname(sourceItem && sourceItem.sourcePath);
                if (srcDir) outDir = joinPath(srcDir, 'generated');
            }
            if (!outDir && projectRoot) {
                outDir = joinPath(projectRoot, 'ip_config', 'generated');
            }
            return {
                vPath: outDir ? joinPath(outDir, moduleName + '.v') : '',
                iclPath: outDir ? joinPath(outDir, moduleName + '.icl') : ''
            };
        }

        async function addOrReplaceGeneratedWrapper(payload) {
            payload = payload || {};
            await ensureThirdPartyLoaded();

            var sourceItem = payload.sourceItem || null;
            var scope = normalize(payload.scope) === 'software' ? 'software' : 'project';
            var moduleName = safeText(payload.moduleName).trim();
            if (!moduleName) throw new Error('Wrapper module name is required.');
            if (!payload.verilogText || !payload.iclText) throw new Error('Wrapper file content is empty.');

            var paths = estimateGeneratedPaths({ sourceItem: sourceItem, scope: scope, moduleName: moduleName });
            if (!paths.vPath || !paths.iclPath) {
                throw new Error('No writable output directory was resolved. Open/save a project or import HDL from a local file path first.');
            }

            var existing = (state.thirdParty.items || []).slice();
            var sameName = null;
            for (var i = 0; i < existing.length; i++) {
                if (normalize(existing[i].scope) === scope && normalize(existing[i].moduleName) === normalize(moduleName)) {
                    sameName = existing[i];
                    break;
                }
            }

            var explicitKey = '';
            var explicitType = '';
            if (sameName) {
                var mode = resolveImportCollision({ moduleName: moduleName }, sameName);
                if (mode === 'overwrite') {
                    explicitKey = sameName.key;
                    explicitType = sameName.dftsType;
                    existing = existing.filter(function (it) { return it.key !== sameName.key; });
                } else {
                    var nameSet = {};
                    existing.forEach(function (item) {
                        nameSet[normalize(item.scope + '::' + item.moduleName)] = true;
                    });
                    moduleName = uniqueName(moduleName, nameSet);
                    paths = estimateGeneratedPaths({ sourceItem: sourceItem, scope: scope, moduleName: moduleName });
                }
            }

            await request({ action: 'ensureDirs', path: dirname(paths.vPath) });
            await request({ action: 'writeFile', path: paths.vPath, data: String(payload.verilogText), enc: 'utf-8' });
            await request({ action: 'writeFile', path: paths.iclPath, data: String(payload.iclText), enc: 'utf-8' });

            var nextItem = buildThirdPartyItem({
                moduleName: moduleName,
                sourceModuleName: safeText(sourceItem && (sourceItem.sourceModuleName || sourceItem.moduleName)) || moduleName,
                sourceFileName: basename(paths.vPath),
                sourcePath: paths.vPath,
                ports: cloneJson(payload.wrapperPorts) || [],
                diagnostics: [],
                scope: scope,
                key: explicitKey,
                dftsType: explicitType,
                language: 'verilog',
                generator: 'dfx_wrapper_v1',
                derivedFrom: safeText(sourceItem && (sourceItem.key || sourceItem.dftsType)),
                generatedArtifacts: {
                    verilogPath: paths.vPath,
                    iclPath: paths.iclPath
                }
            }, existing);

            existing.push(nextItem);
            await saveThirdPartyItems(existing);
            renderList();
            return {
                item: cloneJson(nextItem),
                vPath: paths.vPath,
                iclPath: paths.iclPath
            };
        }

        function syncThirdPartyRegistry(items) {
            var NS = global.DftsIP;
            if (!NS || typeof NS.registerDefinition !== 'function') return;
            NS._defsByKey = NS._defsByKey || {};
            NS._defsByType = NS._defsByType || {};
            var nextKeys = {};
            var nextList = [];
            (items || []).forEach(function (item) {
                if (!item || !item.key) return;
                nextKeys[item.key] = true;
                nextList.push(item.key);
            });

            (state.thirdParty.loadedKeys || []).forEach(function (oldKey) {
                if (nextKeys[oldKey]) return;
                var oldDef = NS._defsByKey[oldKey];
                if (oldDef && oldDef.__thirdPartyManaged) {
                    delete NS._defsByKey[oldKey];
                    if (oldDef.dftsType && NS._defsByType[oldDef.dftsType] === oldDef) {
                        delete NS._defsByType[oldDef.dftsType];
                    }
                }
            });

            (items || []).forEach(function (item) {
                var def = makeThirdPartyDef(item);
                NS.registerDefinition(def);
            });

            state.thirdParty.items = cloneJson(items) || [];
            state.thirdParty.loadedKeys = nextList;
        }

        async function ensureThirdPartyLoaded() {
            var rootPath = getProjectRoot(ui) || '';
            if (state.thirdParty.loading) return;
            if (state.thirdParty.loadedRoot === rootPath && state.thirdParty.loadedKeys && state.thirdParty.loadedKeys.length >= 0) {
                return;
            }
            state.thirdParty.loading = true;
            try {
                var software = readSoftwareItems();
                var project = rootPath ? await readProjectItems() : [];
                var merged = [];
                software.forEach(function (item) { merged.push(item); });
                project.forEach(function (item) { merged.push(item); });
                syncThirdPartyRegistry(merged);
                state.thirdParty.loadedRoot = rootPath;
            } finally {
                state.thirdParty.loading = false;
            }
        }

        async function saveThirdPartyItems(allItems) {
            var items = cloneJson(allItems) || [];
            var projectItems = items.filter(function (item) { return normalize(item.scope) === 'project'; });
            var softwareItems = items.filter(function (item) { return normalize(item.scope) === 'software'; });
            if (projectItems.length && !getProjectRoot(ui)) {
                throw new Error('Open or save a project before saving Project IP.');
            }
            writeSoftwareItems(softwareItems);
            if (getProjectRoot(ui)) {
                await writeProjectItems(projectItems);
            } else if (projectItems.length) {
                throw new Error('Project IP requires a project path.');
            }
            syncThirdPartyRegistry(items);
            state.thirdParty.loadedRoot = getProjectRoot(ui) || '';
            try {
                var createdPages = await ensureIpConfigPagesForProjectItems(ui, projectItems);
                if (createdPages.length) {
                    dockInfo(ui, 'info', 'Created ipconfig page(s): ' + createdPages.join(', '), { source: 'ip-library' });
                }
            } catch (e4) {
                dockInfo(ui, 'warning', 'Saved 3rd Party IP but failed to create ipconfig page: ' + e4.message, { source: 'ip-library' });
            }
        }

        function ensureBuilt() {
            if (root) return;
            root = el('div', 'dftctx-panel dftctx-ip');

            var toolbar = el('div', 'dftctx-panel-toolbar compact');
            var searchWrap = el('div', 'dftctx-search-wrap');
            searchInput = document.createElement('input');
            searchInput.className = 'dftctx-search';
            searchInput.type = 'text';
            searchInput.placeholder = 'Search IP';
            searchInput.oninput = function () {
                state.query = searchInput.value || '';
                renderList();
            };
            searchWrap.appendChild(searchInput);
            toolbar.appendChild(searchWrap);

            var importBtn = el('button', 'dftctx-btn', 'Import HDL');
            importBtn.type = 'button';
            importBtn.onclick = function () {
                openManager().catch(function (e) {
                    dockInfo(ui, 'error', 'Import HDL failed: ' + e.message, { source: 'ip-library' });
                });
            };
            toolbar.appendChild(importBtn);

            var refreshBtn = el('button', 'dftctx-btn', 'Refresh');
            refreshBtn.type = 'button';
            refreshBtn.onclick = function () { refresh(); };
            toolbar.appendChild(refreshBtn);
            root.appendChild(toolbar);

            statusText = el('div', 'dftctx-hint');
            root.appendChild(statusText);

            previewBox = el('div', 'dftctx-ip-previewbox');
            previewBox.innerHTML = '<div class="dftctx-ip-preview-empty">Hover an IP to see preview and description.</div>';
            root.appendChild(previewBox);

            listHost = el('div', 'dftctx-panel-body dftctx-ip-list');
            root.appendChild(listHost);
        }

        function currentDefs() {
            var defs = getRegistry();
            var filtered = [];
            for (var i = 0; i < defs.length; i++) {
                var def = defs[i];
                if (!state.query) { filtered.push(def); continue; }
                var q = normalize(state.query);
                if (normalize(def.key).indexOf(q) >= 0 ||
                    normalize(def.defaultLabel).indexOf(q) >= 0 ||
                    normalize(def.dftsType).indexOf(q) >= 0 ||
                    normalize(def.category).indexOf(q) >= 0) {
                    filtered.push(def);
                }
            }
            return filtered;
        }

        function showHover(def) {
            ensureBuilt();
            state.hoverKey = def.key;
            previewBox.innerHTML = '' +
                '<div class="dftctx-ip-preview-title">' + safeText((def.defaultLabel || def.key)).replace(/\n/g, ' ') + '</div>' +
                '<div class="dftctx-ip-preview-graphic">' + previewSvg(def) + '</div>' +
                '<div class="dftctx-ip-preview-desc">' + buildIntro(def) + '</div>';
        }

        function toggleSection(cat) {
            state.sections[cat] = !state.sections[cat];
            renderList();
        }

        function renderList() {
            ensureBuilt();
            listHost.innerHTML = '';
            var filtered = currentDefs();
            var pageReady = hasOpenPage(ui);
            var tpCount = state.thirdParty.items.length;
            statusText.textContent = filtered.length + ' IP definitions' + (tpCount ? ' · ' + tpCount + ' imported' : '') + (pageReady ? ' · Page ready' : ' · Open a page to add IP');

            if (!filtered.length) {
                var empty = el('div', 'dftctx-empty');
                empty.innerHTML = '<div class="dftctx-empty-title">No IP matched</div><div class="dftctx-empty-sub">Try another keyword, or confirm DftsIP registry is loaded.</div>';
                listHost.appendChild(empty);
                return;
            }

            var groups = {};
            filtered.forEach(function (def) {
                var cat = def.category || 'other';
                (groups[cat] || (groups[cat] = [])).push(def);
            });

            ['functional', 'logic_gate', 'floorplan', THIRD_PARTY_CATEGORY, 'interface', 'data_source', 'other'].forEach(function (catKey) {
                if (!groups[catKey] || !groups[catKey].length) return;
                var section = el('div', 'dftctx-section');
                var header = el('button', 'dftctx-section-header');
                header.type = 'button';
                header.onmousedown = function (evt) { stop(evt); toggleSection(catKey); };
                var collapsed = !!state.sections[catKey];
                header.innerHTML = '<span class="dftctx-caret">' + (collapsed ? '▸' : '▾') + '</span>' +
                    '<span class="dftctx-section-title">' + getCategoryLabel(catKey) + '</span>' +
                    '<span class="dftctx-section-count">' + groups[catKey].length + '</span>';
                section.appendChild(header);
                if (!collapsed) {
                    var box = el('div', 'dftctx-section-body');
                    groups[catKey].forEach(function (def) { box.appendChild(renderItem(def, pageReady)); });
                    section.appendChild(box);
                }
                listHost.appendChild(section);
            });
        }

        function renderItem(def, pageReady) {
            var row = el('button', 'dftctx-ip-item simple');
            row.type = 'button';
            row.draggable = !!pageReady;
            if (state.selectedKey === def.key) row.className += ' selected';
            if (!pageReady) row.className += ' disabled';
            row.title = safeText((def.defaultLabel || def.key)).replace(/\n/g, ' ');

            var title = el('div', 'dftctx-ip-name', safeText((def.defaultLabel || def.key)).replace(/\n/g, ' '));
            row.appendChild(title);

            if (def.__thirdPartyManaged) {
                var tag = el('div', 'dftctx-ip-tag', def.__thirdPartyScope === 'software' ? 'Software' : 'Project');
                tag.style.fontSize = '10px';
                tag.style.color = '#475569';
                tag.style.marginTop = '2px';
                row.appendChild(tag);
            }

            row.onmouseenter = function () { showHover(def); };
            row.ondragstart = function (evt) {
                if (!pageReady || !evt.dataTransfer) return;
                evt.dataTransfer.effectAllowed = 'copy';
                evt.dataTransfer.setData('application/x-dfts-ip-key', def.key);
                evt.dataTransfer.setData('text/plain', def.key);
                state.selectedKey = def.key;
                renderList();
            };
            row.onmousedown = function (evt) {
                stop(evt);
                state.selectedKey = def.key;
                if (!hasOpenPage(ui)) {
                    renderList();
                    dockInfo(ui, 'warning', 'Open or create a page before adding IP: ' + safeText((def.defaultLabel || def.key)).replace(/\n/g, ' '), { source: 'ip-library' });
                    return;
                }
                try {
                    insertDefinition(ui, def);
                } catch (e) {
                    dockInfo(ui, 'error', 'Failed to add IP: ' + e.message, { source: 'ip-library' });
                    if (global.console && console.error) console.error('[Context.IP] insert failed', e);
                }
                renderList();
            };
            return row;
        }

        function installGraphDropBridge() {
            var graph = getGraph(ui);
            var c = graph && graph.container;
            if (!c || c.__dftsThirdPartyDropInstalled) return;
            c.__dftsThirdPartyDropInstalled = true;
            c.addEventListener('dragover', function (evt) {
                var key = evt.dataTransfer && evt.dataTransfer.getData('application/x-dfts-ip-key');
                if (!key) return;
                evt.preventDefault();
            });
            c.addEventListener('drop', function (evt) {
                var key = evt.dataTransfer && evt.dataTransfer.getData('application/x-dfts-ip-key');
                if (!key) return;
                evt.preventDefault();
                var def = global.DftsIP && global.DftsIP._defsByKey ? global.DftsIP._defsByKey[key] : null;
                if (!def) return;
                try {
                    insertDefinitionAtClientPoint(ui, def, evt.clientX, evt.clientY);
                } catch (e) {
                    dockInfo(ui, 'error', 'Drag insert failed: ' + e.message, { source: 'ip-library' });
                }
            });
        }

        function ensureManagerBuilt() {
            var mgr = state.manager;
            if (mgr.overlay) return;

            mgr.overlay = el('div');
            mgr.overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.36);display:none;z-index:1200;';

            mgr.dialog = el('div');
            mgr.dialog.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(1100px,92vw);height:min(720px,88vh);background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(15,23,42,0.24);display:flex;flex-direction:column;overflow:hidden;border:1px solid #cbd5e1;';
            mgr.overlay.appendChild(mgr.dialog);

            var head = el('div');
            head.style.cssText = 'padding:14px 16px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:12px;';
            var title = el('div');
            title.innerHTML = '<div style="font-size:16px;font-weight:700;color:#0f172a;">Import HDL</div><div style="font-size:12px;color:#64748b;">Manage 3rd Party IP and parse Verilog modules with slang.</div>';
            head.appendChild(title);
            var closeBtn = el('button', null, 'Close');
            closeBtn.type = 'button';
            closeBtn.style.cssText = 'border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:7px 12px;cursor:pointer;';
            closeBtn.onclick = function () { hideManager(); };
            head.appendChild(closeBtn);
            mgr.dialog.appendChild(head);

            var controls = el('div');
            controls.style.cssText = 'padding:12px 16px;border-bottom:1px solid #e2e8f0;display:grid;grid-template-columns:180px 1fr 1fr;gap:12px;align-items:start;';

            var scopeBox = el('div');
            scopeBox.innerHTML = '<div style="font-size:12px;color:#475569;margin-bottom:6px;">Scope for new imports</div>';
            mgr.scopeSelect = document.createElement('select');
            mgr.scopeSelect.style.cssText = 'width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;';
            mgr.scopeSelect.innerHTML = '<option value="project">Project IP</option><option value="software">Software IP</option>';
            scopeBox.appendChild(mgr.scopeSelect);
            controls.appendChild(scopeBox);

            var slangBox = el('div');
            slangBox.innerHTML = '<div style="font-size:12px;color:#475569;margin-bottom:6px;">Slang executable</div>';
            mgr.slangInput = document.createElement('input');
            mgr.slangInput.type = 'text';
            mgr.slangInput.placeholder = 'Leave blank to use bundled / PATH slang';
            mgr.slangInput.style.cssText = 'width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;';
            slangBox.appendChild(mgr.slangInput);
            controls.appendChild(slangBox);

            var tipBox = el('div');
            tipBox.innerHTML = '<div style="font-size:12px;color:#475569;margin-bottom:6px;">Parser</div><div style="font-size:12px;color:#0f172a;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">Verilog / SystemVerilog via slang (IPC)</div>';
            controls.appendChild(tipBox);
            mgr.dialog.appendChild(controls);

            var options = el('div');
            options.style.cssText = 'padding:12px 16px;border-bottom:1px solid #e2e8f0;display:grid;grid-template-columns:1fr 1fr;gap:12px;';
            var definesWrap = el('div');
            definesWrap.innerHTML = '<div style="font-size:12px;color:#475569;margin-bottom:6px;">Preprocessor Defines (one per line)</div>';
            mgr.definesBox = document.createElement('textarea');
            mgr.definesBox.rows = 3;
            mgr.definesBox.placeholder = 'DFT_SHARED_EFUSE_WITH_FUNC\nREADBUFFER=1';
            mgr.definesBox.style.cssText = 'width:100%;resize:vertical;padding:8px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-family:monospace;font-size:12px;';
            definesWrap.appendChild(mgr.definesBox);
            options.appendChild(definesWrap);
            var includeWrap = el('div');
            includeWrap.innerHTML = '<div style="font-size:12px;color:#475569;margin-bottom:6px;">Include Dirs (one per line)</div>';
            mgr.includeBox = document.createElement('textarea');
            mgr.includeBox.rows = 3;
            mgr.includeBox.placeholder = '/path/to/includes';
            mgr.includeBox.style.cssText = 'width:100%;resize:vertical;padding:8px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;font-family:monospace;font-size:12px;';
            includeWrap.appendChild(mgr.includeBox);
            options.appendChild(includeWrap);
            mgr.dialog.appendChild(options);

            var body = el('div');
            body.style.cssText = 'flex:1;min-height:0;display:grid;grid-template-columns:380px 1fr;';
            mgr.dialog.appendChild(body);

            var left = el('div');
            left.style.cssText = 'border-right:1px solid #e2e8f0;display:flex;flex-direction:column;min-height:0;';
            body.appendChild(left);

            var leftTools = el('div');
            leftTools.style.cssText = 'padding:12px 16px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:8px;';
            var leftLabel = el('div', null, 'Imported modules');
            leftLabel.style.cssText = 'font-weight:600;color:#0f172a;';
            leftTools.appendChild(leftLabel);
            var btnBox = el('div');
            btnBox.style.cssText = 'display:flex;gap:8px;';
            var addBtn = el('button', null, '+');
            addBtn.type = 'button';
            addBtn.title = 'Add Verilog module(s)';
            addBtn.style.cssText = 'width:32px;height:32px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;font-size:18px;line-height:1;';
            addBtn.onclick = function () { importWithSlang().catch(function (e) { dockInfo(ui, 'error', 'Import HDL failed: ' + e.message, { source: 'ip-library' }); }); };
            btnBox.appendChild(addBtn);
            var delBtn = el('button', null, '−');
            delBtn.type = 'button';
            delBtn.title = 'Remove selected module(s)';
            delBtn.style.cssText = addBtn.style.cssText;
            delBtn.onclick = function () { removeSelectedDraftItems(); };
            btnBox.appendChild(delBtn);
            leftTools.appendChild(btnBox);
            left.appendChild(leftTools);

            mgr.listHost = el('div');
            mgr.listHost.style.cssText = 'flex:1;overflow:auto;padding:8px 10px 12px;';
            left.appendChild(mgr.listHost);

            var right = el('div');
            right.style.cssText = 'display:flex;flex-direction:column;min-height:0;';
            body.appendChild(right);

            var detailHead = el('div');
            detailHead.style.cssText = 'padding:14px 16px;border-bottom:1px solid #e2e8f0;';
            mgr.detailTitle = el('div');
            mgr.detailTitle.style.cssText = 'font-size:16px;font-weight:700;color:#0f172a;';
            mgr.detailMeta = el('div');
            mgr.detailMeta.style.cssText = 'margin-top:6px;font-size:12px;color:#64748b;white-space:pre-wrap;';
            mgr.detailScope = document.createElement('select');
            mgr.detailScope.style.cssText = 'margin-top:10px;padding:8px;border:1px solid #cbd5e1;border-radius:8px;';
            mgr.detailScope.innerHTML = '<option value="project">Project IP</option><option value="software">Software IP</option>';
            mgr.detailScope.onchange = function () { applyScopeToSelection(mgr.detailScope.value); };
            detailHead.appendChild(mgr.detailTitle);
            detailHead.appendChild(mgr.detailMeta);
            detailHead.appendChild(mgr.detailScope);
            right.appendChild(detailHead);

            var detailBody = el('div');
            detailBody.style.cssText = 'flex:1;min-height:0;overflow:auto;padding:14px 16px;';
            mgr.detailPorts = el('div');
            mgr.detailDiag = el('div');
            detailBody.appendChild(mgr.detailPorts);
            detailBody.appendChild(mgr.detailDiag);
            right.appendChild(detailBody);

            var foot = el('div');
            foot.style.cssText = 'padding:12px 16px;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:12px;';
            mgr.footerHint = el('div');
            mgr.footerHint.style.cssText = 'font-size:12px;color:#64748b;';
            foot.appendChild(mgr.footerHint);
            var actions = el('div');
            actions.style.cssText = 'display:flex;gap:8px;';
            mgr.saveBtn = el('button', null, 'Save Library');
            mgr.saveBtn.type = 'button';
            mgr.saveBtn.style.cssText = 'border:1px solid #1d4ed8;background:#2563eb;color:#fff;border-radius:8px;padding:8px 14px;cursor:pointer;';
            mgr.saveBtn.onclick = function () {
                saveManagerDraft().catch(function (e) {
                    dockInfo(ui, 'error', 'Save 3rd Party IP failed: ' + e.message, { source: 'ip-library' });
                });
            };
            actions.appendChild(mgr.saveBtn);
            var closeBtn2 = el('button', null, 'Close');
            closeBtn2.type = 'button';
            closeBtn2.style.cssText = 'border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:8px 14px;cursor:pointer;';
            closeBtn2.onclick = function () { hideManager(); };
            actions.appendChild(closeBtn2);
            foot.appendChild(actions);
            mgr.dialog.appendChild(foot);

            document.body.appendChild(mgr.overlay);
        }

        function setManagerDraft(items) {
            state.manager.draft = cloneJson(items) || [];
            state.manager.selectedIds = {};
            state.manager.activeId = state.manager.draft.length ? state.manager.draft[0].id : '';
            renderManager();
        }

        function getSelectedDraftItems() {
            var ids = state.manager.selectedIds || {};
            return state.manager.draft.filter(function (item) { return !!ids[item.id]; });
        }

        function activeDraftItem() {
            var mgr = state.manager;
            for (var i = 0; i < mgr.draft.length; i++) {
                if (mgr.draft[i].id === mgr.activeId) return mgr.draft[i];
            }
            return mgr.draft[0] || null;
        }

        function renderManagerList() {
            var mgr = state.manager;
            if (!mgr.listHost) return;
            mgr.listHost.innerHTML = '';
            if (!mgr.draft.length) {
                var empty = el('div');
                empty.style.cssText = 'padding:14px;border:1px dashed #cbd5e1;border-radius:10px;color:#64748b;font-size:12px;background:#f8fafc;';
                empty.textContent = 'No imported modules yet. Click + to add one or more Verilog files.';
                mgr.listHost.appendChild(empty);
                return;
            }
            mgr.draft.forEach(function (item) {
                var card = el('div');
                card.style.cssText = 'border:1px solid ' + (item.id === mgr.activeId ? '#2563eb' : '#e2e8f0') + ';border-radius:10px;padding:10px 12px;margin-bottom:8px;background:' + (item.id === mgr.activeId ? '#eff6ff' : '#fff') + ';cursor:pointer;';
                card.onclick = function (evt) {
                    if (evt && evt.target && evt.target.tagName && evt.target.tagName.toLowerCase() === 'input') return;
                    mgr.activeId = item.id;
                    renderManager();
                };

                var top = el('div');
                top.style.cssText = 'display:flex;align-items:flex-start;gap:8px;';
                var cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = !!mgr.selectedIds[item.id];
                cb.style.marginTop = '2px';
                cb.onclick = function (evt) {
                    stop(evt);
                    if (cb.checked) mgr.selectedIds[item.id] = true;
                    else delete mgr.selectedIds[item.id];
                    mgr.activeId = item.id;
                    renderManager();
                };
                top.appendChild(cb);

                var textBox = el('div');
                textBox.style.cssText = 'flex:1;min-width:0;';
                var line1 = el('div', null, item.moduleName);
                line1.style.cssText = 'font-size:13px;font-weight:600;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
                textBox.appendChild(line1);
                var line2 = el('div', null, (item.scope === 'software' ? 'Software IP' : 'Project IP') + ' · ' + (item.sourceFileName || 'verilog'));
                line2.style.cssText = 'margin-top:3px;font-size:11px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
                textBox.appendChild(line2);
                top.appendChild(textBox);
                card.appendChild(top);

                if (item.diagnostics && item.diagnostics.length) {
                    var warn = el('div', null, item.diagnostics[0]);
                    warn.style.cssText = 'margin-top:8px;font-size:11px;color:#b45309;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                    card.appendChild(warn);
                }
                mgr.listHost.appendChild(card);
            });
        }

        function renderPortsTable(item) {
            var ports = Array.isArray(item && item.ports) ? item.ports : [];
            if (!ports.length) {
                return '<div style="font-size:12px;color:#64748b;border:1px dashed #cbd5e1;border-radius:8px;padding:10px;background:#f8fafc;">No ports parsed.</div>';
            }
            var html = '<div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:8px;">Ports (' + ports.length + ')</div>' +
                '<div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">' +
                '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
                '<thead><tr style="background:#f8fafc;">' +
                '<th style="text-align:left;padding:8px;border-bottom:1px solid #e2e8f0;">Dir</th>' +
                '<th style="text-align:left;padding:8px;border-bottom:1px solid #e2e8f0;">Port</th>' +
                '<th style="text-align:left;padding:8px;border-bottom:1px solid #e2e8f0;">Range</th>' +
                '<th style="text-align:left;padding:8px;border-bottom:1px solid #e2e8f0;">Side</th>' +
                '</tr></thead><tbody>';
            ports.forEach(function (port) {
                html += '<tr>' +
                    '<td style="padding:8px;border-bottom:1px solid #f1f5f9;">' + safeText(port.direction || port.dir || '') + '</td>' +
                    '<td style="padding:8px;border-bottom:1px solid #f1f5f9;">' + safeText(port.name) + '</td>' +
                    '<td style="padding:8px;border-bottom:1px solid #f1f5f9;">' + safeText(port.range || '') + '</td>' +
                    '<td style="padding:8px;border-bottom:1px solid #f1f5f9;">' + safeText(port.side || '') + '</td>' +
                    '</tr>';
            });
            html += '</tbody></table></div>';
            return html;
        }

        function renderDiagnostics(item) {
            var diags = Array.isArray(item && item.diagnostics) ? item.diagnostics : [];
            if (!diags.length) return '';
            var html = '<div style="margin-top:14px;font-size:13px;font-weight:600;color:#0f172a;">Diagnostics</div>' +
                '<div style="margin-top:8px;border:1px solid #fde68a;background:#fffbeb;border-radius:8px;padding:10px;">';
            diags.forEach(function (line) {
                html += '<div style="font-size:12px;color:#92400e;white-space:pre-wrap;">' + safeText(line) + '</div>';
            });
            html += '</div>';
            return html;
        }

        function renderManagerDetail() {
            var mgr = state.manager;
            var item = activeDraftItem();
            if (!mgr.detailTitle) return;
            if (!item) {
                mgr.detailTitle.textContent = 'No module selected';
                mgr.detailMeta.textContent = 'Click + to import Verilog files.';
                mgr.detailScope.value = getProjectRoot(ui) ? 'project' : 'software';
                mgr.detailPorts.innerHTML = '<div style="font-size:12px;color:#64748b;border:1px dashed #cbd5e1;border-radius:8px;padding:10px;background:#f8fafc;">No module details.</div>';
                mgr.detailDiag.innerHTML = '';
                return;
            }
            mgr.detailTitle.textContent = item.moduleName;
            mgr.detailMeta.textContent = [
                (item.scope === 'software' ? 'Software IP' : 'Project IP'),
                item.sourceFileName ? ('Source: ' + item.sourceFileName) : '',
                item.sourcePath ? ('Path: ' + item.sourcePath) : ''
            ].filter(Boolean).join('\n');
            mgr.detailScope.value = item.scope;
            mgr.detailPorts.innerHTML = renderPortsTable(item);
            mgr.detailDiag.innerHTML = renderDiagnostics(item);
        }

        function renderManager() {
            var mgr = state.manager;
            if (!mgr.overlay || mgr.overlay.style.display === 'none') return;
            renderManagerList();
            renderManagerDetail();
            var selectedCount = getSelectedDraftItems().length;
            mgr.footerHint.textContent = mgr.draft.length + ' module(s) in library' + (selectedCount ? ' · ' + selectedCount + ' selected' : '');
            if (!getProjectRoot(ui)) {
                mgr.footerHint.textContent += ' · No project path: Project IP will fail to save';
            }
        }

        function applyScopeToSelection(scope) {
            scope = normalize(scope) === 'software' ? 'software' : 'project';
            var mgr = state.manager;
            var targets = getSelectedDraftItems();
            if (!targets.length) {
                var active = activeDraftItem();
                if (active) targets = [active];
            }
            if (!targets.length) return;
            if (scope === 'project' && !getProjectRoot(ui)) {
                dockInfo(ui, 'warning', 'Project IP requires an open/saved project. Scope changed to Software IP instead.', { source: 'ip-library' });
                scope = 'software';
            }

            var nextSelected = {};
            targets.forEach(function (target) {
                for (var i = 0; i < mgr.draft.length; i++) {
                    if (mgr.draft[i].id !== target.id) continue;
                    var rebuilt = buildThirdPartyItem({
                        moduleName: target.moduleName,
                        sourceModuleName: target.sourceModuleName || target.moduleName,
                        sourceFileName: target.sourceFileName,
                        sourcePath: target.sourcePath,
                        ports: target.ports || [],
                        diagnostics: target.diagnostics || [],
                        scope: scope,
                        createdAt: target.createdAt
                    }, mgr.draft.filter(function (it) { return it.id !== target.id; }));
                    mgr.draft[i] = rebuilt;
                    if (mgr.activeId === target.id) mgr.activeId = rebuilt.id;
                    nextSelected[rebuilt.id] = true;
                    break;
                }
            });

            mgr.selectedIds = nextSelected;
            renderManager();
        }

        function removeSelectedDraftItems() {
            var mgr = state.manager;
            var ids = mgr.selectedIds || {};
            var selected = Object.keys(ids).filter(function (id) { return ids[id]; });
            if (!selected.length && mgr.activeId) selected = [mgr.activeId];
            if (!selected.length) return;
            mgr.draft = mgr.draft.filter(function (item) { return selected.indexOf(item.id) === -1; });
            mgr.selectedIds = {};
            mgr.activeId = mgr.draft.length ? mgr.draft[0].id : '';
            renderManager();
        }

        function resolveImportCollision(newItem, existingItem) {
            var keepName = safeText(newItem.moduleName || existingItem.moduleName);
            var msg = '3rd Party IP already exists: ' + keepName + '\n\nOK = Overwrite existing\nCancel = Keep both';
            var overwrite = false;
            if (global.mxUtils && typeof global.mxUtils.confirm === 'function') {
                overwrite = !!global.mxUtils.confirm(msg);
            } else if (typeof global.confirm === 'function') {
                overwrite = !!global.confirm(msg);
            }
            return overwrite ? 'overwrite' : 'keep-both';
        }

        function collectExistingModuleNames(scope, ignoreId) {
            var out = {};
            state.manager.draft.forEach(function (item) {
                if (!item) return;
                if (ignoreId && item.id === ignoreId) return;
                if (normalize(item.scope) !== normalize(scope)) return;
                out[normalize(item.moduleName)] = true;
            });
            return out;
        }

        function mergeParsedModules(parsedModules, scope) {
            var mgr = state.manager;
            var added = 0;
            (parsedModules || []).forEach(function (mod) {
                var modName = safeText(mod.moduleName || mod.name).trim();
                if (!modName) return;
                var sameScopeHit = null;
                for (var i = 0; i < mgr.draft.length; i++) {
                    var cur = mgr.draft[i];
                    if (normalize(cur.scope) === normalize(scope) && normalize(cur.moduleName) === normalize(modName)) {
                        sameScopeHit = cur;
                        break;
                    }
                }

                var nextName = modName;
                if (sameScopeHit) {
                    var choice = resolveImportCollision(mod, sameScopeHit);
                    if (choice === 'overwrite') {
                        var replacement = buildThirdPartyItem({
                            moduleName: sameScopeHit.moduleName,
                            sourceModuleName: modName,
                            sourceFileName: mod.sourceFileName || basename(mod.sourcePath),
                            sourcePath: mod.sourcePath,
                            ports: mod.ports || [],
                            diagnostics: mod.diagnostics || [],
                            scope: scope,
                            key: sameScopeHit.key,
                            dftsType: sameScopeHit.dftsType,
                            createdAt: sameScopeHit.createdAt
                        }, mgr.draft.filter(function (it) { return it.id !== sameScopeHit.id; }));
                        for (var r = 0; r < mgr.draft.length; r++) {
                            if (mgr.draft[r].id === sameScopeHit.id) {
                                mgr.draft[r] = replacement;
                                break;
                            }
                        }
                        mgr.activeId = replacement.id;
                        mgr.selectedIds[replacement.id] = true;
                        added += 1;
                        return;
                    }
                    nextName = uniqueName(modName, collectExistingModuleNames(scope), 2);
                }

                var created = buildThirdPartyItem({
                    moduleName: nextName,
                    sourceModuleName: modName,
                    sourceFileName: mod.sourceFileName || basename(mod.sourcePath),
                    sourcePath: mod.sourcePath,
                    ports: mod.ports || [],
                    diagnostics: mod.diagnostics || [],
                    scope: scope
                }, mgr.draft);
                mgr.draft.push(created);
                mgr.activeId = created.id;
                mgr.selectedIds[created.id] = true;
                added += 1;
            });
            return added;
        }

        async function parseWithBridge(payload) {
            if (global.hdlBridge && typeof global.hdlBridge.parse === 'function') {
                return global.hdlBridge.parse(payload);
            }
            return request({ action: 'hdlParse', payload: payload });
        }

        async function importWithSlang() {
            var mgr = state.manager;
            var defaultPath = getProjectRoot(ui) || '';
            var paths = await request({
                action: 'showOpenDialog',
                defaultPath: defaultPath,
                filters: [
                    { name: 'HDL', extensions: ['v', 'sv'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile', 'multiSelections']
            });
            if (!paths || !paths.length) return;

            var scope = mgr.scopeSelect ? mgr.scopeSelect.value : (getProjectRoot(ui) ? 'project' : 'software');
            if (normalize(scope) === 'project' && !getProjectRoot(ui)) {
                scope = 'software';
                if (mgr.scopeSelect) mgr.scopeSelect.value = 'software';
                dockInfo(ui, 'warning', 'No project path. Importing as Software IP instead.', { source: 'ip-library' });
            }

            var prefs = {
                slangPath: mgr.slangInput ? mgr.slangInput.value : '',
                defines: parseTextList(mgr.definesBox ? mgr.definesBox.value : ''),
                includeDirs: parseTextList(mgr.includeBox ? mgr.includeBox.value : '')
            };
            saveImportPrefs(prefs);

            mgr.footerHint.textContent = 'Parsing ' + paths.length + ' file(s) with slang…';

            var payload = {
                files: paths.map(function (filePath) {
                    return { path: filePath, name: basename(filePath) };
                }),
                slangPath: prefs.slangPath,
                defines: prefs.defines,
                includeDirs: prefs.includeDirs
            };

            var result = await parseWithBridge(payload);
            if (!result) throw new Error('No response from HDL bridge.');
            if (result.error) throw new Error(result.error);

            var modules = Array.isArray(result.modules) ? result.modules : [];
            if (!modules.length) {
                var diags = Array.isArray(result.diagnostics) ? result.diagnostics : [];
                throw new Error(diags[0] || 'No Verilog module was found.');
            }

            var added = mergeParsedModules(modules, scope);
            dockInfo(ui, 'success', 'Parsed ' + modules.length + ' module(s) with ' + safeText(result.engine || 'slang') + (result.slangPath ? (' (' + result.slangPath + ')') : ''), { source: 'ip-library' });
            if (!added) {
                dockInfo(ui, 'warning', 'No module was added to the library.', { source: 'ip-library' });
            }
            renderManager();
        }

        async function saveManagerDraft() {
            var mgr = state.manager;
            mgr.footerHint.textContent = 'Saving 3rd Party IP library…';
            await saveThirdPartyItems(mgr.draft);
            dockInfo(ui, 'success', 'Saved 3rd Party IP library (' + mgr.draft.length + ' module(s)).', { source: 'ip-library' });
            hideManager();
            renderList();
        }

        async function openManager() {
            ensureBuilt();
            ensureManagerBuilt();
            await ensureThirdPartyLoaded();
            var prefs = getImportPrefs();
            var mgr = state.manager;
            mgr.slangInput.value = prefs.slangPath || '';
            mgr.definesBox.value = (prefs.defines || []).join('\n');
            mgr.includeBox.value = (prefs.includeDirs || []).join('\n');
            mgr.scopeSelect.value = getProjectRoot(ui) ? 'project' : 'software';
            setManagerDraft(state.thirdParty.items);
            mgr.overlay.style.display = 'block';
            mgr.shown = true;
            renderManager();
        }

        function hideManager() {
            var mgr = state.manager;
            if (!mgr.overlay) return;
            mgr.overlay.style.display = 'none';
            mgr.shown = false;
        }

        async function mount(host) {
            ensureBuilt();
            installGraphDropBridge();
            if (root.parentNode !== host) host.appendChild(root);
            if (ui && ui.sidebarContainer) {
                try {
                    ui.sidebarContainer.style.display = 'none';
                    if (ui.sidebarContainer.parentNode && ui.sidebarContainer.parentNode !== document.body) {
                        ui.sidebarContainer.parentNode.removeChild(ui.sidebarContainer);
                    }
                } catch (e) { }
            }
            await ensureThirdPartyLoaded();
            renderList();
        }

        function show() {
            if (!root) return;
            root.style.display = 'flex';
            refresh();
        }

        function hide() {
            if (!root) return;
            root.style.display = 'none';
            hideManager();
        }

        function refresh() {
            ensureBuilt();
            ensureThirdPartyLoaded().then(function () {
                renderList();
            }).catch(function (e) {
                dockInfo(ui, 'warning', 'Failed to refresh 3rd Party IP: ' + e.message, { source: 'ip-library' });
                renderList();
            });
        }

        function destroy() {
            hideManager();
            if (state.manager.overlay && state.manager.overlay.parentNode) state.manager.overlay.parentNode.removeChild(state.manager.overlay);
            state.manager.overlay = null;
            if (root && root.parentNode) root.parentNode.removeChild(root);
            root = null; listHost = null; searchInput = null; statusText = null; previewBox = null;
        }

        api.key = 'ip';
        api.label = 'IP';
        api.mount = mount;
        api.show = show;
        api.hide = hide;
        api.refresh = refresh;
        api.destroy = destroy;
        api.select = function (key) { state.selectedKey = key || ''; renderList(); };
        api.openImportManager = function () { return openManager(); };

        global.DftsThirdPartyStore = {
            ensureLoaded: ensureThirdPartyLoaded,
            getAllItems: function () { return cloneJson(state.thirdParty.items) || []; },
            getItemByType: function (type) {
                var t = safeText(type).trim();
                if (!t) return null;
                var items = state.thirdParty.items || [];
                for (var i = 0; i < items.length; i++) {
                    if (safeText(items[i].dftsType) === t) return cloneJson(items[i]);
                }
                return null;
            },
            estimateGeneratedPaths: estimateGeneratedPaths,
            addOrReplaceGeneratedWrapper: addOrReplaceGeneratedWrapper,
            focusItem: function (key) {
                state.selectedKey = key || '';
                state.hoverKey = key || '';
                renderList();
            },
            refreshPanel: refresh,
            insertByKey: function (key) {
                var def = global.DftsIP && global.DftsIP._defsByKey ? global.DftsIP._defsByKey[key] : null;
                if (!def) throw new Error('Unknown IP key: ' + key);
                return insertDefinition(ui, def);
            }
        };
        return api;
    }

    var moduleApi = { create: create };
    global.__DFTContextIPLibraryPanel__ = moduleApi;
    global.DFTContextIPLibraryPanel = moduleApi;
})(window);
