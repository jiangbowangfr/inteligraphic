(function (global) {
    var NS = global.DftsFloorplan = global.DftsFloorplan || {};
    if (NS.__loaded) return;
    NS.__loaded = true;

    NS.VERSION = '2.1.0';
    NS.POLICY = {
        LABEL_USER_OR_AUTO_INCREMENT: 'user_or_auto_increment',
        INSTANCE_REQUIRED: 'required',
        INSTANCE_OPTIONAL: 'optional',
        INSTANCE_DISABLED: 'disabled'
    };
    NS._defsByKey = NS._defsByKey || {};

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

    function trim(v) {
        return v == null ? '' : String(v).replace(/^\s+|\s+$/g, '');
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

    function setStyleValue(styleText, key, value) {
        var raw = String(styleText || '');
        var next = key + '=' + String(value == null ? '' : value);
        var re = new RegExp('(?:^|;)' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=[^;]*');
        if (re.test(raw)) {
            return raw.replace(re, function (m) {
                return (m.charAt(0) === ';' ? ';' : '') + next;
            });
        }
        if (raw && raw.charAt(raw.length - 1) !== ';') raw += ';';
        return raw + next + ';';
    }

    function stripMarkup(v) {
        return String(v == null ? '' : v)
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, ' ');
    }

    function firstMeaningfulLine(v) {
        var lines = stripMarkup(v).replace(/\r/g, '\n').split('\n');
        for (var i = 0; i < lines.length; i++) {
            var line = trim(lines[i]);
            if (line) return line;
        }
        return '';
    }

    function normalizeToken(v) {
        return trim(v).replace(/\n/g, ' ').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    }

    function parseBoolStyle(v, fallback) {
        if (v == null || v === '') return !!fallback;
        var s = String(v).toLowerCase();
        if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return true;
        if (s === '0' || s === 'false' || s === 'no' || s === 'off') return false;
        return !!fallback;
    }

    function isAutoInstanceName(instanceName, moduleName) {
        var inst = normalizeToken(instanceName);
        var mod = normalizeToken(moduleName);
        if (!inst) return true;
        if (!/_inst_\d+$/i.test(inst)) return false;
        if (!mod) return true;
        return new RegExp('^' + mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_inst_\\d+$', 'i').test(inst);
    }

    function isFloorplanModuleCell(graph, cell) {
        if (!graph || !cell) return false;
        var style = '';
        try { style = cell.style || (graph.getModel && graph.getModel().getStyle ? graph.getModel().getStyle(cell) : ''); } catch (e) {}
        return String(styleValue(style, 'dftsIP_type', '')) === 'floorplan_module' ||
            (String(styleValue(style, 'floorplan', '0')) === '1' && String(styleValue(style, 'dftsFloorplanRect', '0')) === '1');
    }

    function getInstanceLabelCell(graph, moduleCell) {
        if (!graph || !moduleCell) return null;
        var model = graph.getModel();
        var count = model.getChildCount(moduleCell);
        for (var i = 0; i < count; i++) {
            var child = model.getChildAt(moduleCell, i);
            if (child && child.__dftsFloorplanInstanceLabel) return child;
            var style = child && child.style ? String(child.style) : '';
            if (String(styleValue(style, 'dftsFloorplanInstanceLabel', '0')) === '1') return child;
        }
        return null;
    }

    function getFloorplanModuleParent(graph, cell) {
        if (!graph || !cell) return null;
        var model = graph.getModel();
        var parent = model ? model.getParent(cell) : null;
        return isFloorplanModuleCell(graph, parent) ? parent : null;
    }

    function syncInstanceLabelCell(graph, moduleCell) {
        if (!graph || !moduleCell || !isFloorplanModuleCell(graph, moduleCell)) return;
        var model = graph.getModel();
        var style = String(moduleCell.style || '');
        var moduleName = trim(styleValue(style, 'dftsFloorplan_moduleName', '')) || firstMeaningfulLine(moduleCell.value);
        var instanceName = trim(styleValue(style, 'dftsFloorplan_instanceName', ''));
        var geo = moduleCell.geometry;
        if (!geo) return;
        var child = getInstanceLabelCell(graph, moduleCell);
        var fontSize = Math.max(9, Math.round((parseInt(styleValue(style, 'fontSize', '20'), 10) || 20) * 0.55));
        var childStyle = [
            'shape=text',
            'html=1',
            'whiteSpace=wrap',
            'align=center',
            'verticalAlign=middle',
            'strokeColor=none',
            'fillColor=none',
            'resizable=0',
            'movable=0',
            'rotatable=0',
            'deletable=0',
            'editable=1',
            'selectable=1',
            'fontStyle=0',
            'fontSize=' + fontSize,
            'fontColor=#666666',
            'dftsFloorplanInstanceLabel=1'
        ].join(';') + ';';
        var childWidth = Math.max(40, Math.round(Number(geo.width || 0) - 20));
        var childHeight = Math.max(14, Math.round(fontSize * 1.6));
        var childX = Math.max(0, Math.round((Number(geo.width || 0) - childWidth) / 2));
        var childY = Math.max(0, Math.round(Number(geo.height || 0) * 0.68));
        model.beginUpdate();
        try {
            if (!instanceName) {
                if (child) model.remove(child);
                return;
            }
            if (!child) {
                child = new mxCell(instanceName, new mxGeometry(childX, childY, childWidth, childHeight), childStyle);
                child.vertex = true;
                child.connectable = false;
                child.__dftsFloorplanInstanceLabel = true;
                model.add(moduleCell, child);
            } else {
                model.setValue(child, instanceName);
                model.setStyle(child, childStyle);
                model.setGeometry(child, new mxGeometry(childX, childY, childWidth, childHeight));
            }
            child.visible = true;
        } finally {
            model.endUpdate();
        }
        if (graph.refresh) graph.refresh(moduleCell);
    }

    function syncFloorplanModuleCell(graph, cell) {
        if (!graph || !cell || !isFloorplanModuleCell(graph, cell)) return;
        var model = graph.getModel();
        var style = String(cell.style || '');
        var rawValue = cell.value != null ? String(cell.value) : '';
        var previousModule = firstMeaningfulLine(rawValue) || 'MODULE';
        var currentModule = trim(styleValue(style, 'dftsFloorplan_moduleName', '')) || previousModule || 'MODULE';
        var currentInstance = trim(styleValue(style, 'dftsFloorplan_instanceName', ''));
        var instanceAuto = parseBoolStyle(styleValue(style, 'dftsFloorplan_instanceAuto', ''), !currentInstance || isAutoInstanceName(currentInstance, previousModule));
        if ((!currentInstance || instanceAuto) && currentModule !== previousModule) {
            currentInstance = getNextInstanceName(graph, currentModule);
            instanceAuto = true;
        }
        var nextValue = currentModule;
        var nextStyle = style;
        nextStyle = setStyleValue(nextStyle, 'dftsFloorplan_moduleName', currentModule);
        nextStyle = setStyleValue(nextStyle, 'dftsFloorplan_instanceName', currentInstance);
        nextStyle = setStyleValue(nextStyle, 'dftsFloorplan_instanceAuto', instanceAuto ? '1' : '0');
        model.beginUpdate();
        try {
            if (String(rawValue) !== String(nextValue)) model.setValue(cell, nextValue);
            if (String(style) !== String(nextStyle)) model.setStyle(cell, nextStyle);
        } finally {
            model.endUpdate();
        }
        syncInstanceLabelCell(graph, cell);
    }

    function syncAllFloorplanModules(graph) {
        var cells = getAllFloorplanRects(graph);
        for (var i = 0; i < cells.length; i++) syncFloorplanModuleCell(graph, cells[i]);
    }

    function installFloorplanLabelRenderer() {
        if (global.__DFTS_FLOORPLAN_LABEL_RENDER_PATCHED__) return;
        var GraphCtor = global.Graph || global.mxGraph;
        if (!GraphCtor || !GraphCtor.prototype) return;
        var proto = GraphCtor.prototype;
        var base = proto.convertValueToString;
        var baseLabelChanged = proto.cellLabelChanged;
        var baseIsCellEditable = proto.isCellEditable;
        var baseIsCellSelectable = proto.isCellSelectable;
        proto.convertValueToString = function (cell) {
            var text = base ? base.apply(this, arguments) : (cell && cell.value != null ? String(cell.value) : '');
            if (cell && cell.__dftsFloorplanInstanceLabel) return text;
            if (!isFloorplanModuleCell(this, cell)) return text;
            var style = '';
            try { style = cell && cell.style ? String(cell.style) : ''; } catch (e) {}
            var moduleName = trim(styleValue(style, 'dftsFloorplan_moduleName', '')) || firstMeaningfulLine(text);
            return moduleName || text;
        };
        proto.isCellEditable = function (cell) {
            if (cell && cell.__dftsFloorplanInstanceLabel) return !this.isCellLocked(cell);
            return baseIsCellEditable ? baseIsCellEditable.apply(this, arguments) : true;
        };
        proto.isCellSelectable = function (cell) {
            if (cell && cell.__dftsFloorplanInstanceLabel) return true;
            return baseIsCellSelectable ? baseIsCellSelectable.apply(this, arguments) : true;
        };
        proto.cellLabelChanged = function (cell, value, autoSize) {
            if (cell && cell.__dftsFloorplanInstanceLabel) {
                var parent = getFloorplanModuleParent(this, cell);
                if (!parent) return baseLabelChanged ? baseLabelChanged.apply(this, arguments) : undefined;
                var nextInstanceName = firstMeaningfulLine(value);
                var model = this.getModel ? this.getModel() : null;
                if (!model) return undefined;
                model.beginUpdate();
                try {
                    var parentStyle = String(parent.style || '');
                    parentStyle = setStyleValue(parentStyle, 'dftsFloorplan_instanceName', nextInstanceName);
                    parentStyle = setStyleValue(parentStyle, 'dftsFloorplan_instanceAuto', '0');
                    model.setStyle(parent, parentStyle);
                    if (baseLabelChanged) baseLabelChanged.call(this, cell, nextInstanceName, autoSize);
                } finally {
                    model.endUpdate();
                }
                syncFloorplanModuleCell(this, parent);
                return undefined;
            }
            if (!isFloorplanModuleCell(this, cell)) {
                return baseLabelChanged ? baseLabelChanged.apply(this, arguments) : undefined;
            }
            var moduleName = firstMeaningfulLine(value);
            var currentStyle = String(cell && cell.style || '');
            var prevInstance = trim(styleValue(currentStyle, 'dftsFloorplan_instanceName', ''));
            var prevModule = trim(styleValue(currentStyle, 'dftsFloorplan_moduleName', '')) || firstMeaningfulLine(cell && cell.value);
            var nextModule = moduleName || prevModule || 'MODULE';
            var nextInstance = prevInstance;
            var instanceAuto = parseBoolStyle(styleValue(currentStyle, 'dftsFloorplan_instanceAuto', ''), !prevInstance || isAutoInstanceName(prevInstance, prevModule));
            if (!prevInstance || instanceAuto) {
                nextInstance = getNextInstanceName(this, nextModule);
                instanceAuto = true;
            }
            var model = this.getModel ? this.getModel() : null;
            if (!model) return baseLabelChanged ? baseLabelChanged.apply(this, arguments) : undefined;
            model.beginUpdate();
            try {
                if (baseLabelChanged) baseLabelChanged.call(this, cell, nextModule, autoSize);
                var style = String(cell && cell.style || '');
                style = setStyleValue(style, 'dftsFloorplan_moduleName', nextModule);
                style = setStyleValue(style, 'dftsFloorplan_instanceName', nextInstance);
                style = setStyleValue(style, 'dftsFloorplan_instanceAuto', instanceAuto ? '1' : '0');
                model.setStyle(cell, style);
            } finally {
                model.endUpdate();
            }
            syncInstanceLabelCell(this, cell);
            return undefined;
        };
        global.__DFTS_FLOORPLAN_LABEL_RENDER_PATCHED__ = true;
    }

    function rejectCreate(msg) {
        if (typeof mxUtils !== 'undefined' && mxUtils.alert) mxUtils.alert(msg);
        throw new Error(msg);
    }

    function getAllFloorplanRects(graph) {
        var out = [];
        if (!graph) return out;
        var model = graph.getModel();

        function walk(cell) {
            if (!cell) return;
            if (cell.vertex) {
                var style = graph.getCellStyle(cell);
                if (String(mxUtils.getValue(style, 'floorplan', '0')) === '1' && String(mxUtils.getValue(style, 'dftsFloorplanRect', '0')) === '1') {
                    out.push(cell);
                }
            }
            var n = model.getChildCount(cell);
            for (var i = 0; i < n; i++) walk(model.getChildAt(cell, i));
        }

        walk(model.getRoot());
        return out;
    }

    function hasLabel(graph, label, excludeCell) {
        label = trim(label);
        if (!label) return false;
        var cells = getAllFloorplanRects(graph);
        for (var i = 0; i < cells.length; i++) {
            if (cells[i] === excludeCell) continue;
            var value = cells[i].value != null ? String(cells[i].value) : '';
            if (trim(value) === label) return true;
        }
        return false;
    }

    function getNextAutoLabel(graph, prefix) {
        prefix = trim(prefix) || 'MODULE';
        var re = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_(\\d+)$');
        var maxIndex = -1;
        var cells = getAllFloorplanRects(graph);
        for (var i = 0; i < cells.length; i++) {
            var txt = trim(cells[i].value != null ? String(cells[i].value) : '');
            var m = re.exec(txt);
            if (!m) continue;
            var idx = parseInt(m[1], 10);
            if (!isNaN(idx)) maxIndex = Math.max(maxIndex, idx);
        }
        return prefix + '_' + (maxIndex + 1);
    }

    function getNextInstanceName(graph, base) {
        base = trim(base || 'MODULE').replace(/\n/g, ' ').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'MODULE';
        var re = new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '_inst_(\\d+)$', 'i');
        var maxIndex = 0;
        var cells = getAllFloorplanRects(graph);
        for (var i = 0; i < cells.length; i++) {
            var style = cells[i] && cells[i].style ? String(cells[i].style) : '';
            var name = trim(styleValue(style, 'dftsFloorplan_instanceName', ''));
            var m = re.exec(name);
            if (!m) continue;
            var idx = parseInt(m[1], 10);
            if (!isNaN(idx)) maxIndex = Math.max(maxIndex, idx);
        }
        return base + '_inst_' + (maxIndex + 1);
    }

    function registerDefinition(def) {
        if (!def || !def.key) throw new Error('registerDefinition 缺少 key');
        def.labelPolicy = NS.POLICY.LABEL_USER_OR_AUTO_INCREMENT;
        if (!def.instancePolicy) def.instancePolicy = NS.POLICY.INSTANCE_REQUIRED;
        def.lockLabel = false;
        NS._defsByKey[def.key] = def;
        return def;
    }

    function resolveLabel(graph, def, opt) {
        var userLabel = trim(opt && opt.label);
        if (userLabel) {
            if (hasLabel(graph, userLabel, null)) rejectCreate('Floorplan 名称已存在：' + userLabel);
            return userLabel;
        }
        return getNextAutoLabel(graph, def.autoLabelPrefix || def.defaultLabel || def.key);
    }

    function buildRectCell(def, label, opt) {
        opt = opt || {};
        var lineNS = getLineNS();
        if (lineNS && lineNS.ensurePerimeterRegistered) lineNS.ensurePerimeterRegistered();

        var w = Math.max(40, parseInt(opt.w, 10) || def.w || 220);
        var h = Math.max(30, parseInt(opt.h, 10) || def.h || 140);
        var rounded = parseInt(opt.rounded, 10);
        if (isNaN(rounded)) rounded = parseInt(def.rounded, 10) || 0;
        var strokeWidth = parseFloat(opt.strokeWidth);
        if (isNaN(strokeWidth)) strokeWidth = (def.strokeWidth == null ? 1 : def.strokeWidth);
        var fontSize = Math.max(10, parseInt(opt.fontSize, 10) || def.fontSize || 20);

        var instanceName = trim(opt.instanceName);
        var instancePolicy = def.instancePolicy || NS.POLICY.INSTANCE_REQUIRED;
        if (!instanceName && instancePolicy !== NS.POLICY.INSTANCE_DISABLED) {
            instanceName = getNextInstanceName(opt.graph, label || def.instanceBaseName || def.defaultLabel || def.key);
        }

        var style = [
            'shape=rectangle',
            'rounded=' + rounded,
            'whiteSpace=wrap',
            'html=1',
            'connectable=1',
            'resizable=1',
            'movable=1',
            'editable=1',
            'strokeWidth=' + strokeWidth,
            'fontSize=' + fontSize,
            'floorplan=1',
            'perimeter=floorplanAnyPoint',
            'dftsFloorplanRect=1',
            'dftsFloorplan_type=' + (def.typeName || def.key),
            'dftsFloorplan_labelPolicy=' + NS.POLICY.LABEL_USER_OR_AUTO_INCREMENT,
            'dftsFloorplan_defKey=' + def.key,
            'dftsIP_type=floorplan_module',
            // 弹窗里的特殊参数
            'dftsFloorplan_moduleName=' + label,
            'dftsFloorplan_instanceName=' + instanceName,
            'dftsFloorplan_instanceAuto=' + (instanceName ? '1' : '0'),
            'dftsFloorplan_designLevel='
        ].join(';') + ';';

        var cell = new mxCell(label, new mxGeometry(0, 0, w, h), style);
        cell.vertex = true;
        cell.connectable = true;
        return cell;
    }

    function createByDefinition(graph, def, opt) {
        opt = opt || {};
        var label = resolveLabel(graph, def, opt);
        var cell = buildRectCell(def, label, Object.assign({}, opt, { graph: graph }));
        if (typeof def.afterCreate === 'function') def.afterCreate(graph, cell, opt, { resolvedLabel: label });
        syncFloorplanModuleCell(graph, cell);
        return cell;
    }

    function createByKey(graph, key, opt) {
        var def = NS._defsByKey[key];
        if (!def) throw new Error('未注册的 floorplan key：' + key);
        return createByDefinition(graph, def, opt);
    }

    function makeCreateFn(key) {
        return function (graph, opt) {
            try {
                return createByKey(graph, key, opt || {});
            } catch (e) {
                if (typeof console !== 'undefined' && console.error) console.error('[DftsFloorplan] create failed:', key, e);
                return null;
            }
        };
    }

    registerDefinition({
        key: 'FloorplanModule',
        typeName: 'module',
        defaultLabel: 'MODULE',
        autoLabelPrefix: 'MODULE',
        instanceBaseName: 'MODULE',
        w: 220,
        h: 140,
        rounded: 0,
        strokeWidth: 1,
        fontSize: 20
    });

    function buildFallbackLineCell() {
        var lineNS = getLineNS();
        if (lineNS && lineNS.buildFloorplanLineCell) return lineNS.buildFloorplanLineCell();
        var geo = new mxGeometry();
        geo.relative = true;
        geo.sourcePoint = new mxPoint(0, 0);
        geo.targetPoint = new mxPoint(80, 0);
        var e = new mxCell('', geo, 'edgeStyle=none;orthogonal=0;endArrow=classic;strokeWidth=2;floorplanLine=1;');
        e.edge = true;
        return e;
    }

    function installFloorplanPalette(ui) {
        var realUi = normalizeUi(ui);
        var sb = realUi && realUi.sidebar;
        if (!sb || sb._dftsFloorplanPaletteInstalled) return;
        sb._dftsFloorplanPaletteInstalled = true;

        var lineNS = getLineNS();
        if (lineNS && lineNS.ensurePerimeterRegistered) lineNS.ensurePerimeterRegistered();

        Sidebar.prototype.addFloorplan = function (expanded) {
            var sidebar = this;
            var fns = [
                mxUtils.bind(this, function () {
                    var graph = sidebar.editorUi.editor.graph;
                    var cell = createByKey(graph, 'FloorplanModule', {});
                    return this.createVertexTemplateFromCells([cell], cell.geometry.width, cell.geometry.height, 'Floorplan Module');
                }),
                // mxUtils.bind(this, function () {
                //     var graph = sidebar.editorUi.editor.graph;
                //     var cell = createByKey(graph, 'FloorplanBlock', {});
                //     return this.createVertexTemplateFromCells([cell], cell.geometry.width, cell.geometry.height, 'Floorplan Block');
                // }),
                mxUtils.bind(this, function () {
                    var line = buildFallbackLineCell();
                    return this.createEdgeTemplateFromCells([line], 100, 20, 'Floorplan Line');
                })
            ];
            this.addPaletteFunctions('floorplan', 'Floorplan', expanded, fns);
        };

        sb.addFloorplan(true);
    }

    function installFloorplanIp(ui) {
        var realUi = normalizeUi(ui);
        if (!realUi) return;
        installFloorplanLabelRenderer();
        var graph = realUi.editor && realUi.editor.graph ? realUi.editor.graph : null;
        if (graph && !graph.__dftsFloorplanSyncInstalled) {
            graph.__dftsFloorplanSyncInstalled = true;
            var syncBusy = false;
            var scheduleSync = function () {
                if (syncBusy) return;
                syncBusy = true;
                try {
                    syncAllFloorplanModules(graph);
                } finally {
                    syncBusy = false;
                }
            };
            try { graph.getModel().addListener(mxEvent.CHANGE, scheduleSync); } catch (e) {}
            scheduleSync();
        }
        var lineNS = getLineNS();
        if (lineNS) {
            if (lineNS.enableFloorplanFreeConnect) lineNS.enableFloorplanFreeConnect(realUi);
            if (lineNS.installFloorplanLineTool) lineNS.installFloorplanLineTool(realUi);
            if (lineNS.installFloorplanLineContinueHandles) lineNS.installFloorplanLineContinueHandles(realUi);
        }
        installFloorplanPalette(realUi);
    }

    NS.rejectCreate = rejectCreate;
    NS.getAllFloorplanRects = getAllFloorplanRects;
    NS.hasLabel = hasLabel;
    NS.getNextAutoLabel = getNextAutoLabel;
    NS.registerDefinition = registerDefinition;
    NS.createByKey = createByKey;
    NS.makeCreateFn = makeCreateFn;
    NS.installFloorplanPalette = installFloorplanPalette;
    NS.installFloorplanIp = installFloorplanIp;
    NS.syncFloorplanModuleCell = syncFloorplanModuleCell;

    installFloorplanLabelRenderer();

    global.buildFloorplanModule = makeCreateFn('FloorplanModule');
    global.installFloorplanPalette = installFloorplanPalette;
    global.installFloorplanIp = installFloorplanIp;

})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
