import { makeAutoObservable, runInAction } from "mobx";
import { EzAsynqMemo as EzAsynqMemoInterface, Fetcher } from "./common";
import { EzAsynq } from "./base";

export class EzAsynqMemo<
  Fe extends Fetcher,
  Hasher extends (...args: Parameters<Fe>) => any = (
    ...args: Parameters<Fe>
  ) => string
> implements EzAsynqMemoInterface<Fe, Hasher>
{
  public cache: EzAsynqMemoInterface<Fe, Hasher>["cache"] = new Map();
  public current: EzAsynqMemoInterface<Fe, Hasher>["current"] = null;
  public del = (...keys: ReturnType<Hasher>[]) => keys.length > 0 ? keys.map(key => this.cache.delete(key)) : this.cache.clear();
  public fetch = async (...args: Parameters<Fe>) => {
    await this.fetchGeneric("fetch", ...args);
  };
  public forceFetch = async (...args: Parameters<Fe>) => {
    await this.fetchGeneric("forceFetch", ...args);
  };
  public stale = () => this.cache.forEach(({ stale }) => stale());
  public constructor(fetcher: Fe, hasher?: Hasher) {
    this.fetcher = fetcher;
    this.hasher = hasher ?? ((...args: Parameters<Fe>) => JSON.stringify(args));
    makeAutoObservable(this);
  }

  public static new = <Fe extends Fetcher,
    Hasher extends (...args: Parameters<Fe>) => any = (
      ...args: Parameters<Fe>
    ) => string
  >(fetcher: Fe, hasher?: Hasher) => new EzAsynqMemo(fetcher, hasher);

  private fetcher;

  private hasher;

  private fetchGeneric = async (
    type: "fetch" | "forceFetch",
    ...args: Parameters<typeof this.fetcher>
  ): Promise<void> => {
    const hash = this.hasher(...args);
    let asyncValue = this.cache.get(hash) ?? null;
    if (asyncValue === null) {
      asyncValue = new EzAsynq(async () => await this.fetcher(...args));
      // SAFETY: variable was just assign a value.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      runInAction(() => this.cache.set(hash, asyncValue!));
    }
    runInAction(() => (this.current = asyncValue));
    await asyncValue[type]();
  };
}
