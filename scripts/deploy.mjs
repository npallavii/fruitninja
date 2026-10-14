// Builds the game and publishes dist/ to the gh-pages branch (served by GitHub Pages).
// Usage: npm run deploy
import { execSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' });
const remote = execSync('git remote get-url origin').toString().trim();
const sha = execSync('git rev-parse --short HEAD').toString().trim();

run('npm run build');
const dir = mkdtempSync(join(tmpdir(), 'fruitopia-pages-'));
cpSync('dist', dir, { recursive: true });
writeFileSync(join(dir, '.nojekyll'), ''); // serve files as-is
run('git init -q -b gh-pages', dir);
run('git add -A', dir);
run(`git -c core.autocrlf=false commit -q -m "Deploy Fruitopia (built from main@${sha})"`, dir);
run(`git push -f ${remote} gh-pages`, dir);
rmSync(dir, { recursive: true, force: true });
console.log('\n✓ Deployed — live in about a minute at your GitHub Pages address.');
