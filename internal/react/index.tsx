import React from "react";
import { GKey } from "../common";

export const ezDIFactory = <
  Deps extends Record<GKey, any>,
  Hooks extends Record<GKey, () => Record<GKey, any>>
>({
  dependencies,
  hooks,
}: {
  dependencies: Deps;
  hooks: Hooks;
}) => {
  return {
    featureComponent:
      <P extends object>(
        Component: ({
          dependencies,
          hooks,
          ...props
        }: { dependencies: Deps; hooks: Hooks } & P) => React.ReactElement
      ) =>
      (props: P) =>
        <Component {...props} dependencies={dependencies} hooks={hooks} />,
    controller:
      <P extends any[], C extends any>(
        controllerConstructor: (
          { dependencies, hooks }: { dependencies: Deps; hooks: Hooks },
          ...args: P
        ) => C
      ) =>
      (...args: P) =>
        controllerConstructor({ dependencies, hooks }, ...args),
  };
};
