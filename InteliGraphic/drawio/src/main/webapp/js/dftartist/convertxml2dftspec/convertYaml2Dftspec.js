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
    let result = '';

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
            'ssn_fifo': 'Fifo',
            'ssn_busfrequencymultiplier': 'BusFrequencyMultiplier',
            'ssn_busfrequencydivider': 'BusFrequencyDivider',
        };
        return map[t] || null;
    }

    function isRenderableSsnType(typeName) {
        return !!typeToSsnBlockName(typeName);
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

    function takeMapped(params, mapping) {
        const out = {};
        Object.entries(mapping || {}).forEach(([src, dst]) => {
            if (params[src] === undefined || params[src] === '') return;
            out[dst] = params[src];
            delete params[src];
        });
        return out;
    }

    function emitSimpleFields(fields, indentLevel) {
        const indent = ' '.repeat(indentLevel);
        let out = '';
        Object.entries(fields || {}).forEach(([k, v]) => {
            if (v === undefined || v === '') return;
            out += `\n${indent}${k} : ${formatValue(v)};`;
        });
        return out;
    }

    function emitNamedBlock(blockName, fields, indentLevel) {
        const indent = ' '.repeat(indentLevel);
        const entries = Object.entries(fields || {}).filter(([, v]) => !(v === undefined || v === ''));
        if (!entries.length) return '';
        let out = `\n${indent}${blockName} {`;
        entries.forEach(([k, v]) => {
            out += `\n${indent}  ${k} : ${formatValue(v)};`;
        });
        out += `\n${indent}}`;
        return out;
    }

    function emitIjtagInterfaceBlock(ifaceFields, ijtagFields, indentLevel) {
        const indent = ' '.repeat(indentLevel);
        const hasIface = Object.keys(ifaceFields || {}).some((k) => ifaceFields[k] !== undefined && ifaceFields[k] !== '');
        const hasIjtag = Object.keys(ijtagFields || {}).some((k) => ijtagFields[k] !== undefined && ijtagFields[k] !== '');
        if (!hasIface && !hasIjtag) return '';
        let out = `\n${indent}Interface {`;
        Object.entries(ifaceFields || {}).forEach(([k, v]) => {
            if (v === undefined || v === '') return;
            out += `\n${indent}  ${k} : ${formatValue(v)};`;
        });
        if (hasIjtag) {
            out += `\n${indent}  IjtagScanInterface {`;
            Object.entries(ijtagFields || {}).forEach(([k, v]) => {
                if (v === undefined || v === '') return;
                out += `\n${indent}    ${k} : ${formatValue(v)};`;
            });
            out += `\n${indent}  }`;
        }
        out += `\n${indent}}`;
        return out;
    }

    function emitConnectionsBlock(connFields, indentLevel) {
        return emitNamedBlock('Connections', connFields, indentLevel);
    }

    function emitGenericSsnNodeDetails(node, indentLevel, spec) {
        const params = Object.assign({}, (node && node.params) || {});
        let out = '';
        if (spec.idKey && params[spec.idKey] !== undefined && params[spec.idKey] !== '') {
            out += emitSimpleFields({ id: params[spec.idKey] }, indentLevel);
            delete params[spec.idKey];
        }
        out += emitSimpleFields(takeMapped(params, spec.topLevel || {}), indentLevel);
        out += emitIjtagInterfaceBlock(
            takeMapped(params, spec.interface || {}),
            takeMapped(params, spec.ijtag || {}),
            indentLevel
        );
        out += emitConnectionsBlock(takeMapped(params, spec.connections || {}), indentLevel);
        if (Object.keys(params).length) out += emitParams(params, indentLevel);
        return out;
    }

    const SSN_GENERIC_SPECS = {
        ssn_outputpipeline: {
            idKey: 'op_id',
            topLevel: {
                ijtag_host_interface: 'ijtag_host_interface',
                ijtag_connection_order: 'ijtag_connection_order',
                bus_clock_period: 'bus_clock_period',
                frequency_ratio: 'frequency_ratio',
                parent_instance: 'parent_instance',
                leaf_instance_name: 'leaf_instance_name',
            },
            interface: {
                if_bus_clock: 'bus_clock',
                if_bus_data_in: 'bus_data_in',
                if_bus_data_out: 'bus_data_out',
            },
            ijtag: {
                if_ijtag_reset: 'reset',
                if_ijtag_tck: 'tck',
                if_ijtag_select: 'select',
                if_ijtag_capture_en: 'capture_en',
                if_ijtag_shift_en: 'shift_en',
                if_ijtag_update_en: 'update_en',
                if_ijtag_scan_in: 'scan_in',
                if_ijtag_scan_out: 'scan_out',
            },
            connections: {
                c_bus_clock_in: 'bus_clock_in',
            }
        },
        ssn_multiplexer: {
            idKey: 'mux_id',
            topLevel: {
                ijtag_host_interface: 'ijtag_host_interface',
                ijtag_connection_order: 'ijtag_connection_order',
                bus_clock_period: 'bus_clock_period',
                frequency_ratio: 'frequency_ratio',
                parent_instance: 'parent_instance',
                leaf_instance_name: 'leaf_instance_name',
                update_phase: 'update_phase',
            },
            interface: {
                if_bus_clock: 'bus_clock',
                if_bus_data_in: 'bus_data_in',
                if_bus_data_out: 'bus_data_out',
                if_secondary_bus_data_in: 'secondary_bus_data_in',
            },
            ijtag: {
                if_ijtag_reset: 'reset',
                if_ijtag_tck: 'tck',
                if_ijtag_select: 'select',
                if_ijtag_capture_en: 'capture_en',
                if_ijtag_shift_en: 'shift_en',
                if_ijtag_update_en: 'update_en',
                if_ijtag_scan_in: 'scan_in',
                if_ijtag_scan_out: 'scan_out',
            },
            connections: {
                c_bus_clock_in: 'bus_clock_in',
                c_secondary_bus_clock_in: 'secondary_bus_clock_in',
            }
        },
        ssn_pipeline: {
            idKey: 'pl_id',
            topLevel: {
                ijtag_host_interface: 'ijtag_host_interface',
                ijtag_connection_order: 'ijtag_connection_order',
                bus_clock_period: 'bus_clock_period',
                frequency_ratio: 'frequency_ratio',
                update_phase: 'update_phase',
                parent_instance: 'parent_instance',
                leaf_instance_name: 'leaf_instance_name',
            },
            interface: {
                if_bus_clock: 'bus_clock',
                if_bus_data_in: 'bus_data_in',
                if_bus_data_out: 'bus_data_out',
            },
            ijtag: {
                if_ijtag_reset: 'reset',
                if_ijtag_tck: 'tck',
                if_ijtag_select: 'select',
                if_ijtag_capture_en: 'capture_en',
                if_ijtag_shift_en: 'shift_en',
                if_ijtag_update_en: 'update_en',
                if_ijtag_scan_in: 'scan_in',
                if_ijtag_scan_out: 'scan_out',
            },
            connections: {
                c_bus_clock_in: 'bus_clock_in',
            }
        },
        ssn_receiver1xpipeline: {
            idKey: 'r1x_id',
            topLevel: {
                ijtag_host_interface: 'ijtag_host_interface',
                ijtag_connection_order: 'ijtag_connection_order',
                bus_clock_period: 'bus_clock_period',
                parent_instance: 'parent_instance',
                leaf_instance_name: 'leaf_instance_name',
                input_retiming_cell_type: 'input_retiming_cell_type',
            },
            interface: {
                if_bus_clock: 'bus_clock',
                if_bus_data_in: 'bus_data_in',
                if_bus_data_out: 'bus_data_out',
            },
            ijtag: {
                if_ijtag_reset: 'reset',
            },
            connections: {
                c_bus_clock_in: 'bus_clock_in',
            }
        },
        ssn_fifo: {
            idKey: 'fifo_id',
            topLevel: {
                ijtag_host_interface: 'ijtag_host_interface',
                ijtag_connection_order: 'ijtag_connection_order',
                bus_clock_period: 'bus_clock_period',
                frequency_ratio: 'frequency_ratio',
                input_retimed: 'input_retimed',
                input_retiming_cell_type: 'input_retiming_cell_type',
                in_clock_to_out_clock_skew: 'in_clock_to_out_clock_skew',
                in_clock_to_out_clock_skew_programmable: 'in_clock_to_out_clock_skew_programmable',
                parent_instance: 'parent_instance',
                leaf_instance_name: 'leaf_instance_name',
            },
            interface: {
                if_bus_in_clock: 'bus_in_clock',
                if_bus_out_clock: 'bus_out_clock',
                if_bus_data_in: 'bus_data_in',
                if_bus_data_out: 'bus_data_out',
            },
            ijtag: {
                if_ijtag_reset: 'reset',
                if_ijtag_tck: 'tck',
                if_ijtag_select: 'select',
                if_ijtag_capture_en: 'capture_en',
                if_ijtag_capture_shift_en: 'capture_shift_en',
                if_ijtag_shift_en: 'shift_en',
                if_ijtag_update_en: 'update_en',
                if_ijtag_update_clock: 'update_clock',
                if_ijtag_scan_in: 'scan_in',
                if_ijtag_scan_out: 'scan_out',
            },
            connections: {
                c_bus_in_clock_in: 'bus_in_clock_in',
                c_bus_out_clock_in: 'bus_out_clock_in',
            }
        },
        ssn_busfrequencymultiplier: {
            idKey: 'bfm_id',
            topLevel: {
                use_clock_shaper_cell: 'use_clock_shaper_cell',
                frequency_ratio: 'frequency_ratio',
                update_phase: 'update_phase',
                output_divided_clock: 'output_divided_clock',
                ijtag_host_interface: 'ijtag_host_interface',
                ijtag_connection_order: 'ijtag_connection_order',
                bus_clock_period: 'bus_clock_period',
                parent_instance: 'parent_instance',
                leaf_instance_name: 'leaf_instance_name',
            },
            interface: {
                if_bus_clock: 'bus_clock',
                if_bus_clock_out: 'bus_clock_out',
                if_bus_data_in: 'bus_data_in',
                if_bus_data_out: 'bus_data_out',
            },
            ijtag: {
                if_ijtag_reset: 'reset',
                if_ijtag_tck: 'tck',
                if_ijtag_select: 'select',
                if_ijtag_capture_en: 'capture_en',
                if_ijtag_shift_en: 'shift_en',
                if_ijtag_update_en: 'update_en',
                if_ijtag_scan_in: 'scan_in',
                if_ijtag_scan_out: 'scan_out',
            },
            connections: {
                c_bus_clock_in: 'bus_clock_in',
            }
        },
        ssn_busfrequencydivider: {
            idKey: 'bfd_id',
            topLevel: {
                ijtag_host_interface: 'ijtag_host_interface',
                ijtag_connection_order: 'ijtag_connection_order',
                bus_clock_period: 'bus_clock_period',
                input_retimed: 'input_retimed',
                input_retiming_cell_type: 'input_retiming_cell_type',
                use_clock_shaper_cell: 'use_clock_shaper_cell',
                frequency_ratio: 'frequency_ratio',
                output_divided_clock: 'output_divided_clock',
                parent_instance: 'parent_instance',
                leaf_instance_name: 'leaf_instance_name',
            },
            interface: {
                if_bus_clock: 'bus_clock',
                if_bus_clock_out: 'bus_clock_out',
                if_bus_clock_out_local: 'bus_clock_out_local',
                if_bus_data_in: 'bus_data_in',
                if_bus_data_out: 'bus_data_out',
            },
            ijtag: {
                if_ijtag_reset: 'reset',
                if_ijtag_tck: 'tck',
                if_ijtag_select: 'select',
                if_ijtag_capture_en: 'capture_en',
                if_ijtag_shift_en: 'shift_en',
                if_ijtag_update_en: 'update_en',
                if_ijtag_scan_in: 'scan_in',
                if_ijtag_scan_out: 'scan_out',
            },
            connections: {
                c_bus_clock_in: 'bus_clock_in',
            }
        }
    };

    function emitScanHostDetails(node, indentLevel) {
        const indent = ' '.repeat(indentLevel);
        const params = Object.assign({}, (node && node.params) || {});
        let out = '';
        const cgId = params.cg_id;
        const connCgId = params.conn_cg_id;
        const csmModuleName = params.csm_module_name;
        const ifCgEdtUpdate = params.if_cg_edt_update;
        const ifIjtagShiftEn = params.if_ijtag_shift_en;
        const connCgFromScanOutBypassOut = params.conn_cg_from_scan_out_bypass_out;
        const topLevel = takeMapped(params, {
            ijtag_host_interface: 'ijtag_host_interface',
            ijtag_connection_order: 'ijtag_connection_order',
            bus_clock_period: 'bus_clock_period',
            max_capture_clock_pulses: 'max_capture_clock_pulses',
            max_capture_to_shift_clock_period_ratio: 'max_capture_to_shift_clock_period_ratio',
            parent_instance: 'parent_instance',
            leaf_instance_name: 'leaf_instance_name',
            max_scan_chain_length: 'max_scan_chain_length',
            max_scan_en_mcp: 'max_scan_en_mcp',
            max_edt_update_mcp: 'max_edt_update_mcp',
            input_chain_count: 'input_chain_count',
            output_chain_count: 'output_chain_count',
            output_chain_count_in_occ_mode: 'output_chain_count_in_occ_mode',
            high_comp_in: 'high_comp_in',
            high_comp_out: 'high_comp_out',
            use_high_comp_in_bypass: 'use_high_comp_in_bypass',
            support_from_scan_out_le_strobing: 'support_from_scan_out_le_strobing',
            scan_signals_bypass: 'scan_signals_bypass',
            use_clock_dff_cell: 'use_clock_dff_cell',
            use_clock_or_cell: 'use_clock_or_cell',
            use_clock_shaper_cell: 'use_clock_shaper_cell',
            support_output_clock_activation_when_ssh_is_off: 'support_output_clock_activation_when_ssh_is_off',
            size_resolution: 'size_resolution',
            use_ssn_bus_clock_as_test_clock_bypass: 'use_ssn_bus_clock_as_test_clock_bypass',
            dft_signals_not_mapped: 'dft_signals_not_mapped',
        });
        delete params.cg_id;
        delete params.conn_cg_id;
        delete params.csm_module_name;
        delete params.if_cg_edt_update;
        delete params.if_ijtag_shift_en;
        delete params.conn_cg_from_scan_out_bypass_out;
        out += emitSimpleFields(topLevel, indentLevel);
        if (cgId !== undefined && cgId !== '') {
            out += `\n${indent}ChainGroup {`;
            out += `\n${indent}  id : ${formatValue(cgId)};`;
            out += `\n${indent}}`;
        }
        if (csmModuleName !== undefined && csmModuleName !== '' || ifCgEdtUpdate !== undefined && ifCgEdtUpdate !== '' || ifIjtagShiftEn !== undefined && ifIjtagShiftEn !== '') {
            out += `\n${indent}Interface {`;
            if (csmModuleName !== undefined && csmModuleName !== '') {
                out += `\n${indent}  ClockSignalModule {`;
                out += `\n${indent}    module_name : ${formatValue(csmModuleName)};`;
                out += `\n${indent}  }`;
            }
            if (ifCgEdtUpdate !== undefined && ifCgEdtUpdate !== '') {
                out += `\n${indent}  ChainGroup {`;
                out += `\n${indent}    edt_update : ${formatValue(ifCgEdtUpdate)};`;
                out += `\n${indent}  }`;
            }
            if (ifIjtagShiftEn !== undefined && ifIjtagShiftEn !== '') {
                out += `\n${indent}  IjtagScanInterface {`;
                out += `\n${indent}    shift_en : ${formatValue(ifIjtagShiftEn)};`;
                out += `\n${indent}  }`;
            }
            out += `\n${indent}}`;
        }
        if (connCgId !== undefined && connCgId !== '' || connCgFromScanOutBypassOut !== undefined && connCgFromScanOutBypassOut !== '') {
            out += `\n${indent}Connections {`;
            out += `\n${indent}  ChainGroup {`;
            if (connCgId !== undefined && connCgId !== '') out += `\n${indent}    id : ${formatValue(connCgId)};`;
            if (connCgFromScanOutBypassOut !== undefined && connCgFromScanOutBypassOut !== '') out += `\n${indent}    from_scan_out_bypass_out : ${formatValue(connCgFromScanOutBypassOut)};`;
            out += `\n${indent}  }`;
            out += `\n${indent}}`;
        }
        if (Object.keys(params).length) out += emitParams(params, indentLevel);
        return out;
    }

    function emitSsnNodeDetails(node, indentLevel) {
        const t = String((node && node.type) || '').toLowerCase();
        if (t === 'ssn_scanhost') return emitScanHostDetails(node, indentLevel);
        if (SSN_GENERIC_SPECS[t]) return emitGenericSsnNodeDetails(node, indentLevel, SSN_GENERIC_SPECS[t]);
        return emitParams((node && node.params) || {}, indentLevel);
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
            if (!isRenderableSsnType(t)) return;
            const blockName = typeToSsnBlockName(t);
            out += `\n${indent}${blockName}(${instName}) {`;
            out += emitSsnNodeDetails(node, indentLevel + 2);
            out += `\n${indent}}`;
        });
        return out;
    }

    function emitExtraOutputPath(extraValue, indentLevel) {
        const indent = ' '.repeat(indentLevel);
        if (extraValue === undefined || extraValue === null) return '';
        let body = '';
        const paths = Array.isArray(extraValue) ? extraValue : [extraValue];
        paths.forEach((pathObj) => {
            if (!pathObj || typeof pathObj !== 'object') return;
            if (Array.isArray(pathObj)) {
                pathObj.forEach((seg) => {
                    if (!seg || typeof seg !== 'object') return;
                    Object.keys(seg).forEach((instName) => {
                        const node = seg[instName] || {};
                        const t = String(node.type || '').toLowerCase();
                        if (!isRenderableSsnType(t)) return;
                        const blockName = typeToSsnBlockName(t);
                        body += `\n${indent}  ${blockName}(${instName}) {`;
                        body += emitSsnNodeDetails(node, indentLevel + 4);
                        body += `\n${indent}  }`;
                    });
                });
            } else {
                Object.keys(pathObj).forEach((instName) => {
                    const node = pathObj[instName] || {};
                    const t = String(node.type || '').toLowerCase();
                    if (!isRenderableSsnType(t)) return;
                    const blockName = typeToSsnBlockName(t);
                    body += `\n${indent}  ${blockName}(${instName}) {`;
                    body += emitSsnNodeDetails(node, indentLevel + 4);
                    body += `\n${indent}  }`;
                });
            }
        });
        if (!body) return '';
        return `\n${indent}ExtraOutputPath {${body}\n${indent}}`;
    }

    function emitOrderAsSsnBlocks(order, indentLevel) {
        const indent = ' '.repeat(indentLevel);
        let out = '';
        if (!order || typeof order !== 'object') return out;
        Object.keys(order).forEach((instName) => {
            const node = order[instName] || {};
            const t = String(node.type || '').toLowerCase();
            if (!isRenderableSsnType(t)) return;
            const blockName = typeToSsnBlockName(t);
            out += `\n${indent}${blockName}(${instName}) {`;
            out += emitSsnNodeDetails(node, indentLevel + 2);
            if (node.smux_secondary) {
                out += `\n${indent}  smux_secondary {`;
                out += emitSmuxSecondary(node.smux_secondary, indentLevel + 4);
                out += `\n${indent}  }`;
            }
            const extraOut = emitExtraOutputPath(node.ExtraOutputPath, indentLevel + 2);
            if (extraOut) {
                out += extraOut;
            }
            out += `\n${indent}}`;
        });
        return out;
    }

    function setNestedValue(target, path, value) {
        let cur = target;
        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            if (!cur[key] || typeof cur[key] !== 'object' || Array.isArray(cur[key])) cur[key] = {};
            cur = cur[key];
        }
        cur[path[path.length - 1]] = value;
    }

    function pruneEmptyObjects(obj) {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
        Object.keys(obj).forEach((k) => {
            const v = pruneEmptyObjects(obj[k]);
            const emptyObj = v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0;
            if (v === undefined || emptyObj) delete obj[k];
            else obj[k] = v;
        });
        return obj;
    }

    function normalizeEdtConfig(raw) {
        const cfg = Object.assign({}, raw || {});
        const out = {};
        const topMap = {
            edt_top_ijtag_host_interface: ['ijtag_host_interface'],
        };
        const nestedMap = {
            edt_lb_present: ['LogicBistOptions', 'present'],
            edt_lb_capture_per_cycle: ['LogicBistOptions', 'capture_per_cycle'],
            edt_lb_prpg_reference_seed: ['LogicBistOptions', 'prpg_reference_seed'],
            edt_lb_self_test: ['LogicBistOptions', 'self_test'],
            edt_lb_shiftcycles_max: ['LogicBistOptions', 'ShiftCycles', 'max'],
            edt_lb_shiftcycles_hw_default: ['LogicBistOptions', 'ShiftCycles', 'hardware_default'],
            edt_lb_warmup_max: ['LogicBistOptions', 'WarmupPatternCount', 'max'],
            edt_lb_warmup_hw_default: ['LogicBistOptions', 'WarmupPatternCount', 'hardware_default'],

            edt_cc_present: ['ControllerChain', 'present'],
            edt_cc_clock: ['ControllerChain', 'clock'],
            edt_cc_segment_per_instrument: ['ControllerChain', 'segment_per_instrument'],
            edt_cc_max_segment_length: ['ControllerChain', 'max_segment_length'],
            edt_cc_if_enable: ['ControllerChain', 'Interface', 'enable'],
            edt_cc_if_scan_en: ['ControllerChain', 'Interface', 'scan_en'],
            edt_cc_if_scan_in: ['ControllerChain', 'Interface', 'scan_in'],
            edt_cc_if_scan_out: ['ControllerChain', 'Interface', 'scan_out'],
            edt_cc_conn_scan_en: ['ControllerChain', 'Connections', 'scan_en'],
            edt_cc_conn_controller_chain_enable: ['ControllerChain', 'Connections', 'controller_chain_enable'],
            edt_cc_conn_controller_chain_scan_in: ['ControllerChain', 'Connections', 'controller_chain_scan_in'],
            edt_cc_conn_controller_chain_scan_out: ['ControllerChain', 'Connections', 'controller_chain_scan_out'],

            edt_conn_edt_clock: ['Connections', 'edt_clock'],
            edt_conn_edt_slave_clock: ['Connections', 'edt_slave_clock'],
            edt_conn_edt_update: ['Connections', 'edt_update'],
            edt_conn_edt_reset: ['Connections', 'edt_reset'],
            edt_conn_sec_edt_bypass: ['Connections', 'StaticExternalControls', 'edt_bypass'],
            edt_conn_sec_edt_single_bypass_chain: ['Connections', 'StaticExternalControls', 'edt_single_bypass_chain'],
            edt_conn_sec_edt_configuration: ['Connections', 'StaticExternalControls', 'edt_configuration'],
            edt_conn_sec_edt_low_power_shift_enable: ['Connections', 'StaticExternalControls', 'edt_low_power_shift_enable'],

            edt_ctrl_ijtag_host_interface: ['Controller', 'ijtag_host_interface'],
            edt_ctrl_longest_chain_range: ['Controller', 'longest_chain_range'],
            edt_ctrl_scan_chain_count: ['Controller', 'scan_chain_count'],
            edt_ctrl_input_channel_count: ['Controller', 'input_channel_count'],
            edt_ctrl_output_channel_count: ['Controller', 'output_channel_count'],
            edt_ctrl_separate_control_data_channels: ['Controller', 'separate_control_data_channels'],
            edt_ctrl_parent_instance: ['Controller', 'parent_instance'],
            edt_ctrl_leaf_instance_name: ['Controller', 'leaf_instance_name'],
            edt_ctrl_connect_bscan_segments_to_lsb_chains: ['Controller', 'connect_bscan_segments_to_lsb_chains'],
            edt_ctrl_edt_bypass_change_edge_clock: ['Controller', 'edt_bypass_change_edge_clock'],
            edt_ctrl_chain_output_masking_disable: ['Controller', 'chain_output_masking_disable'],
            edt_ctrl_lvx_present: ['Controller', 'LVxMode', 'present'],
            edt_ctrl_lvx_enable_one_chain: ['Controller', 'LVxMode', 'enable_one_chain'],

            edt_ctrl_if_edt_clock: ['Controller', 'Interface', 'edt_clock'],
            edt_ctrl_if_edt_slave_clock: ['Controller', 'Interface', 'edt_slave_clock'],
            edt_ctrl_if_edt_update: ['Controller', 'Interface', 'edt_update'],
            edt_ctrl_if_edt_reset: ['Controller', 'Interface', 'edt_reset'],
            edt_ctrl_if_edt_channels_in_bus: ['Controller', 'Interface', 'edt_channels_in_bus'],
            edt_ctrl_if_edt_channels_out_bus: ['Controller', 'Interface', 'edt_channels_out_bus'],
            edt_ctrl_if_edt_bypass_change_edge_clock: ['Controller', 'Interface', 'edt_bypass_change_edge_clock'],
            edt_ctrl_spo_min_switching_threshold_percentage: ['Controller', 'ShiftPowerOptions', 'min_switching_threshold_percentage'],
            edt_ctrl_spo_present: ['Controller', 'ShiftPowerOptions', 'present'],
            edt_ctrl_spo_full_control: ['Controller', 'ShiftPowerOptions', 'full_control'],

            edt_ctrl_lbopt_present: ['Controller', 'LogicBistOptions', 'present'],
            edt_ctrl_lbopt_misr_input_ratio: ['Controller', 'LogicBistOptions', 'misr_input_ratio'],
            edt_ctrl_lbopt_chain_mask_register_ratio: ['Controller', 'LogicBistOptions', 'chain_mask_register_ratio'],
            edt_ctrl_lbopt_prpg_seed: ['Controller', 'LogicBistOptions', 'prpg_seed'],
            edt_ctrl_lbopt_spo_present: ['Controller', 'LogicBistOptions', 'ShiftPowerOptions', 'present'],
            edt_ctrl_lbopt_spo_default_operation: ['Controller', 'LogicBistOptions', 'ShiftPowerOptions', 'default_operation'],
            edt_ctrl_lbopt_spo_stp_hw_default: ['Controller', 'LogicBistOptions', 'ShiftPowerOptions', 'SwitchingThresholdPercentage', 'hardware_default'],

            edt_ctrl_if_ijtag_static_signals_driven: ['Controller', 'Interface', 'IjtagScanInterface', 'static_signals_driven'],
            edt_ctrl_if_ijtag_tck: ['Controller', 'Interface', 'IjtagScanInterface', 'tck'],
            edt_ctrl_if_ijtag_reset: ['Controller', 'Interface', 'IjtagScanInterface', 'reset'],
            edt_ctrl_if_ijtag_select: ['Controller', 'Interface', 'IjtagScanInterface', 'select'],
            edt_ctrl_if_ijtag_capture_en: ['Controller', 'Interface', 'IjtagScanInterface', 'capture_en'],
            edt_ctrl_if_ijtag_shift_en: ['Controller', 'Interface', 'IjtagScanInterface', 'shift_en'],
            edt_ctrl_if_ijtag_update_en: ['Controller', 'Interface', 'IjtagScanInterface', 'update_en'],
            edt_ctrl_if_ijtag_scan_in: ['Controller', 'Interface', 'IjtagScanInterface', 'scan_in'],
            edt_ctrl_if_ijtag_scan_out: ['Controller', 'Interface', 'IjtagScanInterface', 'scan_out'],

            edt_ctrl_if_sec_edt_bypass: ['Controller', 'Interface', 'StaticExternalControls', 'edt_bypass'],
            edt_ctrl_if_sec_edt_single_bypass_chain: ['Controller', 'Interface', 'StaticExternalControls', 'edt_single_bypass_chain'],
            edt_ctrl_if_sec_edt_configuration: ['Controller', 'Interface', 'StaticExternalControls', 'edt_configuration'],
            edt_ctrl_if_sec_edt_low_power_shift_enable: ['Controller', 'Interface', 'StaticExternalControls', 'edt_low_power_shift_enable'],

            edt_ctrl_if_lb_reset: ['Controller', 'Interface', 'LogicBist', 'reset'],
            edt_ctrl_if_lb_enable: ['Controller', 'Interface', 'LogicBist', 'enable'],
            edt_ctrl_if_lb_prpg_en: ['Controller', 'Interface', 'LogicBist', 'prpg_en'],
            edt_ctrl_if_lb_misr_en: ['Controller', 'Interface', 'LogicBist', 'misr_en'],
            edt_ctrl_if_lb_low_power_shift_en: ['Controller', 'Interface', 'LogicBist', 'low_power_shift_en'],
            edt_ctrl_if_lb_self_test_en: ['Controller', 'Interface', 'LogicBist', 'self_test_en'],
            edt_ctrl_if_lb_misr: ['Controller', 'Interface', 'LogicBist', 'misr'],

            edt_ctrl_bc_present: ['Controller', 'BypassChains', 'present'],
            edt_ctrl_bc_bypass_chain_count: ['Controller', 'BypassChains', 'bypass_chain_count'],
            edt_ctrl_bc_single_bypass_chain: ['Controller', 'BypassChains', 'single_bypass_chain'],
            edt_ctrl_bc_chain_id: ['Controller', 'BypassChains', 'BypassChain', 'id'],
            edt_ctrl_bc_scan_chain_range_list: ['Controller', 'BypassChains', 'BypassChain', 'scan_chain_range_list'],

            edt_ctrl_comp_type: ['Controller', 'Compactor', 'type'],
            edt_ctrl_comp_pipeline_logic_levels: ['Controller', 'Compactor', 'pipeline_logic_levels_in_compactor'],
            edt_ctrl_comp_change_edge: ['Controller', 'Compactor', 'change_edge_at_compactor_output'],
            edt_ctrl_comp_conn_id: ['Controller', 'Compactor', 'CompactorConnection', 'id'],
            edt_ctrl_comp_conn_scan_chain_range_list: ['Controller', 'Compactor', 'CompactorConnection', 'scan_chain_range_list'],

            edt_ctrl_clocking_type: ['Controller', 'Clocking', 'type'],
            edt_ctrl_clocking_lockup_cells: ['Controller', 'Clocking', 'lockup_cells'],
            edt_ctrl_clocking_reset_signal: ['Controller', 'Clocking', 'reset_signal'],
            edt_ctrl_clocking_reset_polarity: ['Controller', 'Clocking', 'reset_polarity'],

            edt_ctrl_hcc_present: ['Controller', 'HighCompressionConfiguration', 'present'],
            edt_ctrl_hcc_input_channel_count: ['Controller', 'HighCompressionConfiguration', 'input_channel_count'],
            edt_ctrl_hcc_output_channel_count: ['Controller', 'HighCompressionConfiguration', 'output_channel_count'],

            edt_ctrl_conn_edt_clock: ['Controller', 'Connections', 'edt_clock'],
            edt_ctrl_conn_edt_slave_clock: ['Controller', 'Connections', 'edt_slave_clock'],
            edt_ctrl_conn_edt_update: ['Controller', 'Connections', 'edt_update'],
            edt_ctrl_conn_edt_reset: ['Controller', 'Connections', 'edt_reset'],
            edt_ctrl_conn_ssh_chain_group: ['Controller', 'Connections', 'ssh_chain_group'],
            edt_ctrl_conn_mode_enables: ['Controller', 'Connections', 'mode_enables'],
            edt_ctrl_conn_edt_bypass_change_edge_clock: ['Controller', 'Connections', 'edt_bypass_change_edge_clock'],
            edt_ctrl_conn_sec_edt_bypass: ['Controller', 'Connections', 'StaticExternalControls', 'edt_bypass'],
            edt_ctrl_conn_sec_edt_single_bypass_chain: ['Controller', 'Connections', 'StaticExternalControls', 'edt_single_bypass_chain'],
            edt_ctrl_conn_sec_edt_configuration: ['Controller', 'Connections', 'StaticExternalControls', 'edt_configuration'],
            edt_ctrl_conn_sec_edt_low_power_shift_enable: ['Controller', 'Connections', 'StaticExternalControls', 'edt_low_power_shift_enable'],

            edt_ctrl_conn_in_range: ['Controller', 'Connections', 'EdtChannelsIn', 'range'],
            edt_ctrl_conn_in_port_pin_name: ['Controller', 'Connections', 'EdtChannelsIn', 'port_pin_name'],
            edt_ctrl_conn_in_pipeline_clock: ['Controller', 'Connections', 'EdtChannelsIn', 'pipeline_clock'],
            edt_ctrl_conn_in_insert_lockup_cell: ['Controller', 'Connections', 'EdtChannelsIn', 'insert_lockup_cell'],
            edt_ctrl_conn_in_lockup_cell_type: ['Controller', 'Connections', 'EdtChannelsIn', 'lockup_cell_type'],
            edt_ctrl_conn_in_ps_parent_instance: ['Controller', 'Connections', 'EdtChannelsIn', 'PipelineStage', 'parent_instance'],
            edt_ctrl_conn_in_ps_leaf_instance_name: ['Controller', 'Connections', 'EdtChannelsIn', 'PipelineStage', 'leaf_instance_name'],
            edt_ctrl_conn_in_ps_pipeline_clock: ['Controller', 'Connections', 'EdtChannelsIn', 'PipelineStage', 'pipeline_clock'],
            edt_ctrl_conn_in_ps_insert_lockup_cell: ['Controller', 'Connections', 'EdtChannelsIn', 'PipelineStage', 'insert_lockup_cell'],
            edt_ctrl_conn_in_ps_lockup_cell_type: ['Controller', 'Connections', 'EdtChannelsIn', 'PipelineStage', 'lockup_cell_type'],

            edt_ctrl_conn_out_range: ['Controller', 'Connections', 'EdtChannelsOut', 'range'],
            edt_ctrl_conn_out_port_pin_name: ['Controller', 'Connections', 'EdtChannelsOut', 'port_pin_name'],
            edt_ctrl_conn_out_pipeline_clock: ['Controller', 'Connections', 'EdtChannelsOut', 'pipeline_clock'],
            edt_ctrl_conn_out_insert_lockup_cell: ['Controller', 'Connections', 'EdtChannelsOut', 'insert_lockup_cell'],
            edt_ctrl_conn_out_lockup_cell_type: ['Controller', 'Connections', 'EdtChannelsOut', 'lockup_cell_type'],
            edt_ctrl_conn_out_ps_parent_instance: ['Controller', 'Connections', 'EdtChannelsOut', 'PipelineStage', 'parent_instance'],
            edt_ctrl_conn_out_ps_leaf_instance_name: ['Controller', 'Connections', 'EdtChannelsOut', 'PipelineStage', 'leaf_instance_name'],
            edt_ctrl_conn_out_ps_pipeline_clock: ['Controller', 'Connections', 'EdtChannelsOut', 'PipelineStage', 'pipeline_clock'],
            edt_ctrl_conn_out_ps_insert_lockup_cell: ['Controller', 'Connections', 'EdtChannelsOut', 'PipelineStage', 'insert_lockup_cell'],
            edt_ctrl_conn_out_ps_lockup_cell_type: ['Controller', 'Connections', 'EdtChannelsOut', 'PipelineStage', 'lockup_cell_type'],

            edt_ctrl_dec_segments: ['Controller', 'Decompressor', 'segments'],
            edt_ctrl_dec_max_chains_per_segment: ['Controller', 'Decompressor', 'max_chains_per_segment'],
        };

        Object.keys(topMap).forEach((k) => {
            if (cfg[k] !== undefined && cfg[k] !== '') {
                setNestedValue(out, topMap[k], cfg[k]);
                delete cfg[k];
            }
        });

        const controllerId = cfg.edt_ctrl_id;
        if (controllerId !== undefined && controllerId !== '') {
            setNestedValue(out, ['Controller', 'id'], controllerId);
            delete cfg.edt_ctrl_id;
        }

        Object.keys(nestedMap).forEach((k) => {
            if (cfg[k] !== undefined && cfg[k] !== '') {
                setNestedValue(out, nestedMap[k], cfg[k]);
                delete cfg[k];
            }
        });

        Object.keys(cfg).forEach((k) => {
            if (cfg[k] === undefined || cfg[k] === '') delete cfg[k];
        });

        if (Object.keys(cfg).length) {
            out.Raw = cfg;
        }
        return pruneEmptyObjects(out) || {};
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

    // 先写 SSN DATAPATH（新结构）
    if (scanDataSpec.DATAPATH && typeof scanDataSpec.DATAPATH === 'object') {
        const dpNames = Object.keys(scanDataSpec.DATAPATH || {});
        if (dpNames.length) {
            let ssnBlock = `read_config_data -in $dftspec -from_string {\n  SSN {`;
            ssnBlock += `\n    ijtag_host_interface : Sib(ssn);`;
            dpNames.forEach((dpName) => {
                const dpCfg = scanDataSpec.DATAPATH[dpName];
                ssnBlock += emitDatapathBlock(dpName, dpCfg, 4);
            });
            ssnBlock += `\n  }\n}\n`;
            result += ssnBlock;
        }
    }

    // 处理EDT配置
    if (scanDataSpec.INSTRUMENTS && scanDataSpec.INSTRUMENTS.EDT) {
        const edtConfigs = scanDataSpec.INSTRUMENTS.EDT;
        const edtNames = Object.keys(edtConfigs || {});
        if (edtNames.length) {
            let edtBlock = `read_config_data -in $dftspec -from_string {\n  EDT {`;

            for (const [edtName, edtConfig] of Object.entries(edtConfigs)) {
                const normalized = normalizeEdtConfig(edtConfig);
                Object.entries(normalized).forEach(([key, value]) => {
                    if (key === 'Controller' && value && typeof value === 'object' && !Array.isArray(value)) {
                        edtBlock += `\n    Controller {`;
                        edtBlock += processConfig(value, 6);
                        edtBlock += `\n    }`;
                        return;
                    }
                    if (typeof value === 'object' && !Array.isArray(value)) {
                        edtBlock += `\n    ${key} {`;
                        edtBlock += processConfig(value, 6);
                        edtBlock += `\n    }`;
                    } else {
                        edtBlock += `\n    ${key} : ${formatValue(value)};`;
                    }
                });
            }

            edtBlock += `\n  }\n}\n`;
            result += edtBlock;
        }
    }

    return result;
}

// 值格式化函数
function formatValue(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'on' : 'off';
    if (typeof value === 'number') return String(value);
    if (Array.isArray(value)) return `[${value.map((v) => formatValue(v)).join(', ')}]`;
    return String(value);
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

    const occSpecRoot = spec.MGC_OCC_INS_SPEC || {};
    const occSpec = occSpecRoot.MGC_OCC_INS_SPEC || occSpecRoot;

    function setNestedValue(target, path, value) {
        let cur = target;
        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            if (!cur[key] || typeof cur[key] !== 'object' || Array.isArray(cur[key])) cur[key] = {};
            cur = cur[key];
        }
        cur[path[path.length - 1]] = value;
    }

    function pruneEmptyObjects(obj) {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
        Object.keys(obj).forEach((k) => {
            const v = pruneEmptyObjects(obj[k]);
            const emptyObj = v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0;
            if (v === undefined || emptyObj) delete obj[k];
            else obj[k] = v;
        });
        return obj;
    }

    function normalizeOccConfig(raw) {
        const cfg = Object.assign({}, raw || {});
        const out = {};
        const map = {
            occ_ijtag_host_interface: ['ijtag_host_interface'],
            occ_capture_trigger: ['capture_trigger'],
            occ_static_clock_control: ['static_clock_control'],
            occ_force_clock_gater_te_tied_off: ['force_clock_gater_te_tied_off'],
            occ_capture_window_size: ['capture_window_size'],
            occ_fast_capture_staggered_groups: ['fast_capture_staggered_groups'],
            occ_internal_clock_gater: ['internal_clock_gater'],
            occ_shift_only_mode: ['shift_only_mode'],
            occ_kill_clock_mode: ['kill_clock_mode'],
            occ_include_clocks_in_icl_model: ['include_clocks_in_icl_model'],
            occ_leaf_instance_name: ['leaf_instance_name'],
            occ_upstream_parent_occ: ['upstream_parent_occ'],
            occ_parent_mode: ['parent_mode'],
            occ_independent_divided_clocks: ['independent_divided_clocks'],

            occ_if_scan_en: ['Interface', 'scan_en'],
            occ_if_capture_en: ['Interface', 'capture_en'],
            occ_if_slow_clock: ['Interface', 'slow_clock'],
            occ_if_fast_clock: ['Interface', 'fast_clock'],
            occ_if_clock: ['Interface', 'clock'],
            occ_if_clock_out: ['Interface', 'clock_out'],
            occ_if_clock_en_out: ['Interface', 'clock_en_out'],
            occ_if_scan_in: ['Interface', 'scan_in'],
            occ_if_scan_out: ['Interface', 'scan_out'],
            occ_if_clock_sequence: ['Interface', 'clock_sequence'],
            occ_if_pulse_to_align: ['Interface', 'pulse_to_align'],
            occ_if_fast_capture_staggered_group: ['Interface', 'fast_capture_staggered_group'],
            occ_if_ijtag_tck: ['Interface', 'IjtagScanInterface', 'tck'],
            occ_if_ijtag_reset: ['Interface', 'IjtagScanInterface', 'reset'],
            occ_if_ijtag_select: ['Interface', 'IjtagScanInterface', 'select'],
            occ_if_ijtag_capture_en: ['Interface', 'IjtagScanInterface', 'capture_en'],
            occ_if_ijtag_shift_en: ['Interface', 'IjtagScanInterface', 'shift_en'],
            occ_if_ijtag_update_en: ['Interface', 'IjtagScanInterface', 'update_en'],
            occ_if_ijtag_scan_in: ['Interface', 'IjtagScanInterface', 'scan_in'],
            occ_if_ijtag_scan_out: ['Interface', 'IjtagScanInterface', 'scan_out'],
            occ_if_ijtag_reset_polarity: ['Interface', 'IjtagScanInterface', 'reset_polarity'],
            occ_if_sec_test_mode: ['Interface', 'StaticExternalControls', 'test_mode'],
            occ_if_sec_fast_capture_mode: ['Interface', 'StaticExternalControls', 'fast_capture_mode'],
            occ_if_sec_parent_mode: ['Interface', 'StaticExternalControls', 'parent_mode'],
            occ_if_sec_capture_cycle_width: ['Interface', 'StaticExternalControls', 'capture_cycle_width'],
            occ_if_sec_static_clock_control_mode: ['Interface', 'StaticExternalControls', 'static_clock_control_mode'],
            occ_if_sec_shift_only_mode: ['Interface', 'StaticExternalControls', 'shift_only_mode'],
            occ_if_sec_kill_clock_en: ['Interface', 'StaticExternalControls', 'kill_clock_en'],
            occ_if_sec_independent_divided_clocks_en: ['Interface', 'StaticExternalControls', 'independent_divided_clocks_en'],

            occ_conn_scan_en: ['Connections', 'scan_en'],
            occ_conn_capture_en: ['Connections', 'capture_en'],
            occ_conn_slow_clock: ['Connections', 'slow_clock'],
            occ_conn_clock_sequence: ['Connections', 'clock_sequence'],
            occ_conn_pulse_to_align: ['Connections', 'pulse_to_align'],
            occ_conn_fast_capture_staggered_group: ['Connections', 'fast_capture_staggered_group'],
            occ_conn_sec_test_mode: ['Connections', 'StaticExternalControls', 'test_mode'],
            occ_conn_sec_fast_capture_mode: ['Connections', 'StaticExternalControls', 'fast_capture_mode'],
            occ_conn_sec_parent_mode: ['Connections', 'StaticExternalControls', 'parent_mode'],
            occ_conn_sec_capture_cycle_width: ['Connections', 'StaticExternalControls', 'capture_cycle_width'],
            occ_conn_sec_static_clock_control_mode: ['Connections', 'StaticExternalControls', 'static_clock_control_mode'],
            occ_conn_sec_shift_only_mode: ['Connections', 'StaticExternalControls', 'shift_only_mode'],
            occ_conn_sec_kill_clock_en: ['Connections', 'StaticExternalControls', 'kill_clock_en'],
            occ_conn_sec_independent_divided_clocks_en: ['Connections', 'StaticExternalControls', 'independent_divided_clocks_en'],

            occ_ctrl_id: ['Controller', 'id'],
            occ_ctrl_clock_intercept_nodes: ['Controller', 'clock_intercept_nodes'],
            occ_ctrl_clock_port_count: ['Controller', 'clock_port_count'],
            occ_ctrl_clock_enable_pin: ['Controller', 'clock_enable_pin'],
            occ_ctrl_clock_enable_pin_polarity: ['Controller', 'clock_enable_pin_polarity'],
            occ_ctrl_parent_instance: ['Controller', 'parent_instance'],
            occ_ctrl_capture_window_size: ['Controller', 'capture_window_size'],
            occ_ctrl_leaf_instance_name: ['Controller', 'leaf_instance_name'],
            occ_ctrl_internal_clock_gater: ['Controller', 'internal_clock_gater'],
            occ_ctrl_shift_only_mode: ['Controller', 'shift_only_mode'],
            occ_ctrl_kill_clock_mode: ['Controller', 'kill_clock_mode'],
            occ_ctrl_upstream_parent_occ: ['Controller', 'upstream_parent_occ'],
            occ_ctrl_parent_mode: ['Controller', 'parent_mode'],
            occ_ctrl_independent_divided_clocks: ['Controller', 'independent_divided_clocks'],
            occ_ctrl_freq_ratio: ['Controller', 'FrequencyRatio', 'id'],
            occ_ctrl_fr_clock_intercept_nodes: ['Controller', 'FrequencyRatio', 'clock_intercept_nodes'],
            occ_ctrl_fr_clock_port_count: ['Controller', 'FrequencyRatio', 'clock_port_count'],

            occ_ctrl_conn_scan_en: ['Controller', 'Connections', 'scan_en'],
            occ_ctrl_conn_capture_en: ['Controller', 'Connections', 'capture_en'],
            occ_ctrl_conn_slow_clock: ['Controller', 'Connections', 'slow_clock'],
            occ_ctrl_conn_fast_clocks: ['Controller', 'Connections', 'fast_clocks'],
            occ_ctrl_conn_clock: ['Controller', 'Connections', 'clock'],
            occ_ctrl_conn_clock_sequence: ['Controller', 'Connections', 'clock_sequence'],
            occ_ctrl_conn_pulse_to_align: ['Controller', 'Connections', 'pulse_to_align'],
            occ_ctrl_conn_fast_capture_staggered_group: ['Controller', 'Connections', 'fast_capture_staggered_group'],
            occ_ctrl_conn_fr_fast_clocks: ['Controller', 'Connections', 'FrequencyRatio', 'fast_clocks'],
            occ_ctrl_conn_sec_test_mode: ['Controller', 'Connections', 'StaticExternalControls', 'test_mode'],
            occ_ctrl_conn_sec_fast_capture_mode: ['Controller', 'Connections', 'StaticExternalControls', 'fast_capture_mode'],
            occ_ctrl_conn_sec_parent_mode: ['Controller', 'Connections', 'StaticExternalControls', 'parent_mode'],
            occ_ctrl_conn_sec_capture_cycle_width: ['Controller', 'Connections', 'StaticExternalControls', 'capture_cycle_width'],
            occ_ctrl_conn_sec_static_clock_control_mode: ['Controller', 'Connections', 'StaticExternalControls', 'static_clock_control_mode'],
            occ_ctrl_conn_sec_shift_only_mode: ['Controller', 'Connections', 'StaticExternalControls', 'shift_only_mode'],
            occ_ctrl_conn_sec_kill_clock_en: ['Controller', 'Connections', 'StaticExternalControls', 'kill_clock_en'],
            occ_ctrl_conn_sec_independent_divided_clocks_en: ['Controller', 'Connections', 'StaticExternalControls', 'independent_divided_clocks_en'],
        };

        Object.keys(map).forEach((k) => {
            if (cfg[k] !== undefined && cfg[k] !== '') {
                setNestedValue(out, map[k], cfg[k]);
                delete cfg[k];
            }
        });

        if (cfg.Controller && typeof cfg.Controller === 'object') {
            Object.keys(cfg.Controller).forEach((k) => {
                if (k === 'type') return;
                if (cfg.Controller[k] !== undefined && cfg.Controller[k] !== '') {
                    setNestedValue(out, ['Controller', k], cfg.Controller[k]);
                }
            });
            delete cfg.Controller;
        }
        if (cfg.Connections && typeof cfg.Connections === 'object') {
            out.Connections = Object.assign({}, out.Connections || {}, cfg.Connections);
            delete cfg.Connections;
        }

        Object.keys(cfg).forEach((k) => {
            if (cfg[k] === undefined || cfg[k] === '') delete cfg[k];
        });
        if (Object.keys(cfg).length) out.Raw = cfg;
        const pruned = pruneEmptyObjects(out) || {};
        if (pruned.Controller && pruned.Controller.FrequencyRatio && pruned.Controller.FrequencyRatio.id === 'none') {
            delete pruned.Controller.FrequencyRatio;
        }
        if (pruned.Controller && pruned.Controller.Connections && pruned.Controller.Connections.FrequencyRatio && !pruned.Controller.FrequencyRatio) {
            delete pruned.Controller.Connections.FrequencyRatio;
        }
        return pruneEmptyObjects(pruned) || {};
    }

    const normalized = normalizeOccConfig(occSpec);
    let result = `read_config_data -in $dftspec -from_string {\n  OCC {`;
    Object.entries(normalized).forEach(([key, value]) => {
        if (key === 'Controller' && value && typeof value === 'object' && !Array.isArray(value)) {
            result += `\n    Controller {`;
            result += processGenericConfig(value, 6);
            result += `\n    }`;
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            result += `\n    ${key} {`;
            result += processGenericConfig(value, 6);
            result += `\n    }`;
        } else {
            result += `\n    ${key} : ${formatValue(value)};`;
        }
    });
    result += `\n  }\n}\n`;
    return result;
}

function processGenericConfig(config, indentLevel) {
    let output = '';
    const indent = ' '.repeat(indentLevel);
    for (const [key, value] of Object.entries(config || {})) {
        if (value === null || value === undefined) continue;
        if (key === 'FrequencyRatio' && value && typeof value === 'object' && !Array.isArray(value)) {
            const ratioObj = Object.assign({}, value);
            const ratioId = ratioObj.id;
            delete ratioObj.id;
            if (!ratioId) continue;
            output += `\n${indent}FrequencyRatio(${ratioId}) {`;
            output += processGenericConfig(ratioObj, indentLevel + 2);
            output += `\n${indent}}`;
            continue;
        }
        if (key === 'BypassChain' && value && typeof value === 'object' && !Array.isArray(value)) {
            const chainObj = Object.assign({}, value);
            const chainId = chainObj.id;
            delete chainObj.id;
            output += `\n${indent}BypassChain${chainId ? `(${chainId})` : ''} {`;
            output += processGenericConfig(chainObj, indentLevel + 2);
            output += `\n${indent}}`;
            continue;
        }
        if (key === 'CompactorConnection' && value && typeof value === 'object' && !Array.isArray(value)) {
            const compObj = Object.assign({}, value);
            const compId = compObj.id;
            delete compObj.id;
            output += `\n${indent}CompactorConnection${compId ? `(${compId})` : ''} {`;
            output += processGenericConfig(compObj, indentLevel + 2);
            output += `\n${indent}}`;
            continue;
        }
        if ((key === 'EdtChannelsIn' || key === 'EdtChannelsOut') && value && typeof value === 'object' && !Array.isArray(value)) {
            const chanObj = Object.assign({}, value);
            const range = chanObj.range;
            delete chanObj.range;
            output += `\n${indent}${key}${range ? `(${range})` : ''} {`;
            output += processGenericConfig(chanObj, indentLevel + 2);
            output += `\n${indent}}`;
            continue;
        }
        if (typeof value === 'object' && !Array.isArray(value)) {
            output += `\n${indent}${key} {`;
            output += processGenericConfig(value, indentLevel + 2);
            output += `\n${indent}}`;
        } else if (Array.isArray(value)) {
            output += `\n${indent}${key} : [${value.map((v) => formatValue(v)).join(', ')}];`;
        } else {
            output += `\n${indent}${key} : ${formatValue(value)};`;
        }
    }
    return output;
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
