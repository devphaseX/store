interface useStoreResult<State> {
  currentSelectedStates: Partial<State>;
  setCurrentState<K extends keyof State>(key: K, value: State[K]): void;
  setFullSelectedState(value: Partial<State>): void;
  unsubscribeState(key: keyof State): void;
}

function useStore<State>(initial?: State): useStoreResult<State> {
  return {} as any;
}

export default useStore;
