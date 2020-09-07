import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import Router from 'koa-router';
import { queryBalances } from './balances';
import { loggerMiddware } from './middlewares/logger';
import { Services } from '../services';
import { sendAssets } from './faucet';

export interface ApiConfig {
    port: string | number;
    service: Services;
}

export default async function (config: ApiConfig) {
    const app = new Koa();
    const { port } = config;

    // middlewares
    app.use(bodyParser());
    app.use(loggerMiddware);

    // router
    const router = new Router();

    // ping-pong test
    router.get('/ping', async (ctx) => ctx.body = 'pong!');

    // query assets balance
    router.get('/balances', queryBalances(config.service));

    // send tokens
    router.post('/faucet', sendAssets(config.service));

    app.use(router.routes());
    app.use(router.allowedMethods());

    app.listen(port);
}
