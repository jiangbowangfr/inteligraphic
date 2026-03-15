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

    function escapeHtml(v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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

    function isFloorplanModuleCell(graph, cell) {
        if (!graph || !cell) return false;
        var style = '';
        try { style = cell.style || (graph.getModel && graph.getModel().getStyle ? graph.getModel().getStyle(cell) : ''); } catch (e) {}
        return String(styleValue(style, 'dftsIP_type', '')) === 'floorplan_module' ||
            (String(styleValue(style, 'floorplan', '0')) === '1' && String(styleValue(style, 'dftsFloorplanRect', '0')) === '1');
    }

    function installFloorplanLabelRenderer() {
        if (global.__DFTS_FLOORPLAN_LABEL_RENDER_PATCHED__) return;
        var GraphCtor = global.Graph || global.mxGraph;
        if (!GraphCtor || !GraphCtor.prototype) return;
        var proto = GraphCtor.prototype;
        var base = proto.convertValueToString;
        proto.convertValueToString = function (cell) {
            var text = base ? base.apply(this, arguments) : (cell && cell.value != null ? String(cell.value) : '');
            if (!isFloorplanModuleCell(this, cell)) return text;
            var style = '';
            try { style = cell && cell.style ? String(cell.style) : ''; } catch (e) {}
            var moduleName = trim(styleValue(style, 'dftsFloorplan_moduleName', '')) || trim(text);
            var instanceName = trim(styleValue(style, 'dftsFloorplan_instanceName', ''));
            if (!instanceName) return moduleName;
            return '<div style="text-align:center;line-height:1.25;">' +
                '<div>' + escapeHtml(moduleName) + '</div>' +
                '<div style="margin-top:6px;font-size:0.7em;color:#666;">' + escapeHtml(instanceName) + '</div>' +
                '</div>';
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
            instanceName = getNextInstanceName(opt.graph, def.instanceBaseName || def.defaultLabel || def.key);
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
            'dftsFloorplan_moduleName=',
            'dftsFloorplan_instanceName=' + instanceName,
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

    installFloorplanLabelRenderer();

    global.buildFloorplanModule = makeCreateFn('FloorplanModule');
    global.installFloorplanPalette = installFloorplanPalette;
    global.installFloorplanIp = installFloorplanIp;

})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
