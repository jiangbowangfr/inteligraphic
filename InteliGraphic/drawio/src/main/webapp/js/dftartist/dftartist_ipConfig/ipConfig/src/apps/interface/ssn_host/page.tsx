import React from 'react';
import { DftsPageProps } from '../common/types';
import { CommonInterfaceForm } from '../common/CommonInterfaceForm';
import { SSN_HOST_FIELDS } from '../common/schema';

export function SSNHostInterfacePage(props: DftsPageProps) {
  return (
    <CommonInterfaceForm
      {...props}
      config={{
        type: 'ssn_host_interface',
        title: 'SSN Host Interface',
        fields: SSN_HOST_FIELDS,
      }}
    />
  );
}
