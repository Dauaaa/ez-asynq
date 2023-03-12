import {
  EmptyArgsFetcher,
  Fetcher,
  Action,
  Effect,
  PreFetch,
  OnFetchError,
  GValue,
  RTA,
} from "../common";

/**
 * Utility function for creating async actions. In general, creating actions is a bit hard since you've got to remember a lot of interfaces.
 * This function creates an async action factory for a specific value getter.
 *
 * @example
 * ```typescript
 * const getFunStrings = () => Promise.resolve(["x"]);
 * const addFunStrings = (...strings: string[]) => Promise.resolve(Math.random());
 *
 * const funStringsActionFactory = createAAFactory(getFunStrings);
 * const funStringsAddAction = funStringsActionFactory(
 *   addFunStrings,
 *   {
 *     preFetch: ({ args }) => console.log(`Trying to add the following funStrings: ${args}`),
 *     effect: ({ args, result, ez }) => {
 *       ez.value.push(...args);
 *     },
 *     onFetchError: () => console.log("Oh no ERROR!"),
 *   }
 * );
 * ```
 */
export const createAAFactory =
  <Getter extends EmptyArgsFetcher<GValue>>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _getter?: Getter
  ) =>
  <Fe extends Fetcher>(
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

export const createAAMemoFactory =
  <Getter extends Fetcher<GValue>>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _getter?: Getter
  ) =>
  <Fe extends Fetcher>(
    fetcher: (...args: Parameters<Getter>) => Fe,
    {
      effect,
      preFetch,
      onFetchError,
    }: {
      effect?: (
        ...args: Parameters<Getter>
      ) => Effect<EmptyArgsFetcher<RTA<Getter>>, Fe>;
      preFetch?: (
        ...args: Parameters<Getter>
      ) => PreFetch<EmptyArgsFetcher<RTA<Getter>>, Fe>;
      onFetchError?: (
        ...args: Parameters<Getter>
      ) => OnFetchError<EmptyArgsFetcher<RTA<Getter>>, Fe>;
    }
  ) =>
  (...args: Parameters<Getter>) => {
    return {
      fetcher: fetcher(...args),
      effect: effect ? effect(...args) : undefined,
      preFetch: preFetch ? preFetch(...args) : undefined,
      onFetchError: onFetchError ? onFetchError(...args) : undefined,
    } satisfies Action<EmptyArgsFetcher<RTA<Getter>>, Fe>;
  };
