
// =======================
// 安装入口
// =======================
(function () {
    function installAll(ui) {
        try {
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

