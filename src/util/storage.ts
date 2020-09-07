import redis, { RedisClient, ClientOpts } from 'redis';
import dayjs, { OpUnitType } from 'dayjs';
import { promisify } from 'util';
import { LimitConfig } from '../types';

interface StorageOptions extends ClientOpts {
    redisOptions: ClientOpts;
}

export class Storage {
    private client: RedisClient;
    private get: (key: string) => Promise<string | null>;
    private set: (key: string, value: string) => Promise<'OK' | undefined>;
    private incr: (key: string) => Promise<number>;
    private expireat: (key: string, timestamp: number) => Promise<number>;

    constructor({ redisOptions }: StorageOptions) {
        this.client = redis.createClient(redisOptions);

        this.get = promisify(this.client.get).bind(this.client);
        this.set = promisify(this.client.set).bind(this.client) as (key: string, value: string) => Promise<'OK' | undefined>;
        this.incr = promisify(this.client.incr).bind(this.client);
        this.expireat = promisify(this.client.expireat).bind(this.client);
    }

    async incKeyCount (key: string, frequency: [number, OpUnitType]): Promise<number> {
        const expireTime = dayjs().add(frequency[0], frequency[1]).endOf('day').unix();

        // preset expire time
        await this.expireat(key, expireTime);

        const result = await this.incr(key);

        return result;
    }

    async getKeyCount (key: string): Promise<number> {
        const result = await this.get(key);
        
        return Number(result) || 0;
    }

    async checkLimit (keys: string[], limitConfig: LimitConfig): Promise<boolean> {
        for (const key of keys) {
            const keyCount = await this.getKeyCount(key);

            if (keyCount >= (limitConfig.get(key) || 0)) {
                return false;
            }
        }

        return true;
    }
}