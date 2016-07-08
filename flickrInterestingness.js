

var url = "https://api.flickr.com/services/rest/?method=flickr.interestingness.getList&api_key=bdc5e73f8c2e31245bb39f9e59eab632&extras=tags%2Ccount_views&per_page=500&format=json&nojsoncallback=1";


var w = 800,
	h = 600;

//<=>canvas
var svg = d3.select("#chart")
			.append("svg")
			.attr("width", w)
			.attr("height", h);

var force; 

//scale to be applied to the radius, ranging from 2 to 15px
var rScale = d3.scale.linear().range([2, 50]);

//colour scale
var edgeColScale = d3.scale.linear().range(["teal", "blue"]);
//edge width scale
var edgeWScale = d3.scale.linear().range([1, 3]);

//color scale for clustering acordingly
var colScale = d3.scale.category20b();

//sort alphabetically
var xScale = d3.scale.linear().domain(["a".charCodeAt(0), "z".charCodeAt(0)]).range([10, w-10]);


//higher valuer on top, smaller on bottom
var yScale = d3.scale.linear().range([0+50, h-30])

function update(nodes, links){
	force = d3.layout.force()
	//force = d3.layout.forceInABox()
				.nodes(nodes)
				.links(links)
				.size([w, h])
				//.groupBy("cluster")//*for forceInABox
				//.linkStrengthInterCluster(0.01)//*for forceInABox
				//.gravityToFoci(0.2)//*for forceInABox
				//.gravityOverall(0.05)//*for forceInABox
				.linkDistance(80)
				.linkStrength(0.1)//how stiff or loose are the links, the bigger the more they try to stay in the 80 value that was given
				.charge(-300)//negative charge <=> the nodes repel themselves
				.gravity(0.1)//like a sink-hole in the middle; keepd the nodes in the middle of the page
				.on("tick", tick) //event handlet - method called over and over again; updates throuout time
				.start();

	//pass the domains to the scale inside update function
	rScale.domain(d3.extent( nodes, function(d){ return d.value; })); /*
    So function(d) returns all the nodes values (views). This is then passed to
    the .extent function that finds the maximum and minimum values in the array and then
    the .domain function which returns those maximum and minimum values to D3 as the range for the x axis.*/
    edgeColScale.domain(d3.extent( links, function(d){ return d.value; }));
    edgeWScale.domain(d3.extent( links, function(d){ return d.value; }));
    yScale.domain(d3.extent( nodes, function(d){ return d.value; }));

	var edge = svg.append("svg:g")
					.selectAll("line")
					.data(force.links())
					.enter()
					.append("svg:line")
					.style("stroke", function(d){ return edgeColScale(d.value); })
					.style("stroke-width", function(d){ return edgeWScale(d.value); });


	var text;




	//drawing the nodes
	var circle = svg.append("svg:g")  //selects an svg and appends a g
					.selectAll("circle")
					.data( force.nodes() ) //passes the data for allt he foce nodes
					.enter()
					.append("circle")
					.style("fill", function(d){ return colScale(d.cluster); })
					.attr("r", function(d){ return rScale(d.value); })
					.on("mouseover", function() {
				   		d3.select(this)
				   			.transition()
				   			.duration(250)
				   			.style("fill", "PapayaWhip");
			 		  })
			   		.on("mouseout", function(d) {
				   		d3.select(this)
				   			.transition()
				   			.duration(750)
							.style("fill", function(d){ return colScale(d.cluster); })
					})
					.call(force.drag);

	var tooltip = circle.append("title")
					.attr("text-anchor", "middle")
					.attr("font-family", "sans-serif")
					.attr("font-size", "11px")
					.attr("font-weight", "bold")
					.attr("fill", "black")
					.text(function(d){
						return "Number of views: " + d.value;
					})


	text = svg.append("svg:g")
						.selectAll("g")
						.data(force.nodes())
						.enter()
						.append("svg:g")
						.style("opacity", 1)
					//	.style("pointer-eventr", "none"); included in the css sheet
	

	//A copy of the text with a white stroke for legibility
	text.append("svg:text")
			.attr("x", 12)
			.attr("y", ".31em")
			.attr("class", "shadow")
			.text(function(d){ return d.name; }); 

	text.append("svg:text")
			.attr("x", 12)
			.attr("y", ".31em")
			//.attr("stroke", function(d){ return colScale(d.cluster) ; })
			.text(function(d){ return d.name; });
	


	//circle's position
	function tick(e){

		//force.onTick(e);//*for forceInABox


		var q = d3.geom.quadtree(nodes);
   		var k = e.alpha * 0.2; //e.alpha paramete of the force layout * force defined by us
        

        //override de d3 position handling & all nodes on a specified hight, according to it's size 
  		nodes.forEach(function (o) {
  			//o.x = (xScale(o.name.charCodeAt(0)) );
  			o.x += (xScale(o.name.charCodeAt(0)) - o.x) * k;
       		//o.y = yScale( o.value )
       		o.y += (yScale(o.value) - o.y) * k; //this way there's a tendency to have thing sorted by size,
       		//but the nodes are0nt fixed on a y position
   			q.visit(collide(o));
 		});    




		//updating the edges
		edge.attr("x1", function(d) { return d.source.x; })
			.attr("y1", function(d) { return d.source.y; })
			.attr("x2", function(d) { return d.target.x; })
			.attr("y2", function(d) { return d.target.y; });

		circle.attr("transform", function(d){
			return "translate(" + d.x + "," + d.y + ")"; //moves each circle to the position d.x, d.y

		});
		//update text position
		text.attr("transform", function(d){
			return "translate(" + d.x + "," + d.y + ")";
		});


	}
} //end of the update func (?)


function collide(node) {
  var r = rScale(node.value) + 16,
      nx1 = node.x - r,
      nx2 = node.x + r,
      ny1 = node.y - r,
      ny2 = node.y + r;
  return function(quad, x1, y1, x2, y2) {
    if (quad.point && (quad.point !== node)) {
      var x = node.x - quad.point.x,
          y = node.y - quad.point.y,
          l = Math.sqrt(x * x + y * y),
          r = rScale(node.value) + rScale(quad.point.value);
      if (l < r) {
        l = (l - r) / l * .5;
        node.x -= x *= l;
        node.y -= y *= l;
        quad.point.x += x;
        quad.point.y += y;
      }
    }
    return x1 > nx2
        || x2 < nx1
        || y1 > ny2
        || y2 < ny1;
  };
}



//loading the data
//TODO check if there is an error and give some kind of alert
d3.json( url, function(error, data){
	var network = FlickrUtils.getTagNetwork(data, 10);
	netClustering.cluster(network.nodes, network.edges)
	update(network.nodes, network.edges);
	//console.log(network);
});
