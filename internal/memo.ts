import { makeAutoObservable, runInAction } from "mobx";
import { EzAsyncMemo as EzAsyncMemoType, Fetcher } from "./common";
import { EzAsyncBase } from "./base";

/**
 * A utility class for memoizing the results of an asynchronous function call using `EzAsync`.
 * Maintains a memoization cache of `EzAsync` instances and a reference for the last fetched value.
 *
 * This class should be used to fetch values with different arguments that might be rerendered
 * multiple times during a user's session.
 */
export class EzAsyncMemo<
  Fe extends Fetcher,
  Hasher extends (...args: Parameters<Fe>) => any
> {
  public ezMemo: EzAsyncMemoType<Fe, Hasher> = {
    cache: new Map(),
    current: null,
    fetch: async (...args: Parameters<Fe>) => {
      await this.fetchGeneric("fetch", ...args);
    },
    forceFetch: async (...args: Parameters<Fe>) => {
      await this.fetchGeneric("forceFetch", ...args);
    },
    stale: () =>
      this.ezMemo.cache.forEach(({ ez: { state } }) => state.set("stale")),
  };
  /**
   * The constructor of the class.
   *
   * @param fetcher The function to fetch values with.
   */
  private constructor(fetcher: Fe, hasher: Hasher) {
    this.fetcher = fetcher;
    this.hasher = hasher;
    makeAutoObservable(this);
  }

  /**
   * The function to fetch values with.
   */
  private fetcher;

  private hasher;

  /**
   * Creates a new instance of AsyncMemo with the given fetcher.
   *
   * @param fetcher The function to fetch values with.
   * @returns A new instance of the class.
   */
  public static new = <Getter extends Fetcher<any, any[]>>(fetcher: Getter) => {
    const asyncMemo = new EzAsyncMemo(fetcher, (...args: Parameters<Getter>) =>
      JSON.stringify(args)
    );

    return asyncMemo;
  };

  public static newHasher = <
    Getter extends Fetcher<any, any[]>,
    Hasher extends (...args: Parameters<Getter>) => any
  >(
    fetcher: Getter,
    hasher: Hasher
  ) => {
    const asyncMemo = new EzAsyncMemo(fetcher, hasher);

    return asyncMemo;
  };

  private fetchGeneric = async (
    type: "fetch" | "forceFetch",
    ...args: Parameters<typeof this.fetcher>
  ): Promise<void> => {
    const hash = this.hasher(...args);
    let asyncValue = this.ezMemo.cache.get(hash) ?? null;
    if (asyncValue === null) {
      asyncValue = EzAsyncBase.new(async () => await this.fetcher(...args));
      // SAFETY: variable was just assign a value.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      runInAction(() => this.ezMemo.cache.set(hash, asyncValue!));
    }
    runInAction(() => (this.ezMemo.current = asyncValue));
    await asyncValue.ez[type]();
  };
}
