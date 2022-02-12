var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { immutableShallowMergeState, take } from './util/index.js';
export function createStore(initial) {
    let _rootState = initial !== null && initial !== void 0 ? initial : null;
    const subscribeRecord = new Map();
    const prioritySubscriberUpdateQueue = new Map();
    function createUpdateListener(slices, listener, showNotifier = true) {
        const dataKeys = new Set(slices);
        const updateEntries = initUpdateEntry(slices);
        const unsubscriber = subscribeListener(listener, updateEntries, dataKeys);
        function setSlicePart(slicePart) {
            applyUpdateToRootLevel(take(slicePart, Array.from(slices)));
        }
        function getSlicePart() {
            return _rootState ? take(_rootState, Array.from(dataKeys)) : null;
        }
        function notifyListener() {
            listener(getSlicePart());
        }
        if (!showNotifier) {
            return {
                unsubscriber,
                setSlicePart,
                getSlicePart,
            };
        }
        return {
            unsubscriber,
            setSlicePart,
            getSlicePart,
            notifyListener,
        };
    }
    function subscriber(slices, listener) {
        const subscriberOption = createUpdateListener(slices, listener, true);
        prioritySubscriberUpdateQueue.set(listener, subscriberOption);
        const { notifyListener } = subscriberOption, options = __rest(subscriberOption, ["notifyListener"]);
        return options;
    }
    function applyUpdateToRootLevel(updates) {
        _rootState = immutableShallowMergeState(_rootState, updates);
        if (_rootState) {
            prepUpdateForDispatch(Object.keys(updates));
        }
    }
    function prepUpdateForDispatch(changed) {
        const readyUpdateSubscribers = assembleSubscribersForUpdate(changed);
        return storeUpdateNotifier(getUpdatesOption(readyUpdateSubscribers));
    }
    function assembleSubscribersForUpdate(changes) {
        return new Set(changes.flatMap((change) => { var _a; return Array.from((_a = subscribeRecord.get(change)) !== null && _a !== void 0 ? _a : []); }));
    }
    function getUpdatesOption(updateSubscriber) {
        const options = new Set();
        prioritySubscriberUpdateQueue.forEach((option, subscriber) => {
            if (updateSubscriber.has(subscriber))
                options.add(option);
        });
        return options;
    }
    function storeUpdateNotifier(notices) {
        notices.forEach((notice) => {
            notice.notifyListener();
        });
    }
    function subscribeListener(listener, stores, sliceKeys) {
        stores.forEach((listenerStore) => {
            listenerStore.add(listener);
        });
        return function detach(parts) {
            parts.forEach((part) => {
                if (stores.has(part)) {
                    stores.get(part).delete(listener);
                    sliceKeys.delete(part);
                }
            });
        };
    }
    function initUpdateEntry(keys) {
        function listenerEntry(key) {
            let listeners = subscribeRecord.has(key) ? subscribeRecord.get(key) : new Set();
            subscribeRecord.set(key, listeners);
            return [key, listeners];
        }
        return new Map(keys.map(listenerEntry));
    }
    function getRootLevelState() {
        return sliceState(_rootState ? Object.keys(_rootState) : []);
    }
    function sliceState(sliceKeys) {
        return _rootState ? take(_rootState, sliceKeys) : null;
    }
    return {
        subscriber,
        sliceState,
        getRootLevelState,
        setRootLevelState: applyUpdateToRootLevel,
    };
}
