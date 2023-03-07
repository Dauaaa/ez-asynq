import { makeAutoObservable, runInAction, when } from "mobx";
import { EzAsyncBase } from "../base";
import {
  Fetcher,
  Action,
  EzAsync,
  EmptyFetcherArgs,
  ActionToAsyncAction,
  OrderedActionScheduler,
  GKey,
} from "../common";

export class EzAsyncMut<Getter extends EmptyFetcherArgs> {
  public ezMut;

  private constructor(fetcher: Getter) {
    const asyncValue = EzAsyncBase.new(fetcher);
    this.ezMut = asyncValue.ez;
  }

  public static new<
    Getter extends EmptyFetcherArgs,
    A extends Record<GKey, Action<Getter>>
  >(fetcher: Getter, actions: A) {
    const asyncValueMut = new EzAsyncMut(fetcher);
    const orderedActionScheduler = new OrderedActionScheduler();
    const asyncActions = Object.fromEntries(
      Object.entries(actions).map(([key, action]) => [
        key,
        AsyncAction.new(orderedActionScheduler, asyncValueMut.ezMut, action),
      ])
    );

    (asyncValueMut.ezMut as any).actions = asyncActions;

    return asyncValueMut as Omit<
      typeof asyncValueMut,
      "forceFetch"
    > & { ezMut: { actions: ActionToAsyncAction<Getter, A> } };
  }
}

/**
 * This class is used to attach an async action to an EzAsyncMut instance.
 * It will be called after the value has been fetched and can be used to update other values or perform additional async operations.
 *
 * The effect function will be called with an object containing the current value, the new result, and the arguments passed to the fetcher.
 */
export class AsyncAction<Getter extends Fetcher, Fe extends Fetcher> {
  /**
   * A function that wraps the original fetcher function, and executes it while
   * triggering an effect on success. The effect is responsible for updating the
   * value in the parent EzAsync instance.
   */
  public call;

  /**
   * The private constructor for the AsyncAction class.
   *
   * @param asyncValue - The EzAsyncMut instance to attach the async action to
   * @param fetcher - The fetcher function to use with the async action
   * @param effect - The effect function to use with the async action
   */
  private constructor(
    orderedActionScheduler: OrderedActionScheduler,
    ez: EzAsync<Getter>,
    action: Action<Getter, Fe>
  ) {
    this.call = async (...args: Parameters<Fe>) => {
      if (ez.state.get() === "uninitialized") {
        console.error(
          "Actions should not be executed on uninitialized ez values!",
          ez,
          action
        );
        throw new Error(
          "Actions should not be executed on uninitialized ez values!"
        );
      }

      await orderedActionScheduler.scheduleAction(async () => {
        try {
          runInAction(() => {
            if (action.preFetch) action.preFetch({ ez, args });
          });
          await when(() => ez.state.get() !== "fetching");

          if (ez.state.get() !== "done") {
            throw new Error(
              "ez value is stale or an error occured during fetching"
            );
          }

          const result = await action.fetcher(...args);
          runInAction(() => {
            if (action.effect !== undefined)
              action.effect({ ez, result, args });
          });
        } catch (error) {
          runInAction(() => {
            if (action.onFetchError !== undefined)
              action.onFetchError({ ez, error, args });
          });
          throw error;
        }
      });
    };

    makeAutoObservable(this);
  }

  public static new = <Getter extends Fetcher, Fe extends Fetcher>(
    orderedActionScheduler: OrderedActionScheduler,
    asyncValue: EzAsync<Getter>,
    action: Action<Getter, Fe>
  ) => {
    const asyncAction = new AsyncAction<
      typeof asyncValue extends EzAsync<infer G> ? G : never,
      typeof action.fetcher
    >(orderedActionScheduler, asyncValue, action);

    return asyncAction.call;
  };
}
