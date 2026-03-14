
********DftSpecification/BoundaryScan********
DftSpecification(module_name,id) {
    BoundaryScan {
        ijtag_host_interface                            : id ;
        bsdl_tap_interface                              : id ;
        pin_order_file                                  : filename ;
        interface_parent_instance                       : parent_instance ;
        create_ac_control                               : auto | on // default: auto
        outputs_per_enable_cell                         : int ; // default: 16
        max_segment_length_for_logictest                : int | unlimited | off ;
        tristate_enable_non_contacted_test_support      : on | off ;
        tck_period                                      : period ; // default: 100ns
        bsdl_format                                     : 2001 | 2013 ; // default: 2001
        default_cell_on_bidir_port                      : combined | separated ;
        handle_logictest_segments_during_scan_insertion : on | off | auto ;
        optimize_bidi_cell_to_match_functional_usage    : on | off ;
        Connections {
        }
        ImplementationOptions {
        }
        BoundaryScanCellOptions {
        }
        LogicalGroups {
        }
        ACModeOptions {
        }
        AuxiliaryInputOutputPorts {
        }
        EnableGroups {
        }
        InternalBScanCells {
        }
        InternalBScanSegments {
        }
        BondingConfigurations {
        }
        UserInstructions{
        }
    }
}

******DftSpecification/BoundaryScan/Connections******
DftSpecification(<module_name>,<id>) {
    BoundaryScan {
        Connections {
            tck                         : pin_name ;
            tms                         : pin_name ;
            trst                        : pin_name ;
            fsm_state                   : pin_name ;
            version_code                : pin_name ;
            part_number_code            : pin_name ;
            select                      : pin_name ;
            reset                       : pin_name ;
            reset_polarity              : active_polarity ;// legal : active_high | active_low
            force_disable               : pin_name ;
            force_disable_polarity      : active_polarity ;// legal : active_high | active_low
            select_jtag_input           : pin_name ;
            select_jtag_input_polarity  : active_polarity ;// legal : active_high | active_low
            select_jtag_output          : pin_name ;
            select_jtag_output_polarity : active_polarity ;// legal : active_high | active_low
            capture_en                  : pin_name ;
            shift_en                    : pin_name ;
            update_en                   : pin_name ;
            scan_in                     : pin_name ;
            scan_out                    : pin_name ;
            extest_pulse                : pin_name ;
            extest_pulse_polarity       : active_polarity ;// legal : active_high | active_low
            extest_train                : pin_name ;
            extest_train_polarity       : active_polarity ;// legal : active_high | active_low
        }
    }
}

******DftSpecification/BoundaryScan/ImplementationOptions******
DftSpecification(module_name,id) {
    BoundaryScan | EmbeddedBoundaryScan {
        ImplementationOptions {
            clocking            : tck | gated_tck | gated_tck_inv ; // *DefSpec
            update_stage        : flop | latch | auto ; // *DefSpec
            scan_path_retiming  : flop | latch ; // *DefSpec
        }
    }
}

******DftSpecification/BoundaryScan/BoundaryScanCellOptions******
DftSpecification(module_name,id) {
    BoundaryScan | EmbeddedBoundaryScan {
        BoundaryScanCellOptions {
            port_name_pattern : option, ... ; // repeatable
        }
    }
}

******DftSpecification/BoundaryScan/LogicalGroups******
DftSpecification(module_name,id) {
    BoundaryScan | EmbeddedBoundaryScan {
        LogicalGroups {
            LogicalGroup(group_name) {
                first_port : port_name ;
                parent_instance : parent_instance ;
                leaf_instance_name : leaf_instance_name ;
            }
        }
    }
}

******DftSpecification/BoundaryScan/ACModeOptions******
DftSpecification(module_name,id) {
    BoundaryScan {
        ACModeOptions {
            test_receiver_init_clock_value  : initialization_event ;
            // Legal: logic_low logic_high、
            // falling_edge rising_edge auto
            pulse_min_duration              : time | auto ;
            train_minimum_count             : count| unused ;
            train_max_duration              : time | unlimited ;
            ACGroup(group_name) {
                insert_before_port          : port_name ;
                insert_after_port           : port_name ;
                port_list                   : port_name, ... ;
            }
        }
    }
    EmbeddedBoundaryScan {
        ACModeOptions {
            test_receiver_init_clock_value  : initialization_event ;
            // Legal: logic_low logic_high
            // falling_edge rising_edge auto
            ACGroup(group_name) {
                insert_before_port          : port_name ;
                insert_after_port           : port_name ;
                port_list                   : port_name, ... ;
            }
        }
    }
}

******DftSpecification/BoundaryScan/AuxiliaryInputOutputPorts******
DftSpecification(module_name,id) {
    BoundaryScan {
        AuxiliaryInputOutputPorts {
            auxiliary_input_ports   : port_name_pattern, ... ;
            auxiliary_output_ports  : port_name_pattern, ... ;
        }
    }
    EmbeddedBoundaryScan{
        AuxiliaryInputOutputPorts {
            internal_auxiliary_input_ports  : port_name_pattern, ... ;
            internal_auxiliary_output_ports : port_name_pattern, ... ;
            external_auxiliary_input_ports  : port_name_pattern, ... ;
            external_auxiliary_output_ports : port_name_pattern, ... ;
        }
    }
}

******DftSpecification/BoundaryScan/EnableGroups******
DftSpecification(module_name,id) {
    BoundaryScan | EmbeddedBoundaryScan {
        EnableGroups {
            EnableGroup(name) {
                capture_core_signal     : on | off ;
                internal_enable_signal  : pin_or_net_name ;
                port_list               : port_name_pattern, ... ;
                insert_before_port      : port_name ;
                insert_after_port       : port_name ;
            }
        }
    }
}

******DftSpecification/BoundaryScan/InternalBScanCells******
DftSpecification(module_name,id) {
    BoundaryScan | EmbeddedBoundaryScan {
        InternalBScanCells {
            InternalBScanCell(name) {
                insert_before_port  : port_name ;
                insert_after_port   : port_name ;
                safe_value          : 0 | 1 | X ;
                type                : control | observation | both ;
                connection          : pin_or_net_name ;
                multiplexing        : on | off | auto ;
                logical_group_name  : logical_group_name ;
            }
        }
    }
}

******DftSpecification/BoundaryScan/InternalBScanSegments******
DftSpecification(module_name,id) {
    BoundaryScan | EmbeddedBoundaryScan {
        InternalBScanSegments {
            InternalBScanSegment(instance_name) {
                insert_before_port  : port_name ;
                insert_after_port   : port_name ;
                logical_group_name  : logical_group_name ;
            }
        }
    }
}

******DftSpecification/BoundaryScan/BondingConfigurations******
DftSpecification(module_name,id) {
    BoundaryScan {
        BondingConfigurations {
            BondingConfiguration(name) {
                enable_signal           : pin_or_net_name ;
                part_number_code        : binary ; // default: 16'h0
                version_code            : binary ; // default: 4'h0
                unused_ports            : port_name_pattern, ... ;
                bypassed_logical_groups : logical_group_name, ... ;
                active_logical_groups   : logical_group_name, ... ;
 
            // default: unspecified
                TcdBscanSegment(instance_name) {
                segment_selection       : segment_selection_name;
                }
            }
        }
    }
}

******DftSpecification/BoundaryScan/UserInstructions******
DftSpecification(module_name,id) {
    BoundaryScan {
        UserInstructions {
            UserInstruction(instr) { // Repeatable
                tap_host_scan_interface_id  : Tap(id)/HostIjtag(id) ;
                instruction_codes           : binary, ... ;
                bsdl_visibility             : public | private ;
                user_register               : user_reg[int] ;
                capture_value               : sized_binary_string ;
            }
        }
    }
}
