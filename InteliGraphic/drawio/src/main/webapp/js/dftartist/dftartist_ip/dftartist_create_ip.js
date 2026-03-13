
(function (global) {
    var NS = global.DftsIP;
    if (!NS) throw new Error('请先加载 dftartist_common.js');
    if (NS.__functionalLoaded) return;
    NS.__functionalLoaded = true;

    function registerFunctional(def) {
        def.category = NS.CATEGORY.FUNCTIONAL;
        def.labelPolicy = NS.POLICY.LABEL_FIXED;
        def.instancePolicy = NS.POLICY.INSTANCE_REQUIRED;
        def.lockBodyLabel = true;
        def.useSymbolEngine = true;
        NS.registerDefinition(def);
        return def;
    }

    function staticPins(pins) {
        return function () {
            return JSON.parse(JSON.stringify(pins || {}));
        };
    }

    function openFunctionalConfigFallback(graph, body, typeName) {
        if (typeof global.openDftsFunctionalIpConfigDialog === 'function') {
            return global.openDftsFunctionalIpConfigDialog(graph, body, typeName);
        }
        if (typeof mxUtils !== 'undefined' && mxUtils.alert) {
            mxUtils.alert(typeName + ' 配置界面暂未接入，你可以在后续把真实弹窗函数挂到 openDftsFunctionalIpConfigDialog。');
        }
    }

    NS.registerConfigOpener('functional_generic', function (graph, body) {
        var dftsType = mxUtils.getValue(graph.getCellStyle(body), 'dftsIP_type', '');
        openFunctionalConfigFallback(graph, body, dftsType || 'functional');
    });

    NS.registerConfigOpener('edt', function (graph, body) {
        if (typeof global.openEDTConfigDialog === 'function') {
            return global.openEDTConfigDialog(graph, body);
        }
        openFunctionalConfigFallback(graph, body, 'EDT');
    });

    NS.registerConfigOpener('occ', function (graph, body) {
        if (typeof global.openOCCConfigDialog === 'function') {
            return global.openOCCConfigDialog(graph, body);
        }
        openFunctionalConfigFallback(graph, body, 'OCC');
    });

    registerFunctional({
        key: 'EDT',
        dftsType: 'edt',
        defaultLabel: 'EDT',
        instanceBaseName: 'EDT',
        configKey: 'edt',
        w: 380, h: 80,
        rounded: 0, strokeWidth: 1,
        bodyFont: 20, pinFont: 16,
        pinsFactory: staticPins({
            west: [{ name: 'edt_channel_in', type: 'data_in', dir: 'input', pinKey: 'edt_channel_in' }],
            east: [{ name: 'edt_channel_out', type: 'data_out', dir: 'output', pinKey: 'edt_channel_out' }]
        })
    });

    registerFunctional({
        key: 'OCC',
        dftsType: 'occ',
        defaultLabel: 'OCC',
        instanceBaseName: 'OCC',
        configKey: 'occ',
        w: 380, h: 80,
        rounded: 0, strokeWidth: 1,
        bodyFont: 20, pinFont: 16,
        pinsFactory: staticPins({
            west: [{ name: 'fast_clocks', type: 'clock_in', dir: 'input', pinKey: 'fast_clocks' }],
            east: [{ name: 'clock_out', type: 'clock_out', dir: 'output', pinKey: 'clock_out' }]
        })
    });

    registerFunctional({
        key: 'TAP',
        dftsType: 'tap',
        defaultLabel: 'TAP',
        instanceBaseName: 'TAP',
        configKey: 'functional_generic',
        w: 180, h: 250,
        rounded: 0, strokeWidth: 1,
        bodyFont: 20, pinFont: 16,
        pinsFactory: staticPins({
            west: [
                { name: 'TDI', type: 'data_in', dir: 'input', pinKey: 'tdi' },
                { name: 'TMS', type: 'data_in', dir: 'input', pinKey: 'tms' },
                { name: 'TRST', type: 'data_in', dir: 'input', pinKey: 'trst' },
                { name: 'TCK', type: 'clock_in', dir: 'input', pinKey: 'tck' },
                { name: 'TDO_EN', type: 'enable_in', dir: 'input', pinKey: 'tdo_en' }
            ],
            east: [
                { name: 'TDO', type: 'data_out', dir: 'output', pinKey: 'tdo' }
            ]
        })
    });

    registerFunctional({
        key: 'TDRI',
        dftsType: 'tdri',
        defaultLabel: 'TDRI',
        instanceBaseName: 'TDRI',
        configKey: 'functional_generic',
        w: 300, h: 80,
        rounded: 0, strokeWidth: 1,
        bodyFont: 20, pinFont: 16,
        pinsFactory: staticPins({
            west: [{ name: 'bus_data_in', type: 'data_in', dir: 'input', pinKey: 'bus_data_in' }],
            east: [{ name: 'bus_data_out', type: 'data_out', dir: 'output', pinKey: 'bus_data_out' }]
        })
    });

    registerFunctional({
        key: 'STAP',
        dftsType: 'stap',
        defaultLabel: 'STAP',
        instanceBaseName: 'STAP',
        configKey: 'functional_generic',
        w: 300, h: 80,
        rounded: 0, strokeWidth: 1,
        bodyFont: 20, pinFont: 16,
        pinsFactory: staticPins({
            west: [{ name: 'bus_data_in', type: 'data_in', dir: 'input', pinKey: 'bus_data_in' }],
            east: [{ name: 'bus_data_out', type: 'data_out', dir: 'output', pinKey: 'bus_data_out' }]
        })
    });

    registerFunctional({
        key: 'MemoryBisrController',
        dftsType: 'memorybisrcontroller',
        defaultLabel: 'MemoryBisr\nController',
        instanceBaseName: 'MemoryBisrController',
        configKey: 'functional_generic',
        w: 350, h: 80,
        rounded: 0, strokeWidth: 1,
        bodyFont: 20, pinFont: 16,
        pinsFactory: staticPins({
            west: [
                { name: 'repair_clock', type: 'clock_in', dir: 'input', pinKey: 'repair_clock' },
                { name: 'repair_trigger', type: 'trigger_in', dir: 'input', pinKey: 'repair_trigger' }
            ],
            east: [
                { name: 'bisr_pass', type: 'status_out', dir: 'output', pinKey: 'bisr_pass' },
                { name: 'bisr_done', type: 'status_out', dir: 'output', pinKey: 'bisr_done' }
            ]
        })
    });

    registerFunctional({
        key: 'InSystemTestController',
        dftsType: 'istcontroller',
        defaultLabel: 'InSystemTest\nController',
        instanceBaseName: 'InSystemTestController',
        configKey: 'functional_generic',
        w: 350, h: 80,
        rounded: 0, strokeWidth: 1,
        bodyFont: 20, pinFont: 16,
        pinsFactory: staticPins({})
    });

    registerFunctional({
        key: 'SSNFifo',
        dftsType: 'ssn_fifo',
        defaultLabel: 'SSN\nFIFO',
        instanceBaseName: 'SSNFifo',
        configKey: 'functional_generic',
        w: 300, h: 80,
        rounded: 8, strokeWidth: 1,
        bodyFont: 20, pinFont: 16,
        pinsFactory: staticPins({
            west: [
                { name: 'bus_data_in', type: 'data_in', dir: 'input', pinKey: 'bus_data_in' },
                { name: 'bus_clock_in', type: 'clock_in', dir: 'input', pinKey: 'bus_clock_in' }
            ],
            east: [
                { name: 'bus_data_out', type: 'data_out', dir: 'output', pinKey: 'bus_data_out' },
                { name: 'bus_clock_out', type: 'clock_out', dir: 'output', pinKey: 'bus_clock_out' }
            ]
        })
    });

    registerFunctional({
        key: 'SSNScanHost',
        dftsType: 'ssn_scanhost',
        defaultLabel: 'SSN\nScanHost',
        instanceBaseName: 'SSNScanHost',
        configKey: 'functional_generic',
        w: 500, h: 350,
        rounded: 8, strokeWidth: 1,
        bodyFont: 20, pinFont: 16,
        pinsFactory: staticPins({
            west: [
                { name: 'bus_data_in', type: 'data_in', dir: 'input', pinKey: 'bus_data_in' },
                { name: 'bus_clock_in', type: 'clock_in', dir: 'input', pinKey: 'bus_clock_in' },
                { name: 'edt_clock', type: 'clock_in', dir: 'input', pinKey: 'edt_clock' },
                { name: 'test_clock', type: 'clock_in', dir: 'input', pinKey: 'test_clock' },
                { name: 'scan_en', type: 'enable_in', dir: 'input', pinKey: 'scan_en' },
                { name: 'to_scan_in', type: 'data_in', dir: 'input', pinKey: 'to_scan_in' }
            ],
            east: [
                { name: 'bus_data_out', type: 'data_out', dir: 'output', pinKey: 'bus_data_out' },
                { name: 'from_scan_out', type: 'data_out', dir: 'output', pinKey: 'from_scan_out' }
            ]
        })
    });

    registerFunctional({
        key: 'SSNPipeline',
        dftsType: 'ssn_pipeline',
        defaultLabel: 'SSN\nPipeline',
        instanceBaseName: 'SSNPipeline',
        configKey: 'functional_generic',
        w: 350, h: 80,
        rounded: 8, strokeWidth: 1,
        bodyFont: 20, pinFont: 16,
        pinsFactory: staticPins({
            west: [
                { name: 'bus_data_in', type: 'data_in', dir: 'input', pinKey: 'bus_data_in' },
                { name: 'bus_clock_in', type: 'clock_in', dir: 'input', pinKey: 'bus_clock_in' }
            ],
            east: [{ name: 'bus_data_out', type: 'data_out', dir: 'output', pinKey: 'bus_data_out' }]
        })
    });

    registerFunctional({
        key: 'SSNMultiplexer',
        dftsType: 'ssn_multiplexer',
        defaultLabel: 'SSN\nMultiplexer',
        instanceBaseName: 'SSNMultiplexer',
        configKey: 'functional_generic',
        w: 480, h: 80,
        rounded: 8, strokeWidth: 1,
        bodyFont: 20, pinFont: 16,
        pinsFactory: staticPins({
            west: [
                { name: 'secondary_bus_data_in', type: 'data_in', dir: 'input', pinKey: 'secondary_bus_data_in' },
                { name: 'master_bus_data_in', type: 'data_in', dir: 'input', pinKey: 'master_bus_data_in' },
                { name: 'bus_clock_in', type: 'clock_in', dir: 'input', pinKey: 'bus_clock_in' }
            ],
            east: [{ name: 'bus_data_out', type: 'data_out', dir: 'output', pinKey: 'bus_data_out' }]
        })
    });

    registerFunctional({
        key: 'SSNOutputPipeline',
        dftsType: 'ssn_outputpipeline',
        defaultLabel: 'SSN\nOutputPipeline',
        instanceBaseName: 'SSNOutputPipeline',
        configKey: 'functional_generic',
        w: 400, h: 80,
        rounded: 8, strokeWidth: 1,
        bodyFont: 20, pinFont: 16,
        pinsFactory: staticPins({
            west: [
                { name: 'bus_data_in', type: 'data_in', dir: 'input', pinKey: 'bus_data_in' },
                { name: 'bus_clock_in', type: 'clock_in', dir: 'input', pinKey: 'bus_clock_in' }
            ],
            east: [{ name: 'bus_data_out', type: 'data_out', dir: 'output', pinKey: 'bus_data_out' }]
        })
    });

    registerFunctional({
        key: 'SSNReceiver1xPipeline',
        dftsType: 'ssn_receiver1xpipeline',
        defaultLabel: 'SSN\nReceiver1xPipeline',
        instanceBaseName: 'SSNReceiver1xPipeline',
        configKey: 'functional_generic',
        w: 450, h: 80,
        rounded: 8, strokeWidth: 1,
        bodyFont: 20, pinFont: 16,
        pinsFactory: staticPins({
            west: [
                { name: 'bus_data_in', type: 'data_in', dir: 'input', pinKey: 'bus_data_in' },
                { name: 'bus_clock_in', type: 'clock_in', dir: 'input', pinKey: 'bus_clock_in' }
            ],
            east: [{ name: 'bus_data_out', type: 'data_out', dir: 'output', pinKey: 'bus_data_out' }]
        })
    });

    registerFunctional({
        key: 'SSNBusFrequencyDivider',
        dftsType: 'ssn_busfrequencydivider',
        defaultLabel: 'SSN\nBusFrequencyDivider',
        instanceBaseName: 'SSNBusFrequencyDivider',
        configKey: 'functional_generic',
        w: 550, h: 80,
        rounded: 8, strokeWidth: 1,
        bodyFont: 20, pinFont: 16,
        pinsFactory: staticPins({
            west: [
                { name: 'bus_data_in', type: 'data_in', dir: 'input', pinKey: 'bus_data_in' },
                { name: 'bus_clock_in', type: 'clock_in', dir: 'input', pinKey: 'bus_clock_in' }
            ],
            east: [
                { name: 'bus_data_out', type: 'data_out', dir: 'output', pinKey: 'bus_data_out' },
                { name: 'bus_clock_out', type: 'clock_out', dir: 'output', pinKey: 'bus_clock_out' },
                { name: 'bus_clock_out_local', type: 'clock_out', dir: 'output', pinKey: 'bus_clock_out_local' }
            ]
        })
    });

    registerFunctional({
        key: 'SSNBusFrequencyMultiplier',
        dftsType: 'ssn_busfrequencymultiplier',
        defaultLabel: 'SSN\nBusFrequencyMultiplier',
        instanceBaseName: 'SSNBusFrequencyMultiplier',
        configKey: 'functional_generic',
        w: 450, h: 80,
        rounded: 8, strokeWidth: 1,
        bodyFont: 20, pinFont: 16,
        pinsFactory: staticPins({
            west: [
                { name: 'bus_data_in', type: 'data_in', dir: 'input', pinKey: 'bus_data_in' },
                { name: 'bus_clock_in', type: 'clock_in', dir: 'input', pinKey: 'bus_clock_in' }
            ],
            east: [
                { name: 'bus_data_out', type: 'data_out', dir: 'output', pinKey: 'bus_data_out' },
                { name: 'bus_clock_out', type: 'clock_out', dir: 'output', pinKey: 'bus_clock_out' }
            ]
        })
    });

    global.buildEDT = NS.makeCreateFn('EDT');
    global.buildOCC = NS.makeCreateFn('OCC');
    global.buildTAP = NS.makeCreateFn('TAP');
    global.buildTDRI = NS.makeCreateFn('TDRI');
    global.buildSTAP = NS.makeCreateFn('STAP');
    global.buildMemoryBisrController = NS.makeCreateFn('MemoryBisrController');
    global.buildInSystemTestController = NS.makeCreateFn('InSystemTestController');
    global.buildSSNFifo = NS.makeCreateFn('SSNFifo');
    global.buildSSNScanHost = NS.makeCreateFn('SSNScanHost');
    global.buildSSNPipeline = NS.makeCreateFn('SSNPipeline');
    global.buildSSNMultiplexer = NS.makeCreateFn('SSNMultiplexer');
    global.buildSSNOutputPipeline = NS.makeCreateFn('SSNOutputPipeline');
    global.buildSSNReceiver1xPipeline = NS.makeCreateFn('SSNReceiver1xPipeline');
    global.buildSSNBusFrequencyDivider = NS.makeCreateFn('SSNBusFrequencyDivider');
    global.buildSSNBusFrequencyMultiplier = NS.makeCreateFn('SSNBusFrequencyMultiplier');

    NS.installFunctionalIp = function (ui) {
        var realUi = ui && ui.editor ? ui : (ui && ui.editorUi ? ui.editorUi : null);
        if (realUi && realUi.editor && realUi.editor.graph) NS.ensureGraphPatches(realUi.editor.graph);
        if (realUi) {
            try { global.__dftsEditorUi = realUi; } catch (e) {}
            try { if (typeof window !== 'undefined') window.__dftsEditorUi = realUi; } catch (e2) {}
        }
        NS.installEditingPolicy(ui);
        NS.installInstanceFollow(ui);
        NS.installConfigAction(ui);
        if (typeof NS.installIpEdgeConfig === 'function') NS.installIpEdgeConfig(ui);
    };

})(this);
