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

export function deleteObjectProp<
  O extends Record<PropertyKey, any>,
  K extends keyof O
>(obj: O, key: K): Omit<O, K> {
  const { [key]: _, ...remain } = obj;
  return remain;
}

export function createDataKey<T>(
  slices: Array<T>,
  dataRevoker: (key: T) => void
) {
  const dataKeys = new Set(slices);

  function unsubscriber(key: T): void;
  function unsubscriber(keys: typeof slices): void;
  function unsubscriber(type: T | typeof slices) {
    if (!Array.isArray(type)) {
      if (dataKeys.has(type)) {
        dataKeys.delete(type);
        dataRevoker(type);
      }
      return void 0;
    }
    return type.forEach(unsubscriber);
  }

  function getDataKeys() {
    return Array.from(dataKeys);
  }

  return {
    unsubscriber,
    getDataKeys,
  };
}
