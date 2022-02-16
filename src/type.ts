export type State = Record<PropertyKey, any>;

export interface Store<Root> {
  subscriber<Slices extends Array<keyof Root>>(
    slice: Slices,
    dataUpdateListener: SliceDataSubscriber<Partial<Pick<Root, Slices[number]>>>
  ): Omit<UpdateOption<Pick<Root, Slices[number]>>, 'notifyListener'>;

  getRootLevelState(): Partial<Root> | null;
  setRootLevelState(state: Partial<Root>): void;
  sliceState<Slices extends Array<keyof Root>>(
    keys: Slices
  ): Partial<Pick<Root, Slices[number]>> | null;
}

export interface SliceDataSubscriber<State> {
  (state: State): void;
}

export type SliceDataSubscriberStore<Root> = Set<SliceDataSubscriber<Root>>;

export type UpdateOption<State> = {
  unsubscriber(part: keyof State): void;
  unsubscriber(slices: Array<keyof State>): void;
  setSlicePart(parts: Partial<State>): void;
  setSlicePart(
    mappable:
      | Partial<State>
      | ((currentState: Partial<State>) => Partial<State>)
  ): void;
  getSlicePart(): Partial<State> | null;
  notifyListener(): void;
};

export type ItemKeys<State> = Array<keyof State>;

export type UpdateNotifier = () => void;

export type SubscriberRecords<Root> = Map<
  keyof Root,
  SliceDataSubscriberStore<Root>
>;

export type PriorityUpdateQueue<Root> = Map<
  SliceDataSubscriber<Root>,
  UpdateOption<Root>
>;

export type GetArrayItem<List> = List extends Array<infer T> ? T : never;
export type NotifyEntry<Root> = [
  Omit<UpdateOption<Root>, 'notifyListener'>,
  PriorityUpdateQueue<Root>
];

export type ListenerEntry<Root> = [keyof Root, SliceDataSubscriberStore<Root>];
export type NestedDataSlice<State, K extends keyof State> = Partial<
  Pick<State, K>
>;
export interface CreateStateFromPreviousFn<State> {
  (currentState: Partial<State>): Partial<State>;
}

export type RevokeAccess<State> = [
  dataKeys: Set<keyof State>,
  revoker: (key: keyof State) => void
];

export type GetRevokerAccessKey<Revoker> = Revoker extends RevokeAccess<
  infer State
>
  ? keyof State
  : never;
