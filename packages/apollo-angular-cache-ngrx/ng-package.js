const {umdModuleIds} = require('../../ng-package');

module.exports = {
  dest: 'build',
  lib: {
    entryFile: 'src/index.ts',
    flatModuleFile: 'ng.apolloCache.ngrx',
    umdModuleIds,
  },
  whitelistedNonPeerDependencies: ['apollo-cache', 'apollo-cache-inmemory'],
};
