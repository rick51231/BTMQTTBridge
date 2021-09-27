"use strict";
let core = require("../bt.core");
let config = require('../config.js');
const { mqttIntToOnOff, mqttOnOffToInt } = require('../functions');

const TION_CMD_QUERY = 1;
const TION_CMD_SET = 2;
const TION_CMD_AUTH = 5;

class tion3s {
    constructor(device) {
        this.device = device;
        this.isConnected = false;
    }

    async connect() {
        if(this.isConnected)
            return true;

        if(core.isConnected)
            return false;

        if(await core.connect(config.devices[this.device].address)) {
            this.isConnected = true;
            return true;
        }

        return false;
    }

    async disconnect() {
        if(!this.isConnected)
            return;

        this.isConnected = false;

        await core.disconnect();
    }

    async getSettings() {
        if(!(await this.connect()))
            return false;

        let cmd = this.createCommand(TION_CMD_QUERY);

        const rawSettings = await this.sendCommand(cmd);

        if(rawSettings===false)
            return false;

        return {
            fan_speed: rawSettings[2] & 0xF,
            mode: rawSettings[2] >> 4 & 0xF, // ['recirculation', 'mixed', 'outside' ]
            heater: mqttIntToOnOff(rawSettings[4] & 1),
            state: mqttIntToOnOff(rawSettings[4] >> 1 & 1),
            target_temp: rawSettings[3],
            sound: mqttIntToOnOff(rawSettings[4] >> 3 & 1),
            out_temp: this.decode_temperature(rawSettings[7]),
            in_temp: this.decode_temperature(rawSettings[8]),
            filter_remain: rawSettings[10] * 256 + rawSettings[9],
            error_code: rawSettings[13],
            timer: mqttIntToOnOff(rawSettings[4] >> 2 & 1),
            time: rawSettings[11] + ':' + rawSettings[12],
            productivity: rawSettings[14],
            fw_version: this.toHex(rawSettings[18]) + this.toHex(rawSettings[17])
        };
    }

    async setParam(param, value) {
        let valueInt = parseInt(value, 10);
        let settings = await this.getSettings();

        if(settings===false)
            return false;

        if(param==='fan_speed') {
            settings.fan_speed = (valueInt > 6 || valueInt < 1) ? 1 : valueInt;
        } else if(param==='target_temp') {
            settings.fan_speed = (valueInt > 30 || valueInt < 0) ? 0 : valueInt;
        }  else if(param==='mode') {
            settings.mode = (valueInt > 2 || valueInt < 0) ? 0 : valueInt;
        } else if(param==='heater') {
            settings.heater = value === 'ON' ? 'ON' : 'OFF';
        } else if(param==='state') {
            settings.state = value === 'ON' ? 'ON' : 'OFF';
        } else if(param==='sound') {
            settings.sound = value === 'ON' ? 'ON' : 'OFF';
        } else {
            return false;
        }

        let cmd = this.createCommand(TION_CMD_SET);

        cmd[2] = settings.fan_speed;
        cmd[3] = settings.target_temp;
        cmd[4] = settings.mode;
        cmd[5] = mqttOnOffToInt(settings.heater) | (mqttOnOffToInt(settings.state) << 1) | (mqttOnOffToInt(settings.sound) << 3);

        await this.sendCommand(cmd);
    }

    createCommand(command) {
        const CMD_PREFIX = 61;
        const CMD_SUFFIX = 90;

        var cmd = new Uint8Array(20);
        cmd[0] = CMD_PREFIX;
        cmd[19] = CMD_SUFFIX;
        cmd[1] = command;
        if(command===TION_CMD_AUTH)
            cmd[2] = 0x01;

        return cmd;
    }

    async sendCommand(command) {
        if(!(await this.connect()))
            return false;

        await core.write(command);

        return await core.read();
    }

    decode_temperature(rawTemp) {
        const barrier = 0x80;

        return rawTemp < barrier ? rawTemp : -(~(rawTemp - barrier) + barrier + 1);
    }

    toHex(int) {
        const hexStr = int.toString(16);

        return hexStr.length % 2 === 0 ? hexStr : '0' + hexStr;
    }
}

module.exports = tion3s;