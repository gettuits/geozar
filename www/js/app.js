var Geolocation = {
  rad: function(x) { return x * Math.PI / 180 },

  // Distance in kilometers between two points using the Haversine algo.
  distance: function(p1, p2) {
    var R = 6371
    var dLat  = this.rad(p2.latitude - p1.latitude)
    var dLong = this.rad(p2.longitude - p1.longitude)

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.rad(p1.latitude)) * Math.cos(this.rad(p2.latitude)) * Math.sin(dLong/2) * Math.sin(dLong/2)
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    var d = R * c

    return Math.round(d)
  }
}


var map = null;
var markers = [];
var infowindow = new google.maps.InfoWindow();
var coordenates;
var insertValues;
var loading;
var center = new google.maps.LatLng(41.641184, -0.894032); // Default center ZARAGOZA
var linePath;
var busLines;
var latlng_pos=[];

//
var debug_mode = true;

function removeMarkers() {
	while(markers.length > 0) {
		markers.pop().setMap(null);
	}
}

function addMarker(lat, lon, title, subtitle, cat, id) {

	try{
		var marker = new google.maps.Marker({
			position: new google.maps.LatLng(lat, lon),
			map: map,
			title: title,
			icon: 'cache/markers/marker-'+cat+'.png'
		});
		google.maps.event.addListener(marker, 'click', function() {
			var content = '<strong>' + title + '</strong>';
			if (subtitle){
				content += '<br/><br/>'+ subtitle;
			}
			if(cat == "bus" || cat == "bizi"){
				var onclick = "showDetail("+id+", '"+ cat +"')";
				content += ' <a href="#detail"  data-rel="dialog" data-icon="info" onclick="'+onclick+'">Ver</a>';
			}
			if(cat == "tram"){
				content += ' <a href="#complaint-page" data-icon="info">Ver</a>';
			}
			infowindow.setContent(content);
			infowindow.open(map, marker);
		});
		markers.push(marker);
	}
	catch(error){
		alert(error)
	}
}

$('.loading').live('pageshow',function(event, ui){
	if(loading){
		$.mobile.loading('show', {
			text: 'Cargando datos...',
			textVisible: true
		});
	}
});

$('#map-page').live('pageshow',function(event, ui){
	var currentCenter = map.getCenter();
	google.maps.event.trigger(map, "resize");
	map.setCenter(currentCenter);
});

//
function showMap(cat) {
	loading = true;
	

	removeMarkers();
	if(cat == "bus"){
		$('#line_selector').show();
		$('#common_footer').hide();

	}else{
		$('#line_selector').hide();
		$('#common_footer').show();
	}

	if(debug_mode) {
		if(jQuery.browser.mobile){
			api_url = "pharmacies.json";
		}else{
			api_url = "/www/data/pharmacies.json";
		}
	} else {
		api_url = 'http://api.dndzgz.com/services/'+ cat +'?callback=?';
	}
	console.log(api_url);

	var jqxhr = $.getJSON( api_url, function(data) {
  		console.log('locations: ' + data.locations.length);
	})
  	.done(function(data) {
  		map.setZoom(15);
		var locations = data.locations
		var n = locations.length;
		

		for(i=0; i<n; i++) {
			var place = locations[i];
			var lat = place['lat'];
			var lon = place['lon'];
			var title = place['title'];
			var subtitle = place['subtitle'];
			var id = place['id'];
			addMarker(lat, lon, title, subtitle, cat, id);
		}
		if(cat == "bus"){
			busLines = data.lines;
			for(var index in busLines){
				var line = busLines[index];
				$('#bus_lines').append('<li><a href="#" data-rel="dialog" onclick="showBusLine(\'' + index + '\');">'+line.name+'</a></li>');
			}
			$('#bus_lines').listview('refresh');
		}

  	})
  	 .fail(function( jqxhr, textStatus, error ) {
    	var err = textStatus + ", " + error;
    	alert( "Request Failed: " + err );
  	})
  	.always(function() {
    	$.mobile.loading('hide');
		loading = false;
  	});
}

function showBusLine(index){
	var line = busLines[index];
	var n = line.points.length;
	var lineCoordinates = [];
	for(i=0; i<n; i++) {
		lineCoordinates.push(new google.maps.LatLng(line.points[i].lat, line.points[i].lon))
	}
	if(!linePath){
		linePath = new google.maps.Polyline({ path: lineCoordinates, strokeColor: "blue", strokeOpacity: 1.0, strokeWeight: 2 });
		linePath.setMap(map);
	}else{
		linePath.setPath(lineCoordinates);
	}
	$('#popupLines').popup('close');
	
}

function showDetail(id, cat) {
	var type = "Poste";
	if(cat == "bizi"){
		type = "Estación";
	}
	$('.place-id').text(type + " - " + id);
	loading = true;
	$("#detail-list").html("");
	$.getJSON('http://api.dndzgz.com/services/'+ cat +'/'+id+'?callback=?', function(data) {
		if(cat == "bizi"){
			$("#detail-list").append("<li>"+data.bikes+" bicicletas</li>");
			$("#detail-list").append("<li>"+data.parkings+" aparcamientos</li>");
		}else{
			var estimates = data.estimates;
			var n = estimates.length;
			for(i=0; i<n; i++) {
				var estimate = estimates[i];
				$("#detail-list").append("<li>"+estimate['line'] + " hacia " + estimate['direction'] + " - " + estimate['estimate'] + " minutos</li>");
			}
		}
		$('#detail-list').listview('refresh');
		$.mobile.loading('hide');
		loading = false;
	});
}

function changeMapName(name){
	$('.service-type').text(name);
}

function geolocalize(first){
	if(navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
			var location = new google.maps.LatLng(
				position.coords.latitude,
				position.coords.longitude);
			coordenates = position.coords;
			var distance = Geolocation.distance(position.coords, {'latitude':center.lat(), 'longitude': center.lng()});
			if(distance > 15){
				alert('Ups! Estás muy lejos de Zaragoza')
				location = center;
			}
			if(first){
				var marker = new google.maps.Marker({
					position: location,
					map: map,
					icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
				});
			}
			map.setCenter(location);
		});
	}
}
function initMap() {

	var zoom = 16;
	
	var myOptions = {
		zoom: zoom,
		center: center,
		zoomControl: true,
		disableDefaultUI: true,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	};
	map = new google.maps.Map(document.getElementById("map-container"), myOptions);

	

	google.maps.event.addListener(map, 'zoom_changed', function() {
		if(map.getZoom() < 15){
			var n = markers.length;
			for(i=0; i<n; i++) {
				markers[i].setVisible(false);
			}
			$('#over_map').show();
		}else{
			var n = markers.length;
			for(i=0; i<n; i++) {
				markers[i].setVisible(true);
			}
			$('#over_map').hide();
		}
    
  	});

	//geolocalize(true);



}


//
function sniffDevice(){
	console.log(jQuery.browser);
	var deviceInfo = ''+
	'chrome: ' + jQuery.browser.chrome + ' - ' +
	'version: ' + jQuery.browser.version + ' - ' +
	'webkit: ' + jQuery.browser.webkit + ' - ' +
	'mobile: ' + jQuery.browser.mobile;

	alert(deviceInfo);

	var isAndroid = /android/i.test(navigator.userAgent.toLowerCase());
	var isWindowsPhone = /windows phone/i.test(navigator.userAgent.toLowerCase());
	var isBlackBerry = /blackberry/i.test(navigator.userAgent.toLowerCase());
	var isiDevice = /ipad|iphone|ipod/i.test(navigator.userAgent.toLowerCase());
	var isiPhone = /iphone/i.test(navigator.userAgent.toLowerCase());
	var isiPad = /ipad/i.test(navigator.userAgent.toLowerCase());

	console.log(isAndroid);
	alert('Dispositivo android? '+isAndroid);
	if(jQuery.browser.mobile){
	   alert('You are using a mobile device!');
	}
	else{
	   alert('You are not using a mobile device!');
	}
}

//
//sniffDevice();

// Main
initMap();