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
const kv2 = (indent: number, key: string, value: any) =>
  `${" ".repeat(indent)}${key.padEnd(Math.max(1, 32 - Math.max(0, indent - 12)), " ")} : ${value} ;`;
const block = (indent: number, name: string, body: string) =>
  `${" ".repeat(indent)}${name} {\n${body}\n${" ".repeat(indent)}}`;

function fields(items: Array<FieldDef | false | null | undefined>) {
  return items.filter(Boolean) as FieldDef[];
}

export const memoryBisrDefinition: DftsTypeDef = {
  type: "memorybisrcontroller",
  title: "DFT · MemoryBisr",
  defaultNode: "MemoryBisr",
  nodes: {
    MemoryBisr: {
      title: "MemoryBisr",
      description: "DftSpecification/MemoryBisr",
      fields: [
        { attr: "mb_bisr_segment_order_file", label: "bisr_segment_order_file", kind: "string", defaultValue: "", placeholder: "filename" },
        {
          attr: "mb_memory_repair_loading_method",
          label: "memory_repair_loading_method",
          kind: "select",
          options: [
            { label: "serial", value: "serial" },
            { label: "from_read_buffer", value: "from_read_buffer" },
          ],
          defaultValue: "serial",
        },
        { attr: "mb_memory_library_name_list", label: "memory_library_name_list", kind: "textarea", defaultValue: "", placeholder: "mem_lib_name, ..." },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    MemoryBisr {\n` +
            `        bisr_segment_order_file      : ${get("mb_bisr_segment_order_file", "")} ;\n` +
            `        memory_repair_loading_method : ${get("mb_memory_repair_loading_method", "serial")} ;\n` +
            `        memory_library_name_list     : ${get("mb_memory_library_name_list", "")} ;\n` +
            `        AdvancedOptions {\n        }\n` +
            `        BisrElement(memory_instance) {\n        }\n` +
            `        Interface {\n        }\n` +
            `        Controller {\n        }\n` +
            `        SecondaryHostChainInterface {\n        }\n` +
            `    }`,
        ),
    },
    "MemoryBisr/AdvancedOptions": {
      title: "AdvancedOptions",
      description: "MemoryBisr/AdvancedOptions",
      fields: [],
      buildCode: ({ get }) =>
        codeHeader(
          `    MemoryBisr {\n` +
            block(8, "AdvancedOptions", block(12, `Memory(${get("mb_adv_memory_pattern", "")})`, "")) +
            `\n    }`,
        ),
    },
    "MemoryBisr/AdvancedOptions/Memory": {
      title: "Memory",
      description: "MemoryBisr/AdvancedOptions/Memory(pattern)",
      fields: [
        { attr: "mb_adv_memory_pattern", label: "pattern", kind: "string", defaultValue: "" },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    MemoryBisr {\n` +
            block(8, "AdvancedOptions", block(12, `Memory(${get("mb_adv_memory_pattern", "")})`, block(16, `DisablePortDuringShifting(${get("mb_adv_disable_port_select", "Select")})`, ""))) +
            `\n    }`,
        ),
    },
    "MemoryBisr/AdvancedOptions/Memory/DisablePortDuringShifting": {
      title: "DisablePortDuringShifting",
      description: "MemoryBisr/AdvancedOptions/Memory/DisablePortDuringShifting(select)",
      fields: [
        {
          attr: "mb_adv_disable_port_select",
          label: "select",
          kind: "select",
          options: [
            { label: "Select", value: "Select" },
            { label: "BistOn", value: "BistOn" },
            { label: "BistEn", value: "BistEn" },
            { label: "all", value: "all" },
          ],
          defaultValue: "Select",
        },
        {
          attr: "mb_adv_disable_port_value",
          label: "DisablePortDuringShifting(value)",
          kind: "select",
          options: onOffAuto,
          defaultValue: "auto",
        },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    MemoryBisr {\n` +
            block(
              8,
              "AdvancedOptions",
              block(
                12,
                `Memory(${get("mb_adv_memory_pattern", "")})`,
                kv2(16, `DisablePortDuringShifting(${get("mb_adv_disable_port_select", "Select")})`, get("mb_adv_disable_port_value", "auto")),
              ),
            ) +
            `\n    }`,
        ),
    },
    "MemoryBisr/BisrElement": {
      title: "BisrElement",
      description: "MemoryBisr/BisrElement(memory_instance)",
      fields: [
        { attr: "mb_elem_target", label: "BisrElement(target)", kind: "string", defaultValue: "memory_instance" },
        { attr: "mb_elem_parent_instance", label: "parent_instance", kind: "string", defaultValue: "" },
        {
          attr: "mb_elem_parent_instance_anchor",
          label: "parent_instance_anchor",
          kind: "select",
          options: [
            { label: "current_design", value: "current_design" },
            { label: "parent_instance_of_memory", value: "parent_instance_of_memory" },
            { label: "attribute_expression", value: "attribute_expression" },
          ],
          defaultValue: "current_design",
        },
        {
          attr: "mb_elem_pipeline_pos",
          label: "Pipeline(position)",
          kind: "select",
          options: [
            { label: "before", value: "before" },
            { label: "after", value: "after" },
          ],
          defaultValue: "before",
        },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    MemoryBisr {\n` +
            block(8, `BisrElement(${get("mb_elem_target", "memory_instance")})`, [
              kv2(12, "parent_instance", get("mb_elem_parent_instance", "")),
              kv2(12, "parent_instance_anchor", get("mb_elem_parent_instance_anchor", "current_design")),
              block(12, `Pipeline(${get("mb_elem_pipeline_pos", "before")})`, ""),
            ].join("\n")) +
            `\n    }`,
        ),
    },
    "MemoryBisr/BisrElement/Pipeline": {
      title: "Pipeline",
      description: "MemoryBisr/BisrElement/Pipeline(position)",
      fields: [
        {
          attr: "mb_elem_pipeline_pos",
          label: "Pipeline(position)",
          kind: "select",
          options: [
            { label: "before", value: "before" },
            { label: "after", value: "after" },
          ],
          defaultValue: "before",
        },
        { attr: "mb_elem_pipeline_parent_instance", label: "parent_instance", kind: "string", defaultValue: "" },
        { attr: "mb_elem_pipeline_leaf_instance_name", label: "leaf_instance_name", kind: "string", defaultValue: "%s_bisr_pipeline_inst" },
        { attr: "mb_elem_pipeline_so_retiming", label: "so_retiming", kind: "select", options: onOff, defaultValue: "off" },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    MemoryBisr {\n` +
            block(8, `BisrElement(${get("mb_elem_target", "memory_instance")})`, block(12, `Pipeline(${get("mb_elem_pipeline_pos", "before")})`, [
              kv2(16, "parent_instance", get("mb_elem_pipeline_parent_instance", "")),
              kv2(16, "leaf_instance_name", get("mb_elem_pipeline_leaf_instance_name", "%s_bisr_pipeline_inst")),
              kv2(16, "so_retiming", get("mb_elem_pipeline_so_retiming", "off")),
            ].join("\n"))) +
            `\n    }`,
        ),
    },
    "MemoryBisr/Interface": {
      title: "Interface",
      description: "MemoryBisr/Interface",
      fields: [
        { attr: "mb_if_scan_in", label: "scan_in", kind: "string", defaultValue: "%s_bisr_si" },
        { attr: "mb_if_scan_out", label: "scan_out", kind: "string", defaultValue: "%s_bisr_so" },
        { attr: "mb_if_capture_shift_clock", label: "capture_shift_clock", kind: "string", defaultValue: "%s_bisr_clk" },
        { attr: "mb_if_shift_en", label: "shift_en", kind: "string", defaultValue: "%s_bisr_shift_en" },
        { attr: "mb_if_reset", label: "reset", kind: "string", defaultValue: "%s_bisr_reset" },
        { attr: "mb_if_parallel_in", label: "parallel_in", kind: "string", defaultValue: "%s_bisr_parallel_in" },
        { attr: "mb_if_serial_repair_enable", label: "serial_repair_enable", kind: "string", defaultValue: "%s_bisr_serial_repair_enable" },
        { attr: "mb_if_memory_disable", label: "memory_disable", kind: "string", defaultValue: "%s_bisr_mem_disable" },
        { attr: "mb_if_memory_chain_select", label: "memory_chain_select", kind: "string", defaultValue: "%s_bisr_mem_chain_select" },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    MemoryBisr {\n` +
            block(8, "Interface", [
              kv2(12, "scan_in", get("mb_if_scan_in", "%s_bisr_si")),
              kv2(12, "scan_out", get("mb_if_scan_out", "%s_bisr_so")),
              kv2(12, "capture_shift_clock", get("mb_if_capture_shift_clock", "%s_bisr_clk")),
              kv2(12, "shift_en", get("mb_if_shift_en", "%s_bisr_shift_en")),
              kv2(12, "reset", get("mb_if_reset", "%s_bisr_reset")),
              kv2(12, "parallel_in", get("mb_if_parallel_in", "%s_bisr_parallel_in")),
              kv2(12, "serial_repair_enable", get("mb_if_serial_repair_enable", "%s_bisr_serial_repair_enable")),
              kv2(12, "memory_disable", get("mb_if_memory_disable", "%s_bisr_mem_disable")),
              kv2(12, "memory_chain_select", get("mb_if_memory_chain_select", "%s_bisr_mem_chain_select")),
            ].join("\n")) +
            `\n    }`,
        ),
    },
    "MemoryBisr/SecondaryHostChainInterface": {
      title: "SecondaryHostChainInterface",
      description: "MemoryBisr/SecondaryHostChainInterface",
      fields: [
        { attr: "mb_shi_to_scan_in", label: "to_scan_in", kind: "string", defaultValue: "%s_bisr_to_si" },
        { attr: "mb_shi_from_scan_out", label: "from_scan_out", kind: "string", defaultValue: "%s_bisr_from_so" },
        { attr: "mb_shi_to_capture_shift_clock", label: "to_capture_shift_clock", kind: "string", defaultValue: "%s_bisr_to_clk" },
        { attr: "mb_shi_to_shift_en", label: "to_shift_en", kind: "string", defaultValue: "%s_bisr_to_shift_en" },
        { attr: "mb_shi_to_reset", label: "to_reset", kind: "string", defaultValue: "%s_bisr_to_reset" },
        { attr: "mb_shi_to_memory_disable", label: "to_memory_disable", kind: "string", defaultValue: "%s_bisr_to_mem_disable" },
        { attr: "mb_shi_to_memory_chain_select", label: "to_memory_chain_select", kind: "string", defaultValue: "%s_bisr_to_mem_chain_select" },
        {
          attr: "mb_shi_pipeline_pos",
          label: "Pipeline(position)",
          kind: "select",
          options: [
            { label: "before", value: "before" },
            { label: "after", value: "after" },
          ],
          defaultValue: "before",
        },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    MemoryBisr {\n` +
            block(8, "SecondaryHostChainInterface", [
              kv2(12, "to_scan_in", get("mb_shi_to_scan_in", "%s_bisr_to_si")),
              kv2(12, "from_scan_out", get("mb_shi_from_scan_out", "%s_bisr_from_so")),
              kv2(12, "to_capture_shift_clock", get("mb_shi_to_capture_shift_clock", "%s_bisr_to_clk")),
              kv2(12, "to_shift_en", get("mb_shi_to_shift_en", "%s_bisr_to_shift_en")),
              kv2(12, "to_reset", get("mb_shi_to_reset", "%s_bisr_to_reset")),
              kv2(12, "to_memory_disable", get("mb_shi_to_memory_disable", "%s_bisr_to_mem_disable")),
              kv2(12, "to_memory_chain_select", get("mb_shi_to_memory_chain_select", "%s_bisr_to_mem_chain_select")),
              block(12, `Pipeline(${get("mb_shi_pipeline_pos", "before")})`, ""),
            ].join("\n")) +
            `\n    }`,
        ),
    },
    "MemoryBisr/SecondaryHostChainInterface/Pipeline": {
      title: "Pipeline",
      description: "MemoryBisr/SecondaryHostChainInterface/Pipeline(position)",
      fields: [
        {
          attr: "mb_shi_pipeline_pos",
          label: "Pipeline(position)",
          kind: "select",
          options: [
            { label: "before", value: "before" },
            { label: "after", value: "after" },
          ],
          defaultValue: "before",
        },
        { attr: "mb_shi_pipeline_parent_instance", label: "parent_instance", kind: "string", defaultValue: "" },
        { attr: "mb_shi_pipeline_leaf_instance_name", label: "leaf_instance_name", kind: "string", defaultValue: "%s_bisr_pipeline_%d_inst" },
        { attr: "mb_shi_pipeline_so_retiming", label: "so_retiming", kind: "select", options: onOff, defaultValue: "off" },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    MemoryBisr {\n` +
            block(8, "SecondaryHostChainInterface", block(12, `Pipeline(${get("mb_shi_pipeline_pos", "before")})`, [
              kv2(16, "parent_instance", get("mb_shi_pipeline_parent_instance", "")),
              kv2(16, "leaf_instance_name", get("mb_shi_pipeline_leaf_instance_name", "%s_bisr_pipeline_%d_inst")),
              kv2(16, "so_retiming", get("mb_shi_pipeline_so_retiming", "off")),
            ].join("\n"))) +
            `\n    }`,
        ),
    },
    "MemoryBisr/Controller": {
      title: "Controller",
      description: "MemoryBisr/Controller",
      fields: [
        { attr: "mb_ctrl_ijtag_host_interface", label: "ijtag_host_interface", kind: "string", defaultValue: "" },
        { attr: "mb_ctrl_parent_instance", label: "parent_instance", kind: "string", defaultValue: "" },
        { attr: "mb_ctrl_leaf_instance_name", label: "leaf_instance_name", kind: "string", defaultValue: "" },
        { attr: "mb_ctrl_repair_clock_connection", label: "repair_clock_connection", kind: "string", defaultValue: "" },
        { attr: "mb_ctrl_repair_trigger_connection", label: "repair_trigger_connection", kind: "string", defaultValue: "" },
        { attr: "mb_ctrl_repair_clock_period", label: "repair_clock_period", kind: "string", defaultValue: "" },
        { attr: "mb_ctrl_write_duration_count_connection", label: "write_duration_count_connection", kind: "string", defaultValue: "auto" },
        { attr: "mb_ctrl_repair_mode_connection", label: "repair_mode_connection", kind: "string", defaultValue: "" },
        { attr: "mb_ctrl_serial_repair_enable", label: "serial_repair_enable", kind: "string", defaultValue: "auto" },
        { attr: "mb_ctrl_programming_voltage_source", label: "programming_voltage_source", kind: "string", defaultValue: "" },
        { attr: "mb_ctrl_programming_voltage_port", label: "programming_voltage_port", kind: "string", defaultValue: "" },
        {
          attr: "mb_ctrl_fuse_box_location",
          label: "fuse_box_location",
          kind: "select",
          options: [
            { label: "internal", value: "internal" },
            { label: "external", value: "external" },
          ],
          defaultValue: "internal",
        },
        { attr: "mb_ctrl_fuse_box_interface_module", label: "fuse_box_interface_module", kind: "string", defaultValue: "" },
        { attr: "mb_ctrl_max_fuse_box_programming_sessions", label: "max_fuse_box_programming_sessions", kind: "string", defaultValue: 1, placeholder: "1..10000 | unlimited" },
        {
          attr: "mb_ctrl_repair_method",
          label: "repair_method",
          kind: "select",
          options: [
            { label: "hard", value: "hard" },
            { label: "soft", value: "soft" },
          ],
          defaultValue: "hard",
        },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    MemoryBisr {\n` +
            block(8, "Controller", [
              kv2(12, "ijtag_host_interface", get("mb_ctrl_ijtag_host_interface", "")),
              kv2(12, "parent_instance", get("mb_ctrl_parent_instance", "")),
              kv2(12, "leaf_instance_name", get("mb_ctrl_leaf_instance_name", "")),
              kv2(12, "repair_clock_connection", get("mb_ctrl_repair_clock_connection", "")),
              kv2(12, "repair_trigger_connection", get("mb_ctrl_repair_trigger_connection", "")),
              kv2(12, "repair_clock_period", get("mb_ctrl_repair_clock_period", "")),
              kv2(12, "write_duration_count_connection", get("mb_ctrl_write_duration_count_connection", "auto")),
              kv2(12, "repair_mode_connection", get("mb_ctrl_repair_mode_connection", "")),
              kv2(12, "serial_repair_enable", get("mb_ctrl_serial_repair_enable", "auto")),
              kv2(12, "programming_voltage_source", get("mb_ctrl_programming_voltage_source", "")),
              kv2(12, "programming_voltage_port", get("mb_ctrl_programming_voltage_port", "")),
              kv2(12, "fuse_box_location", get("mb_ctrl_fuse_box_location", "internal")),
              kv2(12, "fuse_box_interface_module", get("mb_ctrl_fuse_box_interface_module", "")),
              kv2(12, "max_fuse_box_programming_sessions", get("mb_ctrl_max_fuse_box_programming_sessions", 1)),
              kv2(12, "repair_method", get("mb_ctrl_repair_method", "hard")),
              block(12, "AdvancedOptions", ""),
              block(12, "ExternalFuseBoxOptions", ""),
              block(12, "PowerDomainOptions", ""),
            ].join("\n")) +
            `\n    }`,
        ),
    },
    "MemoryBisr/Controller/AdvancedOptions": {
      title: "AdvancedOptions",
      description: "MemoryBisr/Controller/AdvancedOptions",
      fields: [
        { attr: "mb_ca_repair_word_size", label: "repair_word_size", kind: "string", defaultValue: "auto" },
        { attr: "mb_ca_max_bisr_chain_length", label: "max_bisr_chain_length", kind: "string", defaultValue: "auto" },
        { attr: "mb_ca_zero_counter_bits", label: "zero_counter_bits", kind: "string", defaultValue: "auto" },
        { attr: "mb_ca_bisr_done_connection", label: "bisr_done_connection", kind: "string", defaultValue: "" },
        { attr: "mb_ca_bisr_pass_connection", label: "bisr_pass_connection", kind: "string", defaultValue: "" },
        {
          attr: "mb_ca_power_up_chain_select",
          label: "power_up_chain_select",
          kind: "select",
          options: [
            { label: "internal", value: "internal" },
            { label: "external", value: "external" },
          ],
          defaultValue: "internal",
        },
        {
          attr: "mb_ca_chains_processing_method",
          label: "chains_processing_method",
          kind: "select",
          options: [
            { label: "sequential", value: "sequential" },
            { label: "concurrent", value: "concurrent" },
          ],
          defaultValue: "sequential",
        },
        {
          attr: "mb_ca_fuse_allocation_per_chain",
          label: "fuse_allocation_per_chain",
          kind: "select",
          options: [
            { label: "proportional", value: "proportional" },
            { label: "uniform", value: "uniform" },
          ],
          defaultValue: "proportional",
        },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    MemoryBisr {\n` +
            block(8, "Controller", block(12, "AdvancedOptions", [
              block(16, "FuseBoxOptions", ""),
              kv2(16, "repair_word_size", get("mb_ca_repair_word_size", "auto")),
              kv2(16, "max_bisr_chain_length", get("mb_ca_max_bisr_chain_length", "auto")),
              kv2(16, "zero_counter_bits", get("mb_ca_zero_counter_bits", "auto")),
              kv2(16, "bisr_done_connection", get("mb_ca_bisr_done_connection", "")),
              kv2(16, "bisr_pass_connection", get("mb_ca_bisr_pass_connection", "")),
              kv2(16, "power_up_chain_select", get("mb_ca_power_up_chain_select", "internal")),
              kv2(16, "chains_processing_method", get("mb_ca_chains_processing_method", "sequential")),
              kv2(16, "fuse_allocation_per_chain", get("mb_ca_fuse_allocation_per_chain", "proportional")),
            ].join("\n"))) +
            `\n    }`,
        ),
    },
    "MemoryBisr/Controller/AdvancedOptions/FuseBoxOptions": {
      title: "FuseBoxOptions",
      description: "MemoryBisr/Controller/AdvancedOptions/FuseBoxOptions",
      fields: [
        { attr: "mb_ca_fuse_write_duration", label: "write_duration", kind: "string", defaultValue: "8us" },
        { attr: "mb_ca_fuse_read_duration", label: "read_duration", kind: "string", defaultValue: "200ns" },
        { attr: "mb_ca_fuse_init_duration", label: "init_duration", kind: "string", defaultValue: "1us" },
        { attr: "mb_ca_fuse_read_word_size", label: "read_word_size", kind: "string", defaultValue: "auto" },
        { attr: "mb_ca_fuse_number_of_fuses_for_repair", label: "number_of_fuses_for_repair", kind: "string", defaultValue: "auto" },
        {
          attr: "mb_ca_fuse_programming_method",
          label: "programming_method",
          kind: "select",
          options: [
            { label: "buffered", value: "buffered" },
            { label: "unbuffered", value: "unbuffered" },
            { label: "auto", value: "auto" },
          ],
          defaultValue: "auto",
        },
        { attr: "mb_ca_fuse_align_access_en_with_address", label: "align_access_en_with_address", kind: "select", options: onOffAuto, defaultValue: "auto" },
        { attr: "mb_ca_fuse_extra_read_cycles", label: "extra_read_cycles", kind: "number", defaultValue: "" },
        { attr: "mb_ca_fuse_extra_init_cycles", label: "extra_init_cycles", kind: "number", defaultValue: "" },
        { attr: "mb_ca_fuse_extra_write_cycles", label: "extra_write_cycles", kind: "number", defaultValue: "" },
        { attr: "mb_ca_fuse_double_bit_programming", label: "double_bit_programming", kind: "select", options: onOff, defaultValue: "off" },
        { attr: "mb_ca_fuse_read_buffer_present", label: "read_buffer_present", kind: "select", options: onOff, defaultValue: "off" },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    MemoryBisr {\n` +
            block(8, "Controller", block(12, "AdvancedOptions", block(16, "FuseBoxOptions", [
              kv2(20, "write_duration", get("mb_ca_fuse_write_duration", "8us")),
              kv2(20, "read_duration", get("mb_ca_fuse_read_duration", "200ns")),
              kv2(20, "init_duration", get("mb_ca_fuse_init_duration", "1us")),
              kv2(20, "read_word_size", get("mb_ca_fuse_read_word_size", "auto")),
              kv2(20, "number_of_fuses_for_repair", get("mb_ca_fuse_number_of_fuses_for_repair", "auto")),
              kv2(20, "programming_method", get("mb_ca_fuse_programming_method", "auto")),
              kv2(20, "align_access_en_with_address", get("mb_ca_fuse_align_access_en_with_address", "auto")),
              kv2(20, "extra_read_cycles", get("mb_ca_fuse_extra_read_cycles", "")),
              kv2(20, "extra_init_cycles", get("mb_ca_fuse_extra_init_cycles", "")),
              kv2(20, "extra_write_cycles", get("mb_ca_fuse_extra_write_cycles", "")),
              kv2(20, "double_bit_programming", get("mb_ca_fuse_double_bit_programming", "off")),
              kv2(20, "read_buffer_present", get("mb_ca_fuse_read_buffer_present", "off")),
            ].join("\n")))) +
            `\n    }`,
        ),
    },
    "MemoryBisr/Controller/ExternalFuseBoxOptions": {
      title: "ExternalFuseBoxOptions",
      description: "MemoryBisr/Controller/ExternalFuseBoxOptions",
      fields: [
        { attr: "mb_efb_design_instance", label: "design_instance", kind: "string", defaultValue: "" },
        { attr: "mb_efb_multiplexing", label: "multiplexing", kind: "select", options: onOffAuto, defaultValue: "auto" },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    MemoryBisr {\n` +
            block(8, "Controller", block(12, "ExternalFuseBoxOptions", [
              kv2(16, "design_instance", get("mb_efb_design_instance", "")),
              kv2(16, "multiplexing", get("mb_efb_multiplexing", "auto")),
              block(16, "ConnectionOverrides", ""),
            ].join("\n"))) +
            `\n    }`,
        ),
    },
    "MemoryBisr/Controller/ExternalFuseBoxOptions/ConnectionOverrides": {
      title: "ConnectionOverrides",
      description: "MemoryBisr/Controller/ExternalFuseBoxOptions/ConnectionOverrides",
      fields: fields(["bisr_en","bisr_on","clock","select","reset","access_en","write_en","write_duration_count","read_buffer_select","ijtag_access_mode","write_buffer_transfer","address","done","read_data","read_buffer_output"].map((name) => ({
        attr: `mb_efb_${name}`,
        label: name,
        kind: "string",
        defaultValue: "",
      } as FieldDef))),
      buildCode: ({ get }) =>
        codeHeader(
          `    MemoryBisr {\n` +
            block(8, "Controller", block(12, "ExternalFuseBoxOptions", block(
              16,
              "ConnectionOverrides",
              [
                "bisr_en",
                "bisr_on",
                "clock",
                "select",
                "reset",
                "access_en",
                "write_en",
                "write_duration_count",
                "read_buffer_select",
                "ijtag_access_mode",
                "write_buffer_transfer",
                "address",
                "done",
                "read_data",
                "read_buffer_output",
              ]
                .map((name) => kv2(20, name, get(`mb_efb_${name}`, "")))
                .join("\n"),
            ))) +
            `\n    }`,
        ),
    },
    "MemoryBisr/Controller/PowerDomainOptions": {
      title: "PowerDomainOptions",
      description: "MemoryBisr/Controller/PowerDomainOptions",
      fields: [
        { attr: "mb_pdo_priority_order", label: "power_domain_priority_order", kind: "textarea", defaultValue: "", placeholder: "power_domain_name, ..." },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    MemoryBisr {\n` +
            block(8, "Controller", block(12, "PowerDomainOptions", [
              kv2(16, "power_domain_priority_order", get("mb_pdo_priority_order", "")),
              block(16, `PowerDomainName(${get("mb_pdo_name", "")})`, ""),
            ].join("\n"))) +
            `\n    }`,
        ),
    },
    "MemoryBisr/Controller/PowerDomainOptions/PowerDomainName": {
      title: "PowerDomainName",
      description: "MemoryBisr/Controller/PowerDomainOptions/PowerDomainName(name)",
      fields: [
        { attr: "mb_pdo_name", label: "name", kind: "string", defaultValue: "" },
        { attr: "mb_pdo_fuse_compression", label: "fuse_compression", kind: "select", options: onOff, defaultValue: "off" },
        { attr: "mb_pdo_fuse_allocation", label: "fuse_allocation", kind: "string", defaultValue: "auto", placeholder: "auto | int | off" },
        { attr: "mb_pdo_enable_from_pmu_connection", label: "enable_from_pmu_connection", kind: "string", defaultValue: "" },
        { attr: "mb_pdo_busy_to_pmu_connection", label: "busy_to_pmu_connection", kind: "string", defaultValue: "" },
        { attr: "mb_pdo_done_to_pmu_connection", label: "done_to_pmu_connection", kind: "string", defaultValue: "" },
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    MemoryBisr {\n` +
            block(8, "Controller", block(12, "PowerDomainOptions", block(16, `PowerDomainName(${get("mb_pdo_name", "")})`, [
              kv2(20, "fuse_compression", get("mb_pdo_fuse_compression", "off")),
              kv2(20, "fuse_allocation", get("mb_pdo_fuse_allocation", "auto")),
              kv2(20, "enable_from_pmu_connection", get("mb_pdo_enable_from_pmu_connection", "")),
              kv2(20, "busy_to_pmu_connection", get("mb_pdo_busy_to_pmu_connection", "")),
              kv2(20, "done_to_pmu_connection", get("mb_pdo_done_to_pmu_connection", "")),
              block(20, "ChainConnectionOverride", ""),
            ].join("\n")))) +
            `\n    }`,
        ),
    },
    "MemoryBisr/Controller/PowerDomainOptions/PowerDomainName/ChainConnectionOverride": {
      title: "ChainConnectionOverride",
      description: "MemoryBisr/Controller/PowerDomainOptions/PowerDomainName/ChainConnectionOverride",
      fields: [
        { attr: "mb_pdo_name", label: "name", kind: "string", defaultValue: "" },
        ...fields(["to_scan_in","from_scan_out","capture_shift_clock","shift_en","reset","memory_disable","memory_chain_select"].map((name) => ({
          attr: `mb_pdo_${name}`,
          label: name,
          kind: "string",
          defaultValue: "",
        } as FieldDef))),
      ],
      buildCode: ({ get }) =>
        codeHeader(
          `    MemoryBisr {\n` +
            block(8, "Controller", block(12, "PowerDomainOptions", block(16, `PowerDomainName(${get("mb_pdo_name", "")})`, block(20, "ChainConnectionOverride", [
              "to_scan_in",
              "from_scan_out",
              "capture_shift_clock",
              "shift_en",
              "reset",
              "memory_disable",
              "memory_chain_select",
            ]
              .map((name) => kv2(24, name, get(`mb_pdo_${name}`, "")))
              .join("\n"))))) +
            `\n    }`,
        ),
    },
  },
};
