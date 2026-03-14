import type { DftsTypeDef } from '../../shared/dfts/types';
import { opt, ON_OFF, ON_OFF_AUTO, kv, block, wrapSSNDatapath } from '../ssn/_common';

export const def: DftsTypeDef = {
  type: 'ssn_multiplexer',
  title: 'DFT · SSN · Multiplexer',
  defaultNode: 'Multiplexer',
  nodes: {
    'Multiplexer': {
      title: 'Multiplexer',
      description: 'SSN/Datapath/Multiplexer(id)',
      fields: [
        { attr: 'mux_id', label: 'id', defaultValue: '1' },

        { attr: 'ijtag_host_interface', label: 'ijtag_host_interface', defaultValue: 'Sib(ssn)' },
        { attr: 'ijtag_connection_order', label: 'ijtag_connection_order', defaultValue: '' },
        { attr: 'bus_clock_period', label: 'bus_clock_period', defaultValue: '' },

        { attr: 'secondary_input_bus_width', label: 'secondary_input_bus_width', kind: 'select', options: opt('width', 'same_as_output_bus_width', 'auto'), defaultValue: 'auto' },
        { attr: 'include_clock_mux', label: 'include_clock_mux', kind: 'select', options: ON_OFF_AUTO, defaultValue: 'auto' },
        { attr: 'include_pipeline_stage', label: 'include_pipeline_stage', kind: 'select', options: ON_OFF, defaultValue: 'off' },
        { attr: 'mux_select', label: 'mux_select', kind: 'select', options: opt('internal', 'external', 'auto'), defaultValue: 'auto' },
        { attr: 'internal_mux_select_reset_value', label: 'internal_mux_select_reset_value', kind: 'select', options: opt('0', '1'), defaultValue: '0' },

        { attr: 'parent_instance', label: 'parent_instance', defaultValue: '' },
        { attr: 'leaf_instance_name', label: 'leaf_instance_name', defaultValue: '' },
      ],
      buildCode: ({ get }) => {
        const id = get('mux_id', '1');
        const inner = [
          kv('ijtag_host_interface', get('ijtag_host_interface', 'Sib(ssn)')),
          kv('ijtag_connection_order', get('ijtag_connection_order', '')),
          kv('bus_clock_period', get('bus_clock_period', '')),

          kv('secondary_input_bus_width', get('secondary_input_bus_width', 'auto')),
          kv('include_clock_mux', get('include_clock_mux', 'auto')),
          kv('include_pipeline_stage', get('include_pipeline_stage', 'off')),
          kv('mux_select', get('mux_select', 'auto')),
          kv('internal_mux_select_reset_value', get('internal_mux_select_reset_value', '0')),

          kv('parent_instance', get('parent_instance', '')),
          kv('leaf_instance_name', get('leaf_instance_name', '')),

          block('DefaultChildConfiguration', ''),
          block('Interface', [
            kv('bus_clock', get('if_bus_clock', 'bus_clock')),
            kv('bus_clock_out', get('if_bus_clock_out', 'bus_clock_out')),
            kv('bus_data_in', get('if_bus_data_in', 'bus_data_in')),
            kv('secondary_bus_data_in', get('if_secondary_bus_data_in', 'secondary_bus_data_in')),
            kv('secondary_bus_clock', get('if_secondary_bus_clock', 'secondary_bus_clock')),
            kv('bus_data_out', get('if_bus_data_out', 'bus_data_out')),
            kv('select_in', get('if_select_in', 'select_in')),
            kv('select_out', get('if_select_out', 'select_out')),
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
          ].join('\n')),

          block('Connections', [
            kv('bus_clock_in', get('c_bus_clock_in', 'ssn_bus_clock')),
            kv('input_datapath_id', get('c_input_datapath_id', 'in1')),
            kv('secondary_bus_data_in', get('c_secondary_bus_data_in', '')),
            kv('select_in', get('c_select_in', '')),
            kv('secondary_bus_clock_in', get('c_secondary_bus_clock_in', '')),
            block('InSystemTestController', ''),
          ].join('\n')),

          block('BusFrequencyDivider', ''),
          block('BusFrequencyMultiplier', ''),
          block('DesignInstance', ''),
          block('ExtraOutputPath', ''),
          block('Multiplexer', ''),
          block('Pipeline', ''),
          block('Receiver1xPipeline', ''),
          block('ScanHost', ''),
        ].join('\n');

        return wrapSSNDatapath(`Multiplexer(${id})`, inner);
      },
    },

    'Multiplexer/Interface': {
      title: 'Interface',
      fields: [
        { attr: 'if_bus_clock', label: 'bus_clock', defaultValue: 'bus_clock' },
        { attr: 'if_bus_clock_out', label: 'bus_clock_out', defaultValue: 'bus_clock_out' },
        { attr: 'if_bus_data_in', label: 'bus_data_in', defaultValue: 'bus_data_in' },
        { attr: 'if_secondary_bus_data_in', label: 'secondary_bus_data_in', defaultValue: 'secondary_bus_data_in' },
        { attr: 'if_secondary_bus_clock', label: 'secondary_bus_clock', defaultValue: 'secondary_bus_clock' },
        { attr: 'if_bus_data_out', label: 'bus_data_out', defaultValue: 'bus_data_out' },
        { attr: 'if_select_in', label: 'select_in', defaultValue: 'select_in' },
        { attr: 'if_select_out', label: 'select_out', defaultValue: 'select_out' },
      ],
    },
    'Multiplexer/Interface/IjtagScanInterface': {
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
    'Multiplexer/Connections': {
      title: 'Connections',
      fields: [
        { attr: 'c_bus_clock_in', label: 'bus_clock_in', defaultValue: 'ssn_bus_clock' },
        { attr: 'c_input_datapath_id', label: 'input_datapath_id', defaultValue: 'in1' },
        { attr: 'c_secondary_bus_data_in', label: 'secondary_bus_data_in', placeholder: '- | port_pin_name,...', defaultValue: '' },
        { attr: 'c_select_in', label: 'select_in', placeholder: '- | port_pin_name', defaultValue: '' },
        { attr: 'c_secondary_bus_clock_in', label: 'secondary_bus_clock_in', defaultValue: '' },
      ],
    },
  },
};

export default def;
