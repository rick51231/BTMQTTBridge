"use strict";
const Bluez = require('bluez');
const bluetooth = new Bluez();
const { delay } = require('./functions');

const SERVICE_ID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const SERVICE_CHAR_RX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const SERVICE_CHAR_TX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";


class BTCore {
    constructor() {
        this.isConnected = false;
        this.isConnecting = false;
        this.isDisconnecting = false;
        this.adapter = null;
        this.device = null;

        this.service = null;
        this.service_rx = null;
        this.service_rx_reader = null;
        this.service_tx = null;
        this.service_tx_writer = null;

        this.readBuffer = null;

        (async () => {
            await bluetooth.init();
            console.log("Agent registered");
            this.adapter = await bluetooth.getAdapter();
            await this.adapter.StartDiscovery();
        })();

    }

    async connect(deviceMac) {
        if(this.isConnected)
            return true;
        if(this.isConnecting)
            return false;

        this.isConnecting = true;

        try {
            this.device = await bluetooth.getDevice(deviceMac);
            await this.device.Connect();

            if(!(await this.resolveServices())) {
                throw new Error("Cant resolve services"); // Или сделать return false тут.
            }

        } catch(e) {
            console.log("Connect error: "+e.toString());
            return false;
        } finally {
            this.isConnecting = false;
        }

        this.isConnected = true;
        return true;
    }

    async disconnect() {
        if(!this.isConnected && !this.isConnecting)
            return;

        if(this.isDisconnecting)
            return;

        this.isDisconnecting = true;

        if(this.service_tx_writer!==null)
            await this.service_tx_writer.end();
        if(this.service_rx_reader!==null)
            await this.service_rx_reader.end();

        try {
            await this.device.Disconnect();
        } catch (e) {
            console.log("Disconnect error: "+e.toString());
        } finally {
            this.isConnected = false;
            this.isDisconnecting = false;
        }
    }

    async resolveServices() {
        try {
            for (let i = 0; !await this.device.ServicesResolved(); i++) {
                if (i > 100) {
                    console.log("No Services Resolved");
                    return false;
                    //throw new Error("No Services Resolved");
                }
                await delay(50);
            }

            //await delay(100);
            this.service = await this.device.getService(SERVICE_ID);
            //await delay(100);
            this.service_rx = await this.service.getCharacteristic(SERVICE_CHAR_RX);
            //await delay(100);
            //await this.service_rx.StartNotify();
            //await delay(100);
            this.service_rx_reader = await this.service_rx.AcquireNotify();
            //await delay(100);
            this.readBuffer = null;

            this.service_rx_reader.on("data", async (data) => {
                this.readBuffer = Uint8Array.from(data);
                //console.log("Read: ", Buffer.from(data, 'utf8').toString('hex'));
            });


            //await delay(10); //TODO нужно ли это
            this.service_tx = await this.service.getCharacteristic(SERVICE_CHAR_TX);
            this.service_tx_writer = await this.service_tx.AcquireWrite();

            return true;
        } catch(e) {
            console.log("Service error: "+e.toString());
        }

        return false;
    }

    async write(data) {
        if(!this.isConnected)
            return;

        this.readBuffer = null;

        //console.log("Write: "+Buffer.from(data).toString('hex'));

        await this.service_tx_writer.write(Buffer.from(data));
        //await delay(500);
    }

    async read() {
        let i = 50;

        while(i>0) {
            if(this.readBuffer!==null) {
                let ret = this.readBuffer;
                this.readBuffer = null;

                return ret;
            }

            await delay(5);
            i--;
        }

        return false;
    }
}

process.on("SIGINT", () => {
    bluetooth.bus.disconnect();
    process.removeAllListeners("SIGINT");
    process.exit();
});

module.exports = new BTCore();