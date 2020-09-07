import toml from 'toml'
import { readFileSync } from 'fs';

export interface Config {
    api: {
        port: number | number
    },
    storage: {
        redis: {
            url: string
        }
    },
    faucet: {
        endpoint: string;
        account: {
            mnemonic: string;
        };
    },
    jobs: {
        maxJobs: number;
    },
    errorCode: {
        [k in number]: string;
    },
    channel: {
        limit: {
            account: number;
            address: number;
            frequency: [string, string]
        }
        matrix: {
            token: string;
            userId: string;
        },
        discord: {
            token: string;
        }
    }
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