********DftSpecification/IjtagNetwork********
DftSpecification(module_name,id){
    IjtagNetwork{
        ImplementationOptions {
        }
        DataInPorts {
        }
        DataOutPorts {
        }
        HostScanInterface (id) {            // repeatable
            Interface {                     // *DefSpec
            }
            Pipeline(id){                   // repeatable
            }
            DesignInstance(instance_name){  // repeatable
            }
            ScanMux(id) {                   // repeatable
            }
            Sib(id) {                       // repeatable
            }
            Tdr(id){                        // repeatable
            }
            Tap(id){                        // repeatable
            }
            TwoPinSerialPort(id){           // repeatable
            }
            STapPipeline(id){  // repeatable
            }
            STap(id){          // repeatable
            }
            SecondaryHostScanInterface(id){ // repeatable
            }
        }
    }
}

******DftSpecification/IjtagNetwork/ImplementationOptions******
DftSpecification(module_name,id){
    IjtagNetwork {
        ImplementationOptions {
            scan_path_retiming : latch | flop ;
        }
    }
}

******DftSpecification/IjtagNetwork/DataInPorts******
DftSpecification(module_name,id){
    IjtagNetwork {
        DataInPorts {
            count             : integer ;         // default: auto
            port_naming       : port_naming,... ; // default: ijtag_data_out[%d]
            multiplexing      : on | off | auto ;
            Connection(range) : pin_name ;        // repeatable
        }
    }
}

******DftSpecification/IjtagNetwork/DataOutPorts******
DftSpecification(module_name,id){
    IjtagNetwork {
        DataOutPorts {
            count             : integer ;         // default: auto
            port_naming       : port_naming,... ; // default: ijtag_data_out[%d]
            Connection(range) : pin_name ;        // repeatable
        }
    }
}

****DftSpecification/IjtagNetwork/HostScanInterface/Interface****
DftSpecification(module_name,id){
    IjtagNetwork {
        HostScanInterface(id) {
            Interface{
                design_instance  : instance_name ;
                scan_interface   : id ;
                tck              : port_pin_name ; // default: ijtag_tck
                reset            : port_pin_name ; // default: ijtag_reset *DefSpec
                select           : port_pin_name ; // default: ijtag_sel *DefSpec
                shift_en         : port_pin_name ; // default: ijtag_se *DefSpec
                capture_en       : port_pin_name ; // default: ijtag_ce *DefSpec
                update_en        : port_pin_name ; // default: ijtag_ue *DefSpec
                scan_in          : port_pin_name ; // default: ijtag_si *DefSpec
                scan_out         : port_pin_name ; // default: ijtag_so *DefSpec
                reset_polarity   : active_high | active_low | auto ;
                trst             : port_pin_name ; // default: trst *DefSpec
                tms              : port_pin_name ; // default: tms *DefSpec
                tdi              : port_pin_name ; // default: tdi *DefSpec
                tdi_local        : port_pin_name ; // default: ""
                tdo              : port_pin_name ; // default: tdo *DefSpec
                tdo_daisy_in     : port_pin_name ; // default: ""
                tdo_daisy_out    : port_pin_name ; // default: ""
                tdo_en_daisy_out : port_pin_name ; // default: ""
                tdo_en           : port_pin_name ; // default: tdo_en
                tdo_en_polarity  : active_high | active_low | auto ;
                SacrificialPads {
                    parent_instance    : instance_name;
                    leaf_instance_name : instance_name;
                    enable             : port_pin_name; // default: enable_probe
                    tck                : port_pin_name; // default: tck_probe
                    trst               : port_pin_name; // default: trst_probe
                    tms                : port_pin_name; // default: tms_probe
                    tdi                : port_pin_name; // default: tdi_probe
                    tdo                : port_pin_name; // default: tdo_probe
                    tdo_en             : port_pin_name; // default: tdo_en_probe
                    tdo_en_polarity    : active_high |active_low | auto;
                }
                spio                             : port_name ; // default: spio *DefSpec
                spclk                            : port_pin_name ; // default: spclk *DefSpec
                daisy_chain_with_existing_client : on | off | auto ;
                ComplianceEnable {
                    active_high_enables   : port_pin_name, ... ;
                    active_low_enables    : port_pin_name, ... ;
                    parent_instance       : instance_name ;
                    leaf_instance_name    : leaf_instance_name ;
                }
            }
        }
    }
}
****DftSpecification/IjtagNetwork/HostScanInterface/DesignInstance****
IjtagNetwork {
    HostScanInterface(id) {
        DesignInstance(instance_name) {
            scan_interface : scan_interface_name ;
        }
    }
}
****DftSpecification/IjtagNetwork/HostScanInterface/Pipeline****
DftSpecification(module_name,id) {
    IjtagNetwork {
        HostScanInterface(id) {
            Pipeline(id) {
                si_retiming     : on | off ; // default: off
                so_retiming     : on | off ; // default: on
                Interface {
                    tck         : port_name ; // default: ijtag_tck
                    scan_in     : port_name ; // default: ijtag_si
                    scan_out    : port_name ; // default: ijtag_so
                    shift_en    : port_name ; // default: ijtag_se
                    capture_en  : port_name ; // default: ijtag_ce
                    tdo_en      : port_name ; // default: tdo_en
                    from_tdo_en : port_name ; // default: from_tdo_en
                }
                parent_instance    : instance_name ;
                leaf_instance_name : leaf_instance_name ;
                length             : int | auto ; // default: auto
                capture_value      : binary | unused ; // default: unused
                Connections {
                    shift_ir_dr_en   : Tap(id) | port_pin_name ; //default: ""
                    capture_ir_dr_en : Tap(id) | port_pin_name ; //default: ""
                    from_tdo_en      : Tap(id) | port_pin_name | 0 | 1 ;
                    //default: ""
                }
                Attributes {
                    attribute_name : attribute_value ;
                }
                keep_active_during_scan_test : on | off | auto ;
            }
        }
    }
}
****DftSpecification/IjtagNetwork/HostScanInterface/ScanMux****
IjtagNetwork {
    HostScanInterface(id) {
        ScanMux(id) {
            Interface {
            }
            parent_instance    : instance_name ;
            leaf_instance_name : leaf_instance_name ;
            select             : source ;
            Attributes {
                attribute_name : attribute_value ;
            }
            Input (integer) { // legal: 0 1
                keep_active_during_scan_test : on | off | auto ;
                Pipeline(id) { // repeatable
                }
                Sib(id) { // repeatable
                }
                Tap(id) { // repeatable
                }
                Tdr(id) { // repeatable
                }
                ScanMux(id) { // repeatable
                }
                DesignInstance(instance_name) { // repeatable
                }
                SecondaryHostScanInterface(id){ // repeatable
                }
            }
        }
    }
}
**DftSpecification/IjtagNetwork/HostScanInterface/ScanMux/Interface**
IjtagNetwork {
    HostScanInterface on page 4011(id) {
        ScanMux(id) {
            Interface {
                select       : port_name ; // default: mux_select
                input0       : port_name ; // default: mux_in0
                input1       : port_name ; // default: mux_in1
                output       : port_name ; // default: mux_out
                enable_in    : port_name ; // default: enable_in
                enable_out0  : port_name ; // default: enable_out0
                enable_out1  : port_name ; // default: enable_out1
                tms          : port_name ; // default: tms
                to_tms0      : port_name ; // default: to_tms0
                to_tms1      : port_name ; // default: to_tms1
                tdo_en       : port_name ; // default: tdo_en
                from_tdo_en0 : port_name ; // default: from_tdo_en0
                from_tdo_en1 : port_name ; // default: from_tdo_en1
            }
        }
    }
}
****DftSpecification/IjtagNetwork/HostScanInterface/SecondaryHostScanInterface****
DftSpecification(module_name,id) {
    IjtagNetwork {
        HostScanInterface(id) {
            SecondaryHostScanInterface(id) {
                to_scan_in        : port_pin_name ; //def: %s_ijtag_to_si   *DefSpec
                from_scan_out     : port_pin_name ; //def: %s_ijtag_from_so *DefSpec
                to_select         : port_pin_name ; //def: %s_ijtag_to_sel  *DefSpec
                to_shift_en       : port_pin_name ; //def: %s_ijtag_to_se   *DefSpec
                to_capture_en     : port_pin_name ; //def: %s_ijtag_to_ce   *DefSpec
                to_update_en      : port_pin_name ; //def: %s_ijtag_to_ue    *DefSpec
                to_reset          : port_pin_name ; //def: %s_ijtag_to_reset *DefSpec
                to_reset_polarity : active_low | active_high ;               *DefSpec
                to_tck            : port_pin_name ; //def: %s_ijtag_to_tck   *DefSpec
                to_tdi            : port_pin_name ; //def: %s_to_tdi         *DefSpec
                from_tdo          : port_pin_name ; //def: %s_from_tdo       *DefSpec
                from_tdo_en       : port_pin_name ; //def: %s_from_tdo_en    *DefSpec
                to_tms            : port_pin_name ; //def: %s_to_tms         *DefSpec
                to_trst           : port_pin_name ; //def: %s_to_trst        *DefSpec
            }
       }
    }
}
****DftSpecification/IjtagNetwork/HostScanInterface/Sib****
DftSpecification(module_name,id) {
    IjtagNetwork {
        HostScanInterface(id) {
            Sib(id) {
                Interface{
                }
                Connections {
                    clock_sequence               : port_pin_constant_name, ... ; // default: 0
                }
                provide_full_host_scan_interface : auto | on | off ;
                to_scan_in_feedthrough           : auto | none | buffer | pipeline;
                // *DefSpec on page 4820
                parent_instance                  : instance_name ;
                leaf_instance_name               : leaf_instance_name ;
                keep_active_during_scan_test     : on | off | auto ;
                capture_value                    : 0 | 1 | self ;
                so_retiming                      : on | off ;
                Attributes {
                    attribute_name               : attribute_value ;
                }
                Pipeline(id) { // repeatable
                }
                Sib(id) { // repeatable
                }
                Tdr(id) { // repeatable
                }
                ScanMux(id) { // repeatable
                }
                DesignInstance(instance_name) { // repeatable
                }
                SecondaryHostScanInterface(id){ // repeatable
                }
            }
        }
    }
}
**DftSpecification/IjtagNetwork/HostScanInterface/Sib/Interface**
DftSpecification(module_name,id) {
    IjtagNetwork {
        HostScanInterface(id) {
            Sib(id) {
                Interface {
                    Client {
                        select         : port_name ; // default: ijtag_sel
                        tck            : port_name ; // default: ijtag_tck
                        scan_in        : port_name ; // default: ijtag_si
                        scan_out       : port_name ; // default: ijtag_so
                        reset          : port_name ; // default: ijtag_reset
                        reset_polarity : active_low | active_high ;
                        shift_en       : port_name ; // default: ijtag_se
                        capture_en     : port_name ; // default: ijtag_ce
                        update_en      : port_name ; // default: ijtag_ue
                    }
                    Host {
                        select         : port_name ; // default: ijtag_to_sel
                        tck            : port_name ; // default: ijtag_to_tck
                        scan_in        : port_name ; // default: ijtag_from_so
                        scan_out       : port_name ; // default: ijtag_to_si
                        reset          : port_name ; // default: ijtag_to_reset
                        shift_en       : port_name ; // default: ijtag_to_se
                        capture_en     : port_name ; // default: ijtag_to_ce
                        update_en      : port_name ; // default: ijtag_to_ue
                    }
                }
            }
        }    
    }
}
****DftSpecification/IjtagNetwork/HostScanInterface/Tdr****
DftSpecification(module_name,id) {
    IjtagNetwork {
        HostScanInterface(id) {
            Tdr(id) {
                so_retiming : on | off ;
                DataInPorts {
                }
                DataOutPorts {
                }
                Interface {
                }
                parent_instance              : instance_name ;
                leaf_instance_name           : leaf_instance_name ;
                keep_active_during_scan_test : on | off | auto ;
                length                       : integer ; // default: auto
                extra_bits_capture_value     : 0 | 1 | self ;
                reset_value                  : binary ; // default: auto
                Attributes {
                    attribute_name           : attribute_value ;
                }
                DecodedSignal(signal_name) {
                }
            }
        }
    }
}
**DftSpecification/IjtagNetwork/HostScanInterface/Tdr/Interface**
IjtagNetwork {
    HostScanInterface(id) {
        Tdr(id) {
            Interface {
                select         : port_name ; // default: ijtag_sel
                tck            : port_name ; // default: ijtag_tck
                scan_in        : port_name ; // default: ijtag_si
                scan_out       : port_name ; // default: ijtag_so
                reset          : port_name ; // default: ijtag_reset
                reset_polarity : active_high | active_low ;
                shift_en       : port_name ; // default: ijtag_se
                capture_en     : port_name ; // default: ijtag_ce
                update_en      : port_name ; // default: ijtag_ue
            }
        }
    }
}
**DftSpecification/IjtagNetwork/HostScanInterface/Tdr/DataInPorts**
DftSpecification(module_name,id) {
    IjtagNetwork {
        HostScanInterfac(id) {
            Tdr(id) {
                DataInPorts {
                    count             : integer ; // default: auto
                    port_naming       : port_naming,...; // default:ijtag_data_in[%d]
                    connection(range) : port_pin_constant_name; // repeatable
                }
            }
        }
    }
}
**DftSpecification/IjtagNetwork/HostScanInterface/Tdr/DataOutPorts**
DftSpecification(module_name,id) {
    IjtagNetwork {
        HostScanInterfac(id) {
            Tdr(id) {
                DataOutPorts {
                    count                : integer; // default: auto
                    port_naming          : port_naming,...; // default:ijtag_data_out[%d]
                    multiplexing         : on | off | auto ;
                    output_timing(range) : auto | unlatched | normal | ijtag_scan_selection ;
                    connection(range)    : port_pin_name ; // repeatable
                }
            }
        }
    }
}
**DftSpecification/IjtagNetwork/HostScanInterface/Tdr/DecodedSignal**
DftSpecification(module_name,id) {
    IjtagNetwork {
        HostScanInterfac(id) {
            Tdr(id) {
                DecodedSignal(signal_name) {
                    decode_values        : binary_code, ... ;
                    multiplexing         : on | off | auto ;
                    output_timing(range) : auto | unlatched | normal | ijtag_scan_selection ;
                    connection           : port_pin_name ; // repeatable
                    Attributes {
                        attribute_name   : attribute_value ;
                    }
                }
            }
        }
    }
}
****DftSpecification/IjtagNetwork/HostScanInterface/Tap****
DftSpecification(module_name,id) {
    IjtagNetwork {
        HostScanInterface(id) {
            Tap(id) {
                Interface {
                }
                parent_instance                    : instance_name ;
                leaf_instance_name                 : leaf_instance_name ;
                keep_active_during_scan_test       : on | off | auto ;
                bypass_instruction_codes           : auto | binary , ... ;
                bypass_instruction_codes_md        : auto | auto_code | unused | binary_code , ... ;
                add_buffers_on_jtag_signal_sources : on | off | auto ;
                add_negedge_flop_on_tdo_output     : on | off | auto ;
                Attributes {
                    attribute_name : attribute_value;
                }
                DataOutPorts {
                }
                HostBscan {
                }
                DeviceIDRegister {
                }
                HostIjtag(id) { // repeatable
                }
                HostSTap {
                }
            }
        }
    }
}
**DftSpecification/IjtagNetwork/HostScanInterface/Tap/Interface**
DftSpecification(module_name,id) {
    IjtagNetwork {
        HostScanInterface(id) {
            Tap(id) {
                Interface {
                    fsm_state                : port_name ; // default: fsm_state[%d]
                    capture_ir_dr_en_present : on | off ;  // default: off
                    capture_ir_dr_en         : port_name ; // default: capture_ir_dr_en
                    shift_ir_dr_en_present   : on | off ;  // default: off
                    shift_ir_dr_en           : port_name ; // default: shift_ir_dr_en
                    Client {
                        tdi                  : port_name ; // default: tdi
                        tdo                  : port_name ; // default: tdo
                        tck                  : port_name ; // default: tck
                        tms                  : port_name ; // default: tms
                        trst                 : port_name ; // default: trst
                        tdo_en               : port_name ; // default: tdo_en
                        tdo_en_polarity      : active_high | active_low | auto ;
                    }
                    Host {
                        reset                : port_name ; // default: test_logic_reset
                        capture_en           : port_name ; // default: capture_dr_en
                        shift_en             : port_name ; // default: shift_dr_en
                        update_en            : port_name ; // default: update_dr_en
                        reset_polarity       : active_high | active_low ;
                    }
                    TdiMux {
                        parent_instance      : instance_name;
                        leaf_instance_name   : instance_name;
                        tdi_local            : port_name; // def: tdi_local
                        bypass_devid_select  : port_name; // def: bypass_devid_select
                        ir_select            : port_name; // def: ir_select
                        tdi_selected         : port_name; // def: tdi_selected
                    }
                    TdoMux {
                        parent_instance      : instance_name;
                        leaf_instance_name   : instance_name;
                        connection_mode      : tdo_source_interception | external_source;
                        pipeline_present     : on | off;  // def: off
                        tdo                  : port_name; // def: tdo
                        tdo_daisy_in         : port_name; // def: tdo_daisy_in
                        tdo_daisy_out        : port_name; // def: tdo_daisy_out
                        pipeline_tck         : port_name; // def: pipeline_tck
                        capture_ir_dr_en     : port_name; // def: capture_ir_dr_en
                        shift_ir_dr_en       : port_name; // def: shift_ir_dr_en
                        bypass_devid_select  : port_name; // def: bypass_devid_select
                        ir_select            : port_name; // def: ir_select
                        tdo_en               : port_name; // def: tdo_en
                        tdo_en_daisy_out     : port_name; // def: tdo_en_daisy_out
                    }
                }
            }
        }
    }
}
**DftSpecification/IjtagNetwork/HostScanInterface/Tap/HostBScan**
DftSpecification(module_name,id) {
    IjtagNetwork {
        HostScanInterface(id) {
            Tap(id) {
                HostBscan {
                    Interface {
                        select             : port_name ; // default:host_bscan_to_sel
                        force_disable      : port_name ; // default: force_disable
                        select_jtag_input  : port_name ; // default:select_jtag_input
                        select_jtag_output : port_name ; // default:select_jtag_output
                        extest_pulse       : port_name ; // default: extest_pulse
                        extest_train       : port_name ; // default: extest_train
                        scan_in            : port_name ; // default:host_bscan_from_so
                    }
                    InstructionCodes {
                        CLAMP          : auto | unused | binary, ... ;
                        EXTEST         : auto | binary, ... ;
                        EXTEST_PULSE   : auto | unused | binary, ... ;
                        EXTEST_TRAIN   : auto | unused | binary, ... ;
                        INTEST         : auto | unused | binary, ... ;
                        SAMPLE_PRELOAD : auto | binary, ... ;
                        HIGHZ          : auto | unused | binary, ... ;
                    }
                }
            }
        }
    }
}
**DftSpecification/IjtagNetwork/HostScanInterface/Tap/DataOutPorts**
DftSpecification(module_name,id) {
    IjtagNetwork {
        HostScanInterface(id) {
            Tap(id) {
                DataOutPorts {
                    count             : integer ; //default: auto
                    port_naming       : port_naming,... ;//default: user_ir_bits[%d]
                    reset_value       : binary ; //default: auto
                    multiplexing      : on | off | auto ;
                    connection(range) : port_pin_name ; // repeatable
                }
            }
        }
    }
}
**DftSpecification/IjtagNetwork/HostScanInterface/Tap/DeviceIDRegister**
DftSpecification(module_name,id) {
    IjtagNetwork {
        HostScanInterface(id) {
            Tap(id) {
                DeviceIDRegister {
                    Interface {
                        version_code         : port_name ; // default: version_code[%d]
                        part_number_code     : port_name ; // default: part_number_code[%d]
                        manufacturer_id_code : port_name ;// default: manufacturer_id_code[%d]
                    }
                    capture_source           : internal | external ;
                    instruction_codes        : auto | binary, ... ;
                    instruction_codes_md     : auto | auto_code | unused | binary_code , ... ;
                    version_code             : binary ; // default: 4'h0
                    manufacturer_id_code     : binary ; // default: 11'h0
                    part_number_code         : binary ; // default: 16'h0
                }
            }
        }
    }
}
**DftSpecification/IjtagNetwork/HostScanInterface/Tap/HostIjtag**
DftSpecification(module_name,id) {
    IjtagNetwork {
        HostScanInterface(id) {
            Tap(id) {
                HostIjtag(id) {
                    instruction_codes : auto | binary, ... ;
                    provide_full_host_scan_interface: auto | on | off ;
                    instruction_name : instruction_name ; // default: HOSTIJTAG_%s
                    Interface {
                        select       : port_name ; // default: host_%s_to_sel
                        scan_in      : port_name ; // default: host_%s_from_so
                        scan_out     : port_name ; // default: host_%s_to_si
                        reset        : port_name ; // default: host_%s_to_reset
                        tck          : port_name ; // default: host_%s_to_tck
                        update_en    : port_name ; // default: host_%s_to_ue
                        shift_en     : port_name ; // default: host_%s_to_se
                        capture_en   : port_name ; // default: host_%s_to_ce
                    }
                    Pipeline(id) { // repeatable
                    }
                    Sib(id) { // repeatable
                    }
                    Tdr(id) { // repeatable
                    }
                    ScanMux(id) { // repeatable
                    }
                    DesignInstance(instance_name) { // repeatable
                    }
                    SecondaryHostScanInterface(id){ // repeatable
                    }
                }
            }
        }
    }
}
**DftSpecification/IjtagNetwork/HostScanInterface/Tap/HostSTap**
DftSpecification(module_name,id) {
    IjtagNetwork {
        HostScanInterface(id) {
            Tap(id) {
                HostSTap {
                    instruction_code : auto | binary ;
                    provide_full_host_scan_interface : auto | on | off ;
                    bypass_device_id_shortcut : on | off ;
                    Interface {
                        scan_out : port_name ; // default: stap_to_si
                        scan_in : port_name ; // default: stap_from_so
                        tms : port_name ; // default: stap_to_tms
                        tck : port_name ; // default: stap_to_tck
                        trst : port_name ; // default: stap_to_trst
                        reset : port_name ; // default: stap_to_reset
                        capture_en : port_name ; // default: stap_to_ce
                        shift_en : port_name ; // default: stap_to_se
                        update_en : port_name ; // default: stap_to_ue
                    }
                    STap(id) {
                        parent_instance : instance_name ;
                        leaf_instance_name : instance_name ;
                        so_retiming : on | off ;
                        3dcr_bypass_value : 0 | 1 ;
                        Interface {
                            Client {
                                scan_in : port_name ; // default: stap_si
                                scan_out : port_name ; // default: stap_so
                                tms : port_name ; // default: tms
                                tck : port_name ; // default: tck
                                trst : port_name ; // default: trst
                                reset : port_name ; // default: ijtag_reset
                                capture_en : port_name ; // default: stap_ce
                                shift_en : port_name ; // default: stap_se
                                update_en : port_name ; // default: stap_ue
                            }
                            Host {
                                scan_out : port_name ; // default: stap_to_tdi
                                scan_in : port_name ; // default: stap_from_tdo
                                tms : port_name ; // default: stap_to_tms
                            }   
                        }
                        SecondaryHostScanInterface(id) {
                            to_tck : port_pin_name ; // default: %s_to_tck *DefSpec
                            to_trst : port_pin_name ; // default: %s_to_trst *DefSpec
                            to_tms : port_pin_name ; // default: %s_to_tms *DefSpec
                            from_tdo : port_pin_name ; // default: %s_from_tdo *DefSpec
                            to_tdi : port_pin_name ; // default: %s_to_tdi *DefSpec
                        }
                    }
                    STapPipeline(id) {
                        parent_instance : instance_name ;
                        leaf_instance_name : instance_name ;
                        capture_value : 0 | 1 | self ;
                        so_retiming : on | off ;
                        Interface {
                            scan_in : port_name ; // default: stap_si
                            scan_out : port_name ; // default: stap_so
                            tck : port_name ; // default: tck
                            shift_en : port_name ; // default: stap_se
                            capture_en : port_name ; // default: stap_ce
                        }
                    }
                    SecondaryHostScanInterface(id) {
                        to_tck : port_pin_name ; //def: %s_ijtag_to_tck *DefSpec
                        to_trst : port_pin_name ; //def: %s_to_trst *DefSpec
                        to_reset : port_pin_name ; //def: %s_ijtag_to_reset *DefSpec
                        to_reset_polarity : active_low | active_high ;
                        to_tms : port_pin_name ; //def: %s_to_tms *DefSpec
                        to_capture_en: port_pin_name ; //def: %s_ijtag_to_ce *DefSpec
                        to_shift_en : port_pin_name ; //def: %s_ijtag_to_se *DefSpec
                        to_update_en : port_pin_name ; //def: %s_ijtag_to_ue *DefSpec
                        from_tdo : port_pin_name ; //def: %s_from_tdo *DefSpec
                        to_tdi : port_pin_name ; //def: %s_to_tdi *DefSpec
                    }
                }
            }   
        }
    }
}
****DftSpecification/IjtagNetwork/HostScanInterface/TwoPinSerialPort****
DftSpecification(module_name,id) {
    IjtagNetwork {
        HostScanInterface(id) {
            TwoPinSerialPort {
                parent_instance : instance_name ;
                leaf_instance_name : leaf_instance_name ;
                Interface {
                    Client {
                        spio_in : port_name ; // default: spio_in
                        spclk : port_name ; // default: spclk
                        spio_out : port_name ; // default: spio_out
                        spio_en : port_name ; // default: spio_en
                        spio_en_polarity : auto | active_high | active_low;
                    }
                    Host {
                        tck : port_name ; // default: tck
                        tms : port_name ; // default: tms
                        trst : port_name ; // default: trst
                        tdi : port_name ; // default: tdi
                        tdo : port_name ; // default: tdo
                        tdo_en : port_name ; // default: tdo_en
                        tdo_en_polarity : auto | active_high | active_low;
                    }
                }
                Attributes {
                    attribute_name : attribute_value ;
                }
                Pipeline(id) { // repeatable
                }
                Tap(id) { // repeatable
                }
                DesignInstance(id) { // repeatable
                }
                ScanMux(id) { // repeatable
                }
            }
        }
    }
}