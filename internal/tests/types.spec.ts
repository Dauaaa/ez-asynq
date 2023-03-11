/* eslint-disable @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function */
import { it } from "vitest";
import { Fetcher, EzAsynq, EzValue } from "../common";

it("empty", () => { });

// from type-challenges/type-challenges
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? true
  : false;

type Fe1 = Fetcher<string, [string, number, object]>;
type Fe2 = Fetcher<string, []>;

// @ts-expect-error testing
type ShouldInferEzAsynqType_1 = EzAsynq<Fe1>;
type ShouldInferEzAsynqType_2 = EzAsynq<Fe2>;
type ShouldInferEzAsynqType_3 = Expect<
  Equal<EzAsynq<Fe2>["fetch"], Fetcher<void, []>>
>;
type ShouldInferEzAsynqType_4 = Expect<
  Equal<EzAsynq<Fe2>["forceFetch"], Fetcher<void, []>>
>;
type ShouldInferEzAsynqType_5 = Expect<
  Equal<EzAsynq<Fe2>["ez"]["stale"], () => void>
>;

// @ts-expect-error testing
const ShouldDiscriminateEzValueType_1: EzValue<Fe2> = {
  state: "uninitialized",
  value: "x",
  stale: () => { },
};
const ShouldDiscriminateEzValueType_2: EzValue<Fe2> = {
  state: "uninitialized",
  value: null,
  stale: () => { },
};

const ShouldDiscriminateEzValueType_3: EzValue<Fe2> = {
  state: "error",
  value: "x",
  stale: () => { },
};
const ShouldDiscriminateEzValueType_4: EzValue<Fe2> = {
  state: "error",
  value: null,
  stale: () => { },
};
const ShouldDiscriminateEzValueType_5: EzValue<Fe2> = {
  state: "fetching",
  value: "x",
  stale: () => { },
};
const ShouldDiscriminateEzValueType_6: EzValue<Fe2> = {
  state: "fetching",
  value: null,
  stale: () => { },
};
// @ts-expect-error testing
const ShouldDiscriminateEzValueType_7: EzValue<Fe2> = {
  state: "done",
  value: null,
  stale: () => { },
};
const ShouldDiscriminateEzValueType_8: EzValue<Fe2> = {
  state: "done",
  value: "x",
  stale: () => { },
};
// @ts-expect-error testing
const ShouldDiscriminateEzValueType_9: EzValue<Fe2> = {
  state: "stale",
  value: null,
  stale: () => { },
};
const ShouldDiscriminateEzValueType_10: EzValue<Fe2> = {
  state: "stale",
  value: "x",
  stale: () => { },
};
