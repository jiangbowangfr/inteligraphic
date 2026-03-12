import React from 'react';
import { DftsPageProps } from '../common/types';
import { CommonInterfaceForm } from '../common/CommonInterfaceForm';
import { SSN_SLAVE_FIELDS } from '../common/schema';

export function SSNSlaveInterfacePage(props: DftsPageProps) {
  return (
    <CommonInterfaceForm
      {...props}
      config={{
        type: 'ssn_slave_interface',
        title: 'SSN Slave Interface',
        fields: SSN_SLAVE_FIELDS,
      }}
    />
  );
}
