import {beforeEach, describe, expect, it} from "vitest";
import {generateTestCachedBeaconStateOnlyValidators} from "../../../../state-transition/test/perf/util.js";
import {ShufflingCache} from "../../../src/chain/shufflingCache.js";

describe("ShufflingCache", () => {
  const vc = 64;
  const stateSlot = 100;
  const state = generateTestCachedBeaconStateOnlyValidators({vc, slot: stateSlot});
  const currentEpoch = state.epochCtx.epoch;
  const currentDecisionRoot = state.epochCtx.currentDecisionRoot;
  let shufflingCache: ShufflingCache;

  beforeEach(() => {
    shufflingCache = new ShufflingCache(null, null, {maxShufflingCacheEpochs: 1}, [
      {
        shuffling: state.epochCtx.currentShuffling,
        decisionRoot: currentDecisionRoot,
      },
    ]);
  });

  it("should get shuffling from cache", async () => {
    expect(await shufflingCache.get(currentEpoch, currentDecisionRoot)).toEqual(state.epochCtx.currentShuffling);
  });

  it("should bound by maxSize(=1)", async () => {
    expect(await shufflingCache.get(currentEpoch, currentDecisionRoot)).toEqual(state.epochCtx.currentShuffling);
    // insert promises at the same epoch does not prune the cache
    shufflingCache.insertPromise(currentEpoch, "0x00");
    expect(await shufflingCache.get(currentEpoch, currentDecisionRoot)).toEqual(state.epochCtx.currentShuffling);
    // insert shuffling at other epochs does prune the cache
    shufflingCache["set"](state.epochCtx.previousShuffling, state.epochCtx.previousDecisionRoot);
    // the current shuffling is not available anymore
    expect(await shufflingCache.get(currentEpoch, currentDecisionRoot)).toBeNull();
  });

  it("should return shuffling from promise", async () => {
    const previousEpoch = state.epochCtx.epoch - 1;
    const previousDecisionRoot = state.epochCtx.previousDecisionRoot;
    shufflingCache.insertPromise(previousEpoch, previousDecisionRoot);
    const shufflingRequest0 = shufflingCache.get(previousEpoch, previousDecisionRoot);
    const shufflingRequest1 = shufflingCache.get(previousEpoch, previousDecisionRoot);
    shufflingCache["set"](state.epochCtx.previousShuffling, previousDecisionRoot);
    expect(await shufflingRequest0).toEqual(state.epochCtx.previousShuffling);
    expect(await shufflingRequest1).toEqual(state.epochCtx.previousShuffling);
  });

  it("should support up to 2 promises at a time", async () => {
    // insert 2 promises at the same epoch
    shufflingCache.insertPromise(currentEpoch, "0x00");
    shufflingCache.insertPromise(currentEpoch, "0x01");
    // inserting other promise should throw error
    expect(() => shufflingCache.insertPromise(currentEpoch, "0x02")).toThrow();
  });
});
