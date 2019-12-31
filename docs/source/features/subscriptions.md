---
title: Subscriptions
---

In addition to fetching data using queries and modifying data using mutations, the GraphQL spec supports a third operation type, called `subscription`.

GraphQL subscriptions are a way to push data from the server to the clients that choose to listen to real time messages from the server. Subscriptions are similar to queries in that they specify a set of fields to be delivered to the client, but instead of immediately returning a single answer, a result is sent every time a particular event happens on the server.

A common use case for subscriptions is notifying the client side about particular events, for example the creation of a new object, updated fields and so on.

## Overview

GraphQL subscriptions have to be defined in the schema, just like queries and mutations:

```ts
type Subscription {
  commentAdded(repoFullName: String!): Comment
}
```

On the client, subscription queries look just like any other kind of operation:

```graphql
subscription onCommentAdded($repoFullName: String!) {
  commentAdded(repoFullName: $repoFullName) {
    id
    content
  }
}
```

The response sent to the client looks as follows:

```json
{
  "data": {
    "commentAdded": {
      "id": "123",
      "content": "Hello!"
    }
  }
}
```

In the above example, the server is written to send a new result every time a comment is added on GitHunt for a specific repository. Note that the code above only defines the GraphQL subscription in the schema. Read [setting up subscriptions on the client](#client-setup) and [setting up GraphQL subscriptions for the server](https://www.apollographql.com/docs/graphql-subscriptions/) to learn how to add subscriptions to your app.

### When to use subscriptions

In most cases, intermittent polling or manual refetching are actually the best way to keep your client up to date. So when is a subscription the best option? Subscriptions are especially useful if:

1. The initial state is large, but the incremental change sets are small. The starting state can be fetched with a query and subsequently updated through a subscription.
1. You care about low-latency updates in the case of specific events, for example in the case of a chat application where users expect to receive new messages in a matter of seconds.

A future version of Apollo or GraphQL might include support for live queries, which would be a low-latency way to replace polling, but at this point general live queries in GraphQL are not yet possible outside of some relatively experimental setups.

## Client setup

The most popular transport for GraphQL subscriptions today is [`subscriptions-transport-ws`](https://github.com/apollographql/subscriptions-transport-ws). This package is maintained by the Apollo community, but can be used with any client or server GraphQL implementation. In this article, we'll explain how to set it up on the client, but you'll also need a server implementation. You can [read about how to use subscriptions with a JavaScript server](https://www.apollographql.com/docs/graphql-subscriptions/setup/), or enjoy subscriptions set up out of the box if you are using a GraphQL backend as a service like [Graphcool](https://www.graph.cool/docs/tutorials/worldchat-subscriptions-example-ui0eizishe/) or [Scaphold](https://scaphold.io/blog/2016/11/09/build-realtime-apps-with-subs.html).

Let's look at how to add support for this transport to Apollo Client.

First, install the WebSocket Apollo Link (`apollo-link-ws`) from npm:

```shell
npm install --save apollo-link-ws
```

Then, initialize a GraphQL subscriptions transport link:

```ts
import {WebSocketLink} from 'apollo-link-ws';

const wsClient = new WebSocketLink({
  uri: `ws://localhost:5000/`,
  options: {
    reconnect: true,
  },
});
```

```ts
import { Apollo } from 'apollo-angular';
import { split } from 'apollo-link';
import { HttpLink } from 'apollo-angular-link-http';
import { WebSocketLink } from 'apollo-link-ws';
import { getMainDefinition } from 'apollo-utilities';

@NgModule({ ... })
class AppModule {
  constructor(
    apollo: Apollo,
    httpLink: HttpLink
  ) {
    // Create an http link:
    const http = httpLink.create({
      uri: 'http://localhost:3000/graphql'
    });

    // Create a WebSocket link:
    const ws = new WebSocketLink({
      uri: `ws://localhost:5000/`,
      options: {
        reconnect: true
      }
    });

    // using the ability to split links, you can send data to each link
    // depending on what kind of operation is being sent
    const link = split(
      // split based on operation type
      ({ query }) => {
        const { kind, operation } = getMainDefinition(query);
        return kind === 'OperationDefinition' && operation === 'subscription';
      },
      ws,
      http,
    );

    apollo.create({
      link,
      // ... options
    });
  }
}
```

Now, queries and mutations will go over HTTP as normal, but subscriptions will be done over the websocket transport.

With GraphQL subscriptions your client will be alerted on push from the server and you should choose the pattern that fits your application the most.

There are two methods

- `subscribe` - use it as a notification and run any logic you want when it fires, for example alerting the user or refetching data
- `subscribeToMore` - use the data sent along with the notification and merge it directly into the store (existing queries are automatically notified)

## subscribe

The `subscribe` is a method to listen to events emitted by the GraphQL API.

```ts
const COMMENTS_SUBSCRIPTION = gql`
    subscription onCommentAdded($repoFullName: String!){
      commentAdded(repoFullName: $repoFullName){
        id
        content
      }
    }
`;

@Component({ ... })
class CommentsComponent {
  subscribeToNewComments(params) {
    this.apollo.subscribe({
      query: COMMENTS_SUBSCRIPTION,
      variables: {
        repoName: params.repoFullName,
      }
    }).subscribe(result => {
      console.log(`There's a new comment available`, result.data.commentAdded)
    });
  }
}
```

Think of it as `watchQuery` but for GraphQL Subscriptions. You start listening for `commentAdded` events and because it's a regular Observable, you can subscribe to it or combine with your application logic.

It's a bit different than `subscribeToMore` because it doesn't require any GraphQL query.

## subscribeToMore

The `subscribeToMore` is a method available on every query in `apollo-angular`. It works just like [`fetchMore`](/features/cache-updates/#incremental-loading-fetchmore), except that the update function gets called every time the subscription returns, instead of only once.

Here is a regular query:

```ts
import { Apollo, QueryRef } from 'apollo-angular';
import { Observable } from 'rxjs';
import gql from 'graphql-tag';

const COMMENT_QUERY = gql`
  query Comment($repoName: String!) {
    entry(repoFullName: $repoName) {
      comments {
        id
        content
      }
    }
  }
`;

@Component({ ... })
class CommentsComponent {
  commentsQuery: QueryRef<any>;
  comments: Observable<any>;
  params: any;

  constructor(apollo: Apollo) {
    this.commentsQuery = apollo.watchQuery({
      query: COMMENT_QUERY,
      variables: {
        repoName: `${params.org}/${params.repoName}`
      }
    });

    this.comments = this.commentsQuery.valueChanges; // async results
  }
}
```

Now, let's add the subscription.

Add a function called `subscribeToNewComments` that will subscribe using `subscribeToMore` and update the query's store with the new data using `updateQuery`.

Note that the `updateQuery` callback must return an object of the same shape as the initial query data, otherwise the new data won't be merged. Here the new comment is pushed in the `comments` list of the `entry`:

```ts
const COMMENTS_SUBSCRIPTION = gql`
    subscription onCommentAdded($repoFullName: String!){
      commentAdded(repoFullName: $repoFullName){
        id
        content
      }
    }
`;

@Component({ ... })
class CommentsComponent {
  commentsQuery: QueryRef<any>;

  // ... it is the same component as one above

  subscribeToNewComments(params) {
    this.commentsQuery.subscribeToMore({
      document: COMMENTS_SUBSCRIPTION,
      variables: {
        repoName: params.repoFullName,
      },
      updateQuery: (prev, {subscriptionData}) => {
        if (!subscriptionData.data) {
          return prev;
        }

        const newFeedItem = subscriptionData.data.commentAdded;

        return {
          ...prev,
          entry: {
            comments: [newFeedItem, ...prev.entry.comments]
          }
        };
      }
    });
  }
}
```

and start the actual subscription by calling the `subscribeToNewComments` function with the subscription variables:

```ts
@Component({ ... })
class CommentsComponent {
  // ... same component as one above

  ngOnInit() {
    this.subscribeToNewComments({
      repoFullName: params.repoFullName,
    });
  }
}
```

## Authentication over WebSocket

In many cases it is necessary to authenticate clients before allowing them to receive subscription results. To do this, the `SubscriptionClient` constructor accepts a `connectionParams` field, which passes a custom object that the server can use to validate the connection before setting up any subscriptions.

```js
import { WebSocketLink } from 'apollo-link-ws';

const wsLink = new WebSocketLink({
  uri: `ws://localhost:5000/`,
  options: {
    reconnect: true,
    connectionParams: {
        authToken: user.authToken,
    },
});
```

> You can use `connectionParams` for anything else you might need, not only authentication, and check its payload on the server side with [SubscriptionsServer](https://www.apollographql.com/docs/graphql-subscriptions/authentication/).
