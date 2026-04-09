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

    function getStyleValue(styleText, key, fallback) {
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

    function isMuxDataSourceBody(graph, body) {
        if (!graph || !body) return false;
        var style = body.style || (graph.getModel && graph.getModel().getStyle ? graph.getModel().getStyle(body) : '');
        return String(getStyleValue(style, 'dftsIP_type', '')) === 'mux_data_source';
    }

    function getMuxDecorationCell(body, key) {
        if (!body || !body.children) return null;
        for (var i = 0; i < body.children.length; i++) {
            var child = body.children[i];
            if (child && child.__dftsMuxDataSourceDecoration === key) return child;
        }
        return null;
    }

    function ensureMuxDecorationCell(graph, body, key, text, x, y, width, height, align, fontSize, fontColor, weight) {
        if (!graph || !body || !body.geometry) return null;
        var model = graph.getModel();
        var child = getMuxDecorationCell(body, key);
        var geo = new mxGeometry(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
        var style = [
            'shape=text',
            'html=1',
            'whiteSpace=wrap',
            'align=' + (align || 'center'),
            'verticalAlign=middle',
            'strokeColor=none',
            'fillColor=none',
            'resizable=0',
            'movable=0',
            'rotatable=0',
            'deletable=0',
            'editable=0',
            'selectable=0',
            'fontStyle=' + (weight || 0),
            'fontSize=' + (fontSize || 16),
            'fontColor=' + (fontColor || '#111111')
        ].join(';') + ';';

        if (!child) {
            child = new mxCell(text, geo, style);
            child.vertex = true;
            child.connectable = false;
            child.__dftsMuxDataSourceDecoration = key;
            model.add(body, child);
        } else {
            model.setValue(child, text);
            model.setGeometry(child, geo);
            model.setStyle(child, style);
        }
        return child;
    }

    function syncMuxDataSourceDecoration(graph, body) {
        if (!graph || !body || !isMuxDataSourceBody(graph, body) || !body.geometry) return;
        var width = Math.max(60, Math.round(Number(body.geometry.width || 0)));
        var height = Math.max(40, Math.round(Number(body.geometry.height || 0)));
        var model = graph.getModel();
        model.beginUpdate();
        try {
            ensureMuxDecorationCell(graph, body, 'q', 'Q', width * 0.42, height * 0.04, 30, 24, 'center', 16, '#111111', 1);
            ensureMuxDecorationCell(graph, body, 'i0', 'I0', width * 0.14, height * 0.80, 36, 24, 'center', 16, '#111111', 0);
            ensureMuxDecorationCell(graph, body, 'i1', 'I1', width * 0.66, height * 0.80, 36, 24, 'center', 16, '#111111', 0);
        } finally {
            model.endUpdate();
        }
    }

    function syncMuxDataSourceDecorations(cells, graph) {
        if (!graph || !cells || !cells.length) return;
        var seen = {};
        for (var i = 0; i < cells.length; i++) {
            var body = resolveDataSourceBody(graph, cells[i]);
            if (!body || !isMuxDataSourceBody(graph, body)) continue;
            var id = body.getId ? body.getId() : body.id;
            if (seen[id]) continue;
            seen[id] = true;
            syncMuxDataSourceDecoration(graph, body);
        }
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
        def.labelPolicy = NS.POLICY.LABEL_FIXED;
        def.instancePolicy = NS.POLICY.INSTANCE_REQUIRED;
        def.lockBodyLabel = true;

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

    function getDataSourceDefinitionForBody(graph, body) {
        if (!graph || !body || !NS || !NS._defsByType) return null;
        var style = graph.getCellStyle(body);
        var dftsType = String(mxUtils.getValue(style, 'dftsIP_type', ''));
        if (!dftsType) return null;
        return NS._defsByType[dftsType] || null;
    }

    function getLogicalPinsFromDefinition(graph, body) {
        var def = getDataSourceDefinitionForBody(graph, body);
        if (!def) return [];
        var pinDefs = getPinDefMap(def, null, null);
        var out = [];
        for (var key in pinDefs) {
            if (Object.prototype.hasOwnProperty.call(pinDefs, key) && pinDefs[key]) out.push(pinDefs[key]);
        }
        return out;
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

    function normalizeLayerName(name) {
        var normalized = String(name || '').trim().toLowerCase();
        if (normalized === 'iftag' || normalized === 'jtag') return 'ijtag';
        return normalized;
    }

    function getLayerRootCell(graph) {
        if (!graph || !graph.getModel || !graph.getDefaultParent) return null;
        try {
            var model = graph.getModel();
            var defaultParent = graph.getDefaultParent();
            return model && defaultParent ? model.getParent(defaultParent) : null;
        } catch (e) {
            return null;
        }
    }

    function getOwningTopLayerName(graph, cell) {
        if (!graph || !cell || !graph.getModel) return '';
        var model = graph.getModel();
        var layerRoot = getLayerRootCell(graph);
        if (!layerRoot) return '';
        var cur = cell;
        while (cur) {
            var parent = null;
            try { parent = model.getParent(cur); } catch (e) { parent = null; }
            if (!parent) return '';
            if (parent === layerRoot) return String(cur.value || '');
            cur = parent;
        }
        return '';
    }

    function getActiveTopLayerName(graph) {
        if (!graph || !graph.getDefaultParent) return '';
        var parent = null;
        try { parent = graph.getDefaultParent(); } catch (e) { parent = null; }
        if (!parent) return '';
        return String(getOwningTopLayerName(graph, parent) || parent.value || '');
    }

    function describeEndpointLabel(graph, body) {
        if (!body) return 'Endpoint';
        var label = body.value != null ? String(body.value) : '';
        if (!label && graph && typeof graph.convertValueToString === 'function') {
            try { label = String(graph.convertValueToString(body) || ''); } catch (e) {}
        }
        if (!label && graph && isGeneratedInterfaceBody(graph, body)) {
            var s = graph.getCellStyle ? graph.getCellStyle(body) : {};
            var ifaceType = String(mxUtils.getValue(s, 'flowInterfaceType', '') || '').toUpperCase();
            if (ifaceType) label = ifaceType + ' Interface';
        }
        label = String(label || '').trim();
        return label || (isGeneratedInterfaceBody(graph, body) ? 'Interface' : 'Data Source');
    }

    function warnEndpointLayerMismatch(graph, body, sourceLayer, activeLayer) {
        if (!graph || typeof mxUtils === 'undefined' || typeof mxUtils.alert !== 'function') return;
        var now = Date.now ? Date.now() : 0;
        if (graph.__dftsDataSourceLayerAlertAt && now && (now - graph.__dftsDataSourceLayerAlertAt) < 250) return;
        graph.__dftsDataSourceLayerAlertAt = now;
        var label = describeEndpointLabel(graph, body);
        var isDs = isDataSourceBody(graph, body);
        if (isDs && sourceLayer === 'base') {
            mxUtils.alert('Data Source "' + label + '" 在 base 层，不允许作为 Floorplan Line 起点。请将其放到对应协议层。');
            return;
        }
        var noun = isDs ? 'Data Source' : 'Interface';
        mxUtils.alert(noun + ' "' + label + '" 位于 "' + sourceLayer + '" 层，当前激活层是 "' + (activeLayer || 'unknown') + '"。请切换到同层后再引出连线。');
    }

    function canStartEndpointLineInCurrentLayer(graph, endpointCell) {
        var body = resolveFloorplanEndpointBody(graph, endpointCell);
        if (!body) return true;
        if (!isDataSourceBody(graph, body) && !isGeneratedInterfaceBody(graph, body)) return true;
        var sourceLayer = normalizeLayerName(getOwningTopLayerName(graph, body));
        var activeLayer = normalizeLayerName(getActiveTopLayerName(graph));
        if (!sourceLayer) return true;
        if (!activeLayer) return true;
        if (sourceLayer === activeLayer) return true;
        warnEndpointLayerMismatch(graph, body, sourceLayer, activeLayer);
        return false;
    }

    function isGeneratedInterfaceBody(graph, body) {
        if (!graph || !body) return false;
        var style = graph.getCellStyle(body);
        return String(mxUtils.getValue(style, 'flowGeneratedInterfaceFloorplan', '0')) === '1' &&
            String(mxUtils.getValue(style, 'dftsFloorplanConnectable', '0')) === '1' &&
            String(mxUtils.getValue(style, 'dftsFloorplanEndpointKind', '')) === 'generatedInterface';
    }

    function generatedInterfaceTypeFlags(style) {
        var type = String(mxUtils.getValue(style, 'flowInterfaceType', '')).toUpperCase();
        return {
            isStart: type === 'HI' || type === 'SI',
            isTarget: type === 'HO' || type === 'SO'
        };
    }

    function normalizeGeneratedInterfaceFloorplanBody(graph, body) {
        if (!graph || !body) return false;
        var style = graph.getCellStyle(body);
        if (String(mxUtils.getValue(style, 'flowGeneratedInterfaceFloorplan', '0')) !== '1') return false;
        var flags = generatedInterfaceTypeFlags(style);
        var nextStyle = body.getStyle() || '';
        nextStyle = mxUtils.setStyle(nextStyle, 'floorplan', '1');
        nextStyle = mxUtils.setStyle(nextStyle, 'perimeter', 'floorplanAnyPoint');
        nextStyle = mxUtils.setStyle(nextStyle, 'dftsFloorplanConnectable', '1');
        nextStyle = mxUtils.setStyle(nextStyle, 'dftsFloorplanEndpointKind', 'generatedInterface');
        nextStyle = mxUtils.setStyle(nextStyle, 'dftsFloorplanLineStart', flags.isStart ? '1' : '0');
        nextStyle = mxUtils.setStyle(nextStyle, 'dftsFloorplanLineTarget', flags.isTarget ? '1' : '0');
        if (nextStyle !== body.getStyle()) {
            graph.getModel().setStyle(body, nextStyle);
        }
        return true;
    }

    function shouldBlockGeneratedInterfacePlainConnect(graph, body) {
        return !!(graph && body && isGeneratedInterfaceBody(graph, body) && !bodyHasLogicalFloorplanStart(graph, body));
    }

    function warnGeneratedInterfaceStartDirection(graph, body) {
        if (!graph || !body) return;
        var now = Date.now ? Date.now() : 0;
        if (graph.__dftsGeneratedInterfaceStartAlertAt && now && (now - graph.__dftsGeneratedInterfaceStartAlertAt) < 250) {
            return;
        }
        graph.__dftsGeneratedInterfaceStartAlertAt = now;
        if (typeof mxUtils !== 'undefined' && typeof mxUtils.alert === 'function') {
            mxUtils.alert('Floorplan line 需要从 HI/SI interface 开始绘制，HO/SO interface 只能作为终点。');
        }
    }

    function isFloorplanEndpointBody(graph, body) {
        return isDataSourceBody(graph, body) || isGeneratedInterfaceBody(graph, body);
    }

    function resolveFloorplanEndpointBody(graph, cell) {
        if (!graph || !cell) return null;
        if (isGeneratedInterfaceBody(graph, cell)) normalizeGeneratedInterfaceFloorplanBody(graph, cell);
        if (isFloorplanEndpointBody(graph, cell)) return cell;
        if (typeof NS.findChipBodyForCell === 'function') {
            var body = NS.findChipBodyForCell(graph, cell);
            if (isGeneratedInterfaceBody(graph, body)) normalizeGeneratedInterfaceFloorplanBody(graph, body);
            if (isFloorplanEndpointBody(graph, body)) return body;
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
        if (isGeneratedInterfaceBody(graph, body)) {
            var bodyStyle = graph.getCellStyle(body);
            var startValue = mxUtils.getValue(bodyStyle, 'dftsFloorplanLineStart', '');
            if (String(startValue) !== '') return String(startValue) === '1';
            return generatedInterfaceTypeFlags(bodyStyle).isStart;
        }
        if (isSymbolBody(body)) {
            var symbolPins = getSymbolPinModels(body);
            for (var i = 0; i < symbolPins.length; i++) {
                var pin = symbolPins[i] || {};
                if (isFloorplanStartDef(pin, pin.dir || 'input', pin.type || '')) return true;
            }
            if (symbolPins.length) return false;
        }

        var pins = NS.getChipPins(graph, body);
        for (var j = 0; j < pins.length; j++) {
            if (isFloorplanStartPin(graph, pins[j])) return true;
        }

        var defPins = getLogicalPinsFromDefinition(graph, body);
        for (var k = 0; k < defPins.length; k++) {
            var defPin = defPins[k] || {};
            if (isFloorplanStartDef(defPin, defPin.dir || 'input', defPin.type || '')) return true;
        }
        return false;
    }

    function bodyHasLogicalFloorplanTarget(graph, body) {
        if (!graph || !body) return false;
        if (isGeneratedInterfaceBody(graph, body)) {
            var bodyStyle = graph.getCellStyle(body);
            var targetValue = mxUtils.getValue(bodyStyle, 'dftsFloorplanLineTarget', '');
            if (String(targetValue) !== '') return String(targetValue) === '1';
            return generatedInterfaceTypeFlags(bodyStyle).isTarget;
        }
        if (isSymbolBody(body)) {
            var symbolPins = getSymbolPinModels(body);
            for (var i = 0; i < symbolPins.length; i++) {
                var pin = symbolPins[i] || {};
                if (isFloorplanTargetDef(pin, pin.dir || 'input', pin.type || '')) return true;
            }
            if (symbolPins.length) return false;
        }

        var pins = NS.getChipPins(graph, body);
        for (var j = 0; j < pins.length; j++) {
            if (isFloorplanTargetPin(graph, pins[j])) return true;
        }

        var defPins = getLogicalPinsFromDefinition(graph, body);
        for (var k = 0; k < defPins.length; k++) {
            var defPin = defPins[k] || {};
            if (isFloorplanTargetDef(defPin, defPin.dir || 'input', defPin.type || '')) return true;
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

        var constraintInfo = getPinConstraintInfo(graph, body, pin, side);
        if (constraintInfo && constraintInfo.constraint) {
            var connectionPoint = getAbsoluteConstraintPoint(graph, body, constraintInfo.constraint);
            if (connectionPoint) return connectionPoint;
        }

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

    function buildConstraintMeta(relPoint, meta) {
        if (!relPoint) return null;
        var constraint = new mxConnectionConstraint(new mxPoint(relPoint.x, relPoint.y), false);
        meta = meta || {};
        if (meta.pinKey) constraint.dftsPinKey = String(meta.pinKey);
        if (meta.side) constraint.dftsSide = String(meta.side);
        if (meta.anchorKind) constraint.dftsAnchorKind = String(meta.anchorKind);
        return constraint;
    }

    function getPinConstraintInfo(graph, body, pin, sideOverride) {
        if (!graph || !body || !pin || !pin.geometry || !body.geometry) return null;
        var pg = pin.geometry;
        var bg = body.geometry;
        var style = graph.getCellStyle(pin);
        var side = String(sideOverride || mxUtils.getValue(style, 'dftsIP_pin_location', mxUtils.getValue(style, 'dftsIP_symbolSide', 'east')) || 'east').toLowerCase();
        var relPoint = null;
        if (side === 'west') relPoint = new mxPoint(0, (Number(pg.y || 0) + Number(pg.height || 0) / 2) / Math.max(1, Number(bg.height || 1)));
        else if (side === 'east') relPoint = new mxPoint(1, (Number(pg.y || 0) + Number(pg.height || 0) / 2) / Math.max(1, Number(bg.height || 1)));
        else if (side === 'north') relPoint = new mxPoint((Number(pg.x || 0) + Number(pg.width || 0) / 2) / Math.max(1, Number(bg.width || 1)), 0);
        else relPoint = new mxPoint((Number(pg.x || 0) + Number(pg.width || 0) / 2) / Math.max(1, Number(bg.width || 1)), 1);
        var pinKey = mxUtils.getValue(style, 'dftsIP_pinKey', String(pin.__dftsSymbolKey || ''));
        return {
            pin: pin,
            pinKey: pinKey,
            side: side,
            relPoint: relPoint,
            constraint: buildConstraintMeta(relPoint, {
                pinKey: pinKey,
                side: side,
                anchorKind: 'pin'
            })
        };
    }

    function getAbsoluteConstraintPoint(graph, body, constraint) {
        if (!graph || !body || !constraint || !constraint.point) return null;
        try {
            if (graph.view && typeof graph.view.getState === 'function' && typeof graph.getConnectionPoint === 'function') {
                var state = graph.view.getState(body);
                if (state) {
                    var point = graph.getConnectionPoint(state, constraint, true);
                    if (point) {
                        var scale = Number(graph.view && graph.view.scale || 1) || 1;
                        var tr = graph.view && graph.view.translate ? graph.view.translate : { x: 0, y: 0 };
                        return new mxPoint(
                            (Number(point.x || 0) / scale) - Number(tr.x || 0),
                            (Number(point.y || 0) / scale) - Number(tr.y || 0)
                        );
                    }
                }
            }
        } catch (e) { }
        return getAbsolutePointOnBody(graph, body, constraint.point);
    }

    function collectGeneratedInterfaceAnchors(graph, body, mode) {
        if (!graph || !body) return [];
        var pins = [];
        if (mode === 'start') pins = getFloorplanStartPinsForBody(graph, body);
        else if (mode === 'target') pins = getFloorplanTargetPinsForBody(graph, body);
        else {
            var startPins = getFloorplanStartPinsForBody(graph, body);
            var targetPins = getFloorplanTargetPinsForBody(graph, body);
            var seenPins = {};
            for (var s = 0; s < startPins.length; s++) {
                var sid = startPins[s] && (startPins[s].id || mxObjectIdentity.get(startPins[s]));
                if (!sid || seenPins[sid]) continue;
                seenPins[sid] = true;
                pins.push(startPins[s]);
            }
            for (var t = 0; t < targetPins.length; t++) {
                var tid = targetPins[t] && (targetPins[t].id || mxObjectIdentity.get(targetPins[t]));
                if (!tid || seenPins[tid]) continue;
                seenPins[tid] = true;
                pins.push(targetPins[t]);
            }
        }

        if ((!pins || !pins.length) && isSymbolBody(body)) {
            pins = getSymbolPorts(body);
        }

        var out = [];
        for (var i = 0; i < pins.length; i++) {
            var info = getPinConstraintInfo(graph, body, pins[i]);
            if (!info || !info.constraint || !info.relPoint) continue;
            var point = getAbsoluteConstraintPoint(graph, body, info.constraint);
            if (!point) point = getPinExitPoint(graph, pins[i]);
            if (!point) continue;
            out.push({
                pin: pins[i],
                pinKey: info.pinKey,
                side: info.side,
                point: point,
                relPoint: info.relPoint,
                constraint: info.constraint,
                kind: 'pin'
            });
        }
        return out;
    }

    function collectBodyPointAnchors(graph, body) {
        var relPoints = getBodyConnectionPoints();
        var out = [];
        for (var i = 0; i < relPoints.length; i++) {
            var relPoint = relPoints[i];
            out.push({
                point: getAbsolutePointOnBody(graph, body, relPoint),
                relPoint: relPoint,
                constraint: buildConstraintMeta(relPoint, { anchorKind: 'body' }),
                kind: 'body'
            });
        }
        return out;
    }

    function getFloorplanAnchorsForBody(graph, body, mode) {
        if (!graph || !body) return [];
        if (isGeneratedInterfaceBody(graph, body)) {
            var generated = collectGeneratedInterfaceAnchors(graph, body, mode || 'any');
            if (generated.length) return generated;
        }
        return collectBodyPointAnchors(graph, body);
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
        if (!graph || !edge || !body || !point) return;
        anchorSide = anchorSide || 'source';

        var bg = getBodyGraphBounds(graph, body);
        if (!bg) return;
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
        var bounds = getBodyGraphBounds(graph, body);
        if (!bounds) return null;
        if (isNaN(rx) || isNaN(ry)) return null;
        return new mxPoint(
            bounds.x + bounds.width * rx,
            bounds.y + bounds.height * ry
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

    function getGeneratedInterfaceConnectionPoints(graph, body) {
        var anchors = getFloorplanAnchorsForBody(graph, body, 'any');
        var out = [];
        for (var i = 0; i < anchors.length; i++) {
            if (anchors[i] && anchors[i].relPoint) out.push(anchors[i].relPoint);
        }
        return out.length ? out : getBodyConnectionPoints();
    }

    function getFloorplanConnectionPointsForBody(graph, body) {
        return isGeneratedInterfaceBody(graph, body)
            ? getGeneratedInterfaceConnectionPoints(graph, body)
            : getBodyConnectionPoints();
    }

    function getBodyGraphBounds(graph, body) {
        if (!graph || !body) return null;
        var model = graph.getModel ? graph.getModel() : null;
        var geo = model && typeof model.getGeometry === 'function' ? model.getGeometry(body) : body.geometry;
        if (!geo) return null;

        var x = Number(geo.x || 0);
        var y = Number(geo.y || 0);
        var width = Number(geo.width || 0);
        var height = Number(geo.height || 0);
        var current = body;

        while (model && current) {
            var parent = model.getParent(current);
            if (!parent) break;
            var parentGeo = model.getGeometry(parent);
            if (parentGeo) {
                x += Number(parentGeo.x || 0);
                y += Number(parentGeo.y || 0);
            }
            current = parent;
        }

        return { x: x, y: y, width: width, height: height };
    }

    function getAbsolutePointOnBody(graph, body, relPt) {
        var bounds = getBodyGraphBounds(graph, body);
        if (!bounds || !relPt) return null;
        return new mxPoint(
            bounds.x + bounds.width * relPt.x,
            bounds.y + bounds.height * relPt.y
        );
    }

    function isPointInsideBody(graph, body, pt, padding) {
        var geo = getBodyGraphBounds(graph, body);
        if (!geo || !pt) return false;
        padding = Number(padding) || 0;
        return pt.x >= geo.x - padding &&
            pt.x <= geo.x + geo.width + padding &&
            pt.y >= geo.y - padding &&
            pt.y <= geo.y + geo.height + padding;
    }

    function findNearestBodyConnectionPoint(graph, body, pt) {
        if (!graph || !body || !pt) return null;
        var anchors = getFloorplanAnchorsForBody(graph, body, isGeneratedInterfaceBody(graph, body) ? 'start' : 'any');
        var best = null;
        var bestDist = Infinity;
        for (var i = 0; i < anchors.length; i++) {
            var absPt = anchors[i] && anchors[i].point ? anchors[i].point : null;
            if (!absPt) continue;
            var dx = absPt.x - pt.x;
            var dy = absPt.y - pt.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < bestDist) {
                best = {
                    point: absPt,
                    relPoint: anchors[i].relPoint,
                    constraint: anchors[i].constraint || null,
                    pin: anchors[i].pin || null,
                    pinKey: anchors[i].pinKey || '',
                    kind: anchors[i].kind || 'body',
                    distance: dist
                };
                bestDist = dist;
            }
        }
        return best;
    }

    function projectPointToBodyPerimeter(graph, body, pt) {
        var bounds = getBodyGraphBounds(graph, body);
        if (!bounds || !pt) return null;

        var minX = bounds.x;
        var minY = bounds.y;
        var maxX = bounds.x + bounds.width;
        var maxY = bounds.y + bounds.height;
        var clampedX = Math.max(minX, Math.min(maxX, pt.x));
        var clampedY = Math.max(minY, Math.min(maxY, pt.y));
        var candidates = [
            new mxPoint(minX, clampedY),
            new mxPoint(maxX, clampedY),
            new mxPoint(clampedX, minY),
            new mxPoint(clampedX, maxY)
        ];
        var best = null;
        var bestDist = Infinity;

        for (var i = 0; i < candidates.length; i++) {
            var candidate = candidates[i];
            var dx = candidate.x - pt.x;
            var dy = candidate.y - pt.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < bestDist) {
                bestDist = dist;
                best = candidate;
            }
        }

        if (!best) return null;

        return {
            point: best,
            relPoint: new mxPoint(
                bounds.width ? ((best.x - bounds.x) / bounds.width) : 0.5,
                bounds.height ? ((best.y - bounds.y) / bounds.height) : 0.5
            ),
            distance: bestDist
        };
    }

    function resolveGeneratedInterfaceStartPoint(graph, body, pt) {
        if (!graph || !body) return null;
        var anchors = getFloorplanAnchorsForBody(graph, body, 'start');
        if (anchors.length) {
            var refPt = pt;
            if (!refPt) {
                var bounds = getBodyGraphBounds(graph, body);
                if (bounds) refPt = new mxPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
            }
            if (refPt) {
                var best = null;
                var bestDist = Infinity;
                for (var i = 0; i < anchors.length; i++) {
                    var dx = anchors[i].point.x - refPt.x;
                    var dy = anchors[i].point.y - refPt.y;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < bestDist) {
                        best = anchors[i];
                        bestDist = dist;
                    }
                }
                if (best) {
                    return {
                        point: best.point,
                        relPoint: best.relPoint,
                        constraint: best.constraint || null,
                        pin: best.pin || null,
                        pinKey: best.pinKey || '',
                        distance: bestDist
                    };
                }
            }
        }
        var refPt = pt;
        if (!refPt) {
            var bounds = getBodyGraphBounds(graph, body);
            if (bounds) refPt = new mxPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        }
        var nearest = refPt ? projectPointToBodyPerimeter(graph, body, refPt) : null;
        return nearest && nearest.point ? nearest : null;
    }

    function getAllFloorplanEndpointBodies(graph) {
        var bodies = NS.getAllChipBodies ? NS.getAllChipBodies(graph) : [];
        var out = [];
        for (var i = 0; i < bodies.length; i++) {
            if (isFloorplanEndpointBody(graph, bodies[i])) out.push(bodies[i]);
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
        return isFloorplanEndpointBody(graph, body) && bodyHasLogicalFloorplanStart(graph, body);
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
        var bodies = getAllFloorplanEndpointBodies(graph);
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
        var bodies = getAllFloorplanEndpointBodies(graph);
        var best = null;
        var bestDist = Infinity;

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];
            if (!bodyHasLogicalFloorplanTarget(graph, body)) continue;
            if (isGeneratedInterfaceBody(graph, body)) {
                var generatedAnchors = getFloorplanAnchorsForBody(graph, body, 'target');
                if (!generatedAnchors.length) continue;
                var projected = null;
                for (var ga = 0; ga < generatedAnchors.length; ga++) {
                    var anchor = generatedAnchors[ga];
                    if (!anchor || !anchor.point) continue;
                    var gdx = anchor.point.x - pt.x;
                    var gdy = anchor.point.y - pt.y;
                    var gdist = Math.sqrt(gdx * gdx + gdy * gdy);
                    if (!projected || gdist < projected.distance) {
                        projected = {
                            point: anchor.point,
                            relPoint: anchor.relPoint,
                            pin: anchor.pin || null,
                            pinKey: anchor.pinKey || '',
                            distance: gdist
                        };
                    }
                }
                if (!projected || !projected.point) continue;
                if (isPointInsideBody(graph, body, pt, 0)) {
                    return {
                        body: body,
                        point: projected.point,
                        relPoint: projected.relPoint,
                        pin: projected.pin || null,
                        pinKey: projected.pinKey || '',
                        distance: 0
                    };
                }
                if (projected.distance <= maxDist && projected.distance < bestDist) {
                    best = {
                        body: body,
                        point: projected.point,
                        relPoint: projected.relPoint,
                        pin: projected.pin || null,
                        pinKey: projected.pinKey || ''
                    };
                    bestDist = projected.distance;
                }
                continue;
            }
            var points = getFloorplanConnectionPointsForBody(graph, body);
            for (var j = 0; j < points.length; j++) {
                var absPt = getAbsolutePointOnBody(graph, body, points[j]);
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
        if (!graph || !body || !isFloorplanEndpointBody(graph, body)) return null;

        var canStart = bodyHasLogicalFloorplanStart(graph, body);
        var canTarget = bodyHasLogicalFloorplanTarget(graph, body);
        if (!canStart && !canTarget) return null;
        var mode = canStart && canTarget ? 'any' : (canStart ? 'start' : 'target');
        var anchors = getFloorplanAnchorsForBody(graph, body, mode);
        var out = [];
        for (var i = 0; i < anchors.length; i++) {
            var c = anchors[i] && anchors[i].constraint ? anchors[i].constraint : null;
            if (c && c.point) out.push(c);
        }

        debugLog('constraints', body.id || (body.getId && body.getId()), out.map(function (c) {
            return {
                x: c.point && c.point.x,
                y: c.point && c.point.y,
                pinKey: c.dftsPinKey || ''
            };
        }));
        return out.length ? out : null;
    }

    function startFloorplanLineFromPin(realUi, graph, pin) {
        if (!canStartEndpointLineInCurrentLayer(graph, pin)) return null;
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
            snapPoint: function (basePt, snapCtx) {
                var probePt = (snapCtx && snapCtx.rawPoint) ? snapCtx.rawPoint : basePt;
                var hit = findNearestFloorplanTargetPin(graph, body, probePt, 24);
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

    function startFloorplanLineFromBody(realUi, graph, body, startPt, opts) {
        if (!canStartEndpointLineInCurrentLayer(graph, body)) return null;
        var lineNS = getLineNS();
        if (!lineNS || typeof realUi.startFloorplanLineFromPoint !== 'function') {
            if (typeof mxUtils !== 'undefined' && mxUtils.alert) {
                mxUtils.alert('请先加载 dft_floorplan_line.js，再使用 Data Source 的 body 连接点绘制 Floorplan Line。');
            }
            return null;
        }
        if (!body || !startPt) return null;
        opts = opts || {};

        var pt = startPt;
        if (!pt) return null;
        debugLog('startFromBody', body.id || (body.getId && body.getId()), pt.x, pt.y);

        return realUi.startFloorplanLineFromPoint(pt, {
            commitOnMouseUp: true,
            autoFinishOnMouseUp: true,
            decorateEdge: function (edge, g) {
                if (opts.sourcePin) attachFloorplanLineAnchor(g, edge, opts.sourcePin, 'source');
                else attachFloorplanLineBodyPointAnchor(g, edge, body, pt, 'source');
                detachFloorplanLineAnchor(g, edge, 'target');
            },
            snapPoint: function (basePt, snapCtx) {
                var probePt = (snapCtx && snapCtx.rawPoint) ? snapCtx.rawPoint : basePt;
                var hit = findNearestGlobalFloorplanTargetBodyPoint(graph, probePt, 24);
                debugLog('snapTarget', probePt && probePt.x, probePt && probePt.y, hit ? {
                    body: hit.body && (hit.body.id || (hit.body.getId && hit.body.getId())),
                    x: hit.point && hit.point.x,
                    y: hit.point && hit.point.y,
                    distance: hit.distance
                } : null);
                if (!hit || !hit.point) return null;
                return {
                    point: hit.point,
                    meta: {
                        kind: 'floorplanTargetBodyPoint',
                        body: hit.body,
                        pin: hit.pin || null,
                        point: hit.point,
                        distance: hit.distance
                    }
                };
            },
            afterCommitPoint: function (ctx) {
                var edge = ctx && ctx.tool ? ctx.tool.edge : null;
                if (!edge) return;
                if (ctx.snap && ctx.snap.pin) attachFloorplanLineAnchor(graph, edge, ctx.snap.pin, 'target');
                else if (ctx.snap && ctx.snap.body && ctx.snap.point) attachFloorplanLineBodyPointAnchor(graph, edge, ctx.snap.body, ctx.snap.point, 'target');
                else detachFloorplanLineAnchor(graph, edge, 'target');
                syncAnchoredFloorplanLine(graph, edge);
            }
        });
    }

    function startFloorplanLineFromConstraint(realUi, graph, body, constraint, mousePt) {
        if (!body) return false;
        if (!canStartEndpointLineInCurrentLayer(graph, body)) return false;
        debugLog('startFromConstraint', body && (body.id || body.getId && body.getId()), {
            x: constraint && constraint.point ? constraint.point.x : null,
            y: constraint && constraint.point ? constraint.point.y : null
        });
        if (!bodyHasLogicalFloorplanStart(graph, body)) return false;
        var pt = null;
        var sourcePin = null;
        if (constraint && constraint.point) {
            pt = getAbsoluteConstraintPoint(graph, body, constraint);
            var constraintPinKey = constraint.dftsPinKey || constraint.pinKey || '';
            if (constraintPinKey) sourcePin = findPinByKey(graph, body, constraintPinKey);
        } else if (isGeneratedInterfaceBody(graph, body)) {
            var projected = resolveGeneratedInterfaceStartPoint(graph, body, mousePt);
            pt = projected && projected.point ? projected.point : null;
            sourcePin = projected && projected.pin ? projected.pin : null;
        } else {
            return false;
        }
        if (!pt) return false;
        return !!startFloorplanLineFromBody(realUi, graph, body, pt, { sourcePin: sourcePin });
    }

    function getMouseGraphPoint(graph, me, cell) {
        var pt = me && me.getGraphX && me.getGraphY ? new mxPoint(me.getGraphX(), me.getGraphY()) : null;
        if (pt) return pt;
        if (me && typeof me.getX === 'function' && typeof me.getY === 'function') {
            return new mxPoint(me.getX(), me.getY());
        }
        var bounds = getBodyGraphBounds(graph, cell);
        return bounds ? new mxPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2) : null;
    }

    function installDataSourceFloorplanBridge(ui) {
        var realUi = normalizeUi(ui);
        var graph = realUi && realUi.editor ? realUi.editor.graph : null;
        if (!graph || graph._dftsDataSourceFloorplanBridgeInstalled) return;
        graph._dftsDataSourceFloorplanBridgeInstalled = true;

        if (NS.getAllChipBodies) {
            var existingBodies = NS.getAllChipBodies(graph) || [];
            for (var eb = 0; eb < existingBodies.length; eb++) {
                if (isGeneratedInterfaceBody(graph, existingBodies[eb])) {
                    normalizeGeneratedInterfaceFloorplanBody(graph, existingBodies[eb]);
                }
            }
        }

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
            var oldMouseMove = ch.mouseMove;
            var oldMouseUp = ch.mouseUp;
            var oldStart = ch.start;
            var oldConnect = ch.connect;
            var oldInsertEdge = ch.insertEdge;

            function getCurrentFloorplanConstraint() {
                var cur = ch.constraintHandler ? ch.constraintHandler.currentConstraint : null;
                return (cur && cur.point) ? cur : null;
            }

            function hasExplicitFloorplanBodyConstraint(body) {
                return !!(body && getCurrentFloorplanConstraint());
            }

            function tryStartFloorplanFromCell(me, cell) {
                var body = resolveFloorplanEndpointBody(graph, cell);
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
                    var cur = getCurrentFloorplanConstraint();
                    var mousePt = getMouseGraphPoint(graph, me, body);
                    debugLog('currentConstraint', cur ? {
                        x: cur.point && cur.point.x,
                        y: cur.point && cur.point.y
                    } : null, mousePt ? { mouseX: mousePt.x, mouseY: mousePt.y } : null);
                    if (!cur) return false;
                    return startFloorplanLineFromConstraint(realUi, graph, body, cur, mousePt);
                }

                if (shouldBlockGeneratedInterfacePlainConnect(graph, body) && hasExplicitFloorplanBodyConstraint(body)) {
                    warnGeneratedInterfaceStartDirection(graph, body);
                    return true;
                }

                return false;
            }

            ch.mouseDown = function (sender, me) {
                var evt = me && me.getEvent ? me.getEvent() : null;
                var state = me && me.getState ? me.getState() : null;
                var cell = state && state.cell ? state.cell : (me && me.getCell ? me.getCell() : null);
                var body = resolveFloorplanEndpointBody(graph, cell);
                debugLog('mouseDown', {
                    cell: cell && (cell.id || (cell.getId && cell.getId())),
                    resolvedBody: body && (body.id || (body.getId && body.getId())),
                    graphX: me && me.getGraphX ? me.getGraphX() : null,
                    graphY: me && me.getGraphY ? me.getGraphY() : null,
                    hasState: !!state
                });

                var canStartFromPin = isFloorplanStartPin(graph, cell);
                var canStartFromBody = body && isFloorplanStartBody(graph, body) && hasExplicitFloorplanBodyConstraint(body);
                var shouldWarnBlockedBody = shouldBlockGeneratedInterfacePlainConnect(graph, body) && hasExplicitFloorplanBodyConstraint(body);
                if (evt && mxEvent.isLeftMouseButton(evt) &&
                    (canStartFromPin || canStartFromBody || shouldWarnBlockedBody)) {
                    this.__dftsPendingFloorplanStart = {
                        cell: cell,
                        body: body,
                        x: me && me.getGraphX ? Number(me.getGraphX()) : null,
                        y: me && me.getGraphY ? Number(me.getGraphY()) : null
                    };
                } else {
                    this.__dftsPendingFloorplanStart = null;
                }

                return oldMouseDown.apply(this, arguments);
            };

            ch.mouseMove = function (sender, me) {
                var pending = this.__dftsPendingFloorplanStart || null;
                if (pending && me) {
                    var gx = me.getGraphX ? Number(me.getGraphX()) : null;
                    var gy = me.getGraphY ? Number(me.getGraphY()) : null;
                    if (gx != null && gy != null && pending.x != null && pending.y != null) {
                        var dx = gx - pending.x;
                        var dy = gy - pending.y;
                        var tol = graph && typeof graph.tolerance === 'number' ? Math.max(2, Number(graph.tolerance)) : 4;
                        var moved = Math.sqrt(dx * dx + dy * dy) > tol;
                        if (moved) {
                            var evt = me.getEvent ? me.getEvent() : null;
                            if (tryStartFloorplanFromCell(me, pending.cell)) {
                                this.__dftsPendingFloorplanStart = null;
                                this.__dftsSuppressNextInsertEdge = true;
                                try {
                                    this.reset();
                                } catch (e) { }
                                if (graph.graphHandler && typeof graph.graphHandler.reset === 'function') {
                                    try {
                                        graph.graphHandler.reset();
                                    } catch (e2) { }
                                }
                                if (me && typeof me.consume === 'function') me.consume();
                                if (evt) mxEvent.consume(evt);
                                return;
                            }
                            this.__dftsPendingFloorplanStart = null;
                        }
                    }
                }
                return oldMouseMove.apply(this, arguments);
            };

            ch.mouseUp = function () {
                this.__dftsPendingFloorplanStart = null;
                return oldMouseUp.apply(this, arguments);
            };

            ch.start = function (state, x, y, edgeState) {
                var cell = state && state.cell ? state.cell : null;
                var body = resolveFloorplanEndpointBody(graph, cell);
                debugLog('connectionStart', {
                    cell: cell && (cell.id || (cell.getId && cell.getId())),
                    resolvedBody: body && (body.id || (body.getId && body.getId())),
                    x: x,
                    y: y
                });
                var cur = getCurrentFloorplanConstraint();
                var canStartFromPin = isFloorplanStartPin(graph, cell);
                var canStartFromBody = body && isFloorplanStartBody(graph, body) && !!cur;
                var shouldWarnBlockedBody = shouldBlockGeneratedInterfacePlainConnect(graph, body) && !!cur;
                if (cell && (canStartFromPin || canStartFromBody || shouldWarnBlockedBody)) {
                    this.__dftsSuppressNextInsertEdge = true;
                    if (shouldWarnBlockedBody && !canStartFromPin) {
                        warnGeneratedInterfaceStartDirection(graph, body);
                        try {
                            this.reset();
                        } catch (e) { }
                        return;
                    }
                    if (canStartFromPin) {
                        startFloorplanLineFromPin(realUi, graph, cell);
                    } else {
                        var mousePt = new mxPoint(Number(x || 0), Number(y || 0));
                        if (!startFloorplanLineFromConstraint(realUi, graph, body, cur, mousePt)) {
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
                if (!isFloorplanEndpointBody(graph, body)) continue;
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

    // registerDataSource({
    //     key: 'PatternDataSource',
    //     dftsType: 'pattern_data_source',
    //     defaultLabel: 'PatternDataSource',
    //     instanceBaseName: 'PatternDataSource',
    //     configKey: 'data_source_common',
    //     w: 320,
    //     h: 120,
    //     rounded: 8,
    //     strokeWidth: 1,
    //     bodyFont: 20,
    //     pinFont: 16,
    //     pinsFactory: staticPins({
    //         east: [
    //             { name: 'pattern_data_out', type: 'data_out', dir: 'output', pinKey: 'pattern_data_out', busWidth: 8, isBus: true, floorplanLineTarget: true },
    //             { name: 'pattern_valid', type: 'status_out', dir: 'output', pinKey: 'pattern_valid' }
    //         ]
    //     })
    // });

    registerDataSource({
        key: 'MuxDataSource',
        dftsType: 'mux_data_source',
        defaultLabel: 'MUX',
        instanceBaseName: 'MUX',
        configKey: 'data_source_common',
        useDefSize: true,
        w: 180,
        h: 120,
        rounded: 0,
        strokeWidth: 1,
        bodyFont: 20,
        pinFont: 16,
        buildSymbolModel: function (graph, def, runtimeOpt, model) {
            var next = clone(model || {});
            next.bodyShape = 'trapezoid';
            next.bodyExtraStyle = 'direction=east;';
            return next;
        },
        afterCreate: function (graph, body) {
            syncMuxDataSourceDecoration(graph, body);
        },
        pinsFactory: staticPins({
            west: [
                { name: 'I0', type: 'data_in', dir: 'input', pinKey: 'i0' },
                { name: 'I1', type: 'data_in', dir: 'input', pinKey: 'i1' }
            ],
            north: [
                { name: 'Q', type: 'data_out', dir: 'output', pinKey: 'q', floorplanLineTarget: true }
            ]
        })
    });

    registerDataSource({
        key: 'SSNPadSource',
        dftsType: 'ssn_data_source',
        defaultLabel: 'PadSource',
        instanceBaseName: 'PadSource',
        configKey: 'data_source_common',
        useDefSize: true,
        w: 140, h: 120,
        rounded: 8,
        strokeWidth: 1,
        bodyFont: 20,
        pinFont: 16,
        pinsFactory: staticPins({
            east: [
                { name: 'ssn_data_out', type: 'data_out', dir: 'output', pinKey: 'ssn_data_out', busWidth: 8, isBus: true, floorplanLineTarget: true },
                { name: 'ssn_data_in', type: 'data_in', dir: 'input', pinKey: 'ssn_data_in' },
                { name: 'ssn_bus_clock', type: 'data_out', dir: 'input', pinKey: 'ssn_bus_clock' }
            ]
        })
    });
    registerDataSource({
        key: 'TapSource',
        dftsType: 'bscan_data_source',
        defaultLabel: 'TapSource',
        instanceBaseName: 'TapSource',
        configKey: 'data_source_common',
        useDefSize: true,
        w: 140, h: 120,
        rounded: 8,
        strokeWidth: 1,
        bodyFont: 20,
        pinFont: 16,
        pinsFactory: staticPins({
            east: [
                { name: 'bscan_data_out', type: 'data_out', dir: 'output', pinKey: 'bscan_data_out', busWidth: 8, isBus: true, floorplanLineTarget: true },
                { name: 'bscan_data_in', type: 'data_in', dir: 'input', pinKey: 'bscan_data_in' },
                { name: 'bscan_bus_clock', type: 'data_out', dir: 'input', pinKey: 'bscan_bus_clock' }
            ]
        })
    });
    registerDataSource({
        key: 'BISRCSource',
        dftsType: 'bisrc_data_source',
        defaultLabel: 'BISRCSource',
        instanceBaseName: 'BISRCSource',
        configKey: 'data_source_common',
        useDefSize: true,
        w: 140, h: 120,
        rounded: 8,
        strokeWidth: 1,
        bodyFont: 20,
        pinFont: 16,
        pinsFactory: staticPins({
            west: [
            ],
            east: [
                { name: 'bisrc_data_out', type: 'data_out', dir: 'output', pinKey: 'bisrc_data_out', busWidth: 8, isBus: true, floorplanLineTarget: true },
                { name: 'bisrc_data_in', type: 'data_in', dir: 'input', pinKey: 'bisrc_data_in' },
                { name: 'bisrc_bus_clock', type: 'data_out', dir: 'input', pinKey: 'bisrc_bus_clock' }
            ]
        })
    });
    // registerDataSource({
    //     key: 'ExternalDataSource',
    //     dftsType: 'external_data_source',
    //     defaultLabel: 'ExternalDataSource',
    //     instanceBaseName: 'ExternalDataSource',
    //     configKey: 'data_source_common',
    //     w: 320,
    //     h: 120,
    //     rounded: 8,
    //     strokeWidth: 1,
    //     bodyFont: 20,
    //     pinFont: 16,
    //     pinsFactory: staticPins({
    //         west: [
    //             { name: 'enable', type: 'enable_in', dir: 'input', pinKey: 'enable' }
    //         ],
    //         east: [
    //             { name: 'data_out', type: 'data_out', dir: 'output', pinKey: 'data_out', busWidth: 16, isBus: true, floorplanLineTarget: true },
    //             { name: 'status', type: 'status_out', dir: 'output', pinKey: 'status' }
    //         ]
    //     })
    // });

    // global.buildPatternDataSource = NS.makeCreateFn('PatternDataSource');
    global.buildMuxDataSource = NS.makeCreateFn('MuxDataSource');
    global.buildSSNDataSource = NS.makeCreateFn('SSNPadSource');
    // global.buildExternalDataSource = NS.makeCreateFn('ExternalDataSource');

    NS.getPinExitPoint = getPinExitPoint;
    NS.attachFloorplanLineAnchor = attachFloorplanLineAnchor;
    NS.detachFloorplanLineAnchor = detachFloorplanLineAnchor;
    NS.syncAnchoredFloorplanLine = syncAnchoredFloorplanLine;
    NS.syncAnchoredFloorplanLinesForBody = syncAnchoredFloorplanLinesForBody;
    NS.installDataSourceFloorplanBridge = installDataSourceFloorplanBridge;
    NS.getDataSourceConnectionConstraints = buildDataSourceConnectionConstraints;

    NS.installDataSourceIp = function (ui) {
        var realUi = normalizeUi(ui);
        if (realUi && realUi.editor && realUi.editor.graph) {
            var graph = realUi.editor.graph;
            NS.ensureGraphPatches(graph);
            if (!graph.__dftsMuxDataSourceDecorationSyncInstalled) {
                graph.__dftsMuxDataSourceDecorationSyncInstalled = true;
                graph.addListener(mxEvent.CELLS_RESIZED, function (sender, evt) {
                    syncMuxDataSourceDecorations(evt.getProperty('cells') || [], graph);
                });
                graph.addListener(mxEvent.CELLS_MOVED, function (sender, evt) {
                    syncMuxDataSourceDecorations(evt.getProperty('cells') || [], graph);
                });
                syncMuxDataSourceDecorations(NS.getAllChipBodies ? NS.getAllChipBodies(graph) : [], graph);
            }
        }
        NS.installEditingPolicy(ui);
        NS.installInstanceFollow(ui);
        NS.installConfigAction(ui);
        installDataSourceFloorplanBridge(ui);
        if (typeof NS.installIpEdgeConfig === 'function') NS.installIpEdgeConfig(ui);
    };

})(this);
