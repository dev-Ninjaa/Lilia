import { parseInput, sendPage, sendSuccess } from "@lilia/api/middleware/error-handler.ts";
import { PolicyService } from "@lilia/core/policy/policy.service.ts";
import { SolanaAdminService } from "@lilia/core/solana/admin.service.ts";
import {
  createPolicySchema,
  policyIdParams,
  policyListQuery,
  publishPolicyOnChainSchema,
  updatePolicySchema,
} from "@lilia/schemas/index.ts";
import type { FastifyPluginAsync } from "fastify";

const routes: FastifyPluginAsync = async (app) => {
  const service = new PolicyService(app.db);
  const solana = new SolanaAdminService(app.db);

  app.post("/api/policies", async (request, reply) => {
    const body = parseInput(createPolicySchema, request.body);
    const policy = await service.create(request.ownerId, body);
    return sendSuccess(reply, request, policy, 201);
  });

  app.post("/api/policies/:policyId/publish-on-chain", async (request, reply) => {
    const { policyId } = parseInput(policyIdParams, request.params);
    const { mintDecimals } = parseInput(publishPolicyOnChainSchema, request.body);
    return sendSuccess(
      reply,
      request,
      await solana.publishPolicy(request.ownerId, policyId, mintDecimals),
    );
  });

  app.get("/api/policies/:policyId", async (request, reply) => {
    const { policyId } = parseInput(policyIdParams, request.params);
    return sendSuccess(reply, request, await service.get(request.ownerId, policyId));
  });

  app.get("/api/policies", async (request, reply) => {
    const query = parseInput(policyListQuery, request.query);
    const result = await service.list(request.ownerId, query.page, query.limit, query.agentId);
    return sendPage(reply, request, result, query.page, query.limit);
  });

  app.patch("/api/policies/:policyId", async (request, reply) => {
    const { policyId } = parseInput(policyIdParams, request.params);
    const policy = await service.update(
      request.ownerId,
      policyId,
      parseInput(updatePolicySchema, request.body),
    );
    return sendSuccess(reply, request, policy);
  });

  app.delete("/api/policies/:policyId", async (request, reply) => {
    const { policyId } = parseInput(policyIdParams, request.params);
    const policy = await service.deactivate(request.ownerId, policyId);
    return sendSuccess(reply, request, {
      id: policy.id,
      isActive: policy.isActive,
      policyVersion: policy.policyVersion,
    });
  });
};
export default routes;
