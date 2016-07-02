function initMap() {
    var map;
    var mapOptions = {
        center: { lat: 56.784408, lng: 35.956532 }, 
        zoom: 18, 
        zoomControl: false, 
        streetViewControl: false
    }
    map = new google.maps.Map(document.getElementById('map'), mapOptions);

    var sidor = new google.maps.Marker({
        position: { lat: 56.785167, lng: 35.958151 },
        map: map,
        label: 'Сидрыч',
        title: 'Сидрыч',
        icon: icon.sidor,
    });
    var sidorCircle = new google.maps.Circle({
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FFF000',
        fillOpacity: 0.35,
        map: map,
        center: sidor.getPosition(),
        radius: 15
    });

    var myMarker = new google.maps.Marker({
        position: { lat: 1, lng: 1 },
        label: 'Я',
        title: 'Я',
        map: map,
        icon: icon.me
    });
    var myCircle = new google.maps.Circle({
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FFF000',
        fillOpacity: 0.35,
        map: map,
        center: myMarker.getPosition(),
        radius: 3
    });

    function CreateBandos(pos, map) {
        var bandos = new google.maps.Marker({
            position: pos,
            map: map,
            label: 'Бандит',
            title: 'Бандит',
            icon: icon.bandos,
        });
    };

    function spawnBandos() {
        var bandosPosition = {
            lat: function () {
                var i = Math.round(Math.random() * 1);
                switch (i) {
                    case 0: var latit = (myMarker.getPosition().lat() + Math.round(Math.random() * 1000) / 1000000); break;
                    case 1: var latit = (myMarker.getPosition().lat() - Math.round(Math.random() * 1000) / 1000000);
                };
                return latit;
            },
            lng: function () {
                var i = Math.round(Math.random() * 1);
                switch (i) {
                    case 0: var longit = (myMarker.getPosition().lng() + Math.round(Math.random() * 700) / 1000000); break;
                    case 1: var longit = (myMarker.getPosition().lng() - Math.round(Math.random() * 700) / 1000000);
                };
                return longit;
            }
        };
        var bandosLocation = new google.maps.LatLng(bandosPosition.lat(), bandosPosition.lng());
        var x = Math.round(Math.random() * 50)
        if (x == 25) {
            CreateBandos(bandosLocation, map);
            console.log('bandos spawned ' + bandosLocation);
        };
    };

    setInterval(spawnBandos, 5000);

    function goToMe() {
        map.setCenter(myMarker.getPosition());
    }

    function changeMyPos(location) {
        myMarker.setPosition(location);
        myCircle.setCenter(location);
    }

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(geolocationSuccess, geolocationFailure, { enableHighAccuracy: true });

    } else {
        alert('Чёт беда прям. Ты попробуй другой браузер запусти')
    };

    function geolocationSuccess(position) {
        // Преобразуем местоположение в объект LatLng
        var location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

        // Отображаем эту точку на карте
        console.log('geolocation success');
        map.setCenter(location);
        changeMyPos(location);
    };

    function geolocationFailure(errorCode) {
        map.setCenter({ lat: 1, lng: 1 });
        var msg = "";
        switch (errorCode) {
            case 1: msg = "Нет разрешения";
                break;
            case 2: msg = "Техническая ошибка";
                break;
            case 3: msg = "Превышено время ожидания";
                break;
            default: msg = "Что то случилось не так";
        };
        alert(msg);
    };
};