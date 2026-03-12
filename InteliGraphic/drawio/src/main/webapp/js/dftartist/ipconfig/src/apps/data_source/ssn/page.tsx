import React from 'react';
import { CommonDataSourceForm } from '../common/CommonDataSourceForm';
import { SSN_DATA_SOURCE_FIELDS } from '../common/schema';

export function SsnDataSourcePage(props: any) {
  return (
    <CommonDataSourceForm
      {...props}
      config={{
        type: 'ssn_data_source',
        title: 'SSN Data Source',
        description: '配置 SSNPadSource 的 body label、data_req / data_out / data_in 三个 pin 的显示名称，以及 ssn_data_out 的总线宽度。',
        fields: SSN_DATA_SOURCE_FIELDS,
      }}
    />
  );
}
