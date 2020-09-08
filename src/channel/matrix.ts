import {
    MatrixClient,
    SimpleFsStorageProvider,
    AutojoinRoomsMixin,
    RichReply,
} from "matrix-bot-sdk";
import { Storage } from '../util/storage';
import { Service } from "../services";
import { Config } from "../util/config";

interface MatrixChannelConfig {
    config: Config['channel']['matrix'];
    storage: Storage;
    service: Service;
}

export class Matrix {
    private client: MatrixClient;
    private storage: Storage;
    private service: Service;
    private config: Config['channel']['matrix'];

    constructor (config: MatrixChannelConfig) {
        const homeserverUrl = "https://matrix.org";
        const storage = new SimpleFsStorageProvider("hello-bot.json");

        this.config = config.config;
        this.storage = config.storage;
        this.service = config.service;
        this.client = new MatrixClient(homeserverUrl, this.config.token, storage);

        AutojoinRoomsMixin.setupOnClient(this.client);
    }

    async start () {
        await this.client.start();

        this.client.on('room.message', (roomId, event) => {
            this.messageHandler(roomId, event);
        });
    }

    async messageHandler (roomId: any, event: any) {
        const { body, msgtype } = event.content;
        const account = event.sender;

        if (msgtype !== 'm.text') return;

        if (!body) return;

        if (body === '!faucet') {
            this.client.sendMessage(roomId, { msgtype: 'm.text', body: this.service.usage() });
        }

        if (body === '!balance') {
            this.client.sendMessage(roomId, { msgtype: 'm.text', body: this.service.queryBalance() });
        }

        if (body === '!drip') {
            const key = `matrix-${account}`;
            const count = await this.storage.getKeyCount(key);
            const address = body.split(/\t/)[1];

            if (count >= this.config.limit) {
                this.client.sendMessage(roomId, { msgtype: 'm.text', body: this.service.getErrorMessage('LIMIT') });

                return;
            }

            try {
                this.service.faucet({
                    strategy: 'normal',
                    address: address,
                    channel: { name: 'matrix', account: account }
                });
            } catch (e) {
                this.client.sendMessage(roomId, { msgtype: 'm.text', body: e });
            }
        }
    }
}
