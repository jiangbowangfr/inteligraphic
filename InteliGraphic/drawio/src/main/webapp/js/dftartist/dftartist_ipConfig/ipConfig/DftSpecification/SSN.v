********DftSpecification/SSN********
DftSpecification(module_name,id) {
    SSN {
        DefaultChildConfiguration {
        }
        ijtag_host_interface                    : host_node_leaf_name; // default: Sib(ssn)
        scan_host_sourcing_dynamic_dft_signals  : scan_host_id | none;
        clock_sources_with_no_local_occs        : port_pin_name, ...;
        ScanHost(id) {
            // Only instantiate the ScanHost wrapper here if you do not want
            // a parallel bus datapath (Streaming-Through-IJTAG access only).
            // The ScanHost wrapper is typically added inside the Datapath
            // wrapper so that it supports a parallel SSN bus.
        }
        Datapath(id) {
        }
    }
}

******DftSpecification/SSN/DefaultChildConfiguration******
DftSpecification(module_name,id) {
    SSN {
        DefaultChildConfiguration {
            Interface {
                bus_clock                           : port_name; // default: prop_name
                bus_data_in                         : port_name; // default: prop_name
                secondary_bus_data_in               : port_name; // default: prop_name
                bus_data_out                        : port_name; // default: prop_name
                select_in                           : port_name; // default: prop_name
                select_out                          : port_name; // default: prop_name
                ssh_is_active                       : port_name; // default: prop_name
                ChainGroup {
                    scan_en                         : port_name; // default: prop_name
                    scan_en_bypass_in               : port_name; // default: prop_name
                    edt_update                      : port_name; // default: prop_name
                    edt_update_bypass_in            : port_name; // default: prop_name
                    edt_clock                       : port_name; // default: prop_name
                    edt_clock_bypass_in             : port_name; // default: prop_name
                    test_clock                      : port_name; // default: prop_name
                    test_clock_bypass_in            : port_name; // default: prop_name
                    shift_capture_clock             : port_name; // default: prop_name
                    shift_capture_clock_bypass_in   : port_name; // default: prop_name
                    shift_clock                     : port_name; // default: prop_name
                    shift_clock_bypass_in           : port_name; // default: prop_name
                    capture_clock                   : port_name; // default: prop_name
                    capture_clock_bypass_in         : port_name; // default: prop_name
                    to_scan_in                      : port_name; // default: prop_name
                    to_scan_in_bypass_in            : port_name; // default: prop_name
                    from_scan_out                   : port_name; // default: prop_name
                    from_scan_out_bypass_out        : port_name; // default: prop_name
                }                           
                IjtagScanInterface {
                    reset                           : port_name; // default: ijtag_reset
                    tck                             : port_name; // default: ijtag_tck
                    select                          : port_name; // default: ijtag_sel
                    capture_en                      : port_name; // default: ijtag_ce
                    shift_en                        : port_name; // default: ijtag_se
                    update_en                       : port_name; // default: ijtag_ue
                    scan_in                         : port_name; // default: ijtag_si
                    scan_out                        : port_name; // default: ijtag_so
                }
            }
            bus_clock_period                        : time; // default: 2.5ns
            bus_register_reset                      : on | off ;
            input_retiming_cell_type                : dff | latch ; // default: dff
            max_capture_clock_pulses                : int; // default: 7
            max_capture_to_shift_clock_period_ratio : int; // default: 8
            max_initial_offset                      : int; // default: 2G
            max_scan_chain_length                   : int; // default: 256M
            max_scan_en_mcp                         : 2 | 4 | 8 | 16 | 32 | 64;
            max_edt_update_mcp                      : 2 | 4 | 8 | 16 | 32 | 64;
            use_clock_dff_cell                      : on | off;
            OnChipCompareMode {
                present                             : on | off | auto;
                sticky_status_resolution            : ssh | output_chain;
                status_groups                       : int; // default: 128
            }
        }
    }
}

******DftSpecification/SSN/Datapath******
DftSpecification(module_name,id) {
    SSN {
        Datapath(id) {
            ijtag_host_interface    : host_node_leaf_name; // default: Sib(ssn)
            bus_clock_period        : time; // default: Inherited
            bus_register_reset      : on | off ;
            output_bus_width        : int; // mandatory
            output_data_rate        : auto | int | int/int;
            DefaultChildConfiguration {
            }
            Connections {
            }
            BusFrequencyDivider {
            }
            BusFrequencyMultiplier {
            }
            DesignInstance {
            }
            ExtraOutputPath {
            }
            Fifo {
            }
            Multiplexer {
            }
            OutputPipeline {
            }
            Pipeline {
            }
            Receiver1xPipeline {
            }
            ScanHost {
            }
        }
    }
}
****DftSpecification/SSN/Datapath/Connections****
DftSpecification(module_name,id) {
    SSN {
        Datapath(id) {
            Connections {
                bus_clock_in                            : port_pin_name, ...; // default: ssn_bus_clock
                bus_data_in                             : {- | port_pin_name, ...};// default: ssn_bus_data_in[%d]
                bus_clock_out                           : port_pin_name;
                bus_data_out                            : {- | port_pin_name, ...};// default: ssn_bus_data_out[%d]
                delete_pre_existing_functional_source   : on | off ;
            }
        }
    }
}
****DftSpecification/SSN/Datapath/BusFrequencyDivider****
DftSpecification(module_name,id) {
    SSN {
        Datapath(id) {
            BusFrequencyDivider(id) {
                input_retimed               : on | off;
                input_retiming_cell_type    : dff | latch ; // default: Inherited
                use_clock_shaper_cell       : on | off;
                frequency_ratio             : int ; // mandatory
                output_divided_clock        : on | off;
                ijtag_host_interface        : host_node_leaf_name; // default: Sib(ssn)
                ijtag_connection_order      : int | "";
                bus_clock_period            : time ; // default: Inherited
                parent_instance             : instance_name;
                leaf_instance_name          : leaf_instance_name;
                Interface {
                    bus_clock               : port_name; // default: Inherited
                    bus_clock_out           : port_name; // default: Inherited
                    bus_clock_out_local     : port_name; // default: Inherited
                    bus_data_in             : port_name; // default: Inherited
                    bus_data_out            : port_name; // default: Inherited
                    IjtagScanInterface {
                        reset               : port_name; // default: Inherited
                        tck                 : port_name; // default: Inherited
                        select              : port_name; // default: Inherited
                        capture_en          : port_name; // default: Inherited
                        shift_en            : port_name; // default: Inherited
                        update_en           : port_name; // default: Inherited
                        scan_in             : port_name; // default: Inherited
                        scan_out            : port_name; // default: Inherited
                    }
                }
                Connections {
                    bus_clock_in            : port_pin_name;
                }
                ExtraOutputPath {
                }
            }
        }
    }
}
****DftSpecification/SSN/Datapath/BusFrequencyMultiplier****
DftSpecification(module_name,id) {
    SSN {
        Datapath(id) {
            BusFrequencyMultiplier(id) {
                use_clock_shaper_cell   : on | off;
                frequency_ratio         : int ; // mandatory
                update_phase            : transmitter | receiver;
                output_divided_clock    : on | off;
                ijtag_host_interface    : host_node_leaf_name;// default: Sib(ssn)
                ijtag_connection_order  : int | "";
                bus_clock_period        : time ; // default: Inherited
                parent_instance         : instance_name;
                leaf_instance_name      : leaf_instance_name;
                Interface {
                    bus_clock           : port_name; // default: Inherited
                    bus_clock_out       : port_name; // default: Inherited
                    bus_data_in         : port_name; // default: Inherited
                    bus_data_out        : port_name; // default: Inherited
                    IjtagScanInterface {
                        reset           : port_name; // default: Inherited
                        tck             : port_name; // default: Inherited
                        select          : port_name; // default: Inherited
                        capture_en      : port_name; // default: Inherited
                        shift_en        : port_name; // default: Inherited
                        update_en       : port_name; // default: Inherited
                        scan_in         : port_name; // default: Inherited
                        scan_out        : port_name; // default: Inherited
                    }
                }
                Connections {
                    bus_clock_in        : port_pin_name;
                }
                ExtraOutputPath {
                }
            }
        }
    }
}
****DftSpecification/SSN/Datapath/DesignInstance****
DftSpecification(module_name,id) {
    SSN {
        Datapath(id) {
            DesignInstance(instance_name) {
                datapath                    : id ;
                Connections {
                    ignore_bus_clock_out    : on | off;
                    bus_clock_in            : port_pin_name, ...;
                }
                ExtraOutputPath {
                }
            }
        }
    }
}
****DftSpecification/SSN/Datapath/ExtraOutputPath****
DftSpecification(module_name,id) {
    SSN {
        Datapath(id) {
            ExtraOutputPath {
                ijtag_host_interface    : host_node_leaf_name; // default: Sib(ssn)
                output_bus_width        : int | inferred_from_source | auto;
                Connections {
                    bus_clock_in        : port_pin_name; // default: inferred
                    bus_clock_out       : port_pin_name; // Optional
                    output_datapath_id  : id; // default: out<#>
                    bus_data_out        : {- | port_pin_name, ... }; // Required
                    InSystemTestController(id) {
                    }
                }
                BusFrequencyDivider {
                }
                BusFrequencyMultiplier {
                }
                DesignInstance {
                }
                ExtraOutputPath {
                }
                Fifo {
                }
                Multiplexer {
                }
                OutputPipeline {
                }
                Pipeline {
                }
                Receiver1xPipeline {
                }
            }
        }
    }
}
****DftSpecification/SSN/Datapath/Fifo****
DftSpecification(module_name,id) {
    SSN {
        Datapath(id) {
            Fifo(id) {
                ijtag_host_interface                    : host_node_leaf_name;// default: Sib(ssn)
                ijtag_connection_order                  : int | "";
                bus_clock_period                        : time; // default: Inherited
                frequency_ratio                         : int; // required
                input_retimed                           : on | off;
                input_retiming_cell_type                : dff | latch;// default: Inherited
                in_clock_to_out_clock_skew              : early_or_delayed | delayed_only;
                in_clock_to_out_clock_skew_programmable : on | off;
                parent_instance                         : instance_name;
                leaf_instance_name                      : leaf_instance_name;
                Interface {
                    bus_in_clock                        : port_name; // default: Inherited
                    bus_out_clock                       : port_name; // default: Inherited
                    bus_data_in                         : port_name; // default: Inherited
                    bus_data_out                        : port_name; // default: Inherited
                    IjtagScanInterface {
                        reset                           : port_name; // default: Inherited
                        tck                             : port_name; // default: Inherited
                        select                          : port_name; // default: Inherited
                        capture_en                      : port_name; // default: Inherited
                        capture_shift_en                : port_name; // default: Inherited
                        shift_en                        : port_name; // default: Inherited
                        update_en                       : port_name; // default: Inherited
                        update_clock                    : port_name; // default: Inherited
                        scan_in                         : port_name; // default: Inherited
                        scan_out                        : port_name; // default: Inherited
                    }
                }
                Connections {
                    bus_in_clock_in                     : port_pin_name;
                    bus_out_clock_in                    : port_pin_name;
                }
                ExtraOutputPath {
                }
            }
        }
    }
}
****DftSpecification/SSN/Datapath/Multiplexer****
DftSpecification(module_name,id) {
    SSN {
        Datapath(id) {
            Multiplexer(id) {
                ijtag_host_interface            : host_node_leaf_name;// default: Sib(ssn)
                ijtag_connection_order          : int | "";
                bus_clock_period                : time; // def: inherited
                secondary_input_bus_width       : width | same_as_output_bus_width | auto;
                include_clock_mux               : on | off | auto;
                include_pipeline_stage          : on | off;
                mux_select                      : internal | external | auto;
                internal_mux_select_reset_value : 0 | 1;
                parent_instance                 : instance_name;
                leaf_instance_name              : leaf_instance_name;
                DefaultChildConfiguration {
                }
                Interface {
                    bus_clock                   : port_name; // def: inherited
                    bus_clock_out               : port_name; // def: inherited
                    bus_data_in                 : port_name; // def: inherited
                    secondary_bus_data_in       : port_name; // def: inherited
                    secondary_bus_clock         : port_name; // def: inherited
                    bus_data_out                : port_name; // def: inherited
                    select_in                   : port_name; // def: inherited
                    select_out                  : port_name; // def: inherited
                    IjtagScanInterface {
                        reset                   : port_name; // def: inherited
                        tck                     : port_name; // def: inherited
                        select                  : port_name; // def: inherited
                        capture_en              : port_name; // def: inherited
                        shift_en                : port_name; // def: inherited
                        update_en               : port_name; // def: inherited
                        scan_in                 : port_name; // def: inherited
                        scan_out                : port_name; // def: inherited
                    }
                }
                Connections {
                    bus_clock_in                : port_pin_name; // def: ssn_bus_clock
                    input_datapath_id           : id; // def: in<#>
                    secondary_bus_data_in       : (- | port_pin_name, ...); // def: ""
                    select_in                   : (- | port_pin_name ); // def: ""
                    secondary_bus_clock_in      : port_pin_name;
                    InSystemTestController(id) {
                    }
                }
                BusFrequencyDivider(id) {
                }
                BusFrequencyMultiplier(id) {
                }
                DesignInstance(instance_name) {
                }
                ExtraOutputPath {
                }
                Multiplexer {
                }
                Pipeline(id) {
                }
                Receiver1xPipeline(id) {
                }
                ScanHost(id) {
                }
            }
        }
    }
}
****DftSpecification/SSN/Datapath/OutputPipeline****
DftSpecification(module_name,id) {
    SSN {
        Datapath(id) {
            OutputPipeline(id) {
                ijtag_host_interface    : host_node_leaf_name;// default: Sib(ssn)
                ijtag_connection_order  : int | "";
                bus_clock_period        : time ; // default: 2.5ns
                frequency_ratio         : int | auto;
                parent_instance         : instance_name;
                leaf_instance_name      : leaf_instance_name;
                Interface {
                    bus_clock           : port_name; // default: bus_clock
                    bus_data_in         : port_name; // default: bus_data_in
                    bus_data_out        : port_name; // default: bus_data_out
                    IjtagScanInterface {
                        reset           : port_name; // default: ijtag_reset
                        tck             : port_name; // default: ijtag_tck
                        select          : port_name; // default: ijtag_sel
                        capture_en      : port_name; // default: ijtag_ce
                        shift_en        : port_name; // default: ijtag_se
                        update_en       : port_name; // default: ijtag_ue
                        scan_in         : port_name; // default: ijtag_si
                        scan_out        : port_name; // default: ijtag_so
                    }
                }
                Connections {
                    bus_clock_in        : port_pin_name;
                }
            }
        }
    }
}
****DftSpecification/SSN/Datapath/Receiver1xPipeline****
DftSpecification(module_name,id) {
    SSN {
        Datapath(id) {
            Receiver1xPipeline(id) {
                ijtag_host_interface        : host_node_leaf_name ;// default: Sib(ssn)
                ijtag_connection_order      : order ;
                bus_clock_period            : time ; // default: 2.5ns
                parent_instance             : instance_name ;
                leaf_instance_name          : leaf_instance_name ;
                input_retiming_cell_type    : dff | latch ; // default: Inherited
                Interface {
                    bus_clock               : port_name ; // default: Inherited
                    bus_data_in             : port_name ; // default: Inherited
                    bus_data_out            : port_name ; // default: Inherited
                    IjtagScanInterface {
                        reset               : port_name ; // default: Inherited
                    } 
                }
                Connections {
                    bus_clock_in            : port_pin_name;
                }
                ExtraOutputPath {
                }
            }
        }
    }
}
****DftSpecification/SSN/Datapath/Pipeline****
DftSpecification(module_name,id) {
    SSN {
        Datapath(id) {
            Pipeline(id) {
                ijtag_host_interface    : host_node_leaf_name; //default: Sib(ssn)
                ijtag_connection_order  : int | "";
                bus_clock_period        : time; // default: inherited
                frequency_ratio         : int | auto;
                update_phase            : receiver | transmitter | auto;
                parent_instance         : instance_name;
                leaf_instance_name      : leaf_instance_name;
                Interface {
                    bus_clock           : port_name; // default: inherited
                    bus_data_in         : port_name; // default: inherited
                    bus_data_out        : port_name; // default: inherited
                    IjtagScanInterface {
                        reset           : port_name; // default: inherited
                        tck             : port_name; // default: inherited
                        select          : port_name; // default: inherited
                        capture_en      : port_name; // default: inherited
                        shift_en        : port_name; // default: inherited
                        update_en       : port_name; // default: inherited
                        scan_in         : port_name; // default: inherited
                        scan_out        : port_name; // default: inherited
                    }
                }
                Connections {
                    bus_clock_in        : port_pin_name;
                }
                ExtraOutputPath {
                }
            }
        }
    }
}
****DftSpecification/SSN/Datapath/ScanHost****
DftSpecification(module_name,id) {
    SSN {
        Datapath(id) {
            ScanHost(id) {
                ijtag_host_interface                                    : host_node_leaf_name;// default: Sib(ssn)
                ijtag_connection_order                                  : int | "";
                bus_clock_period                                        : time; // default: Inherited
                max_capture_clock_pulses                                : int; // default: Inherited
                max_capture_to_shift_clock_period_ratio                 : int; // default: Inherited
                parent_instance                                         : instance_name;
                leaf_instance_name                                      : leaf_instance_name;
                max_scan_chain_length                                   : int | auto; // default: Inherited
                max_scan_en_mcp                                         : 2 | 4 | 8 | 16 | 32 | 64;// default: Inherited
                max_edt_update_mcp                                      : 2 | 4 | 8 | 16 | 32 | 64;// default: Inherited
                input_chain_count                                       : int | from_edt_controller;
                output_chain_count                                      : int | from_edt_controller | same_as_input_chain_count;
                output_chain_count_in_on_chip_compare_mode              : int | from_edt_controller | from_edt_controller_high_compression_configuration;
                high_compression_input_channel_count                    : int | auto;
                high_compression_output_channel_count                   : int | auto;
                use_high_compression_channel_count_in_bypass_mode       : on | off;
                support_from_scan_out_le_strobing                       : on | off;
                scan_signals_bypass                                     : on | off | controls_only | auto;
                use_clock_dff_cell                                      : on | off;
                use_clock_or_cell                                       : on | off;
                use_clock_shaper_cell                                   : on | off;
                support_output_clock_activation_when_ssh_is_off         : on | off;
                size_resolution                                         : 2 | 4 | 8;
                use_ssn_bus_clock_as_test_clock_bypass                  : on | off;
                dft_signals_not_mapped_on_ssh_outputs                   : dynamic_dft_signal_name, …;
                OnChipCompareMode {
                    present                                             : on | off | auto;
                    sticky_status_resolution                            : ssh | output_chain;
                    status_groups                                       : int; // default: 128
                }
                ChainGroup(id) {
                    input_chain_count                                   : int | from_edt_controller;
                    output_chain_count                                  : int | from_edt_controller | same_as_input_chain_count;
                    output_chain_count_in_on_chip_compare_mode          : int | from_edt_controller | from_edt_controller_high_compression_configuration;
                    high_compression_input_channel_count                : int | auto;
                    high_compression_output_channel_count               : int | auto;
                    use_high_compression_channel_count_in_bypass_mode   : on | off;
                    support_from_scan_out_le_strobing                   : on | off;
                }
                Interface {
                    bus_clock                                           : port_name; // default: Inherited
                    bus_data_in                                         : port_name; // default: Inherited
                    bus_data_out                                        : port_name; // default: Inherited
                    ssh_is_active                                       : port_name; // default: Inherited
                    ssh_is_active_present                               : on | off | auto ;
                    ChainGroup {
                        scan_en                                         : port_name; // default: Inherited
                        scan_en_bypass_in                               : port_name; // default: Inherited
                        edt_update                                      : port_name; // default: Inherited
                        edt_update_bypass_in                            : port_name; // default: Inherited
                        test_clock_present                              : on | off | auto;
                        test_clock                                      : port_name; // default: Inherited
                        test_clock_bypass_in                            : port_name; // default: Inherited
                        edt_clock_present                               : on | off | auto;
                        edt_clock                                       : port_name; // default: Inherited
                        edt_clock_bypass_in                             : port_name; / default: Inherited
                        shift_capture_clock_present                     : on | off | auto;
                        shift_capture_clock                             : port_name; // default: Inherited
                        shift_capture_clock_bypass_in                   : port_name;// default: Inherited
                        shift_clock_present                             : on | off | auto;
                        shift_clock                                     : port_name;// default: shift_clock
                        shift_clock_bypass_in                           : port_name;// default: shift_clock_bypass_in
                        capture_clock_present                           : on | off | auto;
                        capture_clock                                   : port_name;// default: capture_clock
                        capture_clock_bypass_in                         : port_name;// default: capture_clock_bypass_in
                        to_scan_in                                      : port_name; // default: Inherited
                        to_scan_in_bypass_in                            : port_name; // default: Inherited
                        from_scan_out                                   : port_name; // default: Inherited
                        from_scan_out_bypass_out                        : port_name; // default: Inherited
                    }
                    ClockSignalModule {
                        define_clock_on_boundary                        : on | off | auto;
                        module_name                                     : module_name;
                        write_out_module_definition                     : on | in_separate_file | off | auto;
                        // The default value for all following properties is the
                        // property name itself. (For example, the default value of
                        // the "clock" property is "clock".) The values are inherited
                        // from the DefaultChildConfiguration wrapper.
                        clock                                           : port_name;
                        enable                                          : port_name;
                        enable_sync                                     : port_name;
                        ijtag_clock_cg_en                               : port_name;
                        ijtag_clock                                     : port_name;
                        next_edt_clock_div                              : port_name;
                        edt_clock_cg_en                                 : port_name;
                        edt_clock_bypass_in                             : port_name;
                        edt_clock                                       : port_name;
                        next_shift_capture_clock_div                    : port_name;
                        shift_capture_clock_cg_en                       : port_name;
                        shift_capture_clock_bypass_in                   : port_name;
                        shift_capture_clock                             : port_name;
                        next_shift_clock_div                            : port_name;
                        shift_clock_cg_en                               : port_name;
                        shift_clock_bypass_in                           : port_name;
                        shift_clock                                     : port_name;
                        next_capture_clock_div                          : port_name;
                        capture_clock_cg_en                             : port_name;
                        capture_clock_bypass_in                         : port_name;
                        capture_clock                                   : port_name;
                        next_test_clock_div                             : port_name;
                        test_clock_cg_en                                : port_name;
                        test_clock_bypass_in                            : port_name;
                        test_clock                                      : port_name;
                    }
                    IjtagScanInterface {
                        reset                                           : port_name; // default: Inherited
                        tck                                             : port_name; // default: Inherited
                        select                                          : port_name; // default: Inherited
                        capture_en                                      : port_name; // default: Inherited
                        shift_en                                        : port_name; // default: Inherited
                        update_en                                       : port_name; // default: Inherited
                        scan_in                                         : port_name; // default: Inherited
                        scan_out                                        : port_name; // default: Inherited
                    }
                }
                Connections {
                }
                ExtraOutputPath {
                }
            }
        }
    }
}
**DftSpecification/SSN/Datapath/ScanHost/Connections**
DftSpecification(module_name,id) {
    SSN {
        Datapath(id) {
            ScanHost(id) {
                Connections {
                    bus_clock_in : port_pin_name ; 
                    test_clock : port_pin_name ;
                    test_clock_bypass_in : port_pin_constant_name ;// default: DftSignal(test_clock)
                    edt_clock : port_pin_name, ... ;
                    edt_clock_bypass_in : port_pin_constant_name ;// default: DftSignal(edt_clock)
                    edt_update : port_pin_name, ... ;
                    edt_update_bypass_in                    : port_pin_constant_name ;// default: DftSignal(edt_update)
                    scan_en                                 : port_pin_name, ... ;
                    scan_en_bypass_in                       : port_pin_constant_name ;// default: DftSignal(scan_en)
                    shift_capture_clock                     : port_pin_name, ... ;
                    shift_capture_clock_bypass_in           : port_pin_constant_name ;// default: DftSignal(shift_capture_clock)
                    shift_clock                             : port_pin_name, ... ;
                    shift_clock_bypass_in                   : port_pin_constant_name ;// default: DftSignal(shift_clock)
                    capture_clock                           : port_pin_name, ... ;
                    capture_clock_bypass_in                 : port_pin_constant_name ;// default: DftSignal(capture_clock)
                    ssh_is_active : port_pin_name, ... ;
                    to_scan_in                              : port_pin_name, ... ;
                    to_scan_in_bypass_in                    : port_pin_name, ... ;// default: edt_channels_in[%d]
                    from_scan_out                           : port_pin_name, ... ;
                    from_scan_out_bypass_out                : port_pin_name, ... ;// default: edt_channels_out[%d]
                    delete_pre_existing_functional_source   : on | off ;
                    ChainGroup(id) {
                        to_scan_in                          : port_pin_name, ... ;
                        to_scan_in_bypass_in                : port_pin_name, ... ;// default: edt_channels_in_%s[%d]
                        from_scan_out                       : port_pin_name, ... ;
                        from_scan_out_bypass_out            : port_pin_name, ... ;// default: edt_channels_out_%s[%d]
                    }
                }
            }
        }
    }
}