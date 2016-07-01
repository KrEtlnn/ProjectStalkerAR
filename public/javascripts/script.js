if (navigator.geolocation) {
    console.log('entering');
} else {
    console.log('YOU DON\'T HAVE GEOLOCATING');
    alert("Geolocation API не поддерживается в вашем браузере");
}

navigator.geolocation.getCurrentPosition(function(position) {
    console.log("lat: " + position.coords.latitude +', lng: '+ position.coords.longitude);
})