// 从指定设计的指定页加载单页文件到当前页
async function _resolvePageFileAbs(ui, designRef, pageName) {
    if (!ui) throw new Error('UI not ready');
    const root = ui._projectRootPath || ui._projectYamlDir;   // 打开 .dftart 后应有其一
    if (!root) throw new Error('Please save project first.');

    const kind = String((designRef && designRef.__kind) || '').toLowerCase();
    const isFloorplan =
        !!(designRef && designRef._isFloorplan) ||
        kind === 'floorplan-container' ||
        String(designRef && designRef.name || '').trim().toLowerCase() === 'floorplan';

    let baseDir =
        (designRef && designRef._absDir)
            ? String(designRef._absDir).replace(/\\/g, '/').replace(/\/+$/, '')
            : '';

    if (!baseDir) {
        const segs =
            (designRef && Array.isArray(designRef._dirRel) && designRef._dirRel.slice()) ||
            (designRef && typeof designRef.env_file === 'string'
                ? designRef.env_file.replace(/\\/g, '/').split('/').slice(0, -1)
                : null) ||
            [_sanitizeFileName(designRef && designRef.name || 'design')];
        baseDir = _joinPath(root, ...segs);
    }

    const pageDir = isFloorplan ? baseDir : _joinPath(baseDir, 'page');

    try { await requestSync({ action: 'ensureDirs', path: pageDir }); } catch (_) { }

    const ext = 'dftart';
    const abs = _joinPath(pageDir, _sanitizeFileName(pageName) + '.' + ext);
    return abs;
}


// 把 page 的 XML 内容加载到当前页
async function _loadPageXmlToCurrent(ui, xml) {
    // 清空当前页，再导入 XML（EditorUi.importXml 能处理 <mxfile>/<mxGraphModel>）
    const graph = ui.editor.graph;
    const parent = graph.getDefaultParent();
    graph.getModel().beginUpdate();
    try {
        const cells = graph.getChildCells(parent, true, true);
        if (cells && cells.length) graph.removeCells(cells, true);
    } finally {
        graph.getModel().endUpdate();
    }

    // 导入
    if (typeof ui.importXml === 'function') {
        const imported = ui.importXml(xml);
        if (imported && imported.length && typeof graph.setSelectionCells === 'function') {
            try { graph.setSelectionCells(imported); } catch (_) { }
        }

        // 某些场景下模型已导入，但视图不会立刻刷新，表现为页面空白，直到 undo/redo 才出现内容。
        try { if (graph.view && typeof graph.view.validate === 'function') graph.view.validate(); } catch (_) { }
        try { if (typeof graph.refresh === 'function') graph.refresh(); } catch (_) { }
        try { if (typeof graph.sizeDidChange === 'function') graph.sizeDidChange(); } catch (_) { }
        try { if (ui && typeof ui.refresh === 'function') ui.refresh(); } catch (_) { }
    } else {
        // 保险兜底：老版本可能没有 importXml，可按需替换为 editor.setGraphXml 之类
        console.warn('ui.importXml not found; please replace with your graph-loading routine.');
    }
}
