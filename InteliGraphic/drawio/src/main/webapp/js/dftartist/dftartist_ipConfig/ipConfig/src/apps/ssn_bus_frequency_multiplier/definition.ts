import type { DftsTypeDef } from '../../shared/dfts/types';
import { opt, ON_OFF, kv, block, wrapSSNDatapath } from '../ssn/_common';

export const def: DftsTypeDef = {
  type: 'ssn_busfrequencymultiplier',
  title: 'DFT · SSN · BusFrequencyMultiplier',
  defaultNode: 'BusFrequencyMultiplier',
  nodes: {
    'BusFrequencyMultiplier': {
      title: 'BusFrequencyMultiplier',
      description: 'SSN/Datapath/BusFrequencyMultiplier(id)',
      fields: [
        { attr: 'bfm_id', label: 'id', defaultValue: '1' },

        { attr: 'use_clock_shaper_cell', label: 'use_clock_shaper_cell', kind: 'select', options: ON_OFF, defaultValue: 'off' },
        { attr: 'frequency_ratio', label: 'frequency_ratio (mandatory)', kind: 'number', required: true, defaultValue: 2 },
        { attr: 'update_phase', label: 'update_phase', kind: 'select', options: opt('transmitter', 'receiver'), defaultValue: 'transmitter' },
        { attr: 'output_divided_clock', label: 'output_divided_clock', kind: 'select', options: ON_OFF, defaultValue: 'off' },

        { attr: 'ijtag_host_interface', label: 'ijtag_host_interface', defaultValue: 'Sib(ssn)' },
        { attr: 'ijtag_connection_order', label: 'ijtag_connection_order', placeholder: 'int 或 ""', defaultValue: '' },
        { attr: 'bus_clock_period', label: 'bus_clock_period', placeholder: 'time', defaultValue: '' },
        { attr: 'parent_instance', label: 'parent_instance', defaultValue: '' },
        { attr: 'leaf_instance_name', label: 'leaf_instance_name', defaultValue: '' },
      ],
      buildCode: ({ get }) => {
        const id = get('bfm_id', '1');
        const inner = [
          kv('use_clock_shaper_cell', get('use_clock_shaper_cell', 'off')),
          kv('frequency_ratio', get('frequency_ratio', 2)),
          kv('update_phase', get('update_phase', 'transmitter')),
          kv('output_divided_clock', get('output_divided_clock', 'off')),

          kv('ijtag_host_interface', get('ijtag_host_interface', 'Sib(ssn)')),
          kv('ijtag_connection_order', get('ijtag_connection_order', '')),
          kv('bus_clock_period', get('bus_clock_period', '')),
          kv('parent_instance', get('parent_instance', '')),
          kv('leaf_instance_name', get('leaf_instance_name', '')),

          block('Interface', [
            kv('bus_clock', get('if_bus_clock', 'bus_clock')),
            kv('bus_clock_out', get('if_bus_clock_out', 'bus_clock_out')),
            kv('bus_data_in', get('if_bus_data_in', 'bus_data_in')),
            kv('bus_data_out', get('if_bus_data_out', 'bus_data_out')),
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

          block('Connections', [kv('bus_clock_in', get('c_bus_clock_in', 'ssn_bus_clock'))].join('\n')),
          block('ExtraOutputPath', ''),
        ].join('\n');

        return wrapSSNDatapath(`BusFrequencyMultiplier(${id})`, inner);
      },
    },

    'BusFrequencyMultiplier/Interface': {
      title: 'Interface',
      fields: [
        { attr: 'if_bus_clock', label: 'bus_clock', defaultValue: 'bus_clock' },
        { attr: 'if_bus_clock_out', label: 'bus_clock_out', defaultValue: 'bus_clock_out' },
        { attr: 'if_bus_data_in', label: 'bus_data_in', defaultValue: 'bus_data_in' },
        { attr: 'if_bus_data_out', label: 'bus_data_out', defaultValue: 'bus_data_out' },
      ],
    },
    'BusFrequencyMultiplier/Interface/IjtagScanInterface': {
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
    'BusFrequencyMultiplier/Connections': {
      title: 'Connections',
      fields: [{ attr: 'c_bus_clock_in', label: 'bus_clock_in', defaultValue: 'ssn_bus_clock' }],
    },
  },
};

export default def;
