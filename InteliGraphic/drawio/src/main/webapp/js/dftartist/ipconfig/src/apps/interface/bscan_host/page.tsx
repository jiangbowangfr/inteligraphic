import React from 'react';
import { DftsPageProps } from '../common/types';
import { CommonInterfaceForm } from '../common/CommonInterfaceForm';
import { BSCAN_HOST_FIELDS } from '../common/schema';

export function BSCANHostInterfacePage(props: DftsPageProps) {
  return (
    <CommonInterfaceForm
      {...props}
      config={{
        type: 'bscan_host_interface',
        title: 'BSCAN Host Interface',
        fields: BSCAN_HOST_FIELDS,
      }}
    />
  );
}
