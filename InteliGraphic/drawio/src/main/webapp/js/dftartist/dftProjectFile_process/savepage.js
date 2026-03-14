// ===== 按“当前激活页”保存（renderer 侧） =====
// 目标：避免“多页保存覆盖所有页面”的风险，只保存当前页；且找不到同名 <diagram> 时绝不回退到第一个 diagram。

// —— 小工具 —— //
function _sanitizeFileName(s) { return String(s || '').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'page'; }
function _joinPath() { const parts = Array.from(arguments).filter(Boolean); return parts.join('/').replace(/\/+/g, '/'); }
function _dirname(p) {
    const v = String(p || '').replace(/\\/g, '/').replace(/\/+$/, '');
    const i = v.lastIndexOf('/');
    return i > 0 ? v.slice(0, i) : '';
}

function _getProjectStorageRoot(ui) {
    const dbRoot = ui && ui._projectDbDirPath ? String(ui._projectDbDirPath) : '';
    if (dbRoot) return dbRoot.replace(/\\/g, '/').replace(/\/+$/, '');
    const root = ui && (ui._projectRootPath || ui._projectYamlDir) ? String(ui._projectRootPath || ui._projectYamlDir) : '';
    const cleanRoot = root.replace(/\\/g, '/').replace(/\/+$/, '');
    return cleanRoot ? _joinPath(cleanRoot, 'db') : '';
}

// 解析 mx 文档，返回 {kind:'mxfile'|'mxGraphModel'|'unknown', doc, diagrams:[{name, node}]}
function _parseMxXml(xmlText) {
    try {
        const dp = new DOMParser();
        const doc = dp.parseFromString(xmlText, 'application/xml');
        const root = doc && doc.documentElement;
        if (!root) return { kind: 'unknown', doc: null, diagrams: [] };

        if (root.nodeName === 'mxGraphModel') {
            // 单页模型（无 <diagram>）
            return { kind: 'mxGraphModel', doc, diagrams: [] };
        }
        if (root.nodeName === 'mxfile') {
            const arr = Array.from(root.getElementsByTagName('diagram')).map(d => ({
                name: d.getAttribute('name') || '',
                node: d
            }));
            return { kind: 'mxfile', doc, diagrams: arr };
        }
        return { kind: 'unknown', doc, diagrams: [] };
    } catch (e) {
        console.warn('[save] XML parse error:', e);
        return { kind: 'unknown', doc: null, diagrams: [] };
    }
}

// 从 mxfile 文档中抽取“只包含指定 diagram”的新 XML；找不到返回 null（不回退）
function _buildSingleDiagramXmlFromDoc(mxfileDoc, diagramNode) {
    try {
        const newDoc = document.implementation.createDocument('', '', null);
        const srcMx = mxfileDoc.documentElement;
        const newMx = newDoc.createElement('mxfile');
        ['host', 'modified', 'agent', 'version', 'type'].forEach(k => {
            const v = srcMx.getAttribute(k); if (v) newMx.setAttribute(k, v);
        });
        newMx.appendChild(newDoc.importNode(diagramNode, true));
        newDoc.appendChild(newMx);
        return new XMLSerializer().serializeToString(newDoc).trimStart();
    } catch (e) {
        console.warn('[save] build single diagram fail:', e);
        return null;
    }
}

// 在模型树里查找包含给定 pageName 的 design
function findDesignByPageName(designs, targetName) {
    let hit = null;
    function walk(d) {
        if (!d || hit) return;
        const pages = Array.isArray(d.pages) ? d.pages : [];
        if (pages.includes(targetName)) { hit = d; return; }
        for (const sd of (d.sub_designs || d.sub_cores || [])) walk(sd);
    }
    for (const d of (designs || [])) { walk(d); if (hit) break; }
    return hit;
}

function findDesignsByPageName(designs, targetName) {
    const hits = [];
    function walk(d) {
        if (!d) return;
        const pages = Array.isArray(d.pages) ? d.pages : [];
        if (pages.includes(targetName)) hits.push(d);
        for (const sd of (d.sub_designs || d.sub_cores || [])) walk(sd);
    }
    for (const d of (designs || [])) walk(d);
    return hits;
}

function findDesignBySegs(designs, segs) {
    const norm = (Array.isArray(segs) ? segs : []).map(s => String(s || '').trim()).filter(Boolean).join('/');
    if (!norm) return null;
    let hit = null;
    function walk(d) {
        if (!d || hit) return;
        const rel = (Array.isArray(d._dirRel) ? d._dirRel : []).map(s => String(s || '').trim()).filter(Boolean).join('/');
        if (rel && rel === norm) { hit = d; return; }
        for (const sd of (d.sub_designs || d.sub_cores || [])) walk(sd);
    }
    for (const d of (designs || [])) {
        walk(d);
        if (hit) break;
    }
    return hit;
}

function _isFloorplanDesign(design) {
    if (!design) return false;
    if (design._isFloorplan) return true;
    const kind = String(design.__kind || '').toLowerCase();
    if (kind === 'floorplan-container') return true;
    const name = String(design.name || '').trim().toLowerCase();
    const dirRel = (Array.isArray(design._dirRel) ? design._dirRel.join('/') : '').trim().toLowerCase();
    return name === 'floorplan' || dirRel === 'floorplan';
}

// 统计 diagram 数
function _countDiagrams(xml) {
    const { kind, diagrams } = _parseMxXml(xml);
    if (kind === 'mxGraphModel') return 1;
    if (kind === 'mxfile') return (diagrams || []).length;
    return 0;
}

// 若当前页名不在任意 design.pages 中，认为是“启动页/非项目页”，直接跳过保存
function _pageBelongsToProject(ui, pageName) {
    const model = ui.projectModel || {};
    const designs = model.designs || model.cores || [];
    return !!findDesignByPageName(designs, pageName);
}

// —— 主函数：只保存当前激活页（未映射页静默跳过，解决page-1不在项目中的问题） —— //
window.DftSaveProjectIndividually = async function (editorUi, opts) {
    const options = Object.assign({ silentIfUnmapped: true }, opts || {});
    const ui = editorUi || window.App?.editorUi;
    if (!ui) return alert('UI 未就绪');

    // 2) 模型与当前页名
    const model = ui.projectModel || {};
    const designs = model.designs || model.cores || [];
    if (!designs.length) return alert('项目里还没有 design');

    const curPage =
        (ui.currentPage && (typeof ui.currentPage.getName === 'function' ? ui.currentPage.getName() : ui.currentPage.name)) ||
        (ui.editor && ui.editor.currentPage && ui.editor.currentPage.getName && ui.editor.currentPage.getName());

    if (!curPage) { alert('未能获取当前激活页名称'); return; }

    // 1) 项目根目录（保持你原逻辑）
    let projectRoot = _getProjectStorageRoot(ui);
    if (!projectRoot) {
        const docs = await requestSync({ action: 'getDocumentsFolder' });
        const picked = await requestSync({
            action: 'showOpenDialog',
            defaultPath: docs, filters: [], properties: ['openDirectory', 'createDirectory']
        });
        if (!picked || !picked.length) return;
        projectRoot = _joinPath(picked[0], 'db');
        ui._projectDbDirPath = projectRoot;
    }

    // 3) 文档 XML
    const getDocXml = () => (ui.getFileData ? ui.getFileData(true) : '');
    const baseXml = getDocXml();
    if (!baseXml) { alert('获取文档 XML 失败'); return; }

    const { kind, doc, diagrams } = _parseMxXml(baseXml);

    // 4) 目标 design 与路径：优先用 active ctx，避免同名 page 写错 design
    const activeCtx = ui._activeProjectPageCtx || {};
    const ctxAbs = activeCtx && activeCtx.abs;
    const ctxSegs = Array.isArray(activeCtx && activeCtx.segs) ? activeCtx.segs : [];

    let ownerDesign = null;
    if (activeCtx && activeCtx.designRef) {
        const dr = activeCtx.designRef;
        if (Array.isArray(dr.pages) && dr.pages.includes(curPage)) ownerDesign = dr;
    }
    if (!ownerDesign && ctxSegs.length) ownerDesign = findDesignBySegs(designs, ctxSegs);
    if (!ownerDesign) {
        const byPage = findDesignsByPageName(designs, curPage);
        if (byPage.length === 1) ownerDesign = byPage[0];
        else if (byPage.length > 1 && !ctxAbs) {
            const msg = 'Page "' + curPage + '" exists in multiple designs; active page context is missing, skip save to avoid writing wrong file.';
            if (!options.silentIfUnmapped) alert(msg);
            else ui.editor?.setStatus?.('Skip save (ambiguous page): ' + curPage);
            console.warn('[save] ' + msg);
            return;
        }
    }

    if (!ownerDesign && !ctxAbs) {
        if (!options.silentIfUnmapped) {
            alert('模型中未找到包含该页的 design：' + curPage + '\n请确认已把该页名加入对应 design.pages。');
        } else {
            ui.editor?.setStatus?.('Skip save (page not in project): ' + curPage);
        }
        return;
    }

    let targetAbs = ctxAbs || '';
    if (!targetAbs) {
        const segs = (ownerDesign && ownerDesign._dirRel && ownerDesign._dirRel.slice()) || [_sanitizeFileName(ownerDesign && ownerDesign.name || 'design')];
        const designDir = _joinPath(projectRoot, ...segs);
        const isFloorplan = _isFloorplanDesign(ownerDesign);
        const pageDir = isFloorplan ? designDir : _joinPath(designDir, 'page');
        targetAbs = _joinPath(pageDir, _sanitizeFileName(curPage) + '.dftart');
    }
    await requestSync({ action: 'ensureDirs', path: _dirname(targetAbs) });

    // 5) 仅写当前页 XML
    let xmlToWrite = null;
    if (kind === 'mxGraphModel') {
        xmlToWrite = baseXml.trimStart();
    } else if (kind === 'mxfile') {
        const hit = diagrams.find(d => (d.name || '') === curPage);
        if (!hit) { alert('在当前文档中未找到名为 "' + curPage + '" 的 <diagram>，已取消写入以避免覆盖。'); return; }
        xmlToWrite = _buildSingleDiagramXmlFromDoc(doc, hit.node);
        if (!xmlToWrite) { alert('抽取当前页 XML 失败，已取消写入。'); return; }
    } else { alert('未识别的文档形态，已取消写入。'); return; }

    // 6) 写盘
    await requestSync({ action: 'writeFile', path: targetAbs, data: xmlToWrite, enc: 'utf-8' });
    ui.editor?.setStatus?.('Saved page: ' + curPage);

    // 7) 更新 YAML
    if (typeof window._autoSaveProjectYaml === 'function') {
        window._autoSaveProjectYaml(ui, 'saveActivePageOnly');
    }
};

// ===== 可选：调试辅助命令（打印文档中的所有 diagram 名称） =====
window.__debugListDiagrams = function (editorUi) {
    const ui = editorUi || window.App?.editorUi;
    if (!ui) return console.warn('UI 未就绪');
    const xml = ui.getFileData ? ui.getFileData(true) : '';
    const { kind, diagrams } = _parseMxXml(xml);
    console.log('[debug] kind=', kind, ' diagrams=', diagrams.map(d => d.name));
    return diagrams.map(d => d.name);
};
