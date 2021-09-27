"use strict";
let config = require('./config.js');
const mqtt = require("mqtt");
const btCore = require("./bt.core");
const { delay } = require('./functions');

const mqttClient = mqtt.connect('mqtt://'+config.mqtt.host, {
    port: config.mqtt.port,
    username: config.mqtt.username,
    password: config.mqtt.password
});

mqttClient.subscribe(config.mqtt.prefix+'/#');
mqttClient.on('message', mqttOnMessage);

initializeClasses();

(async () => {
    await delay(500); //Wait for bluetooth initialization

    while(true) {
        await broadcastAllDevices();
        await delay(60000);
    }



})();

async function mqttOnMessage(topic, message, packet) {
    message = message.toString();
    console.log('['+topic+'] '+message);

    let params = topic.match(new RegExp(config.mqtt.prefix+'\/(.*?)\/(.*?)\/set', 'i'));

    if(params===null)
        return;

    let dev = params[1];

    if(config.devices[dev]===undefined)
        return;

    let devClass = config.devices[dev].class;

    if(!devClass.isConnected && btCore.isConnected) {
        setTimeout(async function() {
            await mqttOnMessage(topic, message, packet);//Hack to allow set settings if BT is currently busy
        }, 100);
    }

    await devClass.setParam(params[2], message); //TODO: Retry if false?
    await broadcastDevice(dev);
}

async function broadcastAllDevices() {
    for(const dev of Object.keys(config.devices)){
        await broadcastDevice(dev);
    }
}

async function broadcastDevice(dev) {
    let settings = await config.devices[dev].class.getSettings();

    if(settings!==false) {
        for (const [param, value] of Object.entries(settings)) {
            mqttSend(dev, param, value);
        }
    }

    await config.devices[dev].class.disconnect();
}

function initializeClasses() {
    for (const [dev, params] of Object.entries(config.devices)) {
        config.devices[dev].class = new (require("./devices/"+params.type))(dev);
    }
}

function mqttSend(prefix, subTopic, message) {
    let topic = config.mqtt.prefix+'/'+prefix+'/'+subTopic;
    mqttClient.publish(topic, message.toString() , { retain: config.mqtt.retain });
    console.log('['+topic+'] Send: '+message.toString());
}