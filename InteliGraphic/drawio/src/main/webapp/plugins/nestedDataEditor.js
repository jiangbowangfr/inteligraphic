Draw.loadPlugin(function (ui) {
    // 替换“编辑数据”动作
    ui.actions.addAction('editData...', function () {
        const cell = ui.editor.graph.getSelectionCell();
        if (!cell) return;

        let json;
        try {
            json = JSON.parse(cell.value || '{}');
        } catch (e) {
            mxUtils.alert('cell.value 不是有效 JSON');
            return;
        }

        const dlgDiv = document.createElement('div');
        dlgDiv.style.maxHeight = '600px';
        dlgDiv.style.overflowY = 'auto';
        dlgDiv.style.padding = '10px';

        // 渲染树形属性编辑器
        function renderEditor(obj, container) {
            for (const key in obj) {
                addEditorField(container, key, obj[key], obj);
            }
            const addBtn = document.createElement('button');
            addBtn.textContent = '添加属性';
            addBtn.onclick = () => {
                const newKey = prompt('属性名?');
                if (newKey && !(newKey in obj)) {
                    obj[newKey] = '';
                    rerender();
                }
            };
            container.appendChild(addBtn);
        }

        function addEditorField(container, key, value, parent) {
            const wrapper = document.createElement('div');
            wrapper.style.marginLeft = '20px';

            const keyInput = document.createElement('input');
            keyInput.value = key;
            keyInput.style.width = '120px';

            const valueInput = document.createElement('input');
            valueInput.style.marginLeft = '6px';
            valueInput.style.width = '160px';

            const delBtn = document.createElement('button');
            delBtn.textContent = '❌';
            delBtn.style.marginLeft = '6px';
            delBtn.onclick = () => {
                delete parent[key];
                rerender();
            };

            if (typeof value === 'object' && value !== null) {
                valueInput.style.display = 'none';
                const fold = document.createElement('details');
                const summary = document.createElement('summary');
                summary.textContent = key;
                fold.appendChild(summary);

                renderEditor(value, fold);
                wrapper.appendChild(fold);
            } else {
                valueInput.value = value;
                valueInput.oninput = () => {
                    parent[keyInput.value] = valueInput.value;
                };
                wrapper.appendChild(keyInput);
                wrapper.appendChild(valueInput);
                wrapper.appendChild(delBtn);
            }

            container.appendChild(wrapper);
        }

        function rerender() {
            dlgDiv.innerHTML = '';
            renderEditor(json, dlgDiv);
        }

        rerender();

        // 创建按钮区域
        const buttons = document.createElement('div');
        buttons.style.marginTop = '12px';
        buttons.style.textAlign = 'right';

        const cancelBtn = mxUtils.button('取消', function () {
            dlg.close();
        });

        const applyBtn = mxUtils.button('应用', function () {
            try {
                const jsonStr = JSON.stringify(json, null, 2);
                ui.editor.graph.getModel().beginUpdate();
                try {
                    ui.editor.graph.getModel().setValue(cell, jsonStr);
                } finally {
                    ui.editor.graph.getModel().endUpdate();
                }
                dlg.close();
            } catch (e) {
                mxUtils.alert('保存失败: ' + e.message);
            }
        });

        buttons.appendChild(cancelBtn);
        buttons.appendChild(applyBtn);
        dlgDiv.appendChild(buttons);

        const dlg = new mxDialog(dlgDiv, null, true, true);
        ui.showDialog(dlg.container, 480, 540, true, true);
        dlg.container.style.overflowY = 'auto';
    });
});
