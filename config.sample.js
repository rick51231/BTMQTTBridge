// Rename this file to the config.js

//Do not remove this block
var config = {};
config.mqtt = {};
config.devices = {};

//MQTT settings
config.mqtt.host = ''; //MQTT server host
config.mqtt.port = 1883; //MQTT server port
config.mqtt.username = ''; //MQTT server username
config.mqtt.password = ''; //MQTT server password
config.mqtt.prefix = 'bt_bridge'; //MQTT topic prefix
config.mqtt.retain = true; //MQTT retain flag

//Example device:
config.devices.tion3s = { // tion3s - device name, used in mqtt topic name
    address: '00:11:22:33:44:55', //MAC address of the device
    type: 'tion3s' //Device type, supported tion3s/rhf3310s

};

module.exports = config; //This should be the last line