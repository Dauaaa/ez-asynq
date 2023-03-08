import { makeAutoObservable, runInAction } from "mobx";
import { Fetcher, EzAsync, EzValue } from "./common";

export class EzAsyncBase<Fe extends Fetcher<any, []>> implements EzAsync<Fe> {
  public ez: EzValue<Fe>;
  public fetch;
  public forceFetch;

  public constructor(fetcher: Fe) {
    const state: { current: "uninitialized" } = { current: "uninitialized" };
    this.forceFetch = async () => {
      if (this.ez.state.current === "fetching") return;

      runInAction(() => {
        this.ez.state.current = "fetching";
      });

      try {
        const value = await fetcher();

        runInAction(() => {
          this.ez.value = value;
          this.ez.state.current = "done";
        });
      } catch (err) {
        runInAction(() => this.ez.state.current = "error");
        throw err;
      }
    };

    this.fetch = async () => {
      if (this.ez.state.current === "done") return;

      await this.forceFetch();
    };

    const stale = () => {
      if (this.ez.state.current === "done") this.ez.state.current = "stale";
    };

    this.ez = { value: null, state, stale };

    makeAutoObservable<EzAsyncBase<Fe>, "state">(this);
  }
}
