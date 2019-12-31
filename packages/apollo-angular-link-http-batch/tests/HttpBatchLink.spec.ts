import {setupAngular} from './_setup';

import gql from 'graphql-tag';

import {TestBed, inject} from '@angular/core/testing';
import {HttpClientModule, HttpHeaders} from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {execute, ApolloLink, Operation} from 'apollo-link';

import {HttpBatchLink} from '../src/HttpBatchLink';

const noop = () => {
  //
};

describe('HttpBatchLink', () => {
  let httpLink: HttpBatchLink;
  let httpBackend: HttpTestingController;

  beforeAll(() => setupAngular());

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule, HttpClientTestingModule],
      providers: [HttpBatchLink],
    });
  });

  beforeEach(inject(
    [HttpBatchLink, HttpTestingController],
    (_httpLink: HttpBatchLink, _httpBackend: HttpTestingController) => {
      httpLink = _httpLink;
      httpBackend = _httpBackend;
    },
  ));

  afterEach(inject(
    [HttpTestingController],
    (backend: HttpTestingController) => {
      backend.verify();
    },
  ));

  test('should use HttpClient', (done: jest.DoneCallback) => {
    const link = httpLink.create({uri: 'graphql'});
    const op = {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      operationName: 'heroes',
      variables: {},
    };
    const data = {
      heroes: [{name: 'Superman'}],
    };

    execute(link, op).subscribe({
      next: (result: any) => {
        expect(result).toEqual({data});
        done();
      },
      error: () => {
        done.fail('Should not be here');
      },
    });

    setTimeout(() => {
      httpBackend.expectOne('graphql').flush({data});
    }, 50);
  });

  test('should fail on uri as function', (done: jest.DoneCallback) => {
    const link = httpLink.create({
      uri: () => '/graphql',
    });
    const op = {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      operationName: 'heroes',
      variables: {},
    };

    execute(link, op).subscribe({
      next: () => {
        done.fail('Should not be here');
      },
      error: () => {
        done();
      },
    });
  });

  test('should support multiple queries', (done: jest.DoneCallback) => {
    const link = httpLink.create({uri: 'graphql', batchKey: () => 'bachKey'});
    const op1 = {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      operationName: 'heroes-1',
      variables: {},
    };
    const op2 = {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      operationName: 'heroes-2',
      variables: {},
    };

    execute(link, op1).subscribe(noop);
    execute(link, op2).subscribe(noop);

    setTimeout(() => {
      httpBackend.match(req => {
        expect(req.body[0].operationName).toEqual(op1.operationName);
        expect(req.body[1].operationName).toEqual(op2.operationName);
        done();
        return true;
      });
    }, 50);
  });

  test('should send it as JSON with right body and headers', (done: jest.DoneCallback) => {
    const link = httpLink.create({uri: 'graphql'});
    const op = {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      operationName: 'heroes',
      variables: {},
    };

    execute(link, op).subscribe(noop);

    setTimeout(() => {
      httpBackend.match(req => {
        expect(req.body[0].operationName).toEqual(op.operationName);
        expect(req.reportProgress).toEqual(false);
        expect(req.responseType).toEqual('json');
        expect(req.detectContentTypeHeader()).toEqual('application/json');
        done();
        return true;
      });
    }, 50);
  });

  test('should use POST by default', (done: jest.DoneCallback) => {
    const link = httpLink.create({uri: 'graphql'});
    const op = {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      operationName: 'heroes',
      variables: {},
    };

    execute(link, op).subscribe(noop);

    setTimeout(() => {
      httpBackend.match(req => {
        expect(req.method).toEqual('POST');
        expect(req.body[0].operationName).toEqual(op.operationName);
        expect(req.detectContentTypeHeader()).toEqual('application/json');
        done();
        return true;
      });
    }, 50);
  });

  test('should be able to specify any method', (done: jest.DoneCallback) => {
    const link = httpLink.create({
      uri: 'graphql',
      method: 'PUT',
      includeExtensions: true,
    });
    const op = {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      operationName: 'heroes',
      variables: {up: 'dog'},
      extensions: {what: 'what'},
    };

    execute(link, op).subscribe(noop);

    setTimeout(() => {
      httpBackend.match(req => {
        expect(req.method).toEqual('PUT');
        done();
        return true;
      });
    }, 50);
  });

  test('should include extensions if allowed', (done: jest.DoneCallback) => {
    const link = httpLink.create({
      uri: 'graphql',
      includeExtensions: true,
      batchKey: () => 'bachKey',
    });
    const op1 = {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      extensions: {
        fooExt: true,
      },
    };
    const op2 = {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      extensions: {
        fooExt: false,
      },
    };

    execute(link, op1).subscribe(noop);
    execute(link, op2).subscribe(noop);

    setTimeout(() => {
      httpBackend.match(req => {
        expect(req.body[0].extensions.fooExt).toEqual(true);
        expect(req.body[1].extensions.fooExt).toEqual(false);
        done();
        return true;
      });
    }, 50);
  });

  test('should support withCredentials', (done: jest.DoneCallback) => {
    const link = httpLink.create({
      uri: 'graphql',
      withCredentials: true,
    });
    const op = {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
    };

    execute(link, op).subscribe(noop);

    setTimeout(() => {
      httpBackend.match(req => {
        expect(req.withCredentials).toEqual(true);
        done();
        return true;
      });
    }, 50);
  });

  test('should support headers from contructor options', (done: jest.DoneCallback) => {
    const link = httpLink.create({
      uri: 'graphql',
      headers: new HttpHeaders().set('X-Custom-Header', 'foo'),
    });
    const op = {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
    };

    execute(link, op).subscribe(noop);

    setTimeout(() => {
      httpBackend.match(req => {
        expect(req.headers.get('X-Custom-Header')).toEqual('foo');
        done();
        return true;
      });
    }, 50);
  });

  test('should support headers from context', (done: jest.DoneCallback) => {
    const link = httpLink.create({
      uri: 'graphql',
    });
    const op = {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      context: {
        headers: new HttpHeaders().set('X-Custom-Header', 'foo'),
      },
    };

    execute(link, op).subscribe(noop);

    setTimeout(() => {
      httpBackend.match(req => {
        expect(req.headers.get('X-Custom-Header')).toEqual('foo');
        done();
        return true;
      });
    }, 50);
  });

  test('should merge headers from context and contructor options', (done: jest.DoneCallback) => {
    const link = httpLink.create({
      uri: 'graphql',
      headers: new HttpHeaders().set('X-Custom-Foo', 'foo'),
      batchKey: () => 'bachKey',
    });
    const op1 = {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      context: {
        headers: new HttpHeaders().set('X-Custom-Bar', 'bar'),
      },
    };
    const op2 = {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      context: {
        headers: new HttpHeaders().set('X-Custom-Baz', 'baz'),
      },
    };

    execute(link, op1).subscribe(noop);
    execute(link, op2).subscribe(noop);

    setTimeout(() => {
      httpBackend.match(req => {
        expect(req.headers.get('X-Custom-Foo')).toEqual('foo');
        expect(req.headers.get('X-Custom-Bar')).toEqual('bar');
        expect(req.headers.get('X-Custom-Baz')).toEqual('baz');
        done();
        return true;
      });
    }, 50);
  });

  test('should merge headers from context (Headers) and contructor options (HttpHeaders)', (done: jest.DoneCallback) => {
    const link = httpLink.create({
      uri: 'graphql',
      headers: new HttpHeaders().set('X-Custom-Foo', 'foo'),
      batchKey: () => 'bachKey',
    });
    const op1 = {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      context: {
        headers: {
          'X-Custom-Bar': 'bar',
        },
      },
    };
    const op2 = {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      context: {
        headers: new HttpHeaders().set('X-Custom-Baz', 'baz'),
      },
    };

    execute(link, op1).subscribe(noop);
    execute(link, op2).subscribe(noop);

    setTimeout(() => {
      httpBackend.match(req => {
        expect(req.headers.get('X-Custom-Foo')).toEqual('foo');
        expect(req.headers.get('X-Custom-Bar')).toEqual('bar');
        expect(req.headers.get('X-Custom-Baz')).toEqual('baz');
        done();
        return true;
      });
    }, 50);
  });

  test('should support dynamic uri based on context.uri', (done: jest.DoneCallback) => {
    const link = httpLink.create({
      uri: 'graphql',
    });
    const op = {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      context: {
        uri: 'gql',
      },
    };

    execute(link, op).subscribe(noop);

    setTimeout(() => {
      httpBackend.match(req => {
        expect(req.url).toEqual('gql');
        done();
        return true;
      });
    }, 50);
  });

  test('should prioritize context', (done: jest.DoneCallback) => {
    const link = httpLink.create({
      uri: 'graphql',
      method: 'POST',
      includeExtensions: false,
      includeQuery: true,
      withCredentials: true,
      headers: new HttpHeaders().set('X-Custom-Header', 'foo'),
    });
    const op1 = {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      extensions: {
        foo: 'bar',
      },
      context: {
        includeExtensions: true,
        includeQuery: false,
        headers: new HttpHeaders().set('X-Custom-Header', 'bar'),
      },
    };

    execute(link, op1).subscribe(noop);

    setTimeout(() => {
      httpBackend.match(req => {
        // link options should stay untouched
        expect(req.url).toEqual('graphql');
        expect(req.method).toEqual('POST');
        expect(req.withCredentials).toEqual(true);
        // operation #1 options should be overwritten
        expect(req.body[0].extensions).toBeDefined();
        expect(req.body[0].query).not.toBeDefined();
        // operation headers should be prioritized
        expect(req.headers.get('X-Custom-Header')).toEqual('bar');

        done();

        return true;
      });
    }, 50);
  });

  test('allows for not sending the query with the request', (done: jest.DoneCallback) => {
    const middleware = new ApolloLink((op, forward) => {
      op.setContext({
        includeQuery: false,
        includeExtensions: true,
        batchKey: () => 'bachKey',
      });

      if (op.operationName === 'op1') {
        op.extensions.persistedQuery = {hash: 'op1-hash'};
      } else if (op.operationName === 'op2') {
        op.extensions.persistedQuery = {hash: 'op2-hash'};
      }

      return forward(op);
    });

    const link = middleware.concat(
      httpLink.create({
        uri: 'graphql',
        batchKey: () => 'bachKey',
      }),
    );

    execute(link, {
      query: gql`
        query heroes($first: Int!) {
          heroes(first: $first) {
            name
          }
        }
      `,
      variables: {
        first: 5,
      },
      operationName: 'op1',
    }).subscribe(noop);
    execute(link, {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      operationName: 'op2',
    }).subscribe(noop);

    setTimeout(() => {
      httpBackend.match(req => {
        // operation #1
        expect(req.body[0].query).not.toBeDefined();
        expect(req.body[0].extensions).toEqual({
          persistedQuery: {hash: 'op1-hash'},
        });
        // operation #2
        expect(req.body[1].query).not.toBeDefined();
        expect(req.body[1].extensions).toEqual({
          persistedQuery: {hash: 'op2-hash'},
        });

        done();

        return true;
      });
    }, 50);
  });

  test('should make a separate request per each batchKey', (done: jest.DoneCallback) => {
    const link = httpLink.create({
      uri: 'graphql',
      batchKey: (operation: Operation) =>
        operation.getContext().uri || 'graphql',
    });

    execute(link, {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      operationName: 'op1',
    }).subscribe(noop);

    execute(link, {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      operationName: 'op2',
      context: {
        uri: 'gql',
      },
    }).subscribe(noop);

    let calls = 0;

    setTimeout(() => {
      httpBackend.match(req => {
        if (req.body[0].operationName === 'op1') {
          // is operation #1
          // has no operation #2
          expect(req.body[1]).not.toBeDefined();
          calls++;
        } else {
          // is operation #2
          expect(req.body[0].operationName).toEqual('op2');
          // has no operation #1
          expect(req.body[1]).not.toBeDefined();
          calls++;
        }

        if (calls === 2) {
          done();
        }

        return true;
      });
    }, 50);
  });

  test('should batch together only operations with the same options by default', (done: jest.DoneCallback) => {
    const link = httpLink.create({
      uri: 'graphql',
    });

    execute(link, {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      operationName: 'op1',
    }).subscribe(noop);

    execute(link, {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      operationName: 'op2',
      context: {
        uri: 'gql',
      },
    }).subscribe(noop);

    let calls = 0;

    setTimeout(() => {
      httpBackend.match(req => {
        if (req.body[0].operationName === 'op1') {
          // is operation #1
          expect(req.url).toEqual('graphql');
          // has no operation #2
          expect(req.body[1]).not.toBeDefined();
          calls++;
        } else {
          // is operation #2
          expect(req.body[0].operationName).toEqual('op2');
          expect(req.url).toEqual('gql');
          // has no operation #1
          expect(req.body[1]).not.toBeDefined();
          calls++;
        }

        if (calls === 2) {
          done();
        }

        return true;
      });
    }, 50);
  });

  test('should skip batching if requested', (done: jest.DoneCallback) => {
    const link = httpLink.create({
      uri: 'graphql',
    });

    execute(link, {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      operationName: 'op1',
    }).subscribe(noop);

    execute(link, {
      query: gql`
        query heroes {
          heroes {
            name
          }
        }
      `,
      operationName: 'op2',
      context: {
        skipBatching: true,
      },
    }).subscribe(noop);

    let calls = 0;

    setTimeout(() => {
      httpBackend.match(req => {
        if (req.body[0].operationName === 'op1') {
          // is operation #1
          // has no operation #2
          expect(req.body[1]).not.toBeDefined();
          calls++;
        } else {
          // is operation #2
          expect(req.body[0].operationName).toEqual('op2');
          // has no operation #1
          expect(req.body[1]).not.toBeDefined();
          calls++;
        }

        if (calls === 2) {
          done();
        }

        return true;
      });
    }, 50);
  });
});
