import Router from "koa-router";
import { Service } from "../../services";
import logger from "../../util/logger";
import { Storage } from "../../util/storage";
import { Config } from "../../util/config";

export const sendAssets = (service: Service, storage: Storage, config: Config['channel']['api']): Router.IMiddleware => async (
  ctx
) => {
  if (!ctx?.request?.body?.address) {
    ctx.response.body = "params error, address required.";
    return;
  }

  if (!ctx?.request?.body?.account) {
    ctx.response.body = "params error, account required.";
    return;
  }

  const account = ctx.request.body.account;
  const key = `api-${account}`;

  const keyCount = await storage.getKeyCount(key);

  if (keyCount >= config.limit) {
    ctx.response.body = {
      code: 500,
      message: service.getErrorMessage('LIMIT', { account })
    };

    return;
  }

  await storage.incrKeyCount(key, config.frequency);

  try {
    const result = await service.faucet({
      strategy: ctx?.request?.body?.strategy || "normal",
      address: ctx.request.body.address,
      channel: {
        account: account,
        name: "api",
      },
    });

    ctx.response.body = {
      code: 200,
      mssage: result,
    };
  } catch (e) {
    await storage.decrKeyCount(key);

    ctx.response.body = {
      code: 500,
      message: (e as Error).message,
    };

    logger.error(e);
  }
};
