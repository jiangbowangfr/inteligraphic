// === draw.io Home Screen plugin  ===========================================
Draw.loadPlugin(function (ui) {
    // ---- 可选：如果要从首页打开你的 DFT 单文件，把路径填到这里（留空则不加载）----
    var DFT_SCRIPT_SRC = ''; // 例如 'file:///C:/path/to/dist/dft-console.iife.js' 或 'http://127.0.0.1:8080/dft-console.iife.js'
    // alert("home plugin loaded");
    function ensureDFTConsole(cb) {
        if (!DFT_SCRIPT_SRC) return ui.showError('DFT Console', '未配置 DFT_SCRIPT_SRC'); // 可改为静默返回
        if (window.DFTConsole) return cb && cb();
        var s = document.createElement('script');
        s.src = DFT_SCRIPT_SRC;
        s.onload = function () { cb && cb(); };
        s.onerror = function () { ui.showError('Load Error', 'dft-console.iife.js 加载失败'); };
        document.head.appendChild(s);
    }

    // ---- CSS（简单蓝色首页风格，可按需改） ----
    var style = document.createElement('style');
    style.textContent = `
  #homeOverlay {
    position: fixed; inset: 0; z-index: 9999; background: #e8f0fb;
    display:flex; flex-direction:column; font-family: -apple-system,Segoe UI,Roboto,Helvetica,Arial;
  }
  #homeHeader { background:#2f6ea5; color:#fff; padding:14px 18px; font-weight:600; letter-spacing:.5px; }
  #homeHeader .title { font-size:22px; }
  #homeBody { flex:1; display:flex; gap:16px; padding:16px; }
  .panel { background:#fff; border:1px solid #cfd8e3; border-radius:6px; padding:14px; flex:1; overflow:auto; }
  .panel h3 { margin:0 0 8px 0; color:#2f6ea5; }
  .btn { display:inline-block; padding:10px 14px; background:#2f6ea5; color:#fff; border-radius:4px; text-decoration:none; cursor:pointer; margin-right:10px; }
  .btn.secondary { background:#5c8fbd; }
  .btn.ghost { background:transparent; border:1px solid #5c8fbd; color:#2f6ea5; }
  .link { color:#2f6ea5; text-decoration:underline; cursor:pointer; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:10px; }
  .card { border:1px dashed #cfd8e3; border-radius:6px; padding:10px; background:#f7fbff; }
  .foot { padding:10px 16px; border-top:1px solid #cfd8e3; background:#f2f6fb; display:flex; align-items:center; gap:12px; }
  `;
    document.head.appendChild(style);

    // ---- 构建 DOM ----
    var wrap = document.createElement('div');
    wrap.id = 'homeOverlay';
    wrap.innerHTML = `
    <div id="homeHeader">
      <span class="title">DESIGN SUITE · Home</span>
    </div>
    <div id="homeBody">
      <div class="panel" style="max-width:360px">
        <h3>Getting Started</h3>
        <div class="grid">
          <div class="card">
            <div class="btn" id="btnStart">开始绘图</div>
            <div style="margin-top:8px;color:#555">进入当前空白图（隐藏本页）。</div>
          </div>
          <div class="card">
            <div class="btn secondary" id="btnNew">新建图</div>
            <div style="margin-top:8px;color:#555">调用 draw.io 的“新建/模板”对话框。</div>
          </div>
          <div class="card">
            <div class="btn ghost" id="btnOpen">打开文件</div>
            <div style="margin-top:8px;color:#555">从本地/设备打开已有图。</div>
          </div>
          <div class="card">
            <div class="btn" id="btnDFT">DFT Console</div>
            <div style="margin-top:8px;color:#555">（可选）打开之前的 DFT 加载界面。</div>
          </div>
        </div>
      </div>

      <div class="panel">
        <h3>Recent Projects</h3>
        <div id="recentList" style="color:#666;">暂无</div>
      </div>

      <div class="panel" style="max-width:380px">
        <h3>Help</h3>
        <ul style="margin:6px 0 0 18px;color:#555; line-height:1.8;">
          <li><span class="link" id="lkHelp">官方文档</span></li>
          <li><span class="link" id="lkShortcuts">快捷键</span></li>
          <li><span class="link" id="lkWhatsNew">更新说明</span></li>
        </ul>
      </div>
    </div>
    <div class="foot">
      <label><input type="checkbox" id="chkSkip"> 下次跳过首页</label>
      <span style="margin-left:auto;color:#7a8aa6">Home overlay provided by plugin</span>
    </div>
  `;

    // 记录/展示“最近打开”（很简化：用 localStorage 维护）
    var RECENT_KEY = 'plugin.home.recents';
    function getRecents() {
        try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (e) { return []; }
    }
    function pushRecent(name) {
        var arr = getRecents();
        if (name) {
            arr = [name].concat(arr.filter(x => x !== name)).slice(0, 8);
            localStorage.setItem(RECENT_KEY, JSON.stringify(arr));
            renderRecents();
        }
    }
    function renderRecents() {
        var box = wrap.querySelector('#recentList');
        var arr = getRecents();
        if (!arr.length) { box.textContent = '暂无'; return; }
        box.innerHTML = '<ul style="margin:6px 0 0 18px;">' + arr.map(p => '<li>' + mxUtils.htmlEntities(p) + '</li>').join('') + '</ul>';
    }

    // 首次是否跳过
    var SKIP_KEY = 'plugin.home.skip';
    var skip = localStorage.getItem(SKIP_KEY) === '1';
    var chk = wrap.querySelector('#chkSkip');
    chk.checked = skip;
    chk.onchange = function () { localStorage.setItem(SKIP_KEY, chk.checked ? '1' : '0'); };

    // ---- 行为：按钮事件 ----
    function hideHome() { if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap); }
    function callAction(name, fallback) {
        var a = ui.actions.get(name);
        if (a && typeof a.funct === 'function') a.funct();
        else if (typeof fallback === 'function') fallback();
    }

    // 开始绘图：仅隐藏首页（保留当前空白图）
    wrap.querySelector('#btnStart').onclick = function () {
        hideHome();
    };

    // 新建图：调用内置 new（通常会弹出模板选择），然后隐藏首页
    wrap.querySelector('#btnNew').onclick = function () {
        callAction('new'); hideHome();
    };

    // 打开文件：优先调内置 open；若不可用，退化成本地导入
    wrap.querySelector('#btnOpen').onclick = function () {
        var did = false;
        var a = ui.actions.get('open');
        if (a && typeof a.funct === 'function') { a.funct(); did = true; }
        if (!did) {
            // 退化：创建一个隐藏 file input，导入到当前图
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = '.drawio,.xml,.png,.svg,.vsdx';
            input.onchange = function (e) {
                var files = e.target.files;
                if (ui.importFiles && files && files.length) ui.importFiles(files, null, ui.graph.getModel());
            };
            input.click();
        }
        hideHome();
    };

    // 可选：打开 DFT Console
    wrap.querySelector('#btnDFT').onclick = function () {
        ensureDFTConsole(function () { window.DFTConsole.openLoad(); });
    };

    // 帮助链接（示例）
    wrap.querySelector('#lkHelp').onclick = function () { window.open('https://www.drawio.com/doc', '_blank'); };
    wrap.querySelector('#lkShortcuts').onclick = function () { callAction('showKeyboardShortcuts'); };
    wrap.querySelector('#lkWhatsNew').onclick = function () { window.open('https://www.diagrams.net/blog', '_blank'); };

    // 当文件名改变时，把名字记录到“最近”
    ui.editor.addListener(mxEvent.SAVE, function () { pushRecent(ui.getCurrentFile() ? ui.getCurrentFile().getTitle() : (ui.editor.filename || 'unnamed')); });
    ui.editor.addListener(mxEvent.OPEN, function () { pushRecent(ui.getCurrentFile() ? ui.getCurrentFile().getTitle() : (ui.editor.filename || 'opened')); });
    renderRecents();

    // ---- 显示首页（如果未勾选“下次跳过”）----
    function showHomeOnce() {
        if (localStorage.getItem(SKIP_KEY) === '1') return; // 用户选择跳过
        // 在 UI 就绪后插入（确保画布已渲染）
        setTimeout(function () {
            document.body.appendChild(wrap);
        }, 0);
    }
    showHomeOnce();

    // 也给菜单加一个入口：再次打开首页
    ui.actions.addAction('home-overlay', function () {
        document.body.appendChild(wrap);
    });
    ui.menubar.addMenu('Home', function (menu, parent) {
        ui.menus.addMenuItem(menu, 'home-overlay');
    });
});