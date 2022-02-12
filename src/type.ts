export interface Store<Root> {
  subscriber<Slices extends Array<keyof Root>>(
    slice: Slices,
    dataUpdateListener: SliceDataSubscriber<Pick<Root, Slices[number]>>
  ): UpdateOption<Pick<Root, Slices[number]>, false>;

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

export type UpdateOption<State, Notifier extends boolean = true> = {
  unsubscriber(slices: Array<keyof State>): void;
  setSlicePart(parts: Partial<State>): void;
  getSlicePart(): Partial<State> | null;
} & (Notifier extends true ? VisibelNotifier : {});

interface VisibelNotifier {
  notifyListener(): void;
}

export type ItemKeys<State> = Array<keyof State>;