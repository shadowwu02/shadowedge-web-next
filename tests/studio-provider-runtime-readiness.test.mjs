import test from "node:test";
import assert from "node:assert/strict";
import {
  assertStudioProviderExecutionReady,
  getStudioProviderReadinessBlocker,
} from "../src/features/studio/capabilities/studioProviderReadiness.ts";

function readiness(overrides = {}) {
  return {
    provider: "higgsfield",
    ready: true,
    checks: {
      catalog: true,
      auth: true,
      credential: true,
      transport: true,
      runtime: true,
      workspace: true,
      cost: true,
    },
    blockers: [],
    error: null,
    credential: {
      strategy: "cli_session",
      configured: true,
      environmentVariables: ["HIGGSFIELD_CLI_BIN"],
    },
    checkedAt: "2026-07-18T12:00:00.000Z",
    cached: false,
    ...overrides,
  };
}

test("authenticated runtime passes the pre-plan readiness gate", () => {
  assert.equal(getStudioProviderReadinessBlocker(readiness()), null);
  assert.doesNotThrow(() => assertStudioProviderExecutionReady(readiness()));
});

test("CLI unauthenticated blocks before a Generation Plan can be built", () => {
  const blocked = readiness({
    ready: false,
    checks: {
      ...readiness().checks,
      auth: false,
      credential: false,
      workspace: false,
    },
    blockers: ["HIGGSFIELD_CLI_NOT_AUTHENTICATED"],
    error: {
      code: "PROVIDER_AUTH_REQUIRED",
      sourceCode: "HIGGSFIELD_CLI_NOT_AUTHENTICATED",
      message: "Higgsfield runtime is not ready.",
    },
  });
  const blocker = getStudioProviderReadinessBlocker(blocked);
  assert.equal(blocker.code, "PROVIDER_AUTH_REQUIRED");
  assert.equal(blocker.sourceCode, "HIGGSFIELD_CLI_NOT_AUTHENTICATED");
  assert.match(blocker.message, /Higgsfield/);
  assert.throws(
    () => assertStudioProviderExecutionReady(blocked),
    (error) =>
      error.code === "PROVIDER_AUTH_REQUIRED" &&
      error.sourceCode === "HIGGSFIELD_CLI_NOT_AUTHENTICATED",
  );
});

test("missing readiness metadata fails closed and cannot enter Queue", () => {
  const blocker = getStudioProviderReadinessBlocker(undefined);
  assert.equal(blocker.code, "PROVIDER_RUNTIME_UNAVAILABLE");
  assert.throws(
    () => assertStudioProviderExecutionReady(undefined),
    (error) => error.code === "PROVIDER_RUNTIME_UNAVAILABLE",
  );
});

test("credential and runtime errors keep precise UI categories", () => {
  const invalidCredential = readiness({
    ready: false,
    blockers: ["HIGGSFIELD_CLI_CREDENTIAL_INVALID"],
    error: {
      code: "PROVIDER_CREDENTIAL_INVALID",
      sourceCode: "HIGGSFIELD_CLI_CREDENTIAL_INVALID",
      message: "Higgsfield runtime is not ready.",
    },
  });
  assert.equal(
    getStudioProviderReadinessBlocker(invalidCredential).code,
    "PROVIDER_CREDENTIAL_INVALID",
  );
});
