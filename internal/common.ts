import { IObservableValue, observable, runInAction, when } from "mobx";
import {
  EzAsyncMut as EzAsyncMutClass,
  AsyncAction as AsyncActionClass,
} from "./mut";
import { EzAsyncBase } from "./base";
import { EzAsyncMemo as EzAsyncMemoClass } from "./memo";
import { EzAsyncMemoMut as EzAsyncMemoMutClass } from "./mut/memo";

export type GKey = string | symbol | number;
export type IFromClass<C> = Pick<C, keyof C>;

/**
 * A function type that takes any number of arguments of type `P` and returns a promise of type `T`.
 */
export type Fetcher<T = any, P extends any[] = any[]> = (
  ...args: P
) => PromiseLike<T>;

export type EmptyFetcherArgs<Fe extends Fetcher = Fetcher> = Fetcher<
  RTA<Fe>,
  []
>;

/**
 * Resolves to the awaited return type of `F`.
 */
export type RTA<F extends Fetcher> = Awaited<ReturnType<F>>;

/**
 * Represents the state of an EzAsync instance. Can be one of the following:
 * - "uninitialized": The async value has not yet been fetched.
 * - "fetching": The async value is currently being fetched.
 * - "done": The async value has been successfully fetched and is up-to-date.
 * - "stale": The async value is out-of-date.
 * - "error": An error occurred while fetching the async value.
 */
export type EzAsyncState =
  | "uninitialized"
  | "fetching"
  | "done"
  | "stale"
  | "error";

/**
 * An object type for the base ezAsync class. It's the core primitive of the library.
 */
export type EzAsync<Fe extends Fetcher<any, []> = Fetcher<any, []>> = {
  /**
   * The current value of the async value. Initially null until a fetch has been performed.
   */
  value: RTA<Fe> | null;
  /**
   * A fetcher function that will fetch the async value.
   *
   * A fetch function will not execute if the last (force)fetch called
   * was called with the same parameters as the current and it's either done or still fetching.
   */
  fetch: Fetcher<void, []>;
  /**
   * A fetcher function that will "force" the async value.
   *
   * A force fetch will not execute if the last (force)fetch called
   * was called with the same parameters as the current and it's still fetching.
   */
  forceFetch: Fetcher<void, []>;
  /**
   * The current state of the async value. Can be one of "uninitialized", "fetching", "done", "stale", or "error".
   */
  state: IObservableValue<EzAsyncState>;
  /**
   * A function that sets the state of the async value to "stale". This indicates that the next fetch should not use the cached value.
   */
  stale: () => void;
};

export type EzAsyncMut<
  Getter extends EmptyFetcherArgs,
  A extends Record<GKey, Action<Getter>>
> = ReturnType<typeof EzAsyncMutClass.new<Getter, A>>;

export type EzAsyncMemo<
  Getter extends Fetcher = Fetcher,
  Hasher extends (...args: Parameters<Getter>) => any = (
    ...args: Parameters<Getter>
  ) => string
> = {
  /**
   * A Map containing memoization cache of Ez instances.
   */
  cache: Map<ReturnType<Hasher>, { ez: EzAsync<EmptyFetcherArgs<Getter>> }>;
  /**
   * A reference to the currently (last) fetched value.
   */
  current: { ez: EzAsync<EmptyFetcherArgs<Getter>> } | null;
  /**
   * Forces a fetch with the given arguments and updates the cache and the current reference.
   *
   * @param args - The arguments from the supplied fetcher.
   */
  fetch: Fetcher<void, Parameters<Getter>>;
  /**
   * Fetches the value with the given arguments and updates the cache and the current reference.
   *
   * @param args - The arguments from the supplied fetcher.
   */
  forceFetch: Fetcher<void, Parameters<Getter>>;
  /**
   * Sets all the memoization cache entries to be stale.
   */
  stale: () => void;
};

export type EzAsyncMemoMut<
  Getter extends Fetcher,
  Hasher extends (...args: Parameters<Getter>) => any,
  A extends Record<GKey, Action<Getter>>
> = {
  cache: Map<ReturnType<Hasher>, EzAsyncMut<EmptyFetcherArgs<Getter>, A>>;
  current: EzAsyncMut<EmptyFetcherArgs<Getter>, A> | null;
  fetch: Fetcher<void, Parameters<Getter>>;
  stale: () => void;
};

/**
 * A synchronous function that is called after a successful fetch and can be used to execute some side effect.
 */
export type Effect<Getter extends Fetcher, Fe extends Fetcher> = (arg1: {
  ez: Pick<EzAsync<Getter>, "value" | "state" | "stale">;
  result: RTA<Fe>;
  args: Parameters<Fe>;
}) => void;

/**
 * A  function that is called before a fetch and can be used to execute some side effect.
 */
export type PreFetch<Getter extends Fetcher, Fe extends Fetcher> = (arg1: {
  ez: Pick<EzAsync<Getter>, "value" | "state" | "stale">;
  args: Parameters<Fe>;
}) => void;

/**
 * An async function that is called after a failed fetch and can be used to handle the error.
 */
export type OnFetchError<Getter extends Fetcher, Fe extends Fetcher> = (arg1: {
  ez: Pick<EzAsync<Getter>, "value" | "state" | "stale">;
  args: Parameters<Fe>;
  error: unknown;
}) => void;

/**
 * Represents an action that can be performed on an EzAsync instance.
 *
 * @typeparam Getter - The fetcher type of the EzAsync instance being used to get the value that this action depends on.
 * @typeparam Fe - The fetcher type of the EzAsync instance being used to fetch the value that this action modifies.
 */
export type Action<Getter extends Fetcher, Fe extends Fetcher = Fetcher> = {
  /**
   * The fetcher function that will be used to signal (a server, for example) about the action.
   */
  fetcher: Fe;
  /**
   * An optional effect function that will be executed when the value modified by this action is fetched successfully.
   *
   * @param arg1 - An object containing the current EzAsync value, the fetched value, and the fetch arguments.
   */
  effect?: Effect<Getter, Fe>;
  /**
   * An optional function that will be executed before the fetch occurs. Can be used to update the current EzAsync value before the fetch.
   *
   * This is useful if you want a client first approach. A use case would be the whatsapp message ticks,
   * when the message is written, add the message to the client's conversation with a "pending"
   * state and update after server response with an effect / onFetchError.
   *
   * @param arg1 - An object containing the current EzAsync value and the fetch arguments.
   */
  preFetch?: PreFetch<Getter, Fe>;
  /**
   * An optional function that will be executed if the fetch fails.
   *
   * @param arg1 - An object containing the current EzAsync value, the fetch arguments, and the error that occurred.
   */
  onFetchError?: OnFetchError<Getter, Fe>;
};

export type AsyncAction<
  Getter extends EmptyFetcherArgs,
  A extends Action<Getter>
> = AsyncActionClass<Getter, A["fetcher"]>["call"];

export type ActionToAsyncAction<Getter extends Fetcher, A extends object> = {
  [Key in keyof A]: A[Key] extends Action<Getter>
  ? AsyncAction<Getter, A[Key]>
  : never;
};

/**
 * A class that enables scheduling and tracking of ordered asynchronous actions.
 */
export class OrderedActionScheduler {
  /**
   * Schedules an asynchronous action to be executed in a specific order. @param action - The action to be executed.
   */
  public scheduleAction = async (action: () => Promise<void>) => {
    const currentAction = this.totalActions.get();
    runInAction(() => this.totalActions.set(currentAction + 1));
    try {
      await when(() => currentAction === this.currentAction.get());
      await action();
      runInAction(() => this.currentAction.set(currentAction + 1));
    } catch (err) {
      runInAction(() => this.currentAction.set(currentAction + 1));
      throw err;
    }
  };

  /**
   * An observable box that keeps track of the current action number.
   * It will increment every time a new action is finished.
   */
  private currentAction = observable.box(0);
  /**
   * An observable box that keeps track of the total number of actions.
   * It will increment every time a new action is scheduled.
   */
  private totalActions = observable.box(0);
}

export type EzAsyncAny =
  | IFromClass<EzAsyncBase<EmptyFetcherArgs>>
  | IFromClass<EzAsyncMemoClass<Fetcher, (...args: any[]) => any>>
  | EzAsyncMut<EmptyFetcherArgs, Record<GKey, Action<EmptyFetcherArgs>>>
  | IFromClass<
    EzAsyncMemoMutClass<
      Fetcher,
      (...args: any[]) => any,
      Record<GKey, Action<EmptyFetcherArgs>>
    >
  >;
