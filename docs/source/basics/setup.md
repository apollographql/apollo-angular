---
title: Setup and options
---

## Installation

The simplest way to get started with Apollo Angular is by running `ng add apollo-angular` command.

## Installation with Angular Schematics

We support `ng-add` command now.

To start using Apollo Angular simply run:

```bash
ng add apollo-angular
```

One thing you need to set is the URL of your GraphQL Server, so open `src/app/graphql.module.ts` and set `uri` variables:

```typescript
const uri = 'https://o5x5jzoo7z.sse.codesandbox.io/graphql'; //our test Graphql Server which returns rates
```

**Done!** You can now create your first query, [**let's go through it together here**](#request-data)

## Installation without Angular Schematics

If you want to setup Apollo without the help of Angular Schematics, first, let's install some packages:

```bash
npm install --save apollo-angular \
  apollo-angular-link-http \
  apollo-link \
  apollo-client \
  apollo-cache-inmemory \
  graphql-tag \
  graphql
```

- `apollo-client`: Where the magic happens
- `apollo-angular`: Bridge between Angular and Apollo Client
- `apollo-cache-inmemory`: Our recommended cache
- `apollo-angular-link-http`: An Apollo Link for remote data fetching
- `graphql`: Second most important package
- `graphql-tag`: Parses your strings to GraphQL documents

The `apollo-client` package requires `AsyncIterable` so make sure your tsconfig.json includes `esnext.asynciterable`:

```json
{
  "compilerOptions": {
    // ...
    "lib": [
      "es2017",
      "dom",
      "esnext.asynciterable"
    ]
  }
}
```

Great, now that you have all the dependencies you need, let's create your first Apollo Client.

In our `app.module.ts` file use `ApolloModule` and `APOLLO_OPTIONS` token to configure Apollo Client:

```ts
import { HttpClientModule } from "@angular/common/http";
import { ApolloModule, APOLLO_OPTIONS } from "apollo-angular";
import { HttpLinkModule, HttpLink } from "apollo-angular-link-http";
import { InMemoryCache } from "apollo-cache-inmemory";

@NgModule({
  imports: [
    BrowserModule,
    HttpClientModule,
    ApolloModule,
    HttpLinkModule
  ],
  providers: [{
    provide: APOLLO_OPTIONS,
    useFactory: (httpLink: HttpLink) => {
      return {
        cache: new InMemoryCache(),
        link: httpLink.create({
          uri: "https://o5x5jzoo7z.sse.codesandbox.io/graphql"
        })
      }
    },
    deps: [HttpLink]
  }],
})
export class AppModule {}
```

Take a closer look what we did there:

1. With `apollo-angular-link-http` and `HttpLink` service we connect our client to an external GraphQL Server
1. Thanks to `apollo-cache-inmemory` and `InMemoryCache` we have a place to store data in
1. `APOLLO_OPTIONS` provides options to Apollo Client

Apollo's HttpLink requires `HttpClient` so that's why we also used `HttpClientModule` from `@angular/common/http`.

### Named clients

It is possible to have several apollo clients in the application, for example pointing to different endpoints.

In our `app.module.ts` file use `ApolloModule` and `APOLLO_OPTIONS` token to configure Apollo Client:

```ts
import { HttpClientModule } from "@angular/common/http";
import { ApolloModule, APOLLO_NAMED_OPTIONS } from "apollo-angular";
import { HttpLinkModule, HttpLink } from "apollo-angular-link-http";
import { InMemoryCache } from "apollo-cache-inmemory";

@NgModule({
  imports: [
    BrowserModule,
    HttpClientModule,
    ApolloModule,
    HttpLinkModule
  ],
  providers: [{
    provide: APOLLO_NAMED_OPTIONS, // <-- Different from standard initialization 
    useFactory: (httpLink: HttpLink) => {
      return {
        newClientName: { // <-- this settings will be saved by name: newClientName 
          cache: new InMemoryCache(),
          link: httpLink.create({
            uri: "https://o5x5jzoo7z.sse.codesandbox.io/graphql"
          })
        }
      }
    },
    deps: [HttpLink]
  }],
})
export class AppModule {}
```
Basic usage

```ts
import { Injectable } from '@angular/core';
import { Apollo, ApolloBase } from 'apollo-angular';

@Injectable()
class ApiService {
  private apollo: ApolloBase;
  constructor(private apolloProvider: Apollo) {
    this.apollo = this.apolloProvider.use('newClientName')
  }
  getData():Observable<ApolloQueryResult>{
  return this.apollo
      .watchQuery({
        query: gql`
          {
            rates(currency: "USD") {
              currency
              rate
            }
          }
        `,
      });
  }
}
```

## Links and Cache

Apollo Client has a pluggable network interface layer, which can let you configure how queries are sent over HTTP, or replace the whole network part with something completely custom, like a websocket transport, mocked server data, or anything else you can imagine.

One Link that you already have in your application is called `apollo-angular-link-http` which uses HTTP to send your queries.

`apollo-cache-inmemory` is the default cache implementation for Apollo Client 2.0. InMemoryCache is a normalized data store that supports all of Apollo Client 1.0’s features without the dependency on Redux.

- [Explore more the Network Layer of Apollo](/basics/network-layer/)
- [Read more about caching](/basics/caching/)

## Request data

Once all is hooked up, you're ready to start requesting data with `Apollo` service!

`Apollo` is an Angular service exported from `apollo-angular` to share GraphQL data with your UI.

First, pass your GraphQL query wrapped in the `gql` function (from `graphql-tag`) to the `query` property in the `Apollo.watchQuery` method, in your component.
The `Apollo` service is a regular angular service that you familiar with, data are being streamed through Observables. Same here.

The `watchQuery` method returns a `QueryRef` object which has the `valueChanges`
property that is an `Observable`.

An object passed through an Observable contains `loading`, `error`, and `data` properties. Apollo Client tracks error and loading state for you, which will be reflected in the `loading` and `error` properties. Once the result of your query comes back, it will be attached to the `data` property.

> It's also possible to fetch data only once. The `query` method of `Apollo` service returns an `Observable` that also resolves with the same result as
> above.

Let's create an `ExchangeRates` component to see the `Apollo` service in action!

### Basic Operations

If you want to see how easy it is to fetch data from a GraphQL server with Apollo, you can use the `query` method. It is as easy as this:

```ts
import {Component, OnInit} from '@angular/core';
import {Apollo} from 'apollo-angular';
import gql from 'graphql-tag';

@Component({
  selector: 'exchange-rates',
  template: `
    <div *ngIf="loading">
      Loading...
    </div>
    <div *ngIf="error">
      Error :(
    </div>
    <div *ngIf="rates">
      <div *ngFor="let rate of rates">
        <p>{{rate.currency}}: {{rate.rate}}</p>
      </div>
    </div>
  `,
})
export class ExchangeRates implements OnInit {
  rates: any[];
  loading = true;
  error: any;

  constructor(private apollo: Apollo) {}

  ngOnInit() {
    this.apollo
      .watchQuery({
        query: gql`
          {
            rates(currency: "USD") {
              currency
              rate
            }
          }
        `,
      })
      .valueChanges.subscribe(result => {
        this.rates = result.data && result.data.rates;
        this.loading = result.loading;
        this.error = result.error;
      });
  }
}
```

Congrats, you just made your first query! 🎉 If you render your `ExchangeRates` component within your `App` component from the previous example, you'll first see a loading indicator and then data on the page once it's ready. Apollo Client automatically caches this data when it comes back from the server, so you won't see a loading indicator if you run the same query twice.

If you'd like to play around with the app we just built, you can view it on [StackBlitz](https://stackblitz.com/edit/basic-apollo-angular-app). Don't stop there! Try building more components with `Apollo` service and experimenting with the concepts you just learned.

## Next steps

Now that you've learned how to fetch data with Apollo Angular, you're ready to dive deeper into creating more complex queries and mutations. After this section, we recommend moving onto:

- [Queries](/basics/queries/): Learn how to fetch queries with arguments and dive deeper into configuration options..
- [Mutations](/basics/mutations/): Learn how to update data with mutations and when you'll need to update the Apollo cache.
