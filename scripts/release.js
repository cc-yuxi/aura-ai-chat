import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const libDir = resolve('packages/lib');
const streamlitDir = resolve('packages/aura-streamlit');
const rootReadme = resolve('README.md');
const packageReadme = resolve(libDir, 'README.md');
const streamlitDistDir = resolve(streamlitDir, 'dist');
const syncScript = resolve('scripts/sync-package-versions.js');

function run(command, args, options = {}) {
  const res = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    ...options,
  });

  if (res.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with status ${res.status ?? 1}`);
  }
}

console.log('Syncing package versions...');
run('node', [syncScript]);

console.log('Building publish artifacts...');
run('pnpm', ['run', 'build']);

console.log('Syncing root README into packages/lib for publish...');
copyFileSync(rootReadme, packageReadme);

try {
  console.log('Ensuring Python packaging tools are available...');
  run('python', [
    '-m',
    'pip',
    'install',
    '--disable-pip-version-check',
    '--upgrade',
    'build',
    'twine',
  ]);

  if (existsSync(streamlitDistDir)) {
    rmSync(streamlitDistDir, { recursive: true, force: true });
  }

  console.log('Building aura-streamlit distributions...');
  run('python', ['-m', 'build'], { cwd: streamlitDir });

  console.log('Publishing library...');
  run('npm', ['publish'], { cwd: libDir });

  console.log('Publishing aura-streamlit...');
  run('python', ['-m', 'twine', 'upload', 'dist/*'], { cwd: streamlitDir });
} catch (error) {
  console.error('Publish failed!');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  if (existsSync(packageReadme)) {
    rmSync(packageReadme, { force: true });
  }
}
