import {NgModule, Optional, SkipSelf, Inject} from '@angular/core';

import {SelectPipe} from './SelectPipe';
import {Flags} from './types';
import {APOLLO_FLAGS} from './tokens';
import {pickFlag} from './utils';

export const DECLARATIONS = [SelectPipe];

@NgModule({
  declarations: DECLARATIONS,
  exports: DECLARATIONS,
})
export class ApolloModule {
  constructor(
    @Optional() @Inject(APOLLO_FLAGS) flags: Flags,
    @Optional() @SkipSelf() alreadyThere: ApolloModule,
  ) {
    const isStrict = pickFlag(flags, 'strict', true);

    if (isStrict && alreadyThere) {
      throw new Error(
        [
          'ApolloModule is already loaded. Import it in the root module only.',
          '\nTo disable strict mode:',
          `
            import { APOLLO_FLAGS } from 'apollo-angular';

            @NgModule({
              providers: [
                {
                  provide: APOLLO_FLAGS,
                  useValue: {
                    strict: false
                  }
                },
              ]
            })
            export class AppModule {}

          `,
        ].join('\n'),
      );
    }
  }
}
