function CreateDog(pos, map) {
    var dog = new google.maps.Marker({
        position: pos,
        map: map,
        label: "Пёс",
        title: "Пёс",
        icon: icon.dog
    });
};

function CreateBandos(pos, map) {
    var bandos = new google.maps.Marker({
        position: pos,
        map: map,
        label: 'Бандит',
        title: 'Бандит',
        icon: icon.bandos,
    });
};