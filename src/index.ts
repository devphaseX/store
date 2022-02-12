import { immutableShallowMergeState, take } from './util/index.js';
import {
  SliceDataSubscriberStore,
  SliceDataSubscriber,
  Store,
  UpdateOption,
  ItemKeys,
} from './type.js';

export function createStore<RootDataShape>(
  initial?: Partial<RootDataShape>
): Store<RootDataShape> {
  let _rootState = initial ?? null;
  const subscribeRecord = new Map<
    keyof RootDataShape,
    SliceDataSubscriberStore<RootDataShape>
  >();

  const prioritySubscriberUpdateQueue = new Map<
    SliceDataSubscriber<RootDataShape>,
    UpdateOption<RootDataShape, true>
  >();

  function createUpdateListener<Slices extends ItemKeys<RootDataShape>>(
    slices: ItemKeys<RootDataShape>,
    listener: SliceDataSubscriber<Pick<RootDataShape, Slices[number]>>,
    showNotifier: true
  ): UpdateOption<RootDataShape, true>;
  function createUpdateListener<Slices extends ItemKeys<RootDataShape>>(
    slices: ItemKeys<RootDataShape>,
    listener: SliceDataSubscriber<Pick<RootDataShape, Slices[number]>>,
    showNotifier: false
  ): UpdateOption<RootDataShape, false>;
  function createUpdateListener<Slices extends ItemKeys<RootDataShape>>(
    slices: ItemKeys<RootDataShape>,
    listener: SliceDataSubscriber<Pick<RootDataShape, Slices[number]>>,
    showNotifier: boolean
  ): UpdateOption<RootDataShape, boolean>;
  function createUpdateListener<Slices extends ItemKeys<RootDataShape>>(
    slices: ItemKeys<RootDataShape>,
    listener: SliceDataSubscriber<Pick<RootDataShape, Slices[number]>>,
    showNotifier = true
  ): UpdateOption<RootDataShape, typeof showNotifier> {
    const dataKeys = new Set(slices);
    const updateEntries = initUpdateEntry(slices);
    const unsubscriber = subscribeListener(listener, updateEntries, dataKeys);

    function setSlicePart(slicePart: Pick<RootDataShape, typeof slices[0]>) {
      applyUpdateToRootLevel(take(slicePart, Array.from(slices)));
    }

    function getSlicePart(): Partial<RootDataShape> | null {
      return _rootState ? take(_rootState, Array.from(dataKeys)) : null;
    }

    function notifyListener() {
      listener(getSlicePart() as any);
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

  function subscriber(
    slices: ItemKeys<RootDataShape>,
    listener: SliceDataSubscriber<RootDataShape>
  ) {
    const subscriberOption = createUpdateListener(slices, listener, true);
    prioritySubscriberUpdateQueue.set(listener, subscriberOption);

    const { notifyListener, ...options } = subscriberOption;
    return options;
  }

  function applyUpdateToRootLevel(updates: Partial<RootDataShape>) {
    _rootState = immutableShallowMergeState(_rootState, updates);

    if (_rootState) {
      prepUpdateForDispatch(Object.keys(updates) as ItemKeys<RootDataShape>);
    }
  }

  function prepUpdateForDispatch(changed: ItemKeys<RootDataShape>) {
    const readyUpdateSubscribers = assembleSubscribersForUpdate(changed);
    return storeUpdateNotifier(getUpdatesOption(readyUpdateSubscribers));
  }

  function assembleSubscribersForUpdate(changes: ItemKeys<RootDataShape>) {
    return new Set(
      changes.flatMap((change) => Array.from(subscribeRecord.get(change) ?? []))
    );
  }

  function getUpdatesOption(
    updateSubscriber: Set<SliceDataSubscriber<RootDataShape>>
  ) {
    const options = new Set<UpdateOption<RootDataShape>>();
    prioritySubscriberUpdateQueue.forEach((option, subscriber) => {
      if (updateSubscriber.has(subscriber)) options.add(option);
    });
    return options;
  }

  function storeUpdateNotifier(notices: Set<UpdateOption<RootDataShape>>) {
    notices.forEach((notice) => {
      notice.notifyListener();
    });
  }

  function subscribeListener(
    listener: SliceDataSubscriber<RootDataShape>,
    stores: ReturnType<typeof initUpdateEntry>,
    sliceKeys: Set<keyof RootDataShape>
  ) {
    stores.forEach((listenerStore) => {
      listenerStore.add(listener);
    });

    return function detach(parts: ItemKeys<RootDataShape>) {
      parts.forEach((part) => {
        if (stores.has(part)) {
          stores.get(part)!.delete(listener);
          sliceKeys.delete(part);
        }
      });
    };
  }

  function initUpdateEntry(keys: ItemKeys<RootDataShape>) {
    function listenerEntry(key: keyof RootDataShape) {
      let listeners: SliceDataSubscriberStore<RootDataShape> =
        subscribeRecord.has(key) ? subscribeRecord.get(key)! : new Set();

      subscribeRecord.set(key, listeners);
      return [key, listeners] as const;
    }
    return new Map(keys.map(listenerEntry));
  }

  function getRootLevelState() {
    return sliceState(
      _rootState ? (Object.keys(_rootState) as ItemKeys<RootDataShape>) : []
    );
  }

  function sliceState<K extends ItemKeys<RootDataShape>>(sliceKeys: K) {
    return _rootState ? take(_rootState, sliceKeys) : null;
  }

  return {
    subscriber,
    sliceState,
    getRootLevelState,
    setRootLevelState: applyUpdateToRootLevel,
  };
}
