import { makeAutoObservable, runInAction } from "mobx";
import {
  Fetcher,
  EzAsyncMemoMut as EzAsyncMemoMutType,
  Action,
  EmptyFetcherArgs,
  GKey,
} from "../common";
import { EzAsyncMut } from "../mut";

export class EzAsyncMemoMut<
  Getter extends Fetcher,
  Hasher extends (...args: Parameters<Getter>) => any,
  A extends Record<GKey, Action<EmptyFetcherArgs<Getter>>>
> {
  public ezMemoMut: EzAsyncMemoMutType<Getter, Hasher, A>;
  private constructor(fetcher: Getter, hasher: Hasher, actions: A) {
    this.ezMemoMut = {
      cache: new Map(),
      current: null,
      fetch: async (...args: Parameters<Getter>) => {
        const hash = hasher(...args);
        let asyncValue = this.ezMemoMut.cache.get(hash) ?? null;
        if (asyncValue === null) {
          asyncValue = EzAsyncMut.new<EmptyFetcherArgs<Getter>, A>(
            async () => await fetcher(...args),
            actions as A
          );
          // SAFETY: variable was just assign a value.
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          runInAction(() => this.ezMemoMut.cache.set(hash, asyncValue!));
        }
        runInAction(() => (this.ezMemoMut.current = asyncValue));
        await asyncValue?.ezMut.fetch();
      },
      stale: () => this.ezMemoMut.cache.forEach((ezMut) => ezMut),
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
