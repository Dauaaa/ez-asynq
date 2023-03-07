import {
  EmptyFetcherArgs,
  Fetcher,
  Action,
  Effect,
  PreFetch,
  OnFetchError,
} from "../common";

export const createAction = <
  Getter extends EmptyFetcherArgs,
  Fe extends Fetcher
>(
  _getter: Getter,
  fetcher: Fe,
  {
    effect,
    preFetch,
    onFetchError,
  }: {
    effect?: Effect<Getter, Fe>;
    preFetch?: PreFetch<Getter, Fe>;
    onFetchError?: OnFetchError<Getter, Fe>;
  }
) => {
  return {
    fetcher,
    effect,
    preFetch,
    onFetchError,
  } satisfies Action<Getter, Fe>;
};

export const createMemoAction = <Getter extends Fetcher, Fe extends Fetcher>(
  _getter: Getter,
  fetcher: Fe,
  {
    effect,
    preFetch,
    onFetchError,
  }: {
    effect?: Effect<EmptyFetcherArgs<Getter>, Fe>;
    preFetch?: PreFetch<EmptyFetcherArgs<Getter>, Fe>;
    onFetchError?: OnFetchError<EmptyFetcherArgs<Getter>, Fe>;
  }
) => {
  return {
    fetcher,
    effect,
    preFetch,
    onFetchError,
  } satisfies Action<Getter, Fe>;
};
