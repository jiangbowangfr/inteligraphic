
********DftSpecification/InSystemTest********
DftSpecification (module_name, id) {
    InSystemTest {
        Controller(id) {
            host_interface :  HostScanInterface(id)            |  
                              SecondaryHostScanInterface(id)   | 
                              CurrentDesign                    |
                              CurrentDesign/scan_int_id        |
                              DesignInstance(path)             |
                              DesignInstance(path)/scan_int_id |
                              Tap(id)/client                   |
                              Tap(id)/HostIjtag(host_id)       |
                              Sib(id)/{host | client} ;
            DesignInstance (instance_name) { // mutually exclusive
                client_interface                : name ;    // with host_interface
            }
            protocol                            : direct_memory_access | cpu_interface ;
            data_width                          : integer ; // required
            parent_instance                     : name ;   // default: ""
            leaf_instance_name                  : name ;
            async_reset_all_registers           : on | off ;
            use_enable_sync_cell                : on | off ;
            tap_reset_method                    : asynchronous | synchronous ;
            controller_reset                    : functional_reset_only | combined_ijtag_and_functional_reset ;
            ijtag_network_reset_cycles          : positive integer ;
            use_clock_dff_cell                  : on | off ;
            ssn_bus_width                       : int | auto ; // int = [0..32]
            tck_clock_mux_select_cycles         : integer ; // default: 0
            max_extra_control_setup_hold_cycles : integer ; // valid values: 0,1,3,7,15,31,63,127,255,256;
            max_extra_tms_setup_hold_cycles     : integer ; // valid values: 0,1,3,7,15,31,63,127,255,256;
            write_access_when_inactive          : ignore | bus_error ;
            read_access_when_inactive           : ignore | bus_error | auto | wait ;
            ControllerChain {
                present                         : on | off ;
                clock                           : tck | ccm_clock | ist_clock ;
                segment_per_instrument          : on | off ;
                max_segment_length              : int | unlimited; // int >= 32
                }
            ApbSubordinateOptions {
            }
            AxiSubordinateOptions {
            }
            DirectMemoryAccessOptions {
            }
            Interface {
            }
            Connections {
            }
        }
    include_clocks_in_icl_model                 : on | off | auto ;
    }
}

****DftSpecification/InSystemTest/Controller/ApbSubordinateOptions****
DftSpecification (module_name, id) {
    InSystemTest {
        Controller(id) {
            ApbSubordinateOptions {
                present : on | off | auto ;
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
****DftSpecification/InSystemTest/Controller/DirectMemoryAccessOptions****
DftSpecification (module_name, id) {
    InSystemTest {
        Controller(id) {
            DirectMemoryAccessOptions {
                begin_address          : integer ; // default: 0
                end_address            : integer ; // default: max addressable memory
                address_width          : integer ; // required
                max_wait_cycles        : integer ; // default: 1 million (20 bits)
                max_test_program_count : integer ; // default: 1
                test_program_execution : single | consecutive ;
                misr                   : none | integer ; // in range [2,32]
                ijtag_clock_control    : test_active | ist_enable ; 
                memory_min_hold        : time ; // default: 0
            }
        }
    }
}
****DftSpecification/InSystemTest/Controller/Interface****
DftSpecification (module_name, id) {
    InSystemTest {
        Controller(id) {
            Interface {
                reset          : port_name ; // default: ""
                reset_polarity : active_high | active_low ;
                test_active    : port_name ; // default: test_active
                ControllerChain {
                    enable     : port_name; // default: ccm_en
                    scan_in    : port_name; // default: ccm_scan_in
                    scan_out   : port_name; // default: ccm_scan_out
                    scan_en    : port_name; // default: scan_en
                    clock      : port_name; // default: ccm_clock
                }
                CpuInterface {
                    ApbSubordinate {
                    }
                    AxiSubordinate {
                    }
                    Generic {
                    }
                }
                DirectMemoryAccess {
                }
                TapScanInterface {
                }      
                IjtagScanInterface {
                }
                SsnDatapathHost {
                }
            }
        }
    }
}
*DftSpecification/InSystemTest/Controller/Interface/CpuInterface/Generic*
DftSpecification (module_name, id) {
    InSystemTest {
        Controller(id) {
            Interface {
                CpuInterface {
                    Generic {
                        clock    : port_name ; // default: cpu_interface_clock、
                        data_in  : port_name ; // default: data_from_cpu[%d]
                        data_out : port_name ; // default: data_to_cpu[%d]
                        write_en : port_name ; // default: write_en_from_cpu
                        enable   : port_name ; // default: cpu_interface_en
                    }
                }
            }
        }
    }
}
*DftSpecification/InSystemTest/Controller/CpuInterface/Interface/ApbSubordinate*
DftSpecification (module_name, id) {
     InSystemTest {
        Controller(id) {
            Interface {
                CpuInterface {
                    ApbSubordinate {
                        clock     : port_name ; // default PCLK
                        select    : port_name ; // default PSEL
                        enable    : port_name ; // default PENABLE
                        write_en  : port_name ; // default PWRITE
                        data_in   : port_name ; // default PWDATA[%d]
                        data_out  : port_name ; // default PRDATA[%d]
                        address   : port_name ; // default PADDR[%d]
                        ready     : port_name ; // default PREADY
                        bus_error : port_name ; // default PSLVERR
                    }
                }
            }
        }
    }
}
*DftSpecification/InSystemTest/Controller/CpuInterface/Interface/AxiSubordinate*
DftSpecification (module_name, id) {
    InSystemTest {
        Controller(id) {
            Interface {
                CpuInterface {
                    AxiSubordinate {
                        clock        : port_name; //default: ACLK
                        WriteAddressChannel {
                            id       : port_name; //default: AWID[%d]
                            address  : port_name; //default: AWADDR[%d]
                            valid    : port_name; //default: AWVALID
                            ready    : port_name; //default: AWREADY
                        }
                        WriteDataChannel {
                        data         : port_name; //default: WDATA[%d]
                        last         : port_name; //default: WLAST
                        valid        : port_name; //default: WVALID
                        ready        : port_name; //default: WREADY
                        }
                        WriteResponseChannel {
                            id       : port_name; //default: BID[%d]
                            response : port_name; //default: BRESP[1:0]
                            valid    : port_name; //default: BVALID
                            ready    : port_name; //default: BREADY
                        }
                        ReadAddressChannel {
                            id       : port_name; //default: ARID[%d]
                            address  : port_name; //default: ARADDR[%d]
                            length   : port_name; //default: ARLEN[3:0]
                            valid    : port_name; //default: ARVALID
                            ready    : port_name; //default: ARREADY
                        }
                        ReadDataChannel {
                            id       : port_name; //default: RID[%d]
                            data     : port_name; //default: RDATA[%d]
                            response : port_name; //default: RRESP[1:0]
                            last     : port_name; //default: RLAST
                            valid    : port_name; //default: RVALID
                            ready    : port_name; //default: RREADY
                        }
                    }
                }
            }
        }
    }
}
**DftSpecification/InSystemTest/Controller/Interface/DirectMemoryAccess**
DftSpecification (module_name, id) {
    InSystemTest {
        Controller(id) {
            Interface {
                DirectMemoryAccess {
                    clock                      : port_name ; // default: dma_clock
                    test_program_index         : port_name ;// default: dma_test_program_index[%d]
                    test_program_start_index   : port_name ;// default: dma_test_program_start_index[%d]
                    test_program_end_index     : port_name ;// default: dma_test_program_end_index[%d]
                    invalid_test_program_index : port_name // default: -
                    test_program_done          : port_name ;// default: dma_test_program_done
                    fail_flag                  : port_name ; // default: dma_fail_flag[%d]
                    misr                       : port_name ; // default: dma_misr[%d]
                    mem_address                : port_name ; // default: dma_address[%d]
                    mem_data                   : port_name ; // default: dma_data[%d]
                    enable                     : port_name ; // default: dma_en
                    memory_access_active       : port_name ; // default: -
                }
            }
        }
    }
}
**DftSpecification/InSystemTest/Controller/Interface/TapScanInterface**
DftSpecification (module_name, id) {
    InSystemTest {
        Controller(id) {
            Interface {
                TapScanInterface {
                    tck         : port_name ; // default: ijtag_tck
                    trst        : port_name ; // default: trst
                    tms         : port_name ; // default: tms
                    tdi         : port_name ; // default: tdi
                    tdo         : port_name ; // default: tdo
                    tdo_en      : port_name ; // default: tdo_en
                    to_tck      : port_name ; // default: to_ijtag_tck
                    to_trst     : port_name ; // default: to_trst
                    to_tms      : port_name ; // default: to_tms
                    to_tdi      : port_name ; // default: to_tdi
                    from_tdo    : port_name ; // default: from_tdo
                    from_tdo_en : port_name ; // default: from_tdo_en
                }
            }
        }
    }
}
**DftSpecification/InSystemTest/Controller/Interface/IjtagScanInterface**
DftSpecification (module_name, id) {
    InSystemTest {
        Controller(id) {
            Interface {
                IjtagScanInterface {
                    tck           : port_name ; // default: ijtag_tck
                    reset         : port_name ; // default: ijtag_reset
                    select        : port_name ; // default: ijtag_sel
                    capture_en    : port_name ; // default: ijtag_ce
                    shift_en      : port_name ; // default: ijtag_se
                    update_en     : port_name ; // default: ijtag_ue
                    scan_in       : port_name ; // default: ijtag_si
                    scan_out      : port_name ; // default: ijtag_so
                    to_tck        : port_name ; // default: to_ijtag_tck
                    to_reset      : port_name ; // default: to_ijtag_reset
                    to_select     : port_name ; // default: to_ijtag_sel
                    to_capture_en : port_name ; // default: to_ijtag_ce
                    to_shift_en   : port_name ; // default: to_ijtag_se
                    to_update_en  : port_name ; // default: to_ijtag_ue
                    to_scan_in    : port_name ; // default: to_ijtag_si
                    from_scan_out : port_name ; // default: from_ijtag_so
                }
            }
        }
    }
}
**DftSpecification/InSystemTest/Controller/Interface/SsnDatapathHost**
DftSpecification (module_name, id) {
    InSystemTest {
        Controller(id) {
            Interface {
                SsnDatapathHost {
                    bus_clock : port_name; // default: to_ssn_bus_clock
                    bus_data_in : port_name; // default: to_ssn_bus_data_in[%d]
                    bus_data_out : port_name; // default: from_ssn_bus_data_out[%d]
                }
            }
        }
    }
}

****DftSpecification/InSystemTest/Controller/Connections****
DftSpecification (module_name, id) {
    InSystemTest {
        Controller(id) {
            Connections {
                reset                     : port_pin_name ; // required
                test_active               : port_pin_name ; // default: "" (no connection)
                controller_chain_enable   : port_pin_name ;// default: OptionalDftSignal(controller_chain_mode)
                controller_chain_clock    : port_pin_name ;// default: OptionalDftSignal(test_clock)
                scan_en                   : port_pin_name ;// default: OptionalDftSignal(scan_en)
                controller_chain_scan_in  : port_pin_name ;// default: control_chain_%s_scan_in
                controller_chain_scan_out : port_pin_name ;// default: control_chain_%s_scan_out
                CpuInterface { // required
                    Generic {
                    }
                    ApbSubordinate {
                    }
                    AxiSubordinate {
                    }
                }
                DirectMemoryAccess { // required
                }
            }
        }
    }
}
*DftSpecification/InSystemTest/Controller/Connections/CpuInterface/Generic*
DftSpecification (module_name, id) {
    InSystemTest {
        Controller(id) {
            Connections {
                CpuInterface {
                    Generic {
                        clock    : port_pin_name ; // required input
                        data_in  : port_pin_name ; // required input
                        data_out : port_pin_name ; // required output
                        write_en : port_pin_name ; // required input
                        enable   : port_pin_name ; // required input
                    }
                }
            }
        }
    }
}
*DftSpecification/InSystemTest/Controller/Connections/CpuInterface/ApbSubordinate*
DftSpecification (module_name, id) {
    InSystemTest {
        Controller(id) {
            Connections {
                CpuInterface {
                    ApbSubordinate {
                        clock     : port_pin_name ; // required input
                        select    : port_pin_name ; // required input
                        enable    : port_pin_name ; // required input
                        write_en  : port_pin_name ; // required input
                        data_in   : port_pin_name ; // required input
                        data_out  : port_pin_name ; // required output
                        address   : port_pin_name ; // required input
                        ready     : port_pin_name ; // required output
                        bus_error : port_pin_name ; // required output
                    }
                }
            }
        }
    }
}
*DftSpecification/InSystemTest/Controller/Connections/CpuInterface/AxiSubordinate*
DftSpecification (module_name, id) {
    InSystemTest {
        Controller(id) {
            Connections {
                CpuInterface {
                    AxiSubordinate {
                        clock        : port_pin_name ; // Source
                        WriteAddressChannel {
                            id       : port_pin_name; // Source
                            address  : port_pin_name; // Source
                            valid    : port_pin_name; // Source
                            ready    : port_pin_name; // Destination
                        }
                        WriteDataChannel {
                            data     : port_pin_name; // Source
                            last     : port_pin_name; // Source
                            valid    : port_pin_name; // Source
                            ready    : port_pin_name; // Destination
                        }
                        WriteResponseChannel {
                            id       : port_pin_name; // Destination
                            response : port_pin_name; // Destination
                            valid    : port_pin_name; // Destination
                            ready    : port_pin_name; // Source
                        }
                        ReadAddressChannel {
                            id       : port_pin_name; // Source
                            address  : port_pin_name; // Source
                            length   : port_pin_name; // Source
                            valid    : port_pin_name; // Source
                            ready    : port_pin_name; // Destination
                        }
                        ReadDataChannel {
                            id       : port_pin_name; // Destination
                            data     : port_pin_name; // Destination
                            response : port_pin_name; // Destination
                            last     : port_pin_name; // Destination
                            valid    : port_pin_name; // Destination
                            ready    : port_pin_name; // Source
                        }
                    }
                }
            }
        }
    }
}
**DftSpecification/InSystemTest/Controller/Connections/DirectMemoryAccess**
DftSpecification (module_name, id) {
    InSystemTest {
        Controller(id) {
            Connections {
                DirectMemoryAccess {
                    clock                      : port_pin_name ; // required
                    test_program_index         : port_pin_name ; // required
                    test_program_start_index   : port_pin_name, ... ; // required
                    test_program_end_index     : port_pin_name, ... ; // required
                    invalid_test_program_index : port_pin_name ; // required
                    test_program_done          : port_pin_name ; // required
                    fail_flag                  : port_pin_name, ... ; // required
                    misr                       : port_pin_name, ... ; // required
                    mem_address                : port_pin_name ; // required
                    mem_data                   : port_pin_name ; // required
                    enable                     : port_pin_name ; // required
                    memory_access_active       : port_pin_name ; // required when Interface/memory_access_active specified
                }
            }
        }
    } 
}