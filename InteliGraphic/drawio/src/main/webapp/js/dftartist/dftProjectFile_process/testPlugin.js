// 双击带有 cfg_type=edt 的图形，弹出内置配置对话框，把参数写回 Edit Data
Draw.loadPlugin(function (ui) {
    alert('测试插件 testPlugin.js2 已加载');
    var graph = ui.editor.graph;

    // 读取 / 写入图形的自定义字段（Edit Data）
    function getAttr(cell, k, defVal) {
        try { return graph.getAttributeForCell(cell, k, defVal); } catch (e) { return defVal; }
    }
    function setAttr(cell, k, v) {
        // 若 cell.value 不是 XML，draw.io 会自动包成 <UserObject> 并写入属性
        graph.setAttributeForCell(cell, k, v);
    }

    // 构建一行输入
    function addRow(form, label, name, defVal, type, extra) {
        var row = document.createElement('div');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '140px 1fr';
        row.style.gap = '8px';
        row.style.margin = '6px 0';

        var lab = document.createElement('label');
        lab.textContent = label;
        lab.style.lineHeight = '28px';
        row.appendChild(lab);

        var input = document.createElement('input');
        input.type = type || 'text';
        input.value = defVal != null ? defVal : '';
        input.style.width = '100%';
        input.style.height = '28px';
        input.style.boxSizing = 'border-box';
        if (extra) Object.keys(extra).forEach(function (k) { input[k] = extra[k]; });
        input.name = name;
        row.appendChild(input);

        form.appendChild(row);
        return input;
    }

    function openEdtDialog(cell) {
        var wrap = document.createElement('div');
        wrap.style.width = '100%';
        wrap.style.height = '100%';
        wrap.style.display = 'flex';
        wrap.style.flexDirection = 'column';

        var title = document.createElement('div');
        title.textContent = 'EDT 配置';
        title.style.fontSize = '16px';
        title.style.fontWeight = '600';
        title.style.margin = '4px 0 8px';
        wrap.appendChild(title);

        var form = document.createElement('div');
        form.style.flex = '1';
        form.style.overflow = 'auto';
        form.style.paddingRight = '4px';
        wrap.appendChild(form);

        // 读取当前值（没有则给默认）
        var fields = [
            { label: '设计名', name: 'design', def: getAttr(cell, 'design', 'my_design') },
            { label: '配置ID', name: 'cfg_id', def: getAttr(cell, 'cfg_id', 'edt_config_v1') },
            { label: '压缩比', name: 'compression_ratio', def: getAttr(cell, 'compression_ratio', '10'), type: 'number' },
            { label: '内部扫描链数', name: 'internal_chain_count', def: getAttr(cell, 'internal_chain_count', '150'), type: 'number' },
            { label: '最小链长', name: 'min_chain_len', def: getAttr(cell, 'min_chain_len', '100'), type: 'number' },
            { label: '最大链长', name: 'max_chain_len', def: getAttr(cell, 'max_chain_len', '300'), type: 'number' },
            { label: '控制信号比例(%)', name: 'control_signal_ratio', def: getAttr(cell, 'control_signal_ratio', '10'), type: 'number' },
            { label: '分离数据/控制', name: 'split_data_and_ctrl', def: getAttr(cell, 'split_data_and_ctrl', 'on') }, // 'on'/'off'
            { label: '扫描链映射名称', name: 'chain_name', def: getAttr(cell, 'chain_name', 'core_chain') },
            { label: '起始链ID', name: 'start_chain_id', def: getAttr(cell, 'start_chain_id', '1'), type: 'number' },
            { label: '结束链ID', name: 'end_chain_id', def: getAttr(cell, 'end_chain_id', '153'), type: 'number' }
        ];

        var inputs = {};
        fields.forEach(function (f) {
            inputs[f.name] = addRow(form, f.label, f.name, f.def, f.type || 'text');
        });

        // 底部按钮
        var bar = document.createElement('div');
        bar.style.display = 'flex';
        bar.style.justifyContent = 'flex-end';
        bar.style.gap = '8px';
        bar.style.marginTop = '10px';

        function mkBtn(txt, primary) {
            var btn = document.createElement('button');
            btn.textContent = txt;
            btn.style.height = '30px';
            btn.style.padding = '0 14px';
            btn.style.cursor = 'pointer';
            btn.style.borderRadius = '6px';
            btn.style.border = '1px solid #ccc';
            if (primary) {
                btn.style.background = '#1976d2';
                btn.style.color = '#fff';
                btn.style.border = '1px solid #1976d2';
            } else {
                btn.style.background = '#fff';
            }
            return btn;
        }

        var cancelBtn = mkBtn('取消', false);
        cancelBtn.onclick = function () { ui.hideDialog(); };

        var okBtn = mkBtn('保存', true);
        okBtn.onclick = function () {
            graph.getModel().beginUpdate();
            try {
                Object.keys(inputs).forEach(function (k) {
                    var v = inputs[k].value;
                    setAttr(cell, k, v);
                });
                // 确保标记类型存在，方便下次双击继续弹窗
                setAttr(cell, 'cfg_type', 'edt');

                //（可选）把摘要写到标签里，便于一眼识别
                var summary =
                    'EDT(' + getAttr(cell, 'design', '') + '): ' +
                    getAttr(cell, 'compression_ratio', '') + 'x, ' +
                    getAttr(cell, 'internal_chain_count', '') + ' chains';
                // 如果你不想改标签，可删除下一行
                graph.labelChanged(cell, summary, mxEventObject ? null : null);
            } finally {
                graph.getModel().endUpdate();
            }
            ui.hideDialog();
        };

        bar.appendChild(cancelBtn);
        bar.appendChild(okBtn);
        wrap.appendChild(bar);

        // 弹窗
        ui.showDialog(wrap, 560, 520, true, true);
    }

    // 监听双击：仅当该图形带有 cfg_type=edt 时拦截默认双击
    graph.addListener(mxEvent.DOUBLE_CLICK, function (sender, evt) {
        var cell = evt.getProperty('cell');
        if (!cell) return;
        var typ = getAttr(cell, 'cfg_type', null);
        if (typ === 'edt') {
            evt.consume();          // 阻止默认的“进入文本编辑”
            openEdtDialog(cell);    // 打开配置对话框
        }
    });
});
