import { PUBLISH_FAILURE } from "./release_core.mjs";
import { combineOutput } from "./release_process.mjs";

export function isVersionConflictOutput(output) {
  const lower = output.toLowerCase();

  return (
    /\be409\b/.test(lower) ||
    (/\b409\b/.test(lower) && lower.includes("conflict"))
  );
}

export function isAuthenticationOutput(output) {
  const lower = output.toLowerCase();

  return (
    lower.includes("err_pnpm_otp_non_interactive") ||
    lower.includes("requires additional authentication") ||
    lower.includes("not running in an interactive terminal") ||
    lower.includes("provide the --otp option") ||
    lower.includes("eneedauth") ||
    /\be401\b/.test(lower) ||
    /\beotp\b/.test(lower) ||
    lower.includes("one-time password") ||
    lower.includes("one-time pass")
  );
}

export function isPermissionOutput(output) {
  const lower = output.toLowerCase();

  return (
    /\be403\b/.test(lower) ||
    lower.includes("forbidden") ||
    lower.includes("you do not have permission") ||
    lower.includes("permission to publish")
  );
}

export function isNotFoundOutput(output) {
  const lower = output.toLowerCase();

  return (
    lower.includes("e404") ||
    lower.includes("404 not found") ||
    lower.includes("is not in this registry") ||
    lower.includes("could not be found")
  );
}

export function isTransientOutput(output) {
  const lower = output.toLowerCase();

  return (
    lower.includes("etimedout") ||
    lower.includes("econnreset") ||
    lower.includes("econnrefused") ||
    lower.includes("eai_again") ||
    lower.includes("enotfound") ||
    lower.includes("socket hang up") ||
    lower.includes("network") ||
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    /\be50[0-4]\b/.test(lower) ||
    lower.includes("service unavailable") ||
    lower.includes("bad gateway") ||
    lower.includes("internal server error")
  );
}

export function classifyPublishFailure({ stdout = "", stderr = "" } = {}) {
  const output = combineOutput(stdout, stderr);

  if (isVersionConflictOutput(output)) {
    return PUBLISH_FAILURE.VERSION_CONFLICT;
  }

  if (isAuthenticationOutput(output)) {
    return PUBLISH_FAILURE.AUTHENTICATION;
  }

  if (isPermissionOutput(output)) {
    return PUBLISH_FAILURE.PERMISSION;
  }

  if (isNotFoundOutput(output)) {
    return PUBLISH_FAILURE.NOT_FOUND;
  }

  if (isTransientOutput(output)) {
    return PUBLISH_FAILURE.TRANSIENT;
  }

  return PUBLISH_FAILURE.UNKNOWN;
}
