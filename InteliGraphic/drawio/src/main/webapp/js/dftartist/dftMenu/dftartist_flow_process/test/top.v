module top(input clk, rstn, input [7:0] a, b, output [8:0] y);
  reg [8:0] acc;
  always @(posedge clk or negedge rstn) begin
    if(!rstn) acc <= 0;
    else      acc <= a + b + acc;
  end
  assign y = acc;
endmodule