import type { FastifyPluginAsync } from "fastify";
import { TransactionService } from "../../../../packages/core/src/transactions/transaction.service.ts";
import {
  prepareSchema,
  signatureParams,
  submitSchema,
  transactionListQuery,
} from "../../../../packages/schemas/src/index.ts";
import { parseInput, sendPage, sendSuccess } from "../middleware/error-handler.ts";

const routes: FastifyPluginAsync = async (app) => {
  const service = new TransactionService(app.db);
  app.post("/api/transactions/prepare", async (request, reply) => {
    const body = parseInput(prepareSchema, request.body);
    return sendSuccess(reply, request, await service.prepare(request.ownerId, body), 201);
  });
  app.post("/api/transactions/submit", async (request) => {
    parseInput(submitSchema, request.body);
    return service.submitUnavailable();
  });
  app.get("/api/transactions", async (request, reply) => {
    const query = parseInput(transactionListQuery, request.query);
    const result = await service.list(request.ownerId, query);
    return sendPage(reply, request, result, query.page, query.limit);
  });
  app.get("/api/transactions/:signature", async (request, reply) => {
    const { signature } = parseInput(signatureParams, request.params);
    return sendSuccess(reply, request, await service.getBySignature(request.ownerId, signature));
  });
};
export default routes;
