function _isAbsPath(p) { return /^([A-Za-z]:[\\/]|\/)/.test(p || ''); }
function _unq(s) {
    s = String(s || '').trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        try { return JSON.parse(s.replace(/^'|'$/g, '"')); } catch (_) { }
        return s.slice(1, -1);
    }
    return s;
}

// 字符串拼路径（renderer 侧）
function _joinPath() {
    const parts = Array.from(arguments).filter(Boolean);
    return parts.join('/').replace(/\/+/g, '/');
}
function _sanitizeFileName(s) { return String(s || '').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'design'; }
const _ROOT_FLOORPLAN_DIR = 'top';

// 从 env_file 推导出目录段；没有就用名字
function _hydrateDesignDirsFromYaml(ui) {
    const model = ui.projectModel || {};
    const designs = model.designs || [];

    function normalizeKind(d, segs) {
        const kind = String((d && (d.__kind || d.kind)) || '').toLowerCase();
        const dirRel = Array.isArray(segs) ? segs.join('/').toLowerCase() : '';
        if (kind) {
            d.__kind = kind;
            return;
        }
        if (String(d && d.name || '').trim().toLowerCase() === 'ipconfig' || dirRel === 'ipconfig' || /(^|\/)ipconfig$/.test(dirRel)) {
            d.__kind = 'ipconfig-container';
            return;
        }
        if (String(d && d.name || '').trim().toLowerCase() === 'floorplan' || String(d && d.name || '').trim().toLowerCase() === _ROOT_FLOORPLAN_DIR || dirRel === 'floorplan' || dirRel === _ROOT_FLOORPLAN_DIR || /(^|\/)(floorplan|top)$/.test(dirRel)) {
            d.__kind = 'floorplan-container';
        }
    }

    function walk(d, parentSegs) {
        let segs;
        const explicitKind = String((d && (d.__kind || d.kind)) || '').toLowerCase();
        if (d && typeof d.env_file === 'string' && d.env_file.trim()) {
            // env_file 形如 "design/env.json" 或 "core/sub_core/env.json"
            const p = d.env_file.replace(/\\/g, '/');
            segs = p.split('/'); segs.pop(); // 去掉文件名
        } else {
            segs = (parentSegs || []).concat([_sanitizeFileName(d.name || 'design')]);
            if (explicitKind === 'module-design') d.env_file = '';
            else d.env_file = _joinPath(...segs, 'env.json');
        }
        d._dirRel = segs;

        d.pages = Array.isArray(d.pages) ? d.pages : [];
        d.sub_designs = Array.isArray(d.sub_designs) ? d.sub_designs : [];
        normalizeKind(d, segs);
        if (String(d.__kind || '').toLowerCase() === 'module-design') d.env_file = '';

        d.sub_designs.forEach(child => walk(child, segs));
    }

    designs.forEach(d => walk(d, []));
}


function _parseProjectYaml(text) {
    if (!text) return null;
    const lines = text.replace(/\r/g, '').split('\n');
    if (lines[0] && lines[0].startsWith('#yaml:')) lines.shift();

    let modelName = null, modelPath = '', designs = [];
    const normTabs = (s) => s.replace(/\t/g, '    ');
    const getIndent = (s) => (s.match(/^(\s*)/) || [, ''])[1].length;
    const isEmptyListLine = (s) => /\[\s*\]\s*$/.test(s);
    const isEmptyMapLine = (s) => /\{\s*\}\s*$/.test(s);

    const normalized = lines.map(normTabs);
    let idx = 0;

    function nextMeaningful(start) {
        for (let i = start; i < normalized.length; i++) {
            if (normalized[i] && normalized[i].trim()) return i;
        }
        return normalized.length;
    }

    function parsePages(start, itemIndent) {
        const pages = [];
        let i = start;
        while (i < normalized.length) {
            const raw = normalized[i];
            if (!raw || !raw.trim()) { i++; continue; }
            const indent = getIndent(raw);
            const s = raw.trim();
            if (indent < itemIndent) break;
            if (indent === itemIndent && s.startsWith('- ')) {
                pages.push(_unq(s.slice(2).trim()));
                i++;
                continue;
            }
            break;
        }
        return { value: pages, next: i };
    }

    function parsePageMeta(start, pageIndent) {
        const meta = {};
        let i = start;
        while (i < normalized.length) {
            const raw = normalized[i];
            if (!raw || !raw.trim()) { i++; continue; }
            const indent = getIndent(raw);
            const s = raw.trim();
            if (indent < pageIndent) break;
            if (indent !== pageIndent || !/:$/.test(s)) break;
            const pageName = _unq(s.slice(0, -1).trim());
            const pageMeta = {};
            i++;
            while (i < normalized.length) {
                const raw2 = normalized[i];
                if (!raw2 || !raw2.trim()) { i++; continue; }
                const indent2 = getIndent(raw2);
                const s2 = raw2.trim();
                if (indent2 <= indent) break;
                const fm = s2.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
                if (fm) pageMeta[fm[1]] = _unq(fm[2].trim());
                i++;
            }
            meta[pageName] = pageMeta;
        }
        return { value: meta, next: i };
    }

    function parseDesignList(start, itemIndent) {
        const out = [];
        let i = start;
        while (i < normalized.length) {
            i = nextMeaningful(i);
            if (i >= normalized.length) break;
            const raw = normalized[i];
            const indent = getIndent(raw);
            const s = raw.trim();
            if (indent < itemIndent) break;
            if (indent !== itemIndent || !s.startsWith('- name:')) break;

            const design = { name: _unq(s.slice(7).trim()), env_file: '', pages: [], sub_designs: [], page_meta: {} };
            i++;

            while (i < normalized.length) {
                i = nextMeaningful(i);
                if (i >= normalized.length) break;
                const raw2 = normalized[i];
                const indent2 = getIndent(raw2);
                const s2 = raw2.trim();
                if (indent2 <= indent) break;
                if (indent2 !== indent + 2) break;

                if (s2.startsWith('kind:')) {
                    design.__kind = _unq(s2.slice(5).trim());
                    i++;
                    continue;
                }
                if (s2.startsWith('env_file:')) {
                    design.env_file = _unq(s2.slice(9).trim());
                    i++;
                    continue;
                }
                if (s2.startsWith('pages:')) {
                    if (isEmptyListLine(s2)) {
                        design.pages = [];
                        i++;
                    } else {
                        const parsedPages = parsePages(i + 1, indent + 4);
                        design.pages = parsedPages.value;
                        i = parsedPages.next;
                    }
                    continue;
                }
                if (s2.startsWith('page_meta:')) {
                    if (isEmptyMapLine(s2)) {
                        design.page_meta = {};
                        i++;
                    } else {
                        const parsedMeta = parsePageMeta(i + 1, indent + 4);
                        design.page_meta = parsedMeta.value;
                        i = parsedMeta.next;
                    }
                    continue;
                }
                if (s2.startsWith('sub_designs:')) {
                    if (isEmptyListLine(s2)) {
                        design.sub_designs = [];
                        i++;
                    } else {
                        const parsedSubs = parseDesignList(i + 1, indent + 4);
                        design.sub_designs = parsedSubs.value;
                        i = parsedSubs.next;
                    }
                    continue;
                }
                i++;
            }

            out.push(design);
        }
        return { value: out, next: i };
    }

    while (idx < normalized.length) {
        idx = nextMeaningful(idx);
        if (idx >= normalized.length) break;
        const raw = normalized[idx];
        const indent = getIndent(raw);
        const s = raw.trim();

        if (!modelName) {
            const m = s.match(/^(.+):\s*$/);
            if (indent === 0 && m) modelName = _unq(m[1]);
            idx++;
            continue;
        }

        if (indent === 2 && s.startsWith('path:')) {
            modelPath = _unq(s.slice(5).trim());
            idx++;
            continue;
        }

        if (indent === 2 && s.startsWith('designs:')) {
            if (isEmptyListLine(s)) {
                designs = [];
                idx++;
            } else {
                const parsedDesigns = parseDesignList(idx + 1, 4);
                designs = parsedDesigns.value;
                idx = parsedDesigns.next;
            }
            continue;
        }

        idx++;
    }

    return { name: modelName || 'project', path: modelPath || '', designs: designs };
}



function _refreshProjectExplorerUi(ui, reason) {
    if (ui && typeof ui.refreshProjectExplorer === 'function') {
        ui.refreshProjectExplorer();
        return true;
    }
    if (typeof window.DFTNotifyProjectExplorerRefresh === 'function') {
        window.DFTNotifyProjectExplorerRefresh(ui, reason || '');
        return true;
    }
    if (ui && ui.format && typeof ui.format.refreshProject === 'function') {
        ui.format.refreshProject();
        return true;
    }
    if (ui && ui.format && typeof ui.format.refresh === 'function') {
        ui.format.refresh();
        return true;
    }
    return false;
}

function handleDftartProject(path, data) {
    try {
        if (!/\.dftart$/i.test(path)) return false;

        const txt = (typeof data === 'string') ? data : '';
        const looksYaml = txt && (txt.trimStart().startsWith('#yaml:')
            || /(^|\n)\s*designs\s*:/.test(txt));
        if (!looksYaml) return false;

        const ui = this;

        (async () => {
            try {
                if (window.DFTPageSessionManager && typeof window.DFTPageSessionManager.resetWorkspace === 'function') {
                    try { window.DFTPageSessionManager.resetWorkspace(ui, 'Page-1'); } catch (_) { }
                }

                const model = (_parseProjectYaml(txt) || { name: 'project', path: '', designs: [] });
                if (!Array.isArray(model.designs)) model.designs = [];

                // 把相对 path 变成绝对：以 YAML 文件所在目录为基准
                if (!_isAbsPath(model.path)) {
                    const yamlDir = await requestSync({ action: 'dirname', path: path });
                    // 简单拼接，避免依赖不存在的主进程 action
                    const join = (a, b) => a.replace(/[\/\\]+$/, '') + '/' + String(b || '').replace(/^[\/\\]+/, '');
                    model.path = join(yamlDir, model.path || '');
                }

                // 挂到 UI，供面板/保存/加载使用
                ui.projectModel = model;
                ui._projectRootPath = model.path;
                ui._projectYamlFilePath = path;
                ui._projectYamlDir = await requestSync({ action: 'dirname', path: path });
                const resolvedDbRoot = _joinPath(model.path, 'dft_studio_db');
                ui._projectDbDirPath = resolvedDbRoot;
                _hydrateDesignDirsFromYaml(ui);  // ← 初始化每个 design 的目录段

                if (window.DFTProjectExplorerPhase2 && typeof window.DFTProjectExplorerPhase2.loadExternalDesignTree === 'function') {
                    const dbRoot = ui._projectDbDirPath;
                    const topLevel = Array.isArray(model.designs) ? model.designs.slice() : [];
                    const rebuilt = [];
                    for (const item of topLevel) {
                        const lower = String(item && item.name || '').trim().toLowerCase();
                        if (lower === 'floorplan' || lower === _ROOT_FLOORPLAN_DIR || lower === 'ipconfig') {
                            rebuilt.push(item);
                            continue;
                        }
                        const absDir = _joinPath(dbRoot, _sanitizeFileName(item && item.name || 'design'));
                        const loaded = await window.DFTProjectExplorerPhase2.loadExternalDesignTree(ui, absDir, { rootDir: dbRoot });
                        rebuilt.push(loaded);
                    }
                    model.designs = rebuilt;
                }

                // 刷新 Project Explorer（Phase 2）/ 兼容旧面板
                _refreshProjectExplorerUi(ui, 'loadProject');

                ui.spinner && ui.spinner.stop();
                ui.onProjectLoadedFromDisk();
            } catch (e) {
                ui.spinner && ui.spinner.stop();
                ui.handleError && ui.handleError(e);
            }
        })();

        return true; // ★ 告诉外层“拦截并处理了”
    } catch (_) {
        return false;
    }
}
