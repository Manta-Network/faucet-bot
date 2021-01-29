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
        if (!this.frequency || !this.limit) {
            return true;
        }

        const key = this.getKey(account);
        const count = await this.storage.getKeyCount(key);

        return count >= this.limit;
    }

    async updateKeyCount (account: string) {
        const key = this.getKey(account);

        return this.storage.incrKeyCount(key, this.frequency); 
    }

    async rollbackKeyCount (account: string) {
        const key = this.getKey(account);

        return this.storage.decrKeyCount(key);
    }

    getKey (account: string) {
        return `${this.channelName}-${account}`;
    }

    getCommand (msg: string) {
        return msg.trim().split(" ");
    }
}