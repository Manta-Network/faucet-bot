import { ApiPromise } from '@polkadot/api';
import { ITuple } from "@polkadot/types/types";
import { Balance } from '@acala-network/types/interfaces';
import { DispatchError } from "@polkadot/types/interfaces";
import { ApiOptions } from '@polkadot/api/types';
import { KeyringPair } from '@polkadot/keyring/types';

interface SendConfig {
    dest: string;
    token: string;
    balance: string;
}

export class Services {
    public api!: ApiPromise;
    private account!: KeyringPair

    constructor({ account }: { account: KeyringPair }) {
        this.account = account;
    }

    public async connect (options: ApiOptions) {
        const instance = await ApiPromise.create(options);

        await instance.isReady;

        this.api = instance;
    }

    public async queryBalance (tokens: string[]) {
        const result = await Promise.all(tokens.map((token) => (this.api as any).derive.currencies.balance(this.account.address, token)))
        
        return tokens.map((token, index) => {
            return {
                token: token,
                balance: result[index] ? (result[index] as Balance).toString() : 0
            }; 
        });
    }

    public async getChainName () {
        return this.api.rpc.system.chain();
    }

    public async sendTokens (config: SendConfig[]) {
        let success: (value: any) => void;
        let failed: (resone: any) => void;

        const resultPromise = new Promise((resolve, reject) => {
            success = resolve;
            failed = reject;
        });

        const batch = this.api.tx.utility.batch(
            config.map(({ token, balance, dest }) => this.api.tx.currencies.transfer(dest, token, balance))
        );

        const tx = await batch.sign(this.account);

        const unsub = await tx.send((result) => {
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
                  success(tx.hash.toString());
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
}