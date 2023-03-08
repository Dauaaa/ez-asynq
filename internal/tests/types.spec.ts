/* eslint-disable @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function */
import { Fetcher, EzAsync, EzValue } from "../common";

// from type-challenges/type-challenges
type Expect<T extends true> = T;
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2) ? true : false

type Fe1 = Fetcher<string, [string, number, object]>;
type Fe2 = Fetcher<string, []>;

// @ts-expect-error testing
type ShouldInferEzAsyncType_1 = EzAsync<Fe1>;
type ShouldInferEzAsyncType_2 = EzAsync<Fe2>;
type ShouldInferEzAsyncType_3 = Expect<Equal<EzAsync<Fe2>["fetch"], Fetcher<void, []>>>;
type ShouldInferEzAsyncType_4 = Expect<Equal<EzAsync<Fe2>["forceFetch"], Fetcher<void, []>>>;
type ShouldInferEzAsyncType_5 = Expect<Equal<EzAsync<Fe2>["ez"]["stale"], () => void>>;

// @ts-expect-error testing
const ShouldDiscriminateEzValueType_1: EzValue<Fe2> = {
  state: { current: "uninitialized" },
  value: "x",
  stale: () => { },
}
const ShouldDiscriminateEzValueType_2: EzValue<Fe2> = {
  state: { current: "uninitialized" },
  value: null,
  stale: () => { },
}

const ShouldDiscriminateEzValueType_3: EzValue<Fe2> = {
  state: { current: "error" },
  value: "x",
  stale: () => { },
}
const ShouldDiscriminateEzValueType_4: EzValue<Fe2> = {
  state: { current: "error" },
  value: null,
  stale: () => { },
}
const ShouldDiscriminateEzValueType_5: EzValue<Fe2> = {
  state: { current: "fetching" },
  value: "x",
  stale: () => { },
}
const ShouldDiscriminateEzValueType_6: EzValue<Fe2> = {
  state: { current: "fetching" },
  value: null,
  stale: () => { },
}
// @ts-expect-error testing
const ShouldDiscriminateEzValueType_7: EzValue<Fe2> = {
  state: { current: "done" },
  value: null,
  stale: () => { },
}
const ShouldDiscriminateEzValueType_8: EzValue<Fe2> = {
  state: { current: "done" },
  value: "x",
  stale: () => { },
}
// @ts-expect-error testing
const ShouldDiscriminateEzValueType_9: EzValue<Fe2> = {
  state: { current: "stale" },
  value: null,
  stale: () => { },
}
const ShouldDiscriminateEzValueType_10: EzValue<Fe2> = {
  state: { current: "stale" },
  value: "x",
  stale: () => { },
}
