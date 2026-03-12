
(function (global) {
    var NS = global.DftsIP;
    if (!NS) throw new Error('请先加载 dftartist_common.js');
    if (NS.__interfaceLoaded) return;
    NS.__interfaceLoaded = true;


    function getSymbolNS() {
        return NS && NS.Symbol ? NS.Symbol : null;
    }

    function isSymbolBody(body) {
        var sym = getSymbolNS();
        return !!(sym && body && typeof sym.isSymbolBody === 'function' && sym.isSymbolBody(body));
    }

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj || {}));
    }

    function pinLabelSeed(opt, fallback) {
        return opt.pinLabel || opt.pin_label || opt.deviceLabel || fallback || '';
    }

    function registerInterface(def) {
        def.category = NS.CATEGORY.INTERFACE;
        def.useSymbolEngine = true;
        def.labelPolicy = NS.POLICY.LABEL_USER_OR_AUTO_INCREMENT;
        def.instancePolicy = NS.POLICY.INSTANCE_DISABLED;
        def.lockBodyLabel = false;
        NS.registerDefinition(def);
        return def;
    }

    function openInterfaceConfigFallback(graph, body) {
        if (typeof global.openDftsInterfaceConfigDialog === 'function') {
            return global.openDftsInterfaceConfigDialog(graph, body);
        }
        if (typeof mxUtils !== 'undefined' && mxUtils.alert) {
            mxUtils.alert('Interface 配置界面暂未接入，你可以在后续把真实弹窗函数挂到 openDftsInterfaceConfigDialog。');
        }
    }

    NS.registerConfigOpener('interface_common', openInterfaceConfigFallback);

    registerInterface({
        key: 'SSNHostInterface',
        dftsType: 'ssn_host_interface',
        defaultLabel: 'SSN_HOST',
        autoLabelPrefix: 'SSN_HOST',
        configKey: 'interface_common',
        w: 460, h: 140,
        bodyFont: 20, pinFont: 16,
        pinsFactory: function (opt) {
            var busWidth = opt.busWidth != null ? opt.busWidth : 4;
            return {
                west: [
                    { name: 'ssn_bus_clock', type: 'clock_in', dir: 'input', pinKey: 'clock' },
                    { name: 'ssn_bus_data_in' + NS.busSuffix(busWidth), type: 'data_in', dir: 'input', pinKey: 'data_in', busWidth: busWidth, isBus: (parseInt(busWidth, 10) || 1) > 1 },
                    { name: 'ssn_bus_data_out' + NS.busSuffix(busWidth), type: 'data_out', dir: 'output', pinKey: 'data_out', busWidth: busWidth, isBus: (parseInt(busWidth, 10) || 1) > 1 }
                ]
            };
        }
    });

    registerInterface({
        key: 'SSNSlaveInterface',
        dftsType: 'ssn_slave_interface',
        defaultLabel: 'SSN_SLAVE',
        autoLabelPrefix: 'SSN_SLAVE',
        configKey: 'interface_common',
        w: 520, h: 140,
        bodyFont: 20, pinFont: 16,
        pinsFactory: function (opt) {
            var seed = pinLabelSeed(opt, '');
            var busWidth = opt.busWidth != null ? opt.busWidth : 4;
            return {
                west: [
                    { name: seed + 'ssn_to_bus_clock', type: 'clock_in', dir: 'input', pinKey: 'clock' },
                    { name: seed + 'ssn_to_bus_data_in' + NS.busSuffix(busWidth), type: 'data_in', dir: 'input', pinKey: 'data_in', busWidth: busWidth, isBus: (parseInt(busWidth, 10) || 1) > 1 },
                    { name: seed + 'ssn_from_bus_data_out' + NS.busSuffix(busWidth), type: 'data_out', dir: 'output', pinKey: 'data_out', busWidth: busWidth, isBus: (parseInt(busWidth, 10) || 1) > 1 }
                ]
            };
        }
    });

    registerInterface({
        key: 'BSCANHostInterface',
        dftsType: 'bscan_host_interface',
        defaultLabel: 'BSCAN_HOST',
        autoLabelPrefix: 'BSCAN_HOST',
        configKey: 'interface_common',
        w: 520, h: 220,
        bodyFont: 20, pinFont: 16,
        pinsFactory: function () {
            return {
                west: [
                    { name: 'bscan_select', type: 'data_in', dir: 'input', pinKey: 'select' },
                    { name: 'bscan_force_disable', type: 'data_in', dir: 'input', pinKey: 'force_disable' },
                    { name: 'bscan_select_jtag_input', type: 'data_in', dir: 'input', pinKey: 'select_jtag_input' },
                    { name: 'bscan_select_jtag_output', type: 'data_in', dir: 'input', pinKey: 'select_jtag_output' },
                    { name: 'bscan_clock', type: 'clock_in', dir: 'input', pinKey: 'clock' },
                    { name: 'bscan_capture_en', type: 'data_in', dir: 'input', pinKey: 'capture_en' },
                    { name: 'bscan_shift_en', type: 'data_in', dir: 'input', pinKey: 'shift_en' },
                    { name: 'bscan_update_en', type: 'data_in', dir: 'input', pinKey: 'update_en' },
                    { name: 'bscan_scan_in', type: 'data_in', dir: 'input', pinKey: 'scan_in' },
                    { name: 'bscan_scan_out', type: 'data_out', dir: 'output', pinKey: 'scan_out' }
                ]
            };
        }
    });

    registerInterface({
        key: 'BSCANSlaveInterface',
        dftsType: 'bscan_slave_interface',
        defaultLabel: 'BSCAN_SLAVE',
        autoLabelPrefix: 'BSCAN_SLAVE',
        configKey: 'interface_common',
        w: 600, h: 220,
        bodyFont: 20, pinFont: 16,
        pinsFactory: function (opt) {
            var seed = pinLabelSeed(opt, '');
            return {
                west: [
                    { name: seed + 'bscan_to_force_disable', type: 'data_in', dir: 'input', pinKey: 'force_disable' },
                    { name: seed + 'bscan_to_select_jtag_input', type: 'data_in', dir: 'input', pinKey: 'select_jtag_input' },
                    { name: seed + 'bscan_to_select_jtag_output', type: 'data_in', dir: 'input', pinKey: 'select_jtag_output' },
                    { name: seed + 'bscan_to_clock', type: 'clock_in', dir: 'input', pinKey: 'clock' },
                    { name: seed + 'bscan_to_capture_en', type: 'data_in', dir: 'input', pinKey: 'capture_en' },
                    { name: seed + 'bscan_to_shift_en', type: 'data_in', dir: 'input', pinKey: 'shift_en' },
                    { name: seed + 'bscan_to_update_en', type: 'data_in', dir: 'input', pinKey: 'update_en' },
                    { name: seed + 'bscan_to_scan_in', type: 'data_in', dir: 'input', pinKey: 'scan_in' },
                    { name: seed + 'bscan_from_scan_out', type: 'data_out', dir: 'output', pinKey: 'scan_out' }
                ]
            };
        }
    });

    registerInterface({
        key: 'IJTAGHostInterface',
        dftsType: 'ijtag_host_interface',
        defaultLabel: 'IJTAG_HOST',
        autoLabelPrefix: 'IJTAG_HOST',
        configKey: 'interface_common',
        w: 520, h: 200,
        bodyFont: 20, pinFont: 16,
        pinsFactory: function () {
            return {
                west: [
                    { name: 'ijtag_tck', type: 'clock_in', dir: 'input', pinKey: 'tck' },
                    { name: 'ijtag_reset', type: 'data_in', dir: 'input', pinKey: 'reset' },
                    { name: 'ijtag_ce', type: 'data_in', dir: 'input', pinKey: 'ce' },
                    { name: 'ijtag_se', type: 'data_in', dir: 'input', pinKey: 'se' },
                    { name: 'ijtag_ue', type: 'data_in', dir: 'input', pinKey: 'ue' },
                    { name: 'ijtag_sel', type: 'data_in', dir: 'input', pinKey: 'sel' },
                    { name: 'ijtag_si', type: 'data_in', dir: 'input', pinKey: 'si' },
                    { name: 'ijtag_so', type: 'data_out', dir: 'output', pinKey: 'so' }
                ]
            };
        }
    });

    registerInterface({
        key: 'IJTAGSlaveInterface',
        dftsType: 'ijtag_slave_interface',
        defaultLabel: 'IJTAG_SLAVE',
        autoLabelPrefix: 'IJTAG_SLAVE',
        configKey: 'interface_common',
        w: 600, h: 200,
        bodyFont: 20, pinFont: 16,
        pinsFactory: function (opt) {
            var seed = pinLabelSeed(opt, '');
            return {
                west: [
                    { name: seed + 'ijtag_to_tck', type: 'clock_in', dir: 'input', pinKey: 'tck' },
                    { name: seed + 'ijtag_to_reset', type: 'data_in', dir: 'input', pinKey: 'reset' },
                    { name: seed + 'ijtag_to_ce', type: 'data_in', dir: 'input', pinKey: 'ce' },
                    { name: seed + 'ijtag_to_se', type: 'data_in', dir: 'input', pinKey: 'se' },
                    { name: seed + 'ijtag_to_ue', type: 'data_in', dir: 'input', pinKey: 'ue' },
                    { name: seed + 'ijtag_to_sel', type: 'data_in', dir: 'input', pinKey: 'sel' },
                    { name: seed + 'ijtag_to_si', type: 'data_in', dir: 'input', pinKey: 'si' },
                    { name: seed + 'ijtag_from_so', type: 'data_out', dir: 'output', pinKey: 'so' }
                ]
            };
        }
    });

    registerInterface({
        key: 'BISRHostInterface',
        dftsType: 'bisr_host_interface',
        defaultLabel: 'BISR_HOST',
        autoLabelPrefix: 'BISR_HOST',
        configKey: 'interface_common',
        w: 620, h: 220,
        bodyFont: 20, pinFont: 16,
        pinsFactory: function (opt) {
            var pdg = opt.pdg || '';
            return {
                west: [
                    { name: pdg + 'bisr_mem_chain_select', type: 'data_in', dir: 'input', pinKey: 'mem_chain_select' },
                    { name: pdg + 'bisr_shift_en', type: 'data_in', dir: 'input', pinKey: 'shift_en' },
                    { name: pdg + 'bisr_clk', type: 'clock_in', dir: 'input', pinKey: 'clk' },
                    { name: pdg + 'bisr_mem_disable', type: 'data_in', dir: 'input', pinKey: 'mem_disable' },
                    { name: pdg + 'bisr_reset', type: 'data_in', dir: 'input', pinKey: 'reset' },
                    { name: pdg + 'bisr_si', type: 'data_in', dir: 'input', pinKey: 'si' },
                    { name: pdg + 'bisr_so', type: 'data_out', dir: 'output', pinKey: 'so' }
                ]
            };
        }
    });

    registerInterface({
        key: 'BISRSlaveInterface',
        dftsType: 'bisr_slave_interface',
        defaultLabel: 'BISR_SLAVE',
        autoLabelPrefix: 'BISR_SLAVE',
        configKey: 'interface_common',
        w: 680, h: 220,
        bodyFont: 20, pinFont: 16,
        pinsFactory: function (opt) {
            var pdg = opt.pdg || '';
            var seed = pinLabelSeed(opt, '');
            var prefix = pdg + '_' + seed;
            if(pdg === '' && seed === '') prefix = '';
            return {
                west: [
                    { name: prefix + 'bisr_to_mem_chain_select', type: 'data_in', dir: 'input', pinKey: 'mem_chain_select' },
                    { name: prefix + 'bisr_to_shift_en', type: 'data_in', dir: 'input', pinKey: 'shift_en' },
                    { name: prefix + 'bisr_to_clk', type: 'clock_in', dir: 'input', pinKey: 'clk' },
                    { name: prefix + 'bisr_to_mem_disable', type: 'data_in', dir: 'input', pinKey: 'mem_disable' },
                    { name: prefix + 'bisr_to_reset', type: 'data_in', dir: 'input', pinKey: 'reset' },
                    { name: prefix + 'bisr_to_si', type: 'data_in', dir: 'input', pinKey: 'si' },
                    { name: prefix + 'bisr_so', type: 'data_out', dir: 'output', pinKey: 'so' }
                ]
            };
        }
    });

    function makeInterfacePinName(dftsType, pinKey, params) {
        params = params || {};
        var pinSeed = params.pinLabel || params.pin_label || params.deviceLabel || params.label || 'U0';
        var pdg = params.pdg || 'PDG0';
        var busWidth = parseInt(params.busWidth, 10) || 1;
        var bus = NS.busSuffix(busWidth);

        if (dftsType === 'ssn_host_interface') {
            if (pinKey === 'clock') return 'ssn_bus_clock';
            if (pinKey === 'data_in') return 'ssn_bus_data_in' + bus;
            if (pinKey === 'data_out') return 'ssn_bus_data_out' + bus;
        }

        if (dftsType === 'ssn_slave_interface') {
            if (pinKey === 'clock') return pinSeed + '_ssn_to_bus_clock';
            if (pinKey === 'data_in') return pinSeed + '_ssn_to_bus_data_in' + bus;
            if (pinKey === 'data_out') return pinSeed + '_ssn_from_bus_data_out' + bus;
        }

        if (dftsType === 'bscan_host_interface') {
            if (pinKey === 'select') return 'bscan_select';
            if (pinKey === 'force_disable') return 'bscan_force_disable';
            if (pinKey === 'select_jtag_input') return 'bscan_select_jtag_input';
            if (pinKey === 'select_jtag_output') return 'bscan_select_jtag_output';
            if (pinKey === 'clock') return 'bscan_clock';
            if (pinKey === 'capture_en') return 'bscan_capture_en';
            if (pinKey === 'shift_en') return 'bscan_shift_en';
            if (pinKey === 'update_en') return 'bscan_update_en';
            if (pinKey === 'scan_in') return 'bscan_scan_in';
            if (pinKey === 'scan_out') return 'bscan_scan_out';
        }

        if (dftsType === 'bscan_slave_interface') {
            if (pinKey === 'force_disable') return pinSeed + '_bscan_to_force_disable';
            if (pinKey === 'select_jtag_input') return pinSeed + '_bscan_to_select_jtag_input';
            if (pinKey === 'select_jtag_output') return pinSeed + '_bscan_to_select_jtag_output';
            if (pinKey === 'clock') return pinSeed + '_bscan_to_clock';
            if (pinKey === 'capture_en') return pinSeed + '_bscan_to_capture_en';
            if (pinKey === 'shift_en') return pinSeed + '_bscan_to_shift_en';
            if (pinKey === 'update_en') return pinSeed + '_bscan_to_update_en';
            if (pinKey === 'scan_in') return pinSeed + '_bscan_to_scan_in';
            if (pinKey === 'scan_out') return pinSeed + '_bscan_from_scan_out';
        }

        if (dftsType === 'ijtag_host_interface') {
            if (pinKey === 'tck') return 'ijtag_tck';
            if (pinKey === 'reset') return 'ijtag_reset';
            if (pinKey === 'ce') return 'ijtag_ce';
            if (pinKey === 'se') return 'ijtag_se';
            if (pinKey === 'ue') return 'ijtag_ue';
            if (pinKey === 'sel') return 'ijtag_sel';
            if (pinKey === 'si') return 'ijtag_si';
            if (pinKey === 'so') return 'ijtag_so';
        }

        if (dftsType === 'ijtag_slave_interface') {
            if (pinKey === 'tck') return pinSeed + '_ijtag_to_tck';
            if (pinKey === 'reset') return pinSeed + '_ijtag_to_reset';
            if (pinKey === 'ce') return pinSeed + '_ijtag_to_ce';
            if (pinKey === 'se') return pinSeed + '_ijtag_to_se';
            if (pinKey === 'ue') return pinSeed + '_ijtag_to_ue';
            if (pinKey === 'sel') return pinSeed + '_ijtag_to_sel';
            if (pinKey === 'si') return pinSeed + '_ijtag_to_si';
            if (pinKey === 'so') return pinSeed + '_ijtag_from_so';
        }

        if (dftsType === 'bisr_host_interface') {
            if (pinKey === 'mem_chain_select') return pdg + '_bisr_mem_chain_select';
            if (pinKey === 'shift_en') return pdg + '_bisr_shift_en';
            if (pinKey === 'clk') return pdg + '_bisr_clk';
            if (pinKey === 'mem_disable') return pdg + '_bisr_mem_disable';
            if (pinKey === 'reset') return pdg + '_bisr_reset';
            if (pinKey === 'si') return pdg + '_bisr_si';
            if (pinKey === 'so') return pdg + '_bisr_so';
        }

        if (dftsType === 'bisr_slave_interface') {
            var prefix = pdg + '_' + pinSeed;
            if (pinKey === 'mem_chain_select') return prefix + '_bisr_to_mem_chain_select';
            if (pinKey === 'shift_en') return prefix + '_bisr_to_shift_en';
            if (pinKey === 'clk') return prefix + '_bisr_to_clk';
            if (pinKey === 'mem_disable') return prefix + '_bisr_to_mem_disable';
            if (pinKey === 'reset') return prefix + '_bisr_to_reset';
            if (pinKey === 'si') return prefix + '_bisr_to_si';
            if (pinKey === 'so') return prefix + '_bisr_so';
        }

        return null;
    }

    function updateParamInterface(graph, body, params) {
        params = params || {};

        if (isSymbolBody(body)) {
            var sym = getSymbolNS();
            if (sym && sym.getModel && sym.setModel && sym.relayout) {
                var symbolModel = clone(sym.getModel(body) || {});
                if (symbolModel && Array.isArray(symbolModel.pins)) {
                    var symbolType = String(symbolModel.dftsType || '');

                    if (params.bodyLabel != null) {
                        var nextBodyLabel = String(params.bodyLabel).replace(/^\s+|\s+$/g, '');
                        if (nextBodyLabel) {
                            if (NS.hasBodyLabel(graph, nextBodyLabel, body)) {
                                NS.rejectCreate('IP 名称已存在：' + nextBodyLabel);
                            }
                            symbolModel.title = nextBodyLabel;
                        }
                    }

                    for (var s = 0; s < symbolModel.pins.length; s++) {
                        var sp = symbolModel.pins[s];
                        var spKey = sp.key || sp.pinKey || '';
                        if (!spKey) continue;

                        var renamed = makeInterfacePinName(symbolType, spKey, params);
                        if (renamed != null) sp.name = renamed;

                        if ((symbolType === 'ssn_host_interface' || symbolType === 'ssn_slave_interface') &&
                            (spKey === 'data_in' || spKey === 'data_out') &&
                            params.busWidth != null) {
                            var sbw = parseInt(params.busWidth, 10) || 1;
                            sp.busWidth = sbw;
                            sp.isBus = sbw > 1;
                        }
                    }

                    sym.setModel(body, symbolModel);
                    sym.relayout(graph, body);
                    return;
                }
            }
        }

        var model = graph.getModel();
        var style = graph.getCellStyle(body);
        var dftsType = mxUtils.getValue(style, 'dftsIP_type', '');

        model.beginUpdate();
        try {
            if (params.bodyLabel != null) {
                var bodyLabel = String(params.bodyLabel).replace(/^\s+|\s+$/g, '');
                if (bodyLabel) {
                    if (NS.hasBodyLabel(graph, bodyLabel, body)) {
                        NS.rejectCreate('IP 名称已存在：' + bodyLabel);
                    }
                    model.setValue(body, bodyLabel);
                }
            }

            var pins = NS.getChipPins(graph, body);
            for (var i = 0; i < pins.length; i++) {
                var pin = pins[i];
                var pinStyle = graph.getCellStyle(pin);
                var pinKey = mxUtils.getValue(pinStyle, 'dftsIP_pinKey', '');
                if (!pinKey) continue;

                var nextName = makeInterfacePinName(dftsType, pinKey, params);
                if (nextName != null) {
                    NS.setPinLabelText(graph, pin, nextName);
                }

                // SSN 的 busWidth 改了以后，同时让总线引脚变粗
                if ((dftsType === 'ssn_host_interface' || dftsType === 'ssn_slave_interface') &&
                    (pinKey === 'data_in' || pinKey === 'data_out') &&
                    params.busWidth != null) {
                    var bw = parseInt(params.busWidth, 10) || 1;
                    NS.setLinePinSideAndT(graph, pin, NS.getPinSide(graph, pin), NS.getPinT(graph, pin), {
                        busWidth: bw,
                        isBus: bw > 1
                    });
                }
            }
        } finally {
            model.endUpdate();
        }
    }

    global.buildSSNHostInterface = NS.makeCreateFn('SSNHostInterface');
    global.buildSSNSlaveInterface = NS.makeCreateFn('SSNSlaveInterface');
    global.buildBSCANHostInterface = NS.makeCreateFn('BSCANHostInterface');
    global.buildBSCANSlaveInterface = NS.makeCreateFn('BSCANSlaveInterface');
    global.buildIJTAGHostInterface = NS.makeCreateFn('IJTAGHostInterface');
    global.buildIJTAGSlaveInterface = NS.makeCreateFn('IJTAGSlaveInterface');
    global.buildBISRHostInterface = NS.makeCreateFn('BISRHostInterface');
    global.buildBISRSlaveInterface = NS.makeCreateFn('BISRSlaveInterface');
    global.updateParamInterface = updateParamInterface;

    NS.makeInterfacePinName = makeInterfacePinName;
    NS.updateParamInterface = updateParamInterface;

    NS.installInterfaceIp = function (ui) {
        var realUi = ui && ui.editor ? ui : (ui && ui.editorUi ? ui.editorUi : null);
        if (realUi && realUi.editor && realUi.editor.graph) NS.ensureGraphPatches(realUi.editor.graph);
        NS.installEditingPolicy(ui);
        NS.installConfigAction(ui);
    };

})(this);
