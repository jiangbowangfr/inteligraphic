import type { DftsTypeDef } from '../../shared/dfts/types';
import { DFF_LATCH, kv, block, wrapSSNDatapath } from '../ssn/_common';

export const def: DftsTypeDef = {
  type: 'ssn_receiver1x_pipeline',
  title: 'DFT · SSN · Receiver1xPipeline',
  defaultNode: 'Receiver1xPipeline',
  nodes: {
    'Receiver1xPipeline': {
      title: 'Receiver1xPipeline',
      description: 'SSN/Datapath/Receiver1xPipeline(id)',
      fields: [
        { attr: 'r1x_id', label: 'id', defaultValue: '1' },
        { attr: 'ijtag_host_interface', label: 'ijtag_host_interface', defaultValue: 'Sib(ssn)' },
        { attr: 'ijtag_connection_order', label: 'ijtag_connection_order (order)', defaultValue: '' },
        { attr: 'bus_clock_period', label: 'bus_clock_period', defaultValue: '2.5ns' },
        { attr: 'parent_instance', label: 'parent_instance', defaultValue: '' },
        { attr: 'leaf_instance_name', label: 'leaf_instance_name', defaultValue: '' },
        { attr: 'input_retiming_cell_type', label: 'input_retiming_cell_type', kind: 'select', options: DFF_LATCH, defaultValue: 'dff' },
      ],
      buildCode: ({ get }) => {
        const id = get('r1x_id', '1');
        const inner = [
          kv('ijtag_host_interface', get('ijtag_host_interface', 'Sib(ssn)')),
          kv('ijtag_connection_order', get('ijtag_connection_order', '')),
          kv('bus_clock_period', get('bus_clock_period', '2.5ns')),
          kv('parent_instance', get('parent_instance', '')),
          kv('leaf_instance_name', get('leaf_instance_name', '')),
          kv('input_retiming_cell_type', get('input_retiming_cell_type', 'dff')),

          block('Interface', [
            kv('bus_clock', get('if_bus_clock', 'bus_clock')),
            kv('bus_data_in', get('if_bus_data_in', 'bus_data_in')),
            kv('bus_data_out', get('if_bus_data_out', 'bus_data_out')),
            block('IjtagScanInterface', [
              kv('reset', get('if_ijtag_reset', 'ijtag_reset')),
            ].join('\n')),
          ].join('\n')),

          block('Connections', [kv('bus_clock_in', get('c_bus_clock_in', 'ssn_bus_clock'))].join('\n')),
          block('ExtraOutputPath', ''),
        ].join('\n');

        return wrapSSNDatapath(`Receiver1xPipeline(${id})`, inner);
      },
    },

    'Receiver1xPipeline/Interface': {
      title: 'Interface',
      fields: [
        { attr: 'if_bus_clock', label: 'bus_clock', defaultValue: 'bus_clock' },
        { attr: 'if_bus_data_in', label: 'bus_data_in', defaultValue: 'bus_data_in' },
        { attr: 'if_bus_data_out', label: 'bus_data_out', defaultValue: 'bus_data_out' },
      ],
    },
    'Receiver1xPipeline/Interface/IjtagScanInterface': {
      title: 'IjtagScanInterface',
      fields: [{ attr: 'if_ijtag_reset', label: 'reset', defaultValue: 'ijtag_reset' }],
    },
    'Receiver1xPipeline/Connections': {
      title: 'Connections',
      fields: [{ attr: 'c_bus_clock_in', label: 'bus_clock_in', defaultValue: 'ssn_bus_clock' }],
    },
  },
};

export default def;
