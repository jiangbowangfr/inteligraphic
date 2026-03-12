// src/apps/ssn_scanhost/definition.ts
import type { DftsTypeDef } from '../../shared/dfts/types';
import { opt, ON_OFF, ON_OFF_AUTO, DFF_LATCH, MCP_2_64, RES_2_8, kv, block, wrapSSNDatapath } from '../ssn/_common';

export const def: DftsTypeDef = {
  type: 'ssn_scanhost',
  title: 'DFT · SSN · ScanHost',
  defaultNode: 'ScanHost',
  nodes: {
    'ScanHost': {
      title: 'ScanHost',
      description: 'SSN/Datapath/ScanHost(id)',
      fields: [
        { attr: 'ssh_id', label: 'id', defaultValue: '1' },

        { attr: 'ijtag_host_interface', label: 'ijtag_host_interface', defaultValue: 'Sib(ssn)' },
        { attr: 'ijtag_connection_order', label: 'ijtag_connection_order', defaultValue: '' },

        { attr: 'bus_clock_period', label: 'bus_clock_period', defaultValue: '' },
        { attr: 'max_capture_clock_pulses', label: 'max_capture_clock_pulses', kind: 'number', defaultValue: 7 },
        { attr: 'max_capture_to_shift_clock_period_ratio', label: 'max_capture_to_shift_clock_period_ratio', kind: 'number', defaultValue: 8 },

        { attr: 'parent_instance', label: 'parent_instance', defaultValue: '' },
        { attr: 'leaf_instance_name', label: 'leaf_instance_name', defaultValue: '' },

        { attr: 'max_scan_chain_length', label: 'max_scan_chain_length', placeholder: 'int | auto', defaultValue: 'auto' },
        { attr: 'max_scan_en_mcp', label: 'max_scan_en_mcp', kind: 'select', options: MCP_2_64, defaultValue: '8' },
        { attr: 'max_edt_update_mcp', label: 'max_edt_update_mcp', kind: 'select', options: MCP_2_64, defaultValue: '8' },

        { attr: 'input_chain_count', label: 'input_chain_count', placeholder: 'int | from_edt_controller', defaultValue: 'from_edt_controller' },
        { attr: 'output_chain_count', label: 'output_chain_count', placeholder: 'int | from_edt_controller | same_as_input_chain_count', defaultValue: 'same_as_input_chain_count' },
        { attr: 'output_chain_count_in_occ_mode', label: 'output_chain_count_in_on_chip_compare_mode', placeholder: 'int | from_edt_controller | from_edt_controller_high_compression_configuration', defaultValue: 'from_edt_controller' },

        { attr: 'high_comp_in', label: 'high_compression_input_channel_count', placeholder: 'int | auto', defaultValue: 'auto' },
        { attr: 'high_comp_out', label: 'high_compression_output_channel_count', placeholder: 'int | auto', defaultValue: 'auto' },

        { attr: 'use_high_comp_in_bypass', label: 'use_high_compression_channel_count_in_bypass_mode', kind: 'select', options: ON_OFF, defaultValue: 'off' },
        { attr: 'support_from_scan_out_le_strobing', label: 'support_from_scan_out_le_strobing', kind: 'select', options: ON_OFF, defaultValue: 'off' },
        { attr: 'scan_signals_bypass', label: 'scan_signals_bypass', kind: 'select', options: opt('on', 'off', 'controls_only', 'auto'), defaultValue: 'auto' },

        { attr: 'use_clock_dff_cell', label: 'use_clock_dff_cell', kind: 'select', options: ON_OFF, defaultValue: 'off' },
        { attr: 'use_clock_or_cell', label: 'use_clock_or_cell', kind: 'select', options: ON_OFF, defaultValue: 'off' },
        { attr: 'use_clock_shaper_cell', label: 'use_clock_shaper_cell', kind: 'select', options: ON_OFF, defaultValue: 'off' },
        { attr: 'support_output_clock_activation_when_ssh_is_off', label: 'support_output_clock_activation_when_ssh_is_off', kind: 'select', options: ON_OFF, defaultValue: 'off' },

        { attr: 'size_resolution', label: 'size_resolution', kind: 'select', options: RES_2_8, defaultValue: '4' },
        { attr: 'use_ssn_bus_clock_as_test_clock_bypass', label: 'use_ssn_bus_clock_as_test_clock_bypass', kind: 'select', options: ON_OFF, defaultValue: 'off' },

        { attr: 'dft_signals_not_mapped', label: 'dft_signals_not_mapped_on_ssh_outputs', kind: 'textarea', placeholder: 'dynamic_dft_signal_name, ...', defaultValue: '' },
      ],

      buildCode: ({ get }) => {
        const id = get('ssh_id', '1');

        const onChip = block('OnChipCompareMode', [
          kv('present', get('occ_present', 'auto')),
          kv('sticky_status_resolution', get('occ_sticky', 'ssh')),
          kv('status_groups', get('occ_status_groups', 128)),
        ].join('\n'));

        const chainGroup = block(`ChainGroup(${get('cg_id', '1')})`, [
          kv('input_chain_count', get('cg_input_chain_count', 'from_edt_controller')),
          kv('output_chain_count', get('cg_output_chain_count', 'same_as_input_chain_count')),
          kv('output_chain_count_in_on_chip_compare_mode', get('cg_output_chain_count_in_occ_mode', 'from_edt_controller')),
          kv('high_compression_input_channel_count', get('cg_high_comp_in', 'auto')),
          kv('high_compression_output_channel_count', get('cg_high_comp_out', 'auto')),
          kv('use_high_compression_channel_count_in_bypass_mode', get('cg_use_high_comp_in_bypass', 'off')),
          kv('support_from_scan_out_le_strobing', get('cg_support_le_strobing', 'off')),
        ].join('\n'));

        const iface = block('Interface', [
          kv('bus_clock', get('if_bus_clock', 'bus_clock')),
          kv('bus_data_in', get('if_bus_data_in', 'bus_data_in')),
          kv('bus_data_out', get('if_bus_data_out', 'bus_data_out')),
          kv('ssh_is_active', get('if_ssh_is_active', 'ssh_is_active')),
          kv('ssh_is_active_present', get('if_ssh_is_active_present', 'auto')),

          block('ChainGroup', [
            kv('scan_en', get('if_cg_scan_en', 'scan_en')),
            kv('scan_en_bypass_in', get('if_cg_scan_en_bypass_in', 'scan_en_bypass_in')),
            kv('edt_update', get('if_cg_edt_update', 'edt_update')),
            kv('edt_update_bypass_in', get('if_cg_edt_update_bypass_in', 'edt_update_bypass_in')),

            kv('test_clock_present', get('if_cg_test_clock_present', 'auto')),
            kv('test_clock', get('if_cg_test_clock', 'test_clock')),
            kv('test_clock_bypass_in', get('if_cg_test_clock_bypass_in', 'test_clock_bypass_in')),

            kv('edt_clock_present', get('if_cg_edt_clock_present', 'auto')),
            kv('edt_clock', get('if_cg_edt_clock', 'edt_clock')),
            kv('edt_clock_bypass_in', get('if_cg_edt_clock_bypass_in', 'edt_clock_bypass_in')),

            kv('shift_capture_clock_present', get('if_cg_scc_present', 'auto')),
            kv('shift_capture_clock', get('if_cg_scc', 'shift_capture_clock')),
            kv('shift_capture_clock_bypass_in', get('if_cg_scc_bypass_in', 'shift_capture_clock_bypass_in')),

            kv('shift_clock_present', get('if_cg_shift_present', 'auto')),
            kv('shift_clock', get('if_cg_shift_clock', 'shift_clock')),
            kv('shift_clock_bypass_in', get('if_cg_shift_bypass_in', 'shift_clock_bypass_in')),

            kv('capture_clock_present', get('if_cg_capture_present', 'auto')),
            kv('capture_clock', get('if_cg_capture_clock', 'capture_clock')),
            kv('capture_clock_bypass_in', get('if_cg_capture_bypass_in', 'capture_clock_bypass_in')),

            kv('to_scan_in', get('if_cg_to_scan_in', 'to_scan_in')),
            kv('to_scan_in_bypass_in', get('if_cg_to_scan_in_bypass_in', 'to_scan_in_bypass_in')),
            kv('from_scan_out', get('if_cg_from_scan_out', 'from_scan_out')),
            kv('from_scan_out_bypass_out', get('if_cg_from_scan_out_bypass_out', 'from_scan_out_bypass_out')),
          ].join('\n')),

          block('ClockSignalModule', [
            kv('define_clock_on_boundary', get('csm_define_clock_on_boundary', 'auto')),
            kv('module_name', get('csm_module_name', '')),
            kv('write_out_module_definition', get('csm_write_out', 'auto')),

            // 下面这些默认值按 spec 是“属性名本身”，这里就直接用输入值
            kv('clock', get('csm_clock', 'clock')),
            kv('enable', get('csm_enable', 'enable')),
            kv('enable_sync', get('csm_enable_sync', 'enable_sync')),
            kv('ijtag_clock_cg_en', get('csm_ijtag_clock_cg_en', 'ijtag_clock_cg_en')),
            kv('ijtag_clock', get('csm_ijtag_clock', 'ijtag_clock')),
            kv('next_edt_clock_div', get('csm_next_edt_clock_div', 'next_edt_clock_div')),
            kv('edt_clock_cg_en', get('csm_edt_clock_cg_en', 'edt_clock_cg_en')),
            kv('edt_clock_bypass_in', get('csm_edt_clock_bypass_in', 'edt_clock_bypass_in')),
            kv('edt_clock', get('csm_edt_clock', 'edt_clock')),
            kv('next_shift_capture_clock_div', get('csm_next_shift_capture_clock_div', 'next_shift_capture_clock_div')),
            kv('shift_capture_clock_cg_en', get('csm_shift_capture_clock_cg_en', 'shift_capture_clock_cg_en')),
            kv('shift_capture_clock_bypass_in', get('csm_shift_capture_clock_bypass_in', 'shift_capture_clock_bypass_in')),
            kv('shift_capture_clock', get('csm_shift_capture_clock', 'shift_capture_clock')),
            kv('next_shift_clock_div', get('csm_next_shift_clock_div', 'next_shift_clock_div')),
            kv('shift_clock_cg_en', get('csm_shift_clock_cg_en', 'shift_clock_cg_en')),
            kv('shift_clock_bypass_in', get('csm_shift_clock_bypass_in', 'shift_clock_bypass_in')),
            kv('shift_clock', get('csm_shift_clock', 'shift_clock')),
            kv('next_capture_clock_div', get('csm_next_capture_clock_div', 'next_capture_clock_div')),
            kv('capture_clock_cg_en', get('csm_capture_clock_cg_en', 'capture_clock_cg_en')),
            kv('capture_clock_bypass_in', get('csm_capture_clock_bypass_in', 'capture_clock_bypass_in')),
            kv('capture_clock', get('csm_capture_clock', 'capture_clock')),
            kv('next_test_clock_div', get('csm_next_test_clock_div', 'next_test_clock_div')),
            kv('test_clock_cg_en', get('csm_test_clock_cg_en', 'test_clock_cg_en')),
            kv('test_clock_bypass_in', get('csm_test_clock_bypass_in', 'test_clock_bypass_in')),
            kv('test_clock', get('csm_test_clock', 'test_clock')),
          ].join('\n')),

          block('IjtagScanInterface', [
            kv('reset', get('if_ijtag_reset', 'ijtag_reset')),
            kv('tck', get('if_ijtag_tck', 'ijtag_tck')),
            kv('select', get('if_ijtag_select', 'ijtag_sel')),
            kv('capture_en', get('if_ijtag_capture_en', 'ijtag_ce')),
            kv('shift_en', get('if_ijtag_shift_en', 'ijtag_se')),
            kv('update_en', get('if_ijtag_update_en', 'ijtag_ue')),
            kv('scan_in', get('if_ijtag_scan_in', 'ijtag_si')),
            kv('scan_out', get('if_ijtag_scan_out', 'ijtag_so')),
          ].join('\n')),
        ].join('\n'));

        const inner = [
          kv('ijtag_host_interface', get('ijtag_host_interface', 'Sib(ssn)')),
          kv('ijtag_connection_order', get('ijtag_connection_order', '')),

          kv('bus_clock_period', get('bus_clock_period', '')),
          kv('max_capture_clock_pulses', get('max_capture_clock_pulses', 7)),
          kv('max_capture_to_shift_clock_period_ratio', get('max_capture_to_shift_clock_period_ratio', 8)),

          kv('parent_instance', get('parent_instance', '')),
          kv('leaf_instance_name', get('leaf_instance_name', '')),

          kv('max_scan_chain_length', get('max_scan_chain_length', 'auto')),
          kv('max_scan_en_mcp', get('max_scan_en_mcp', '8')),
          kv('max_edt_update_mcp', get('max_edt_update_mcp', '8')),

          kv('input_chain_count', get('input_chain_count', 'from_edt_controller')),
          kv('output_chain_count', get('output_chain_count', 'same_as_input_chain_count')),
          kv('output_chain_count_in_on_chip_compare_mode', get('output_chain_count_in_occ_mode', 'from_edt_controller')),

          kv('high_compression_input_channel_count', get('high_comp_in', 'auto')),
          kv('high_compression_output_channel_count', get('high_comp_out', 'auto')),

          kv('use_high_compression_channel_count_in_bypass_mode', get('use_high_comp_in_bypass', 'off')),
          kv('support_from_scan_out_le_strobing', get('support_from_scan_out_le_strobing', 'off')),
          kv('scan_signals_bypass', get('scan_signals_bypass', 'auto')),

          kv('use_clock_dff_cell', get('use_clock_dff_cell', 'off')),
          kv('use_clock_or_cell', get('use_clock_or_cell', 'off')),
          kv('use_clock_shaper_cell', get('use_clock_shaper_cell', 'off')),
          kv('support_output_clock_activation_when_ssh_is_off', get('support_output_clock_activation_when_ssh_is_off', 'off')),

          kv('size_resolution', get('size_resolution', '4')),
          kv('use_ssn_bus_clock_as_test_clock_bypass', get('use_ssn_bus_clock_as_test_clock_bypass', 'off')),
          kv('dft_signals_not_mapped_on_ssh_outputs', get('dft_signals_not_mapped', '')),

          onChip,
          chainGroup,
          iface,

          block('Connections', ''),  // 你后续把 spec 补完整我再补字段
          block('ExtraOutputPath', ''),
        ].join('\n');

        return wrapSSNDatapath(`ScanHost(${id})`, inner);
      },
    },

    'ScanHost/OnChipCompareMode': {
      title: 'OnChipCompareMode',
      fields: [
        { attr: 'occ_present', label: 'present', kind: 'select', options: ON_OFF_AUTO, defaultValue: 'auto' },
        { attr: 'occ_sticky', label: 'sticky_status_resolution', kind: 'select', options: opt('ssh', 'output_chain'), defaultValue: 'ssh' },
        { attr: 'occ_status_groups', label: 'status_groups', kind: 'number', defaultValue: 128 },
      ],
    },

    'ScanHost/ChainGroup': {
      title: 'ChainGroup(id)',
      fields: [
        { attr: 'cg_id', label: 'id', defaultValue: '1' },
        { attr: 'cg_input_chain_count', label: 'input_chain_count', defaultValue: 'from_edt_controller' },
        { attr: 'cg_output_chain_count', label: 'output_chain_count', defaultValue: 'same_as_input_chain_count' },
        { attr: 'cg_output_chain_count_in_occ_mode', label: 'output_chain_count_in_on_chip_compare_mode', defaultValue: 'from_edt_controller' },
        { attr: 'cg_high_comp_in', label: 'high_compression_input_channel_count', defaultValue: 'auto' },
        { attr: 'cg_high_comp_out', label: 'high_compression_output_channel_count', defaultValue: 'auto' },
        { attr: 'cg_use_high_comp_in_bypass', label: 'use_high_compression_channel_count_in_bypass_mode', kind: 'select', options: ON_OFF, defaultValue: 'off' },
        { attr: 'cg_support_le_strobing', label: 'support_from_scan_out_le_strobing', kind: 'select', options: ON_OFF, defaultValue: 'off' },
      ],
    },

    'ScanHost/Interface': {
      title: 'Interface',
      fields: [
        { attr: 'if_bus_clock', label: 'bus_clock', defaultValue: 'bus_clock' },
        { attr: 'if_bus_data_in', label: 'bus_data_in', defaultValue: 'bus_data_in' },
        { attr: 'if_bus_data_out', label: 'bus_data_out', defaultValue: 'bus_data_out' },
        { attr: 'if_ssh_is_active', label: 'ssh_is_active', defaultValue: 'ssh_is_active' },
        { attr: 'if_ssh_is_active_present', label: 'ssh_is_active_present', kind: 'select', options: ON_OFF_AUTO, defaultValue: 'auto' },
      ],
    },

    'ScanHost/Interface/ChainGroup': {
      title: 'Interface/ChainGroup',
      fields: [
        { attr: 'if_cg_scan_en', label: 'scan_en', defaultValue: 'scan_en' },
        { attr: 'if_cg_scan_en_bypass_in', label: 'scan_en_bypass_in', defaultValue: 'scan_en_bypass_in' },
        { attr: 'if_cg_edt_update', label: 'edt_update', defaultValue: 'edt_update' },
        { attr: 'if_cg_edt_update_bypass_in', label: 'edt_update_bypass_in', defaultValue: 'edt_update_bypass_in' },

        { attr: 'if_cg_test_clock_present', label: 'test_clock_present', kind: 'select', options: ON_OFF_AUTO, defaultValue: 'auto' },
        { attr: 'if_cg_test_clock', label: 'test_clock', defaultValue: 'test_clock' },
        { attr: 'if_cg_test_clock_bypass_in', label: 'test_clock_bypass_in', defaultValue: 'test_clock_bypass_in' },

        { attr: 'if_cg_edt_clock_present', label: 'edt_clock_present', kind: 'select', options: ON_OFF_AUTO, defaultValue: 'auto' },
        { attr: 'if_cg_edt_clock', label: 'edt_clock', defaultValue: 'edt_clock' },
        { attr: 'if_cg_edt_clock_bypass_in', label: 'edt_clock_bypass_in', defaultValue: 'edt_clock_bypass_in' },

        { attr: 'if_cg_scc_present', label: 'shift_capture_clock_present', kind: 'select', options: ON_OFF_AUTO, defaultValue: 'auto' },
        { attr: 'if_cg_scc', label: 'shift_capture_clock', defaultValue: 'shift_capture_clock' },
        { attr: 'if_cg_scc_bypass_in', label: 'shift_capture_clock_bypass_in', defaultValue: 'shift_capture_clock_bypass_in' },

        { attr: 'if_cg_shift_present', label: 'shift_clock_present', kind: 'select', options: ON_OFF_AUTO, defaultValue: 'auto' },
        { attr: 'if_cg_shift_clock', label: 'shift_clock', defaultValue: 'shift_clock' },
        { attr: 'if_cg_shift_bypass_in', label: 'shift_clock_bypass_in', defaultValue: 'shift_clock_bypass_in' },

        { attr: 'if_cg_capture_present', label: 'capture_clock_present', kind: 'select', options: ON_OFF_AUTO, defaultValue: 'auto' },
        { attr: 'if_cg_capture_clock', label: 'capture_clock', defaultValue: 'capture_clock' },
        { attr: 'if_cg_capture_bypass_in', label: 'capture_clock_bypass_in', defaultValue: 'capture_clock_bypass_in' },

        { attr: 'if_cg_to_scan_in', label: 'to_scan_in', defaultValue: 'to_scan_in' },
        { attr: 'if_cg_to_scan_in_bypass_in', label: 'to_scan_in_bypass_in', defaultValue: 'to_scan_in_bypass_in' },
        { attr: 'if_cg_from_scan_out', label: 'from_scan_out', defaultValue: 'from_scan_out' },
        { attr: 'if_cg_from_scan_out_bypass_out', label: 'from_scan_out_bypass_out', defaultValue: 'from_scan_out_bypass_out' },
      ],
    },

    'ScanHost/Interface/ClockSignalModule': {
      title: 'ClockSignalModule',
      fields: [
        { attr: 'csm_define_clock_on_boundary', label: 'define_clock_on_boundary', kind: 'select', options: ON_OFF_AUTO, defaultValue: 'auto' },
        { attr: 'csm_module_name', label: 'module_name', defaultValue: '' },
        { attr: 'csm_write_out', label: 'write_out_module_definition', kind: 'select', options: opt('on', 'in_separate_file', 'off', 'auto'), defaultValue: 'auto' },

        { attr: 'csm_clock', label: 'clock', defaultValue: 'clock' },
        { attr: 'csm_enable', label: 'enable', defaultValue: 'enable' },
        { attr: 'csm_enable_sync', label: 'enable_sync', defaultValue: 'enable_sync' },
        { attr: 'csm_ijtag_clock_cg_en', label: 'ijtag_clock_cg_en', defaultValue: 'ijtag_clock_cg_en' },
        { attr: 'csm_ijtag_clock', label: 'ijtag_clock', defaultValue: 'ijtag_clock' },

        { attr: 'csm_next_edt_clock_div', label: 'next_edt_clock_div', defaultValue: 'next_edt_clock_div' },
        { attr: 'csm_edt_clock_cg_en', label: 'edt_clock_cg_en', defaultValue: 'edt_clock_cg_en' },
        { attr: 'csm_edt_clock_bypass_in', label: 'edt_clock_bypass_in', defaultValue: 'edt_clock_bypass_in' },
        { attr: 'csm_edt_clock', label: 'edt_clock', defaultValue: 'edt_clock' },

        { attr: 'csm_next_shift_capture_clock_div', label: 'next_shift_capture_clock_div', defaultValue: 'next_shift_capture_clock_div' },
        { attr: 'csm_shift_capture_clock_cg_en', label: 'shift_capture_clock_cg_en', defaultValue: 'shift_capture_clock_cg_en' },
        { attr: 'csm_shift_capture_clock_bypass_in', label: 'shift_capture_clock_bypass_in', defaultValue: 'shift_capture_clock_bypass_in' },
        { attr: 'csm_shift_capture_clock', label: 'shift_capture_clock', defaultValue: 'shift_capture_clock' },

        { attr: 'csm_next_shift_clock_div', label: 'next_shift_clock_div', defaultValue: 'next_shift_clock_div' },
        { attr: 'csm_shift_clock_cg_en', label: 'shift_clock_cg_en', defaultValue: 'shift_clock_cg_en' },
        { attr: 'csm_shift_clock_bypass_in', label: 'shift_clock_bypass_in', defaultValue: 'shift_clock_bypass_in' },
        { attr: 'csm_shift_clock', label: 'shift_clock', defaultValue: 'shift_clock' },

        { attr: 'csm_next_capture_clock_div', label: 'next_capture_clock_div', defaultValue: 'next_capture_clock_div' },
        { attr: 'csm_capture_clock_cg_en', label: 'capture_clock_cg_en', defaultValue: 'capture_clock_cg_en' },
        { attr: 'csm_capture_clock_bypass_in', label: 'capture_clock_bypass_in', defaultValue: 'capture_clock_bypass_in' },
        { attr: 'csm_capture_clock', label: 'capture_clock', defaultValue: 'capture_clock' },

        { attr: 'csm_next_test_clock_div', label: 'next_test_clock_div', defaultValue: 'next_test_clock_div' },
        { attr: 'csm_test_clock_cg_en', label: 'test_clock_cg_en', defaultValue: 'test_clock_cg_en' },
        { attr: 'csm_test_clock_bypass_in', label: 'test_clock_bypass_in', defaultValue: 'test_clock_bypass_in' },
        { attr: 'csm_test_clock', label: 'test_clock', defaultValue: 'test_clock' },
      ],
    },

    'ScanHost/Interface/IjtagScanInterface': {
      title: 'IjtagScanInterface',
      fields: [
        { attr: 'if_ijtag_reset', label: 'reset', defaultValue: 'ijtag_reset' },
        { attr: 'if_ijtag_tck', label: 'tck', defaultValue: 'ijtag_tck' },
        { attr: 'if_ijtag_select', label: 'select', defaultValue: 'ijtag_sel' },
        { attr: 'if_ijtag_capture_en', label: 'capture_en', defaultValue: 'ijtag_ce' },
        { attr: 'if_ijtag_shift_en', label: 'shift_en', defaultValue: 'ijtag_se' },
        { attr: 'if_ijtag_update_en', label: 'update_en', defaultValue: 'ijtag_ue' },
        { attr: 'if_ijtag_scan_in', label: 'scan_in', defaultValue: 'ijtag_si' },
        { attr: 'if_ijtag_scan_out', label: 'scan_out', defaultValue: 'ijtag_so' },
      ],
    },

    'ScanHost/Connections': {
      title: 'Connections',
      description: '你贴的 spec 在这里截断了；先占位，后续补全字段即可。',
      fields: [],
    },
  },
};

export default def;
