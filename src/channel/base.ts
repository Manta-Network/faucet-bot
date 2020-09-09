import { Storage } from "../util/storage";
import { OpUnitType } from "dayjs";

export class ChannelBase {
    constructor(
        protected channelName: string,
        private limit: number,
        private frequency: [string, OpUnitType],
        protected storage: Storage
    ) {}

    async checkLimit (account: string) {
        const key = `${this.channelName}-${account}`;
        const count = await this.storage.getKeyCount(key);

        return count >= this.limit;
    }

    async updateKeyCount (account: string) {
        const key = `${this.channelName}-${account}`;

        return this.storage.incrKeyCount(key, this.frequency); 
    }

    async rollbackKeyCount (account: string) {
        const key = `${this.channelName}-${account}`;

        return this.storage.decrKeyCount(key);
    }

    getCommand (msg: string) {
        return msg.trim().split(" ");
    }
}