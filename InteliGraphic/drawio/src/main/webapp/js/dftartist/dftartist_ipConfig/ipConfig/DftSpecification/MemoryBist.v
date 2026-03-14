********DftSpecification/MemoryBist********
DftSpecification(module_name,id) {
    MemoryBist {
        ijtag_host_interface : node_id ;
        Controller(id){
        }
        ReusedController(id) {
        }
        BistAccessPort {
        }
        TCKInjectionPoints {
        }
    }
}

******DftSpecification/MemoryBist/Controller******
DftSpecification(module_name,id) {
    MemoryBist {
        Controller(id) {
            parent_instance     : inst_path ;
            leaf_instance_name  : inst_name ;
            clock_domain_label  : label ;
            clock_period        : time ;
            AdvancedOptions{ // *DefSpec
            }
            AlgorithmResourceOptions{ // *DefSpec
            }
            RepairOptions{ // *DefSpec
            }
            DiagnosisOptions{ // *DefSpec
            }
            Step{ // Mutually exclusive with
            } // MemoryCluster wrapper
            MemoryCluster(cluster_id) { // Mutually exclusive  with
            } // Step wrapper
            DirectAccessOptions { // *DefSpec
            }
        }
    }
}
****DftSpecification/MemoryBist/Controller/AdvancedOptions****
DftSpecification(module_name,id) {
    MemoryBist {
        Controller(id) {
            AdvancedOptions {
                algorithm                       : algo_name ; // *DefSpec on page 4840// default: from_library
                operation_set                   : opset_name ;// default: from_library
                extra_algorithms                : algo_name, ... ;
                extra_operation_sets            : opset_name, ... ;
                incremental_test_mode           : on | off ; // *DefSpec on page 4840
                pipeline_controller_outputs     : on | off ; // *DefSpec on page 4840
                observation_xor_size            : off | 1..MaxPosInt | all ; // *DefSpec on page 4853
                selective_parallel_memory_test  : on | off ; // *DefSpec on page 4840
                shared_comparators_per_go_id    : int | all ;//default: 1 *DefSpec on page 4840
                use_multicycle_paths            : on | off ; // *DefSpec on page 4840
                min_misr_segment_bits           : 24 | 256 ; // *DefSpec on page 4840
                rom_signature_location          : external_straps | min_address | max_address | off ; // *DefSpec on page 4840
            }
        }
    }
}
****DftSpecification/MemoryBist/Controller/AlgorithmResourceOptions****
DftSpecification(module_name,id) {
    MemoryBist {
        Controller(id) {
            AlgorithmResourceOptions { // *DefSpec
                soft_instruction_count                  : int ; // default: 0
                data_register_bits                      : int | auto ;
                counter_a_bits                          : int | auto ;
                delay_counter_bits                      : int | auto ;
                preserve_microcode_initial_values       : on | off ;
                soft_algorithm_address_min_max          : on | off ;
                max_data_inversion_address_bit_index    : int | max_index ;// default: 0
                a_equals_b_command_allowed              : on | off ;
                address_segment_x0_y0_allowed           : on | off ;
                max_x0_segment_bits                     : 1 | auto ; 
                max_y0_segment_bits                     : 1 | auto ; 
            }
        }
    }
}
****DftSpecification/MemoryBist/Controller/MemoryCluster****
DftSpecification(module_name,id) {
    MemoryBist {
        Controller(id) {
            MemoryCluster(cluster_id) {
                instance_name               : instance_name ;
                memory_cluster_library_name : library_name ;
                pipeline_cluster_inputs     : on | off ; // *DefSpec
                pipeline_cluster_outputs    : on | off ; // *DefSpec
                memory_access_level         : auto | logical | physical ;// *DefSpec
                repair_analysis_present     : auto | off ; // *DefSpec
                max_repair_group_size       : unlimited | {int[kilobits | megabits]} ;// *DefSpec
                repair_group_scope          : logical_memory | physical_memory | controller ;// *DefSpec
                repair_sharing              : on | off ;
            }
        }
    }
}
****DftSpecification/MemoryBist/Controller/RepairOptions****
DftSpecification(module_name,id) {
    MemoryBist {
        Controller(id) {
            RepairOptions {
                fuse_set_extraction_sequence     : address_before_fuse_map |fuse_map_before_address ;
                row_bira_location                 : controller |follow_comparators ;
                enable_multicycle_operation       : on | off | auto ;
            }
        }
    }
}
****DftSpecification/MemoryBist/Controller/DiagnosisOptions****
DftSpecification(module_name,id) {
    MemoryBist {
        Controller(id) {
            DiagnosisOptions { *DefSpec
                comparator_selection_mux    : on | off | auto ;
                go_status                   : auto | per_memory | off ;
                StopOnErrorOptions {
                    failure_limit           : int | off ;
                }
            }
        }
    }
}
****DftSpecification/MemoryBist/Controller/Step****
MemoryBist {
    Controller(id) {
        Step { // repeatable
            algorithm                           : algo_name ; // *DefSpec
            operation_set                       : opset_name ; // default: from_library
            comparator_location                 : shared_in_controller | per_interface ; // *DefSpec
            bist_data_in_pipelining             : on | off | int ; // *DefSpec
            bist_data_out_pipelining            : on | off | per_port ; // *DefSpec
            MemoryInterface(id) { // repeatable
                generate_external_repair_logic  : on | off ;
                instance_name                   : inst_name ;
                memory_library_name             : mem_lib_name ;
                repair_analysis_present         : auto | off ; // *DefSpec
                repair_group_name               : none | group_name ;
                scan_bypass_logic               : async_mux | none | sync_mux | from_library ; // *DefSpec
                local_comparators_per_go_id     : int | all ; // 1 *DefSpec
                rom_content_file                : file_path;
                output_enable_control           : always_on | system ;
                group_write_enable_control      : always_on | system ;
                observation_xor_size            : auto | off ;
                data_bits_per_bypass_signal     : 1..MaxPosInt | all ;// 1 *DefSpec on page 4853
                }
            ReusedMemoryInterface(id) { // repeatable *DefSpec on page 4837
                instance_name                   : inst_name ;
                reused_interface_id             : [ctrl_id:]mem_interface_id ;
                repair_group_name               : none | group_name ;
            }
        }
    }
}

******DftSpecification/MemoryBist/ReusedController******
DftSpecification(module_name,id) {
    MemoryBist {
        ReusedController(id) { // repeatable
            parent_instance         : inst_path ;
            leaf_instance_name      : inst_name ;
            clock_domain_label      : name ;
            reused_controller_id    : id ;
            Step { //repeatable
                MemoryInterface(id) { // repeatable
                    instance_name   : name ;
                }
            }  
        }
        MemoryCluster(cluster_id) {
            instance_name           : name ;
        }
    }
}   

******DftSpecification/MemoryBist/BistAccessPort******
DftSpecification(module_name,id) {
    MemoryBist {
        BistAccessPort {
            parent_instance          : inst_path ;
            leaf_instance_name       : inst_name ;
            AdvancedOptions {
                use_multicycle_paths : on | off ; // *DefSpec on page 4848
            }
            DirectAccessOptions { // *DefSpec
            }
            Connections {
            }
        }
    }
}
****DftSpecification/MemoryBist/BistAccessPort/DirectAccessOptions****
DftSpecification(module_name,id) {
    MemoryBist {
        BistAccessPort {
            DirectAccessOptions {
                direct_access               : on | off ; // *DefSpec on page 4848
                direct_access_clock_source  : common | per_bist_clock_domain ;// *DefSpec on page 4848
                ExecutionSelections {
                }
            }
        }
    }
}    
DftSpecification(module_name,id) {
    MemoryBist {
        Controller(id) {
            DirectAccessOptions {
                ExecutionSelections {
                }
            }
        }
    }
}
**DftSpecification/MemoryBist/BistAccessPort/DirectAccessOptions/ExecutionSelections**
DftSpecification(module_name,id) {
    MemoryBist {
        BistAccessPort {
            DirectAccessOptions {
                ExecutionSelections {
                    controller                  : off | auto ; // *DefSpec
                    step                            : off | auto ; // *DefSpec
                    memory                          : off | auto ; // *DefSpec
                    algorithm                       : off | auto ; // *DefSpec
                    operation_set                   : off | auto ; // *DefSpec
                    retention_test_phase            : off | auto ; // *DefSpec
                    configuration_data              : off | auto ; // *DefSpec
                    test_port                       : off | auto ; // *DefSpec
                    data_inversion_with_address_bit : off | auto ; // *DefSpec
                    bira_enable                     : off | auto ; // *DefSpec
                    check_repair_needed             : off | auto ; // *DefSpec
                    preserve_fuse_register_values   : off | auto ; // *DefSpec
                }
            }
        }
    }
}
DftSpecification(module_name,id) {
    MemoryBist {
        Controller(id) {
            DirectAccessOptions {
                ExecutionSelections {
                    step                            : on | off ; // *DefSpec
                    memory                          : on | off ; // *DefSpec
                    algorithm                       : on | off ; // *DefSpec
                    operation_set                   : on | off ; // *DefSpec
                    configuration_data              : on | off ; // *DefSpec
                    test_port                       : on | off ; // *DefSpec
                    data_inversion_with_address_bit : on | off ; // *DefSpec
                }
            }
        }
    }
}
****DftSpecification/MemoryBist/BistAccessPort/Connections****
DftSpecification(module_name,id) {
    MemoryBist {
        BistAccessPort {
            Connections {
                DirectAccess {
                    controller_done                                 : port_pin_name ;
                    controller_pass                                 : port_pin_name ;
                    controller_select                               : port_pin_name ;
                    step_select                                     : port_pin_name ;
                    step_select_enable                              : port_pin_name ;
                    memory_select                                   : port_pin_name ;
                    memory_select_enable                            : port_pin_name ;
                    algorithm_select                                : port_pin_name ;
                    algorithm_select_enable                         : port_pin_name ;
                    operation_set_select                            : port_pin_name ;
                    operation_set_select_enable                     : port_pin_name ;
                    retention_test_phase                            : port_pin_name ;
                    preserve_test_inputs                            : port_pin_name ;
                    test_port_select                                : port_pin_name ;
                    test_port_select_enable                         : port_pin_name ;
                    data_inversion_column_address_bit_select        : port_pin_name;
                    data_inversion_column_address_bit_select_enable : port_pin_name;
                    data_inversion_row_address_bit_select           : port_pin_name;
                    data_inversion_row_address_bit_select_enable    : port_pin_name;
                    bira_enable                                     : port_pin_name ;
                    check_repair_needed                             : port_pin_name ;
                    preserve_fuse_register_values                   : port_pin_name ;
                    incremental_test_mode                           : port_pin_name ;
                    ClockDomain (domain_label) { // repeatable
                        clock                                       : port_pin_name ;
                        reset                                       : port_pin_name ;
                        test_init                                   : port_pin_name ;
                        test_start                                  : port_pin_name ;
                        test_done                                   : port_pin_name ;
                        test_pass                                   : port_pin_name ;
                    }
                }
            }
        }
    }
}

******DftSpecification/MemoryBist/TCKInjectionPoints******
DftSpecification(module_name,id) {
    MemoryBist {
        TCKInjectionPoints {
            ClockMux (mux_id) {
                leaf_instance_name  : instance_name ;
                node                : node_name ;
            }
        }
    }
}