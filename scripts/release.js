import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const libDir = resolve('packages/lib');
const rootReadme = resolve('README.md');
const packageReadme = resolve(libDir, 'README.md');

console.log('Building library...');
const buildRes = spawnSync('pnpm', ['turbo', 'run', 'build', '--filter=aura-ai-chat'], {
  stdio: 'inherit',
  shell: true,
});

if (buildRes.status !== 0) {
  console.error('Build failed!');
  process.exit(1);
}

console.log('Syncing root README into packages/lib for publish...');
copyFileSync(rootReadme, packageReadme);

let publishStatus = 0;

try {
  console.log('Publishing library...');
  const publishRes = spawnSync('npm', ['publish'], {
    stdio: 'inherit',
    cwd: libDir,
    shell: true,
  });
  publishStatus = publishRes.status ?? 1;
} finally {
  if (existsSync(packageReadme)) {
    rmSync(packageReadme, { force: true });
  }
}

if (publishStatus !== 0) {
  console.error('Publish failed!');
  process.exit(1);
}
