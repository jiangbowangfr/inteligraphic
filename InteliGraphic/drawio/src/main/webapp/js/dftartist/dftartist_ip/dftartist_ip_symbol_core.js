(function (global) {
    'use strict';

    var NS = global.DftsIP = global.DftsIP || {};
    var SYM = NS.Symbol = NS.Symbol || {};
    if (SYM.__externalPinsRendererLoaded) return;
    SYM.__externalPinsRendererLoaded = true;

    var DEFAULTS = {
        fontSize: 16,
        titleFontSize: 22,
        instanceFontSize: 14,
        bodyPaddingX: 18,
        bodyPaddingY: 12,
        titlePadding: 12,
        pinRowPitch: 32,
        pinStub: 26,
        labelGap: 8,
        instanceGap: 10,
        minBodyWidth: 120,
        minBodyHeight: 56,
        minScale: 0.25,
        maxScale: 3
    };

    function toStr(v) { return v == null ? '' : String(v); }
    function trim(v) { return toStr(v).replace(/^\s+|\s+$/g, ''); }
    function clone(v) { return v ? JSON.parse(JSON.stringify(v)) : v; }
    function clamp(v, a, b) { v = Number(v); if (isNaN(v)) v = a; return Math.max(a, Math.min(b, v)); }
    function encodeModel(model) {
        try { return encodeURIComponent(JSON.stringify(model || {})); } catch (e) { return ''; }
    }
    function decodeModel(text) {
        try { return normalizeModel(JSON.parse(decodeURIComponent(text || ''))); } catch (e) { return null; }
    }
    function readStyleValue(style, key) {
        style = toStr(style);
        if (!style) return '';
        var re = new RegExp('(?:^|;)' + escRe(key) + '=([^;]*)');
        var m = re.exec(style);
        return m ? m[1] : '';
    }
    function escRe(s) { return toStr(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function safeGeo(cell) {
        var g = cell && cell.geometry;
        if (g && typeof g.clone === 'function') return g.clone();
        return new mxGeometry(0, 0, 200, 100);
    }
    function estimateTextWidth(text, fontSize) {
        text = toStr(text).replace(/\n/g, ' ');
        fontSize = Number(fontSize) || DEFAULTS.fontSize;
        return Math.max(10, Math.ceil(text.length * fontSize * 0.58));
    }
    function normalizeDir(dir) {
        dir = trim(dir).toLowerCase();
        if (dir === 'in') return 'input';
        if (dir === 'out') return 'output';
        return dir || 'input';
    }
    function normalizeSide(side) {
        side = trim(side).toLowerCase();
        if (side === 'left' || side === 'w') return 'west';
        if (side === 'right' || side === 'e') return 'east';
        if (side === 'top' || side === 'n') return 'north';
        if (side === 'bottom' || side === 's') return 'south';
        if (side === 'west' || side === 'east' || side === 'north' || side === 'south') return side;
        return 'east';
    }
    function defaultSideForDir(dir) {
        dir = normalizeDir(dir);
        if (dir === 'input') return 'west';
        if (dir === 'output') return 'east';
        if (dir === 'inout') return 'south';
        return 'east';
    }
    function pinKey(name, idx) {
        var out = trim(name).replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
        return out || ('pin_' + idx);
    }
    function isBus(pin) {
        var range = trim(pin && pin.range);
        if (range) return true;
        var w = Number(pin && pin.busWidth);
        return !isNaN(w) && w > 1;
    }
    function pinText(pin) {
        var base = trim(pin.displayName || pin.name);
        var range = trim(pin.range || '');
        return base + (range ? range : '');
    }

    function normalizePin(pin, idx, fallbackSide) {
        pin = pin || {};
        return {
            key: trim(pin.key || pin.pinKey) || pinKey(pin.name, idx),
            name: trim(pin.name) || ('pin_' + idx),
            displayName: trim(pin.displayName || ''),
            dir: normalizeDir(pin.dir || pin.direction || ''),
            range: trim(pin.range || pin.bus || ''),
            busWidth: pin.busWidth != null ? Number(pin.busWidth) : undefined,
            side: normalizeSide(pin.side || pin.location || fallbackSide || defaultSideForDir(pin.dir || pin.direction || '')),
            order: Number.isFinite(pin.order) ? pin.order : idx,
            visible: pin.visible !== false,
            manualPlaced: !!pin.manualPlaced,
            type: trim(pin.type || '')
        };
    }

    function normalizePinsFromLegacy(pinsLegacy) {
        var out = [];
        pinsLegacy = pinsLegacy || {};
        ['west', 'east', 'north', 'south'].forEach(function (side) {
            var arr = Array.isArray(pinsLegacy[side]) ? pinsLegacy[side] : [];
            for (var i = 0; i < arr.length; i++) {
                var it = arr[i];
                if (typeof it === 'string') it = { name: it };
                out.push(normalizePin(it, out.length, side));
            }
        });
        return out;
    }

    function normalizeModel(model) {
        model = model || {};
        var pins = Array.isArray(model.pins) ? model.pins : normalizePinsFromLegacy(model.pinsLegacy || {});
        var normalizedPins = [];
        for (var i = 0; i < pins.length; i++) normalizedPins.push(normalizePin(pins[i], i));

        return {
            version: '3',
            title: trim(model.title || model.label || model.moduleName || 'IP'),
            instanceName: trim(model.instanceName || ''),
            dftsType: trim(model.dftsType || ''),
            category: trim(model.category || ''),
            rounded: Number(model.rounded || 0),
            strokeWidth: model.strokeWidth != null ? Number(model.strokeWidth) : 1,
            bodyShape: trim(model.bodyShape || 'rectangle'),
            bodyExtraStyle: trim(model.bodyExtraStyle || ''),
            hidePinLabels: !!model.hidePinLabels,
            transform: {
                rotation: Number(model.transform && model.transform.rotation) || 0
            },
            scale: model.scale != null ? Number(model.scale) : 1,
            layout: {
                fontSize: Number((model.layout && model.layout.fontSize) || DEFAULTS.fontSize),
                titleFontSize: Number((model.layout && model.layout.titleFontSize) || DEFAULTS.titleFontSize),
                instanceFontSize: Number((model.layout && model.layout.instanceFontSize) || DEFAULTS.instanceFontSize),
                bodyPaddingX: Number((model.layout && model.layout.bodyPaddingX) || DEFAULTS.bodyPaddingX),
                bodyPaddingY: Number((model.layout && model.layout.bodyPaddingY) || DEFAULTS.bodyPaddingY),
                titlePadding: Number((model.layout && model.layout.titlePadding) || DEFAULTS.titlePadding),
                pinRowPitch: Number((model.layout && model.layout.pinRowPitch) || DEFAULTS.pinRowPitch),
                pinStub: Number((model.layout && model.layout.pinStub) || DEFAULTS.pinStub),
                labelGap: Number((model.layout && model.layout.labelGap) || DEFAULTS.labelGap),
                instanceGap: Number((model.layout && model.layout.instanceGap) || DEFAULTS.instanceGap),
                minBodyWidth: Number((model.layout && model.layout.minBodyWidth) || DEFAULTS.minBodyWidth),
                minBodyHeight: Number((model.layout && model.layout.minBodyHeight) || DEFAULTS.minBodyHeight)
            },
            pins: normalizedPins
        };
    }

    function isSymbolBody(body) {
        if (!body) return false;
        return !!getModel(body);
    }
    function getModel(body) {
        if (!body) return null;
        if (body.__dftsSymbolModel) return body.__dftsSymbolModel;
        var encoded = readStyleValue(body.style || '', 'dftsIP_symbolModel');
        if (!encoded) return null;
        var parsed = decodeModel(encoded);
        if (parsed) body.__dftsSymbolModel = parsed;
        return parsed;
    }
    function setModel(body, model) {
        if (!body) return null;
        body.__dftsSymbolModel = normalizeModel(model);
        return body.__dftsSymbolModel;
    }

    function groupPins(model, includeHidden) {
        var grouped = { west: [], east: [], north: [], south: [] };
        (model.pins || []).forEach(function (pin) {
            if (!includeHidden && pin.visible === false) return;
            grouped[normalizeSide(pin.side)].push(pin);
        });
        ['west', 'east', 'north', 'south'].forEach(function (side) {
            grouped[side] = grouped[side].slice().sort(function (a, b) {
                if ((a.order || 0) !== (b.order || 0)) return (a.order || 0) - (b.order || 0);
                return toStr(a.name).localeCompare(toStr(b.name));
            });
            for (var i = 0; i < grouped[side].length; i++) grouped[side][i].order = i;
        });
        return grouped;
    }

    function computeNaturalMetrics(model) {
        model = normalizeModel(model);
        var grouped = groupPins(model, true);
        var visibleGrouped = groupPins(model, false);
        var l = model.layout;
        var rows = Math.max(grouped.west.length, grouped.east.length, 1);

        var maxWestLabel = 0, maxEastLabel = 0, maxNorthLabel = 0, maxSouthLabel = 0;
        if (!model.hidePinLabels) {
            visibleGrouped.west.forEach(function (p) { maxWestLabel = Math.max(maxWestLabel, estimateTextWidth(pinText(p), l.fontSize)); });
            visibleGrouped.east.forEach(function (p) { maxEastLabel = Math.max(maxEastLabel, estimateTextWidth(pinText(p), l.fontSize)); });
        }
        visibleGrouped.north.forEach(function (p) { maxNorthLabel = Math.max(maxNorthLabel, estimateTextWidth(pinText(p), l.fontSize)); });
        visibleGrouped.south.forEach(function (p) { maxSouthLabel = Math.max(maxSouthLabel, estimateTextWidth(pinText(p), l.fontSize)); });

        var titleW = estimateTextWidth(model.title, l.titleFontSize);
        var titleH = Math.ceil(l.titleFontSize * 1.2);
        var leftTextW = (!model.hidePinLabels && visibleGrouped.west.length) ? maxWestLabel : 0;
        var rightTextW = (!model.hidePinLabels && visibleGrouped.east.length) ? maxEastLabel : 0;
        var leftColW = leftTextW > 0 ? (l.labelGap + leftTextW + 4) : 0;
        var rightColW = rightTextW > 0 ? (l.labelGap + rightTextW + 4) : 0;
        var centerMinW = Math.max(56, Math.min(titleW + l.titlePadding * 2, Math.max(56, Math.ceil(titleW * 0.62))));

        var naturalW = Math.max(
            l.minBodyWidth,
            l.bodyPaddingX * 2 + leftColW + centerMinW + rightColW,
            92 + Math.max(grouped.north.length, grouped.south.length) * Math.max(20, Math.ceil(l.fontSize * 0.82))
        );

        var rowH = Math.max(titleH + l.titlePadding * 2, rows * l.pinRowPitch);
        var naturalH = Math.max(
            l.minBodyHeight,
            l.bodyPaddingY * 2 + rowH
        );

        return {
            grouped: grouped,
            visibleGrouped: visibleGrouped,
            naturalW: Math.ceil(naturalW),
            naturalH: Math.ceil(naturalH),
            maxWestLabel: maxWestLabel,
            maxEastLabel: maxEastLabel,
            maxNorthLabel: maxNorthLabel,
            maxSouthLabel: maxSouthLabel
        };
    }

    function computeLayout(model, bodyW, bodyH) {
        model = normalizeModel(model);
        var metrics = computeNaturalMetrics(model);
        var l = model.layout;
        var reqW = Math.max(36, Number(bodyW) || metrics.naturalW);
        var reqH = Math.max(24, Number(bodyH) || metrics.naturalH);
        var sx = reqW / Math.max(metrics.naturalW, 1);
        var sy = reqH / Math.max(metrics.naturalH, 1);
        var scale = clamp(Math.min(sx, sy), DEFAULTS.minScale, DEFAULTS.maxScale);
        model.scale = scale;

        var bodyW2 = Math.max(36, reqW);
        var bodyH2 = Math.max(24, reqH);
        var bodyPaddingX = Math.max(4, Math.round(l.bodyPaddingX * scale));
        var bodyPaddingY = Math.max(3, Math.round(l.bodyPaddingY * scale));
        var titlePadding = Math.max(4, Math.round(l.titlePadding * scale));
        var pinStub = Math.max(8, Math.round(l.pinStub * scale));
        var labelGap = Math.max(3, Math.round(l.labelGap * scale));
        var instanceGap = Math.max(3, Math.round(l.instanceGap * scale));
        var fontSize = Math.max(3, Math.round(l.fontSize * scale));
        var titleFontSize = Math.max(1, Math.round(l.titleFontSize * scale));
        var instanceFontSize = Math.max(4, Math.round(l.instanceFontSize * scale));

        var maxWestLabel = 0, maxEastLabel = 0;
        if (!model.hidePinLabels) {
            metrics.visibleGrouped.west.forEach(function (p) { maxWestLabel = Math.max(maxWestLabel, estimateTextWidth(pinText(p), fontSize)); });
            metrics.visibleGrouped.east.forEach(function (p) { maxEastLabel = Math.max(maxEastLabel, estimateTextWidth(pinText(p), fontSize)); });
        }
        var leftTextW = (!model.hidePinLabels && metrics.visibleGrouped.west.length) ? maxWestLabel : 0;
        var rightTextW = (!model.hidePinLabels && metrics.visibleGrouped.east.length) ? maxEastLabel : 0;
        var leftColW = leftTextW > 0 ? (labelGap + leftTextW + 2) : 0;
        var rightColW = rightTextW > 0 ? (labelGap + rightTextW + 2) : 0;

        var innerW = Math.max(16, bodyW2 - bodyPaddingX * 2);
        var centerW = Math.max(12, innerW - leftColW - rightColW);
        var availH = Math.max(12, bodyH2 - bodyPaddingY * 2);
        var rows = Math.max(metrics.grouped.west.length, metrics.grouped.east.length, 1);
        var pinRowPitchPref = Math.max(10, Math.round(l.pinRowPitch * scale));
        var pinRowPitch = Math.max(Math.max(6, Math.ceil(fontSize * 1.02)), Math.min(pinRowPitchPref, Math.floor(availH / rows)));
        var gateInfo = getLogicGateInfo(model);
        var usedSideH = pinRowPitch * rows;
        var westTop = Math.round(bodyPaddingY + Math.max(0, (availH - usedSideH) / 2));
        var eastTop = westTop;
        if (gateInfo.enabled) {
            var westRowsOwn = Math.max(metrics.grouped.west.length, 1);
            var eastRowsOwn = Math.max(metrics.grouped.east.length, 1);
            westTop = Math.round(bodyPaddingY + Math.max(0, (availH - pinRowPitch * westRowsOwn) / 2));
            eastTop = Math.round(bodyPaddingY + Math.max(0, (availH - pinRowPitch * eastRowsOwn) / 2));
        }
        var northLeft = bodyPaddingX + Math.max(0, Math.round((innerW - metrics.grouped.north.length * pinRowPitch) / 2));
        var southLeft = bodyPaddingX + Math.max(0, Math.round((innerW - metrics.grouped.south.length * pinRowPitch) / 2));

        var titleChars = Math.max(1, trim(model.title).length);
        var horizMaxByW = Math.max(1, Math.floor((Math.max(8, centerW) - 4) / Math.max(titleChars * 0.58, 1)));
        var horizMaxByH = Math.max(1, Math.floor((Math.max(8, availH) - 4) / 1.2));
        var horizFont = Math.max(1, Math.min(titleFontSize, horizMaxByW, horizMaxByH));
        var vertMaxByH = Math.max(1, Math.floor((Math.max(8, availH) - 4) / Math.max(titleChars * 0.58, 1)));
        var vertMaxByW = Math.max(1, Math.floor((Math.max(8, centerW) - 4) / 1.2));
        var vertFont = Math.max(1, Math.min(titleFontSize, vertMaxByH, vertMaxByW));
        var verticalTitle = (horizFont < Math.max(3, Math.floor(titleFontSize * 0.55)) && vertFont >= horizFont) || (bodyH2 > bodyW2 * 1.18 && centerW < Math.max(40, bodyW2 * 0.42));
        var titleFontSizeEff = verticalTitle ? vertFont : horizFont;
        var titleTextW = estimateTextWidth(model.title, titleFontSizeEff);
        var titleTextH = Math.ceil(titleFontSizeEff * 1.2);
        var titleBoxW = verticalTitle ? Math.max(8, Math.min(centerW, Math.ceil(titleTextH * 1.15))) : Math.max(8, Math.min(centerW, titleTextW + 6));
        var titleBoxH = verticalTitle ? Math.max(8, Math.min(availH, titleTextW + 4)) : Math.max(8, Math.min(availH, Math.ceil(titleTextH * 1.15)));

        var centerLeftX = bodyPaddingX + leftColW;
        var centerRightX = bodyW2 - bodyPaddingX - rightColW;
        var pinPos = {};
        metrics.grouped.west.forEach(function (p, i) {
            pinPos[p.key] = { side: 'west', x: 0, y: centeredSideCoord(metrics.grouped.west.length, i, pinRowPitch, availH, bodyPaddingY) };
        });
        metrics.grouped.east.forEach(function (p, i) {
            pinPos[p.key] = { side: 'east', x: bodyW2, y: centeredSideCoord(metrics.grouped.east.length, i, pinRowPitch, availH, bodyPaddingY) };
        });
        metrics.grouped.north.forEach(function (p, i) {
            pinPos[p.key] = { side: 'north', x: centeredSideCoord(metrics.grouped.north.length, i, pinRowPitch, innerW, bodyPaddingX), y: 0 };
        });
        metrics.grouped.south.forEach(function (p, i) {
            pinPos[p.key] = { side: 'south', x: centeredSideCoord(metrics.grouped.south.length, i, pinRowPitch, innerW, bodyPaddingX), y: bodyH2 };
        });

        var minW = Math.max(24, Math.ceil(Math.min(metrics.naturalW * DEFAULTS.minScale, 140)));
        var minH = Math.max(16, Math.ceil(Math.min(metrics.naturalH * DEFAULTS.minScale, 80)));

        return {
            grouped: metrics.grouped,
            naturalW: metrics.naturalW,
            naturalH: metrics.naturalH,
            minW: minW,
            minH: minH,
            bodyW: bodyW2,
            bodyH: bodyH2,
            scale: scale,
            bodyPaddingX: bodyPaddingX,
            bodyPaddingY: bodyPaddingY,
            titlePadding: titlePadding,
            pinRowPitch: pinRowPitch,
            pinStub: pinStub,
            labelGap: labelGap,
            instanceGap: instanceGap,
            fontSize: fontSize,
            titleFontSize: titleFontSizeEff,
            titleTextW: titleTextW,
            titleTextH: titleTextH,
            titleBoxW: titleBoxW,
            titleBoxH: titleBoxH,
            instanceFontSize: instanceFontSize,
            instanceH: model.instanceName ? Math.ceil(instanceFontSize * 1.2) : 0,
            verticalTitle: verticalTitle,
            pinPos: pinPos,
            leftTextW: leftTextW,
            rightTextW: rightTextW,
            leftColW: leftColW,
            rightColW: rightColW,
            centerLeftX: centerLeftX,
            centerRightX: centerRightX,
            centerW: Math.max(12, centerRightX - centerLeftX)
        };
    }

    function computeBodyMinSize(graph, body) {
        var model = getModel(body);
        if (!model) return { minW: 36, minH: 24 };
        var layout = computeLayout(model);
        return { minW: layout.minW, minH: layout.minH };
    }

    function hasVisiblePins(model) {
        var pins = (model && model.pins) || [];
        for (var i = 0; i < pins.length; i++) {
            if (pins[i] && pins[i].visible !== false) return true;
        }
        return false;
    }

    function useNativeBodyConnectionPoints(model) {
        return !hasVisiblePins(model);
    }

    function bodyStyle(model, extra) {
        var encodedModel = encodeModel(model);
        var nativeBodyConnect = useNativeBodyConnectionPoints(model);
        var parts = [
            'dftsIP_chipBody=1',
            'dftsIP_symbol=1',
            'shape=' + (model.bodyShape || 'rectangle'),
            'html=1',
            'whiteSpace=wrap',
            'connectable=' + (nativeBodyConnect ? '1' : '0'),
            'noLabel=1',
            'rounded=' + (model.rounded || 0),
            'strokeWidth=' + (model.strokeWidth != null ? model.strokeWidth : 1),
            'dftsIP_type=' + (model.dftsType || ''),
            'dftsIP_orient=' + (model.transform && model.transform.rotation || 0),
            'dftsIP_symbolModel=' + encodedModel
        ];
        if (nativeBodyConnect) {
            parts.push('outlineConnect=1');
        }
        if (model.bodyExtraStyle) parts.push(model.bodyExtraStyle);
        if (extra) parts.push(extra);
        return parts.join(';') + ';';
    }

    function textStyle(fontSize, align, bold, rotation, overflowMode) {
        return [
            'shape=text',
            'html=1',
            'whiteSpace=nowrap',
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
            'fontSize=' + (fontSize || DEFAULTS.fontSize),
            'fontStyle=' + (bold ? '1' : '0'),
            'overflow=' + (overflowMode || 'visible'),
            'rotation=' + (rotation || 0),
            'dftsIP_symbolLabel=1'
        ].join(';') + ';';
    }

    function stubStyle(side, pin) {
        side = normalizeSide(side);
        var point = '[[0.5,0.5,0,0,0]]';
        if (side === 'west') point = '[[0,0.5,0,0,0]]';
        else if (side === 'east') point = '[[1,0.5,0,0,0]]';
        else if (side === 'north') point = '[[0.5,0,0,0,0]]';
        else if (side === 'south') point = '[[0.5,1,0,0,0]]';

        return [
            'shape=rectangle',
            'fillOpacity=0',
            'fillColor=none',
            'strokeColor=#111111',
            'strokeWidth=' + (isBus(pin) ? 3 : 1),
            'connectable=1',
            'pointerEvents=1',
            'resizable=0',
            'movable=0',
            'rotatable=0',
            'deletable=0',
            'editable=0',
            'selectable=0',
            'perimeter=none',
            'outlineConnect=0',
            'points=' + point,
            'portConstraint=' + side,
            'dftsIP_symbolStub=1',
            'dftsIP_symbolSide=' + side
        ].join(';') + ';';
    }

    function portStyle(side) {
        return [
            'shape=ellipse',
            'opacity=0',
            'fillOpacity=0',
            'strokeOpacity=0',
            'strokeColor=none',
            'fillColor=none',
            'pointerEvents=1',
            'resizable=0',
            'movable=0',
            'rotatable=0',
            'deletable=0',
            'editable=0',
            'selectable=0',
            'perimeter=none',
            'outlineConnect=0',
            'points=[[0.5,0.5,0,0,0]]',
            'portConstraint=' + normalizeSide(side),
            'dftsIP_symbolPort=1',
            'dftsIP_symbolSide=' + normalizeSide(side)
        ].join(';') + ';';
    }

    function isSymbolPortCell(graph, cell) {
        if (!graph || !cell) return false;
        var s = graph.getCellStyle(cell);
        return mxUtils.getValue(s, 'dftsIP_symbolPort', '0') === '1';
    }

    function isSymbolStubCell(graph, cell) {
        if (!graph || !cell) return false;
        var s = graph.getCellStyle(cell);
        return mxUtils.getValue(s, 'dftsIP_symbolStub', '0') === '1';
    }

    function getSymbolEndpointSide(graph, cell) {
        if (!graph || !cell) return '';
        var s = graph.getCellStyle(cell);
        return normalizeSide(mxUtils.getValue(s, 'dftsIP_symbolSide', ''));
    }

    function applyTerminalConstraint(style, prefix, side) {
        side = normalizeSide(side);

        style = mxUtils.setStyle(style, prefix + 'PerimeterSpacing', '0');

        if (side === 'west') {
            style = mxUtils.setStyle(style, prefix + 'X', '0');
            style = mxUtils.setStyle(style, prefix + 'Y', '0.5');
            style = mxUtils.setStyle(style, prefix + 'Dx', null);
            style = mxUtils.setStyle(style, prefix + 'Dy', null);
        } else if (side === 'east') {
            style = mxUtils.setStyle(style, prefix + 'X', '1');
            style = mxUtils.setStyle(style, prefix + 'Y', '0.5');
            style = mxUtils.setStyle(style, prefix + 'Dx', null);
            style = mxUtils.setStyle(style, prefix + 'Dy', null);
        } else if (side === 'north') {
            style = mxUtils.setStyle(style, prefix + 'X', '0.5');
            style = mxUtils.setStyle(style, prefix + 'Y', '0');
            style = mxUtils.setStyle(style, prefix + 'Dx', null);
            style = mxUtils.setStyle(style, prefix + 'Dy', null);
        } else if (side === 'south') {
            style = mxUtils.setStyle(style, prefix + 'X', '0.5');
            style = mxUtils.setStyle(style, prefix + 'Y', '1');
            style = mxUtils.setStyle(style, prefix + 'Dx', null);
            style = mxUtils.setStyle(style, prefix + 'Dy', null);
        }

        return style;
    }

    function normalizeSymbolPortEdgeStyle(graph, style, source, target) {
        style = style || '';
        style = mxUtils.setStyle(style, 'shape', 'connector');
        style = mxUtils.setStyle(style, 'edgeStyle', 'orthogonalEdgeStyle');
        style = mxUtils.setStyle(style, 'orthogonalLoop', '1');
        style = mxUtils.setStyle(style, 'jettySize', 'auto');
        style = mxUtils.setStyle(style, 'rounded', '0');
        style = mxUtils.setStyle(style, 'curved', '0');
        style = mxUtils.setStyle(style, 'html', '1');
        style = mxUtils.setStyle(style, 'elbow', null);

        if (isSymbolPortCell(graph, source) || isSymbolStubCell(graph, source)) {
            style = applyTerminalConstraint(style, 'exit', getSymbolEndpointSide(graph, source));
        }

        if (isSymbolPortCell(graph, target) || isSymbolStubCell(graph, target)) {
            style = applyTerminalConstraint(style, 'entry', getSymbolEndpointSide(graph, target));
        }

        return style;
    }

    function isManagedChild(cell) { return !!(cell && cell.__dftsSymbolChild); }
    function markManagedChild(cell, kind, key) {
        if (!cell) return cell;
        cell.__dftsSymbolChild = true;
        cell.__dftsSymbolKind = kind;
        cell.__dftsSymbolKey = key || '';
        return cell;
    }

    function ensureChild(graph, body, kind, key, style, value) {
        var m = graph.getModel();
        var child = null;
        for (var i = 0; i < m.getChildCount(body); i++) {
            var it = m.getChildAt(body, i);
            if (it && it.__dftsSymbolChild && it.__dftsSymbolKind === kind && it.__dftsSymbolKey === (key || '')) {
                child = it;
                break;
            }
        }
        if (!child) {
            child = new mxCell(value != null ? value : '', new mxGeometry(0, 0, 1, 1), style || '');
            child.vertex = true;
            child.connectable = (kind === 'port');
            markManagedChild(child, kind, key);
            m.add(body, child);
        }
        if (style != null) m.setStyle(child, style);
        if (value != null) m.setValue(child, value);
        return child;
    }

    function removeStaleChildren(graph, body, valid) {
        var m = graph.getModel();
        var drop = [];
        for (var i = 0; i < m.getChildCount(body); i++) {
            var child = m.getChildAt(body, i);
            if (!isManagedChild(child)) continue;
            var id = child.__dftsSymbolKind + ':' + (child.__dftsSymbolKey || '');
            if (!valid[id]) drop.push(child);
        }
        for (var j = 0; j < drop.length; j++) m.remove(drop[j]);
    }

    function allocateInstanceName(graph, base) {
        base = trim(base || 'ip').replace(/\n/g, ' ').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'ip';
        var maxIdx = 0;
        var bodies = (NS.getAllChipBodies && graph) ? NS.getAllChipBodies(graph) : [];
        var re = new RegExp('^' + escRe(base) + '_inst_(\\d+)$', 'i');
        for (var i = 0; i < bodies.length; i++) {
            var b = bodies[i];
            var name = '';
            if (isSymbolBody(b)) {
                var sm = getModel(b);
                name = sm && sm.instanceName || '';
            } else if (NS.findInstanceLabelCell) {
                var inst = NS.findInstanceLabelCell(graph, b);
                name = inst && inst.value || '';
            }
            var m = re.exec(trim(name));
            if (m) maxIdx = Math.max(maxIdx, parseInt(m[1], 10) || 0);
        }
        return base + '_inst_' + (maxIdx + 1);
    }


    function getLogicGateInfo(model) {
        if (!model || model.bodyShape !== 'dftsLogicGate') return { enabled: false, kind: '', invOut: false };
        var extra = toStr(model.bodyExtraStyle || '');
        return {
            enabled: true,
            kind: trim(readStyleValue(extra, 'dftsGateKind') || '').toLowerCase(),
            invOut: readStyleValue(extra, 'dftsGateInvertOutput') === '1'
        };
    }

    function getLogicGateTitleShiftX(model, layout) {
        var info = getLogicGateInfo(model);
        if (!info.enabled) return 0;
        if (info.kind === 'not') return -Math.round(layout.bodyW * 0.10);
        if (info.kind === 'buf') return -Math.round(layout.bodyW * 0.06);
        return 0;
    }

    function placeLogicGateLabel(layout, side, attach, labelW, labelH, pos) {
        var inset = Math.max(4, Math.round(layout.labelGap * 1.2));
        var geo = new mxGeometry();
        geo.relative = false;

        if (side === 'west') {
            geo.x = clamp(Math.round(attach.x + inset), layout.bodyPaddingX, Math.max(layout.bodyPaddingX, layout.bodyW - layout.bodyPaddingX - labelW));
            geo.y = pos.y - Math.round(labelH / 2);
            geo.width = labelW;
            geo.height = labelH;
            return geo;
        }

        if (side === 'east') {
            geo.x = clamp(Math.round(attach.x - inset - labelW), layout.bodyPaddingX, Math.max(layout.bodyPaddingX, layout.bodyW - layout.bodyPaddingX - labelW));
            geo.y = pos.y - Math.round(labelH / 2);
            geo.width = labelW;
            geo.height = labelH;
            return geo;
        }

        if (side === 'north') {
            geo.x = clamp(Math.round(pos.x - labelW / 2), layout.bodyPaddingX, Math.max(layout.bodyPaddingX, layout.bodyW - layout.bodyPaddingX - labelW));
            geo.y = clamp(Math.round(attach.y + inset), layout.bodyPaddingY, Math.max(layout.bodyPaddingY, layout.bodyH - layout.bodyPaddingY - labelH));
            geo.width = labelW;
            geo.height = labelH;
            return geo;
        }

        geo.x = clamp(Math.round(pos.x - labelW / 2), layout.bodyPaddingX, Math.max(layout.bodyPaddingX, layout.bodyW - layout.bodyPaddingX - labelW));
        geo.y = clamp(Math.round(attach.y - inset - labelH), layout.bodyPaddingY, Math.max(layout.bodyPaddingY, layout.bodyH - layout.bodyPaddingY - labelH));
        geo.width = labelW;
        geo.height = labelH;
        return geo;
    }

    function centeredSideCoord(count, index, pitch, total, offset) {
        count = Math.max(0, Number(count) || 0);
        index = Math.max(0, Number(index) || 0);
        total = Math.max(1, Number(total) || 1);
        offset = Number(offset) || 0;
        if (count <= 0) return Math.round(offset + total / 2);
        if (count === 1) return Math.round(offset + total / 2);
        var used = pitch * (count - 1);
        var first = offset + Math.max(0, (total - used) / 2);
        return Math.round(first + index * pitch);
    }

    function cubicAt(p0, p1, p2, p3, t) {
        var mt = 1 - t;
        return (mt * mt * mt * p0) + (3 * mt * mt * t * p1) + (3 * mt * t * t * p2) + (t * t * t * p3);
    }

    function solveMonotonicBezierT(value, p0, p1, p2, p3) {
        value = Number(value);
        var lo = 0;
        var hi = 1;
        var ascending = p3 >= p0;
        for (var i = 0; i < 24; i++) {
            var mid = (lo + hi) / 2;
            var cur = cubicAt(p0, p1, p2, p3, mid);
            if (ascending) {
                if (cur < value) lo = mid;
                else hi = mid;
            } else {
                if (cur > value) lo = mid;
                else hi = mid;
            }
        }
        return (lo + hi) / 2;
    }

    function getAndRightEdgeX(layout, y, info) {
        var w = Math.max(2, layout.bodyW);
        var h = Math.max(2, layout.bodyH);
        var top = 1;
        var bot = h - 1;
        var mid = h * 0.5;
        var ry = Math.max(1, (bot - top) / 2);
        var bubbleR = (info && info.invOut) ? Math.max(4, Math.round(Math.min(w, h) * 0.055)) : 0;
        var outerRight = (info && info.invOut) ? (w - 1 - bubbleR * 2) : (w - 1);
        var rectRight = Math.max(1 + 6, Math.round(outerRight - ry));
        var rx = Math.max(4, outerRight - rectRight);
        var yy = clamp(y, top, bot);
        var dy = (yy - mid) / ry;
        var inside = Math.max(0, 1 - dy * dy);
        return Math.round(rectRight + rx * Math.sqrt(inside));
    }

    function getOrLeftEdgeX(layout, y) {
        var w = layout.bodyW;
        var h = layout.bodyH;
        var top = 1;
        var bot = h - 1;
        var mid = h * 0.5;
        var leftOuter = w * 0.04;
        var leftMain = w * 0.18;
        var yy = clamp(y, top, bot);
        var x;
        if (yy <= mid) {
            var t1 = solveMonotonicBezierT(yy, mid, h * 0.33, h * 0.16, top);
            x = cubicAt(leftOuter, w * 0.25, w * 0.30, leftMain, t1);
        } else {
            var t2 = solveMonotonicBezierT(yy, bot, h * 0.84, h * 0.67, mid);
            x = cubicAt(leftMain, w * 0.30, w * 0.25, leftOuter, t2);
        }
        return Math.round(x) + 1;
    }

    function getXorBackCurveX(layout, y) {
        var w = layout.bodyW;
        var h = layout.bodyH;
        var top = 1 + h * 0.02;
        var bot = (h - 1) - h * 0.02;
        var yy = clamp(y, top, bot);
        var t = solveMonotonicBezierT(yy, top, h * 0.20, h * 0.80, bot);
        return Math.round(cubicAt(0, w * 0.17, w * 0.17, 0, t)) + 1;
    }

    function getPinAttachPoint(model, layout, side, pos) {
        var point = {
            x: side === 'west' ? 0 : (side === 'east' ? layout.bodyW : pos.x),
            y: side === 'north' ? 0 : (side === 'south' ? layout.bodyH : pos.y)
        };
        var info = getLogicGateInfo(model);
        if (!info.enabled) return point;

        if (side === 'west') point.x = 1;
        if (side === 'east') point.x = Math.max(1, layout.bodyW - 1);
        if (side === 'north') point.y = 1;
        if (side === 'south') point.y = Math.max(1, layout.bodyH - 1);

        if ((info.kind === 'or' || info.kind === 'nor') && side === 'west') {
            point.x = Math.max(1, getOrLeftEdgeX(layout, pos.y));
            return point;
        }

        if ((info.kind === 'xor' || info.kind === 'xnor') && side === 'west') {
            point.x = Math.max(1, getXorBackCurveX(layout, pos.y));
            return point;
        }

        if ((info.kind === 'and') && side === 'east') {
            // For NAND/AND with an inversion bubble, start the external output stub
            // at the bubble's right tangent so the line does not run through it.
            if (info.invOut) point.x = Math.max(1, layout.bodyW - 1);
            else point.x = Math.max(1, getAndRightEdgeX(layout, pos.y, info));
            return point;
        }

        if (info.kind === 'mux' && (side === 'north' || side === 'south')) {
            var w = Math.max(1, layout.bodyW - 1);
            var taper = Math.max(6, Math.round(layout.bodyH * 0.18));
            var xn = clamp((pos.x - 1) / w, 0, 1);
            if (side === 'north') point.y = Math.max(1, Math.round(1 + taper * xn));
            else point.y = Math.max(1, Math.round(layout.bodyH - 1 - taper * xn));
            return point;
        }

        return point;
    }

    function relayout(graph, body) {
        if (!graph || !body) return body;
        installGraphPolicies(graph);
        var model = getModel(body);
        if (!model) return body;

        var m = graph.getModel();
        var geo = safeGeo(body);
        var layout = computeLayout(model, geo.width, geo.height);
        var gateInfo = getLogicGateInfo(model);

        m.beginUpdate();
        try {
            if (geo.width < layout.minW || geo.height < layout.minH) {
                var clamped = geo.clone();
                clamped.width = Math.max(geo.width, layout.minW);
                clamped.height = Math.max(geo.height, layout.minH);
                m.setGeometry(body, clamped);
                geo = clamped;
                layout = computeLayout(model, geo.width, geo.height);
            }

            m.setStyle(body, bodyStyle(model, [
                'dftsIP_symbolScale=' + layout.scale,
                'rotation=' + (model.transform && model.transform.rotation || 0)
            ].join(';')));
            body.connectable = useNativeBodyConnectionPoints(model);
            if (toStr(body.value) !== '') m.setValue(body, '');

            var valid = {};

            var titleCell = ensureChild(graph, body, 'title', '', textStyle(layout.titleFontSize, 'center', true, layout.verticalTitle ? 90 : 0, 'visible'), model.title);
            titleCell.connectable = false;
            titleCell.visible = !!model.title;
            valid['title:'] = true;
            var titleShiftX = getLogicGateTitleShiftX(model, layout);
            var titleGeo = new mxGeometry(
                Math.round(layout.centerLeftX + (layout.centerW - layout.titleBoxW) / 2 + titleShiftX),
                Math.round((layout.bodyH - layout.titleBoxH) / 2),
                Math.max(12, layout.titleBoxW),
                Math.max(12, layout.titleBoxH)
            );
            titleGeo.relative = false;
            m.setGeometry(titleCell, titleGeo);

            var instanceCell = ensureChild(graph, body, 'instance', '', textStyle(layout.instanceFontSize, 'center', false, 0, 'visible'), model.instanceName || '');
            instanceCell.connectable = false;
            instanceCell.visible = !!model.instanceName;
            valid['instance:'] = true;
            var instanceGeo = new mxGeometry(0, layout.bodyH + layout.instanceGap, layout.bodyW, Math.max(10, layout.instanceH || Math.ceil(layout.instanceFontSize * 1.2)));
            instanceGeo.relative = false;
            m.setGeometry(instanceCell, instanceGeo);

            (model.pins || []).forEach(function (pin) {
                var pos = layout.pinPos[pin.key];
                var shown = pin.visible !== false && !!pos;
                var side = normalizeSide(pin.side);
                var text = pinText(pin);
                var labelW = Math.max(8, side === 'west' ? layout.leftTextW : (side === 'east' ? layout.rightTextW : estimateTextWidth(text, layout.fontSize)));
                var labelH = Math.max(8, Math.ceil(layout.fontSize * 1.08));
                var thickness = isBus(pin) ? 3 : 1;

                var stub = ensureChild(graph, body, 'stub', pin.key, stubStyle(side, pin), '');
                var port = ensureChild(graph, body, 'port', pin.key, portStyle(side), '');
                var label = ensureChild(graph, body, 'label', pin.key, textStyle(layout.fontSize, (side === 'west' ? 'left' : (side === 'east' ? 'right' : 'center')), false, 0, 'visible'), text);
                stub.connectable = true;
                port.connectable = false;
                label.connectable = false;
                stub.visible = shown;
                port.visible = false;
                label.visible = shown && !model.hidePinLabels;
                valid['stub:' + pin.key] = true;
                valid['port:' + pin.key] = true;
                valid['label:' + pin.key] = true;
                if (!pos) return;

                var sg = new mxGeometry(); sg.relative = false;
                var pg = new mxGeometry(); pg.relative = false;
                var lg = new mxGeometry(); lg.relative = false;
                var portHitSize = Math.max(12, Math.round(layout.pinStub * 0.7));
                var portHalf = Math.round(portHitSize / 2);

                var attach = getPinAttachPoint(model, layout, side, pos);

                if (side === 'west') {
                    var inset = Math.max(1, Math.round(layout.labelGap * 0.35));
                    sg.x = attach.x - layout.pinStub;
                    sg.y = attach.y - Math.floor(thickness / 2);
                    sg.width = layout.pinStub;
                    sg.height = thickness;

                    pg.x = attach.x - layout.pinStub - portHalf;
                    pg.y = attach.y - portHalf;
                    pg.width = portHitSize;
                    pg.height = portHitSize;

                    lg.x = layout.bodyPaddingX + inset;
                    lg.y = pos.y - Math.round(labelH / 2);
                    lg.width = labelW;
                    lg.height = labelH;
                } else if (side === 'east') {
                    var insetR = Math.max(1, Math.round(layout.labelGap * 0.35));
                    sg.x = attach.x;
                    sg.y = attach.y - Math.floor(thickness / 2);
                    sg.width = layout.pinStub;
                    sg.height = thickness;

                    pg.x = attach.x + layout.pinStub - portHalf;
                    pg.y = attach.y - portHalf;
                    pg.width = portHitSize;
                    pg.height = portHitSize;

                    lg.x = layout.bodyW - layout.bodyPaddingX - insetR - labelW;
                    lg.y = pos.y - Math.round(labelH / 2);
                    lg.width = labelW;
                    lg.height = labelH;
                } else if (side === 'north') {
                    sg.x = attach.x - Math.floor(thickness / 2);
                    sg.y = attach.y - layout.pinStub;
                    sg.width = thickness;
                    sg.height = layout.pinStub;

                    pg.x = attach.x - portHalf;
                    pg.y = attach.y - layout.pinStub - portHalf;
                    pg.width = portHitSize;
                    pg.height = portHitSize;

                    lg.x = pos.x - Math.round(labelW / 2);
                    lg.y = layout.bodyPaddingY;
                    lg.width = labelW;
                    lg.height = labelH;
                } else {
                    sg.x = attach.x - Math.floor(thickness / 2);
                    sg.y = attach.y;
                    sg.width = thickness;
                    sg.height = layout.pinStub;

                    pg.x = attach.x - portHalf;
                    pg.y = attach.y + layout.pinStub - portHalf;
                    pg.width = portHitSize;
                    pg.height = portHitSize;

                    lg.x = pos.x - Math.round(labelW / 2);
                    lg.y = layout.bodyH - layout.bodyPaddingY - labelH;
                    lg.width = labelW;
                    lg.height = labelH;
                }

                if (gateInfo.enabled) {
                    lg = placeLogicGateLabel(layout, side, attach, labelW, labelH, pos);
                }

                m.setGeometry(stub, sg);
                m.setGeometry(port, pg);
                m.setGeometry(label, lg);
            });

            removeStaleChildren(graph, body, valid);
        } finally {
            m.endUpdate();
        }

        if (graph.refresh) graph.refresh(body);
        return body;
    }

    function extractPinsFromDefinition(def, runtimeOpt) {
        var pinsLegacy = {};
        if (def && typeof def.pinsFactory === 'function') pinsLegacy = def.pinsFactory(runtimeOpt || {}, def) || {};
        else if (def && def.pins) pinsLegacy = clone(def.pins) || {};
        return normalizePinsFromLegacy(pinsLegacy);
    }

    function buildModelFromDefinition(graph, def, runtimeOpt) {
        runtimeOpt = runtimeOpt || {};
        var title = trim(runtimeOpt.resolvedBodyLabel || runtimeOpt.label || def.defaultLabel || def.key || 'IP');
        var instanceName = trim(runtimeOpt.instanceName || '');
        var instancePolicy = def.instancePolicy || (NS.POLICY && NS.POLICY.INSTANCE_REQUIRED) || 'required';
        if (!instanceName && instancePolicy !== ((NS.POLICY && NS.POLICY.INSTANCE_DISABLED) || 'disabled')) {
            instanceName = allocateInstanceName(graph, def.instanceBaseName || def.defaultLabel || title);
        }

        var model = normalizeModel({
            title: title,
            instanceName: instanceName,
            dftsType: def.dftsType || '',
            category: def.category || '',
            rounded: runtimeOpt.rounded != null ? runtimeOpt.rounded : (def.rounded || 0),
            strokeWidth: runtimeOpt.strokeWidth != null ? runtimeOpt.strokeWidth : (def.strokeWidth != null ? def.strokeWidth : 1),
            layout: {
                fontSize: runtimeOpt.pinFont || def.pinFont || DEFAULTS.fontSize,
                titleFontSize: runtimeOpt.bodyFont || def.bodyFont || DEFAULTS.titleFontSize,
                instanceFontSize: Math.max(8, Math.round((runtimeOpt.pinFont || def.pinFont || DEFAULTS.fontSize) * 0.9)),
                minBodyWidth: Math.max(DEFAULTS.minBodyWidth, Number((runtimeOpt.symbolMinW || 0)) || 0),
                minBodyHeight: Math.max(DEFAULTS.minBodyHeight, Number((runtimeOpt.symbolMinH || 0)) || 0)
            },
            pins: extractPinsFromDefinition(def, Object.assign({}, runtimeOpt, { resolvedBodyLabel: title }))
        });

        var customSymbolModel = runtimeOpt.symbolModel;
        if (!customSymbolModel && def && typeof def.buildSymbolModel === 'function') {
            try {
                customSymbolModel = def.buildSymbolModel(graph, def, runtimeOpt, clone(model));
            } catch (e) {
                customSymbolModel = null;
            }
        }

        if (customSymbolModel) {
            var mergedRaw = clone(customSymbolModel) || {};
            var mergedInput = Object.assign({}, model, mergedRaw);
            mergedInput.layout = Object.assign({}, model.layout || {}, mergedRaw.layout || {});
            if (Array.isArray(mergedRaw.pins)) {
                mergedInput.pins = mergedRaw.pins;
            } else if (mergedRaw.pinsLegacy) {
                delete mergedInput.pins;
                mergedInput.pinsLegacy = mergedRaw.pinsLegacy;
            } else {
                mergedInput.pins = model.pins;
            }
            model = normalizeModel(mergedInput);
        }

        if (runtimeOpt.defaultHidePins !== false && model.category !== 'logic_gate' && model.bodyShape !== 'dftsLogicGate' && Array.isArray(model.pins)) {
            model.pins.forEach(function (pin) {
                pin.visible = false;
            });
        }

        return model;
    }

    function createFromDefinition(graph, def, runtimeOpt) {
        runtimeOpt = runtimeOpt || {};
        installGraphPolicies(graph);

        var model = buildModelFromDefinition(graph, def, runtimeOpt);
        var natural = computeNaturalMetrics(model);
        var defW = Number(def && def.w || 0) || 0;
        var defH = Number(def && def.h || 0) || 0;
        var w = runtimeOpt.w != null ? Math.max(36, Number(runtimeOpt.w) || natural.naturalW) : Math.max(36, Math.ceil(natural.naturalW * 0.92), defW > 0 ? Math.min(defW, Math.ceil(natural.naturalW * 1.05)) : 0);
        var h = runtimeOpt.h != null ? Math.max(24, Number(runtimeOpt.h) || natural.naturalH) : Math.max(24, Math.ceil(natural.naturalH * 0.92), defH > 0 ? Math.min(defH, Math.ceil(natural.naturalH * 1.05)) : 0);

        var body = new mxCell(
            '',
            new mxGeometry(0, 0, w, h),
            bodyStyle(model, [
                'dftsIP_labelPolicy=' + (def.labelPolicy || ''),
                'dftsIP_instancePolicy=' + (def.instancePolicy || ''),
                'dftsIP_configKey=' + (def.configKey || ''),
                'dftsIP_defKey=' + (def.key || ''),
                'dftsIP_lockBodyLabel=' + (def.lockBodyLabel ? '1' : '0')
            ].join(';'))
        );
        body.vertex = true;
        body.connectable = false;

        setModel(body, model);
        relayout(graph, body);
        return body;
    }

    function updatePinLayout(graph, body, updater) {
        if (!graph || !body || !isSymbolBody(body)) return;
        var model = clone(getModel(body));
        if (!model) return;
        if (typeof updater === 'function') updater(model);
        model = normalizeModel(model);
        setModel(body, model);
        relayout(graph, body);
    }

    function remapPinSide(pin, map) {
        pin.side = map[normalizeSide(pin.side)] || normalizeSide(pin.side);
    }

    function flipHorizontal(graph, body) {
        updatePinLayout(graph, body, function (model) {
            model.pins.forEach(function (pin) {
                remapPinSide(pin, { west: 'east', east: 'west', north: 'north', south: 'south' });
            });
            ['north', 'south'].forEach(function (side) {
                var list = model.pins.filter(function (p) { return normalizeSide(p.side) === side; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); }).reverse();
                for (var i = 0; i < list.length; i++) list[i].order = i;
            });
        });
    }

    function flipVertical(graph, body) {
        updatePinLayout(graph, body, function (model) {
            model.pins.forEach(function (pin) {
                remapPinSide(pin, { west: 'west', east: 'east', north: 'south', south: 'north' });
            });
            ['west', 'east'].forEach(function (side) {
                var list = model.pins.filter(function (p) { return normalizeSide(p.side) === side; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); }).reverse();
                for (var i = 0; i < list.length; i++) list[i].order = i;
            });
        });
    }

    function rotate90(graph, body) {
        if (!graph || !body || !isSymbolBody(body)) return;
        updatePinLayout(graph, body, function (model) {
            model.pins.forEach(function (pin) {
                remapPinSide(pin, { west: 'north', north: 'east', east: 'south', south: 'west' });
            });
            model.transform.rotation = (((model.transform && model.transform.rotation) || 0) + 90) % 360;
        });
        var m = graph.getModel();
        m.beginUpdate();
        try {
            var g = safeGeo(body);
            var ng = g.clone();
            var t = ng.width;
            ng.width = g.height;
            ng.height = t;
            m.setGeometry(body, ng);
        } finally {
            m.endUpdate();
        }
        relayout(graph, body);
    }

    function installGraphPolicies(graph) {
        if (!graph || graph.__dftsSymbolExternalPinsPoliciesInstalled) return;
        graph.__dftsSymbolExternalPinsPoliciesInstalled = true;

        function isChild(cell) { return !!(cell && cell.__dftsSymbolChild); }

        var baseMovable = graph.isCellMovable;
        graph.isCellMovable = function (cell) {
            if (isChild(cell)) return false;
            return baseMovable ? baseMovable.apply(this, arguments) : true;
        };

        var baseResizable = graph.isCellResizable;
        graph.isCellResizable = function (cell) {
            if (isChild(cell)) return false;
            return baseResizable ? baseResizable.apply(this, arguments) : true;
        };

        var baseSelectable = graph.isCellSelectable;
        graph.isCellSelectable = function (cell) {
            if (isChild(cell)) return false;
            return baseSelectable ? baseSelectable.apply(this, arguments) : true;
        };

        var baseEditable = graph.isCellEditable;
        graph.isCellEditable = function (cell) {
            if (isChild(cell)) return false;
            return baseEditable ? baseEditable.apply(this, arguments) : false;
        };

        var baseEdgeValidationError = graph.getEdgeValidationError;
        graph.getEdgeValidationError = function (edge, source, target) {
            if ((isSymbolPortCell(this, source) || isSymbolPortCell(this, target) || isSymbolStubCell(this, source) || isSymbolStubCell(this, target)) && (!source || !target)) {
                return '';
            }

            return baseEdgeValidationError ? baseEdgeValidationError.apply(this, arguments) : null;
        };

        if (typeof graph.isCellDeletable === 'function') {
            var baseDeletable = graph.isCellDeletable;
            graph.isCellDeletable = function (cell) {
                if (isChild(cell)) return false;
                return baseDeletable.apply(this, arguments);
            };
        }

        graph.addListener(mxEvent.CELLS_RESIZED, function (sender, evt) {
            var cells = evt.getProperty('cells') || [];
            for (var i = 0; i < cells.length; i++) {
                if (isSymbolBody(cells[i])) relayout(graph, cells[i]);
            }
        });

        if (graph.connectionHandler && !graph.__dftsSymbolPortEdgePatchInstalled) {
            graph.__dftsSymbolPortEdgePatchInstalled = true;

            var handler = graph.connectionHandler;
            var baseCreateEdgeState = handler.createEdgeState;
            var baseInsertEdge = handler.insertEdge;

            handler.createEdgeState = function () {
                var state = baseCreateEdgeState.apply(this, arguments);
                var source = this.previous ? this.previous.cell : null;

                if (isSymbolPortCell(graph, source) || isSymbolStubCell(graph, source)) {
                    state.cell.style = normalizeSymbolPortEdgeStyle(graph, state.cell.style || '', source, null);
                    state.style = graph.getCellStyle(state.cell);
                }

                return state;
            };

            handler.insertEdge = function (parent, id, value, source, target, style) {
                if (isSymbolPortCell(graph, source) || isSymbolPortCell(graph, target) || isSymbolStubCell(graph, source) || isSymbolStubCell(graph, target)) {
                    style = normalizeSymbolPortEdgeStyle(graph, style, source, target);
                }

                var edge = baseInsertEdge.call(this, parent, id, value, source, target, style);

                if (edge && (isSymbolPortCell(graph, source) || isSymbolPortCell(graph, target) || isSymbolStubCell(graph, source) || isSymbolStubCell(graph, target))) {
                    var model = graph.getModel();
                    model.beginUpdate();
                    try {
                        model.setStyle(edge, normalizeSymbolPortEdgeStyle(graph, edge.style || style || '', source, target));

                        var geo = model.getGeometry(edge);
                        if (geo) {
                            geo = geo.clone();
                            geo.points = null;
                            geo.setTerminalPoint(null, true);
                            geo.setTerminalPoint(null, false);
                            model.setGeometry(edge, geo);
                        }
                    } finally {
                        model.endUpdate();
                    }
                }

                return edge;
            };
        }
    }

    function openPinLayoutEditor(ui, body, forcedGraph) {
        var graph = forcedGraph || (ui && ui.editor && ui.editor.graph) || (ui && ui.graph) || null;
        if (!graph || !body || !isSymbolBody(body)) return;
        var current = clone(getModel(body));
        if (!current) return;

        var host = document.createElement('div');
        host.style.cssText = 'display:flex;flex-direction:column;gap:10px;width:720px;max-width:92vw;height:520px;max-height:82vh;background:#fff;border-radius:12px;padding:16px;box-sizing:border-box;font-family:Arial,sans-serif;';

        var title = document.createElement('div');
        title.textContent = 'Pin Layout Editor';
        title.style.cssText = 'font-size:20px;font-weight:700;';
        host.appendChild(title);

        var bodyWrap = document.createElement('div');
        bodyWrap.style.cssText = 'display:flex;gap:12px;flex:1;min-height:0;';
        host.appendChild(bodyWrap);

        var list = document.createElement('div');
        list.style.cssText = 'flex:1;overflow:auto;border:1px solid #ddd;border-radius:8px;padding:8px;';
        bodyWrap.appendChild(list);

        var preview = document.createElement('div');
        preview.style.cssText = 'flex:1.3;border:1px solid #ddd;border-radius:8px;padding:12px;display:flex;align-items:center;justify-content:center;';
        bodyWrap.appendChild(preview);

        var footer = document.createElement('div');
        footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';
        host.appendChild(footer);

        var selectedKey = current.pins[0] && current.pins[0].key || '';

        function btn(label, fn) {
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = label;
            b.style.cssText = 'padding:8px 14px;border-radius:8px;border:1px solid #ccc;background:#fff;cursor:pointer;';
            b.onclick = fn;
            return b;
        }

        function drawPreview() {
            preview.innerHTML = '';
            var box = document.createElement('div');
            box.style.cssText = 'position:relative;width:280px;height:180px;';
            var rect = document.createElement('div');
            rect.style.cssText = 'position:absolute;left:60px;top:24px;width:160px;height:120px;border:1px solid #111;display:flex;align-items:center;justify-content:center;font-weight:700;';
            rect.textContent = current.title || 'IP';
            box.appendChild(rect);
            ['west', 'east', 'north', 'south'].forEach(function (side) {
                var pins = current.pins.filter(function (p) { return p.visible !== false && normalizeSide(p.side) === side; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
                pins.forEach(function (pin, idx) {
                    var el = document.createElement('div');
                    el.textContent = pinText(pin);
                    el.style.cssText = 'position:absolute;font-size:12px;white-space:nowrap;';
                    if (side === 'west') { el.style.right = '226px'; el.style.top = (30 + idx * 18) + 'px'; }
                    if (side === 'east') { el.style.left = '226px'; el.style.top = (30 + idx * 18) + 'px'; }
                    if (side === 'north') { el.style.left = (80 + idx * 40) + 'px'; el.style.top = '2px'; }
                    if (side === 'south') { el.style.left = (80 + idx * 40) + 'px'; el.style.top = '152px'; }
                    box.appendChild(el);
                });
            });
            var inst = document.createElement('div');
            inst.textContent = current.instanceName || '';
            inst.style.cssText = 'position:absolute;left:60px;top:150px;width:160px;text-align:center;font-size:12px;';
            box.appendChild(inst);
            preview.appendChild(box);
        }

        function renderList() {
            list.innerHTML = '';
            current.pins.sort(function (a, b) {
                if (normalizeSide(a.side) !== normalizeSide(b.side)) return normalizeSide(a.side).localeCompare(normalizeSide(b.side));
                return (a.order || 0) - (b.order || 0);
            });

            current.pins.forEach(function (pin) {
                var row = document.createElement('div');
                row.style.cssText = 'display:grid;grid-template-columns:22px 1fr 90px 56px;gap:8px;align-items:center;padding:6px;border-radius:6px;cursor:pointer;' + (selectedKey === pin.key ? 'background:#eef4ff;' : '');
                row.onclick = function () { selectedKey = pin.key; renderList(); drawPreview(); };

                var cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = pin.visible !== false;
                cb.onchange = function (e) { pin.visible = !!cb.checked; e.stopPropagation(); drawPreview(); };
                row.appendChild(cb);

                var label = document.createElement('div');
                label.textContent = pinText(pin);
                label.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
                row.appendChild(label);

                var sideSel = document.createElement('select');
                ['west', 'east', 'north', 'south'].forEach(function (side) {
                    var opt = document.createElement('option');
                    opt.value = side; opt.textContent = side; if (normalizeSide(pin.side) === side) opt.selected = true;
                    sideSel.appendChild(opt);
                });
                sideSel.onchange = function (e) { pin.side = sideSel.value; e.stopPropagation(); drawPreview(); };
                row.appendChild(sideSel);

                var order = document.createElement('input');
                order.type = 'number';
                order.value = pin.order || 0;
                order.style.width = '56px';
                order.onchange = function (e) { pin.order = parseInt(order.value, 10) || 0; e.stopPropagation(); drawPreview(); };
                row.appendChild(order);

                list.appendChild(row);
            });
        }

        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.24);display:flex;align-items:center;justify-content:center;z-index:9999;';
        overlay.appendChild(host);

        function close() {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }

        footer.appendChild(btn('Auto Arrange', function () {
            ['west', 'east', 'north', 'south'].forEach(function (side) {
                var idx = 0;
                current.pins.filter(function (p) { return normalizeSide(p.side) === side; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); }).forEach(function (p) {
                    p.order = idx++;
                });
            });
            renderList();
            drawPreview();
        }));
        footer.appendChild(btn('Reset', function () {
            current = clone(getModel(body));
            selectedKey = current.pins[0] && current.pins[0].key || '';
            renderList();
            drawPreview();
        }));
        footer.appendChild(btn('Cancel', close));
        footer.appendChild(btn('Apply', function () {
            setModel(body, current);
            relayout(graph, body);
            close();
        }));

        renderList();
        drawPreview();
        document.body.appendChild(overlay);
    }

    SYM.isSymbolBody = isSymbolBody;
    SYM.getModel = getModel;
    SYM.setModel = setModel;
    SYM.computeBodyMinSize = computeBodyMinSize;
    SYM.computeLayout = computeLayout;
    SYM.computeNaturalMetrics = computeNaturalMetrics;
    SYM.relayout = relayout;
    SYM.createFromDefinition = createFromDefinition;
    SYM.updatePinLayout = updatePinLayout;
    SYM.flipHorizontal = flipHorizontal;
    SYM.flipVertical = flipVertical;
    SYM.rotate90 = rotate90;
    SYM.installGraphPolicies = installGraphPolicies;
    SYM.openPinLayoutEditor = openPinLayoutEditor;
})(this);
