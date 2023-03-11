import { makeAutoObservable, runInAction, when } from "mobx";
import { EzAsynq } from "../base";
import {
  Fetcher,
  Action,
  EmptyFetcherArgs,
  OrderedActionScheduler,
  ActionToAsyncAction,
  GKey,
  EzAsynqMut as EzAsynqMutInterface,
  EzValue,
  ActionsConfig,
} from "../common";

export class EzAsynqMut<
  Getter extends EmptyFetcherArgs,
  A extends Record<GKey, Action<Getter>>
> implements EzAsynqMutInterface<Getter, A>
{
  public fetch;
  public ez;
  public actions;

  public constructor(
    fetcher: Getter,
    actions: A,
    config?: Partial<ActionsConfig>
  ) {
    const ezAsync = new EzAsynq(fetcher);
    this.ez = ezAsync.ez;
    this.fetch = ezAsync.fetch;
    const orderedActionScheduler = new OrderedActionScheduler();
    this.actions = Object.fromEntries(
      Object.entries(actions).map(([key, action]) => [
        key,
        new AsyncAction(orderedActionScheduler, this.ez, action, config).call,
      ])
    ) as unknown as ActionToAsyncAction<Getter, A>;
  }
}

/**
 * This class is used to attach an async action to an EzAsynqMut instance.
 * It will be called after the value has been fetched and can be used to update other values or perform additional async operations.
 *
 * The effect function will be called with an object containing the current value, the new result, and the arguments passed to the fetcher.
 */
export class AsyncAction<Getter extends Fetcher, Fe extends Fetcher> {
  /**
   * A function that wraps the original fetcher function, and executes it while
   * triggering an effect on success. The effect is responsible for updating the
   * value in the parent EzAsynq instance.
   */
  public call;

  /**
   * The private constructor for the AsyncAction class.
   *
   * @param asyncValue - The EzAsynqMut instance to attach the async action to
   * @param fetcher - The fetcher function to use with the async action
   * @param effect - The effect function to use with the async action
   */
  public constructor(
    orderedActionScheduler: OrderedActionScheduler,
    ez: EzValue<Getter>,
    action: Action<Getter, Fe>,
    config?: Partial<ActionsConfig>
  ) {
    const actualConfig = { ...AsyncAction.defaultConfig, ...config };
    const asyncAction = async (...args: Parameters<Fe>) => {
      try {
        if (action.preFetch)
          runInAction(() => {
            action.preFetch!({ ez, args });
          });
        await when(() => ez.state !== "fetching");

        if (ez.state !== "done") {
          throw new Error(
            "ez value is stale or an error occured during fetching"
          );
        }

        const result = await action.fetcher(...args);

        runInAction(() => {
          if (action.effect !== undefined) action.effect({ ez, result, args });
        });
      } catch (error) {
        runInAction(() => {
          if (action.onFetchError !== undefined)
            action.onFetchError({ ez, error, args });
        });
        throw error;
      }
    };

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

      if (actualConfig.orderActions)
        await orderedActionScheduler.scheduleAction(
          async () => await asyncAction(...args)
        );
      else {
        await asyncAction(...args);
      }
    };

    makeAutoObservable(this);
  }

  private static defaultConfig = { orderActions: true };
}
