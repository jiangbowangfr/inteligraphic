// src/apps/edt/definition.ts
import type { DftsTypeDef } from '../../shared/dfts/types';

const onOff = [
  { label: 'on', value: 'on' },
  { label: 'off', value: 'off' },
];

const onOffAuto = [
  { label: 'auto', value: 'auto' },
  { label: 'on', value: 'on' },
  { label: 'off', value: 'off' },
];

const offOnAuto = [
  { label: 'off', value: 'off' },
  { label: 'on', value: 'on' },
  { label: 'auto', value: 'auto' },
];

const yesNoAuto = [
  { label: 'auto', value: 'auto' },
  { label: 'off', value: 'off' },
  { label: 'require', value: 'require' },
  { label: 'allow', value: 'allow' },
];

const activePolarityAuto = [
  { label: 'auto', value: 'auto' },
  { label: 'active_low', value: 'active_low' },
  { label: 'active_high', value: 'active_high' },
];

const listHelp = (ex: string) => `逗号分隔，例如：${ex}`;

const codeHeader = (body: string) => `DftSpecification(module_name,id) {\n${body}\n}`;

export const edtDefinition: DftsTypeDef = {
  type: 'edt',
  title: 'DFT · EDT',
  defaultNode: 'EDT',
  nodes: {
    // =========================================================
    // EDT (Top) - 组合预览：包含 LogicBistOptions / ControllerChain / Connections / Controller(id)
    // =========================================================
    EDT: {
      title: 'EDT',
      description: 'EDT 顶层配置',
      fields: [
        {
          attr: 'edt_top_ijtag_host_interface',
          label: 'ijtag_host_interface',
          kind: 'string',
          defaultValue: 'none',
          placeholder: 'ijtag_leaf_node_name | none',
        },
        {
          attr: 'edt_ctrl_id',
          label: 'Controller id',
          kind: 'string',
          defaultValue: 'id',
          help: '用于生成 Controller(id)',
        },
      ],
      buildCode: ({ get }) => {
        const ctrlId = get('edt_ctrl_id', 'id');

        // ---- Top/LogicBistOptions
        const lb_present = get('edt_lb_present', 'auto');
        const lb_capture_per_cycle = get('edt_lb_capture_per_cycle', 'auto');
        const lb_prpg_reference_seed = get('edt_lb_prpg_reference_seed', '1');
        const lb_self_test = get('edt_lb_self_test', 'auto');
        const lb_shift_max = get('edt_lb_shiftcycles_max', '');
        const lb_shift_hw = get('edt_lb_shiftcycles_hw_default', 'max');
        const lb_warm_max = get('edt_lb_warmup_max', 255);
        const lb_warm_hw = get('edt_lb_warmup_hw_default', 0);

        // ---- ControllerChain
        const cc_present = get('edt_cc_present', 'off');
        const cc_clock = get('edt_cc_clock', 'edt_clock');
        const cc_segment_per_instrument = get('edt_cc_segment_per_instrument', 'on');
        const cc_max_segment_length = get('edt_cc_max_segment_length', 'unlimited');

        const cc_if_enable = get('edt_cc_if_enable', 'ccm_en');
        const cc_if_scan_en = get('edt_cc_if_scan_en', 'scan_en');
        const cc_if_scan_in = get('edt_cc_if_scan_in', 'scan_in');
        const cc_if_scan_out = get('edt_cc_if_scan_out', 'scan_out');

        const cc_conn_scan_en = get('edt_cc_conn_scan_en', 'OptionalDftSignal(scan_en)');
        const cc_conn_enable = get('edt_cc_conn_controller_chain_enable', 'OptionalDftSignal(controller_chain_mode)');
        const cc_conn_si = get('edt_cc_conn_controller_chain_scan_in', 'control_chain_%s_scan_in');
        const cc_conn_so = get('edt_cc_conn_controller_chain_scan_out', 'control_chain_%s_scan_out');

        // ---- EDT/Connections
        const conn_edt_clock = get('edt_conn_edt_clock', 'OptionalDftSignal(edt_clock)');
        const conn_edt_slave_clock = get('edt_conn_edt_slave_clock', 'edt_slave_clock');
        const conn_edt_update = get('edt_conn_edt_update', 'OptionalDftSignal(edt_update)');
        const conn_edt_reset = get('edt_conn_edt_reset', 'edt_reset');

        const conn_sec_bypass = get('edt_conn_sec_edt_bypass', '0');
        const conn_sec_single = get('edt_conn_sec_edt_single_bypass_chain', '0');
        const conn_sec_cfg = get('edt_conn_sec_edt_configuration', '0');
        const conn_sec_lp = get('edt_conn_sec_edt_low_power_shift_enable', '0');

        // ---- Controller (Top fields)
        const c_ijtag_host = get('edt_ctrl_ijtag_host_interface', 'none');
        const c_longest = get('edt_ctrl_longest_chain_range', '');
        const c_scan_chain_count = get('edt_ctrl_scan_chain_count', '');
        const c_in_cnt = get('edt_ctrl_input_channel_count', '');
        const c_out_cnt = get('edt_ctrl_output_channel_count', '');
        const c_sep_ctrl_data = get('edt_ctrl_separate_control_data_channels', 'off');
        const c_parent_inst = get('edt_ctrl_parent_instance', '');
        const c_leaf_inst = get('edt_ctrl_leaf_instance_name', '');
        const c_connect_bscan = get('edt_ctrl_connect_bscan_segments_to_lsb_chains', 'auto');
        const c_bypass_edge = get('edt_ctrl_edt_bypass_change_edge_clock', 'prefer_edt_clock');
        const c_mask_disable = get('edt_ctrl_chain_output_masking_disable', 'off');

        const lvx_present = get('edt_ctrl_lvx_present', 'auto');
        const lvx_enable_one_chain = get('edt_ctrl_lvx_enable_one_chain', 'off');

        // ---- Controller/Interface
        const cif_edt_clock = get('edt_ctrl_if_edt_clock', 'edt_clock');
        const cif_edt_slave_clock = get('edt_ctrl_if_edt_slave_clock', 'edt_slave_clock');
        const cif_edt_update = get('edt_ctrl_if_edt_update', 'edt_update');
        const cif_edt_reset = get('edt_ctrl_if_edt_reset', 'edt_reset');
        const cif_in_bus = get('edt_ctrl_if_edt_channels_in_bus', 'edt_channels_in');
        const cif_out_bus = get('edt_ctrl_if_edt_channels_out_bus', 'edt_channels_out');
        const cif_bypass_edge_clk = get('edt_ctrl_if_edt_bypass_change_edge_clock', 'edt_bypass_change_edge_clock');

        // ---- Controller/Interface/IjtagScanInterface
        const cij_static = get('edt_ctrl_if_ijtag_static_signals_driven', 'as_needed');
        const cij_tck = get('edt_ctrl_if_ijtag_tck', 'ijtag_tck');
        const cij_reset = get('edt_ctrl_if_ijtag_reset', 'ijtag_reset');
        const cij_sel = get('edt_ctrl_if_ijtag_select', 'ijtag_sel');
        const cij_ce = get('edt_ctrl_if_ijtag_capture_en', 'ijtag_ce');
        const cij_se = get('edt_ctrl_if_ijtag_shift_en', 'ijtag_se');
        const cij_ue = get('edt_ctrl_if_ijtag_update_en', 'ijtag_ue');
        const cij_si = get('edt_ctrl_if_ijtag_scan_in', 'ijtag_si');
        const cij_so = get('edt_ctrl_if_ijtag_scan_out', 'ijtag_so');

        // ---- Controller/Interface/StaticExternalControls
        const cif_sec_bypass = get('edt_ctrl_if_sec_edt_bypass', 'edt_bypass');
        const cif_sec_single = get('edt_ctrl_if_sec_edt_single_bypass_chain', 'edt_single_bypass_chain');
        const cif_sec_cfg = get('edt_ctrl_if_sec_edt_configuration', 'edt_configuration');
        const cif_sec_lp = get('edt_ctrl_if_sec_edt_low_power_shift_enable', 'edt_low_power_shift_en');

        // ---- Controller/Interface/LogicBist
        const lb_reset = get('edt_ctrl_if_lb_reset', 'lbist_reset');
        const lb_en = get('edt_ctrl_if_lb_enable', 'lbist_en');
        const lb_prpg_en = get('edt_ctrl_if_lb_prpg_en', 'lbist_prpg_en');
        const lb_misr_en = get('edt_ctrl_if_lb_misr_en', 'misr_accumulate_en');
        const lb_lp_shift = get('edt_ctrl_if_lb_low_power_shift_en', 'lbist_low_power_shift_en');
        const lb_self_test_en = get('edt_ctrl_if_lb_self_test_en', 'self_test_en');
        const lb_misr = get('edt_ctrl_if_lb_misr', '-');

        // ---- Controller/BypassChains
        const bc_present = get('edt_ctrl_bc_present', 'off');
        const bc_count = get('edt_ctrl_bc_bypass_chain_count', 'auto');
        const bc_single = get('edt_ctrl_bc_single_bypass_chain', 'auto');
        const bc_id = get('edt_ctrl_bc_chain_id', 1);
        const bc_ranges = get('edt_ctrl_bc_scan_chain_range_list', '');

        // ---- Controller/Compactor
        const comp_type = get('edt_ctrl_comp_type', 'xpress');
        const comp_pipe_levels = get('edt_ctrl_comp_pipeline_logic_levels', 'off');
        const comp_change_edge = get('edt_ctrl_comp_change_edge', 'any');
        const comp_conn_id = get('edt_ctrl_comp_conn_id', 1);
        const comp_conn_ranges = get('edt_ctrl_comp_conn_scan_chain_range_list', '');

        // ---- Controller/Clocking
        const clk_type = get('edt_ctrl_clocking_type', 'edge');
        const clk_lockup_cells = get('edt_ctrl_clocking_lockup_cells', 'on');
        const clk_reset_signal = get('edt_ctrl_clocking_reset_signal', 'auto');
        const clk_reset_pol = get('edt_ctrl_clocking_reset_polarity', 'auto');

        // ---- Controller/HighCompressionConfiguration
        const hcc_present = get('edt_ctrl_hcc_present', 'off');
        const hcc_in = get('edt_ctrl_hcc_input_channel_count', '');
        const hcc_out = get('edt_ctrl_hcc_output_channel_count', '');

        // ---- Controller/ShiftPowerOptions
        const spo_present = get('edt_ctrl_spo_present', 'off');
        const spo_full_control = get('edt_ctrl_spo_full_control', 'off');
        const spo_min_thr = get('edt_ctrl_spo_min_switching_threshold_percentage', 15);

        // ---- Controller/LogicBistOptions (controller-level)
        const clb_present = get('edt_ctrl_lbopt_present', 'auto');
        const clb_misr_ratio = get('edt_ctrl_lbopt_misr_input_ratio', 'auto');
        const clb_chain_mask_ratio = get('edt_ctrl_lbopt_chain_mask_register_ratio', 1);
        const clb_prpg_seed = get('edt_ctrl_lbopt_prpg_seed', '1');

        const clb_spo_present = get('edt_ctrl_lbopt_spo_present', 'auto');
        const clb_spo_default_op = get('edt_ctrl_lbopt_spo_default_operation', 'enabled');
        const clb_spo_hw_default = get('edt_ctrl_lbopt_spo_stp_hw_default', 15);

        // ---- Controller/Connections
        const cconn_edt_clock = get('edt_ctrl_conn_edt_clock', 'OptionalDftSignal(edt_clock)');
        const cconn_slave = get('edt_ctrl_conn_edt_slave_clock', 'edt_slave_clock');
        const cconn_update = get('edt_ctrl_conn_edt_update', 'OptionalDftSignal(edt_update)');
        const cconn_reset = get('edt_ctrl_conn_edt_reset', '');
        const cconn_ssh = get('edt_ctrl_conn_ssh_chain_group', '');
        const cconn_mode_enables = get('edt_ctrl_conn_mode_enables', '');
        const cconn_edge_clock_occ_spec = get('edt_ctrl_conn_edt_bypass_change_edge_clock', '');
        const cconn_sec_bypass2 = get('edt_ctrl_conn_sec_edt_bypass', '0');
        const cconn_sec_single2 = get('edt_ctrl_conn_sec_edt_single_bypass_chain', '0');
        const cconn_sec_cfg2 = get('edt_ctrl_conn_sec_edt_configuration', '0');
        const cconn_sec_lp2 = get('edt_ctrl_conn_sec_edt_low_power_shift_enable', '0');

        // ---- EdtChannelsIn(range)
        const in_range = get('edt_ctrl_conn_in_range', 'range');
        const in_port_pin = get('edt_ctrl_conn_in_port_pin_name', '');
        const in_pipe_clk = get('edt_ctrl_conn_in_pipeline_clock', 'Inherited');
        const in_insert_lockup = get('edt_ctrl_conn_in_insert_lockup_cell', 'auto');
        const in_lockup_type = get('edt_ctrl_conn_in_lockup_cell_type', 'latch');

        const in_ps_parent = get('edt_ctrl_conn_in_ps_parent_instance', '');
        const in_ps_leaf = get('edt_ctrl_conn_in_ps_leaf_instance_name', '');
        const in_ps_clk = get('edt_ctrl_conn_in_ps_pipeline_clock', 'Inherited');
        const in_ps_insert = get('edt_ctrl_conn_in_ps_insert_lockup_cell', 'Inherited');
        const in_ps_type = get('edt_ctrl_conn_in_ps_lockup_cell_type', 'Inherited');

        // ---- EdtChannelsOut(range)
        const out_range = get('edt_ctrl_conn_out_range', 'range');
        const out_port_pin = get('edt_ctrl_conn_out_port_pin_name', '');
        const out_pipe_clk = get('edt_ctrl_conn_out_pipeline_clock', 'edt_clock');
        const out_insert_lockup = get('edt_ctrl_conn_out_insert_lockup_cell', 'auto');
        const out_lockup_type = get('edt_ctrl_conn_out_lockup_cell_type', 'latch');

        const out_ps_parent = get('edt_ctrl_conn_out_ps_parent_instance', '');
        const out_ps_leaf = get('edt_ctrl_conn_out_ps_leaf_instance_name', '');
        const out_ps_clk = get('edt_ctrl_conn_out_ps_pipeline_clock', 'Inherited');
        const out_ps_insert = get('edt_ctrl_conn_out_ps_insert_lockup_cell', 'Inherited');
        const out_ps_type = get('edt_ctrl_conn_out_ps_lockup_cell_type', 'Inherited');

        // ---- Decompressor
        const dec_segments = get('edt_ctrl_dec_segments', 'auto');
        const dec_max_chains_per_segment = get('edt_ctrl_dec_max_chains_per_segment', 150);

        return codeHeader(
          `    EDT {\n` +
            `        ijtag_host_interface : ${get('edt_top_ijtag_host_interface', 'none')} ;\n` +
            `\n` +
            `        LogicBistOptions {\n` +
            `            present             : ${lb_present} ;\n` +
            `            capture_per_cycle   : ${lb_capture_per_cycle} ;\n` +
            `            prpg_reference_seed : ${lb_prpg_reference_seed} ;\n` +
            `            self_test           : ${lb_self_test} ;\n` +
            `            ShiftCycles {\n` +
            `                max              : ${lb_shift_max} ;\n` +
            `                hardware_default : ${lb_shift_hw} ;\n` +
            `            }\n` +
            `            WarmupPatternCount {\n` +
            `                max              : ${lb_warm_max} ;\n` +
            `                hardware_default : ${lb_warm_hw} ;\n` +
            `            }\n` +
            `        }\n` +
            `\n` +
            `        ControllerChain {\n` +
            `            present                : ${cc_present} ;\n` +
            `            clock                  : ${cc_clock} ;\n` +
            `            segment_per_instrument : ${cc_segment_per_instrument} ;\n` +
            `            max_segment_length     : ${cc_max_segment_length} ;\n` +
            `            Interface {\n` +
            `                enable   : ${cc_if_enable} ;\n` +
            `                scan_en  : ${cc_if_scan_en} ;\n` +
            `                scan_in  : ${cc_if_scan_in} ;\n` +
            `                scan_out : ${cc_if_scan_out} ;\n` +
            `            }\n` +
            `            Connections {\n` +
            `                scan_en                   : ${cc_conn_scan_en} ;\n` +
            `                controller_chain_enable   : ${cc_conn_enable} ;\n` +
            `                controller_chain_scan_in  : ${cc_conn_si} ;\n` +
            `                controller_chain_scan_out : ${cc_conn_so} ;\n` +
            `            }\n` +
            `        }\n` +
            `\n` +
            `        Connections {\n` +
            `            edt_clock       : ${conn_edt_clock} ;\n` +
            `            edt_slave_clock : ${conn_edt_slave_clock} ;\n` +
            `            edt_update      : ${conn_edt_update} ;\n` +
            `            edt_reset       : ${conn_edt_reset} ;\n` +
            `            StaticExternalControls {\n` +
            `                edt_bypass                 : ${conn_sec_bypass} ;\n` +
            `                edt_single_bypass_chain    : ${conn_sec_single} ;\n` +
            `                edt_configuration          : ${conn_sec_cfg} ;\n` +
            `                edt_low_power_shift_enable : ${conn_sec_lp} ;\n` +
            `            }\n` +
            `        }\n` +
            `\n` +
            `        Controller(${ctrlId}) {\n` +
            `            ijtag_host_interface                 : ${c_ijtag_host} ;\n` +
            `            longest_chain_range                  : ${c_longest} ;\n` +
            `            scan_chain_count                     : ${c_scan_chain_count} ;\n` +
            `            input_channel_count                  : ${c_in_cnt} ;\n` +
            `            output_channel_count                 : ${c_out_cnt} ;\n` +
            `            separate_control_data_channels       : ${c_sep_ctrl_data} ;\n` +
            `            parent_instance                      : ${c_parent_inst} ;\n` +
            `            leaf_instance_name                   : ${c_leaf_inst} ;\n` +
            `            connect_bscan_segments_to_lsb_chains : ${c_connect_bscan} ;\n` +
            `            edt_bypass_change_edge_clock         : ${c_bypass_edge} ;\n` +
            `            chain_output_masking_disable         : ${c_mask_disable} ;\n` +
            `            LVxMode {\n` +
            `                present          : ${lvx_present} ;\n` +
            `                enable_one_chain : ${lvx_enable_one_chain} ;\n` +
            `            }\n` +
            `\n` +
            `            Interface {\n` +
            `                edt_clock                    : ${cif_edt_clock} ;\n` +
            `                edt_slave_clock              : ${cif_edt_slave_clock} ;\n` +
            `                edt_update                   : ${cif_edt_update} ;\n` +
            `                edt_reset                    : ${cif_edt_reset} ;\n` +
            `                edt_channels_in_bus          : ${cif_in_bus} ;\n` +
            `                edt_channels_out_bus         : ${cif_out_bus} ;\n` +
            `                edt_bypass_change_edge_clock : ${cif_bypass_edge_clk} ;\n` +
            `                IjtagScanInterface {\n` +
            `                    static_signals_driven : ${cij_static} ;\n` +
            `                    tck       : ${cij_tck} ;\n` +
            `                    reset     : ${cij_reset} ;\n` +
            `                    select    : ${cij_sel} ;\n` +
            `                    capture_en: ${cij_ce} ;\n` +
            `                    shift_en  : ${cij_se} ;\n` +
            `                    update_en : ${cij_ue} ;\n` +
            `                    scan_in   : ${cij_si} ;\n` +
            `                    scan_out  : ${cij_so} ;\n` +
            `                }\n` +
            `                StaticExternalControls {\n` +
            `                    edt_bypass                 : ${cif_sec_bypass} ;\n` +
            `                    edt_single_bypass_chain    : ${cif_sec_single} ;\n` +
            `                    edt_configuration          : ${cif_sec_cfg} ;\n` +
            `                    edt_low_power_shift_enable : ${cif_sec_lp} ;\n` +
            `                }\n` +
            `                LogicBist {\n` +
            `                    reset              : ${lb_reset} ;\n` +
            `                    enable             : ${lb_en} ;\n` +
            `                    prpg_en            : ${lb_prpg_en} ;\n` +
            `                    misr_en            : ${lb_misr_en} ;\n` +
            `                    low_power_shift_en : ${lb_lp_shift} ;\n` +
            `                    self_test_en       : ${lb_self_test_en} ;\n` +
            `                    misr               : ${lb_misr} ;\n` +
            `                }\n` +
            `            }\n` +
            `\n` +
            `            BypassChains {\n` +
            `                present             : ${bc_present} ;\n` +
            `                bypass_chain_count  : ${bc_count} ;\n` +
            `                single_bypass_chain : ${bc_single} ;\n` +
            `                BypassChain(${bc_id}) {\n` +
            `                    scan_chain_range_list : ${bc_ranges} ;\n` +
            `                }\n` +
            `            }\n` +
            `\n` +
            `            Compactor {\n` +
            `                type                               : ${comp_type} ;\n` +
            `                pipeline_logic_levels_in_compactor : ${comp_pipe_levels} ;\n` +
            `                change_edge_at_compactor_output    : ${comp_change_edge} ;\n` +
            `                CompactorConnection(${comp_conn_id}) {\n` +
            `                    scan_chain_range_list : ${comp_conn_ranges} ;\n` +
            `                }\n` +
            `            }\n` +
            `\n` +
            `            Clocking {\n` +
            `                type           : ${clk_type} ;\n` +
            `                lockup_cells   : ${clk_lockup_cells} ;\n` +
            `                reset_signal   : ${clk_reset_signal} ;\n` +
            `                reset_polarity : ${clk_reset_pol} ;\n` +
            `            }\n` +
            `\n` +
            `            HighCompressionConfiguration {\n` +
            `                present              : ${hcc_present} ;\n` +
            `                input_channel_count  : ${hcc_in} ;\n` +
            `                output_channel_count : ${hcc_out} ;\n` +
            `            }\n` +
            `\n` +
            `            ShiftPowerOptions {\n` +
            `                present                            : ${spo_present} ;\n` +
            `                full_control                       : ${spo_full_control} ;\n` +
            `                min_switching_threshold_percentage : ${spo_min_thr} ;\n` +
            `            }\n` +
            `\n` +
            `            LogicBistOptions {\n` +
            `                present                   : ${clb_present} ;\n` +
            `                misr_input_ratio          : ${clb_misr_ratio} ;\n` +
            `                chain_mask_register_ratio : ${clb_chain_mask_ratio} ;\n` +
            `                prpg_seed                 : ${clb_prpg_seed} ;\n` +
            `                ShiftPowerOptions {\n` +
            `                    present           : ${clb_spo_present} ;\n` +
            `                    default_operation : ${clb_spo_default_op} ;\n` +
            `                    SwitchingThresholdPercentage {\n` +
            `                        hardware_default : ${clb_spo_hw_default} ;\n` +
            `                    }\n` +
            `                }\n` +
            `            }\n` +
            `\n` +
            `            Connections {\n` +
            `                edt_clock                    : ${cconn_edt_clock} ;\n` +
            `                edt_slave_clock              : ${cconn_slave} ;\n` +
            `                edt_update                   : ${cconn_update} ;\n` +
            `                edt_reset                    : ${cconn_reset} ;\n` +
            `                ssh_chain_group              : ${cconn_ssh} ;\n` +
            `                mode_enables                 : ${cconn_mode_enables} ;\n` +
            `                edt_bypass_change_edge_clock : ${cconn_edge_clock_occ_spec} ;\n` +
            `                StaticExternalControls {\n` +
            `                    edt_bypass                 : ${cconn_sec_bypass2} ;\n` +
            `                    edt_single_bypass_chain    : ${cconn_sec_single2} ;\n` +
            `                    edt_configuration          : ${cconn_sec_cfg2} ;\n` +
            `                    edt_low_power_shift_enable : ${cconn_sec_lp2} ;\n` +
            `                }\n` +
            `                EdtChannelsIn(${in_range}) {\n` +
            `                    port_pin_name      : ${in_port_pin} ;\n` +
            `                    pipeline_clock     : ${in_pipe_clk} ;\n` +
            `                    insert_lockup_cell : ${in_insert_lockup} ;\n` +
            `                    lockup_cell_type   : ${in_lockup_type} ;\n` +
            `                    PipelineStage {\n` +
            `                        parent_instance    : ${in_ps_parent} ;\n` +
            `                        leaf_instance_name : ${in_ps_leaf} ;\n` +
            `                        pipeline_clock     : ${in_ps_clk} ;\n` +
            `                        insert_lockup_cell : ${in_ps_insert} ;\n` +
            `                        lockup_cell_type   : ${in_ps_type} ;\n` +
            `                    }\n` +
            `                }\n` +
            `                EdtChannelsOut(${out_range}) {\n` +
            `                    port_pin_name      : ${out_port_pin} ;\n` +
            `                    pipeline_clock     : ${out_pipe_clk} ;\n` +
            `                    insert_lockup_cell : ${out_insert_lockup} ;\n` +
            `                    lockup_cell_type   : ${out_lockup_type} ;\n` +
            `                    PipelineStage {\n` +
            `                        parent_instance    : ${out_ps_parent} ;\n` +
            `                        leaf_instance_name : ${out_ps_leaf} ;\n` +
            `                        pipeline_clock     : ${out_ps_clk} ;\n` +
            `                        insert_lockup_cell : ${out_ps_insert} ;\n` +
            `                        lockup_cell_type   : ${out_ps_type} ;\n` +
            `                    }\n` +
            `                }\n` +
            `            }\n` +
            `\n` +
            `            Decompressor {\n` +
            `                segments               : ${dec_segments} ;\n` +
            `                max_chains_per_segment : ${dec_max_chains_per_segment} ;\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    // =========================================================
    // EDT / LogicBistOptions (top-level)
    // =========================================================
    'EDT/LogicBistOptions': {
      title: 'LogicBistOptions',
      description: 'EDT 顶层 LogicBistOptions（公共选项）。',
      fields: [
        { attr: 'edt_lb_present', label: 'present', kind: 'select', options: onOffAuto, defaultValue: 'auto' },
        { attr: 'edt_lb_capture_per_cycle', label: 'capture_per_cycle', kind: 'select', options: onOffAuto, defaultValue: 'auto' },
        { attr: 'edt_lb_prpg_reference_seed', label: 'prpg_reference_seed', kind: 'string', defaultValue: '1', help: 'hex; default: 1' },
        { attr: 'edt_lb_self_test', label: 'self_test', kind: 'select', options: onOffAuto, defaultValue: 'auto' },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    EDT {\n` +
            `        LogicBistOptions {\n` +
            `            present             : ${get('edt_lb_present', 'auto')} ;\n` +
            `            capture_per_cycle   : ${get('edt_lb_capture_per_cycle', 'auto')} ;\n` +
            `            prpg_reference_seed : ${get('edt_lb_prpg_reference_seed', '1')} ;\n` +
            `            self_test           : ${get('edt_lb_self_test', 'auto')} ;\n` +
            `            ShiftCycles {\n            }\n` +
            `            WarmupPatternCount {\n            }\n` +
            `        }\n` +
            `    }`
        ),
    },

    'EDT/LogicBistOptions/ShiftCycles': {
      title: 'ShiftCycles',
      description: 'LogicBistOptions/ShiftCycles',
      fields: [
        { attr: 'edt_lb_shiftcycles_max', label: 'max', kind: 'number', defaultValue: '', placeholder: 'int' },
        { attr: 'edt_lb_shiftcycles_hw_default', label: 'hardware_default', kind: 'string', defaultValue: 'max', help: 'default: max' },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    EDT {\n` +
            `        LogicBistOptions {\n` +
            `            ShiftCycles {\n` +
            `                max              : ${get('edt_lb_shiftcycles_max', '')} ;\n` +
            `                hardware_default : ${get('edt_lb_shiftcycles_hw_default', 'max')} ;\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        ),
    },

    'EDT/LogicBistOptions/WarmupPatternCount': {
      title: 'WarmupPatternCount',
      description: 'LogicBistOptions/WarmupPatternCount',
      fields: [
        { attr: 'edt_lb_warmup_max', label: 'max', kind: 'number', defaultValue: 255, help: 'default: 255' },
        { attr: 'edt_lb_warmup_hw_default', label: 'hardware_default', kind: 'number', defaultValue: 0, help: 'default: 0' },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    EDT {\n` +
            `        LogicBistOptions {\n` +
            `            WarmupPatternCount {\n` +
            `                max              : ${get('edt_lb_warmup_max', 255)} ;\n` +
            `                hardware_default : ${get('edt_lb_warmup_hw_default', 0)} ;\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        ),
    },

    // =========================================================
    // EDT / ControllerChain
    // =========================================================
    'EDT/ControllerChain': {
      title: 'ControllerChain',
      description: 'EDT ControllerChain',
      fields: [
        { attr: 'edt_cc_present', label: 'present', kind: 'select', options: onOff, defaultValue: 'off', help: 'default: off' },
        { attr: 'edt_cc_clock', label: 'clock', kind: 'select', options: [{ label: 'tck', value: 'tck' }, { label: 'edt_clock', value: 'edt_clock' }], defaultValue: 'edt_clock', help: 'legal: tck, edt_clock; default: edt_clock' },
        { attr: 'edt_cc_segment_per_instrument', label: 'segment_per_instrument', kind: 'select', options: onOff, defaultValue: 'on', help: 'default: on' },
        { attr: 'edt_cc_max_segment_length', label: 'max_segment_length', kind: 'string', defaultValue: 'unlimited', help: 'int | unlimited; int >= 32' },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    EDT {\n` +
            `        ControllerChain {\n` +
            `            present                : ${get('edt_cc_present', 'off')} ;\n` +
            `            clock                  : ${get('edt_cc_clock', 'edt_clock')} ;\n` +
            `            segment_per_instrument : ${get('edt_cc_segment_per_instrument', 'on')} ;\n` +
            `            max_segment_length     : ${get('edt_cc_max_segment_length', 'unlimited')} ;\n` +
            `            Interface {\n            }\n` +
            `            Connections {\n            }\n` +
            `        }\n` +
            `    }`
        ),
    },

    'EDT/ControllerChain/Interface': {
      title: 'Interface',
      description: 'ControllerChain/Interface',
      fields: [
        { attr: 'edt_cc_if_enable', label: 'enable', kind: 'string', defaultValue: 'ccm_en', help: 'default: ccm_en' },
        { attr: 'edt_cc_if_scan_en', label: 'scan_en', kind: 'string', defaultValue: 'scan_en', help: 'default: scan_en' },
        { attr: 'edt_cc_if_scan_in', label: 'scan_in', kind: 'string', defaultValue: 'scan_in', help: 'default: scan_in' },
        { attr: 'edt_cc_if_scan_out', label: 'scan_out', kind: 'string', defaultValue: 'scan_out', help: 'default: scan_out' },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    EDT {\n` +
            `        ControllerChain {\n` +
            `            Interface {\n` +
            `                enable   : ${get('edt_cc_if_enable', 'ccm_en')} ;\n` +
            `                scan_en  : ${get('edt_cc_if_scan_en', 'scan_en')} ;\n` +
            `                scan_in  : ${get('edt_cc_if_scan_in', 'scan_in')} ;\n` +
            `                scan_out : ${get('edt_cc_if_scan_out', 'scan_out')} ;\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        ),
    },

    'EDT/ControllerChain/Connections': {
      title: 'Connections',
      description: 'ControllerChain/Connections',
      fields: [
        { attr: 'edt_cc_conn_scan_en', label: 'scan_en', kind: 'string', defaultValue: 'OptionalDftSignal(scan_en)', help: 'default: OptionalDftSignal(scan_en)' },
        { attr: 'edt_cc_conn_controller_chain_enable', label: 'controller_chain_enable', kind: 'string', defaultValue: 'OptionalDftSignal(controller_chain_mode)', help: 'default: OptionalDftSignal(controller_chain_mode)' },
        { attr: 'edt_cc_conn_controller_chain_scan_in', label: 'controller_chain_scan_in', kind: 'string', defaultValue: 'control_chain_%s_scan_in', help: 'default: control_chain_%s_scan_in' },
        { attr: 'edt_cc_conn_controller_chain_scan_out', label: 'controller_chain_scan_out', kind: 'string', defaultValue: 'control_chain_%s_scan_out', help: 'default: control_chain_%s_scan_out' },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    EDT {\n` +
            `        ControllerChain {\n` +
            `            Connections {\n` +
            `                scan_en                   : ${get('edt_cc_conn_scan_en', 'OptionalDftSignal(scan_en)')} ;\n` +
            `                controller_chain_enable   : ${get('edt_cc_conn_controller_chain_enable', 'OptionalDftSignal(controller_chain_mode)')} ;\n` +
            `                controller_chain_scan_in  : ${get('edt_cc_conn_controller_chain_scan_in', 'control_chain_%s_scan_in')} ;\n` +
            `                controller_chain_scan_out : ${get('edt_cc_conn_controller_chain_scan_out', 'control_chain_%s_scan_out')} ;\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        ),
    },

    // =========================================================
    // EDT / Connections
    // =========================================================
    'EDT/Connections': {
      title: 'Connections',
      description: 'EDT 顶层 Connections',
      fields: [
        { attr: 'edt_conn_edt_clock', label: 'edt_clock', kind: 'string', defaultValue: 'OptionalDftSignal(edt_clock)', help: 'port_pin_name | DftSignal(edt_clock) | OptionalDftSignal(edt_clock)' },
        { attr: 'edt_conn_edt_slave_clock', label: 'edt_slave_clock', kind: 'string', defaultValue: 'edt_slave_clock', help: 'default: edt_slave_clock' },
        { attr: 'edt_conn_edt_update', label: 'edt_update', kind: 'string', defaultValue: 'OptionalDftSignal(edt_update)', help: 'port_pin_name | DftSignal(edt_update) | OptionalDftSignal(edt_update)' },
        { attr: 'edt_conn_edt_reset', label: 'edt_reset', kind: 'string', defaultValue: 'edt_reset', help: 'default: edt_reset' },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    EDT {\n` +
            `        Connections {\n` +
            `            edt_clock       : ${get('edt_conn_edt_clock', 'OptionalDftSignal(edt_clock)')} ;\n` +
            `            edt_slave_clock : ${get('edt_conn_edt_slave_clock', 'edt_slave_clock')} ;\n` +
            `            edt_update      : ${get('edt_conn_edt_update', 'OptionalDftSignal(edt_update)')} ;\n` +
            `            edt_reset       : ${get('edt_conn_edt_reset', 'edt_reset')} ;\n` +
            `            StaticExternalControls {\n            }\n` +
            `        }\n` +
            `    }`
        ),
    },

    'EDT/Connections/StaticExternalControls': {
      title: 'StaticExternalControls',
      description: 'EDT/Connections/StaticExternalControls',
      fields: [
        { attr: 'edt_conn_sec_edt_bypass', label: 'edt_bypass', kind: 'string', defaultValue: '0', help: 'port_pin_name | 0 | 1' },
        { attr: 'edt_conn_sec_edt_single_bypass_chain', label: 'edt_single_bypass_chain', kind: 'string', defaultValue: '0', help: 'port_pin_name | 0 | 1' },
        { attr: 'edt_conn_sec_edt_configuration', label: 'edt_configuration', kind: 'string', defaultValue: '0', help: 'port_pin_name | 0 | 1' },
        { attr: 'edt_conn_sec_edt_low_power_shift_enable', label: 'edt_low_power_shift_enable', kind: 'string', defaultValue: '0', help: 'port_pin_name | 0 | 1' },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    EDT {\n` +
            `        Connections {\n` +
            `            StaticExternalControls {\n` +
            `                edt_bypass                 : ${get('edt_conn_sec_edt_bypass', '0')} ;\n` +
            `                edt_single_bypass_chain    : ${get('edt_conn_sec_edt_single_bypass_chain', '0')} ;\n` +
            `                edt_configuration          : ${get('edt_conn_sec_edt_configuration', '0')} ;\n` +
            `                edt_low_power_shift_enable : ${get('edt_conn_sec_edt_low_power_shift_enable', '0')} ;\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        ),
    },

    // =========================================================
    // EDT / Controller(id)
    // =========================================================
    'EDT/Controller': {
      title: 'Controller(id)',
      description: 'EDT Controller 顶层字段（其余子块在下面节点配置）。',
      fields: [
        { attr: 'edt_ctrl_id', label: 'id', kind: 'string', defaultValue: 'id' },

        { attr: 'edt_ctrl_ijtag_host_interface', label: 'ijtag_host_interface', kind: 'string', defaultValue: 'none', placeholder: 'ijtag_leaf_node_name | none' },

        { attr: 'edt_ctrl_longest_chain_range', label: 'longest_chain_range', kind: 'string', defaultValue: '', help: 'min, max' },
        { attr: 'edt_ctrl_scan_chain_count', label: 'scan_chain_count', kind: 'number', defaultValue: '' },
        { attr: 'edt_ctrl_input_channel_count', label: 'input_channel_count', kind: 'number', defaultValue: '' },
        { attr: 'edt_ctrl_output_channel_count', label: 'output_channel_count', kind: 'number', defaultValue: '' },

        { attr: 'edt_ctrl_separate_control_data_channels', label: 'separate_control_data_channels', kind: 'select', options: onOff, defaultValue: 'off' },

        { attr: 'edt_ctrl_parent_instance', label: 'parent_instance', kind: 'string', defaultValue: '' },
        { attr: 'edt_ctrl_leaf_instance_name', label: 'leaf_instance_name', kind: 'string', defaultValue: '' },

        { attr: 'edt_ctrl_connect_bscan_segments_to_lsb_chains', label: 'connect_bscan_segments_to_lsb_chains', kind: 'select', options: onOffAuto, defaultValue: 'auto' },

        { attr: 'edt_ctrl_edt_bypass_change_edge_clock', label: 'edt_bypass_change_edge_clock', kind: 'select', options: [{ label: 'prefer_edt_clock', value: 'prefer_edt_clock' }, { label: 'scan_clock', value: 'scan_clock' }], defaultValue: 'prefer_edt_clock' },

        { attr: 'edt_ctrl_chain_output_masking_disable', label: 'chain_output_masking_disable', kind: 'select', options: onOff, defaultValue: 'off' },

        { attr: 'edt_ctrl_lvx_present', label: 'LVxMode.present', kind: 'select', options: onOffAuto, defaultValue: 'auto' },
        { attr: 'edt_ctrl_lvx_enable_one_chain', label: 'LVxMode.enable_one_chain', kind: 'select', options: onOff, defaultValue: 'off' },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            ijtag_host_interface                 : ${get('edt_ctrl_ijtag_host_interface', 'none')} ;\n` +
            `            longest_chain_range                  : ${get('edt_ctrl_longest_chain_range', '')} ;\n` +
            `            scan_chain_count                     : ${get('edt_ctrl_scan_chain_count', '')} ;\n` +
            `            input_channel_count                  : ${get('edt_ctrl_input_channel_count', '')} ;\n` +
            `            output_channel_count                 : ${get('edt_ctrl_output_channel_count', '')} ;\n` +
            `            separate_control_data_channels       : ${get('edt_ctrl_separate_control_data_channels', 'off')} ;\n` +
            `            parent_instance                      : ${get('edt_ctrl_parent_instance', '')} ;\n` +
            `            leaf_instance_name                   : ${get('edt_ctrl_leaf_instance_name', '')} ;\n` +
            `            connect_bscan_segments_to_lsb_chains : ${get('edt_ctrl_connect_bscan_segments_to_lsb_chains', 'auto')} ;\n` +
            `            edt_bypass_change_edge_clock         : ${get('edt_ctrl_edt_bypass_change_edge_clock', 'prefer_edt_clock')} ;\n` +
            `            chain_output_masking_disable         : ${get('edt_ctrl_chain_output_masking_disable', 'off')} ;\n` +
            `            LVxMode {\n` +
            `                present          : ${get('edt_ctrl_lvx_present', 'auto')} ;\n` +
            `                enable_one_chain : ${get('edt_ctrl_lvx_enable_one_chain', 'off')} ;\n` +
            `            }\n` +
            `            Interface {\n            }\n` +
            `            BypassChains {\n            }\n` +
            `            Compactor {\n            }\n` +
            `            Clocking {\n            }\n` +
            `            HighCompressionConfiguration {\n            }\n` +
            `            ShiftPowerOptions {\n            }\n` +
            `            LogicBistOptions {\n            }\n` +
            `            Connections {\n            }\n` +
            `            Decompressor {\n            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    // =========================================================
    // EDT / Controller / Interface
    // =========================================================
    'EDT/Controller/Interface': {
      title: 'Interface',
      description: 'Controller/Interface',
      fields: [
        { attr: 'edt_ctrl_if_edt_clock', label: 'edt_clock', kind: 'string', defaultValue: 'edt_clock', help: 'default: edt_clock' },
        { attr: 'edt_ctrl_if_edt_slave_clock', label: 'edt_slave_clock', kind: 'string', defaultValue: 'edt_slave_clock', help: 'default: edt_slave_clock' },
        { attr: 'edt_ctrl_if_edt_update', label: 'edt_update', kind: 'string', defaultValue: 'edt_update', help: 'default: edt_update' },
        { attr: 'edt_ctrl_if_edt_reset', label: 'edt_reset', kind: 'string', defaultValue: 'edt_reset', help: 'default: edt_reset' },
        { attr: 'edt_ctrl_if_edt_channels_in_bus', label: 'edt_channels_in_bus', kind: 'string', defaultValue: 'edt_channels_in', help: 'default: edt_channels_in' },
        { attr: 'edt_ctrl_if_edt_channels_out_bus', label: 'edt_channels_out_bus', kind: 'string', defaultValue: 'edt_channels_out', help: 'default: edt_channels_out' },
        { attr: 'edt_ctrl_if_edt_bypass_change_edge_clock', label: 'edt_bypass_change_edge_clock', kind: 'string', defaultValue: 'edt_bypass_change_edge_clock', help: 'default: edt_bypass_change_edge_clock' },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            Interface {\n` +
            `                edt_clock                    : ${get('edt_ctrl_if_edt_clock', 'edt_clock')} ;\n` +
            `                edt_slave_clock              : ${get('edt_ctrl_if_edt_slave_clock', 'edt_slave_clock')} ;\n` +
            `                edt_update                   : ${get('edt_ctrl_if_edt_update', 'edt_update')} ;\n` +
            `                edt_reset                    : ${get('edt_ctrl_if_edt_reset', 'edt_reset')} ;\n` +
            `                edt_channels_in_bus          : ${get('edt_ctrl_if_edt_channels_in_bus', 'edt_channels_in')} ;\n` +
            `                edt_channels_out_bus         : ${get('edt_ctrl_if_edt_channels_out_bus', 'edt_channels_out')} ;\n` +
            `                edt_bypass_change_edge_clock : ${get('edt_ctrl_if_edt_bypass_change_edge_clock', 'edt_bypass_change_edge_clock')} ;\n` +
            `                IjtagScanInterface {\n                }\n` +
            `                StaticExternalControls {\n                }\n` +
            `                LogicBist {\n                }\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    'EDT/Controller/Interface/IjtagScanInterface': {
      title: 'IjtagScanInterface',
      description: 'Controller/Interface/IjtagScanInterface',
      fields: [
        { attr: 'edt_ctrl_if_ijtag_static_signals_driven', label: 'static_signals_driven', kind: 'select', options: [{ label: 'always', value: 'always' }, { label: 'as_needed', value: 'as_needed' }], defaultValue: 'as_needed', help: 'default: as_needed' },
        { attr: 'edt_ctrl_if_ijtag_tck', label: 'tck', kind: 'string', defaultValue: 'ijtag_tck' },
        { attr: 'edt_ctrl_if_ijtag_reset', label: 'reset', kind: 'string', defaultValue: 'ijtag_reset' },
        { attr: 'edt_ctrl_if_ijtag_select', label: 'select', kind: 'string', defaultValue: 'ijtag_sel' },
        { attr: 'edt_ctrl_if_ijtag_capture_en', label: 'capture_en', kind: 'string', defaultValue: 'ijtag_ce' },
        { attr: 'edt_ctrl_if_ijtag_shift_en', label: 'shift_en', kind: 'string', defaultValue: 'ijtag_se' },
        { attr: 'edt_ctrl_if_ijtag_update_en', label: 'update_en', kind: 'string', defaultValue: 'ijtag_ue' },
        { attr: 'edt_ctrl_if_ijtag_scan_in', label: 'scan_in', kind: 'string', defaultValue: 'ijtag_si' },
        { attr: 'edt_ctrl_if_ijtag_scan_out', label: 'scan_out', kind: 'string', defaultValue: 'ijtag_so' },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            Interface {\n` +
            `                IjtagScanInterface {\n` +
            `                    static_signals_driven : ${get('edt_ctrl_if_ijtag_static_signals_driven', 'as_needed')} ;\n` +
            `                    tck       : ${get('edt_ctrl_if_ijtag_tck', 'ijtag_tck')} ;\n` +
            `                    reset     : ${get('edt_ctrl_if_ijtag_reset', 'ijtag_reset')} ;\n` +
            `                    select    : ${get('edt_ctrl_if_ijtag_select', 'ijtag_sel')} ;\n` +
            `                    capture_en: ${get('edt_ctrl_if_ijtag_capture_en', 'ijtag_ce')} ;\n` +
            `                    shift_en  : ${get('edt_ctrl_if_ijtag_shift_en', 'ijtag_se')} ;\n` +
            `                    update_en : ${get('edt_ctrl_if_ijtag_update_en', 'ijtag_ue')} ;\n` +
            `                    scan_in   : ${get('edt_ctrl_if_ijtag_scan_in', 'ijtag_si')} ;\n` +
            `                    scan_out  : ${get('edt_ctrl_if_ijtag_scan_out', 'ijtag_so')} ;\n` +
            `                }\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    'EDT/Controller/Interface/StaticExternalControls': {
      title: 'StaticExternalControls',
      description: 'Controller/Interface/StaticExternalControls（port_name 层）',
      fields: [
        { attr: 'edt_ctrl_if_sec_edt_bypass', label: 'edt_bypass', kind: 'string', defaultValue: 'edt_bypass', help: 'default: edt_bypass' },
        { attr: 'edt_ctrl_if_sec_edt_single_bypass_chain', label: 'edt_single_bypass_chain', kind: 'string', defaultValue: 'edt_single_bypass_chain', help: 'default: edt_single_bypass_chain' },
        { attr: 'edt_ctrl_if_sec_edt_configuration', label: 'edt_configuration', kind: 'string', defaultValue: 'edt_configuration', help: 'default: edt_configuration' },
        { attr: 'edt_ctrl_if_sec_edt_low_power_shift_enable', label: 'edt_low_power_shift_enable', kind: 'string', defaultValue: 'edt_low_power_shift_en', help: 'default: edt_low_power_shift_en' },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            Interface {\n` +
            `                StaticExternalControls {\n` +
            `                    edt_bypass                 : ${get('edt_ctrl_if_sec_edt_bypass', 'edt_bypass')} ;\n` +
            `                    edt_single_bypass_chain    : ${get('edt_ctrl_if_sec_edt_single_bypass_chain', 'edt_single_bypass_chain')} ;\n` +
            `                    edt_configuration          : ${get('edt_ctrl_if_sec_edt_configuration', 'edt_configuration')} ;\n` +
            `                    edt_low_power_shift_enable : ${get('edt_ctrl_if_sec_edt_low_power_shift_enable', 'edt_low_power_shift_en')} ;\n` +
            `                }\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    'EDT/Controller/Interface/LogicBist': {
      title: 'LogicBist',
      description: 'Controller/Interface/LogicBist',
      fields: [
        { attr: 'edt_ctrl_if_lb_reset', label: 'reset', kind: 'string', defaultValue: 'lbist_reset' },
        { attr: 'edt_ctrl_if_lb_enable', label: 'enable', kind: 'string', defaultValue: 'lbist_en' },
        { attr: 'edt_ctrl_if_lb_prpg_en', label: 'prpg_en', kind: 'string', defaultValue: 'lbist_prpg_en' },
        { attr: 'edt_ctrl_if_lb_misr_en', label: 'misr_en', kind: 'string', defaultValue: 'misr_accumulate_en' },
        { attr: 'edt_ctrl_if_lb_low_power_shift_en', label: 'low_power_shift_en', kind: 'string', defaultValue: 'lbist_low_power_shift_en' },
        { attr: 'edt_ctrl_if_lb_self_test_en', label: 'self_test_en', kind: 'string', defaultValue: 'self_test_en' },
        { attr: 'edt_ctrl_if_lb_misr', label: 'misr', kind: 'string', defaultValue: '-', help: 'default: - (not created)' },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            Interface {\n` +
            `                LogicBist {\n` +
            `                    reset              : ${get('edt_ctrl_if_lb_reset', 'lbist_reset')} ;\n` +
            `                    enable             : ${get('edt_ctrl_if_lb_enable', 'lbist_en')} ;\n` +
            `                    prpg_en            : ${get('edt_ctrl_if_lb_prpg_en', 'lbist_prpg_en')} ;\n` +
            `                    misr_en            : ${get('edt_ctrl_if_lb_misr_en', 'misr_accumulate_en')} ;\n` +
            `                    low_power_shift_en : ${get('edt_ctrl_if_lb_low_power_shift_en', 'lbist_low_power_shift_en')} ;\n` +
            `                    self_test_en       : ${get('edt_ctrl_if_lb_self_test_en', 'self_test_en')} ;\n` +
            `                    misr               : ${get('edt_ctrl_if_lb_misr', '-')} ;\n` +
            `                }\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    // =========================================================
    // EDT / Controller / BypassChains
    // =========================================================
    'EDT/Controller/BypassChains': {
      title: 'BypassChains',
      description: 'Controller/BypassChains',
      fields: [
        { attr: 'edt_ctrl_bc_present', label: 'present', kind: 'select', options: onOff, defaultValue: 'off' },
        { attr: 'edt_ctrl_bc_bypass_chain_count', label: 'bypass_chain_count', kind: 'string', defaultValue: 'auto', help: 'int | auto' },
        { attr: 'edt_ctrl_bc_single_bypass_chain', label: 'single_bypass_chain', kind: 'select', options: onOffAuto, defaultValue: 'auto' },

        { attr: 'edt_ctrl_bc_chain_id', label: 'BypassChain(id)', kind: 'number', defaultValue: 1, help: 'legal: 1..maxposint' },
        { attr: 'edt_ctrl_bc_scan_chain_range_list', label: 'scan_chain_range_list', kind: 'textarea', defaultValue: '', help: listHelp('1-10, 20-30') },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        const bid = get('edt_ctrl_bc_chain_id', 1);
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            BypassChains {\n` +
            `                present             : ${get('edt_ctrl_bc_present', 'off')} ;\n` +
            `                bypass_chain_count  : ${get('edt_ctrl_bc_bypass_chain_count', 'auto')} ;\n` +
            `                single_bypass_chain : ${get('edt_ctrl_bc_single_bypass_chain', 'auto')} ;\n` +
            `                BypassChain(${bid}) {\n` +
            `                    scan_chain_range_list : ${get('edt_ctrl_bc_scan_chain_range_list', '')} ;\n` +
            `                }\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    // =========================================================
    // EDT / Controller / Compactor
    // =========================================================
    'EDT/Controller/Compactor': {
      title: 'Compactor',
      description: 'Controller/Compactor',
      fields: [
        { attr: 'edt_ctrl_comp_type', label: 'type', kind: 'select', options: [{ label: 'xpress', value: 'xpress' }, { label: 'basic', value: 'basic' }], defaultValue: 'xpress' },
        { attr: 'edt_ctrl_comp_pipeline_logic_levels', label: 'pipeline_logic_levels_in_compactor', kind: 'string', defaultValue: 'off', help: 'int | off' },
        {
          attr: 'edt_ctrl_comp_change_edge',
          label: 'change_edge_at_compactor_output',
          kind: 'select',
          options: [
            { label: 'any', value: 'any' },
            { label: 'leading_edge_of_edt_clock', value: 'leading_edge_of_edt_clock' },
            { label: 'trailing_edge_of_edt_clock', value: 'trailing_edge_of_edt_clock' },
          ],
          defaultValue: 'any',
        },
        { attr: 'edt_ctrl_comp_conn_id', label: 'CompactorConnection(id)', kind: 'number', defaultValue: 1, help: 'legal: 1..maxposint' },
        { attr: 'edt_ctrl_comp_conn_scan_chain_range_list', label: 'scan_chain_range_list', kind: 'textarea', defaultValue: '', help: listHelp('1-10, 20-30') },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        const cid = get('edt_ctrl_comp_conn_id', 1);
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            Compactor {\n` +
            `                type                               : ${get('edt_ctrl_comp_type', 'xpress')} ;\n` +
            `                pipeline_logic_levels_in_compactor : ${get('edt_ctrl_comp_pipeline_logic_levels', 'off')} ;\n` +
            `                change_edge_at_compactor_output    : ${get('edt_ctrl_comp_change_edge', 'any')} ;\n` +
            `                CompactorConnection(${cid}) {\n` +
            `                    scan_chain_range_list : ${get('edt_ctrl_comp_conn_scan_chain_range_list', '')} ;\n` +
            `                }\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    // =========================================================
    // EDT / Controller / Clocking
    // =========================================================
    'EDT/Controller/Clocking': {
      title: 'Clocking',
      description: 'Controller/Clocking',
      fields: [
        { attr: 'edt_ctrl_clocking_type', label: 'type', kind: 'select', options: [{ label: 'edge', value: 'edge' }, { label: 'level', value: 'level' }], defaultValue: 'edge' },
        { attr: 'edt_ctrl_clocking_lockup_cells', label: 'lockup_cells', kind: 'select', options: onOff, defaultValue: 'on' },
        { attr: 'edt_ctrl_clocking_reset_signal', label: 'reset_signal', kind: 'select', options: [{ label: 'auto', value: 'auto' }, { label: 'asynchronous', value: 'asynchronous' }, { label: 'off', value: 'off' }, { label: 'ijtag_reset', value: 'ijtag_reset' }], defaultValue: 'auto' },
        { attr: 'edt_ctrl_clocking_reset_polarity', label: 'reset_polarity', kind: 'select', options: activePolarityAuto, defaultValue: 'auto' },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            Clocking {\n` +
            `                type           : ${get('edt_ctrl_clocking_type', 'edge')} ;\n` +
            `                lockup_cells   : ${get('edt_ctrl_clocking_lockup_cells', 'on')} ;\n` +
            `                reset_signal   : ${get('edt_ctrl_clocking_reset_signal', 'auto')} ;\n` +
            `                reset_polarity : ${get('edt_ctrl_clocking_reset_polarity', 'auto')} ;\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    // =========================================================
    // EDT / Controller / HighCompressionConfiguration
    // =========================================================
    'EDT/Controller/HighCompressionConfiguration': {
      title: 'HighCompressionConfiguration',
      description: 'Controller/HighCompressionConfiguration',
      fields: [
        { attr: 'edt_ctrl_hcc_present', label: 'present', kind: 'select', options: onOff, defaultValue: 'off' },
        { attr: 'edt_ctrl_hcc_input_channel_count', label: 'input_channel_count', kind: 'number', defaultValue: '' },
        { attr: 'edt_ctrl_hcc_output_channel_count', label: 'output_channel_count', kind: 'number', defaultValue: '' },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            HighCompressionConfiguration {\n` +
            `                present              : ${get('edt_ctrl_hcc_present', 'off')} ;\n` +
            `                input_channel_count  : ${get('edt_ctrl_hcc_input_channel_count', '')} ;\n` +
            `                output_channel_count : ${get('edt_ctrl_hcc_output_channel_count', '')} ;\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    // =========================================================
    // EDT / Controller / ShiftPowerOptions
    // =========================================================
    'EDT/Controller/ShiftPowerOptions': {
      title: 'ShiftPowerOptions',
      description: 'Controller/ShiftPowerOptions',
      fields: [
        { attr: 'edt_ctrl_spo_present', label: 'present', kind: 'select', options: onOff, defaultValue: 'off' },
        { attr: 'edt_ctrl_spo_full_control', label: 'full_control', kind: 'select', options: onOff, defaultValue: 'off' },
        { attr: 'edt_ctrl_spo_min_switching_threshold_percentage', label: 'min_switching_threshold_percentage', kind: 'number', defaultValue: 15, help: 'default: 15' },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            ShiftPowerOptions {\n` +
            `                present                            : ${get('edt_ctrl_spo_present', 'off')} ;\n` +
            `                full_control                       : ${get('edt_ctrl_spo_full_control', 'off')} ;\n` +
            `                min_switching_threshold_percentage : ${get('edt_ctrl_spo_min_switching_threshold_percentage', 15)} ;\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    // =========================================================
    // EDT / Controller / LogicBistOptions (controller-level)
    // =========================================================
    'EDT/Controller/LogicBistOptions': {
      title: 'LogicBistOptions',
      description: 'Controller/LogicBistOptions',
      fields: [
        { attr: 'edt_ctrl_lbopt_present', label: 'present', kind: 'select', options: onOffAuto, defaultValue: 'auto' },
        { attr: 'edt_ctrl_lbopt_misr_input_ratio', label: 'misr_input_ratio', kind: 'string', defaultValue: 'auto', help: 'integer | auto' },
        { attr: 'edt_ctrl_lbopt_chain_mask_register_ratio', label: 'chain_mask_register_ratio', kind: 'number', defaultValue: 1, help: 'default: 1' },
        { attr: 'edt_ctrl_lbopt_prpg_seed', label: 'prpg_seed', kind: 'string', defaultValue: '1', help: 'hex_value; default: 1' },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            LogicBistOptions {\n` +
            `                present                   : ${get('edt_ctrl_lbopt_present', 'auto')} ;\n` +
            `                misr_input_ratio          : ${get('edt_ctrl_lbopt_misr_input_ratio', 'auto')} ;\n` +
            `                chain_mask_register_ratio : ${get('edt_ctrl_lbopt_chain_mask_register_ratio', 1)} ;\n` +
            `                prpg_seed                 : ${get('edt_ctrl_lbopt_prpg_seed', '1')} ;\n` +
            `                ShiftPowerOptions {\n                }\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    'EDT/Controller/LogicBistOptions/ShiftPowerOptions': {
      title: 'ShiftPowerOptions',
      description: 'Controller/LogicBistOptions/ShiftPowerOptions',
      fields: [
        { attr: 'edt_ctrl_lbopt_spo_present', label: 'present', kind: 'select', options: offOnAuto, defaultValue: 'auto' },
        { attr: 'edt_ctrl_lbopt_spo_default_operation', label: 'default_operation', kind: 'select', options: [{ label: 'enabled', value: 'enabled' }, { label: 'disabled', value: 'disabled' }], defaultValue: 'enabled' },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            LogicBistOptions {\n` +
            `                ShiftPowerOptions {\n` +
            `                    present           : ${get('edt_ctrl_lbopt_spo_present', 'auto')} ;\n` +
            `                    default_operation : ${get('edt_ctrl_lbopt_spo_default_operation', 'enabled')} ;\n` +
            `                    SwitchingThresholdPercentage {\n                    }\n` +
            `                }\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    'EDT/Controller/LogicBistOptions/ShiftPowerOptions/SwitchingThresholdPercentage': {
      title: 'SwitchingThresholdPercentage',
      description: 'Controller/LogicBistOptions/ShiftPowerOptions/SwitchingThresholdPercentage',
      fields: [
        { attr: 'edt_ctrl_lbopt_spo_stp_hw_default', label: 'hardware_default', kind: 'number', defaultValue: 15, help: 'default: 15' },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            LogicBistOptions {\n` +
            `                ShiftPowerOptions {\n` +
            `                    SwitchingThresholdPercentage {\n` +
            `                        hardware_default : ${get('edt_ctrl_lbopt_spo_stp_hw_default', 15)} ;\n` +
            `                    }\n` +
            `                }\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    // =========================================================
    // EDT / Controller / Connections
    // =========================================================
    'EDT/Controller/Connections': {
      title: 'Connections',
      description: 'Controller/Connections',
      fields: [
        { attr: 'edt_ctrl_conn_edt_clock', label: 'edt_clock', kind: 'string', defaultValue: 'OptionalDftSignal(edt_clock)', help: 'port_pin_name | DftSignal(edt_clock) | OptionalDftSignal(edt_clock)' },
        { attr: 'edt_ctrl_conn_edt_slave_clock', label: 'edt_slave_clock', kind: 'string', defaultValue: 'edt_slave_clock', help: 'default: edt_slave_clock' },
        { attr: 'edt_ctrl_conn_edt_update', label: 'edt_update', kind: 'string', defaultValue: 'OptionalDftSignal(edt_update)', help: 'port_pin_name | DftSignal(edt_update) | OptionalDftSignal(edt_update)' },
        { attr: 'edt_ctrl_conn_edt_reset', label: 'edt_reset', kind: 'string', defaultValue: '', help: 'port_pin_name' },
        { attr: 'edt_ctrl_conn_ssh_chain_group', label: 'ssh_chain_group', kind: 'string', defaultValue: '', help: 'chain_group_id' },
        { attr: 'edt_ctrl_conn_mode_enables', label: 'mode_enables', kind: 'textarea', defaultValue: '', help: 'port_pin_name | DftSignal(scan_mode_dft_signal), ...；' + listHelp('DftSignal(x), sig0, sig1') },
        { attr: 'edt_ctrl_conn_edt_bypass_change_edge_clock', label: 'edt_bypass_change_edge_clock', kind: 'string', defaultValue: '', help: 'occ_spec' },

        // EdtChannelsIn/Out 的参数入口
        { attr: 'edt_ctrl_conn_in_range', label: 'EdtChannelsIn(range)', kind: 'string', defaultValue: 'range', help: 'range 形如 0..N 或 0-3' },
        { attr: 'edt_ctrl_conn_out_range', label: 'EdtChannelsOut(range)', kind: 'string', defaultValue: 'range', help: 'range 形如 0..N 或 0-3' },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        const inRange = get('edt_ctrl_conn_in_range', 'range');
        const outRange = get('edt_ctrl_conn_out_range', 'range');
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            Connections {\n` +
            `                edt_clock                    : ${get('edt_ctrl_conn_edt_clock', 'OptionalDftSignal(edt_clock)')} ;\n` +
            `                edt_slave_clock              : ${get('edt_ctrl_conn_edt_slave_clock', 'edt_slave_clock')} ;\n` +
            `                edt_update                   : ${get('edt_ctrl_conn_edt_update', 'OptionalDftSignal(edt_update)')} ;\n` +
            `                edt_reset                    : ${get('edt_ctrl_conn_edt_reset', '')} ;\n` +
            `                ssh_chain_group              : ${get('edt_ctrl_conn_ssh_chain_group', '')} ;\n` +
            `                mode_enables                 : ${get('edt_ctrl_conn_mode_enables', '')} ;\n` +
            `                edt_bypass_change_edge_clock : ${get('edt_ctrl_conn_edt_bypass_change_edge_clock', '')} ;\n` +
            `                StaticExternalControls {\n                }\n` +
            `                EdtChannelsIn(${inRange}) {\n                }\n` +
            `                EdtChannelsOut(${outRange}) {\n                }\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    'EDT/Controller/Connections/StaticExternalControls': {
      title: 'StaticExternalControls',
      description: 'Controller/Connections/StaticExternalControls',
      fields: [
        { attr: 'edt_ctrl_conn_sec_edt_bypass', label: 'edt_bypass', kind: 'string', defaultValue: '0', help: 'port_pin_name | 0 | 1' },
        { attr: 'edt_ctrl_conn_sec_edt_single_bypass_chain', label: 'edt_single_bypass_chain', kind: 'string', defaultValue: '0', help: 'port_pin_name | 0 | 1' },
        { attr: 'edt_ctrl_conn_sec_edt_configuration', label: 'edt_configuration', kind: 'string', defaultValue: '0', help: 'port_pin_name | 0 | 1' },
        { attr: 'edt_ctrl_conn_sec_edt_low_power_shift_enable', label: 'edt_low_power_shift_enable', kind: 'string', defaultValue: '0', help: 'port_pin_name | 0 | 1' },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            Connections {\n` +
            `                StaticExternalControls {\n` +
            `                    edt_bypass                 : ${get('edt_ctrl_conn_sec_edt_bypass', '0')} ;\n` +
            `                    edt_single_bypass_chain    : ${get('edt_ctrl_conn_sec_edt_single_bypass_chain', '0')} ;\n` +
            `                    edt_configuration          : ${get('edt_ctrl_conn_sec_edt_configuration', '0')} ;\n` +
            `                    edt_low_power_shift_enable : ${get('edt_ctrl_conn_sec_edt_low_power_shift_enable', '0')} ;\n` +
            `                }\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    // -------------------------
    // EdtChannelsIn(range)
    // -------------------------
    'EDT/Controller/Connections/EdtChannelsIn': {
      title: 'EdtChannelsIn(range)',
      description: 'Controller/Connections/EdtChannelsIn(range)',
      fields: [
        { attr: 'edt_ctrl_conn_in_range', label: 'range', kind: 'string', defaultValue: 'range', help: '用于块名 EdtChannelsIn(range)' },
        { attr: 'edt_ctrl_conn_in_port_pin_name', label: 'port_pin_name', kind: 'string', defaultValue: '', help: 'port_pin_name' },
        { attr: 'edt_ctrl_conn_in_pipeline_clock', label: 'pipeline_clock', kind: 'string', defaultValue: 'Inherited', help: 'default: Inherited from Connections/edt_clock' },
        { attr: 'edt_ctrl_conn_in_insert_lockup_cell', label: 'insert_lockup_cell', kind: 'select', options: [{ label: 'auto', value: 'auto' }, { label: 'off', value: 'off' }], defaultValue: 'auto' },
        { attr: 'edt_ctrl_conn_in_lockup_cell_type', label: 'lockup_cell_type', kind: 'select', options: [{ label: 'latch', value: 'latch' }, { label: 'dff', value: 'dff' }], defaultValue: 'latch' },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        const r = get('edt_ctrl_conn_in_range', 'range');
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            Connections {\n` +
            `                EdtChannelsIn(${r}) {\n` +
            `                    port_pin_name      : ${get('edt_ctrl_conn_in_port_pin_name', '')} ;\n` +
            `                    pipeline_clock     : ${get('edt_ctrl_conn_in_pipeline_clock', 'Inherited')} ;\n` +
            `                    insert_lockup_cell : ${get('edt_ctrl_conn_in_insert_lockup_cell', 'auto')} ;\n` +
            `                    lockup_cell_type   : ${get('edt_ctrl_conn_in_lockup_cell_type', 'latch')} ;\n` +
            `                    PipelineStage {\n                    }\n` +
            `                }\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    'EDT/Controller/Connections/EdtChannelsIn/PipelineStage': {
      title: 'PipelineStage',
      description: 'EdtChannelsIn/PipelineStage（默认继承 EdtChannelsIn 的设置）',
      fields: [
        { attr: 'edt_ctrl_conn_in_ps_parent_instance', label: 'parent_instance', kind: 'string', defaultValue: '' },
        { attr: 'edt_ctrl_conn_in_ps_leaf_instance_name', label: 'leaf_instance_name', kind: 'string', defaultValue: '' },
        { attr: 'edt_ctrl_conn_in_ps_pipeline_clock', label: 'pipeline_clock', kind: 'string', defaultValue: 'Inherited', help: 'default: Inherited from EdtChannelsIn value' },
        { attr: 'edt_ctrl_conn_in_ps_insert_lockup_cell', label: 'insert_lockup_cell', kind: 'string', defaultValue: 'Inherited', help: 'default: Inherited from EdtChannelsIn value' },
        { attr: 'edt_ctrl_conn_in_ps_lockup_cell_type', label: 'lockup_cell_type', kind: 'string', defaultValue: 'Inherited', help: 'default: Inherited from EdtChannelsIn value' },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        const r = get('edt_ctrl_conn_in_range', 'range');
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            Connections {\n` +
            `                EdtChannelsIn(${r}) {\n` +
            `                    PipelineStage {\n` +
            `                        parent_instance    : ${get('edt_ctrl_conn_in_ps_parent_instance', '')} ;\n` +
            `                        leaf_instance_name : ${get('edt_ctrl_conn_in_ps_leaf_instance_name', '')} ;\n` +
            `                        pipeline_clock     : ${get('edt_ctrl_conn_in_ps_pipeline_clock', 'Inherited')} ;\n` +
            `                        insert_lockup_cell : ${get('edt_ctrl_conn_in_ps_insert_lockup_cell', 'Inherited')} ;\n` +
            `                        lockup_cell_type   : ${get('edt_ctrl_conn_in_ps_lockup_cell_type', 'Inherited')} ;\n` +
            `                    }\n` +
            `                }\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    // -------------------------
    // EdtChannelsOut(range)
    // -------------------------
    'EDT/Controller/Connections/EdtChannelsOut': {
      title: 'EdtChannelsOut(range)',
      description: 'Controller/Connections/EdtChannelsOut(range)',
      fields: [
        { attr: 'edt_ctrl_conn_out_range', label: 'range', kind: 'string', defaultValue: 'range', help: '用于块名 EdtChannelsOut(range)' },
        { attr: 'edt_ctrl_conn_out_port_pin_name', label: 'port_pin_name', kind: 'string', defaultValue: '', help: 'port_pin_name' },
        { attr: 'edt_ctrl_conn_out_pipeline_clock', label: 'pipeline_clock', kind: 'string', defaultValue: 'edt_clock', help: 'default: edt_clock' },
        { attr: 'edt_ctrl_conn_out_insert_lockup_cell', label: 'insert_lockup_cell', kind: 'select', options: [{ label: 'auto', value: 'auto' }, { label: 'off', value: 'off' }], defaultValue: 'auto' },
        { attr: 'edt_ctrl_conn_out_lockup_cell_type', label: 'lockup_cell_type', kind: 'select', options: [{ label: 'latch', value: 'latch' }, { label: 'dff', value: 'dff' }], defaultValue: 'latch' },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        const r = get('edt_ctrl_conn_out_range', 'range');
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            Connections {\n` +
            `                EdtChannelsOut(${r}) {\n` +
            `                    port_pin_name      : ${get('edt_ctrl_conn_out_port_pin_name', '')} ;\n` +
            `                    pipeline_clock     : ${get('edt_ctrl_conn_out_pipeline_clock', 'edt_clock')} ;\n` +
            `                    insert_lockup_cell : ${get('edt_ctrl_conn_out_insert_lockup_cell', 'auto')} ;\n` +
            `                    lockup_cell_type   : ${get('edt_ctrl_conn_out_lockup_cell_type', 'latch')} ;\n` +
            `                    PipelineStage {\n                    }\n` +
            `                }\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    'EDT/Controller/Connections/EdtChannelsOut/PipelineStage': {
      title: 'PipelineStage',
      description: 'EdtChannelsOut/PipelineStage（默认继承 EdtChannelsOut 的设置）',
      fields: [
        { attr: 'edt_ctrl_conn_out_ps_parent_instance', label: 'parent_instance', kind: 'string', defaultValue: '' },
        { attr: 'edt_ctrl_conn_out_ps_leaf_instance_name', label: 'leaf_instance_name', kind: 'string', defaultValue: '' },
        { attr: 'edt_ctrl_conn_out_ps_pipeline_clock', label: 'pipeline_clock', kind: 'string', defaultValue: 'Inherited', help: 'default: Inherited from EdtChannelsOut value' },
        { attr: 'edt_ctrl_conn_out_ps_insert_lockup_cell', label: 'insert_lockup_cell', kind: 'string', defaultValue: 'Inherited', help: 'default: Inherited from EdtChannelsOut value' },
        { attr: 'edt_ctrl_conn_out_ps_lockup_cell_type', label: 'lockup_cell_type', kind: 'string', defaultValue: 'Inherited', help: 'default: Inherited from EdtChannelsOut value' },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        const r = get('edt_ctrl_conn_out_range', 'range');
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            Connections {\n` +
            `                EdtChannelsOut(${r}) {\n` +
            `                    PipelineStage {\n` +
            `                        parent_instance    : ${get('edt_ctrl_conn_out_ps_parent_instance', '')} ;\n` +
            `                        leaf_instance_name : ${get('edt_ctrl_conn_out_ps_leaf_instance_name', '')} ;\n` +
            `                        pipeline_clock     : ${get('edt_ctrl_conn_out_ps_pipeline_clock', 'Inherited')} ;\n` +
            `                        insert_lockup_cell : ${get('edt_ctrl_conn_out_ps_insert_lockup_cell', 'Inherited')} ;\n` +
            `                        lockup_cell_type   : ${get('edt_ctrl_conn_out_ps_lockup_cell_type', 'Inherited')} ;\n` +
            `                    }\n` +
            `                }\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    // =========================================================
    // EDT / Controller / Decompressor
    // =========================================================
    'EDT/Controller/Decompressor': {
      title: 'Decompressor',
      description: 'Controller/Decompressor',
      fields: [
        { attr: 'edt_ctrl_dec_segments', label: 'segments', kind: 'string', defaultValue: 'auto', help: 'int; default: auto' },
        { attr: 'edt_ctrl_dec_max_chains_per_segment', label: 'max_chains_per_segment', kind: 'number', defaultValue: 150, help: 'default: 150' },
      ],
      buildCode: ({ get }) => {
        const id = get('edt_ctrl_id', 'id');
        return codeHeader(
          `    EDT {\n` +
            `        Controller(${id}) {\n` +
            `            Decompressor {\n` +
            `                segments               : ${get('edt_ctrl_dec_segments', 'auto')} ;\n` +
            `                max_chains_per_segment : ${get('edt_ctrl_dec_max_chains_per_segment', 150)} ;\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },
  },
};

export default edtDefinition;
