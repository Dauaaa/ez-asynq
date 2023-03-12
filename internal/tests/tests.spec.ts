/* eslint-disable @typescript-eslint/no-unused-vars */

import { EzAsynq } from "../base";
import { EzAsynqMut } from "../mut";
import { EzAsynqMemo } from "../memo";
import { EzAsynqMemoMut } from "../mut/memo";
import { describe, it, expect, vitest, beforeEach } from "vitest";
import { createAAFactory, createAAMemoFactory } from "../mut/utils";

const sleep = async (time: number) =>
  await new Promise((resolve) => setTimeout(resolve, time));

describe("EzAsynqBase", () => {
  it.concurrent("should fetch and observe an async value", async () => {
    const fetcher = async (id: number) => {
      return { id, name: "John Doe" };
    };

    const asyncValue = new EzAsynq(() => fetcher(1));

    expect(asyncValue.ez.state).toBe("uninitialized");

    await asyncValue.fetch();

    expect(asyncValue.ez.value?.id).toBe(1);
    expect(asyncValue.ez.value?.name).toBe("John Doe");
    expect(asyncValue.ez.state).toBe("done");

    asyncValue.stale();
    expect(asyncValue.ez.state).toBe("stale");

    await asyncValue.fetch();

    expect(asyncValue.ez.state).toBe("done");
    expect(asyncValue.ez.value?.id).toBe(1);
  });

  it.concurrent("should stale value after each action", async () => {
    const fetcher = async (id: number) => {
      return { id, name: "John Doe" };
    };

    const asyncValue = new EzAsynq(() => fetcher(1));

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

    const ezValue = new EzAsynq(fetcher);

    if (ezValue.ez.state === "uninitialized") {
      ezValue.ez.value;
    }
  });

  it.concurrent("should throw error on fetch error", async () => {
    const fetcher = async () => {
      throw new Error("fetch error");
    };

    const asyncValue = new EzAsynq(fetcher);

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

    const memo = new EzAsynqMemo(asyncFn, (n: number) => n);

    await memo.fetch(2);
    expect(memo.current?.ez.value).toBe(4);

    await memo.fetch(4);
    expect(memo.current?.ez.value).toBe(8);

    expect(memo.cache.size).toBe(2);

    memo.cache.get(2);
  });

  it.concurrent("EzAsynqMemo: memoization", async () => {
    let callCount = 0;
    const asyncFn = async (arg: number) => {
      callCount++;
      return Promise.resolve(arg * 2);
    };

    const memo = new EzAsynqMemo(asyncFn);

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

  it.concurrent("EzAsynqMemo: hashing", async () => {
    let callCount = 0;
    const getter = async (n: number) => {
      callCount++;
      return await Promise.resolve(n + 2);
    };

    const memo = new EzAsynqMemo(getter, (n: number) => n);

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
  const fetcher = async (str: string) => Promise.resolve([str]);
  const actionFetcher = async (a: string, time: number) => {
    await sleep(time);
    return Promise.resolve(a);
  };
  const actionFactory = createAAFactory<() => ReturnType<typeof fetcher>>();
  const action = actionFactory(actionFetcher, {
    effect: vitest.fn(({ ez, result }) => {
      ez.value?.push(result);
    }),
  });
  const memoActionFactory = createAAMemoFactory(fetcher);
  const memoAction = memoActionFactory((...args) => actionFetcher, {
    effect: (...args) =>
      vitest.fn(({ ez, result }) => {
        ez.value?.push(result);
      }),
  });

  beforeEach(() => void vitest.clearAllMocks());
  describe("EzAsynqMut", () => {
    it.concurrent("intializes value correctly", async () => {
      const arr = new EzAsynqMut(async () => await fetcher("ab"), {
        add: action,
      });

      await arr.fetch();

      expect(arr.ez.value).toStrictEqual(["ab"]);
    });

    it.concurrent("Action ordering should be preserved", async () => {
      const arr = new EzAsynqMut(async () => await fetcher("ab"), {
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

    it.concurrent(
      "Action actions should be flushed when state is set to stale",
      async () => {
        const arr = new EzAsynqMut(async () => await fetcher("ab"), {
          add: action,
        });

        await arr.fetch();

        void arr.actions.add("1", 300);
        void arr.actions.add("2", 1);
        void arr.actions.add("3", 1);
        void arr.actions.add("4", 600);

        arr.stale();

        expect(arr.ez.value).toStrictEqual(["ab"]);

        await sleep(1100);

        expect(arr.ez.value).toStrictEqual(["ab"]);
      }
    );

    it.concurrent(
      "New actions should work after flushing and refetching",
      async () => {
        const arr = new EzAsynqMut(async () => await fetcher("ab"), {
          add: action,
        });

        await arr.fetch();

        void arr.actions.add("1", 300);
        void arr.actions.add("2", 1);
        void arr.actions.add("3", 1);
        void arr.actions.add("4", 600);

        arr.stale();

        expect(arr.ez.value).toStrictEqual(["ab"]);

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
      }
    );

    it.concurrent("Actions without ordering", async () => {
      const arr = new EzAsynqMut(
        async () => await fetcher("ab"),
        {
          add: action,
        },
        { orderActions: false }
      );

      await arr.fetch();

      void arr.actions.add("1", 300);
      void arr.actions.add("2", 0);
      void arr.actions.add("3", 0);
      void arr.actions.add("4", 600);

      expect(arr.ez.value).toStrictEqual(["ab"]);

      await sleep(600);

      // order for 2 and 3 is preserved since subtask for 2 is assigned first.
      expect(arr.ez.value).toStrictEqual(["ab", "2", "3", "1"]);

      await sleep(500);

      expect(arr.ez.value).toStrictEqual(["ab", "2", "3", "1", "4"]);
    });
  });

  describe("EzAsynqMemoMut", () => {
    it("Switches concurrent between fetches correctly", async () => {
      const memo = EzAsynqMemoMut.new(fetcher, { addStr: memoAction });

      await memo.fetch("first");
      expect(memo.current?.ez.value).toStrictEqual(["first"]);

      await memo.fetch("second");
      expect(memo.current?.ez.value).toStrictEqual(["second"]);

      await memo.fetch("second");
      expect(memo.current?.ez.value).toStrictEqual(["second"]);
    });

    it("Updates state with actions", async () => {
      const memo = EzAsynqMemoMut.new(fetcher, { addStr: memoAction });

      await memo.fetch("first");
      expect(memo.current?.ez.value).toStrictEqual(["first"]);

      await memo.current?.actions.addStr("second", 0);
      expect(memo.current?.ez.value).toStrictEqual(["first", "second"]);

      await memo.fetch("new");
      await memo.current?.actions.addStr("newnew", 0);
    });
  });

  it.concurrent("EzAsynqMemoMut: hashing", async () => {
    let callCount = 0;
    const getter = async (n: number) => {
      callCount++;
      return await Promise.resolve(n + 2);
    };

    const memo = EzAsynqMemoMut.new(getter, {}, (n: number) => n);

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
