
********DftSpecification/EmbeddedBoundaryScan********
DftSpecification(module_name,id) {
    EmbeddedBoundaryScan {
        pad_io_ports                                 : port_name, ... ;
        interface_parent_instance                    : parent_instance ;
        outputs_per_enable_cell                      : int ; // default: 16 *DefSpec
        default_cell_on_bidir_port                   : combined | separated ;
        max_segment_length_for_logictest             : int | unlimited | off ;
        optimize_bidi_cell_to_match_functional_usage : on | off ;
        Interface { // *DefSpec
        }
        Connections {
        }
        ImplementationOptions { // *DefSpec
        }
        BoundaryScanCellOptions {
        }
        LogicalGroups {
        }
        BondingConfigurations {
        }
        AuxiliaryInputOutputPorts {
        }
        ACModeOptions {
        }
        EnableGroups {
        }
        InternalBScanCells {
        }
        InternalBScanSegments {
        }
        HostBScanInterface {
        }
    }
}

******DftSpecification/EmbeddedBoundaryScan/Interface******
DftSpecification(module_name,id) {
    EmbeddedBoundaryScan {
        Interface { *DefSpec
            select                  : port_naming ; // bscan_select
            reset                   : port_naming ; // bscan_reset
            force_disable           : port_naming ; // bscan_force_disable
            select_jtag_input       : port_naming ; // bscan_select_jtag_input
            select_jtag_output      : port_naming ; // bscan_select_jtag_output
            bscan_clock             : port_naming ; // bscan_clock
            capture_en              : port_naming ; // bscan_capture_en
            shift_en                : port_naming ; // bscan_shift_en
            update_en               : port_naming ; // bscan_update_en
            scan_in                 : port_naming ; // bscan_scan_in
            scan_out                : port_naming ; // bscan_scan_out
            scan_out_pipeline       : on | off;
            auxiliary_output        : port_naming ; // bscan_%s_aux_out
            auxiliary_output_enable : port_naming ; // bscan_%s_aux_out_en
            auxiliary_input         : port_naming ; // bscan_%s_aux_in
            auxiliary_input_enable  : port_naming ; // bscan_%s_aux_in_en
            ac_init_clock0          : port_naming ; // bscan_ac_init_clk0
            ac_init_clock1          : port_naming ; // bscan_ac_init_clk1
            ac_signal               : port_naming ; // bscan_ac_signal
            ac_mode_en              : port_naming ; // bscan_ac_mode_en
        }
    }
}

******DftSpecification/EmbeddedBoundaryScan/Interface******
DftSpecification(<module_name>,<id>) {
    EmbeddedBoundaryScan {
        Connections {
            select                      : pin_name ;
            reset                       : pin_name ;
            reset_polarity              : active_polarity ;// legal : active_high | active_low
            force_disable               : pin_name ;
            force_disable_polarity      : active_polarity ;// legal : active_high | active_low
            select_jtag_input           : pin_name ;
            select_jtag_input_polarity  : active_polarity ;// legal : active_high | active_low
            select_jtag_output          : pin_name ;
            select_jtag_output_polarity : active_polarity ;// legal : active_high | active_low
            bscan_clock                 : pin_name ;
            capture_en                  : pin_name ;
            shift_en                    : pin_name ;
            update_en                   : pin_name ;
            scan_in                     : pin_name ;
            scan_out                    : pin_name ;
            ac_init_clock0              : pin_name ;
            ac_init_clock1              : pin_name ;
            ac_signal                   : pin_name ;
            ac_signal_polarity          : active_polarity ;// legal : active_high | active_low
            ac_mode_en                  : pin_name ;
            ac_mode_en_polarity         : active_polarity ;// legal : active_high | active_low
        }
    }
}

******DftSpecification/EmbeddedBoundaryScan/ImplementationOptions******
DftSpecification(module_name,id) {
    BoundaryScan | EmbeddedBoundaryScan {
        ImplementationOptions {
            clocking           : tck | gated_tck | gated_tck_inv ; // *DefSpec
            update_stage       : flop | latch | auto ; // *DefSpec
            scan_path_retiming : flop | latch ; // *DefSpec
        }
    }
}

******DftSpecification/EmbeddedBoundaryScan/BoundaryScanCellOptions******
DftSpecification(module_name,id) {
    BoundaryScan | EmbeddedBoundaryScan {
        BoundaryScanCellOptions {
            port_name_pattern : option, ... ; // repeatable
        }
    }
}

******DftSpecification/EmbeddedBoundaryScan/BondingConfigurations******
DftSpecification(module_name,id) {
    EmbeddedBoundaryScan {
        BondingConfiguration(name) {
            enable_signal           : port_pin_or_net_name ;
            bypassed_logical_groups : logical_group_name, ... ;
            active_logical_groups   : logical_group_name, ... ;
            TcdBscanSegment(instance_name) {
                segment_selection   : segment_selection_name;
            }
        }
    }
}

****DftSpecification/InSystemTest/Controller/AxiSubordinateOptions****
DftSpecification (module_name, id) {
    InSystemTest {
        Controller(id) {
            AxiSubordinateOptions {
                present                     : on | off | auto ;
                write_transaction_id_width  : integer ; // valid: 1..512
                read_transaction_id_width   : integer ; // valid: 1..512
                buffer_memory_cell          : name ;
            }
        }
    }
}

****DftSpecification/InSystemTest/Controller/HostBScanInterface****
DftSpecification(module_name,id) {
    EmbeddedBoundaryScan {
        HostBScanInterface(id) {
            Interface {
                ijtag_host_interface        : id;
                select                      : string; // def: bscan_select
                reset                       : string; // def: bscan_reset
                reset_present               : on | off | auto;
                bscan_clock                 : string; // def: bscan_clock
                capture_en                  : string; // def: bscan_capture_en
                shift_en                    : string; // def: bscan_shift_en
                update_en                   : string; // def: bscan_update_en
                scan_in                     : string; // def: bscan_scan_in
                scan_out                    :  string; // def: bscan_scan_out
                force_disable               : string; // def: bscan_force_disable
                force_disable_present       : on | off | auto;
                select_jtag_input           : string; // def: bscan_select_jtag_input
                select_jtag_input_present   : on | off | auto;
                select_jtag_output          : string; // def: bscan_select_jtag_output
                select_jtag_output_present  : on | off | auto;
                ac_init_clock0              : string; // def: bscan_ac_init_clk0
                ac_init_clock0_present      : on | off | auto; // def: auto
                ac_init_clock1              : string; // def: bscan_ac_init_clk1
                ac_init_clock1_present      : on | off | auto; // def: auto
                ac_signal                   : string; // def: bscan_ac_signal
                ac_signal_present           : on | off | auto; // def: auto
                ac_mode_en                  : string; // def: bscan_ac_mode_en
                ac_mode_en_present          : on | off | auto; // def: auto
            }
            Connections {
            }
            EBScanInstance(instance_name) {
            }
            EBScanPipeline(id) {
                parent_instance             : instance_name;
                leaf_instance_name          : leaf_instance_name;
                so_retiming                 : on | off;
                Interface {
                    bscan_clock             : string; // def: bscan_clock
                    select                  : string; // def: bscan_select
                    shift_en                : string; // def: bscan_shift_en
                    scan_in                 : string; // def: bscan_scan_in
                    scan_out                : string; // def: bscan_scan_out
                }
            }
            SecondaryEBScanInterface(id) {
                select                      : string; // def: %s_bscan_to_select
                reset                       : string; // def: %s_bscan_to_reset
                reset_present               : on | off | auto; // default: auto
                bscan_clock                 : string; // def: %s_bscan_to_clock
                capture_en                  : string; // def: %s_bscan_to_capture_en
                shift_en                    : string; // def: %s_bscan_to_shift_en
                update_en                   : string; // def: %s_bscan_to_update_en
                scan_out                    : string; // def: %s_bscan_to_scan_in
                scan_in                     : string; // def:  %s_bscan_from_scan_out
                force_disable               : string; // def: %s_bscan_to_force_disable
                force_disable_present       : on | off | auto;
                select_jtag_input           : string; // def: %s_bscan_to_select_jtag_input
                select_jtag_input_present   : on | off | auto;
                select_jtag_output          : string;// def: %s_bscan_to_select_jtag_output
                select_jtag_output_present  : on | off | auto;
                ac_init_clock0              : string; // def: %s_bscan_to_ac_init_clk0
                ac_init_clock0_present      : on | off | auto;
                ac_init_clock1              : string; // def: %s_bscan_to_ac_init_clk1
                ac_init_clock1_present      : on | off | auto;
                ac_signal                   : string; // def: %s_bscan_to_ac_signal
                ac_signal_present           : on | off | auto;
                ac_mode_en                  : string; // def: %s_bscan_to_ac_mode_en
                ac_mode_en_present          : on | off | auto;
            }
        }
    }
}
**DftSpecification/InSystemTest/Controller/HostBScanInterface/Connections**
DftSpecification(<module_name>,<id>) {
    EmbeddedBoundaryScan {
        HostBScanInterface {
            Connections {
                tms                         : pin_name ;
                trst                        : pin_name ;
                fsm_state                   : pin_name ;
                select                      : pin_name ;
                reset                       : pin_name ;
                reset_polarity              : active_polarity ;// legal : active_high | active_low
                force_disable               : pin_name ;
                force_disable_polarity      : active_polarity ;// legal : active_high | active_low
                select_jtag_input           : pin_name ;
                select_jtag_input_polarity  : active_polarity ;// legal : active_high | active_low
                select_jtag_output          : pin_name ;
                select_jtag_output_polarity : active_polarity ;// legal : active_high | active_low
                bscan_clock                 : pin_name ;
                capture_en                  : pin_name ;
                shift_en                    : pin_name ;
                update_en                   : pin_name ;
                scan_in                     : pin_name ;
                scan_out                    : pin_name ;
                extest_pulse                : pin_name ;
                extest_pulse_polarity       : active_polarity ;// legal : active_high | active_low
                extest_train                : pin_name ;
                extest_train_polarity       : active_polarity ;// legal : active_high | active_low
                ac_init_clock0              : pin_name ;
                ac_init_clock1              : pin_name ;
                ac_signal                   : pin_name ;
                ac_signal_polarity          : active_polarity ;// legal : active_high | active_low
                ac_mode_en                  : pin_name ;
                ac_mode_en_polarity         : active_polarity ;// legal : active_high | active_low
            }
        }
    }
}

******DftSpecification/EmbeddedBoundaryScan/LogicalGroups******
DftSpecification(module_name,id) {
    BoundaryScan | EmbeddedBoundaryScan {
        LogicalGroups {
            LogicalGroup(group_name) {
                first_port          : port_name ;
                parent_instance     : parent_instance ;
                leaf_instance_name  : leaf_instance_name ;
            }
        }
    }
}

******DftSpecification/EmbeddedBoundaryScan/ACModeOptions******
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

******DftSpecification/EmbeddedBoundaryScan/AuxiliaryInputOutputPorts******
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

******DftSpecification/EmbeddedBoundaryScan/EnableGroups******
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

******DftSpecification/EmbeddedBoundaryScan/InternalBScanCells******
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

******DftSpecification/EmbeddedBoundaryScan/InternalBScanSegments******
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