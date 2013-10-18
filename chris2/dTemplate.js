//  template.js
// 
// Assuming your demo is "aaa.py" do the following
// cp  template.js aaa.js             # you are looking at template.js or aaa.js
// 
// python v3/generate_json_trace.py --create_jsvar=aaaTrace aaa.py >aaa.trace
//
// Include contents of aaa.trace here - don't forget to do the rest
xxxJsonTrace
// edit aaa.js and do the folowing
//   include aaa.trace here (or just above)
//   change all "xxx" to "aaa"
// 
// See top comment in template.html for making aaa.html 

$(document).ready(function() {

  var xxxVisualizer =
      new ExecutionVisualizer('xxxDiv', xxxTrace,
              {embeddedMode: true,
               heightChangeCallback: redrawAllVisualizerArrows,
               editCodeBaseURL: 'http://pythontutor.com/visualize.html'});

  function redrawAllVisualizerArrows() {
    if (xxxVisualizer) xxxVisualizer.redrawConnectors();
  }

  $(window).resize(redrawAllVisualizerArrows);
});
