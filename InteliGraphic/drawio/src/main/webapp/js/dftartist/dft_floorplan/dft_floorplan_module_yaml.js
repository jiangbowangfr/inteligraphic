(function (global) {
    'use strict';

    var NS = global.DFTFloorplanModuleYaml = global.DFTFloorplanModuleYaml || {};
    if (NS.__loaded) return;
    NS.__loaded = true;

    function trim(v) {
        return v == null ? '' : String(v).replace(/^\s+|\s+$/g, '');
    }

    function sanitizeFileName(name) {
        try {
            if (typeof global._sanitizeFileName === 'function') return global._sanitizeFileName(name);
        } catch (e) {}
        return String(name == null ? '' : name).replace(/[\\/:*?"<>|]+/g, '_').trim() || 'page';
    }

    function joinPath() {
        var parts = [];
        for (var i = 0; i < arguments.length; i++) {
            var seg = String(arguments[i] == null ? '' : arguments[i]).replace(/\\/g, '/');
            if (!seg) continue;
            parts.push(seg);
        }
        return parts.join('/').replace(/\/+/g, '/');
    }

    function dirnamePath(path) {
        var raw = String(path || '').replace(/\\/g, '/').replace(/\/+$/, '');
        if (!raw) return '';
        var idx = raw.lastIndexOf('/');
        return idx > 0 ? raw.slice(0, idx) : '';
    }

    function projectStorageRoot(ui) {
        var dbRoot = ui && ui._projectDbDirPath ? String(ui._projectDbDirPath) : '';
        if (dbRoot) return dbRoot.replace(/\\/g, '/').replace(/\/+$/, '');
        var root = ui && (ui._projectRootPath || ui._projectYamlDir) ? String(ui._projectRootPath || ui._projectYamlDir) : '';
        root = root.replace(/\\/g, '/').replace(/\/+$/, '');
        return root ? joinPath(root, 'dft_studio_db') : '';
    }

    function isModuleDesign(designRef) {
        return !!(designRef && String(designRef.__kind || '').toLowerCase() === 'module-design');
    }

    function getDesignBaseDir(ui, designRef, ctx, pageAbs) {
        if (designRef && designRef._absDir) return String(designRef._absDir).replace(/\\/g, '/').replace(/\/+$/, '');
        var root = projectStorageRoot(ui);
        var segs = ctx && Array.isArray(ctx.segs) ? ctx.segs.slice() : (designRef && Array.isArray(designRef._dirRel) ? designRef._dirRel.slice() : []);
        if (root && segs.length) return joinPath.apply(null, [root].concat(segs));
        if (pageAbs && isModuleDesign(designRef)) return dirnamePath(dirnamePath(pageAbs));
        return pageAbs ? dirnamePath(pageAbs) : '';
    }

    function styleValue(styleText, key, fallback) {
        var raw = String(styleText || '');
        if (!raw || !key) return fallback;
        var parts = raw.split(';');
        for (var i = 0; i < parts.length; i++) {
            var seg = parts[i];
            var idx = seg.indexOf('=');
            if (idx <= 0) continue;
            if (seg.slice(0, idx).trim() !== key) continue;
            return seg.slice(idx + 1).trim();
        }
        return fallback;
    }

    function escScalar(s) {
        if (s == null) return '""';
        s = String(s);
        if (/[:#\-?&*![\]{},>|%@`]|^\s|\s$|\s{2,}|\n/.test(s)) return JSON.stringify(s);
        return s;
    }

    function indent(n) {
        return new Array((n || 0) + 1).join('  ');
    }

    function dumpYaml(value, lvl) {
        lvl = lvl || 0;
        if (value === null || value === undefined) return '""';
        if (typeof value !== 'object') return escScalar(value);

        if (Array.isArray(value)) {
            if (!value.length) return '[]';
            var arrOut = '';
            for (var i = 0; i < value.length; i++) {
                var item = value[i];
                if (item && typeof item === 'object') {
                    arrOut += indent(lvl) + '- \n' + dumpYaml(item, lvl + 1);
                } else {
                    arrOut += indent(lvl) + '- ' + dumpYaml(item, 0) + '\n';
                }
            }
            return arrOut;
        }

        var keys = Object.keys(value);
        if (!keys.length) return '{}';
        var out = '';
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            var child = value[key];
            if (child && typeof child === 'object') {
                out += indent(lvl) + escScalar(key) + ':\n' + dumpYaml(child, lvl + 1);
            } else {
                out += indent(lvl) + escScalar(key) + ': ' + dumpYaml(child, 0) + '\n';
            }
        }
        return out;
    }

    function getCellAttr(graph, cell, attr, fallback) {
        try {
            var model = graph && (graph.getModel ? graph.getModel() : graph.model);
            var value = model && model.getValue ? model.getValue(cell) : (cell ? cell.value : null);
            if (value && typeof value.getAttribute === 'function') {
                var raw = value.getAttribute(attr);
                if (raw != null && raw !== '') return raw;
            }
            if (value && typeof value === 'object' && value[attr] != null && value[attr] !== '') return value[attr];
        } catch (e) {}
        return fallback;
    }

    function getField(graph, cell, key) {
        var fromAttr = trim(getCellAttr(graph, cell, key, ''));
        if (fromAttr) return fromAttr;
        return trim(styleValue(cell && cell.style, key, ''));
    }

    function getFieldWithDefault(graph, cell, key, fallback) {
        var value = getField(graph, cell, key);
        return value === '' ? String(fallback == null ? '' : fallback) : value;
    }

    function isFloorplanModuleCell(graph, cell) {
        if (!graph || !cell || !cell.vertex) return false;
        var style = String(cell.style || '');
        return String(styleValue(style, 'dftsIP_type', '')) === 'floorplan_module' ||
            (String(styleValue(style, 'floorplan', '0')) === '1' && String(styleValue(style, 'dftsFloorplanRect', '0')) === '1');
    }

    function getGraph(ui) {
        return ui && ui.editor ? ui.editor.graph : null;
    }

    function collectModuleCells(graph) {
        var out = [];
        if (!graph || !graph.getModel) return out;
        var model = graph.getModel();

        function walk(cell) {
            if (!cell) return;
            if (isFloorplanModuleCell(graph, cell)) out.push(cell);
            var count = model.getChildCount(cell);
            for (var i = 0; i < count; i++) walk(model.getChildAt(cell, i));
        }

        walk(model.getRoot());
        return out;
    }

    function sortModuleCells(cells) {
        cells.sort(function (lhs, rhs) {
            var lg = lhs && lhs.geometry ? lhs.geometry : null;
            var rg = rhs && rhs.geometry ? rhs.geometry : null;
            var ly = Number(lg && lg.y || 0);
            var ry = Number(rg && rg.y || 0);
            if (ly !== ry) return ly - ry;
            var lx = Number(lg && lg.x || 0);
            var rx = Number(rg && rg.x || 0);
            if (lx !== rx) return lx - rx;
            var ln = trim(lhs && lhs.dftsFloorplan_moduleName || '');
            var rn = trim(rhs && rhs.dftsFloorplan_moduleName || '');
            return ln < rn ? -1 : (ln > rn ? 1 : 0);
        });
        return cells;
    }

    function buildModuleRecord(graph, cell) {
        return {
            moduleName: getField(graph, cell, 'dftsFloorplan_moduleName'),
            instanceName: getField(graph, cell, 'dftsFloorplan_instanceName'),
            designLevel: getFieldWithDefault(graph, cell, 'dftsFloorplan_designLevel', 'physical_block'),
            logicOnly: getFieldWithDefault(graph, cell, 'dftsFloorplan_logicOnly', 'off'),
            designFilelist: getField(graph, cell, 'dftsFloorplan_designFilelist'),
            designType: getFieldWithDefault(graph, cell, 'dftsFloorplan_designType', 'hierarchical')
        };
    }

    function buildYaml(ui) {
        var graph = getGraph(ui);
        if (!graph) throw new Error('Graph is not ready.');

        var pageName = '';
        try {
            if (global.DFTFlowNavMod && global.DFTFlowNavMod.Shared && typeof global.DFTFlowNavMod.Shared.getActivePageName === 'function') {
                pageName = global.DFTFlowNavMod.Shared.getActivePageName(ui) || '';
            }
        } catch (e) {}
        pageName = pageName || 'floorplan';

        var moduleCells = sortModuleCells(collectModuleCells(graph));
        var modules = moduleCells.map(function (cell) {
            return buildModuleRecord(graph, cell);
        });

        var payload = {
            floorplan: {
                // page: pageName,
                designer_manager: modules
            }
        };

        if (global.DFT_YAML && typeof global.DFT_YAML.dumpYAML === 'function') {
            return global.DFT_YAML.withHeader(
                global.DFT_YAML.dumpYAML(payload),
                '#yaml: floorplan_module'
            );
        }

        return '#yaml: floorplan_module\n' + dumpYaml(payload, 0);
    }

    async function saveToCurrentFloorplanPage(ui, text) {
        if (typeof global.requestSync !== 'function') throw new Error('requestSync unavailable');

        var pageName = 'floorplan';
        try {
            if (global.DFTFlowNavMod && global.DFTFlowNavMod.Shared && typeof global.DFTFlowNavMod.Shared.getActivePageName === 'function') {
                pageName = global.DFTFlowNavMod.Shared.getActivePageName(ui) || pageName;
            }
        } catch (e) {}

        var ctx = ui && ui._activeProjectPageCtx ? ui._activeProjectPageCtx : null;
        var designRef = ctx && ctx.designRef ? ctx.designRef : null;
        var pageAbs = '';

        if (global.DFTPageSessionManager && typeof global.DFTPageSessionManager.resolvePageFileAbs === 'function' && designRef) {
            pageAbs = await global.DFTPageSessionManager.resolvePageFileAbs(ui, designRef, pageName);
        } else if (ctx && ctx.abs) {
            pageAbs = String(ctx.abs);
        } else {
            var root = (ui && (ui._projectRootPath || ui._projectYamlDir)) || '';
            if (!root) throw new Error('Active floorplan page path is unavailable.');
            pageAbs = joinPath(root, 'floorplan', sanitizeFileName(pageName) + '.dftart');
        }

        if (!pageAbs) throw new Error('Active floorplan page path is unavailable.');

        var targetDir = dirnamePath(pageAbs);
        if (isModuleDesign(designRef)) {
            targetDir = joinPath(getDesignBaseDir(ui, designRef, ctx, pageAbs), 'yaml');
        }
        var targetAbs = joinPath(targetDir, sanitizeFileName(pageName) + '.modules.yaml');
        await global.requestSync({ action: 'ensureDirs', path: targetDir });
        await global.requestSync({ action: 'writeFile', path: targetAbs, data: String(text || ''), enc: 'utf-8' });
        return targetAbs;
    }

    async function generateFromCurrentPage(ui) {
        var text = buildYaml(ui);
        var target = await saveToCurrentFloorplanPage(ui, text);
        return { text: text, target: target };
    }

    NS.buildYaml = buildYaml;
    NS.saveToCurrentFloorplanPage = saveToCurrentFloorplanPage;
    NS.generateFromCurrentPage = generateFromCurrentPage;
})(window);
