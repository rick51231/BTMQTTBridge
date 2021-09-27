"use strict";
let core = require("../bt.core");
let config = require('../config.js');
const { mqttIntToOnOff, mqttOnOffToInt } = require('../functions');

//TODO: Make command constants

class rhf3310s {
    constructor(device) {
        this.device = device;
        this.isConnected = false;
        this.cmdCounter = 0;
    }

    async connect() {
        if(this.isConnected)
            return true;

        if(core.isConnected)
            return false;

        if(await core.connect(config.devices[this.device].address)) {
            this.cmdCounter = 0;
            this.isConnected = true;

            await this.command([0xff, 0xb5, 0x4c, 0x75, 0xb1, 0xb4, 0x0c, 0x21, 0xe1]);
            await this.command([0x01]);

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

        const rawSettings = await this.command([0x06]);

        if(rawSettings===false)
            return false;
        /*
           mode: 2 turbo , 3 auto, 1 sleep

       power 02 normal, 00 off, 03 no water?*/

        return {
            on: mqttIntToOnOff(rawSettings[11] >> 1 & 1),
            heater: mqttIntToOnOff(rawSettings[10]),
            power: rawSettings[4],
            hum: rawSettings[12],
            target_hum: rawSettings[5],
            mode: rawSettings[3],
            no_water: mqttIntToOnOff(rawSettings[11] & 1),
            clean_required: mqttIntToOnOff(rawSettings[18] >> 5 & 1)
        };
    }


    async setParam(param, value) {
        let valueInt = parseInt(value, 10);

        if(param==='power') {
            await this.command([0x0A, (valueInt > 3 || valueInt < 1) ? 1 : valueInt]);
        } else if(param==='mode') {
            await this.command([0x09, (valueInt > 3 || valueInt < 0) ? 1 : valueInt]);
        }  else if(param==='target_hum') {
            await this.command([0x0B, ((valueInt > 70 || valueInt < 30) && valueInt!==75) ? 30 : valueInt]);
        } else if(param==='on') {
            await this.command([value === 'ON' ? 0x03 : 0x04]);
        } else if(param==='heater') {
            await this.command([0x16, mqttOnOffToInt(value)]);
        } else {
            return false;
        }
    }

    async command(command) {
        if(!(await this.connect()))
            return false;

        const cmdStart = 0x55;
        const cmdEnd = 0xAA;

        let cmdArr = [cmdStart, this.cmdCounter, ...command, cmdEnd];

        await core.write(Buffer.from(cmdArr));

        this.cmdCounter++;
        if(this.cmdCounter>255)
            this.cmdCounter = 0;

        let read = await core.read();

        if(read[1]!==cmdArr[1]) //Validate cmdCounter (aka command sequence no)
            return false;

        return read;
    }
}

module.exports = rhf3310s;