"use strict";

function mqttIntToOnOff(int) {
    return int === 1 ? 'ON' : 'OFF';
}

function mqttOnOffToInt(val) {
    return val === 'ON' ? 1 : 0;
}
function delay(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
}

module.exports.mqttIntToOnOff = mqttIntToOnOff;
module.exports.mqttOnOffToInt = mqttOnOffToInt;
module.exports.delay = delay;