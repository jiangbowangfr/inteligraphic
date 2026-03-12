// plugins/myExportPlugin.js
// 插件示例：在“导出为 PNG”时加打印日志 & 新增一个菜单项
Draw.loadPlugin(function (ui) {
    // 包装原导出 PNG 动作
    const action = ui.actions.get('exportAsPng') || ui.actions.get('exportPng');
    if (action && typeof action.funct === 'function') {
        const oldFn = action.funct;
        ui.actions.addAction('exportAsPng', function () {
            const xml = ui.getFileData(true);
            console.log('[MyExportPlugin] 导出 PNG, XML 长度:', xml.length);
            // 这里可以做你的自定义处理，例如改参数、上报日志
            return oldFn.apply(this, arguments);
        }, null, null, 'exportAsPng');
    }

    // 新增一个菜单项 “公司定制导出”
    ui.actions.addAction('companyExport', function () {
        const xml = ui.getFileData(true);
        alert('Company Export 已触发，XML 长度: ' + xml.length);
        // TODO: 这里可以把 XML 发到你的导出服务
    });

    const exportMenu = ui.menus.get('export');
    if (exportMenu) {
        const old = exportMenu.funct;
        exportMenu.funct = function (menu, parent) {
            old.apply(this, arguments);
            menu.addItem('Company Export…', null, function () {
                ui.actions.get('companyExport').funct();
            }, parent);
        };
    }
});
