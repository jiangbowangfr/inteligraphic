import React from 'react';
import { CommonDataSourceForm } from '../common/CommonDataSourceForm';
import { PATTERN_DATA_SOURCE_FIELDS } from '../common/schema';

export function PatternDataSourcePage(props: any) {
  return (
    <CommonDataSourceForm
      {...props}
      config={{
        type: 'pattern_data_source',
        title: 'Pattern Data Source',
        description: '配置 Pattern Data Source 的 body label、pattern_data_out 总线宽度，以及输出/valid pin 的显示名称。',
        fields: PATTERN_DATA_SOURCE_FIELDS,
      }}
    />
  );
}
