// core/dft-store.js
(function (global) {
    const { dumpYAML, withHeader } = global.DFT_YAML || {};
    function assert(c, m) { if (!c) throw new Error(m); }

    class Emitter {
        constructor() { this.map = new Map(); }
        on(key, fn) { const arr = this.map.get(key) || []; arr.push(fn); this.map.set(key, arr); return () => this.off(key, fn); }
        off(key, fn) { const arr = this.map.get(key) || []; const i = arr.indexOf(fn); if (i >= 0) arr.splice(i, 1); this.map.set(key, arr); }
        emit(key, payload) { (this.map.get(key) || []).forEach(fn => { try { fn(payload); } catch (e) { console.error(e); } }); }
    }

    class DFTStore {
        constructor() {
            this.baseName = null;
            this.dirHandle = null;
            this.nsCache = new Map();
            this.nsHandles = new Map();
            this.pending = new Map();
            this.emitter = new Emitter();
            this.version = 1;
        }

        initProject({ dirHandle, baseName }) {
            assert(baseName, 'baseName required');
            this.baseName = baseName;
            this.dirHandle = dirHandle || null;
        }

        _nameYaml(ns) { return `${this.baseName}.${ns}db.yaml`; }
        _nameJson(ns) { return `${this.baseName}.${ns}db.json`; }

        async _ensureHandles(ns) {
            if (this.nsHandles.has(ns)) return this.nsHandles.get(ns);
            if (!this.dirHandle || typeof this.dirHandle.getFileHandle !== 'function') {
                const h = { yamlHandle: null, jsonHandle: null, nameYaml: this._nameYaml(ns), nameJson: this._nameJson(ns) };
                this.nsHandles.set(ns, h); return h;
            }
            const yamlHandle = await this.dirHandle.getFileHandle(this._nameYaml(ns), { create: true });
            const jsonHandle = await this.dirHandle.getFileHandle(this._nameJson(ns), { create: true });
            const h = { yamlHandle, jsonHandle, nameYaml: this._nameYaml(ns), nameJson: this._nameJson(ns) };
            this.nsHandles.set(ns, h);
            return h;
        }

        _blankDb(ns) {
            return {
                _meta: { project: this.baseName || '', namespace: ns, version: this.version, updated_at: new Date().toISOString() },
                docs: {} // id -> { _meta, data }
            };
        }

        async load(ns) {
            const h = await this._ensureHandles(ns);
            let db = null;
            try {
                if (h.jsonHandle) {
                    const f = await h.jsonHandle.getFile();
                    const t = await f.text();
                    if (t && t.trim()) db = JSON.parse(t);
                }
            } catch (e) { console.warn(`[DFT.Store] load ${ns} failed:`, e); }
            if (!db) db = this._blankDb(ns);
            this.nsCache.set(ns, db);
            return db;
        }

        getDb(ns) {
            if (!this.nsCache.has(ns)) this.nsCache.set(ns, this._blankDb(ns));
            return this.nsCache.get(ns);
        }

        getDoc(ns, id) {
            const db = this.getDb(ns);
            return db.docs[id] ? JSON.parse(JSON.stringify(db.docs[id])) : null;
        }

        setDoc(ns, id, docOrPatch, opts) {
            const db = this.getDb(ns);
            const now = new Date().toISOString();
            const cur = db.docs[id] || { _meta: { created_at: now, version: this.version }, data: {} };
            const next = typeof docOrPatch === 'function'
                ? docOrPatch(cur)
                : (opts && opts.replace ? docOrPatch : { ...cur, ...docOrPatch, data: { ...(cur.data || {}), ...(docOrPatch.data || {}) } });
            next._meta = { ...(cur._meta || {}), updated_at: now, version: this.version };
            db.docs[id] = next; db._meta.updated_at = now;
            this._scheduleSave(ns);
            this.emitter.emit(`${ns}:${id}`, JSON.parse(JSON.stringify(next)));
            return next;
        }

        removeDoc(ns, id) {
            const db = this.getDb(ns);
            if (db.docs[id]) { delete db.docs[id]; this._scheduleSave(ns); this.emitter.emit(`${ns}:${id}`, null); }
        }

        subscribe(ns, id, cb) { return this.emitter.on(`${ns}:${id}`, cb); }

        async _writeFile(handle, text) {
            if (!handle) return;
            const w = await handle.createWritable();
            await w.write(text); await w.close();
        }

        async _saveNowInternal(ns) {
            const h = await this._ensureHandles(ns);
            const db = this.getDb(ns);
            const json = JSON.stringify(db, null, 2);
            const header = `#yaml: dft_${ns}db`;
            const yaml = withHeader(dumpYAML(db), header);
            try { await this._writeFile(h.jsonHandle, json); } catch (e) { console.error(`[DFT.Store] write ${h.nameJson} failed:`, e); }
            try { await this._writeFile(h.yamlHandle, yaml); } catch (e) { console.error(`[DFT.Store] write ${h.nameYaml} failed:`, e); }
        }

        _scheduleSave(ns) {
            const old = this.pending.get(ns); if (old) clearTimeout(old);
            const t = setTimeout(() => { this.pending.delete(ns); this._saveNowInternal(ns); }, 300);
            this.pending.set(ns, t);
        }

        async saveNow(ns) {
            const t = this.pending.get(ns); if (t) { clearTimeout(t); this.pending.delete(ns); }
            await this._saveNowInternal(ns);
        }
    }

    const store = new DFTStore();
    global.DFT = global.DFT || {};
    global.DFT.Store = store;
})(window);
