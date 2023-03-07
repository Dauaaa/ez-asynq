import { EzAsyncBase } from "./base";
import { EzAsyncMut } from "./mut";
import { EzAsyncMemo } from "./memo";
import { Action, EmptyFetcherArgs } from "./common";
import { EzAsyncMemoMut } from "./mut/memo";
import { describe, it, expect, vitest, beforeEach } from "vitest";

const sleep = async (time: number) =>
  await new Promise((resolve) => setTimeout(resolve, time));

describe("EzAsyncBase", () => {
  it.concurrent("should fetch and observe an async value", async () => {
    const fetcher = async (id: number) => {
      return { id, name: "John Doe" };
    };

    const asyncValue = EzAsyncBase.new(() => fetcher(1));

    expect(asyncValue.ez.state.get()).toBe("uninitialized");

    await asyncValue.ez.fetch();

    expect(asyncValue.ez.value?.id).toBe(1);
    expect(asyncValue.ez.value?.name).toBe("John Doe");
    expect(asyncValue.ez.state.get()).toBe("done");

    asyncValue.ez.stale();
    expect(asyncValue.ez.state.get()).toBe("stale");

    await asyncValue.ez.fetch();

    expect(asyncValue.ez.state.get()).toBe("done");
    expect(asyncValue.ez.value?.id).toBe(1);
  });

  it.concurrent("should stale value after each action", async () => {
    const fetcher = async (id: number) => {
      return { id, name: "John Doe" };
    };

    const asyncValue = EzAsyncBase.new(() => fetcher(1));

    expect(asyncValue.ez.state.get()).toBe("uninitialized");

    await asyncValue.ez.fetch();

    expect(asyncValue.ez.value?.id).toBe(1);
    expect(asyncValue.ez.value?.name).toBe("John Doe");
    expect(asyncValue.ez.state.get()).toBe("done");

    await asyncValue.ez.fetch();

    expect(asyncValue.ez.state.get()).toBe("done");
    expect(asyncValue.ez.value?.id).toBe(1);
  });

  it.concurrent("should throw error on fetch error", async () => {
    const fetcher = async () => {
      throw new Error("fetch error");
    };

    const asyncValue = EzAsyncBase.new(fetcher);

    try {
      await asyncValue.ez.fetch();
    } catch (error) {
      expect((error as any).message).toBe("fetch error");
      expect(asyncValue.ez.state.get()).toBe("error");
    }
  });
});

describe("AsyncMemo", () => {
  it.concurrent("AsyncMemo: fetch and forceFetch", async () => {
    const asyncFn = async (arg: number) => {
      return Promise.resolve(arg * 2);
    };

    const memo = EzAsyncMemo.newHasher(asyncFn, (n: number) => n);

    await memo.ezMemo.fetch(2);
    expect(memo.ezMemo.current?.ez.value).toBe(4);

    await memo.ezMemo.fetch(4);
    expect(memo.ezMemo.current?.ez.value).toBe(8);

    expect(memo.ezMemo.cache.size).toBe(2);

    memo.ezMemo.cache.get(2);
  });

  it.concurrent("EzAsyncMemo: stale", async () => {
    const asyncFn = async (arg: number) => {
      return Promise.resolve(arg * 2);
    };

    const memo = EzAsyncMemo.new(asyncFn);

    await memo.ezMemo.fetch(2);
    expect(memo.ezMemo.current?.ez.value).toBe(4);

    memo.ezMemo.stale();

    await memo.ezMemo.fetch(3);
    expect(memo.ezMemo.current?.ez.value).toBe(6);
  });

  it.concurrent("EzAsyncMemo: memoization", async () => {
    let callCount = 0;
    const asyncFn = async (arg: number) => {
      callCount++;
      return Promise.resolve(arg * 2);
    };

    const memo = EzAsyncMemo.new(asyncFn);

    await memo.ezMemo.fetch(2);
    expect(memo.ezMemo.current?.ez.value).toBe(4);
    expect(callCount).toBe(1);

    await memo.ezMemo.fetch(2);
    expect(memo.ezMemo.current?.ez.value).toBe(4);
    expect(callCount).toBe(1);

    await memo.ezMemo.fetch(3);
    expect(memo.ezMemo.current?.ez.value).toBe(6);
    expect(callCount).toBe(2);
  });

  it.concurrent("EzAsyncMemo: hashing", async () => {
    let callCount = 0;
    const getter = async (n: number) => {
      callCount++;
      return await Promise.resolve(n + 2);
    };

    const memo = EzAsyncMemo.newHasher(getter, (n: number) => n);

    await memo.ezMemo.fetch(1);
    await memo.ezMemo.fetch(2);
    await memo.ezMemo.fetch(3);
    await memo.ezMemo.fetch(4);
    await memo.ezMemo.fetch(5);
    await memo.ezMemo.fetch(6);

    expect(memo.ezMemo.cache.size).toBe(6);
    expect(callCount).toBe(6);
    expect(memo.ezMemo.cache.get(1)?.ez.value).toBe(3);
    expect(memo.ezMemo.cache.get(2)?.ez.value).toBe(4);
    expect(memo.ezMemo.cache.get(3)?.ez.value).toBe(5);
    expect(memo.ezMemo.cache.get(4)?.ez.value).toBe(6);
    expect(memo.ezMemo.cache.get(5)?.ez.value).toBe(7);
    expect(memo.ezMemo.cache.get(6)?.ez.value).toBe(8);
  });
});

describe("Mut", () => {
  const fetcher = vitest.fn(async (str: string) => Promise.resolve([str]));
  const actionFetcher = vitest.fn(async (a: string, time: number) => {
    await sleep(time);
    return Promise.resolve(a);
  });
  const action: Action<() => Promise<string[]>, typeof actionFetcher> = {
    fetcher: actionFetcher,
    effect: vitest.fn(({ ez, result }) => {
      ez.value?.push(result);
    }),
  };
  const memoAction: Action<
    EmptyFetcherArgs<typeof fetcher>,
    typeof actionFetcher
  > = {
    fetcher: actionFetcher,
    effect: vitest.fn(({ ez, result }) => {
      ez.value?.push(result);
    }),
  };

  beforeEach(() => void vitest.clearAllMocks());
  describe("EzAsyncMut", () => {
    it.concurrent("intializes value correctly", async () => {
      const arr = EzAsyncMut.new(async () => await fetcher("ab"), {
        add: action,
      });

      await arr.ezMut.fetch();

      expect(arr.ezMut.value).toStrictEqual(["ab"]);
    });

    it.concurrent("Action ordering should be preserved", async () => {
      const arr = EzAsyncMut.new(async () => await fetcher("ab"), {
        add: action,
      });

      await arr.ezMut.fetch();

      console.log(arr.ezMut.actions);

      void arr.ezMut.actions.add("1", 300);
      void arr.ezMut.actions.add("2", 1);
      void arr.ezMut.actions.add("3", 1);
      void arr.ezMut.actions.add("4", 600);

      expect(arr.ezMut.value).toStrictEqual(["ab"]);

      await sleep(600);

      expect(arr.ezMut.value).toStrictEqual(["ab", "1", "2", "3"]);

      await sleep(500);

      expect(arr.ezMut.value).toStrictEqual(["ab", "1", "2", "3", "4"]);
    });
  });

  describe("EzAsyncMemoMut", () => {
    it("Switches concurrent between fetches correctly", async () => {
      const memo = EzAsyncMemoMut.new(fetcher, { addStr: memoAction });

      await memo.ezMemoMut.fetch("first");
      expect(memo.ezMemoMut.current?.ezMut.value).toStrictEqual(["first"]);

      await memo.ezMemoMut.fetch("second");
      expect(memo.ezMemoMut.current?.ezMut.value).toStrictEqual(["second"]);

      await memo.ezMemoMut.fetch("second");
      expect(memo.ezMemoMut.current?.ezMut.value).toStrictEqual(["second"]);
    });

    it("Updates state with actions", async () => {
      const memo = EzAsyncMemoMut.new(fetcher, { addStr: memoAction });

      await memo.ezMemoMut.fetch("first");
      expect(memo.ezMemoMut.current?.ezMut.value).toStrictEqual(["first"]);

      await memo.ezMemoMut.current?.ezMut.actions.addStr("second", 0);
      expect(memo.ezMemoMut.current?.ezMut.value).toStrictEqual([
        "first",
        "second",
      ]);

      await memo.ezMemoMut.fetch("new");
      await memo.ezMemoMut.current?.ezMut.actions.addStr("newnew", 0);
    });
  });

  it.concurrent("EzAsyncMemoMut: hashing", async () => {
    let callCount = 0;
    const getter = async (n: number) => {
      callCount++;
      return await Promise.resolve(n + 2);
    };

    const memo = EzAsyncMemoMut.newHasher(getter, (n: number) => n, {});

    await memo.ezMemoMut.fetch(1);
    await memo.ezMemoMut.fetch(2);
    await memo.ezMemoMut.fetch(3);
    await memo.ezMemoMut.fetch(4);
    await memo.ezMemoMut.fetch(5);
    await memo.ezMemoMut.fetch(6);

    expect(memo.ezMemoMut.cache.size).toBe(6);
    expect(callCount).toBe(6);
    expect(memo.ezMemoMut.cache.get(1)?.ezMut.value).toBe(3);
    expect(memo.ezMemoMut.cache.get(2)?.ezMut.value).toBe(4);
    expect(memo.ezMemoMut.cache.get(3)?.ezMut.value).toBe(5);
    expect(memo.ezMemoMut.cache.get(4)?.ezMut.value).toBe(6);
    expect(memo.ezMemoMut.cache.get(5)?.ezMut.value).toBe(7);
    expect(memo.ezMemoMut.cache.get(6)?.ezMut.value).toBe(8);
  });
});
