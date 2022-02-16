import {
  createDataKey,
  deepClone,
  deepEqual,
  deleteObjectProp,
  immutableShallowMergeState,
  isFunction,
  take,
  validateObjectState,
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
  CreateStateFromPreviousFn,
  RevokeAccess,
  NestedDataSlice,
} from './type.js';

function validateNewStoreState(state: any, message: string) {
  if (state == null) return state;
  if (!validateObjectState(state ?? {})) {
    throw TypeError(message);
  }
  return state;
}

function createInvalidInitialErrorMsg(type: any) {
  return `Expected the initial global state type {Object} but got ${typeof type}`;
}

function createInvalidUpdateErrorMsg(type: any) {
  return `Expected the newly state update {Object} but got ${typeof type}`;
}

export function createStore<RootDataShape>(
  initial?: Partial<RootDataShape>
): Store<RootDataShape> {
  let _rootState = validateNewStoreState(
    initial ?? {},
    createInvalidInitialErrorMsg(initial)
  );
  const subscribeRecords: SubscriberRecords<RootDataShape> = new Map();
  let prioritySubscriberUpdateQueue: PriorityUpdateQueue<RootDataShape> =
    new Map();

  function createUpdateListener<Slices extends ItemKeys<RootDataShape>>(
    slices: ItemKeys<RootDataShape>,
    listener: SliceDataSubscriber<Partial<Pick<RootDataShape, Slices[number]>>>
  ): UpdateOption<RootDataShape> {
    type DataKeys = Slices[number];

    const accessRevoker = makeAccessRevokable(
      initUpdateEntry(slices),
      listener,
      slices
    );

    const { getDataKeys, unsubscriber } = createDataKey(accessRevoker);
    let currentState: NestedDataSlice<RootDataShape, DataKeys> = deepClone(
      getSlicePart()
    );

    function makeAccessRevokable(
      records: SubscriberRecords<RootDataShape>,
      listener: SliceDataSubscriber<Partial<Pick<RootDataShape, DataKeys>>>,
      slices: ItemKeys<RootDataShape>
    ): RevokeAccess<RootDataShape> {
      slices.forEach(function addListenerToRecord(slice) {
        records.get(slice)?.add(listener);
      });

      function deleteListenerFromRecord(key: GetArrayItem<typeof slices>) {
        records.get(key)!.delete(listener);
      }

      return [new Set(slices), deleteListenerFromRecord];
    }

    type SliceRootState = Pick<RootDataShape, DataKeys>;

    type MappableSlicePart =
      | SliceRootState
      | CreateStateFromPreviousFn<SliceRootState>;

    function setSlicePart(slicePart: SliceRootState): void;
    function setSlicePart(
      slicePastFn: CreateStateFromPreviousFn<SliceRootState>
    ): void;
    function setSlicePart(slicePart: MappableSlicePart) {
      let previousState = currentState;
      let newState!: Partial<SliceRootState>;

      if (isFunction(slicePart)) {
        newState = deepClone(slicePart(currentState ?? {}));
      } else {
        newState = deepClone(slicePart);
      }
      slicePart = validateNewStoreState(
        newState,
        createInvalidUpdateErrorMsg(slicePart)
      );

      const updateChanges = Object.keys(newState) as Array<
        keyof typeof previousState
      >;
      if (!deepEqual(take(previousState, updateChanges), currentState)) {
        currentState = newState;
        applyUpdateToRootLevel(take(newState, getDataKeys()));
      }
    }

    function getSlicePart() {
      return deepClone(sliceState(getDataKeys()));
    }

    function notifyListener() {
      listener(currentState);
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
    listener: SliceDataSubscriber<Partial<RootDataShape>>,
    priorityQueue: PriorityUpdateQueue<RootDataShape>
  ): NotifyEntry<RootDataShape> {
    const subscriberOption = createUpdateListener(slices, listener);
    priorityQueue = new Map(priorityQueue);
    priorityQueue.set(listener, subscriberOption);

    return [
      deleteObjectProp(subscriberOption, 'notifyListener'),
      priorityQueue,
    ];
  }

  function subscriber(
    slices: ItemKeys<RootDataShape>,
    listener: SliceDataSubscriber<Partial<RootDataShape>>
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
    return Array.from(
      updateSubscriber,
      (subscriber) => priorityQueue.get(subscriber)!
    );
  }

  function storeUpdateNotifier<
    NoticeObject extends { notifyListener: UpdateNotifier }
  >(notices: Array<NoticeObject>) {
    notices.forEach((notice) => {
      notice.notifyListener();
    });
  }

  function initUpdateEntry(
    keys: ItemKeys<RootDataShape>
  ): SubscriberRecords<RootDataShape> {
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
    return _rootState
      ? take(_rootState, sliceKeys)
      : ({} as Pick<RootDataShape, K[number]>);
  }

  return {
    subscriber,
    sliceState,
    getRootLevelState,
    setRootLevelState: applyUpdateToRootLevel,
  };
}
