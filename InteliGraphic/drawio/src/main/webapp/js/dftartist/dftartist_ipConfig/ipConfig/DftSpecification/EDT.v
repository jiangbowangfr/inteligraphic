********DftSpecification/EDT********
DftSpecification(module_name,id){
    EDT{
        ijtag_host_interface : ijtag_leaf_node_name | none ;
        LogicBistOptions { // use to specify common options across
        }                  // all controllers
        ControllerChain {
        }
        Connections {
        }
        Controller(id) {
        }
    }
}

******DftSpecification/EDT/LogicBistOptions******
DftSpecification(module_name,id){
    EDT {
        LogicBistOptions {
            present             : on | off | auto;
            capture_per_cycle   : on | off | auto ;
            prpg_reference_seed : hex ;             // default: 1
            self_test           : on | off | auto ;
            ShiftCycles{
            }
            WarmupPatternCount {
            }
        }
    }
}
****DftSpecification/EDT/LogicBistOptions/ShiftCycles****
DftSpecification (module_name,id){
    EDT{
        LogicBistOptions{
            ShiftCycles{
                max              : int ;
                hardware_default : int ; // default: max
            }
        }
    }
}
****DftSpecification/EDT/LogicBistOptions/WarmupPatternCount****
DftSpecification (module_name,id){
    EDT{
        LogicBistOptions{
           WarmupPatternCount {
            max              : int ; // default: 255
            hardware_default : int ; // default: 0
            }
        }
    }
}

******DftSpecification/EDT/ControllerChain******
DftSpecification (module_name,id){
    Edt {
        ControllerChain {
            present                : on | off ; // default: off
            clock                  : enum ;     // legal : tck, edt_clock
            // default: edt_clock
            segment_per_instrument : on | off ;        // default: onmax_segment_length     : int | unlimited ; // int >= 32
            Interface {
                enable             : port_name ; // default: ccm_en
                scan_en            : port_name ; // default: scan_en
                scan_in            : port_name ; // default: scan_in
                scan_out           : port_name ; // default: scan_out
            }
            Connections {
                scan_en                   : port_pin_name ;// default: OptionalDftSignal(scan_en)
                controller_chain_enable   : port_pin_name ;// default : OptionalDftSignal(controller_chain_mode)
                controller_chain_scan_in  : port_pin_name ;// default: control_chain_%s_scan_in
                controller_chain_scan_out : port_pin_name ;// default: control_chain_%s_scan_out
            }
        }
    }
}

******DftSpecification/EDT/Connections******
DftSpecification(module_name,id) {
    EDT {
        Connections {
            edt_clock       : port_pin_name | DftSignal(edt_clock) | OptionalDftSignal(edt_clock);
            edt_slave_clock : port_pin_name ; // default: edt_slave_clock
            edt_update      : port_pin_name | DftSignal(edt_update) | OptionalDftSignal(edt_update);
            edt_reset       : port_pin_name ; // default: edt_reset
            StaticExternalControls {
            }
        }
    }
}
****DftSpecification/EDT/Connections/StaticExternalControls****
DftSpecification(module_name,id) {
    EDT {
        Connections {
            StaticExternalControls {
                edt_bypass                 : port_pin_name | 0 | 1 ;
                edt_single_bypass_chain    : port_pin_name | 0 | 1 ;
                edt_configuration          : port_pin_name | 0 | 1 ;
                edt_low_power_shift_enable : port_pin_name | 0 | 1 ;
            }
        }
    }
}

******DftSpecification/EDT/Controller******
DftSpecification(module_name,id) {
    EDT {
        Controller(id) {
            ijtag_host_interface                 : ijtag_leaf_node_name | none ;
            longest_chain_range                  : min, max ;
            scan_chain_count                     : int ;
            input_channel_count                  : int ;
            output_channel_count                 : int ;
            separate_control_data_channels       : on | off ;
            parent_instance                      : name ;
            leaf_instance_name                   : name ;
            connect_bscan_segments_to_lsb_chains : on | off | auto ;
            edt_bypass_change_edge_clock         : prefer_edt_clock | scan_clock ;
            chain_output_masking_disable         : on | off ;
            LVxMode {
                present                          : on | off | auto ;
                enable_one_chain                 : on | off ;
            }
            Interface {
            }
            BypassChains {
            }
            Compactor {
            }
            Clocking {
            }
            HighCompressionConfiguration {
            }
            ShiftPowerOptions {
            }
            LogicBistOptions {
            }
            Connections {
            }
            Decompressor {
            }
        }
    }
}
****DftSpecification/EDT/Controller/Interface****
DftSpecification(module_name,id) {
    EDT {
        Controller(id) {
            Interface {
                edt_clock                        : port_name ; // default: edt_clock
                edt_slave_clock                  : port_name ; // default: edt_slave_clock
                edt_update                       : port_name ; // default: edt_update
                edt_reset                        : port_name ; // default: edt_reset
                edt_channels_in_bus              : bus_name ;  // default: edt_channels_in
                edt_channels_out_bus             : bus_name ;  // default: edt_channels_out
                edt_bypass_change_edge_clock     : port_name ; // default: edt_bypass_change_edge_clock
                IjtagScanInterface {
                    static_signals_driven        : always | as_needed // default: as_needed
                    tck                          : port_name; // default: ijtag_tck
                    reset                        : port_name; // default: ijtag_reset
                    select                       : port_name; // default: ijtag_sel
                    capture_en                   : port_name; // default: ijtag_ce
                    shift_en                     : port_name; // default: ijtag_se
                    update_en                    : port_name; // default: ijtag_ue
                    scan_in                      : port_name; // default: ijtag_si
                    scan_out                     : port_name; // default: ijtag_so
                }
                StaticExternalControls {
                }
                LogicBist {
                    reset                         : port_name; // default: lbist_reset
                    enable                        : port_name; // default: lbist_en
                    prpg_en                       : port_name; // default: lbist_prpg_en
                    misr_en                       : port_name; // default: misr_accumulate_en
                    low_power_shift_en            : port_name; // default: lbist_low_power_shift_en
                    self_test_en                  : port_name; // default: self_test_en
                    misr                          : port_name; // default: - (not created)
                }   
            }
        }  
    }
}
**DftSpecification/EDT/Controller/Interface/StaticExternalControls**
DftSpecification(module_name,id) {
    EDT {
        Controller(id) {
            Interface {
                StaticExternalControls {
                    edt_bypass                 : port_name ;// default: edt_bypass
                    edt_single_bypass_chain    : port_name ;// default: edt_single_bypass_chain
                    edt_configuration          : port_name ;// default: edt_configuration
                    edt_low_power_shift_enable : port_name ;// default: edt_low_power_shift_en
                }
            }
        }
    }
}
****DftSpecification/EDT/Controller/BypassChains****
DftSpecification(module_name,id) {
    EDT {
        Controller(id) {
            BypassChains {
                present                   : on | off ;
                bypass_chain_count        : int | auto ;
                single_bypass_chain       : on | off | auto ;
                BypassChain(id) { // legal: 1..maxposint
                    scan_chain_range_list : scan_chain_range, ... ;
                }
            }
        }
    }
}
****DftSpecification/EDT/Controller/Compactor****
DftSpecification(module_name,id) {
    EDT {
        Controller(id) {
            Compactor {
                type                               : xpress | basic ;
                pipeline_logic_levels_in_compactor : int | off ;
                change_edge_at_compactor_output    : any | leading_edge_of_edt_clock | trailing_edge_of_edt_clock ;
                CompactorConnection(id) {// legal: 1..maxposint
                    scan_chain_range_list          : scan_chain_range, ... ;
                }
            }
        }
    }
}
****DftSpecification/EDT/Controller/Clocking****
DftSpecification(module_name,id) {
    EDT {
        Controller(id) {
            Clocking {
                type           : edge | level ;
                lockup_cells   : on | off ;
                reset_signal   : auto | asynchronous | off | ijtag_reset ;
                reset_polarity : auto | active_low | active_high ;
            }
        }
    }
}
****DftSpecification/EDT/Controller/HighCompressionConfiguration****
DftSpecification(module_name,id) {
    EDT {
        Controller(id) {
            HighCompressionConfiguration {
                present              : on | off ;
                input_channel_count  : int ;
                output_channel_count : int ;
            }
        }
    }
}
****DftSpecification/EDT/Controller/ShiftPowerOptions****
DftSpecification(module_name,id) {
    EDT {
        Controller(id) {
            ShiftPowerOptions {
                present                            : on | off ;
                full_control                       : on | off ;
                min_switching_threshold_percentage : int ; // default: 15
            }
        }
    }
}
****DftSpecification/EDT/Controller/LogicBistOptions****
DftSpecification(module_name,id) {
    EDT {
        Controller(id) {
            LogicBistOptions {
                present                   : on | off | auto ;
                misr_input_ratio          : integer | auto ;
                chain_mask_register_ratio : integer ;   // default: 1
                prpg_seed                 : hex_value ; // default: 1
                ShiftPowerOptions {
                }
            }
        }
    }
}
**DftSpecification/EDT/Controller/LogicBistOptions/ShiftPowerOptions**
DftSpecification(module_name,id) {
    EDT {
        Controller(id) {
            LogicBistOptions {
                ShiftPowerOptions {
                    present            : off | on | auto;
                    default_operation  : enabled | disabled ;
                    SwitchingThresholdPercentage{
                    }
                }
            }
        }
    }
}
*DftSpecification/EDT/Controller/LogicBistOptions/ShiftPowerOptions/SwitchingThresholdPercentage*
DftSpecification(module_name,id) {
    EDT {
        Controller(id) {
            LogicBistOptions {
                ShiftPowerOptions {
                    SwitchingThresholdPercentage{
                        hardware_default : integer ; //default: 15
                    }
                }
            }
        }
    }
}
****DftSpecification/EDT/Controller/Connections****
DftSpecification(module_name,id) {
    EDT {
        Controller(id) {
            Connections {
                edt_clock                      : port_pin_name | DftSignal(edt_clock) | OptionalDftSignal(edt_clock) ;
                edt_slave_clock                : port_pin_name ; // default: edt_slave_clock
                edt_update                     : port_pin_name | DftSignal(edt_update) | OptionalDftSignal(edt_update) ;
                edt_reset                      : port_pin_name ;
                ssh_chain_group                : chain_group_id ;
                mode_enables                   : port_pin_name | DftSignal(scan_mode_dft_signal), ... ;
                edt_bypass_change_edge_clock   : occ_spec ;
                StaticExternalControls {
                }
                EdtChannelsIn(range) {
                }
                EdtChannelsOut(range) {
                }
            }
        }
    }
}
**DftSpecification/EDT/Controller/Connections/StaticExternalControls**
DftSpecification(module_name,id) {
    EDT {
        Controller(id) {
            Connections {
                StaticExternalControls {
                    edt_bypass                 : port_pin_name | 0 | 1 ;
                    edt_single_bypass_chain    : port_pin_name | 0 | 1 ;
                    edt_configuration          : port_pin_name | 0 | 1 ;
                    edt_low_power_shift_enable : port_pin_name | 0 | 1 ;
                }
            }
        }
    }
}
**DftSpecification/EDT/Controller/Connections/EdtChannelsIn**
DftSpecification(module_name,id) {
    EDT {
        Controller(id) {
            Connections {
                EdtChannelsIn(range) {
                    port_pin_name      : port_pin_name ;
                    pipeline_clock     : port_pin_name | DftSignal(edt_clock) | DftSignal(shift_capture_clock) ;// default: Inherited from Connections/edt_clock
                    insert_lockup_cell : auto | off;
                    lockup_cell_type   : latch | dff;
                    PipelineStage {
                    }
                }
            }
        }
    }
}
*DftSpecification/EDT/Controller/Connections/EdtChannelsIn/PipelineStage*
DftSpecification(module_name,id) {
    EDT {
        Controller(id) {
            Connections {
                EdtChannelsIn(id) {
                    PipelineStage {
                        parent_instance    : instance_name ;
                        leaf_instance_name : instance_name ;
                        pipeline_clock     : port_pin_name ;// default: Inherited from EdtChannelsIn value
                        insert_lockup_cell : auto | off;    // default: Inherited from EdtChannelsIn value
                        lockup_cell_type   : latch | dff;   // default: Inherited from EdtChannelsIn value
                    }
                }
            }
        }
    }
}  
**DftSpecification/EDT/Controller/Connections/EdtChannelsOut**
DftSpecification(module_name,id) {
    EDT {
        Controller(id) {
            Connections {
                EdtChannelsOut(range) {
                    port_pin_name : port_pin_name ;
                    pipeline_clock : port_pin_name ; // default: edt_clock
                    insert_lockup_cell : auto | off;
                    lockup_cell_type : latch | dff;
                    PipelineStage {
                    }
                }
            }
        }
    }
}
*DftSpecification/EDT/Controller/Connections/EdtChannelsOut/PipelineStage*
DftSpecification(module_name,id) {
    EDT {
        Controller(id) {
            Connections {
                EdtChannelsOut(id) {
                    PipelineStage {
                       parent_instance    : instance_name ;
                       leaf_instance_name : instance_name ;
                       pipeline_clock     : port_pin_name ;//default: Inherited from EdtChannelsOut value
                       insert_lockup_cell : auto | off;    //default: Inherited from EdtChannelsOut value
                       lockup_cell_type   : latch | dff;   //default: Inherited from EdtChannelsOut value
                    }
                }
            }
        }
    }
}
****DftSpecification/EDT/Controller/Decompressor****
DftSpecification(module_name,id) {
    EDT {
        Controller(id) {
            Decompressor {
                segments               : int ; // default: auto
                max_chains_per_segment : int ; // default: 150
            }
        }
    }
}
 

 






