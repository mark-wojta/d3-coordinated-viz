/* JavaScript by Mark Wojta, 2020 */
// majority of JS credited to UW Wisconsin-Madison Department of Geography

//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

//pseudo-global variables
var attrArray = ["aerospace","apparel","businessServices","chemicals","energy","engineeringConstruction",
"financials","foodDrugStores","foodBeveragesTobacco","healthCare","householdProducts","industrials","materials",
"media","motorVehiclesParts","retailing","technology","telecommunications","transportation","wholesalers"
]; //list of attributes
var expressed = attrArray[0]; //initial attribute

//begin script when window loads
window.onload = setMap();

//Example 1.3 line 4...set up choropleth map
function setMap(){

    //map frame dimensions
    var width = window.innerWidth * 0.5,
      height = 460;

    //create new svg container for the map
    var map = d3.select("body")
      .append("svg")
      .attr("class", "map")
      .attr("width", width)
      .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
      .center([0, 45])
      .rotate([-2, 0, 0])
      .parallels([0, 0])
      .scale(100)
      .translate([width / 2, height / 2]);

    var path = d3.geoPath()
      .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
    promises.push(d3.csv("data/fortune500.csv")); //load attributes from csv
    promises.push(d3.json("data/countries.topojson")); //load background spatial data
    promises.push(d3.json("data/countries500.topojson")); //load fortune500 companies spatial data
    Promise.all(promises).then(callback);

    function callback(data){

    		[fortune500, country, country500] = data;

        //place graticule on the map
        setGraticule(map, path);

        //translate countries TopoJSON
        var countriesAll = topojson.feature(country, country.objects.countries),
            countries500 = topojson.feature(country500, country500.objects.countries500).features;

        //add countries to map
        var countries = map.append("path")
          .datum(countriesAll)
          .attr("class", "countries")
          .attr("d", path);

        //join csv data to GeoJSON enumeration units
        countries500 = joinData(countries500, fortune500);

        //create the color scale
        var colorScale = makeColorScale(fortune500);

        //add enumeration units to the map
        setEnumerationUnits(countries500, map, path, colorScale);

        //add coordinated visualization to the map
        setChart(fortune500, colorScale);
  };
}; //end of setMap()

//function to create coordinated bar chart
function setChart(fortune500, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
    chartHeight = 473,
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

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

    //create a scale to size bars proportionally to frame
    var yScale = d3.scaleLinear()
        .range([0, chartHeight])
        .domain([0, 105]);

    //set bars for each province
    var bars = chart.selectAll(".bars")
        .data(fortune500)
        .enter()
        .append("rect")
        .sort(function(a, b){
                    return b[expressed]-a[expressed]
                })
        .attr("class", function(d){
            return "bars " + d.name_long;
        })
        .attr("width", chartWidth / fortune500.length - 1)
        .attr("x", function(d, i){
            return i * (chartWidth / fortune500.length) + leftPadding;
        })
        .attr("height", function(d, i){
            return chartHeight - 10 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });

    //annotate bars with attribute value text
    var numbers = chart.selectAll(".numbers")
        .data(fortune500)
        .enter()
        .append("text")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "numbers " + d.name_long;
        })
        .attr("text-anchor", "middle")
        .attr("x", function(d, i){
            var fraction = chartWidth / fortune500.length;
            return i * fraction + (fraction - 1) / 2;
        })
        .attr("y", function(d){
            return chartHeight - yScale(parseFloat(d[expressed])) + 15;
        })
        .text(function(d){
            return d[expressed];
        });

    //below Example 2.8...create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 20)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Number of Variable " + expressed[3] + " in each region");

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
};

//function to create natural breaks color scale generator
function makeColorScale(data){
    var colorClasses = [
        "#D4B9DA",
        "#C994C7",
        "#DF65B0",
        "#DD1C77",
        "#980043"
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
    //...GRATICULE BLOCKS FROM MODULE 8
	//create graticule generator
	var graticule = d3.geoGraticule()
		.step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

	//create graticule background
	var gratBackground = map.append("path")
		.datum(graticule.outline()) //bind graticule background
		.attr("class", "gratBackground") //assign class for styling
		.attr("d", path) //project graticule

	//create graticule lines
	var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
		.data(graticule.lines()) //bind graticule lines to each element to be created
	  	.enter() //create an element for each datum
		.append("path") //append each element to the svg as a path element
		.attr("class", "gratLines") //assign class for styling
		.attr("d", path); //project graticule lines
};

function joinData(countries500, fortune500){
    //...DATA JOIN LOOPS FROM EXAMPLE 1.1
    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i=0; i<fortune500.length; i++){
        var csvCountry = fortune500[i]; //the current region
        var csvKey = csvCountry.name_long; //the CSV primary key

        //loop through geojson regions to find correct region
        for (var a=0; a<countries500.length; a++){

            var geojsonProps = countries500[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.NAME_LONG; //the geojson primary key

            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){

                //assign all attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvCountry[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
        };
    };

    console.log(countries500);

    return countries500;
};

function setEnumerationUnits(countries500, map, path, colorScale){
    //...REGIONS BLOCK FROM MODULE 8
	//add France regions to map
	var countries500All = map.selectAll(".countries500All")
		.data(countries500)
		.enter()
		.append("path")
		.attr("class", function(d){
			return "countries " + d.properties.NAME_LONG;
		})
		.attr("d", path)
		.style("fill", function(d){
            return choropleth(d.properties, colorScale);
        });
};

})(); //last line of main.js
