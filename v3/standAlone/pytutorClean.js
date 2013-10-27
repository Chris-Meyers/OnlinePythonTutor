
var SVG_ARROW_POLYGON = '0,3 12,3 12,0 18,5 12,10 12,7 0,7';
var SVG_ARROW_HEIGHT = 10;
var curVisualizerID = 1;
function ExecutionVisualizer(domRootID, dat, params) {
  this.curInputCode = dat.code.rtrim();
  this.curTrace = dat.trace;
  this.curTrace = this.curTrace.filter(function(e) {return e.event != 'call';});
  if (this.curTrace.length > 0) {
    var lastEntry = this.curTrace[this.curTrace.length - 1];
    if (lastEntry.event == 'raw_input') {
      this.promptForUserInput = true;
      this.userInputPromptStr = lastEntry.prompt;
      this.curTrace.pop()
    }
    else if (lastEntry.event == 'mouse_input') {
      this.promptForMouseInput = true;
      this.userInputPromptStr = lastEntry.prompt;
      this.curTrace.pop()
    }
  }
  this.curInstr = 0;
  this.params = params;
  if (!this.params) {
    this.params = {};
  }
  var arrowLinesDef = (this.params.arrowLines !== undefined);
  var highlightLinesDef = (this.params.highlightLines !== undefined);
  if (!arrowLinesDef && !highlightLinesDef) {
      this.params.highlightLines = false;
      this.params.arrowLines = true;
  }
  else if (arrowLinesDef && highlightLinesDef) {
  }
  else if (arrowLinesDef) {
      this.params.highlightLines = !(this.params.arrowLines);
  }
  else {
      this.params.arrowLines = !(this.params.highlightLines);
  }
  if (this.params.pyCrazyMode) {
      this.params.arrowLines = this.params.highlightLines = false;
  }
  this.visualizerID = curVisualizerID;
  curVisualizerID++;
  this.leftGutterSvgInitialized = false;
  this.arrowOffsetY = undefined;
  this.codeRowHeight = undefined;
  this.disableHeapNesting = (this.params.disableHeapNesting == true);
  this.drawParentPointers = (this.params.drawParentPointers == true);
  this.textualMemoryLabels = (this.params.textualMemoryLabels == true);
  this.showOnlyOutputs = (this.params.showOnlyOutputs == true);
  this.executeCodeWithRawInputFunc = this.params.executeCodeWithRawInputFunc;
  this.jsPlumbInstance = jsPlumb.getInstance({
    Endpoint: ["Dot", {radius:3}],
    EndpointStyles: [{fillStyle: connectorBaseColor}, {fillstyle: null} ],
    Anchors: ["RightMiddle", "LeftMiddle"],
    PaintStyle: {lineWidth:1, strokeStyle: connectorBaseColor},
    Connector: [ "StateMachine" ],
    Overlays: [[ "Arrow", { length: 10, width:7, foldback:0.55, location:1 }]],
    EndpointHoverStyles: [{fillStyle: connectorHighlightColor}, {fillstyle: null} ],
    HoverPaintStyle: {lineWidth: 1, strokeStyle: connectorHighlightColor},
  });
  var instrLimitReached = false;
  this.domRoot = $('#' + domRootID);
  this.domRoot.data("vis",this);
  this.domRootD3 = d3.select('#' + domRootID);
  this.domRoot.html('<div class="ExecutionVisualizer"></div>');
  this.domRoot = this.domRoot.find('div.ExecutionVisualizer');
  this.domRootD3 = this.domRootD3.select('div.ExecutionVisualizer');
  this.codeOutputLines = null;
  this.breakpoints = null;
  this.sortedBreakpointsList = null;
  this.hoverBreakpoints = null;
  this.enableTransitions = false;
  this.hasRendered = false;
  this.render();
}
ExecutionVisualizer.prototype.generateID = function(original_id) {
  return 'v' + this.visualizerID + '__' + original_id;
}
ExecutionVisualizer.prototype.render = function() {
  if (this.hasRendered) {
    alert('ERROR: You should only call render() ONCE on an ExecutionVisualizer object.');
    return;
  }
  var myViz = this;
  var codeDisplayHTML =
    '<div id="codeDisplayDiv">\
       <div id="pyCodeOutputDiv"/>\
       <div id="editCodeLinkDiv"><a id="editBtn">Edit code</a></div>\
       <div id="executionSlider"/>\
       <div id="vcrControls">\
         <button id="jmpFirstInstr", type="button">&lt;&lt; First</button>\
         <button id="jmpStepBack", type="button">&lt; Back</button>\
         <span id="curInstr">Step ? of ?</span>\
         <button id="jmpStepFwd", type="button">Forward &gt;</button>\
         <button id="jmpLastInstr", type="button">Last &gt;&gt;</button>\
       </div>\
       <div id="errorOutput"/>\
       <div id="legendDiv"/>\
       <div id="stepAnnotationDiv">\
         <textarea class="annotationText" id="stepAnnotationEditor" cols="60" rows="3"></textarea>\
         <div class="annotationText" id="stepAnnotationViewer"></div>\
       </div>\
       <div id="annotateLinkDiv"><button id="annotateBtn" type="button">Annotate this step</button></div>\
     </div>';
  var outputsHTML =
    '<div id="htmlOutputDiv"></div>\
     <div id="progOutputs">\
       Program output:<br/>\
       <textarea id="pyStdout" cols="50" rows="10" wrap="off" readonly></textarea>\
     </div>';
  var codeVizHTML =
    '<div id="dataViz">\
       <table id="stackHeapTable">\
         <tr>\
           <td id="stack_td">\
             <div id="globals_area">\
               <div id="stackHeader">Frames</div>\
             </div>\
             <div id="stack"></div>\
           </td>\
           <td id="heap_td">\
             <div id="heap">\
               <div id="heapHeader">Objects</div>\
             </div>\
           </td>\
         </tr>\
       </table>\
     </div>';
  var vizHeaderHTML =
    '<div id="vizHeader">\
       <textarea class="vizTitleText" id="vizTitleEditor" cols="60" rows="1"></textarea>\
       <div class="vizTitleText" id="vizTitleViewer"></div>\
       <textarea class="vizDescriptionText" id="vizDescriptionEditor" cols="75" rows="2"></textarea>\
       <div class="vizDescriptionText" id="vizDescriptionViewer"></div>\
    </div>';
  if (this.params.verticalStack) {
    this.domRoot.html(vizHeaderHTML + '<table border="0" class="visualizer"><tr><td class="vizLayoutTd" id="vizLayoutTdFirst"">' +
                      codeDisplayHTML + '</td></tr><tr><td class="vizLayoutTd" id="vizLayoutTdSecond">' +
                      codeVizHTML + '</td></tr></table>');
  }
  else {
    this.domRoot.html(vizHeaderHTML + '<table border="0" class="visualizer"><tr><td class="vizLayoutTd" id="vizLayoutTdFirst">' +
                      codeDisplayHTML + '</td><td class="vizLayoutTd" id="vizLayoutTdSecond">' +
                      codeVizHTML + '</td></tr></table>');
  }
  if (this.showOnlyOutputs) {
    myViz.domRoot.find('#dataViz').hide();
    this.domRoot.find('#vizLayoutTdSecond').append(outputsHTML);
    if (this.params.verticalStack) {
      this.domRoot.find('#vizLayoutTdSecond').css('padding-top', '25px');
    }
    else {
      this.domRoot.find('#vizLayoutTdSecond').css('padding-left', '25px');
    }
  }
  else {
    this.domRoot.find('#vizLayoutTdFirst').append(outputsHTML);
  }
  if (this.params.arrowLines) {
      this.domRoot.find('#legendDiv')
          .append('<svg id="prevLegendArrowSVG"/> line that has just executed')
          .append('<p style="margin-top: 4px"><svg id="curLegendArrowSVG"/> next line to execute</p>');
      myViz.domRootD3.select('svg#prevLegendArrowSVG')
          .append('polygon')
          .attr('points', SVG_ARROW_POLYGON)
          .attr('fill', lightArrowColor);
      myViz.domRootD3.select('svg#curLegendArrowSVG')
          .append('polygon')
          .attr('points', SVG_ARROW_POLYGON)
          .attr('fill', darkArrowColor);
  }
  else if (this.params.highlightLines) {
      myViz.domRoot.find('#legendDiv')
          .append('<span class="highlight-legend highlight-prev">line that has just executed</span> ')
          .append('<span class="highlight-legend highlight-cur">next line to execute</span>')
  }
  else if (this.params.pyCrazyMode) {
      myViz.domRoot.find('#legendDiv')
          .append('<a href="https:/'+'/github.com/pgbovine/Py2crazy">Py2crazy</a> mode!')
          .append(' Stepping through (roughly) each executed expression. Color codes:<p/>')
          .append('<span class="pycrazy-highlight-prev">expression that just executed</span><br/>')
          .append('<span class="pycrazy-highlight-cur">next expression to execute</span>');
  }
  if (this.params.editCodeBaseURL) {
    var urlStr = $.param.fragment(this.params.editCodeBaseURL,
                                  {code: this.curInputCode},
                                  2);
    this.domRoot.find('#editBtn').attr('href', urlStr);
  }
  else {
    this.domRoot.find('#editCodeLinkDiv').hide();
    this.domRoot.find('#editBtn').attr('href', "#");
    this.domRoot.find('#editBtn').click(function(){return false;});
  }
  if (this.params.allowEditAnnotations !== undefined) {
    this.allowEditAnnotations = this.params.allowEditAnnotations;
  }
  else {
    this.allowEditAnnotations = false;
  }
  if (this.params.pyCrazyMode !== undefined) {
    this.pyCrazyMode = this.params.pyCrazyMode;
  }
  else {
    this.pyCrazyMode = false;
  }
  this.domRoot.find('#stepAnnotationEditor').hide();
  if (this.params.embeddedMode) {
    this.params.hideOutput = true;
    if (this.params.codeDivWidth === undefined) {
      this.params.codeDivWidth = 350;
    }
    if (this.params.codeDivHeight === undefined) {
      this.params.codeDivHeight = 400;
    }
    this.allowEditAnnotations = false;
  }
  myViz.editAnnotationMode = false;
  if (this.allowEditAnnotations) {
    var ab = this.domRoot.find('#annotateBtn');
    ab.click(function() {
      if (myViz.editAnnotationMode) {
        myViz.enterViewAnnotationsMode();
        myViz.domRoot.find("#jmpFirstInstr,#jmpLastInstr,#jmpStepBack,#jmpStepFwd,#executionSlider,#editCodeLinkDiv,#stepAnnotationViewer").show();
        myViz.domRoot.find('#stepAnnotationEditor').hide();
        ab.html('Annotate this step');
      }
      else {
        myViz.enterEditAnnotationsMode();
        myViz.domRoot.find("#jmpFirstInstr,#jmpLastInstr,#jmpStepBack,#jmpStepFwd,#executionSlider,#editCodeLinkDiv,#stepAnnotationViewer").hide();
        myViz.domRoot.find('#stepAnnotationEditor').show();
        ab.html('Done annotating');
      }
    });
  }
  else {
    this.domRoot.find('#annotateBtn').hide();
  }
  if (this.params.codeDivWidth &&
      this.params.codeDivWidth < 470) {
    this.domRoot.find('#jmpFirstInstr').hide();
    this.domRoot.find('#jmpLastInstr').hide();
  }
  if (this.params.codeDivWidth) {
    this.domRoot.find('#codeDisplayDiv').width(
      this.params.codeDivWidth);
  }
  var syncStdoutWidth = function(event, ui){
    $("#vizLayoutTdFirst #pyStdout").width(ui.size.width-2*parseInt($("#pyStdout").css("padding-left")));};
  $('#codeDisplayDiv').resizable({handles:"e", resize: syncStdoutWidth});
  syncStdoutWidth(null, {size: {width: $('#codeDisplayDiv').width()}});
  if (this.params.codeDivHeight) {
    this.domRoot.find('#pyCodeOutputDiv')
      .css('max-height', this.params.codeDivHeight + 'px');
  }
  this.domRoot.find("#globals_area").append('<div class="stackFrame" id="'
    + myViz.generateID('globals') + '"><div id="' + myViz.generateID('globals_header')
    + '" class="stackFrameHeader">Global variables</div><table class="stackFrameVarTable" id="'
    + myViz.generateID('global_table') + '"></table></div>');
  if (this.params.hideOutput) {
    this.domRoot.find('#progOutputs').hide();
  }
  this.domRoot.find("#jmpFirstInstr").click(function() {
    myViz.curInstr = 0;
    myViz.updateOutput();
  });
  this.domRoot.find("#jmpLastInstr").click(function() {
    myViz.curInstr = myViz.curTrace.length - 1;
    myViz.updateOutput();
  });
  this.domRoot.find("#jmpStepBack").click(function() {
    myViz.stepBack();
  });
  this.domRoot.find("#jmpStepFwd").click(function() {
    myViz.stepForward();
  });
  this.domRoot.find("#vcrControls #jmpFirstInstr").attr("disabled", true);
  this.domRoot.find("#vcrControls #jmpStepBack").attr("disabled", true);
  this.domRoot.find("#vcrControls #jmpStepFwd").attr("disabled", true);
  this.domRoot.find("#vcrControls #jmpLastInstr").attr("disabled", true);
  var lastEntry = this.curTrace[this.curTrace.length - 1];
  this.instrLimitReached = (lastEntry.event == 'instruction_limit_reached');
  if (this.instrLimitReached) {
    this.curTrace.pop()
    var warningMsg = lastEntry.exception_msg;
    myViz.domRoot.find("#errorOutput").html(htmlspecialchars(warningMsg));
    myViz.domRoot.find("#errorOutput").show();
  }
  var sliderDiv = this.domRoot.find('#executionSlider');
  sliderDiv.slider({min: 0, max: this.curTrace.length - 1, step: 1});
  sliderDiv.find(".ui-slider-handle").unbind('keydown');
  sliderDiv.find(".ui-slider-handle").css('width', '0.8em');
  sliderDiv.find(".ui-slider-handle").css('height', '1.4em');
  this.domRoot.find(".ui-widget-content").css('font-size', '0.9em');
  this.domRoot.find('#executionSlider').bind('slide', function(evt, ui) {
    if (evt.originalEvent) {
      myViz.curInstr = ui.value;
      myViz.updateOutput();
    }
  });
  if (this.params.startingInstruction) {
    assert(0 <= this.params.startingInstruction &&
           this.params.startingInstruction < this.curTrace.length);
    this.curInstr = this.params.startingInstruction;
  }
  if (this.params.jumpToEnd) {
    this.curInstr = this.curTrace.length - 1;
  }
  this.precomputeCurTraceLayouts();
  this.renderPyCodeOutput();
  this.updateOutput();
  this.hasRendered = true;
}
ExecutionVisualizer.prototype.showVizHeaderViewMode = function() {
  var titleVal = this.domRoot.find('#vizTitleEditor').val().trim();
  var  descVal = this.domRoot.find('#vizDescriptionEditor').val().trim();
  this.domRoot.find('#vizTitleEditor,#vizDescriptionEditor').hide();
  if (!titleVal && !descVal) {
    this.domRoot.find('#vizHeader').hide();
  }
  else {
    this.domRoot.find('#vizHeader,#vizTitleViewer,#vizDescriptionViewer').show();
    if (titleVal) {
      this.domRoot.find('#vizTitleViewer').html(htmlsanitize(titleVal));
    }
    if (descVal) {
      this.domRoot.find('#vizDescriptionViewer').html(htmlsanitize(descVal));
    }
  }
}
ExecutionVisualizer.prototype.showVizHeaderEditMode = function() {
  this.domRoot.find('#vizHeader').show();
  this.domRoot.find('#vizTitleViewer,#vizDescriptionViewer').hide();
  this.domRoot.find('#vizTitleEditor,#vizDescriptionEditor').show();
}
ExecutionVisualizer.prototype.destroyAllAnnotationBubbles = function() {
  var myViz = this;
  if (myViz.allAnnotationBubbles) {
    $.each(myViz.allAnnotationBubbles, function(i, e) {
      e.destroyQTip();
    });
  }
  this.domRoot.find('#pyCodeOutputDiv').unbind('scroll');
  myViz.allAnnotationBubbles = null;
}
ExecutionVisualizer.prototype.initStepAnnotation = function() {
  var curEntry = this.curTrace[this.curInstr];
  if (curEntry.stepAnnotation) {
    this.domRoot.find("#stepAnnotationViewer").html(htmlsanitize(curEntry.stepAnnotation));
    this.domRoot.find("#stepAnnotationEditor").val(curEntry.stepAnnotation);
  }
  else {
    this.domRoot.find("#stepAnnotationViewer").html('');
    this.domRoot.find("#stepAnnotationEditor").val('');
  }
}
ExecutionVisualizer.prototype.initAllAnnotationBubbles = function() {
  var myViz = this;
  myViz.destroyAllAnnotationBubbles();
  var codelineIDs = [];
  $.each(this.domRoot.find('#pyCodeOutput .cod'), function(i, e) {
    codelineIDs.push($(e).attr('id'));
  });
  var heapObjectIDs = [];
  $.each(this.domRoot.find('.heapObject'), function(i, e) {
    heapObjectIDs.push($(e).attr('id'));
  });
  var variableIDs = [];
  $.each(this.domRoot.find('.variableTr'), function(i, e) {
    variableIDs.push($(e).attr('id'));
  });
  var frameIDs = [];
  $.each(this.domRoot.find('.stackFrame'), function(i, e) {
    frameIDs.push($(e).attr('id'));
  });
  myViz.allAnnotationBubbles = [];
  $.each(codelineIDs, function(i,e) {myViz.allAnnotationBubbles.push(new AnnotationBubble(myViz, 'codeline', e));});
  $.each(heapObjectIDs, function(i,e) {myViz.allAnnotationBubbles.push(new AnnotationBubble(myViz, 'object', e));});
  $.each(variableIDs, function(i,e) {myViz.allAnnotationBubbles.push(new AnnotationBubble(myViz, 'variable', e));});
  $.each(frameIDs, function(i,e) {myViz.allAnnotationBubbles.push(new AnnotationBubble(myViz, 'frame', e));});
  this.domRoot.find('#pyCodeOutputDiv').scroll(function() {
    $.each(myViz.allAnnotationBubbles, function(i, e) {
      if (e.type == 'codeline') {
        e.redrawCodelineBubble();
      }
    });
  });
}
ExecutionVisualizer.prototype.enterViewAnnotationsMode = function() {
  this.editAnnotationMode = false;
  var curEntry = this.curTrace[this.curInstr];
  var myViz = this;
  if (!myViz.allAnnotationBubbles) {
    if (curEntry.bubbleAnnotations) {
      myViz.initAllAnnotationBubbles();
      $.each(myViz.allAnnotationBubbles, function(i, e) {
        var txt = curEntry.bubbleAnnotations[e.domID];
        if (txt) {
          e.preseedText(txt);
        }
      });
    }
  }
  if (myViz.allAnnotationBubbles) {
    var curAnnotations = {};
    $.each(myViz.allAnnotationBubbles, function(i, e) {
      e.enterViewMode();
      if (e.text) {
        curAnnotations[e.domID] = e.text;
      }
    });
    curEntry.bubbleAnnotations = curAnnotations;
  }
  var stepAnnotationEditorVal = myViz.domRoot.find("#stepAnnotationEditor").val().trim();
  if (stepAnnotationEditorVal) {
    curEntry.stepAnnotation = stepAnnotationEditorVal;
  }
  else {
    delete curEntry.stepAnnotation;
  }
  myViz.initStepAnnotation();
  myViz.showVizHeaderViewMode();
  myViz.redrawConnectors();
  myViz.redrawAllAnnotationBubbles();
}
ExecutionVisualizer.prototype.enterEditAnnotationsMode = function() {
  this.editAnnotationMode = true;
  var myViz = this;
  var curEntry = this.curTrace[this.curInstr];
  if (!myViz.allAnnotationBubbles) {
    myViz.initAllAnnotationBubbles();
  }
  $.each(myViz.allAnnotationBubbles, function(i, e) {
    e.enterEditMode();
  });
  if (curEntry.stepAnnotation) {
    myViz.domRoot.find("#stepAnnotationEditor").val(curEntry.stepAnnotation);
  }
  else {
    myViz.domRoot.find("#stepAnnotationEditor").val('');
  }
  myViz.showVizHeaderEditMode();
  myViz.redrawConnectors();
  myViz.redrawAllAnnotationBubbles();
}
ExecutionVisualizer.prototype.redrawAllAnnotationBubbles = function() {
  if (this.allAnnotationBubbles) {
    $.each(this.allAnnotationBubbles, function(i, e) {
      e.redrawBubble();
    });
  }
}
ExecutionVisualizer.prototype.findPrevBreakpoint = function() {
  var myViz = this;
  var c = myViz.curInstr;
  if (myViz.sortedBreakpointsList.length == 0) {
    return -1;
  }
  else {
    for (var i = 1; i < myViz.sortedBreakpointsList.length; i++) {
      var prev = myViz.sortedBreakpointsList[i-1];
      var cur = myViz.sortedBreakpointsList[i];
      if (c <= prev)
        return -1;
      if (cur >= c)
        return prev;
    }
    var lastElt = myViz.sortedBreakpointsList[myViz.sortedBreakpointsList.length - 1];
    return (lastElt < c) ? lastElt : -1;
  }
}
ExecutionVisualizer.prototype.findNextBreakpoint = function() {
  var myViz = this;
  var c = myViz.curInstr;
  if (myViz.sortedBreakpointsList.length == 0) {
    return -1;
  }
  else if ($.inArray(c, myViz.sortedBreakpointsList) >= 0) {
    return c + 1;
  }
  else {
    for (var i = 0; i < myViz.sortedBreakpointsList.length - 1; i++) {
      var cur = myViz.sortedBreakpointsList[i];
      var next = myViz.sortedBreakpointsList[i+1];
      if (c < cur)
        return cur;
      if (cur <= c && c < next)
        return next;
    }
    var lastElt = myViz.sortedBreakpointsList[myViz.sortedBreakpointsList.length - 1];
    return (lastElt > c) ? lastElt : -1;
  }
}
ExecutionVisualizer.prototype.stepForward = function() {
  var myViz = this;
  if (myViz.editAnnotationMode) {
    return;
  }
  if (myViz.curInstr < myViz.curTrace.length - 1) {
    if (myViz.sortedBreakpointsList.length > 0) {
      var nextBreakpoint = myViz.findNextBreakpoint();
      if (nextBreakpoint != -1)
        myViz.curInstr = nextBreakpoint;
      else
        myViz.curInstr += 1;
    }
    else {
      myViz.curInstr += 1;
    }
    myViz.updateOutput(true);
    return true;
  }
  return false;
}
ExecutionVisualizer.prototype.stepBack = function() {
  var myViz = this;
  if (myViz.editAnnotationMode) {
    return;
  }
  if (myViz.curInstr > 0) {
    if (myViz.sortedBreakpointsList.length > 0) {
      var prevBreakpoint = myViz.findPrevBreakpoint();
      if (prevBreakpoint != -1)
        myViz.curInstr = prevBreakpoint;
      else
        myViz.curInstr -= 1;
    }
    else {
      myViz.curInstr -= 1;
    }
    myViz.updateOutput();
    return true;
  }
  return false;
}
ExecutionVisualizer.prototype.renderPyCodeOutput = function() {
  var myViz = this;
  this.breakpoints = d3.map();
  this.sortedBreakpointsList = [];
  this.hoverBreakpoints = d3.map();
  this.codeOutputLines = [];
  function renderSliderBreakpoints() {
    myViz.domRoot.find("#executionSliderFooter").empty();
    var sliderOverlay = myViz.domRootD3.select('#executionSliderFooter')
      .append('svg')
      .attr('id', 'sliderOverlay')
      .attr('width', myViz.domRoot.find('#executionSlider').width())
      .attr('height', 12);
    var xrange = d3.scale.linear()
      .domain([0, myViz.curTrace.length - 1])
      .range([0, myViz.domRoot.find('#executionSlider').width()]);
    sliderOverlay.selectAll('rect')
      .data(myViz.sortedBreakpointsList)
      .enter().append('rect')
      .attr('x', function(d, i) {
        if (d == 0) {
          return 0;
        }
        else {
          return xrange(d) - 3;
        }
      })
      .attr('y', 0)
      .attr('width', 2)
      .attr('height', 12)
      .style('fill', function(d) {
         if (myViz.hoverBreakpoints.has(d)) {
           return hoverBreakpointColor;
         }
         else {
           return breakpointColor;
         }
      });
  }
  function _getSortedBreakpointsList() {
    var ret = [];
    myViz.breakpoints.forEach(function(k, v) {
      ret.push(Number(k));
    });
    ret.sort(function(x,y){return x-y});
    return ret;
  }
  function addToBreakpoints(executionPoints) {
    $.each(executionPoints, function(i, ep) {
      myViz.breakpoints.set(ep, 1);
    });
    myViz.sortedBreakpointsList = _getSortedBreakpointsList();
  }
  function removeFromBreakpoints(executionPoints) {
    $.each(executionPoints, function(i, ep) {
      myViz.breakpoints.remove(ep);
    });
    myViz.sortedBreakpointsList = _getSortedBreakpointsList();
  }
  function setHoverBreakpoint(t) {
    var exePts = d3.select(t).datum().executionPoints;
    if (!exePts || exePts.length == 0) {
      return;
    }
    myViz.hoverBreakpoints = d3.map();
    $.each(exePts, function(i, ep) {
      if (!myViz.breakpoints.has(ep)) {
        myViz.hoverBreakpoints.set(ep, 1);
      }
    });
    addToBreakpoints(exePts);
    renderSliderBreakpoints();
  }
  function setBreakpoint(t) {
    var exePts = d3.select(t).datum().executionPoints;
    if (!exePts || exePts.length == 0) {
      return;
    }
    addToBreakpoints(exePts);
    $.each(exePts, function(i, ep) {
      myViz.hoverBreakpoints.remove(ep);
    });
    d3.select(t.parentNode).select('td.lineNo').style('color', breakpointColor);
    d3.select(t.parentNode).select('td.lineNo').style('font-weight', 'bold');
    renderSliderBreakpoints();
  }
  function unsetBreakpoint(t) {
    var exePts = d3.select(t).datum().executionPoints;
    if (!exePts || exePts.length == 0) {
      return;
    }
    removeFromBreakpoints(exePts);
    var lineNo = d3.select(t).datum().lineNumber;
    renderSliderBreakpoints();
  }
  var lines = this.curInputCode.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var cod = lines[i];
    var n = {};
    n.text = cod;
    n.lineNumber = i + 1;
    n.executionPoints = [];
    n.breakpointHere = false;
    $.each(this.curTrace, function(j, elt) {
      if (elt.line == n.lineNumber) {
        n.executionPoints.push(j);
      }
    });
    var breakpointInComment = false;
    var toks = cod.split('#');
    for (var j = 1 ; j < toks.length; j++) {
      if (toks[j].indexOf('breakpoint') != -1) {
        breakpointInComment = true;
      }
    }
    if (breakpointInComment && n.executionPoints.length > 0) {
      n.breakpointHere = true;
      addToBreakpoints(n.executionPoints);
    }
    this.codeOutputLines.push(n);
  }
  myViz.domRoot.find('#pyCodeOutputDiv').empty();
  var codeOutputD3 = this.domRootD3.select('#pyCodeOutputDiv')
    .append('table')
    .attr('id', 'pyCodeOutput')
    .selectAll('tr')
    .data(this.codeOutputLines)
    .enter().append('tr')
    .selectAll('td')
    .data(function(d, i){return [d, d] ;})
    .enter().append('td')
    .attr('class', function(d, i) {
      if (i == 0) {
        return 'lineNo';
      }
      else {
        return 'cod';
      }
    })
    .attr('id', function(d, i) {
      if (i == 0) {
        return 'lineNo' + d.lineNumber;
      }
      else {
        return myViz.generateID('cod' + d.lineNumber);
      }
    })
    .html(function(d, i) {
      if (i == 0) {
        return d.lineNumber;
      }
      else {
        return htmlspecialchars(d.text);
      }
    });
  if (myViz.params.arrowLines) {
      myViz.domRoot.find('#pyCodeOutput tr:first')
          .prepend('<td id="gutterTD" valign="top" rowspan="' + this.codeOutputLines.length + '"><svg id="leftCodeGutterSVG"/></td>');
      myViz.domRootD3.select('svg#leftCodeGutterSVG')
          .append('polygon')
          .attr('id', 'prevLineArrow')
          .attr('points', SVG_ARROW_POLYGON)
          .attr('fill', lightArrowColor);
      myViz.domRootD3.select('svg#leftCodeGutterSVG')
          .append('polygon')
          .attr('id', 'curLineArrow')
          .attr('points', SVG_ARROW_POLYGON)
          .attr('fill', darkArrowColor);
  }
}
function htmlWithHighlight(inputStr, highlightInd, extent, highlightCssClass) {
  var prefix = '';
  if (highlightInd > 0) {
    prefix = inputStr.slice(0, highlightInd);
  }
  var highlightedChars = inputStr.slice(highlightInd, highlightInd + extent);
  var suffix = '';
  if (highlightInd + extent < inputStr.length) {
    suffix = inputStr.slice(highlightInd + extent, inputStr.length);
  }
  var lineHTML = htmlspecialchars(prefix) +
      '<span class="' + highlightCssClass + '">' +
      htmlspecialchars(highlightedChars) +
      '</span>' +
      htmlspecialchars(suffix);
  return lineHTML;
}
ExecutionVisualizer.prototype.updateOutput = function(smoothTransition) {
  assert(this.curTrace);
  var myViz = this;
  if (!myViz.domRoot.is(':visible')) {
    return;
  }
  myViz.codeHorizontalOverflow = myViz.domRoot.find('#pyCodeOutput').width() - myViz.domRoot.find('#pyCodeOutputDiv').width();
  if (myViz.codeHorizontalOverflow < 0) {
    myViz.codeHorizontalOverflow = 0;
  }
  myViz.destroyAllAnnotationBubbles();
  myViz.initStepAnnotation();
  var prevDataVizHeight = myViz.domRoot.find('#dataViz').height();
  var gutterSVG = myViz.domRoot.find('svg#leftCodeGutterSVG');
  if (!myViz.leftGutterSvgInitialized && myViz.params.arrowLines) {
    gutterSVG.height(gutterSVG.parent().height());
    var firstRowOffsetY = myViz.domRoot.find('table#pyCodeOutput tr:first').offset().top;
    myViz.codeRowHeight = myViz.domRoot.find('table#pyCodeOutput td.cod:first').height();
    if (this.codeOutputLines && this.codeOutputLines.length > 1) {
      var secondRowOffsetY = myViz.domRoot.find('table#pyCodeOutput tr:nth-child(2)').offset().top;
      myViz.codeRowHeight = secondRowOffsetY - firstRowOffsetY;
    }
    assert(myViz.codeRowHeight > 0);
    var gutterOffsetY = gutterSVG.offset().top;
    var teenyAdjustment = gutterOffsetY - firstRowOffsetY;
    myViz.arrowOffsetY = Math.floor((myViz.codeRowHeight / 2) - (SVG_ARROW_HEIGHT / 2)) - teenyAdjustment;
    myViz.leftGutterSvgInitialized = true;
  }
  if (myViz.params.arrowLines) {
      assert(myViz.arrowOffsetY !== undefined);
      assert(myViz.codeRowHeight !== undefined);
      assert(0 <= myViz.arrowOffsetY && myViz.arrowOffsetY <= myViz.codeRowHeight);
  }
  if (this.params.updateOutputCallback) {
    this.params.updateOutputCallback(this);
  }
  var curEntry = this.curTrace[this.curInstr];
  var hasError = false;
  if (curEntry.question) {
      $('#'+curEntry.question.div).modal({position:["25%","50%"]});
  }
  var totalInstrs = this.curTrace.length;
  var isLastInstr = (this.curInstr == (totalInstrs-1));
  var vcrControls = myViz.domRoot.find("#vcrControls");
  if (isLastInstr) {
    if (this.promptForUserInput || this.promptForMouseInput) {
      vcrControls.find("#curInstr").html('<b><font color="' + brightRed + '">' + this.userInputPromptStr + '</font></b>');
      smoothTransition = false;
    }
    else if (this.instrLimitReached) {
      vcrControls.find("#curInstr").html("Instruction limit reached");
    }
    else {
      vcrControls.find("#curInstr").html("Program terminated");
    }
  }
  else {
    vcrControls.find("#curInstr").html("Step " +
                                       String(this.curInstr + 1) +
                                       " of " + String(totalInstrs-1));
  }
  vcrControls.find("#jmpFirstInstr").attr("disabled", false);
  vcrControls.find("#jmpStepBack").attr("disabled", false);
  vcrControls.find("#jmpStepFwd").attr("disabled", false);
  vcrControls.find("#jmpLastInstr").attr("disabled", false);
  if (this.curInstr == 0) {
    vcrControls.find("#jmpFirstInstr").attr("disabled", true);
    vcrControls.find("#jmpStepBack").attr("disabled", true);
  }
  if (isLastInstr) {
    vcrControls.find("#jmpLastInstr").attr("disabled", true);
    vcrControls.find("#jmpStepFwd").attr("disabled", true);
  }
  myViz.domRoot.find('#executionSlider').slider('value', this.curInstr);
  if (curEntry.event == 'exception' ||
      curEntry.event == 'uncaught_exception') {
    assert(curEntry.exception_msg);
    if (curEntry.exception_msg == "Unknown error") {
      myViz.domRoot.find("#errorOutput").html('Unknown error: Please email a bug report to philip@pgbovine.net');
    }
    else {
      myViz.domRoot.find("#errorOutput").html(htmlspecialchars(curEntry.exception_msg));
    }
    myViz.domRoot.find("#errorOutput").show();
    hasError = true;
  }
  else {
    if (!this.instrLimitReached) {
      myViz.domRoot.find("#errorOutput").hide();
    }
  }
  function highlightCodeLine() {
    var isTerminated = (!myViz.instrLimitReached && isLastInstr);
    var pcod = myViz.domRoot.find('#pyCodeOutputDiv');
    var curLineNumber = null;
    var prevLineNumber = null;
    var prevColumn = undefined;
    var prevExprStartCol = undefined;
    var prevExprWidth = undefined;
    var curIsReturn = (curEntry.event == 'return');
    var prevIsReturn = false;
    if (myViz.curInstr > 0) {
      prevLineNumber = myViz.curTrace[myViz.curInstr - 1].line;
      prevIsReturn = (myViz.curTrace[myViz.curInstr - 1].event == 'return');
      if (myViz.pyCrazyMode) {
        var p = myViz.curTrace[myViz.curInstr - 1];
        prevColumn = p.column;
        prevExprStartCol = (p.expr_start_col !== undefined) ? p.expr_start_col : p.column;
        prevExprWidth = (p.expr_width !== undefined) ? p.expr_width : 1;
      }
    }
    curLineNumber = curEntry.line;
    if (myViz.pyCrazyMode) {
      var curColumn = curEntry.column;
      var curExprStartCol = (curEntry.expr_start_col !== undefined) ? curEntry.expr_start_col : curColumn;
      var curExprWidth = (curEntry.expr_width !== undefined) ? curEntry.expr_width : 1;
      var curLineInfo = myViz.codeOutputLines[curLineNumber - 1];
      assert(curLineInfo.lineNumber == curLineNumber);
      var codeAtLine = curLineInfo.text;
      $.each(myViz.codeOutputLines, function(i, e) {
        var d = myViz.generateID('cod' + e.lineNumber);
        myViz.domRoot.find('#' + d).html(htmlspecialchars(e.text));
      });
      if (prevLineNumber == curLineNumber) {
        var curLineHTML = '';
        for (var i = 0; i < codeAtLine.length; i++) {
          var isCur = (curExprStartCol <= i) && (i < curExprStartCol + curExprWidth);
          var isPrev = (prevExprStartCol <= i) && (i < prevExprStartCol + prevExprWidth);
          var htmlEscapedChar = htmlspecialchars(codeAtLine[i]);
          if (isCur && isPrev) {
            curLineHTML += '<span class="pycrazy-highlight-prev-and-cur">' + htmlEscapedChar + '</span>';
          }
          else if (isPrev) {
            curLineHTML += '<span class="pycrazy-highlight-prev">' + htmlEscapedChar + '</span>';
          }
          else if (isCur) {
            curLineHTML += '<span class="pycrazy-highlight-cur">' + htmlEscapedChar + '</span>';
          }
          else {
            curLineHTML += htmlEscapedChar;
          }
        }
        assert(curLineHTML);
        myViz.domRoot.find('#' + myViz.generateID('cod' + curLineNumber)).html(curLineHTML);
      }
      else {
        if (prevLineNumber) {
          var prevLineInfo = myViz.codeOutputLines[prevLineNumber - 1];
          var prevLineHTML = htmlWithHighlight(prevLineInfo.text, prevExprStartCol, prevExprWidth, 'pycrazy-highlight-prev');
          myViz.domRoot.find('#' + myViz.generateID('cod' + prevLineNumber)).html(prevLineHTML);
        }
        var curLineHTML = htmlWithHighlight(codeAtLine, curExprStartCol, curExprWidth, 'pycrazy-highlight-cur');
        myViz.domRoot.find('#' + myViz.generateID('cod' + curLineNumber)).html(curLineHTML);
      }
    }
    var prevVerticalNudge = prevIsReturn ? Math.floor(myViz.codeRowHeight / 2) : 0;
    var curVerticalNudge  = curIsReturn  ? Math.floor(myViz.codeRowHeight / 2) : 0;
    if (isTerminated && !hasError) {
      if (prevLineNumber == curLineNumber) {
        curLineNumber = null;
      }
      else {
        curVerticalNudge = curVerticalNudge - 2;
      }
    }
    if (myViz.params.arrowLines) {
        if (prevLineNumber) {
            var pla = myViz.domRootD3.select('#prevLineArrow');
            var translatePrevCmd = 'translate(0, ' + (((prevLineNumber - 1) * myViz.codeRowHeight) + myViz.arrowOffsetY + prevVerticalNudge) + ')';
            if (smoothTransition) {
                pla
                    .transition()
                    .duration(200)
                    .attr('fill', 'white')
                    .each('end', function() {
                        pla
                            .attr('transform', translatePrevCmd)
                            .attr('fill', lightArrowColor);
                        gutterSVG.find('#prevLineArrow').show();
                    });
            }
            else {
                pla.attr('transform', translatePrevCmd)
                gutterSVG.find('#prevLineArrow').show();
            }
        }
        else {
            gutterSVG.find('#prevLineArrow').hide();
        }
        if (curLineNumber) {
            var cla = myViz.domRootD3.select('#curLineArrow');
            var translateCurCmd = 'translate(0, ' + (((curLineNumber - 1) * myViz.codeRowHeight) + myViz.arrowOffsetY + curVerticalNudge) + ')';
            if (smoothTransition) {
                cla
                    .transition()
                    .delay(200)
                    .duration(250)
                    .attr('transform', translateCurCmd);
            }
            else {
                cla.attr('transform', translateCurCmd);
            }
            gutterSVG.find('#curLineArrow').show();
        }
        else {
            gutterSVG.find('#curLineArrow').hide();
        }
    }
    myViz.domRootD3.selectAll('#pyCodeOutputDiv td.cod')
      .style('border-top', function(d) {
        if (hasError && (d.lineNumber == curEntry.line)) {
          return '1px solid ' + errorColor;
        }
        else {
          return '';
        }
      })
      .style('border-bottom', function(d) {
        if (hasError && (d.lineNumber == curEntry.line)) {
          return '1px solid ' + errorColor;
        }
        else {
          return '';
        }
      });
    function isOutputLineVisible(lineNo) {
      var lineNoTd = myViz.domRoot.find('#lineNo' + lineNo);
      var LO = lineNoTd.offset().top;
      var PO = pcod.offset().top;
      var ST = pcod.scrollTop();
      var H = pcod.height();
      return (PO <= LO) && (LO < (PO + H - 30));
    }
    function scrollCodeOutputToLine(lineNo) {
      var lineNoTd = myViz.domRoot.find('#lineNo' + lineNo);
      var LO = lineNoTd.offset().top;
      var PO = pcod.offset().top;
      var ST = pcod.scrollTop();
      var H = pcod.height();
      pcod.stop();
      pcod.animate({scrollTop: (ST + (LO - PO - (Math.round(H / 2))))}, 300);
    }
    if (myViz.params.highlightLines) {
        myViz.domRoot.find('#pyCodeOutputDiv td.cod').removeClass('highlight-prev');
        myViz.domRoot.find('#pyCodeOutputDiv td.cod').removeClass('highlight-cur');
        if (curLineNumber)
            myViz.domRoot.find('#'+myViz.generateID('cod'+curLineNumber)).addClass('highlight-cur');
        if (prevLineNumber)
            myViz.domRoot.find('#'+myViz.generateID('cod'+prevLineNumber)).addClass('highlight-prev');
    }
    if (!isOutputLineVisible(curEntry.line)) {
      scrollCodeOutputToLine(curEntry.line);
    }
  }
  if (curEntry.line) {
    highlightCodeLine();
  }
  if (curEntry.stdout) {
    this.domRoot.find('#progOutputs').show();
    var oldLeft = myViz.domRoot.find("#pyStdout").scrollLeft();
    myViz.domRoot.find("#pyStdout").val(curEntry.stdout);
    myViz.domRoot.find("#pyStdout").scrollLeft(oldLeft);
    myViz.domRoot.find("#pyStdout").scrollTop(myViz.domRoot.find("#pyStdout")[0].scrollHeight);
  }
  else {
    this.domRoot.find('#progOutputs').hide();
  }
  myViz.domRoot.find("#htmlOutputDiv").empty();
  if (curEntry.html_output) {
    if (curEntry.css_output) {
      myViz.domRoot.find("#htmlOutputDiv").append('<style type="text/css">' + curEntry.css_output + '</style>');
    }
    myViz.domRoot.find("#htmlOutputDiv").append(curEntry.html_output);
    if (curEntry.js_output) {
      myViz.domRoot.find("#htmlOutputDiv").append('<scr'+'ipt type="text/javascript">' + curEntry.js_output + '</scr'+'ipt>');
    }
  }
  this.renderDataStructures();
  this.enterViewAnnotationsMode();
  if (myViz.domRoot.find('#dataViz').height() != prevDataVizHeight) {
    if (this.params.heightChangeCallback) {
      this.params.heightChangeCallback(this);
    }
  }
  if (isLastInstr && this.executeCodeWithRawInputFunc) {
    if (this.promptForUserInput) {
      var userInput = prompt(this.userInputPromptStr, '');
      if (userInput !== null) {
        this.executeCodeWithRawInputFunc(userInput, this.curInstr);
      }
    }
  }
}
ExecutionVisualizer.prototype.precomputeCurTraceLayouts = function() {
  this.curTraceLayouts = [];
  this.curTraceLayouts.push([]);
  assert(this.curTrace.length > 0);
  var myViz = this;
  $.each(this.curTrace, function(i, curEntry) {
    var prevLayout = myViz.curTraceLayouts[myViz.curTraceLayouts.length - 1];
    var curLayout = $.extend(true  , [], prevLayout);
    var idsToRemove = d3.map();
    $.each(curLayout, function(i, row) {
      for (var j = 1 ; j < row.length; j++) {
        idsToRemove.set(row[j], 1);
      }
    });
    var idsAlreadyLaidOut = d3.map();
    function curLayoutIndexOf(id) {
      for (var i = 0; i < curLayout.length; i++) {
        var row = curLayout[i];
        var index = row.indexOf(id);
        if (index > 0) {
          return {row: row, index: index}
        }
      }
      return null;
    }
    function recurseIntoObject(id, curRow, newRow) {
      var heapObj = curEntry.heap[id];
      assert(heapObj);
      if (heapObj[0] == 'LIST' || heapObj[0] == 'TUPLE' || heapObj[0] == 'SET') {
        $.each(heapObj, function(ind, child) {
          if (ind < 1) return;
          if (!isPrimitiveType(child)) {
            var childID = getRefID(child);
            if (structurallyEquivalent(heapObj, curEntry.heap[childID])) {
              updateCurLayout(childID, curRow, newRow);
            }
            else if (myViz.disableHeapNesting) {
              updateCurLayout(childID, [], []);
            }
          }
        });
      }
      else if (heapObj[0] == 'DICT') {
        $.each(heapObj, function(ind, child) {
          if (ind < 1) return;
          if (myViz.disableHeapNesting) {
            var dictKey = child[0];
            if (!isPrimitiveType(dictKey)) {
              var keyChildID = getRefID(dictKey);
              updateCurLayout(keyChildID, [], []);
            }
          }
          var dictVal = child[1];
          if (!isPrimitiveType(dictVal)) {
            var childID = getRefID(dictVal);
            if (structurallyEquivalent(heapObj, curEntry.heap[childID])) {
              updateCurLayout(childID, curRow, newRow);
            }
            else if (myViz.disableHeapNesting) {
              updateCurLayout(childID, [], []);
            }
          }
        });
      }
      else if (heapObj[0] == 'INSTANCE' || heapObj[0] == 'CLASS') {
        jQuery.each(heapObj, function(ind, child) {
          var headerLength = (heapObj[0] == 'INSTANCE') ? 2 : 3;
          if (ind < headerLength) return;
          if (myViz.disableHeapNesting) {
            var instKey = child[0];
            if (!isPrimitiveType(instKey)) {
              var keyChildID = getRefID(instKey);
              updateCurLayout(keyChildID, [], []);
            }
          }
          var instVal = child[1];
          if (!isPrimitiveType(instVal)) {
            var childID = getRefID(instVal);
            if (structurallyEquivalent(heapObj, curEntry.heap[childID])) {
              updateCurLayout(childID, curRow, newRow);
            }
            else if (myViz.disableHeapNesting) {
              updateCurLayout(childID, [], []);
            }
          }
        });
      }
    }
    function updateCurLayout(id, curRow, newRow) {
      if (idsAlreadyLaidOut.has(id)) {
        return;
      }
      var curLayoutLoc = curLayoutIndexOf(id);
      var alreadyLaidOut = idsAlreadyLaidOut.has(id);
      idsAlreadyLaidOut.set(id, 1);
      if (curLayoutLoc) {
        var foundRow = curLayoutLoc.row;
        var foundIndex = curLayoutLoc.index;
        idsToRemove.remove(id);
        if (!alreadyLaidOut) {
          if (newRow.length > 1) {
            var args = [foundIndex, 0];
            for (var i = 1; i < newRow.length; i++) {
              args.push(newRow[i]);
              idsToRemove.remove(newRow[i]);
            }
            foundRow.splice.apply(foundRow, args);
            newRow.splice(0, newRow.length);
          }
        }
        recurseIntoObject(id, foundRow, []);
      }
      else {
        if (newRow.length == 0) {
          newRow.push('row' + id);
        }
        newRow.push(id);
        recurseIntoObject(id, curRow, newRow);
        if (newRow.length > 0) {
          if (curRow && curRow.length > 0) {
            for (var i = 1; i < newRow.length; i++) {
              curRow.push(newRow[i]);
            }
          }
          else {
            curLayout.push($.extend(true  , [], newRow));
          }
          for (var i = 1; i < newRow.length; i++) {
            idsToRemove.remove(newRow[i]);
          }
          newRow.splice(0, newRow.length);
        }
      }
    }
    $.each(curEntry.ordered_globals, function(i, varname) {
      var val = curEntry.globals[varname];
      if (val !== undefined) {
        if (!isPrimitiveType(val)) {
          var id = getRefID(val);
          updateCurLayout(id, null, []);
        }
      }
    });
    $.each(curEntry.stack_to_render, function(i, frame) {
      $.each(frame.ordered_varnames, function(xxx, varname) {
        var val = frame.encoded_locals[varname];
        if (!isPrimitiveType(val)) {
          var id = getRefID(val);
          updateCurLayout(id, null, []);
        }
      });
    });
    idsToRemove.forEach(function(id, xxx) {
      id = Number(id);
      $.each(curLayout, function(rownum, row) {
        var ind = row.indexOf(id);
        if (ind > 0) {
          row.splice(ind, 1);
        }
      });
    });
    curLayout = curLayout.filter(function(row) {return row.length > 1});
    myViz.curTraceLayouts.push(curLayout);
  });
  this.curTraceLayouts.splice(0, 1);
  assert (this.curTrace.length == this.curTraceLayouts.length);
}
var heapPtrSrcRE = /__heap_pointer_src_/;
ExecutionVisualizer.prototype.renderDataStructures = function() {
  var myViz = this;
  var curEntry = this.curTrace[this.curInstr];
  var curToplevelLayout = this.curTraceLayouts[this.curInstr];
  var existingConnectionEndpointIDs = d3.map();
  myViz.jsPlumbInstance.select({scope: 'varValuePointer'}).each(function(c) {
    if (!c.sourceId.match(heapPtrSrcRE)) {
      existingConnectionEndpointIDs.set(c.sourceId, c.targetId);
    }
  });
  var existingParentPointerConnectionEndpointIDs = d3.map();
  myViz.jsPlumbInstance.select({scope: 'frameParentPointer'}).each(function(c) {
    existingParentPointerConnectionEndpointIDs.set(c.sourceId, c.targetId);
  });
  var connectionEndpointIDs = d3.map();
  var heapConnectionEndpointIDs = d3.map();
  var parentPointerConnectionEndpointIDs = d3.map();
  var heap_pointer_src_id = 1;
  var renderedObjectIDs = d3.map();
  $.each(curToplevelLayout, function(xxx, row) {
    for (var i = 0; i < row.length; i++) {
      renderedObjectIDs.set(row[i], 1);
    }
  });
  var heapRows = myViz.domRootD3.select('#heap')
    .selectAll('table.heapRow')
    .data(curToplevelLayout, function(objLst) {
      return objLst[0];
  });
  heapRows.enter().append('table')
    .attr('class', 'heapRow');
  var hrExit = heapRows.exit();
  if (myViz.enableTransitions) {
    hrExit
      .style('opacity', '1')
      .transition()
      .style('opacity', '0')
      .duration(500)
      .each('end', function() {
        hrExit
          .each(function(d, idx) {
            $(this).empty();
          })
          .remove();
        myViz.redrawConnectors();
      });
  }
  else {
    hrExit
      .each(function(d, idx) {
        $(this).empty();
      })
      .remove();
  }
  var toplevelHeapObjects = heapRows
    .selectAll('td.toplevelHeapObject')
    .data(function(d, i) {return d.slice(1, d.length);},
          function(objID) {return objID;} );
  var tlhEnter = toplevelHeapObjects.enter().append('td')
    .attr('class', 'toplevelHeapObject')
    .attr('id', function(d, i) {return 'toplevel_heap_object_' + d;});
  if (myViz.enableTransitions) {
    tlhEnter
      .style('opacity', '0')
      .style('border-color', 'red')
      .transition()
      .style('opacity', '1')
      .duration(700)
      .each('end', function() {
        tlhEnter.transition()
          .style('border-color', 'white')
          .duration(300)
        });
  }
  toplevelHeapObjects
    .order()
    .each(function(objID, i) {
      $(this).empty();
      renderCompoundObject(objID, $(this), true);
    });
  var tlhExit = toplevelHeapObjects.exit();
  if (myViz.enableTransitions) {
    tlhExit.transition()
      .style('opacity', '0')
      .duration(500)
      .each('end', function() {
        tlhExit
          .each(function(d, idx) {
            $(this).empty();
          })
          .remove();
        myViz.redrawConnectors();
      });
  }
  else {
    tlhExit
      .each(function(d, idx) {
        $(this).empty();
      })
      .remove();
  }
  function renderNestedObject(obj, d3DomElement) {
    if (isPrimitiveType(obj)) {
      renderPrimitiveObject(obj, d3DomElement);
    }
    else {
      renderCompoundObject(getRefID(obj), d3DomElement, false);
    }
  }
  function renderPrimitiveObject(obj, d3DomElement) {
    var typ = typeof obj;
    if (obj == null) {
      d3DomElement.append('<span class="nullObj">None</span>');
    }
    else if (typ == "number") {
      d3DomElement.append('<span class="numberObj">' + obj + '</span>');
    }
    else if (typ == "boolean") {
      if (obj) {
        d3DomElement.append('<span class="boolObj">True</span>');
      }
      else {
        d3DomElement.append('<span class="boolObj">False</span>');
      }
    }
    else if (typ == "string") {
      var literalStr = htmlspecialchars(obj);
      literalStr = literalStr.replace(new RegExp('\"', 'g'), '\\"');
      literalStr = '"' + literalStr + '"';
      d3DomElement.append('<span class="stringObj">' + literalStr + '</span>');
    }
    else {
      assert(false);
    }
  }
  function renderCompoundObject(objID, d3DomElement, isTopLevel) {
    if (!isTopLevel && renderedObjectIDs.has(objID)) {
      var srcDivID = myViz.generateID('heap_pointer_src_' + heap_pointer_src_id);
      heap_pointer_src_id++;
      var dstDivID = myViz.generateID('heap_object_' + objID);
      if (myViz.textualMemoryLabels) {
        var labelID = srcDivID + '_text_label';
        d3DomElement.append('<div class="objectIdLabel" id="' + labelID + '">id' + objID + '</div>');
        myViz.domRoot.find('div#' + labelID).hover(
          function() {
            myViz.jsPlumbInstance.connect({source: labelID, target: dstDivID,
                                           scope: 'varValuePointer'});
          },
          function() {
            myViz.jsPlumbInstance.select({source: labelID}).detach();
          });
      }
      else {
        d3DomElement.append('<div id="' + srcDivID + '">&nbsp;</div>');
        assert(!connectionEndpointIDs.has(srcDivID));
        connectionEndpointIDs.set(srcDivID, dstDivID);
        assert(!heapConnectionEndpointIDs.has(srcDivID));
        heapConnectionEndpointIDs.set(srcDivID, dstDivID);
      }
      return;
    }
    var heapObjID = myViz.generateID('heap_object_' + objID);
    d3DomElement.append('<div class="heapObject" id="' + heapObjID + '"></div>');
    d3DomElement = myViz.domRoot.find('#' + heapObjID);
    renderedObjectIDs.set(objID, 1);
    var obj = curEntry.heap[objID];
    assert($.isArray(obj));
    var typeLabelPrefix = '';
    if (myViz.textualMemoryLabels) {
      typeLabelPrefix = 'id' + objID + ':';
    }
    if (obj[0] == 'LIST' || obj[0] == 'TUPLE' || obj[0] == 'SET' || obj[0] == 'DICT') {
      var label = obj[0].toLowerCase();
      assert(obj.length >= 1);
      if (obj.length == 1) {
        d3DomElement.append('<div class="typeLabel">' + typeLabelPrefix + 'empty ' + label + '</div>');
      }
      else {
        d3DomElement.append('<div class="typeLabel">' + typeLabelPrefix + label + '</div>');
        d3DomElement.append('<table class="' + label + 'Tbl"></table>');
        var tbl = d3DomElement.children('table');
        if (obj[0] == 'LIST' || obj[0] == 'TUPLE') {
          tbl.append('<tr></tr><tr></tr>');
          var headerTr = tbl.find('tr:first');
          var contentTr = tbl.find('tr:last');
          $.each(obj, function(ind, val) {
            if (ind < 1) return;
            headerTr.append('<td class="' + label + 'Header"></td>');
            headerTr.find('td:last').append(ind - 1);
            contentTr.append('<td class="'+ label + 'Elt"></td>');
            renderNestedObject(val, contentTr.find('td:last'));
          });
        }
        else if (obj[0] == 'SET') {
          var numElts = obj.length - 1;
          var numRows = Math.round(Math.sqrt(numElts));
          if (numRows > 3) {
            numRows -= 1;
          }
          var numCols = Math.round(numElts / numRows);
          if (numElts % numRows) {
            numCols += 1;
          }
          jQuery.each(obj, function(ind, val) {
            if (ind < 1) return;
            if (((ind - 1) % numCols) == 0) {
              tbl.append('<tr></tr>');
            }
            var curTr = tbl.find('tr:last');
            curTr.append('<td class="setElt"></td>');
            renderNestedObject(val, curTr.find('td:last'));
          });
        }
        else if (obj[0] == 'DICT') {
          $.each(obj, function(ind, kvPair) {
            if (ind < 1) return;
            tbl.append('<tr class="dictEntry"><td class="dictKey"></td><td class="dictVal"></td></tr>');
            var newRow = tbl.find('tr:last');
            var keyTd = newRow.find('td:first');
            var valTd = newRow.find('td:last');
            var key = kvPair[0];
            var val = kvPair[1];
            renderNestedObject(key, keyTd);
            renderNestedObject(val, valTd);
          });
        }
      }
    }
    else if (obj[0] == 'INSTANCE' || obj[0] == 'CLASS') {
      var isInstance = (obj[0] == 'INSTANCE');
      var headerLength = isInstance ? 2 : 3;
      assert(obj.length >= headerLength);
      if (isInstance) {
        d3DomElement.append('<div class="typeLabel">' + typeLabelPrefix + obj[1] + ' instance</div>');
      }
      else {
        var superclassStr = '';
        if (obj[2].length > 0) {
          superclassStr += ('[extends ' + obj[2].join(', ') + '] ');
        }
        d3DomElement.append('<div class="typeLabel">' + typeLabelPrefix + obj[1] + ' class ' + superclassStr + '</div>');
      }
      if (obj.length > headerLength) {
        var lab = isInstance ? 'inst' : 'class';
        d3DomElement.append('<table class="' + lab + 'Tbl"></table>');
        var tbl = d3DomElement.children('table');
        $.each(obj, function(ind, kvPair) {
          if (ind < headerLength) return;
          tbl.append('<tr class="' + lab + 'Entry"><td class="' + lab + 'Key"></td><td class="' + lab + 'Val"></td></tr>');
          var newRow = tbl.find('tr:last');
          var keyTd = newRow.find('td:first');
          var valTd = newRow.find('td:last');
          if (typeof kvPair[0] == "string") {
            var attrnameStr = htmlspecialchars(kvPair[0]);
            keyTd.append('<span class="keyObj">' + attrnameStr + '</span>');
          }
          else {
            renderNestedObject(kvPair[0], keyTd);
          }
          renderNestedObject(kvPair[1], valTd);
        });
      }
    }
    else if (obj[0] == 'INSTANCE_PPRINT') {
      d3DomElement.append('<div class="typeLabel">' + typeLabelPrefix + obj[1] + ' instance</div>');
      strRepr = htmlspecialchars(obj[2]);
      d3DomElement.append('<table class="customObjTbl"><tr><td class="customObjElt">' + strRepr + '</td></tr></table>');
    }
    else if (obj[0] == 'FUNCTION') {
      assert(obj.length == 3);
      var funcName = htmlspecialchars(obj[1]).replace('&lt;lambda&gt;', '\u03bb');
      var parentFrameID = obj[2];
      d3DomElement.append('<div class="typeLabel">' + typeLabelPrefix + 'function</div>');
      if (parentFrameID) {
        d3DomElement.append('<div class="funcObj">' + funcName + ' [parent=f'+ parentFrameID + ']</div>');
      }
      else {
        d3DomElement.append('<div class="funcObj">' + funcName + '</div>');
      }
    }
    else if (obj[0] == 'HEAP_PRIMITIVE') {
      assert(obj.length == 3);
      var typeName = obj[1];
      var primitiveVal = obj[2];
      d3DomElement.append('<div class="heapPrimitive"></div>');
      d3DomElement.find('div.heapPrimitive').append('<div class="typeLabel">' + typeLabelPrefix + typeName + '</div>');
      renderPrimitiveObject(primitiveVal, d3DomElement.find('div.heapPrimitive'));
    }
    else {
      assert(obj.length == 2);
      var typeName = obj[0];
      var strRepr = obj[1];
      strRepr = htmlspecialchars(strRepr);
      d3DomElement.append('<div class="typeLabel">' + typeLabelPrefix + typeName + '</div>');
      d3DomElement.append('<table class="customObjTbl"><tr><td class="customObjElt">' + strRepr + '</td></tr></table>');
    }
  }
  function highlightAliasedConnectors(d, i) {
    var stackPtrId = $(this).find('div.stack_pointer').attr('id');
    if (stackPtrId) {
      var foundTargetId = null;
      myViz.jsPlumbInstance.select({source: stackPtrId}).each(function(c) {foundTargetId = c.targetId;});
      myViz.jsPlumbInstance.select().each(function(c) {
        if (c.targetId == foundTargetId) {
          c.setHover(true);
          $(c.canvas).css("z-index", 2000);
        }
        else {
          c.setHover(false);
        }
      });
    }
  }
  function unhighlightAllConnectors(d, i) {
    myViz.jsPlumbInstance.select().each(function(c) {
      c.setHover(false);
    });
  }
  var realGlobalsLst = [];
  $.each(curEntry.ordered_globals, function(i, varname) {
    var val = curEntry.globals[varname];
    if (val !== undefined) {
      realGlobalsLst.push(varname);
    }
  });
  var globalsID = myViz.generateID('globals');
  var globalTblID = myViz.generateID('global_table');
  var globalVarTable = myViz.domRootD3.select('#' + globalTblID)
    .selectAll('tr')
    .data(realGlobalsLst,
          function(d) {return d;}
    );
  globalVarTable
    .enter()
    .append('tr')
    .attr('class', 'variableTr')
    .attr('id', function(d, i) {
        return myViz.generateID(varnameToCssID('global__' + d + '_tr'));
    });
  var globalVarTableCells = globalVarTable
    .selectAll('td.stackFrameVar,td.stackFrameValue')
    .data(function(d, i){return [d, d];})
  globalVarTableCells.enter()
    .append('td')
    .attr('class', function(d, i) {return (i == 0) ? 'stackFrameVar' : 'stackFrameValue';});
  globalVarTableCells
    .order()
    .each(function(varname, i) {
      if (i == 0) {
        $(this).html(varname);
      }
      else {
        $(this).empty();
        var varDivID = myViz.generateID('global__' + varnameToCssID(varname));
        existingConnectionEndpointIDs.remove(varDivID);
        var val = curEntry.globals[varname];
        if (isPrimitiveType(val)) {
          renderPrimitiveObject(val, $(this));
        }
        else {
          var heapObjID = myViz.generateID('heap_object_' + getRefID(val));
          if (myViz.textualMemoryLabels) {
            var labelID = varDivID + '_text_label';
            $(this).append('<div class="objectIdLabel" id="' + labelID + '">id' + getRefID(val) + '</div>');
            $(this).find('div#' + labelID).hover(
              function() {
                myViz.jsPlumbInstance.connect({source: labelID, target: heapObjID,
                                               scope: 'varValuePointer'});
              },
              function() {
                myViz.jsPlumbInstance.select({source: labelID}).detach();
              });
          }
          else {
            $(this).append('<div class="stack_pointer" id="' + varDivID + '">&nbsp;</div>');
            assert(!connectionEndpointIDs.has(varDivID));
            connectionEndpointIDs.set(varDivID, heapObjID);
          }
        }
      }
    });
  globalVarTableCells.exit()
    .each(function(d, idx) {
      $(this).empty();
    })
    .remove();
  globalVarTable.exit()
    .each(function(d, i) {
      $(this).find('.stack_pointer').each(function(i, sp) {
        existingConnectionEndpointIDs.remove($(sp).attr('id'));
      });
      $(this).empty();
    })
    .remove();
  if (curEntry.ordered_globals.length == 0) {
    this.domRoot.find('#' + globalsID).hide();
  }
  else {
    this.domRoot.find('#' + globalsID).show();
  }
  var stackDiv = myViz.domRootD3.select('#stack');
  var stackFrameDiv = stackDiv.selectAll('div.stackFrame,div.zombieStackFrame')
    .data(curEntry.stack_to_render, function(frame) {
      return frame.unique_hash;
    });
  var sfdEnter = stackFrameDiv.enter()
    .append('div')
    .attr('class', function(d, i) {return d.is_zombie ? 'zombieStackFrame' : 'stackFrame';})
    .attr('id', function(d, i) {return d.is_zombie ? myViz.generateID("zombie_stack" + i)
                                                   : myViz.generateID("stack" + i);
    })
    .attr('data-frame_id', function(frame, i) {return frame.frame_id;})
    .attr('data-parent_frame_id', function(frame, i) {
      return (frame.parent_frame_id_list.length > 0) ? frame.parent_frame_id_list[0] : null;
    })
    .each(function(frame, i) {
      if (!myViz.drawParentPointers) {
        return;
      }
      var my_CSS_id = $(this).attr('id');
      if (frame.parent_frame_id_list.length > 0) {
        var parent_frame_id = frame.parent_frame_id_list[0];
        myViz.domRoot.find('div#stack [data-frame_id=' + parent_frame_id + ']').each(function(i, e) {
          var parent_CSS_id = $(this).attr('id');
          parentPointerConnectionEndpointIDs.set(my_CSS_id, parent_CSS_id);
        });
      }
      else {
        if (curEntry.ordered_globals.length > 0) {
          parentPointerConnectionEndpointIDs.set(my_CSS_id, globalsID);
        }
      }
      var my_frame_id = frame.frame_id;
      myViz.domRoot.find('div#stack [data-parent_frame_id=' + my_frame_id + ']').each(function(i, e) {
        var child_CSS_id = $(this).attr('id');
        parentPointerConnectionEndpointIDs.set(child_CSS_id, my_CSS_id);
      });
    });
  sfdEnter
    .append('div')
    .attr('class', 'stackFrameHeader')
    .html(function(frame, i) {
      var funcName = htmlspecialchars(frame.func_name).replace('&lt;lambda&gt;', '\u03bb')
            .replace('\n', '<br/>');
      var headerLabel = funcName;
      if (frame.is_parent) {
        headerLabel = 'f' + frame.frame_id + ': ' + headerLabel;
      }
      if (frame.parent_frame_id_list.length > 0) {
        var parentFrameID = frame.parent_frame_id_list[0];
        headerLabel = headerLabel + ' [parent=f' + parentFrameID + ']';
      }
      return headerLabel;
    });
  sfdEnter
    .append('table')
    .attr('class', 'stackFrameVarTable');
  var stackVarTable = stackFrameDiv
    .order()
    .select('table').selectAll('tr')
    .data(function(frame) {
        return frame.ordered_varnames.map(function(varname) {return {varname:varname, frame:frame};});
      },
      function(d) {return d.varname;}
    );
  stackVarTable
    .enter()
    .append('tr')
    .attr('class', 'variableTr')
    .attr('id', function(d, i) {
        return myViz.generateID(varnameToCssID(d.frame.unique_hash + '__' + d.varname + '_tr'));
    });
  var stackVarTableCells = stackVarTable
    .selectAll('td.stackFrameVar,td.stackFrameValue')
    .data(function(d, i) {return [d, d] ;});
  stackVarTableCells.enter()
    .append('td')
    .attr('class', function(d, i) {return (i == 0) ? 'stackFrameVar' : 'stackFrameValue';});
  stackVarTableCells
    .order()
    .each(function(d, i) {
      var varname = d.varname;
      var frame = d.frame;
      if (i == 0) {
        if (varname == '__return__')
          $(this).html('<span class="retval">Return<br/>value</span>');
        else
          $(this).html(varname);
      }
      else {
        $(this).empty();
        var varDivID = myViz.generateID(varnameToCssID(frame.unique_hash + '__' + varname));
        existingConnectionEndpointIDs.remove(varDivID);
        var val = frame.encoded_locals[varname];
        if (isPrimitiveType(val)) {
          renderPrimitiveObject(val, $(this));
        }
        else {
          var heapObjID = myViz.generateID('heap_object_' + getRefID(val));
          if (myViz.textualMemoryLabels) {
            var labelID = varDivID + '_text_label';
            $(this).append('<div class="objectIdLabel" id="' + labelID + '">id' + getRefID(val) + '</div>');
            $(this).find('div#' + labelID).hover(
              function() {
                myViz.jsPlumbInstance.connect({source: labelID, target: heapObjID,
                                               scope: 'varValuePointer'});
              },
              function() {
                myViz.jsPlumbInstance.select({source: labelID}).detach();
              });
          }
          else {
            $(this).append('<div class="stack_pointer" id="' + varDivID + '">&nbsp;</div>');
            assert(!connectionEndpointIDs.has(varDivID));
            connectionEndpointIDs.set(varDivID, heapObjID);
          }
        }
      }
    });
  stackVarTableCells.exit()
    .each(function(d, idx) {
      $(this).empty();
    })
   .remove();
  stackVarTable.exit()
    .each(function(d, i) {
      $(this).find('.stack_pointer').each(function(i, sp) {
        existingConnectionEndpointIDs.remove($(sp).attr('id'));
      });
      $(this).empty();
    })
    .remove();
  stackFrameDiv.exit()
    .each(function(frame, i) {
      $(this).find('.stack_pointer').each(function(i, sp) {
        existingConnectionEndpointIDs.remove($(sp).attr('id'));
      });
      var my_CSS_id = $(this).attr('id');
      existingParentPointerConnectionEndpointIDs.forEach(function(k, v) {
        if (k == my_CSS_id || v == my_CSS_id) {
          existingParentPointerConnectionEndpointIDs.remove(k);
        }
      });
      $(this).empty();
    })
    .remove();
  myViz.jsPlumbInstance.reset();
  function renderVarValueConnector(varID, valueID) {
    myViz.jsPlumbInstance.connect({source: varID, target: valueID, scope: 'varValuePointer'});
  }
  var totalParentPointersRendered = 0;
  function renderParentPointerConnector(srcID, dstID) {
    if ((myViz.domRoot.find('#' + srcID).length == 0) ||
        (myViz.domRoot.find('#' + dstID).length == 0)) {
      return;
    }
    myViz.jsPlumbInstance.connect({source: srcID, target: dstID,
                                   anchors: ["LeftMiddle", "LeftMiddle"],
                                   connector: [ "Bezier", { curviness: 45 }],
                                   endpoint: ["Dot", {radius: 4}],
                                   scope: 'frameParentPointer'});
    totalParentPointersRendered++;
  }
  if (!myViz.textualMemoryLabels) {
    existingConnectionEndpointIDs.forEach(renderVarValueConnector);
    connectionEndpointIDs.forEach(renderVarValueConnector);
  }
  if (myViz.drawParentPointers) {
    existingParentPointerConnectionEndpointIDs.forEach(renderParentPointerConnector);
    parentPointerConnectionEndpointIDs.forEach(renderParentPointerConnector);
  }
  function highlight_frame(frameID) {
    myViz.jsPlumbInstance.select().each(function(c) {
      var stackFrameDiv = c.source.parent().parent().parent().parent();
      if (stackFrameDiv.attr('id') == frameID) {
        c.setPaintStyle({lineWidth:1, strokeStyle: connectorBaseColor});
        c.endpoints[0].setPaintStyle({fillStyle: connectorBaseColor});
        $(c.canvas).css("z-index", 1000);
      }
      else if (heapConnectionEndpointIDs.has(c.endpoints[0].elementId)) {
      }
      else {
        c.setPaintStyle({lineWidth:1, strokeStyle: connectorInactiveColor});
        c.endpoints[0].setPaintStyle({fillStyle: connectorInactiveColor});
        $(c.canvas).css("z-index", 0);
      }
    });
    myViz.domRoot.find(".stackFrame").removeClass("highlightedStackFrame");
    myViz.domRoot.find('#' + frameID).addClass("highlightedStackFrame");
  }
  var frame_already_highlighted = false;
  $.each(curEntry.stack_to_render, function(i, e) {
    if (e.is_highlighted) {
      highlight_frame(myViz.generateID('stack' + i));
      frame_already_highlighted = true;
    }
  });
  if (!frame_already_highlighted) {
    highlight_frame(myViz.generateID('globals'));
  }
}
ExecutionVisualizer.prototype.redrawConnectors = function() {
  this.jsPlumbInstance.repaintEverything();
}
var highlightedLineColor = '#e4faeb';
var highlightedLineBorderColor = '#005583';
var highlightedLineLighterColor = '#e8fff0';
var funcCallLineColor = '#a2eebd';
var brightRed = '#e93f34';
var connectorBaseColor = '#005583';
var connectorHighlightColor = brightRed;
var connectorInactiveColor = '#cccccc';
var errorColor = brightRed;
var breakpointColor = brightRed;
var hoverBreakpointColor = connectorBaseColor;
var darkArrowColor = brightRed;
var lightArrowColor = '#c9e6ca';
function assert(cond) {
  if (!cond) {
    alert("Assertion Failure (see console log for backtrace)");
    throw 'Assertion Failure';
  }
}
function htmlspecialchars(str) {
  if (typeof(str) == "string") {
    str = str.replace(/&/g, "&amp;");
    str = str.replace(/</g, "&lt;");
    str = str.replace(/>/g, "&gt;");
    str = str.replace(/ /g, "&nbsp;");
    str = str.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
  }
  return str;
}
function htmlsanitize(str) {
  if (typeof(str) == "string") {
    str = str.replace(/&/g, "&amp;");
    str = str.replace(/</g, "&lt;");
    str = str.replace(/>/g, "&gt;");
  }
  return str;
}
String.prototype.rtrim = function() {
  return this.replace(/\s*$/g, "");
}
var lbRE = new RegExp('\\[|{|\\(|<', 'g');
var rbRE = new RegExp('\\]|}|\\)|>', 'g');
function varnameToCssID(varname) {
  return varname.replace(lbRE, 'LeftB_').replace(rbRE, '_RightB').replace('.', '_DOT_');
}
function structurallyEquivalent(obj1, obj2) {
  if (isPrimitiveType(obj1) || isPrimitiveType(obj2)) {
    return false;
  }
  if (obj1[0] != obj2[0]) {
    return false;
  }
  if (obj1.length != obj2.length) {
    return false;
  }
  if (obj1[0] == 'LIST' || obj1[0] == 'TUPLE') {
    return true;
  }
  else {
    var startingInd = -1;
    if (obj1[0] == 'DICT') {
      startingInd = 2;
    }
    else if (obj1[0] == 'INSTANCE') {
      startingInd = 3;
    }
    else {
      return false;
    }
    var obj1fields = d3.map();
    for (var i = startingInd; i < obj1.length; i++) {
      obj1fields.set(obj1[i][0], 1);
    }
    for (var i = startingInd; i < obj2.length; i++) {
      if (!obj1fields.has(obj2[i][0])) {
        return false;
      }
    }
    return true;
  }
}
function isPrimitiveType(obj) {
  var typ = typeof obj;
  return ((obj == null) || (typ != "object"));
}
function getRefID(obj) {
  assert(obj[0] == 'REF');
  return obj[1];
}
var qtipShared = {
  show: {
    ready: true,
    delay: 0,
    event: null,
    effect: function() {$(this).show();},
  },
  hide: {
    fixed: true,
    event: null,
    effect: function() {$(this).hide();},
  },
  style: {
    classes: 'ui-tooltip-pgbootstrap',
  },
};
function AnnotationBubble(parentViz, type, domID) {
  this.parentViz = parentViz;
  this.domID = domID;
  this.hashID = '#' + domID;
  this.type = type;
  if (type == 'codeline') {
    this.my = 'left center';
    this.at = 'right center';
  }
  else if (type == 'frame') {
    this.my = 'right center';
    this.at = 'left center';
  }
  else if (type == 'variable') {
    this.my = 'right center';
    this.at = 'left center';
  }
  else if (type == 'object') {
    this.my = 'bottom left';
    this.at = 'top center';
  }
  else {
    assert(false);
  }
  this.state = 'invisible';
  this.text = '';
  this.qtipHidden = false;
}
AnnotationBubble.prototype.showStub = function() {
  assert(this.state == 'invisible' || this.state == 'edit');
  assert(this.text == '');
  var myBubble = this;
  this.destroyQTip();
  $(this.hashID).qtip($.extend({}, qtipShared, {
    content: ' ',
    id: this.domID,
    position: {
      my: this.my,
      at: this.at,
      adjust: {
        x: (myBubble.type == 'codeline' ? -6 : 0),
      },
      effect: null,
    },
    style: {
      classes: 'ui-tooltip-pgbootstrap ui-tooltip-pgbootstrap-stub'
    }
  }));
  $(this.qTipID())
    .unbind('click')
    .click(function() {
      myBubble.showEditor();
    });
  this.state = 'stub';
}
AnnotationBubble.prototype.showEditor = function() {
  assert(this.state == 'stub' || this.state == 'view' || this.state == 'minimized');
  var myBubble = this;
  var ta = '<textarea class="bubbleInputText">' + this.text + '</textarea>';
  this.destroyQTip();
  $(this.hashID).qtip($.extend({}, qtipShared, {
    content: ta,
    id: this.domID,
    position: {
      my: this.my,
      at: this.at,
      adjust: {
        x: (myBubble.type == 'codeline' ? -6 : 0),
      },
      effect: null,
    }
  }));
  $(this.qTipContentID()).find('textarea.bubbleInputText')
    .blur(function() {
      myBubble.text = $(this).val().trim();
      if (myBubble.text) {
        myBubble.showViewer();
      }
      else {
        myBubble.showStub();
      }
    })
    .focus();
  this.state = 'edit';
}
AnnotationBubble.prototype.bindViewerClickHandler = function() {
  var myBubble = this;
  $(this.qTipID())
    .unbind('click')
    .click(function() {
      if (myBubble.parentViz.editAnnotationMode) {
        myBubble.showEditor();
      }
      else {
        myBubble.minimizeViewer();
      }
    });
}
AnnotationBubble.prototype.showViewer = function() {
  assert(this.state == 'edit' || this.state == 'invisible');
  assert(this.text);
  var myBubble = this;
  this.destroyQTip();
  $(this.hashID).qtip($.extend({}, qtipShared, {
    content: htmlsanitize(this.text),
    id: this.domID,
    position: {
      my: this.my,
      at: this.at,
      adjust: {
        x: (myBubble.type == 'codeline' ? -6 : 0),
      },
      effect: null,
    }
  }));
  this.bindViewerClickHandler();
  this.state = 'view';
}
AnnotationBubble.prototype.minimizeViewer = function() {
  assert(this.state == 'view');
  var myBubble = this;
  $(this.hashID).qtip('option', 'content.text', ' ');
  $(this.qTipID())
    .unbind('click')
    .click(function() {
      if (myBubble.parentViz.editAnnotationMode) {
        myBubble.showEditor();
      }
      else {
        myBubble.restoreViewer();
      }
    });
  this.state = 'minimized';
}
AnnotationBubble.prototype.restoreViewer = function() {
  assert(this.state == 'minimized');
  $(this.hashID).qtip('option', 'content.text', htmlsanitize(this.text));
  this.bindViewerClickHandler();
  this.state = 'view';
}
AnnotationBubble.prototype.makeInvisible = function() {
  assert(this.state == 'stub' || this.state == 'edit');
  this.destroyQTip();
  this.state = 'invisible';
}
AnnotationBubble.prototype.destroyQTip = function() {
  $(this.hashID).qtip('destroy');
}
AnnotationBubble.prototype.qTipContentID = function() {
  return '#ui-tooltip-' + this.domID + '-content';
}
AnnotationBubble.prototype.qTipID = function() {
  return '#ui-tooltip-' + this.domID;
}
AnnotationBubble.prototype.enterEditMode = function() {
  assert(this.parentViz.editAnnotationMode);
  if (this.state == 'invisible') {
    this.showStub();
    if (this.type == 'codeline') {
      this.redrawCodelineBubble();
    }
  }
}
AnnotationBubble.prototype.enterViewMode = function() {
  assert(!this.parentViz.editAnnotationMode);
  if (this.state == 'stub') {
    this.makeInvisible();
  }
  else if (this.state == 'edit') {
    this.text = $(this.qTipContentID()).find('textarea.bubbleInputText').val().trim();
    if (this.text) {
      this.showViewer();
      if (this.type == 'codeline') {
        this.redrawCodelineBubble();
      }
    }
    else {
      this.makeInvisible();
    }
  }
  else if (this.state == 'invisible') {
    if (this.text) {
      this.showViewer();
      if (this.type == 'codeline') {
        this.redrawCodelineBubble();
      }
    }
  }
}
AnnotationBubble.prototype.preseedText = function(txt) {
  assert(this.state == 'invisible');
  this.text = txt;
}
AnnotationBubble.prototype.redrawCodelineBubble = function() {
  assert(this.type == 'codeline');
  if (isOutputLineVisibleForBubbles(this.domID)) {
    if (this.qtipHidden) {
      $(this.hashID).qtip('show');
    }
    else {
      $(this.hashID).qtip('reposition');
    }
    this.qtipHidden = false;
  }
  else {
    $(this.hashID).qtip('hide');
    this.qtipHidden = true;
  }
}
AnnotationBubble.prototype.redrawBubble = function() {
  $(this.hashID).qtip('reposition');
}
function isOutputLineVisibleForBubbles(lineDivID) {
  var pcod = $('#pyCodeOutputDiv');
  var lineNoTd = $('#' + lineDivID);
  var LO = lineNoTd.offset().top;
  var PO = pcod.offset().top;
  var ST = pcod.scrollTop();
  var H = pcod.height();
  return (PO <= LO) && (LO < (PO + H - 25));
}
function traceQCheckMe(inputId, divId, answer) {
   var vis = $("#"+divId).data("vis")
   var i = vis.curInstr
   var curEntry = vis.curTrace[i+1];
   var ans = $('#'+inputId).val()
   var attrs = answer.split(".")
   var correctAns = curEntry;
   for (j in attrs) {
       correctAns = correctAns[attrs[j]]
   }
   feedbackElement = $("#" + divId + "_feedbacktext")
   if (ans.length > 0 && ans == correctAns) {
       feedbackElement.html('Correct')
   } else {
       feedbackElement.html(vis.curTrace[i].question.feedback)
   }
}
function closeModal(divId) {
    $.modal.close()
    $("#"+divId).data("vis").stepForward();
}

