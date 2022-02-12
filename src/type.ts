export interface Store<Root> {
  subscriber(
    slice: Array<keyof Root>,
    dataUpdateListener: SliceDataSubscriber<Root>
  ): UpdateOption<Root, false>;

  getRootLevelState<Slice extends keyof Root>(key: Slice): Root[Slice] | null;
}

export interface SliceDataSubscriber<State> {
  (state: State): void;
}

export type SliceDataSubscriberStore<Root> = Set<SliceDataSubscriber<Root>>;

export type UpdateOption<State, Notifier extends boolean = true> = {
  unsubscriber(slices: Array<keyof State>): void;
  setSlicePart(parts: Partial<State>): void;
  getSlicePart(): Partial<State> | null;
} & (Notifier extends true ? VisibelNotifier : {});

interface VisibelNotifier {
  notifyListener(): void;
}
