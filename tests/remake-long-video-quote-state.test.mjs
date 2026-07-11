import assert from "node:assert/strict";

import { shouldReplayRequestAfterAuthRefresh } from "../src/lib/apiAuthReplayPolicy.ts";
import {
  EMPTY_LONG_VIDEO_PENDING_RECOVERY,
  LONG_VIDEO_CREATE_AUTH_REPLAY,
  canConfirmRemakeLongVideoQuote,
  createRemakeLongVideoConfirmLock,
  evaluateRemakeLongVideoQuote,
  getRemakeLongVideoPendingRecoveryUi,
  reduceRemakeLongVideoPendingRecovery,
} from "../src/lib/video/remakeLongVideoQuoteState.ts";

function readyQuote() {
  return evaluateRemakeLongVideoQuote(
    {
      clientRequestId: "request-1",
      estimateId: "estimate-1",
      issuedAt: 1_000,
      expiresAt: 2_000,
      status: "created",
    },
    1_500,
  );
}

function testQuoteAndConfirmLock() {
  const quote = readyQuote();
  assert.equal(quote.kind, "ready");
  assert.equal(
    canConfirmRemakeLongVideoQuote({
      activeJob: false,
      eligible: true,
      isCreating: false,
      isRecovering: false,
      quote,
    }),
    true,
  );

  const lock = createRemakeLongVideoConfirmLock();
  assert.equal(lock.tryAcquire(), true);
  assert.equal(lock.tryAcquire(), false);
  assert.equal(lock.isLocked(), true);
  lock.release();
  assert.equal(lock.tryAcquire(), true);
}

function testExpiredQuoteFailsClosed() {
  const quote = evaluateRemakeLongVideoQuote(
    {
      clientRequestId: "request-1",
      estimateId: "estimate-1",
      issuedAt: 1_000,
      expiresAt: 2_000,
      status: "created",
    },
    2_001,
  );
  assert.equal(quote.kind, "expired");
  assert.equal(
    canConfirmRemakeLongVideoQuote({
      activeJob: false,
      eligible: true,
      isCreating: false,
      isRecovering: false,
      quote,
    }),
    false,
  );
}

function testFailedCreateRecoveryUi() {
  let state = reduceRemakeLongVideoPendingRecovery(EMPTY_LONG_VIDEO_PENDING_RECOVERY, {
    type: "mark_uncertain",
    clientRequestId: "request-1",
  });
  assert.equal(state.status, "uncertain");
  assert.equal(getRemakeLongVideoPendingRecoveryUi(state).action, "check_status");

  state = reduceRemakeLongVideoPendingRecovery(state, { type: "check_started" });
  assert.equal(state.status, "checking");
  assert.equal(getRemakeLongVideoPendingRecoveryUi(state).action, "none");

  state = reduceRemakeLongVideoPendingRecovery(state, { type: "failed", errorCode: "safe_failure" });
  assert.equal(state.status, "failed");
  assert.equal(state.errorCode, "safe_failure");
  assert.equal(getRemakeLongVideoPendingRecoveryUi(state).action, "check_status");

  state = reduceRemakeLongVideoPendingRecovery(state, { type: "not_found" });
  assert.equal(state.status, "not_found");
  assert.equal(getRemakeLongVideoPendingRecoveryUi(state).action, "new_estimate");
}

function testAuthRefreshDoesNotReplayCreatePost() {
  assert.equal(LONG_VIDEO_CREATE_AUTH_REPLAY, false);
  assert.equal(
    shouldReplayRequestAfterAuthRefresh({ authReplay: LONG_VIDEO_CREATE_AUTH_REPLAY }),
    false,
  );
  assert.equal(shouldReplayRequestAfterAuthRefresh(), true);
}

testQuoteAndConfirmLock();
testExpiredQuoteFailsClosed();
testFailedCreateRecoveryUi();
testAuthRefreshDoesNotReplayCreatePost();
console.log("remake long-video frontend quote state tests passed");
