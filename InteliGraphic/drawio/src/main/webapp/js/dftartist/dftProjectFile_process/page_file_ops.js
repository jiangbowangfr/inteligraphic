
function _refreshProjectExplorerUi(ui, reason) {
    if (ui && typeof ui.refreshProjectExplorer === 'function') {
        ui.refreshProjectExplorer();
        return;
    }
    if (typeof window.DFTNotifyProjectExplorerRefresh === 'function') {
        window.DFTNotifyProjectExplorerRefresh(ui, reason || '');
        return;
    }
    if (ui && ui.format && typeof ui.format.refreshProject === 'function') {
        ui.format.refreshProject();
    }
}

// =============================
//   Page File Ops (Disk-First)
// =============================
// —— 路径工具 —— //
function _dirname(p) {
    if (!p) return '';
    const s = String(p).replace(/\\/g, '/').replace(/\/+$/, '');
    const i = s.lastIndexOf('/');
    return i > 0 ? s.slice(0, i) : '';
}

function _getProjectStorageRoot(ui) {
    const dbRoot = ui && ui._projectDbDirPath ? String(ui._projectDbDirPath) : '';
    if (dbRoot) return dbRoot.replace(/\\/g, '/').replace(/\/+$/, '');
    const root = ui && (ui._projectRootPath || ui._projectYamlDir) ? String(ui._projectRootPath || ui._projectYamlDir) : '';
    const cleanRoot = root.replace(/\\/g, '/').replace(/\/+$/, '');
    return cleanRoot ? _joinPath(cleanRoot, 'db') : '';
}

function _isFloorplanDesignRef(designRef) {
    if (!designRef) return false;
    if (designRef._isFloorplan) return true;
    const kind = String(designRef.__kind || '').toLowerCase();
    if (kind === 'floorplan-container') return true;
    const name = String(designRef.name || '').trim().toLowerCase();
    const dirRel = (Array.isArray(designRef._dirRel) ? designRef._dirRel.join('/') : '').trim().toLowerCase();
    return name === 'floorplan' || dirRel === 'floorplan';
}

function _pageDirPath(ui, designRef) {
    const root = _getProjectStorageRoot(ui);
    const segs = (designRef && designRef._dirRel) ||
        [_sanitizeFileName(designRef?.name || 'design')];
    return _isFloorplanDesignRef(designRef) ? _joinPath(root, ...segs) : _joinPath(root, ...segs, 'page');
}

function _setActivePageCtx(ui, designRef, name, absOpt) {
    ui._activeProjectPageCtx = {
        name,
        segs: (designRef._dirRel && designRef._dirRel.slice()) || [_sanitizeFileName(designRef.name || 'design')],
        ...(absOpt ? { abs: absOpt } : {})
    };
}

//“选中并加载”的工具，供删除/重命名后跳页用
async function _selectAndLoadPage(ui, designRef, pageName) {
    if (!pageName) return;
    // 1) 确保有页签
    let pg = (ui.pages || []).find(p => (p.getName?.() || p.name) === pageName);
    if (!pg && typeof ui.duplicatePage === 'function') {
        const src = ui.currentPage || (ui.pages && ui.pages[0]);
        if (src) {
            pg = ui.duplicatePage(src, pageName);
            try {
                const g = ui.editor.graph, parent = g.getDefaultParent();
                g.getModel().beginUpdate();
                try { const cells = g.getChildCells(parent, true, true); if (cells?.length) g.removeCells(cells, true); }
                finally { g.getModel().endUpdate(); }
            } catch (_) { }
        }
    }
    if (pg) ui.selectPage(pg);

    // 2) 读取并加载
    const abs = await _resolvePageFileAbs(ui, designRef, pageName);
    _setActivePageCtx(ui, designRef, pageName, abs);

    let exists = true;
    try { await requestSync({ action: 'fileStat', file: abs }); } catch (_) { exists = false; }
    if (!exists) return; // 没有文件就不加载（例如刚创建的空页）

    const xml = await requestSync({ action: 'readFile', filename: abs, encoding: 'utf-8' });
    await _loadPageXmlToCurrent(ui, xml);

    // 3) 同步页签标题（防复制默认名）
    try {
        const curPg = ui.currentPage;
        const curName = curPg && (curPg.getName?.() || curPg.name);
        if (curPg && curName !== pageName && typeof ui.renamePage === 'function') ui.renamePage(curPg, pageName);
    } catch (_) { }
}


function _pageAbsPath(ui, designRef, pageName) {
    return _joinPath(_pageDirPath(ui, designRef), _sanitizeFileName(pageName) + '.dftart');
}

window.DftDuplicatePageOnDisk = async function (ui, designRef, fromName, toName) {
    const src = _pageAbsPath(ui, designRef, fromName);
    const dst = _pageAbsPath(ui, designRef, toName);

    // ★ 只确保 page 目录，不要把文件名传进 ensureDirs（否则会建“同名文件夹”）
    await requestSync({ action: 'ensureDirs', path: _pageDirPath(ui, designRef) });

    const xml = await requestSync({ action: 'readFile', filename: src, encoding: 'utf-8' });
    await requestSync({ action: 'writeFile', path: dst, data: xml, enc: 'utf-8' });

    // 更新模型
    designRef.pages = Array.isArray(designRef.pages) ? designRef.pages : [];
    if (!designRef.pages.includes(toName)) designRef.pages.push(toName);

    // 切到新页并刷新
    await _selectAndLoadPage(ui, designRef, toName);
    _setActivePageCtx(ui, designRef, toName, dst);

    ui.updatePageTabs?.();
    _refreshProjectExplorerUi(ui, 'duplicatePage');
    if (typeof _autoSaveProjectYaml === 'function') _autoSaveProjectYaml(ui, 'duplicatePage');

    ui.editor?.setStatus?.(`Duplicated page: ${fromName} → ${toName}`);
};

window.DftDeletePageOnDisk = async function (ui, designRef, pageName) {
    const abs = _pageAbsPath(ui, designRef, pageName);
    try { await requestSync({ action: 'deleteFile', file: abs }); } catch (_) { }

    // 从模型移除并选择“接棒页”
    const pages = Array.isArray(designRef.pages) ? designRef.pages : (designRef.pages = []);
    const idx = pages.indexOf(pageName);
    if (idx >= 0) pages.splice(idx, 1);

    const next =
        pages.length ? pages[Math.min(idx, pages.length - 1)] : null;

    if (next) {
        await _selectAndLoadPage(ui, designRef, next);
        _setActivePageCtx(ui, designRef, next);
    } else {
        // 该 design 没页了：清空上下文（高亮自然消失）
        ui._activeProjectPageCtx = null;
    }

    ui.updatePageTabs?.();
    _refreshProjectExplorerUi(ui, 'deletePage');
    if (typeof _autoSaveProjectYaml === 'function') _autoSaveProjectYaml(ui, 'deletePage');

    ui.editor?.setStatus?.('Deleted page: ' + pageName);
};

window.DftRenamePageOnDisk = async function (ui, designRef, fromName, toName) {
    const src = _pageAbsPath(ui, designRef, fromName);
    const dst = _pageAbsPath(ui, designRef, toName);
    await requestSync({ action: 'ensureDirs', path: _pageDirPath(ui, designRef) });

    const xml = await requestSync({ action: 'readFile', filename: src, encoding: 'utf-8' });
    await requestSync({ action: 'writeFile', path: dst, data: xml, enc: 'utf-8' });
    try { await requestSync({ action: 'deleteFile', file: src }); } catch (_) { }

    // 更新模型
    designRef.pages = (designRef.pages || []).map(n => (n === fromName ? toName : n));

    // 如果当前激活的是旧名，切到新名
    const curName = ui._activeProjectPageCtx?.name ||
        (ui.currentPage && (ui.currentPage.getName?.() || ui.currentPage.name));
    if (curName === fromName) {
        await _selectAndLoadPage(ui, designRef, toName);
        _setActivePageCtx(ui, designRef, toName, dst);
    }

    ui.updatePageTabs?.();
    _refreshProjectExplorerUi(ui, 'renamePage');
    if (typeof _autoSaveProjectYaml === 'function') _autoSaveProjectYaml(ui, 'renamePage');

    ui.editor?.setStatus?.(`Renamed page: ${fromName} → ${toName}`);
};
