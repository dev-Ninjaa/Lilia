import type { FastifyPluginAsync } from "fastify";
import { AuthorizationService } from "../../../../packages/core/src/authorization/authorization.service.ts";
import { PermitV2Service } from "../../../../packages/core/src/authorization/permit-v2.service.ts";
import { EvaluationService } from "../../../../packages/core/src/sentinel/evaluation.service.ts";
import {
  assessmentParams,
  authorizeSchema,
  authorizeV2Schema,
  evaluateSchema,
} from "../../../../packages/schemas/src/index.ts";
import { SECURITY_RULES } from "../config/constants.ts";
import { parseInput, sendSuccess } from "../middleware/error-handler.ts";

const routes: FastifyPluginAsync = async (app) => {
  const service = new EvaluationService(app.db);
  const authorization = new AuthorizationService(app.db);
  const permitsV2 = new PermitV2Service(app.db);
  app.post("/api/sentinel/evaluate", async (request, reply) => {
    const body = parseInput(evaluateSchema, request.body);
    const result = await service.evaluate(request.ownerId, body, body.policyId);
    return sendSuccess(reply, request, result, 201);
  });

  app.post("/api/sentinel/authorize", async (request, reply) => {
    const { assessmentId } = parseInput(authorizeSchema, request.body);
    return sendSuccess(
      reply,
      request,
      await authorization.authorize(request.ownerId, assessmentId),
      201,
    );
  });

  app.post("/api/v2/sentinel/authorize", async (request, reply) => {
    const body = parseInput(authorizeV2Schema, request.body);
    return sendSuccess(reply, request, await permitsV2.issue(request.ownerId, body), 201);
  });

  app.get("/api/sentinel/rules", async (request, reply) =>
    sendSuccess(reply, request, SECURITY_RULES),
  );

  app.get("/api/sentinel/assessments/:assessmentId", async (request, reply) => {
    const { assessmentId } = parseInput(assessmentParams, request.params);
    return sendSuccess(reply, request, await service.getOwned(request.ownerId, assessmentId));
  });
};

export default routes;
