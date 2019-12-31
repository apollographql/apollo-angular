import {HttpHeaders} from '@angular/common/http';
import {Operation} from 'apollo-link';

export type Headers = HttpHeaders | {[header: string]: string | string[]};

export type HttpRequestOptions = {
  headers?: Headers;
  withCredentials?: boolean;
  useMultipart?: boolean;
};

export type URIFunction = (operation: Operation) => string;

export type FetchOptions = {
  method?: string;
  uri?: string | URIFunction;
  includeExtensions?: boolean;
  includeQuery?: boolean;
};

export type Options = {} & FetchOptions & HttpRequestOptions;

export type Body = {
  query?: string;
  variables?: Record<string, any>;
  operationName?: string;
  extensions?: Record<string, any>;
};

export type Context = {} & FetchOptions & HttpRequestOptions;

export type Request = {
  method: string;
  url: string;
  body: Body | Body[];
  options: HttpRequestOptions;
};

export type ExtractFiles = (
  body: Body | Body[],
) => {
  clone: Body;
  files: Map<any, any>;
};
