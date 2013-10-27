//  dTemplate.js
 
xxxJsonTrace

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
