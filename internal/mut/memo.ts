import { makeAutoObservable, runInAction } from "mobx";
import {
  Fetcher,
  EzAsyncMemoMut as EzAsyncMemoMutInterface,
  Action,
  EmptyFetcherArgs,
  GKey,
} from "../common";
import { EzAsyncMut } from "../mut";

export class EzAsyncMemoMut<
  Getter extends Fetcher,
  Hasher extends (...args: Parameters<Getter>) => any,
  A extends Record<GKey, Action<EmptyFetcherArgs<Getter>>>
> implements EzAsyncMemoMutInterface<Getter, Hasher, A> {
  public cache: EzAsyncMemoMutInterface<Getter, Hasher, A>["cache"] = new Map();
  public current: EzAsyncMemoMutInterface<Getter, Hasher, A>["current"] = null;
  public fetch;
  public stale = () =>
    this.cache.forEach(({ ez }) => ez.stale());

  private constructor(fetcher: Getter, hasher: Hasher, actions: A) {
    this.fetch = async (...args: Parameters<Getter>) => {
      const hash = hasher(...args);
      let asyncValue = this.cache.get(hash) ?? null;
      if (asyncValue === null) {
        asyncValue = new EzAsyncMut<EmptyFetcherArgs<Getter>, A>(
          async () => await fetcher(...args),
          actions as A
        );
        // SAFETY: variable was just assign a value.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        runInAction(() => this.cache.set(hash, asyncValue!));
      }
      runInAction(() => (this.current = asyncValue));
      await asyncValue?.fetch();
    }

    makeAutoObservable(this);
  }

  public static new = <
    Getter extends Fetcher,
    A extends Record<GKey, Action<EmptyFetcherArgs<Getter>>>
  >(
    fetcher: Getter,
    actions: A
  ) => {
    const asyncMemo = new EzAsyncMemoMut(
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
    const asyncMemo = new EzAsyncMemoMut(fetcher, hasher, actions);

    return asyncMemo;
  };
}
