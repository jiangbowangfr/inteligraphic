// convertXmlToyaml.js — drop-in for draw.io Plugin Action
// Usage inside action:
//   const xml = c.getFileData(true);
//   const yaml = convertXmlToyaml(xml, true);
//   c.saveData("diagramyaml.yaml", "yaml", b64(yaml), "text/plain", true);

function convertXmlToyaml(xmlString, /*unused*/pretty) {
    try {
        const doc = mxUtils.parseXml(xmlString);
        const root = doc.documentElement;

        // -----------------------------
        // Utils
        // -----------------------------
        const htmlEntities = new DOMParser();

        function stripHtml(s) {
            if (!s) return "";

            // 反转义 HTML 实体（支持双重转义）
            function decodeOnce(str) {
                const ta = document.createElement("textarea");
                ta.innerHTML = str;
                return ta.value;
            }
            let txt = s;
            for (let i = 0; i < 2; i++) {
                const dec = decodeOnce(txt);
                if (dec === txt) break;
                txt = dec;
            }

            // 标签到换行 / 删除（注意：这里不再使用 (?i)）
            txt = txt
                // 块级换行
                .replace(/<br\s*\/?>/gi, "\n")
                .replace(/<hr[^>]*>/gi, "\n")
                .replace(/<\/\s*(p|div|li|h[1-6]|table|tr|td|th)\s*>/gi, "\n")
                // 块起始标签去掉
                .replace(/<\s*(p|div|li|h[1-6]|table|tr|td|th)[^>]*>/gi, "")
                // 内联标签直接删
                .replace(/<\/?\s*(span|b|u|i|strong|em|small|sup|sub|font)[^>]*>/gi, "")
                // 兜底：其他标签全部去掉
                .replace(/<[^>]+>/g, "")
                // 空白 & 换行规范化
                .replace(/\u00a0|&nbsp;/gi, " ")
                .replace(/\r\n|\r/g, "\n")
                .replace(/\n{2,}/g, "\n")
                .trim();

            return txt;
        }

        function toIntIfPossible(v) {
            const vv = String(v || "").trim();
            let m = vv.match(/^(\d+)\s*:\s*(\d+)$/);
            if (m) {
                const msb = parseInt(m[1], 10), lsb = parseInt(m[2], 10);
                return Math.abs(msb - lsb) + 1;
            }
            if (/^[+-]?\d+$/.test(vv)) {
                const n = parseInt(vv, 10);
                if (!isNaN(n)) return n;
            }
            return vv;
        }

        function sanitizeValueQuotes(v) {
            v = String(v ?? "").trim();
            v = v.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
            if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0]) {
                v = v.slice(1, -1).trim();
            }
            if ((v.startsWith("'") || v.startsWith('"')) && (v.split(v[0]).length - 1) % 2 === 1) {
                v = v.slice(1).trim();
            }
            if (v.endsWith("'") || v.endsWith('"')) {
                const q = v[v.length - 1];
                if ((v.split(q).length - 1) % 2 === 1) v = v.slice(0, -1).trim();
            }
            if (v === '"' || v === "'") v = "";
            return v;
        }

        function parseKvLines(lines) {
            const out = {};
            (lines || []).forEach((raw) => {
                const line = String(raw || "").trim();
                if (!line) return;
                const m = line.match(/^([A-Za-z0-9_]+)\s*(?:=|:)\s*(.*?)\s*$/);
                if (!m) return;
                const k = m[1];
                let v = m[2].replace(/;\s*$/, "");
                v = sanitizeValueQuotes(v);
                out[k] = toIntIfPossible(v);
            });
            return out;
        }

        function splitPanel(text) {
            const t = stripHtml(text || "");
            const parts = t.split(/\n/).map((x) => x.trim()).filter(Boolean);
            if (!parts.length) return { title: "", kv: [] };
            return { title: parts[0], kv: parts.slice(1) };
        }

        // -----------------------------
        // Graph build
        // -----------------------------
        function parseGraph(rootEl) {
            const objectsById = {};
            const cellsById = {};
            const childrenByParent = {};

            function pushChild(map, key, val) {
                (map[key] || (map[key] = [])).push(val);
            }

            function collectObjectsByTag(tagName) {
                const list = rootEl.getElementsByTagName(tagName);
                for (let i = 0; i < list.length; i++) {
                    const obj = list[i];
                    const id = obj.getAttribute("id");
                    if (!id) continue;
                    const at = {};
                    for (let j = 0; j < obj.attributes.length; j++) {
                        const a = obj.attributes[j];
                        at[a.name] = a.value;
                    }
                    const child = obj.getElementsByTagName("mxCell")[0];
                    if (child) {
                        for (let k = 0; k < child.attributes.length; k++) {
                            const ca = child.attributes[k];
                            at["__cell_" + ca.name] = ca.value;
                        }
                    }
                    objectsById[id] = at;
                }
            }
            collectObjectsByTag("object");
            collectObjectsByTag("UserObject");

            const cellList = rootEl.getElementsByTagName("mxCell");
            for (let i = 0; i < cellList.length; i++) {
                const cell = cellList[i];
                const id = cell.getAttribute("id");
                const at = {};
                for (let j = 0; j < cell.attributes.length; j++) {
                    const a = cell.attributes[j];
                    at[a.name] = a.value;
                }
                cellsById[id] = at;
                const par = at.parent;
                if (par) pushChild(childrenByParent, par, at);
            }

            // collect edges with edgeLabel text (child vertex=1)
            const edges = [];
            Object.keys(cellsById).forEach((cid) => {
                const c = cellsById[cid];
                if (c.edge === "1") {
                    let lbl = null;
                    const kids = childrenByParent[cid] || [];
                    for (let k = 0; k < kids.length; k++) {
                        const ch = kids[k];
                        if (ch.vertex === "1") {
                            const v = stripHtml(ch.value || "");
                            if (v) { lbl = v; break; }
                        }
                    }
                    edges.push({ id: cid, source: c.source, target: c.target, label: lbl });
                }
            });

            function getNodeAttr(nodeId) {
                return objectsById[nodeId] || cellsById[nodeId] || {};
            }

            function getType(nodeId) {
                const at = getNodeAttr(nodeId);
                const direct = String(at.type || "").trim();
                if (direct) return direct;
                const style = String(at.style || at.__cell_style || "");
                if (style) {
                    const m = style.match(/(?:^|;)dftsIP_type=([^;]+)/);
                    if (m && m[1]) return String(m[1]).trim();
                }
                return "";
            }

            function getLabel(nodeId) {
                const obj = objectsById[nodeId];
                if (obj) return stripHtml(obj.label || "");
                const cell = cellsById[nodeId];
                if (cell) return stripHtml(cell.value || "");
                return nodeId;
            }

            function getPrettyLabel(nodeId) {
                const kids = childrenByParent[nodeId] || [];
                for (let i = 0; i < kids.length; i++) {
                    const ch = kids[i];
                    const st = ch.style || "";
                    if (st.indexOf("shape=mxgraph.er.anchor") >= 0) {
                        const val = ch.value;
                        if (val) {
                            const t = stripHtml(val);
                            if (t) return t;
                        }
                    }
                }
                for (let i = 0; i < kids.length; i++) {
                    const ch = kids[i];
                    const val = stripHtml(ch.value || "");
                    if (!val) continue;
                    const low = val.toLowerCase();
                    if (low.startsWith("controller") || low.startsWith("connection") || low.startsWith("compactor") || low.startsWith("shiftpoweroptions") || low.startsWith("EdtChannelsIn") || low.startsWith("EdtChannelsOut") || low.startsWith("chaingroup")) {
                        continue;
                    }
                    if (val.length < 200) return val;
                }
                const v = getLabel(nodeId);
                return v || nodeId;
            }

            // adjacency
            const neigh = {};
            edges.forEach((e) => {
                const s = e.source, t = e.target;
                if (!s || !t) return;
                (neigh[s] || (neigh[s] = [])).push(t);
                (neigh[t] || (neigh[t] = [])).push(s);
            });

            return { objectsById, cellsById, childrenByParent, edges, neigh, getType, getLabel, getPrettyLabel, getNodeAttr };
        }

        // -----------------------------
        // TAP
        // -----------------------------
        const SIGS_PRIMARY = ["TDI", "TMS", "TCK", "TRST", "TDO"]; const SIGS_WITH_EN = SIGS_PRIMARY.concat(["TDO_EN"]);

        function parseTaps(ctx) {
            const { objectsById, cellsById, childrenByParent, edges, getPrettyLabel } = ctx;

            function isTriangle(nodeId) {
                const c = cellsById[nodeId];
                if (c && (c.style || "").indexOf("triangle") >= 0) return true;
                const kids = ctx.childrenByParent[nodeId] || [];
                for (let i = 0; i < kids.length; i++) {
                    if ((kids[i].style || "").indexOf("triangle") >= 0) return true;
                }
                return false;
            }

            function neighborEdges(nodeId) {
                return ctx.edges.filter(e => e.source === nodeId || e.target === nodeId);
            }

            // find TAP objects
            const taps = [];
            Object.keys(objectsById).forEach((oid) => {
                const at = objectsById[oid];
                if ((at.type || "").toUpperCase() === "TAP") {
                    taps.push({ id: oid, name: at.label || "TAP1", polarity: at.tdo_en_polarity || "active_high" });
                }
            });
            if (!taps.length) {
                Object.keys(objectsById).forEach((oid) => {
                    const at = objectsById[oid];
                    const lbl = (at.label || "").trim();
                    if (lbl.toUpperCase().startsWith("TAP")) {
                        taps.push({ id: oid, name: lbl, polarity: at.tdo_en_polarity || "active_high" });
                    }
                });
            }

            // pre-index signal source nodes by attribute value == SIG
            const signalSources = {}; SIGS_PRIMARY.forEach((s) => signalSources[s] = []);
            Object.keys(objectsById).forEach((oid) => {
                const at = objectsById[oid];
                if (!at.label) return;
                for (const k in at) {
                    if (SIGS_PRIMARY.indexOf(at[k]) >= 0) { signalSources[at[k]].push(oid); break; }
                }
            });

            const outPerTap = {};

            taps.forEach((tap) => {
                const tapId = tap.id, tapName = tap.name || "TAP", polarity = tap.polarity || "active_high";
                const ifaceIds = {}; SIGS_WITH_EN.forEach(s => ifaceIds[s] = null);
                const ifaceNames = {};

                neighborEdges(tapId).forEach((e) => {
                    const lbl = (e.label || "").trim();
                    if (!lbl) return;
                    const key = lbl.toUpperCase();
                    if (SIGS_WITH_EN.map(x => x.toUpperCase()).indexOf(key) >= 0) {
                        const other = e.source === tapId ? e.target : e.source;
                        if (other) { ifaceIds[key] = other; ifaceNames[key] = getPrettyLabel(other); }
                    }
                });

                ["TCK", "TMS", "TDI", "TRST", "TDO", "TDO_EN"].forEach((sig) => {
                    if (!ifaceIds[sig]) {
                        neighborEdges(tapId).some((e) => {
                            const other = e.source === tapId ? e.target : e.source;
                            if (!other) return false;
                            if (isTriangle(other)) {
                                const name = getPrettyLabel(other).toLowerCase();
                                if ((sig === "TDO_EN" && name.indexOf("tdo_en") >= 0) || (sig !== "TDO_EN" && name.indexOf(sig.toLowerCase()) >= 0)) {
                                    ifaceIds[sig] = other; ifaceNames[sig] = getPrettyLabel(other); return true;
                                }
                            }
                            return false;
                        });
                    }
                });

                const portsNames = {}; SIGS_PRIMARY.forEach(s => portsNames[s] = "");
                SIGS_PRIMARY.forEach((sig) => {
                    const tri = ifaceIds[sig];
                    let chosen = null;
                    if (tri) {
                        neighborEdges(tri).some((e) => {
                            const other = e.source === tri ? e.target : e.source;
                            if (!other) return false;
                            const at = ctx.objectsById[other];
                            if (at) {
                                for (const k in at) { if (at[k] === sig) { chosen = other; break; } }
                            }
                            return !!chosen;
                        });
                    }
                    if (!chosen && signalSources[sig] && signalSources[sig].length) chosen = signalSources[sig][0];
                    if (chosen) portsNames[sig] = getPrettyLabel(chosen);
                });

                outPerTap[tapName] = {
                    TAP_PORTS_ATTRIBUTE: {
                        MBIST_CHIP_IJTAG_TDI: portsNames.TDI,
                        MBIST_CHIP_IJTAG_TMS: portsNames.TMS,
                        MBIST_CHIP_IJTAG_TCK: portsNames.TCK,
                        MBIST_CHIP_IJTAG_TRST: portsNames.TRST,
                        MBIST_CHIP_IJTAG_TDO: portsNames.TDO,
                    },
                    TAP_PORTS: {
                        MBIST_CHIP_IJTAG_TDI: portsNames.TDI,
                        MBIST_CHIP_IJTAG_TMS: portsNames.TMS,
                        MBIST_CHIP_IJTAG_TCK: portsNames.TCK,
                        MBIST_CHIP_IJTAG_TRST: portsNames.TRST,
                        MBIST_CHIP_IJTAG_TDO: portsNames.TDO,
                    },
                    TAP_INTERFACE: {
                        MBIST_CHIP_IJTAG_TCK: ifaceNames.TCK || "",
                        MBIST_CHIP_IJTAG_TMS: ifaceNames.TMS || "",
                        MBIST_CHIP_IJTAG_TDI: ifaceNames.TDI || "",
                        MBIST_CHIP_IJTAG_TRST: ifaceNames.TRST || "",
                        MBIST_CHIP_IJTAG_TDO: ifaceNames.TDO || "",
                        MBIST_CHIP_IJTAG_TDO_EN: ifaceNames.TDO_EN || "",
                        MBIST_CHIP_IJTAG_TDO_EN_POLARITY: polarity,
                    }
                };
            });

            return outPerTap;
        }

        // -----------------------------
        // EDT / ScanHost: dynamic panels
        // -----------------------------
        function collectPanels(childrenByParent, oid) {
            const panels = {}; const id2title = {};
            const kids = childrenByParent[oid] || [];
            kids.forEach((ch) => {
                if (ch.vertex === "1" && ("value" in ch)) {
                    const sp = splitPanel(ch.value);
                    const title = (sp.title || "").trim();
                    if (!title) return;
                    const payload = parseKvLines(sp.kv);
                    if (!Object.keys(payload).length) return;
                    const pid = ch.id;
                    if (pid) id2title[pid] = title;
                    panels[title] = panels[title] || {};
                    Object.keys(payload).forEach((k) => { if (!(k in panels[title])) panels[title][k] = payload[k]; });
                }
            });
            return { panels, id2title };
        }

        function buildHierarchyByEdges(panels, id2title, edges) {
            const title2payload = {}; Object.keys(panels).forEach((t) => { title2payload[t] = Object.assign({}, panels[t]); });
            const localIds = new Set(Object.keys(id2title));
            const parent2children = {}; const childHasParent = {};

            edges.forEach((e) => {
                const s = e.source, t = e.target; if (!s || !t) return;
                if (!localIds.has(s) || !localIds.has(t)) return;
                const p = id2title[s], c = id2title[t];
                if (childHasParent[c]) return;
                (parent2children[p] || (parent2children[p] = [])).push(c);
                childHasParent[c] = p;
            });

            function buildNode(title, seen) {
                if (seen.has(title)) return Object.assign({}, title2payload[title] || {});
                seen.add(title);
                const node = Object.assign({}, title2payload[title] || {});
                const chs = parent2children[title] || [];
                chs.forEach((ct) => { node[ct] = buildNode(ct, seen); });
                return node;
            }

            const roots = Object.keys(title2payload).filter((t) => !childHasParent[t]);
            const nested = {};
            roots.forEach((r) => { nested[r] = buildNode(r, new Set()); });
            return nested;
        }

        function normListFromValue(v) {
            const s = sanitizeValueQuotes(String(v));
            return s.split(/[\,\s]+/).map((p) => p.trim()).filter(Boolean);
        }

        function postprocessTitlesChainGroups(node) {
            if (Object.prototype.toString.call(node) !== "[object Object]") return node;
            const out = {};
            Object.keys(node).forEach((k) => {
                const v = postprocessTitlesChainGroups(node[k]);
                const m = k.match(/^\s*chaingroup\s*\(([^)]*)\)\s*$/i);
                if (!m) { out[k] = v; return; }
                const groups = m[1].split(',').map((g) => g.trim()).filter(Boolean);
                if (Object.prototype.toString.call(v) !== "[object Object]") { out[`chain_groups(${groups.join(',')})`] = v; return; }
                const idx2inst = {};
                Object.keys(v).forEach((kk) => { const m2 = kk.match(/^instance(\d+)$/i); if (m2) idx2inst[parseInt(m2[1], 10)] = String(v[kk]); });
                groups.forEach((g, idx0) => {
                    const idx = idx0 + 1; const sub = {};
                    Object.keys(v).forEach((kk) => {
                        if (/^instance$/i.test(kk)) { if (!Object.keys(idx2inst).length) sub.instance = v[kk]; return; }
                        if (/^instance\d+$/i.test(kk)) return; // skip numbered
                        sub[kk] = v[kk];
                    });
                    if (idx2inst[idx] != null) sub.instance = idx2inst[idx];
                    out[`chain_groups(${g})`] = sub;
                });
            });
            return out;
        }
        function parseAllBISR(ctx) {
            const { objectsById, childrenByParent, edges, getPrettyLabel } = ctx;

            function findSignal(objId, token) {
                const tok = String(token || "").toLowerCase();
                for (let i = 0; i < edges.length; i++) {
                    const e = edges[i];
                    if (e.source === objId || e.target === objId) {
                        const lbl = (e.label || "").trim();
                        if (lbl && lbl.toLowerCase() === tok) {
                            const other = e.source === objId ? e.target : e.source;
                            if (other) return getPrettyLabel(other);
                        }
                    }
                }
                return null;
            }

            const out = {};

            // Find all BISR_CONTROLLER objects
            const bisrControllers = Object.keys(objectsById).filter(oid =>
                (objectsById[oid].type || "").toUpperCase() === "BISR_CONTROLLER"
            );

            bisrControllers.forEach((oid) => {
                const at = objectsById[oid];
                const name = ctx.getPrettyLabel(oid) || (at.label || "BISR_CONTROLLER").trim();

                // Build hierarchy and panels
                const { panels, id2title } = collectPanels(childrenByParent, oid);
                const nested = buildHierarchyByEdges(panels, id2title, edges);

                // Extract main signal connections
                const bisr = {};
                const signals = [
                    { key: "repair_clock_connection", token: "repair_clock_connection" },
                    { key: "repair_trigger_connection", token: "repair_trigger_connection" },
                    { key: "bisr_done_connection", token: "bisr_done_connection" },
                    { key: "bisr_pass_connection", token: "bisr_pass_connection" }
                ];

                signals.forEach(({ key, token }) => {
                    const signal = findSignal(oid, token);
                    if (signal) bisr[key] = signal;
                });

                // Merge nested panels
                Object.assign(bisr, nested);

                // Process PowerDomainOptions
                const pdoKey = Object.keys(bisr).find(t =>
                    t.trim().toUpperCase() === "POWERDOMAINOPTIONS"
                );

                if (pdoKey) {
                    const pdo = bisr[pdoKey] = bisr[pdoKey] || {};

                    // Normalize power domain priority order
                    if (pdo.power_domain_priority_order != null) {
                        let names = normListFromValue(String(pdo.power_domain_priority_order));
                        names = names.map(n => n.startsWith("pdg_") ? n : "pdg_" + n);
                        pdo.power_domain_priority_order = names.join(", ");
                    }

                    // Extract power domains from priority order to create empty objects for them
                    if (pdo.power_domain_priority_order) {
                        const domainNames = pdo.power_domain_priority_order.split(',').map(name => name.trim());
                        domainNames.forEach(domainName => {
                            if (domainName && !pdo[domainName]) {
                                pdo[domainName] = {};
                            }
                        });
                    }

                    // Process power domain connections from edges
                    edges.forEach((e) => {
                        if (e.target === oid || e.source === oid) {
                            const lbl = (e.label || "").trim();
                            if (!lbl) return;

                            const other = e.source === oid ? e.target : e.source;
                            if (!other) return;

                            const signalSource = ctx.getPrettyLabel(other);

                            // Parse connection labels in format: {connection_type}_pdg_{domain_name}
                            const connectionPatterns = [
                                { regex: /^enable_from_pmu_connection_pdg_(.+)$/i, type: 'enable_from_pmu_connection' },
                                { regex: /^busy_to_pmu_connection_pdg_(.+)$/i, type: 'busy_to_pmu_connection' },
                                { regex: /^done_to_pmu_connection_pdg_(.+)$/i, type: 'done_to_pmu_connection' }
                            ];

                            for (const pattern of connectionPatterns) {
                                const match = lbl.match(pattern.regex);
                                if (match) {
                                    const domain = 'pdg_' + match[1]; // Ensure pdg_ prefix

                                    // Create domain object if it doesn't exist
                                    if (!pdo[domain]) {
                                        pdo[domain] = {};
                                    }

                                    pdo[domain][pattern.type] = signalSource;
                                    break;
                                }
                            }
                        }
                    });
                }

                out[name] = bisr;
            });

            return out;
        }
        function parseAllLBIST(ctx) {
            const { objectsById, childrenByParent, edges, getPrettyLabel } = ctx;

            function findSignal(objId, token) {
                const tok = String(token || "").toLowerCase();
                for (let i = 0; i < edges.length; i++) {
                    const e = edges[i];
                    if (e.source === objId || e.target === objId) {
                        const lbl = (e.label || "").trim();
                        if (lbl && lbl.toLowerCase() === tok) {
                            const other = e.source === objId ? e.target : e.source;
                            if (other) return getPrettyLabel(other);
                        }
                    }
                }
                return null;
            }

            function buildNcpStructureFromCycles(objId) {
                const ncpStructure = {};
                const allCycles = {}; // 用于收集所有cycle，用于Ncp(ALL)
                const ncpMap = {}; // 用于映射cycle编号到Ncp名称

                // 查找所有从LBIST控制器出发的cycle边
                const cycleEdges = edges.filter(e =>
                    e.source === objId && e.label && e.label.startsWith('cycle(')
                );

                // 处理每个cycle边
                for (const cycleEdge of cycleEdges) {
                    const cycleLabel = cycleEdge.label.trim();
                    const cycleTargetId = cycleEdge.target;

                    if (cycleTargetId) {
                        const signalValue = getPrettyLabel(cycleTargetId);

                        // 提取cycle编号
                        const cycleMatch = cycleLabel.match(/cycle\((\d+)\)/);
                        if (cycleMatch) {
                            const cycleNum = cycleMatch[1];

                            // 根据信号值提取OCC实例名（去掉路径和端口信息）
                            const occInstanceName = extractOccInstanceName(signalValue);

                            if (occInstanceName) {
                                // 创建Ncp名称
                                const ncpName = `Ncp(${occInstanceName})`;
                                ncpMap[cycleNum] = ncpName;

                                // 初始化Ncp结构，每个Ncp内部都是cycle(0)
                                ncpStructure[ncpName] = ncpStructure[ncpName] || {};
                                ncpStructure[ncpName]['cycle(0)'] = signalValue;

                                // 收集所有cycle用于Ncp(ALL)，保持原来的cycle编号
                                allCycles[cycleLabel] = signalValue;
                            }
                        }
                    }
                }

                // 添加Ncp(ALL)包含所有cycle（保持原来的cycle编号）
                if (Object.keys(allCycles).length > 0) {
                    ncpStructure['Ncp(ALL)'] = allCycles;
                }

                return ncpStructure;
            }

            function extractOccInstanceName(signalValue) {
                // 从信号路径中提取OCC实例名
                // 例如: "u_dfx_occ_clk_test_crg_inst/Y" → "u_dfx_occ_clk_test_crg"
                // 例如: "top_mbist_tessent_sib_sti_inst" → "top_mbist_tessent_sib_sti"

                // 去掉端口信息（/Y, /A等）
                let instanceName = signalValue.split('/')[0];

                // 去掉常见的后缀
                const suffixes = ['_inst', '_buf', '_persistent'];
                for (const suffix of suffixes) {
                    if (instanceName.endsWith(suffix)) {
                        instanceName = instanceName.slice(0, -suffix.length);
                    }
                }

                return instanceName;
            }

            function findDirectSignals(objId) {
                const signals = {};

                // 查找常用信号
                const commonSignals = [
                    'extest_lbist', 'shift_clock_src', 'burn_in', 'self_test',
                    'pre_post_shift_dead_cycles'
                ];

                for (const signal of commonSignals) {
                    const value = findSignal(objId, signal);
                    if (value) {
                        signals[signal] = value;
                    }
                }

                return signals;
            }

            const out = {};
            Object.keys(objectsById).forEach((oid) => {
                const at = objectsById[oid];
                if ((at.type || "").toUpperCase() !== "LBIST_CONTROLLER") return;
                const name = getPrettyLabel(oid) || (at.label || "LBIST_CONTROLLER").trim();

                const { panels, id2title } = collectPanels(childrenByParent, oid);
                const nested = buildHierarchyByEdges(panels, id2title, edges);

                const lbistcontroller = {};

                // 合并面板属性
                Object.keys(nested).forEach((k) => {
                    lbistcontroller[k] = nested[k];
                });

                // 查找直接信号
                const directSignals = findDirectSignals(oid);
                if (Object.keys(directSignals).length > 0) {
                    lbistcontroller.NcpIndexDecoder = lbistcontroller.NcpIndexDecoder || {};
                    Object.assign(lbistcontroller.NcpIndexDecoder, directSignals);
                }

                // 从cycle信号构建Ncp结构
                const ncpStructure = buildNcpStructureFromCycles(oid);
                if (Object.keys(ncpStructure).length > 0) {
                    lbistcontroller.NcpIndexDecoder = lbistcontroller.NcpIndexDecoder || {};
                    Object.assign(lbistcontroller.NcpIndexDecoder, ncpStructure);
                }

                // 如果没有找到任何配置，至少确保NcpIndexDecoder对象存在
                if (!lbistcontroller.NcpIndexDecoder) {
                    lbistcontroller.NcpIndexDecoder = {};
                }

                out[name] = lbistcontroller;
            });

            return out;
        }
        function parseAllCHAIN(ctx) {
            const { objectsById, childrenByParent, edges, getPrettyLabel } = ctx;

            function findSignal(objId, token) {
                const tok = String(token || "").toLowerCase();
                for (let i = 0; i < edges.length; i++) {
                    const e = edges[i];
                    if (e.source === objId || e.target === objId) {
                        const lbl = (e.label || "").trim();
                        if (lbl && lbl.toLowerCase() === tok) {
                            const other = e.source === objId ? e.target : e.source;
                            if (other) return getPrettyLabel(other);
                        }
                    }
                }
                return null;
            }

            const out = {};

            Object.keys(objectsById).forEach((oid) => {
                const at = objectsById[oid];
                if ((at.type || "").toUpperCase() !== "CHAIN_FAMILY") return;
                const name = ctx.getPrettyLabel(oid) || (at.label || "CHAIN").trim();

                const { panels, id2title } = collectPanels(childrenByParent, oid);
                const nested = buildHierarchyByEdges(panels, id2title, edges);

                const chainlist = {};

                Object.keys(nested).forEach((k) => { chainlist[k] = nested[k]; });


                out[name] = chainlist;
            });
            return out;
        }
        function parseAllCPUAPBIST(ctx) {
            const { objectsById, childrenByParent, edges, getPrettyLabel } = ctx;

            function findSignal(objId, token) {
                const tok = String(token || "").toLowerCase();
                for (let i = 0; i < edges.length; i++) {
                    const e = edges[i];
                    if (e.source === objId || e.target === objId) {
                        const lbl = (e.label || "").trim();
                        if (lbl && lbl.toLowerCase() === tok) {
                            const other = e.source === objId ? e.target : e.source;
                            if (other) return getPrettyLabel(other);
                        }
                    }
                }
                return null;
            }

            const out = {};
            Object.keys(objectsById).forEach((oid) => {
                const at = objectsById[oid];
                if ((at.type || "").toUpperCase() !== "DMA_IST_CONTROLLER") return;
                const name = ctx.getPrettyLabel(oid) || (at.label || "DMA_IST_CONTROLLER").trim();

                const { panels, id2title } = collectPanels(childrenByParent, oid);
                const nested = buildHierarchyByEdges(panels, id2title, edges);

                const dmaist = {};
                const clk = findSignal(oid, "clock");
                const tpindex = findSignal(oid, "test_program_index");
                const tpsindex = findSignal(oid, "test_program_start_index");
                const tpeindex = findSignal(oid, "test_program_end_index");
                const itpidex = findSignal(oid, "invalid_test_program_index");
                const tpdone = findSignal(oid, "test_program_done");
                const fflag = findSignal(oid, "fail_flag");
                const maddr = findSignal(oid, "mem_address");
                const mdat = findSignal(oid, "mem_data");
                const en = findSignal(oid, "enable");
                const maact = findSignal(oid, "memory_access_active");

                if (clk) dmaist.CLOCK = clk;
                if (tpindex) dmaist.test_program_index = tpindex;
                if (tpsindex) dmaist.test_program_start_index = tpsindex;
                if (tpeindex) dmaist.test_program_end_index = tpeindex;
                if (itpidex) dmaist.invalid_test_program_index = itpidex;
                if (tpdone) dmaist.test_program_done = tpdone;
                if (fflag) dmaist.fail_flag = fflag;
                if (maddr) dmaist.mem_address = maddr;
                if (mdat) dmaist.mem_data = mdat;
                if (en) dmaist.enable = en;
                if (maact) dmaist.memory_access_active = maact;

                Object.keys(nested).forEach((k) => { dmaist[k] = nested[k]; });


                out[name] = dmaist;
            });

            return out;
        }

        function parseAllOCC(ctx) {
            const { objectsById, childrenByParent, edges, getPrettyLabel, getType } = ctx;

            function findSignal(objId, token) {
                const tok = String(token || "").toLowerCase();
                for (let i = 0; i < edges.length; i++) {
                    const e = edges[i];
                    if (e.source === objId || e.target === objId) {
                        const lbl = (e.label || "").trim();
                        if (lbl && lbl.toLowerCase() === tok) {
                            const other = e.source === objId ? e.target : e.source;
                            if (other) return getPrettyLabel(other);
                        }
                    }
                }
                return null;
            }

            const out = {};

            // 定义需要检查 static_clock_control 的 OCC 类型
            const occTypesToCheck = ["standard_occ", "parent_occ", "child_occ", "sync_occ"];

            // 收集所有 static_clock_control 值及其对应的对象
            const valueToObjectsMap = {};
            const occObjectsToCheck = [];

            Object.keys(objectsById).forEach((oid) => {
                const at = objectsById[oid];
                const occType = String((getType && getType(oid)) || at.type || "").toLowerCase();
                const flatOccAttrs = collectPrefixedAttrs(at, ['occ_']);

                // 检查是否是需要检查的 OCC 类型
                if (occTypesToCheck.includes(occType) || Object.keys(flatOccAttrs).length) {
                    occObjectsToCheck.push({ oid, at });

                    const currentValue = at.occ_static_clock_control !== undefined ? at.occ_static_clock_control : (at.static_clock_control !== undefined ? at.static_clock_control : "undefined");
                    const objName = ctx.getPrettyLabel(oid) || oid;

                    if (!valueToObjectsMap[currentValue]) {
                        valueToObjectsMap[currentValue] = [];
                    }
                    valueToObjectsMap[currentValue].push({
                        name: objName,
                        type: at.type
                    });
                }
            });

            console.log(`Found ${occObjectsToCheck.length} OCC objects to check`);
            console.log("Value distribution:", valueToObjectsMap);

            // 检查是否有不一致的值
            const uniqueValues = Object.keys(valueToObjectsMap);
            let staticClockControlValue = null;
            let hasStaticClockControl = false;

            if (uniqueValues.length > 1) {
                // 构建详细的错误消息
                let errorMessage = "ERROR: static_clock_control values are not consistent across OCC objects!\n\n";
                errorMessage += "Please modify the following objects to have the same static_clock_control value:\n\n";

                uniqueValues.forEach(value => {
                    errorMessage += `Value: "${value}"\n`;
                    valueToObjectsMap[value].forEach(obj => {
                        errorMessage += `  - ${obj.name} (${obj.type})\n`;
                    });
                    errorMessage += "\n";
                });

                errorMessage += "All OCC objects must have the same static_clock_control value. ";
                errorMessage += "Please fix this inconsistency before proceeding.";

                console.error(errorMessage);

                // 弹出对话框显示详细错误
                if (typeof alert !== 'undefined') {
                    alert(errorMessage);
                }

                // 抛出错误停止执行
                throw new Error("static_clock_control values are not consistent across OCC objects");
            }
            else if (uniqueValues.length === 1 && uniqueValues[0] !== "undefined") {
                // 所有值一致
                staticClockControlValue = uniqueValues[0];
                hasStaticClockControl = true;
                console.log(`All OCC objects have consistent static_clock_control value: ${staticClockControlValue}`);
            }
            else {
                console.log("No static_clock_control property found in any OCC object");
            }

            // 处理所有 OCC 对象，但只将需要检查的类型添加到输出
            Object.keys(objectsById).forEach((oid) => {
                const at = objectsById[oid];
                const occType = String((getType && getType(oid)) || at.type || "").toLowerCase();
                const flatOccAttrs = collectPrefixedAttrs(at, ['occ_']);
                if (!(occType.includes("occ") || Object.keys(flatOccAttrs).length)) return;

                const name = ctx.getPrettyLabel(oid) || (at.label || occType).trim();

                // 只将需要检查的OCC类型添加到主输出（排除 mini_occ）
                if (occTypesToCheck.includes(occType) || Object.keys(flatOccAttrs).length) {
                    const { panels, id2title } = collectPanels(childrenByParent, oid);
                    const nested = buildHierarchyByEdges(panels, id2title, edges);

                    const occctrl = {};
                    const insertion_point = findSignal(oid, "clock_intercept_node");

                    // 创建 Controller 对象
                    if (insertion_point) {
                        occctrl.Controller = {
                            clock_intercept_node: insertion_point,
                            type: at.type || occType
                        };
                    } else {
                        occctrl.Controller = {
                            type: at.type || occType
                        };
                    }

                    Object.keys(nested).forEach((k) => {
                        if (k === "Controller" && nested[k] && typeof nested[k] === "object") {
                            occctrl.Controller = {
                                ...(occctrl.Controller || {}),
                                ...nested[k],
                                type: at.type || occType
                            };
                        } else {
                            occctrl[k] = nested[k];
                        }
                    });

                    Object.keys(flatOccAttrs).forEach((k) => {
                        occctrl[k] = flatOccAttrs[k];
                    });

                    out[name] = occctrl;
                }
            });

            // 创建全局的 MGC_OCC_INS_SPEC 对象
            if (hasStaticClockControl) {
                const mgcOccInsSpec = {
                    static_clock_control: staticClockControlValue
                };

                console.log(`Adding static_clock_control: ${staticClockControlValue} to MGC_OCC_INS_SPEC`);

                // 将需要检查的OCC类型添加到 MGC_OCC_INS_SPEC
                occObjectsToCheck.forEach(({ oid, at }) => {
                    const name = ctx.getPrettyLabel(oid) || (at.label || at.type).trim();
                    if (out[name]) {
                        mgcOccInsSpec[name] = out[name];
                    }
                });

                // 将 MGC_OCC_INS_SPEC 添加到输出对象中（替换重复的对象）
                out.MGC_OCC_INS_SPEC = mgcOccInsSpec;

                // 从主输出中移除已经添加到 MGC_OCC_INS_SPEC 的对象
                occObjectsToCheck.forEach(({ oid, at }) => {
                    const name = ctx.getPrettyLabel(oid) || (at.label || at.type).trim();
                    delete out[name];
                });
            }

            if (!out.MGC_OCC_INS_SPEC && Object.keys(out).length) {
                const firstName = Object.keys(out)[0];
                if (firstName) out.MGC_OCC_INS_SPEC = out[firstName];
            }

            return out;
        }

        function parseAllDMAIST(ctx) {
            const { objectsById, childrenByParent, edges, getPrettyLabel } = ctx;

            function findSignal(objId, token) {
                const tok = String(token || "").toLowerCase();
                for (let i = 0; i < edges.length; i++) {
                    const e = edges[i];
                    if (e.source === objId || e.target === objId) {
                        const lbl = (e.label || "").trim();
                        if (lbl && lbl.toLowerCase() === tok) {
                            const other = e.source === objId ? e.target : e.source;
                            if (other) {
                                const otherObj = objectsById[other];
                                if (otherObj) {
                                    // 获取完整的信号路径，包括端口和位宽信息
                                    let signalPath = getPrettyLabel(other);
                                    // 添加端口信息 (A/Y)
                                    const port = e.source === objId ? "Y" : "A";
                                    signalPath += `/${port}`;

                                    // 添加位宽信息（如果有）
                                    if (otherObj.width && otherObj.width > 1) {
                                        signalPath += `[${otherObj.width - 1}:0]`;
                                    }
                                    return signalPath;
                                }
                                return getPrettyLabel(other);
                            }
                        }
                    }
                }
                return null;
            }

            const out = {};
            Object.keys(objectsById).forEach((oid) => {
                const at = objectsById[oid];
                if ((at.type || "").toUpperCase() !== "DMA_IST_CONTROLLER") return;
                const name = getPrettyLabel(oid) || (at.label || "DMA_IST_CONTROLLER").trim();

                const { panels, id2title } = collectPanels(childrenByParent, oid);
                const nested = buildHierarchyByEdges(panels, id2title, edges);

                // 重新组织输出结构
                const dmaist = {
                    Connections: {
                        Direct_memory_access: {}
                    }
                };

                // 查找所有信号
                const clk = findSignal(oid, "clock");
                const tpsindex = findSignal(oid, "test_program_start_index");
                const tpeindex = findSignal(oid, "test_program_end_index");
                const tpdone = findSignal(oid, "test_program_done");
                const fflag = findSignal(oid, "fail_flag");
                const maddr = findSignal(oid, "mem_address");
                const mdat = findSignal(oid, "mem_data");
                const en = findSignal(oid, "enable");

                const tact = findSignal(oid, "test_active");
                const reset = findSignal(oid, "reset");
                const se = findSignal(oid, "scan_enable");
                const ccsi = findSignal(oid, "controller_chain_scan_in");
                const ccso = findSignal(oid, "controller_chain_scan_out");
                const cce = findSignal(oid, "controller_chain_enable");

                // 其他连接信号直接放在Connections下
                if (tact) dmaist.Connections.test_active = tact;
                if (reset) dmaist.Connections.reset = reset;
                if (se) dmaist.Connections.scan_enable = se;
                if (ccsi) dmaist.Connections.controller_chain_scan_in = ccsi;
                if (ccso) dmaist.Connections.controller_chain_scan_out = ccso;
                if (cce) dmaist.Connections.controller_chain_enable = cce;

                // 将DMA信号放入Direct_memory_access子对象
                if (clk) dmaist.Connections.Direct_memory_access.clock = clk;
                if (tpsindex) dmaist.Connections.Direct_memory_access.test_program_start_index = tpsindex;
                if (tpeindex) dmaist.Connections.Direct_memory_access.test_program_end_index = tpeindex;
                if (tpdone) dmaist.Connections.Direct_memory_access.test_program_done = tpdone;
                if (fflag) dmaist.Connections.Direct_memory_access.fail_flag = fflag;
                if (maddr) dmaist.Connections.Direct_memory_access.mem_address = maddr;
                if (mdat) dmaist.Connections.Direct_memory_access.mem_data = mdat;
                if (en) dmaist.Connections.Direct_memory_access.enable = en;
                // 处理嵌套的面板属性（ControllerChain, Controller, DirectMemoryAccessOptions）
                Object.keys(nested).forEach((k) => {
                    dmaist[k] = nested[k];
                });

                out[name] = dmaist;
            });

            return out;
        }

        function nestPanelsByArrows(parentOid, entry, panelId2title, edges, onlyWhenSrcStarts) {
            const localIds = new Set(Object.keys(panelId2title));
            const nestedTargets = new Set();

            edges.forEach((e) => {
                const s = e.source, t = e.target; if (!s || !t) return;
                if (!localIds.has(s) || !localIds.has(t)) return;
                const srcTitle = panelId2title[s]; const tgtTitle = panelId2title[t];
                if (onlyWhenSrcStarts && !srcTitle.toLowerCase().startsWith(onlyWhenSrcStarts)) return;
                if (!(srcTitle in entry) || !(tgtTitle in entry)) return;
                const srcDict = entry[srcTitle] || (entry[srcTitle] = {});
                const tgtPayload = entry[tgtTitle];
                const box = srcDict[tgtTitle] || (srcDict[tgtTitle] = {});
                if (isPlainObject(box) && isPlainObject(tgtPayload)) {
                    Object.keys(tgtPayload).forEach((k) => { if (!(k in box)) box[k] = tgtPayload[k]; });
                }
                nestedTargets.add(tgtTitle);
            });

            nestedTargets.forEach((t) => { delete entry[t]; });
            return entry;
        }

        function isPlainObject(o) { return Object.prototype.toString.call(o) === "[object Object]"; }

        function collectPrefixedAttrs(at, prefixes) {
            const out = {};
            const wanted = Array.isArray(prefixes) ? prefixes : [prefixes];
            Object.keys(at || {}).forEach((k) => {
                if (k === 'id' || k === 'label' || k === 'type') return;
                if (k.indexOf('__cell_') === 0) return;
                if (wanted.some((p) => String(k).indexOf(p) === 0)) out[k] = at[k];
            });
            return out;
        }

        function parseEdtAndScanhost(ctx) {
            const { objectsById, childrenByParent, edges, getType, getLabel, getPrettyLabel } = ctx;
            const res = { EDT: {}, SCAN_HOST: {}, FIFO: {}, BFM: {}, BFD: {} };

            Object.keys(objectsById).forEach((oid) => {
                const at = objectsById[oid];
                const t = String((getType && getType(oid)) || at.type || "").toLowerCase();

                // 识别不同类型的对象
                let name, bucket;
                if (t === "edt") {
                    name = (at.label || "EDT").toLowerCase();
                    bucket = res.EDT;
                } else if (t === "sh" || t === "scanhost") {
                    name = ctx.getPrettyLabel(oid) || at.label || "ScanHost";
                    bucket = res.SCAN_HOST;
                } else if (t === "fifo") {
                    name = ctx.getPrettyLabel(oid) || at.label || "FIFO";
                    bucket = res.FIFO;
                } else if (t === "bfm") {
                    name = ctx.getPrettyLabel(oid) || at.label || "BFM";
                    bucket = res.BFM;
                } else if (t === "bfd") {
                    name = ctx.getPrettyLabel(oid) || at.label || "BFD";
                    bucket = res.BFD;
                } else {
                    return; // 跳过不关心的类型
                }

                const { panels, id2title } = collectPanels(childrenByParent, oid);
                let nested = buildHierarchyByEdges(panels, id2title, edges);

                // 根据不同类型进行后处理
                if (t === "edt" || t === "sh" || t === "scanhost") {
                    nested = postprocessTitlesChainGroups(nested);
                }
                if (t === "edt") {
                    const flatAttrs = collectPrefixedAttrs(at, ['edt_']);
                    if (Object.keys(flatAttrs).length) {
                        nested = Object.assign({}, flatAttrs, nested || {});
                    }
                }
                //else if (t === "fifo") {
                //    nested = postprocessFifoConfig(nested, oid, ctx);
                //} else if (t === "bfm" || t === "bfd") {
                //    nested = postprocessBfmBfdConfig(nested, oid, ctx);
                //}

                // 处理重名情况
                if (bucket[name]) {
                    let counter = 1;
                    let newName = `${name}_${counter}`;
                    while (bucket[newName]) {
                        counter++;
                        newName = `${name}_${counter}`;
                    }
                    name = newName;
                }

                bucket[name] = nested;
            });

            return res;
        }

        function parseEdtAndScanhost1(ctx) {
            const { objectsById, childrenByParent, edges, getType } = ctx;
            const res = { EDT: {}, SCAN_HOST: {} };

            Object.keys(objectsById).forEach((oid) => {
                const at = objectsById[oid];
                const t = String((getType && getType(oid)) || at.type || "").toLowerCase();
                if (["edt", "sh", "scanhost"].indexOf(t) < 0) return;
                let name, bucket;
                if (t === "edt") { name = (at.label || "EDT").toLowerCase(); bucket = res.EDT; }
                else { name = ctx.getPrettyLabel(oid) || at.label || "ScanHost"; bucket = res.SCAN_HOST; }

                const { panels, id2title } = collectPanels(childrenByParent, oid);
                let nested = buildHierarchyByEdges(panels, id2title, edges);
                nested = postprocessTitlesChainGroups(nested);
                bucket[name] = nested;
            });

            return res;
        }

        // -----------------------------
        // SSN stream datapath
        // -----------------------------
        // --------------------------------------------------------------------------------------
        // SSN stream datapath — main variant (OUT -> IN, with nested sMux rules)
        // --------------------------------------------------------------------------------------
        function _normCtx(ctx = {}) {
        const objects_by_id = ctx.objects_by_id || ctx.objectsById || {};
        const edges = ctx.edges || ctx.graph_edges || [];
        const get_type = ctx.get_type || ctx.getType || (() => '');
        const get_label = ctx.get_label || ctx.getLabel || (nid => objects_by_id[nid]?.label || '');
        const get_pretty_label = ctx.get_pretty_label || ctx.getPrettyLabel || (nid => objects_by_id[nid]?.pretty_label || '');
        const get_node_attr = ctx.get_node_attr || ctx.getNodeAttr || (nid => objects_by_id[nid]?.attr || {});
        return { objects_by_id, edges, get_type, get_label, get_pretty_label, get_node_attr };
        }

        function parseDatapath(ctx, { cfg = {} } = {}) {
        const DEBUG = !!(cfg.debug ?? false);
        const {
            objects_by_id, edges, get_type, get_label, get_pretty_label, get_node_attr
        } = _normCtx(ctx);

        if (!edges.length || !Object.keys(objects_by_id).length) {
            if (DEBUG) console.error('[DP] empty graph in parseDatapath');
            return {};
        }

        const MAX_BACK = parseInt(cfg.loop_max_back_hops ?? 64, 10);

        const BRANCH_TYPES = new Set(
            cfg.branch_types ?? ['pp', 'core', 'sub_core', 'ext_core', 'fifo', 'bfd', 'bfm', 'smux']
        );
        const BRANCH_STOPS = new Set(
            cfg.branch_stop_types ?? ['op', 'sh', 'scanhost', 'rppl', 'ssn_bus_data_in', 'ssn_bus_data_out']
        );
        const STOP_NEST_TYPES = new Set(
            cfg.stop_nest_types ?? ['op', 'sh', 'scanhost', 'ssn_bus_data_out']
        );

        const dprint = (...a) => { if (DEBUG) console.error('[DP]', ...a); };
        const ntype = nid => (get_type(nid) || '').toLowerCase() || 'node';
        const nname = nid => get_pretty_label(nid) || get_label(nid) || nid;

        const pref = t => {
            t = (t || '').toLowerCase();
            return ({
            scanhost: 'sh', sh: 'sh',
            op: 'op',
            rppl: 'rppl',
            smux: 'sMux',
            pp: 'pp',
            core: 'core',
            sub_core: 'sub_core',
            ext_core: 'ext_core',
            fifo: 'fifo',
            bfd: 'bfd',
            bfm: 'bfm',
            })[t] || (t || 'node');
        };

        function width_from(lbl) {
            const m = (lbl || '').match(/\[(\d+)\s*:\s*(\d+)\]/);
            if (!m) return null;
            const msb = parseInt(m[1], 10), lsb = parseInt(m[2], 10);
            return Math.abs(msb - lsb) + 1;
        }
        const is_smux = nid => ntype(nid) === 'smux';

        // === 建图（邻接）===
        const out_next = Object.create(null);
        const in_prev = Object.create(null);
        for (const e of edges) {
            const s = e.source, t = e.target;
            if (s && t) {
            (out_next[s] ||= []).push(t);
            (in_prev[t] ||= []).push([s, (e.label || '').trim()]);
            }
        }

        // 反向遍历（OUT -> 上游）
        const ordered_predecessors = nid => (in_prev[nid] || []).map(([s]) => s);

        // sMux 入端（master 优先，再 secondary；不足用 others 兜底）
        function smux_inputs_master_first(smux_id) {
            const master = [], secondary = [], others = [];
            for (const [s, lbl] of (in_prev[smux_id] || [])) {
            const ll = (lbl || '').toLowerCase();
            if (ll.includes('master_bus_data_in')) master.push(s);
            else if (ll.includes('secondary_bus_data_in')) secondary.push(s);
            else others.push(s);
            }
            const starts = [];
            starts.push(master[0] || others[0] || null);
            if (secondary.length) starts.push(secondary[0]);
            else if (others.length > 1) starts.push(others[1]);

            const seen = new Set();
            const uniq = [];
            for (const x of starts) {
            if (x && !seen.has(x)) { uniq.push(x); seen.add(x); }
            }
            return uniq.slice(0, 2);
        }

        function choose_pred(preds) {
            if (!preds || !preds.length) return null;
            if (preds.length === 1) return preds[0];
            const prio = { smux: 0, pp: 1, ext_core: 2, core: 3, sub_core: 4 };
            return [...preds].sort((a, b) => (prio[ntype(a)] ?? 9) - (prio[ntype(b)] ?? 9))[0];
        }

        // 直线上游（近->远），用于 LCA
        function collect_up_line_nodes(start_id, barrier) {
            const seq = [];
            let cur = start_id, steps = 0;
            const seen_local = new Set();
            while (cur && !barrier.has(cur) && steps < MAX_BACK) {
            if (BRANCH_STOPS.has(ntype(cur)) || seen_local.has(cur)) break;
            seq.push(cur);
            seen_local.add(cur);
            steps++;
            const preds = (in_prev[cur] || []).map(([p]) => p).filter(p => !barrier.has(p));
            if (!preds.length) break;
            const nxt = choose_pred(preds);
            if (!nxt) break;
            cur = nxt;
            }
            return seq;
        }

        // 分支线性回溯（支持分支内嵌套 sMux；到 extra_stop/LCA 即止）
        // 返回 [items, consumed_nodes]
        // items: ['node', node_id] | ['smux', smux_block]  （近->远）
        function walk_branch_with_nested_smux(start_id, barrier, extra_stop) {
            const res = [];
            const consumed = new Set();
            let cur = start_id, steps = 0;
            const local_seen = new Set();

            while (cur && !barrier.has(cur) && steps < MAX_BACK) {
            if (extra_stop.has(cur)) break;
            const t = ntype(cur);
            if (BRANCH_STOPS.has(t) || local_seen.has(cur)) break;

            if (is_smux(cur)) {
                const [nested_block, _avoidChildren, nested_consumed] =
                build_smux_block_recursive(cur, new Set([...barrier, ...local_seen, cur]));
                res.push(['smux', nested_block]);
                for (const n of nested_consumed) consumed.add(n);
                break;
            } else {
                res.push(['node', cur]);
                consumed.add(cur);
            }
            local_seen.add(cur);
            steps++;

            const preds = (in_prev[cur] || []).map(([p]) => p).filter(p => !barrier.has(p));
            if (!preds.length) break;
            const nxt = choose_pred(preds);
            if (!nxt) break;
            cur = nxt;
            }

            return [res, consumed];
        }

        // === sMux 块（分 secondary/master；返回 avoid_children 与 consumed_on_main）===
        // 返回 [blk, avoid_children: Set, consumed_on_main: Set]
        function build_smux_block_recursive(smux_id, barrier) {
            const blk = { name: nname(smux_id) };
            const starts = smux_inputs_master_first(smux_id);

            // LCA：若两路都能上探到同一节点（可能是普通节点或 sMux），以此为止
            let lca = null;
            const avoid_children = new Set(); // 若 LCA 是 sMux，就避免把它当作紧邻子 sMux 嵌套
            if (starts.length === 2 && starts[0] && starts[1]) {
            const master_chain = collect_up_line_nodes(starts[0], new Set([...barrier, smux_id]));
            const master_set = new Set(master_chain);
            let sec_cur = starts[1], steps = 0;
            while (sec_cur && !barrier.has(sec_cur) && steps < MAX_BACK) {
                if (master_set.has(sec_cur)) { lca = sec_cur; break; }
                if (BRANCH_STOPS.has(ntype(sec_cur))) break;
                const preds = (in_prev[sec_cur] || []).map(([p]) => p).filter(p => !barrier.has(p));
                if (!preds.length) break;
                sec_cur = choose_pred(preds);
                steps++;
            }
            }
            if (lca && is_smux(lca)) avoid_children.add(lca);

            // 两个子字典，各自从 lvl1 编号
            const sec_dict = {};
            const mst_dict = {};
            let sec_lvl = 1, mst_lvl = 1;

            const consumed_on_main = new Set();

            // master 分支
            if (starts[0]) {
            const stop_set = lca ? new Set([lca]) : new Set();
            const [items, consumed] =
                walk_branch_with_nested_smux(starts[0], new Set([...barrier, smux_id]), stop_set);
            for (const n of consumed) consumed_on_main.add(n);
            for (const [kind, payload] of items) {
                if (kind === 'node') {
                const uid = payload;
                mst_dict[`${pref(ntype(uid))}_lvl${mst_lvl}`] = nname(uid);
                mst_lvl += 1;
                } else {
                mst_dict[`smux_lvl${mst_lvl}`] = payload;
                mst_lvl += 1;
                }
            }
            }

            // secondary 分支
            if (starts[1]) {
            const stop_set = lca ? new Set([lca]) : new Set();
            const [items, consumed] =
                walk_branch_with_nested_smux(starts[1], new Set([...barrier, smux_id]), stop_set);
            for (const n of consumed) consumed_on_main.add(n);
            for (const [kind, payload] of items) {
                if (kind === 'node') {
                const uid = payload;
                sec_dict[`${pref(ntype(uid))}_lvl${sec_lvl}`] = nname(uid);
                sec_lvl += 1;
                } else {
                sec_dict[`smux_lvl${sec_lvl}`] = payload;
                sec_lvl += 1;
                }
            }
            }

            if (Object.keys(sec_dict).length) blk.secondary = sec_dict;
            if (Object.keys(mst_dict).length) blk.master = mst_dict;

            return [blk, avoid_children, consumed_on_main];
        }

        // 紧邻才嵌套子 sMux；返回 [block, j, consumed_on_main]
        function build_smux_chain_on_main(path, i, barrier) {
            const cur_smux = path[i];
            let [cur_block, avoid_children, consumed] = build_smux_block_recursive(cur_smux, barrier);
            let j = i + 1;

            // 只在“紧邻”且不在 avoid_children 时做链式嵌套
            if (j < path.length - 1 && ntype(path[j]) === 'smux' && !avoid_children.has(path[j])) {
            const between = new Set(path.slice(i + 1, j + 1));
            const [child_block, j2, child_consumed] =
                build_smux_chain_on_main(path, j, new Set([...barrier, ...between]));
            cur_block['smux_lvl2'] = child_block;
            for (const n of child_consumed) consumed.add(n);
            j = j2;
            } else {
            j = i;
            }
            return [cur_block, j, consumed];
        }

        // 主流程：按 OUT→…→IN 的顺序输出
        const entries = Object.keys(objects_by_id).filter(oid => ntype(oid) === 'ssn_bus_data_out');
        dprint(`FOUND ${entries.length} ssn_bus_data_out entries: ${entries.map(nname)}`);
        const datapaths = {};
        let dp_idx = 0;

        for (let ei = 0; ei < entries.length; ei++) {
            const bus_out_id = entries[ei];
            dprint('======================================================================');
            dprint(`[ENTRY ${ei}] start from OUT ${nname(bus_out_id)}`);

            const seen = new Set([bus_out_id]);
            const prev = Object.create(null);
            const q = [bus_out_id];
            let in_id = null;

            while (q.length) {
            const u = q.shift();
            if (ntype(u) === 'ssn_bus_data_in') { in_id = u; break; }
            for (const p of ordered_predecessors(u)) {
                if (!seen.has(p)) { seen.add(p); prev[p] = u; q.push(p); }
            }
            }
            if (!in_id) continue;

            // OUT->…->IN 主路径
            const path_in_to_out = [];
            let cur = in_id;
            while (true) {
            path_in_to_out.push(cur);
            if (cur === bus_out_id) break;
            cur = prev[cur];
            }
            const path = [...path_in_to_out].reverse();

            const bin_lbl = nname(in_id);
            const bout_lbl = nname(bus_out_id);
            const width = width_from(bin_lbl) || 0;
            const clk = get_node_attr(bus_out_id).clock || '';

            const order = {};
            let lvl = 0;
            const barrier_seen = new Set([bus_out_id]);
            let i = 1;

            // 记录已被 sMux 消耗的主路径节点，供跳过
            const consumed_on_main_all = new Set();

            while (i < path.length - 1) {
            const nid = path[i];
            const t = ntype(nid);

            // 若该节点被上一个 sMux 吃掉，直接跳过
            if (consumed_on_main_all.has(nid)) {
                i += 1;
                continue;
            }

            if (t === 'smux') {
                const [block, j, consumed] =
                build_smux_chain_on_main(path, i, new Set(barrier_seen));
                order[`sMux_lvl${lvl}`] = block;
                lvl += 1;

                // 把 sMux 吃掉的主路径节点加入跳过集，并扩展屏障
                for (const n of consumed) consumed_on_main_all.add(n);
                for (const n of consumed) barrier_seen.add(n);

                // 前进到下一个未被吃掉的主路径节点
                i = i + 1;
                while (i < path.length - 1 && consumed_on_main_all.has(path[i])) i += 1;
                for (const n of path.slice(0, i)) barrier_seen.add(n);
                continue;
            }

            const key = `${pref(t)}_lvl${lvl}`;
            order[key] = nname(nid);
            lvl += 1;
            barrier_seen.add(nid);
            i += 1;
            }

            datapaths[`DATAPATH_${dp_idx}`] = {
            output_bus_width: width,
            connections: {
                bus_clock_in: clk,
                bus_data_in: bin_lbl,
                bus_data_out: bout_lbl,
            },
            order,
            };
            dp_idx += 1;
        }

        return datapaths;
        }

        function parseDatapath_old(ctx) {
            const { objectsById, neigh, getType, getLabel, getPrettyLabel, getNodeAttr, edges } = ctx;

            function busWidthFromLabel(lbl) {
                const m = (lbl || "").match(/\[(\d+)\s*:\s*(\d+)\]/);
                if (!m) return null;
                const msb = parseInt(m[1], 10), lsb = parseInt(m[2], 10);
                return Math.abs(msb - lsb) + 1;
            }

            function edgeLabelTouching(nodeId, token) {
                const tokenL = String(token || "").toLowerCase();
                for (let i = 0; i < edges.length; i++) {
                    const e = edges[i];
                    if (e.source === nodeId || e.target === nodeId) {
                        const lbl = (e.label || "").trim();
                        if (lbl && lbl.toLowerCase().indexOf(tokenL) >= 0) return lbl;
                    }
                }
                return null;
            }

            const byType = {};
            Object.keys(objectsById).forEach((oid) => {
                const t = (objectsById[oid].type || "").toLowerCase();
                if (!t) return; (byType[t] || (byType[t] = [])).push(oid);
            });

            const datapaths = [];

            // 处理原有的 rppl 路径
            (byType["ssn_bus_data_in"] || []).forEach((bus_in_id) => {
                // 原有的 rppl 路径逻辑保持不变
                let rppl_id = null;
                (ctx.neigh[bus_in_id] || []).some((nb) => { if (ctx.getType(nb).toLowerCase() === "rppl") { rppl_id = nb; return true; } return false; });

                // 新的 BFM 路径检测
                let bfm_id = null;
                (ctx.neigh[bus_in_id] || []).some((nb) => { if (ctx.getType(nb).toLowerCase() === "bfm") { bfm_id = nb; return true; } return false; });

                // 如果两种路径都不存在，则返回
                if (!rppl_id && !bfm_id) return;

                let sMux_id = null, sh_id = null;
                let currentPathType = null;

                if (rppl_id) {
                    // 原有的 rppl 路径处理
                    currentPathType = 'rppl';
                    (ctx.neigh[rppl_id] || []).forEach((nb) => {
                        const tp = ctx.getType(nb).toLowerCase();
                        if (tp === "smux") sMux_id = nb;
                        if (tp === "sh" || tp === "scanhost") sh_id = nb;
                    });
                } else if (bfm_id) {
                    // 新的 BFM 路径处理
                    currentPathType = 'bfm';
                    (ctx.neigh[bfm_id] || []).forEach((nb) => {
                        const tp = ctx.getType(nb).toLowerCase();
                        if (tp === "smux") sMux_id = nb;
                        if (tp === "sh" || tp === "scanhost") sh_id = nb;
                    });
                }

                if (!sh_id && sMux_id) {
                    (ctx.neigh[sMux_id] || []).some((nb) => {
                        if (["sh", "scanhost"].indexOf(ctx.getType(nb).toLowerCase()) >= 0) {
                            sh_id = nb; return true;
                        } return false;
                    });
                }
                if (!sh_id) return;

                let op_id = null, bfd_id = null;
                (ctx.neigh[sh_id] || []).forEach((nb) => {
                    const tp = ctx.getType(nb).toLowerCase();
                    if (tp === "op") op_id = nb;
                    if (tp === "bfd") bfd_id = nb;
                });

                let bus_out_id = null;
                if (op_id) {
                    // 原有的 op → bus_out 路径
                    (ctx.neigh[op_id] || []).some((nb) => {
                        if (ctx.getType(nb).toLowerCase() === "ssn_bus_data_out") {
                            bus_out_id = nb; return true;
                        } return false;
                    });
                } else if (bfd_id) {
                    // 新的 bfd → bus_out 路径
                    (ctx.neigh[bfd_id] || []).some((nb) => {
                        if (ctx.getType(nb).toLowerCase() === "ssn_bus_data_out") {
                            bus_out_id = nb; return true;
                        } return false;
                    });
                }

                if (!bus_out_id) return;

                const bus_in_lbl = ctx.getPrettyLabel(bus_in_id) || ctx.getLabel(bus_in_id);
                const bus_out_lbl = ctx.getPrettyLabel(bus_out_id) || ctx.getLabel(bus_out_id);
                const width = busWidthFromLabel(bus_in_lbl) || 0;
                const bus_out_clock = ctx.getNodeAttr(bus_out_id).clock || "";

                const smuxBlock = {};
                if (sMux_id) {
                    function collectCorePp(startIds) {
                        const seen = new Set(); const out = [];
                        const dq = startIds.map((x) => [x, 0]);
                        while (dq.length) {
                            const [nid, d] = dq.shift();
                            if (seen.has(nid)) continue; seen.add(nid);
                            if (d > 4) continue;
                            (ctx.neigh[nid] || []).forEach((nb) => {
                                if (seen.has(nb)) return;
                                const t = ctx.getType(nb).toLowerCase();
                                if (t === "sub_core" || t === "pp") out.push(nb);
                                dq.push([nb, d + 1]);
                            });
                        }
                        const uniq = []; const seen2 = new Set();
                        out.forEach((n) => { if (!seen2.has(n)) { uniq.push(n); seen2.add(n); } });
                        return uniq;
                    }

                    const startIds = currentPathType === 'rppl' ? [sMux_id, rppl_id] : [sMux_id, bfm_id];
                    const corePpNodes = collectCorePp(startIds);
                    const cores = {}, pp_to = {}, pp_from = {};
                    corePpNodes.forEach((nid) => {
                        const lbl = ctx.getPrettyLabel(nid);
                        const t = ctx.getType(nid).toLowerCase();
                        let m;
                        if (t === "sub_core") { m = lbl.match(/core\s*(\d+)/i); if (m) cores[parseInt(m[1], 10)] = lbl; }
                        else if (t === "pp") {
                            m = lbl.match(/to_core\s*(\d+)/i); if (m) { pp_to[parseInt(m[1], 10)] = lbl; return; }
                            m = lbl.match(/from_core\s*(\d+)/i); if (m) { pp_from[parseInt(m[1], 10)] = lbl; return; }
                        }
                    });
                    let lvl = 1;
                    const idxs = Array.from(new Set(Object.keys(cores).concat(Object.keys(pp_to)).concat(Object.keys(pp_from)).map(x => parseInt(x, 10)))).sort((a, b) => a - b);
                    idxs.forEach((idx) => {
                        if (pp_from[idx]) { smuxBlock[`pp_lvl${lvl}`] = pp_from[idx]; lvl++; }
                        if (cores[idx]) { smuxBlock[`core_lvl${lvl}`] = cores[idx]; lvl++; }
                        if (pp_to[idx]) { smuxBlock[`pp_lvl${lvl}`] = pp_to[idx]; lvl++; }
                    });
                }

                const order = {};

                // 根据路径类型设置不同的order结构
                if (currentPathType === 'rppl') {
                    order.op_lvl0 = ctx.getPrettyLabel(op_id);
                    order.sh_lvl1 = ctx.getPrettyLabel(sh_id);
                    if (sMux_id && Object.keys(smuxBlock).length) {
                        order.sMux_lvl2 = smuxBlock;
                        order.rppl_lvl3 = ctx.getPrettyLabel(rppl_id);
                    } else {
                        order.rppl_lvl2 = ctx.getPrettyLabel(rppl_id);
                    }
                } else if (currentPathType === 'bfm') {
                    order.bfm_lvl0 = ctx.getPrettyLabel(bfm_id);
                    order.sh_lvl1 = ctx.getPrettyLabel(sh_id);
                    if (sMux_id && Object.keys(smuxBlock).length) {
                        order.sMux_lvl2 = smuxBlock;
                        order.bfd_lvl3 = ctx.getPrettyLabel(bfd_id);
                    } else {
                        order.bfd_lvl2 = ctx.getPrettyLabel(bfd_id);
                    }
                }

                datapaths.push({
                    output_bus_width: width,
                    connections: {
                        bus_clock_in: bus_out_clock,
                        bus_data_in: bus_in_lbl,
                        bus_data_out: bus_out_lbl
                    },
                    order
                });
            });

            const outDp = {};
            datapaths.forEach((d, i) => {
                outDp[`DATAPATH_${i}`] = d;
            });
            return outDp;
        }
        function parseDatapath1(ctx) {
            const { objectsById, neigh, getType, getLabel, getPrettyLabel, getNodeAttr, edges } = ctx;

            function busWidthFromLabel(lbl) {
                const m = (lbl || "").match(/\[(\d+)\s*:\s*(\d+)\]/);
                if (!m) return null;
                const msb = parseInt(m[1], 10), lsb = parseInt(m[2], 10);
                return Math.abs(msb - lsb) + 1;
            }

            function edgeLabelTouching(nodeId, token) {
                const tokenL = String(token || "").toLowerCase();
                for (let i = 0; i < edges.length; i++) {
                    const e = edges[i];
                    if (e.source === nodeId || e.target === nodeId) {
                        const lbl = (e.label || "").trim();
                        if (lbl && lbl.toLowerCase().indexOf(tokenL) >= 0) return lbl;
                    }
                }
                return null;
            }

            const byType = {};
            Object.keys(objectsById).forEach((oid) => {
                const t = (objectsById[oid].type || "").toLowerCase();
                if (!t) return; (byType[t] || (byType[t] = [])).push(oid);
            });

            const datapaths = [];

            (byType["ssn_bus_data_in"] || []).forEach((bus_in_id) => {
                let rppl_id = null;
                (ctx.neigh[bus_in_id] || []).some((nb) => { if (ctx.getType(nb).toLowerCase() === "rppl") { rppl_id = nb; return true; } return false; });
                if (!rppl_id) return;
                let sMux_id = null, sh_id = null;
                (ctx.neigh[rppl_id] || []).forEach((nb) => { const tp = ctx.getType(nb).toLowerCase(); if (tp === "smux") sMux_id = nb; if (tp === "sh" || tp === "scanhost") sh_id = nb; });
                if (!sh_id && sMux_id) {
                    (ctx.neigh[sMux_id] || []).some((nb) => { if (["sh", "scanhost"].indexOf(ctx.getType(nb).toLowerCase()) >= 0) { sh_id = nb; return true; } return false; });
                }
                if (!sh_id) return;
                let op_id = null;
                (ctx.neigh[sh_id] || []).some((nb) => { if (ctx.getType(nb).toLowerCase() === "op") { op_id = nb; return true; } return false; });
                if (!op_id) return;
                let bus_out_id = null;
                (ctx.neigh[op_id] || []).some((nb) => { if (ctx.getType(nb).toLowerCase() === "ssn_bus_data_out") { bus_out_id = nb; return true; } return false; });
                if (!bus_out_id) return;

                const bus_in_lbl = ctx.getPrettyLabel(bus_in_id) || ctx.getLabel(bus_in_id);
                const bus_out_lbl = ctx.getPrettyLabel(bus_out_id) || ctx.getLabel(bus_out_id);
                const width = busWidthFromLabel(bus_in_lbl) || 0;
                const bus_out_clock = ctx.getNodeAttr(bus_out_id).clock || "";

                const smuxBlock = {};
                if (sMux_id) {
                    function collectCorePp(startIds) {
                        const seen = new Set(); const out = [];
                        const dq = startIds.map((x) => [x, 0]);
                        while (dq.length) {
                            const [nid, d] = dq.shift();
                            if (seen.has(nid)) continue; seen.add(nid);
                            if (d > 4) continue;
                            (ctx.neigh[nid] || []).forEach((nb) => {
                                if (seen.has(nb)) return;
                                const t = ctx.getType(nb).toLowerCase();
                                if (t === "core" || t === "pp") out.push(nb);
                                dq.push([nb, d + 1]);
                            });
                        }
                        const uniq = []; const seen2 = new Set();
                        out.forEach((n) => { if (!seen2.has(n)) { uniq.push(n); seen2.add(n); } });
                        return uniq;
                    }
                    const corePpNodes = collectCorePp([sMux_id, rppl_id]);
                    const cores = {}, pp_to = {}, pp_from = {};
                    corePpNodes.forEach((nid) => {
                        const lbl = ctx.getPrettyLabel(nid);
                        const t = ctx.getType(nid).toLowerCase();
                        let m;
                        if (t === "core") { m = lbl.match(/core\s*(\d+)/i); if (m) cores[parseInt(m[1], 10)] = lbl; }
                        else if (t === "pp") {
                            m = lbl.match(/to_core\s*(\d+)/i); if (m) { pp_to[parseInt(m[1], 10)] = lbl; return; }
                            m = lbl.match(/from_core\s*(\d+)/i); if (m) { pp_from[parseInt(m[1], 10)] = lbl; return; }
                        }
                    });
                    let lvl = 1;
                    const idxs = Array.from(new Set(Object.keys(cores).concat(Object.keys(pp_to)).concat(Object.keys(pp_from)).map(x => parseInt(x, 10)))).sort((a, b) => a - b);
                    idxs.forEach((idx) => {
                        if (pp_from[idx]) { smuxBlock[`pp_lvl${lvl}`] = pp_from[idx]; lvl++; }
                        if (cores[idx]) { smuxBlock[`core_lvl${lvl}`] = cores[idx]; lvl++; }
                        if (pp_to[idx]) { smuxBlock[`pp_lvl${lvl}`] = pp_to[idx]; lvl++; }
                    });
                }

                const order = { op_lvl0: ctx.getPrettyLabel(op_id), sh_lvl1: ctx.getPrettyLabel(sh_id) };
                if (sMux_id && Object.keys(smuxBlock).length) { order["sMux_lvl2"] = smuxBlock; order["rppl_lvl3"] = ctx.getPrettyLabel(rppl_id); }
                else { order["rppl_lvl2"] = ctx.getPrettyLabel(rppl_id); }

                datapaths.push({
                    output_bus_width: width,
                    connections: { bus_clock_in: bus_out_clock, bus_data_in: bus_in_lbl, bus_data_out: bus_out_lbl },
                    order
                });
            });

            const outDp = {};
            datapaths.forEach((d, i) => { outDp[`DATAPATH_${i}`] = d; });
            return outDp;
        }

        // --------------------------------------------------------------------------------------
        // SSN stream datapath — V2 (aligned with new_main_debug7.py)
        // --------------------------------------------------------------------------------------
        function parseDatapathV2(ctx, { cfg = {} } = {}) {
            const objectsById = ctx.objectsById || {};
            const cellsById = ctx.cellsById || {};
            const edgeCells = ctx.edges || [];
            const dftsNs = (typeof globalThis !== 'undefined' && globalThis.DftsIP) ? globalThis.DftsIP : ((typeof window !== 'undefined' && window.DftsIP) ? window.DftsIP : null);
            const childrenByParent = ctx.childrenByParent || {};
            const DP_DEBUG = true;
            function dpLog() {
                if (!DP_DEBUG || typeof console === 'undefined' || !console.log) return;
                const args = Array.prototype.slice.call(arguments);
                args.unshift('[parseDatapathV2]');
                console.log.apply(console, args);
            }

            function parseStyle(style) {
                const out = {};
                if (!style) return out;
                String(style).split(';').forEach((part) => {
                    const p = part.trim();
                    if (!p) return;
                    const idx = p.indexOf('=');
                    if (idx < 0) out[p] = '';
                    else out[p.slice(0, idx).trim()] = p.slice(idx + 1).trim();
                });
                return out;
            }

            function isTruthy(v) {
                return String(v || '').trim() === '1' || String(v || '').trim().toLowerCase() === 'true';
            }

            function normDir(v) {
                const vv = String(v || '').trim().toLowerCase();
                if (!vv) return '';
                if (vv === 'input' || vv === 'in') return 'input';
                if (vv === 'output' || vv === 'out' || vv === 'ouput' || vv === 'oput') return 'output';
                if (vv.indexOf('out') >= 0) return 'output';
                if (vv.indexOf('in') >= 0) return 'input';
                return vv;
            }

            function normText(v) {
                return stripHtml(v || '').trim();
            }

            function widthFromName(name) {
                const m = String(name || '').match(/\[(\d+)\s*:\s*(\d+)\]/);
                if (!m) return 0;
                const a = parseInt(m[1], 10);
                const b = parseInt(m[2], 10);
                return Math.abs(a - b) + 1;
            }

            function isDataPinType(pinType) {
                const t = String(pinType || '').toLowerCase();
                return t === 'data_in' || t === 'data_out' || t.indexOf('data') >= 0;
            }

            function isClockPinType(pinType) {
                return String(pinType || '').toLowerCase().indexOf('clock') >= 0;
            }

            function flattenPins(raw) {
                if (!raw) return [];
                if (Array.isArray(raw)) return raw.slice();
                let out = [];
                ['west', 'east', 'north', 'south'].forEach((side) => {
                    if (Array.isArray(raw[side])) {
                        out = out.concat(raw[side].map((pin) => Object.assign({ side: side }, pin || {})));
                    }
                });
                return out;
            }

            function tryParseJson(raw) {
                if (!raw) return null;
                const tries = [String(raw)];
                try { tries.push(decodeURIComponent(String(raw))); } catch (e) {}
                for (let i = 0; i < tries.length; i++) {
                    try {
                        return JSON.parse(tries[i]);
                    } catch (e2) {}
                }
                return null;
            }

            function readSymbolModel(obj, cell, styleMap) {
                const raw = (obj && (obj.dftsIP_symbolModel || obj.__cell_dftsIP_symbolModel)) ||
                    (styleMap && styleMap.dftsIP_symbolModel) ||
                    (cell && cell.dftsIP_symbolModel) || '';
                const parsed = tryParseJson(raw);
                if (parsed && Array.isArray(parsed.pins)) return parsed;
                return null;
            }

            function inferTypeFromTitle(title) {
                const t = String(title || '').trim().toUpperCase();
                if (!t) return '';
                const map = {
                    'SSN_PP': 'ssn_pipeline',
                    'SSN_RPPL': 'ssn_receiver1xpipeline',
                    'SSN_OP': 'ssn_outputpipeline',
                    'SSN_SSH': 'ssn_scanhost',
                    'SSN_MUX': 'ssn_multiplexer',
                    'SSN_BFD': 'ssn_busfrequencydivider',
                    'SSN_BFM': 'ssn_busfrequencymultiplier',
                    'SSN_FIFO': 'ssn_fifo',
                    'SSN_HI': 'ssn_host_interface',
                    'SSN_HO': 'ssn_host_interface',
                    'SSN_SI': 'ssn_slave_interface',
                    'SSN_SO': 'ssn_slave_interface',
                    'IJTAG_HI': 'ijtag_host_interface',
                    'IJTAG_HO': 'ijtag_host_interface',
                    'IJTAG_SI': 'ijtag_slave_interface',
                    'IJTAG_SO': 'ijtag_slave_interface',
                    'BISR_HI': 'bisr_host_interface',
                    'BISR_HO': 'bisr_host_interface',
                    'BISR_SI': 'bisr_slave_interface',
                    'BISR_SO': 'bisr_slave_interface',
                };
                return map[t] || '';
            }

            function getDefinitionPins(defKey, opt) {
                if (!dftsNs || !dftsNs._defsByKey || !defKey) return [];
                const def = dftsNs._defsByKey[defKey];
                if (!def) return [];
                let raw = null;
                try {
                    if (typeof def.pinsFactory === 'function') raw = def.pinsFactory(opt || {}, def);
                } catch (e) {
                    raw = null;
                }
                return flattenPins(raw);
            }

            function getEdgeStyleMap(edgeId) {
                const cell = edgeId ? (cellsById[edgeId] || objectsById[edgeId] || {}) : {};
                return parseStyle(cell.style || cell.__cell_style || '');
            }

            function getEdgeChildLabel(edgeId) {
                const kids = childrenByParent[edgeId] || [];
                for (let i = 0; i < kids.length; i++) {
                    const ch = kids[i] || {};
                    if (ch.vertex !== '1') continue;
                    const txt = normText(ch.value || '');
                    if (txt) return txt;
                }
                return '';
            }

            function inferInterfaceRole(defKey) {
                const key = String(defKey || '');
                if (/HostOutputInterface$/i.test(key)) return 'host_output';
                if (/HostInputInterface$/i.test(key)) return 'host_input';
                if (/SlaveOutputInterface$/i.test(key)) return 'slave_output';
                if (/SlaveInputInterface$/i.test(key)) return 'slave_input';
                return '';
            }

            function inferRoleFromTitle(title) {
                const t = String(title || '').trim().toUpperCase();
                if (/[_-]HO$/.test(t)) return 'host_output';
                if (/[_-]HI$/.test(t)) return 'host_input';
                if (/[_-]SO$/.test(t)) return 'slave_output';
                if (/[_-]SI$/.test(t)) return 'slave_input';
                return '';
            }

            function collectSymbolChildMeta(bodyId) {
                const kids = childrenByParent[bodyId] || [];
                const meta = { title: '', instance: '', pins: {} };
                kids.forEach((ch) => {
                    const kind = String(ch.__dftsSymbolKind || '').trim();
                    const key = String(ch.__dftsSymbolKey || '').trim();
                    if (kind === 'title') {
                        const v = normText(ch.value || '');
                        if (v) meta.title = v;
                        return;
                    }
                    if (kind === 'instance') {
                        const v = normText(ch.value || '');
                        if (v) meta.instance = v;
                        return;
                    }
                    if (!key) return;
                    const entry = meta.pins[key] || (meta.pins[key] = { pinKey: key, name: '', direction: '', pin_type: '', side: '' });
                    const style = parseStyle(ch.style || '');
                    const side = String(ch.__dftsSymbolSide || style.dftsIP_symbolSide || style.portConstraint || '').trim().toLowerCase();
                    if (side && !entry.side) entry.side = side;
                    if (kind === 'label') {
                        const name = normText(ch.value || '');
                        if (name) entry.name = name;
                    }
                });
                Object.keys(meta.pins).forEach((key) => {
                    const pin = meta.pins[key];
                    const side = String(pin.side || '').toLowerCase();
                    pin.direction = (side === 'east' || side === 'south') ? 'output' : 'input';
                    const k = String(pin.pinKey || '').toLowerCase();
                    if (k.indexOf('clock') >= 0 || k === 'tck' || k === 'clk') pin.pin_type = 'clock_in';
                    else if (k.indexOf('data') >= 0 || /\bsi\b|\bso\b/.test(k) || k.indexOf('scan') >= 0) pin.pin_type = pin.direction === 'output' ? 'data_out' : 'data_in';
                    else pin.pin_type = pin.direction === 'output' ? 'data_out' : 'data_in';
                    if (!pin.name) pin.name = pin.pinKey;
                });
                meta.pinList = Object.keys(meta.pins).map((k) => meta.pins[k]);
                return meta;
            }

            function pinPriority(pin, preferredDir, peerPin) {
                let score = 0;
                const key = String(pin.pinKey || '').toLowerCase();
                const name = String(pin.name || '').toLowerCase();
                const type = String(pin.pin_type || '').toLowerCase();
                if (pin.direction === preferredDir) score += 100;
                if (isDataPinType(type)) score += 40;
                if (preferredDir === 'output' && (/data_out|bus_data_out|scan_out|\bso\b/.test(key + ' ' + name))) score += 30;
                if (preferredDir === 'input' && (/data_in|bus_data_in|scan_in|\bsi\b/.test(key + ' ' + name))) score += 30;
                if (preferredDir === 'input' && /master_bus_data_in/.test(key + ' ' + name)) score += 26;
                if (preferredDir === 'input' && /secondary_bus_data_in/.test(key + ' ' + name)) score += 18;
                if (peerPin) {
                    const peerType = String(peerPin.pin_type || '').toLowerCase();
                    if (peerType && peerType === type) score += 12;
                    if ((peerPin.busWidth || 1) === (pin.busWidth || 1)) score += 8;
                }
                if (pin.role && /host_output|slave_output/.test(pin.role) && preferredDir === 'output') score += 50;
                if (pin.role && /host_input|slave_input/.test(pin.role) && preferredDir === 'input') score += 50;
                return score;
            }

            function normalizeInterfacePin(ip, pin) {
                if (!ip || !pin) return pin;
                const ipType = String(ip.ip_type || '').toLowerCase();
                const role = String(ip.role || '').toLowerCase();
                if (ipType.indexOf('_interface') < 0 || !role) return pin;

                const out = Object.assign({}, pin);
                const pinKey = String(out.key || out.pinKey || '').toLowerCase();
                const pinName = String(out.name || out.label || '').toLowerCase();
                const pinType = String(out.type || out.pinType || out.pin_type || '').toLowerCase();
                const token = [pinKey, pinName, pinType].join(' ');
                const isDataIn = /(^|[\s_])data_in($|[\s_])|bus_data_in|\bsi\b|scan_in/.test(token);
                const isDataOut = /(^|[\s_])data_out($|[\s_])|bus_data_out|\bso\b|scan_out/.test(token);
                const isClock = /clock|tck|\bclk\b/.test(token);

                if (/input$/.test(role)) {
                    if (isDataIn || isClock) out.direction = 'output';
                } else if (/output$/.test(role)) {
                    if (isDataOut) out.direction = 'input';
                }
                return out;
            }

            function pickBestPin(pinList, preferredDir, peerPin, forcedKey) {
                const cands = (pinList || []).filter((p) => p && p.pinKey);
                if (!cands.length) return null;
                if (forcedKey) {
                    for (let i = 0; i < cands.length; i++) {
                        if (String(cands[i].pinKey) === String(forcedKey)) return cands[i];
                    }
                }
                const ranked = cands.map((pin) => ({ pin, score: pinPriority(pin, preferredDir, peerPin) }))
                    .sort((a, b) => b.score - a.score);
                return ranked.length ? ranked[0].pin : null;
            }

            const DIRECT_PASS_TYPES = new Set([
                'ssn_pipeline',
                'ssn_fifo',
                'ssn_busfrequencydivider',
                'ssn_busfrequencymultiplier',
            ]);

            const instMap = {};
            Object.keys(cellsById).forEach((cid) => {
                const c = cellsById[cid];
                if (!c || c.vertex !== '1') return;
                const st = parseStyle(c.style || '');
                if (!isTruthy(st.dftsIP_instanceLabel)) return;
                const parent = c.parent;
                const val = normText(c.value || (objectsById[cid] && objectsById[cid].label) || '');
                if (parent && val) instMap[parent] = val;
            });

            const ips = {};

            function addIp(oid, obj, cell) {
                const st = parseStyle((obj && (obj.__cell_style || obj.style)) || (cell && cell.style) || '');
                const childMeta = collectSymbolChildMeta(oid);
                const symbolModel = readSymbolModel(obj || {}, cell || {}, st);
                const childTitle = childMeta.title || '';
                const ipType = String((obj && obj.dftsIP_type) || st.dftsIP_type || inferTypeFromTitle((symbolModel && symbolModel.title) || childTitle) || '').trim();
                const isBody = isTruthy((obj && obj.dftsIP_chipBody) || st.dftsIP_chipBody) || !!ipType;
                if (!isBody || !ipType) return;
                const label = normText((obj && (obj.label || obj.__cell_value)) || (cell && cell.value) || childTitle || '');
                const params = {};
                Object.keys(obj || {}).forEach((k) => {
                    if (k === 'id' || k === 'label' || k === 'dftsIP_type') return;
                    if (k.indexOf('__cell_') === 0) return;
                    params[k] = obj[k];
                });
                const defKey = String((obj && obj.dftsIP_defKey) || st.dftsIP_defKey || '');
                ips[oid] = {
                    id: oid,
                    ip_type: ipType,
                    inst: instMap[oid] || childMeta.instance || (symbolModel && symbolModel.instanceName) || label || oid,
                    label: childTitle || (symbolModel && symbolModel.title) || label || oid,
                    params,
                    def_key: defKey,
                    symbol_model: symbolModel,
                    role: inferInterfaceRole(defKey) || inferRoleFromTitle(childTitle || (symbolModel && symbolModel.title) || label),
                    child_pins: childMeta.pinList || [],
                };
            }

            Object.keys(objectsById).forEach((oid) => addIp(oid, objectsById[oid] || {}, cellsById[oid] || null));
            Object.keys(cellsById).forEach((cid) => { if (!ips[cid]) addIp(cid, objectsById[cid] || {}, cellsById[cid] || {}); });
            dpLog('ip_count', Object.keys(ips).length, Object.keys(ips).map((id) => ({
                id: id,
                type: ips[id].ip_type,
                label: ips[id].label,
                inst: ips[id].inst,
                role: ips[id].role,
                def_key: ips[id].def_key
            })));

            const pins = {};
            const byIp = {};

            function addPin(ip, pin, idx) {
                if (!pin) return;
                const pinKey = String(pin.key || pin.pinKey || '').trim();
                if (!pinKey) return;
                const pid = ip.id + '::' + pinKey;
                pins[pid] = {
                    id: pid,
                    name: normText(pin.name || pin.label || pinKey),
                    direction: normDir(pin.dir || pin.direction || ''),
                    pin_type: String(pin.type || pin.pinType || pin.pin_type || ''),
                    pinKey: pinKey,
                    ip_id: ip.id,
                    ip_inst: ip.inst,
                    ip_type: ip.ip_type,
                    role: ip.role || '',
                    busWidth: parseInt(pin.busWidth, 10) || 1,
                    order: typeof pin.order === 'number' ? pin.order : idx,
                };
                (byIp[ip.id] || (byIp[ip.id] = [])).push(pid);
            }

            Object.keys(ips).forEach((ipId) => {
                const ip = ips[ipId];
                let pinDefs = [];
                if (ip.symbol_model && Array.isArray(ip.symbol_model.pins) && ip.symbol_model.pins.length) {
                    pinDefs = ip.symbol_model.pins.slice();
                } else if (ip.child_pins && ip.child_pins.length) {
                    pinDefs = ip.child_pins.slice();
                } else {
                    pinDefs = getDefinitionPins(ip.def_key, Object.assign({}, ip.params || {}, {
                        bodyLabel: ip.label,
                        instanceName: ip.inst,
                        label: ip.label,
                    }));
                }
                pinDefs.forEach((pin, idx) => addPin(ip, normalizeInterfacePin(ip, pin), idx));
            });
            dpLog('pin_count', Object.keys(pins).length, Object.keys(byIp).map((ipId) => ({
                ip: ips[ipId] ? ips[ipId].label : ipId,
                type: ips[ipId] ? ips[ipId].ip_type : '',
                pins: (byIp[ipId] || []).map((pid) => ({
                    key: pins[pid].pinKey,
                    name: pins[pid].name,
                    dir: pins[pid].direction,
                    type: pins[pid].pin_type,
                    role: pins[pid].role
                }))
            })));

            if (!Object.keys(pins).length) return {};

            const adj = {};
            const radj = {};
            function addEdge(a, b) {
                if (!a || !b || !pins[a] || !pins[b]) return;
                (adj[a] || (adj[a] = [])).push(b);
                (radj[b] || (radj[b] = [])).push(a);
            }

            function findPinsByIp(ipId, predicate) {
                return (byIp[ipId] || []).filter((pid) => predicate(pins[pid]));
            }

            function findPinByKey(ipId, pinKey) {
                const plist = byIp[ipId] || [];
                for (let i = 0; i < plist.length; i++) {
                    const p = pins[plist[i]];
                    if (String(p.pinKey) === String(pinKey)) return p;
                }
                return null;
            }

            function getLinkRecord(edge) {
                const st = getEdgeStyleMap(edge && edge.id);
                const label = getEdgeChildLabel(edge && edge.id);
                return {
                    srcBodyId: String(st.dftLink_srcBodyId || ''),
                    srcPinKey: String(st.dftLink_srcPinKey || ''),
                    dstBodyId: String(st.dftLink_dstBodyId || ''),
                    dstPinKey: String(st.dftLink_dstPinKey || ''),
                    edgeLabel: String(label || ''),
                };
            }

            edgeCells.forEach((e) => {
                const s = e.source;
                const t = e.target;
                if (!s || !t || !ips[s] || !ips[t]) return;

                const link = getLinkRecord(e);
                const srcPins = findPinsByIp(s, () => true).map((pid) => pins[pid]);
                const dstPins = findPinsByIp(t, () => true).map((pid) => pins[pid]);
                const hintedKey = String(link.edgeLabel || '').trim();
                const srcPin = findPinByKey(link.srcBodyId || s, link.srcPinKey) || pickBestPin(srcPins, 'output', null, link.srcPinKey);
                const dstPin = findPinByKey(link.dstBodyId || t, link.dstPinKey) ||
                    findPinByKey(link.dstBodyId || t, hintedKey) ||
                    pickBestPin(dstPins, 'input', srcPin, link.dstPinKey || hintedKey);
                dpLog('edge_resolve', {
                    edge: e.id,
                    source: ips[s] ? ips[s].label : s,
                    target: ips[t] ? ips[t].label : t,
                    srcPinKey: link.srcPinKey,
                    dstPinKey: link.dstPinKey,
                    edgeLabel: link.edgeLabel,
                    chosenSrc: srcPin ? srcPin.pinKey : '',
                    chosenDst: dstPin ? dstPin.pinKey : ''
                });
                if (srcPin && dstPin) addEdge(srcPin.id, dstPin.id);
            });

            function findByName(cands, name) {
                for (let i = 0; i < cands.length; i++) {
                    const pin = pins[cands[i]];
                    if (!pin) continue;
                    if (pin.name === name || pin.pinKey === name) return cands[i];
                }
                return null;
            }

            function buildVirtualEdgesForIp(ipType, inPins, outPins) {
                const ipt = String(ipType || '').toLowerCase();
                const out = [];
                if (ipt === 'ssn_slave_interface' || ipt === 'ssn_host_interface' || ipt === 'ijtag_host_interface' || ipt === 'ijtag_slave_interface' || ipt === 'bisr_host_interface' || ipt === 'bisr_slave_interface') {
                    return out;
                }
                if (ipt === 'ssn_scanhost') {
                    const a = findByName(inPins, 'bus_data_in');
                    const b = findByName(outPins, 'bus_data_out');
                    if (a && b) out.push([a, b]);
                    return out;
                }
                if (ipt === 'ssn_multiplexer') {
                    ['master_bus_data_in', 'secondary_bus_data_in'].forEach((n) => {
                        const a = findByName(inPins, n);
                        const b = findByName(outPins, 'bus_data_out');
                        if (a && b) out.push([a, b]);
                    });
                    return out;
                }
                inPins.forEach((i) => outPins.forEach((o) => out.push([i, o])));
                return out;
            }

            Object.keys(byIp).forEach((ipId) => {
                const plist = byIp[ipId] || [];
                const inPins = plist.filter((pid) => pins[pid].direction === 'input' && isDataPinType(pins[pid].pin_type));
                const outPins = plist.filter((pid) => pins[pid].direction === 'output' && isDataPinType(pins[pid].pin_type));
                buildVirtualEdgesForIp(ips[ipId].ip_type, inPins, outPins).forEach(([i, o]) => addEdge(i, o));
            });
            dpLog('graph_edges', Object.keys(adj).map((pid) => ({
                from: pins[pid] ? (pins[pid].ip_inst + '.' + pins[pid].pinKey) : pid,
                to: (adj[pid] || []).map((nid) => pins[nid] ? (pins[nid].ip_inst + '.' + pins[nid].pinKey) : nid)
            })));

            function pinsToIpPath(pinPath) {
                const out = [];
                let lastIp = null;
                for (let i = 0; i < pinPath.length; i++) {
                    const pid = pinPath[i];
                    const ipId = pins[pid].ip_id;
                    if (ipId !== lastIp) {
                        out.push([ipId, pins[pid].ip_inst, pins[pid].ip_type]);
                        lastIp = ipId;
                    }
                }
                return out;
            }

            function findShortestPathBlockingSlaves(start, goal) {
                const q = [start];
                const prev = {};
                prev[start] = null;
                for (let qi = 0; qi < q.length; qi++) {
                    const u = q[qi];
                    if (u === goal) break;
                    const nexts = adj[u] || [];
                    for (let i = 0; i < nexts.length; i++) {
                        const v = nexts[i];
                        if (Object.prototype.hasOwnProperty.call(prev, v)) continue;
                        if (v !== goal && String(pins[v].role || '').indexOf('slave_') === 0) continue;
                        prev[v] = u;
                        q.push(v);
                    }
                }
                if (!Object.prototype.hasOwnProperty.call(prev, goal)) return null;
                const path = [];
                let cur = goal;
                while (cur != null) {
                    path.push(cur);
                    cur = prev[cur];
                }
                path.reverse();
                return path;
            }

            function findShortestPathBetweenSlaves(start, goal) {
                const q = [start];
                const prev = {};
                prev[start] = null;
                for (let qi = 0; qi < q.length; qi++) {
                    const u = q[qi];
                    if (u === goal) break;
                    const nexts = adj[u] || [];
                    for (let i = 0; i < nexts.length; i++) {
                        const v = nexts[i];
                        if (Object.prototype.hasOwnProperty.call(prev, v)) continue;
                        const role = String(pins[v].role || '');
                        const midType = String(pins[v].ip_type || '').toLowerCase();
                        if (v !== goal && role.indexOf('slave_') === 0) continue;
                        if (v !== goal && !DIRECT_PASS_TYPES.has(midType) && midType !== 'ssn_outputpipeline' && midType !== 'ssn_scanhost' && midType !== 'ssn_multiplexer') continue;
                        prev[v] = u;
                        q.push(v);
                    }
                }
                if (!Object.prototype.hasOwnProperty.call(prev, goal)) return null;
                const path = [];
                let cur = goal;
                while (cur != null) {
                    path.push(cur);
                    cur = prev[cur];
                }
                path.reverse();
                return path;
            }

            function orderedUniqueReversedIpIds(ipPath) {
                const seen = {};
                const out = [];
                for (let i = ipPath.length - 1; i >= 0; i--) {
                    const ipId = ipPath[i][0];
                    if (seen[ipId]) continue;
                    seen[ipId] = true;
                    out.push(ipId);
                }
                return out;
            }

            function makeNode(ipId) {
                const ip = ips[ipId];
                return {
                    type: ip.ip_type,
                    instance_name: ip.inst,
                    params: Object.assign({}, ip.params || {}),
                };
            }

            function chooseBackwardPred(cur, stopTypes, visited) {
                const preds = (radj[cur] || []).filter((pid) => !visited[pid]);
                if (!preds.length) return null;
                preds.sort((a, b) => {
                    const ap = pins[a], bp = pins[b];
                    const as = pinPriority(ap, 'output', pins[cur]);
                    const bs = pinPriority(bp, 'output', pins[cur]);
                    return bs - as;
                });
                for (let i = 0; i < preds.length; i++) {
                    const pid = preds[i];
                    const p = pins[pid];
                    if (stopTypes[String(p.ip_type || '').toLowerCase()]) continue;
                    return pid;
                }
                return preds[0] || null;
            }

            function chainIpIdsFromInputPinBackward(startInputPin, stopTypes, maxSteps) {
                const stop = {};
                (stopTypes || []).forEach((t) => { stop[String(t || '').toLowerCase()] = true; });
                const out = [];
                let cur = startInputPin;
                const visited = {};
                visited[cur] = true;
                let steps = 0;
                while (steps < maxSteps) {
                    steps += 1;
                    const nxt = chooseBackwardPred(cur, stop, visited);
                    if (!nxt) break;
                    visited[nxt] = true;
                    const np = pins[nxt];
                    if (stop[String(np.ip_type || '').toLowerCase()]) break;
                    if (String(np.role || '').indexOf('slave_') === 0) break;
                    const ipId = np.ip_id;
                    if (!out.length || out[out.length - 1] !== ipId) out.push(ipId);
                    cur = nxt;
                }
                return out;
            }

            function followBranchFromOutputEdge(startOutputPin, firstNode, maxSteps) {
                const chain = [];
                let cur = firstNode;
                const visited = {};
                visited[startOutputPin] = true;
                visited[firstNode] = true;
                if (String(pins[cur].role || '').indexOf('slave_') !== 0) chain.push(pins[cur].ip_id);
                let steps = 0;
                while (steps < maxSteps) {
                    steps += 1;
                    const nxts = adj[cur] || [];
                    if (!nxts.length) break;
                    const nxt = nxts[0];
                    if (visited[nxt]) break;
                    visited[nxt] = true;
                    if (String(pins[nxt].role || '').indexOf('slave_') === 0) break;
                    const ipId = pins[nxt].ip_id;
                    if (!chain.length || chain[chain.length - 1] !== ipId) chain.push(ipId);
                    cur = nxt;
                }
                return chain;
            }

            function buildSmuxSecondary(ipId) {
                const ip = ips[ipId];
                if (!ip || String(ip.ip_type || '').toLowerCase() !== 'ssn_multiplexer') return null;
                const secPin = findPinByKey(ipId, 'secondary_bus_data_in');
                if (!secPin) return null;
                const chain = chainIpIdsFromInputPinBackward(secPin.id, ['ssn_slave_interface'], 128);
                if (!chain.length) return null;
                const out = {};
                chain.forEach((cid) => { out[ips[cid].inst] = makeNode(cid); });
                return Object.keys(out).length ? out : null;
            }

            function buildExtraOutputPaths(ipId, mainPinPath) {
                const used = {};
                for (let i = 0; i < mainPinPath.length - 1; i++) used[mainPinPath[i] + '::' + mainPinPath[i + 1]] = true;
                const outputPins = Object.keys(pins).filter((pid) => pins[pid].ip_id === ipId && pins[pid].direction === 'output' && isDataPinType(pins[pid].pin_type));
                const extraList = [];
                outputPins.forEach((op) => {
                    (adj[op] || []).forEach((v) => {
                        if (used[op + '::' + v]) return;
                        const branch = followBranchFromOutputEdge(op, v, 256);
                        if (!branch.length) return;
                        const branchObj = {};
                        branch.forEach((cid) => {
                            const inst = ips[cid].inst;
                            if (!branchObj[inst]) branchObj[inst] = makeNode(cid);
                        });
                        if (Object.keys(branchObj).length) extraList.push(branchObj);
                    });
                });
                return extraList.length ? extraList : null;
            }

            function buildMainOrder(ipPath, mainPinPath) {
                const order = {};
                orderedUniqueReversedIpIds(ipPath).forEach((ipId) => {
                    const node = makeNode(ipId);
                    const smuxSecondary = buildSmuxSecondary(ipId);
                    if (smuxSecondary) node.smux_secondary = smuxSecondary;
                    const extra = buildExtraOutputPaths(ipId, mainPinPath);
                    if (extra) node.ExtraOutputPath = extra;
                    order[ips[ipId].inst] = node;
                });
                return order;
            }

            function buildSimpleReversedOrder(ipPath) {
                const order = {};
                orderedUniqueReversedIpIds(ipPath).forEach((ipId) => { order[ips[ipId].inst] = makeNode(ipId); });
                return order;
            }

            function makeDatapathObject(pinPath, main) {
                const ipPath = pinsToIpPath(pinPath);
                return {
                    pin_path: pinPath.map((pid) => ({
                        pin_id: pins[pid].id,
                        pin_name: pins[pid].name,
                        pin_io: pins[pid].direction,
                        ip: pins[pid].ip_inst,
                        ip_type: pins[pid].ip_type,
                    })),
                    ip_path: ipPath.map(([ipId]) => ({
                        ip_id: ips[ipId].id,
                        ip: ips[ipId].inst,
                        ip_type: ips[ipId].ip_type,
                    })),
                    order: main ? buildMainOrder(ipPath, pinPath) : buildSimpleReversedOrder(ipPath),
                    connections: {},
                };
            }

            function findClockPinNameByIp(ipId) {
                const cands = byIp[ipId] || [];
                for (let i = 0; i < cands.length; i++) {
                    const p = pins[cands[i]];
                    const pt = String(p.pin_type || '').toLowerCase();
                    const nm = String(p.name || '').toLowerCase();
                    if (isClockPinType(pt) || nm.indexOf('clock') >= 0) return p.name;
                }
                return '';
            }

            function outDegree(pid) {
                return (adj[pid] || []).length;
            }

            function inDegree(pid) {
                return (radj[pid] || []).length;
            }

            function isHostEntryPin(p) {
                if (!p) return false;
                const pt = String(p.pin_type || '').toLowerCase();
                if (!isDataPinType(pt)) return false;
                return outDegree(p.id) > 0;
            }

            function isHostExitPin(p) {
                if (!p) return false;
                const pt = String(p.pin_type || '').toLowerCase();
                if (!isDataPinType(pt)) return false;
                return inDegree(p.id) > 0;
            }

            const entryPins = [];
            const exitPins = [];
            Object.keys(pins).forEach((pid) => {
                const p = pins[pid];
                if (String(p.ip_type || '').toLowerCase() !== 'ssn_host_interface') return;
                if (isHostEntryPin(p)) entryPins.push(pid);
                if (isHostExitPin(p)) exitPins.push(pid);
            });
            dpLog('host_entry_pins', entryPins.map((pid) => ({
                pin: pid,
                label: pins[pid].name,
                inst: pins[pid].ip_inst,
                indeg: inDegree(pid),
                outdeg: outDegree(pid),
                role: pins[pid].role
            })));
            dpLog('host_exit_pins', exitPins.map((pid) => ({
                pin: pid,
                label: pins[pid].name,
                inst: pins[pid].ip_inst,
                indeg: inDegree(pid),
                outdeg: outDegree(pid),
                role: pins[pid].role
            })));
            if (!entryPins.length || !exitPins.length) return {};

            let ep = entryPins[0];
            let xp = exitPins[0];
            let mainPinPath = findShortestPathBlockingSlaves(ep, xp);
            let bestScore = mainPinPath && mainPinPath.length ? mainPinPath.length : 0;
            entryPins.forEach((entryPid) => {
                exitPins.forEach((exitPid) => {
                    if (entryPid === exitPid) return;
                    const cand = findShortestPathBlockingSlaves(entryPid, exitPid);
                    if (!cand || !cand.length) return;
                    if (cand.length > bestScore) {
                        ep = entryPid;
                        xp = exitPid;
                        mainPinPath = cand;
                        bestScore = cand.length;
                    }
                });
            });
            dpLog('main_path', {
                entry: ep,
                exit: xp,
                path: (mainPinPath || []).map((pid) => pins[pid] ? (pins[pid].ip_inst + '.' + pins[pid].pinKey) : pid)
            });
            if (!mainPinPath || !mainPinPath.length) return {};

            const out = {};
            out.DATAPATH0 = makeDatapathObject(mainPinPath, true);
            out.DATAPATH0.connections.bus_data_in = pins[ep].name;
            out.DATAPATH0.connections.bus_data_out = pins[xp].name;
            out.DATAPATH0.connections.bus_clock_in = findClockPinNameByIp(pins[ep].ip_id) || findClockPinNameByIp(pins[xp].ip_id);
            out.DATAPATH0.output_bus_width = widthFromName(pins[xp].name) || widthFromName(pins[ep].name);

            const slaveIn = [];
            const slaveOut = [];
            Object.keys(pins).forEach((pid) => {
                const p = pins[pid];
                if (String(p.ip_type || '').toLowerCase() !== 'ssn_slave_interface') return;
                const pt = String(p.pin_type || '').toLowerCase();
                if (inDegree(pid) > 0 && isDataPinType(pt)) slaveIn.push(pid);
                else if (p.role === 'slave_input') slaveIn.push(pid);
                if (outDegree(pid) > 0 && isDataPinType(pt)) slaveOut.push(pid);
                else if (p.role === 'slave_output') slaveOut.push(pid);
            });
            dpLog('slave_in_pins', slaveIn.map((pid) => ({
                pin: pid,
                label: pins[pid].name,
                inst: pins[pid].ip_inst,
                indeg: inDegree(pid),
                outdeg: outDegree(pid),
                role: pins[pid].role
            })));
            dpLog('slave_out_pins', slaveOut.map((pid) => ({
                pin: pid,
                label: pins[pid].name,
                inst: pins[pid].ip_inst,
                indeg: inDegree(pid),
                outdeg: outDegree(pid),
                role: pins[pid].role
            })));

            const segCandidates = [];
            slaveOut.forEach((so) => {
                let best = null;
                let bestLen = Number.MAX_SAFE_INTEGER;
                slaveIn.forEach((si) => {
                    if (pins[so].ip_id === pins[si].ip_id) return;
                    const path = findShortestPathBetweenSlaves(so, si);
                    if (path && path.length < bestLen) {
                        best = { so, si, path };
                        bestLen = path.length;
                    }
                });
                if (best) segCandidates.push(best);
            });

            const seenSeg = {};
            const segPaths = [];
            segCandidates.forEach((x) => {
                const key = pins[x.so].ip_id + '::' + pins[x.si].ip_id;
                if (seenSeg[key]) return;
                seenSeg[key] = true;
                segPaths.push(x);
            });
            segPaths.sort((a, b) => {
                const ak = String(pins[a.so].ip_inst || '') + '::' + String(pins[a.si].ip_inst || '');
                const bk = String(pins[b.so].ip_inst || '') + '::' + String(pins[b.si].ip_inst || '');
                return ak < bk ? -1 : (ak > bk ? 1 : 0);
            });

            segPaths.forEach((x, idx) => {
                const key = 'DATAPATH' + String(idx + 1);
                const dp = makeDatapathObject(x.path, false);
                dp.connections.bus_data_in = pins[x.so].name;
                dp.connections.bus_data_out = pins[x.si].name;
                dp.connections.bus_clock_in = findClockPinNameByIp(pins[x.so].ip_id) || findClockPinNameByIp(pins[x.si].ip_id);
                dp.output_bus_width = widthFromName(pins[x.si].name) || widthFromName(pins[x.so].name);
                out[key] = dp;
            });

            dpLog('datapath_keys', Object.keys(out));
            dpLog('datapath_out', out);

            return out;
        }

        // -----------------------------
        // YAML printer
        // -----------------------------
        function toYAML(data) {
            function isPlainObject(obj) {
                return obj && typeof obj === 'object' && !Array.isArray(obj) && obj.constructor === Object;
            }

            function escapeString(str) {
                if (typeof str !== 'string') return String(str);

                // Escape special characters and handle multi-line strings
                if (str.includes('\n') || str.includes('"') || str.includes("'") || str.includes('#')) {
                    return `"${str.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
                }
                return str;
            }

            function emit(obj, indent = 0) {
                const spaces = ' '.repeat(indent);
                const lines = [];

                if (isPlainObject(obj)) {
                    Object.entries(obj).forEach(([key, value]) => {
                        const escapedKey = typeof key === 'string' ? key : String(key);

                        if (value === null || value === undefined) {
                            lines.push(`${spaces}${escapedKey}: null`);
                        } else if (isPlainObject(value)) {
                            lines.push(`${spaces}${escapedKey}:`);
                            lines.push(...emit(value, indent + 2));
                        } else if (Array.isArray(value)) {
                            if (value.length === 0) {
                                lines.push(`${spaces}${escapedKey}: []`);
                            } else {
                                lines.push(`${spaces}${escapedKey}:`);
                                value.forEach(item => {
                                    if (isPlainObject(item) || Array.isArray(item)) {
                                        lines.push(`${spaces}  -`);
                                        const nestedLines = emit(item, indent + 4);
                                        lines.push(...nestedLines);
                                    } else {
                                        const formattedValue = escapeString(item);
                                        lines.push(`${spaces}  - ${formattedValue}`);
                                    }
                                });
                            }
                        } else {
                            const formattedValue = escapeString(value);
                            lines.push(`${spaces}${escapedKey}: ${formattedValue}`);
                        }
                    });
                } else if (Array.isArray(obj)) {
                    obj.forEach(item => {
                        if (isPlainObject(item) || Array.isArray(item)) {
                            lines.push(`${spaces}-`);
                            const nestedLines = emit(item, indent + 2);
                            lines.push(...nestedLines);
                        } else {
                            const formattedValue = escapeString(item);
                            lines.push(`${spaces}- ${formattedValue}`);
                        }
                    });
                } else {
                    const formattedValue = escapeString(obj);
                    lines.push(`${spaces}${formattedValue}`);
                }

                return lines;
            }

            try {
                if (data === undefined || data === null) {
                    return data === null ? "null\n" : "\n";
                }
                return emit(data).join("\n") + "\n";
            } catch (error) {
                throw new Error(`Failed to convert to YAML: ${error.message}`);
            }
        }

        // -----------------------------
        // Main entry
        // -----------------------------
        function parseDrawio(docRoot) {
            const ctx = parseGraph(docRoot);
            const out = {};
            out["#yaml"] = "DFT_SPEC";
            const taps = parseTaps(ctx);
            if (taps && Object.keys(taps).length) out.MGC_IJTAG_INS_SPEC = taps;

            const bisr = parseAllBISR(ctx);
            if (bisr && Object.keys(bisr).length) out.MGC_REPAIR_INS_SPEC = bisr;

            const lbistcrl = parseAllLBIST(ctx);
            if (lbistcrl && Object.keys(lbistcrl).length) out.MGC_LBIST_INS_SPEC = lbistcrl;

            const dmaist = parseAllDMAIST(ctx);
            if (dmaist && Object.keys(dmaist).length) out.MGC_IST_INS_SPEC = dmaist;

            const occctrl = parseAllOCC(ctx);
            if (occctrl && Object.keys(occctrl).length) out.MGC_OCC_INS_SPEC = occctrl;

            const chainctrl = parseAllCHAIN(ctx);
            if (chainctrl && Object.keys(chainctrl).length) out.MGC_SCAN_INS_SPEC = chainctrl;

            const MGC_SCAN_DATA_SPEC = {};
            let dp = parseDatapathV2(ctx);
            console.log('[parseDrawio] parseDatapathV2 keys:', dp ? Object.keys(dp) : []);
            if (!dp || !Object.keys(dp).length) dp = parseDatapath(ctx);
            console.log('[parseDrawio] fallback parseDatapath keys:', dp ? Object.keys(dp) : []);
            if (dp && Object.keys(dp).length) MGC_SCAN_DATA_SPEC.DATAPATH = dp;

            const instr = parseEdtAndScanhost(ctx);
            console.log('[parseDrawio] parseEdtAndScanhost keys:', instr ? Object.keys(instr) : []);
            if ((instr.EDT && Object.keys(instr.EDT).length) || (instr.SCAN_HOST && Object.keys(instr.SCAN_HOST).length) || (instr.SCAN_HOST && Object.keys(instr.FIFO).length) || (instr.SCAN_HOST && Object.keys(instr.BFM).length) || (instr.SCAN_HOST && Object.keys(instr.BFD).length)) {
                MGC_SCAN_DATA_SPEC.INSTRUMENTS = {};
                if (instr.EDT && Object.keys(instr.EDT).length) MGC_SCAN_DATA_SPEC.INSTRUMENTS.EDT = instr.EDT;
                if (instr.BFM && Object.keys(instr.BFM).length) MGC_SCAN_DATA_SPEC.INSTRUMENTS.BFM = instr.BFM;
                if (instr.BFD && Object.keys(instr.BFD).length) MGC_SCAN_DATA_SPEC.INSTRUMENTS.BFD = instr.BFD;
                if (instr.FIFO && Object.keys(instr.FIFO).length) MGC_SCAN_DATA_SPEC.INSTRUMENTS.FIFO = instr.FIFO;
                if (instr.SCAN_HOST && Object.keys(instr.SCAN_HOST).length) MGC_SCAN_DATA_SPEC.INSTRUMENTS.SCAN_HOST = instr.SCAN_HOST;
            }

            console.log('[parseDrawio] MGC_SCAN_DATA_SPEC keys:', Object.keys(MGC_SCAN_DATA_SPEC));
            if (Object.keys(MGC_SCAN_DATA_SPEC).length) out.MGC_SCAN_DATA_SPEC = MGC_SCAN_DATA_SPEC;

            return out;
        }

        const data = parseDrawio(root);
        return toYAML(data);
    } catch (e) {
        console.error("convertXmlToyaml error:", e);
        return "";
    }
}
