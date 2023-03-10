import { makeAutoObservable, runInAction, when } from "mobx";
import { EzAsync } from "../base";
import {
  Fetcher,
  Action,
  EmptyFetcherArgs,
  OrderedActionScheduler,
  ActionToAsyncAction,
  GKey,
  EzAsyncMut as EzAsyncMutInterface,
  EzValue,
} from "../common";

export class EzAsyncMut<
  Getter extends EmptyFetcherArgs,
  A extends Record<GKey, Action<Getter>>
> implements EzAsyncMutInterface<Getter, A>
{
  public fetch;
  public ez;
  public actions;

  public constructor(fetcher: Getter, actions: A) {
    const ezAsync = new EzAsync(fetcher);
    this.ez = ezAsync.ez;
    this.fetch = ezAsync.fetch;
    const orderedActionScheduler = new OrderedActionScheduler();
    this.actions = Object.fromEntries(
      Object.entries(actions).map(([key, action]) => [
        key,
        AsyncAction.new(orderedActionScheduler, this.ez, action),
      ])
    ) as unknown as ActionToAsyncAction<Getter, A>;
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
    ez: EzValue<Getter>,
    action: Action<Getter, Fe>
  ) {
    this.call = async (...args: Parameters<Fe>) => {
      if (ez.state === "uninitialized") {
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
          await when(() => ez.state !== "fetching");

          if (ez.state !== "done") {
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
    asyncValue: EzValue<Getter>,
    action: Action<Getter, Fe>
  ) => {
    const asyncAction = new AsyncAction<
      typeof asyncValue extends EzValue<infer G> ? G : never,
      typeof action.fetcher
    >(orderedActionScheduler, asyncValue, action);

    return asyncAction.call;
  };
}
