import {
  EmptyArgsFetcher,
  Fetcher,
  Action,
  Effect,
  PreFetch,
  OnFetchError,
  GValue,
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
export const createAAFactory = <
  GetterOrValue extends EmptyArgsFetcher<GValue> | GValue,
>(
  _getter?: GetterOrValue,
) => <Fe extends Fetcher>(
  fetcher: Fe,
  {
    effect,
    preFetch,
    onFetchError,
  }: {
    effect?: Effect<GetterOrValue extends EmptyArgsFetcher<GValue> ? GetterOrValue : EmptyArgsFetcher<GetterOrValue>, Fe>;
    preFetch?: PreFetch<GetterOrValue extends EmptyArgsFetcher<GValue> ? GetterOrValue : EmptyArgsFetcher<GetterOrValue>, Fe>;
    onFetchError?: OnFetchError<GetterOrValue extends EmptyArgsFetcher<GValue> ? GetterOrValue : EmptyArgsFetcher<GetterOrValue>, Fe>;
  }
) => {
    return {
      fetcher,
      effect,
      preFetch,
      onFetchError,
    } satisfies Action<GetterOrValue extends EmptyArgsFetcher<GValue> ? GetterOrValue : EmptyArgsFetcher<GetterOrValue>, Fe>;
  };
