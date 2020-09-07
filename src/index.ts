import { Keyring, WsProvider } from '@polkadot/api';
import { assert } from '@polkadot/util';
import { waitReady } from '@polkadot/wasm-crypto';
import { loadConfig } from './util/config';
import logger from './util/logger';
import api from './api';
import { Services } from './services';
import { options } from '@acala-network/api';

async function run () {
    const config = loadConfig();

    assert(config.faucet.account.mnemonic, 'mnemonic need');
    assert(config.faucet.endpoint, 'endpoint need');

    await waitReady();

    const keyring = new Keyring({ type: 'sr25519' });
    const account = keyring.addFromMnemonic(config.faucet.account.mnemonic);

    const service = new Services({ account });

    const provider = new WsProvider(config.faucet.endpoint);

    await service.connect(options({ provider }));

    const chainName = await service.getChainName();

    logger.info(`✊  connected to ${chainName}`);

    const result = await (service.api.rpc as any).oracle.getAllValues();
    console.log(Object.keys(service.api.rpc), result.toString());

    api({ port: config.api.port, service }).then(() => {
        logger.info(`🚀  faucet launced at port:${config.api.port}`);
    });
}

run();