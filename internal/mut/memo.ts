import { makeAutoObservable, runInAction } from "mobx";
import {
  Fetcher,
  EzAsynqMemoMut as EzAsynqMemoMutInterface,
  Action,
  EmptyArgsFetcher,
  GKey,
  RTA,
  RTOfValues,
} from "../common";
import { EzAsynqMut } from "../mut";

export class EzAsynqMemoMut<
  Getter extends Fetcher,
  Hasher extends (...args: Parameters<Getter>) => any,
  A extends Record<GKey, (...arg: Parameters<Getter>) => Action<EmptyArgsFetcher<RTA<Getter>>>>,
> implements EzAsynqMemoMutInterface<Getter, Hasher, A>
{
  public cache: EzAsynqMemoMutInterface<Getter, Hasher, A>["cache"] = new Map();
  public current: EzAsynqMemoMutInterface<Getter, Hasher, A>["current"] = null;
  public fetch;
  public del = (...keys: ReturnType<Hasher>[]) =>
    keys.length > 0
      ? keys.map((key) => this.cache.delete(key))
      : this.cache.clear();
  public stale = () => this.cache.forEach(({ stale }) => stale());

  public constructor(fetcher: Getter, actions: A, hasher?: Hasher) {
    this.hasher =
      hasher ?? ((...args: Parameters<Getter>) => JSON.stringify(args));
    this.fetch = async (...args: Parameters<Getter>) => {
      const hash = this.hasher(...args);
      let asyncValue = this.cache.get(hash) ?? null;
      if (asyncValue === null) {
        asyncValue = new EzAsynqMut<EmptyArgsFetcher<RTA<Getter>>, RTOfValues<A>>(
          async () => await fetcher(...args),
          Object.fromEntries(Object.entries(actions).map(([key, action]) => [key, action(...args)])) as RTOfValues<A>
        );
        // SAFETY: variable was just assign a value.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        runInAction(() => this.cache.set(hash, asyncValue!));
      }
      runInAction(() => (this.current = asyncValue));
      await asyncValue?.fetch();
    };

    makeAutoObservable(this);
  }

  public static new = <
    Getter extends Fetcher,
    Hasher extends (...args: Parameters<Getter>) => any,
    A extends Record<GKey, (...arg: Parameters<Getter>) => Action<EmptyArgsFetcher<RTA<Getter>>>>,
  >(
    fetcher: Getter,
    actions: A,
    hasher?: Hasher
  ) => new EzAsynqMemoMut(fetcher, actions, hasher);

  private hasher;
}
