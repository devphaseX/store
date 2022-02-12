export function getFreeVariable<T>(closeOverFn: () => T) {
  return function unwrapCloseOver() {
    return closeOverFn();
  };
}

export function immutableShallowMergeState<State>(
  oldState: State,
  newState: Partial<State>
) {
  return Object.assign({}, oldState, newState);
}

export function take<State, Keys extends Array<keyof State>>(
  state: State,
  keys: Keys
) {
  return Object.fromEntries(keys.map((key) => [key, state[key]])) as Pick<
    State,
    Keys[number]
  >;
}
