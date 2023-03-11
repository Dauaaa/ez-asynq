# ez-asynq
A domain driven async kit for typescript, powered by mobx.

### TODOs

- [ ] TODO write a proper README 😓
- [ ] TODO deploy package
- [x] TODO fix all stale docstrings!
- [x] TODO create a discriminated union that does not allow status to be "done" and value to be null so developer only needs to check status instead of status and value.
- [ ] TODO create EzRange (should be good use case for pagination, implements EzAsynqMemo) (after 1.0.0)
- [ ] TODO create type tests for each ez-async implementation. (still need to check for actions) (after 1.0.0)
- [x] TODO implement a config for AsynqAction where developer may chose if next action ordering waits before fetching (current) or before effect (new).
- [ ] RESEARCH try to find a way to lazy load a context's value (using react suspense API) only after useContext is called. If possible, add module for react
