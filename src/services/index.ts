import { ApiPromise } from '@polkadot/api';
import { template } from 'lodash';
import BN from 'bignumber.js';
import { ITuple } from "@polkadot/types/types";
import { Balance } from '@acala-network/types/interfaces';
import { DispatchError } from "@polkadot/types/interfaces";
import { ApiOptions } from '@polkadot/api/types';
import { KeyringPair } from '@polkadot/keyring/types';
import { Config } from '../util/config';
import { Storage } from '../util/storage';
import { TaskQueue } from '../task-queue';
import logger from '../util/logger';

type SendConfig = {
    dest: string;
    token: string;
    balance: string;
}[];

interface FaucetServiceConfig {
  account: KeyringPair;
  template: Config['template'];
  config: Config['faucet'];
  storage: Storage;
  taskQueue: TaskQueue;
}

interface FaucetParams {
  address: string;
  strategy: string;
  channel: {
    name: string;
    account?: string;
  }
}

function formatToReadable (num: string | number, precision: number): string {
  return (new BN(num)).div(new BN(10 ** precision)).toFixed(4);
}

function formatToSendable (num: string | number, precision: number): string {
  return (new BN(num)).multipliedBy(new BN(10 ** precision)).toFixed(0);
}

export class Service {
    public api!: ApiPromise;
    private account: KeyringPair;
    private template: Config['template'];
    private config: Config['faucet'];
    private storage: Storage;
    private taskQueue: TaskQueue;

    constructor({ account, config, template, storage, taskQueue }: FaucetServiceConfig) {
        this.account = account;
        this.config = config;
        this.template = template;
        this.storage = storage;
        this.taskQueue = taskQueue;
    }

    public async connect (options: ApiOptions) {
        const instance = await ApiPromise.create(options);

        await instance.isReady.catch(() => {
          throw new Error('connect failed');
        });

        this.api = instance;

        this.taskQueue.process((task) => {
            return this.sendTokens(task.params).catch(logger.error);
        });
    }

    public async queryBalance () {
        const result = await Promise.all(this.config.tokens.map((token) => (this.api as any).derive.currencies.balance(this.account.address, token)))
        
        return this.config.tokens.map((token, index) => {
            return {
                token: token,
                balance: result[index] ? formatToReadable((result[index] as Balance).toString(), this.config.precision) : 0
            }; 
        });
    }

    public async getChainName () {
        return this.api.rpc.system.chain();
    }

    public async sendTokens (config: SendConfig) {
        let success: (value: any) => void;
        let failed: (resone: any) => void;

        const resultPromise = new Promise((resolve, reject) => {
            success = resolve;
            failed = reject;
        });

        const tx = this.buildTx(config);

        const sigendTx = await tx.signAsync(this.account);

        const unsub = await sigendTx.send((result) => {
            if (result.isCompleted) {
                // extra message to ensure tx success
                let flag = true;
                let errorMessage: DispatchError["type"] = "";
      
                for (const event of result.events) {
                  const { data, method, section } = event.event;
      
                  if (section === "utility" && method === "BatchInterrupted") {
                    flag = false;
                    errorMessage = "batch error";
                    break;
                  }
      
                  // if extrinsic failed
                  if (section === "system" && method === "ExtrinsicFailed") {
                    const [dispatchError] = (data as unknown) as ITuple<
                      [DispatchError]
                    >;
      
                    // get error message
                    if (dispatchError.isModule) {
                      try {
                        const mod = dispatchError.asModule;
                        const error = this.api.registry.findMetaError(
                          new Uint8Array([Number(mod.index), Number(mod.error)])
                        );
      
                        errorMessage = `${error.section}.${error.name}`;
                      } catch (error) {
                        // swallow error
                        errorMessage = "Unknown error";
                      }
                    }
                    flag = false;
                    break;
                  }
                }
      
                if (flag) {
                  success(sigendTx.hash.toString());
                } else {
                  failed(errorMessage);
                }
      
                unsub && unsub();
            }
        }).catch((e) => {
            failed(e);
        })

        return resultPromise;
    }

    public buildTx (config: SendConfig) {
      return this.api.tx.utility.batch(
        config.map(({ token, balance, dest }) => this.api.tx.currencies.transfer(dest, token, balance))
    );
    }

    usage () {
        return this.template.usage;
    }

    async faucet ({ strategy, address, channel }: FaucetParams): Promise<any> {
      const strategyDetail = this.config.strategy[strategy];

      try {
        this.taskQueue.checkPendingTask();
      } catch (e) {
        throw new Error(this.getErrorMessage('PADDING_TASK_MAX'));
      }

      if (!strategyDetail) {
        throw new Error(this.getErrorMessage('NO_STRAGEGY'));
      }

      // check address limit
      let currentCount = 0;
      try {
        currentCount = await this.storage.getKeyCount(`address_${address}`);
      } catch (e) {
        throw new Error(this.getErrorMessage('CHECK_LIMIT_FAILED'));
      }

      if (strategyDetail.limit && currentCount >= strategyDetail.limit) {
        throw new Error(this.getErrorMessage('LIMIT', { sender: channel.account || address }));
      }

      // check build tx
      const params  = strategyDetail.amounts.map((item) => ({
        token: item.asset,
        balance: formatToSendable(item.amount, this.config.precision),
        dest: address
      }));

      try {
        this.buildTx(params);
      } catch (e) {
        throw new Error(this.getErrorMessage('CHECK_TX_FAILED', { error: e }));
      }

      // increase address limit count
      try {
        await this.storage.incKeyCount(`address_${address}`, strategyDetail.frequency);
      } catch (e) {
        throw new Error(this.getErrorMessage('UPDATE_LIMIT_FAILED'));
      }

      try {
        const result = await this.taskQueue.insert({
          channel: channel,
          params: params
        });

        return result;
      } catch (e) {
        throw new Error(this.getErrorMessage('INSERT_TASK_FAILED'));
      }
    }

    getErrorMessage (code: string, params?: any) {
      return template(this.template.error[code] || 'Faucet error.')(params);
    }
}