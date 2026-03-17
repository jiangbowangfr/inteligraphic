// convertYaml2Dftspec.js 
// Usage inside action:
//   const xml = c.getFileData(true);
//   const yaml = convertXmlToyaml(xml, true);
//   const spec = convertYaml2Dftspec(yaml, true);
//   c.saveData("diagramyaml.yaml", "yaml", b64(yaml), "text/plain", true);

function convertYamlToDftspec(yamlString) {
    let dftspec = '';
    const spec = readYAML(yamlString);
    dftspec += '#dftspec DFT_SPEC\n';

    if (spec && spec.MGC_REPAIR_INS_SPEC) {
        dftspec += convertBisrYamlToDftspec(spec);
    }
    if (spec && spec.MGC_IJTAG_INS_SPEC) {
        dftspec += convertTapYamlToDftspec(spec);
    }
    if (spec && spec.MGC_IST_INS_SPEC) {
        dftspec += convertISTYamlToDftspec(spec);
    }
    if (spec && spec.MGC_LBIST_INS_SPEC) {
        dftspec += convertLBISTYamlToDftspec(spec);
    }
    if (spec && spec.MGC_OCC_INS_SPEC) {
        dftspec += convertOCCYamlToDftspec(spec);
    }
    if (spec && spec.MGC_SCAN_INS_SPEC) {
        dftspec += convertSCANMC(spec);
    }
    if (spec && spec.MGC_SCAN_DATA_SPEC) {
        dftspec += convertEDTYamlToDftspec(spec);
    }
    return dftspec;
}

function convertEDTYamlToDftspec(spec) {
    if (!spec || !spec.MGC_SCAN_DATA_SPEC) {
        console.log("MGC_SCAN_DATA_SPEC not found in YAML, skipping conversion");
        return "";
    }

    const scanDataSpec = spec.MGC_SCAN_DATA_SPEC;
    let result = `read_config_data -in $dftspec -from_string {
  EDT {`;

    // 递归处理配置对象
    const processConfig = (config, indentLevel) => {
        let output = '';
        const indent = ' '.repeat(indentLevel);

        for (const [key, value] of Object.entries(config)) {
            if (value === null || value === undefined) continue;

            // 处理EdtChannels格式
            const processedKey = key.replace(/(EdtChannels(In|Out))(\d+)_(\d+)/, '$1($3 : $4)');

            if (typeof value === 'object' && !Array.isArray(value)) {
                output += `\n${indent}${processedKey} {`;
                output += processConfig(value, indentLevel + 2);
                output += `\n${indent}}`;
            } else if (Array.isArray(value)) {
                output += `\n${indent}${processedKey} : [${value.join(', ')}];`;
            } else {
                const formattedValue = formatValue(value);
                output += `\n${indent}${processedKey} : ${formattedValue};`;
            }
        }

        return output;
    };

    function formatAtom(value) {
        if (value === null || value === undefined) return 'null';
        if (typeof value === 'number' || typeof value === 'boolean') return formatValue(value);
        const s = String(value);
        if (/^[A-Za-z_][A-Za-z0-9_.$:/-]*$/.test(s)) return s;
        if (s.includes('[') && s.includes(']')) return s;
        return formatValue(s);
    }

    function emitDatapathConnections(conns, indentLevel) {
        const indent = ' '.repeat(indentLevel);
        let out = '';
        if (!conns || typeof conns !== 'object') return out;
        // Compatibility: map old entry_pins/exit_pins to bus_data_in/bus_data_out
        const mapped = Object.assign({}, conns);
        if (mapped.bus_data_in == null && Array.isArray(mapped.entry_pins) && mapped.entry_pins.length) mapped.bus_data_in = mapped.entry_pins[0];
        if (mapped.bus_data_out == null && Array.isArray(mapped.exit_pins) && mapped.exit_pins.length) mapped.bus_data_out = mapped.exit_pins[0];
        delete mapped.entry_pins;
        delete mapped.exit_pins;

        out += `\n${indent}Connections {`;
        ['bus_clock_in', 'bus_data_in', 'bus_data_out'].forEach((k) => {
            if (mapped[k] == null || mapped[k] === '') return;
            out += `\n${indent}  ${k} : ${formatAtom(mapped[k])};`;
        });
        Object.entries(mapped).forEach(([k, v]) => {
            if (k === 'bus_clock_in' || k === 'bus_data_in' || k === 'bus_data_out') return;
            if (v == null || v === '') return;
            if (Array.isArray(v)) out += `\n${indent}  ${k} : [${v.map(x => formatAtom(x)).join(', ')}];`;
            else out += `\n${indent}  ${k} : ${formatAtom(v)};`;
        });
        out += `\n${indent}}`;
        return out;
    }

    function typeToSsnBlockName(typeName) {
        const t = String(typeName || '').toLowerCase();
        const map = {
            'ssn_outputpipeline': 'OutputPipeline',
            'ssn_scanhost': 'ScanHost',
            'ssn_multiplexer': 'Multiplexer',
            'ssn_receiver1xpipeline': 'Reciever1xPipeline',
            'ssn_pipeline': 'Pipeline',
        };
        return map[t] || null;
    }

    function emitParams(params, indentLevel) {
        const indent = ' '.repeat(indentLevel);
        let out = '';
        if (!params || typeof params !== 'object') return out;
        const keys = Object.keys(params);
        if (!keys.length) return out;
        out += `\n${indent}Parameters {`;
        keys.forEach((k) => {
            out += `\n${indent}  ${k} : ${formatValue(params[k])};`;
        });
        out += `\n${indent}}`;
        return out;
    }

    function emitSmuxSecondary(smuxSecondary, indentLevel) {
        const indent = ' '.repeat(indentLevel);
        let out = '';
        if (!smuxSecondary || typeof smuxSecondary !== 'object') return out;
        const keys = Object.keys(smuxSecondary);
        if (!keys.length) return out;
        keys.forEach((instName) => {
            const node = smuxSecondary[instName] || {};
            const t = String(node.type || '').toLowerCase();
            if (t === 'ssn_host_interface' || t === 'ssn_slave_interface') return;
            const blockName = typeToSsnBlockName(t) || 'Pipeline';
            out += `\n${indent}${blockName}(${instName}) {`;
            out += emitParams(node.params, indentLevel + 2);
            out += `\n${indent}}`;
        });
        return out;
    }

    function emitExtraOutputPath(extraValue, indentLevel) {
        const indent = ' '.repeat(indentLevel);
        let out = '';
        if (extraValue === undefined || extraValue === null) return out;
        out += `\n${indent}ExtraOutputPath {`;
        const paths = Array.isArray(extraValue) ? extraValue : [extraValue];
        paths.forEach((pathObj) => {
            if (!pathObj || typeof pathObj !== 'object') return;
            if (Array.isArray(pathObj)) {
                pathObj.forEach((seg) => {
                    if (!seg || typeof seg !== 'object') return;
                    Object.keys(seg).forEach((instName) => {
                        const node = seg[instName] || {};
                        const t = String(node.type || '').toLowerCase();
                        if (t === 'ssn_host_interface' || t === 'ssn_slave_interface') return;
                        const blockName = typeToSsnBlockName(t) || 'Pipeline';
                        out += `\n${indent}  ${blockName}(${instName}) {`;
                        out += emitParams(node.params, indentLevel + 4);
                        out += `\n${indent}  }`;
                    });
                });
            } else {
                Object.keys(pathObj).forEach((instName) => {
                    const node = pathObj[instName] || {};
                    const t = String(node.type || '').toLowerCase();
                    if (t === 'ssn_host_interface' || t === 'ssn_slave_interface') return;
                    const blockName = typeToSsnBlockName(t) || 'Pipeline';
                    out += `\n${indent}  ${blockName}(${instName}) {`;
                    out += emitParams(node.params, indentLevel + 4);
                    out += `\n${indent}  }`;
                });
            }
        });
        out += `\n${indent}}`;
        return out;
    }

    function emitOrderAsSsnBlocks(order, indentLevel) {
        const indent = ' '.repeat(indentLevel);
        let out = '';
        if (!order || typeof order !== 'object') return out;
        Object.keys(order).forEach((instName) => {
            const node = order[instName] || {};
            const t = String(node.type || '').toLowerCase();
            if (t === 'ssn_host_interface' || t === 'ssn_slave_interface') return;
            const blockName = typeToSsnBlockName(t) || 'Pipeline';
            out += `\n${indent}${blockName}(${instName}) {`;
            out += emitParams(node.params, indentLevel + 2);
            if (node.smux_secondary) {
                out += `\n${indent}  smux_secondary {`;
                out += emitSmuxSecondary(node.smux_secondary, indentLevel + 4);
                out += `\n${indent}  }`;
            }
            if (node.ExtraOutputPath !== undefined) {
                out += emitExtraOutputPath(node.ExtraOutputPath, indentLevel + 2);
            }
            out += `\n${indent}}`;
        });
        return out;
    }

    function emitDatapathBlock(dpName, dpCfg, indentLevel) {
        const indent = ' '.repeat(indentLevel);
        const dpNum = String(dpName || '').match(/(\d+)$/);
        const dpIndex = dpNum ? (parseInt(dpNum[1], 10) + 1) : 1;
        let out = `\n${indent}DataPath(${dpIndex}) {`;
        if (dpCfg && typeof dpCfg === 'object') {
            if (dpCfg.output_bus_width !== undefined) {
                out += `\n${indent}  output_bus_width : ${formatValue(dpCfg.output_bus_width)};`;
            }
            out += emitDatapathConnections(dpCfg.connections, indentLevel + 2);
            out += emitOrderAsSsnBlocks(dpCfg.order, indentLevel + 2);
        }
        out += `\n${indent}}`;
        return out;
    }

    // 先写 DATAPATH（新结构）
    if (scanDataSpec.DATAPATH && typeof scanDataSpec.DATAPATH === 'object') {
        const dpNames = Object.keys(scanDataSpec.DATAPATH || {});
        if (dpNames.length) {
            result += `\n    SSN {`;
            result += `\n      ijtag_host_interface : Sib(ssn);`;
            dpNames.forEach((dpName) => {
                const dpCfg = scanDataSpec.DATAPATH[dpName];
                result += emitDatapathBlock(dpName, dpCfg, 6);
            });
            result += `\n    }`;
        }
    }

    // 处理EDT配置
    if (scanDataSpec.INSTRUMENTS && scanDataSpec.INSTRUMENTS.EDT) {
        const edtConfigs = scanDataSpec.INSTRUMENTS.EDT;

        for (const [edtName, edtConfig] of Object.entries(edtConfigs)) {
            result += `\n    Controller(${edtName}) {`;

            // 分离Controller属性和其他配置
            const controllerProps = {};
            const otherConfigs = {};

            for (const [key, value] of Object.entries(edtConfig)) {
                if (key === 'Controller') {
                    Object.assign(controllerProps, value);
                } else {
                    otherConfigs[key] = value;
                }
            }

            // 先处理Controller属性
            for (const [key, value] of Object.entries(controllerProps)) {
                const formattedValue = formatValue(value);
                result += `\n      ${key} : ${formattedValue};`;
            }

            // 处理其他配置
            for (const [key, value] of Object.entries(otherConfigs)) {
                if (typeof value === 'object' && !Array.isArray(value)) {
                    result += `\n      ${key} {`;
                    result += processConfig(value, 8);
                    result += `\n      }`;
                } else {
                    const formattedValue = formatValue(value);
                    result += `\n      ${key} : ${formattedValue};`;
                }
            }

            result += `\n    }`;
        }
    }

    result += `\n  }\n}\n`;
    return result;
}

// 值格式化函数
function formatValue(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'on' : 'off';
    if (typeof value === 'number') return value.toString();
    if (Array.isArray(value)) return `[${value.join(', ')}]`;
    if (typeof value === 'string') {
        // 保持特殊格式不变
        if (value.includes('[') && value.includes(']') || value.includes(',')) {
            return value;
        }
        return `"${value}"`;
    }
    return JSON.stringify(value);
}

function convertSCANMC(spec) {
    // 检查是否存在 MGC_SCAN_INS_SPEC
    if (!spec || !spec.MGC_SCAN_INS_SPEC) {
        console.log("MGC_SCAN_INS_SPEC not found in YAML, skipping conversion");
        return "";
    }

    const scanspec = spec.MGC_SCAN_INS_SPEC;
    let script = '';

    // 获取所有模式名称
    const modeNames = Object.keys(scanspec).filter(key => key.endsWith('_mode'));

    if (modeNames.length === 0) {
        console.log("No scan modes found in MGC_SCAN_INS_SPEC");
        return "";
    }

    // 从所有模式中收集所有链类型及其配置
    const chainConfigs = new Map();
    modeNames.forEach(modeName => {
        const modeConfig = scanspec[modeName];
        Object.keys(modeConfig).forEach(key => {
            if (key.startsWith('is_') && key.endsWith('_chain')) {
                const chainConfig = modeConfig[key];
                if (!chainConfigs.has(key)) {
                    chainConfigs.set(key, {
                        config: chainConfig,
                        usedInModes: [modeName],
                        order: chainConfig.order || 999 // 默认给一个大值
                    });
                } else {
                    chainConfigs.get(key).usedInModes.push(modeName);
                    // 取最小的order值
                    if (chainConfig.order !== undefined && chainConfig.order < chainConfigs.get(key).order) {
                        chainConfigs.get(key).order = chainConfig.order;
                    }
                }
            }
        });
    });

    // 按照order从小到大排序链类型
    const sortedChainTypes = Array.from(chainConfigs.entries())
        .sort(([, a], [, b]) => a.order - b.order)
        .map(([chainType]) => chainType);

    // 为每个链类型生成扫描链家族定义（按order顺序）
    sortedChainTypes.forEach(chainType => {
        const { config, order } = chainConfigs.get(chainType);
        const scanElement = config.SCAN_ELEMENT || config.scan_element;
        const count = config.COUNT || config.count;
        const chainFamilyName = chainType.toUpperCase().replace('IS_', '') + '_CHAIN';
        const inst = config.instance || config.INSTANCE;
        const filter = config.filter || config.FILTER
        let uscanelement = '';
        if (inst !== undefined && filter !== undefined) {
            uscanelement = `[get_scan_element -below_instances [get_name_list [get_instance ${inst} -h -filter {name=~"${filter}"}]]]`;
        } else if (inst !== undefined && filter === undefined) {
            uscanelement = `[get_scan_element -below_instances [get_name_list [get_instance ${inst} -h ]]]`;
        } else if (inst === undefined && filter !== undefined) {
            uscanelement = `[get_scan_element -filter {name=~"${filter}"}]]]`;
        }

        script += `register_attribute -name ${chainType} -obj_type scan_element -value_type boolean\n`;

        // 动态生成过滤条件
        if (sortedChainTypes.length === 1) {
            // 如果只有一个链类型，直接使用scan element
            script += `set_attribute_value  ${uscanelement} -name ${chainType}\n`;
            if (count !== undefined) {
                script += `create_scan_chain_family ${chainFamilyName}  -chain_count ${count} -include_elements ${uscanelement}\n\n`;
            } else {
                script += `create_scan_chain_family ${chainFamilyName}  -include_elements ${uscanelement}\n\n`;
            }
        } else {
            // 如果有多个链类型，使用排除法（排除order更小的链类型）
            const previousChains = sortedChainTypes
                .filter(t => chainConfigs.get(t).order < order)
                .join(' && !');

            if (previousChains) {
                script += `set_attribute_value  [get_scan_elements -filter " !${previousChains} "] -name ${chainType}\n`;
                if (count !== undefined) {
                    script += `create_scan_chain_family ${chainFamilyName}  -chain_count ${count} -include_elements [get_scan_elements -filter " !${previousChains} "]\n\n`;
                } else {
                    script += `create_scan_chain_family ${chainFamilyName}  -include_elements [get_scan_elements -filter " !${previousChains} "]\n\n`;
                }
            } else {
                // 第一个链类型（order最小）
                script += `set_attribute_value  ${uscanelement} -name ${chainType}\n`;
                if (count !== undefined) {
                    script += `create_scan_chain_family ${chainFamilyName}  -chain_count ${count} -include_elements ${uscanelement}\n\n`;
                } else {
                    script += `create_scan_chain_family ${chainFamilyName}  -include_elements ${uscanelement}\n\n`;
                }
            }
        }
    });

    // 为每个模式生成扫描模式配置
    modeNames.forEach(modeName => {
        const modeConfig = scanspec[modeName];
        const scanModeSetting = modeConfig.scan_mode_setting;

        if (!scanModeSetting) {
            console.log(`Warning: No scan_mode_setting found for mode ${modeName}`);
            return;
        }

        // 获取此模式中包含的链类型，并按order排序
        const includedChains = Object.keys(modeConfig)
            .filter(key => key.startsWith('is_') && key.endsWith('_chain'))
            .map(chainType => ({
                chainType,
                order: modeConfig[chainType].order || 999
            }))
            .sort((a, b) => a.order - b.order)
            .map(item => `${item.chainType.toUpperCase().replace('IS_', '')}_CHAIN`);

        if (includedChains.length === 0) {
            console.log(`Warning: No chain types found for mode ${modeName}`);
            return;
        }

        script += `add_scan_mode ${modeName}  -si_pipelining false `;
        script += `-single_clock_edge_chains ${scanModeSetting.single_clock_edge_chains} `;
        script += `-include_chain_families [list ${includedChains.join(' ')}] `;
        script += `-single_wrapper_type_chains ${scanModeSetting.single_wrapper_type_chains} `;
        script += `-single_clock_domain_chains ${scanModeSetting.single_clock_domain_chains} `;
        script += `-edt_instances ${scanModeSetting.edt_instance} `;
        script += `-si_lockup_cell_type ${scanModeSetting.si_lockup_cell_typ} `;
        script += `-single_class_chains ${scanModeSetting.single_class_chains} `;
        script += `-type internal -enable_dft_signal ${modeName}\n\n`;
    });

    return script.trim();
}

function convertOCCYamlToDftspec(spec) {
    // 检查是否存在 MGC_OCC_INS_SPEC
    if (!spec || !spec.MGC_OCC_INS_SPEC) {
        console.log("MGC_OCC_INS_SPEC not found in YAML, skipping conversion");
        return "";
    }

    const occSpec = spec.MGC_OCC_INS_SPEC.MGC_OCC_INS_SPEC;

    // 构建 OCC 配置
    let result = `read_config_data -in $dftspec -from_string {
  OCC {
    ijtag_host_interface : Sib(occ);
    static_clock_control : both;`;

    // 遍历 MGC_OCC_INS_SPEC 的所有属性
    for (const [key, value] of Object.entries(occSpec)) {
        // 跳过 static_clock_control 属性
        if (key === 'static_clock_control') continue;
        // 检查是否为控制器配置（包含 Controller 对象）
        if (value && typeof value === 'object' && value.Controller) {
            const controller = value.Controller;
            result += `
    Controller(${controller.inst}) {
       clock_intercept_node: ${controller.clock_intercept_node};
       capture_window_size: ${controller.capture_window_size};
       type: standard;
    }`;
        }
    }

    result += `
  }
}\n`;

    return result;
}

function convertLBISTYamlToDftspec(spec) {
    // 检查是否存在 MGC_LBIST_INS_SPEC
    if (!spec || !spec.MGC_LBIST_INS_SPEC) {
        console.log("MGC_LBIST_INS_SPEC not found in YAML, skipping conversion");
        return "";
    }

    let result = "";

    function convertValue(value) {
        if (typeof value === 'boolean') return value.toString();
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'string') {
            // 转换 on/off 为 true/false
            if (value.toLowerCase() === 'on') return 'true';
            if (value.toLowerCase() === 'off') return 'false';
            return value;
        }
        return value;
    }

    function generateBlock(data, indentLevel = 3) {
        let blockResult = '';
        const indent = '    '.repeat(indentLevel);

        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // 处理嵌套对象
                blockResult += `${indent}${key} {\n`;
                blockResult += generateBlock(value, indentLevel + 1);
                blockResult += `${indent}}\n`;
            } else {
                // 处理简单值
                const convertedValue = convertValue(value);
                blockResult += `${indent}${key}:  ${convertedValue};\n`;
            }
        }

        return blockResult;
    }

    function processLBISTController(controllerData, controllerId) {
        let controllerResult = '';

        // 处理Controller
        controllerResult += `        Controller(${controllerId}) {\n`;

        // 处理Controller级别的属性
        const topLevelProps = ['burn_in', 'self_test', 'pre_post_shift_dead_cycles'];
        topLevelProps.forEach(prop => {
            if (controllerData[prop] !== undefined) {
                const value = convertValue(controllerData[prop]);
                controllerResult += `            ${prop}:  ${value};\n`;
            }
        });

        // 处理各种配置块
        const configBlocks = [
            'ControllerChain',
            'SingleChainForDiagnosis',
            'AsyncSetResetPatternCount',
            'ShiftCycles',
            'CaptureCycles',
            'PatternCount',
            'WarmupPatternCount',
            'SetLoadUnloadTimingOptions'
        ];

        configBlocks.forEach(block => {
            if (controllerData[block]) {
                controllerResult += `            ${block} {\n`;
                controllerResult += generateBlock(controllerData[block], 4);
                controllerResult += `            }\n`;
            }
        });

        // 处理Connections
        if (controllerData.Connections) {
            controllerResult += `            Connections {\n`;
            for (const [key, value] of Object.entries(controllerData.Connections)) {
                if (typeof value !== 'object') {
                    controllerResult += `                ${key}:  ${value};\n`;
                }
            }
            controllerResult += `            }\n`;
        }

        controllerResult += `        }\n`;
        return controllerResult;
    }

    function processNcpIndexDecoder(ncpData) {
        let ncpResult = '';

        if (ncpData) {
            ncpResult += `        NcpIndexDecoder {\n`;

            // 处理extest_lbist
            if (ncpData.extest_lbist !== undefined) {
                const value = convertValue(ncpData.extest_lbist);
                ncpResult += `            extest_lbist:  ${value};\n`;
            }

            // 处理NCP配置
            for (const [key, value] of Object.entries(ncpData)) {
                if (key.startsWith('Ncp(')) {
                    if (typeof value === 'string') {
                        // 简单NCP配置
                        ncpResult += `            ${key}:  ${value};\n`;
                    } else if (typeof value === 'object') {
                        // 复杂NCP配置（包含cycle信息）
                        ncpResult += `            ${key} {\n`;
                        for (const [cycleKey, cycleValue] of Object.entries(value)) {
                            if (cycleKey.startsWith('cycle(')) {
                                ncpResult += `                ${cycleKey} : ${cycleValue};\n`;
                            }
                        }
                        ncpResult += `            }\n`;
                    }
                }
            }

            ncpResult += `        }\n`;
        }

        return ncpResult;
    }

    // 主函数逻辑
    result += `read_config_data -in $dftspec -from_string {
    LogicBist {
        ijtag_host_interface:  Sib(lbist);\n`;

    // 遍历 MGC_LBIST_INS_SPEC 中的所有控制器
    const lbistSpec = spec.MGC_LBIST_INS_SPEC;
    for (const [controllerName, controllerData] of Object.entries(lbistSpec)) {
        if (typeof controllerData === 'object') {
            // 提取控制器数据
            const controllerConfig = controllerData.Controller || controllerData;
            const controllerId = controllerConfig.id || '1%ctrl_lbist';

            result += processLBISTController(controllerConfig, controllerId);

            // 处理NcpIndexDecoder
            const ncpData = controllerData.NcpIndexDecoder || lbistSpec.NcpIndexDecoder;
            if (ncpData) {
                result += processNcpIndexDecoder(ncpData);
            }
        }
    }

    result += `    }
}\n`;

    return result;
}

function convertISTYamlToDftspec(spec) {
    // 检查是否存在 MGC_IST_INS_SPEC
    if (!spec || !spec.MGC_IST_INS_SPEC) {
        console.log("MGC_IST_INS_SPEC not found in YAML, skipping conversion");
        return "";
    }

    let result = "";

    function convertValue(value) {
        if (typeof value === 'boolean') return value.toString();
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'string') {
            // 转换 on/off 为 true/false
            if (value.toLowerCase() === 'on') return 'true';
            if (value.toLowerCase() === 'off') return 'false';

            // 处理信号位宽，将 [x:y] 转换为 [%d]
            return value.replace(/\[\d+:\d+\]/g, '[%d]');
        }
        return value;
    }

    function generateBlock(data, indentLevel = 3) {
        let blockResult = '';
        const indent = '    '.repeat(indentLevel);

        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // 处理嵌套对象
                blockResult += `${indent}${key} {\n`;
                blockResult += generateBlock(value, indentLevel + 1);
                blockResult += `${indent}}\n`;
            } else {
                // 处理简单值
                const convertedValue = convertValue(value);
                blockResult += `${indent}${key}:  ${convertedValue};\n`;
            }
        }

        return blockResult;
    }

    function processController(controllerData, controllerName) {
        let controllerResult = '';

        // 处理Controller级别属性
        if (controllerData.Controller) {
            controllerResult += `        Controller(${controllerName}) {\n`;
            controllerResult += generateBlock(controllerData.Controller, 3);
        } else {
            // 如果没有Controller块，创建默认的
            controllerResult += `        Controller(${controllerName}) {\n`;
            controllerResult += `            protocol:  direct_memory_access;\n`;
            controllerResult += `            host_interface:  HostScanInterface(tap);\n`;
            controllerResult += `            data_width:  8;\n`;
        }

        // 处理ControllerChain（兼容大小写和拼写）
        const controllerChain = controllerData.ControllerChain || controllerData.controllerchain || controllerData.Controllerchain;
        if (controllerChain) {
            controllerResult += `            ControllerChain {\n`;
            controllerResult += generateBlock(controllerChain, 4);
            controllerResult += `            }\n`;
        }

        // 处理DirectMemoryAccessOptions（兼容拼写错误）
        const dmaOptions = controllerData.DirectMemoryAccessOptions ||
            controllerData.DirectMemoryAccessOPtions ||
            controllerData.directmemoryaccessoptions;
        if (dmaOptions) {
            controllerResult += `            DirectMemoryAccessOptions {\n`;
            // 保持原始字段结构，不进行转换
            controllerResult += generateBlock(dmaOptions, 4);
            controllerResult += `            }\n`;
        }

        // 处理Connections
        if (controllerData.Connections || controllerData.connections) {
            const connections = controllerData.Connections || controllerData.connections;
            controllerResult += `            Connections {\n`;

            // 先处理非Direct_memory_access的连接
            for (const [key, value] of Object.entries(connections)) {
                const lowerKey = key.toLowerCase();
                if (lowerKey !== 'direct_memory_access' && lowerKey !== 'directmemoryaccess' && typeof value !== 'object') {
                    const convertedValue = convertValue(value);
                    controllerResult += `                ${key}:  ${convertedValue};\n`;
                }
            }

            // 处理DirectMemoryAccess（兼容不同命名方式）
            const directMemoryAccess = connections.Direct_memory_access ||
                connections.direct_memory_access ||
                connections.DirectMemoryAccess ||
                connections.directmemoryaccess;
            if (directMemoryAccess) {
                controllerResult += `                DirectMemoryAccess {\n`;
                controllerResult += generateBlock(directMemoryAccess, 5);
                controllerResult += `                }\n`;
            }

            controllerResult += `            }\n`;
        }

        controllerResult += `        }\n`;

        return controllerResult;
    }

    // 主函数逻辑
    result += `read_config_data -in $dftspec -from_string {
    InSystemTest {\n`;

    // 遍历 MGC_IST_INS_SPEC 中的所有控制器
    const mgcIstSpec = spec.MGC_IST_INS_SPEC;
    for (const [controllerName, controllerData] of Object.entries(mgcIstSpec)) {
        if (typeof controllerData === 'object') {
            result += processController(controllerData, controllerName.toLowerCase());
        }
    }

    result += `    }
}`;
    result += `\n`;

    return result;
}

function convertTapYamlToDftspec(spec) {
    // 检查是否存在 MGC_IJTAG_INS_SPEC
    if (!spec || !spec.MGC_IJTAG_INS_SPEC) {
        console.log("MGC_IJTAG_INS_SPEC not found in YAML, skipping conversion");
        return "";
    }

    let result = ""; // 使用局部变量而不是访问外部dftspec

    // 获取所有TAP配置
    const tapSpecs = spec.MGC_IJTAG_INS_SPEC;

    // 遍历所有TAP
    Object.keys(tapSpecs).forEach(tapName => {
        const tapConfig = tapSpecs[tapName];

        if (!tapConfig || typeof tapConfig !== 'object') {
            return; // 跳过无效配置
        }

        result += `# Configuration for ${tapName}\n`;

        // 处理TAP_PORTS_ATTRIBUTE (生成set_attribute_value命令)
        if (tapConfig.TAP_PORTS_ATTRIBUTE) {
            const portsAttr = tapConfig.TAP_PORTS_ATTRIBUTE;

            // 映射关系：YAML键名 -> function值
            const functionMap = {
                'MBIST_CHIP_IJTAG_TCK': 'tck',
                'MBIST_CHIP_IJTAG_TMS': 'tms',
                'MBIST_CHIP_IJTAG_TRST': 'trst',
                'MBIST_CHIP_IJTAG_TDI': 'tdi',
                'MBIST_CHIP_IJTAG_TDO': 'tdo'
            };

            // 生成set_attribute_value命令
            Object.keys(functionMap).forEach(yamlKey => {
                if (portsAttr[yamlKey]) {
                    const pinName = portsAttr[yamlKey];
                    const functionValue = functionMap[yamlKey];
                    result += `set_attribute_value ${pinName} -name function -value ${functionValue}\n`;
                }
            });

            result += "\n"; // 添加空行分隔
        }

        // 处理TAP_INTERFACE (生成set_config_value命令)
        if (tapConfig.TAP_INTERFACE) {
            const tapInterface = tapConfig.TAP_INTERFACE;

            result += `set tap_interface_ports_spec [get_name_list [get_config_element HostScanInterface(${tapName}) -in [get_config_element $dftspec/IjtagNetwork]]]\n`;

            // 映射关系：YAML键名 -> config路径
            const interfaceMap = {
                'MBIST_CHIP_IJTAG_TCK': 'tck',
                'MBIST_CHIP_IJTAG_TMS': 'tms',
                'MBIST_CHIP_IJTAG_TRST': 'trst',
                'MBIST_CHIP_IJTAG_TDI': 'tdi',
                'MBIST_CHIP_IJTAG_TDO': 'tdo',
                'MBIST_CHIP_IJTAG_TDO_EN': 'tdo_en',
                'MBIST_CHIP_IJTAG_TDO_EN_POLARITY': 'tdo_en_polarity'
            };

            // 生成set_config_value命令
            Object.keys(interfaceMap).forEach(yamlKey => {
                if (tapInterface[yamlKey]) {
                    const netPath = tapInterface[yamlKey];
                    const configPath = interfaceMap[yamlKey];
                    result += `set_config_value $tap_interface_ports_spec/Interface/${configPath} ${netPath}\n`;
                }
            });

            result += "\n"; // 添加空行分隔
        }

        // 处理TAP_PORTS (生成tap_ports配置)
        if (tapConfig.TAP_PORTS) {
            const tapPorts = tapConfig.TAP_PORTS;

            result += `set tap_ports_spec [get_name_list [add_config_element HostScanInterface(${tapName}_ports) -in [get_config_element $dftspec/IjtagNetwork]]]\n`;

            // 映射关系：YAML键名 -> config路径
            const portsMap = {
                'MBIST_CHIP_IJTAG_TCK': 'tck',
                'MBIST_CHIP_IJTAG_TMS': 'tms',
                'MBIST_CHIP_IJTAG_TRST': 'trst',
                'MBIST_CHIP_IJTAG_TDI': 'tdi',
                'MBIST_CHIP_IJTAG_TDO': 'tdo'
            };

            // 生成set_config_value命令
            Object.keys(portsMap).forEach(yamlKey => {
                if (tapPorts[yamlKey]) {
                    const pinName = tapPorts[yamlKey];
                    const configPath = portsMap[yamlKey];
                    result += `set_config_value $tap_ports_spec/Interface/${configPath} ${pinName}\n`;
                }
            });

            result += "\n"; // 添加空行分隔
        }

        result += "# End of configuration for " + tapName + "\n\n";
    });

    return result;
}

function convertBisrYamlToDftspec(spec) {
    // 检查是否存在 MGC_REPAIR_INS_SPEC
    if (!spec || !spec.MGC_REPAIR_INS_SPEC) {
        console.log("MGC_REPAIR_INS_SPEC not found in YAML, skipping conversion");
        return "";
    }

    let result = 'read_config_data -in_wrapper $dftspec -from_string {\n';
    result += "    MemoryBisr{\n";

    // 获取并循环所有 BISR_CONTROLLER
    Object.keys(spec.MGC_REPAIR_INS_SPEC || {}).forEach(controllerName => {
        const controller = spec.MGC_REPAIR_INS_SPEC[controllerName];

        if (controller && typeof controller === 'object') {
            result += `        Controller{\n`;

            // 首先处理 Controller 对象的内容（提升到上一层）
            if (controller.Controller && typeof controller.Controller === 'object') {
                for (const key of Object.keys(controller.Controller)) {
                    const value = controller.Controller[key];
                    if (value !== null && value !== undefined) {
                        result += `            ${key}: ${value};\n`;
                    }
                }
            }

            // 然后处理其他所有属性（除了 Controller）
            for (const key of Object.keys(controller)) {
                if (key === 'Controller') continue; // 跳过已经处理过的 Controller

                const value = controller[key];

                if (value === null || value === undefined) continue;

                if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    // 简单属性（信号连接等）
                    result += `            ${key}: ${value};\n`;
                } else if (typeof value === 'object' && !Array.isArray(value)) {
                    // 嵌套对象（AdvancedOptions, PowerDomainOptions等）
                    result += `            ${key}{\n`;
                    for (const subKey of Object.keys(value)) {
                        const subValue = value[subKey];

                        if (subValue === null || subValue === undefined) continue;

                        if (typeof subValue === 'string' || typeof subValue === 'number' || typeof subValue === 'boolean') {
                            result += `                ${subKey}: ${subValue};\n`;
                        } else if (typeof subValue === 'object' && !Array.isArray(subValue)) {
                            // 更深层的嵌套对象
                            result += `                ${subKey}{\n`;
                            for (const deepKey of Object.keys(subValue)) {
                                result += `                    ${deepKey}: ${subValue[deepKey]};\n`;
                            }
                            result += "                }\n";
                        }
                    }
                    result += "            }\n";
                }
            }

            result += "        }\n";
        }
    });

    result += "    }\n";
    result += "}\n";

    return result;
}

function getValueByPath(obj, path, defaultValue = undefined) {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        // 处理数组索引，如 friends[0]
        if (key.includes('[') && key.includes(']')) {
            const arrayKey = key.split('[')[0];
            const index = parseInt(key.match(/\[(\d+)\]/)[1]);

            if (current[arrayKey] && Array.isArray(current[arrayKey]) && current[arrayKey][index] !== undefined) {
                current = current[arrayKey][index];
            } else {
                return defaultValue;
            }
        } else {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }
    }

    return current !== undefined ? current : defaultValue;
}

function readYAML(yamlString, processor = null) {
    const lines = yamlString.split('\n');
    let index = 0;

    function peekNextMeaningfulLine(startIndex) {
        for (let i = startIndex; i < lines.length; i++) {
            const raw = lines[i];
            if (!raw) continue;
            const trimmed = raw.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const indent = raw.search(/\S|$/);
            return { line: trimmed, indent };
        }
        return null;
    }

    function parseValue(valueStr) {
        if (valueStr === 'null') return null;
        if (valueStr === 'true') return true;
        if (valueStr === 'false') return false;
        if (!isNaN(valueStr) && valueStr !== '') return Number(valueStr);
        if ((valueStr.startsWith('"') && valueStr.endsWith('"')) ||
            (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
            return valueStr.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n');
        }
        return valueStr;
    }

    function parse(indentLevel = 0, isArray = false) {
        const result = isArray ? [] : {};
        let currentKey = null;

        while (index < lines.length) {
            if (index >= lines.length) break;

            let line = lines[index].trim();
            if (line === '' || line.startsWith('#')) {
                index++;
                continue;
            }

            const currentIndent = lines[index].search(/\S|$/);

            if (currentIndent < indentLevel) {
                break;
            }

            line = lines[index].substring(currentIndent);

            // 处理数组项
            if (line.startsWith('- ')) {
                if (!isArray) {
                    // 当前层是对象但遇到了数组项：说明上层值应是数组，回退给上层按数组模式解析
                    break;
                }
                const itemValue = line.substring(2).trim();
                if (itemValue === '') {
                    result.push({});
                } else {
                    result.push(parseValue(itemValue));
                }
                index++;
            } else if (line === '-') {
                if (!isArray) {
                    break;
                }
                // 多行数组项
                index++;
                const nested = parse(currentIndent + 2, true);
                result.push(nested.length === 1 ? nested[0] : nested);
            } else {
                // 处理键值对
                const colonIndex = line.indexOf(':');
                if (colonIndex !== -1) {
                    const key = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim();

                    currentKey = key;

                    if (value === '') {
                        // 嵌套对象
                        index++;
                        const next = peekNextMeaningfulLine(index);
                        const childIsArray = !!(next && next.indent >= currentIndent + 2 && next.line.startsWith('-'));
                        const nestedValue = parse(currentIndent + 2, childIsArray);
                        if (isArray) {
                            result.push({ [key]: nestedValue });
                        } else {
                            result[key] = nestedValue;
                        }
                    } else if (value === '[]') {
                        result[key] = [];
                        index++;
                    } else if (value === 'null') {
                        result[key] = null;
                        index++;
                    } else {
                        result[key] = parseValue(value);
                        index++;
                    }
                } else {
                    index++;
                }
            }
        }

        return result;
    }

    try {
        const trimmedYaml = yamlString.trim();
        if (trimmedYaml === '' || trimmedYaml === 'null') return {};

        // 检查是否是数组开头
        if (lines[0].trim().startsWith('-')) {
            return parse(0, true);
        }

        return parse();
    } catch (error) {
        throw new Error(`Failed to parse YAML: ${error.message}`);
    }
}
