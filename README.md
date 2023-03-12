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
The state of a value is updated automatically or using the `stale` function. The value itself is initialized using the `fetch` function. In order to mutate a value after it being fetched, an `AsyncAction` needs to be defined. `AsyncActions` are async functions wrapped by possible effects which may mutate state. [How action works.](https://github.com/Dauaaa/ez-asynq).

These 3 rules allow ez-asynq to leverage some cool features:
1. don't allow multiple fetches to the same value by default
2. order actions (can be switched off)
3. create manageable switch blocks for each possible state
4. seamlessly share references for the same data (action mutations don't allow race if ordering is preserved)
5. seamlessly cache and refresh data

### Meet the classes
All class constructors may be accessed through ezAsynq object. Choosing the right class for each use case is necessary to create a good implementation for the domain.

In the examples, suppose we have two coin price functions `getCoinPriceAnalysis` and `getCoinPrices` with the following signature: 
```typescript
type Coin = "BTC" | "ETH" | "ADA";
type GetCoinPriceAnalysis: (coin: Coin, date: Date = new Date()) => Promise<{ coin: Coin, avgPrice: number, maxPrice: number, minPrice: number }>;
type GetCoinPrice: (coin: Coin, date: Date = new Date()) => Promise<{ coin: Coin, price: number, date: Date }>;
```

#### EzAsynq
The `EzAsynq` class is useful for fetching "static" data since it doesn't have actions. Use cases: simple data (can be completely fetched in one request) that can't be acted upon (only GET). The initialization function (in example: `fetchBTCPrice`) must not have arguments.

```typescript
const fetchBTCPrice = async () => await getCoinPriceAnalysis("BTC");

import { ezAsynq } from "ez-asynq";

const btcPrice = ezAsynq.base(fetchBTCPrice);
```

#### EzAsynqMemo
The `EzAsynqMemo` class is useful for fetching multiple "static" data. It's basically a map with `EzAsynq` as values. Use cases: simple data (can be completely fetched in one request) with multiple variants, that can't be acted upon (only GET). The initialization function (in example: `fetchCoinPrice`) may have arguments (if it doesn't than maybe `EzAsynqMemo` is not the best class to represent the data).

```typescript
const fetchCoinPrice = async (coin: "BTC" | "ETH" | "ADA") => await getCoinPriceAnalysis("BTC");

import { ezAsynq } from "ez-asynq";

const coinPrices = ezAsynq.memo(fetchCoinPrice);
```

#### EzAsynqMut
The `EzAsyncMut` class is useful for "dynamic" data. Use case: an entity that has actions (POST, PUT, DELETE) or may be too large and must be fetched multiple times (coin price in time) or both (feed for a social media app, chat from chat app). Usually chat apps use ws to communicate, using ez-asynq for such a task may be bad, but `EzAsynqMut` would certainly be the best option from the library for the given task.

```typescript
const fetchBTCPriceChart = async () => {
  const btcNow = await getCoinPrice("BTC");
  return [btcNow];
}

import { ezAsynq, createAAFactory } from "ez-asynq";

const btcPriceActionFactory = createAAFactory(fetchBTCPriceChart);

const appendBTCPriceAction = btcPriceActionFactory(async () => getCoinPrice("BTC"), { effect: ({ ez, result }) => ez.value.push(result) });

const btcPrice = ezAsynq.mut(fetchBTCPriceChart, { appendCurrentPrice: appendBTCPriceAction});

await btcPrice.fetch();

// fetch new value to append to btcPrice.ez.value every second
setInterval(() => void btcPrice.actions.appendCurrentPrice(), 1000)
```
This specific example could be solved using `EzAsynqMemo` too. IMO it depends on the interpretation, if the coin itself is an entity and its prices are its data, you should use `EzAsynqMut`. If each price itself is an entity, using `EzAsynqMemo` would be a valid implementation. This example (using an entity that does not have any POST, PUT, DELETE action) was chosen to show a valid implementation of `EzAsyncMut` with no POST, PATCH, PUT. [Other examples](https://github.com/Dauaaa/ez-asynq).

#### EzAsynqMemoMut
The `EzAsyncMemoMut` class is useful for "dynamic" data. It's basiaclly a map with `EzAsynqMut` as values. Use case: a group of entities with similar actions (POST, PUT, DELETE) or entities too large that must be fetched multiple times (multiple coin price in time) or both (multiple chats from chat app).


```typescript
const fetchCoinPriceChart = async (coin: Coin) => {
  const coinNow = await getCoinPrice(coin);
  return [coinNow];
}

import { ezAsynq, createAAFactory } from "ez-asynq";

const coinPriceActionFactory = createAAMemoFactory(fetchCoinPriceChart);

const appendCoinPriceAction = coinPriceActionFactory((coin) => async () => getCoinPrice(coin), { effect: (_coin) => ({ ez, result }) => ez.value.push(result) });

const coinPrice = ezAsynq.memoMut(fetchCoinPriceChart, { appendCurrentPrice: appendCoinPriceAction});

await coinPrice.fetch("BTC");

// fetch new value to append to coinPrice.current.ez.value every second
setInterval(() => void coinPrice.current?.actions.appendCurrentPrice(), 1000)

// after 12 seconds, fetch ETH value (setInterval will now get eth value every second)
setTimeout(() => void coinPrice.fetch("ETH"), 12000);
```

### Examples

### TODOs

- [ ] TODO write examples (after 1.0.0)
- [ ] TODO create EzRange (should be good use case for pagination, implements EzAsynqMemo) (after 1.0.0)
- [ ] TODO create type tests for each ez-asynq implementation. (still need to check for actions and memo) (after 1.0.0)
- [ ] RESEARCH try to find a way to lazy load a context's value (using react suspense API) only after useContext is called. If possible, add module for react
