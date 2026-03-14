import React from 'react';
import { DftsPageProps } from '../common/types';
import { CommonInterfaceForm } from '../common/CommonInterfaceForm';
import { IJTAG_HOST_FIELDS } from '../common/schema';

export function IJTAGHostInterfacePage(props: DftsPageProps) {
  return (
    <CommonInterfaceForm
      {...props}
      config={{
        type: 'ijtag_host_interface',
        title: 'IJTAG Host Interface',
        fields: IJTAG_HOST_FIELDS,
      }}
    />
  );
}
