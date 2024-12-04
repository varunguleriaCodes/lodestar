import {routes} from "@lodestar/api";
import {ProtoBlock} from "@lodestar/fork-choice";
import {CachedBeaconStateAllForks} from "@lodestar/state-transition";
import {BeaconBlock, Epoch, RootHex, Slot, phase0} from "@lodestar/types";
import {CheckpointHex} from "../stateCache/index.js";

export enum RegenCaller {
  getDuties = "getDuties",
  processBlock = "processBlock",
  produceBlock = "produceBlock",
  validateGossipBlock = "validateGossipBlock",
  validateGossipBlob = "validateGossipBlob",
  precomputeEpoch = "precomputeEpoch",
  predictProposerHead = "predictProposerHead",
  produceAttestationData = "produceAttestationData",
  processBlocksInEpoch = "processBlocksInEpoch",
  validateGossipAggregateAndProof = "validateGossipAggregateAndProof",
  validateGossipAttestation = "validateGossipAttestation",
  validateGossipVoluntaryExit = "validateGossipVoluntaryExit",
  onForkChoiceFinalized = "onForkChoiceFinalized",
  restApi = "restApi",
}

export enum RegenFnName {
  getBlockSlotState = "getBlockSlotState",
  getState = "getState",
  getPreState = "getPreState",
  getCheckpointState = "getCheckpointState",
}

export type StateRegenerationOpts = {
  dontTransferCache: boolean;
  /**
   * Do not queue shuffling calculation async. Forces sync JIT calculation in afterProcessEpoch if not passed as `true`
   */
  asyncShufflingCalculation?: boolean;
};

export interface IStateRegenerator extends IStateRegeneratorInternal {
  dropCache(): void;
  dumpCacheSummary(): routes.lodestar.StateCacheItem[];
  getStateSync(stateRoot: RootHex): CachedBeaconStateAllForks | null;
  getPreStateSync(block: BeaconBlock): CachedBeaconStateAllForks | null;
  getCheckpointStateOrBytes(cp: CheckpointHex): Promise<CachedBeaconStateAllForks | Uint8Array | null>;
  getCheckpointStateSync(cp: CheckpointHex): CachedBeaconStateAllForks | null;
  getClosestHeadState(head: ProtoBlock): CachedBeaconStateAllForks | null;
  pruneOnCheckpoint(finalizedEpoch: Epoch, justifiedEpoch: Epoch, headStateRoot: RootHex): void;
  pruneOnFinalized(finalizedEpoch: Epoch): void;
  processState(blockRootHex: RootHex, postState: CachedBeaconStateAllForks): void;
  addCheckpointState(cp: phase0.Checkpoint, item: CachedBeaconStateAllForks): void;
  updateHeadState(newHead: ProtoBlock, maybeHeadState: CachedBeaconStateAllForks): void;
  updatePreComputedCheckpoint(rootHex: RootHex, epoch: Epoch): number | null;
}

/**
 * Regenerates states that have already been processed by the fork choice
 */
export interface IStateRegeneratorInternal {
  /**
   * Return a valid pre-state for a beacon block
   * This will always return a state in the latest viable epoch
   */
  getPreState(
    block: BeaconBlock,
    opts: StateRegenerationOpts,
    rCaller: RegenCaller
  ): Promise<CachedBeaconStateAllForks>;

  /**
   * Return a valid checkpoint state
   * This will always return a state with `state.slot % SLOTS_PER_EPOCH === 0`
   */
  getCheckpointState(
    cp: phase0.Checkpoint,
    opts: StateRegenerationOpts,
    rCaller: RegenCaller
  ): Promise<CachedBeaconStateAllForks>;

  /**
   * Return the state of `blockRoot` processed to slot `slot`
   */
  getBlockSlotState(
    blockRoot: RootHex,
    slot: Slot,
    opts: StateRegenerationOpts,
    rCaller: RegenCaller
  ): Promise<CachedBeaconStateAllForks>;

  /**
   * Return the exact state with `stateRoot`
   */
  getState(stateRoot: RootHex, rCaller: RegenCaller, opts?: StateRegenerationOpts): Promise<CachedBeaconStateAllForks>;
}
