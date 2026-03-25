(function (global) {
    'use strict';

    var NS = global.DFTFloorplanInterfacePairYaml = global.DFTFloorplanInterfacePairYaml || {};
    if (NS.__loaded) return;
    NS.__loaded = true;

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
        return root ? joinPath(root, 'db') : '';
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
                if (item && typeof item === 'object') arrOut += indent(lvl) + '- \n' + dumpYaml(item, lvl + 1);
                else arrOut += indent(lvl) + '- ' + dumpYaml(item, 0) + '\n';
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
                var dumped = dumpYaml(child, lvl + 1);
                if (dumped === '[]' || dumped === '{}') {
                    out += indent(lvl) + escScalar(key) + ': ' + dumped + '\n';
                } else {
                    if (dumped !== '' && dumped.charAt(dumped.length - 1) !== '\n') dumped += '\n';
                    out += indent(lvl) + escScalar(key) + ':\n' + dumped;
                }
            } else {
                out += indent(lvl) + escScalar(key) + ': ' + dumpYaml(child, 0) + '\n';
            }
        }
        return out;
    }

    function getPageName(ui) {
        try {
            if (global.DFTFlowNavMod && global.DFTFlowNavMod.Shared && typeof global.DFTFlowNavMod.Shared.getActivePageName === 'function') {
                return global.DFTFlowNavMod.Shared.getActivePageName(ui) || 'floorplan';
            }
        } catch (e) {}
        return 'floorplan';
    }

    function normalizeLayerName(name) {
        var raw = String(name || '').trim().toLowerCase();
        if (raw === 'ijtag' || raw === 'ittag') return 'ijtag';
        if (raw === 'bscan') return 'bscan';
        if (raw === 'bisr') return 'bisr';
        if (raw === 'ssn') return 'ssn';
        return raw || 'ssn';
    }

    function makeEmptyLayerBucket() {
        return {
            ssn: [],
            bscan: [],
            bisr: [],
            ijtag: []
        };
    }

    function ensureModuleInstanceBucket(root, moduleName, instanceName) {
        moduleName = String(moduleName || '').trim() || 'UNKNOWN_MODULE';
        instanceName = String(instanceName || '').trim() || moduleName;
        if (!root[moduleName]) root[moduleName] = {};
        if (!root[moduleName][instanceName]) root[moduleName][instanceName] = makeEmptyLayerBucket();
        return root[moduleName][instanceName];
    }

    function buildPeerRecord(selfMarker, peerMarker, pair) {
        return {
            interface: String(selfMarker && selfMarker.name || ''),
            interface_type: String(selfMarker && selfMarker.interfaceType || ''),
            side: String(selfMarker && selfMarker.side || ''),
            side_index: Number(selfMarker && selfMarker.interfaceIndex || 0),
            pair_id: String(pair && pair.id || ''),
            chain: String(pair && pair.chainId || ''),
            peer_module: String(peerMarker && peerMarker.moduleName || ''),
            peer_instance: String(peerMarker && peerMarker.moduleInstanceName || ''),
            peer_interface: String(peerMarker && peerMarker.name || ''),
            peer_interface_type: String(peerMarker && peerMarker.interfaceType || ''),
            peer_side: String(peerMarker && peerMarker.side || ''),
            peer_side_index: Number(peerMarker && peerMarker.interfaceIndex || 0)
        };
    }

    function sortTree(root) {
        var ordered = {};
        Object.keys(root).sort().forEach(function (moduleName) {
            ordered[moduleName] = {};
            Object.keys(root[moduleName] || {}).sort().forEach(function (instanceName) {
                var src = root[moduleName][instanceName] || makeEmptyLayerBucket();
                ordered[moduleName][instanceName] = {
                    ssn: src.ssn || [],
                    bscan: src.bscan || [],
                    bisr: src.bisr || [],
                    ijtag: src.ijtag || []
                };
            });
        });
        return ordered;
    }

    function buildPayload(ui, analysis) {
        analysis = analysis || {};
        var plan = analysis.interfacePlan || { markers: [], pairs: [] };
        var markers = Array.isArray(plan.markers) ? plan.markers.slice() : [];
        var pairs = Array.isArray(plan.pairs) ? plan.pairs.slice() : [];
        var markerById = {};
        var tree = {};
        var i = 0;

        for (i = 0; i < markers.length; i++) {
            var marker = markers[i] || {};
            markerById[String(marker.id || '')] = marker;
            ensureModuleInstanceBucket(tree, marker.moduleName, marker.moduleInstanceName);
        }

        for (i = 0; i < pairs.length; i++) {
            var pair = pairs[i] || {};
            var fromMarker = markerById[String(pair.fromMarkerId || '')] || null;
            var toMarker = markerById[String(pair.toMarkerId || '')] || null;
            if (!fromMarker || !toMarker) continue;

            var fromLayer = normalizeLayerName(pair.layerName || fromMarker.layerName || '');
            var toLayer = normalizeLayerName(pair.layerName || toMarker.layerName || '');

            ensureModuleInstanceBucket(tree, fromMarker.moduleName, fromMarker.moduleInstanceName)[fromLayer].push(
                buildPeerRecord(fromMarker, toMarker, pair)
            );
            ensureModuleInstanceBucket(tree, toMarker.moduleName, toMarker.moduleInstanceName)[toLayer].push(
                buildPeerRecord(toMarker, fromMarker, pair)
            );
        }

        var payload = { page: getPageName(ui) };
        var modules = sortTree(tree);
        Object.keys(modules).forEach(function (moduleName) {
            payload[moduleName] = modules[moduleName];
        });
        return payload;
    }

    function buildYaml(ui, analysis) {
        var payload = buildPayload(ui, analysis);
        if (global.DFT_YAML && typeof global.DFT_YAML.dumpYAML === 'function') {
            return global.DFT_YAML.withHeader(
                global.DFT_YAML.dumpYAML(payload),
                '#yaml: floorplan_interface_pair'
            );
        }
        return '#yaml: floorplan_interface_pair\n' + dumpYaml(payload, 0);
    }

    async function saveToCurrentFloorplanPage(ui, text) {
        if (typeof global.requestSync !== 'function') throw new Error('requestSync unavailable');
        var pageName = getPageName(ui);
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
        var targetAbs = joinPath(targetDir, sanitizeFileName(pageName) + '.interface-pairs.yaml');
        await global.requestSync({ action: 'ensureDirs', path: targetDir });
        await global.requestSync({ action: 'writeFile', path: targetAbs, data: String(text || ''), enc: 'utf-8' });
        return targetAbs;
    }

    async function generateFromCurrentPage(ui, analysis) {
        var text = buildYaml(ui, analysis);
        var target = await saveToCurrentFloorplanPage(ui, text);
        return { text: text, target: target };
    }

    NS.buildPayload = buildPayload;
    NS.buildYaml = buildYaml;
    NS.saveToCurrentFloorplanPage = saveToCurrentFloorplanPage;
    NS.generateFromCurrentPage = generateFromCurrentPage;
})(window);
