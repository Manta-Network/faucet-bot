import { Service } from "../../services";
import Router from "koa-router";
import logger from "../../util/logger";

export const sendAssets = (service: Service): Router.IMiddleware => async (ctx) => {
    if (!ctx?.request?.body?.address) {
        ctx.response.body = 'params error, address required.';
        return;
    }

    try {
        const result = await service.faucet({
            strategy: 'normal',
            address: ctx.request.body.address,
            channel: {
                name: 'api'
            }
        });

        ctx.response.body = {
            code: 200,
            mssage: result
        };
    } catch (e) {
        ctx.response.body = {
            code: 500,
            message: (e as Error).message
        };

        logger.error(e);

    }
}
