var medkit = {
    name: "Аптечка",
    use: function () {
        for (var i = 0, used = 0; i < player.inventory.length; i++) {
            if (player.inventory[i] == medkit) {
                player.hp = 100;
                console.log('used medkit');
                player.inventory.splice(i, 1);
                used = 1;
                this.check();
                createNotification('Использована аптечка');
                break;
            }
        }
        if (used == 0) {
            createNotification('У меня нет аптечек!');
        }
    },
    check: function () {
        var kits = 0;
        for (var i = 0; i < player.inventory.length; i++) {
            if (player.inventory[i] == medkit) { kits++ };
        };
        document.getElementById('medkitButton').innerHTML = "Аптечка: " + kits;
    }
};

function buy(thing, cost) {
    if (player.money >= cost) {
        player.inventory.push(thing);
        player.money -= cost;
        invMode.on();
    } else {
        createNotification('У меня нет денег на это');
    };
};
