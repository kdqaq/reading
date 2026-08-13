# 读书阅读网站 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一个部署在 GitHub Pages 上的纯静态读书网站，任何人都能访问并分页阅读书籍（txt 由用户放进 `books/` 目录）。

**Architecture:** 纯静态 HTML/CSS/JS，零后端、零框架、零依赖。书籍清单 `books.json` 由脚本扫描 `books/` 自动生成；前端 fetch 清单与 txt 内容，用 `lib/paginate.js` 做分页、`lib/decode-text.js` 做中文编码兼容（UTF-8/GBK）。

**Tech Stack:** 原生 HTML/CSS/JS（ES Modules）、Node.js 内置测试（`node --test`）、Node 内置 `http` 模块做本地预览服务器。

---

## 文件结构

```
通用/
├── index.html           单页结构（书架 + 阅读器两个视图）
├── style.css            样式（含深色主题）
├── app.js               主逻辑（渲染、翻页、主题、事件）
├── lib/
│   ├── paginate.js      分页纯函数（可测）
│   └── decode-text.js   编码解码纯函数（可测）
├── tools/
│   ├── scan-books.mjs   扫描 books/ 生成 books.json（可测）
│   └── serve.mjs        本地预览静态服务器
├── test/
│   ├── paginate.test.mjs
│   ├── decode-text.test.mjs
│   └── scan-books.test.mjs
├── books/               用户放置 txt 的目录（含 .gitkeep）
├── books.json           清单（脚本生成，需提交）
├── package.json         type: module + scripts
├── .gitignore
├── deploy.bat           一键扫描+提交+推送
└── README.md            使用说明
```

---

## Task 1: 项目脚手架

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `books/.gitkeep`
- Create: `lib/.gitkeep`
- Create: `test/.gitkeep`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "reading-website",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "scan": "node tools/scan-books.mjs",
    "serve": "node tools/serve.mjs"
  }
}
```

- [ ] **Step 2: 创建 .gitignore**

```gitignore
node_modules/
.DS_Store
Thumbs.db
```

- [ ] **Step 3: 创建占位文件（保证空目录被 git 跟踪）**

Run:
```bash
mkdir -p lib test books
touch lib/.gitkeep test/.gitkeep books/.gitkeep
```

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore: 初始化项目脚手架"
```

---

## Task 2: 分页纯函数 lib/paginate.js

**Files:**
- Create: `test/paginate.test.mjs`
- Create: `lib/paginate.js`

- [ ] **Step 1: 写失败测试**

创建 `test/paginate.test.mjs`：

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginate } from '../lib/paginate.js';

test('正常分页：按高度分组', () => {
  const items = ['a', 'b', 'c', 'd'];
  const pages = paginate(items, () => 3, 6);
  assert.deepEqual(pages, [[0, 1], [2, 3]]);
});

test('空输入返回空数组', () => {
  assert.deepEqual(paginate([], () => 1, 10), []);
});

test('单个 item 超过一页时独占一页', () => {
  const items = ['big', 'small'];
  const measure = (s) => (s === 'big' ? 100 : 1);
  assert.deepEqual(paginate(items, measure, 10), [[0], [1]]);
});

test('刚好填满一页时不切页', () => {
  const items = ['a', 'b'];
  assert.deepEqual(paginate(items, () => 5, 10), [[0, 1]]);
});

test('measure 能拿到下标', () => {
  const items = ['x', 'y', 'z'];
  const seen = [];
  paginate(items, (_item, i) => { seen.push(i); return 1; }, 3);
  assert.deepEqual(seen, [0, 1, 2]);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/paginate.test.mjs`
Expected: FAIL，报错 `Cannot find module '../lib/paginate.js'` 或 `paginate is not a function`

- [ ] **Step 3: 实现最小代码**

创建 `lib/paginate.js`：

```js
// 分页算法：把内容块按高度分组为若干页
// items: 内容块数组（如按行切分的文本行）
// measure: (item, index) => number，返回该块的显示高度
// pageHeight: 单页可用高度
// 返回：二维数组，每个内层数组是该页包含的 item 下标
export function paginate(items, measure, pageHeight) {
  const pages = [];
  let current = [];
  let currentHeight = 0;

  for (let i = 0; i < items.length; i++) {
    const h = measure(items[i], i);
    if (current.length > 0 && currentHeight + h > pageHeight) {
      pages.push(current);
      current = [];
      currentHeight = 0;
    }
    current.push(i);
    currentHeight += h;
  }

  if (current.length > 0) pages.push(current);
  return pages;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test test/paginate.test.mjs`
Expected: PASS（5 个测试全部通过）

- [ ] **Step 5: 提交**

```bash
git add lib/paginate.js test/paginate.test.mjs
git commit -m "feat: 分页纯函数"
```

---

## Task 3: 编码解码纯函数 lib/decode-text.js

**Files:**
- Create: `test/decode-text.test.mjs`
- Create: `lib/decode-text.js`

- [ ] **Step 1: 写失败测试**

创建 `test/decode-text.test.mjs`：

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeText } from '../lib/decode-text.js';

test('UTF-8 文本正确解码', () => {
  const utf8 = new TextEncoder().encode('你好，世界');
  assert.equal(decodeText(utf8), '你好，世界');
});

test('GBK 文本回退解码', () => {
  // "你好" 的 GBK 编码：你 = C4 E3，好 = BA C3
  const gbk = new Uint8Array([0xC4, 0xE3, 0xBA, 0xC3]);
  assert.equal(decodeText(gbk), '你好');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/decode-text.test.mjs`
Expected: FAIL，报错 `Cannot find module '../lib/decode-text.js'`

- [ ] **Step 3: 实现最小代码**

创建 `lib/decode-text.js`：

```js
// 解码 txt 文件内容：优先按 UTF-8 解码，失败则回退 GBK（gb18030）
// 覆盖常见中文 txt 的 UTF-8 与 GBK/GB2312 编码
export function decodeText(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('gb18030').decode(buffer);
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test test/decode-text.test.mjs`
Expected: PASS（2 个测试全部通过）

- [ ] **Step 5: 提交**

```bash
git add lib/decode-text.js test/decode-text.test.mjs
git commit -m "feat: 编码解码（UTF-8/GBK 兼容）"
```

---

## Task 4: 书籍扫描脚本 tools/scan-books.mjs

**Files:**
- Create: `test/scan-books.test.mjs`
- Create: `tools/scan-books.mjs`
- Modify: `books.json`（首次生成）

- [ ] **Step 1: 写失败测试**

创建 `test/scan-books.test.mjs`：

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scanBooks } from '../tools/scan-books.mjs';

test('扫描 books 目录生成清单：过滤非 txt、忽略子目录、大小写后缀', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'scan-test-'));
  try {
    const booksDir = path.join(dir, 'books');
    await mkdir(booksDir);
    await writeFile(path.join(booksDir, '三国演义.txt'), '第一回', 'utf-8');
    await writeFile(path.join(booksDir, '红楼梦.TXT'), '第一回', 'utf-8');
    await writeFile(path.join(booksDir, '说明.md'), '不是 txt', 'utf-8');
    await mkdir(path.join(booksDir, '子目录'));
    await writeFile(path.join(booksDir, '子目录', '忽略.txt'), 'x', 'utf-8');

    const output = path.join(dir, 'books.json');
    const books = await scanBooks(booksDir, output);

    assert.deepEqual(
      new Set(books.map((b) => `${b.title}|${b.file}`)),
      new Set(['三国演义|books/三国演义.txt', '红楼梦|books/红楼梦.TXT'])
    );

    const content = JSON.parse(await readFile(output, 'utf-8'));
    assert.equal(content.length, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test test/scan-books.test.mjs`
Expected: FAIL，报错 `Cannot find module '../tools/scan-books.mjs'`

- [ ] **Step 3: 实现最小代码**

创建 `tools/scan-books.mjs`：

```js
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// 扫描 books 目录，生成书籍清单
// booksDir: books 目录绝对路径
// outputFile: books.json 输出绝对路径
// 返回：书籍数组 [{ title, file }]
export async function scanBooks(booksDir, outputFile) {
  const entries = await readdir(booksDir, { withFileTypes: true });
  const books = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.txt'))
    .map((e) => ({
      title: e.name.replace(/\.txt$/i, ''),
      file: path.posix.join('books', e.name),
    }));
  await writeFile(outputFile, JSON.stringify(books, null, 2) + '\n', 'utf-8');
  return books;
}

// 命令行入口：node tools/scan-books.mjs
const isCli =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  const root = process.cwd();
  scanBooks(path.join(root, 'books'), path.join(root, 'books.json'))
    .then((books) => console.log(`已生成 books.json，共 ${books.length} 本`))
    .catch((err) => {
      console.error('生成失败：', err);
      process.exit(1);
    });
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test test/scan-books.test.mjs`
Expected: PASS（1 个测试通过）

- [ ] **Step 5: 首次生成 books.json**

Run: `npm run scan`
Expected: 输出 `已生成 books.json，共 0 本`（books/ 目前只有 .gitkeep）

- [ ] **Step 6: 提交**

```bash
git add tools/scan-books.mjs test/scan-books.test.mjs books.json
git commit -m "feat: 书籍扫描脚本"
```

---

## Task 5: 页面结构 index.html + 样式 style.css

**Files:**
- Create: `index.html`
- Create: `style.css`

> 注：本任务及 Task 6 为纯前端 UI，不写单元测试，验证方式见 Task 7 的端到端手动验证。

- [ ] **Step 1: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>读书</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- 书架视图 -->
  <section id="bookshelf" class="view">
    <header class="topbar">
      <h1>我的书架</h1>
    </header>
    <div id="book-list" class="book-list"></div>
  </section>

  <!-- 阅读视图 -->
  <section id="reader" class="view hidden">
    <header class="reader-bar">
      <button id="btn-back" class="btn">← 返回</button>
      <span id="book-title" class="book-title"></span>
      <span id="page-indicator" class="page-indicator"></span>
    </header>
    <div id="page-content" class="page-content"></div>
    <footer class="reader-footer">
      <button id="btn-prev" class="btn">上一页</button>
      <button id="btn-next" class="btn">下一页</button>
      <button id="btn-font-minus" class="btn">A-</button>
      <button id="btn-font-plus" class="btn">A+</button>
      <button id="btn-theme" class="btn">深色</button>
    </footer>
  </section>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: 创建 style.css**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #f7f4ef;
  --bg-soft: #ffffff;
  --fg: #2b2b2b;
  --fg-muted: #888;
  --accent: #8a6d4b;
  --border: #e5dfd5;
  --page-max: 720px;
}

body.dark {
  --bg: #1b1b1b;
  --bg-soft: #242424;
  --fg: #d8d8d8;
  --fg-muted: #999;
  --accent: #c9a86a;
  --border: #3a3a3a;
}

body {
  background: var(--bg);
  color: var(--fg);
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.hidden { display: none !important; }

/* 书架 */
.topbar {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.topbar h1 { font-size: 20px; }

.book-list {
  max-width: var(--page-max);
  margin: 0 auto;
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}
.book-card {
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px 12px;
  text-align: center;
  cursor: pointer;
  transition: transform .1s, box-shadow .1s;
}
.book-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, .08);
}
.book-cover {
  width: 56px;
  height: 76px;
  margin: 0 auto 12px;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  border-radius: 4px;
}
.book-name { font-size: 15px; line-height: 1.4; }

/* 阅读器：flex 列布局，正文自动填满剩余高度 */
#reader {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.reader-bar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}
.book-title {
  flex: 1;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.page-indicator { color: var(--fg-muted); font-size: 13px; }

.page-content {
  flex: 1 1 auto;
  max-width: var(--page-max);
  width: 100%;
  margin: 0 auto;
  padding: 32px 24px;
  font-size: 20px;
  line-height: 1.9;
  white-space: pre-wrap;
  word-break: break-word;
  overflow: hidden;
}

.reader-footer {
  flex: 0 0 auto;
  display: flex;
  gap: 10px;
  justify-content: center;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
}

.btn {
  background: var(--bg-soft);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
}
.btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.btn:disabled { opacity: .4; cursor: default; }

.empty {
  text-align: center;
  color: var(--fg-muted);
  padding: 60px 20px;
}
```

- [ ] **Step 3: 提交**

```bash
git add index.html style.css
git commit -m "feat: 页面结构与样式"
```

---

## Task 6: 主逻辑 app.js

**Files:**
- Create: `app.js`

- [ ] **Step 1: 创建 app.js**

```js
import { decodeText } from './lib/decode-text.js';
import { paginate } from './lib/paginate.js';

const $ = (sel) => document.querySelector(sel);

const bookshelfEl = $('#bookshelf');
const readerEl = $('#reader');
const bookListEl = $('#book-list');
const bookTitleEl = $('#book-title');
const pageIndicatorEl = $('#page-indicator');
const pageContentEl = $('#page-content');
const btnBack = $('#btn-back');
const btnPrev = $('#btn-prev');
const btnNext = $('#btn-next');
const btnFontMinus = $('#btn-font-minus');
const btnFontPlus = $('#btn-font-plus');
const btnTheme = $('#btn-theme');

let books = [];
let lines = [];        // 当前书按行切分
let lineHeights = [];  // 每行实测高度
let pages = [];        // 页分组（每页是行下标的数组）
let currentPage = 0;
let fontSize = 20;

// —— 书架 ——
async function loadBooks() {
  try {
    const res = await fetch('books.json');
    if (!res.ok) throw new Error(res.status);
    books = await res.json();
  } catch {
    books = [];
  }
  renderShelf();
}

function renderShelf() {
  bookListEl.innerHTML = '';
  if (books.length === 0) {
    bookListEl.innerHTML =
      '<p class="empty">暂无书籍，请把 txt 放进 books/ 文件夹，然后运行 npm run scan</p>';
    return;
  }
  for (const book of books) {
    const card = document.createElement('div');
    card.className = 'book-card';
    const cover = document.createElement('div');
    cover.className = 'book-cover';
    cover.textContent = (book.title || '书').charAt(0);
    const name = document.createElement('div');
    name.className = 'book-name';
    name.textContent = book.title;
    card.append(cover, name);
    card.addEventListener('click', () => openBook(book));
    bookListEl.append(card);
  }
}

// —— 阅读 ——
async function openBook(book) {
  try {
    const res = await fetch(book.file);
    if (!res.ok) throw new Error(res.status);
    const buf = await res.arrayBuffer();
    const text = decodeText(buf);
    lines = text.split('\n');
    currentPage = 0;
    bookTitleEl.textContent = book.title;
    showReader();
    measureAndPaginate();
    renderPage();
  } catch {
    alert('书籍加载失败：' + book.title);
  }
}

function showReader() {
  bookshelfEl.classList.add('hidden');
  readerEl.classList.remove('hidden');
}

function backToShelf() {
  readerEl.classList.add('hidden');
  bookshelfEl.classList.remove('hidden');
}

function measureAndPaginate() {
  // 用隐藏容器测量每行在正文宽度下的实际显示高度
  const measurer = document.createElement('div');
  const cs = getComputedStyle(pageContentEl);
  measurer.style.font = cs.font;
  measurer.style.lineHeight = cs.lineHeight;
  measurer.style.letterSpacing = cs.letterSpacing;
  measurer.style.whiteSpace = 'pre-wrap';
  measurer.style.wordBreak = 'break-word';
  measurer.style.width = pageContentEl.clientWidth + 'px';
  measurer.style.visibility = 'hidden';
  measurer.style.position = 'absolute';
  measurer.style.left = '-9999px';
  document.body.append(measurer);

  lineHeights = lines.map((line) => {
    measurer.textContent = line === '' ? ' ' : line;
    return measurer.offsetHeight;
  });
  measurer.remove();

  const pageHeight = pageContentEl.clientHeight;
  pages = paginate(lines, (_line, i) => lineHeights[i], pageHeight);
  if (pages.length === 0) pages = [[]];
}

function renderPage() {
  const idxs = pages[currentPage] || [];
  pageContentEl.textContent = idxs.map((i) => lines[i]).join('\n');
  pageIndicatorEl.textContent = `${currentPage + 1} / ${pages.length}`;
  btnPrev.disabled = currentPage === 0;
  btnNext.disabled = currentPage >= pages.length - 1;
}

function nextPage() {
  if (currentPage < pages.length - 1) {
    currentPage++;
    renderPage();
  }
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    renderPage();
  }
}

function changeFont(delta) {
  fontSize = Math.min(36, Math.max(12, fontSize + delta));
  pageContentEl.style.fontSize = fontSize + 'px';
  measureAndPaginate();
  renderPage();
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  btnTheme.textContent = document.body.classList.contains('dark') ? '浅色' : '深色';
}

// —— 事件 ——
btnBack.addEventListener('click', backToShelf);
btnNext.addEventListener('click', nextPage);
btnPrev.addEventListener('click', prevPage);
btnFontPlus.addEventListener('click', () => changeFont(2));
btnFontMinus.addEventListener('click', () => changeFont(-2));
btnTheme.addEventListener('click', toggleTheme);
document.addEventListener('keydown', (e) => {
  if (readerEl.classList.contains('hidden')) return;
  if (e.key === 'ArrowRight') nextPage();
  else if (e.key === 'ArrowLeft') prevPage();
  else if (e.key === 'Escape') backToShelf();
});
window.addEventListener('resize', () => {
  if (!readerEl.classList.contains('hidden')) {
    measureAndPaginate();
    renderPage();
  }
});

// —— 启动 ——
loadBooks();
```

- [ ] **Step 2: 提交**

```bash
git add app.js
git commit -m "feat: 阅读器主逻辑"
```

---

## Task 7: 本地预览服务器 + 端到端验证

**Files:**
- Create: `tools/serve.mjs`

- [ ] **Step 1: 创建 tools/serve.mjs**

```js
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve(process.cwd());
const port = Number(process.env.PORT) || 8000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(
      new URL(req.url, 'http://localhost').pathname
    );
    const relPath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const filePath = resolve(root, relPath);
    if (filePath !== root && !filePath.startsWith(root + sep)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    const data = await readFile(filePath);
    const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

server.listen(port, () => {
  console.log(`本地预览：http://localhost:${port}`);
});
```

- [ ] **Step 2: 提交**

```bash
git add tools/serve.mjs
git commit -m "feat: 本地预览服务器"
```

- [ ] **Step 3: 端到端手动验证**

1. 放一本测试书：创建 `books/测试书.txt`，内容为多段中文（至少 50 行，确保能分多页），保存为 UTF-8。
2. Run: `npm run scan`，Expected: 输出 `共 1 本`
3. 启动服务器 Run: `npm run serve`（保持运行）
4. 浏览器打开 `http://localhost:8000`，逐项检查：
   - [ ] 书架显示「测试书」卡片
   - [ ] 点卡片进入阅读视图，显示书名和 `1 / N` 页码
   - [ ] 点「下一页」/「上一页」翻页，页码变化、正文变化
   - [ ] 按 `→` `←` 翻页，按 `Esc` 返回书架
   - [ ] 点 `A+`/`A-` 字号变化且自动重新分页
   - [ ] 点「深色」切换主题，再点切回
   - [ ] 缩小/放大浏览器窗口，正文重新分页
5. 验证完删除测试书 `books/测试书.txt`，重新 Run: `npm run scan`，Expected: `共 0 本`。

- [ ] **Step 4: 提交（若测试书已清理）**

```bash
git add -A
git commit -m "chore: 清理测试书"
```

---

## Task 8: 一键部署脚本 + 使用说明

**Files:**
- Create: `deploy.bat`
- Create: `README.md`

- [ ] **Step 1: 创建 deploy.bat**

```bat
@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [1/3] 扫描书籍，生成清单...
node tools\scan-books.mjs
if errorlevel 1 goto :err
echo [2/3] 提交到本地仓库...
git add -A
git commit -m "更新书籍"
echo [3/3] 推送到 GitHub...
git push
if errorlevel 1 goto :err
echo 完成！书籍已上线。
pause
exit /b 0
:err
echo 出错了，请检查上面的提示（可能是还没配置远程仓库，见 README）。
pause
exit /b 1
```

- [ ] **Step 2: 创建 README.md**

```markdown
# 读书网站

一个纯静态的读书阅读网站，部署在 GitHub Pages 上，任何人都能访问并阅读书籍。

## 如何加书

1. 把 `.txt` 书籍文件放进 `books/` 文件夹
2. 双击 `deploy.bat`（会自动扫描书籍、生成清单、提交并推送到 GitHub）

完成后，网站网址上就能看到新书。

## 本地预览

```bash
npm run scan    # 生成书籍清单（加书后必做）
npm run serve   # 启动本地服务器
```

然后浏览器打开 http://localhost:8000

## 编码说明

支持 UTF-8 与 GBK 编码的 txt 文件，无需手动转码。

## 首次部署（只需一次）

```bash
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

然后在 GitHub 仓库页：Settings → Pages → Source 选 `main` 分支 → Save。
之后 `deploy.bat` 就能一键推送更新。
```

- [ ] **Step 3: 提交**

```bash
git add deploy.bat README.md
git commit -m "docs: 一键部署脚本与使用说明"
```

---

## Task 9: 部署到 GitHub（需用户配合）

**说明：** 此任务不是代码任务，需要用户提供 GitHub 账号操作，执行阶段与用户交互完成。

- [ ] **Step 1: 创建远程仓库**
  - 方式 A（命令行，若已装 GitHub CLI）：`gh repo create <仓库名> --public --source=. --push`
  - 方式 B（网页）：github.com → New repository → 填仓库名（如 `reading`）→ 不勾选 README → Create

- [ ] **Step 2: 关联并推送**

```bash
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

- [ ] **Step 3: 开启 GitHub Pages**
  网页：仓库 → Settings → Pages → Build and deployment → Source 选 `Deploy from a branch` → Branch 选 `main` → `/ (root)` → Save

- [ ] **Step 4: 确认上线**
  几分钟后访问 `https://<你的用户名>.github.io/<仓库名>/`，确认书架正常显示。

---

## 自审记录

- **Spec 覆盖**：架构（Task 1/5/6）、数据流（Task 6）、书架+阅读组件（Task 5/6）、编码（Task 3）、分页（Task 2/6）、清单脚本（Task 4）、错误处理（Task 6 的 try/catch 与空书架提示）、加书流程（Task 4/8）、部署（Task 9）、默认约定（Task 5/6 的默认浅色主题、文件名作书名）。
- **占位符**：无 TBD/TODO，所有代码步骤含完整代码。
- **类型一致性**：`paginate(items, measure, pageHeight)` 的 `measure(item, index)` 签名在 Task 2 定义、Task 6 使用一致；`decodeText(buffer)` 在 Task 3 定义、Task 6 使用一致；`scanBooks(booksDir, outputFile)` 在 Task 4 定义、测试与 CLI 使用一致。
