// =====================================================
// ==========  YAML 头与序列化（项目→YAML） ============
// =====================================================

// 统一 YAML 头
if (typeof window._yamlHeader !== 'string') window._yamlHeader = '#yaml: dft_db';

// 给任意 YAML 文本加上第一行头
function _withYamlHeader(yamlText) {
    if (!yamlText) yamlText = '';
    return yamlText.trimStart().startsWith('#yaml:')
        ? yamlText
        : window._yamlHeader + '\n' + yamlText;
}

// 模型转 YAML（顶级键是项目名称）
function _projectToYamlByName(model) {
    function esc(s) {
        if (s == null) return '""';
        s = String(s);
        return /[:#\-?&*![\]{},>|%@`]|^\s|\s$|\s{2,}/.test(s) ? JSON.stringify(s) : s;
    }
    function key(k) {
        k = String(k || 'project');
        return /^[A-Za-z0-9_-]+$/.test(k) ? k : JSON.stringify(k);
    }
    function ind(n) { return '  '.repeat(n); }

    function dumpDesign(design, lvl) {
        let out = ind(lvl) + '- name: ' + esc(design.name || '') + '\n';
        const pages = design.pages || [];
        const subs = design.sub_designs || design.sub_cores || [];
        const envFile = design.env_file || '';
        const pageMeta = design.page_meta || {};
        out += ind(lvl) + '  env_file: ' + esc(envFile) + '\n';
        out += pages.length ? ind(lvl) + '  pages:\n' : ind(lvl) + '  pages: []\n';
        pages.forEach(p => out += ind(lvl) + '    - ' + esc(p) + '\n');
        const metaKeys = Object.keys(pageMeta);
        out += metaKeys.length ? ind(lvl) + '  page_meta:\n' : ind(lvl) + '  page_meta: {}\n';
        metaKeys.forEach(function (pageName) {
            const meta = pageMeta[pageName] || {};
            out += ind(lvl) + '    ' + esc(pageName) + ':\n';
            Object.keys(meta).forEach(function (metaKey) {
                out += ind(lvl) + '      ' + metaKey + ': ' + esc(meta[metaKey]) + '\n';
            });
        });
        out += subs.length ? ind(lvl) + '  sub_designs:\n' : ind(lvl) + '  sub_designs: []\n';
        subs.forEach(sd => out += dumpDesign(sd, lvl + 2));
        return out;
    }

    const name = model && model.name ? model.name : 'project';
    // 兼容旧字段 cores；输出统一为 designs
    const designs = (model && (model.designs || model.cores)) || [];
    let y = key(name) + ':\n';
    y += '  path: ' + esc((model && model.path) || '') + '\n';
    y += designs.length ? '  designs:\n' : '  designs: []\n';
    designs.forEach(d => { y += dumpDesign(d, 2); });
    return y;
}
// —— 写回到当前打开的 .dftart
async function _writeProjectYamlNowElectron(ui, reason) {
    if (!ui || !ui.projectModel) return;
    // 确保 path=绝对路径
    if (ui._projectRootPath) {
        ui.projectModel.path = ui._projectRootPath;  // 绝对路径
    }
    // 生成 YAML
    const yaml = _withYamlHeader(_projectToYamlByName(ui.projectModel));

    // 目标路径：优先使用“当前打开的 .dftart”；没有就落在根目录下 <项目名>.dftart
    const fallbackName = (ui.projectModel && ui.projectModel.name) ? ui.projectModel.name : 'project';
    const target = ui._projectYamlFilePath
        || ((ui._projectRootPath ? (ui._projectRootPath.replace(/\/+$/, '') + '/' + fallbackName + '.dftart') : null));

    if (!target) {
        console.warn('[Project] 没有可写入的 .dftart 路径；跳过自动保存', reason);
        return;
    }

    try {
        await requestSync({ action: 'writeFile', path: target, data: yaml, enc: 'utf-8' });
        // 可选：状态提示
        ui.editor?.setStatus?.('Saved project yaml (' + (reason || '-') + ')');
    } catch (e) {
        console.error('write yaml failed:', e);
        ui.handleError?.(e);
    }
}

// =====================================================
// ========  文件句柄写入工具（File System Access） =====
// =====================================================

if (typeof window._writeTextFileHandle !== 'function') {
    window._writeTextFileHandle = async function (fileHandle, text) {
        const writable = await fileHandle.createWritable();
        await writable.write(text);
        await writable.close();
    };
}
if (typeof window._sanitizeFileName !== 'function') {
    window._sanitizeFileName = function (s) {
        return String(s || '').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'project';
    };
}
if (typeof window._ensureExt !== 'function') {
    window._ensureExt = function (name, ext) {
        ext = (ext || '').replace(/^\./, '');
        return name && name.toLowerCase().endsWith('.' + ext) ? name : (name + '.' + ext);
    };
}
function _stripExt(t) { if (!t) return ''; var i = t.lastIndexOf('.'); return i > 0 ? t.substring(0, i) : t; }


// =====================================================
// ==========  目录&文件创建：设计脚手架  ================
// =====================================================

async function _ensureDir(handle, ...segments) {
    let dir = handle;
    for (const seg of segments) {
        const s = window._sanitizeFileName(seg);
        dir = await dir.getDirectoryHandle(s, { create: true });
    }
    return dir;
}
function _getProjectRootDirHandle(ui) {
    return (ui && (ui._projectRootDirHandle || ui._projectYamlDirHandle))
        || window._exportDirHandle
        || null;
}

function _relPathJoin(arr) { return arr.filter(Boolean).join('/'); }

// 覆盖：路径版：确保 design 目录 / page 目录 / env.json
async function _ensureDesignScaffold(ui, design, parentSegs) {
    const root = ui && (ui._projectRootPath || ui._projectYamlDir);
    if (!root) { console.warn('[Project] root path missing; skip scaffold'); return; }

    const segs = (parentSegs || []).concat([_sanitizeFileName(design.name || 'design')]);
    const designDir = _joinPath(root, ...segs);
    const pageDir = _joinPath(designDir, 'page');
    const envAbs = _joinPath(designDir, 'env.json');

    try { await requestSync({ action: 'ensureDirs', path: pageDir }); } catch (_) { }

    // env.json 不存在则写一个默认
    let needWriteEnv = false;
    try { await requestSync({ action: 'fileStat', file: envAbs }); }
    catch (_) { needWriteEnv = true; }
    if (needWriteEnv) {
        const def = JSON.stringify({ name: design.name || '', createdAt: new Date().toISOString() }, null, 2);
        await requestSync({ action: 'writeFile', path: envAbs, data: def, enc: 'utf-8' });
    }

    // 回填模型
    design.env_file = segs.concat('env.json').join('/');
    design._dirRel = segs;
}

async function _createPageFileSlot(ui, design, pageName) {
    const root = ui && (ui._projectRootPath || ui._projectYamlDir);
    if (!root) { console.warn('[Project] root path missing; skip page slot'); return; }
    const segs = (design._dirRel && design._dirRel.slice()) ||
        [_sanitizeFileName(design.name || 'design')];
    const pageDir = _joinPath(root, ...segs, 'page');
    const abs = _joinPath(pageDir, _sanitizeFileName(pageName) + '.dftart');

    try { await requestSync({ action: 'ensureDirs', path: pageDir }); } catch (_) { }
    // 给一个极简 mxGraphModel，占位即可（真内容由 DftSaveProjectIndividually 写入）
    const placeholder = '<mxGraphModel><root/></mxGraphModel>';
    await requestSync({ action: 'writeFile', path: abs, data: placeholder, enc: 'utf-8' });
    return abs;
}

// =====================================================
// ==========  全局：项目 YAML 自动保存工具  ============
// =====================================================

(function () {
    async function _writeProjectYamlNow(ui, reason) {
        if (!ui || !ui.projectModel) return;
        // 确保 path=绝对路径
        if (ui._projectRootPath) {
            ui.projectModel.path = ui._projectRootPath;  // 绝对路径
        }
        try { if (typeof _saveProjectToGraph === 'function') _saveProjectToGraph(ui); } catch (e) { console.warn('save graph meta fail:', e); }

        var yaml = _withYamlHeader(_projectToYamlByName(ui.projectModel));

        var cur = ui.getCurrentFile && ui.getCurrentFile();
        var base = (cur && cur.getTitle && _stripExt(cur.getTitle())) || ui.projectModel.name || 'project';
        var fileName = ui._projectYamlName || _ensureExt(_sanitizeFileName(base + ''), 'dftart');
        ui._projectYamlName = fileName;

        try {
            if (ui._projectYamlFileHandle) {
                await _writeTextFileHandle(ui._projectYamlFileHandle, yaml);
                return;
            }
            var dir = _getProjectRootDirHandle(ui);
            if (dir && typeof dir.getFileHandle === 'function') {
                const fh = await dir.getFileHandle(fileName, { create: true });
                ui._projectYamlFileHandle = fh;
                await _writeTextFileHandle(fh, yaml);
                return;
            }
            if (!ui._warnNoSilentSaveShown) {
                ui._warnNoSilentSaveShown = true;
                console.warn('[Project] 无目录/文件授权，自动保存不会触发下载弹窗；请重新运行 New Project 并允许目录访问以启用静默保存。');
            }
        } catch (e) {
            console.error('auto write yaml failed:', e);
        }
    }

    var pending = null;
    (function () {
        let t = null;
        window._autoSaveProjectYaml = function (ui, reason) {
            if (!ui || !ui.projectModel) return;
            if (t) clearTimeout(t);
            t = setTimeout(() => { t = null; _writeProjectYamlNowElectron(ui, reason); }, 200);
        };
    })();
})();


// =====================================================
// ===============  ProjectFormatPanel  =================
// =====================================================

ProjectFormatPanel = function (format, editorUi, container) {
    BaseFormatPanel.call(this, format, editorUi, container);
    this.init();
};
// mxUtils.extend(ProjectFormatPanel, BaseFormatPanel);

ProjectFormatPanel.prototype.init = function () { this.refresh(); };
ProjectFormatPanel.prototype.destroy = function () { };


ProjectFormatPanel.prototype.refresh = function () {
    var ui = this.editorUi, c = this.container;
    c.innerHTML = '';

    if (typeof _loadProjectFromGraphIfEmpty === 'function') _loadProjectFromGraphIfEmpty(ui);

    var OPTS = { caretSize: 16, caretHit: 20, indent: 14, rowPadY: 2, fontSize: 12, headerGap: 4 };

    if (!ui._prjCssInjected2) {
        const st = document.createElement('style');
        st.textContent = `
            /* 全局可调参数 */
            .prjPanel{
                --prj-font: 13px;           /* 字号：想大就改 14/15px */
                --prj-indent: 14px;         /* 缩进步长 */
                --prj-row-pad-v: 2px;       /* 子行上下内边距：越小越紧凑 */
                --prj-sec-pad-v: 4px;       /* 标题行上下内边距 */
                --prj-page-sec-pad-v: 1px;   /* 仅 page 标题用这一个，单独控制 */
                --prj-caret-size: 21px;     /* 三角字符大小（▸▾）*/
                --prj-caret-hit: 5px;      /* 三角点击热区（宽高）*/
            }

            .prjPanel{ font-size: var(--prj-font); }

            /* ---------- 标题（design / sub_design） ---------- */
            .prjPanel .prj-sec{ margin-top:4px; }
            /* 只有需要的地方画分割线：给 .prj-sec 画，但标记 .no-sep 的不画 */
            .prjPanel .prj-sec:not(.no-sep){
                border-top:1px solid var(--ge-divider, rgba(0,0,0,.06));
            }
            .geDarkMode .prjPanel .prj-sec:not(.no-sep){
                border-top-color: rgba(255,255,255,.08);
            }
            .prjPanel .prj-secTitle{
                display:flex; align-items:center; gap:6px; cursor:pointer;
                padding: var(--prj-sec-pad-v) 8px; border-radius:8px; user-select:none;
            }
            .prjPanel .prj-sec.page-sec > .prj-secTitle{
                padding: var(--prj-page-sec-pad-v) 8px;
            }
            .prjPanel .prj-secTitle:hover{ background: rgba(0,0,0,.06); }
            .geDarkMode .prjPanel .prj-secTitle:hover{ background: rgba(255,255,255,.06); }

            /* 三角（▸/▾）更大，点击区也更大 */
            .prjPanel .prj-caret{
                width: var(--prj-caret-hit); height: var(--prj-caret-hit);
                display:inline-flex; align-items:center; justify-content:center;
                font-size: var(--prj-caret-size); line-height: 1; opacity:.9;
                cursor:pointer; user-select:none;
            }

            /* ---------- 子行（env / page 列表项） ---------- */
            .prjPanel .prj-row{
                display:flex; align-items:center; gap:6px;
                padding: var(--prj-row-pad-v) 8px; border-radius:8px;
            }
            .prjPanel .prj-row:hover{ background: rgba(0,0,0,.06); }
            .geDarkMode .prjPanel .prj-row:hover{ background: rgba(255,255,255,.06); }

            /* 缩进（不画引导线，只留空白） */
            .prjPanel .prj-indent{ padding-left: var(--prj-indent); }

            /* 右侧“⋯”按钮 */
            .prjPanel .prj-dots{
                margin-left:6px; width:18px; height:18px; border-radius:6px;
                display:inline-flex; align-items:center; justify-content:center;
                cursor:pointer; user-select:none;
            }
            .prjPanel .prj-dots:hover{ background: rgba(0,0,0,.06); }
            .geDarkMode .prjPanel .prj-dots:hover{ background: rgba(255,255,255,.06); }
            /* ===== Active page highlight ===== */
            .prjPanel{
            --prj-active-bg: rgba(0,0,0,.08);    /* 亮色主题下的高亮底色 */
            --prj-active-bg-hover: rgba(0,0,0,.12);
            }
            .geDarkMode .prjPanel{
            --prj-active-bg: rgba(255,255,255,.12);   /* 暗色主题 */
            --prj-active-bg-hover: rgba(255,255,255,.16);
            }
            /* 给“page 行”打上 .page-row；选中时加 .is-active */
            .prjPanel .page-row.is-active{
            background: var(--prj-active-bg);
            border-radius: 12px;     /* 圆一点，和截图一致 */
            }
            .prjPanel .page-row.is-active:hover{
            background: var(--prj-active-bg-hover);
            }
            `;
        document.head.appendChild(st);
        ui._prjCssInjected2 = true;
    }
    c.classList.add('prjPanel'); // 确保 class 存在

    // —— 若当前文档有改动，先保存“当前激活页” —— //
    async function _maybeSaveActivePage(ui, reason) {
        try {
            if (typeof window.DftSaveProjectIndividually === 'function') {
                await window.DftSaveProjectIndividually(ui, { silentIfUnmapped: true });
                ui.editor?.setStatus?.('Auto-synced before: ' + (reason || 'action'));
            }
        } catch (e) {
            console.warn('[autosave-before-action] failed:', e);
        }
    }

    var expandState = ui.projectExpandState || (ui.projectExpandState = {});
    function isOpen(key, def) { return (key in expandState) ? expandState[key] : def; }
    function toggle(key) { expandState[key] = !isOpen(key, true); panel.refresh(); }

    function saveProject(reason) { _autoSaveProjectYaml(ui, reason || 'panel'); }

    function inputDialog(titleText, labelText, placeholder, initial, onOk) {
        var wrap = document.createElement('div');
        wrap.style.padding = '12px'; wrap.style.minWidth = '360px';

        var title = document.createElement('div');
        title.style.fontWeight = '600'; title.style.marginBottom = '6px';
        title.textContent = titleText; wrap.appendChild(title);

        var row = document.createElement('div');
        row.style.display = 'flex'; row.style.alignItems = 'center';
        row.style.gap = '10px'; row.style.margin = '6px 0';

        var label = document.createElement('div');
        label.style.width = '110px'; label.textContent = labelText;
        row.appendChild(label);

        var input = document.createElement('input');
        input.type = 'text'; input.className = 'geInput'; input.style.width = '210px';
        if (placeholder) input.placeholder = placeholder;
        if (initial) input.value = initial;
        row.appendChild(input); wrap.appendChild(row);

        var btns = document.createElement('div');
        btns.style.display = 'flex'; btns.style.gap = '8px'; btns.style.marginTop = '8px';

        var ok = mxUtils.button(mxResources.get('ok') || 'OK', function () {
            var v = (input.value || '').trim(); if (v) onOk(v);
            ui.hideDialog();
        });
        var cancel = mxUtils.button(mxResources.get('cancel') || 'Cancel', function () { ui.hideDialog(); });
        btns.appendChild(ok); btns.appendChild(cancel); wrap.appendChild(btns);
        mxEvent.addListener(input, 'keydown', function (evt) { if (evt.keyCode === 13) ok.click(); });
        ui.showDialog(wrap, 400, 140, true, true);
    }
    // —— 创建新的 page 页签，并清空内容 —— //
    function _renamePageSilently(ui, page, newName) {
        try {
            if (page && typeof page.setName === 'function') page.setName(newName);
            else if (page) page.name = newName;      // 兜底
            ui.updatePageTabs?.();
            ui.editor?.setStatus?.('Renamed: ' + newName);
        } catch (e) { console.warn('silent rename failed:', e); }
    }


    async function createMxPageByName(name) {
        const ui = window.App?.editorUi || editorUi ||  ui;
        if (typeof ui.duplicatePage !== 'function') return;

        // 兜底：切换前保存
        await _maybeSaveActivePage?.(ui, 'before-createMxPage');

        // —— 场景1：全新启动 & 未加载项目 → 复用默认 Page-1，改名并清空，然后显示画布 —— //
        if (!ui._noProjectMode && !ui._projectLoaded) {
            const first = (ui.pages && ui.pages[0]) || (ui.editor && ui.editor.currentPage);
            if (first) {
                _renamePageSilently(ui, first, name);  // 不弹窗
                ui.selectPage(first);

                // 清空内容
                const g = ui.editor.graph, parent = g.getDefaultParent();
                g.getModel().beginUpdate();
                try {
                    const cells = g.getChildCells(parent, true, true);
                    if (cells && cells.length) g.removeCells(cells, true);
                } finally { g.getModel().endUpdate(); }

                _exitNoProjectMode(ui);
                ui.setStatusText?.('');
                ui.updatePageTabs?.();
                return first;
            }
        }

        // —— 场景2：已加载项目 或 后续新增 → 常规新增页 —— //
        var src = ui.currentPage || (ui.pages && ui.pages[0]);
        if (!src) return;

        var newPage = ui.duplicatePage(src, name);
        if (!newPage) return;
        // 有些实现 duplicate 后名还是复制源名，保险起见再静默改一次
        _renamePageSilently(ui, newPage, name);

        ui.selectPage(newPage);
        // 清空新页内容
        var g = ui.editor.graph, parent = g.getDefaultParent();
        g.getModel().beginUpdate();
        try {
            var cells = g.getChildCells(parent, true, true);
            if (cells && cells.length) g.removeCells(cells, true);
        } finally {
            g.getModel().endUpdate();
        }
        // 若是“加载了项目，但还在占位态”，第一次真正建页时也要显画布
        if (ui._noProjectMode) _exitNoProjectMode(ui);

        return newPage;
    }

    async function openPageNow(ui, designRef, name, designSegs) {
        function findMxPageByName(name) {
            const pages = ui.pages || [];
            for (let i = 0; i < pages.length; i++) {
                const nm = (typeof pages[i].getName === 'function') ? pages[i].getName() : pages[i].name;
                if (nm === name) return pages[i];
            }
            return null;
        }

        try { ui._exitNoProjectMode?.(); } catch (_) { }

        let pg = findMxPageByName(name);
        if (!pg && typeof ui.duplicatePage === 'function') {
            const src = ui.currentPage || (ui.pages && ui.pages[0]);
            if (src) {
                pg = ui.duplicatePage(src, name);
                try {
                    const g = ui.editor.graph, parent = g.getDefaultParent();
                    g.getModel().beginUpdate();
                    try {
                        const cells = g.getChildCells(parent, true, true);
                        if (cells && cells.length) g.removeCells(cells, true);
                    } finally { g.getModel().endUpdate(); }
                } catch (_) { }
            }
        }

        if (pg) {
            try {
                const pgName = (typeof pg.getName === 'function') ? pg.getName() : pg.name;
                if (pgName !== name && typeof ui.renamePage === 'function') ui.renamePage(pg, name);
            } catch (_) { }
            ui.selectPage(pg);
        }

        const segs = (designSegs && designSegs.slice())
            || (designRef._dirRel && designRef._dirRel.slice())
            || [window._sanitizeFileName(designRef.name || 'design')];

        ui._activeProjectPageCtx = { name, segs };

        try {
            const abs = await _resolvePageFileAbs(ui, designRef, name);
            let exists = true;
            try { await requestSync({ action: 'fileStat', file: abs }); } catch (_) { exists = false; }
            if (!exists) return;
            const xml = await requestSync({ action: 'readFile', filename: abs, encoding: 'utf-8' });
            await _loadPageXmlToCurrent(ui, xml);
        } catch (e) {
            ui.handleError?.(e, true);
        }
    }


    var model = ui.projectModel;
    if (!model || !model.name) {
    // 面板保持空白即可；后续 New Project 时会重新 refresh()
        return;
    }

    // —— 兼容旧数据：cores/sub_cores/envs → designs/sub_designs/env_file —— //
    if (model) {
        if (!Array.isArray(model.designs) && Array.isArray(model.cores)) {
            model.designs = model.cores;
        }
        (model.designs || []).forEach(function (d) {
            if (!Array.isArray(d.sub_designs) && Array.isArray(d.sub_cores)) {
                d.sub_designs = d.sub_cores;
            }
            // 旧 envs 取第一个作为 env_file 路径（若看起来像文件名）
            if (!d.env_file && Array.isArray(d.envs) && d.envs.length) {
                d.env_file = (typeof d.envs[0] === 'string') ? d.envs[0] : '';
            }
        });
    }

    // === Project root: title with caret, collapsible, label-click adds design ===
    var rootKey = 'project:root';
    var rootOpen = isOpen(rootKey, true);

    // 注意：把 onClickLabel 设为“添加 design”的动作；caret/空白处仍用于展开/折叠
    var rRoot = makeToggleRow(
        model ? (model.name || '(no project)') : '(no project)',
        rootKey,
        0,
        function () { // 点击项目名：新增 design（行内输入）
            if (!model) return;
            showInlineInputAfter(rRoot.row, 1, 'design name', function (name) {
                if (!name) return;
                model.designs = model.designs || [];
                var d = { name: name, pages: [], sub_designs: [], env_file: '' };
                model.designs.push(d);
                return _ensureDesignScaffold(ui, d, []).then(() => {
                    expandState[rootKey] = true;
                    expandState['design:' + name] = true;   // 展开新 design
                    saveProject('addDesign');
                    panel.refresh();
                });
            });
        },
        rootOpen,
        true
    );
    
    c.appendChild(rRoot.row);

    if (!model) return;

    // 内容树容器（放在 root 之下）
    if (rootOpen) {
        var tree = document.createElement('div');
        tree.className = 'prjTree';
        tree.style.marginTop = '6px';
        (model.designs || []).forEach(function (design) {
            renderDesign(design, tree, 1, 'design:' + design.name, []); // depth 从 1 起
        });
        c.appendChild(tree);
    }

    function makeToggleRow(text, key, depth, onClickLabel, opened, weight600) {
        const row = document.createElement('div');
        row.className = 'prj-sec';
        const title = document.createElement('div');
        title.className = 'prj-secTitle';
        title.style.paddingLeft = (14 * depth) + 'px';

        const caret = document.createElement('span');
        caret.className = 'prj-caret';
        caret.textContent = opened ? '▾' : '▸';

        const label = document.createElement('span');
        label.style.fontWeight = (weight600 === false) ? 'normal' : '600';
        label.textContent = text;

        // label 自带动作（比如打开“Add…”），保持原行为
        if (onClickLabel) {
            label.style.cursor = 'pointer';
            mxEvent.addListener(label, 'click', function (e) {
                onClickLabel();
                mxEvent.consume(e);
            });
        }

        // 统一的折叠/展开处理：点 caret 或标题空白处都能折叠
        function doToggle(e) {
            // 若点到 label 且它有自定义动作，则不折叠
            if (onClickLabel && (e.target === label)) return;
            mxEvent.consume(e);
            toggle(key); // 使用外层 expandState + panel.refresh()
        }

        mxEvent.addListener(caret, 'click', doToggle);
        mxEvent.addListener(title, 'click', doToggle);

        title.appendChild(caret);
        title.appendChild(label);
        row.appendChild(title);

        return { row, caret, label };
    }


    function findMxPageByName(name) {
        var pages = ui.pages || [];
        for (var i = 0; i < pages.length; i++) {
            var nm = (typeof pages[i].getName === 'function') ? pages[i].getName() : pages[i].name;
            if (nm === name) return pages[i];
        }
        return null;
    }

    function closeOnOutside(menu) {
        function isInside(node) { while (node) { if (node === menu.div) return true; node = node.parentNode; } return false; }
        function hide(evt) {
            if (evt && isInside(mxEvent.getSource(evt))) return;
            menu.hideMenu();
            mxEvent.removeListener(document, 'mousedown', hide);
            mxEvent.removeListener(window, 'blur', hide);
            mxEvent.removeListener(window, 'resize', hide);
            mxEvent.removeListener(window, 'scroll', hide);
        }
        setTimeout(function () {
            mxEvent.addListener(document, 'mousedown', hide);
            mxEvent.addListener(window, 'blur', hide);
            mxEvent.addListener(window, 'resize', hide);
            mxEvent.addListener(window, 'scroll', hide);
        }, 0);
    }

    // —— env：单个配置文件的编辑器 —— //
    async function openEnvEditor(design, parentSegs) {
        const base = _getProjectRootDirHandle(ui);
        if (!base) { alert('未授权目录访问，无法打开 env.json'); return; }
        const segs = (design._dirRel && design._dirRel.slice()) || (parentSegs || []).concat([window._sanitizeFileName(design.name || 'design')]);
        const designDir = await _ensureDir(base, ...segs);
        const fh = await designDir.getFileHandle('env.json', { create: true });
        let current = '';
        try { current = await (await fh.getFile()).text(); } catch (_) { }

        var wrap = document.createElement('div');
        wrap.style.padding = '12px'; wrap.style.minWidth = '560px'; wrap.style.maxWidth = '760px';
        var title = document.createElement('div');
        title.style.fontWeight = '600'; title.style.marginBottom = '6px';
        title.textContent = 'Edit env.json (' + design.name + ')'; wrap.appendChild(title);

        var ta = document.createElement('textarea');
        ta.className = 'geInput'; ta.style.width = '100%'; ta.style.height = '280px';
        ta.value = current || JSON.stringify({ name: design.name || '', updatedAt: new Date().toISOString() }, null, 2);
        wrap.appendChild(ta);

        var btns = document.createElement('div'); btns.style.display = 'flex'; btns.style.gap = '8px'; btns.style.marginTop = '8px';
        var saveBtn = mxUtils.button(mxResources.get('save') || 'Save', async function () {
            try { await window._writeTextFileHandle(fh, ta.value); ui.hideDialog(); }
            catch (e) { alert('保存失败：' + e); }
        });
        var cancel = mxUtils.button(mxResources.get('cancel') || 'Cancel', function () { ui.hideDialog(); });
        btns.appendChild(saveBtn); btns.appendChild(cancel); wrap.appendChild(btns);
        ui.showDialog(wrap, 680, 380, true, true);
    }

    // —— 点击 env 时的分流动作：默认打开 DFT 面板；按住 Alt 则打开 JSON 编辑器 —— //
    async function _openEnvAction(evt, design, parentSegs) {
        console.log('[env-open:newproject] click', {
            altKey: !!(evt && evt.altKey),
            designName: design && design.name,
            envFile: design && design.env_file,
            dirRel: design && design._dirRel
        });
        // Alt 点击：仍打开 JSON 编辑器（保留你原逻辑）
        if (evt && evt.altKey) {
            console.log('[env-open:newproject] branch=alt-editor');
            return openEnvEditor(design, parentSegs);
        }
        // 默认：在主工作区打开 design 专属 env 页签
        try {
            const segs = (design && design._dirRel && design._dirRel.slice())
                || (parentSegs || []).concat([window._sanitizeFileName(design && design.name || 'design')]);
            const envFile = (design && design.env_file) || (segs.concat(['env.json']).join('/'));
            const designDir = segs.join('/');
            const tabKey = 'env:' + envFile;
            const tabLabel = 'Env: ' + ((design && design.name) || 'design');
            const frameTitle = tabLabel + ' · dft-load';
            console.log('[env-open:newproject] resolved', {
                openWorkspaceEmbedTab: typeof window.dftArtistOpenWorkspaceEmbedTab === 'function',
                buildHtml: typeof window.dftArtistBuildLoadEmbedHtml === 'function',
                dftArtistLoad: typeof window.dftArtistLoad === 'function',
                tabKey: tabKey,
                frameTitle: frameTitle,
                envFile: envFile,
                designDir: designDir
            });

            if (typeof window.dftArtistOpenWorkspaceEmbedTab === 'function' && typeof window.dftArtistMountLoadPanel === 'function') {
                console.log('[env-open:newproject] branch=workspace-dom-tab');
                window.dftArtistOpenWorkspaceEmbedTab({
                    ui: ui,
                    key: tabKey,
                    label: tabLabel,
                    title: frameTitle,
                    closable: true,
                    render: function (panel) {
                        window.dftArtistMountLoadPanel(panel, {
                            title: frameTitle,
                            designName: (design && design.name) || 'design',
                            envFile: envFile,
                            designDir: designDir
                        });
                    }
                });
                return;
            }

            if (typeof window.dftArtistLoad === 'function') {
                console.warn('[env-open:newproject] branch=fallback-dftArtistLoad');
                window.dftArtistLoad();
                return;
            }
            console.warn('[env-open:newproject] branch=fallback-editor-no-workspace-api');
        } catch (e) {
            console.warn('打开 DFT 面板失败，回退到 JSON 编辑器:', e);
            openEnvEditor(design, parentSegs);
            return;
        }
        openEnvEditor(design, parentSegs);
    }

    // === 内联重命名 & 名称工具 ===
    function _cssEscape(s) {
        if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(s);
        return String(s).replace(/[^a-zA-Z0-9_\-]/g, s => '\\' + s.charCodeAt(0).toString(16) + ' ');
    }

    function _uniqueCopyName(base, takenArr) {
        base = String(base || '').trim();
        const taken = new Set((takenArr || []).map(String));

        const prefix = `Copy of ${base}_`;
        let n = 1;
        while (taken.has(prefix + n)) n++;
        return prefix + n; // e.g. "Copy of top_1", "Copy of top_2", ...
    }


    /** 在 page 行里启动内联重命名 */
    function _beginInlineRenamePage(rowEl, oldName, designRef) {
        if (!rowEl) return;
        const labelEl = rowEl.querySelector('span:not(.prj-caret)');
        if (!labelEl) return;

        const depthPad = rowEl.style.paddingLeft || '0px';
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'geInput';
        input.style.width = '220px';
        input.value = oldName;

        // 用 input 替换 label
        labelEl.replaceWith(input);
        input.focus(); input.select();

        let done = false;
        function cleanup() {
            if (done) return;
            done = true;
            // 还原 label
            const lbl = document.createElement('span');
            lbl.textContent = oldName;   // 若未提交，仍用旧名
            lbl.style.cursor = 'pointer';
            input.replaceWith(lbl);
        }

        async function commit(newName) {
            if (done) return;
            newName = (newName || '').trim();
            if (!newName || newName === oldName) return cleanup();
            if ((designRef.pages || []).includes(newName)) {
                ui.editor?.setStatus?.('Name already exists: ' + newName);
                return cleanup();
            }
            try {
                // 盘上改名
                window.DftRenamePageOnDisk?.(ui, designRef, oldName, newName);
                // 模型同步
                const arr = designRef.pages || [];
                const idx = arr.indexOf(oldName);
                if (idx >= 0) arr.splice(idx, 1, newName);
                rowEl.dataset.pageName = newName;

                saveProject?.('renamePage');
                // 刷新并维持高亮
                panel.refresh();
                // 尝试选中新名字对应的页签
                try {
                    const pg = findMxPageByName(newName);
                    if (pg) ui.selectPage(pg);
                } catch (_) { }
            } finally {
                done = true;
            }
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(input.value); }
            else if (e.key === 'Escape') { e.preventDefault(); cleanup(); }
        });
        input.addEventListener('blur', () => commit(input.value));
    }

    function _quoteAttr(v) { return String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

    /** 在刷新后的 DOM 中按名字+路径找到 .page-row 并开启内联重命名 */
    function _beginInlineRenameByName(designRef, name, segs) {
        const root = c; // 面板容器
        const path = (Array.isArray(segs) ? segs : (designRef._dirRel || [])).join('/')
            || window._sanitizeFileName(designRef?.name || 'design');
        const sel = `.page-row[data-page-name="${_quoteAttr(name)}"][data-design-path="${_quoteAttr(path)}"]`;

        let tries = 12;
        const tryOpen = () => {
            const row = root.querySelector(sel);
            if (row) { _beginInlineRenamePage(row, name, designRef); return; }
            if (tries-- > 0) requestAnimationFrame(tryOpen);
        };
        // 双 RAF，跨过 panel.refresh 的 DOM 重建
        requestAnimationFrame(() => requestAnimationFrame(tryOpen));
    }

    function openPageMenu(evt, designRef, pageName, pageRowEl) {
        var pageObj = findMxPageByName(pageName);
        function refreshAll() {
            if (typeof ui.updatePageTabs === 'function') ui.updatePageTabs();
            if (ui.format && typeof ui.format.refreshProject === 'function') ui.format.refreshProject();
            if (typeof ui.refresh === 'function') ui.refresh();
        }

        var menu = new mxPopupMenu(function (m, parent) {
            // === Duplicate：不弹窗，直接复制后进入内联重命名 ===
            m.addItem(mxResources.get('duplicate') || 'Duplicate', null, function () {
                const pages = designRef.pages || [];
                const newName = _uniqueCopyName(pageName, pages);

                // 盘上复制
                window.DftDuplicatePageOnDisk?.(ui, designRef, pageName, newName);

                // 模型更新
                if (!pages.includes(newName)) pages.push(newName);

                saveProject?.('duplicatePage');
                panel.refresh();
                refreshAll();

                if (typeof ui.updatePageTabs === 'function') ui.updatePageTabs();
                if (ui.format && typeof ui.format.refreshProject === 'function') ui.format.refreshProject();
                if (typeof ui.refresh === 'function') ui.refresh();

                const segs = (designRef._dirRel && designRef._dirRel.slice())
                    || [window._sanitizeFileName(designRef.name || 'design')];
                // 刷新后，找到新行并开启内联改名
                _beginInlineRenameByName(designRef, newName, segs);
            }, parent);

            m.addSeparator(parent);

            // Delete（原样保留）
            m.addItem(mxResources.get('delete') || 'Delete', null, function () {
                window.DftDeletePageOnDisk?.(ui, designRef, pageName);
            }, parent);

            // Save（原样保留）
            m.addItem((mxResources.get('DftSavePage') || 'Save'), null, function () {
                if (typeof ui.DftSavePage === 'function') {
                    var pageObj = findMxPageByName(pageName);
                    ui.DftSavePage(pageObj);
                }
            }, parent);

            // === Rename：不弹窗，直接内联 ===
            m.addItem((mxResources.get('rename') || 'Rename'), null, function () {
                _beginInlineRenamePage(pageRowEl, pageName, designRef);
            }, parent);
        });

        menu.popup(evt.clientX, evt.clientY, null, evt);
        closeOnOutside(menu);
        mxEvent.consume(evt);
    }

    function makeEnvRowSingle(design, depth, parentSegs) {
        const row = document.createElement('div');
        row.className = 'prj-row prj-indent';
        row.style.paddingLeft = (14 * depth) + 'px';

        const spacer = document.createElement('span');
        spacer.className = 'prj-caret';  // 占位以对齐
        spacer.textContent = '';
        row.appendChild(spacer);

        const label = document.createElement('span');
        label.textContent = 'env';
        label.className = 'muted';
        label.style.cursor = 'pointer';
        label.title = '点击打开 DFT 面板（按住 Alt 打开 env.json）';
        mxEvent.addListener(label, 'click', function (evt) { _openEnvAction(evt, design, parentSegs); });
        row.appendChild(label);

        return row;
    }

    function makePageRow(name, depth, designRef, designSegs) {
        const row = document.createElement('div');
        row.className = 'prj-row prj-indent page-row';
        row.dataset.pageName = name;
        row.style.paddingLeft = (14 * depth) + 'px';

        const spacer = document.createElement('span');
        spacer.className = 'prj-caret';
        spacer.textContent = '';
        row.appendChild(spacer);

        const label = document.createElement('span');
        label.textContent = name;
        label.style.cursor = 'pointer';
        label.title = 'Go to page "' + name + '"';

        // NEW: 标记本行所处的 design 路径，用于唯一定位，避免同名 page 混淆，同时高亮的问题
        const designPath = (designSegs && designSegs.join('/'))
            || (designRef._dirRel && designRef._dirRel.join('/'))
            || window._sanitizeFileName(designRef.name || 'design');
            
        row.dataset.designPath = designPath;

        try {
            const active = ui._activeProjectPageCtx || {};
            const activePath = Array.isArray(active.segs) ? active.segs.join('/') : null;
            if (activePath && active.name === name && activePath === designPath) {
                row.classList.add('is-active');
            }
        } catch (_) { }

        // 单击：跳转
        mxEvent.addListener(label, 'click', async function () {
            // —— 在切换页面前，先尝试保存当前激活页 —— //
            try {
                if (ui._noProjectMode) ui._exitNoProjectMode();   // 直接加载项目的首次点开
                // 只有在有工程根目录/授权时才保存
                const hasRoot =
                    ui._projectRootPath || ui._projectYamlDir ||
                    ui._projectRootDirHandle || ui._projectYamlDirHandle;

                if (hasRoot && typeof window.DftSaveProjectIndividually === 'function') {
                    await window.DftSaveProjectIndividually(ui);
                }
            } catch (e) {
                console.warn('[pre-switch] save current page failed:', e);
            }

            // ……（此处保持你的原逻辑不变）……
            let pg = findMxPageByName(name);
            if (!pg && typeof ui.duplicatePage === 'function') {
                const src = ui.currentPage || (ui.pages && ui.pages[0]);
                if (src) {
                    pg = ui.duplicatePage(src, name);
                    try {
                        const g = ui.editor.graph, parent = g.getDefaultParent();
                        g.getModel().beginUpdate();
                        try {
                            const cells = g.getChildCells(parent, true, true);
                            if (cells && cells.length) g.removeCells(cells, true);
                        } finally { g.getModel().endUpdate(); }
                    } catch (_) { }
                }
            }
            if (pg) {
                try {
                    const pgName = (typeof pg.getName === 'function') ? pg.getName() : pg.name;
                    if (pgName !== name && typeof ui.renamePage === 'function') ui.renamePage(pg, name);
                } catch (_) { }
                ui.selectPage(pg);
            }
            const root = row.closest('.prjPanel');
            if (root) {
                root.querySelectorAll('.page-row.is-active').forEach(el => el.classList.remove('is-active'));
                row.classList.add('is-active');
            }
            ui._activeProjectPageCtx = {
                name,
                segs: (designSegs && designSegs.slice())
                    || (designRef._dirRel && designRef._dirRel.slice())
                    || [window._sanitizeFileName(designRef.name || 'design')]
            };
            try {
                const abs = await _resolvePageFileAbs(ui, designRef, name);
                ui._activeProjectPageCtx.abs = abs;
                let exists = true;
                try { await requestSync({ action: 'fileStat', file: abs }); } catch (_) { exists = false; }
                if (!exists) { ui.editor?.setStatus?.('Page file not found yet, showing blank page: ' + name); return; }
                const xml = await requestSync({ action: 'readFile', filename: abs, encoding: 'utf-8' });
                await _loadPageXmlToCurrent(ui, xml);
                try {
                    const curPg = ui.currentPage;
                    const curName = curPg && (typeof curPg.getName === 'function' ? curPg.getName() : curPg.name);
                    if (curPg && curName !== name && typeof ui.renamePage === 'function') ui.renamePage(curPg, name);
                } catch (_) { }
                ui.editor?.setStatus?.('Loaded page: ' + name);
            } catch (e) {
                ui.handleError?.(e, true);
            }
        });
        row.appendChild(label);

        //page 右侧的“⋯”按钮，改为双击触发
        // const more = document.createElement('span');
        // more.className = 'prj-dots';
        // more.textContent = '⋯';
        // more.onclick = function (evt) { openPageMenu(evt, designRef, name, label); };
        // row.appendChild(more);
        row.oncontextmenu = function (evt) { openPageMenu(evt, designRef, name, row); return false; };
        return row;
    }

    function showInlineInputAfter(afterRowEl, depth, placeholder, onCommit) {
        const row = document.createElement('div');
        row.className = 'prj-row prj-indent';
        row.style.paddingLeft = (14 * depth) + 'px';

        const spacer = document.createElement('span');
        spacer.className = 'prj-caret';
        spacer.textContent = '';
        row.appendChild(spacer);

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'geInput';
        input.placeholder = placeholder || '';
        input.style.width = '220px';
        row.appendChild(input);

        const parent = afterRowEl.parentNode;
        parent.insertBefore(row, afterRowEl.nextSibling);

        let done = false; // ← 防重入锁

        function cleanup() {
            if (done) return;
            done = true;
            row.remove();
        }

        async function commit() {
            if (done) return;
            const v = (input.value || '').trim();
            if (!v) { cleanup(); return; }
            done = true;                 // ← 先上锁，避免紧随其后的 blur 再次进入
            try { await onCommit(v, cleanup); }
            finally { row.remove(); }
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            else if (e.key === 'Escape') { e.preventDefault(); cleanup(); }
        });

        // 失焦也走同一套提交逻辑（已加锁，不会重复）
        input.addEventListener('blur', () => { commit(); });

        input.focus();
        input.select();
    }


    function onDesignLabelClick(design, parentSegs) {
        var wrap = document.createElement('div');
        wrap.style.padding = '12px';
        var t = document.createElement('div');
        t.style.fontWeight = '600'; t.style.marginBottom = '6px';
        t.textContent = 'Add to "' + design.name + '"'; wrap.appendChild(t);

        var btns = document.createElement('div');
        btns.style.display = 'flex'; btns.style.gap = '8px';

        var b1 = mxUtils.button('Add Page', function () {
            ui.hideDialog();
            inputDialog('New Page', 'Page name', 'page-bscan', '', function (pg) {
                design.pages = design.pages || [];
                design.pages.push(pg);
                createMxPageByName(pg);
                // Promise.resolve().then(() => _createPageFileSlot(ui, design, pg)).then(() => {
                //     saveProject('addPage');
                //     panel.refresh();
                // });
            });
        });

        var b2 = mxUtils.button('Add Subdesign', function () {
            ui.hideDialog();
            inputDialog('New Subdesign', 'Subdesign name', 'sub_design', '', function (sdName) {
                design.sub_designs = design.sub_designs || [];
                var child = { name: sdName, pages: [], sub_designs: [], env_file: '' };
                design.sub_designs.push(child);
                // scaffold：放在父 design 同级目录下的 子目录（父/子）
                Promise.resolve().then(() => _ensureDesignScaffold(ui, child, (design._dirRel || [window._sanitizeFileName(design.name)]))).then(() => {
                    saveProject('addSubDesign');
                    panel.refresh();
                });
            });
        });

        var cancel = mxUtils.button(mxResources.get('cancel') || 'Cancel', function () { ui.hideDialog(); });
        btns.appendChild(b1); btns.appendChild(b2); btns.appendChild(cancel);
        wrap.appendChild(btns);
        ui.showDialog(wrap, 360, 120, true, true);
    }

    var panel = this;

    function renderDesign(design, parent, depth, keyPrefix, parentSegs) {
        const mySegs = (design._dirRel && design._dirRel.slice())
            || (parentSegs || []).concat([window._sanitizeFileName(design.name || 'design')]);

        var keyDesign = keyPrefix || ('design:' + design.name);
        var openDesign = isOpen(keyDesign, true);
        var rDesign = makeToggleRow(
            design.name,
            keyDesign,
            depth,
            function () { // 点击 design 名称：新增 subdesign（行内输入）
                showInlineInputAfter(rDesign.row, depth + 1, 'subdesign name', function (sdName) {
                    if (!sdName) return;
                    design.sub_designs = design.sub_designs || [];
                    var child = { name: sdName, pages: [], sub_designs: [], env_file: '' };
                    design.sub_designs.push(child);
                    return _ensureDesignScaffold(ui, child, mySegs).then(() => {
                        expandState[keyDesign] = true;                 // 展开父 design
                        expandState[keyDesign + '/sd:' + sdName] = true; // 展开新 subdesign
                        saveProject('addSubDesign');
                        panel.refresh();
                    });
                });
            },
            openDesign,
            true
        );
        parent.appendChild(rDesign.row);
        rDesign.caret.onclick = function (e) { mxEvent.consume(e); toggle(keyDesign); };
        if (!openDesign) return;
        // —— env（单个） —— //
        var envRow = makeEnvRowSingle(design, depth + 1, parentSegs);
        parent.appendChild(envRow);

        // ---- page 小节 ----
        var keyPageSec = keyDesign + ':page';
        var openPage = isOpen(keyPageSec, true);

        var rPageTitle = makeToggleRow(
            'page',
            keyPageSec,
            depth + 1,
            function () {
                // 点击 "page" 标题：新增 page（行内输入）
                showInlineInputAfter(
                    rPageTitle.row,
                    depth + 2,
                    'page name',
                    async (pg) => {                     // ← 这里标记 async
                        if (!pg) return;
                        await _maybeSaveActivePage(ui, 'add-page(inline)');   // ← 先保存当前页再添加新页
                        design.pages = design.pages || [];
                        if (design.pages.indexOf(pg) >= 0) return;

                        design.pages.push(pg);

                        // 1) 新建同名 mx 页签，并清空内容
                        createMxPageByName(pg);

                        // 2) 立刻写一个占位文件（可选，但能避免首次保存缺文件）
                        await _createPageFileSlot(ui, design, pg);

                        // 3) 设置激活上下文（用于高亮），并保持树展开
                        _setActivePageCtx?.(ui, design, pg);     
                        expandState[keyDesign] = true;
                        expandState[keyPageSec] = true;

                        // 4) 刷新模型/YAML
                        saveProject('addPage');
                        panel.refresh();

                        // 5) 如需马上从磁盘加载这个页（有占位/已有内容）
                        await openPageNow(ui, design, pg);
                        ui.updatePageTabs?.();
                        ui.format?.refreshProject?.();
                    }
                );
            },
            openPage,
            false
        );

        rPageTitle.row.classList.add('page-sec', 'no-sep');
        parent.appendChild(rPageTitle.row);
        rPageTitle.caret.onclick = function (e) { mxEvent.consume(e); toggle(keyPageSec); };


        if (openPage && design.pages && design.pages.length) {
            for (var i = 0; i < design.pages.length; i++) {
                parent.appendChild(makePageRow(design.pages[i], depth + 2, design, mySegs));
            }
        }

        // ---- sub_designs ----
        var kids = design.sub_designs || [];
        if (kids && kids.length) {
            for (var j = 0; j < kids.length; j++) {
                var child = kids[j];
                renderDesign(child, parent, depth + 1, keyDesign + '/sd:' + child.name, mySegs);
            }
        }
    }
};
