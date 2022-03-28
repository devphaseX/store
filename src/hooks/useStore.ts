import { createStore } from '../index';

interface useStoreResult<State> {
  currentSelectedStates: Partial<State>;
  setCurrentState<K extends keyof State>(key: K, value: State[K]): void;
  setFullSelectedState(value: Partial<State>): void;
  unsubscribeState(key: keyof State): void;
}

declare function useRef<T>(value: T): { current: T };
declare function useRef<T>(value: null): { current: T | null };
declare function useRef<T>(value?: null | T): { current: T | null };

function useStore<State>(initial?: State): useStoreResult<State> {
  const ref = useRef(createStore<State>(initial));

  return {} as any;
}

export default useStore;
