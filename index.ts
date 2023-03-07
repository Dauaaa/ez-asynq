import { EzAsyncBase } from "./internal/base";
import { EzAsyncMut } from "./internal/mut";
import { EzAsyncMemo } from "./internal/memo";
import { EzAsyncMemoMut } from "./internal/mut/memo";
export { arrayToMapFetcher } from "./internal/transforms";
export { createAction, createMemoAction } from "./internal/mut/utils";

export const ezAsync = {
  value: EzAsyncBase.new,
  memo: EzAsyncMemo.new,
  mut: EzAsyncMut.new,
  memoMut: EzAsyncMemoMut.new,
};

export type { EzAsync, Action, EzAsyncState } from "./internal/common";

// TODO test EzAsyncMemoMut
// TODO remove arguments from EzAsync
// TODO fix all stale docstrings!
// TODO hash options
// TODO boring action (action for non mut where every action is followed by stale)
// TODO find a way to instantiate a controller inside ezFeatureComponent
