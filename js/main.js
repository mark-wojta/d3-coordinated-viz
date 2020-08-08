/* JavaScript by Mark Wojta, 2020 */
// majority of JS credited to UW Wisconsin-Madison Department of Geography


//refreshes page when page resized
//credit: https://stackoverflow.com/questions/5836779/how-can-i-refresh-the-screen-on-browser-resize/18321223
var resizeTimeout;
window.addEventListener('resize', function(event) {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(function(){
    window.location.reload();
  }, 500);
});

//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

//pseudo-global variables
var attrArray = ["% of Newborn Moms Married", "% Newborn Moms Unmarried", "% of Male Newborns",
    "% of Female Newborns", "Crude Birth Rate", "General Fertility Rate", "Low Birthweight Percentage", "Births at Home",
    "% Newborn Moms Obtained Less than Highschool Degree", "% Newborn Moms Obtained Only Highschool Degree",
    "% Newborn Moms Obtained More than Highschool Degree", "% Newborn Moms Aged 17 and Younger",
    "% Newborn Moms Aged 18 to 39", "% Newborn Moms Aged 40 and Older", "% Newborn Moms White",
    "% Newborn Moms Black/African American", "% Newborn Moms American Indian/ Alaska Native", "% Newborn Moms Hispanic",
    "% Newborn Moms Laotian or Hmong", "% Newborn Moms Other Asian/ Pacific Islander", "% Newborn Moms Other Race",
    "% Newborn Moms Two or more Races"
]; //list of attributes
var expressed = attrArray[0]; //initial attribute

//chart frame dimensions
var chartWidth = window.innerWidth * 0.40,
    chartHeight = 400,
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

//create a scale to size bars proportionally to frame
var yScale = d3.scaleLinear()
    .range([chartHeight - 10, 0])
    .domain([0, 88*1.1]);

//begin script when window loads
window.onload = setMap();

//Example 1.3 line 4...set up choropleth map
function setMap(){

    //map frame dimensions
    var width = window.innerWidth * 0.5,
      height = 400;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on southern Wisconsin
    var projection = d3.geoConicConformal()
        .center([-91.4, 43.75])
        .rotate([-2, 0, 0])
        .parallels([0, 0])
        .scale(5000)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    //topojson data from https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html
    //csv data from www.dhs.wisconsin.gov
    var promises = [];
    promises.push(d3.csv("data/births.csv")); //load births attributes from csv
    promises.push(d3.json("data/states.topojson")); //load states spatial data
    promises.push(d3.json("data/wisconsin.topojson")); //load wisconsin counties spatial data
    promises.push(d3.json("data/counties.topojson")); //load background spatial data
    Promise.all(promises).then(callback);

    function callback(data){

    		[births, states, wisconsin, counties] = data;

        //place graticule on the map
        setGraticule(map, path);

        //translate countries TopoJSON
        var allStates = topojson.feature(states, states.objects.states),
            state = topojson.feature(wisconsin, wisconsin.objects.wisconsin),
            allCounties = topojson.feature(counties, counties.objects.southCounties).features;

        //add states to map
        var states = map.append("path")
            .datum(allStates)
            .attr("class", "states")
            .attr("d", path);

        //add wisconsin to map
        var stateWis = map.append("path")
            .datum(state)
            .attr("class", "stateWis")
            .attr("d", path);

        //join csv data to GeoJSON enumeration units
        allCounties = joinData(allCounties, births);

        //create the color scale
        var colorScale = makeColorScale(births);

        //add enumeration units to the map
        setEnumerationUnits(allCounties, map, path, colorScale);

        //add coordinated visualization to the map
        setChart(births, colorScale);

        //create drop down
        createDropdown(births);
    };
}; //end of setMap()

//Example 1.3 line 4...set up choropleth map
function setDropdown(){

}; //end of setMap()
//function to create coordinated bar chart
function setChart(births, colorScale){

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //set bars for each county
    var bars = chart.selectAll(".bar")
        .data(births)
        .enter()
        .append("rect")
        .sort(function(a, b){
                    return b[expressed]-a[expressed]
                })
        .attr("class", function(d){
            return "bar " + d.County;
        })
        .attr("width", chartInnerWidth / births.length - 1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);

    //below Example 2.2 line 31...add style descriptor to each rect
    var desc = bars.append("desc")
    .text('{"stroke": "none", "stroke-width": "0px"}');

    //below Example 2.8...create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 20)
        .attr("y", 40)
        .attr("class", "chartTitle")

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //set bar positions, heights, and colors
    updateChart(bars, births.length, colorScale);
};

//function to create natural breaks color scale generator
function makeColorScale(data){
    var colorClasses = [
        "#feebe2",
        "#fbb4b9",
        "#f768a1",
        "#c51b8a",
        "#7a0177"
    ];

    //create color scale generator
    var colorScale = d3.scaleThreshold()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //cluster data using ckmeans clustering algorithm to create natural breaks
    var clusters = ss.ckmeans(domainArray, 5);
    //reset domain array to cluster minimums
    domainArray = clusters.map(function(d){
        return d3.min(d);
    });
    //remove first value from domain array to create class breakpoints
    domainArray.shift();

    //assign array of last 4 cluster minimums as domain
    colorScale.domain(domainArray);

    return colorScale;
};

//function to test for data value and return color
function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#CCC";
    };
};

function setGraticule(map, path){
	//create graticule generator
	var graticule = d3.geoGraticule();

	//create graticule background
	var gratBackground = map.append("path")
		.datum(graticule.outline()) //bind graticule background
		.attr("class", "gratBackground") //assign class for styling
		.attr("d", path); //project graticule

};

function joinData(allCounties, births){
    //loop through csv to assign each set of csv attribute values to geojson county
    for (var i=0; i<births.length; i++){
        var csvBirths = births[i]; //the current county
        var csvKey = csvBirths.County; //the CSV primary key

        //loop through geojson regions to find correct county
        for (var a=0; a<allCounties.length; a++){

            var geojsonProps = allCounties[a].properties; //the current county geojson properties
            var geojsonKey = geojsonProps.County; //the geojson primary key

            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){

                //assign all attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvBirths[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
        };
    };

    return allCounties;
};

function setEnumerationUnits(allCounties, map, path, colorScale){
  	//add interactive Wisconsin counties to map
  	var usedCounties = map.selectAll(".usedCounties")
      	.data(allCounties)
      	.enter()
      	.append("path")
      	.attr("class", function(d){
      	    return "usedCounties " + d.properties.County;
      	})
      	.attr("d", path)
      	.style("fill", function(d){
            return choropleth(d.properties, colorScale);
        })
        .on("mouseover", function(d){
            highlight(d.properties);
        })
        .on("mouseout", function(d){
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel);

    //add style descriptor to each path
    var desc = usedCounties.append("desc")
    .text('{"stroke": "#000", "stroke-width": "0.5px"}');
};

//function to create a dropdown menu for attribute selection
function createDropdown(births){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, births)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};

//Example 1.4 line 14...dropdown change listener handler
function changeAttribute(attribute, births){
    //change the expressed attribute
    expressed = attribute;

    // change yscale dynamically
    csvmax = d3.max(births, function(d) { return parseFloat(d[expressed]); });

    yScale = d3.scaleLinear()
        .range([chartHeight - 10, 0])
        .domain([0, csvmax*1.1]);

    //updata vertical axis
    d3.select(".axis").remove();
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = d3.select(".chart")
        .append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //recreate the color scale
    var colorScale = makeColorScale(births);

    //recolor enumeration units
    var usedCounties = d3.selectAll(".usedCounties")
        .transition()
        .duration(1000)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });

    //Example 1.7 line 22...re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
        //re-sort bars
        .sort(function(a, b){
           return b[expressed] - a[expressed];
        })
        .transition() //add animation
        .delay(function(d, i){
           return i * 20
        })
        .duration(500);

    updateChart(bars, births.length, colorScale);
};

//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n ) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
            return 391 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });

        //at the bottom of updateChart()...add text to chart title
        var chartTitle = d3.select(".chartTitle")
            .text(expressed)
            .style("font-size", '1.3vw')
            .attr("dy", -10)
            .attr("dx", 9.5);
};

//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.County)
        .style("stroke", "blue")
        .style("stroke-width", "2");

    setLabel(props);
};

//function to reset the element style on mouseout
function dehighlight(props){
   var selected = d3.selectAll("." + props.County)
       .style("stroke", function(){
           return getStyle(this, "stroke")
       })
       .style("stroke-width", function(){
           return getStyle(this, "stroke-width")
       });

  //remove info label
  d3.select(".infolabel")
      .remove();

   function getStyle(element, styleName){
       var styleText = d3.select(element)
           .select("desc")
           .text();

       var styleObject = JSON.parse(styleText);

       return styleObject[styleName];
   };
};

//function to create dynamic label
function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.County + "_label")
        .html(labelAttribute);

    var countyName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.County + " County");
};

//function to move info label with mouse
function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1;

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};

})(); //last line of main.js
