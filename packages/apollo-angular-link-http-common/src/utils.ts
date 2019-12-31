import {HttpResponse, HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable} from 'rxjs';

import {Request, Body, ExtractFiles, Headers} from './types';

export const fetch = (
  req: Request,
  httpClient: HttpClient,
  extractFiles: ExtractFiles,
): Observable<HttpResponse<Object>> => {
  const shouldUseBody =
    ['POST', 'PUT', 'PATCH'].indexOf(req.method.toUpperCase()) !== -1;
  const shouldStringify = (param: string) =>
    ['variables', 'extensions'].indexOf(param.toLowerCase()) !== -1;
  const isBatching = (req.body as Body[]).length;
  let shouldUseMultipart = req.options && req.options.useMultipart;
  let multipartInfo: {
    clone: Body;
    files: Map<any, any>;
  };

  if (shouldUseMultipart) {
    if (isBatching) {
      return new Observable(observer =>
        observer.error(
          new Error('File upload is not available when combined with Batching'),
        ),
      );
    }

    if (!shouldUseBody) {
      return new Observable(observer =>
        observer.error(
          new Error('File upload is not available when GET is used'),
        ),
      );
    }

    multipartInfo = extractFiles(req.body);

    shouldUseMultipart = !!multipartInfo.files.size;
  }

  // `body` for some, `params` for others
  let bodyOrParams = {};

  if (isBatching) {
    if (!shouldUseBody) {
      return new Observable(observer =>
        observer.error(new Error('Batching is not available for GET requests')),
      );
    }

    bodyOrParams = {
      body: req.body,
    };
  } else {
    const body = shouldUseMultipart ? multipartInfo!.clone : req.body;

    if (shouldUseBody) {
      bodyOrParams = {
        body,
      };
    } else {
      const params = Object.keys(req.body).reduce((obj: any, param) => {
        const value = (req.body as any)[param];
        obj[param] = shouldStringify(param) ? JSON.stringify(value) : value;
        return obj;
      }, {});

      bodyOrParams = {params: params};
    }
  }

  if (shouldUseMultipart && shouldUseBody) {
    const form = new FormData();

    form.append('operations', JSON.stringify((bodyOrParams as any).body));

    const map: Record<string, any> = {};
    const files = multipartInfo!.files;

    let i = 0;
    files.forEach(paths => {
      map[++i] = paths;
    });

    form.append('map', JSON.stringify(map));

    i = 0;
    files.forEach((_, file) => {
      form.append(++i + '', file, file.name);
    });

    (bodyOrParams as any).body = form;
  }

  // create a request
  return httpClient.request<Object>(req.method, req.url, {
    observe: 'response',
    responseType: 'json',
    reportProgress: false,
    ...bodyOrParams,
    ...req.options,
  });
};

function isHttpHeaders(headers: Headers): headers is HttpHeaders {
  return headers instanceof HttpHeaders;
}

export function ensureHttpHeaders(headers: Headers): HttpHeaders {
  return isHttpHeaders(headers) ? headers : new HttpHeaders(headers);
}

export const mergeHeaders = (
  source: Headers,
  destination: Headers,
): HttpHeaders => {
  if (source && destination) {
    const transformed = {
      destination: ensureHttpHeaders(destination),
      source: ensureHttpHeaders(source),
    };

    const merged = transformed.destination
      .keys()
      .reduce(
        (headers, name) =>
          headers.set(name, transformed.destination.getAll(name)),
        transformed.source,
      );

    return merged;
  }

  return ensureHttpHeaders(destination || source);
};

export function prioritize<T>(...values: T[]): T {
  const picked = values.find(val => typeof val !== 'undefined');

  if (typeof picked === 'undefined') {
    return values[values.length - 1];
  }

  return picked;
}
