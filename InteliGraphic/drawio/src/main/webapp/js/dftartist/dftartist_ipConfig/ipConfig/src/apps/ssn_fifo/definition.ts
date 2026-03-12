import type { DftsTypeDef } from '../../shared/dfts/types';
import { opt, ON_OFF, DFF_LATCH, kv, block, wrapSSNDatapath } from '../ssn/_common';

export const def: DftsTypeDef = {
  type: 'ssn_fifo',
  title: 'DFT · SSN · Fifo',
  defaultNode: 'Fifo',
  nodes: {
    'Fifo': {
      title: 'Fifo',
      description: 'SSN/Datapath/Fifo(id)',
      fields: [
        { attr: 'fifo_id', label: 'id', defaultValue: '1' },

        { attr: 'ijtag_host_interface', label: 'ijtag_host_interface', defaultValue: 'Sib(ssn)' },
        { attr: 'ijtag_connection_order', label: 'ijtag_connection_order', placeholder: 'int 或 ""', defaultValue: '' },
        { attr: 'bus_clock_period', label: 'bus_clock_period', placeholder: 'time', defaultValue: '' },

        { attr: 'frequency_ratio', label: 'frequency_ratio (required)', kind: 'number', required: true, defaultValue: 2 },
        { attr: 'input_retimed', label: 'input_retimed', kind: 'select', options: ON_OFF, defaultValue: 'off' },
        { attr: 'input_retiming_cell_type', label: 'input_retiming_cell_type', kind: 'select', options: DFF_LATCH, defaultValue: 'dff' },
        { attr: 'in_clock_to_out_clock_skew', label: 'in_clock_to_out_clock_skew', kind: 'select', options: opt('early_or_delayed', 'delayed_only'), defaultValue: 'early_or_delayed' },
        { attr: 'in_clock_to_out_clock_skew_programmable', label: 'in_clock_to_out_clock_skew_programmable', kind: 'select', options: ON_OFF, defaultValue: 'off' },

        { attr: 'parent_instance', label: 'parent_instance', defaultValue: '' },
        { attr: 'leaf_instance_name', label: 'leaf_instance_name', defaultValue: '' },
      ],
      buildCode: ({ get }) => {
        const id = get('fifo_id', '1');
        const inner = [
          kv('ijtag_host_interface', get('ijtag_host_interface', 'Sib(ssn)')),
          kv('ijtag_connection_order', get('ijtag_connection_order', '')),
          kv('bus_clock_period', get('bus_clock_period', '')),

          kv('frequency_ratio', get('frequency_ratio', 2)),
          kv('input_retimed', get('input_retimed', 'off')),
          kv('input_retiming_cell_type', get('input_retiming_cell_type', 'dff')),
          kv('in_clock_to_out_clock_skew', get('in_clock_to_out_clock_skew', 'early_or_delayed')),
          kv('in_clock_to_out_clock_skew_programmable', get('in_clock_to_out_clock_skew_programmable', 'off')),

          kv('parent_instance', get('parent_instance', '')),
          kv('leaf_instance_name', get('leaf_instance_name', '')),

          block('Interface', [
            kv('bus_in_clock', get('if_bus_in_clock', 'bus_in_clock')),
            kv('bus_out_clock', get('if_bus_out_clock', 'bus_out_clock')),
            kv('bus_data_in', get('if_bus_data_in', 'bus_data_in')),
            kv('bus_data_out', get('if_bus_data_out', 'bus_data_out')),
            block('IjtagScanInterface', [
              kv('reset', get('if_ijtag_reset', 'ijtag_reset')),
              kv('tck', get('if_ijtag_tck', 'ijtag_tck')),
              kv('select', get('if_ijtag_select', 'ijtag_sel')),
              kv('capture_en', get('if_ijtag_capture_en', 'ijtag_ce')),
              kv('capture_shift_en', get('if_ijtag_capture_shift_en', 'ijtag_capture_shift_en')),
              kv('shift_en', get('if_ijtag_shift_en', 'ijtag_se')),
              kv('update_en', get('if_ijtag_update_en', 'ijtag_ue')),
              kv('update_clock', get('if_ijtag_update_clock', 'ijtag_update_clock')),
              kv('scan_in', get('if_ijtag_scan_in', 'ijtag_si')),
              kv('scan_out', get('if_ijtag_scan_out', 'ijtag_so')),
            ].join('\n')),
          ].join('\n')),

          block('Connections', [
            kv('bus_in_clock_in', get('c_bus_in_clock_in', '')),
            kv('bus_out_clock_in', get('c_bus_out_clock_in', '')),
          ].join('\n')),

          block('ExtraOutputPath', ''),
        ].join('\n');

        return wrapSSNDatapath(`Fifo(${id})`, inner);
      },
    },

    'Fifo/Interface': {
      title: 'Interface',
      fields: [
        { attr: 'if_bus_in_clock', label: 'bus_in_clock', defaultValue: 'bus_in_clock' },
        { attr: 'if_bus_out_clock', label: 'bus_out_clock', defaultValue: 'bus_out_clock' },
        { attr: 'if_bus_data_in', label: 'bus_data_in', defaultValue: 'bus_data_in' },
        { attr: 'if_bus_data_out', label: 'bus_data_out', defaultValue: 'bus_data_out' },
      ],
    },
    'Fifo/Interface/IjtagScanInterface': {
      title: 'IjtagScanInterface',
      fields: [
        { attr: 'if_ijtag_reset', label: 'reset', defaultValue: 'ijtag_reset' },
        { attr: 'if_ijtag_tck', label: 'tck', defaultValue: 'ijtag_tck' },
        { attr: 'if_ijtag_select', label: 'select', defaultValue: 'ijtag_sel' },
        { attr: 'if_ijtag_capture_en', label: 'capture_en', defaultValue: 'ijtag_ce' },
        { attr: 'if_ijtag_capture_shift_en', label: 'capture_shift_en', defaultValue: 'ijtag_capture_shift_en' },
        { attr: 'if_ijtag_shift_en', label: 'shift_en', defaultValue: 'ijtag_se' },
        { attr: 'if_ijtag_update_en', label: 'update_en', defaultValue: 'ijtag_ue' },
        { attr: 'if_ijtag_update_clock', label: 'update_clock', defaultValue: 'ijtag_update_clock' },
        { attr: 'if_ijtag_scan_in', label: 'scan_in', defaultValue: 'ijtag_si' },
        { attr: 'if_ijtag_scan_out', label: 'scan_out', defaultValue: 'ijtag_so' },
      ],
    },
    'Fifo/Connections': {
      title: 'Connections',
      fields: [
        { attr: 'c_bus_in_clock_in', label: 'bus_in_clock_in', defaultValue: '' },
        { attr: 'c_bus_out_clock_in', label: 'bus_out_clock_in', defaultValue: '' },
      ],
    },
  },
};

export default def;
