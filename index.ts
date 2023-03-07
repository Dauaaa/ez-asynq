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
