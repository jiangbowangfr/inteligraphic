
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
    return cleanRoot ? _joinPath(cleanRoot, 'dft_studio_db') : '';
}

function _getViewStateStore(ui) {
    if (!ui) return null;
    if (!ui._dftPageViewState) ui._dftPageViewState = {};
    return ui._dftPageViewState;
}

function _persistentViewStateKey(key) {
    return key ? ('dft:pageView:' + String(key)) : '';
}

function _writePersistentViewState(key, state) {
    if (!key || !state || !window.localStorage) return;
    try {
        window.localStorage.setItem(_persistentViewStateKey(key), JSON.stringify(state));
    } catch (_) { }
}

function _readPersistentViewState(key) {
    if (!key || !window.localStorage) return null;
    try {
        const raw = window.localStorage.getItem(_persistentViewStateKey(key));
        return raw ? JSON.parse(raw) : null;
    } catch (_) {
        return null;
    }
}

function _makeViewStateKey(designRef, pageName, absPath) {
    const abs = String(absPath || '').trim();
    if (abs) return 'abs:' + abs;
    const segs = Array.isArray(designRef && designRef._dirRel) ? designRef._dirRel.join('/') : '';
    return 'rel:' + segs + '::' + String(pageName || '').trim();
}

function _captureViewState(ui, key) {
    if (!ui || !key || !ui.editor || !ui.editor.graph) return;
    const graph = ui.editor.graph;
    const container = graph.container;
    const view = graph.view;
    const store = _getViewStateStore(ui);
    if (!container || !view || !store) return;
    store[key] = {
        scale: Number(view.scale || 1),
        tx: Number(view.translate ? view.translate.x : 0),
        ty: Number(view.translate ? view.translate.y : 0),
        scrollLeft: Number(container.scrollLeft || 0),
        scrollTop: Number(container.scrollTop || 0)
    };
    _writePersistentViewState(key, store[key]);
}

function _captureActiveViewState(ui) {
    if (ui && ui._activeEnvCtx) return;
    const ctx = ui && ui._activeProjectPageCtx;
    if (!ctx || !ctx.name) return;
    _captureViewState(ui, _makeViewStateKey(ctx.designRef || null, ctx.name, ctx.abs || ''));
}

function _restoreViewState(ui, key) {
    if (!ui || !key || !ui.editor || !ui.editor.graph) return false;
    const graph = ui.editor.graph;
    const container = graph.container;
    const view = graph.view;
    const store = _getViewStateStore(ui);
    let state = store && store[key];
    if (!state) {
        state = _readPersistentViewState(key);
        if (state && store) store[key] = state;
    }
    if (!container || !view || !state) return false;
    try {
        if (view.translate) {
            view.translate.x = Number(state.tx || 0);
            view.translate.y = Number(state.ty || 0);
        }
        view.scale = Number(state.scale || 1);
        if (typeof graph.view.validate === 'function') graph.view.validate();
        if (typeof graph.sizeDidChange === 'function') graph.sizeDidChange();
        if (typeof graph.refresh === 'function') graph.refresh();
        container.scrollLeft = Number(state.scrollLeft || 0);
        container.scrollTop = Number(state.scrollTop || 0);
    } catch (_) { }
    [0, 30, 120].forEach(function (delay) {
        setTimeout(function () {
            try {
                if (view.translate) {
                    view.translate.x = Number(state.tx || 0);
                    view.translate.y = Number(state.ty || 0);
                }
                view.scale = Number(state.scale || 1);
                if (typeof graph.view.validate === 'function') graph.view.validate();
                if (typeof graph.sizeDidChange === 'function') graph.sizeDidChange();
                container.scrollLeft = Number(state.scrollLeft || 0);
                container.scrollTop = Number(state.scrollTop || 0);
            } catch (_) { }
        }, delay);
    });
    return true;
}

function _isFloorplanDesignRef(designRef) {
    if (!designRef) return false;
    if (designRef._isFloorplan) return true;
    const kind = String(designRef.__kind || '').toLowerCase();
    if (kind === 'floorplan-container') return true;
    const name = String(designRef.name || '').trim().toLowerCase();
    const dirRel = (Array.isArray(designRef._dirRel) ? designRef._dirRel.join('/') : '').trim().toLowerCase();
    return name === 'floorplan' || name === 'top' || dirRel === 'floorplan' || dirRel === 'top';
}

function _isModuleDesignRef(designRef) {
    return !!(designRef && String(designRef.__kind || '').toLowerCase() === 'module-design');
}

function _syncLayersDialogForPage(ui, designRef) {
    if (!ui || typeof ui.showLayersDialog !== 'function') return;
    const ctx = ui && ui._activeProjectPageCtx ? ui._activeProjectPageCtx : null;
    const pageName = String(ctx && ctx.name || '').trim().toLowerCase();
    if (!_isFloorplanDesignRef(designRef) && pageName !== 'arch' && pageName !== 'dataflow' && !/_arch$/.test(pageName) && !/_dataflow$/.test(pageName)) return;
    setTimeout(function () {
        try { ui.showLayersDialog(); } catch (_) { }
    }, 0);
}

function _activateDrawingWorkspace(ui) {
    try { if (ui) ui._activeWorkspaceKey = null; } catch (_) { }
    var shell = ui && ui._phase1 && ui._phase1.workspaceShell ? ui._phase1.workspaceShell : document;
    var body = ui && ui._phase1 && ui._phase1.workspaceBody
        ? ui._phase1.workspaceBody
        : shell.querySelector('.phase1-workspace-body');
    var tabstrip = shell.querySelector('.phase1-workspace-tabstrip');
    if (!body || !tabstrip) return;

    Array.prototype.forEach.call(tabstrip.querySelectorAll('.phase1-tab[data-key]'), function (tab) {
        tab.classList.toggle('active', tab.getAttribute('data-key') === 'design');
    });
    Array.prototype.forEach.call(body.querySelectorAll('.phase1-workspace-embed-panel[data-key]'), function (panel) {
        panel.classList.remove('active');
    });
    Array.prototype.forEach.call(body.children || [], function (child) {
        if (!child || child.getAttribute('data-dft-workspace-panel') === '1') return;
        if (!child.hasAttribute('data-dft-display-before-embed')) {
            child.setAttribute('data-dft-display-before-embed', child.style.display || '');
        }
        child.style.display = child.getAttribute('data-dft-display-before-embed');
    });

    try {
        var graph = ui && ui.editor ? ui.editor.graph : null;
        if (graph && graph.container) {
            graph.container.style.pointerEvents = 'auto';
            graph.container.offsetWidth;
            if (graph.view && typeof graph.view.validate === 'function') graph.view.validate();
            if (typeof graph.sizeDidChange === 'function') graph.sizeDidChange();
        }
        if (typeof ui.refresh === 'function') ui.refresh();
        if (ui && typeof ui.refreshProjectExplorer === 'function') ui.refreshProjectExplorer();
        if (window && typeof window.dispatchEvent === 'function' && typeof Event === 'function') {
            window.dispatchEvent(new Event('resize'));
        }
    } catch (_) { }
}

function _pageDirPath(ui, designRef) {
    const root = _getProjectStorageRoot(ui);
    const segs = (designRef && designRef._dirRel) ||
        [_sanitizeFileName(designRef?.name || 'design')];
    return (_isFloorplanDesignRef(designRef) || _isModuleDesignRef(designRef)) ? _joinPath(root, ...segs, 'arch') : _joinPath(root, ...segs, 'page');
}

function _setActivePageCtx(ui, designRef, name, absOpt) {
    ui._activeProjectPageCtx = {
        name,
        segs: (designRef._dirRel && designRef._dirRel.slice()) || [_sanitizeFileName(designRef.name || 'design')],
        designRef: designRef || null,
        ...(absOpt ? { abs: absOpt } : {})
    };
}

//“选中并加载”的工具，供删除/重命名后跳页用
async function _selectAndLoadPage(ui, designRef, pageName) {
    if (!pageName) return;
    _captureActiveViewState(ui);
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
    try { ui._activeEnvCtx = null; } catch (_) { }
    _setActivePageCtx(ui, designRef, pageName, abs);

    let exists = true;
    try { await requestSync({ action: 'fileStat', file: abs }); } catch (_) { exists = false; }
    if (!exists) return; // 没有文件就不加载（例如刚创建的空页）

    const xml = await requestSync({ action: 'readFile', filename: abs, encoding: 'utf-8' });
    await _loadPageXmlToCurrent(ui, xml);
    _activateDrawingWorkspace(ui);
    _restoreViewState(ui, _makeViewStateKey(designRef, pageName, abs));
    _syncLayersDialogForPage(ui, designRef);

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
