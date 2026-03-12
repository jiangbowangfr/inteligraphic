import React from 'react';
import { DftsPageProps } from '../common/types';
import { CommonInterfaceForm } from '../common/CommonInterfaceForm';
import { IJTAG_SLAVE_FIELDS } from '../common/schema';

export function IJTAGSlaveInterfacePage(props: DftsPageProps) {
  return (
    <CommonInterfaceForm
      {...props}
      config={{
        type: 'ijtag_slave_interface',
        title: 'IJTAG Slave Interface',
        fields: IJTAG_SLAVE_FIELDS,
      }}
    />
  );
}
