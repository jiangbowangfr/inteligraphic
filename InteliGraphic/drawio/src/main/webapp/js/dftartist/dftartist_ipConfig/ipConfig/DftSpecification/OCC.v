********DftSpecification/OCC********
DftSpecification(module_name,id) {
    OCC {
        ijtag_host_interface            : host_name | none ;
        capture_trigger                 : auto | shift_en | capture_en ;
        static_clock_control            : auto | off | internal | external | both ;
        force_clock_gater_te_tied_off   : on | off ;
        capture_window_size             : integer ; // default: 3
        fast_capture_staggered_groups   : integer ; // 1|2|4|8; default: 1
        internal_clock_gater            : on | off | auto ;
        shift_only_mode                 : on | off | auto ;
        kill_clock_mode                 : on | off | auto ;
        include_clocks_in_icl_model     : on | off | auto ;
        leaf_instance_name              : instance_name ;
        upstream_parent_occ             : auto | off | require | allow ;// "require" creates a child-mode OCC
        parent_mode                     : on | off ;
        independent_divided_clocks      : on | off ;
        Interface {
        }
        Connections {
        }
        Controller(id) {
        }
    }
}

******DftSpecification/OCC/Interface******
DftSpecification(module_name,id) {
    OCC {
        Interface {
            scan_en                         : port_name ; // default: scan_en
            capture_en                      : port_name ; // default: capture_en
            slow_clock                      : port_name ; // default: slow_clock
            fast_clock                      : port_name ; // default: fast_clock
            clock                           : port_name ; // default: clock
            clock_out                       : port_name ; // default: clock_out
            clock_en_out                    : port_name ; // default: clock_en_out
            scan_in                         : port_name ; // default: scan_in
            scan_out                        : port_name ; // default: scan_out
            clock_sequence                  : port_name ; // default: clock_sequence[%d]
            pulse_to_align                  : port_name ; // default: pulse_to_align[%d]
            fast_capture_staggered_group    : port_name ;// default: fast_capture_staggered_group[%d]
            IjtagScanInterface {
            }
            StaticExternalControls {
            }
        }
    }
}
****DftSpecification/OCC/Interface/IjtagScanInterface****
DftSpecification(module_name,id) {
    OCC {
        Interface {
            IjtagScanInterface {
                tck             : port_name ; // default: ijtag_tck
                reset           : port_name ; // default: ijtag_reset
                select          : port_name ; // default: ijtag_sel
                capture_en      : port_name ; // default: ijtag_ce
                shift_en        : port_name ; // default: ijtag_se
                update_en       : port_name ; // default: ijtag_ue
                scan_in         : port_name ; // default: ijtag_si
                scan_out        : port_name ; // default: ijtag_so
                reset_polarity  : active_polarity ; // legal: active_high,active_low
            }
        }
    }
}
****DftSpecification/OCC/Interface/StaticExternalControls****
DftSpecification(module_name,id) {
    OCC {
        Interface {
            StaticExternalControls {
                test_mode                       : port_name ; //test_mode
                fast_capture_mode               : port_name ; //fast_capture_mode
                parent_mode                     : port_name ; //parent_mode
                capture_cycle_width             : port_name ; //capture_cycle_width[%d]
                static_clock_control_mode       : port_name ; //static_clock_control_mode
                shift_only_mode                 : port_name ; //shift_only_mode
                kill_clock_en                   : port_name ; //kill_clock_en
                independent_divided_clocks_en   : port_name ; //independent_divided_clocks_en
            }
        }
    }
}

******DftSpecification/OCC/Connections******
DftSpecification(module_name,id) {
    OCC {
        Connections {
            scan_en                         : port_pin_name ;// Valid: DftSignal(scan_en) // OptionalDftSignal(scan_en)
            capture_en                      : port_pin_name ;// default: 0
            slow_clock                      : port_pin_name ;// Valid: DftSignal(shift_capture_clock) // OptionalDftSignal(shift_capture_clock)
            clock_sequence                  : port_pin_constant_name, ... ;// default: 0
            pulse_to_align                  : port_pin_constant_name, ... ;// default: 0
            fast_capture_staggered_group    : port_pin_constant_name, ...;// default: 0
            StaticExternalControls {
            }
        }
    }
}
****DftSpecification/OCC/Connections/StaticExternalControls****
DftSpecification(module_name,id) {
    OCC {
         Connections {
            StaticExternalControls {
                test_mode                       : port_pin_name ; // Valid: 0 1
                fast_capture_mode               : port_pin_name ; // Valid: 0 1
                parent_mode                     : port_pin_name ; // Valid: 0 1
                capture_cycle_width             : port_pin_name ; // Valid: 0 1, ... 
                static_clock_control_mode       : port_pin_constant_name ;// Valid: 0 1
                shift_only_mode                 : port_name ;// default: DftSignalOrTiedLow(ext_ltest_en)
                kill_clock_en                   : port_name ;// default: DftSignal(occ_kill_clock_en)
                independent_divided_clocks_en   : port_pin_constant_name | 0  | 1 ;//default: 0
            }
        }
    }
}

******DftSpecification/OCC/Controller******
DftSpecification(module_name,id) {
    OCC {
        Controller(id) {
            clock_intercept_nodes       : port_pin_clock_label_name, … ;
            clock_port_count            : integer | auto ; // default: auto
            FrequencyRatio( 2 | 4 | 8 ) {
                clock_intercept_nodes   : port_pin_clock_label_name, … ;
                clock_port_count        : integer | auto ; // default: auto
            }
            clock_enable_pin            : pin_name, … ;
            clock_enable_pin_polarity   : active_high | active_low | auto ;
            parent_instance             : instance_name ;
            capture_window_size         : integer ; // default: 3
            leaf_instance_name          : instance_name ;
            internal_clock_gater        : on | off | auto ;
            shift_only_mode             : on | off | auto ;
            kill_clock_mode             : on | off | auto ;
            upstream_parent_occ         : auto | off | require | allow ;// "require" creates a child-mode OCC
            parent_mode                 : on | off ;
            independent_divided_clocks  : on | off ;
            Connections {
            }
        }
    }
}
****DftSpecification/OCC/Controller/Connections****
DftSpecification(module_name,id) {
    OCC {
        Controller(id) {
            Connections {
                scan_en                         : port_pin_name ; // DftSignal(scan_en)// OptionalDftSignal(scan_en)
                capture_en                      : port_pin_name ; // default: 0
                slow_clock                      : port_pin_clock_label_name ;// DftSignal(shift_capture_clock)// OptionalDftSignal(shift_capture_clock)
                fast_clocks                     : port_pin_clock_label_name, ... ;
                FrequencyRatio( 2 | 4 | 8 ) {
                    fast_clocks                 : port_pin_clock_label_name, ... ;
                }
                clock                           : port_pin_clock_label_name ;
                clock_sequence                  : port_pin_constant_name, ... ; // default: 0
                pulse_to_align                  : port_pin_constant_name, ... ; // default: 0
                fast_capture_staggered_group    : port_pin_constant_name, ...;
                StaticExternalControls {
                }
            }
        }
    }
}
**DftSpecification/OCC/Controller/Connections/StaticExternalControls**
DftSpecification(module_name,id) {
    OCC {
        Controller(id) {
            Connections {
                StaticExternalControls {
                    test_mode                       : port_pin_name | 0 | 1 ;
                    fast_capture_mode               : port_pin_name | 0 | 1 ;
                    parent_mode                     : port_pin_name | 0 | 1 ;
                    capture_cycle_width             : port_pin_name | 0 | 1, ... ;
                    static_clock_control_mode       : port_pin_constant_name | 0 | 1 ;
                    shift_only_mode                 : port_name;// default: DftSignalOrTiedLow(ext_ltest_en)
                    kill_clock_en                   : port_name ;// default: DftSignal(occ_kill_clock_en)
                    independent_divided_clocks_en   : port_pin_constant_name | 0  | 1 ;
                }
            }
        }
    }
}