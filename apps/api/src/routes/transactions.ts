import { env } from "@lilia/api/config/env.ts";
import { parseInput, sendPage, sendSuccess } from "@lilia/api/middleware/error-handler.ts";
import { AppError } from "@lilia/api/middleware/error-handler.ts";
import { TransactionV2Service } from "@lilia/core/transactions/transaction-v2.service.ts";
import { TransactionService } from "@lilia/core/transactions/transaction.service.ts";
import {
  prepareSchema,
  recordSubmissionSchema,
  signatureParams,
  submitSchema,
  transactionListQuery,
} from "@lilia/schemas/index.ts";
import { Keypair, Transaction } from "@solana/web3.js";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const demoSignSchema = z.object({ transaction: z.string().min(1).max(100_000) });

const routes: FastifyPluginAsync = async (app) => {
  const service = new TransactionService(app.db);
  const serviceV2 = new TransactionV2Service(app.db);

  app.post("/api/transactions/prepare", async (request, reply) => {
    const body = parseInput(prepareSchema, request.body);
    return sendSuccess(reply, request, await service.prepare(request.ownerId, body), 201);
  });

  app.post("/api/transactions/prepare-v2", async (request, reply) => {
    const body = parseInput(prepareSchema, request.body);
    return sendSuccess(reply, request, await serviceV2.prepare(request.ownerId, body), 201);
  });

  app.post("/api/transactions/submit", async (request, reply) => {
    const body = parseInput(submitSchema, request.body);
    return sendSuccess(reply, request, await serviceV2.submit(request.ownerId, body));
  });

  // Devnet demo helper: signs a prepared transfer with the configured demo authority so the
  // console can run end to end without a wallet. Refuses any transaction it is not the payer of.
  app.post("/api/transactions/demo-sign", async (request, reply) => {
    const body = parseInput(demoSignSchema, request.body);
    if (!env.LILIA_DEMO_TRANSFER_AUTHORITY)
      throw new AppError(
        503,
        "DEMO_SIGNER_NOT_CONFIGURED",
        "No demo transfer authority is configured",
      );
    const signer = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(env.LILIA_DEMO_TRANSFER_AUTHORITY) as number[]),
    );
    const transaction = Transaction.from(Buffer.from(body.transaction, "base64"));
    if (!transaction.feePayer?.equals(signer.publicKey))
      throw new AppError(
        400,
        "DEMO_SIGNER_MISMATCH",
        "Transaction is not payable by the demo authority",
      );
    transaction.partialSign(signer);
    const signedTransaction = transaction
      .serialize({ requireAllSignatures: true, verifySignatures: true })
      .toString("base64");
    return sendSuccess(reply, request, { signedTransaction });
  });

  app.post("/api/v2/transactions/record-submission", async (request, reply) => {
    const body = parseInput(recordSubmissionSchema, request.body);
    return sendSuccess(reply, request, await serviceV2.recordSubmission(request.ownerId, body));
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
