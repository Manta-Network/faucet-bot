import { Service } from "../../services";
import Router from "koa-router";

export const queryBalances  = (service: Service): Router.IMiddleware => async (ctx) => {
    const balances = await service.queryBalance(['ACA', 'AUSD']);

    ctx.response.body = balances;
}
