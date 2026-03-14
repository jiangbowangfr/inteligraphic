// dft-artist-handlers.js
(function () {
    // 计算当前脚本所在目录（绝对 URL）
    function here() {
        if (document.currentScript && document.currentScript.src) {
            return new URL('.', document.currentScript.src).href.replace(/\/$/, '');
        }
        return new URL('.', (document.baseURI || location.href)).href.replace(/\/$/, '');
    }
    var BASE = here();         // 比如：file:///.../js/dftartist/dftartist_flow_process
    var DIST = BASE+"/src/dist"; // 构建产物与当前脚本同目录

    // 提供给前端：让 Yosys 路径跟着走（见 B 节）
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

    function escapeAttr(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function buildLoadEmbedHtml(ctx) {
        ctx = ctx || {};
        var title = escapeAttr(ctx.title || 'DFT Load');
        var designName = escapeAttr(ctx.designName || '');
        var envFile = escapeAttr(ctx.envFile || '');
        var bootstrap = [
            'window.DFT_BASE = ' + JSON.stringify(DIST) + ';',
            'window.DFT_LOAD_EMBED_CONTEXT = ' + JSON.stringify({
                title: ctx.title || 'DFT Load',
                designName: ctx.designName || '',
                envFile: ctx.envFile || '',
                designDir: ctx.designDir || ''
            }) + ';'
        ].join('\n');
        return [
            '<!DOCTYPE html>',
            '<html>',
            '<head>',
            '<meta charset="utf-8" />',
            '<meta name="viewport" content="width=device-width, initial-scale=1" />',
            '<title>' + title + '</title>',
            '<link rel="stylesheet" href="' + escapeAttr(DIST + '/style.css') + '" />',
            '<link rel="stylesheet" href="' + escapeAttr(DIST + '/dft-load.iife.css') + '" />',
            '<style>',
            'html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#f8fafc;}',
            'body{font-family:Inter,Arial,Helvetica,sans-serif;}',
            '.dft-load-embed-banner{display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid #e5e7eb;background:#fff;color:#334155;font-size:12px;}',
            '.dft-load-embed-banner strong{font-size:13px;color:#0f172a;}',
            '.dft-load-embed-root{position:relative;width:100%;height:calc(100% - 39px);overflow:hidden;}',
            '</style>',
            '<script>' + bootstrap + '</script>',
            '</head>',
            '<body>',
            '<div class="dft-load-embed-banner"><strong>' + title + '</strong><span>' + designName + '</span><span>' + envFile + '</span></div>',
            '<div class="dft-load-embed-root"></div>',
            '<script>',
            'window.addEventListener("error", function (evt) {',
            '  try { console.error("[dft-load-embed:error]", evt && evt.message, evt && evt.error); } catch (_) {}',
            '});',
            '</script>',
            '<script src="' + escapeAttr(DIST + '/dft-load.iife.js') + '"></script>',
            '<script>',
            '(function(){',
            '  function openPanel(){',
            '    try {',
            '      if (window.DFTLoad && typeof window.DFTLoad.open === "function") {',
            '        console.log("[dft-load-embed] calling DFTLoad.open");',
            '        window.DFTLoad.open();',
            '      } else {',
            '        console.warn("[dft-load-embed] DFTLoad.open not ready");',
            '      }',
            '    } catch (err) {',
            '      console.error("[dft-load-embed] open failed", err);',
            '    }',
            '  }',
            '  if (document.readyState === "complete") openPanel();',
            '  else window.addEventListener("load", openPanel, { once: true });',
            '})();',
            '</script>',
            '</body>',
            '</html>'
        ].join('');
    }

    function buildStatusEmbedHtml(ctx) {
        ctx = ctx || {};
        var title = escapeAttr(ctx.title || 'DFT_Design_Spec');
        var subtitle = escapeAttr(ctx.subtitle || '');
        return [
            '<!DOCTYPE html>',
            '<html>',
            '<head>',
            '<meta charset="utf-8" />',
            '<meta name="viewport" content="width=device-width, initial-scale=1" />',
            '<title>' + title + '</title>',
            '<link rel="stylesheet" href="' + escapeAttr(DIST + '/style.css') + '" />',
            '<link rel="stylesheet" href="' + escapeAttr(DIST + '/dft-analysis.iife.css') + '" />',
            '<style>',
            'html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#f8fafc;}',
            'body{font-family:Inter,Arial,Helvetica,sans-serif;}',
            '.dft-status-embed-banner{display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid #e5e7eb;background:#fff;color:#334155;font-size:12px;}',
            '.dft-status-embed-banner strong{font-size:13px;color:#0f172a;}',
            '.dft-status-embed-root{height:calc(100% - 39px);overflow:auto;padding:16px;}',
            '</style>',
            '</head>',
            '<body>',
            '<div class="dft-status-embed-banner"><strong>' + title + '</strong>' + (subtitle ? ('<span>' + subtitle + '</span>') : '') + '</div>',
            '<div class="dft-status-embed-root"></div>',
            '<script src="' + escapeAttr(DIST + '/dft-analysis.iife.js') + '"></script>',
            '<script>',
            '(function(){',
            '  function openPanel(){',
            '    try {',
            '      if (window.DFTAnalysis && typeof window.DFTAnalysis.mount === "function") {',
            '        window.DFTAnalysis.mount(document.querySelector(".dft-status-embed-root"), { title: ' + JSON.stringify(ctx.title || 'DFT_Design_Spec') + ', subtitle: ' + JSON.stringify(ctx.subtitle || '') + ' });',
            '      } else if (window.DFTAnalysis && typeof window.DFTAnalysis.open === "function") {',
            '        window.DFTAnalysis.open();',
            '      } else {',
            '        console.warn("[dft-analysis-embed] DFTAnalysis is not ready");',
            '      }',
            '    } catch (err) {',
            '      console.error("[dft-analysis-embed] open failed", err);',
            '    }',
            '  }',
            '  if (document.readyState === "complete") openPanel();',
            '  else window.addEventListener("load", openPanel, { once: true });',
            '})();',
            '</script>',
            '</body>',
            '</html>'
        ].join('');
    }

    function mountLoadPanel(panel, ctx) {
        if (!panel) return false;
        panel.innerHTML = '';
        var mountNode = document.createElement('div');
        mountNode.className = 'phase1-workspace-embed';
        panel.appendChild(mountNode);
        ensureCss(DIST + '/style.css');
        ensureCss(DIST + '/dft-load.iife.css');
        ensureScript(DIST + '/dft-load.iife.js', function () {
            try {
                if (window.DFTLoad && typeof window.DFTLoad.mount === 'function') {
                    window.DFTLoad.mount(mountNode, ctx || {});
                } else if (window.DFTLoad && typeof window.DFTLoad.open === 'function') {
                    console.warn('[dft-load-panel] mount not available, fallback to open()');
                    window.DFTLoad.open();
                } else {
                    console.warn('[dft-load-panel] DFTLoad not ready');
                }
            } catch (err) {
                console.error('[dft-load-panel] mount failed', err);
            }
        });
        panel._dftUnmount = function () {
            try {
                if (window.DFTLoad && typeof window.DFTLoad.unmount === 'function') {
                    window.DFTLoad.unmount(mountNode);
                }
            } catch (_) { }
        };
        return true;
    }

    function mountStatusPanel(panel, ctx) {
        if (!panel) return false;
        panel.innerHTML = '';
        var mountNode = document.createElement('div');
        mountNode.className = 'phase1-workspace-embed';
        panel.appendChild(mountNode);
        ensureCss(DIST + '/style.css');
        ensureScript(DIST + '/dft-analysis.iife.js', function () {
            try {
                if (window.DFTAnalysis && typeof window.DFTAnalysis.mount === 'function') {
                    window.DFTAnalysis.mount(mountNode, ctx || {});
                } else if (window.DFTAnalysis && typeof window.DFTAnalysis.open === 'function') {
                    console.warn('[dft-analysis-panel] mount not available, fallback to open()');
                    window.DFTAnalysis.open();
                } else {
                    console.warn('[dft-analysis-panel] DFTAnalysis not ready');
                }
            } catch (err) {
                console.error('[dft-analysis-panel] mount failed', err);
            }
        });
        panel._dftUnmount = function () {
            try {
                if (window.DFTAnalysis && typeof window.DFTAnalysis.unmount === 'function') {
                    window.DFTAnalysis.unmount(mountNode);
                }
            } catch (_) { }
        };
        return true;
    }

    function ensureWorkspaceEmbedStyles() {
        if (document.getElementById('dft-workspace-embed-styles')) return;
        var style = document.createElement('style');
        style.id = 'dft-workspace-embed-styles';
        style.textContent = [
            '.phase1-workspace-embed-panel{position:absolute;inset:0;display:none;background:#fff;z-index:4;}',
            '.phase1-workspace-embed-panel.active{display:block;}',
            '.phase1-workspace-embed{width:100%;height:100%;border:0;display:block;background:#fff;}',
            '.phase1-tab.closable{display:inline-flex;align-items:center;gap:6px;}',
            '.phase1-tab-close{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:999px;font-size:12px;line-height:1;color:#6b7280;}',
            '.phase1-tab-close:hover{background:#e5e7eb;color:#111827;}'
        ].join('');
        document.head.appendChild(style);
    }

    function setDefaultWorkspaceVisible(body, visible) {
        if (!body) return;
        Array.prototype.forEach.call(body.children || [], function (child) {
            if (!child || child.getAttribute('data-dft-workspace-panel') === '1') return;
            if (!child.hasAttribute('data-dft-display-before-embed')) {
                child.setAttribute('data-dft-display-before-embed', child.style.display || '');
            }
            child.style.display = visible ? child.getAttribute('data-dft-display-before-embed') : 'none';
        });
    }

    function setActiveWorkspaceTab(tabstrip, body, key, ui) {
        if (!tabstrip || !body) return false;
        var activeCustom = false;
        var activeCustomKey = null;
        Array.prototype.forEach.call(tabstrip.querySelectorAll('.phase1-tab[data-key]'), function (tab) {
            var active = tab.getAttribute('data-key') === key;
            tab.classList.toggle('active', active);
            if (active && tab.getAttribute('data-dft-workspace-custom') === '1') {
                activeCustom = true;
                activeCustomKey = tab.getAttribute('data-key');
            }
        });
        Array.prototype.forEach.call(body.querySelectorAll('.phase1-workspace-embed-panel[data-key]'), function (panel) {
            panel.classList.toggle('active', panel.getAttribute('data-key') === key);
        });
        setDefaultWorkspaceVisible(body, !activeCustom);
        try {
            if (ui) {
                ui._activeWorkspaceKey = activeCustom ? activeCustomKey : null;
                if (typeof ui.refreshProjectExplorer === 'function') ui.refreshProjectExplorer();
            }
        } catch (_) { }
        return true;
    }

    function ensureWorkspaceDefaultTabBinding(tabstrip, body, ui) {
        if (!tabstrip || tabstrip.getAttribute('data-dft-workspace-bound') === '1') return;
        tabstrip.setAttribute('data-dft-workspace-bound', '1');
        tabstrip.addEventListener('click', function (evt) {
            var tab = evt.target && evt.target.closest ? evt.target.closest('.phase1-tab[data-key]') : null;
            if (!tab) return;
            if (evt.target && evt.target.classList && evt.target.classList.contains('phase1-tab-close')) return;
            if (tab.getAttribute('data-dft-workspace-custom') === '1') {
                setActiveWorkspaceTab(tabstrip, body, tab.getAttribute('data-key'), ui);
                return;
            }
            setActiveWorkspaceTab(tabstrip, body, tab.getAttribute('data-key'), ui);
        });
    }

    function resolveWorkspaceHost(ui) {
        var shell = ui && ui._phase1 && ui._phase1.workspaceShell ? ui._phase1.workspaceShell : document;
        var body = ui && ui._phase1 && ui._phase1.workspaceBody
            ? ui._phase1.workspaceBody
            : shell.querySelector('.phase1-workspace-body');
        var tabstrip = shell.querySelector('.phase1-workspace-tabstrip');
        return (tabstrip && body) ? { tabstrip: tabstrip, body: body } : null;
    }

    function openWorkspaceEmbedTab(opts) {
        opts = opts || {};
        var ui = opts.ui || null;
        var host = resolveWorkspaceHost(opts.ui);
        if (!host || !opts.key || typeof opts.render !== 'function') return false;
        ensureWorkspaceEmbedStyles();
        ensureWorkspaceDefaultTabBinding(host.tabstrip, host.body, ui);

        var tabstrip = host.tabstrip;
        var body = host.body;
        var key = String(opts.key);
        var label = String(opts.label || opts.title || key);
        var active = tabstrip.querySelector('.phase1-tab.active[data-key]');
        var fallbackKey = active ? active.getAttribute('data-key') : 'design';
        var tab = tabstrip.querySelector('.phase1-tab[data-key="' + key.replace(/"/g, '\\"') + '"]');
        var panel = body.querySelector('.phase1-workspace-embed-panel[data-key="' + key.replace(/"/g, '\\"') + '"]');

        if (!tab) {
            tab = document.createElement('div');
            tab.className = 'phase1-tab closable';
            tab.setAttribute('data-key', key);
            tab.setAttribute('data-dft-workspace-custom', '1');
            tab.setAttribute('data-dft-fallback-key', fallbackKey || 'design');
            var labelNode = document.createElement('span');
            labelNode.className = 'phase1-tab-label';
            labelNode.textContent = label;
            tab.appendChild(labelNode);
            if (opts.closable !== false) {
                var close = document.createElement('span');
                close.className = 'phase1-tab-close';
                close.textContent = '×';
                close.title = 'Close';
                close.addEventListener('click', function (evt) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    var nextKey = tab.getAttribute('data-dft-fallback-key') || 'design';
                    if (panel && typeof panel._dftUnmount === 'function') panel._dftUnmount();
                    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
                    if (tab && tab.parentNode) tab.parentNode.removeChild(tab);
                    try {
                        if (ui) {
                            ui._activeWorkspaceKey = nextKey === 'design' ? null : nextKey;
                            if (typeof ui.refreshProjectExplorer === 'function') ui.refreshProjectExplorer();
                        }
                    } catch (_) { }
                    setActiveWorkspaceTab(tabstrip, body, nextKey, ui);
                });
                tab.appendChild(close);
            }
            var spacer = tabstrip.querySelector('.phase1-tool-spacer');
            tabstrip.insertBefore(tab, spacer || null);
        } else {
            var existingLabel = tab.querySelector('.phase1-tab-label');
            if (existingLabel) existingLabel.textContent = label;
        }

        if (!panel) {
            panel = document.createElement('div');
            panel.className = 'phase1-workspace-embed-panel';
            panel.setAttribute('data-key', key);
            panel.setAttribute('data-dft-workspace-panel', '1');
            body.appendChild(panel);
        }

        if (panel.getAttribute('data-dft-rendered') !== '1') {
            panel.innerHTML = '';
            opts.render(panel);
            panel.setAttribute('data-dft-rendered', '1');
        }

        setActiveWorkspaceTab(tabstrip, body, key, ui);
        try {
            if (ui) {
                ui._activeWorkspaceKey = key;
                if (typeof ui.refreshProjectExplorer === 'function') ui.refreshProjectExplorer();
            }
        } catch (_) { }
        return true;
    }

    function setFrameHtml(frame, html) {
        if (!frame) return;
        var prev = frame.getAttribute('data-dft-blob-url');
        if (prev) {
            try { URL.revokeObjectURL(prev); } catch (_) { }
        }
        var blob = new Blob([String(html || '')], { type: 'text/html' });
        var url = URL.createObjectURL(blob);
        frame.setAttribute('data-dft-blob-url', url);
        frame.src = url;
    }

    window.dftArtistLoad = function () {
        ensureCss(DIST + '/style.css'); // 如果你用“CSS 注入到 JS”，这行可以删掉
        ensureScript(DIST + '/dft-load.iife.js', function () {
            if (window.DFTLoad?.open) window.DFTLoad.open();
            else alert('DFTLoad 未就绪');
        });
    };
    window.dftArtistBuildLoadEmbedHtml = buildLoadEmbedHtml;
    window.dftArtistLoad2 = function () {
        ensureCss(DIST + '/style.css'); // 如果你用“CSS 注入到 JS”，这行可以删掉
        ensureScript(DIST + '/dft-repair-analysis.iife.js', function () {
            if (window.DFTRepairAnalysis?.open) window.DFTRepairAnalysis.open();
            else alert('DFTRepairAnalysis 未就绪');
        });
    };
    window.dftArtistStatus = function () {
        ensureCss(DIST + '/style.css');
        ensureScript(DIST + '/dft-status.iife.js', function () {
            if (window.DFTStatus?.open) window.DFTStatus.open();
            else alert('DFTStatus 未就绪');
        });
    };
    window.dftArtistAnalysis = function () {
        ensureCss(DIST + '/style.css');
        ensureScript(DIST + '/dft-analysis.iife.js', function () {
            if (window.DFTAnalysis?.open) window.DFTAnalysis.open();
            else alert('DFTAnalysis 未就绪');
        });
    };
    window.dftArtistPreviewCode = function (ui) {
        window.DFT_CTX = ui;           // 让模块可访问 EditorUi

        ensureCss(DIST + '/style.css'); // 若需要你项目的全局样式
        // 预览模块产物（Vite 生成）
        ensureCss(DIST + '/dft-preview-code.iife.css');
        ensureScript(DIST + '/dft-preview-code.iife.js', function () {
            if (window.DFTPreviewCode?.open) window.DFTPreviewCode.open();
            else alert('DFTPreviewCode 未就绪');
        });
    };
    window.dftArtistOpenWorkspaceEmbedTab = openWorkspaceEmbedTab;
    window.dftArtistSetFrameHtml = setFrameHtml;
    window.dftArtistMountLoadPanel = mountLoadPanel;
    window.dftArtistBuildStatusEmbedHtml = buildStatusEmbedHtml;
    window.dftArtistMountStatusPanel = mountStatusPanel;
})();
