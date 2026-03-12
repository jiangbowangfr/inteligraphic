*************process_dft_specification*******************
DftSpecification(module_name,id) {
    instrument_module_name_prefix                       : string ;               // default : module_name
    mini_occ_async_set_reset_control                    : off | external ;
    mini_occ_capture_trigger                            : shift_en | capture_en ;
    mini_occ_static_clock_control                       : off | external ;
    rtl_extension                                       : string ;               // default: v
    gate_extension                                      : string ;               // default: vg
    reuse_modules_when_possible                         : on | off | auto ;      // *DefSpec on page 4814
    use_rtl_cells                                       : on | off | auto ;      // *DefSpec
    use_rtl_clock_dff_cell                              : on | off | auto ;      // *DefSpec
    use_synchronizer_cell_with_reset                    : on | off ;             // *DefSpec
    use_rtl_synchronizer_cell                           : on | off | auto ;      // *DefSpec
    use_rtl_clock_shaper_cell                           : on | off | auto ;      // *DefSpec
    dft_cell_selection_name                             : string ;
    persistent_clock_cell_prefix                        : string ;               //default: tessent_persistent_cell_
    persistent_cell_prefix                              : string ;               //default: tessent_persistent_cell_
    allow_port_creation_on_current_design               : on | off ;             // *DefSpec
    add_persistent_buffers_in_scan_resource_instruments : on | off ;             // *DefSpec
    independent_insertion_flow                          : on | off | auto ;      // *DefSpec
    force_creation_of_rtl_cells                         : cell_type, ... ;       //for legal values
    //see RtlCells
    RtlCells {
    }
    BoundaryScan {
    }
    EDT {
    }
    EmbeddedBoundaryScan {
    }
    IjtagNetwork {
    }
    InSystemTest {
    }
    LogicBist {
    }
    LpctType3 {
    }
    MemoryBisr {
    }
    MemoryBist {
    }
    OCC {
    }
    SSN {
    }
    //Other instrument types to be added in future releases
}