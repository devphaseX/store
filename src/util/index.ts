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
  const dataKeys = new Set(accessRevoker[0]);

  type RevokeKey = GetRevokerAccessKey<typeof accessRevoker>;

  function unsubscriber(key: RevokeKey): void;
  function unsubscriber(keys: Array<RevokeKey>): void;
  function unsubscriber(type: RevokeKey | Array<RevokeKey>) {
    if (!Array.isArray(type)) {
      if (dataKeys.has(type)) {
        dataKeys.delete(type);
        accessRevoker[1](type);
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

export function deepClone(
  value: any,
  typeUnwrapper?: (value: any) => any
): any {
  if (!isPlainObject(value) && !typeUnwrapper) return value;

  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item, typeUnwrapper));
  }

  const newObj = {} as any;
  Object.keys(value).forEach((key) => {
    newObj[key] = deepClone(value[key], typeUnwrapper);
  });

  return newObj;
}

console.log(deepClone([{ a: { b: 'c' } }, 1, true, new Set([1, 2, 3, 4])]));
console.log(isPlainObject({}));
