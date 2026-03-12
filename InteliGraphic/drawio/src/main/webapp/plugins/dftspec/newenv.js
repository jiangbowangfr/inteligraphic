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
    var DIST = BASE + '/dftartist_flow_process'; // 你的构建产物所在目录

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

    window._showEnvPageDialog = function (ui, envName) {
        ensureCss(DIST + '/style.css');
        ensureScript('/Users/jiangbowang/YO/Parttimejob/drawio/drawio-desktop/drawio/src/main/webapp/js/dftartist/dftMenu/dftartist_flow_process/dft-status.iife.js', function () {
            if (window.DFTStatus?.open) window.DFTStatus.open();
            else alert('DFTStatus 未就绪');
        });
    };

})();



// // ========= 纯原生 DOM 的 ENV 面板（无任何外链依赖 / CSP 友好） =========
// window._showEnvPageDialog = function (ui, envName) {
//     // 容器
//     const wrap = document.createElement('div');
//     wrap.style.width = '860px';
//     wrap.style.height = '620px';
//     wrap.style.display = 'flex';
//     wrap.style.flexDirection = 'column';

//     // 内联样式（CSP: style-src 允许 unsafe-inline）
//     const css = document.createElement('style');
//     css.textContent = `
//     .env-head{font-weight:600;margin:2px 0 8px 0}
//     .env-scroll{flex:1 1 auto;min-height:0;overflow:auto}
//     .env-alert{display:flex;gap:8px;padding:10px 12px;border-radius:6px;margin-bottom:12px;align-items:flex-start}
//     .env-alert.ok{background:#f6ffed;border:1px solid #b7eb8f;color:#135200}
//     .env-alert.warn{background:#fffbe6;border:1px solid #ffe58f;color:#614700}
//     .env-card{border:1px solid #e5e7eb;border-radius:8px;padding:12px;background:#fff}
//     .env-card + .env-card{margin-top:12px}
//     .env-grid{display:grid;grid-template-columns:repeat(2, minmax(0,1fr));gap:12px}
//     .env-tag{display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;line-height:18px;border:1px solid transparent}
//     .env-tag.ok{background:#f6ffed;border-color:#b7eb8f;color:#135200}
//     .env-tag.miss{background:#fff1f0;border-color:#ffa39e;color:#a8071a}
//     .env-kv{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
//     .env-kv .label{font-weight:600}
//     .env-stat{display:grid;grid-template-columns:repeat(3, minmax(0,1fr));gap:12px}
//     .env-stat .box{border:1px dashed #d4d4d8;border-radius:8px;padding:12px;text-align:center;background:#fafafa}
//     .env-stat .ttl{font-size:12px;color:#6b7280;margin-bottom:6px}
//     .env-stat .val{font-size:20px;font-weight:700}
//     .env-list .item + .item{margin-top:8px}
//     .env-list .item{border:1px solid #ffe58f;background:#fffbe6;color:#614700;border-radius:6px;padding:8px 10px}
//     .env-muted{opacity:.7}
//   `;
//     wrap.appendChild(css);

//     // 标题
//     const head = document.createElement('div');
//     head.className = 'env-head';
//     head.textContent = 'ENV: ' + envName;
//     wrap.appendChild(head);

//     // 可滚动区域
//     const area = document.createElement('div');
//     area.className = 'env-scroll';
//     wrap.appendChild(area);

//     // 读取快照
//     let snap = null;
//     try { snap = JSON.parse(localStorage.getItem('DFT_SNAPSHOT') || 'null'); } catch (_) { }
//     const SYSTEM_LIBRARIES = { standardCellLib: 'syn_library/standard_cells/tessent/adk.tcelllib' };

//     function el(tag, cls, txt) {
//         const d = document.createElement(tag);
//         if (cls) d.className = cls;
//         if (txt != null) d.textContent = txt;
//         return d;
//     }

//     // 无数据
//     if (!snap) {
//         const card = el('div', 'env-card');
//         const alert = el('div', 'env-alert warn');
//         alert.appendChild(el('div', null, '暂无数据'));
//         const desc = el('div', 'env-muted', '尚未在 Load 界面生成快照。请先到 Load 界面加载设计并进行一次操作。');
//         alert.appendChild(desc);
//         card.appendChild(alert);
//         area.appendChild(card);
//     } else {
//         const checklist = snap.checklist || [];
//         const counts = snap.counts || { clocks: 1, regCount: 0, chainCount: 0 };
//         const designTop = snap.designTop || '';
//         const designFilesCount = (snap.files && snap.files.design && snap.files.design.length) ? snap.files.design.length : 0;

//         // 顶部 Alert
//         const alert = el('div', 'env-alert ' + (checklist.length ? 'warn' : 'ok'));
//         alert.appendChild(el('div', null, checklist.length ? '部分就绪，请完善缺失项' : '环境就绪（示意）'));
//         const desc = el('div', 'env-muted', `系统已包含标准单元库: ${SYSTEM_LIBRARIES.standardCellLib}`);
//         alert.appendChild(desc);
//         area.appendChild(alert);

//         // 缺失项
//         if (checklist.length) {
//             const missCard = el('div', 'env-card');
//             missCard.appendChild(el('div', null, '缺失项/告警'));
//             const list = el('div', 'env-list');
//             checklist.forEach((c) => {
//                 const it = el('div', 'item', c);
//                 list.appendChild(it);
//             });
//             missCard.appendChild(list);
//             area.appendChild(missCard);
//         }

//         // 关键项网格
//         const gridCard = el('div', 'env-card');
//         const grid = el('div', 'env-grid');
//         [
//             { label: '顶层模块', val: designTop || '未设置', ok: !!designTop },
//             { label: '系统标准单元库', val: '已包含', ok: true },
//             { label: '设计文件', val: String(designFilesCount), ok: designFilesCount > 0 },
//             { label: 'SDC', val: '—', ok: true },
//         ].forEach(item => {
//             const cell = el('div', null);
//             const kv = el('div', 'env-kv');
//             const tag = el('span', 'env-tag ' + (item.ok ? 'ok' : 'miss'), item.ok ? 'OK' : 'MISS');
//             const lab = el('span', 'label', item.label + '：');
//             const v = el('span', null, item.val);
//             kv.appendChild(tag); kv.appendChild(lab); kv.appendChild(v);
//             cell.appendChild(kv);
//             grid.appendChild(cell);
//         });
//         gridCard.appendChild(grid);
//         area.appendChild(gridCard);

//         // 统计
//         const statCard = el('div', 'env-card');
//         statCard.appendChild(el('div', null, '设计摘要'));
//         const stat = el('div', 'env-stat');
//         [
//             { t: '时钟域', v: counts.clocks },
//             { t: '寄存器(估)', v: counts.regCount },
//             { t: '链条(估)', v: counts.chainCount },
//         ].forEach(s => {
//             const box = el('div', 'box');
//             box.appendChild(el('div', 'ttl', s.t));
//             box.appendChild(el('div', 'val', String(s.v)));
//             stat.appendChild(box);
//         });
//         statCard.appendChild(stat);
//         statCard.style.marginTop = '12px';
//         area.appendChild(statCard);
//     }

//     // 打开对话框
//     if (typeof ui.showDialog === 'function') {
//         ui.showDialog(wrap, 880, 640, true, true /*closable*/);
//     }
// };
