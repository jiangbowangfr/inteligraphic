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


    function isFloorplanStartDef(cfg, pinDir, pinType) {
        return !!(cfg && cfg.floorplanLineStart) || (pinDir === 'input' && pinType === 'data_in');
    }

    function isFloorplanTargetDef(cfg, pinDir, pinType) {
        return !!(cfg && cfg.floorplanLineTarget) || (pinDir === 'output' && pinType === 'data_out');
    }

    function markDataSourceAsFloorplan(graph, body, def, runtimeOpt, ctx) {
        if (!body) return;
        var lineNS = getLineNS();
        if (lineNS && lineNS.ensurePerimeterRegistered) lineNS.ensurePerimeterRegistered();

        var model = graph.getModel();
        var bodyStyle = body.getStyle() || '';
        bodyStyle = mxUtils.setStyle(bodyStyle, 'floorplan', '1');
        bodyStyle = mxUtils.setStyle(bodyStyle, 'perimeter', 'floorplanAnyPoint');
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


    function detachFloorplanLineAnchor(graph, edge, anchorSide) {
        if (!graph || !edge) return;
        anchorSide = anchorSide || 'target';
        var style = edge.getStyle() || '';
        style = mxUtils.setStyle(style, 'dftFloorplanAnchor_' + anchorSide, '0');
        style = mxUtils.setStyle(style, 'dftFloorplanAnchor_' + anchorSide + '_bodyId', '');
        style = mxUtils.setStyle(style, 'dftFloorplanAnchor_' + anchorSide + '_pinKey', '');
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
        if (!sourcePin && !targetPin) return;

        var geo = graph.getCellGeometry(edge);
        if (!geo) return;

        var lineNS = getLineNS();
        var nextGeo = lineNS && lineNS.cloneLineGeometry ? lineNS.cloneLineGeometry(geo) : geo.clone();

        if (sourcePin) {
            var spt = getPinExitPoint(graph, sourcePin);
            if (spt) nextGeo.sourcePoint = spt;
        }

        if (targetPin) {
            var tpt = getPinExitPoint(graph, targetPin);
            if (tpt) nextGeo.targetPoint = tpt;
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
        var pins = isSymbolBody(body) ? getSymbolPorts(body) : NS.getChipPins(graph, body);
        var out = [];
        for (var i = 0; i < pins.length; i++) {
            if (isFloorplanTargetPin(graph, pins[i])) out.push(pins[i]);
        }
        return out;
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
            var oldStart = ch.start;

            ch.start = function (state, x, y, edgeState) {
                var cell = state && state.cell ? state.cell : null;

                if (isFloorplanStartPin(graph, cell)) {
                    // 从绿色连接点开始拖时，直接切到自定义 floorplan tool
                    startFloorplanLineFromPin(realUi, graph, cell);

                    // 清掉默认 connectionHandler 状态，避免黑色预览线
                    try {
                        this.reset();
                    } catch (e) { }

                    return;
                }

                return oldStart.apply(this, arguments);
            };
        }

        if (realUi.actions && !realUi._dftsDataSourceActionsInstalled) {
            realUi._dftsDataSourceActionsInstalled = true;
            realUi.actions.addAction('startSelectedDataSourceFloorplanLine', function () {
                var pin = graph.getSelectionCell();
                if (!isFloorplanStartPin(graph, pin)) {
                    if (typeof mxUtils !== 'undefined' && mxUtils.alert) mxUtils.alert('请先选中一个支持 Floorplan Line 的 Data Source data_in pin。');
                    return;
                }
                startFloorplanLineFromPin(realUi, graph, pin);
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

    NS.installDataSourceIp = function (ui) {
        var realUi = normalizeUi(ui);
        if (realUi && realUi.editor && realUi.editor.graph) NS.ensureGraphPatches(realUi.editor.graph);
        NS.installEditingPolicy(ui);
        NS.installInstanceFollow(ui);
        NS.installConfigAction(ui);
        installDataSourceFloorplanBridge(ui);
    };

})(this);
