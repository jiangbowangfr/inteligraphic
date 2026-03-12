import React from 'react';
import { DftsPageProps } from '../common/types';
import { CommonInterfaceForm } from '../common/CommonInterfaceForm';
import { BSCAN_SLAVE_FIELDS } from '../common/schema';

export function BSCANSlaveInterfacePage(props: DftsPageProps) {
  return (
    <CommonInterfaceForm
      {...props}
      config={{
        type: 'bscan_slave_interface',
        title: 'BSCAN Slave Interface',
        fields: BSCAN_SLAVE_FIELDS,
      }}
    />
  );
}
