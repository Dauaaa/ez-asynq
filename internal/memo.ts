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
  Hasher extends (...args: Parameters<Fe>) => any = (...args: Parameters<Fe>) => string
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
      this.ezMemo.cache.forEach(({ ez }) => ez.stale()),
  };
  /**
   * The constructor of the class.
   *
   * @param fetcher The function to fetch values with.
   */
  public constructor(fetcher: Fe, hasher?: Hasher) {
    this.fetcher = fetcher;
    this.hasher = hasher ?? ((...args: Parameters<Fe>) => JSON.stringify(args));
    makeAutoObservable(this);
  }

  /**
   * The function to fetch values with.
   */
  private fetcher;

  private hasher;

  private fetchGeneric = async (
    type: "fetch" | "forceFetch",
    ...args: Parameters<typeof this.fetcher>
  ): Promise<void> => {
    const hash = this.hasher(...args);
    let asyncValue = this.ezMemo.cache.get(hash) ?? null;
    if (asyncValue === null) {
      asyncValue = new EzAsyncBase(async () => await this.fetcher(...args));
      // SAFETY: variable was just assign a value.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      runInAction(() => this.ezMemo.cache.set(hash, asyncValue!));
    }
    runInAction(() => (this.ezMemo.current = asyncValue));
    await asyncValue[type]();
  };
}
