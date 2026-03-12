bscan
bscan host interface
    bscan_select,
    bscan_force_disable, 
    bscan_select_jtag_input,
    bscan_select_jtag_output, 
    bscan_clock, 
    bscan_capture_en,
    bscan_shift_en, 
    bscan_update_en, 
    bscan_scan_in,
    bscan_scan_out
bscan slave_interface
    ${label}_bscan_to_force_disable, 
    ${label}_bscan_to_select_jtag_input,
    ${label}_bscan_to_select_jtag_output, 
    ${label}_bscan_to_clock, 
    ${label}_bscan_to_capture_en,
    ${label}_bscan_to_shift_en, 
    ${label}_bscan_to_update_en, 
    ${label}_bscan_to_scan_in,
    ${label}_bscan_from_scan_out

ijtag
ijtag host interface
                   ijtag_tck,
                   ijtag_reset,
                   ijtag_ce, 
                   ijtag_se, 
                   ijtag_ue, 
                   ijtag_sel, 
                   ijtag_si,
                   ijtag_so,

ijtag_slave_interface

                   ${label}_ijtag_to_tck,
                   ${label}_ijtag_to_reset,
                   ${label}_ijtag_to_ce,
                   ${label}_ijtag_to_se,
                   ${label}_ijtag_to_ue,
                   ${label}_ijtag_to_sel,
                   ${label}_ijtag_to_si,
                   ${label}_ijtag_from_so
bisr
bisr_host_interface

                   ${pdg}_bisr_mem_chain_select,
                   ${pdg}_bisr_shift_en,
                   ${pdg}_bisr_clk,
                   ${pdg}_bisr_mem_disable,
                   ${pdg}_bisr_reset,
                   ${pdg}_bisr_si,
                   ${pdg}_bisr_so,
bisr_slave_interface
                   ${pdg}_${label}_bisr_to_mem_chain_select,
                   ${pdg}_${label}_bisr_to_shift_en,
                   ${pdg}_${label}_bisr_to_clk,
                   ${pdg}_${label}_bisr_to_mem_disable,
                   ${pdg}_${label}_bisr_to_reset,
                   ${pdg}_${label}_bisr_to_si,
                   ${pdg}_${label}_bisr_so,


ssn

ssn_host_interface
       ssn_bus_clock,
       ssn_bus_data_in[3:0];   
       ssn_bus_data_out[3:0];

ssn_slave_interface
       ${label}_ssn_to_bus_clock,
       ${label}_ssn_to_bus_data_in[3:0];
       ${label}_ssn_from_bus_data_out[3:0]