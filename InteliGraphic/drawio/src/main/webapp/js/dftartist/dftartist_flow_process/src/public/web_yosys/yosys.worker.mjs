// public/web_yosys/yosys.worker.mjs
// 运行在 Worker 线程（ES Module）

let baseUrl = ''; // ★ 必须先声明
const SAFE_MODE = false; // 先可设 true 验证“init 能否走通”
const post = (type, data) => {
    try { self.postMessage({ type, data }); }
    catch (e) { try { self.postMessage({ type: 'error', data: 'post failed: ' + (e?.message || e) }); } catch { } }
};
const dbg = (s) => post('dbg', String(s));

function isDataUrl(s) { return typeof s === 'string' && s.startsWith('data:'); }
function dataUrlToBytes(s) {
    const m = /^data:.*?;base64,(.*)$/.exec(s);
    if (!m) throw new Error('unsupported data url');
    const bin = atob(m[1]);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
}

// fetch -> ArrayBuffer，兼容 file://（fetch 失败回退 XHR）
async function fetchArrayBuffer(url) {
    if (isDataUrl(url)) return dataUrlToBytes(url).buffer;
    try {
        const r = await fetch(url);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.arrayBuffer();
    } catch {
        return await new Promise((resolve, reject) => {
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.responseType = 'arraybuffer';
                xhr.onload = () => (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300))
                    ? resolve(xhr.response)
                    : reject(new Error('XHR ' + xhr.status));
                xhr.onerror = () => reject(new Error('XHR network error'));
                xhr.send();
            } catch (e) { reject(e); }
        });
    }
}

// 把 modules 里的每个条目 ➜ WebAssembly.Module（先变字节，再 compile）
async function compileModules(modIn) {
    const out = {};
    for (const [k, v] of Object.entries(modIn || {})) {
        let bytes;
        if (v instanceof Uint8Array) bytes = v;
        else if (v instanceof ArrayBuffer) bytes = new Uint8Array(v);
        else {
            const s = String(v ?? '');
            bytes = isDataUrl(s) ? dataUrlToBytes(s) : new Uint8Array(await fetchArrayBuffer(s));
        }
        dbg(`[worker] wasm mod ${k}: bytes=${bytes.byteLength}`);
        out[k] = await WebAssembly.compile(bytes);
        dbg(`[worker] wasm mod ${k}: compiled=ok`);
    }
    return out;
}


function isDataUrl(s) { return typeof s === 'string' && s.startsWith('data:'); }
function dataUrlToBytes(s) {
    // 仅处理 data:…;base64,… 这种
    const m = /^data:.*?;base64,(.*)$/.exec(s);
    if (!m) throw new Error('unsupported data url');
    const bin = atob(m[1]);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
}

// 既尝试 fetch，也对 file:// 做 XHR 回退
async function fetchArrayBuffer(url) {
    // 先试 fetch（某些 Electron 允许 file://）
    try {
        const r = await fetch(url);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.arrayBuffer();
    } catch (e) {
        // 回退 XHR，通常可读 file://
        await new Promise((res) => setTimeout(res)); // 让 event loop 透一口气
        await new Promise((res, rej) => {
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.responseType = 'arraybuffer';
                xhr.onload = () => (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) ? res() : rej(new Error('XHR ' + xhr.status));
                xhr.onerror = () => rej(new Error('XHR network error'));
                xhr.send();
                xhr.addEventListener('loadend', () => { /* no-op */ });
                xhr._resolve = res; xhr._reject = rej; xhr._xhr = xhr;
            } catch (err) { rej(err); }
        });
        // 重新构造拿 xhr.response（上面闭包不好拿，这里再来一次简单版）
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.responseType = 'arraybuffer';
        xhr.send();
        if (xhr.status !== 0 && (xhr.status < 200 || xhr.status >= 300)) {
            throw new Error('XHR sync ' + xhr.status);
        }
        return xhr.response;
    }
}

// 把 modules 的值从 URL/string 变成 Uint8Array（或已是字节就原样返回）
async function materializeModules(modIn) {
    const out = {};
    for (const [k, v] of Object.entries(modIn || {})) {
        if (v instanceof Uint8Array || v instanceof ArrayBuffer) {
            out[k] = v instanceof Uint8Array ? v : new Uint8Array(v);
            dbg(`[worker] wasm mod ${k}: bytes(pre)=${out[k].byteLength}`);
            continue;
        }
        const s = String(v ?? '');
        let bytes;
        if (isDataUrl(s)) {
            bytes = dataUrlToBytes(s);
        } else {
            const ab = await fetchArrayBuffer(s);
            bytes = new Uint8Array(ab);
        }
        out[k] = bytes;
        dbg(`[worker] wasm mod ${k}: bytes=${bytes.byteLength}`);
    }
    return out;
}

/** files: [{name, content}] -> { [name]: string }（严格字符串化） */
function normalizeFiles(list = []) {
    const dec = new TextDecoder();
    const out = {};
    for (const f of list) {
        if (!f || !f.name) continue;
        const fname = String(f.name || '');
        let str = '';
        const c = f.content;
        if (typeof c === 'string') {
            str = c;
        } else if (c instanceof Uint8Array) {
            str = dec.decode(c);
        } else if (c instanceof ArrayBuffer) {
            str = dec.decode(new Uint8Array(c));
        } else if (c && ArrayBuffer.isView?.(c)) {
            str = dec.decode(new Uint8Array(c.buffer));
        } else if (c == null) {
            str = '';
        } else {
            throw new Error(`file "${fname}" content type ${Object.prototype.toString.call(c)} not string/bytes`);
        }
        out[fname] = str;
        dbg(`[worker] file normalized: ${fname}, len=${str.length}`);
    }
    return out;
}

/** 把 resources.filesystem 的值“字符串化”，并打印类型统计 */
function normalizeResources(resNS) {
    const dec = new TextDecoder();
    const fsIn = resNS?.filesystem || {};
    const fsOut = {};
    let strCnt = 0, u8Cnt = 0, abCnt = 0, othCnt = 0;

    for (const [k, v] of Object.entries(fsIn)) {
        let s;
        if (typeof v === 'string') { s = v; strCnt++; }
        else if (v instanceof Uint8Array) { s = dec.decode(v); u8Cnt++; }
        else if (v instanceof ArrayBuffer) { s = dec.decode(new Uint8Array(v)); abCnt++; }
        else if (v && ArrayBuffer.isView?.(v)) { s = dec.decode(new Uint8Array(v.buffer)); u8Cnt++; }
        else {
            // URL / Blob / 其他对象一律 toString；URL 会变成 'file:///...' 或 'https://...'
            s = String(v ?? '');
            othCnt++;
        }
        fsOut[String(k)] = s;
        dbg(`[worker] fs-entry ${k}: type=${typeof v}, toStrLen=${(s || '').length}`);
    }

    // ☆☆☆ 把 modules 里的条目全部转成“纯字符串 URL”
    // 直接复用我们“实化”的字节（materializeModules 已在上面跑过并覆盖 resNS）
    const modOut = resNS?.modules || {};
    const modTypes = Object.fromEntries(Object.entries(modOut).map(([k, v]) =>
        [k, (v instanceof Uint8Array || v instanceof ArrayBuffer) ? 'bytes' : typeof v]
    ));
    dbg(`[worker] resources normalize: fs=${Object.keys(fsOut).length} (str=${strCnt}, u8=${u8Cnt}, ab=${abCnt}, oth=${othCnt}), modules=${Object.keys(modOut).length}`);
    dbg('[worker] modules value types: ' + JSON.stringify(modTypes));

    return { filesystem: fsOut, modules: modOut };
}

function buildScript(filesObj, top = 'top', extra = '') {
    const vs = Object.keys(filesObj)
        .filter(n => /\.(sv|svh|v|vh|vhd|vhdl)$/i.test(n))
        .map(n => JSON.stringify(n)); // 安全引用
    const script = `
read_verilog -sv ${vs.join(' ')}
hierarchy -check -top ${JSON.stringify(String(top || 'top'))}
proc; opt; fsm; opt; memory; opt; techmap; opt
${extra || ''}
write_json out.json
write_verilog out.v
tee -o yosys.log stat`.trim();
    dbg('[worker] script:\n' + script);
    return script;
}

async function runYosysWeb({ files = [], top = 'top', extraScript = '' }) {
    dbg('[worker] runYosysWeb: baseUrl=' + baseUrl);

    // 动态加载资源模块
    const resNS = await import(/* @vite-ignore */ baseUrl + '/gen/resources-yosys.js');
    const bunNS = await import(/* @vite-ignore */ baseUrl + '/gen/bundle.js');
    dbg('[worker] modules loaded: resources=' + !!resNS + ', bundle=' + !!bunNS);

    // 新：直接把 4 个 wasm 预编译成 WebAssembly.Module，并“就地覆盖”
    const modCompiled = await compileModules(resNS?.modules || {});
    if (resNS && resNS.modules) {
        for (const k of Object.keys(modCompiled)) resNS.modules[k] = modCompiled[k];
    }

    const runYosys = bunNS.runYosys || bunNS.default?.runYosys || bunNS.default;
    if (typeof runYosys !== 'function') throw new Error('runYosys function not found in bundle exports');

    // 归一化 inputs & resources
    const inFiles = normalizeFiles(files);
    const script = buildScript(inFiles, top, extraScript);
    const resources = normalizeResources(resNS);

    // 逐步尝试的组合
    const mkArgs = (...a) => a.map(x => String(x ?? ''));
    const attempts = [
        { desc: 'args(no-resources)', opts: { args: mkArgs('-q', '-p', script), files: inFiles, env: {} } },
        { desc: 'args(with-resources)', opts: { args: mkArgs('-q', '-p', script), files: inFiles, resources, env: {} } },
        // 可选：无 -q，便于看完整日志
        { desc: 'args(with-resources,verbose)', opts: { args: mkArgs('-p', script), files: inFiles, resources, env: {} } },
    ];

    let lastErr;
    for (const a of attempts) {
        try {
            if (a.opts?.args) {
                dbg('[worker] try runYosys: ' + a.desc + ' args=' + JSON.stringify(a.opts.args));
            } else {
                dbg('[worker] try runYosys: ' + a.desc);
            }
            const result = await runYosys(a.opts);

            // 收集输出（统一转字符串）
            const enc = new TextDecoder();
            const filesOut = result?.files || result?.writtenFiles || result?.fetchedFiles || {};
            const toStr = (v) => (typeof v === 'string'
                ? v
                : v instanceof Uint8Array ? enc.decode(v)
                    : v instanceof ArrayBuffer ? enc.decode(new Uint8Array(v))
                        : v ? String(v) : '');

            const outV = toStr(filesOut['out.v']);
            const outJson = toStr(filesOut['out.json']);
            const logTxt = toStr(filesOut['yosys.log']);

            const stdout = toStr(result?.stdout || result?.output || '');
            const stderr = toStr(result?.stderr || '');
            if (stdout) stdout.split(/\r?\n/).forEach(l => l && post('stdout', l + '\n'));
            if (stderr) stderr.split(/\r?\n/).forEach(l => l && post('stderr', l + '\n'));

            dbg(`[worker] success by "${a.desc}". out.v=${outV?.length || 0}, out.json=${outJson?.length || 0}, log=${(logTxt || stdout || '').length}`);
            return { outV, outJson, log: logTxt || stdout || '' };
        } catch (e) {
            lastErr = e;
            dbg(`[worker] ${a.desc} failed: ${e?.message || e}\n${e?.stack || ''}`);
        }
    }

    // 三次都失败，抛最后一次的错误
    throw lastErr || new Error('runYosys failed');
}

// === 消息分发 ===
self.onmessage = async (ev) => {
    const { cmd, payload, baseUrl: bu } = ev.data || {};
    try {
        if (cmd === 'init') {
            baseUrl = (payload?.baseUrl || bu || '').replace(/\/+$/, '');
            dbg('[worker] init baseUrl=' + baseUrl);

            if (SAFE_MODE) {
                // 不做任何预加载，先宣布就绪，验证主线程链路
                post('ready', { baseUrl, safe: true });
            } else {
                const r1 = import(/* @vite-ignore */ baseUrl + '/gen/resources-yosys.js');
                const r2 = import(/* @vite-ignore */ baseUrl + '/gen/bundle.js');
                const rs = await Promise.allSettled([r1, r2]);
                rs.forEach((r, i) => dbg(`[worker] preload ${(i === 0) ? 'resources' : 'bundle'}: ${r.status}`));
                // 如果有任一失败，把错误抛出去（主线程 now 会立刻显示）
                const bad = rs.find(r => r.status === 'rejected');
                if (bad) throw bad.reason || new Error('preload failed');
                post('ready', { baseUrl, safe: false });
            }
        } else if (cmd === 'run') {
            dbg('[worker] run payload keys=' + Object.keys(payload || {}).join(','));
            const res = await runYosysWeb(payload || {});
            post('done', res);
        } else if (cmd === 'ping') {
            post('pong', { baseUrl, ts: Date.now() });
        } else {
            post('error', 'unknown cmd: ' + cmd);
        }
    } catch (e) {
        post('error', String(e?.message || e));
    }
}