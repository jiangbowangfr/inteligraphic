import React from 'react';
import { DftsPageProps } from '../common/types';
import { CommonInterfaceForm } from '../common/CommonInterfaceForm';
import { BISR_SLAVE_FIELDS } from '../common/schema';

export function BISRSlaveInterfacePage(props: DftsPageProps) {
  return (
    <CommonInterfaceForm
      {...props}
      config={{
        type: 'bisr_slave_interface',
        title: 'BISR Slave Interface',
        fields: BISR_SLAVE_FIELDS,
      }}
    />
  );
}
