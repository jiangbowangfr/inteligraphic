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

// 从 env_file 推导出目录段；没有就用名字
function _hydrateDesignDirsFromYaml(ui) {
    const model = ui.projectModel || {};
    const designs = model.designs || [];

    function walk(d, parentSegs) {
        let segs;
        if (d && typeof d.env_file === 'string' && d.env_file.trim()) {
            // env_file 形如 "design/env.json" 或 "core/sub_core/env.json"
            const p = d.env_file.replace(/\\/g, '/');
            segs = p.split('/'); segs.pop(); // 去掉文件名
        } else {
            segs = (parentSegs || []).concat([_sanitizeFileName(d.name || 'design')]);
            // 顺便把 env_file 填好，保持模型一致性
            d.env_file = _joinPath(...segs, 'env.json');
        }
        d._dirRel = segs;

        d.pages = Array.isArray(d.pages) ? d.pages : [];
        d.sub_designs = Array.isArray(d.sub_designs) ? d.sub_designs : [];

        d.sub_designs.forEach(child => walk(child, segs));
    }

    designs.forEach(d => walk(d, []));
}


function _parseProjectYaml(text) {
    if (!text) return null;
    const lines = text.replace(/\r/g, '').split('\n');
    if (lines[0] && lines[0].startsWith('#yaml:')) lines.shift();

    let modelName = null, modelPath = '', designs = [];
    const stack = []; // {type:'root'|'designs'|'sub_designs'|'design'|'pages'|'page_meta'|'page_meta_item', indent:number, obj?, list?, map?, meta?}

    const isEmptyListLine = (s) => /\[\s*\]\s*$/.test(s);
    const normTabs = (s) => s.replace(/\t/g, '    ');
    const getIndent = (s) => (s.match(/^(\s*)/) || [, ''])[1].length;

    const popTo = (indent) => {
        while (stack.length) {
            const t = stack[stack.length - 1];
            // 对“项上下文”（design / pages），缩进相等即应出栈；对容器（designs / sub_designs / root）保留
            const mustPop = (indent <= t.indent) && !/^(root|designs|sub_designs)$/.test(t.type);
            if (!mustPop) break;
            stack.pop();
        }
        // 如果栈顶是 pages 且当前行和它同级/更浅，也要退出 pages 段
        if (stack.length && stack[stack.length - 1].type === 'pages' &&
            indent <= stack[stack.length - 1].indent) {
            stack.pop();
        }
        if (stack.length && stack[stack.length - 1].type === 'page_meta' &&
            indent <= stack[stack.length - 1].indent) {
            stack.pop();
        }
        if (stack.length && stack[stack.length - 1].type === 'page_meta_item' &&
            indent <= stack[stack.length - 1].indent) {
            stack.pop();
        }
    };

    for (let raw of lines) {
        if (!raw || !raw.trim()) continue;
        raw = normTabs(raw);
        const indent = getIndent(raw);
        const s = raw.trim();

        popTo(indent);

        // 根键： "<name>:"
        if (!modelName) {
            const m = s.match(/^(.+):\s*$/);
            if (m) { modelName = _unq(m[1]); stack.push({ type: 'root', indent }); }
            continue;
        }

        // path
        if (s.startsWith('path:')) { modelPath = _unq(s.slice(5).trim()); continue; }

        // 顶层 designs
        if (s.startsWith('designs:')) {
            designs = [];
            if (!isEmptyListLine(s)) stack.push({ type: 'designs', indent, list: designs });
            continue;
        }

        // design 内的 sub_designs
        if (s.startsWith('sub_designs:')) {
            const owner = [...stack].reverse().find(x => x.type === 'design');
            if (owner) {
                owner.obj.sub_designs = [];
                if (!isEmptyListLine(s)) stack.push({ type: 'sub_designs', indent, list: owner.obj.sub_designs });
            }
            continue;
        }

        // 新设计项
        if (s.startsWith('- name:')) {
            const d = { name: _unq(s.slice(7).trim()), env_file: '', pages: [], sub_designs: [], page_meta: {} };
            const ctx = stack[stack.length - 1];
            if (!ctx || !ctx.list) throw new Error('YAML structure error near: ' + s);
            ctx.list.push(d);
            stack.push({ type: 'design', indent, obj: d });
            continue;
        }

        // 设计项内字段
        const top = stack[stack.length - 1];
        if (top && top.type === 'design') {
            if (s.startsWith('env_file:')) { top.obj.env_file = _unq(s.slice(9).trim()); continue; }
            if (s.startsWith('pages:')) {
                if (isEmptyListLine(s)) { top.obj.pages = []; }
                else stack.push({ type: 'pages', indent, list: top.obj.pages });
                continue;
            }
            if (s.startsWith('page_meta:')) {
                top.obj.page_meta = {};
                if (!/\{\s*\}\s*$/.test(s)) stack.push({ type: 'page_meta', indent, map: top.obj.page_meta });
                continue;
            }
        }

        // pages 列表项
        if (top && top.type === 'pages' && s.startsWith('- ')) {
            top.list.push(_unq(s.slice(2).trim()));
            continue;
        }
        if (top && top.type === 'page_meta') {
            const mm = raw.match(/^\s+(.+):\s*$/);
            if (mm) {
                const pageName = _unq(mm[1].trim());
                top.map[pageName] = {};
                stack.push({ type: 'page_meta_item', indent, meta: top.map[pageName] });
                continue;
            }
        }
        if (top && top.type === 'page_meta_item') {
            const fm = s.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
            if (fm) {
                top.meta[fm[1]] = _unq(fm[2].trim());
                continue;
            }
        }
        // 其它未识别行可忽略（比如注释等）
    }

    return { name: modelName || 'project', path: modelPath || '', designs };
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
                _hydrateDesignDirsFromYaml(ui);  // ← 初始化每个 design 的目录段

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
