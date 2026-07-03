import { execSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { existsSync, statSync } from 'node:fs';
import { extname } from 'node:path';

const { values } = parseArgs({
  options: {
    force: { type: 'boolean', default: false },
    target: { type: 'string' },
  },
});

const PRETTIER_EXTS = ['js', 'jsx', 'ts', 'tsx', 'json', 'css'];
const JSBEAUTIFY_EXTS = ['html'];
const ALL_EXTS = [...JSBEAUTIFY_EXTS, ...PRETTIER_EXTS];

function buildPathspec(exts) {
  return exts.map((ext) => `*.${ext}`);
}

function parseStatusLine(line) {
  const x = line[0];
  const y = line[1];
  const rest = line.slice(3);

  // 删除的文件：X 或 Y 为 'D' 直接排除
  if (x === 'D' || y === 'D') {
    return null;
  }

  // 重命名/复制：格式为 "old -> new"
  if (x === 'R' || x === 'C') {
    const [oldPath, newPath] = rest.split(' -> ');
    if (!newPath) return rest; // 保险：格式异常时按原样处理

    const oldExt = extname(oldPath);
    const newExt = extname(newPath);

    // 纯移动/重命名（扩展名不变）：忽略
    if (oldExt === newExt) {
      return null;
    }
    // 扩展名变了，按新文件处理
    return newPath;
  }

  return rest;
}

function getChangedFiles() {
  const pathspec = buildPathspec(ALL_EXTS)
    .map((p) => `"${p}"`)
    .join(' ');
  const output = execSync(`git status --porcelain -- ${pathspec}`, {
    encoding: 'utf8',
  });

  if (!output) return [];

  return output
    .split('\n')
    .map((line) => parseStatusLine(line))
    .filter(Boolean);
}

function getAllFiles() {
  const pathspec = buildPathspec(ALL_EXTS)
    .map((p) => `"${p}"`)
    .join(' ');
  const output = execSync(`git ls-files ${pathspec}`, {
    encoding: 'utf8',
  }).trim();
  return output ? output.split('\n') : [];
}

function getTargetFiles(target) {
  if (!existsSync(target)) {
    throw new Error(`目标路径不存在: ${target}`);
  }

  const stat = statSync(target);
  const extPattern = new RegExp(`\\.(${ALL_EXTS.join('|')})$`);

  if (stat.isFile()) {
    if (!extPattern.test(target)) {
      throw new Error(`目标文件不是支持的类型: ${target}`);
    }
    return [target];
  }

  const pathspec = buildPathspec(ALL_EXTS)
    .map((ext) => `"${target}/**/${ext}" "${target}/${ext}"`)
    .join(' ');
  const output = execSync(`git ls-files ${pathspec}`, {
    encoding: 'utf8',
  }).trim();
  return output ? [...new Set(output.split('\n'))] : [];
}

function classifyFiles(files) {
  const jsBeautifyFiles = [];
  const prettierFiles = [];

  for (const file of files) {
    if (JSBEAUTIFY_EXTS.some((ext) => file.endsWith(`.${ext}`))) {
      jsBeautifyFiles.push(file);
    } else if (PRETTIER_EXTS.some((ext) => file.endsWith(`.${ext}`))) {
      prettierFiles.push(file);
    }
  }

  return { jsBeautifyFiles, prettierFiles };
}

function formatWithJSBeautify(files) {
  console.log(`[js-beautify] formatting ${files.length} files`);
  for (const file of files) {
    execSync(`npx js-beautify -r "${file}"`, { stdio: 'inherit' });
  }
}

function formatWithPrettier(files) {
  if (files.length === 0) return;
  const fileArgs = files.map((f) => `"${f}"`).join(' ');
  console.log(`[prettier] formatting ${files.length} files`);
  execSync(`npx prettier --write ${fileArgs}`, { stdio: 'inherit' });
}

function main() {
  let files;

  if (values.target) {
    files = getTargetFiles(values.target);
    console.log(`[target] formatting ${files.length} files`);
  } else if (values.force) {
    files = getAllFiles();
    console.log(`[force] formatting ${files.length} files`);
  } else {
    files = getChangedFiles();
    console.log(`[default] formatting ${files.length} files`);
  }

  if (files.length === 0) {
    console.log('no files to format');
    return;
  }

  const { jsBeautifyFiles, prettierFiles } = classifyFiles(files);

  formatWithJSBeautify(jsBeautifyFiles);
  formatWithPrettier(prettierFiles);
}

main();
