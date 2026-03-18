
// =======================
// 安装入口
// =======================
(function () {
    function getPageDebugName(page) {
        if (!page) return "(null)";
        var name = "";
        try {
            name = typeof page.getName === "function" ? page.getName() : (page.name || "");
        } catch (e) { }
        var id = "";
        try {
            id = typeof page.getId === "function" ? page.getId() : (page.id || "");
        } catch (e2) { }
        return (name || "(unnamed)") + (id ? (" [" + id + "]") : "");
    }

    function summarizeUndoState(state) {
        var history = (state && state.history) || [];
        var edits = [];
        for (var i = 0; i < history.length; i++) {
            var edit = history[i];
            var changes = edit && edit.changes ? edit.changes : [];
            edits.push(changes.length);
        }
        return {
            size: history.length,
            indexOfNextAdd: state && typeof state.indexOfNextAdd === "number" ? state.indexOfNextAdd : 0,
            changeCounts: edits
        };
    }

    function logUndoDebug(stage, page, state, extra) {
        var payload = {
            stage: stage,
            page: getPageDebugName(page),
            summary: summarizeUndoState(state)
        };
        if (extra) {
            for (var key in extra) {
                if (Object.prototype.hasOwnProperty.call(extra, key)) payload[key] = extra[key];
            }
        }
        console.log("[dft-undo-debug]", payload);
    }

    function summarizeEdit(edit) {
        var changes = edit && edit.changes ? edit.changes : [];
        var parts = [];
        for (var i = 0; i < changes.length; i++) {
            var change = changes[i];
            var type = (change && change.constructor && change.constructor.name) || typeof change;
            var cell = change && change.cell ? change.cell : null;
            parts.push({
                index: i,
                type: type,
                cellId: cell && cell.id ? cell.id : null,
                cellValue: cell && cell.value != null ? String(cell.value) : null
            });
        }
        return parts;
    }

    function isPageSwitchChange(change) {
        if (!change) return false;
        var ctorName = (change.constructor && change.constructor.name) || "";
        return ctorName === "SelectPage";
    }

    function isPageSwitchEdit(edit) {
        if (!edit) return false;
        if (edit.ignoreEdit === true) return true;
        var changes = edit.changes || [];
        if (!changes.length) return false;
        for (var i = 0; i < changes.length; i++) {
            if (!isPageSwitchChange(changes[i])) return false;
        }
        return true;
    }

    function sanitizeUndoState(state) {
        var next = state || { history: [], indexOfNextAdd: 0 };
        var history = next.history || [];
        var filtered = [];
        var removedBeforeCursor = 0;
        for (var i = 0; i < history.length; i++) {
            if (isPageSwitchEdit(history[i])) {
                if (i < (next.indexOfNextAdd || 0)) removedBeforeCursor++;
                continue;
            }
            filtered.push(history[i]);
        }
        var nextIndex = (typeof next.indexOfNextAdd === "number" ? next.indexOfNextAdd : history.length) - removedBeforeCursor;
        if (nextIndex < 0) nextIndex = 0;
        if (nextIndex > filtered.length) nextIndex = filtered.length;
        return {
            history: filtered,
            indexOfNextAdd: nextIndex
        };
    }

    function cloneUndoState(undoManager) {
        if (!undoManager) return { history: [], indexOfNextAdd: 0 };
        return sanitizeUndoState({
            history: (undoManager.history || []).slice(),
            indexOfNextAdd: typeof undoManager.indexOfNextAdd === "number"
                ? undoManager.indexOfNextAdd
                : ((undoManager.history || []).length)
        });
    }

    function applyUndoState(undoManager, state) {
        if (!undoManager) return;
        var next = sanitizeUndoState(state || { history: [], indexOfNextAdd: 0 });
        undoManager.history = (next.history || []).slice();
        undoManager.indexOfNextAdd = typeof next.indexOfNextAdd === "number"
            ? next.indexOfNextAdd
            : undoManager.history.length;
        if (typeof mxEventObject !== "undefined" && typeof mxEvent !== "undefined") {
            undoManager.fireEvent(new mxEventObject(mxEvent.CLEAR));
        }
    }

    function installPerPageUndoIsolation(ui) {
        if (!ui || ui.__dftPerPageUndoInstalled || !ui.editor || !ui.editor.undoManager || typeof ui.selectPage !== "function") {
            return;
        }

        ui.__dftPerPageUndoInstalled = true;

        var undoManager = ui.editor.undoManager;
        if (ui.currentPage && !ui.currentPage.__dftUndoState) {
            ui.currentPage.__dftUndoState = cloneUndoState(undoManager);
            logUndoDebug("bootstrap-current-page", ui.currentPage, ui.currentPage.__dftUndoState);
        }

        var oldSelectPage = ui.selectPage;
        ui.selectPage = function (page, noUndo, viewState) {
            var prevPage = this.currentPage;

            if (!page || page === prevPage) {
                return oldSelectPage.apply(this, arguments);
            }

            if (prevPage) {
                prevPage.__dftUndoState = cloneUndoState(this.editor.undoManager);
                logUndoDebug("save-before-select", prevPage, prevPage.__dftUndoState, {
                    targetPage: getPageDebugName(page),
                    requestedNoUndo: !!noUndo
                });
            }

            // Page switching should not be part of the undo history.
            var result = oldSelectPage.call(this, page, true, viewState);

            if (this.currentPage && !this.currentPage.__dftUndoState) {
                this.currentPage.__dftUndoState = { history: [], indexOfNextAdd: 0 };
                logUndoDebug("init-empty-target-state", this.currentPage, this.currentPage.__dftUndoState, {
                    previousPage: getPageDebugName(prevPage)
                });
            }

            applyUndoState(this.editor.undoManager, this.currentPage && this.currentPage.__dftUndoState);
            logUndoDebug("restore-after-select", this.currentPage, this.currentPage && this.currentPage.__dftUndoState, {
                previousPage: getPageDebugName(prevPage)
            });
            return result;
        };

        if (!ui.__dftUndoDebugWrapped) {
            ui.__dftUndoDebugWrapped = true;

            var oldUndoableEditHappened = undoManager.undoableEditHappened;
            if (typeof oldUndoableEditHappened === "function") {
                undoManager.undoableEditHappened = function (edit) {
                    if (isPageSwitchEdit(edit)) {
                        console.log("[dft-undo-debug]", {
                            stage: "skip-page-switch-edit",
                            page: getPageDebugName(ui.currentPage),
                            details: summarizeEdit(edit)
                        });
                        return;
                    }
                    console.log("[dft-undo-debug]", {
                        stage: "edit-pushed",
                        page: getPageDebugName(ui.currentPage),
                        details: summarizeEdit(edit),
                        before: summarizeUndoState(cloneUndoState(this))
                    });
                    var result = oldUndoableEditHappened.apply(this, arguments);
                    if (ui.currentPage) {
                        ui.currentPage.__dftUndoState = cloneUndoState(this);
                    }
                    console.log("[dft-undo-debug]", {
                        stage: "edit-pushed-after",
                        page: getPageDebugName(ui.currentPage),
                        after: summarizeUndoState(cloneUndoState(this))
                    });
                    return result;
                };
            }

            var oldUndo = ui.undo;
            if (typeof oldUndo === "function") {
                ui.undo = function () {
                    var currentPage = this.currentPage;
                    if (currentPage && currentPage.__dftUndoState) {
                        applyUndoState(this.editor.undoManager, currentPage.__dftUndoState);
                        logUndoDebug("restore-current-page-before-undo", currentPage, currentPage.__dftUndoState);
                    }
                    logUndoDebug("before-undo", currentPage, cloneUndoState(this.editor.undoManager));
                    var result = oldUndo.apply(this, arguments);
                    if (currentPage) {
                        currentPage.__dftUndoState = cloneUndoState(this.editor.undoManager);
                    }
                    logUndoDebug("after-undo", this.currentPage, cloneUndoState(this.editor.undoManager));
                    return result;
                };
            }

            var oldRedo = ui.redo;
            if (typeof oldRedo === "function") {
                ui.redo = function () {
                    var currentPage = this.currentPage;
                    if (currentPage && currentPage.__dftUndoState) {
                        applyUndoState(this.editor.undoManager, currentPage.__dftUndoState);
                        logUndoDebug("restore-current-page-before-redo", currentPage, currentPage.__dftUndoState);
                    }
                    logUndoDebug("before-redo", currentPage, cloneUndoState(this.editor.undoManager));
                    var result = oldRedo.apply(this, arguments);
                    if (currentPage) {
                        currentPage.__dftUndoState = cloneUndoState(this.editor.undoManager);
                    }
                    logUndoDebug("after-redo", this.currentPage, cloneUndoState(this.editor.undoManager));
                    return result;
                };
            }
        }
    }

    function getPhase1(ui) {
        return ui && ui._phase1 ? ui._phase1 : null;
    }

    function ensurePanelState(ui) {
        var phase1 = getPhase1(ui);
        if (!phase1 || !phase1.state) return null;
        var st = phase1.state;
        if (st.flowNavVisible == null) st.flowNavVisible = true;
        if (st.contextVisible == null) st.contextVisible = true;
        if (st.dockVisible == null) st.dockVisible = (Number(st.dockHeight) || 0) > 0;
        if (!st._lastDockHeight || st._lastDockHeight < (st.minDockHeight || 120)) {
            st._lastDockHeight = (Number(st.dockHeight) || 0) > 0 ? Number(st.dockHeight) : 220;
        }
        return st;
    }

    function applyPanelLayout(ui) {
        var phase1 = getPhase1(ui);
        var st = ensurePanelState(ui);
        if (!phase1 || !st) return false;

        var flow = phase1.flowNavContainer;
        var context = phase1.contextShell;
        var contextSplitter = phase1.contextSplitter;

        if (flow) {
            flow.style.display = st.flowNavVisible === false ? "none" : "";
            if (st.flowNavCollapsed) {
                if ((flow.className || "").indexOf("phase1-flow-mini") < 0) flow.className += " phase1-flow-mini";
                st.flowNavWidth = st.minFlowCollapsed || 56;
            } else {
                flow.className = (flow.className || "").replace(/\s?phase1-flow-mini/g, "");
            }
        }
        if (context) {
            context.style.display = st.contextVisible === false ? "none" : "";
        }
        if (contextSplitter) {
            contextSplitter.style.display = st.contextVisible === false ? "none" : "";
        }

        ensureContextToggle(ui);
        ensureDockToggle(ui);

        if (st.dockVisible === false) {
            if ((Number(st.dockHeight) || 0) > 0) st._lastDockHeight = st.dockHeight;
            st.dockHeight = 0;
        } else if ((Number(st.dockHeight) || 0) <= 0) {
            st.dockHeight = st._lastDockHeight || 220;
        }

        return true;
    }

    function ensureContextToggle(ui) {
        var phase1 = getPhase1(ui);
        var st = ensurePanelState(ui);
        if (!phase1 || !st || !phase1.topArea || !phase1.contextShell) return null;

        if (!document.getElementById("dft-panel-runtime-style")) {
            var style = document.createElement("style");
            style.id = "dft-panel-runtime-style";
            style.textContent = '' +
                '.dft-context-edge-toggle{position:absolute;top:50%;transform:translateY(-50%);left:-18px;width:18px;height:64px;border:1px solid #d7dce3;border-right:0;border-radius:10px 0 0 10px;background:#f8fafc;color:#6b7280;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;line-height:1;z-index:3;box-shadow:0 2px 6px rgba(0,0,0,.05);}' +
                '.dft-context-edge-toggle:hover{background:#eef2f7;color:#111827;}';
            document.head.appendChild(style);
        }

        var btn = phase1.__dftContextToggle;
        if (!btn || btn.parentNode !== phase1.topArea) {
            btn = document.createElement("div");
            btn.className = "dft-context-edge-toggle";
            btn.title = "Hide / Show Context Panel";
            btn.onmousedown = function (evt) {
                evt = evt || window.event;
                if (evt.preventDefault) evt.preventDefault();
                if (window.DFTPanelRuntime) window.DFTPanelRuntime.toggle(ui, "context");
                return false;
            };
            phase1.topArea.style.position = phase1.topArea.style.position || "relative";
            phase1.topArea.appendChild(btn);
            phase1.__dftContextToggle = btn;
        }

        btn.textContent = st.contextVisible === false ? ">" : "<";
        btn.title = st.contextVisible === false ? "Show Context Panel" : "Hide Context Panel";
        var rightOffset = st.contextVisible === false ? 0 : ((phase1.contextShell.offsetWidth || st.contextWidth || 260) + 6);
        btn.style.left = "auto";
        btn.style.right = rightOffset + "px";
        btn.style.display = "";
        return btn;
    }

    function ensureDockToggle(ui) {
        var phase1 = getPhase1(ui);
        var st = ensurePanelState(ui);
        if (!phase1 || !st || !phase1.rightHost || !phase1.dockShell || !phase1.dockSplitter || !phase1.statusShell) return null;

        if (!document.getElementById("dft-panel-runtime-style")) {
            var style = document.createElement("style");
            style.id = "dft-panel-runtime-style";
            style.textContent = '' +
                '.dft-context-edge-toggle{position:absolute;top:50%;transform:translateY(-50%);left:-18px;width:18px;height:64px;border:1px solid #d7dce3;border-right:0;border-radius:10px 0 0 10px;background:#f8fafc;color:#6b7280;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;line-height:1;z-index:3;box-shadow:0 2px 6px rgba(0,0,0,.05);}' +
                '.dft-context-edge-toggle:hover{background:#eef2f7;color:#111827;}';
            document.head.appendChild(style);
        }

        var extra = document.getElementById("dft-panel-runtime-style-extra");
        if (!extra) {
            extra = document.createElement("style");
            extra.id = "dft-panel-runtime-style-extra";
            extra.textContent = '' +
                '.dft-dock-edge-toggle{position:absolute;left:50%;width:54px;height:18px;border:1px solid #d7dce3;background:#f8fafc;color:#6b7280;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px;line-height:1;z-index:3;box-shadow:0 2px 6px rgba(0,0,0,.05);}' +
                '.dft-dock-edge-toggle.top{top:50%;bottom:auto;transform:translate(-50%,-50%);border-radius:10px 10px 0 0;}' +
                '.dft-dock-edge-toggle.bottom{top:0;bottom:auto;transform:translateX(-50%);border-top:0;border-radius:0 0 10px 10px;}' +
                '.dft-dock-edge-toggle:hover{background:#eef2f7;color:#111827;}';
            document.head.appendChild(extra);
        }

        var btn = phase1.__dftDockToggle;
        if (!btn) {
            btn = document.createElement("div");
            btn.className = "dft-dock-edge-toggle";
            btn.title = "Hide / Show Bottom Dock";
            btn.onmousedown = function (evt) {
                evt = evt || window.event;
                if (evt.preventDefault) evt.preventDefault();
                if (window.DFTPanelRuntime) window.DFTPanelRuntime.toggle(ui, "dock");
                return false;
            };
            phase1.__dftDockToggle = btn;
        }

        btn.textContent = st.dockVisible === false ? "V" : "^";
        btn.title = st.dockVisible === false ? "Show Bottom Dock" : "Hide Bottom Dock";

        if (st.dockVisible === false) {
            phase1.statusShell.style.position = phase1.statusShell.style.position || "relative";
            if (btn.parentNode !== phase1.statusShell) phase1.statusShell.appendChild(btn);
            btn.className = "dft-dock-edge-toggle bottom";
        } else {
            phase1.dockSplitter.style.position = phase1.dockSplitter.style.position || "relative";
            if (btn.parentNode !== phase1.dockSplitter) phase1.dockSplitter.appendChild(btn);
            btn.className = "dft-dock-edge-toggle top";
        }

        btn.style.display = "";
        return btn;
    }

    function installPanelRuntime(ui) {
        if (!ui) return null;
        var phase1 = getPhase1(ui);
        if (!phase1 || !phase1.state) return null;
        ensurePanelState(ui);

        if (!window.DFTPanelRuntime) {
            window.DFTPanelRuntime = {
                install: installPanelRuntime,
                apply: applyPanelLayout,
                isVisible: function (targetUi, panelKey) {
                    var st = ensurePanelState(targetUi);
                    if (!st) return false;
                    if (panelKey === "flow") return st.flowNavVisible !== false;
                    if (panelKey === "context") return st.contextVisible !== false;
                    if (panelKey === "dock") return st.dockVisible !== false;
                    return false;
                },
                setVisible: function (targetUi, panelKey, visible) {
                    var st = ensurePanelState(targetUi);
                    if (!st) return false;
                    visible = !!visible;
                    if (panelKey === "flow") st.flowNavVisible = visible;
                    else if (panelKey === "context") st.contextVisible = visible;
                    else if (panelKey === "dock") st.dockVisible = visible;
                    else return false;

                    applyPanelLayout(targetUi);
                    if (typeof targetUi.refresh === "function") targetUi.refresh(true);
                    return true;
                },
                toggle: function (targetUi, panelKey) {
                    return this.setVisible(targetUi, panelKey, !this.isVisible(targetUi, panelKey));
                }
            };
        }

        if (!ui.__dftPanelRefreshPatched && typeof ui.refresh === "function") {
            ui.__dftPanelRefreshPatched = true;
            var oldRefresh = ui.refresh;
            ui.refresh = function () {
                var result = oldRefresh.apply(this, arguments);
                applyPanelLayout(this);
                return result;
            };
        }

        applyPanelLayout(ui);
        return window.DFTPanelRuntime;
    }

    function installViewMenuPanelToggles() {
        if (typeof window === "undefined" || typeof Actions === "undefined" || typeof Menus === "undefined" || typeof Menu === "undefined") {
            return;
        }

        function ensureActionsOnUi(ui) {
            var panelApi = installPanelRuntime(ui);
            if (!ui || !ui.actions || !panelApi) return;

            function addToggleAction(name, label, panelKey) {
                var action = ui.actions.get(name);
                if (!action) {
                    action = ui.actions.addAction(name, function () {
                        panelApi.toggle(ui, panelKey);
                        if (typeof ui.refresh === "function") ui.refresh(true);
                    });
                } else {
                    action.funct = function () {
                        panelApi.toggle(ui, panelKey);
                        if (typeof ui.refresh === "function") ui.refresh(true);
                    };
                }
                action.label = label;
                action.visible = true;
                if (typeof action.setToggleAction === "function") {
                    action.setToggleAction(true);
                }
                if (typeof action.setSelectedCallback === "function") {
                    action.setSelectedCallback(function () {
                        return !!(window.DFTPanelRuntime && window.DFTPanelRuntime.isVisible(ui, panelKey));
                    });
                }
            }

            addToggleAction("dftToggleFlowNavigator", "Flow Navigator", "flow");
            addToggleAction("dftToggleContextPanel", "Context Panel", "context");
            addToggleAction("dftToggleBottomDock", "Bottom Dock", "dock");
        }

        function ensureViewMenuOnUi(ui) {
            if (!ui || !ui.menus || ui.menus.__dftViewMenuPatched) return;
            var existingView = ui.menus.get("view");
            if (!existingView || typeof existingView.funct !== "function") return;
            ui.menus.__dftViewMenuPatched = true;
            var oldFunct = existingView.funct;
            existingView.funct = mxUtils.bind(ui.menus, function (menu, parent) {
                oldFunct.apply(existingView, arguments);
                this.addMenuItems(menu, [
                    "-",
                    "dftToggleFlowNavigator",
                    "dftToggleContextPanel",
                    "dftToggleBottomDock"
                ], parent);
            });
        }

        if (!Actions.prototype.__dftPhase1PanelActionsPatched) {
            Actions.prototype.__dftPhase1PanelActionsPatched = true;
            var oldActionsInit = Actions.prototype.init;

            Actions.prototype.init = function () {
                oldActionsInit.apply(this, arguments);
                ensureActionsOnUi(this.editorUi);
            };
        }

        if (!Menus.prototype.__dftPhase1PanelMenusPatched) {
            Menus.prototype.__dftPhase1PanelMenusPatched = true;
            var oldMenusInit = Menus.prototype.init;

            Menus.prototype.init = function () {
                oldMenusInit.apply(this, arguments);
                ensureViewMenuOnUi(this.editorUi);
            };
        }

        if (window.editorUi) {
            ensureActionsOnUi(window.editorUi);
            ensureViewMenuOnUi(window.editorUi);
        } else if (window.ui && window.ui.editor && window.ui.editor.graph) {
            ensureActionsOnUi(window.ui);
            ensureViewMenuOnUi(window.ui);
        }
    }

    function installAll(ui) {
        try {
            installPerPageUndoIsolation(ui);
            installPanelRuntime(ui);
            installViewMenuPanelToggles();
            if (typeof installIPNameLockAndInstanceEditing === "function") {
                installIPNameLockAndInstanceEditing(ui);
            }
            if (typeof installInstanceFollow === "function") {
                installInstanceFollow(ui);
            }
            if (typeof installAutoInstanceName === "function") {
                installAutoInstanceName(ui);
            }

            // 新的 floorplan 统一安装
            if (typeof installFloorplanIp === "function") {
                installFloorplanIp(ui);
            } else {
                if (typeof enableFloorplanFreeConnect === "function") enableFloorplanFreeConnect(ui);
                if (typeof installFloorplanPalette === "function") installFloorplanPalette(ui);
                if (typeof installFloorplanLineTool === "function") installFloorplanLineTool(ui);
                if (typeof installFloorplanLineContinueHandles === "function") installFloorplanLineContinueHandles(ui);
            }

            // 新的 data source 安装
            if (window.DftsIP && typeof window.DftsIP.installDataSourceIp === "function") {
                window.DftsIP.installDataSourceIp(ui);
            }

            // 新框架：安装双击打开配置
            if (window.DftsConfig && ui && ui.editor && ui.editor.graph) {
                window.DftsConfig.install(ui.editor.graph);
                console.log("[dftartist] DftsConfig installed");
            }

            console.log("[dftartist] all plugins installed");
        } catch (e) {
            console.error("[dftartist] install failed:", e);
        }
    }

    function tryGetUi() {
        if (typeof Draw !== "undefined" && Draw.loadPlugin) return { kind: "drawPlugin" };
        if (typeof EditorUi !== "undefined") return { kind: "editorUiClass" };

        if (typeof window !== "undefined") {
            if (window.editorUi) return { kind: "uiInstance", ui: window.editorUi };
            if (window.ui && window.ui.editor && window.ui.editor.graph) return { kind: "uiInstance", ui: window.ui };
        }

        return null;
    }

    function waitAndInstall() {
        var tries = 0;
        var maxTries = 400;   // 400 * 50ms = 20s
        var timer = setInterval(function () {
            tries++;

            var found = tryGetUi();
            if (found) {
                clearInterval(timer);

                if (found.kind === "drawPlugin") {
                    Draw.loadPlugin(function (ui) { installAll(ui); });
                    return;
                }

                if (found.kind === "uiInstance") {
                    installAll(found.ui);
                    return;
                }

                if (found.kind === "editorUiClass") {
                    var _oldInit = EditorUi.prototype.init;
                    EditorUi.prototype.init = function () {
                        _oldInit.apply(this, arguments);
                        installAll(this);
                    };
                    return;
                }
            }

            if (tries >= maxTries) {
                clearInterval(timer);
                console.warn("[dftartist] still no Draw/EditorUi/ui instance after waiting; not installed");
            }
        }, 50);
    }


    if (typeof document !== "undefined") {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", waitAndInstall);
        } else {
            waitAndInstall();
        }
    } else {

        waitAndInstall();
    }
})();
