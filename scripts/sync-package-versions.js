import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const libPackagePath = resolve(repoRoot, 'packages/lib/package.json');
const streamlitPackagePath = resolve(repoRoot, 'packages/aura-streamlit/package.json');
const streamlitPyprojectPath = resolve(repoRoot, 'packages/aura-streamlit/pyproject.toml');
const streamlitInitPath = resolve(
  repoRoot,
  'packages/aura-streamlit/src/aura_streamlit/__init__.py',
);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function replaceVersion(path, pattern, version) {
  const source = readFileSync(path, 'utf8');
  const matched = source.match(pattern);

  if (!matched) {
    throw new Error(`Could not update version in ${path}`);
  }

  const next = source.replace(pattern, `$1${version}$3`);
  writeFileSync(path, next, 'utf8');
}

const libPackage = readJson(libPackagePath);
const version = libPackage.version;

if (!version) {
  throw new Error('packages/lib/package.json is missing a version');
}

const streamlitPackage = readJson(streamlitPackagePath);
if (streamlitPackage.version !== version) {
  streamlitPackage.version = version;
  writeJson(streamlitPackagePath, streamlitPackage);
}

replaceVersion(
  streamlitPyprojectPath,
  /(version\s*=\s*")([^"]+)(")/,
  version,
);

replaceVersion(
  streamlitInitPath,
  /(__version__\s*=\s*")([^"]+)(")/,
  version,
);

console.log(`Synced aura-streamlit package versions to ${version}`);
