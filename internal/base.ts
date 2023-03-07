import { makeAutoObservable, observable, runInAction } from "mobx";
import { Fetcher, EzAsyncState, EzAsync } from "./common";

export class EzAsyncBase<Fe extends Fetcher<any, []>> {
  public ez: EzAsync<Fe>;

  private constructor(fetcher: Fe) {
    const state = observable.box<EzAsyncState>("uninitialized");
    const forceFetch = async () => {
      if (state.get() === "fetching") return;

      runInAction(() => {
        state.set("fetching");
      });

      try {
        const value = await fetcher();

        runInAction(() => {
          this.ez.value = value;
          state.set("done");
        });
      } catch (err) {
        runInAction(() => state.set("error"));
        throw err;
      }
    };

    const fetch = async () => {
      if (state.get() === "done") return;

      await forceFetch();
    };

    const stale = () => state.set("stale");

    this.ez = { value: null, fetch, forceFetch, state, stale };

    makeAutoObservable(this);
  }

  public static new = <Getter extends Fetcher<any, []>>(fetcher: Getter) => {
    const asyncValue = new EzAsyncBase<typeof fetcher>(fetcher);

    return asyncValue as EzAsyncBase<Getter>;
  };
}
