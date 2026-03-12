// src/apps/occ/definition.ts
import type { DftsTypeDef, FieldDef } from '../../shared/dfts/types';

const onOff = [
  { label: 'on', value: 'on' },
  { label: 'off', value: 'off' },
];

const onOffAuto = [
  { label: 'auto', value: 'auto' },
  { label: 'on', value: 'on' },
  { label: 'off', value: 'off' },
];

const activePolarity = [
  { label: 'active_high', value: 'active_high' },
  { label: 'active_low', value: 'active_low' },
];

const yesNoAuto = [
  { label: 'auto', value: 'auto' },
  { label: 'off', value: 'off' },
  { label: 'require', value: 'require' },
  { label: 'allow', value: 'allow' },
];

function listHelp(example: string) {
  return `逗号分隔列表，例如：${example}`;
}

function codeHeader(body: string) {
  return `DftSpecification(module_name,id) {\n${body}\n}`;
}

export const occDefinition: DftsTypeDef = {
  type: 'occ',
  title: 'DFT · OCC',
  defaultNode: 'OCC',
  nodes: {
    // =========================
    // OCC (Top)
    // =========================
    OCC: {
      title: 'OCC',
      description: 'OCC 顶层配置',
      fields: [
        {
          attr: 'occ_ijtag_host_interface',
          label: 'ijtag_host_interface',
          kind: 'string',
          defaultValue: 'none',
          placeholder: 'host_name 或 none',
        },
        {
          attr: 'occ_capture_trigger',
          label: 'capture_trigger',
          kind: 'select',
          options: [
            { label: 'auto', value: 'auto' },
            { label: 'shift_en', value: 'shift_en' },
            { label: 'capture_en', value: 'capture_en' },
          ],
          defaultValue: 'auto',
        },
        {
          attr: 'occ_static_clock_control',
          label: 'static_clock_control',
          kind: 'select',
          options: [
            { label: 'auto', value: 'auto' },
            { label: 'off', value: 'off' },
            { label: 'internal', value: 'internal' },
            { label: 'external', value: 'external' },
            { label: 'both', value: 'both' },
          ],
          defaultValue: 'auto',
        },
        {
          attr: 'occ_force_clock_gater_te_tied_off',
          label: 'force_clock_gater_te_tied_off',
          kind: 'select',
          options: onOff,
          defaultValue: 'off',
        },
        {
          attr: 'occ_capture_window_size',
          label: 'capture_window_size',
          kind: 'number',
          defaultValue: 3,
          help: 'default: 3',
        },
        {
          attr: 'occ_fast_capture_staggered_groups',
          label: 'fast_capture_staggered_groups',
          kind: 'select',
          options: [
            { label: '1', value: '1' },
            { label: '2', value: '2' },
            { label: '4', value: '4' },
            { label: '8', value: '8' },
          ],
          defaultValue: '1',
          help: 'legal: 1|2|4|8; default: 1',
        },
        {
          attr: 'occ_internal_clock_gater',
          label: 'internal_clock_gater',
          kind: 'select',
          options: onOffAuto,
          defaultValue: 'auto',
        },
        {
          attr: 'occ_shift_only_mode',
          label: 'shift_only_mode',
          kind: 'select',
          options: onOffAuto,
          defaultValue: 'auto',
        },
        {
          attr: 'occ_kill_clock_mode',
          label: 'kill_clock_mode',
          kind: 'select',
          options: onOffAuto,
          defaultValue: 'auto',
        },
        {
          attr: 'occ_include_clocks_in_icl_model',
          label: 'include_clocks_in_icl_model',
          kind: 'select',
          options: onOffAuto,
          defaultValue: 'auto',
        },
        {
          attr: 'occ_leaf_instance_name',
          label: 'leaf_instance_name',
          kind: 'string',
          defaultValue: '',
          placeholder: 'instance_name',
        },
        {
          attr: 'occ_upstream_parent_occ',
          label: 'upstream_parent_occ',
          kind: 'select',
          options: yesNoAuto,
          defaultValue: 'auto',
          help: '"require" creates a child-mode OCC',
        },
        {
          attr: 'occ_parent_mode',
          label: 'parent_mode',
          kind: 'select',
          options: onOff,
          defaultValue: 'off',
        },
        {
          attr: 'occ_independent_divided_clocks',
          label: 'independent_divided_clocks',
          kind: 'select',
          options: onOff,
          defaultValue: 'off',
        },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    OCC {\n` +
            `        ijtag_host_interface            : ${get('occ_ijtag_host_interface', 'none')} ;\n` +
            `        capture_trigger                 : ${get('occ_capture_trigger', 'auto')} ;\n` +
            `        static_clock_control            : ${get('occ_static_clock_control', 'auto')} ;\n` +
            `        force_clock_gater_te_tied_off   : ${get('occ_force_clock_gater_te_tied_off', 'off')} ;\n` +
            `        capture_window_size             : ${get('occ_capture_window_size', 3)} ;\n` +
            `        fast_capture_staggered_groups   : ${get('occ_fast_capture_staggered_groups', '1')} ;\n` +
            `        internal_clock_gater            : ${get('occ_internal_clock_gater', 'auto')} ;\n` +
            `        shift_only_mode                 : ${get('occ_shift_only_mode', 'auto')} ;\n` +
            `        kill_clock_mode                 : ${get('occ_kill_clock_mode', 'auto')} ;\n` +
            `        include_clocks_in_icl_model     : ${get('occ_include_clocks_in_icl_model', 'auto')} ;\n` +
            `        leaf_instance_name              : ${get('occ_leaf_instance_name', '')} ;\n` +
            `        upstream_parent_occ             : ${get('occ_upstream_parent_occ', 'auto')} ;\n` +
            `        parent_mode                     : ${get('occ_parent_mode', 'off')} ;\n` +
            `        independent_divided_clocks      : ${get('occ_independent_divided_clocks', 'off')} ;\n` +
            `        Interface {\n        }\n` +
            `        Connections {\n        }\n` +
            `        Controller(${get('occ_ctrl_id', 'id')}) {\n        }\n` +
            `    }`
        ),
    },

    // =========================
    // OCC / Interface
    // =========================
    'OCC/Interface': {
      title: 'Interface',
      description: 'OCC Interface 端口定义。',
      fields: [
        { attr: 'occ_if_scan_en', label: 'scan_en', kind: 'string', defaultValue: 'scan_en', help: 'default: scan_en' },
        { attr: 'occ_if_capture_en', label: 'capture_en', kind: 'string', defaultValue: 'capture_en', help: 'default: capture_en' },
        { attr: 'occ_if_slow_clock', label: 'slow_clock', kind: 'string', defaultValue: 'slow_clock', help: 'default: slow_clock' },
        { attr: 'occ_if_fast_clock', label: 'fast_clock', kind: 'string', defaultValue: 'fast_clock', help: 'default: fast_clock' },
        { attr: 'occ_if_clock', label: 'clock', kind: 'string', defaultValue: 'clock', help: 'default: clock' },
        { attr: 'occ_if_clock_out', label: 'clock_out', kind: 'string', defaultValue: 'clock_out', help: 'default: clock_out' },
        { attr: 'occ_if_clock_en_out', label: 'clock_en_out', kind: 'string', defaultValue: 'clock_en_out', help: 'default: clock_en_out' },
        { attr: 'occ_if_scan_in', label: 'scan_in', kind: 'string', defaultValue: 'scan_in', help: 'default: scan_in' },
        { attr: 'occ_if_scan_out', label: 'scan_out', kind: 'string', defaultValue: 'scan_out', help: 'default: scan_out' },
        {
          attr: 'occ_if_clock_sequence',
          label: 'clock_sequence',
          kind: 'string',
          defaultValue: 'clock_sequence[%d]',
          help: 'default: clock_sequence[%d]',
        },
        {
          attr: 'occ_if_pulse_to_align',
          label: 'pulse_to_align',
          kind: 'string',
          defaultValue: 'pulse_to_align[%d]',
          help: 'default: pulse_to_align[%d]',
        },
        {
          attr: 'occ_if_fast_capture_staggered_group',
          label: 'fast_capture_staggered_group',
          kind: 'string',
          defaultValue: 'fast_capture_staggered_group[%d]',
          help: 'default: fast_capture_staggered_group[%d]',
        },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    OCC {\n` +
            `        Interface {\n` +
            `            scan_en                         : ${get('occ_if_scan_en', 'scan_en')} ;\n` +
            `            capture_en                      : ${get('occ_if_capture_en', 'capture_en')} ;\n` +
            `            slow_clock                      : ${get('occ_if_slow_clock', 'slow_clock')} ;\n` +
            `            fast_clock                      : ${get('occ_if_fast_clock', 'fast_clock')} ;\n` +
            `            clock                           : ${get('occ_if_clock', 'clock')} ;\n` +
            `            clock_out                       : ${get('occ_if_clock_out', 'clock_out')} ;\n` +
            `            clock_en_out                    : ${get('occ_if_clock_en_out', 'clock_en_out')} ;\n` +
            `            scan_in                         : ${get('occ_if_scan_in', 'scan_in')} ;\n` +
            `            scan_out                        : ${get('occ_if_scan_out', 'scan_out')} ;\n` +
            `            clock_sequence                  : ${get('occ_if_clock_sequence', 'clock_sequence[%d]')} ;\n` +
            `            pulse_to_align                  : ${get('occ_if_pulse_to_align', 'pulse_to_align[%d]')} ;\n` +
            `            fast_capture_staggered_group    : ${get('occ_if_fast_capture_staggered_group', 'fast_capture_staggered_group[%d]')} ;\n` +
            `            IjtagScanInterface {\n            }\n` +
            `            StaticExternalControls {\n            }\n` +
            `        }\n` +
            `    }`
        ),
    },

    // =========================
    // OCC / Interface / IjtagScanInterface
    // =========================
    'OCC/Interface/IjtagScanInterface': {
      title: 'IjtagScanInterface',
      description: 'IJTAG Scan Interface 端口定义。',
      fields: [
        { attr: 'occ_if_ijtag_tck', label: 'tck', kind: 'string', defaultValue: 'ijtag_tck', help: 'default: ijtag_tck' },
        { attr: 'occ_if_ijtag_reset', label: 'reset', kind: 'string', defaultValue: 'ijtag_reset', help: 'default: ijtag_reset' },
        { attr: 'occ_if_ijtag_select', label: 'select', kind: 'string', defaultValue: 'ijtag_sel', help: 'default: ijtag_sel' },
        { attr: 'occ_if_ijtag_capture_en', label: 'capture_en', kind: 'string', defaultValue: 'ijtag_ce', help: 'default: ijtag_ce' },
        { attr: 'occ_if_ijtag_shift_en', label: 'shift_en', kind: 'string', defaultValue: 'ijtag_se', help: 'default: ijtag_se' },
        { attr: 'occ_if_ijtag_update_en', label: 'update_en', kind: 'string', defaultValue: 'ijtag_ue', help: 'default: ijtag_ue' },
        { attr: 'occ_if_ijtag_scan_in', label: 'scan_in', kind: 'string', defaultValue: 'ijtag_si', help: 'default: ijtag_si' },
        { attr: 'occ_if_ijtag_scan_out', label: 'scan_out', kind: 'string', defaultValue: 'ijtag_so', help: 'default: ijtag_so' },
        {
          attr: 'occ_if_ijtag_reset_polarity',
          label: 'reset_polarity',
          kind: 'select',
          options: activePolarity,
          defaultValue: 'active_low',
          help: 'legal: active_high | active_low',
        },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    OCC {\n` +
            `        Interface {\n` +
            `            IjtagScanInterface {\n` +
            `                tck             : ${get('occ_if_ijtag_tck', 'ijtag_tck')} ;\n` +
            `                reset           : ${get('occ_if_ijtag_reset', 'ijtag_reset')} ;\n` +
            `                select          : ${get('occ_if_ijtag_select', 'ijtag_sel')} ;\n` +
            `                capture_en      : ${get('occ_if_ijtag_capture_en', 'ijtag_ce')} ;\n` +
            `                shift_en        : ${get('occ_if_ijtag_shift_en', 'ijtag_se')} ;\n` +
            `                update_en       : ${get('occ_if_ijtag_update_en', 'ijtag_ue')} ;\n` +
            `                scan_in         : ${get('occ_if_ijtag_scan_in', 'ijtag_si')} ;\n` +
            `                scan_out        : ${get('occ_if_ijtag_scan_out', 'ijtag_so')} ;\n` +
            `                reset_polarity  : ${get('occ_if_ijtag_reset_polarity', 'active_low')} ;\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        ),
    },

    // =========================
    // OCC / Interface / StaticExternalControls
    // =========================
    'OCC/Interface/StaticExternalControls': {
      title: 'StaticExternalControls',
      description: 'Interface 层的静态外部控制端口。',
      fields: [
        { attr: 'occ_if_sec_test_mode', label: 'test_mode', kind: 'string', defaultValue: 'test_mode', help: 'default: test_mode' },
        { attr: 'occ_if_sec_fast_capture_mode', label: 'fast_capture_mode', kind: 'string', defaultValue: 'fast_capture_mode', help: 'default: fast_capture_mode' },
        { attr: 'occ_if_sec_parent_mode', label: 'parent_mode', kind: 'string', defaultValue: 'parent_mode', help: 'default: parent_mode' },
        {
          attr: 'occ_if_sec_capture_cycle_width',
          label: 'capture_cycle_width',
          kind: 'string',
          defaultValue: 'capture_cycle_width[%d]',
          help: 'default: capture_cycle_width[%d]',
        },
        {
          attr: 'occ_if_sec_static_clock_control_mode',
          label: 'static_clock_control_mode',
          kind: 'string',
          defaultValue: 'static_clock_control_mode',
          help: 'default: static_clock_control_mode',
        },
        { attr: 'occ_if_sec_shift_only_mode', label: 'shift_only_mode', kind: 'string', defaultValue: 'shift_only_mode', help: 'default: shift_only_mode' },
        { attr: 'occ_if_sec_kill_clock_en', label: 'kill_clock_en', kind: 'string', defaultValue: 'kill_clock_en', help: 'default: kill_clock_en' },
        {
          attr: 'occ_if_sec_independent_divided_clocks_en',
          label: 'independent_divided_clocks_en',
          kind: 'string',
          defaultValue: 'independent_divided_clocks_en',
          help: 'default: independent_divided_clocks_en',
        },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    OCC {\n` +
            `        Interface {\n` +
            `            StaticExternalControls {\n` +
            `                test_mode                       : ${get('occ_if_sec_test_mode', 'test_mode')} ;\n` +
            `                fast_capture_mode               : ${get('occ_if_sec_fast_capture_mode', 'fast_capture_mode')} ;\n` +
            `                parent_mode                     : ${get('occ_if_sec_parent_mode', 'parent_mode')} ;\n` +
            `                capture_cycle_width             : ${get('occ_if_sec_capture_cycle_width', 'capture_cycle_width[%d]')} ;\n` +
            `                static_clock_control_mode       : ${get('occ_if_sec_static_clock_control_mode', 'static_clock_control_mode')} ;\n` +
            `                shift_only_mode                 : ${get('occ_if_sec_shift_only_mode', 'shift_only_mode')} ;\n` +
            `                kill_clock_en                   : ${get('occ_if_sec_kill_clock_en', 'kill_clock_en')} ;\n` +
            `                independent_divided_clocks_en   : ${get('occ_if_sec_independent_divided_clocks_en', 'independent_divided_clocks_en')} ;\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        ),
    },

    // =========================
    // OCC / Connections
    // =========================
    'OCC/Connections': {
      title: 'Connections',
      description: 'OCC Connections。',
      fields: [
        {
          attr: 'occ_conn_scan_en',
          label: 'scan_en',
          kind: 'string',
          defaultValue: 'DftSignal(scan_en)',
          help: 'Valid: DftSignal(scan_en) / OptionalDftSignal(scan_en)',
        },
        {
          attr: 'occ_conn_capture_en',
          label: 'capture_en',
          kind: 'string',
          defaultValue: '0',
          help: 'default: 0',
        },
        {
          attr: 'occ_conn_slow_clock',
          label: 'slow_clock',
          kind: 'string',
          defaultValue: 'DftSignal(shift_capture_clock)',
          help: 'Valid: DftSignal(shift_capture_clock) / OptionalDftSignal(shift_capture_clock)',
        },
        {
          attr: 'occ_conn_clock_sequence',
          label: 'clock_sequence',
          kind: 'textarea',
          defaultValue: '0',
          help: `default: 0；${listHelp('sig0, sig1, 0, 1')}`,
        },
        {
          attr: 'occ_conn_pulse_to_align',
          label: 'pulse_to_align',
          kind: 'textarea',
          defaultValue: '0',
          help: `default: 0；${listHelp('sig0, sig1, 0, 1')}`,
        },
        {
          attr: 'occ_conn_fast_capture_staggered_group',
          label: 'fast_capture_staggered_group',
          kind: 'textarea',
          defaultValue: '0',
          help: `default: 0；${listHelp('sig0, sig1, 0, 1')}`,
        },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    OCC {\n` +
            `        Connections {\n` +
            `            scan_en                         : ${get('occ_conn_scan_en', 'DftSignal(scan_en)')} ;\n` +
            `            capture_en                      : ${get('occ_conn_capture_en', '0')} ;\n` +
            `            slow_clock                      : ${get('occ_conn_slow_clock', 'DftSignal(shift_capture_clock)')} ;\n` +
            `            clock_sequence                  : ${get('occ_conn_clock_sequence', '0')} ;\n` +
            `            pulse_to_align                  : ${get('occ_conn_pulse_to_align', '0')} ;\n` +
            `            fast_capture_staggered_group    : ${get('occ_conn_fast_capture_staggered_group', '0')} ;\n` +
            `            StaticExternalControls {\n            }\n` +
            `        }\n` +
            `    }`
        ),
    },

    // =========================
    // OCC / Connections / StaticExternalControls
    // =========================
    'OCC/Connections/StaticExternalControls': {
      title: 'StaticExternalControls',
      description: 'Connections 层的静态外部控制。',
      fields: [
        {
          attr: 'occ_conn_sec_test_mode',
          label: 'test_mode',
          kind: 'string',
          defaultValue: '0',
          help: 'Valid: 0 1 或 port_pin_name',
        },
        {
          attr: 'occ_conn_sec_fast_capture_mode',
          label: 'fast_capture_mode',
          kind: 'string',
          defaultValue: '0',
          help: 'Valid: 0 1 或 port_pin_name',
        },
        {
          attr: 'occ_conn_sec_parent_mode',
          label: 'parent_mode',
          kind: 'string',
          defaultValue: '0',
          help: 'Valid: 0 1 或 port_pin_name',
        },
        {
          attr: 'occ_conn_sec_capture_cycle_width',
          label: 'capture_cycle_width',
          kind: 'textarea',
          defaultValue: '0',
          help: `Valid: 0 1, ... 或 port_pin_name；${listHelp('0, 1, sig0, sig1')}`,
        },
        {
          attr: 'occ_conn_sec_static_clock_control_mode',
          label: 'static_clock_control_mode',
          kind: 'string',
          defaultValue: '0',
          help: 'Valid: 0 1 或 port_pin_constant_name',
        },
        {
          attr: 'occ_conn_sec_shift_only_mode',
          label: 'shift_only_mode',
          kind: 'string',
          defaultValue: 'DftSignalOrTiedLow(ext_ltest_en)',
          help: 'default: DftSignalOrTiedLow(ext_ltest_en)',
        },
        {
          attr: 'occ_conn_sec_kill_clock_en',
          label: 'kill_clock_en',
          kind: 'string',
          defaultValue: 'DftSignal(occ_kill_clock_en)',
          help: 'default: DftSignal(occ_kill_clock_en)',
        },
        {
          attr: 'occ_conn_sec_independent_divided_clocks_en',
          label: 'independent_divided_clocks_en',
          kind: 'string',
          defaultValue: '0',
          help: 'Valid: 0 | 1 | port_pin_constant_name; default: 0',
        },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    OCC {\n` +
            `        Connections {\n` +
            `            StaticExternalControls {\n` +
            `                test_mode                       : ${get('occ_conn_sec_test_mode', '0')} ;\n` +
            `                fast_capture_mode               : ${get('occ_conn_sec_fast_capture_mode', '0')} ;\n` +
            `                parent_mode                     : ${get('occ_conn_sec_parent_mode', '0')} ;\n` +
            `                capture_cycle_width             : ${get('occ_conn_sec_capture_cycle_width', '0')} ;\n` +
            `                static_clock_control_mode       : ${get('occ_conn_sec_static_clock_control_mode', '0')} ;\n` +
            `                shift_only_mode                 : ${get('occ_conn_sec_shift_only_mode', 'DftSignalOrTiedLow(ext_ltest_en)')} ;\n` +
            `                kill_clock_en                   : ${get('occ_conn_sec_kill_clock_en', 'DftSignal(occ_kill_clock_en)')} ;\n` +
            `                independent_divided_clocks_en   : ${get('occ_conn_sec_independent_divided_clocks_en', '0')} ;\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        ),
    },

    // =========================
    // OCC / Controller
    // =========================
    'OCC/Controller': {
      title: 'Controller(id)',
      description: 'OCC Controller 配置。',
      fields: [
        {
          attr: 'occ_ctrl_id',
          label: 'Controller id',
          kind: 'string',
          defaultValue: 'id',
          help: '用于生成 Controller(id) 的括号内 id',
        },
        {
          attr: 'occ_ctrl_clock_intercept_nodes',
          label: 'clock_intercept_nodes',
          kind: 'textarea',
          defaultValue: '',
          help: listHelp('clk_label0, clk_label1'),
        },
        {
          attr: 'occ_ctrl_clock_port_count',
          label: 'clock_port_count',
          kind: 'string',
          defaultValue: 'auto',
          help: 'integer | auto；default: auto',
        },

        // FrequencyRatio 选择（用一个节点内字段表示，避免你再加 2/4/8 三个子节点）
        {
          attr: 'occ_ctrl_freq_ratio',
          label: 'FrequencyRatio',
          kind: 'select',
          options: [
            { label: 'none', value: 'none' },
            { label: '2', value: '2' },
            { label: '4', value: '4' },
            { label: '8', value: '8' },
          ],
          defaultValue: 'none',
          help: '选择后会在预览中生成 FrequencyRatio(...) 子块',
        },
        {
          attr: 'occ_ctrl_fr_clock_intercept_nodes',
          label: 'FR.clock_intercept_nodes',
          kind: 'textarea',
          defaultValue: '',
          help: '仅当 FrequencyRatio != none 时使用；' + listHelp('clk_label0, clk_label1'),
        },
        {
          attr: 'occ_ctrl_fr_clock_port_count',
          label: 'FR.clock_port_count',
          kind: 'string',
          defaultValue: 'auto',
          help: '仅当 FrequencyRatio != none 时使用；integer | auto；default: auto',
        },

        {
          attr: 'occ_ctrl_clock_enable_pin',
          label: 'clock_enable_pin',
          kind: 'textarea',
          defaultValue: '',
          help: listHelp('pin0, pin1'),
        },
        {
          attr: 'occ_ctrl_clock_enable_pin_polarity',
          label: 'clock_enable_pin_polarity',
          kind: 'select',
          options: [
            { label: 'auto', value: 'auto' },
            { label: 'active_high', value: 'active_high' },
            { label: 'active_low', value: 'active_low' },
          ],
          defaultValue: 'auto',
        },
        {
          attr: 'occ_ctrl_parent_instance',
          label: 'parent_instance',
          kind: 'string',
          defaultValue: '',
          placeholder: 'instance_name',
        },
        {
          attr: 'occ_ctrl_capture_window_size',
          label: 'capture_window_size',
          kind: 'number',
          defaultValue: 3,
          help: 'default: 3',
        },
        {
          attr: 'occ_ctrl_leaf_instance_name',
          label: 'leaf_instance_name',
          kind: 'string',
          defaultValue: '',
          placeholder: 'instance_name',
        },
        {
          attr: 'occ_ctrl_internal_clock_gater',
          label: 'internal_clock_gater',
          kind: 'select',
          options: onOffAuto,
          defaultValue: 'auto',
        },
        {
          attr: 'occ_ctrl_shift_only_mode',
          label: 'shift_only_mode',
          kind: 'select',
          options: onOffAuto,
          defaultValue: 'auto',
        },
        {
          attr: 'occ_ctrl_kill_clock_mode',
          label: 'kill_clock_mode',
          kind: 'select',
          options: onOffAuto,
          defaultValue: 'auto',
        },
        {
          attr: 'occ_ctrl_upstream_parent_occ',
          label: 'upstream_parent_occ',
          kind: 'select',
          options: yesNoAuto,
          defaultValue: 'auto',
          help: '"require" creates a child-mode OCC',
        },
        {
          attr: 'occ_ctrl_parent_mode',
          label: 'parent_mode',
          kind: 'select',
          options: onOff,
          defaultValue: 'off',
        },
        {
          attr: 'occ_ctrl_independent_divided_clocks',
          label: 'independent_divided_clocks',
          kind: 'select',
          options: onOff,
          defaultValue: 'off',
        },
      ],
      buildCode: ({ get }) => {
        const id = get('occ_ctrl_id', 'id');
        const fr = get('occ_ctrl_freq_ratio', 'none');

        const frBlock =
          fr && fr !== 'none'
            ? `            FrequencyRatio(${fr}) {\n` +
              `                clock_intercept_nodes   : ${get('occ_ctrl_fr_clock_intercept_nodes', '')} ;\n` +
              `                clock_port_count        : ${get('occ_ctrl_fr_clock_port_count', 'auto')} ;\n` +
              `            }\n`
            : '';

        return codeHeader(
          `    OCC {\n` +
            `        Controller(${id}) {\n` +
            `            clock_intercept_nodes       : ${get('occ_ctrl_clock_intercept_nodes', '')} ;\n` +
            `            clock_port_count            : ${get('occ_ctrl_clock_port_count', 'auto')} ;\n` +
            frBlock +
            `            clock_enable_pin            : ${get('occ_ctrl_clock_enable_pin', '')} ;\n` +
            `            clock_enable_pin_polarity   : ${get('occ_ctrl_clock_enable_pin_polarity', 'auto')} ;\n` +
            `            parent_instance             : ${get('occ_ctrl_parent_instance', '')} ;\n` +
            `            capture_window_size         : ${get('occ_ctrl_capture_window_size', 3)} ;\n` +
            `            leaf_instance_name          : ${get('occ_ctrl_leaf_instance_name', '')} ;\n` +
            `            internal_clock_gater        : ${get('occ_ctrl_internal_clock_gater', 'auto')} ;\n` +
            `            shift_only_mode             : ${get('occ_ctrl_shift_only_mode', 'auto')} ;\n` +
            `            kill_clock_mode             : ${get('occ_ctrl_kill_clock_mode', 'auto')} ;\n` +
            `            upstream_parent_occ         : ${get('occ_ctrl_upstream_parent_occ', 'auto')} ;\n` +
            `            parent_mode                 : ${get('occ_ctrl_parent_mode', 'off')} ;\n` +
            `            independent_divided_clocks  : ${get('occ_ctrl_independent_divided_clocks', 'off')} ;\n` +
            `            Connections {\n            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    // =========================
    // OCC / Controller / Connections
    // =========================
    'OCC/Controller/Connections': {
      title: 'Connections',
      description: 'Controller(id) 内部 Connections。',
      fields: [
        {
          attr: 'occ_ctrl_conn_scan_en',
          label: 'scan_en',
          kind: 'string',
          defaultValue: 'DftSignal(scan_en)',
          help: 'DftSignal(scan_en) / OptionalDftSignal(scan_en)',
        },
        { attr: 'occ_ctrl_conn_capture_en', label: 'capture_en', kind: 'string', defaultValue: '0', help: 'default: 0' },
        {
          attr: 'occ_ctrl_conn_slow_clock',
          label: 'slow_clock',
          kind: 'string',
          defaultValue: 'DftSignal(shift_capture_clock)',
          help: 'DftSignal(shift_capture_clock) / OptionalDftSignal(shift_capture_clock)',
        },
        {
          attr: 'occ_ctrl_conn_fast_clocks',
          label: 'fast_clocks',
          kind: 'textarea',
          defaultValue: '',
          help: listHelp('clk_label0, clk_label1'),
        },
        {
          attr: 'occ_ctrl_conn_fr_fast_clocks',
          label: 'FR.fast_clocks',
          kind: 'textarea',
          defaultValue: '',
          help: '仅当 Controller.FrequencyRatio != none 时使用；' + listHelp('clk_label0, clk_label1'),
        },
        {
          attr: 'occ_ctrl_conn_clock',
          label: 'clock',
          kind: 'string',
          defaultValue: '',
          help: 'port_pin_clock_label_name',
        },
        {
          attr: 'occ_ctrl_conn_clock_sequence',
          label: 'clock_sequence',
          kind: 'textarea',
          defaultValue: '0',
          help: `default: 0；${listHelp('sig0, sig1, 0, 1')}`,
        },
        {
          attr: 'occ_ctrl_conn_pulse_to_align',
          label: 'pulse_to_align',
          kind: 'textarea',
          defaultValue: '0',
          help: `default: 0；${listHelp('sig0, sig1, 0, 1')}`,
        },
        {
          attr: 'occ_ctrl_conn_fast_capture_staggered_group',
          label: 'fast_capture_staggered_group',
          kind: 'textarea',
          defaultValue: '',
          help: listHelp('sig0, sig1, 0, 1'),
        },
      ],
      buildCode: ({ get }) => {
        const id = get('occ_ctrl_id', 'id');
        const fr = get('occ_ctrl_freq_ratio', 'none');

        const frFast =
          fr && fr !== 'none'
            ? `                FrequencyRatio(${fr}) {\n` +
              `                    fast_clocks                 : ${get('occ_ctrl_conn_fr_fast_clocks', '')} ;\n` +
              `                }\n`
            : '';

        return codeHeader(
          `    OCC {\n` +
            `        Controller(${id}) {\n` +
            `            Connections {\n` +
            `                scan_en                         : ${get('occ_ctrl_conn_scan_en', 'DftSignal(scan_en)')} ;\n` +
            `                capture_en                      : ${get('occ_ctrl_conn_capture_en', '0')} ;\n` +
            `                slow_clock                      : ${get('occ_ctrl_conn_slow_clock', 'DftSignal(shift_capture_clock)')} ;\n` +
            `                fast_clocks                     : ${get('occ_ctrl_conn_fast_clocks', '')} ;\n` +
            frFast +
            `                clock                           : ${get('occ_ctrl_conn_clock', '')} ;\n` +
            `                clock_sequence                  : ${get('occ_ctrl_conn_clock_sequence', '0')} ;\n` +
            `                pulse_to_align                  : ${get('occ_ctrl_conn_pulse_to_align', '0')} ;\n` +
            `                fast_capture_staggered_group    : ${get('occ_ctrl_conn_fast_capture_staggered_group', '')} ;\n` +
            `                StaticExternalControls {\n                }\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },

    // =========================
    // OCC / Controller / Connections / StaticExternalControls
    // =========================
    'OCC/Controller/Connections/StaticExternalControls': {
      title: 'StaticExternalControls',
      description: 'Controller(id)/Connections 下的静态外部控制。',
      fields: [
        {
          attr: 'occ_ctrl_conn_sec_test_mode',
          label: 'test_mode',
          kind: 'string',
          defaultValue: '0',
          help: 'port_pin_name | 0 | 1',
        },
        {
          attr: 'occ_ctrl_conn_sec_fast_capture_mode',
          label: 'fast_capture_mode',
          kind: 'string',
          defaultValue: '0',
          help: 'port_pin_name | 0 | 1',
        },
        {
          attr: 'occ_ctrl_conn_sec_parent_mode',
          label: 'parent_mode',
          kind: 'string',
          defaultValue: '0',
          help: 'port_pin_name | 0 | 1',
        },
        {
          attr: 'occ_ctrl_conn_sec_capture_cycle_width',
          label: 'capture_cycle_width',
          kind: 'textarea',
          defaultValue: '0',
          help: `port_pin_name | 0 | 1, ...；${listHelp('0, 1, sig0, sig1')}`,
        },
        {
          attr: 'occ_ctrl_conn_sec_static_clock_control_mode',
          label: 'static_clock_control_mode',
          kind: 'string',
          defaultValue: '0',
          help: 'port_pin_constant_name | 0 | 1',
        },
        {
          attr: 'occ_ctrl_conn_sec_shift_only_mode',
          label: 'shift_only_mode',
          kind: 'string',
          defaultValue: 'DftSignalOrTiedLow(ext_ltest_en)',
          help: 'default: DftSignalOrTiedLow(ext_ltest_en)',
        },
        {
          attr: 'occ_ctrl_conn_sec_kill_clock_en',
          label: 'kill_clock_en',
          kind: 'string',
          defaultValue: 'DftSignal(occ_kill_clock_en)',
          help: 'default: DftSignal(occ_kill_clock_en)',
        },
        {
          attr: 'occ_ctrl_conn_sec_independent_divided_clocks_en',
          label: 'independent_divided_clocks_en',
          kind: 'string',
          defaultValue: '0',
          help: 'port_pin_constant_name | 0 | 1',
        },
      ],
      buildCode: ({ get }) => {
        const id = get('occ_ctrl_id', 'id');
        return codeHeader(
          `    OCC {\n` +
            `        Controller(${id}) {\n` +
            `            Connections {\n` +
            `                StaticExternalControls {\n` +
            `                    test_mode                       : ${get('occ_ctrl_conn_sec_test_mode', '0')} ;\n` +
            `                    fast_capture_mode               : ${get('occ_ctrl_conn_sec_fast_capture_mode', '0')} ;\n` +
            `                    parent_mode                     : ${get('occ_ctrl_conn_sec_parent_mode', '0')} ;\n` +
            `                    capture_cycle_width             : ${get('occ_ctrl_conn_sec_capture_cycle_width', '0')} ;\n` +
            `                    static_clock_control_mode       : ${get('occ_ctrl_conn_sec_static_clock_control_mode', '0')} ;\n` +
            `                    shift_only_mode                 : ${get('occ_ctrl_conn_sec_shift_only_mode', 'DftSignalOrTiedLow(ext_ltest_en)')} ;\n` +
            `                    kill_clock_en                   : ${get('occ_ctrl_conn_sec_kill_clock_en', 'DftSignal(occ_kill_clock_en)')} ;\n` +
            `                    independent_divided_clocks_en   : ${get('occ_ctrl_conn_sec_independent_divided_clocks_en', '0')} ;\n` +
            `                }\n` +
            `            }\n` +
            `        }\n` +
            `    }`
        );
      },
    },
  },
};

export default occDefinition;
