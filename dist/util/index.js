export function getFreeVariable(closeOverFn) {
    return function unwrapCloseOver() {
        return closeOverFn();
    };
}
export function immutableShallowMergeState(oldState, newState) {
    return Object.assign({}, oldState, newState);
}
export function take(state, keys) {
    keys = keys.filter((key) => key in state);
    return Object.fromEntries(keys.map((key) => [key, state[key]]));
}
