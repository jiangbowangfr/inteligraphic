(function (global) {
    var NS = global.DftsIP;
    if (!NS) throw new Error('请先加载 dftartist_common.js');
    if (NS.__dataSourceLoaded) return;
    NS.__dataSourceLoaded = true;

    function getLineNS() {
        return global.DftsFloorplanLine || null;
    }

    function normalizeUi(ui) {
        var lineNS = getLineNS();
        if (lineNS && lineNS.normalizeUi) return lineNS.normalizeUi(ui);
        if (!ui) return null;
        if (ui.editor && ui.editor.graph) return ui;
        if (ui.editorUi && ui.editorUi.editor && ui.editorUi.editor.graph) return ui.editorUi;
        return null;
    }

    function debugEnabled() {
        return global.DFTS_DATASOURCE_FLOORPLAN_DEBUG !== false &&
            (!NS || NS.DATASOURCE_FLOORPLAN_DEBUG !== false);
    }

    function debugLog() {
        if (!debugEnabled() || typeof console === 'undefined' || !console.log) return;
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[DataSourceFloorplan]');
        console.log.apply(console, args);
    }

    function getSymbolNS() {
        return NS && NS.Symbol ? NS.Symbol : null;
    }

    function isSymbolBody(body) {
        var sym = getSymbolNS();
        return !!(sym && body && typeof sym.isSymbolBody === 'function' && sym.isSymbolBody(body));
    }

    function getSymbolModel(body) {
        var sym = getSymbolNS();
        if (!sym || !body || typeof sym.getModel !== 'function') return null;
        return sym.getModel(body);
    }

    function getSymbolPorts(body) {
        var out = [];
        if (!body || !body.children || !body.children.length) return out;
        for (var i = 0; i < body.children.length; i++) {
            var ch = body.children[i];
            if (ch && ch.__dftsSymbolChild && ch.__dftsSymbolKind === 'port') out.push(ch);
        }
        return out;
    }

    function getSymbolPortByKey(body, pinKey) {
        if (!body || !pinKey) return null;
        var ports = getSymbolPorts(body);
        for (var i = 0; i < ports.length; i++) {
            if (String(ports[i].__dftsSymbolKey || '') === String(pinKey)) return ports[i];
        }
        return null;
    }

    function getSymbolPinModels(body) {
        var symModel = getSymbolModel(body) || {};
        return Array.isArray(symModel.pins) ? symModel.pins : [];
    }

    function ensureSymbolPortCompatibility(graph, body, def, runtimeOpt, ctx) {
        if (!graph || !body || !isSymbolBody(body)) return;
        var model = graph.getModel();
        var symModel = getSymbolModel(body) || {};
        var pinDefs = getPinDefMap(def, runtimeOpt, ctx);
        var ports = getSymbolPorts(body);

        for (var i = 0; i < ports.length; i++) {
            var port = ports[i];
            var pinKey = String(port.__dftsSymbolKey || '');
            var pinModel = null;
            var pins = Array.isArray(symModel.pins) ? symModel.pins : [];
            for (var p = 0; p < pins.length; p++) {
                if (String(pins[p].key || '') === pinKey) {
                    pinModel = pins[p];
                    break;
                }
            }

            var cfg = pinDefs[pinKey] || {};
            var side = (pinModel && pinModel.side) || cfg.side || 'east';
            var pinDir = (pinModel && pinModel.dir) || cfg.dir || 'input';
            var pinType = (pinModel && pinModel.type) || cfg.type || '';
            var isBus = !!((pinModel && pinModel.isBus) || cfg.isBus || ((pinModel && pinModel.busWidth) || cfg.busWidth || 1) > 1);
            var isFloorplanStart = isFloorplanStartDef(cfg, pinDir, pinType);
            var isFloorplanTarget = isFloorplanTargetDef(cfg, pinDir, pinType);

            var style = port.getStyle() || '';
            style = mxUtils.setStyle(style, 'dftsIP_pin', '1');
            style = mxUtils.setStyle(style, 'pin', '1');
            style = mxUtils.setStyle(style, 'dftsIP_pinKey', pinKey);
            style = mxUtils.setStyle(style, 'dftsIP_pin_location', side);
            style = mxUtils.setStyle(style, 'portDir', side);
            style = mxUtils.setStyle(style, 'dftsIP_pin_direction', pinDir);
            style = mxUtils.setStyle(style, 'dftsIP_pinType', pinType);
            style = mxUtils.setStyle(style, 'dftsIP_isBus', isBus ? '1' : '0');
            style = mxUtils.setStyle(style, 'connectable', isFloorplanStart ? '1' : '0');
            style = mxUtils.setStyle(style, 'dftsIP_floorplanStart', isFloorplanStart ? '1' : '0');
            style = mxUtils.setStyle(style, 'dftsIP_floorplanTarget', isFloorplanTarget ? '1' : '0');
            style = mxUtils.setStyle(style, 'dftsIP_floorplanAnchorSide', isFloorplanStart ? 'source' : (isFloorplanTarget ? 'target' : ''));
            model.setStyle(port, style);
            port.connectable = !!isFloorplanStart;
        }
    }

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj || {}));
    }

    function staticPins(pins) {
        return function () {
            return clone(pins || {});
        };
    }

    function styleMapToObject(styleText) {
        var out = {};
        if (!styleText) return out;
        var items = String(styleText).split(';');
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (!item) continue;
            var idx = item.indexOf('=');
            if (idx < 0) continue;
            out[item.substring(0, idx)] = item.substring(idx + 1);
        }
        return out;
    }

    function registerDataSource(def) {
        var oldAfterCreate = def.afterCreate;

        def.category = NS.CATEGORY.DATASOURCE;
        def.useSymbolEngine = true;
        def.labelPolicy = NS.POLICY.LABEL_USER_OR_DEFAULT;
        def.instancePolicy = NS.POLICY.INSTANCE_OPTIONAL;
        def.lockBodyLabel = false;

        def.afterCreate = function (graph, body, runtimeOpt, ctx) {
            markDataSourceAsFloorplan(graph, body, def, runtimeOpt, ctx);
            if (typeof oldAfterCreate === 'function') oldAfterCreate(graph, body, runtimeOpt, ctx);
            syncAnchoredFloorplanLinesForBody(graph, body);
        };

        NS.registerDefinition(def);
        return def;
    }

    function getPinDefsForCreate(def, runtimeOpt, ctx) {
        if (!def) return {};
        if (typeof def.pinsFactory === 'function') {
            return def.pinsFactory(Object.assign({}, runtimeOpt || {}, { resolvedBodyLabel: ctx && ctx.resolvedBodyLabel }), def) || {};
        }
        return clone(def.pins || {});
    }

    function getPinDefMap(def, runtimeOpt, ctx) {
        var pins = getPinDefsForCreate(def, runtimeOpt, ctx);
        var map = {};
        var dirs = ['west', 'east', 'north', 'south'];
        for (var d = 0; d < dirs.length; d++) {
            var arr = pins[dirs[d]] || [];
            for (var i = 0; i < arr.length; i++) {
                var cfg = arr[i] || {};
                var key = cfg.pinKey || cfg.name;
                if (key) map[key] = cfg;
            }
        }
        return map;
    }

    function isDataSourceBody(graph, body) {
        if (!graph || !body) return false;
        var style = graph.getCellStyle(body);
        var category = String(mxUtils.getValue(style, 'dftsIP_category', '')).toLowerCase();
        var dftsType = String(mxUtils.getValue(style, 'dftsIP_type', '')).toLowerCase();
        return category === String(NS.CATEGORY.DATASOURCE).toLowerCase() ||
            category === 'datasource' ||
            dftsType === 'pattern_data_source' ||
            dftsType === 'external_data_source' ||
            dftsType === 'ssn_data_source' ||
            /data_source/.test(dftsType);
    }

    function resolveDataSourceBody(graph, cell) {
        if (!graph || !cell) return null;
        if (isDataSourceBody(graph, cell)) return cell;
        if (typeof NS.findChipBodyForCell === 'function') {
            var body = NS.findChipBodyForCell(graph, cell);
            if (isDataSourceBody(graph, body)) return body;
        }
        return null;
    }

    function isFloorplanStartDef(cfg, pinDir, pinType) {
        return !!(cfg && cfg.floorplanLineStart) || (pinDir === 'input' && pinType === 'data_in');
    }

    function isFloorplanTargetDef(cfg, pinDir, pinType) {
        return !!(cfg && cfg.floorplanLineTarget) || (pinDir === 'output' && pinType === 'data_out');
    }

    function bodyHasLogicalFloorplanStart(graph, body) {
        if (!graph || !body) return false;
        if (isSymbolBody(body)) {
            var symbolPins = getSymbolPinModels(body);
            for (var i = 0; i < symbolPins.length; i++) {
                var pin = symbolPins[i] || {};
                if (isFloorplanStartDef(pin, pin.dir || 'input', pin.type || '')) return true;
            }
            return false;
        }

        var pins = NS.getChipPins(graph, body);
        for (var j = 0; j < pins.length; j++) {
            if (isFloorplanStartPin(graph, pins[j])) return true;
        }
        return false;
    }

    function bodyHasLogicalFloorplanTarget(graph, body) {
        if (!graph || !body) return false;
        if (isSymbolBody(body)) {
            var symbolPins = getSymbolPinModels(body);
            for (var i = 0; i < symbolPins.length; i++) {
                var pin = symbolPins[i] || {};
                if (isFloorplanTargetDef(pin, pin.dir || 'input', pin.type || '')) return true;
            }
            return false;
        }

        var pins = NS.getChipPins(graph, body);
        for (var j = 0; j < pins.length; j++) {
            if (isFloorplanTargetPin(graph, pins[j])) return true;
        }
        return false;
    }

    function markDataSourceAsFloorplan(graph, body, def, runtimeOpt, ctx) {
        if (!body) return;
        var lineNS = getLineNS();
        if (lineNS && lineNS.ensurePerimeterRegistered) lineNS.ensurePerimeterRegistered();

        var model = graph.getModel();
        var bodyStyle = body.getStyle() || '';
        bodyStyle = mxUtils.setStyle(bodyStyle, 'floorplan', '1');
        bodyStyle = mxUtils.setStyle(bodyStyle, 'perimeter', 'floorplanAnyPoint');
        bodyStyle = mxUtils.setStyle(bodyStyle, 'dftsIP_category', String(NS.CATEGORY.DATASOURCE));
        if (def && def.dftsType) bodyStyle = mxUtils.setStyle(bodyStyle, 'dftsIP_type', String(def.dftsType));
        model.setStyle(body, bodyStyle);

        if (isSymbolBody(body)) {
            ensureSymbolPortCompatibility(graph, body, def, runtimeOpt, ctx);
            return;
        }

        var pinDefs = getPinDefMap(def, runtimeOpt, ctx);
        var pins = NS.getChipPins(graph, body);

        for (var i = 0; i < pins.length; i++) {
            var pin = pins[i];
            var style = graph.getCellStyle(pin);
            var pinKey = mxUtils.getValue(style, 'dftsIP_pinKey', '');
            var pinDir = mxUtils.getValue(style, 'dftsIP_pin_direction', 'input');
            var pinType = mxUtils.getValue(style, 'dftsIP_pinType', '');
            var cfg = pinDefs[pinKey] || {};
            var isFloorplanStart = isFloorplanStartDef(cfg, pinDir, pinType);
            var isFloorplanTarget = isFloorplanTargetDef(cfg, pinDir, pinType);

            var pinStyle = pin.getStyle() || '';
            pinStyle = mxUtils.setStyle(pinStyle, 'dftsIP_floorplanStart', isFloorplanStart ? '1' : '0');
            pinStyle = mxUtils.setStyle(pinStyle, 'dftsIP_floorplanTarget', isFloorplanTarget ? '1' : '0');
            pinStyle = mxUtils.setStyle(pinStyle, 'dftsIP_floorplanAnchorSide', isFloorplanStart ? 'source' : (isFloorplanTarget ? 'target' : ''));
            pinStyle = mxUtils.setStyle(pinStyle, 'connectable', isFloorplanStart ? '1' : '0');
            model.setStyle(pin, pinStyle);
            pin.connectable = !!isFloorplanStart;
        }
    }

    function getPinExitPoint(graph, pin) {
        if (!pin || !pin.parent || !pin.geometry || !pin.parent.geometry) return null;

        var body = pin.parent;
        var bg = body.geometry;
        var pg = pin.geometry;
        var style = graph.getCellStyle(pin);
        var side = mxUtils.getValue(style, 'dftsIP_pin_location', mxUtils.getValue(style, 'dftsIP_symbolSide', 'east'));

        var ox = (pg.offset && pg.offset.x) ? pg.offset.x : 0;
        var oy = (pg.offset && pg.offset.y) ? pg.offset.y : 0;

        var x = bg.x + pg.x * bg.width + ox;
        var y = bg.y + pg.y * bg.height + oy;

        if (pin.__dftsSymbolChild && pin.__dftsSymbolKind === 'port') {
            var cx = x + (pg.width || 0) / 2;
            var cy = y + (pg.height || 0) / 2;
            if (side === 'west') return new mxPoint(bg.x, cy);
            if (side === 'east') return new mxPoint(bg.x + bg.width, cy);
            if (side === 'north') return new mxPoint(cx, bg.y);
            return new mxPoint(cx, bg.y + bg.height);
        }

        if (side === 'west') return new mxPoint(x, y + pg.height / 2);
        if (side === 'east') return new mxPoint(x + pg.width, y + pg.height / 2);
        if (side === 'north') return new mxPoint(x + pg.width / 2, y);
        return new mxPoint(x + pg.width / 2, y + pg.height);
    }

    function attachFloorplanLineAnchor(graph, edge, pin, anchorSide) {
        if (!graph || !edge || !pin || !pin.parent) return;
        anchorSide = anchorSide || 'source';

        var body = pin.parent;
        var style = edge.getStyle() || '';
        var pinStyle = graph.getCellStyle(pin);
        var pinKey = mxUtils.getValue(pinStyle, 'dftsIP_pinKey', String(pin.__dftsSymbolKey || ''));
        var bodyId = body.getId ? body.getId() : body.id;

        style = mxUtils.setStyle(style, 'dftFloorplanAnchor_' + anchorSide, '1');
        style = mxUtils.setStyle(style, 'dftFloorplanAnchor_' + anchorSide + '_bodyId', String(bodyId));
        style = mxUtils.setStyle(style, 'dftFloorplanAnchor_' + anchorSide + '_pinKey', pinKey);
        graph.getModel().setStyle(edge, style);
    }

    function attachFloorplanLineBodyPointAnchor(graph, edge, body, point, anchorSide) {
        if (!graph || !edge || !body || !point || !body.geometry) return;
        anchorSide = anchorSide || 'source';

        var bg = body.geometry;
        var rx = bg.width ? ((point.x - bg.x) / bg.width) : 0.5;
        var ry = bg.height ? ((point.y - bg.y) / bg.height) : 0.5;
        rx = Math.max(0, Math.min(1, rx));
        ry = Math.max(0, Math.min(1, ry));

        var style = edge.getStyle() || '';
        var bodyId = body.getId ? body.getId() : body.id;
        style = mxUtils.setStyle(style, 'dftFloorplanAnchor_' + anchorSide, '1');
        style = mxUtils.setStyle(style, 'dftFloorplanAnchor_' + anchorSide + '_bodyId', String(bodyId));
        style = mxUtils.setStyle(style, 'dftFloorplanAnchor_' + anchorSide + '_pinKey', '');
        style = mxUtils.setStyle(style, 'dftFloorplanAnchor_' + anchorSide + '_rx', String(rx));
        style = mxUtils.setStyle(style, 'dftFloorplanAnchor_' + anchorSide + '_ry', String(ry));
        graph.getModel().setStyle(edge, style);
    }


    function detachFloorplanLineAnchor(graph, edge, anchorSide) {
        if (!graph || !edge) return;
        anchorSide = anchorSide || 'target';
        var style = edge.getStyle() || '';
        style = mxUtils.setStyle(style, 'dftFloorplanAnchor_' + anchorSide, '0');
        style = mxUtils.setStyle(style, 'dftFloorplanAnchor_' + anchorSide + '_bodyId', '');
        style = mxUtils.setStyle(style, 'dftFloorplanAnchor_' + anchorSide + '_pinKey', '');
        style = mxUtils.setStyle(style, 'dftFloorplanAnchor_' + anchorSide + '_rx', '');
        style = mxUtils.setStyle(style, 'dftFloorplanAnchor_' + anchorSide + '_ry', '');
        graph.getModel().setStyle(edge, style);
    }

    function findPinByKey(graph, body, pinKey) {
        if (!body || !pinKey) return null;
        if (isSymbolBody(body)) return getSymbolPortByKey(body, pinKey);
        var pins = NS.getChipPins(graph, body);
        for (var i = 0; i < pins.length; i++) {
            var style = graph.getCellStyle(pins[i]);
            if (String(mxUtils.getValue(style, 'dftsIP_pinKey', '')) === String(pinKey)) return pins[i];
        }
        return null;
    }

    function getAnchorPinForEdgeSide(graph, edge, anchorSide) {
        if (!edge) return null;
        var styleObj = graph.getCellStyle(edge);
        if (String(mxUtils.getValue(styleObj, 'dftFloorplanAnchor_' + anchorSide, '0')) !== '1') return null;

        var styleMap = styleMapToObject(edge.getStyle() || '');
        var bodyId = styleMap['dftFloorplanAnchor_' + anchorSide + '_bodyId'];
        var pinKey = styleMap['dftFloorplanAnchor_' + anchorSide + '_pinKey'];
        if (!bodyId || !pinKey) return null;

        var body = graph.getModel().getCell(bodyId);
        if (!body) return null;
        return findPinByKey(graph, body, pinKey);
    }

    function getAnchorBodyPointForEdgeSide(graph, edge, anchorSide) {
        if (!edge) return null;
        var styleObj = graph.getCellStyle(edge);
        if (String(mxUtils.getValue(styleObj, 'dftFloorplanAnchor_' + anchorSide, '0')) !== '1') return null;

        var styleMap = styleMapToObject(edge.getStyle() || '');
        var bodyId = styleMap['dftFloorplanAnchor_' + anchorSide + '_bodyId'];
        var pinKey = styleMap['dftFloorplanAnchor_' + anchorSide + '_pinKey'];
        var rx = parseFloat(styleMap['dftFloorplanAnchor_' + anchorSide + '_rx']);
        var ry = parseFloat(styleMap['dftFloorplanAnchor_' + anchorSide + '_ry']);
        if (!bodyId || pinKey) return null;

        var body = graph.getModel().getCell(bodyId);
        if (!body || !body.geometry) return null;
        if (isNaN(rx) || isNaN(ry)) return null;
        return new mxPoint(
            body.geometry.x + body.geometry.width * rx,
            body.geometry.y + body.geometry.height * ry
        );
    }

    function collectEdges(graph, parent, out) {
        var model = graph.getModel();
        if (!parent) return;
        if (parent.edge) out.push(parent);
        var n = model.getChildCount(parent);
        for (var i = 0; i < n; i++) collectEdges(graph, model.getChildAt(parent, i), out);
    }

    function getAllEdges(graph) {
        var out = [];
        if (!graph) return out;
        collectEdges(graph, graph.getModel().getRoot(), out);
        return out;
    }

    function syncAnchoredFloorplanLine(graph, edge) {
        if (!graph || !edge || !edge.edge) return;
        var style = graph.getCellStyle(edge);
        if (String(mxUtils.getValue(style, 'floorplanLine', '0')) !== '1') return;

        var sourcePin = getAnchorPinForEdgeSide(graph, edge, 'source');
        var targetPin = getAnchorPinForEdgeSide(graph, edge, 'target');
        var sourceBodyPoint = getAnchorBodyPointForEdgeSide(graph, edge, 'source');
        var targetBodyPoint = getAnchorBodyPointForEdgeSide(graph, edge, 'target');
        if (!sourcePin && !targetPin && !sourceBodyPoint && !targetBodyPoint) return;

        var geo = graph.getCellGeometry(edge);
        if (!geo) return;

        var lineNS = getLineNS();
        var nextGeo = lineNS && lineNS.cloneLineGeometry ? lineNS.cloneLineGeometry(geo) : geo.clone();

        if (sourcePin) {
            var spt = getPinExitPoint(graph, sourcePin);
            if (spt) nextGeo.sourcePoint = spt;
        } else if (sourceBodyPoint) {
            nextGeo.sourcePoint = sourceBodyPoint;
        }

        if (targetPin) {
            var tpt = getPinExitPoint(graph, targetPin);
            if (tpt) nextGeo.targetPoint = tpt;
        } else if (targetBodyPoint) {
            nextGeo.targetPoint = targetBodyPoint;
        }

        graph.getModel().setGeometry(edge, nextGeo);
    }

    function syncAnchoredFloorplanLinesForBody(graph, body) {
        if (!graph || !body) return;
        var bodyId = body.getId ? body.getId() : body.id;
        var edges = getAllEdges(graph);

        graph.getModel().beginUpdate();
        try {
            for (var i = 0; i < edges.length; i++) {
                var edge = edges[i];
                var style = styleMapToObject(edge.getStyle() || '');
                if (style.dftFloorplanAnchor_source_bodyId === String(bodyId) || style.dftFloorplanAnchor_target_bodyId === String(bodyId)) {
                    syncAnchoredFloorplanLine(graph, edge);
                }
            }
        } finally {
            graph.getModel().endUpdate();
        }
    }

    function isFloorplanStartPin(graph, pin) {
        if (!pin) return false;
        if (pin.__dftsSymbolChild && pin.__dftsSymbolKind === 'port') {
            var s0 = graph.getCellStyle(pin);
            return String(mxUtils.getValue(s0, 'dftsIP_floorplanStart', '0')) === '1';
        }
        if (!NS.isPinCell(graph, pin)) return false;
        var style = graph.getCellStyle(pin);
        return String(mxUtils.getValue(style, 'dftsIP_floorplanStart', '0')) === '1';
    }

    function getFloorplanStartPinsForBody(graph, body) {
        if (!graph || !body) return [];
        if (isSymbolBody(body)) {
            var symbolPins = getSymbolPinModels(body);
            var symbolOut = [];
            for (var s = 0; s < symbolPins.length; s++) {
                var pinModel = symbolPins[s] || {};
                if (!isFloorplanStartDef(pinModel, pinModel.dir || 'input', pinModel.type || '')) continue;
                var port = getSymbolPortByKey(body, pinModel.key);
                if (port) symbolOut.push(port);
            }
            return symbolOut;
        }

        var pins = NS.getChipPins(graph, body);
        var out = [];
        for (var i = 0; i < pins.length; i++) {
            if (isFloorplanStartPin(graph, pins[i])) out.push(pins[i]);
        }
        return out;
    }

    function getBodyConnectionPoints() {
        return [
            new mxPoint(0, 0), new mxPoint(0.25, 0), new mxPoint(0.5, 0), new mxPoint(0.75, 0), new mxPoint(1, 0),
            new mxPoint(0, 0.25), new mxPoint(0, 0.5), new mxPoint(0, 0.75),
            new mxPoint(1, 0.25), new mxPoint(1, 0.5), new mxPoint(1, 0.75),
            new mxPoint(0, 1), new mxPoint(0.25, 1), new mxPoint(0.5, 1), new mxPoint(0.75, 1), new mxPoint(1, 1)
        ];
    }

    function getAbsolutePointOnBody(body, relPt) {
        if (!body || !body.geometry || !relPt) return null;
        return new mxPoint(
            body.geometry.x + body.geometry.width * relPt.x,
            body.geometry.y + body.geometry.height * relPt.y
        );
    }

    function getAllDataSourceBodies(graph) {
        var bodies = NS.getAllChipBodies ? NS.getAllChipBodies(graph) : [];
        var out = [];
        for (var i = 0; i < bodies.length; i++) {
            if (isDataSourceBody(graph, bodies[i])) out.push(bodies[i]);
        }
        return out;
    }

    function findNearestFloorplanStartPin(graph, body, pt, threshold) {
        if (!graph || !body || !pt) return null;
        var maxDist = Math.max(4, Number(threshold) || 18);
        var pins = getFloorplanStartPinsForBody(graph, body);
        var best = null;
        var bestDist = Infinity;

        for (var i = 0; i < pins.length; i++) {
            var pin = pins[i];
            var pinPt = getPinExitPoint(graph, pin);
            if (!pinPt) continue;
            var dx = pinPt.x - pt.x;
            var dy = pinPt.y - pt.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= maxDist && dist < bestDist) {
                best = pin;
                bestDist = dist;
            }
        }

        if (!best) return null;
        return {
            pin: best,
            point: getPinExitPoint(graph, best),
            distance: bestDist
        };
    }

    function isFloorplanStartBody(graph, body) {
        return isDataSourceBody(graph, body) && bodyHasLogicalFloorplanStart(graph, body);
    }


    function isFloorplanTargetPin(graph, pin) {
        if (!pin) return false;
        if (pin.__dftsSymbolChild && pin.__dftsSymbolKind === 'port') {
            var s0 = graph.getCellStyle(pin);
            return String(mxUtils.getValue(s0, 'dftsIP_floorplanTarget', '0')) === '1';
        }
        if (!NS.isPinCell(graph, pin)) return false;
        var style = graph.getCellStyle(pin);
        return String(mxUtils.getValue(style, 'dftsIP_floorplanTarget', '0')) === '1';
    }

    function getFloorplanTargetPinsForBody(graph, body) {
        if (!graph || !body) return [];
        if (isSymbolBody(body)) {
            var symbolPins = getSymbolPinModels(body);
            var symbolOut = [];
            for (var s = 0; s < symbolPins.length; s++) {
                var pinModel = symbolPins[s] || {};
                if (!isFloorplanTargetDef(pinModel, pinModel.dir || 'input', pinModel.type || '')) continue;
                var port = getSymbolPortByKey(body, pinModel.key);
                if (port) symbolOut.push(port);
            }
            return symbolOut;
        }

        var pins = NS.getChipPins(graph, body);
        var out = [];
        for (var i = 0; i < pins.length; i++) {
            if (isFloorplanTargetPin(graph, pins[i])) out.push(pins[i]);
        }
        return out;
    }

    function findNearestGlobalFloorplanTargetPin(graph, pt, threshold) {
        if (!graph || !pt) return null;
        var maxDist = Math.max(4, Number(threshold) || 18);
        var bodies = getAllDataSourceBodies(graph);
        var best = null;
        var bestDist = Infinity;

        for (var i = 0; i < bodies.length; i++) {
            var pins = getFloorplanTargetPinsForBody(graph, bodies[i]);
            for (var j = 0; j < pins.length; j++) {
                var pin = pins[j];
                var pinPt = getPinExitPoint(graph, pin);
                if (!pinPt) continue;
                var dx = pinPt.x - pt.x;
                var dy = pinPt.y - pt.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= maxDist && dist < bestDist) {
                    best = pin;
                    bestDist = dist;
                }
            }
        }

        if (!best) return null;
        return {
            pin: best,
            point: getPinExitPoint(graph, best),
            distance: bestDist
        };
    }

    function findNearestGlobalFloorplanTargetBodyPoint(graph, pt, threshold) {
        if (!graph || !pt) return null;
        var maxDist = Math.max(4, Number(threshold) || 18);
        var bodies = getAllDataSourceBodies(graph);
        var best = null;
        var bestDist = Infinity;

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];
            if (!bodyHasLogicalFloorplanTarget(graph, body)) continue;
            var points = getBodyConnectionPoints();
            for (var j = 0; j < points.length; j++) {
                var absPt = getAbsolutePointOnBody(body, points[j]);
                if (!absPt) continue;
                var dx = absPt.x - pt.x;
                var dy = absPt.y - pt.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= maxDist && dist < bestDist) {
                    best = { body: body, point: absPt, relPoint: points[j] };
                    bestDist = dist;
                }
            }
        }

        if (!best) return null;
        best.distance = bestDist;
        return best;
    }

    function findNearestFloorplanTargetPin(graph, body, pt, threshold) {
        if (!graph || !body || !pt) return null;
        var maxDist = Math.max(4, Number(threshold) || 18);
        var pins = getFloorplanTargetPinsForBody(graph, body);
        var best = null;
        var bestDist = Infinity;

        for (var i = 0; i < pins.length; i++) {
            var pin = pins[i];
            var pinPt = getPinExitPoint(graph, pin);
            if (!pinPt) continue;
            var dx = pinPt.x - pt.x;
            var dy = pinPt.y - pt.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= maxDist && dist < bestDist) {
                best = pin;
                bestDist = dist;
            }
        }

        if (!best) return null;
        return {
            pin: best,
            point: getPinExitPoint(graph, best),
            distance: bestDist
        };
    }

    function buildDataSourceConnectionConstraints(graph, body) {
        if (!graph || !body || !isDataSourceBody(graph, body)) return null;

        var canStart = bodyHasLogicalFloorplanStart(graph, body);
        var canTarget = bodyHasLogicalFloorplanTarget(graph, body);
        var points = getBodyConnectionPoints();
        var out = [];
        for (var i = 0; i < points.length; i++) {
            var relPt = points[i];
            var c = new mxConnectionConstraint(new mxPoint(relPt.x, relPt.y), false);
            out.push(c);
        }

        debugLog('constraints', body.id || (body.getId && body.getId()), out.map(function (c) {
            return {
                x: c.point && c.point.x,
                y: c.point && c.point.y
            };
        }));
        return out.length ? out : null;
    }

    function startFloorplanLineFromPin(realUi, graph, pin) {
        var lineNS = getLineNS();
        if (!lineNS || typeof realUi.startFloorplanLineFromPoint !== 'function') {
            if (typeof mxUtils !== 'undefined' && mxUtils.alert) {
                mxUtils.alert('请先加载 dft_floorplan_line.js，再使用 Data Source 的 data_in pin 绘制 Floorplan Line。');
            }
            return null;
        }

        var pt = getPinExitPoint(graph, pin);
        if (!pt) return null;
        debugLog('startFromPin', pin && (pin.id || pin.getId && pin.getId()), pt.x, pt.y);

        var body = pin.parent || null;
        return realUi.startFloorplanLineFromPoint(pt, {
            commitOnMouseUp: true,
            autoFinishOnMouseUp: true,
            decorateEdge: function (edge, g) {
                attachFloorplanLineAnchor(g, edge, pin, 'source');
                detachFloorplanLineAnchor(g, edge, 'target');
            },
            snapPoint: function (basePt) {
                var hit = findNearestFloorplanTargetPin(graph, body, basePt, 24);
                if (!hit || !hit.point) return null;
                return {
                    point: hit.point,
                    meta: {
                        kind: 'floorplanTargetPin',
                        pin: hit.pin,
                        body: body,
                        distance: hit.distance
                    }
                };
            },
            afterCommitPoint: function (ctx) {
                var edge = ctx && ctx.tool ? ctx.tool.edge : null;
                if (!edge) return;
                if (ctx.snap && ctx.snap.pin) attachFloorplanLineAnchor(graph, edge, ctx.snap.pin, 'target');
                else detachFloorplanLineAnchor(graph, edge, 'target');
                syncAnchoredFloorplanLine(graph, edge);
            }
        });
    }

    function startFloorplanLineFromBody(realUi, graph, body, startPt) {
        var lineNS = getLineNS();
        if (!lineNS || typeof realUi.startFloorplanLineFromPoint !== 'function') {
            if (typeof mxUtils !== 'undefined' && mxUtils.alert) {
                mxUtils.alert('请先加载 dft_floorplan_line.js，再使用 Data Source 的 body 连接点绘制 Floorplan Line。');
            }
            return null;
        }
        if (!body || !startPt) return null;

        var pt = startPt;
        if (!pt) return null;
        debugLog('startFromBody', body.id || (body.getId && body.getId()), pt.x, pt.y);

        return realUi.startFloorplanLineFromPoint(pt, {
            commitOnMouseUp: true,
            autoFinishOnMouseUp: true,
            decorateEdge: function (edge, g) {
                attachFloorplanLineBodyPointAnchor(g, edge, body, pt, 'source');
                detachFloorplanLineAnchor(g, edge, 'target');
            },
            snapPoint: function (basePt) {
                var hit = findNearestGlobalFloorplanTargetBodyPoint(graph, basePt, 24);
                debugLog('snapTarget', basePt && basePt.x, basePt && basePt.y, hit ? {
                    body: hit.body && (hit.body.id || (hit.body.getId && hit.body.getId())),
                    x: hit.point && hit.point.x,
                    y: hit.point && hit.point.y,
                    distance: hit.distance
                } : null);
                if (!hit || !hit.point) return null;
                return {
                    point: hit.point,
                    meta: {
                        kind: 'floorplanTargetPin',
                        pin: hit.pin,
                        body: body,
                        distance: hit.distance
                    }
                };
            },
            afterCommitPoint: function (ctx) {
                var edge = ctx && ctx.tool ? ctx.tool.edge : null;
                if (!edge) return;
                if (ctx.snap && ctx.snap.body && ctx.snap.point) attachFloorplanLineBodyPointAnchor(graph, edge, ctx.snap.body, ctx.snap.point, 'target');
                else detachFloorplanLineAnchor(graph, edge, 'target');
                syncAnchoredFloorplanLine(graph, edge);
            }
        });
    }

    function startFloorplanLineFromConstraint(realUi, graph, body, constraint) {
        if (!body || !constraint) return false;
        debugLog('startFromConstraint', body && (body.id || body.getId && body.getId()), {
            x: constraint.point && constraint.point.x,
            y: constraint.point && constraint.point.y
        });
        if (!bodyHasLogicalFloorplanStart(graph, body)) return false;
        if (!constraint.point) return false;
        var pt = getAbsolutePointOnBody(body, constraint.point);
        if (!pt) return false;
        return !!startFloorplanLineFromBody(realUi, graph, body, pt);
    }

    function getMouseGraphPoint(me, cell) {
        var pt = me && me.getGraphX && me.getGraphY ? new mxPoint(me.getGraphX(), me.getGraphY()) : null;
        if (pt) return pt;
        if (me && typeof me.getX === 'function' && typeof me.getY === 'function') {
            return new mxPoint(me.getX(), me.getY());
        }
        var geo = cell && cell.geometry ? cell.geometry : null;
        return geo ? new mxPoint(geo.x, geo.y + geo.height / 2) : null;
    }

    function installDataSourceFloorplanBridge(ui) {
        var realUi = normalizeUi(ui);
        var graph = realUi && realUi.editor ? realUi.editor.graph : null;
        if (!graph || graph._dftsDataSourceFloorplanBridgeInstalled) return;
        graph._dftsDataSourceFloorplanBridgeInstalled = true;

        var lineNS = getLineNS();
        if (lineNS) {
            if (lineNS.enableFloorplanFreeConnect) lineNS.enableFloorplanFreeConnect(realUi);
            if (lineNS.installFloorplanLineTool) lineNS.installFloorplanLineTool(realUi);
            if (lineNS.installFloorplanLineContinueHandles) lineNS.installFloorplanLineContinueHandles(realUi);
        }
        if (graph.connectionHandler && !graph.connectionHandler._dftsDataSourceFloorplanStartPatched) {
            graph.connectionHandler._dftsDataSourceFloorplanStartPatched = true;

            var ch = graph.connectionHandler;
            var oldMouseDown = ch.mouseDown;
            var oldStart = ch.start;
            var oldConnect = ch.connect;
            var oldInsertEdge = ch.insertEdge;

            function tryStartFloorplanFromCell(me, cell) {
                var body = resolveDataSourceBody(graph, cell);
                debugLog('tryStartFloorplanFromCell', cell && (cell.id || (cell.getId && cell.getId())), {
                    resolvedBody: body && (body.id || (body.getId && body.getId())),
                    isStartPin: isFloorplanStartPin(graph, cell),
                    isStartBody: isFloorplanStartBody(graph, body),
                    graphX: me && me.getGraphX ? me.getGraphX() : null,
                    graphY: me && me.getGraphY ? me.getGraphY() : null
                });
                if (isFloorplanStartPin(graph, cell)) {
                    startFloorplanLineFromPin(realUi, graph, cell);
                    return true;
                }

                if (body && isFloorplanStartBody(graph, body)) {
                    var cur = ch.constraintHandler ? ch.constraintHandler.currentConstraint : null;
                    debugLog('currentConstraint', cur ? {
                        x: cur.point && cur.point.x,
                        y: cur.point && cur.point.y
                    } : null);
                    if (!cur) return false;
                    return startFloorplanLineFromConstraint(realUi, graph, body, cur);
                }

                return false;
            }

            ch.mouseDown = function (sender, me) {
                var evt = me && me.getEvent ? me.getEvent() : null;
                var state = me && me.getState ? me.getState() : null;
                var cell = state && state.cell ? state.cell : (me && me.getCell ? me.getCell() : null);
                debugLog('mouseDown', {
                    cell: cell && (cell.id || (cell.getId && cell.getId())),
                    graphX: me && me.getGraphX ? me.getGraphX() : null,
                    graphY: me && me.getGraphY ? me.getGraphY() : null,
                    hasState: !!state
                });

                if (evt && mxEvent.isLeftMouseButton(evt) && tryStartFloorplanFromCell(me, cell)) {
                    this.__dftsSuppressNextInsertEdge = true;
                    try {
                        this.reset();
                    } catch (e) { }
                    if (me && typeof me.consume === 'function') me.consume();
                    mxEvent.consume(evt);
                    return;
                }

                return oldMouseDown.apply(this, arguments);
            };

            ch.start = function (state, x, y, edgeState) {
                var cell = state && state.cell ? state.cell : null;
                var body = resolveDataSourceBody(graph, cell);
                debugLog('connectionStart', {
                    cell: cell && (cell.id || (cell.getId && cell.getId())),
                    resolvedBody: body && (body.id || (body.getId && body.getId())),
                    x: x,
                    y: y
                });
                if (cell && (isFloorplanStartPin(graph, cell) || (body && isFloorplanStartBody(graph, body)))) {
                    this.__dftsSuppressNextInsertEdge = true;
                    if (isFloorplanStartPin(graph, cell)) {
                        startFloorplanLineFromPin(realUi, graph, cell);
                    } else {
                        var cur = this.constraintHandler ? this.constraintHandler.currentConstraint : null;
                        if (!startFloorplanLineFromConstraint(realUi, graph, body, cur)) {
                            this.__dftsSuppressNextInsertEdge = false;
                            return oldStart.apply(this, arguments);
                        }
                    }
                    try {
                        this.reset();
                    } catch (e) { }
                    return;
                }

                return oldStart.apply(this, arguments);
            };

            ch.connect = function (source, target, evt, dropTarget) {
                if (this.__dftsSuppressNextInsertEdge) {
                    this.__dftsSuppressNextInsertEdge = false;
                    if (evt) mxEvent.consume(evt);
                    return null;
                }
                return oldConnect.apply(this, arguments);
            };

            ch.insertEdge = function (parent, id, value, source, target, style) {
                if (this.__dftsSuppressNextInsertEdge) {
                    this.__dftsSuppressNextInsertEdge = false;
                    return null;
                }
                return oldInsertEdge.apply(this, arguments);
            };
        }

        if (realUi.actions && !realUi._dftsDataSourceActionsInstalled) {
            realUi._dftsDataSourceActionsInstalled = true;
            realUi.actions.addAction('startSelectedDataSourceFloorplanLine', function () {
                var cell = graph.getSelectionCell();
                if (isFloorplanStartPin(graph, cell)) {
                    startFloorplanLineFromPin(realUi, graph, cell);
                    return;
                }
                if (isFloorplanStartBody(graph, cell)) {
                    var geo = cell.geometry;
                    var fallbackPt = geo ? new mxPoint(geo.x, geo.y + geo.height / 2) : null;
                    var hit = fallbackPt ? findNearestFloorplanStartPin(graph, cell, fallbackPt, Math.max(24, geo.width || 0, geo.height || 0)) : null;
                    if (hit && hit.point) startFloorplanLineFromBody(realUi, graph, cell, hit.point);
                    else if (typeof mxUtils !== 'undefined' && mxUtils.alert) mxUtils.alert('当前 Data Source body 上没有可用的 Floorplan Line 起始连接点。');
                    return;
                }
                if (typeof mxUtils !== 'undefined' && mxUtils.alert) mxUtils.alert('请先选中一个支持 Floorplan Line 的 Data Source pin 或 body。');
            });
        }

        function handleCells(cells) {
            if (!cells || !cells.length) return;
            var seen = {};
            for (var i = 0; i < cells.length; i++) {
                var body = NS.findChipBodyForCell(graph, cells[i]);
                if (!body) continue;
                var style = graph.getCellStyle(body);
                if (String(mxUtils.getValue(style, 'dftsIP_category', '')) !== String(NS.CATEGORY.DATASOURCE)) continue;
                var id = body.getId ? body.getId() : body.id;
                if (seen[id]) continue;
                seen[id] = true;
                syncAnchoredFloorplanLinesForBody(graph, body);
            }
        }

        graph.addListener(mxEvent.CELLS_MOVED, function (sender, evt) {
            handleCells(evt.getProperty('cells') || []);
        });

        graph.addListener(mxEvent.CELLS_RESIZED, function (sender, evt) {
            handleCells(evt.getProperty('cells') || []);
        });
    }

    NS.registerConfigOpener('data_source_common', function (graph, body) {
        if (typeof global.openDftsDataSourceConfigDialog === 'function') {
            return global.openDftsDataSourceConfigDialog(graph, body);
        }
        if (typeof mxUtils !== 'undefined' && mxUtils.alert) {
            mxUtils.alert('Data Source 配置界面暂未接入，你可以在后续把真实弹窗函数挂到 openDftsDataSourceConfigDialog。');
        }
    });

    registerDataSource({
        key: 'PatternDataSource',
        dftsType: 'pattern_data_source',
        defaultLabel: 'PatternDataSource',
        instanceBaseName: 'PatternDataSource',
        configKey: 'data_source_common',
        w: 320,
        h: 120,
        rounded: 8,
        strokeWidth: 1,
        bodyFont: 20,
        pinFont: 16,
        pinsFactory: staticPins({
            east: [
                { name: 'pattern_data_out', type: 'data_out', dir: 'output', pinKey: 'pattern_data_out', busWidth: 8, isBus: true, floorplanLineTarget: true },
                { name: 'pattern_valid', type: 'status_out', dir: 'output', pinKey: 'pattern_valid' }
            ]
        })
    });

    registerDataSource({
        key: 'SSNPadSource',
        dftsType: 'ssn_data_source',
        defaultLabel: 'SSNPadSource',
        instanceBaseName: 'SSNPadSource',
        configKey: 'data_source_common',
        w: 320,
        h: 120,
        rounded: 8,
        strokeWidth: 1,
        bodyFont: 20,
        pinFont: 16,
        pinsFactory: staticPins({
            west: [
                { name: 'ssn_bus_clock', type: 'data_out', dir: 'input', pinKey: 'ssn_bus_clock' }
            ],
            east: [
                { name: 'ssn_data_out', type: 'data_out', dir: 'output', pinKey: 'ssn_data_out', busWidth: 8, isBus: true, floorplanLineTarget: true },
                { name: 'ssn_data_in', type: 'data_in', dir: 'input', pinKey: 'ssn_data_in' }
            ]
        })
    });

    registerDataSource({
        key: 'ExternalDataSource',
        dftsType: 'external_data_source',
        defaultLabel: 'ExternalDataSource',
        instanceBaseName: 'ExternalDataSource',
        configKey: 'data_source_common',
        w: 320,
        h: 120,
        rounded: 8,
        strokeWidth: 1,
        bodyFont: 20,
        pinFont: 16,
        pinsFactory: staticPins({
            west: [
                { name: 'enable', type: 'enable_in', dir: 'input', pinKey: 'enable' }
            ],
            east: [
                { name: 'data_out', type: 'data_out', dir: 'output', pinKey: 'data_out', busWidth: 16, isBus: true, floorplanLineTarget: true },
                { name: 'status', type: 'status_out', dir: 'output', pinKey: 'status' }
            ]
        })
    });

    global.buildPatternDataSource = NS.makeCreateFn('PatternDataSource');
    global.buildSSNDataSource = NS.makeCreateFn('SSNPadSource');
    global.buildExternalDataSource = NS.makeCreateFn('ExternalDataSource');

    NS.getPinExitPoint = getPinExitPoint;
    NS.attachFloorplanLineAnchor = attachFloorplanLineAnchor;
    NS.detachFloorplanLineAnchor = detachFloorplanLineAnchor;
    NS.syncAnchoredFloorplanLine = syncAnchoredFloorplanLine;
    NS.syncAnchoredFloorplanLinesForBody = syncAnchoredFloorplanLinesForBody;
    NS.installDataSourceFloorplanBridge = installDataSourceFloorplanBridge;
    NS.getDataSourceConnectionConstraints = buildDataSourceConnectionConstraints;

    NS.installDataSourceIp = function (ui) {
        var realUi = normalizeUi(ui);
        if (realUi && realUi.editor && realUi.editor.graph) NS.ensureGraphPatches(realUi.editor.graph);
        NS.installEditingPolicy(ui);
        NS.installInstanceFollow(ui);
        NS.installConfigAction(ui);
        installDataSourceFloorplanBridge(ui);
        if (typeof NS.installIpEdgeConfig === 'function') NS.installIpEdgeConfig(ui);
    };

})(this);
