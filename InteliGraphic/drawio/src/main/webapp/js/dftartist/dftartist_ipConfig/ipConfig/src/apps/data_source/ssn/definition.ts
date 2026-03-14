import type { DftsTypeDef } from "../../../shared/dfts/types";

export const ssnDataSourceDefinition: DftsTypeDef = {
  type: "ssn_data_source",
  title: "SSN Data Source",
  category: "data_source",
  tabs: ["ip-basic", "ip-layout", "preview"],

  specialFields: [
    {
      key: "ssn_bus_clock_target",
      pinKey: "ssn_bus_clock",
      label: "ssn_bus_clock",
      type: "text",
      placeholder: "输入 clock 连接目标",
      help: "例如 top.u_ssn_clk",
    },
    {
      key: "ssn_data_out_map",
      pinKey: "ssn_data_out",
      label: "ssn_data_out",
      type: "bus-map",
      width: 8,
      bitLabelPrefix: "bus",
      placeholder: "输入该 bit 的连接目标",
      help: "逐位填写 ssn_data_out 的连接目标",
    },
    {
      key: "ssn_data_in_target",
      pinKey: "ssn_data_in",
      label: "ssn_data_in",
      type: "text",
      placeholder: "输入 data_in 连接目标",
      help: "例如 top.u_ssn_din",
    },
  ],
};
