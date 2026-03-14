********DftSpecification/MemoryBisr********
DftSpecification(module_name,id) {
    MemoryBisr {
        bisr_segment_order_file         : filename ;
        memory_repair_loading_method    : serial | from_read_buffer ;
        memory_library_name_list        : mem_lib_name, ... ;
        AdvancedOptions {
        }
        BisrElement(memory_instance) {
        }
        Interface {
        }
        Controller {
        }
        SecondaryHostChainInterface {
        }
    }
}

******DftSpecification/MemoryBisr/AdvancedOptions******
DftSpecification(module_name,id) {
    MemoryBisr {
        AdvancedOptions {
            Memory(pattern) { // Repeatable
                DisablePortDuringShifting(Select | BistOn | BistEn | all) : auto | on | off ; // Repeatable
            }
        }
    }
}

******DftSpecification/MemoryBisr/BisrElement******
DftSpecification(module_name,id) {
    MemoryBisr {
        BisrElement(memory_physical_block_inst | SegmentStart(pdg_label) | SegmentEnd(pdg_label)) { // repeatable
            parent_instance             : relative_instance ;
            parent_instance_anchor      : current_design | parent_instance_of_memory | attribute_expression ;
            Pipeline(before | after) { // Repeatable once
                parent_instance         : instance_name ;
                leaf_instance_name      : instance_name ;//default: %s_bisr_pipeline_inst
                so_retiming             : on | off ;
            }
        }
    }
}

******DftSpecification/MemoryBisr/Interface******
DftSpecification(module_name,id) {
    MemoryBisr {
        Interface {
            scan_in                 : port_naming ; // default: %s_bisr_si
            scan_out                : port_naming ; // default: %s_bisr_so
            capture_shift_clock     : port_naming ; // default: %s_bisr_clk
            shift_en                : port_naming ; // default: %s_bisr_shift_en
            reset                   : port_naming ; // default: %s_bisr_reset
            parallel_in             : port_naming ; // default: %s_bisr_parallel_in
            serial_repair_enable    : port_naming ; // default: %s_bisr_serial_repair_enable
            memory_disable          : port_naming ; // default: %s_bisr_mem_disable
            memory_chain_select     : port_naming ; // default:// %s_bisr_mem_chain_select
        }
    }
}

******DftSpecification/MemoryBisr/SecondaryHostChainInterface******
DftSpecification(module_name,id) {
    MemoryBisr {
        SecondaryHostChainInterface {
            to_scan_in              : port_pin_name ; //default: %s_bisr_to_si
            from_scan_out           : port_pin_name ; //default: %s_bisr_from_so
            to_capture_shift_clock  : port_pin_name ; //default: %s_bisr_to_clk
            to_shift_en             : port_pin_name ; //default: %s_bisr_to_shift_en
            to_reset                : port_pin_name ; //default: %s_bisr_to_reset
            to_memory_disable       : port_pin_name ; //default: %s_bisr_to_mem_disable
            to_memory_chain_select  : port_pin_name ; //default: %s_bisr_to_mem_chain_select
            Pipeline(before | after) { // One of each always inferred
                parent_instance     : instance_name ;
                leaf_instance_name  : instance_name ; //default: %s_bisr_pipeline_%d_inst
                so_retiming         : on | off ;
            }
        }
    }
}

******DftSpecification/MemoryBisr/Controller******
DftSpecification(module_name,id) {
    MemoryBisr {
        Controller {
            ijtag_host_interface                : node_id ;
            parent_instance                     : inst_name ;
            leaf_instance_name                  : inst_name ;
            repair_clock_connection             : pin_or_port_name ;
            repair_trigger_connection           : pin_or_port_name ;
            repair_clock_period                 : time ;
            write_duration_count_connection     : auto | pin_or_port_name ;
            repair_mode_connection              : pin_or_port_name,[...] ; //3 bits required
            serial_repair_enable                : pin_or_port_name ;// default: auto
            programming_voltage_source          : pin_or_port_name ;
            programming_voltage_port            : pin_or_port_name ;
            fuse_box_location                   : internal | external ;
            fuse_box_interface_module           : module_name ;
            max_fuse_box_programming_sessions   : 1..10000 | unlimited ;// default: 1
            repair_method                       : hard | soft ;
            AdvancedOptions{
            }
            ExternalFuseBoxOptions{
            }
            PowerDomainOptions{
            }
        }
    }
}
****DftSpecification/MemoryBisr/Controller/AdvancedOptions****
DftSpecification(module_name,id) {
    MemoryBisr {
        Controller {
            AdvancedOptions {
                FuseBoxOptions {
                    write_duration                  : time ; // Default: 8us
                    read_duration                   : time ; // Default: 200ns
                    init_duration                   : time ; // Default: 1us
                    read_word_size                  : int | auto ;
                    number_of_fuses_for_repair      : int | auto ;
                    programming_method              : buffered | unbuffered | auto ;
                    align_access_en_with_address    : on | off | auto ;
                    extra_read_cycles               : cycles ;
                    extra_init_cycles               : cycles ;
                    extra_write_cycles              : cycles ;
                    double_bit_programming          : on | off ;
                    read_buffer_present             : on | off ;
                }
                repair_word_size                    : int | auto ;
                max_bisr_chain_length               : int | auto ;
                zero_counter_bits                   : int | auto ;
                bisr_done_connection                : pin_name ;
                bisr_pass_connection                : pin_name ;
                power_up_chain_select               : internal | external ;
                chains_processing_method            : sequential | concurrent ;
                fuse_allocation_per_chain           : proportional | uniform ;
            }
        }
    }
}
****DftSpecification/MemoryBisr/Controller/ExternalFuseBoxOptions****
DftSpecification(module_name,id) {
    MemoryBisr {
        Controller {
            ExternalFuseBoxOptions {
                design_instance             : inst_name ;
                multiplexing                : on | off | auto ;
                ConnectionOverrides {
                    // Inputs
                    bisr_en                 : pin_name,... ;
                    bisr_on                 : pin_name,... ;
                    clock                   : pin_name ;
                    select                  : pin_name ;
                    reset                   : pin_name ;
                    access_en               : pin_name ;
                    write_en                : pin_name ;
                    write_duration_count    : pin_name ;
                    read_buffer_select      : pin_name ;
                    ijtag_access_mode       : pin_name ;
                    write_buffer_transfer   : pin_name ;
                    address                 : pin_name ;
                    // Outputs
                    done                    : pin_name ;
                    read_data               : pin_name ;
                    read_buffer_output      : pin_name ;
                }
            }
        }
    }
}
****DftSpecification/MemoryBisr/Controller/PowerDomainOptions****
DftSpecification(module_name,id) {
    MemoryBisr {
        Controller {
            PowerDomainOptions {
                power_domain_priority_order     : power_domain_name, ... ;
                PowerDomainName(power_domain_name) {
                    fuse_compression            : on | off ;
                    fuse_allocation             : auto | int | off ;
                    enable_from_pmu_connection  : pin_or_net_name ;
                    busy_to_pmu_connection      : pin_or_net_name ;
                    done_to_pmu_connection      : pin_or_net_name ;
                    ChainConnectionOverride {
                        to_scan_in              : port_or_pin_name ;
                        from_scan_out           : port_or_pin_name ;
                        capture_shift_clock     : port_or_pin_name ;
                        shift_en                : port_or_pin_name ;
                        reset                   : port_or_pin_name ;
                        memory_disable          : port_or_pin_name ;
                        memory_chain_select     : port_or_pin_name ;
                    }
                }
            }
        }
    }
}
