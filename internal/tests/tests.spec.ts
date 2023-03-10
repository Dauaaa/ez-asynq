import { EzAsync } from "../base";
import { EzAsyncMut } from "../mut";
import { EzAsyncMemo } from "../memo";
import { Action, EmptyFetcherArgs } from "../common";
import { EzAsyncMemoMut } from "../mut/memo";
import { describe, it, expect, vitest, beforeEach } from "vitest";

const sleep = async (time: number) =>
  await new Promise((resolve) => setTimeout(resolve, time));

describe("EzAsyncBase", () => {
  it.concurrent("should fetch and observe an async value", async () => {
    const fetcher = async (id: number) => {
      return { id, name: "John Doe" };
    };

    const asyncValue = new EzAsync(() => fetcher(1));

    expect(asyncValue.ez.state).toBe("uninitialized");

    await asyncValue.fetch();

    expect(asyncValue.ez.value?.id).toBe(1);
    expect(asyncValue.ez.value?.name).toBe("John Doe");
    expect(asyncValue.ez.state).toBe("done");

    asyncValue.ez.stale();
    expect(asyncValue.ez.state).toBe("stale");

    await asyncValue.fetch();

    expect(asyncValue.ez.state).toBe("done");
    expect(asyncValue.ez.value?.id).toBe(1);
  });

  it.concurrent("should stale value after each action", async () => {
    const fetcher = async (id: number) => {
      return { id, name: "John Doe" };
    };

    const asyncValue = new EzAsync(() => fetcher(1));

    expect(asyncValue.ez.state).toBe("uninitialized");

    await asyncValue.fetch();

    expect(asyncValue.ez.value?.id).toBe(1);
    expect(asyncValue.ez.value?.name).toBe("John Doe");
    expect(asyncValue.ez.state).toBe("done");

    await asyncValue.fetch();

    expect(asyncValue.ez.state).toBe("done");
    expect(asyncValue.ez.value?.id).toBe(1);
  });

  it.concurrent("Should infer value type correctly", async () => {
    const fetcher = async () => await Promise.resolve([123]);

    const ezValue = new EzAsync(fetcher);

    if (ezValue.ez.state === "uninitialized") {
      ezValue.ez.value;
    }
  });

  it.concurrent("should throw error on fetch error", async () => {
    const fetcher = async () => {
      throw new Error("fetch error");
    };

    const asyncValue = new EzAsync(fetcher);

    try {
      await asyncValue.fetch();
    } catch (error) {
      expect((error as any).message).toBe("fetch error");
      expect(asyncValue.ez.state).toBe("error");
    }
  });
});

describe("AsyncMemo", () => {
  it.concurrent("AsyncMemo: fetch and forceFetch", async () => {
    const asyncFn = async (arg: number) => {
      return Promise.resolve(arg * 2);
    };

    const memo = new EzAsyncMemo(asyncFn, (n: number) => n);

    await memo.fetch(2);
    expect(memo.current?.ez.value).toBe(4);

    await memo.fetch(4);
    expect(memo.current?.ez.value).toBe(8);

    expect(memo.cache.size).toBe(2);

    memo.cache.get(2);
  });

  it.concurrent("EzAsyncMemo: stale", async () => {
    const asyncFn = async (arg: number) => {
      return Promise.resolve(arg * 2);
    };

    const memo = new EzAsyncMemo(asyncFn);

    await memo.fetch(2);
    expect(memo.current?.ez.value).toBe(4);

    memo.stale();

    await memo.fetch(3);
    expect(memo.current?.ez.value).toBe(6);
  });

  it.concurrent("EzAsyncMemo: memoization", async () => {
    let callCount = 0;
    const asyncFn = async (arg: number) => {
      callCount++;
      return Promise.resolve(arg * 2);
    };

    const memo = new EzAsyncMemo(asyncFn);

    memo.cache;

    await memo.fetch(2);
    expect(memo.current?.ez.value).toBe(4);
    expect(callCount).toBe(1);

    await memo.fetch(2);
    expect(memo.current?.ez.value).toBe(4);
    expect(callCount).toBe(1);

    await memo.fetch(3);
    expect(memo.current?.ez.value).toBe(6);
    expect(callCount).toBe(2);
  });

  it.concurrent("EzAsyncMemo: hashing", async () => {
    let callCount = 0;
    const getter = async (n: number) => {
      callCount++;
      return await Promise.resolve(n + 2);
    };

    const memo = new EzAsyncMemo(getter, (n: number) => n);

    await memo.fetch(1);
    await memo.fetch(2);
    await memo.fetch(3);
    await memo.fetch(4);
    await memo.fetch(5);
    await memo.fetch(6);

    expect(memo.cache.size).toBe(6);
    expect(callCount).toBe(6);
    expect(memo.cache.get(1)?.ez.value).toBe(3);
    expect(memo.cache.get(2)?.ez.value).toBe(4);
    expect(memo.cache.get(3)?.ez.value).toBe(5);
    expect(memo.cache.get(4)?.ez.value).toBe(6);
    expect(memo.cache.get(5)?.ez.value).toBe(7);
    expect(memo.cache.get(6)?.ez.value).toBe(8);
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
      const arr = new EzAsyncMut(async () => await fetcher("ab"), {
        add: action,
      });

      await arr.fetch();

      expect(arr.ez.value).toStrictEqual(["ab"]);
    });

    it.concurrent("Action ordering should be preserved", async () => {
      const arr = new EzAsyncMut(async () => await fetcher("ab"), {
        add: action,
      });

      await arr.fetch();

      void arr.actions.add("1", 300);
      void arr.actions.add("2", 1);
      void arr.actions.add("3", 1);
      void arr.actions.add("4", 600);

      expect(arr.ez.value).toStrictEqual(["ab"]);

      await sleep(600);

      expect(arr.ez.value).toStrictEqual(["ab", "1", "2", "3"]);

      await sleep(500);

      expect(arr.ez.value).toStrictEqual(["ab", "1", "2", "3", "4"]);
    });
  });

  describe("EzAsyncMemoMut", () => {
    it("Switches concurrent between fetches correctly", async () => {
      const memo = EzAsyncMemoMut.new(fetcher, { addStr: memoAction });

      await memo.fetch("first");
      expect(memo.current?.ez.value).toStrictEqual(["first"]);

      await memo.fetch("second");
      expect(memo.current?.ez.value).toStrictEqual(["second"]);

      await memo.fetch("second");
      expect(memo.current?.ez.value).toStrictEqual(["second"]);
    });

    it("Updates state with actions", async () => {
      const memo = EzAsyncMemoMut.new(fetcher, { addStr: memoAction });

      await memo.fetch("first");
      expect(memo.current?.ez.value).toStrictEqual(["first"]);

      await memo.current?.actions.addStr("second", 0);
      expect(memo.current?.ez.value).toStrictEqual(["first", "second"]);

      await memo.fetch("new");
      await memo.current?.actions.addStr("newnew", 0);
    });
  });

  it.concurrent("EzAsyncMemoMut: hashing", async () => {
    let callCount = 0;
    const getter = async (n: number) => {
      callCount++;
      return await Promise.resolve(n + 2);
    };

    const memo = EzAsyncMemoMut.newHasher(getter, (n: number) => n, {});

    await memo.fetch(1);
    await memo.fetch(2);
    await memo.fetch(3);
    await memo.fetch(4);
    await memo.fetch(5);
    await memo.fetch(6);

    expect(memo.cache.size).toBe(6);
    expect(callCount).toBe(6);
    expect(memo.cache.get(1)?.ez.value).toBe(3);
    expect(memo.cache.get(2)?.ez.value).toBe(4);
    expect(memo.cache.get(3)?.ez.value).toBe(5);
    expect(memo.cache.get(4)?.ez.value).toBe(6);
    expect(memo.cache.get(5)?.ez.value).toBe(7);
    expect(memo.cache.get(6)?.ez.value).toBe(8);
  });
});
