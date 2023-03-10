import { makeAutoObservable, runInAction } from "mobx";
import { EzAsyncMemo as EzAsyncMemoInterface, Fetcher } from "./common";
import { EzAsync } from "./base";

export class EzAsyncMemo<
  Fe extends Fetcher,
  Hasher extends (...args: Parameters<Fe>) => any = (
    ...args: Parameters<Fe>
  ) => string
> implements EzAsyncMemoInterface<Fe, Hasher>
{
  public cache: EzAsyncMemoInterface<Fe, Hasher>["cache"] = new Map();
  public current: EzAsyncMemoInterface<Fe, Hasher>["current"] = null;
  public fetch = async (...args: Parameters<Fe>) => {
    await this.fetchGeneric("fetch", ...args);
  };
  public forceFetch = async (...args: Parameters<Fe>) => {
    await this.fetchGeneric("forceFetch", ...args);
  };
  public stale = () => this.cache.forEach(({ ez }) => ez.stale());
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
    let asyncValue = this.cache.get(hash) ?? null;
    if (asyncValue === null) {
      asyncValue = new EzAsync(async () => await this.fetcher(...args));
      // SAFETY: variable was just assign a value.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      runInAction(() => this.cache.set(hash, asyncValue!));
    }
    runInAction(() => (this.current = asyncValue));
    await asyncValue[type]();
  };
}
