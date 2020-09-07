import { Services } from "../services";
import Router from "koa-router";

export const sendAssets = (service: Services): Router.IMiddleware => async (ctx) => {
    const balances = await service.sendTokens([{
        balance: '1',
        dest: '5ES9fyfV56kkEP1qazNzN1S6YwbSTfFWp2Q3i4QG4eyT2Ng8',
        token: 'ACA',
    }]);

    ctx.response.body = balances;
}
