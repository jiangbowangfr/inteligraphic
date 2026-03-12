
(function (global) {
    var NS = global.DftsIP = global.DftsIP || {};
    if (NS.__commonLoaded) return;
    NS.__commonLoaded = true;

    NS.VERSION = '2.0.0';

    NS.CATEGORY = NS.CATEGORY || {
        FUNCTIONAL: 'functional',
        INTERFACE: 'interface',
        DATASOURCE: 'data_source',
        THIRD_PARTY: 'third_party_ip'
    };

    NS.POLICY = NS.POLICY || {
        LABEL_FIXED: 'fixed',
        LABEL_USER_OR_DEFAULT: 'user_or_default',
        LABEL_USER_OR_AUTO_INCREMENT: 'user_or_auto_increment',
        INSTANCE_REQUIRED: 'required',
        INSTANCE_OPTIONAL: 'optional',
        INSTANCE_DISABLED: 'disabled'
    };

    NS._defsByKey = NS._defsByKey || {};
    NS._defsByType = NS._defsByType || {};
    NS._configOpeners = NS._configOpeners || {};

    function toStr(v) {
        return (v == null) ? '' : String(v);
    }

    function trimOrEmpty(v) {
        return toStr(v).replace(/^\s+|\s+$/g, '');
    }

    function cloneObj(obj) {
        if (!obj) return {};
        return JSON.parse(JSON.stringify(obj));
    }

    function normalizeNameForId(v) {
        var s = trimOrEmpty(v);
        if (!s) return 'ip';
        s = s.replace(/\n/g, ' ');
        s = s.replace(/[^a-zA-Z0-9]+/g, '_');
        s = s.replace(/^_+|_+$/g, '');
        return s ? s.toLowerCase() : 'ip';
    }

    function rejectCreate(msg) {
        if (typeof mxUtils !== 'undefined' && mxUtils.alert) mxUtils.alert(msg);
        else if (typeof global.alert === 'function') global.alert(msg);
        throw new Error(msg);
    }

    NS.rejectCreate = rejectCreate;

    function styleValue(styleObj, key, fallback) {
        if (!styleObj) return fallback;
        return mxUtils.getValue(styleObj, key, fallback);
    }

    function getCellDisplayName(graph, cell) {
        if (!cell) return '';
        if (cell.value != null) return String(cell.value);
        var label = graph && typeof graph.convertValueToString === 'function'
            ? graph.convertValueToString(cell)
            : '';
        return label || '';
    }

    NS.getCellDisplayName = getCellDisplayName;

    function isChipBody(graph, cell) {
        if (!graph || !cell) return false;
        var s = graph.getCellStyle(cell);
        return styleValue(s, 'dftsIP_chipBody', '0') === '1';
    }

    function isPinCell(graph, cell) {
        if (!graph || !cell) return false;
        var s = graph.getCellStyle(cell);
        return styleValue(s, 'dftsIP_pin', styleValue(s, 'pin', '0')) === '1';
    }

    function isInstanceLabel(graph, cell) {
        if (!graph || !cell) return false;
        var s = graph.getCellStyle(cell);
        return styleValue(s, 'dftsIP_instanceLabel', '0') === '1';
    }

    NS.isChipBody = isChipBody;
    NS.isPinCell = isPinCell;
    NS.isInstanceLabel = isInstanceLabel;

    function findChipBodyForCell(graph, cell) {
        if (!graph || !cell) return null;
        var model = graph.getModel();
        var cur = cell;
        while (cur && cur !== model.getRoot()) {
            if (isChipBody(graph, cur)) return cur;
            cur = model.getParent(cur);
        }
        return null;
    }

    NS.findChipBodyForCell = findChipBodyForCell;

    function getAllChipBodies(graph) {
        var out = [];
        if (!graph) return out;
        var model = graph.getModel();

        function walk(cell) {
            if (!cell) return;
            if (isChipBody(graph, cell)) out.push(cell);
            var n = model.getChildCount(cell);
            for (var i = 0; i < n; i++) walk(model.getChildAt(cell, i));
        }

        walk(model.getRoot());
        return out;
    }

    NS.getAllChipBodies = getAllChipBodies;

    function hasBodyLabel(graph, label, excludeBody) {
        label = trimOrEmpty(label);
        if (!label) return false;
        var bodies = getAllChipBodies(graph);
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];
            if (body === excludeBody) continue;
            if (trimOrEmpty(getCellDisplayName(graph, body)) === label) return true;
        }
        return false;
    }

    NS.hasBodyLabel = hasBodyLabel;

    function getNextAutoLabel(graph, prefix) {
        prefix = trimOrEmpty(prefix) || 'IP';
        var maxIndex = -1;
        var re = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_(\\d+)$');
        var bodies = getAllChipBodies(graph);
        for (var i = 0; i < bodies.length; i++) {
            var name = trimOrEmpty(getCellDisplayName(graph, bodies[i]));
            var m = re.exec(name);
            if (!m) continue;
            var idx = parseInt(m[1], 10);
            if (!isNaN(idx)) maxIndex = Math.max(maxIndex, idx);
        }
        return prefix + '_' + (maxIndex + 1);
    }

    NS.getNextAutoLabel = getNextAutoLabel;

    function busSuffix(width) {
        width = parseInt(width, 10) || 1;
        if (width <= 1) return '';
        return '[' + (width - 1) + ':0]';
    }

    NS.busSuffix = busSuffix;

    function getLinePinText(graph, pinCell) {
        var model = graph.getModel();
        if (!pinCell) return '';
        var v = (pinCell.value != null) ? String(pinCell.value) : '';
        if (v) return v;

        for (var i = 0; i < model.getChildCount(pinCell); i++) {
            var ch = model.getChildAt(pinCell, i);
            var cs = graph.getCellStyle(ch);
            if (styleValue(cs, 'dftsIP_pin_label', '0') === '1') {
                return (ch.value != null) ? String(ch.value) : '';
            }
        }
        return '';
    }

    NS.getLinePinText = getLinePinText;

    function findPinLabelCell(graph, pinCell) {
        var model = graph.getModel();
        if (!pinCell) return null;
        for (var i = 0; i < model.getChildCount(pinCell); i++) {
            var ch = model.getChildAt(pinCell, i);
            var cs = graph.getCellStyle(ch);
            if (styleValue(cs, 'dftsIP_pin_label', '0') === '1') return ch;
        }
        return null;
    }

    function setPinLabelText(graph, pinCell, newText) {
        var model = graph.getModel();
        var labelCell = findPinLabelCell(graph, pinCell);
        if (labelCell) model.setValue(labelCell, newText);
        else model.setValue(pinCell, newText);
    }

    NS.findPinLabelCell = findPinLabelCell;
    NS.setPinLabelText = setPinLabelText;

    function getChipPins(graph, body) {
        var model = graph.getModel();
        var out = [];
        if (!body) return out;
        for (var i = 0; i < model.getChildCount(body); i++) {
            var ch = model.getChildAt(body, i);
            if (isPinCell(graph, ch)) out.push(ch);
        }
        return out;
    }

    NS.getChipPins = getChipPins;

    function getPinSide(graph, pin) {
        var s = graph.getCellStyle(pin);
        return styleValue(s, 'dftsIP_pin_location', styleValue(s, 'portDir', 'east'));
    }

    function getPinT(graph, pin) {
        var side = getPinSide(graph, pin);
        var g = pin && pin.geometry;
        if (!g) return 0.5;
        return (side === 'west' || side === 'east') ? (g.y || 0.5) : (g.x || 0.5);
    }

    NS.getPinSide = getPinSide;
    NS.getPinT = getPinT;

    function clamp01(v) {
        v = Number(v);
        if (isNaN(v)) return 0.5;
        return Math.max(0.05, Math.min(0.95, v));
    }

    function inferPinStrokeWidth(opt) {
        if (opt && opt.strokeWidth != null) return Math.max(1, parseInt(opt.strokeWidth, 10) || 1);
        var bw = opt && opt.busWidth != null ? (parseInt(opt.busWidth, 10) || 1) : 1;
        var isBus = !!(opt && (opt.isBus || bw > 1));
        return isBus ? 3 : 1;
    }

    function inferPinThickness(opt) {
        if (opt && opt.thick != null) return Math.max(6, parseInt(opt.thick, 10) || 8);
        var bw = opt && opt.busWidth != null ? (parseInt(opt.busWidth, 10) || 1) : 1;
        var isBus = !!(opt && (opt.isBus || bw > 1));
        return isBus ? 12 : 8;
    }

    function inferPinLength(opt) {
        if (opt && opt.len != null) return Math.max(16, parseInt(opt.len, 10) || 26);
        return 26;
    }

    function calcPinGeometry(side, t, len, thick) {
        var g = new mxGeometry();
        g.relative = true;

        if (side === 'west' || side === 'east') {
            g.x = (side === 'west') ? 0 : 1;
            g.y = t;
            g.width = len;
            g.height = thick;
            g.offset = new mxPoint((side === 'west' ? -len : 0), -thick / 2);
        } else {
            g.x = t;
            g.y = (side === 'north') ? 0 : 1;
            g.width = thick;
            g.height = len;
            g.offset = new mxPoint(-thick / 2, (side === 'north' ? -len : 0));
        }
        return g;
    }

    function pinPointsStyle(side) {
        if (side === 'west') return 'points=[[0,0.5,0,0,0]];';
        if (side === 'east') return 'points=[[1,0.5,0,0,0]];';
        if (side === 'north') return 'points=[[0.5,0,0,0,0]];';
        return 'points=[[0.5,1,0,0,0]];';
    }

    function pinLabelLayout(side, spacing) {
        var geo = new mxGeometry();
        geo.relative = true;
        geo.width = 0;
        geo.height = 0;

        if (side === 'west') {
            geo.x = 1; geo.y = 0.5;
            geo.offset = new mxPoint(spacing, 0);
        } else if (side === 'east') {
            geo.x = 0; geo.y = 0.5;
            geo.offset = new mxPoint(-spacing, 0);
        } else if (side === 'north') {
            geo.x = 0.5; geo.y = 1;
            geo.offset = new mxPoint(0, spacing);
        } else {
            geo.x = 0.5; geo.y = 0;
            geo.offset = new mxPoint(0, -spacing);
        }
        return geo;
    }

    function pinLabelAlign(side) {
        if (side === 'west') return 'align=left;verticalAlign=middle;';
        if (side === 'east') return 'align=right;verticalAlign=middle;';
        if (side === 'north') return 'align=left;verticalAlign=middle;';
        return 'align=right;verticalAlign=middle;';
    }

    function createLinePin(name, side, t, opt) {
        opt = opt || {};
        var len = inferPinLength(opt);
        var thick = inferPinThickness(opt);
        var fontSize = opt.fontSize || 16;
        var spacing = (opt.spacing != null) ? parseInt(opt.spacing, 10) || 8 : 8;
        var pinType = opt.pinType || 'data_in';
        var pinDirection = opt.pinDirection || 'input';
        var pinKey = opt.pinKey || '';
        var bw = parseInt(opt.busWidth, 10) || 1;
        var strokeWidth = inferPinStrokeWidth(opt);
        var isBus = !!(opt.isBus || bw > 1);

        var g = calcPinGeometry(side, clamp01(t), len, thick);
        var lineDir = (side === 'north' || side === 'south') ? 'direction=north;' : 'direction=east;';

        var lineStyle = [
            'shape=line',
            'strokeWidth=' + strokeWidth,
            'fillColor=none',
            'html=1',
            'noLabel=1',
            'resizable=0',
            'rotatable=0',
            'connectable=1',
            'outlineConnect=0',
            'perimeter=none',
            'dftsIP_pin=1',
            'pin=1',
            'portDir=' + side,
            'dftsIP_pinType=' + pinType,
            'dftsIP_pin_direction=' + pinDirection,
            'dftsIP_pin_location=' + side,
            'dftsIP_pinKey=' + pinKey,
            'dftsIP_busWidth=' + bw,
            'dftsIP_isBus=' + (isBus ? '1' : '0'),
            lineDir + pinPointsStyle(side)
        ].join(';');

        var pin = new mxCell('', g, lineStyle);
        pin.vertex = true;
        pin.connectable = true;

        var labelGeo = pinLabelLayout(side, spacing);
        var labelStyle = [
            'shape=label',
            'dftsIP_pin_label=1',
            'whiteSpace=wrap',
            'html=1',
            'connectable=0',
            'pointerEvents=0',
            'resizable=0',
            'rotatable=0',
            'fontSize=' + fontSize,
            pinLabelAlign(side),
            ((side === 'north' || side === 'south') ? 'rotation=90' : 'rotation=0')
        ].join(';');

        var labelCell = new mxCell(name, labelGeo, labelStyle);
        labelCell.vertex = true;
        labelCell.connectable = false;
        pin.insert(labelCell);

        return pin;
    }

    NS.createLinePin = createLinePin;

    function placeLinePins(graph, body, side, items, opt) {
        if (!items || !items.length) return;

        for (var i = 0; i < items.length; i++) {
            var it = items[i] || {};
            var t = (typeof it.t === 'number') ? clamp01(it.t) : ((i + 1) / (items.length + 1));
            var pinName = (typeof it === 'string') ? it : (it.name || '');
            var pinType = (typeof it === 'string') ? (opt && opt.pinType) : (it.type || (opt && opt.pinType));
            var pinDirection = (typeof it === 'string')
                ? ((opt && opt.pinDirection) || 'input')
                : (it.dir || it.direction || (opt && opt.pinDirection) || 'input');

            var pinOpt = Object.assign({}, opt || {}, (typeof it === 'string') ? {} : it, {
                pinType: pinType,
                pinDirection: pinDirection,
                pinKey: (typeof it === 'string') ? '' : (it.pinKey || '')
            });

            var pin = createLinePin(pinName, side, t, pinOpt);
            body.insert(pin);
        }
    }

    NS.placeLinePins = placeLinePins;

    function computeChipMinSize(graph, body) {
        if (NS.Symbol && typeof NS.Symbol.isSymbolBody === 'function' && NS.Symbol.isSymbolBody(body) && typeof NS.Symbol.computeBodyMinSize === 'function') {
            return NS.Symbol.computeBodyMinSize(graph, body);
        }
        var model = graph.getModel();
        var wPins = [], ePins = [], nPins = [], sPins = [];
        var wMaxLen = 0, eMaxLen = 0, nMaxLen = 0, sMaxLen = 0;
        var pinLenW = 26, pinLenE = 26, pinLenN = 26, pinLenS = 26;
        var rowFont = 20;

        for (var j = 0; j < model.getChildCount(body); j++) {
            var p = model.getChildAt(body, j);
            if (!isPinCell(graph, p)) continue;

            var ps = graph.getCellStyle(p);
            var dir = styleValue(ps, 'portDir', 'east');
            var txt = getLinePinText(graph, p);
            var fz = parseInt(styleValue(ps, 'fontSize', '20'), 10) || 20;
            rowFont = Math.max(rowFont, fz);

            if (dir === 'west') { wPins.push(p); wMaxLen = Math.max(wMaxLen, txt.length); pinLenW = Math.max(pinLenW, p.geometry.width || 26); }
            if (dir === 'east') { ePins.push(p); eMaxLen = Math.max(eMaxLen, txt.length); pinLenE = Math.max(pinLenE, p.geometry.width || 26); }
            if (dir === 'north') { nPins.push(p); nMaxLen = Math.max(nMaxLen, txt.length); pinLenN = Math.max(pinLenN, p.geometry.height || 26); }
            if (dir === 'south') { sPins.push(p); sMaxLen = Math.max(sMaxLen, txt.length); pinLenS = Math.max(pinLenS, p.geometry.height || 26); }
        }

        var rows = Math.max(wPins.length, ePins.length);
        var pitch = Math.max(24, Math.round(rowFont * 1.6));
        var minHRows = Math.max(160, (rows + 1) * pitch);

        function labelReserve(chars, fz, pinLen) {
            if (chars <= 0) return 0;
            return pinLen + 8 + Math.round(chars * fz * 0.6) + 8;
        }

        var westRes = labelReserve(wMaxLen, rowFont, pinLenW);
        var eastRes = labelReserve(eMaxLen, rowFont, pinLenE);
        var northRes = labelReserve(nMaxLen, rowFont, pinLenN);
        var southRes = labelReserve(sMaxLen, rowFont, pinLenS);

        var coreMinW = 160;
        var coreMinH = 120;

        return {
            minW: Math.max(coreMinW + westRes + eastRes, 200),
            minH: Math.max(minHRows, coreMinH + northRes + southRes)
        };
    }

    NS.computeChipMinSize = computeChipMinSize;

    function installResizeClamp(graph) {
        if (!graph || graph.__dftsResizeClampInstalled) return;
        graph.__dftsResizeClampInstalled = true;

        var _resizeCell = graph.resizeCell;
        var _resizeCells = graph.resizeCells;
        var _cellsResized = graph.cellsResized;

        function clampBody(cell, b) {
            if (!isChipBody(graph, cell)) return b;
            if (NS.Symbol && typeof NS.Symbol.isSymbolBody === 'function' && NS.Symbol.isSymbolBody(cell)) {
                return b;
            }
            var min = computeChipMinSize(graph, cell);
            return new mxRectangle(
                b.x, b.y,
                Math.max(b.width, min.minW),
                Math.max(b.height, min.minH)
            );
        }

        graph.resizeCell = function (cell, bounds, recurse) {
            return _resizeCell.call(this, cell, clampBody(cell, bounds), recurse);
        };

        graph.resizeCells = function (cells, boundsArr, recurse) {
            if (cells && boundsArr) {
                var single = boundsArr.length === 1 && cells.length > 1;
                var newBounds = [];
                for (var i = 0; i < cells.length; i++) {
                    var b = single ? boundsArr[0] : boundsArr[i];
                    newBounds[i] = b ? clampBody(cells[i], b) : b;
                }
                return _resizeCells.call(this, cells, newBounds, recurse);
            }
            return _resizeCells.call(this, cells, boundsArr, recurse);
        };

        graph.cellsResized = function (cells, bounds, recurse, constrain, extend) {
            if (cells && bounds) {
                var single = bounds.length === 1 && cells.length > 1;
                var newBounds = [];
                for (var i = 0; i < cells.length; i++) {
                    var b = single ? bounds[0] : bounds[i];
                    newBounds[i] = b ? clampBody(cells[i], b) : b;
                }
                return _cellsResized.call(this, cells, newBounds, recurse, constrain, extend);
            }
            return _cellsResized.call(this, cells, bounds, recurse, constrain, extend);
        };
    }

    NS.installResizeClamp = installResizeClamp;

    function installPinGuards(graph) {
        if (!graph || graph.__dftsPinGuardsInstalled) return;
        graph.__dftsPinGuardsInstalled = true;

        var _isCellResizable = graph.isCellResizable;
        graph.isCellResizable = function (cell) {
            if (isPinCell(this, cell)) return false;
            return _isCellResizable.apply(this, arguments);
        };

        graph.addListener(mxEvent.CELLS_MOVED, function (sender, evt) {
            var cells = evt.getProperty('cells') || [];
            var model = graph.getModel();

            model.beginUpdate();
            try {
                for (var i = 0; i < cells.length; i++) {
                    var c = cells[i];
                    if (!model.isVertex(c) || !isPinCell(graph, c)) continue;

                    var parent = model.getParent(c);
                    if (!parent) continue;

                    var pb = graph.getCellBounds(parent);
                    var cb = graph.getCellBounds(c);
                    if (!pb || !cb) continue;

                    var dir = getPinSide(graph, c);
                    var relX = (cb.getCenterX() - pb.x) / pb.width;
                    var relY = (cb.getCenterY() - pb.y) / pb.height;

                    if (dir === 'east' || dir === 'west') setLinePinSideAndT(graph, c, dir, relY);
                    else setLinePinSideAndT(graph, c, dir, relX);
                }
            } finally {
                model.endUpdate();
            }
        });
    }

    NS.installPinGuards = installPinGuards;

    function installChipMinSizeGuards(graph) {
        if (!graph || graph.__dftsChipMinSizeGuardsInstalled) return;
        graph.__dftsChipMinSizeGuardsInstalled = true;

        graph.addListener(mxEvent.CELLS_RESIZED, function (sender, evt) {
            var cells = evt.getProperty('cells') || [];
            var model = graph.getModel();

            model.beginUpdate();
            try {
                for (var i = 0; i < cells.length; i++) {
                    var body = cells[i];
                    if (!isChipBody(graph, body)) continue;

                    if (NS.Symbol && typeof NS.Symbol.isSymbolBody === 'function' && NS.Symbol.isSymbolBody(body)) {
                        if (typeof NS.Symbol.relayout === 'function') NS.Symbol.relayout(graph, body);
                        continue;
                    }

                    var min = computeChipMinSize(graph, body);
                    var geo = body.geometry.clone();
                    var changed = false;

                    if (geo.width < min.minW) { geo.width = min.minW; changed = true; }
                    if (geo.height < min.minH) { geo.height = min.minH; changed = true; }

                    if (changed) model.setGeometry(body, geo);
                    if (NS.Symbol && typeof NS.Symbol.isSymbolBody === 'function' && NS.Symbol.isSymbolBody(body) && typeof NS.Symbol.relayout === 'function') {
                        NS.Symbol.relayout(graph, body);
                    }
                }
            } finally {
                model.endUpdate();
            }
        });
    }

    NS.installChipMinSizeGuards = installChipMinSizeGuards;

    function ensureGraphPatches(graph) {
        if (!graph || graph.__dftsCommonPatched) return;
        graph.__dftsCommonPatched = true;
        installResizeClamp(graph);
        installPinGuards(graph);
        installChipMinSizeGuards(graph);
    }

    NS.ensureGraphPatches = ensureGraphPatches;

    function createChipBody(graph, opt) {
        opt = opt || {};

        var label = opt.label;
        var dfts = opt.dfts || '';
        var w = opt.w || 260;
        var h = opt.h || 180;
        var rounded = opt.rounded || 0;
        var strokeWidth = opt.strokeWidth != null ? opt.strokeWidth : 1;
        var bodyFont = opt.bodyFont || 16;
        var pinFont = opt.pinFont || 16;
        var pins = cloneObj(opt.pins || { west: [], east: [], north: [], south: [] });
        var pinFontBySide = opt.pinFontBySide || {};
        var labelRotation = opt.labelRotation || 0;
        var labelVAlign = opt.labelVAlign || 'top';
        var labelSpacing = opt.labelSpacing || { left: 0, top: 0, right: 0, bottom: 0 };
        var hideBodyLabel = !!opt.hideBodyLabel;

        var bodyGeo = new mxGeometry(0, 0, w, h);
        var bodyStyle = [
            'dftsIP_chipBody=1',
            'shape=rectangle',
            'html=1',
            'whiteSpace=wrap',
            'connectable=0',
            'noLabel=' + (hideBodyLabel ? '1' : '0'),
            'rounded=' + rounded,
            'strokeWidth=' + strokeWidth,
            'fontSize=' + bodyFont,
            'rotation=' + labelRotation,
            'verticalAlign=' + (labelVAlign === 'middle' ? 'middle' : labelVAlign),
            'spacingLeft=' + (labelSpacing.left || 0),
            'spacingTop=' + (labelSpacing.top || 0),
            'spacingRight=' + (labelSpacing.right || 0),
            'spacingBottom=' + (labelSpacing.bottom || 0),
            'dftsIP_type=' + dfts,
            'dftsIP_orient=0',
            'dftsIP_category=' + (opt.category || ''),
            'dftsIP_labelPolicy=' + (opt.labelPolicy || ''),
            'dftsIP_instancePolicy=' + (opt.instancePolicy || ''),
            'dftsIP_configKey=' + (opt.configKey || ''),
            'dftsIP_defKey=' + (opt.defKey || ''),
            'dftsIP_lockBodyLabel=' + (opt.lockBodyLabel ? '1' : '0')
        ].join(';') + ';';

        var body = new mxCell(label, bodyGeo, bodyStyle);
        body.vertex = true;
        body.connectable = false;

        if (pins.west && pins.west.length) placeLinePins(graph, body, 'west', pins.west, { fontSize: pinFontBySide.west || pinFont });
        if (pins.east && pins.east.length) placeLinePins(graph, body, 'east', pins.east, { fontSize: pinFontBySide.east || pinFont });
        if (pins.north && pins.north.length) placeLinePins(graph, body, 'north', pins.north, { fontSize: pinFontBySide.north || pinFont });
        if (pins.south && pins.south.length) placeLinePins(graph, body, 'south', pins.south, { fontSize: pinFontBySide.south || pinFont });

        return body;
    }

    NS.createChipBody = createChipBody;

    function findInstanceLabelCell(graph, body) {
        var model = graph.getModel();
        if (!body) return null;
        for (var i = 0; i < model.getChildCount(body); i++) {
            var ch = model.getChildAt(body, i);
            if (isInstanceLabel(graph, ch)) return ch;
        }
        return null;
    }

    NS.findInstanceLabelCell = findInstanceLabelCell;

    function hasDuplicateInstanceName(graph, excludeBody, name) {
        name = trimOrEmpty(name);
        if (!name) return false;

        var bodies = getAllChipBodies(graph);
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];
            if (body === excludeBody) continue;
            var inst = findInstanceLabelCell(graph, body);
            if (!inst) continue;
            if (trimOrEmpty(getCellDisplayName(graph, inst)) === name) return true;
        }
        return false;
    }

    NS.hasDuplicateInstanceName = hasDuplicateInstanceName;

    function getNextInstanceName(graph, baseLabel) {
        var base = normalizeNameForId(baseLabel);
        var maxIndex = 0;
        var re = new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_inst_(\\d+)$', 'i');

        var bodies = getAllChipBodies(graph);
        for (var i = 0; i < bodies.length; i++) {
            var inst = findInstanceLabelCell(graph, bodies[i]);
            if (!inst) continue;
            var txt = trimOrEmpty(getCellDisplayName(graph, inst));
            var m = re.exec(txt);
            if (!m) continue;
            var idx = parseInt(m[1], 10);
            if (!isNaN(idx)) maxIndex = Math.max(maxIndex, idx);
        }

        return base + '_inst_' + (maxIndex + 1);
    }

    NS.getNextInstanceName = getNextInstanceName;

    function createInstanceLabelCell(graph, body, text) {
        var geo = new mxGeometry();
        geo.relative = true;

        var style = [
            'shape=label',
            'html=1',
            'whiteSpace=wrap',
            'connectable=0',
            'dftsIP_instanceLabel=1',
            'align=center',
            'verticalAlign=middle',
            'fontSize=14',
            'resizable=0',
            'rotatable=0'
        ].join(';');

        var cell = new mxCell(text, geo, style);
        cell.vertex = true;
        cell.connectable = false;
        body.insert(cell);

        syncInstanceLabelPosition(graph, body);
        return cell;
    }

    NS.createInstanceLabelCell = createInstanceLabelCell;

    function syncInstanceLabelPosition(graph, body) {
        var model = graph.getModel();
        if (!body || !body.geometry) return;

        var bw = body.geometry.width;
        var bh = body.geometry.height;
        var bs = graph.getCellStyle(body);
        var orient = parseInt(styleValue(bs, 'dftsIP_orient', '0'), 10) || 0;
        orient = ((orient % 360) + 360) % 360;

        for (var i = 0; i < model.getChildCount(body); i++) {
            var c = model.getChildAt(body, i);
            if (!isInstanceLabel(graph, c)) continue;

            var geo = c.geometry ? c.geometry.clone() : new mxGeometry();
            geo.relative = true;

            var gap = 6;
            var thickness = 24;
            var style = c.getStyle() || '';

            if (orient === 0) {
                geo.x = 0; geo.y = 1;
                geo.width = bw; geo.height = thickness;
                geo.offset = new mxPoint(0, gap);
                style = mxUtils.setStyle(style, 'rotation', '0');
            } else if (orient === 90) {
                geo.x = 1; geo.y = 0;
                geo.width = thickness; geo.height = bh;
                geo.offset = new mxPoint(gap, 0);
                style = mxUtils.setStyle(style, 'rotation', '90');
            } else if (orient === 180) {
                geo.x = 0; geo.y = 0;
                geo.width = bw; geo.height = thickness;
                geo.offset = new mxPoint(0, -(thickness + gap));
                style = mxUtils.setStyle(style, 'rotation', '180');
            } else {
                geo.x = 0; geo.y = 0;
                geo.width = thickness; geo.height = bh;
                geo.offset = new mxPoint(-(thickness + gap), 0);
                style = mxUtils.setStyle(style, 'rotation', '270');
            }

            model.setGeometry(c, geo);
            model.setStyle(c, style);
        }
    }

    NS.syncInstanceLabelPosition = syncInstanceLabelPosition;

    function ensureInstanceLabel(graph, body, opt) {
        opt = opt || {};
        var explicit = trimOrEmpty(opt.instanceName);
        if (explicit && hasDuplicateInstanceName(graph, body, explicit)) {
            rejectCreate('实例名已存在：' + explicit);
        }

        var finalName = explicit || getNextInstanceName(graph, opt.baseLabel || getCellDisplayName(graph, body));
        var labelCell = findInstanceLabelCell(graph, body);

        if (labelCell) {
            graph.getModel().setValue(labelCell, finalName);
            syncInstanceLabelPosition(graph, body);
            return labelCell;
        }

        return createInstanceLabelCell(graph, body, finalName);
    }

    NS.ensureInstanceLabel = ensureInstanceLabel;

    function installInstanceFollow(ui) {
        var realUi = ui && ui.editor ? ui : (ui && ui.editorUi ? ui.editorUi : null);
        if (!realUi || !realUi.editor || !realUi.editor.graph) return;

        var graph = realUi.editor.graph;
        if (graph.__dftsInstanceFollowInstalled) return;
        graph.__dftsInstanceFollowInstalled = true;

        function handle(cells) {
            var model = graph.getModel();
            model.beginUpdate();
            try {
                for (var i = 0; i < cells.length; i++) {
                    var body = cells[i];
                    if (isChipBody(graph, body)) syncInstanceLabelPosition(graph, body);
                }
            } finally {
                model.endUpdate();
            }
        }

        graph.addListener(mxEvent.CELLS_MOVED, function (sender, evt) {
            handle(evt.getProperty('cells') || []);
        });

        graph.addListener(mxEvent.CELLS_RESIZED, function (sender, evt) {
            handle(evt.getProperty('cells') || []);
        });
    }

    NS.installInstanceFollow = installInstanceFollow;

    function installEditingPolicy(ui) {
        var realUi = ui && ui.editor ? ui : (ui && ui.editorUi ? ui.editorUi : null);
        if (!realUi || !realUi.editor || !realUi.editor.graph) return;

        var graph = realUi.editor.graph;
        if (graph.__dftsEditingPolicyInstalled) return;
        graph.__dftsEditingPolicyInstalled = true;

        var _isCellEditable = graph.isCellEditable;
        graph.isCellEditable = function (cell) {
            if (isInstanceLabel(this, cell)) return true;
            if (isChipBody(this, cell)) {
                var s = this.getCellStyle(cell);
                return styleValue(s, 'dftsIP_lockBodyLabel', '0') !== '1';
            }
            return _isCellEditable.apply(this, arguments);
        };

        var _labelChanged = graph.labelChanged;
        graph.labelChanged = function (cell, value, evt) {
            if (isChipBody(this, cell)) {
                var s = this.getCellStyle(cell);
                if (styleValue(s, 'dftsIP_lockBodyLabel', '0') === '1') return;
            }
            return _labelChanged.apply(this, arguments);
        };

        graph.addListener(mxEvent.CLICK, function (sender, evt) {
            var cell = evt.getProperty('cell');
            if (isInstanceLabel(graph, cell)) {
                graph.startEditingAtCell(cell);
                evt.consume();
            }
        });
    }

    NS.installEditingPolicy = installEditingPolicy;

    function registerConfigOpener(configKey, fn) {
        if (!configKey || typeof fn !== 'function') return;
        NS._configOpeners[configKey] = fn;
    }

    function openIpConfig(graph, body) {
        if (!body) return;
        var s = graph.getCellStyle(body);
        var key = styleValue(s, 'dftsIP_configKey', '');
        var fn = NS._configOpeners[key];

        if (typeof fn === 'function') return fn(graph, body);

        if (NS.Symbol && typeof NS.Symbol.isSymbolBody === 'function' && NS.Symbol.isSymbolBody(body) && typeof NS.Symbol.openPinLayoutEditor === 'function') {
            return NS.Symbol.openPinLayoutEditor(null, body, graph);
        }

        if (typeof mxUtils !== 'undefined' && mxUtils.alert) {
            mxUtils.alert('当前 IP 暂未注册配置界面：' + (key || '(none)'));
        }
    }

    NS.registerConfigOpener = registerConfigOpener;
    NS.openIpConfig = openIpConfig;

    function installConfigAction(ui) {
        var realUi = ui && ui.editor ? ui : (ui && ui.editorUi ? ui.editorUi : null);
        if (!realUi || !realUi.editor || !realUi.editor.graph || !realUi.actions) return;
        if (realUi.__dftsConfigActionInstalled) return;
        realUi.__dftsConfigActionInstalled = true;

        var graph = realUi.editor.graph;

        realUi.actions.addAction('openSelectedDftsIpConfig', function () {
            var sel = graph.getSelectionCell();
            var body = findChipBodyForCell(graph, sel);
            if (!body) {
                if (typeof mxUtils !== 'undefined' && mxUtils.alert) mxUtils.alert('请先选中一个 IP。');
                return;
            }
            openIpConfig(graph, body);
        });
    }

    NS.installConfigAction = installConfigAction;

    function registerDefinition(def) {
        if (!def || !def.key || !def.dftsType) {
            throw new Error('registerDefinition 缺少 key / dftsType');
        }
        NS._defsByKey[def.key] = def;
        NS._defsByType[def.dftsType] = def;
        return def;
    }

    NS.registerDefinition = registerDefinition;

    function resolveBodyLabel(graph, def, runtimeOpt) {
        var policy = def.labelPolicy || NS.POLICY.LABEL_FIXED;
        var userLabel = trimOrEmpty(runtimeOpt && runtimeOpt.label);

        if (policy === NS.POLICY.LABEL_FIXED) {
            return def.defaultLabel || def.key;
        }

        if (policy === NS.POLICY.LABEL_USER_OR_DEFAULT) {
            return userLabel || def.defaultLabel || def.key;
        }

        if (policy === NS.POLICY.LABEL_USER_OR_AUTO_INCREMENT) {
            if (userLabel) {
                if (hasBodyLabel(graph, userLabel, null)) {
                    rejectCreate('IP 名称已存在：' + userLabel);
                }
                return userLabel;
            }
            return getNextAutoLabel(graph, def.autoLabelPrefix || def.defaultLabel || def.key);
        }

        return userLabel || def.defaultLabel || def.key;
    }

    function buildPinsFromDefinition(def, runtimeOpt) {
        if (typeof def.pinsFactory === 'function') {
            return def.pinsFactory(runtimeOpt || {}, def) || {};
        }
        return cloneObj(def.pins || {});
    }

    function createByDefinition(graph, def, runtimeOpt) {
        runtimeOpt = runtimeOpt || {};
        ensureGraphPatches(graph);

        var label = resolveBodyLabel(graph, def, runtimeOpt);
        var symbolEnabled = !!(
            NS.Symbol &&
            typeof NS.Symbol.createFromDefinition === 'function' &&
            (def.useSymbolEngine === true || def.category === NS.CATEGORY.FUNCTIONAL || def.category === NS.CATEGORY.THIRD_PARTY || def.category === 'third_party_ip')
        );

        var body;
        if (symbolEnabled) {
            body = NS.Symbol.createFromDefinition(graph, def, Object.assign({}, runtimeOpt, { resolvedBodyLabel: label }));
        } else {
            body = createChipBody(graph, {
                label: label,
                dfts: def.dftsType,
                category: def.category,
                labelPolicy: def.labelPolicy,
                instancePolicy: def.instancePolicy,
                configKey: def.configKey || '',
                defKey: def.key,
                lockBodyLabel: !!def.lockBodyLabel,
                w: runtimeOpt.w || def.w || 260,
                h: runtimeOpt.h || def.h || 180,
                rounded: (runtimeOpt.rounded != null) ? runtimeOpt.rounded : (def.rounded || 0),
                strokeWidth: (runtimeOpt.strokeWidth != null) ? runtimeOpt.strokeWidth : ((def.strokeWidth != null) ? def.strokeWidth : 1),
                bodyFont: runtimeOpt.bodyFont || def.bodyFont || 16,
                pinFont: runtimeOpt.pinFont || def.pinFont || 16,
                pinFontBySide: Object.assign({}, def.pinFontBySide || {}, runtimeOpt.pinFontBySide || {}),
                labelRotation: (runtimeOpt.labelRotation != null) ? runtimeOpt.labelRotation : (def.labelRotation || 0),
                labelVAlign: runtimeOpt.labelVAlign || def.labelVAlign || 'top',
                labelSpacing: Object.assign({}, def.labelSpacing || {}, runtimeOpt.labelSpacing || {}),
                pins: buildPinsFromDefinition(def, Object.assign({}, runtimeOpt, { resolvedBodyLabel: label }))
            });

            var policy = def.instancePolicy || NS.POLICY.INSTANCE_DISABLED;
            if (policy === NS.POLICY.INSTANCE_REQUIRED) {
                ensureInstanceLabel(graph, body, {
                    instanceName: runtimeOpt.instanceName,
                    baseLabel: def.instanceBaseName || def.defaultLabel || label
                });
            } else if (policy === NS.POLICY.INSTANCE_OPTIONAL) {
                if (runtimeOpt.createInstance || trimOrEmpty(runtimeOpt.instanceName)) {
                    ensureInstanceLabel(graph, body, {
                        instanceName: runtimeOpt.instanceName,
                        baseLabel: def.instanceBaseName || def.defaultLabel || label
                    });
                }
            }
        }

        if (typeof def.afterCreate === 'function') {
            def.afterCreate(graph, body, runtimeOpt, { resolvedBodyLabel: label });
        }

        return body;
    }

    NS.createByDefinition = createByDefinition;

    function createByKey(graph, key, runtimeOpt) {
        var def = NS._defsByKey[key];
        if (!def) throw new Error('未注册的 IP key：' + key);
        return createByDefinition(graph, def, runtimeOpt);
    }

    function createByType(graph, dftsType, runtimeOpt) {
        var def = NS._defsByType[dftsType];
        if (!def) throw new Error('未注册的 dftsType：' + dftsType);
        return createByDefinition(graph, def, runtimeOpt);
    }

    NS.createByKey = createByKey;
    NS.createByType = createByType;

    function makeCreateFn(key) {
        return function (graph, opt) {
            try {
                return createByKey(graph, key, opt || {});
            } catch (e) {
                if (typeof console !== 'undefined' && console.error) {
                    console.error('[DftsIP] create failed:', key, e);
                }
                return null;
            }
        };
    }

    NS.makeCreateFn = makeCreateFn;

    function setLinePinSideAndT(graph, pin, side, t, opt) {
        var model = graph.getModel();
        opt = opt || {};

        var g0 = pin.geometry || new mxGeometry();
        var sideOld = getPinSide(graph, pin);
        var tOld = getPinT(graph, pin);
        side = side || sideOld;
        t = (typeof t === 'number') ? clamp01(t) : tOld;

        var len = (opt.len != null) ? Math.max(16, parseInt(opt.len, 10) || 26) : Math.max(g0.width || 26, g0.height || 26);
        var thick = (opt.thick != null)
            ? Math.max(6, parseInt(opt.thick, 10) || 8)
            : Math.min(g0.width || 8, g0.height || 8);

        // 用当前 dftsIP_busWidth 继续推断
        var style = graph.getCellStyle(pin);
        var bw = (opt.busWidth != null) ? (parseInt(opt.busWidth, 10) || 1) : (parseInt(styleValue(style, 'dftsIP_busWidth', '1'), 10) || 1);
        var strokeWidth = inferPinStrokeWidth(Object.assign({}, opt, { busWidth: bw }));

        if (opt.thick == null && (styleValue(style, 'dftsIP_isBus', '0') === '1' || bw > 1)) {
            thick = Math.max(thick, 12);
        }

        var g = calcPinGeometry(side, t, len, thick);
        model.setGeometry(pin, g);

        graph.setCellStyles('portDir', side, [pin]);
        graph.setCellStyles('dftsIP_pin_location', side, [pin]);
        graph.setCellStyles('dftsIP_busWidth', String(bw), [pin]);
        graph.setCellStyles('dftsIP_isBus', String(bw > 1 ? 1 : 0), [pin]);
        graph.setCellStyles('strokeWidth', String(strokeWidth), [pin]);

        var newStyle = pin.getStyle() || '';
        newStyle = mxUtils.setStyle(newStyle, 'direction', (side === 'north' || side === 'south') ? 'north' : 'east');
        newStyle = newStyle.replace(/points=\[\[[^\]]+\]\];?/g, '');
        newStyle = newStyle + (newStyle.endsWith(';') ? '' : ';') + pinPointsStyle(side);
        model.setStyle(pin, newStyle);

        var labelCell = findPinLabelCell(graph, pin);
        if (labelCell) {
            var spacing = 8;
            if (labelCell.geometry && labelCell.geometry.offset) {
                spacing = Math.max(
                    Math.abs(labelCell.geometry.offset.x || 0),
                    Math.abs(labelCell.geometry.offset.y || 0),
                    8
                );
            }
            if (opt.spacing != null) spacing = Math.max(0, parseInt(opt.spacing, 10) || 0);

            model.setGeometry(labelCell, pinLabelLayout(side, spacing));

            var ls = labelCell.getStyle() || '';
            ls = mxUtils.setStyle(ls, 'rotation', (side === 'north' || side === 'south') ? '90' : '0');
            ls = ls.replace(/align=[^;]*;?/g, '').replace(/verticalAlign=[^;]*;?/g, '');
            ls = ls + (ls.endsWith(';') ? '' : ';') + pinLabelAlign(side);
            model.setStyle(labelCell, ls);
        }
    }

    NS.setLinePinSideAndT = setLinePinSideAndT;

    function applyPinConfig(graph, body, pinConfigMap) {
        if (!body || !pinConfigMap) return;

        var model = graph.getModel();
        var pins = getChipPins(graph, body);

        model.beginUpdate();
        try {
            for (var i = 0; i < pins.length; i++) {
                var pin = pins[i];
                var s = graph.getCellStyle(pin);
                var key = styleValue(s, 'dftsIP_pinKey', '');
                if (!key || !pinConfigMap.hasOwnProperty(key)) continue;

                var cfg = pinConfigMap[key] || {};

                if (cfg.visible != null) {
                    model.setVisible(pin, !!cfg.visible);
                }

                if (cfg.name != null) {
                    setPinLabelText(graph, pin, cfg.name);
                }

                var nextSide = cfg.side || getPinSide(graph, pin);
                var nextT = (typeof cfg.t === 'number') ? cfg.t : getPinT(graph, pin);
                setLinePinSideAndT(graph, pin, nextSide, nextT, cfg);
            }
        } finally {
            model.endUpdate();
        }
    }

    NS.applyPinConfig = applyPinConfig;

})(this);
