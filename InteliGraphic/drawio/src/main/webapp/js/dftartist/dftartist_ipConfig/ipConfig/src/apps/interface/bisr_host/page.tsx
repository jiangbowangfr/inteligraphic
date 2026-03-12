import React from 'react';
import { DftsPageProps } from '../common/types';
import { CommonInterfaceForm } from '../common/CommonInterfaceForm';
import { BISR_HOST_FIELDS } from '../common/schema';

export function BISRHostInterfacePage(props: DftsPageProps) {
  return (
    <CommonInterfaceForm
      {...props}
      config={{
        type: 'bisr_host_interface',
        title: 'BISR Host Interface',
        fields: BISR_HOST_FIELDS,
      }}
    />
  );
}
