import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {
  ApolloLink,
  Observable as LinkObservable,
  Operation,
  FetchResult,
} from 'apollo-link';
import {BatchLink, BatchHandler} from 'apollo-link-batch';
import {print} from 'graphql';
import {
  fetch,
  Body,
  Context,
  Request,
  Options,
  Headers,
  mergeHeaders,
  prioritize,
  ensureHttpHeaders,
} from 'apollo-angular-link-http-common';

import {BatchOptions} from './types';

const defaults = {
  batchInterval: 10,
  batchMax: 10,
  uri: 'graphql',
  method: 'POST',
};

export class HttpBatchLinkHandler extends ApolloLink {
  public batcher: ApolloLink;
  private batchInterval: number;
  private batchMax: number;

  constructor(private httpClient: HttpClient, private options: BatchOptions) {
    super();

    this.batchInterval = options.batchInterval || defaults.batchInterval;
    this.batchMax = options.batchMax || defaults.batchMax;

    const batchHandler: BatchHandler = (operations: Operation[]) => {
      return new LinkObservable((observer: any) => {
        const body = this.createBody(operations);
        const headers = this.createHeaders(operations);
        const {method, uri, withCredentials} = this.createOptions(operations);

        if (typeof uri === 'function') {
          throw new Error(`Option 'uri' is a function, should be a string`);
        }

        const req: Request = {
          method,
          url: uri,
          body: body,
          options: {
            withCredentials,
            headers,
          },
        };

        const sub = fetch(req, this.httpClient, () => {
          throw new Error(
            'File upload is not available when combined with Batching',
          );
        }).subscribe({
          next: result => observer.next(result.body),
          error: err => observer.error(err),
          complete: () => observer.complete(),
        });

        return () => {
          if (!sub.closed) {
            sub.unsubscribe();
          }
        };
      });
    };

    const batchKey =
      options.batchKey ||
      ((operation: Operation) => {
        return this.createBatchKey(operation);
      });

    this.batcher = new BatchLink({
      batchInterval: this.batchInterval,
      batchMax: this.batchMax,
      batchKey,
      batchHandler,
    });
  }

  private createOptions(operations: Operation[]): Options {
    const context: Context = operations[0].getContext();

    return {
      method: prioritize(context.method, this.options.method, defaults.method),
      uri: prioritize(context.uri, this.options.uri, defaults.uri),
      withCredentials: prioritize(
        context.withCredentials,
        this.options.withCredentials,
      ),
    };
  }

  private createBody(operations: Operation[]): Body[] {
    return operations.map(operation => {
      const includeExtensions = prioritize(
        operation.getContext().includeExtensions,
        this.options.includeExtensions,
        false,
      );
      const includeQuery = prioritize(
        operation.getContext().includeQuery,
        this.options.includeQuery,
        true,
      );

      const body: Body = {
        operationName: operation.operationName,
        variables: operation.variables,
      };

      if (includeExtensions) {
        body.extensions = operation.extensions;
      }

      if (includeQuery) {
        body.query = print(operation.query);
      }

      return body;
    });
  }

  private createHeaders(operations: Operation[]): Headers {
    return operations.reduce((headers: Headers, operation: Operation) => {
      return mergeHeaders(headers, operation.getContext().headers);
    }, this.options.headers);
  }

  private createBatchKey(operation: Operation): string {
    const context: Context & {skipBatching?: boolean} = operation.getContext();

    if (context.skipBatching) {
      return Math.random()
        .toString(36)
        .substr(2, 9);
    }

    const httpHeaders = context.headers && ensureHttpHeaders(context.headers);
    const headers =
      httpHeaders && httpHeaders.keys().map((k: string) => httpHeaders.get(k));

    const opts = JSON.stringify({
      includeQuery: context.includeQuery,
      includeExtensions: context.includeExtensions,
      headers,
    });

    return prioritize(context.uri, this.options.uri) + opts;
  }

  public request(op: Operation): LinkObservable<FetchResult> | null {
    return this.batcher.request(op);
  }
}

@Injectable()
export class HttpBatchLink {
  constructor(private httpClient: HttpClient) {}

  public create(options: BatchOptions): HttpBatchLinkHandler {
    return new HttpBatchLinkHandler(this.httpClient, options);
  }
}
