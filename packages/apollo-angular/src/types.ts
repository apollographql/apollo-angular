import {
  WatchQueryOptions as CoreWatchQueryOptions,
  QueryOptions as CoreQueryOptions,
  MutationOptions as CoreMutationOptions,
  SubscriptionOptions as CoreSubscriptionOptions,
  ApolloClientOptions,
} from 'apollo-client';
import {ExecutionResult} from 'graphql';

export type R = {
  [key: string]: any;
};

export interface ExtraSubscriptionOptions {
  useZone?: boolean;
}

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export interface WatchQueryOptionsAlone<V>
  extends Omit<WatchQueryOptions<V>, 'query' | 'variables'> {}

export interface QueryOptionsAlone<V>
  extends Omit<CoreQueryOptions<V>, 'query' | 'variables'> {}

export interface MutationOptionsAlone<T, V>
  extends Omit<CoreMutationOptions<T, V>, 'mutation' | 'variables'> {}

export interface SubscriptionOptionsAlone<V>
  extends Omit<CoreSubscriptionOptions<V>, 'query' | 'variables'> {}

export interface WatchQueryOptions<V> extends CoreWatchQueryOptions<V> {
  /**
   * Observable starts with `{ loading: true }`.
   * There's a big chance the next major version will enable that by default.
   *
   * Disabled by default
   */
  useInitialLoading?: boolean;
}

export interface SubscriptionResult<T> extends ExecutionResult {
  data?: T;
}

export type NamedOptions = Record<string, ApolloClientOptions<any>>;

export type Flags = {
  /**
   * Strict mode makes sure ApolloModule is only imported once
   */
  strict?: boolean;
  /**
   * Observable starts with `{ loading: true }`.
   * There's a big chance the next major version will enable that by default.
   *
   * Disabled by default
   */
  useInitialLoading?: boolean;
};
