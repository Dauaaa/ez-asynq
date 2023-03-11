import { makeAutoObservable, runInAction } from "mobx";
import { Fetcher, EzAsynq as EzAsynqInterface, EzValue } from "./common";

export class EzAsynq<Fe extends Fetcher<any, []>>
  implements EzAsynqInterface<Fe>
{
  public ez: EzValue<Fe>;
  public fetch;
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

    const stale = () => {
      if (this.ez.state === "done") this.ez.state = "stale";
    };

    this.ez = { value: null, state: "uninitialized", stale };

    makeAutoObservable<EzAsynq<Fe>, "state">(this);
  }
}
