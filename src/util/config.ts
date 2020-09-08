import toml from 'toml'
import { readFileSync } from 'fs';
import { OpUnitType } from 'dayjs';

export interface Config {
    storage: {
        redis: {
            url: string
        }
    },
    faucet: {
        endpoint: string;
        precision: number;
        account: {
            mnemonic: string;
        };
        strategy: {
            [k in string]: {
                amounts: { asset: string, amount: number}[];
                limit: number;
                frequency: [string, OpUnitType]
            }
        }
    },
    task: {
        redis: string;
        maxPendingCount: number;
    },
    channel: {
        api: {
            port: number | number
        },
        matrix: {
            token: string;
            userId: string;
            address: number;
            frequency: [string, OpUnitType]
        },
        discord: {
            token: string;
            address: number;
            frequency: [string, OpUnitType]
        }
    },
    template: {
        [k in string]: string;
    } & {
        error: {
            [k in string]: string;
        }
    },
}

export const loadConfig = (path = 'config.toml'): Config => {
    try {
        const content = readFileSync(path, { encoding: 'utf-8' });
        const config = toml.parse(content);

        return config as Config;
    } catch (e) {
        throw new Error(`load config failed: ${e}`);
        
    }
}