(function (global) {
    'use strict';

    var TAG = '[DftsDSFloorplanDebug]';
    var NS = global.DftsIP;
    if (!NS) {
        console.error(TAG, 'DftsIP 不存在，请先加载 dftartist_common.js / dftartist_datasource.js');
        return;
    }

    function log() {
        if (typeof console !== 'undefined' && console.log) {
            var args = Array.prototype.slice.call(arguments);
            args.unshift(TAG);
            console.log.apply(console, args);
        }
    }

    function warn() {
        if (typeof console !== 'undefined' && console.warn) {
            var args = Array.prototype.slice.call(arguments);
            args.unshift(TAG);
            console.warn.apply(console, args);
        }
    }

    function error() {
        if (typeof console !== 'undefined' && console.error) {
            var args = Array.prototype.slice.call(arguments);
            args.unshift(TAG);
            console.error.apply(console, args);
        }
    }

    function normalizeUi(ui) {
        if (!ui) return null;
        if (ui.editor && ui.editor.graph) return ui;
        if (ui.editorUi && ui.editorUi.editor && ui.editorUi.editor.graph) return ui.editorUi;
        return null;
    }

    function guessUi() {
        if (global.editorUi && global.editorUi.editor && global.editorUi.editor.graph) return global.editorUi;
        if (global.ui && global.ui.editor && global.ui.editor.graph) return global.ui;
        return null;
    }

    function styleValue(styleObj, key, fallback) {
        try {
            return mxUtils.getValue(styleObj || {}, key, fallback);
        } catch (e) {
            return fallback;
        }
    }

    function normalizeTerminalCell(x) {
        if (!x) return null;
        if (x.cell) return x.cell; // mxCellState
        return x; // mxCell
    }

    function isPinCell(graph, cell) {
        if (!graph || !cell) return false;

        try {
            if (NS.isPinCell && NS.isPinCell(graph, cell)) return true;
        } catch (e) { }

        try {
            var s = graph.getCellStyle(cell);
            var flag = styleValue(s, 'dftsIP_pin', styleValue(s, 'pin', '0'));
            var pinType = styleValue(s, 'dftsIP_pinType', '');
            var pinKey = styleValue(s, 'dftsIP_pinKey', '');
            return String(flag) === '1' || !!pinType || !!pinKey;
        } catch (e2) {
            return false;
        }
    }

    function isDataSourceBody(graph, cell) {
        if (!graph || !cell || !cell.vertex) return false;

        var style = graph.getCellStyle(cell);
        var category = String(styleValue(style, 'dftsIP_category', '')).toLowerCase();
        if (category === 'datasource' || category === 'data_source') return true;

        var dftsType = String(styleValue(style, 'dftsIP_type', ''));
        if (!dftsType) return false;
        return dftsType === 'pattern_data_source' ||
            dftsType === 'external_data_source' ||
            dftsType === 'ssn_data_source' ||
            /data_source/i.test(dftsType);
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
        var ports = getSymbolPorts(body);
        for (var i = 0; i < ports.length; i++) {
            if (String(ports[i].__dftsSymbolKey || '') === String(pinKey || '')) return ports[i];
        }
        return null;
    }

    function getSymbolModelPins(body) {
        try {
            if (NS.Symbol && typeof NS.Symbol.getModel === 'function') {
                var model = NS.Symbol.getModel(body) || {};
                return Array.isArray(model.pins) ? model.pins : [];
            }
        } catch (e) { }
        return [];
    }

    function isFloorplanStartModelPin(pin) {
        if (!pin) return false;
        if (pin.floorplanLineStart === true) return true;
        return String(pin.dir || 'input') === 'output' && String(pin.type || '') === 'data_out';
    }

    function getFloorplanStartAnchorCell(graph, cell) {
        if (!graph || !cell) return null;
        if (isPinCell(graph, cell)) return cell;
        if (!isDataSourceBody(graph, cell)) return null;

        var pins = getSymbolModelPins(cell);
        for (var i = 0; i < pins.length; i++) {
            var pin = pins[i] || {};
            if (!isFloorplanStartModelPin(pin)) continue;
            var port = getSymbolPortByKey(cell, pin.key);
            if (port) return port;
        }
        return null;
    }

    function getFloorplanStartPoint(graph, cell) {
        var anchor = getFloorplanStartAnchorCell(graph, cell);
        return anchor ? getPinExitPoint(graph, anchor) : null;
    }

    function shouldUseFloorplanLine(graph, pin) {
        if (isDataSourceBody(graph, pin)) {
            var startAnchor = getFloorplanStartAnchorCell(graph, pin);
            var bodyResult = !!startAnchor;
            if (bodyResult) {
                log('body 命中 floorplan 输出规则', pin.id || '(no id)', 'anchor=', startAnchor.id || '(no id)');
            }
            return bodyResult;
        }

        if (!isPinCell(graph, pin)) return false;

        var style = graph.getCellStyle(pin);
        var pinDir = String(styleValue(style, 'dftsIP_pin_direction', 'input'));
        var pinType = String(styleValue(style, 'dftsIP_pinType', ''));
        var pinKey = String(styleValue(style, 'dftsIP_pinKey', ''));
        var flag = String(styleValue(style, 'dftsIP_floorplanStart', '0'));

        if (flag === '1') return true;

        var result = (pinDir === 'output' && (pinType === 'data_out' || /data_out/i.test(pinKey)));
        if (result) {
            log('pin 命中 floorplan 输出规则', pin.id || '(no id)', 'pinKey=' + pinKey, 'pinType=' + pinType, 'pinDir=' + pinDir);
        }
        return result;
    }

    function getLineTemplateStyle() {
        return [
            'edgeStyle=none',
            'orthogonal=0',
            'rounded=0',
            'jumpStyle=none',
            'endArrow=none',
            'startArrow=none',
            'strokeColor=#ff0000',
            'strokeWidth=2',
            'floorplanLine=1'
        ].join(';') + ';';
    }

    function buildFloorplanLineCell() {
        var geo = new mxGeometry();
        geo.relative = false;
        geo.sourcePoint = new mxPoint(0, 0);
        geo.targetPoint = new mxPoint(80, 0);
        geo.points = [];

        var e = new mxCell('', geo, getLineTemplateStyle());
        e.edge = true;
        return e;
    }

    function cloneLineGeometry(geo) {
        if (!geo) return null;
        var g = geo.clone();
        g.sourcePoint = geo.sourcePoint ? new mxPoint(geo.sourcePoint.x, geo.sourcePoint.y) : null;
        g.targetPoint = geo.targetPoint ? new mxPoint(geo.targetPoint.x, geo.targetPoint.y) : null;
        g.points = [];
        if (geo.points && geo.points.length) {
            for (var i = 0; i < geo.points.length; i++) {
                var p = geo.points[i];
                g.points.push(p ? new mxPoint(p.x, p.y) : null);
            }
        }
        return g;
    }

    function getPinExitPoint(graph, pin) {
        if (!graph || !pin || !pin.geometry || !pin.parent || !pin.parent.geometry) return null;

        var pinGeo = pin.geometry;
        var body = pin.parent;
        var bodyGeo = body.geometry;
        var style = graph.getCellStyle(pin);
        var side = String(styleValue(style, 'dftsIP_pin_location', styleValue(style, 'portDir', 'east')));

        var absX = bodyGeo.x + (pinGeo.relative ? pinGeo.x * bodyGeo.width : pinGeo.x);
        var absY = bodyGeo.y + (pinGeo.relative ? pinGeo.y * bodyGeo.height : pinGeo.y);
        var ox = pinGeo.offset ? (pinGeo.offset.x || 0) : 0;
        var oy = pinGeo.offset ? (pinGeo.offset.y || 0) : 0;
        absX += ox;
        absY += oy;

        if (pin.__dftsSymbolChild && pin.__dftsSymbolKind === 'port') {
            var cx = absX + (pinGeo.width || 0) / 2;
            var cy = absY + (pinGeo.height || 0) / 2;
            if (side === 'west') return new mxPoint(bodyGeo.x, cy);
            if (side === 'east') return new mxPoint(bodyGeo.x + bodyGeo.width, cy);
            if (side === 'north') return new mxPoint(cx, bodyGeo.y);
            return new mxPoint(cx, bodyGeo.y + bodyGeo.height);
        }

        if (side === 'west') return new mxPoint(absX, absY + (pinGeo.height || 0) / 2);
        if (side === 'east') return new mxPoint(absX + (pinGeo.width || 0), absY + (pinGeo.height || 0) / 2);
        if (side === 'north') return new mxPoint(absX + (pinGeo.width || 0) / 2, absY);
        return new mxPoint(absX + (pinGeo.width || 0) / 2, absY + (pinGeo.height || 0));
    }

    function markBodyAsFloorplan(graph, body) {
        if (!graph || !body) return;

        var model = graph.getModel();
        var oldStyle = body.getStyle() || '';
        var newStyle = oldStyle;

        newStyle = mxUtils.setStyle(newStyle, 'floorplan', '1');
        newStyle = mxUtils.setStyle(newStyle, 'perimeter', 'floorplanAnyPoint');

        if (newStyle !== oldStyle) {
            try {
                if (model && typeof model.contains === 'function' && model.contains(body)) {
                    model.setStyle(body, newStyle);
                } else {
                    body.setStyle(newStyle);
                }
            } catch (e) {
                body.setStyle(newStyle);
            }
            // log('标记 body 为 floorplan', body.id || '(no id)', body.getStyle ? body.getStyle() : newStyle);
        }
    }

    function markPinAsFloorplanStart(graph, pin) {
        if (!graph || !pin || !isPinCell(graph, pin)) return;

        var model = graph.getModel();
        var oldStyle = pin.getStyle() || '';
        var newStyle = oldStyle;

        // 不要再把 floorplan 起点 pin 设成可连
        newStyle = mxUtils.setStyle(newStyle, 'dftsIP_floorplanStart', '1');
        newStyle = mxUtils.setStyle(newStyle, 'connectable', '0');
        pin.connectable = false;

        if (newStyle !== oldStyle) {
            try {
                if (model && typeof model.contains === 'function' && model.contains(pin)) {
                    model.setStyle(pin, newStyle);
                } else {
                    pin.setStyle(newStyle);
                }
            } catch (e) {
                pin.setStyle(newStyle);
            }
        }

        pin.connectable = true;
        log('标记 pin 为 floorplan line 起点', pin.id || '(no id)', 'connectableNow=', pin.connectable, pin.getStyle ? pin.getStyle() : newStyle);
    }

    // forceCellConnectableFromStyle：遇到 floorplanStart 直接跳过
    function forceCellConnectableFromStyle(graph, cell) {
        if (!graph || !cell) return false;

        var st = graph.getCellStyle(cell);
        var isPin = String(styleValue(st, 'dftsIP_pin', styleValue(st, 'pin', '0'))) === '1';
        var floorplanStart = String(styleValue(st, 'dftsIP_floorplanStart', '0')) === '1';
        var pinType = String(styleValue(st, 'dftsIP_pinType', ''));

        if (floorplanStart) {
            cell.connectable = false;
            return false;
        }

        if (isPin || pinType) {
            cell.connectable = true;
            return true;
        }

        return false;
    }

    function forceConnectableDeep(graph, cell) {
        if (!graph || !cell) return;
        forceCellConnectableFromStyle(graph, cell);

        var model = graph.getModel();
        var n = model.getChildCount(cell);
        for (var i = 0; i < n; i++) {
            forceConnectableDeep(graph, model.getChildAt(cell, i));
        }
    }

    function markBodyPins(graph, body) {
        if (!graph || !body || !isDataSourceBody(graph, body)) return;

        markBodyAsFloorplan(graph, body);

        var model = graph.getModel();
        var childCount = model.getChildCount(body);
        // log('扫描 data source body', body.id || '(no id)', 'childCount=', childCount, 'label=', body.value);

        var pins = [];
        for (var i = 0; i < childCount; i++) {
            var ch = model.getChildAt(body, i);
            var st = graph.getCellStyle(ch);
            var flag = styleValue(st, 'dftsIP_pin', styleValue(st, 'pin', '0'));
            var pinType = styleValue(st, 'dftsIP_pinType', '');
            var pinKey = styleValue(st, 'dftsIP_pinKey', '');

            // log('检查 body child',
            //     'idx=', i,
            //     'id=', ch && ch.id,
            //     'value=', ch && ch.value,
            //     'rawFlag=', flag,
            //     'rawFlagType=', typeof flag,
            //     'pinType=', pinType,
            //     'pinKey=', pinKey,
            //     'rawStyle=', ch && ch.getStyle ? ch.getStyle() : ''
            // );

            if (isPinCell(graph, ch)) pins.push(ch);
        }

        // log('识别出的 pin 数量=', pins.length);

        for (var j = 0; j < pins.length; j++) {
            var pin = pins[j];
            forceCellConnectableFromStyle(graph, pin);
            if (shouldUseFloorplanLine(graph, pin)) {
                markPinAsFloorplanStart(graph, pin);
                pin.connectable = true;
            }
        }
    }

    function markAllExistingDataSourcePins(graph) {
        if (!graph || !NS.getAllChipBodies) return;
        var bodies = NS.getAllChipBodies(graph) || [];
        log('开始扫描现有图元，body 数量=', bodies.length);

        graph.getModel().beginUpdate();
        try {
            for (var i = 0; i < bodies.length; i++) {
                if (isDataSourceBody(graph, bodies[i])) {
                    markBodyPins(graph, bodies[i]);
                }
            }
        } finally {
            graph.getModel().endUpdate();
        }
    }

    function wrapDataSourceDefs() {
        if (!NS._defsByKey) return;
        var keys = Object.keys(NS._defsByKey);
        for (var i = 0; i < keys.length; i++) {
            var def = NS._defsByKey[keys[i]];
            if (!def || def.__dftsDsFloorplanWrapped) continue;

            var cat = String(def.category || '').toLowerCase();
            if (cat !== 'datasource' && cat !== 'data_source') continue;

            def.__dftsDsFloorplanWrapped = true;
            (function (def) {
                var oldAfterCreate = def.afterCreate;
                def.afterCreate = function (graph, body, runtimeOpt, ctx) {
                    // log('afterCreate(data source)', def.key, 'body=', body && body.id, 'type=', def.dftsType, 'runtimeOpt=', runtimeOpt || {});
                    markBodyPins(graph, body);
                    if (typeof oldAfterCreate === 'function') {
                        return oldAfterCreate.apply(this, arguments);
                    }
                };
            })(def);

            // log('已包装 data source 定义', def.key, def.dftsType);
        }
    }

    function patchGraphImportCells(ui) {
        var realUi = normalizeUi(ui);
        var graph = realUi && realUi.editor && realUi.editor.graph;
        if (!graph || graph.__dftsImportCellsPatched) return;

        graph.__dftsImportCellsPatched = true;

        var oldImportCells = graph.importCells;
        graph.importCells = function (cells, dx, dy, target, evt, mapping) {
            var ret = oldImportCells.apply(this, arguments);

            try {
                if (ret && ret.length) {
                    for (var i = 0; i < ret.length; i++) {
                        var c = ret[i];
                        forceConnectableDeep(graph, c);

                        if (isDataSourceBody(graph, c)) {
                            log('graph.importCells 捕获到 datasource body，插入后重新标记并强制 connectable', c.id || '(no id)', c.value);
                            markBodyPins(graph, c);
                            forceConnectableDeep(graph, c);
                        }
                    }
                }
            } catch (e) {
                error('graph.importCells 补丁执行失败', e);
            }

            return ret;
        };

        log('graph.importCells 兜底补丁完成');
    }

    function patchGraphIsCellConnectable(ui) {
        var realUi = normalizeUi(ui);
        var graph = realUi && realUi.editor && realUi.editor.graph;
        if (!graph || graph.__dftsIsCellConnectablePatched) return;

        graph.__dftsIsCellConnectablePatched = true;

        var oldIsCellConnectable = graph.isCellConnectable;
        // graph.isCellConnectable：floorplanStart 返回 false，别让默认 connectionHandler 起动
        graph.isCellConnectable = function (cell) {
            try {
                if (cell) {
                    var st = this.getCellStyle(cell);
                    var floorplanStart = String(styleValue(st, 'dftsIP_floorplanStart', '0')) === '1';

                    if (floorplanStart) {
                        cell.connectable = false;
                        return false;
                    }
                }
            } catch (e) { }

            return oldIsCellConnectable.apply(this, arguments);
        };

        log('graph.isCellConnectable 兜底补丁完成');
    }

    function patchConnectionHandler(ui) {
        var realUi = normalizeUi(ui);
        var graph = realUi && realUi.editor && realUi.editor.graph;
        if (!graph || !graph.connectionHandler) {
            warn('找不到 graph.connectionHandler，无法打补丁');
            return;
        }

        var ch = graph.connectionHandler;

        if (ch.__dftsDsFloorplanPatched) {
            log('connectionHandler 已打过补丁');
            return;
        }
        ch.__dftsDsFloorplanPatched = true;

        if (typeof global.enableFloorplanFreeConnect === 'function') {
            try {
                global.enableFloorplanFreeConnect(realUi);
                log('已调用 enableFloorplanFreeConnect');
            } catch (e) {
                error('enableFloorplanFreeConnect 调用失败', e);
            }
        }

        if (typeof global.installFloorplanLineTool === 'function') {
            try {
                global.installFloorplanLineTool(realUi);
                log('已调用 installFloorplanLineTool');
            } catch (e) {
                error('installFloorplanLineTool 调用失败', e);
            }
        }

        if (typeof global.installFloorplanLineContinueHandles === 'function') {
            try {
                global.installFloorplanLineContinueHandles(realUi);
                log('已调用 installFloorplanLineContinueHandles');
            } catch (e) {
                error('installFloorplanLineContinueHandles 调用失败', e);
            }
        }

        if (ch.start && !ch.__dftsStartWrapped) {
            ch.__dftsStartWrapped = true;
            var oldStart = ch.start;
            ch.start = function (state, x, y, edgeState) {
                try {
                    var cell = state && state.cell;
                    if (cell) {
                        var st = graph.getCellStyle(cell);
                        log('connectionHandler.start',
                            'cell=', cell.id || '(no id)',
                            'isPin=', isPinCell(graph, cell),
                            'floorplanStart=', styleValue(st, 'dftsIP_floorplanStart', '0'),
                            'pinType=', styleValue(st, 'dftsIP_pinType', ''),
                            'pinKey=', styleValue(st, 'dftsIP_pinKey', ''),
                            'connectable=', cell.connectable,
                            'style=', cell.getStyle && cell.getStyle()
                        );
                    } else {
                        log('connectionHandler.start 无 state.cell');
                    }
                } catch (e) {
                    error('包装 start 日志失败', e);
                }
                return oldStart.apply(this, arguments);
            };
        }

        if (!ch.__dftsMouseDownWrapped) {
            ch.__dftsMouseDownWrapped = true;
            ch.__dftsInterceptsFloorplanStart = true;
            var oldMouseDown = ch.mouseDown;
            ch.mouseDown = function (sender, me) {
                try {
                    var evt = me && me.getEvent ? me.getEvent() : null;
                    if (!evt || !mxEvent.isLeftMouseButton(evt)) {
                        return oldMouseDown.apply(this, arguments);
                    }

                    var cell = me && me.getCell ? me.getCell() : null;
                    var sourceIsMarked = shouldUseFloorplanLine(graph, cell);
                    log('connectionHandler.mouseDown', 'cell=', cell && cell.id, 'sourceIsMarked=', sourceIsMarked);

                    if (!sourceIsMarked) {
                        return oldMouseDown.apply(this, arguments);
                    }

                    var anchorCell = getFloorplanStartAnchorCell(graph, cell);
                    var pt = getFloorplanStartPoint(graph, cell);
                    if (!pt || !realUi.startFloorplanLineFromPoint) {
                        warn('mouseDown: floorplan 起线失败', 'hasPoint=', !!pt, 'hasTool=', !!(realUi && realUi.startFloorplanLineFromPoint));
                        return oldMouseDown.apply(this, arguments);
                    }

                    this.__dftsSuppressNextConnect = true;
                    realUi.startFloorplanLineFromPoint(pt, {
                        decorateEdge: function (edge, g) {
                            if (NS.attachFloorplanLineAnchor && anchorCell) {
                                NS.attachFloorplanLineAnchor(g, edge, anchorCell, 'source');
                            }
                        }
                    });

                    try {
                        this.reset();
                    } catch (e) { }

                    if (me && typeof me.consume === 'function') me.consume();
                    mxEvent.consume(evt);
                    return;
                } catch (e2) {
                    error('connectionHandler.mouseDown 自定义 floorplan 起线失败', e2);
                }

                return oldMouseDown.apply(this, arguments);
            };
        }

        if (!ch.__dftsConnectWrapped) {
            ch.__dftsConnectWrapped = true;
            var oldConnect = ch.connect;
            ch.connect = function (source, target, evt, dropTarget) {
                try {
                    if (this.__dftsSuppressNextConnect) {
                        this.__dftsSuppressNextConnect = false;
                        log('connect 已抑制，避免默认黑线/重复红线');
                        if (evt) mxEvent.consume(evt);
                        return null;
                    }

                    var sourceCell = normalizeTerminalCell(source);
                    var targetCell = normalizeTerminalCell(target);
                    var sourceIsMarked = shouldUseFloorplanLine(graph, sourceCell);

                    log('connect 进入',
                        'source=', sourceCell && sourceCell.id,
                        'target=', targetCell && targetCell.id,
                        'sourceIsMarked=', sourceIsMarked,
                        'currentPoint=', this.currentPoint ? (this.currentPoint.x + ',' + this.currentPoint.y) : 'null'
                    );

                    if (sourceIsMarked) {
                        var spt = getFloorplanStartPoint(graph, sourceCell);
                        if (!spt) {
                            warn('connect: getFloorplanStartPoint 失败，退回默认 connect');
                            return oldConnect.apply(this, arguments);
                        }

                        var targetPt = null;
                        if (this.currentPoint) {
                            targetPt = new mxPoint(this.currentPoint.x, this.currentPoint.y);
                        }
                        if (!targetPt && isPinCell(graph, targetCell)) {
                            targetPt = getPinExitPoint(graph, targetCell);
                        }
                        if (!targetPt) {
                            targetPt = new mxPoint(spt.x + 80, spt.y);
                        }

                        var edge = buildFloorplanLineCell();
                        var geo = cloneLineGeometry(edge.geometry);
                        geo.sourcePoint = spt;
                        geo.targetPoint = targetPt;
                        geo.points = [];
                        geo.relative = false;
                        edge.geometry = geo;
                        edge.value = '';

                        var parent = graph.getDefaultParent();
                        log('connect 直接创建 floorplan line', 'sourcePt=', spt.x + ',' + spt.y, 'targetPt=', targetPt.x + ',' + targetPt.y, 'parent=', parent && (parent.id || '(no id)'));

                        graph.getModel().beginUpdate();
                        try {
                            var inserted = graph.addCell(edge, parent);
                            graph.getModel().setTerminal(inserted, null, true);
                            graph.getModel().setTerminal(inserted, null, false);
                            graph.setSelectionCell(inserted);

                            log('connect 已保留 floorplan line', inserted && inserted.id, inserted && inserted.getStyle && inserted.getStyle());

                            this.reset();
                            if (evt) mxEvent.consume(evt);
                            return inserted;
                        } finally {
                            graph.getModel().endUpdate();
                        }
                    }
                } catch (e) {
                    error('自定义 connect 失败，退回默认逻辑', e);
                }

                return oldConnect.apply(this, arguments);
            };

            log('connectionHandler.connect 打补丁完成');
        }

        if (!ch.__dftsInsertEdgeWrapped) {
            ch.__dftsInsertEdgeWrapped = true;
            var oldInsertEdge = ch.insertEdge;
            ch.insertEdge = function (parent, id, value, source, target, style) {
                try {
                    if (this.__dftsSuppressNextConnect) {
                        log('insertEdge 已抑制，避免默认黑线');
                        return null;
                    }

                    source = normalizeTerminalCell(source);
                    target = normalizeTerminalCell(target);

                    var sourceStyle = source ? graph.getCellStyle(source) : null;
                    var sourceIsPin = isPinCell(graph, source);
                    var sourcePinType = styleValue(sourceStyle, 'dftsIP_pinType', '');
                    var sourcePinKey = styleValue(sourceStyle, 'dftsIP_pinKey', '');
                    var sourcePinDir = styleValue(sourceStyle, 'dftsIP_pin_direction', '');
                    var sourceFloorplanStart = styleValue(sourceStyle, 'dftsIP_floorplanStart', '0');
                    var sourceCategory = styleValue(sourceStyle, 'dftsIP_category', '');
                    var sourceType = styleValue(sourceStyle, 'dftsIP_type', '');
                    var sourceIsMarked = shouldUseFloorplanLine(graph, source);

                    log('insertEdge 进入',
                        'source=', source && source.id,
                        'target=', target && target.id,
                        'sourceIsPin=', sourceIsPin,
                        'sourcePinType=', sourcePinType,
                        'sourcePinKey=', sourcePinKey,
                        'sourcePinDir=', sourcePinDir,
                        'sourceFloorplanStart=', sourceFloorplanStart,
                        'sourceCategory=', sourceCategory,
                        'sourceType=', sourceType,
                        'sourceRawStyle=', source && source.getStyle ? source.getStyle() : '',
                        'sourceIsMarked=', sourceIsMarked,
                        'currentPoint=', this.currentPoint ? (this.currentPoint.x + ',' + this.currentPoint.y) : 'null',
                        'styleArg=', style || '(empty)'
                    );
                } catch (e) {
                    error('insertEdge 调试日志失败', e);
                }
                return oldInsertEdge.apply(this, arguments);
            };
        }

        // patchConnectionHandler 里，不要再用 connect() 晚拦截；改成 mouseDown 提前启动自定义工具
        graph.addMouseListener({
            mouseDown: function (sender, me) {
                if (graph.connectionHandler && graph.connectionHandler.__dftsInterceptsFloorplanStart) return;
                var evt = me.getEvent();
                if (!mxEvent.isLeftMouseButton(evt)) return;

                var cell = me.getCell();
                if (!shouldUseFloorplanLine(graph, cell)) return;

                var anchorCell = getFloorplanStartAnchorCell(graph, cell);
                var pt = getFloorplanStartPoint(graph, cell);
                if (!pt) return;
                if (!realUi.startFloorplanLineFromPoint) return;

                realUi.startFloorplanLineFromPoint(pt, {
                    decorateEdge: function (edge, g) {
                        if (NS.attachFloorplanLineAnchor && anchorCell) {
                            NS.attachFloorplanLineAnchor(g, edge, anchorCell, 'source');
                        }
                    }
                });

                me.consume();
                mxEvent.consume(evt);
            },
            mouseMove: function () { },
            mouseUp: function () { }
        });

        log('connectionHandler 打补丁完成');
    }

    function installForUi(ui) {
        var realUi = normalizeUi(ui);
        if (!realUi || !realUi.editor || !realUi.editor.graph) {
            warn('installForUi 找不到有效 ui');
            return;
        }

        var graph = realUi.editor.graph;
        log('开始安装 Data Source -> Floorplan Line 调试补丁');

        if (NS.ensureGraphPatches) {
            try {
                NS.ensureGraphPatches(graph);
                log('已调用 NS.ensureGraphPatches');
            } catch (e) {
                error('NS.ensureGraphPatches 调用失败', e);
            }
        }

        wrapDataSourceDefs();
        markAllExistingDataSourcePins(graph);
        patchConnectionHandler(realUi);
        patchGraphImportCells(realUi);
        patchGraphIsCellConnectable(realUi);

        log('安装完成');
    }

    function wrapInstallDataSourceIp() {
        if (!NS.installDataSourceIp || NS.installDataSourceIp.__dftsWrapped) return;

        var oldInstall = NS.installDataSourceIp;
        NS.installDataSourceIp = function (ui) {
            log('进入 NS.installDataSourceIp 包装');
            var ret = oldInstall.apply(this, arguments);
            try {
                installForUi(ui);
            } catch (e) {
                error('包装 installDataSourceIp 后续安装失败', e);
            }
            return ret;
        };

        NS.installDataSourceIp.__dftsWrapped = true;
        log('已包装 NS.installDataSourceIp');
    }

    wrapDataSourceDefs();
    wrapInstallDataSourceIp();

    var directUi = guessUi();
    if (directUi) {
        installForUi(directUi);
    } else {
        log('当前还没有 ui 实例，开始轮询等待');
        var tries = 0;
        var timer = setInterval(function () {
            tries++;
            var ui = guessUi();
            if (ui) {
                clearInterval(timer);
                log('轮询拿到 ui，开始安装');
                installForUi(ui);
                return;
            }
            if (tries >= 200) {
                clearInterval(timer);
                warn('20 秒内未拿到 ui，停止轮询');
            }
        }, 100);
    }
})(this);
