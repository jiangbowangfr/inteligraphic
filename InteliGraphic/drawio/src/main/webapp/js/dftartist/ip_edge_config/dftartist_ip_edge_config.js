(function (global) {
    'use strict';

    var NS = global.DftsIP;
    if (!NS) throw new Error('请先加载 dftartist_create_ip_common.js');
    if (NS.__ipEdgeConfigLoaded) return;
    NS.__ipEdgeConfigLoaded = true;

    function debug() {
        if (typeof console === 'undefined' || !console.log) return;
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[IpEdgeConfig]');
        console.log.apply(console, args);
    }

    debug('module loaded');

    var EDGE_FLAG = 'dftsIP_edge';
    var STATUS = {
        RESOLVED: 'resolved',
        INFERRED: 'inferred',
        AMBIGUOUS: 'ambiguous',
        MANUAL: 'manual'
    };

    function normalizeUi(ui) {
        if (!ui) return null;
        if (ui.editor && ui.editor.graph) return ui;
        if (ui.editorUi && ui.editorUi.editor && ui.editorUi.editor.graph) return ui.editorUi;
        return null;
    }

    function getEditorUi() {
        if (global.__dftsEditorUi && global.__dftsEditorUi.editor && global.__dftsEditorUi.editor.graph) return global.__dftsEditorUi;
        if (global.App && global.App.editorUi && global.App.editorUi.editor && global.App.editorUi.editor.graph) return global.App.editorUi;
        return null;
    }

    function styleToMap(styleText) {
        var out = {};
        var items = String(styleText || '').split(';');
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (!item) continue;
            var idx = item.indexOf('=');
            if (idx < 0) continue;
            out[item.substring(0, idx)] = item.substring(idx + 1);
        }
        return out;
    }

    function getStyleValue(styleObj, key, fallback) {
        if (!styleObj) return fallback;
        return mxUtils.getValue(styleObj, key, fallback);
    }

    function asText(v) {
        return v == null ? '' : String(v);
    }

    function trim(v) {
        return asText(v).replace(/^\s+|\s+$/g, '');
    }

    function lower(v) {
        return trim(v).toLowerCase();
    }

    function directionRank(dir, preferred) {
        if (dir === preferred) return 100;
        if (preferred === 'output' && dir === 'input') return 0;
        if (preferred === 'input' && dir === 'output') return 0;
        return 10;
    }

    function baseSignalType(pinType) {
        var text = lower(pinType);
        if (!text) return '';
        return text.replace(/_(in|out)$/, '');
    }

    function getBodyDisplayName(graph, body) {
        if (!body) return '';
        var label = '';
        if (typeof NS.getCellDisplayName === 'function') label = trim(NS.getCellDisplayName(graph, body));
        if (!label) {
            var style = graph ? graph.getCellStyle(body) : null;
            label = trim(getStyleValue(style, 'dftsIP_type', body.value || 'IP'));
        }
        return label || 'IP';
    }

    function findSymbolPinModel(body, pinKey) {
        var sym = NS.Symbol;
        if (!sym || typeof sym.getModel !== 'function' || !body || !pinKey) return null;
        var model = sym.getModel(body) || {};
        var pins = Array.isArray(model.pins) ? model.pins : [];
        for (var i = 0; i < pins.length; i++) {
            if (String(pins[i].key || '') === String(pinKey)) return pins[i];
        }
        return null;
    }

    function getTerminalPinInfo(graph, terminal) {
        if (!graph || !terminal) return null;
        if (terminal.cell) terminal = terminal.cell;
        var style = graph.getCellStyle(terminal);
        if (NS.isPinCell && NS.isPinCell(graph, terminal)) {
            var body0 = terminal.parent || (NS.findChipBodyForCell ? NS.findChipBodyForCell(graph, terminal) : null);
            return {
                body: body0,
                pinKey: trim(getStyleValue(style, 'dftsIP_pinKey', '')),
                pinName: trim(NS.getLinePinText ? NS.getLinePinText(graph, terminal) : terminal.value),
                dir: trim(getStyleValue(style, 'dftsIP_pin_direction', '')),
                pinType: trim(getStyleValue(style, 'dftsIP_pinType', '')),
                busWidth: parseInt(getStyleValue(style, 'dftsIP_busWidth', '1'), 10) || 1,
                side: trim(getStyleValue(style, 'dftsIP_pin_location', getStyleValue(style, 'portDir', '')))
            };
        }

        if (terminal.__dftsSymbolChild && (terminal.__dftsSymbolKind === 'stub' || terminal.__dftsSymbolKind === 'port')) {
            var body = terminal.parent || (NS.findChipBodyForCell ? NS.findChipBodyForCell(graph, terminal) : null);
            var pinKey = trim(terminal.__dftsSymbolKey || '');
            var pinModel = findSymbolPinModel(body, pinKey) || {};
            return {
                body: body,
                pinKey: pinKey,
                pinName: trim(pinModel.name || pinModel.label || pinKey),
                dir: trim(pinModel.dir || ''),
                pinType: trim(pinModel.type || ''),
                busWidth: parseInt(pinModel.busWidth, 10) || 1,
                side: trim(pinModel.side || getStyleValue(style, 'dftsIP_symbolSide', ''))
            };
        }

        if (String(getStyleValue(style, 'dftsIP_chipBody', '0')) === '1' || String(getStyleValue(style, 'dftsIP_symbol', '0')) === '1') {
            return {
                body: terminal,
                pinKey: '',
                pinName: '',
                dir: '',
                pinType: '',
                busWidth: 1,
                side: ''
            };
        }

        var bodyFromContext = NS.findChipBodyForCell ? NS.findChipBodyForCell(graph, terminal) : null;
        if (bodyFromContext) {
            return {
                body: bodyFromContext,
                pinKey: '',
                pinName: '',
                dir: '',
                pinType: '',
                busWidth: 1,
                side: ''
            };
        }

        return null;
    }

    function collectLinePins(graph, body, out) {
        var pins = NS.getChipPins ? NS.getChipPins(graph, body) : [];
        for (var i = 0; i < pins.length; i++) {
            var pin = pins[i];
            var style = graph.getCellStyle(pin);
            out.push({
                body: body,
                pinCell: pin,
                pinKey: trim(getStyleValue(style, 'dftsIP_pinKey', '')),
                pinName: trim(NS.getLinePinText ? NS.getLinePinText(graph, pin) : pin.value),
                dir: trim(getStyleValue(style, 'dftsIP_pin_direction', '')),
                pinType: trim(getStyleValue(style, 'dftsIP_pinType', '')),
                side: trim(getStyleValue(style, 'dftsIP_pin_location', getStyleValue(style, 'portDir', ''))),
                busWidth: parseInt(getStyleValue(style, 'dftsIP_busWidth', '1'), 10) || 1,
                isBus: String(getStyleValue(style, 'dftsIP_isBus', '0')) === '1'
            });
        }
    }

    function collectSymbolPins(graph, body, out) {
        var sym = NS.Symbol;
        if (!sym || typeof sym.isSymbolBody !== 'function' || !sym.isSymbolBody(body) || typeof sym.getModel !== 'function') return;
        var model = sym.getModel(body) || {};
        var pins = Array.isArray(model.pins) ? model.pins : [];
        for (var i = 0; i < pins.length; i++) {
            var pin = pins[i] || {};
            out.push({
                body: body,
                pinCell: null,
                pinKey: trim(pin.key || ''),
                pinName: trim(pin.name || pin.label || pin.key),
                dir: trim(pin.dir || ''),
                pinType: trim(pin.type || ''),
                side: trim(pin.side || ''),
                busWidth: parseInt(pin.busWidth, 10) || 1,
                isBus: !!(pin.isBus || (parseInt(pin.busWidth, 10) || 1) > 1)
            });
        }
    }

    function collectBodyPins(graph, body) {
        var out = [];
        if (!graph || !body) return out;
        collectLinePins(graph, body, out);
        collectSymbolPins(graph, body, out);
        return out;
    }

    function getPinCandidate(bodyPins, pinKey) {
        if (!pinKey) return null;
        for (var i = 0; i < bodyPins.length; i++) {
            if (String(bodyPins[i].pinKey || '') === String(pinKey)) return bodyPins[i];
        }
        return null;
    }

    function scorePinCandidate(pin, preferredDir, peerPin) {
        var score = 0;
        score += directionRank(pin.dir, preferredDir);
        if (pin.dir === preferredDir) score += 20;
        if (peerPin) {
            var lhs = baseSignalType(pin.pinType);
            var rhs = baseSignalType(peerPin.pinType);
            if (lhs && rhs && lhs === rhs) score += 40;
            if ((pin.busWidth || 1) === (peerPin.busWidth || 1)) score += 12;
            if (lower(pin.pinKey) && lower(pin.pinKey) === lower(peerPin.pinKey)) score += 8;
        }
        if (preferredDir === 'output' && /out/.test(lower(pin.pinKey) + ' ' + lower(pin.pinName))) score += 8;
        if (preferredDir === 'input' && /in/.test(lower(pin.pinKey) + ' ' + lower(pin.pinName))) score += 8;
        return score;
    }

    function inferPin(bodyPins, preferredDir, peerPin) {
        var filtered = [];
        for (var i = 0; i < bodyPins.length; i++) {
            var pin = bodyPins[i];
            if (!pin.pinKey) continue;
            filtered.push({ pin: pin, score: scorePinCandidate(pin, preferredDir, peerPin) });
        }
        if (!filtered.length) return { pin: null, status: STATUS.AMBIGUOUS, reason: 'no-pin-candidate' };

        filtered.sort(function (a, b) { return b.score - a.score; });
        if (filtered.length === 1) return { pin: filtered[0].pin, status: STATUS.INFERRED, reason: 'single-pin-candidate' };
        if (filtered[0].score > filtered[1].score) return { pin: filtered[0].pin, status: STATUS.INFERRED, reason: 'best-score' };
        return { pin: null, status: STATUS.AMBIGUOUS, reason: 'ambiguous-candidates' };
    }

    function getLinkRecordFromEdge(graph, edge) {
        var style = styleToMap(edge && edge.getStyle ? edge.getStyle() : '');
        return {
            srcBodyId: trim(style.dftLink_srcBodyId),
            srcPinKey: trim(style.dftLink_srcPinKey),
            srcPinName: trim(style.dftLink_srcPinName),
            dstBodyId: trim(style.dftLink_dstBodyId),
            dstPinKey: trim(style.dftLink_dstPinKey),
            dstPinName: trim(style.dftLink_dstPinName),
            status: trim(style.dftLink_status),
            reason: trim(style.dftLink_reason)
        };
    }

    function persistLinkRecord(graph, edge, payload) {
        if (!graph || !edge) return;
        var style = edge.getStyle() || '';
        style = mxUtils.setStyle(style, EDGE_FLAG, '1');
        style = mxUtils.setStyle(style, 'dftLink_srcBodyId', payload.srcBodyId || '');
        style = mxUtils.setStyle(style, 'dftLink_srcPinKey', payload.srcPinKey || '');
        style = mxUtils.setStyle(style, 'dftLink_srcPinName', payload.srcPinName || '');
        style = mxUtils.setStyle(style, 'dftLink_dstBodyId', payload.dstBodyId || '');
        style = mxUtils.setStyle(style, 'dftLink_dstPinKey', payload.dstPinKey || '');
        style = mxUtils.setStyle(style, 'dftLink_dstPinName', payload.dstPinName || '');
        style = mxUtils.setStyle(style, 'dftLink_status', payload.status || '');
        style = mxUtils.setStyle(style, 'dftLink_reason', payload.reason || '');
        graph.getModel().setStyle(edge, style);
    }

    function formatLinkText(graph, edge, record) {
        record = record || getLinkRecordFromEdge(graph, edge);
        var model = graph.getModel();
        var srcBody = record.srcBodyId ? model.getCell(record.srcBodyId) : null;
        var dstBody = record.dstBodyId ? model.getCell(record.dstBodyId) : null;
        var srcName = getBodyDisplayName(graph, srcBody);
        var dstName = getBodyDisplayName(graph, dstBody);
        return srcName + '.' + (record.srcPinName || record.srcPinKey || '?') + ' -> ' + dstName + '.' + (record.dstPinName || record.dstPinKey || '?');
    }

    function logConnectionInfo(ui, graph, edge, record, level, extra) {
        ui = normalizeUi(ui) || getEditorUi();
        if (!ui) return;
        var text = formatLinkText(graph, edge, record);
        if (extra) text = extra + ': ' + text;
        if (typeof ui.logDockOutput === 'function') ui.logDockOutput(text, level || 'info');
    }

    function pushAmbiguousWarning(ui, graph, edge, reason) {
        ui = normalizeUi(ui) || getEditorUi();
        if (!ui || typeof ui.pushDockMessage !== 'function') return;
        ui.pushDockMessage({
            level: 'warning',
            source: 'ip_edge_config',
            location: edge && (edge.id || edge.getId && edge.getId()) || '',
            text: '无法自动推断该连线的默认引脚，需要手动选择。',
            data: { reason: reason || 'ambiguous' },
            onOpen: function () {
                openEdgeConfigDialog(graph, edge, ui);
            }
        });
    }

    function isManagedIpEdge(graph, edge) {
        if (!graph || !edge || !edge.edge) return false;
        var style = graph.getCellStyle(edge);
        if (String(getStyleValue(style, 'floorplanLine', '0')) === '1') return false;
        return String(getStyleValue(style, EDGE_FLAG, '0')) === '1';
    }

    function markAsManagedIpEdge(graph, edge) {
        if (!graph || !edge) return;
        var style = edge.getStyle() || '';
        style = mxUtils.setStyle(style, EDGE_FLAG, '1');
        graph.getModel().setStyle(edge, style);
    }

    function resolveEdgeConnection(graph, edge, opt) {
        if (!graph || !edge || !edge.edge) return null;
        opt = opt || {};

        var sourceTerminal = graph.getModel().getTerminal(edge, true);
        var targetTerminal = graph.getModel().getTerminal(edge, false);
        debug('resolve start', 'edge=', edge.id || '', 'source=', sourceTerminal && sourceTerminal.id, 'target=', targetTerminal && targetTerminal.id);
        var sourceInfo = getTerminalPinInfo(graph, sourceTerminal);
        var targetInfo = getTerminalPinInfo(graph, targetTerminal);
        if (!sourceInfo || !targetInfo || !sourceInfo.body || !targetInfo.body) {
            debug('resolve aborted', 'sourceInfo=', sourceInfo, 'targetInfo=', targetInfo);
            return null;
        }

        var sourcePins = collectBodyPins(graph, sourceInfo.body);
        var targetPins = collectBodyPins(graph, targetInfo.body);
        debug('resolve candidates', 'sourceBody=', sourceInfo.body && sourceInfo.body.id, 'targetBody=', targetInfo.body && targetInfo.body.id, 'sourcePins=', sourcePins.length, 'targetPins=', targetPins.length);
        var sourcePin = getPinCandidate(sourcePins, sourceInfo.pinKey);
        var targetPin = getPinCandidate(targetPins, targetInfo.pinKey);
        var status = STATUS.RESOLVED;
        var reason = 'terminal-pin';

        if (!sourcePin) {
            var sourceGuess = inferPin(sourcePins, 'output', targetPin || targetInfo);
            sourcePin = sourceGuess.pin;
            status = sourceGuess.status;
            reason = 'source-' + sourceGuess.reason;
        }

        if (!targetPin) {
            var targetGuess = inferPin(targetPins, 'input', sourcePin || sourceInfo);
            targetPin = targetGuess.pin;
            if (status !== STATUS.AMBIGUOUS) status = targetGuess.status;
            reason = reason + '|target-' + targetGuess.reason;
        }

        if (!sourcePin || !targetPin) {
            status = STATUS.AMBIGUOUS;
        } else if (opt.manual) {
            status = STATUS.MANUAL;
            reason = 'manual-select';
        } else if (status !== STATUS.RESOLVED) {
            status = STATUS.INFERRED;
        }

        var payload = {
            srcBodyId: sourceInfo.body.getId ? String(sourceInfo.body.getId()) : String(sourceInfo.body.id || ''),
            srcPinKey: sourcePin ? sourcePin.pinKey : '',
            srcPinName: sourcePin ? (sourcePin.pinName || sourcePin.pinKey) : '',
            dstBodyId: targetInfo.body.getId ? String(targetInfo.body.getId()) : String(targetInfo.body.id || ''),
            dstPinKey: targetPin ? targetPin.pinKey : '',
            dstPinName: targetPin ? (targetPin.pinName || targetPin.pinKey) : '',
            status: status,
            reason: reason
        };

        graph.getModel().beginUpdate();
        try {
            markAsManagedIpEdge(graph, edge);
            persistLinkRecord(graph, edge, payload);
        } finally {
            graph.getModel().endUpdate();
        }

        debug('resolve done', payload);

        if (status === STATUS.AMBIGUOUS) {
            pushAmbiguousWarning(opt.ui, graph, edge, reason);
            if (opt.openDialogOnAmbiguous !== false) openEdgeConfigDialog(graph, edge, opt.ui);
        } else if (opt.log !== false) {
            logConnectionInfo(opt.ui, graph, edge, payload, status === STATUS.MANUAL ? 'success' : 'info', status === STATUS.INFERRED ? 'Auto connected' : 'Connected');
        }

        return payload;
    }

    function buildPinGroups(pins) {
        var groups = { input: [], output: [], other: [] };
        for (var i = 0; i < pins.length; i++) {
            var key = pins[i].dir === 'input' ? 'input' : (pins[i].dir === 'output' ? 'output' : 'other');
            groups[key].push(pins[i]);
        }
        return groups;
    }

    function appendPinGroup(container, title, pins) {
        var sec = document.createElement('div');
        sec.style.marginBottom = '10px';
        var hd = document.createElement('div');
        hd.style.fontWeight = '600';
        hd.style.fontSize = '12px';
        hd.style.marginBottom = '4px';
        hd.textContent = title;
        sec.appendChild(hd);

        if (!pins.length) {
            var empty = document.createElement('div');
            empty.style.fontSize = '12px';
            empty.style.color = '#6b7280';
            empty.textContent = '无';
            sec.appendChild(empty);
        } else {
            for (var i = 0; i < pins.length; i++) {
                var row = document.createElement('div');
                row.style.fontSize = '12px';
                row.style.lineHeight = '1.6';
                row.textContent = (pins[i].pinName || pins[i].pinKey) + (pins[i].pinType ? ' [' + pins[i].pinType + ']' : '');
                sec.appendChild(row);
            }
        }

        container.appendChild(sec);
    }

    function createPinSelect(pins, selectedKey) {
        var select = document.createElement('select');
        select.style.width = '100%';
        select.style.boxSizing = 'border-box';
        select.style.marginTop = '8px';
        select.style.padding = '6px 8px';
        select.style.border = '1px solid #d1d5db';
        select.style.borderRadius = '6px';

        function addGroup(title, items) {
            if (!items.length) return;
            var group = document.createElement('optgroup');
            group.label = title;
            for (var i = 0; i < items.length; i++) {
                var opt = document.createElement('option');
                opt.value = items[i].pinKey;
                opt.textContent = (items[i].pinName || items[i].pinKey) + (items[i].pinType ? ' [' + items[i].pinType + ']' : '');
                if (String(items[i].pinKey) === String(selectedKey || '')) opt.selected = true;
                group.appendChild(opt);
            }
            select.appendChild(group);
        }

        var groups = buildPinGroups(pins);
        addGroup('Output', groups.output);
        addGroup('Input', groups.input);
        addGroup('Other', groups.other);
        return select;
    }

    function openEdgeConfigDialog(graph, edge, ui) {
        ui = normalizeUi(ui) || getEditorUi();
        if (!ui || !ui.showDialog || !graph || !edge) return;

        var record = getLinkRecordFromEdge(graph, edge);
        var sourceTerminal = graph.getModel().getTerminal(edge, true);
        var targetTerminal = graph.getModel().getTerminal(edge, false);
        var sourceInfo = getTerminalPinInfo(graph, sourceTerminal);
        var targetInfo = getTerminalPinInfo(graph, targetTerminal);
        if (!sourceInfo || !targetInfo || !sourceInfo.body || !targetInfo.body) return;

        var sourcePins = collectBodyPins(graph, sourceInfo.body);
        var targetPins = collectBodyPins(graph, targetInfo.body);
        var wrap = document.createElement('div');
        wrap.style.width = '100%';
        wrap.style.boxSizing = 'border-box';
        wrap.style.padding = '16px';
        wrap.style.fontFamily = 'Helvetica, Arial, sans-serif';

        function buildColumn(title, body, pins, selectedKey) {
            var col = document.createElement('div');
            col.style.flex = '1 1 0';
            col.style.minWidth = '0';
            col.style.border = '1px solid #e5e7eb';
            col.style.borderRadius = '10px';
            col.style.padding = '12px';
            col.style.background = '#fafafa';

            var hd = document.createElement('div');
            hd.style.fontSize = '13px';
            hd.style.fontWeight = '700';
            hd.style.marginBottom = '4px';
            hd.textContent = title + ': ' + getBodyDisplayName(graph, body);
            col.appendChild(hd);

            var sub = document.createElement('div');
            sub.style.fontSize = '12px';
            sub.style.color = '#6b7280';
            sub.style.marginBottom = '10px';
            sub.textContent = trim(getStyleValue(graph.getCellStyle(body), 'dftsIP_type', ''));
            col.appendChild(sub);

            var groups = buildPinGroups(pins);
            appendPinGroup(col, 'Output Pins', groups.output);
            appendPinGroup(col, 'Input Pins', groups.input);
            appendPinGroup(col, 'Other Pins', groups.other);

            var label = document.createElement('div');
            label.style.fontSize = '12px';
            label.style.fontWeight = '600';
            label.style.marginTop = '8px';
            label.textContent = 'Current pin';
            col.appendChild(label);

            var select = createPinSelect(pins, selectedKey);
            col.appendChild(select);
            return { node: col, select: select };
        }

        var top = document.createElement('div');
        top.style.fontSize = '12px';
        top.style.marginBottom = '12px';
        top.style.color = '#374151';
        top.textContent = '状态: ' + (record.status || 'unknown') + (record.reason ? ' | ' + record.reason : '');
        wrap.appendChild(top);

        var row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '12px';
        row.style.marginBottom = '16px';
        row.style.alignItems = 'stretch';
        wrap.appendChild(row);

        var sourcePanel = buildColumn('Source', sourceInfo.body, sourcePins, record.srcPinKey || sourceInfo.pinKey);
        var targetPanel = buildColumn('Target', targetInfo.body, targetPins, record.dstPinKey || targetInfo.pinKey);
        row.appendChild(sourcePanel.node);
        row.appendChild(targetPanel.node);

        var footer = document.createElement('div');
        footer.style.display = 'flex';
        footer.style.justifyContent = 'flex-end';
        footer.style.gap = '8px';
        wrap.appendChild(footer);

        var cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.padding = '6px 12px';
        cancelBtn.style.border = '1px solid #d1d5db';
        cancelBtn.style.background = '#fff';
        cancelBtn.style.borderRadius = '6px';

        var saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.style.padding = '6px 12px';
        saveBtn.style.border = '1px solid #ca8a04';
        saveBtn.style.background = '#f59e0b';
        saveBtn.style.color = '#fff';
        saveBtn.style.borderRadius = '6px';

        footer.appendChild(cancelBtn);
        footer.appendChild(saveBtn);

        var closeDialog = function () {
            if (ui.hideDialog) ui.hideDialog();
        };

        cancelBtn.onclick = closeDialog;
        saveBtn.onclick = function () {
            var srcPin = getPinCandidate(sourcePins, sourcePanel.select.value);
            var dstPin = getPinCandidate(targetPins, targetPanel.select.value);
            if (!srcPin || !dstPin) {
                if (mxUtils && mxUtils.alert) mxUtils.alert('请选择有效的 source/target pin。');
                return;
            }

            graph.getModel().beginUpdate();
            try {
                markAsManagedIpEdge(graph, edge);
                persistLinkRecord(graph, edge, {
                    srcBodyId: sourceInfo.body.getId ? String(sourceInfo.body.getId()) : String(sourceInfo.body.id || ''),
                    srcPinKey: srcPin.pinKey,
                    srcPinName: srcPin.pinName || srcPin.pinKey,
                    dstBodyId: targetInfo.body.getId ? String(targetInfo.body.getId()) : String(targetInfo.body.id || ''),
                    dstPinKey: dstPin.pinKey,
                    dstPinName: dstPin.pinName || dstPin.pinKey,
                    status: STATUS.MANUAL,
                    reason: 'manual-select'
                });
            } finally {
                graph.getModel().endUpdate();
            }

            logConnectionInfo(ui, graph, edge, getLinkRecordFromEdge(graph, edge), 'success', 'Updated connection');
            closeDialog();
        };

        ui.showDialog(wrap, 880, 620, true, true);
    }

    function isIpRelatedTerminal(graph, cell) {
        if (!graph || !cell) return false;
        var style = null;
        try {
            style = graph.getCellStyle(cell);
        } catch (e) { }
        if (NS.isPinCell && NS.isPinCell(graph, cell)) return true;
        if (cell.__dftsSymbolChild && (cell.__dftsSymbolKind === 'stub' || cell.__dftsSymbolKind === 'port')) return true;
        if (String(getStyleValue(style, 'dftsIP_chipBody', '0')) === '1') return true;
        if (String(getStyleValue(style, 'dftsIP_symbol', '0')) === '1') return true;
        if (NS.findChipBodyForCell && NS.findChipBodyForCell(graph, cell)) return true;
        return false;
    }

    function installGraph(graph, ui) {
        if (!graph || graph.__dftsIpEdgeConfigInstalled) return;
        graph.__dftsIpEdgeConfigInstalled = true;

        var realUi = normalizeUi(ui) || getEditorUi();
        debug('install graph', !!graph, 'ui=', !!realUi);
        if (typeof graph.insertEdge === 'function' && !graph.__dftsIpEdgeGraphInsertPatched) {
            graph.__dftsIpEdgeGraphInsertPatched = true;
            var baseGraphInsertEdge = graph.insertEdge;
            graph.insertEdge = function (parent, id, value, source, target, style) {
                var edge = baseGraphInsertEdge.apply(this, arguments);
                if (!edge) return edge;
                debug('graph.insertEdge', 'edge=', edge.id || '', 'source=', source && source.id, 'target=', target && target.id);
                var styleObj = graph.getCellStyle(edge);
                if (String(getStyleValue(styleObj, 'floorplanLine', '0')) === '1') return edge;
                if (!isIpRelatedTerminal(graph, source) || !isIpRelatedTerminal(graph, target)) {
                    debug('graph.insertEdge skipped', 'sourceOk=', isIpRelatedTerminal(graph, source), 'targetOk=', isIpRelatedTerminal(graph, target), 'sourceStyle=', source && source.getStyle ? source.getStyle() : '', 'targetStyle=', target && target.getStyle ? target.getStyle() : '');
                    return edge;
                }
                resolveEdgeConnection(graph, edge, {
                    ui: realUi,
                    log: true,
                    openDialogOnAmbiguous: true
                });
                return edge;
            };
        }

        var handler = graph.connectionHandler;
        if (handler && !handler.__dftsIpEdgeConfigInsertPatched) {
            handler.__dftsIpEdgeConfigInsertPatched = true;
            var baseInsertEdge = handler.insertEdge;
            handler.insertEdge = function (parent, id, value, source, target, style) {
                var edge = baseInsertEdge.call(this, parent, id, value, source, target, style);
                if (!edge) return edge;
                debug('connectionHandler.insertEdge', 'edge=', edge.id || '', 'source=', source && source.id, 'target=', target && target.id);
                var styleObj = graph.getCellStyle(edge);
                if (String(getStyleValue(styleObj, 'floorplanLine', '0')) === '1') return edge;
                if (!isIpRelatedTerminal(graph, source) || !isIpRelatedTerminal(graph, target)) {
                    debug('connectionHandler.insertEdge skipped', 'sourceOk=', isIpRelatedTerminal(graph, source), 'targetOk=', isIpRelatedTerminal(graph, target), 'sourceStyle=', source && source.getStyle ? source.getStyle() : '', 'targetStyle=', target && target.getStyle ? target.getStyle() : '');
                    return edge;
                }
                resolveEdgeConnection(graph, edge, {
                    ui: realUi,
                    log: true,
                    openDialogOnAmbiguous: true
                });
                return edge;
            };

            handler.addListener(mxEvent.CONNECT, function (sender, evt) {
                var edge = evt.getProperty('cell');
                debug('mxEvent.CONNECT', 'edge=', edge && edge.id);
                if (!edge || !edge.edge) return;
                var styleObj = graph.getCellStyle(edge);
                if (String(getStyleValue(styleObj, 'floorplanLine', '0')) === '1') return;
                var src = graph.getModel().getTerminal(edge, true);
                var dst = graph.getModel().getTerminal(edge, false);
                if (!isIpRelatedTerminal(graph, src) || !isIpRelatedTerminal(graph, dst)) return;
                resolveEdgeConnection(graph, edge, {
                    ui: realUi,
                    log: true,
                    openDialogOnAmbiguous: true
                });
            });
        }

        if (!graph.__dftsIpEdgeCellConnectedInstalled) {
            graph.__dftsIpEdgeCellConnectedInstalled = true;
            graph.addListener(mxEvent.CELL_CONNECTED, function (sender, evt) {
                var edge = evt.getProperty('edge');
                debug('mxEvent.CELL_CONNECTED', 'edge=', edge && edge.id);
                if (!edge || !edge.edge) return;
                var styleObj = graph.getCellStyle(edge);
                if (String(getStyleValue(styleObj, 'floorplanLine', '0')) === '1') return;
                var src = graph.getModel().getTerminal(edge, true);
                var dst = graph.getModel().getTerminal(edge, false);
                if (!isIpRelatedTerminal(graph, src) || !isIpRelatedTerminal(graph, dst)) return;
                resolveEdgeConnection(graph, edge, {
                    ui: realUi,
                    log: true,
                    openDialogOnAmbiguous: false
                });
            });
        }

        if (!graph.__dftsIpEdgeClickInstalled) {
            graph.__dftsIpEdgeClickInstalled = true;
            graph.addListener(mxEvent.CLICK, function (sender, evt) {
                var cell = evt.getProperty('cell');
                debug('graph click', 'cell=', cell && cell.id, 'isEdge=', !!(cell && cell.edge));
                if (!cell || !cell.edge) return;
                var cellStyle = graph.getCellStyle(cell);
                if (String(getStyleValue(cellStyle, 'floorplanLine', '0')) === '1') return;

                if (!isManagedIpEdge(graph, cell)) {
                    var src = graph.getModel().getTerminal(cell, true);
                    var dst = graph.getModel().getTerminal(cell, false);
                    if (!isIpRelatedTerminal(graph, src) || !isIpRelatedTerminal(graph, dst)) return;
                    resolveEdgeConnection(graph, cell, {
                        ui: realUi,
                        log: true,
                        openDialogOnAmbiguous: false
                    });
                }

                if (!isManagedIpEdge(graph, cell)) return;
                openEdgeConfigDialog(graph, cell, realUi);
                evt.consume();
            });
        }
    }

    function install(ui) {
        var realUi = normalizeUi(ui) || getEditorUi();
        var graph = realUi && realUi.editor ? realUi.editor.graph : null;
        if (!graph) return;
        installGraph(graph, realUi);
    }

    var baseEnsureGraphPatches = NS.ensureGraphPatches;
    NS.ensureGraphPatches = function (graph) {
        if (typeof baseEnsureGraphPatches === 'function') baseEnsureGraphPatches.apply(this, arguments);
        installGraph(graph, getEditorUi());
    };

    NS.resolveEdgeConnection = resolveEdgeConnection;
    NS.openEdgeConfigDialog = openEdgeConfigDialog;
    NS.installIpEdgeConfig = install;

})(this);
