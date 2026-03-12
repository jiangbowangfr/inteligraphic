// ============ PortModule：端口可配置 & 单一小端点可连（调试版） ============
// 只允许 :ep ↔ :ep，每端最多一条；普通图形不受影响。
// 调试可视化：端点半透明显示，便于看到“该接哪里”。
Draw.loadPlugin(function (ui) {
    var graph = ui.editor.graph, model = graph.getModel();

    // ========== 调试开关 ==========
    var DEBUG_VIS = false;        // 端点小圆是否可见（调试时 true，更易对准）
    var LOG = true;             // 控制台日志

    function log() { if (LOG && console && console.log) console.log.apply(console, arguments); }

    // 读/写 Edit Data
    function gGet(cell, k, d) { try { return graph.getAttributeForCell(cell, k, d); } catch (e) { return d; } }
    function gSet(cell, k, v) { graph.setAttributeForCell(cell, k, v); }

    // 名称列表
    function parseNames(str, count, prefix) {
        var arr = (str || "").split(",").map(s => s.trim()).filter(Boolean);
        for (var i = arr.length; i < count; i++) arr.push(prefix + (i + 1));
        return arr.slice(0, count);
    }

    // 类型判定
    function isPortModule(cell) { return gGet(cell, 'dfts_type', '') === 'portmodule'; }
    function isPortRect(cell) { return !!cell && /:(L|R):\d+$/.test(String(cell.id || "")); }
    function isPortLabel(cell) { return !!cell && /:(L|R):\d+:label$/.test(String(cell.id || "")); }
    function isPortEP(cell) { return !!cell && /:(L|R):\d+:ep$/.test(String(cell.id || "")); }

    // 主模块：禁止连线（避免高亮与假把手）
    function ensureParentStyle(cell) {
        var st = cell.style || "";
        // 确保外轮廓不可连，且本体 connectable=false（双保险）
        if (st.indexOf("outlineConnect=0") < 0 || st.indexOf("connectable=0") < 0) {
            model.beginUpdate();
            try {
                graph.setCellStyle(st + ";outlineConnect=0;connectable=0;", [cell]);
                if (typeof cell.setConnectable === 'function') cell.setConnectable(false);
            } finally { model.endUpdate(); }
        }
    }

    // 创建/更新端口脚、端点、内部标签
    function upsertPort(parent, side /* 'L'|'R' */, index, total, name, idHint) {
        var pid = idHint || (parent.id + ":" + side + ":" + index);
        var port = model.getCell(pid);

        // 尺寸参数
        var thickness = 2;   // 脚厚
        var len = 14;        // 脚长
        var epSize = 6;      // 端点直径（调试版略大，便于点中）

        // 端口脚（矩形，不可连）
        var PORT_STYLE =
            "shape=rectangle;rounded=0;strokeColor=#000000;fillColor=#000000;strokeWidth=1;" +
            "noLabel=1;outlineConnect=0;connectable=0;movable=0;resizable=0;rotatable=0;deletable=0;" +
            "pointerEvents=0;";   
        if (!port) {
            port = new mxCell("", new mxGeometry(0, 0, len, thickness), PORT_STYLE);
            port.vertex = true;
            port.id = pid;
            model.add(parent, port);
        } else {
            port.style = PORT_STYLE;
            port.value = "";
            port.vertex = true;
        }

        // 均匀分布在边上
        var pgeo = model.getGeometry(parent);
        var y = Math.round(((index + 1) * pgeo.height) / (total + 1)) - Math.floor(thickness / 2);

        var geo = port.getGeometry().clone();
        if (side === 'L') { geo.x = -len; geo.y = y; } else { geo.x = pgeo.width; geo.y = y; }
        geo.width = len; geo.height = thickness;
        model.setGeometry(port, geo);

        // 端点（唯一可连）
        var epId = pid + ":ep";
        var ep = model.getCell(epId);
        var EP_STYLE = "shape=ellipse;perimeter=ellipsePerimeter;noLabel=1;" +
            (DEBUG_VIS
                ? "opacity=80;strokeOpacity=80;fillOpacity=30;strokeColor=#1a73e8;fillColor=#1a73e8;"
                : "opacity=0;strokeOpacity=0;fillOpacity=0;") +
            "connectable=1;movable=0;resizable=0;rotatable=0;deletable=0;outlineConnect=1;";

        if (!ep) {
            ep = new mxCell("", new mxGeometry(0, 0, epSize, epSize), EP_STYLE);
            ep.vertex = true;
            ep.id = epId;
            model.add(parent, ep);
        } else {
            ep.style = EP_STYLE;
            ep.vertex = true;
        }

        // 端点位置：脚外端正中（端点中心=脚最外端）
        var tipCenterX = (side === 'L') ? (-len) : (pgeo.width + len);
        var epGeo = ep.getGeometry().clone();
        epGeo.x = Math.round(tipCenterX - epSize / 2);
        epGeo.y = Math.round(y + thickness / 2 - epSize / 2);
        epGeo.width = epSize; epGeo.height = epSize;
        model.setGeometry(ep, epGeo);

        // 内部标签（不可编辑）
        var labelId = pid + ":label";
        var label = model.getCell(labelId);
        var LABEL_STYLE =
            "text;autosize=1;fontSize=12;verticalAlign=middle;" +
            "align=" + ((side === 'L') ? "left" : "right") + ";" +
            "editable=0;connectable=0;movable=0;resizable=0;rotatable=0;deletable=0;" +
            "pointerEvents=0;";   
        if (!label) {
            label = new mxCell(name || "", new mxGeometry(0, 0, 60, 16), LABEL_STYLE);
            label.vertex = true;
            label.id = labelId;
            model.add(parent, label);
        }
        label.value = name || "";
        label.style = LABEL_STYLE;
        graph.updateCellSize(label);

        var lgeo = label.getGeometry().clone();
        var pad = 6;
        if (side === 'L') {
            lgeo.x = pad;
            lgeo.y = y - Math.floor(lgeo.height / 2) + Math.floor(thickness / 2);
        } else {
            lgeo.x = pgeo.width - pad - lgeo.width;
            lgeo.y = y - Math.floor(lgeo.height / 2) + Math.floor(thickness / 2);
        }
        model.setGeometry(label, lgeo);
    }

    // —— 禁止选择脚/标签/端点（避免红框） —— 
    var oldIsCellSelectable = graph.isCellSelectable.bind(graph);
    graph.isCellSelectable = function (cell) {
        if (!cell) return false;
        if (isPortRect(cell) || isPortLabel(cell) || isPortEP(cell)) return false; // ★ 关键
        return oldIsCellSelectable(cell);
    };


    // 重建端口
    function rebuildPorts(cell) {
        ensureParentStyle(cell);

        var inCount = Math.max(0, parseInt(gGet(cell, 'in_count', '2')) || 0);
        var outCount = Math.max(0, parseInt(gGet(cell, 'out_count', '2')) || 0);
        var inNames = parseNames(gGet(cell, 'in_names', ""), inCount, "IN");
        var outNames = parseNames(gGet(cell, 'out_names', ""), outCount, "OUT");

        model.beginUpdate();
        try {
            var keep = {};
            for (var i = 0; i < inCount; i++) {
                var id = cell.id + ":L:" + i;
                upsertPort(cell, 'L', i, inCount, inNames[i], id);
                keep[id] = keep[id + ":label"] = keep[id + ":ep"] = true;
            }
            for (var j = 0; j < outCount; j++) {
                var id2 = cell.id + ":R:" + j;
                upsertPort(cell, 'R', j, outCount, outNames[j], id2);
                keep[id2] = keep[id2 + ":label"] = keep[id2 + ":ep"] = true;
            }

            // 清理多余
            var children = model.getChildCells(cell);
            for (var k = 0; k < children.length; k++) {
                var ch = children[k];
                var idStr = String(ch.id || "");
                var isPluginChild =
                    /:(L|R):\d+$/.test(idStr) || /:(L|R):\d+:label$/.test(idStr) || /:(L|R):\d+:ep$/.test(idStr);
                if (isPluginChild && !keep[idStr]) {
                    var edges = model.getEdges(ch) || [];
                    for (var e = 0; e < edges.length; e++) model.remove(edges[e]);
                    model.remove(ch);
                }
            }
        } finally { model.endUpdate(); }
    }

    // —— 把手策略 ——（只给 :ep 一枚把手；Port 家族其它元素、本体均无把手；普通图形按默认）
    var oldGetAllConstraints = graph.getAllConnectionConstraints ?
        graph.getAllConnectionConstraints.bind(graph) : null;

    graph.getAllConnectionConstraints = function (terminal, source) {
        var cell = terminal && terminal.cell;
        if (!cell) return [];

        if (isPortEP(cell)) {
            return [new mxConnectionConstraint(new mxPoint(0.5, 0.5), false)];
        }
        if (isPortModule(cell) || isPortRect(cell) || isPortLabel(cell)) return [];

        return oldGetAllConstraints ? oldGetAllConstraints(terminal, source) : null;
    };

    
    // —— 哪些单元可“当作连接点” ——（让 :ep 可连；Port 家族其它元素不可连；普通图形不变）
    var oldIsConnectableCell = graph.connectionHandler.isConnectableCell.bind(graph.connectionHandler);
    graph.connectionHandler.isConnectableCell = function (cell) {
        if (!cell) return false;
        if (isPortEP(cell)) return true; // 端点强制可连
        if (isPortModule(cell) || isPortRect(cell) || isPortLabel(cell)) return false; // 家族其余不可连
        return oldIsConnectableCell ? oldIsConnectableCell(cell) : true; // 其它图形保持默认
    };

    // —— 连接校验（核心规则） ——
    var oldIsValidSource = graph.isValidSource.bind(graph);
    var oldIsValidTarget = graph.isValidTarget.bind(graph);
    var oldIsValidConnection = graph.isValidConnection.bind(graph);

    graph.isValidSource = function (cell) {
        if (!cell) return false;
        if (isPortEP(cell)) return (model.getEdges(cell) || []).length === 0;             // 端点：最多一条
        if (isPortModule(cell) || isPortRect(cell) || isPortLabel(cell)) return false;    // 家族其它不可作源
        return oldIsValidSource(cell);
    };

    graph.isValidTarget = function (cell) {
        if (!cell) return false;
        if (isPortEP(cell)) return (model.getEdges(cell) || []).length === 0;             // 端点：最多一条
        if (isPortModule(cell) || isPortRect(cell) || isPortLabel(cell)) return false;    // 家族其它不可作靶
        return oldIsValidTarget(cell);
    };

    graph.isValidConnection = function (source, target) {
        if (!source || !target || source === target) return false;

        // 若任一端是 PortModule 家族成员，则只允许 端点↔端点
        if (isPortEP(source) || isPortRect(source) || isPortLabel(source) || isPortModule(source) ||
            isPortEP(target) || isPortRect(target) || isPortLabel(target) || isPortModule(target)) {
            if (!isPortEP(source) || !isPortEP(target)) return false;
            if ((model.getEdges(source) || []).length > 0) return false;
            if ((model.getEdges(target) || []).length > 0) return false;
            // 如需 L->R 方向限制，在此解析 id 判断
            return true;
        }

        // 普通图形之间：保持原逻辑
        return oldIsValidConnection(source, target);
    };

    // 不允许悬空（松手无目标就丢弃预览边）
    // graph.setAllowDanglingEdges(false);

    // 编辑性：家族成员不可编辑
    var oldIsCellEditable = graph.isCellEditable.bind(graph);
    graph.isCellEditable = function (cell) {
        if (!cell) return false;
        if (isPortLabel(cell) || isPortRect(cell) || isPortEP(cell)) return false;
        return oldIsCellEditable(cell);
    };

    // 配置弹窗
    function openPortModuleDialog(cell) {
        var wrap = document.createElement('div');
        wrap.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;';
        var title = document.createElement('div');
        title.textContent = 'PortModule 端口配置';
        title.style.cssText = 'font-size:16px;font-weight:600;margin:4px 0 8px;';
        wrap.appendChild(title);

        var form = document.createElement('div');
        form.style.cssText = 'flex:1;overflow:auto;padding-right:4px;';
        wrap.appendChild(form);

        function row(label, el) {
            var r = document.createElement('div');
            r.style.cssText = 'display:grid;grid-template-columns:140px 1fr;gap:8px;margin:6px 0;';
            var lab = document.createElement('label'); lab.textContent = label; lab.style.lineHeight = '28px';
            r.appendChild(lab); r.appendChild(el); form.appendChild(r);
        }
        function mkInput(val, type) {
            var i = document.createElement('input');
            i.type = type || 'text'; i.value = val || '';
            i.style.cssText = 'height:28px;width:100%;box-sizing:border-box;'; return i;
        }

        var inCountI = mkInput(gGet(cell, 'in_count', '2'), 'number'); row('输入端口数', inCountI);
        var outCountI = mkInput(gGet(cell, 'out_count', '2'), 'number'); row('输出端口数', outCountI);
        var inNamesI = mkInput(gGet(cell, 'in_names', 'IN1,IN2')); row('输入端口名称(逗号分隔)', inNamesI);
        var outNamesI = mkInput(gGet(cell, 'out_names', 'OUT1,OUT2')); row('输出端口名称(逗号分隔)', outNamesI);

        var bar = document.createElement('div');
        bar.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:10px;';
        function btn(txt, primary) {
            var b = document.createElement('button'); b.textContent = txt;
            b.style.cssText = 'height:30px;padding:0 14px;cursor:pointer;border-radius:6px;border:1px solid #ccc;';
            if (primary) b.style.cssText += 'background:#1976d2;color:#fff;border:1px solid #1976d2;';
            return b;
        }
        var cancel = btn('取消', false); cancel.onclick = function () { ui.hideDialog(); };
        var save = btn('保存', true); save.onclick = function () {
            model.beginUpdate();
            try {
                gSet(cell, 'dfts_type', 'portmodule');
                gSet(cell, 'in_count', String(Math.max(0, parseInt(inCountI.value || '0') || 0)));
                gSet(cell, 'out_count', String(Math.max(0, parseInt(outCountI.value || '0') || 0)));
                gSet(cell, 'in_names', inNamesI.value || '');
                gSet(cell, 'out_names', outNamesI.value || '');
                rebuildPorts(cell);
            } finally { model.endUpdate(); }
            ui.hideDialog();
        };
        bar.appendChild(cancel); bar.appendChild(save); wrap.appendChild(bar);
        ui.showDialog(wrap, 760, 360, true, true);
    }

    // 双击打开配置
    graph.addListener(mxEvent.DOUBLE_CLICK, function (sender, evt) {
        var cell = evt.getProperty('cell'); if (!cell) return;
        if (isPortModule(cell)) { evt.consume(); openPortModuleDialog(cell); }
    });

    // 尺寸变化后重排
    graph.addListener(mxEvent.CELLS_RESIZED, function (sender, evt) {
        var cells = evt.getProperty('cells') || [];
        for (var i = 0; i < cells.length; i++)
            if (isPortModule(cells[i])) rebuildPorts(cells[i]);
    });

    // 连接事件（调试用）
    graph.addListener(mxEvent.CONNECT_CELL, function (sender, evt) {
        var edge = evt.getProperty('edge');
        log('CONNECT_CELL', {
            source: edge.source && edge.source.id,
            target: edge.target && edge.target.id
        });
    });
    // ：点到脚/标签时把选择切给父模块（可选但推荐） —— 
    graph.addListener(mxEvent.CLICK, function (sender, evt) {
        var cell = evt.getProperty('cell');
        if (cell && (isPortRect(cell) || isPortLabel(cell))) {
            var p = cell.getParent ? cell.getParent() : graph.getModel().getParent(cell);
            if (p) graph.setSelectionCell(p);
            evt.consume(); // 不再高亮子单元
        }
    });


    // 初次加载扫描
    setTimeout(function () {
        var all = model.getDescendants(model.getRoot()) || [];
        for (var i = 0; i < all.length; i++)
            if (isPortModule(all[i])) rebuildPorts(all[i]);
    }, 0);

});


