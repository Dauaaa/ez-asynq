import { makeAutoObservable, runInAction } from "mobx";
import { Fetcher, EzAsynq as EzAsynqInterface, EzValue } from "./common";

export class EzAsynq<Fe extends Fetcher> implements EzAsynqInterface<Fe> {
  public ez: EzValue<Fe>;
  public fetch;
  public stale;
  public forceFetch;

  public constructor(fetcher: Fe) {
    this.forceFetch = async () => {
      if (this.ez.state === "fetching") return;

      runInAction(() => {
        this.ez.state = "fetching";
      });

      try {
        const value = await fetcher();

        runInAction(() => {
          this.ez.value = value;
          this.ez.state = "done";
        });
      } catch (err) {
        runInAction(() => (this.ez.state = "error"));
        throw err;
      }
    };

    this.fetch = async () => {
      if (this.ez.state === "done") return;

      await this.forceFetch();
    };

    this.stale = () => {
      if (this.ez.state === "done") (this.ez.state as unknown) = "stale";
    };

    this.ez = { value: null, state: "uninitialized" };

    makeAutoObservable<EzAsynq<Fe>, "state">(this);
  }

  public static new = <Fe extends Fetcher>(fetcher: Fe) => new EzAsynq(fetcher);
}
