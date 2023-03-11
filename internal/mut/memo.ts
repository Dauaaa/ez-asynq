import { makeAutoObservable, runInAction } from "mobx";
import {
  Fetcher,
  EzAsynqMemoMut as EzAsynqMemoMutInterface,
  Action,
  EmptyFetcherArgs,
  GKey,
} from "../common";
import { EzAsynqMut } from "../mut";

export class EzAsynqMemoMut<
  Getter extends Fetcher,
  Hasher extends (...args: Parameters<Getter>) => any,
  A extends Record<GKey, Action<EmptyFetcherArgs<Getter>>>
> implements EzAsynqMemoMutInterface<Getter, Hasher, A>
{
  public cache: EzAsynqMemoMutInterface<Getter, Hasher, A>["cache"] = new Map();
  public current: EzAsynqMemoMutInterface<Getter, Hasher, A>["current"] = null;
  public fetch;
  public stale = () => this.cache.forEach(({ ez }) => ez.stale());

  private constructor(fetcher: Getter, hasher: Hasher, actions: A) {
    this.fetch = async (...args: Parameters<Getter>) => {
      const hash = hasher(...args);
      let asyncValue = this.cache.get(hash) ?? null;
      if (asyncValue === null) {
        asyncValue = new EzAsynqMut<EmptyFetcherArgs<Getter>, A>(
          async () => await fetcher(...args),
          actions as A
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
    A extends Record<GKey, Action<EmptyFetcherArgs<Getter>>>
  >(
    fetcher: Getter,
    actions: A
  ) => {
    const asyncMemo = new EzAsynqMemoMut(
      fetcher,
      (...args: Parameters<Getter>) => JSON.stringify(args),
      actions
    );

    return asyncMemo;
  };

  public static newHasher = <
    Getter extends Fetcher,
    Hasher extends (...args: Parameters<Getter>) => any,
    A extends Record<GKey, Action<EmptyFetcherArgs<Getter>>>
  >(
    fetcher: Getter,
    hasher: Hasher,
    actions: A
  ) => {
    const asyncMemo = new EzAsynqMemoMut(fetcher, hasher, actions);

    return asyncMemo;
  };
}
