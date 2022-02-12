export function getFreeVariable<T>(closeOverFn: () => T) {
  return function unwrapCloseOver() {
    return closeOverFn();
  };
}
export function immutableShallowMergeState<State>(
  oldState: State | null,
  newState: Partial<State>
) {
  return Object.assign({}, oldState, newState);
}

export function take<State, Keys extends Array<keyof State>>(
  state: State,
  keys: Keys
) {
  keys = keys.filter((key) => key in state) as Keys;
  return Object.fromEntries(
    keys.map((key) => [key, state[key]] as const)
  ) as Pick<State, Keys[number]>;
}
