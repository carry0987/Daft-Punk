var sec = document.getElementById('seconds');
var min = document.getElementById('minutes');
var hr = document.getElementById('hours');
var day = document.getElementById('day');

var play = function (elem) {
    var time = elem.innerHTML;
    time = +time - 1;
    console.log(time);

    if (time < 0) {
        elem.innerHTML = 59;
    } else {
        elem.innerHTML = time;
    }
};

window.onload = function () {
    setInterval(play, 1000, sec);
    setInterval(play, 60000, min);
    setInterval(play, 3600000, hr);
    setInterval(play, 86400000, day);
};

// Доделать часы