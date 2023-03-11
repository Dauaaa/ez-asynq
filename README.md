# ez-asynq
A domain driven async kit for typescript, powered by mobx.

## Introduction
ez-asynq is an opinionated library for defining and instantiating your application state. Making the state management of your code more predictable.

The main purpose of the library is to standardize how application gets data from remote servers and force developers to adopt a more declarative approach to managing state. The library's opinion is biased on how RESTful APIs are built, ez-asynq will feel natural if your application uses REST principles to interact with application data. ez-asynq achieves these objectives by following a few rules.

#### Values have 5 possible states
1. `uninitialized` - Indicates state hasn't been fetched yet.
2. `fetching` - Indicates value is being fetched.
3. `error` - Indicates an error happened while fetching the value.
4. `done` - Indicates state was successfully fetched.
5. `stale` - Indicates state was successfully fetched but is now stale and should be fetched again.

#### State is defined by a fetcher
Instantiate an EzValue by specifying how it's fetched.
```typescript
const stringStore = new EzAsync(async () => ["so ez"])
type StringStore = typeof stringStore.ez.value // string[] | null
```

#### Never mutate ez values without using the provided ez API
The state of a value is updated automatically or using the `EzValue.stale` function (one may also update a value's state in an action's effects). The value itself is initialized using `EzAsync.fetch` function. In order to mutate a value after it being fetched, an `AsyncAction` needs to be defined. `AsyncActions` are async functions wrapped by possible effects which can mutate state. [How action works.](https://github.com/Dauaaa/ez-asynq).

These 3 rules allow ez-asynq to leverage some cool features:
1. don't allow multiple fetches to the same value by default
2. order actions (if needed)
3. create predictable switch blocks for each possible state
4. seamlessly share references for the same data
5. seamlessly cache and refresh data

### Examples

### TODOs

- [x] TODO write a proper README 😓
- [ ] TODO write examples (after 1.0.0)
- [x] TODO deploy package (properly)
- [x] TODO fix all stale docstrings!
- [x] TODO create a discriminated union that does not allow status to be "done" and value to be null so developer only needs to check status instead of status and value.
- [x] TODO create a good export file.
- [ ] TODO create EzRange (should be good use case for pagination, implements EzAsynqMemo) (after 1.0.0)
- [ ] TODO create type tests for each ez-asynq implementation. (still need to check for actions) (after 1.0.0)
- [x] TODO implement a config for AsynqAction where developer may chose if next action ordering waits before fetching (current) or before effect (new).
- [ ] RESEARCH try to find a way to lazy load a context's value (using react suspense API) only after useContext is called. If possible, add module for react
