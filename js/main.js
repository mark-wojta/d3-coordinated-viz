/* JavaScript by Mark Wojta, 2020 */
// majority of JS credited to UW Wisconsin-Madison Department of Geography

//begin script when window loads
window.onload = setMap();

//Example 1.3 line 4...set up choropleth map
function setMap(){

    //map frame dimensions
    var width = 960,
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
      .scale(150)
      .translate([width / 2, height / 2]);

    var path = d3.geoPath()
      .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
    promises.push(d3.csv("data/fortune500.csv")); //load attributes from csv
    promises.push(d3.json("data/countries.topojson")); //load background spatial data
    Promise.all(promises).then(callback);

    function callback(data){

    		fortune500 = data[0];
    		countries = data[1];

    		//create graticule generator
    		var graticule = d3.geoGraticule()
    			.step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

    		//create graticule background
    		var gratBackground = map.append("path")
    			.datum(graticule.outline()) //bind graticule background
    			.attr("class", "gratBackground") //assign class for styling
    			.attr("d", path); //project graticule

    		//create graticule lines
    		var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
    			.data(graticule.lines()) //bind graticule lines to each element to be created
    		  .enter() //create an element for each datum
    			.append("path") //append each element to the svg as a path element
    			.attr("class", "gratLines") //assign class for styling
    			.attr("d", path); //project graticule lines

    		//translate countries TopoJSON
    		var countries = topojson.feature(countries, countries.objects.countries);

    		//add countries to map
    		var countries = map.append("path")
    			.datum(countries)
    			.attr("class", "countries")
    			.attr("d", path);

        //add France regions to map
        var countries500 = map.selectAll(".countries500")
            .data(countries)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "countries " + d.properties.name_long;
            })
            .attr("d", path);
        };
};
