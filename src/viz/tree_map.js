
vizwhiz.viz.tree_map = function() {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Public Variables with Default Settings
  //-------------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0},
    width = window.innerWidth,
    height = window.innerHeight,
    depth = null,
    value_var = "value",
    id_var = "id",
    text_var = "name",
    nesting = null,
    filter = [],
    dispatch = d3.dispatch('elementMouseover', 'elementMouseout');
  
  //===================================================================

  function chart(selection) {
    selection.each(function(data) {
      
      var cloned_data = JSON.parse(JSON.stringify(data));
      
      var nested_data = vizwhiz.utils.nest(cloned_data, nesting, false, [{"key":"color"}])
      console.log(nested_data)
      nested_data.children = nested_data.children.filter(filter_data)
      // console.log(nested_data)
      // return
      
      
      // Select the svg element, if it exists.
      var animation_time = 750;
      var svg = d3.select(this).selectAll("svg").data([nested_data]);
      var svg_enter = svg.enter().append("svg")
        .attr('width',width)
        .attr('height',height)
      
      // Ok, to get started, lets run our heirarchically nested
      // data object through the d3 treemap function to get a
      // flat array of data with X, Y, width and height vars
      var tmap_data = d3.layout.treemap()
        .round(false)
        .size([width, height])
        .children(function(d) { return d.children; })
        .sort(function(a, b) { return a.value - b.value; })
        .value(function(d) { return value_var ? d[value_var] : d.value; })
        .nodes(nested_data)
        .filter(function(d) {
          return !d.children;
        })
      
      // We'll figure out how many levels of nesting there are to determine
      // the options for which depths to show
      // var max_depth = d3.max(tmap_data, function(d){ return d.depth; });
      
      // filter the tree map nodes to only the depth requested
      // tmap_data = tmap_data.filter(function(d) { return d.depth === (depth || max_depth); });
      
      // If it's the first time the app is being built, add group for nodes
      svg_enter.append("clipPath")
        .attr("id","clipping")
        .append("rect")
          .attr("width",width)
          .attr("height",height)
          
      d3.select("#clipping rect").transition(750)
        .attr("width",width)
        .attr("height",height)
        
      svg_enter.append("g")
        .attr("class", "viz")
        // .attr("transform", function(d){ return "translate("+(stroke_width/2)+", "+height+")"; })
        .attr("clip-path","url(#clipping)")
      
      var cell = d3.select("g.viz").selectAll("g")
        .data(tmap_data, function(d){ return d[text_var]; })
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Update, for cells that are already in existance
      //-------------------------------------------------------------------

      // need to perform updates in "each" clause so that new data is 
      // propogated down to rects and text elements
      cell.transition().duration(animation_time)
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
        .attr("opacity", 1)
        .each(function(g_data) {

          // update rectangles
          d3.select(this).selectAll("rect").transition().duration(animation_time)
            .attr('width', function() {
              return g_data.dx+'px'
            })
            .attr('height', function() { 
              return g_data.dy+'px'
            })

          // text (name)
          d3.select(this).selectAll("text.name")
            .attr("opacity", function(){
              return 0;
            })
            .transition().duration(animation_time)
            .each("end", function(q, i){
              // need to recalculate word wrapping because dimensions have changed
              var text = text_var ? g_data[text_var] : g_data.name;
              if(text){
                vizwhiz.utils.wordWrap(text, this, g_data.dx, g_data.dy, true)
              }
              d3.select(this).transition().duration(animation_time/2).attr("opacity", 1)
            })

          // text (share)
          d3.select(this).selectAll("text.share").transition().duration(animation_time)
            .text(function(){
              var root = g_data;
              while(root.parent){ root = root.parent; } // find top most parent ndoe
              return vizwhiz.utils.format_num(g_data.value/root.value, true, 2);
            })
            .attr('font-size',function(){
              var size = (g_data.dx)/7
              if(g_data.dx < g_data.dy) var size = g_data.dx/7
              else var size = g_data.dy/7
              return size
            })
            .attr('x', function(){
              return g_data.dx/2
            })
            .attr('y',function(){
              return g_data.dy-(parseInt(d3.select(this).attr('font-size'),10)*0.10)
            })

        })

      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // New cells enter, initialize them here
      //-------------------------------------------------------------------
      
      // cell aka container
      var cell_enter = cell.enter().append("g")
        .attr("opacity", 1)
        .attr("transform", function(d) {
          return "translate(" + d.x + "," + d.y + ")"; 
        })
      
      // rectangle
      cell_enter.append("rect")
        .attr("stroke","#ffffff")
        .attr('width', function(d) {
          return d.dx+'px'
        })
        .attr('height', function(d) { 
          return d.dy+'px'
        })
        .attr("fill", function(d){
          // in case this depth doesn't have a color but a child of
          // this element DOES... use that color
          while(!d.color && d.children){
            d = d.children[0]
          }
          // if a color cannot be found (at this depth of deeper) use random
          return d.color ? d.color : vizwhiz.utils.rand_color();
        })
      
      // text (name)
      cell_enter.append("text")
        .attr("opacity", 1)
        .attr("text-anchor","start")
        .style("font-weight","bold")
        .attr("font-family","Helvetica")
        .attr('class','name')
        .attr('x','0.2em')
        .attr('y','0em')
        .attr('dy','1em')
        .attr("fill", function(d){
          if(d.text_color) return d.text_color
          return d3.hsl(d.color).l >= 0.5 ? "#333" : "#fff";
        })
        .each(function(d){
          var text = text_var ? d[text_var] : d.name;
          if(text){
            vizwhiz.utils.wordWrap(text, this, d.dx, d.dy, true)
          }
        })
      
      // text (share)
      cell_enter.append("text")
        .attr('class','share')
        .attr("text-anchor","middle")
        .style("font-weight","bold")
        .attr("font-family","Helvetica")
        .attr("fill", function(d){
          if(d.text_color) return d.text_color
          return d3.hsl(d.color).l >= 0.5 ? "#333" : "#fff";
        })
        .text(function(d) {
          var root = d;
          while(root.parent){ root = root.parent; } // find top most parent ndoe
          return vizwhiz.utils.format_num(d.value/root.value, true, 2);
        })
        .attr('font-size',function(d){
          var size = (d.dx)/7
          if(d.dx < d.dy) var size = d.dx/7
          else var size = d.dy/7
          return size
        })
        .attr('x', function(d){
          return d.dx/2
        })
        .attr('y',function(d){
          return d.dy-(parseInt(d3.select(this).attr('font-size'),10)*0.10)
        })
      
      //===================================================================
      
      //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      // Exis, get rid of old cells
      //-------------------------------------------------------------------
      
      cell.exit().transition().duration(animation_time)
        .attr("opacity", 0)
        .remove()

      //===================================================================
      
    });


    return chart;
  }
  
  function filter_data(d){
    if(d.children && d.children.length){
      d.children = d.children.filter(filter_data);
    }
    if(filter.indexOf(d.name) > -1){
      return false
    }
    return true;
  }


  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Expose Public Variables
  //-------------------------------------------------------------------

  chart.dispatch = dispatch;

  chart.width = function(x) {
    if (!arguments.length) return width;
    width = x;
    return chart;
  };

  chart.height = function(x) {
    if (!arguments.length) return height;
    height = x;
    return chart;
  };
  
  chart.depth = function(x) {
    if (!arguments.length) return depth;
    depth = x;
    return chart;
  };
  
  chart.value_var = function(x) {
    if (!arguments.length) return value_var;
    value_var = x;
    return chart;
  };
  
  chart.id_var = function(x) {
    if (!arguments.length) return id_var;
    id_var = x;
    return chart;
  };
  
  chart.text_var = function(x) {
    if (!arguments.length) return text_var;
    text_var = x;
    return chart;
  };
  
  chart.nesting = function(x) {
    if (!arguments.length) return nesting;
    nesting = x;
    return chart;
  };
  
  chart.filter = function(x) {
    if (!arguments.length) return filter;
    // if we've given an array then overwrite the current filter var
    if(x instanceof Array){
      filter = x;
    }
    // otherwise add/remove it from array
    else {
      // if element is in the array remove it
      if(filter.indexOf(x) > -1){
        filter.splice(filter.indexOf(x), 1)
      }
      else {
        filter.push(x)
      }
    }
    return chart;
  };

  chart.margin = function(x) {
    if (!arguments.length) return margin;
    margin.top    = typeof x.top    != 'undefined' ? x.top    : margin.top;
    margin.right  = typeof x.right  != 'undefined' ? x.right  : margin.right;
    margin.bottom = typeof x.bottom != 'undefined' ? x.bottom : margin.bottom;
    margin.left   = typeof x.left   != 'undefined' ? x.left   : margin.left;
    return chart;
  };

  //===================================================================


  return chart;
};