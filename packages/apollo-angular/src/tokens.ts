import {InjectionToken} from '@angular/core';
import {ApolloClientOptions} from 'apollo-client';
import {NamedOptions, Flags} from './types';

export const APOLLO_FLAGS = new InjectionToken<Flags>('[apollo-angular] flags');

export const APOLLO_OPTIONS = new InjectionToken<ApolloClientOptions<any>>(
  '[apollo-angular] options',
);

export const APOLLO_NAMED_OPTIONS = new InjectionToken<NamedOptions>(
  '[apollo-angular] named options',
);
