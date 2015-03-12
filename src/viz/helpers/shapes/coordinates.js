var copy = require("../../../util/copy.coffee"),
    distance    = require("../../../network/distance.coffee"),
    fetchText   = require("../../../core/fetch/text.js"),
    fontSizes   = require("../../../font/sizes.coffee"),
    largestRect = require("../../../geom/largestRect.coffee"),
    path2poly   = require("../../../geom/path2poly.coffee"),
    shapeStyle  = require("./style.coffee")
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Draws "square" and "circle" shapes using svg:rect
//------------------------------------------------------------------------------
module.exports = function(vars,selection,enter,exit) {

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Define the geographical projection
  //----------------------------------------------------------------------------
  var projection = d3.geo[vars.coords.projection.value]()
    .center(vars.coords.center)

  if (!vars.zoom.scale) {
    vars.zoom.scale = 1
  }

  vars.zoom.area = 1/vars.zoom.scale/vars.zoom.scale

  vars.path = d3.geo.path()
    .projection(projection)

  enter.append("path")
    .attr("id",function(d){
      return d.id
    })
    .attr("class","d3plus_data")
    .attr("d",vars.path)
    .call(shapeStyle,vars)

  if (vars.draw.timing) {
    selection.selectAll("path.d3plus_data")
      .transition().duration(vars.draw.timing)
        .call(shapeStyle,vars)
  }
  else {
    selection.selectAll("path.d3plus_data")
      .call(shapeStyle,vars)
  }

  var size_change = vars.old_height != vars.height.viz || vars.height.changed
    || vars.old_width != vars.width.viz || vars.width.changed

  vars.old_height = vars.height.viz
  vars.old_width = vars.width.viz

  if (vars.coords.changed || size_change || vars.coords.mute.changed || vars.coords.solo.changed || vars.type.changed) {

    vars.zoom.bounds = null;
    vars.zoom.reset = true;
    vars.zoom.coords = {};

    selection.each(function(d){

      if (d.geometry.coordinates.length > 1) {

        var distances = [],
            areas = [],
            test = copy(d),
            largest = copy(d),
            largest_area = 0;

        d.geometry.coordinates = d.geometry.coordinates.filter(function(c,i){

          test.geometry.coordinates = [c];
          var a = vars.path.area(test);
          if (a > 0) {
            areas.push(a);
            if (a > largest_area) {
              largest.geometry.coordinates = [c];
              largest_area = a;
            }
            return true;
          }
          return false;

        });

        var center = vars.path.centroid(largest),
            reduced = copy(d);

        d.geometry.coordinates.forEach(function(c,i){
          test.geometry.coordinates = [c];
          distances.push(distance(vars.path.centroid(test),center));
        });

        var dist_values = distances.reduce(function(arr, dist, i){
              if (dist) {
                arr.push(areas[i]/dist);
              }
              return arr;
            }, []),
            dist_cutoff = d3.quantile(dist_values, vars.coords.threshold.value);

        reduced.geometry.coordinates = reduced.geometry.coordinates.filter(function(c,i){
          var dist = distances[i], a = areas[i];
          return dist === 0 || a/dist > dist_cutoff;
        });

        var coords = largest.geometry.coordinates[0];
        if (coords && largest.geometry.type === "MultiPolygon") {
          coords = coords[0];
          largest.geometry.coordinates[0] = coords;
          largest.geometry.type = "Polygon";
        }

      }
      else {
        var reduced = d, largest = d, coords = d.geometry.coordinates[0];
      }

      vars.zoom.coords[d.d3plus.id] = reduced;

      var b = vars.path.bounds(reduced);

      var names = fetchText(vars,d);

      if (coords && names.length) {

        var path = path2poly(vars.path(largest));

        var style = {
          "font-weight": vars.labels.font.weight,
          "font-family": vars.labels.font.family.value
        };

        if (names[0].split(" ").length === 1) {
          var size = fontSizes(names[0],style)[0],
              ratio = size.width/size.height;
        }
        else {
          var ratio = null;
        }

        var rect = largestRect(path,{
          "angle": 0,
          "aspectRatio": ratio
        });

        if (rect) {

          rect = rect[0];

          d.d3plus_label = {
            "anchor": "middle",
            "valign": "center",
            "h": rect.height,
            "w": rect.width,
            "x": rect.cx,
            "y": rect.cy,
            "names": names
          };

        }
        else {
          delete d.d3plus_label
        }

      }
      else {
        delete d.d3plus_label
      }

      if (!vars.zoom.bounds) {
        vars.zoom.bounds =  b;
      }
      else {
        if (vars.zoom.bounds[0][0] > b[0][0]) {
          vars.zoom.bounds[0][0] = b[0][0]
        }
        if (vars.zoom.bounds[0][1] > b[0][1]) {
          vars.zoom.bounds[0][1] = b[0][1]
        }
        if (vars.zoom.bounds[1][0] < b[1][0]) {
          vars.zoom.bounds[1][0] = b[1][0]
        }
        if (vars.zoom.bounds[1][1] < b[1][1]) {
          vars.zoom.bounds[1][1] = b[1][1]
        }
      }

    })

  }
  else if (!vars.focus.value.length) {
    vars.zoom.viewport = false
  }

}
