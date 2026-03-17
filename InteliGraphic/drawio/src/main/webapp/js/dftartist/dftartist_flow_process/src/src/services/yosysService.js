// src/services/yosysService.js
// 负责创建和管理 Yosys Web Worker，提供 runSys() + onLog()。

export function createYosysRunner(baseUrlArg) {
    // 1) 计算 base 与真正的绝对路径
    const fallback =
        typeof window !== 'undefined' && window.DFT_BASE
            ? window.DFT_BASE.replace(/\/+$/, '') + '/web_yosys'
            : '/web_yosys';

    const base = baseUrlArg || fallback;
    const absBase = new URL(base, document.baseURI || location.origin)
        .href.replace(/\/+$/, ''); // 去掉结尾/

    const workerUrl = absBase + '/yosys.worker.mjs';

    // 2) 启动 Worker
    const worker = new Worker(workerUrl, { type: 'module', name: 'yosys-web' });
    console.log('[yosys:main] absBase =', absBase);
    console.log('[yosys:main] workerUrl =', workerUrl);

    const listeners = new Set();

    const readyPromise = new Promise((resolve, reject) => {
        const onMsg = (ev) => {
            const { type, data } = ev.data || {};
            if (type && type !== 'stdout') console.log('[yosys:main<-worker]', type, data);
            if (type === 'ready') { cleanup(); resolve(true); }
            if (type === 'error') { cleanup(); reject(new Error(data || 'worker init error')); }
        };
        const onErr = (e) => {
            cleanup();
            const msg = e?.message || '';
            const file = e?.filename || '';
            const line = e?.lineno, col = e?.colno;
            const detail = e?.error && e.error.stack ? ('\n' + e.error.stack) : '';
            console.error('[yosys:worker error]', { msg, file, line, col, event: e });
            reject(new Error(`worker load error: ${msg} @ ${file}:${line || ''}:${col || ''}${detail}`));
            };
        const onMsgErr = (e) => console.error('[yosys:worker messageerror]', e?.data);
        const cleanup = () => {
            worker.removeEventListener('message', onMsg);
            worker.removeEventListener('error', onErr);
            worker.removeEventListener('messageerror', onMsgErr);
        };
        worker.addEventListener('message', onMsg);
        worker.addEventListener('error', onErr);
        worker.addEventListener('messageerror', onMsgErr);
    });

    // 4) 普通总线：把 worker 的各类日志转给 UI
    worker.onmessage = (ev) => {
        const { type, data } = ev.data || {};
        if (['stdout', 'stderr', 'dbg', 'error', 'info'].includes(type)) {
            if (type !== 'stdout') console.log('[yosys:main<-worker]', type, data);
            const line = typeof data === 'string' ? data.slice(0, 2000) : JSON.stringify(data);
            for (const fn of listeners) { try { fn(type, line); } catch { /* ignore */ } }
        }
    };

    // 5) 触发初始化与心跳
    worker.postMessage({ cmd: 'init', baseUrl: absBase });
    worker.postMessage({ cmd: 'ping' });

    // 6) 对外的日志订阅
    function onLog(fn) { listeners.add(fn); return () => listeners.delete(fn); }

    // 7) 强制将任意内容转为字符串（UTF-8）
    const td = new TextDecoder();
    function forceStringContent(content) {
        if (typeof content === 'string') return content;
        if (content instanceof Uint8Array) return td.decode(content);
        if (content && typeof content.byteLength === 'number') return td.decode(new Uint8Array(content));
        if (content == null) return '';
        try { return String(content); } catch { return ''; }
    }

    function normalizeFilesForWorker(files) {
        const out = (files || []).map(f => {
            const name = String(f?.name || '');
            const content = forceStringContent(f?.content);
            const len = (content || '').length;
            console.log('[yosys:main] file ready:', {
                name, type: typeof content, len,
                head: (content || '').slice(0, 80),
                tail: len > 120 ? (content || '').slice(-40) : ''
            });
            return { name, content };
        });
        return out;
    }

    // 8) 真正执行一次 Yosys
    async function runSys({ files, top = 'top', extraScript = '' }) {
        console.log('[yosys:main] runSys files=', files);
        await Promise.race([
            readyPromise,
            new Promise((_, rej) => setTimeout(() => rej(new Error('worker init timeout')), 10000))
        ]);

        return new Promise((resolve, reject) => {
            const onMsg = (e) => {
                const { type, data } = e.data || {};
                if (type && type !== 'stdout') console.log('[yosys:main<-worker:onMsg]', type, data);
                if (type === 'done') { worker.removeEventListener('message', onMsg); resolve(data); }
                if (type === 'error') { worker.removeEventListener('message', onMsg); reject(new Error(data)); }
            };
            worker.addEventListener('message', onMsg);

            worker.postMessage({
                cmd: 'run',
                payload: {
                    files: normalizeFilesForWorker(files || []),
                    top: String(top || 'top'),
                    extraScript: String(extraScript || '')
                }
            });
        });
    }

    return { runSys, onLog, _debug: { absBase, workerUrl } };
}