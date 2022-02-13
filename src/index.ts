import {
  deleteObjectProp,
  immutableShallowMergeState,
  take,
} from './util/index.js';
import {
  SliceDataSubscriber,
  Store,
  UpdateOption,
  ItemKeys,
  UpdateNotifier,
  SubscriberRecords,
  PriorityUpdateQueue,
  GetArrayItem,
  NotifyEntry,
  ListenerEntry,
} from './type.js';

export function createStore<RootDataShape>(
  initial?: Partial<RootDataShape>
): Store<RootDataShape> {
  let _rootState = initial ?? null;
  const subscribeRecords: SubscriberRecords<RootDataShape> = new Map();
  let prioritySubscriberUpdateQueue: PriorityUpdateQueue<RootDataShape> =
    new Map();

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

    const getSlicePart = function () {
      return sliceState(Array.from(dataKeys));
    };

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

  function createListenerEntry(
    slices: ItemKeys<RootDataShape>,
    listener: SliceDataSubscriber<RootDataShape>,
    priorityQueue: PriorityUpdateQueue<RootDataShape>
  ): NotifyEntry<RootDataShape> {
    const subscriberOption = createUpdateListener(slices, listener, true);
    priorityQueue = new Map(priorityQueue);
    priorityQueue.set(listener, subscriberOption);

    return [
      deleteObjectProp(subscriberOption, 'notifyListener'),
      priorityQueue,
    ];
  }

  function subscriber(
    slices: ItemKeys<RootDataShape>,
    listener: SliceDataSubscriber<RootDataShape>
  ) {
    const [updateOption, newPriorityQueue] = createListenerEntry(
      slices,
      listener,
      prioritySubscriberUpdateQueue
    );

    prioritySubscriberUpdateQueue = newPriorityQueue;
    return updateOption;
  }

  function applyUpdateToRootLevel(updates: Partial<RootDataShape>) {
    _rootState = immutableShallowMergeState(_rootState, updates);
    prepUpdateForDispatch(Object.keys(updates) as ItemKeys<RootDataShape>);
  }

  function getListenerUpdater(
    changes: ItemKeys<RootDataShape>,
    subscriberRecords: SubscriberRecords<RootDataShape>,
    priorityQueue: PriorityUpdateQueue<RootDataShape>
  ) {
    return getUpdatesOption(
      assembleSubscribersForUpdate(changes, subscriberRecords),
      priorityQueue
    );
  }

  function prepUpdateForDispatch(changed: ItemKeys<RootDataShape>) {
    const updateListeners = getListenerUpdater(
      changed,
      subscribeRecords,
      prioritySubscriberUpdateQueue
    );
    return void storeUpdateNotifier(updateListeners);
  }

  function assembleSubscribersForUpdate(
    changes: ItemKeys<RootDataShape>,
    subscriberRecords: typeof subscribeRecords
  ) {
    function retriveSubscriberRecord(change: typeof changes[number]) {
      return Array.from(subscriberRecords.get(change) ?? []);
    }
    return new Set(changes.flatMap(retriveSubscriberRecord));
  }

  function getUpdatesOption(
    updateSubscriber: Set<SliceDataSubscriber<RootDataShape>>,
    priorityQueue: PriorityUpdateQueue<RootDataShape>
  ) {
    const options = new Set<UpdateOption<RootDataShape>>();
    updateSubscriber.forEach((subscriber) => {
      const updateOption = priorityQueue.get(subscriber)!;
      options.add(updateOption);
    });
    return options;
  }

  function storeUpdateNotifier<
    NoticeObject extends { notifyListener: UpdateNotifier }
  >(notices: Set<NoticeObject>) {
    notices.forEach((notice) => {
      notice.notifyListener();
    });
  }

  function subscribeListener(
    listener: SliceDataSubscriber<RootDataShape>,
    stores: SubscriberRecords<RootDataShape>,
    sliceKeys: Set<keyof RootDataShape>
  ) {
    subscribeToRootLevelData();
    function subscribeToRootLevelData() {
      sliceKeys.forEach((key) => {
        stores.get(key)!.add(listener);
      });
    }

    function revokeRootDataSub(parts: ItemKeys<RootDataShape>) {
      parts.forEach(function revoke(part) {
        if (stores.has(part)) {
          stores.get(part)!.delete(listener);
          sliceKeys.delete(part);
        }
      });
    }
    return revokeRootDataSub;
  }

  function initUpdateEntry(keys: ItemKeys<RootDataShape>) {
    function listenerEntry(
      key: GetArrayItem<typeof keys>
    ): ListenerEntry<RootDataShape> {
      let listeners = subscribeRecords.get(key) ?? new Set();
      subscribeRecords.set(key, listeners);
      return [key, listeners];
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
