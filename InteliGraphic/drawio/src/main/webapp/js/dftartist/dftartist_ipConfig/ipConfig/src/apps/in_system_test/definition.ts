import type { DftsTypeDef, FieldDef } from "../../shared/dfts/types";

const onOff = [
  { label: "on", value: "on" },
  { label: "off", value: "off" },
];

const onOffAuto = [
  { label: "auto", value: "auto" },
  { label: "on", value: "on" },
  { label: "off", value: "off" },
];

const codeHeader = (body: string) => `DftSpecification(module_name,id) {\n${body}\n}`;
const kv = (key: string, value: any) => `            ${key.padEnd(32, " ")} : ${value} ;`;
const kv2 = (indent: number, key: string, value: any) =>
  `${" ".repeat(indent)}${key.padEnd(Math.max(1, 32 - Math.max(0, indent - 12)), " ")} : ${value} ;`;
const block = (indent: number, name: string, body: string) =>
  `${" ".repeat(indent)}${name} {\n${body}\n${" ".repeat(indent)}}`;

function fields(items: Array<FieldDef | false | null | undefined>) {
  return items.filter(Boolean) as FieldDef[];
}

export const inSystemTestDefinition: DftsTypeDef = {
  type: "istcontroller",
  title: "DFT · InSystemTest",
  defaultNode: "InSystemTest",
  nodes: {
    InSystemTest: {
      title: "InSystemTest",
      description: "DftSpecification/InSystemTest",
      fields: [
        {
          attr: "ist_include_clocks_in_icl_model",
          label: "include_clocks_in_icl_model",
          kind: "select",
          options: onOffAuto,
          defaultValue: "auto",
        },
        {
          attr: "ist_controller_id",
          label: "controller_id",
          kind: "string",
          defaultValue: "id",
        },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    InSystemTest {\n` +
            `        Controller(${get("ist_controller_id", "id")}) {\n        }\n` +
            `        include_clocks_in_icl_model   : ${get("ist_include_clocks_in_icl_model", "auto")} ;\n` +
            `    }`,
        ),
    },
    "InSystemTest/Controller": {
      title: "Controller",
      description: "InSystemTest/Controller(id)",
      fields: [
        { attr: "ist_ctrl_host_interface", label: "host_interface", kind: "string", defaultValue: "" },
        {
          attr: "ist_ctrl_protocol",
          label: "protocol",
          kind: "select",
          options: [
            { label: "direct_memory_access", value: "direct_memory_access" },
            { label: "cpu_interface", value: "cpu_interface" },
          ],
          defaultValue: "direct_memory_access",
        },
        { attr: "ist_ctrl_data_width", label: "data_width", kind: "number", defaultValue: "" },
        { attr: "ist_ctrl_parent_instance", label: "parent_instance", kind: "string", defaultValue: "" },
        { attr: "ist_ctrl_leaf_instance_name", label: "leaf_instance_name", kind: "string", defaultValue: "" },
        { attr: "ist_ctrl_async_reset_all_registers", label: "async_reset_all_registers", kind: "select", options: onOff, defaultValue: "off" },
        { attr: "ist_ctrl_use_enable_sync_cell", label: "use_enable_sync_cell", kind: "select", options: onOff, defaultValue: "off" },
        {
          attr: "ist_ctrl_tap_reset_method",
          label: "tap_reset_method",
          kind: "select",
          options: [
            { label: "asynchronous", value: "asynchronous" },
            { label: "synchronous", value: "synchronous" },
          ],
          defaultValue: "asynchronous",
        },
        {
          attr: "ist_ctrl_controller_reset",
          label: "controller_reset",
          kind: "select",
          options: [
            { label: "functional_reset_only", value: "functional_reset_only" },
            {
              label: "combined_ijtag_and_functional_reset",
              value: "combined_ijtag_and_functional_reset",
            },
          ],
          defaultValue: "functional_reset_only",
        },
        { attr: "ist_ctrl_ijtag_network_reset_cycles", label: "ijtag_network_reset_cycles", kind: "number", defaultValue: "" },
        { attr: "ist_ctrl_use_clock_dff_cell", label: "use_clock_dff_cell", kind: "select", options: onOff, defaultValue: "off" },
        { attr: "ist_ctrl_ssn_bus_width", label: "ssn_bus_width", kind: "string", defaultValue: "auto", placeholder: "int | auto" },
        { attr: "ist_ctrl_tck_clock_mux_select_cycles", label: "tck_clock_mux_select_cycles", kind: "number", defaultValue: 0 },
        { attr: "ist_ctrl_max_extra_control_setup_hold_cycles", label: "max_extra_control_setup_hold_cycles", kind: "number", defaultValue: "" },
        { attr: "ist_ctrl_max_extra_tms_setup_hold_cycles", label: "max_extra_tms_setup_hold_cycles", kind: "number", defaultValue: "" },
        {
          attr: "ist_ctrl_write_access_when_inactive",
          label: "write_access_when_inactive",
          kind: "select",
          options: [
            { label: "ignore", value: "ignore" },
            { label: "bus_error", value: "bus_error" },
          ],
          defaultValue: "ignore",
        },
        {
          attr: "ist_ctrl_read_access_when_inactive",
          label: "read_access_when_inactive",
          kind: "select",
          options: [
            { label: "ignore", value: "ignore" },
            { label: "bus_error", value: "bus_error" },
            { label: "auto", value: "auto" },
            { label: "wait", value: "wait" },
          ],
          defaultValue: "ignore",
        },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    InSystemTest {\n` +
            `        Controller(${get("ist_controller_id", "id")}) {\n` +
            kv("host_interface", get("ist_ctrl_host_interface", "")) + `\n` +
            `            DesignInstance(${get("ist_design_instance_name", "instance_name")}) {\n            }\n` +
            kv("protocol", get("ist_ctrl_protocol", "direct_memory_access")) + `\n` +
            kv("data_width", get("ist_ctrl_data_width", "")) + `\n` +
            kv("parent_instance", get("ist_ctrl_parent_instance", "")) + `\n` +
            kv("leaf_instance_name", get("ist_ctrl_leaf_instance_name", "")) + `\n` +
            kv("async_reset_all_registers", get("ist_ctrl_async_reset_all_registers", "off")) + `\n` +
            kv("use_enable_sync_cell", get("ist_ctrl_use_enable_sync_cell", "off")) + `\n` +
            kv("tap_reset_method", get("ist_ctrl_tap_reset_method", "asynchronous")) + `\n` +
            kv("controller_reset", get("ist_ctrl_controller_reset", "functional_reset_only")) + `\n` +
            kv("ijtag_network_reset_cycles", get("ist_ctrl_ijtag_network_reset_cycles", "")) + `\n` +
            kv("use_clock_dff_cell", get("ist_ctrl_use_clock_dff_cell", "off")) + `\n` +
            kv("ssn_bus_width", get("ist_ctrl_ssn_bus_width", "auto")) + `\n` +
            kv("tck_clock_mux_select_cycles", get("ist_ctrl_tck_clock_mux_select_cycles", 0)) + `\n` +
            kv("max_extra_control_setup_hold_cycles", get("ist_ctrl_max_extra_control_setup_hold_cycles", "")) + `\n` +
            kv("max_extra_tms_setup_hold_cycles", get("ist_ctrl_max_extra_tms_setup_hold_cycles", "")) + `\n` +
            kv("write_access_when_inactive", get("ist_ctrl_write_access_when_inactive", "ignore")) + `\n` +
            kv("read_access_when_inactive", get("ist_ctrl_read_access_when_inactive", "ignore")) + `\n` +
            `            ControllerChain {\n            }\n` +
            `            ApbSubordinateOptions {\n            }\n` +
            `            AxiSubordinateOptions {\n            }\n` +
            `            DirectMemoryAccessOptions {\n            }\n` +
            `            Interface {\n            }\n` +
            `            Connections {\n            }\n` +
            `        }\n` +
            `    }`,
        ),
    },
    "InSystemTest/Controller/DesignInstance": {
      title: "DesignInstance",
      description: "InSystemTest/Controller/DesignInstance(instance_name)",
      fields: [
        { attr: "ist_design_instance_name", label: "instance_name", kind: "string", defaultValue: "instance_name" },
        { attr: "ist_design_instance_client_interface", label: "client_interface", kind: "string", defaultValue: "" },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
            block(12, `DesignInstance(${get("ist_design_instance_name", "instance_name")})`, kv2(16, "client_interface", get("ist_design_instance_client_interface", ""))) +
            `\n        }\n    }`,
        ),
    },
    "InSystemTest/Controller/ControllerChain": {
      title: "ControllerChain",
      description: "InSystemTest/Controller/ControllerChain",
      fields: [
        { attr: "ist_cc_present", label: "present", kind: "select", options: onOff, defaultValue: "off" },
        {
          attr: "ist_cc_clock",
          label: "clock",
          kind: "select",
          options: [
            { label: "tck", value: "tck" },
            { label: "ccm_clock", value: "ccm_clock" },
            { label: "ist_clock", value: "ist_clock" },
          ],
          defaultValue: "tck",
        },
        { attr: "ist_cc_segment_per_instrument", label: "segment_per_instrument", kind: "select", options: onOff, defaultValue: "off" },
        { attr: "ist_cc_max_segment_length", label: "max_segment_length", kind: "string", defaultValue: "unlimited", placeholder: "int | unlimited" },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
            block(12, "ControllerChain", [
              kv2(16, "present", get("ist_cc_present", "off")),
              kv2(16, "clock", get("ist_cc_clock", "tck")),
              kv2(16, "segment_per_instrument", get("ist_cc_segment_per_instrument", "off")),
              kv2(16, "max_segment_length", get("ist_cc_max_segment_length", "unlimited")),
            ].join("\n")) +
            `\n        }\n    }`,
        ),
    },
    "InSystemTest/Controller/ApbSubordinateOptions": {
      title: "ApbSubordinateOptions",
      description: "InSystemTest/Controller/ApbSubordinateOptions",
      fields: [
        { attr: "ist_apb_present", label: "present", kind: "select", options: onOffAuto, defaultValue: "auto" },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
            block(12, "ApbSubordinateOptions", kv2(16, "present", get("ist_apb_present", "auto"))) +
            `\n        }\n    }`,
        ),
    },
    "InSystemTest/Controller/AxiSubordinateOptions": {
      title: "AxiSubordinateOptions",
      description: "InSystemTest/Controller/AxiSubordinateOptions",
      fields: [
        { attr: "ist_axi_present", label: "present", kind: "select", options: onOffAuto, defaultValue: "auto" },
        { attr: "ist_axi_write_transaction_id_width", label: "write_transaction_id_width", kind: "number", defaultValue: "" },
        { attr: "ist_axi_read_transaction_id_width", label: "read_transaction_id_width", kind: "number", defaultValue: "" },
        { attr: "ist_axi_buffer_memory_cell", label: "buffer_memory_cell", kind: "string", defaultValue: "" },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
            block(12, "AxiSubordinateOptions", [
              kv2(16, "present", get("ist_axi_present", "auto")),
              kv2(16, "write_transaction_id_width", get("ist_axi_write_transaction_id_width", "")),
              kv2(16, "read_transaction_id_width", get("ist_axi_read_transaction_id_width", "")),
              kv2(16, "buffer_memory_cell", get("ist_axi_buffer_memory_cell", "")),
            ].join("\n")) +
            `\n        }\n    }`,
        ),
    },
    "InSystemTest/Controller/DirectMemoryAccessOptions": {
      title: "DirectMemoryAccessOptions",
      description: "InSystemTest/Controller/DirectMemoryAccessOptions",
      fields: [
        { attr: "ist_dma_begin_address", label: "begin_address", kind: "number", defaultValue: 0 },
        { attr: "ist_dma_end_address", label: "end_address", kind: "string", defaultValue: "", placeholder: "max addressable memory" },
        { attr: "ist_dma_address_width", label: "address_width", kind: "number", defaultValue: "" },
        { attr: "ist_dma_max_wait_cycles", label: "max_wait_cycles", kind: "string", defaultValue: "" },
        { attr: "ist_dma_max_test_program_count", label: "max_test_program_count", kind: "number", defaultValue: 1 },
        {
          attr: "ist_dma_test_program_execution",
          label: "test_program_execution",
          kind: "select",
          options: [
            { label: "single", value: "single" },
            { label: "consecutive", value: "consecutive" },
          ],
          defaultValue: "single",
        },
        { attr: "ist_dma_misr", label: "misr", kind: "string", defaultValue: "none", placeholder: "none | integer" },
        {
          attr: "ist_dma_ijtag_clock_control",
          label: "ijtag_clock_control",
          kind: "select",
          options: [
            { label: "test_active", value: "test_active" },
            { label: "ist_enable", value: "ist_enable" },
          ],
          defaultValue: "test_active",
        },
        { attr: "ist_dma_memory_min_hold", label: "memory_min_hold", kind: "string", defaultValue: 0, placeholder: "time" },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
            block(12, "DirectMemoryAccessOptions", [
              kv2(16, "begin_address", get("ist_dma_begin_address", 0)),
              kv2(16, "end_address", get("ist_dma_end_address", "")),
              kv2(16, "address_width", get("ist_dma_address_width", "")),
              kv2(16, "max_wait_cycles", get("ist_dma_max_wait_cycles", "")),
              kv2(16, "max_test_program_count", get("ist_dma_max_test_program_count", 1)),
              kv2(16, "test_program_execution", get("ist_dma_test_program_execution", "single")),
              kv2(16, "misr", get("ist_dma_misr", "none")),
              kv2(16, "ijtag_clock_control", get("ist_dma_ijtag_clock_control", "test_active")),
              kv2(16, "memory_min_hold", get("ist_dma_memory_min_hold", 0)),
            ].join("\n")) +
            `\n        }\n    }`,
        ),
    },
    "InSystemTest/Controller/Interface": {
      title: "Interface",
      description: "InSystemTest/Controller/Interface",
      fields: [
        { attr: "ist_if_reset", label: "reset", kind: "string", defaultValue: "" },
        {
          attr: "ist_if_reset_polarity",
          label: "reset_polarity",
          kind: "select",
          options: [
            { label: "active_high", value: "active_high" },
            { label: "active_low", value: "active_low" },
          ],
          defaultValue: "active_high",
        },
        { attr: "ist_if_test_active", label: "test_active", kind: "string", defaultValue: "test_active" },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
            block(12, "Interface", [
              kv2(16, "reset", get("ist_if_reset", "")),
              kv2(16, "reset_polarity", get("ist_if_reset_polarity", "active_high")),
              kv2(16, "test_active", get("ist_if_test_active", "test_active")),
              block(16, "ControllerChain", ""),
              block(16, "CpuInterface", ""),
              block(16, "DirectMemoryAccess", ""),
              block(16, "TapScanInterface", ""),
              block(16, "IjtagScanInterface", ""),
              block(16, "SsnDatapathHost", ""),
            ].join("\n")) +
            `\n        }\n    }`,
        ),
    },
    "InSystemTest/Controller/Interface/ControllerChain": {
      title: "ControllerChain",
      description: "InSystemTest/Controller/Interface/ControllerChain",
      fields: [
        { attr: "ist_if_cc_enable", label: "enable", kind: "string", defaultValue: "ccm_en" },
        { attr: "ist_if_cc_scan_in", label: "scan_in", kind: "string", defaultValue: "ccm_scan_in" },
        { attr: "ist_if_cc_scan_out", label: "scan_out", kind: "string", defaultValue: "ccm_scan_out" },
        { attr: "ist_if_cc_scan_en", label: "scan_en", kind: "string", defaultValue: "scan_en" },
        { attr: "ist_if_cc_clock", label: "clock", kind: "string", defaultValue: "ccm_clock" },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
            block(12, "Interface", block(16, "ControllerChain", [
              kv2(20, "enable", get("ist_if_cc_enable", "ccm_en")),
              kv2(20, "scan_in", get("ist_if_cc_scan_in", "ccm_scan_in")),
              kv2(20, "scan_out", get("ist_if_cc_scan_out", "ccm_scan_out")),
              kv2(20, "scan_en", get("ist_if_cc_scan_en", "scan_en")),
              kv2(20, "clock", get("ist_if_cc_clock", "ccm_clock")),
            ].join("\n"))) +
          `\n        }\n    }`,
        ),
    },
    "InSystemTest/Controller/Interface/CpuInterface": {
      title: "CpuInterface",
      description: "InSystemTest/Controller/Interface/CpuInterface",
      fields: [],
      buildCode: ({ get }) =>
        codeHeader(
          `    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
            block(12, "Interface", block(16, "CpuInterface", [
              block(20, "ApbSubordinate", ""),
              block(20, "AxiSubordinate", ""),
              block(20, "Generic", ""),
            ].join("\n"))) +
            `\n        }\n    }`,
        ),
    },
    "InSystemTest/Controller/Interface/CpuInterface/Generic": {
      title: "Generic",
      description: "InSystemTest/Controller/Interface/CpuInterface/Generic",
      fields: [
        { attr: "ist_if_cpu_generic_clock", label: "clock", kind: "string", defaultValue: "cpu_interface_clock" },
        { attr: "ist_if_cpu_generic_data_in", label: "data_in", kind: "string", defaultValue: "data_from_cpu[%d]" },
        { attr: "ist_if_cpu_generic_data_out", label: "data_out", kind: "string", defaultValue: "data_to_cpu[%d]" },
        { attr: "ist_if_cpu_generic_write_en", label: "write_en", kind: "string", defaultValue: "write_en_from_cpu" },
        { attr: "ist_if_cpu_generic_enable", label: "enable", kind: "string", defaultValue: "cpu_interface_en" },
      ],
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Interface", block(16, "CpuInterface", block(20, "Generic", [
            kv2(24, "clock", get("ist_if_cpu_generic_clock", "cpu_interface_clock")),
            kv2(24, "data_in", get("ist_if_cpu_generic_data_in", "data_from_cpu[%d]")),
            kv2(24, "data_out", get("ist_if_cpu_generic_data_out", "data_to_cpu[%d]")),
            kv2(24, "write_en", get("ist_if_cpu_generic_write_en", "write_en_from_cpu")),
            kv2(24, "enable", get("ist_if_cpu_generic_enable", "cpu_interface_en")),
          ].join("\n")))) +
          `\n        }\n    }`),
    },
    "InSystemTest/Controller/Interface/CpuInterface/ApbSubordinate": {
      title: "ApbSubordinate",
      description: "InSystemTest/Controller/Interface/CpuInterface/ApbSubordinate",
      fields: fields(["clock", "select", "enable", "write_en", "data_in", "data_out", "address", "ready", "bus_error"].map((name) => ({
        attr: `ist_if_apb_${name}`,
        label: name,
        kind: "string",
        defaultValue: {
          clock: "PCLK",
          select: "PSEL",
          enable: "PENABLE",
          write_en: "PWRITE",
          data_in: "PWDATA[%d]",
          data_out: "PRDATA[%d]",
          address: "PADDR[%d]",
          ready: "PREADY",
          bus_error: "PSLVERR",
        }[name],
      } as FieldDef))),
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Interface", block(16, "CpuInterface", block(20, "ApbSubordinate", [
            kv2(24, "clock", get("ist_if_apb_clock", "PCLK")),
            kv2(24, "select", get("ist_if_apb_select", "PSEL")),
            kv2(24, "enable", get("ist_if_apb_enable", "PENABLE")),
            kv2(24, "write_en", get("ist_if_apb_write_en", "PWRITE")),
            kv2(24, "data_in", get("ist_if_apb_data_in", "PWDATA[%d]")),
            kv2(24, "data_out", get("ist_if_apb_data_out", "PRDATA[%d]")),
            kv2(24, "address", get("ist_if_apb_address", "PADDR[%d]")),
            kv2(24, "ready", get("ist_if_apb_ready", "PREADY")),
            kv2(24, "bus_error", get("ist_if_apb_bus_error", "PSLVERR")),
          ].join("\n")))) +
          `\n        }\n    }`),
    },
    "InSystemTest/Controller/Interface/CpuInterface/AxiSubordinate": {
      title: "AxiSubordinate",
      description: "InSystemTest/Controller/Interface/CpuInterface/AxiSubordinate",
      fields: [
        { attr: "ist_if_axi_clock", label: "clock", kind: "string", defaultValue: "ACLK" },
      ],
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Interface", block(16, "CpuInterface", block(20, "AxiSubordinate", [
            kv2(24, "clock", get("ist_if_axi_clock", "ACLK")),
            block(24, "WriteAddressChannel", ""),
            block(24, "WriteDataChannel", ""),
            block(24, "WriteResponseChannel", ""),
            block(24, "ReadAddressChannel", ""),
            block(24, "ReadDataChannel", ""),
          ].join("\n")))) +
          `\n        }\n    }`),
    },
    "InSystemTest/Controller/Interface/CpuInterface/AxiSubordinate/WriteAddressChannel": {
      title: "WriteAddressChannel",
      description: "InSystemTest/Controller/Interface/CpuInterface/AxiSubordinate/WriteAddressChannel",
      fields: [
        { attr: "ist_if_axi_aw_id", label: "id", kind: "string", defaultValue: "AWID[%d]" },
        { attr: "ist_if_axi_aw_address", label: "address", kind: "string", defaultValue: "AWADDR[%d]" },
        { attr: "ist_if_axi_aw_valid", label: "valid", kind: "string", defaultValue: "AWVALID" },
        { attr: "ist_if_axi_aw_ready", label: "ready", kind: "string", defaultValue: "AWREADY" },
      ],
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Interface", block(16, "CpuInterface", block(20, "AxiSubordinate", block(24, "WriteAddressChannel", [
            kv2(28, "id", get("ist_if_axi_aw_id", "AWID[%d]")),
            kv2(28, "address", get("ist_if_axi_aw_address", "AWADDR[%d]")),
            kv2(28, "valid", get("ist_if_axi_aw_valid", "AWVALID")),
            kv2(28, "ready", get("ist_if_axi_aw_ready", "AWREADY")),
          ].join("\n"))))) +
          `\n        }\n    }`),
    },
    "InSystemTest/Controller/Interface/CpuInterface/AxiSubordinate/WriteDataChannel": {
      title: "WriteDataChannel",
      description: "InSystemTest/Controller/Interface/CpuInterface/AxiSubordinate/WriteDataChannel",
      fields: [
        { attr: "ist_if_axi_w_data", label: "data", kind: "string", defaultValue: "WDATA[%d]" },
        { attr: "ist_if_axi_w_last", label: "last", kind: "string", defaultValue: "WLAST" },
        { attr: "ist_if_axi_w_valid", label: "valid", kind: "string", defaultValue: "WVALID" },
        { attr: "ist_if_axi_w_ready", label: "ready", kind: "string", defaultValue: "WREADY" },
      ],
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Interface", block(16, "CpuInterface", block(20, "AxiSubordinate", block(24, "WriteDataChannel", [
            kv2(28, "data", get("ist_if_axi_w_data", "WDATA[%d]")),
            kv2(28, "last", get("ist_if_axi_w_last", "WLAST")),
            kv2(28, "valid", get("ist_if_axi_w_valid", "WVALID")),
            kv2(28, "ready", get("ist_if_axi_w_ready", "WREADY")),
          ].join("\n"))))) +
          `\n        }\n    }`),
    },
    "InSystemTest/Controller/Interface/CpuInterface/AxiSubordinate/WriteResponseChannel": {
      title: "WriteResponseChannel",
      description: "InSystemTest/Controller/Interface/CpuInterface/AxiSubordinate/WriteResponseChannel",
      fields: [
        { attr: "ist_if_axi_b_id", label: "id", kind: "string", defaultValue: "BID[%d]" },
        { attr: "ist_if_axi_b_response", label: "response", kind: "string", defaultValue: "BRESP[1:0]" },
        { attr: "ist_if_axi_b_valid", label: "valid", kind: "string", defaultValue: "BVALID" },
        { attr: "ist_if_axi_b_ready", label: "ready", kind: "string", defaultValue: "BREADY" },
      ],
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Interface", block(16, "CpuInterface", block(20, "AxiSubordinate", block(24, "WriteResponseChannel", [
            kv2(28, "id", get("ist_if_axi_b_id", "BID[%d]")),
            kv2(28, "response", get("ist_if_axi_b_response", "BRESP[1:0]")),
            kv2(28, "valid", get("ist_if_axi_b_valid", "BVALID")),
            kv2(28, "ready", get("ist_if_axi_b_ready", "BREADY")),
          ].join("\n"))))) +
          `\n        }\n    }`),
    },
    "InSystemTest/Controller/Interface/CpuInterface/AxiSubordinate/ReadAddressChannel": {
      title: "ReadAddressChannel",
      description: "InSystemTest/Controller/Interface/CpuInterface/AxiSubordinate/ReadAddressChannel",
      fields: [
        { attr: "ist_if_axi_ar_id", label: "id", kind: "string", defaultValue: "ARID[%d]" },
        { attr: "ist_if_axi_ar_address", label: "address", kind: "string", defaultValue: "ARADDR[%d]" },
        { attr: "ist_if_axi_ar_length", label: "length", kind: "string", defaultValue: "ARLEN[3:0]" },
        { attr: "ist_if_axi_ar_valid", label: "valid", kind: "string", defaultValue: "ARVALID" },
        { attr: "ist_if_axi_ar_ready", label: "ready", kind: "string", defaultValue: "ARREADY" },
      ],
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Interface", block(16, "CpuInterface", block(20, "AxiSubordinate", block(24, "ReadAddressChannel", [
            kv2(28, "id", get("ist_if_axi_ar_id", "ARID[%d]")),
            kv2(28, "address", get("ist_if_axi_ar_address", "ARADDR[%d]")),
            kv2(28, "length", get("ist_if_axi_ar_length", "ARLEN[3:0]")),
            kv2(28, "valid", get("ist_if_axi_ar_valid", "ARVALID")),
            kv2(28, "ready", get("ist_if_axi_ar_ready", "ARREADY")),
          ].join("\n"))))) +
          `\n        }\n    }`),
    },
    "InSystemTest/Controller/Interface/CpuInterface/AxiSubordinate/ReadDataChannel": {
      title: "ReadDataChannel",
      description: "InSystemTest/Controller/Interface/CpuInterface/AxiSubordinate/ReadDataChannel",
      fields: [
        { attr: "ist_if_axi_r_id", label: "id", kind: "string", defaultValue: "RID[%d]" },
        { attr: "ist_if_axi_r_data", label: "data", kind: "string", defaultValue: "RDATA[%d]" },
        { attr: "ist_if_axi_r_response", label: "response", kind: "string", defaultValue: "RRESP[1:0]" },
        { attr: "ist_if_axi_r_last", label: "last", kind: "string", defaultValue: "RLAST" },
        { attr: "ist_if_axi_r_valid", label: "valid", kind: "string", defaultValue: "RVALID" },
        { attr: "ist_if_axi_r_ready", label: "ready", kind: "string", defaultValue: "RREADY" },
      ],
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Interface", block(16, "CpuInterface", block(20, "AxiSubordinate", block(24, "ReadDataChannel", [
            kv2(28, "id", get("ist_if_axi_r_id", "RID[%d]")),
            kv2(28, "data", get("ist_if_axi_r_data", "RDATA[%d]")),
            kv2(28, "response", get("ist_if_axi_r_response", "RRESP[1:0]")),
            kv2(28, "last", get("ist_if_axi_r_last", "RLAST")),
            kv2(28, "valid", get("ist_if_axi_r_valid", "RVALID")),
            kv2(28, "ready", get("ist_if_axi_r_ready", "RREADY")),
          ].join("\n"))))) +
          `\n        }\n    }`),
    },
    "InSystemTest/Controller/Interface/DirectMemoryAccess": {
      title: "DirectMemoryAccess",
      description: "InSystemTest/Controller/Interface/DirectMemoryAccess",
      fields: [
        { attr: "ist_if_dma_clock", label: "clock", kind: "string", defaultValue: "dma_clock" },
        { attr: "ist_if_dma_test_program_index", label: "test_program_index", kind: "string", defaultValue: "dma_test_program_index[%d]" },
        { attr: "ist_if_dma_test_program_start_index", label: "test_program_start_index", kind: "string", defaultValue: "dma_test_program_start_index[%d]" },
        { attr: "ist_if_dma_test_program_end_index", label: "test_program_end_index", kind: "string", defaultValue: "dma_test_program_end_index[%d]" },
        { attr: "ist_if_dma_invalid_test_program_index", label: "invalid_test_program_index", kind: "string", defaultValue: "" },
        { attr: "ist_if_dma_test_program_done", label: "test_program_done", kind: "string", defaultValue: "dma_test_program_done" },
        { attr: "ist_if_dma_fail_flag", label: "fail_flag", kind: "string", defaultValue: "dma_fail_flag[%d]" },
        { attr: "ist_if_dma_misr", label: "misr", kind: "string", defaultValue: "dma_misr[%d]" },
        { attr: "ist_if_dma_mem_address", label: "mem_address", kind: "string", defaultValue: "dma_address[%d]" },
        { attr: "ist_if_dma_mem_data", label: "mem_data", kind: "string", defaultValue: "dma_data[%d]" },
        { attr: "ist_if_dma_enable", label: "enable", kind: "string", defaultValue: "dma_en" },
        { attr: "ist_if_dma_memory_access_active", label: "memory_access_active", kind: "string", defaultValue: "" },
      ],
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Interface", block(16, "DirectMemoryAccess", [
            kv2(20, "clock", get("ist_if_dma_clock", "dma_clock")),
            kv2(20, "test_program_index", get("ist_if_dma_test_program_index", "dma_test_program_index[%d]")),
            kv2(20, "test_program_start_index", get("ist_if_dma_test_program_start_index", "dma_test_program_start_index[%d]")),
            kv2(20, "test_program_end_index", get("ist_if_dma_test_program_end_index", "dma_test_program_end_index[%d]")),
            kv2(20, "invalid_test_program_index", get("ist_if_dma_invalid_test_program_index", "")),
            kv2(20, "test_program_done", get("ist_if_dma_test_program_done", "dma_test_program_done")),
            kv2(20, "fail_flag", get("ist_if_dma_fail_flag", "dma_fail_flag[%d]")),
            kv2(20, "misr", get("ist_if_dma_misr", "dma_misr[%d]")),
            kv2(20, "mem_address", get("ist_if_dma_mem_address", "dma_address[%d]")),
            kv2(20, "mem_data", get("ist_if_dma_mem_data", "dma_data[%d]")),
            kv2(20, "enable", get("ist_if_dma_enable", "dma_en")),
            kv2(20, "memory_access_active", get("ist_if_dma_memory_access_active", "")),
          ].join("\n"))) +
          `\n        }\n    }`),
    },
    "InSystemTest/Controller/Interface/TapScanInterface": {
      title: "TapScanInterface",
      description: "InSystemTest/Controller/Interface/TapScanInterface",
      fields: fields(["tck","trst","tms","tdi","tdo","tdo_en","to_tck","to_trst","to_tms","to_tdi","from_tdo","from_tdo_en"].map((name) => ({
        attr: `ist_if_tap_${name}`,
        label: name,
        kind: "string",
        defaultValue: {
          tck: "ijtag_tck", trst: "trst", tms: "tms", tdi: "tdi", tdo: "tdo", tdo_en: "tdo_en",
          to_tck: "to_ijtag_tck", to_trst: "to_trst", to_tms: "to_tms", to_tdi: "to_tdi", from_tdo: "from_tdo", from_tdo_en: "from_tdo_en",
        }[name],
      } as FieldDef))),
      buildCode: ({ get }) => {
        const keys = ["tck","trst","tms","tdi","tdo","tdo_en","to_tck","to_trst","to_tms","to_tdi","from_tdo","from_tdo_en"];
        return codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Interface", block(16, "TapScanInterface", keys.map((name) => kv2(20, name, get(`ist_if_tap_${name}`, {
            tck: "ijtag_tck", trst: "trst", tms: "tms", tdi: "tdi", tdo: "tdo", tdo_en: "tdo_en",
            to_tck: "to_ijtag_tck", to_trst: "to_trst", to_tms: "to_tms", to_tdi: "to_tdi", from_tdo: "from_tdo", from_tdo_en: "from_tdo_en",
          }[name]))).join("\n"))) +
          `\n        }\n    }`);
      },
    },
    "InSystemTest/Controller/Interface/IjtagScanInterface": {
      title: "IjtagScanInterface",
      description: "InSystemTest/Controller/Interface/IjtagScanInterface",
      fields: fields(["tck","reset","select","capture_en","shift_en","update_en","scan_in","scan_out","to_tck","to_reset","to_select","to_capture_en","to_shift_en","to_update_en","to_scan_in","from_scan_out"].map((name) => ({
        attr: `ist_if_ijtag_${name}`,
        label: name,
        kind: "string",
        defaultValue: {
          tck: "ijtag_tck", reset: "ijtag_reset", select: "ijtag_sel", capture_en: "ijtag_ce", shift_en: "ijtag_se", update_en: "ijtag_ue",
          scan_in: "ijtag_si", scan_out: "ijtag_so", to_tck: "to_ijtag_tck", to_reset: "to_ijtag_reset", to_select: "to_ijtag_sel",
          to_capture_en: "to_ijtag_ce", to_shift_en: "to_ijtag_se", to_update_en: "to_ijtag_ue", to_scan_in: "to_ijtag_si", from_scan_out: "from_ijtag_so",
        }[name],
      } as FieldDef))),
      buildCode: ({ get }) => {
        const defaults: Record<string, string> = {
          tck: "ijtag_tck", reset: "ijtag_reset", select: "ijtag_sel", capture_en: "ijtag_ce", shift_en: "ijtag_se", update_en: "ijtag_ue",
          scan_in: "ijtag_si", scan_out: "ijtag_so", to_tck: "to_ijtag_tck", to_reset: "to_ijtag_reset", to_select: "to_ijtag_sel",
          to_capture_en: "to_ijtag_ce", to_shift_en: "to_ijtag_se", to_update_en: "to_ijtag_ue", to_scan_in: "to_ijtag_si", from_scan_out: "from_ijtag_so",
        };
        return codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Interface", block(16, "IjtagScanInterface", Object.keys(defaults).map((name) => kv2(20, name, get(`ist_if_ijtag_${name}`, defaults[name]))).join("\n"))) +
          `\n        }\n    }`);
      },
    },
    "InSystemTest/Controller/Interface/SsnDatapathHost": {
      title: "SsnDatapathHost",
      description: "InSystemTest/Controller/Interface/SsnDatapathHost",
      fields: [
        { attr: "ist_if_ssn_bus_clock", label: "bus_clock", kind: "string", defaultValue: "to_ssn_bus_clock" },
        { attr: "ist_if_ssn_bus_data_in", label: "bus_data_in", kind: "string", defaultValue: "to_ssn_bus_data_in[%d]" },
        { attr: "ist_if_ssn_bus_data_out", label: "bus_data_out", kind: "string", defaultValue: "from_ssn_bus_data_out[%d]" },
      ],
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Interface", block(16, "SsnDatapathHost", [
            kv2(20, "bus_clock", get("ist_if_ssn_bus_clock", "to_ssn_bus_clock")),
            kv2(20, "bus_data_in", get("ist_if_ssn_bus_data_in", "to_ssn_bus_data_in[%d]")),
            kv2(20, "bus_data_out", get("ist_if_ssn_bus_data_out", "from_ssn_bus_data_out[%d]")),
          ].join("\n"))) +
          `\n        }\n    }`),
    },
    "InSystemTest/Controller/Connections": {
      title: "Connections",
      description: "InSystemTest/Controller/Connections",
      fields: [
        { attr: "ist_conn_reset", label: "reset", kind: "string", defaultValue: "" },
        { attr: "ist_conn_test_active", label: "test_active", kind: "string", defaultValue: "" },
        { attr: "ist_conn_controller_chain_enable", label: "controller_chain_enable", kind: "string", defaultValue: "OptionalDftSignal(controller_chain_mode)" },
        { attr: "ist_conn_controller_chain_clock", label: "controller_chain_clock", kind: "string", defaultValue: "OptionalDftSignal(test_clock)" },
        { attr: "ist_conn_scan_en", label: "scan_en", kind: "string", defaultValue: "OptionalDftSignal(scan_en)" },
        { attr: "ist_conn_controller_chain_scan_in", label: "controller_chain_scan_in", kind: "string", defaultValue: "control_chain_%s_scan_in" },
        { attr: "ist_conn_controller_chain_scan_out", label: "controller_chain_scan_out", kind: "string", defaultValue: "control_chain_%s_scan_out" },
      ],
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Connections", [
            kv2(16, "reset", get("ist_conn_reset", "")),
            kv2(16, "test_active", get("ist_conn_test_active", "")),
            kv2(16, "controller_chain_enable", get("ist_conn_controller_chain_enable", "OptionalDftSignal(controller_chain_mode)")),
            kv2(16, "controller_chain_clock", get("ist_conn_controller_chain_clock", "OptionalDftSignal(test_clock)")),
            kv2(16, "scan_en", get("ist_conn_scan_en", "OptionalDftSignal(scan_en)")),
            kv2(16, "controller_chain_scan_in", get("ist_conn_controller_chain_scan_in", "control_chain_%s_scan_in")),
            kv2(16, "controller_chain_scan_out", get("ist_conn_controller_chain_scan_out", "control_chain_%s_scan_out")),
            block(16, "CpuInterface", ""),
            block(16, "DirectMemoryAccess", ""),
          ].join("\n")) +
          `\n        }\n    }`),
    },
    "InSystemTest/Controller/Connections/CpuInterface": {
      title: "CpuInterface",
      description: "InSystemTest/Controller/Connections/CpuInterface",
      fields: [],
      buildCode: ({ get }) =>
        codeHeader(
          `    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
            block(12, "Connections", block(16, "CpuInterface", [
              block(20, "Generic", ""),
              block(20, "ApbSubordinate", ""),
              block(20, "AxiSubordinate", ""),
            ].join("\n"))) +
            `\n        }\n    }`,
        ),
    },
    "InSystemTest/Controller/Connections/CpuInterface/Generic": {
      title: "Generic",
      description: "InSystemTest/Controller/Connections/CpuInterface/Generic",
      fields: fields(["clock", "data_in", "data_out", "write_en", "enable"].map((name) => ({
        attr: `ist_conn_cpu_generic_${name}`,
        label: name,
        kind: "string",
        defaultValue: "",
      } as FieldDef))),
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Connections", block(16, "CpuInterface", block(20, "Generic", [
            kv2(24, "clock", get("ist_conn_cpu_generic_clock", "")),
            kv2(24, "data_in", get("ist_conn_cpu_generic_data_in", "")),
            kv2(24, "data_out", get("ist_conn_cpu_generic_data_out", "")),
            kv2(24, "write_en", get("ist_conn_cpu_generic_write_en", "")),
            kv2(24, "enable", get("ist_conn_cpu_generic_enable", "")),
          ].join("\n")))) +
          `\n        }\n    }`),
    },
    "InSystemTest/Controller/Connections/CpuInterface/ApbSubordinate": {
      title: "ApbSubordinate",
      description: "InSystemTest/Controller/Connections/CpuInterface/ApbSubordinate",
      fields: fields(["clock","select","enable","write_en","data_in","data_out","address","ready","bus_error"].map((name) => ({
        attr: `ist_conn_apb_${name}`,
        label: name,
        kind: "string",
        defaultValue: "",
      } as FieldDef))),
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Connections", block(16, "CpuInterface", block(20, "ApbSubordinate", [
            kv2(24, "clock", get("ist_conn_apb_clock", "")),
            kv2(24, "select", get("ist_conn_apb_select", "")),
            kv2(24, "enable", get("ist_conn_apb_enable", "")),
            kv2(24, "write_en", get("ist_conn_apb_write_en", "")),
            kv2(24, "data_in", get("ist_conn_apb_data_in", "")),
            kv2(24, "data_out", get("ist_conn_apb_data_out", "")),
            kv2(24, "address", get("ist_conn_apb_address", "")),
            kv2(24, "ready", get("ist_conn_apb_ready", "")),
            kv2(24, "bus_error", get("ist_conn_apb_bus_error", "")),
          ].join("\n")))) +
          `\n        }\n    }`),
    },
    "InSystemTest/Controller/Connections/CpuInterface/AxiSubordinate": {
      title: "AxiSubordinate",
      description: "InSystemTest/Controller/Connections/CpuInterface/AxiSubordinate",
      fields: [
        { attr: "ist_conn_axi_clock", label: "clock", kind: "string", defaultValue: "" },
      ],
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Connections", block(16, "CpuInterface", block(20, "AxiSubordinate", [
            kv2(24, "clock", get("ist_conn_axi_clock", "")),
            block(24, "WriteAddressChannel", ""),
            block(24, "WriteDataChannel", ""),
            block(24, "WriteResponseChannel", ""),
            block(24, "ReadAddressChannel", ""),
            block(24, "ReadDataChannel", ""),
          ].join("\n")))) +
          `\n        }\n    }`),
    },
    "InSystemTest/Controller/Connections/CpuInterface/AxiSubordinate/WriteAddressChannel": {
      title: "WriteAddressChannel",
      description: "InSystemTest/Controller/Connections/CpuInterface/AxiSubordinate/WriteAddressChannel",
      fields: [
        { attr: "ist_conn_axi_aw_id", label: "id", kind: "string", defaultValue: "" },
        { attr: "ist_conn_axi_aw_address", label: "address", kind: "string", defaultValue: "" },
        { attr: "ist_conn_axi_aw_valid", label: "valid", kind: "string", defaultValue: "" },
        { attr: "ist_conn_axi_aw_ready", label: "ready", kind: "string", defaultValue: "" },
      ],
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Connections", block(16, "CpuInterface", block(20, "AxiSubordinate", block(24, "WriteAddressChannel", [
            kv2(28, "id", get("ist_conn_axi_aw_id", "")),
            kv2(28, "address", get("ist_conn_axi_aw_address", "")),
            kv2(28, "valid", get("ist_conn_axi_aw_valid", "")),
            kv2(28, "ready", get("ist_conn_axi_aw_ready", "")),
          ].join("\n"))))) +
          `\n        }\n    }`),
    },
    "InSystemTest/Controller/Connections/CpuInterface/AxiSubordinate/WriteDataChannel": {
      title: "WriteDataChannel",
      description: "InSystemTest/Controller/Connections/CpuInterface/AxiSubordinate/WriteDataChannel",
      fields: [
        { attr: "ist_conn_axi_w_data", label: "data", kind: "string", defaultValue: "" },
        { attr: "ist_conn_axi_w_last", label: "last", kind: "string", defaultValue: "" },
        { attr: "ist_conn_axi_w_valid", label: "valid", kind: "string", defaultValue: "" },
        { attr: "ist_conn_axi_w_ready", label: "ready", kind: "string", defaultValue: "" },
      ],
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Connections", block(16, "CpuInterface", block(20, "AxiSubordinate", block(24, "WriteDataChannel", [
            kv2(28, "data", get("ist_conn_axi_w_data", "")),
            kv2(28, "last", get("ist_conn_axi_w_last", "")),
            kv2(28, "valid", get("ist_conn_axi_w_valid", "")),
            kv2(28, "ready", get("ist_conn_axi_w_ready", "")),
          ].join("\n"))))) +
          `\n        }\n    }`),
    },
    "InSystemTest/Controller/Connections/CpuInterface/AxiSubordinate/WriteResponseChannel": {
      title: "WriteResponseChannel",
      description: "InSystemTest/Controller/Connections/CpuInterface/AxiSubordinate/WriteResponseChannel",
      fields: [
        { attr: "ist_conn_axi_b_id", label: "id", kind: "string", defaultValue: "" },
        { attr: "ist_conn_axi_b_response", label: "response", kind: "string", defaultValue: "" },
        { attr: "ist_conn_axi_b_valid", label: "valid", kind: "string", defaultValue: "" },
        { attr: "ist_conn_axi_b_ready", label: "ready", kind: "string", defaultValue: "" },
      ],
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Connections", block(16, "CpuInterface", block(20, "AxiSubordinate", block(24, "WriteResponseChannel", [
            kv2(28, "id", get("ist_conn_axi_b_id", "")),
            kv2(28, "response", get("ist_conn_axi_b_response", "")),
            kv2(28, "valid", get("ist_conn_axi_b_valid", "")),
            kv2(28, "ready", get("ist_conn_axi_b_ready", "")),
          ].join("\n"))))) +
          `\n        }\n    }`),
    },
    "InSystemTest/Controller/Connections/CpuInterface/AxiSubordinate/ReadAddressChannel": {
      title: "ReadAddressChannel",
      description: "InSystemTest/Controller/Connections/CpuInterface/AxiSubordinate/ReadAddressChannel",
      fields: [
        { attr: "ist_conn_axi_ar_id", label: "id", kind: "string", defaultValue: "" },
        { attr: "ist_conn_axi_ar_address", label: "address", kind: "string", defaultValue: "" },
        { attr: "ist_conn_axi_ar_length", label: "length", kind: "string", defaultValue: "" },
        { attr: "ist_conn_axi_ar_valid", label: "valid", kind: "string", defaultValue: "" },
        { attr: "ist_conn_axi_ar_ready", label: "ready", kind: "string", defaultValue: "" },
      ],
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Connections", block(16, "CpuInterface", block(20, "AxiSubordinate", block(24, "ReadAddressChannel", [
            kv2(28, "id", get("ist_conn_axi_ar_id", "")),
            kv2(28, "address", get("ist_conn_axi_ar_address", "")),
            kv2(28, "length", get("ist_conn_axi_ar_length", "")),
            kv2(28, "valid", get("ist_conn_axi_ar_valid", "")),
            kv2(28, "ready", get("ist_conn_axi_ar_ready", "")),
          ].join("\n"))))) +
          `\n        }\n    }`),
    },
    "InSystemTest/Controller/Connections/CpuInterface/AxiSubordinate/ReadDataChannel": {
      title: "ReadDataChannel",
      description: "InSystemTest/Controller/Connections/CpuInterface/AxiSubordinate/ReadDataChannel",
      fields: [
        { attr: "ist_conn_axi_r_id", label: "id", kind: "string", defaultValue: "" },
        { attr: "ist_conn_axi_r_data", label: "data", kind: "string", defaultValue: "" },
        { attr: "ist_conn_axi_r_response", label: "response", kind: "string", defaultValue: "" },
        { attr: "ist_conn_axi_r_last", label: "last", kind: "string", defaultValue: "" },
        { attr: "ist_conn_axi_r_valid", label: "valid", kind: "string", defaultValue: "" },
        { attr: "ist_conn_axi_r_ready", label: "ready", kind: "string", defaultValue: "" },
      ],
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Connections", block(16, "CpuInterface", block(20, "AxiSubordinate", block(24, "ReadDataChannel", [
            kv2(28, "id", get("ist_conn_axi_r_id", "")),
            kv2(28, "data", get("ist_conn_axi_r_data", "")),
            kv2(28, "response", get("ist_conn_axi_r_response", "")),
            kv2(28, "last", get("ist_conn_axi_r_last", "")),
            kv2(28, "valid", get("ist_conn_axi_r_valid", "")),
            kv2(28, "ready", get("ist_conn_axi_r_ready", "")),
          ].join("\n"))))) +
          `\n        }\n    }`),
    },
    "InSystemTest/Controller/Connections/DirectMemoryAccess": {
      title: "DirectMemoryAccess",
      description: "InSystemTest/Controller/Connections/DirectMemoryAccess",
      fields: fields(["clock","test_program_index","test_program_start_index","test_program_end_index","invalid_test_program_index","test_program_done","fail_flag","misr","mem_address","mem_data","enable","memory_access_active"].map((name) => ({
        attr: `ist_conn_dma_${name}`,
        label: name,
        kind: "string",
        defaultValue: "",
      } as FieldDef))),
      buildCode: ({ get }) =>
        codeHeader(`    InSystemTest {\n        Controller(${get("ist_controller_id", "id")}) {\n` +
          block(12, "Connections", block(16, "DirectMemoryAccess", [
            kv2(20, "clock", get("ist_conn_dma_clock", "")),
            kv2(20, "test_program_index", get("ist_conn_dma_test_program_index", "")),
            kv2(20, "test_program_start_index", get("ist_conn_dma_test_program_start_index", "")),
            kv2(20, "test_program_end_index", get("ist_conn_dma_test_program_end_index", "")),
            kv2(20, "invalid_test_program_index", get("ist_conn_dma_invalid_test_program_index", "")),
            kv2(20, "test_program_done", get("ist_conn_dma_test_program_done", "")),
            kv2(20, "fail_flag", get("ist_conn_dma_fail_flag", "")),
            kv2(20, "misr", get("ist_conn_dma_misr", "")),
            kv2(20, "mem_address", get("ist_conn_dma_mem_address", "")),
            kv2(20, "mem_data", get("ist_conn_dma_mem_data", "")),
            kv2(20, "enable", get("ist_conn_dma_enable", "")),
            kv2(20, "memory_access_active", get("ist_conn_dma_memory_access_active", "")),
          ].join("\n"))) +
          `\n        }\n    }`),
    },
  },
};
