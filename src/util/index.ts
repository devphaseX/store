import { GetRevokerAccessKey, RevokeAccess } from '../type';

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
): Pick<State, Keys[number]> {
  keys = keys.filter((key) => (isObject(state) ? key in state : false)) as Keys;
  return Object.fromEntries(
    keys.map((key) => [key, state[key]] as const)
  ) as any;
}

export function deleteObjectProp<
  O extends Record<PropertyKey, any>,
  K extends keyof O
>(obj: O, key: K): Omit<O, K> {
  const { [key]: _, ...remain } = obj;
  return remain;
}

export function createDataKey<State>(accessRevoker: RevokeAccess<State>) {
  const [dataKeys, revoker] = accessRevoker;

  type RevokeKey = GetRevokerAccessKey<typeof accessRevoker>;

  function unsubscriber(key: RevokeKey): void;
  function unsubscriber(keys: Array<RevokeKey>): void;
  function unsubscriber(type: RevokeKey | Array<RevokeKey>) {
    if (!Array.isArray(type)) {
      if (dataKeys.has(type)) {
        dataKeys.delete(type);
        revoker(type);
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

export function validateObjectState(value: any) {
  return isPlainObject(value);
}

function isPlainObject(value: any) {
  return (
    Object.prototype.toString.call(value) === '[object Object]' &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function isObject(value: any) {
  return value instanceof Object;
}

export const isFunction = (value: any): value is Function =>
  typeof value === 'function';

export function deepClone<State>(
  value: State,
  typeUnwrapper?: (value: any) => any
): State {
  if (!isObject(value)) return value;

  if (Array.isArray(value)) {
    return value.map((item) =>
      deepClone(item, typeUnwrapper)
    ) as unknown as State;
  }

  if (!isPlainObject(value) && !typeUnwrapper) {
    return value;
  }

  const newObj = {} as State;
  (Object.keys(value) as Array<keyof State>).forEach((key) => {
    newObj[key] = deepClone(value[key], typeUnwrapper);
  });

  return newObj;
}

export function deepEqual<State>(
  prevState: Partial<State> | null,
  newState: Partial<State> | null
): boolean {
  if (prevState === null || newState === null) return true;
  if (!(isObject(prevState) || isObject(newState)) || isFunction(prevState)) {
    return Object.is(prevState, newState);
  }

  if (Array.isArray(prevState) && Array.isArray(newState)) {
    if (prevState.length !== newState.length) return false;
    return prevState.every((item, i) => deepEqual(item, newState[i]));
  }

  if (!isPlainObject(prevState) || !isPlainObject(newState))
    return Object.is(prevState, newState);

  const prevObjKeys = Object.keys(prevState) as Array<keyof State>;

  if (prevObjKeys.length !== Object.keys(newState).length) return false;

  return prevObjKeys.every((key) =>
    deepEqual(prevState[key] ?? null, newState[key] ?? null)
  );
}

type State = object;
export function immutableState<S extends State>(
  state: Partial<S> | null
): Partial<S> {
  const get = function (target: S, key: keyof S) {
    const value = Reflect.get(target, key);
    if (isFunction(value) || isPrimitive(value)) {
      return value as S[typeof key];
    }
    return immutableState(deepClone(value)) as unknown as S[typeof key];
  };
  return new Proxy(state ?? {}, { get } as ProxyHandler<S>) as S;
}

function isPrimitive<T>(value: any): value is T {
  return typeof value !== 'object' || Object(value) !== value;
}
