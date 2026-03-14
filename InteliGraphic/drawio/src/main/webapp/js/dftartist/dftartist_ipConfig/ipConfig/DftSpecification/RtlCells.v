********DftSpecification/RtlCells********
DftSpecification(module_name,id) {
    RtlCells {
        And2|Or2|ClkAnd2|ClkOr2 {
            input0                  : string ; // default: a
            input1                  : string ; // default: b
            output                  : string ; // default: y
        }
        Buf|Inv|ClkBuf|ClkInv {
            input                   : string ; // default: a
            output                  : string ; // default: y
        }
        Mux2|ClkMux2 {
            input0                  : string ; // default: a
            input1                  : string ; // default: b
            select                  : string ; // default: s
            output                  : string ; // default: y
        }
        ClkGateAnd|ClkGateOr {
            clock_in                : string ; // default: clk
            functional_enable       : string ; // default: fe
            test_enable             : string ; // default: te
            clock_out               : string ; // default: clkg
        }
        ClkGateAndAsynchEnable|ClkGateOrAsynchEnable {
            clock_in                : string ; // default: clk
            functional_enable       : string ; // default: fe
            test_enable             : string ; // default: te
            clock_out               : string ; // default: clkg
            asynch_enable           : string ; // default: asynch_enable
            asynch_enable_polarity  : string ; // active_high | active_low;
        }
        ClkShaperResetActive|ClkShaperResetInactive {
            clock_in                : string ; // default: clk_in
            reset                   : string ; // default: rst
            reset_polarity          : string ; // active_high | active_low;
            enable0                 : string ; // default: en0
            enable1                 : string ; // default: en1
            clock_out               : string ; // default: clk_out
        }
        PosedgeClockDff|NegedgeClockDff {
            data_in                 : string ; // default: d
            clock_in                : string ; // default: clk
            data_out                : string ; // default: q
        }
        PosedgeClockDffReset|NegedgeClockDffReset {
            reset                   : string ; // default: rn
            reset_polarity          : string ; // active_high | active_low
            data_in                 : string ; // default: d
            clock_in                : string ; // default: clk
            data_out                : string ; // default: q
        }
        PosedgeClockDffSet|NegedgeClockDffSet {
            set                     : string ; // default: sn
            set_polarity            : string ; // active_high | active_low
            data_in                 : string ; // default: d
            clock_in                : string ; // default: clk
            data_out                : string ; // default: q
        }
        PosedgeDff|NegedgeDff {
            data_in                 : string ; // default: d
            clock_in                : string ; // default: clk
            data_out                : string ; // default: q
        }
        PosedgeDffReset|NegedgeDffReset {
            reset                   : string ; // default: rn
            reset_polarity          : string ; // active_high | active_low
            data_in                 : string ; // default: d
            clock_in                : string ; // default: clk
            data_out                : string ; // default: q
        }
        PosedgeDffSet|NegedgeDffSet {
            set                     : string ; // default: sn
            set_polarity            : string ; // active_high | active_low
            data_in                 : string ; // default: d
            clock_in                : string ; // default: clk
            data_out                : string ; // default: q
        }
        ActiveHighLatch|ActiveLowLatch {
            data_in                 : string ; // default: d
            clock_in                : string ; // default: clk
            data_out                : string ; // default: q
        }
        ActiveHighLatchReset|ActiveLowLatchReset {
            reset                   : string ; // default: rn
            reset_polarity          : string ; // active_high | active_low
            data_in                 : string ; // default: d
            clock_in                : string ; // default: clk
            data_out                : string ; // default: q
        }
        ActiveHighLatchSet|ActiveLowLatchSet {
            set                     : string ; // default: sn
            set_polarity            : string ; // active_high | active_low
            data_in                 : string ; // default: d
            clock_in                : string ; // default: clk
            data_out                : string ; // default: q
        }
        PosedgeSynchronizer {
            data_in                 : string ; // default: d
            clock_in                : string ; // default: clk
            data_out                : string ; // default: q
        }
        PosedgeSynchronizerReset {
            reset                   : string ; // default: rn
            reset_polarity          : string ; // active_high | active_low
            data_in                 : string ; // default: d
            clock_in                : string ; // default: clk
            data_out                : string ; // default: q
        }  
    }
}