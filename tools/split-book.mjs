import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { decodeText } from '../lib/decode-text.js';

const VOL_RE = /^第([一二三四五六七八九十百千]+)卷[：:]\s*(.*)$/;
const CH_RE = /^第([一二三四五六七八九十百千]+)节[：:]\s*(.*)$/;

// 清理文件名中的非法字符
function safeName(s) {
  return s.replace(/[\\/:*?"<>|]/g, '_').trim();
}

// 把一本 txt 按「卷/节」标题拆分成多个章节文件，并生成目录 toc.json
// srcFile: 源 txt 绝对路径
// booksDir: books 目录绝对路径
// bookTitle: 书名（也是输出子目录名）
// 返回：目录对象 { title, volumes: [{ title, chapters: [{ title, file }] }] }
export async function splitBook(srcFile, booksDir, bookTitle) {
  const buf = await readFile(srcFile);
  const text = decodeText(buf);
  const lines = text.split('\n');

  const outDir = path.join(booksDir, bookTitle);
  const filePrefix = path.posix.join('books', bookTitle);

  const volumes = [];
  let currentVolume = null;
  let currentChapter = null;

  const flushChapter = () => {
    if (currentChapter && currentVolume) {
      currentVolume.chapters.push(currentChapter);
      currentChapter = null;
    }
  };
  const flushVolume = () => {
    flushChapter();
    if (currentVolume) {
      volumes.push(currentVolume);
      currentVolume = null;
    }
  };

  for (const line of lines) {
    const volMatch = line.match(VOL_RE);
    const chMatch = line.match(CH_RE);
    if (volMatch) {
      flushVolume();
      currentVolume = { title: line.trim(), chapters: [] };
    } else if (chMatch) {
      flushChapter();
      currentChapter = { title: line.trim(), lines: [] };
    } else if (currentChapter) {
      currentChapter.lines.push(line);
    }
    // 卷标题之后、节标题之前的内容（如分隔线）以及文件开头的杂项，忽略
  }
  flushVolume();

  await mkdir(outDir, { recursive: true });
  const toc = { title: bookTitle, volumes: [] };
  let n = 1;
  for (const vol of volumes) {
    const volEntry = { title: vol.title, chapters: [] };
    for (const ch of vol.chapters) {
      const sub = ch.title.replace(CH_RE, '$2').trim();
      const name = `${String(n).padStart(3, '0')}-${safeName(sub) || '章节'}.txt`;
      const file = path.posix.join(filePrefix, name);
      await writeFile(path.join(outDir, name), ch.lines.join('\n'), 'utf-8');
      volEntry.chapters.push({ title: ch.title, file });
      n++;
    }
    toc.volumes.push(volEntry);
  }

  await writeFile(
    path.join(outDir, 'toc.json'),
    JSON.stringify(toc, null, 2) + '\n',
    'utf-8'
  );
  return toc;
}

// 命令行入口：node tools/split-book.mjs <源文件.txt> <书名>
const isCli =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  const src = process.argv[2];
  const bookTitle = process.argv[3];
  if (!src || !bookTitle) {
    console.error('用法: node tools/split-book.mjs <源文件.txt> <书名>');
    process.exit(1);
  }
  const root = process.cwd();
  splitBook(path.resolve(root, src), path.join(root, 'books'), bookTitle)
    .then((toc) => {
      const total = toc.volumes.reduce((s, v) => s + v.chapters.length, 0);
      console.log(`已拆分《${bookTitle}》为 ${total} 章，共 ${toc.volumes.length} 卷`);
    })
    .catch((err) => {
      console.error('拆分失败：', err);
      process.exit(1);
    });
}
