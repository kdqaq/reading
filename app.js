import { decodeText } from './lib/decode-text.js';
import { paginate } from './lib/paginate.js';

const $ = (sel) => document.querySelector(sel);

const bookshelfEl = $('#bookshelf');
const tocViewEl = $('#toc-view');
const readerEl = $('#reader');
const bookListEl = $('#book-list');
const tocListEl = $('#toc-list');
const tocTitleEl = $('#toc-title');
const bookTitleEl = $('#book-title');
const pageIndicatorEl = $('#page-indicator');
const pageContentEl = $('#page-content');
const btnBack = $('#btn-back');
const btnTocBack = $('#btn-toc-back');
const btnPrev = $('#btn-prev');
const btnNext = $('#btn-next');
const btnFontMinus = $('#btn-font-minus');
const btnFontPlus = $('#btn-font-plus');
const btnTheme = $('#btn-theme');

let books = [];
let currentBook = null;   // 当前打开的书 { title, file | toc }
let currentToc = null;    // 目录书的目录对象
let lines = [];           // 当前章按行切分
let lineHeights = [];     // 每行实测高度
let pages = [];           // 页分组（每页是行下标的数组）
let currentPage = 0;
let fontSize = 20;
let lastWheelPageAt = 0;

// —— 视图切换 ——
function showView(view) {
  bookshelfEl.classList.add('hidden');
  tocViewEl.classList.add('hidden');
  readerEl.classList.add('hidden');
  view.classList.remove('hidden');
}

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

// —— 打开书：目录书先显示目录，单文件书直接阅读 ——
async function openBook(book) {
  currentBook = book;
  if (book.toc) {
    await openToc(book);
  } else {
    await openChapter({ title: book.title, file: book.file });
  }
}

async function openToc(book) {
  try {
    const res = await fetch(book.toc);
    if (!res.ok) throw new Error(res.status);
    currentToc = await res.json();
    renderToc();
    showView(tocViewEl);
  } catch {
    alert('目录加载失败：' + book.title);
  }
}

function renderToc() {
  tocTitleEl.textContent = currentToc.title || currentBook.title;
  tocListEl.innerHTML = '';
  for (const vol of currentToc.volumes) {
    const volEl = document.createElement('div');
    volEl.className = 'toc-volume';
    const volTitle = document.createElement('div');
    volTitle.className = 'toc-volume-title';
    volTitle.textContent = vol.title;
    volEl.append(volTitle);
    for (const ch of vol.chapters) {
      const chEl = document.createElement('div');
      chEl.className = 'toc-chapter';
      chEl.textContent = ch.title;
      chEl.addEventListener('click', () => openChapter(ch));
      volEl.append(chEl);
    }
    tocListEl.append(volEl);
  }
}

// —— 阅读 ——
async function openChapter(ch) {
  try {
    const res = await fetch(ch.file);
    if (!res.ok) throw new Error(res.status);
    const buf = await res.arrayBuffer();
    const text = decodeText(buf);
    lines = text.split('\n');
    currentPage = 0;
    bookTitleEl.textContent = ch.title;
    showView(readerEl);
    measureAndPaginate();
    renderPage();
  } catch {
    alert('章节加载失败：' + ch.title);
  }
}

function backToShelf() {
  showView(bookshelfEl);
}

function onReaderBack() {
  // 阅读视图返回：目录书回到目录，单文件书回到书架
  if (currentBook && currentBook.toc) showView(tocViewEl);
  else showView(bookshelfEl);
}

function measureAndPaginate() {
  // 用隐藏容器测量每行在正文内容区宽度下的实际显示高度
  const measurer = document.createElement('div');
  const cs = getComputedStyle(pageContentEl);
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  measurer.style.font = cs.font;
  measurer.style.lineHeight = cs.lineHeight;
  measurer.style.letterSpacing = cs.letterSpacing;
  measurer.style.whiteSpace = 'pre-wrap';
  measurer.style.wordBreak = 'break-word';
  measurer.style.width = (pageContentEl.clientWidth - padX) + 'px';
  measurer.style.visibility = 'hidden';
  measurer.style.position = 'absolute';
  measurer.style.left = '-9999px';
  document.body.append(measurer);

  lineHeights = lines.map((line) => {
    measurer.textContent = line === '' ? ' ' : line;
    return measurer.offsetHeight;
  });
  measurer.remove();

  const pageHeight = pageContentEl.clientHeight - padY;
  pages = paginate(lines, (_line, i) => lineHeights[i], pageHeight);
  if (pages.length === 0) pages = [[]];
  currentPage = Math.min(currentPage, pages.length - 1);
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
btnBack.addEventListener('click', onReaderBack);
btnTocBack.addEventListener('click', backToShelf);
btnNext.addEventListener('click', nextPage);
btnPrev.addEventListener('click', prevPage);
btnFontPlus.addEventListener('click', () => changeFont(2));
btnFontMinus.addEventListener('click', () => changeFont(-2));
btnTheme.addEventListener('click', toggleTheme);
readerEl.addEventListener('wheel', (e) => {
  if (e.deltaY === 0) return;

  // 阅读器以分页呈现，避免浏览器同时滚动整个页面。
  e.preventDefault();

  // 一次滚轮操作可能触发多个 wheel 事件；短暂节流避免连续翻页。
  const now = Date.now();
  if (now - lastWheelPageAt < 300) return;
  lastWheelPageAt = now;

  if (e.deltaY > 0) nextPage();
  else prevPage();
}, { passive: false });
document.addEventListener('keydown', (e) => {
  if (readerEl.classList.contains('hidden')) return;
  if (e.key === 'ArrowRight') nextPage();
  else if (e.key === 'ArrowLeft') prevPage();
  else if (e.key === 'Escape') onReaderBack();
});
window.addEventListener('resize', () => {
  if (!readerEl.classList.contains('hidden')) {
    measureAndPaginate();
    renderPage();
  }
});

// —— 启动 ——
loadBooks();
