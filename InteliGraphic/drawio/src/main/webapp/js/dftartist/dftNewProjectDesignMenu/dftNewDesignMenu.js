// dft-artist-handlers.js
(function () {
    // 计算当前脚本所在目录（绝对 URL）
    function here() {
        if (document.currentScript && document.currentScript.src) {
            return new URL('.', document.currentScript.src).href.replace(/\/$/, '');
        }
        return new URL('.', (document.baseURI || location.href)).href.replace(/\/$/, '');
    }
    var BASE = here();         // 比如：file:///.../dftartist_release
    var DIST = BASE + '/dist'; // 构建产物所在目录

    // 提供给前端：让 Yosys 路径跟着走
    window.DFT_BASE = DIST;    // => Yosys 资源在 `${DFT_BASE}/web_yosys`

    function ensureCss(href) {
        if (!href) return;
        if (document.querySelector(`link[data-dft-css="${href}"]`)) return;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.setAttribute('data-dft-css', href);
        document.head.appendChild(link);
    }
    function ensureScript(src, cb) {
        var id = 'dft:script:' + src;
        if (document.getElementById(id)) return cb && cb();
        var s = document.createElement('script');
        s.id = id; s.src = src;
        s.onload = function () { cb && cb(); };
        s.onerror = function () { alert('加载失败：' + src); };
        document.head.appendChild(s);
    }
    // ====== 加载 NewProject 包 ======
    function ensureNewProjectLoaded(cb) {
        // 注意：这里的文件名要和你包产物一致
        ensureCss(DIST + '/dft-newproject-menu.iife.css');
        ensureScript(DIST + '/dft-newdesign-menu.iife.js', cb);
    }

    // “New Design” 入口
    window.newDesignmy = function (editorUi) {
        function openOnce() {
            if (!window.DFTNewDesign?.open) {
                console.error('DFTNewDesign 仍未就绪');
                alert('New Design 模块未就绪:请检查 dft-newdesign-menu.iife.js 是否存在于构建目录');
                return;
            }

            window.DFTNewDesign.open({
                onCreated: async ({ projectName, rootPath, yamlPath, dbDirPath, dbFilePath, model }) => {
                    // 优先使用调用方传入的 editorUi，其次用 window.App?.editorUi
                    var ui = editorUi || window.App?.editorUi || window.DFT_CTX;
                    if (!ui) return;

                    ui.projectModel = model || { name: projectName, path: rootPath, designs: [] };
                    ui._projectRootPath = rootPath;        // 绝对项目根
                    ui._projectYamlFilePath = yamlPath;    // <root>/<name>.dftart
                    ui._projectYamlDir = rootPath;         // 同根

                    // db 信息
                    ui._projectDbDirPath = dbDirPath;
                    ui._projectDbFilePath = dbFilePath;

                    // 不再使用 FSA 句柄，避免后续触发浏览器弹窗
                    ui._projectRootDirHandle = null;
                    ui._projectDbDirHandle = null;
                    ui._projectDbFileHandle = null;

                    // 清理可能残留的高亮上下文
                    ui._activeProjectPageCtx = null;

                    // 刷新右侧面板并立即落盘一次（之后修改会自动静默保存）
                    if (ui.format && typeof ui.format.refreshProject === 'function') {
                        ui.format.refreshProject();
                    }
                    if (typeof _autoSaveProjectYaml === 'function') {
                        _autoSaveProjectYaml(ui, 'init');
                    }
                }
            });
        }

        if (!window.DFTNewProject?.open) {
            // 未加载则按需加载，加载完成后再打开
            ensureNewProjectLoaded(openOnce);
        } else {
            openOnce();
        }
    };

})();

