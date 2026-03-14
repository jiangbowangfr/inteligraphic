
********DftSpecification/LpctType3********
DftSpecification(module_name,id) {
    LpctType3 {
        scan_enable_condition   : on | off ;
        reset_condition         : on | off ;
        Interface {
        }
        Connections {
        }
        Controller {
        }
    }
}

******DftSpecification/LpctType3/Interface******
DftSpecification(module_name,id) {
    LpctType3 {
        Interface {
            clock                   : port_name ; // default: lpct_clock
            clock_mux_select        : port_name ; // default: lpct_clock_mux_select
            capture_enable          : port_name ; // default: lpct_capture_en
            shift_enable            : port_name ; // default: lpct_shift_en
            shift_clock             : port_name ; // default: lpct_shift_clock
            reset                   : port_name ; // default: lpct_reset
            scan_enable             : port_name ; // default: lpct_scan_en
            data_in                 : port_name ; // default: lpct_data_in
            test_mode               : port_name ; // default: lpct_test_mode
            reset_out               : port_name ; // default: lpct_reset_out
            reset_polarity          : active_high | active_low ;
            test_end                : port_name ; // default: lpct_test_end
            test_active             : port_name ; // default: lpct_test_active
            reset_condition         : port_name ; // default: lpct_reset_condition
            scan_enable_condition   : port_name ; // default: lpct_scan_en_condition
        }
        Connections {
        }
        Controller {
        }
    }
}

******DftSpecification/LpctType3/Connections******
DftSpecification(module_name,id) {
    LpctType3 {
        Interface {
        }
        Connections {
            clock                   : port_pin_name ; // default: lpct_clock
            reset                   : port_pin_name ; // default: lpct_reset
            scan_enable             : port_pin_name ;
            data_in                 : port_pin_name ; // default: lpct_data_in
            test_mode               : port_pin_name ; // default: lpct_test_mode
            reset_out               : port_pin_name, … ;
            test_end                : port_pin_name ;
            test_active             : port_pin_name ;
            reset_condition         : port_pin_name ; // default: 1
            scan_enable_condition   : port_pin_name ; // default: 1
            ThirdPartyOCC {
            }
        }
        Controller {
        }
    }
}
****DftSpecification/LpctType3/Connections/ThirdPartyOCC****
DftSpecification(module_name,id) {
    LpctType3 {
        Interface {
        }
        Connections {
            ThirdPartyOCC {
                clock_mux_select    : port_pin_name ; // default:
                // lpct_clock_mux_select
                capture_enable      : port_pin_name ; // default: lpct_capture_en
                shift_enable        : port_pin_name ; // default: lpct_shift_en
                shift_clock         : port_pin_name ; // default: lpct_shift_clock
            }
        }      
        Controller {
        }
    }
}

******DftSpecification/LpctType3/Controller******
DftSpecification(module_name,id) {
    LpctType3 {
        Interface {
        }
        Controller {
            max_shift_cycles    : int | auto ;
            max_capture_cycles  : int ;
            load_unload_cycles  : count1, count2 ;
            max_scan_patterns   : int ;
            max_chain_patterns  : int ;
            shift_control_type  : enable | clock | none ;
            TestModeDetect {
            }
            parent_instance     : instance ;
            leaf_instance_name  : instance ;
        }
    }
}
****DftSpecification/LpctType3/Controller/TestModeDetect****
DftSpecification(module_name,id) {
    LpctType3 {
        Interface {
        }
        Connections {
        }
        Controller {
            TestModeDetect {
                type            : enum ; // legal: signal sequence
                input_sequence  : binary_seq, cycle_count ;
            }
        }
    }
}