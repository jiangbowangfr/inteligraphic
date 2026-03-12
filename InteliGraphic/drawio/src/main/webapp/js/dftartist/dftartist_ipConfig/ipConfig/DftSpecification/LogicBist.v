
********DftSpecification/LogicBist********
DftSpecification (module_name,id) {
    LogicBist {
        ijtag_host_interface : name ; // default: tied_scan_interface
        Controller(id) {
        }
        NcpIndexDecoder {
        }
    }
}

******DftSpecification/LogicBist/Controller******
DftSpecification (module_name,id) {
    LogicBist {
        Controller(id) {
            parent_instance                         : name ;
            leaf_instance_name                      : name ;
            burn_in                                 : on | off ;
            extest_lbist                            : on | off | auto ;
            ext_mode_edt_present                    : on | off | auto ;
            associated_edt                          : edt_spec ... // repeatable
            use_ssn_bus_clock_as_test_clock_bypass  : on | off | auto ;
            self_test                               : on | off ;
            pre_post_shift_dead_cycles              : int ; // default: 8
            scan_signals_bypass                     : on | off ; // default: on
            DesignInstance (instance_name) {
                associated_edt                      : edt_spec ... // repeatable
            }
            CapturePerCycleShiftOnlyPatternCount {
            }
            ControllerChain {
            }
            SingleChainForDiagnosis {
            }
            ShiftCycles {
            }
            CaptureCycles {
            }
            PatternCount {
            }
            ChainTestPatternCount {
            }
            WarmupPatternCount {
            }
            AsyncSetResetPatternCount {
            }
            NcpOptions {
            }
            PostScanActivityControl {
            }
            Interface {
            }
            Connections {
            }
            SetLoadUnloadTimingOptions {
            }
        }
    }
}
****DftSpecification/LogicBist/Controller/CapturePerCycleShiftOnlyPatternCount****
DftSpecification (module_name,id) {
    LogicBist {
        Controller(id) {
            CapturePerCycleShiftOnlyPatternCount {
                max : <int> ;
            }
        }
    }
}
****DftSpecification/LogicBist/Controller/ControllerChain****
DftSpecification (module_name,id) {
    LogicBist {
        Controller(id) {
            ControllerChain {
                present                 : on | off ;
                clock                   : enum ; // legal: tck | edt_clock
                segment_per_instrument  : on | off ;
                max_segment_length      : int | unlimited; // int >= 32
                async_set_reset_gating  : always_on | load_unload_only ;
            }
        }
    }
}
****DftSpecification/LogicBist/Controller/SingleChainForDiagnosis****
DftSpecification (module_name,id) {
    LogicBist {
        Controller(id) {
            SingleChainForDiagnosis {
                present             : on | off ;
                parent_instance     : name ;
                leaf_instance_name  : name ;
                skip_edt_blocks     : on | off ;
            }
        }
    }
}
****DftSpecification/LogicBist/Controller/ShiftCycles****
DftSpecification (module_name,id) {
    LogicBist {
        Controller(id) {
            ShiftCycles {
                counter_resolution  : byte | bit ;
                max                 : int ;
                hardware_default    : int ; // default: max
            }
        }
    } 
}
****DftSpecification/LogicBist/Controller/CaptureCycles****
DftSpecification (module_name,id) {
    LogicBist {
        Controller(id) {
            CaptureCycles {
                max                 : int ;
                hardware_default    : int ; // default: max
            }
        }
    } 
}
****DftSpecification/LogicBist/Controller/PatternCount****
DftSpecification (module_name,id) {
    LogicBist {
        Controller(id) {
            PatternCount {
                max                 : int ;
                hardware_default    : int ; // default: max
            }
        }
    } 
}
****DftSpecification/LogicBist/Controller/ChainTestPatternCount****
DftSpecification (module_name,id) {
    LogicBist {
        Controller(id) {
            ChainTestPatternCount {
                max                 : int ;// default: 0
                hardware_default    : int ; // default: 0
            }
        }
    } 
}
****DftSpecification/LogicBist/Controller/WarmupPatternCount****
DftSpecification (module_name,id) {
    LogicBist {
        Controller(id) {
            WarmupPatternCount {
                max                 : int ;// default: 255
                hardware_default    : int ; // default: 0
            }
        }
    } 
}
****DftSpecification/LogicBist/Controller/NcpOptions****
DftSpecification (module_name,id) {
    LogicBist {
        Controller(id) {
            NcpOptions { // following two properties are mutually exclusive
                count                           : int ; // default: 1
                percentage_of_patterns_per_ncp  : integer, ... ;
            }
        }      
    }
}
****DftSpecification/LogicBist/Controller/PostScanActivityControl****
DftSpecification (module_name, id) {
    LogicBist {
        Controller(id) {
            PostScanActivityControl {
                activity_type           : auto | none | cooldown | unlimited;
                CoolDownPatternCount {
                    max                 : int; // default: 255
                    hardware_default    : int; // default: 0
                }
            }
        }
    }
}
****DftSpecification/LogicBist/Controller/Interface****
DftSpecification (module_name, id) {
    LogicBist {
        Controller(id) {
            Interface {
                IjtagScanInterface {
                    tck             : port_name; // default: ijtag_tck
                    reset           : port_name; // default: ijtag_reset
                    select          : port_name; // default: ijtag_sel
                    capture_en      : port_name; // default: ijtag_ce
                    shift_en        : port_name; // default: ijtag_se
                    update_en       : port_name; // default: ijtag_ue
                    scan_in         : port_name; // default: ijtag_si
                    scan_out        : port_name; // default: ijtag_so
                }
                ControllerChain {
                    enable          : port_name; // default: ccm_en
                    scan_in         : port_name; // default: ccm_scan_in
                    scan_out        : port_name; // default: ccm_scan_out
                    scan_en         : port_name; // default: ccm_scan_en
                }
                test_clock          : port_name; // default: test_clock
                test_clock_out      : port_name; // default: lbist_test_clock_out
                edt_update          : port_name; // default: [edt_update_in|edt_update_out]
                shift_clock_src     : port_name; // default: shift_clock_src
                clock_out           : port_name; // default: edt_lbist_clock
                reset_out           : port_name; // default: lbist_reset
                enable_out          : port_name; // default: lbist_en
                done                : port_name; // default: -
                prpg_en             : port_name; // default: lbist_prpg_en
                misr_en             : port_name; // default: misr_accumulate_en
                ijtag_select_out    : port_name; // default: edt_sib_en
                scan_en             : port_name; // default: scan_en[_in|_out]
                async_set_reset_en  : port_name; // default: lbist_async_set_reset_en
                self_test_en        : port_name; // default: self_test_en
                cooldown_counter    : port_name; // default: -
                warmup_counter      : port_name; // default: -
                ext_lbist_en        : port_name; // default: ext_lbist_en
            }
        }
    }
}
****DftSpecification/LogicBist/Controller/Connections****
DftSpecification (module_name,id) {
    LogicBist {
        Controller {
            Connections {
                edt_clock                   : port_pin_name ;// default: OptionalDftSignal(edt_clock)
                edt_update_in               : port_pin_name ;// default: OptionalDftSignal(edt_update)
                shift_clock_src             : port_pin_name ;
                scan_en_in                  : port_pin_name ;// default: OptionalDftSignal(scan_en)
                controller_chain_enable     : port_pin_name ;
                controller_chain_scan_in    : port_pin_name ;
                controller_chain_scan_out   : port_pin_name ;// default: (none)
                ext_lbist_en                : port_pin_name ;// default: DftSignalOrTiedLow(ext_lbist_en)
                done                        : port_pin_name, ... ;
            }
        }
    }
}
****DftSpecification/LogicBist/Controller/AsyncSetResetPatternCount****
DftSpecification (module_name,id) {
    LogicBist {
        Controller(id) {
            AsyncSetResetPatternCount {
                max                 : int ; // default: 0
                hardware_default    : int ; // default: 0
            }
        }
    }
}
****DftSpecification/LogicBist/Controller/SetLoadUnloadTimingOptions****
DftSpecification (module_name,id) {
    LogicBist {
        Controller(id) {
            SetLoadUnloadTimingOptions {
                max_cycles_per_signal               : 2 | 4 | 8; // default: 8
                HardwareDefaults {
                    scan_en_setup_extra_cycles      : int; // default: 0
                    scan_en_hold_extra_cycles       : int; // default: 0
                    edt_update_setup_extra_cycles   : int; // default: 0
                    edt_update_hold_extra_cycles    : int; // default: 0
                    prpg_en_setup_extra_cycles      : int; // default: 0
                    prpg_en_hold_extra_cycles       : int; // default: 0
                    misr_en_setup_extra_cycles      : int; // default: 0
                    misr_en_hold_extra_cycles       : int; // default: 0
                }
            }
        }
    }
}

******DftSpecification/LogicBist/NcpIndexDecoder******
DftSpecification (module_name,id) {
    LogicBist {
        NcpIndexDecoder {
            parent_instance             : instance_name ;
            leaf_instance_name          : name ;
            extest_lbist                : on | off | auto ;
            Interface {
                ncp_index               : port_name ; // default: ncp_index
                clock_sequence          : port_name ; // default: occ%d_clock_sequence
                ext_ltest_en            : port_name ; // default: ext_ltest_en
                ext_clock_sequence      : port_name ;// default: ext_occ%d_clock_sequence
            }
            DesignInstance (instance_name){ 
            }
            Connections {
                ncp_index               : port_pin_constant_name, ... ;
                ext_ltest_en            : pin_port_name ;// default: DftSignalOrTiedLow(ext_ltest_en)
                ExtestClockSequence {
                    Occ(occ_spec)       : pin_port_constant_name ;
                }
            }
            Ncp(id) {
                cycle(index)            : occ_spec, ... ; // repeatable
            }
        }
    }
}

