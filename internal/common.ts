import { observable, runInAction, when } from "mobx";
import { AsyncAction as AsyncActionClass } from "./mut";

/**
 * A union type useful for represeting a javascript generic key.
 */
export type GKey = string | symbol | number;

/**
 * A function type that takes any number of arguments of type `P` and returns a promise of type `T`.
 *
 * If no argument is provided, it returns (...args: any[]) => Promise<any>;
 */
export type Fetcher<T = any, P extends any[] = any[]> = (
  ...args: P
) => PromiseLike<T>;

/**
 * A function type that takes a fetcher as a generic argument and returns the fetcher with empty args.
 *
 * If no argument is provided, it returns () => Promise<any>
 */
export type EmptyFetcherArgs<Fe extends Fetcher = Fetcher> = Fetcher<
  RTA<Fe>,
  []
>;

/**
 * Resolves to the awaited return type of `F`.
 *
 * Useful for getting the return value of a fetcher
 */
export type RTA<F extends Fetcher> = Awaited<ReturnType<F>>;

/**
 * Represents the state of an EzValue object. Can be one of the following:
 * - "uninitialized": The async value has not yet been fetched. It implies value is null.
 * - "fetching": The async value is currently being fetched.
 * - "done": The async value has been successfully fetched and is up-to-date. It implies value is not null.
 * - "stale": The async value is out-of-date. It implies value is not null. A value may only be stale if it was once done.
 * - "error": An error occurred while fetching the async value.
 */
export type EzAsyncState =
  | "uninitialized"
  | "fetching"
  | "done"
  | "stale"
  | "error";

/**
 * Primitive type of the ezAsync library. It contains information about the value's state, some utility (stale)
 * and the value itself which is nullable.
 *
 * When using this type, a developer should always check for the state of the value (instead of the value itself)
 * to control flow.
 */
export type EzValue<Getter extends Fetcher<any, []> = Fetcher<any, []>> = (
  | {
    value: null;
    state: { current: Extract<EzAsyncState, "uninitialized"> };
  }
  | {
    value: RTA<Getter> | null;
    state: { current: Extract<EzAsyncState, "fetching" | "error"> };
  }
  | {
    value: RTA<Getter>;
    state: { current: Extract<EzAsyncState, "done" | "stale"> };
  }
) & {
  /**
   * A method that can be used to manually mark the value as stale, which means it needs to be refetched.
   * This method should only be called when the value is in the "done" state, as only then can it become "stale".
   * It won't error otherwise, just won't change the value of state.
   */
  stale: () => void
};

/**
 * Interface for the EzAsync class. It's defined by a generic argument Getter, which is an
 * async function with empty arguments and a return value. The return value of the Getter
 * is going to be cached in ez.value. In order to fetch the values, there are two methods available,
 * fetch and forceFetch. Both of them are controlled by ez.state.
 *
 * If a Getter which has non empty arguments is needed, an alternative could be using
 * EzAsyncMemo.
 *
 * @template Getter - The fetcher with empty arguments that retrieves the value for the EzValue instance.
 */
export interface EzAsync<Getter extends Fetcher<any, []>> {
  /**
   * A fetcher function that will fetch the value.
   *
   * fetch will only execute the getter function and update ez.value
   * if ez.state.current is not "done" or "fetching".
   */
  fetch: Fetcher<void, []>;
  /**
   * A fetcher function that will "force" the async value.
   *
   * forceFetch will only execute the getter function and update ez.value
   * if ez.state.current is not "fetching".
   */
  forceFetch: Fetcher<void, []>;
  /**
   * The EzValue instance.
   *
   * ez should not be mutated by anything but fetch and forceFetch. If the need
   * to mutate data exists, try using EzAsyncMut, where one may assign actions
   * to mutate ez.
   */
  ez: EzValue<Getter>;
}

/**
 * A type representing a mutable version of the EzValue type. It contains a fetch method that allows updating the value
 * of the EzValue instance and an actions object that defines methods for executing functions and running effects to update
 * ez depending on the response of the request. The EzAsyncMut instance should
 * be used when the EzValue needs to be mutated by actions that update its value.
 * 
 * @template Getter - The fetcher with empty arguments that retrieves the value for the EzValue instance.
 * @template A - An object that defines the actions for updating the value of the EzValue instance. The keys of this object
 * correspond to the action names and the values are functions that take the current value of the EzValue instance and
 * any additional arguments needed for updating the value.
 */
export interface EzAsyncMut<
  Getter extends EmptyFetcherArgs,
  A extends Record<GKey, Action<Getter>>
> {
  /**
   * A function that fetches the value for the EzValue instance using the fetcher function provided in the
   * generic argument. This function updates the state and value of the EzValue instance based on the fetcher function's result.
   */
  fetch: () => Promise<void>;
  /**
   * The EzValue instance that is being mutated by the actions provided in the `actions` object.
   */
  ez: EzValue<Getter>;
  /**
   * An object containing methods that update the value of the EzValue instance. The keys of this object
   * correspond to the action names provided in the generic argument `A`, and the values are objects
   * composed of a fetcher and effects to run before, after and on error in relation the given request.
   */
  actions: ActionToAsyncAction<Getter, A>;
}

export interface EzAsyncMemo<
  Getter extends Fetcher = Fetcher,
  Hasher extends (...args: Parameters<Getter>) => any = (
    ...args: Parameters<Getter>
  ) => string
> {
  /**
   * A Map containing memoization cache of EzAsync instances.
   */
  cache: Map<ReturnType<Hasher>, EzAsync<EmptyFetcherArgs<Getter>>>;
  /**
   * A reference to the current (last) fetched value.
   */
  current: EzAsync<EmptyFetcherArgs<Getter>> | null;
  fetch: Fetcher<void, Parameters<Getter>>;
  forceFetch: Fetcher<void, Parameters<Getter>>;
  stale: () => void;
}

export interface EzAsyncMemoMut<
  Getter extends Fetcher,
  Hasher extends (...args: Parameters<Getter>) => any,
  A extends Record<GKey, Action<Getter>>
> {
  cache: Map<ReturnType<Hasher>, EzAsyncMut<EmptyFetcherArgs<Getter>, A>>;
  current: EzAsyncMut<EmptyFetcherArgs<Getter>, A> | null;
  fetch: Fetcher<void, Parameters<Getter>>;
  stale: () => void;
}

/**
 * A synchronous function that is called after a successful fetch and can be used to execute some side effect.
 */
export type Effect<Getter extends Fetcher, Fe extends Fetcher> = (arg1: {
  ez: EzValue<Getter>;
  result: RTA<Fe>;
  args: Parameters<Fe>;
}) => void;

/**
 * A  function that is called before a fetch and can be used to execute some side effect.
 */
export type PreFetch<Getter extends Fetcher, Fe extends Fetcher> = (arg1: {
  ez: EzValue<Getter>;
  args: Parameters<Fe>;
}) => void;

/**
 * An async function that is called after a failed fetch and can be used to handle the error.
 */
export type OnFetchError<Getter extends Fetcher, Fe extends Fetcher> = (arg1: {
  ez: EzValue<Getter>;
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
  | EzAsync<EmptyFetcherArgs>
  | EzAsyncMemo<Fetcher, (...args: any[]) => any>
  | EzAsyncMut<EmptyFetcherArgs, Record<GKey, Action<EmptyFetcherArgs>>>
  | EzAsyncMemoMut<
    Fetcher,
    (...args: any[]) => any,
    Record<GKey, Action<EmptyFetcherArgs>>
  >;
