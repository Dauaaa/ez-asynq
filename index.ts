import { EzAsynq } from "./internal/base";
import { EzAsynqMemo } from "./internal/memo";
import { EzAsynqMut } from "./internal/mut";
import { EzAsynqMemoMut } from "./internal/mut/memo";

export const ezAsynq = {
  base: EzAsynq.new,
  mut: EzAsynqMut.new,
  memo: EzAsynqMemo.new,
  memoMut: EzAsynqMemoMut.new,
};

export { arrayToMapFetcher } from "./internal/transforms";
export { createAAFactory } from "./internal/mut/utils";

export type { EzValue, Action, EzAsynqState } from "./internal/common";
