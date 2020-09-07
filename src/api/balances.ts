import { Services } from "../services";
import Router from "koa-router";

export const queryBalances  = (service: Services): Router.IMiddleware => async (ctx) => {
    const balances = await service.queryBalance(['ACA', 'AUSD']);

    ctx.response.body = balances;
}
