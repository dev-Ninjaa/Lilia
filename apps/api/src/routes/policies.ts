import type { FastifyPluginAsync } from "fastify";
import { PolicyService } from "../../../../packages/core/src/policy/policy.service.ts";
import {
  createPolicySchema,
  policyIdParams,
  policyListQuery,
  updatePolicySchema,
} from "../../../../packages/schemas/src/index.ts";
import { parseInput, sendPage, sendSuccess } from "../middleware/error-handler.ts";

const routes: FastifyPluginAsync = async (app) => {
  const service = new PolicyService(app.db);

  app.post("/api/policies", async (request, reply) => {
    const body = parseInput(createPolicySchema, request.body);
    const policy = await service.create(request.ownerId, body);
    return sendSuccess(reply, request, policy, 201);
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
