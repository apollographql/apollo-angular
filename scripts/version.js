#!/usr/bin/env node

/// @ts-check

const [, , packageName, packageVersion] = process.argv;
const fs = require('fs');
const globby = require('globby');
const {resolve} = require('path');

async function main() {
  const rootPkg = readJSON(resolve(__dirname, '../package.json'));
  const packageDirs = await globby(rootPkg.workspaces, {
    cwd: process.cwd(),
    onlyDirectories: true,
  });

  packageDirs.forEach(updatePkg);

  const schematics = resolve(
    process.cwd(),
    'packages/apollo-angular/schematics/install/index.ts',
  );

  const js = readFile(schematics);
  const R = new RegExp(`'${packageName}': '\\^(\\d+\\.\\d+\\.\\d+)`, 'g');

  writeFile(
    schematics,
    js.replace(R, (all, ver) => all.replace(ver, packageVersion)),
  );
}

/**
 * @param {string} packageDir
 */
function updatePkg(packageDir) {
  const filepath = resolve(packageDir, 'package.json');
  const pkg = readJSON(filepath);

  if (pkg.name === packageName) {
    pkg.version = packageVersion;
  }

  if (pkg.peerDependencies && pkg.peerDependencies[packageName]) {
    pkg.peerDependencies[packageName] = `^${packageVersion}`;
  }

  if (pkg.dependencies && pkg.dependencies[packageName]) {
    pkg.dependencies[packageName] = `~${packageVersion}`;
  }

  writeJSON(filepath, pkg);
}

/**
 * @param {string} filepath
 */
function readFile(filepath) {
  return fs.readFileSync(resolve(__dirname, filepath), {
    encoding: 'utf-8',
  });
}

/**
 * @param {string} filepath
 * @param {string} content
 */
function writeFile(filepath, content) {
  return fs.writeFileSync(resolve(__dirname, filepath), content, {
    encoding: 'utf-8',
  });
}

/**
 * @param {string} filepath
 */
function readJSON(filepath) {
  return JSON.parse(readFile(filepath));
}

/**
 * @param {string} filepath
 * @param {object} data
 */
function writeJSON(filepath, data) {
  return writeFile(filepath, JSON.stringify(data, null, 2));
}

main();
