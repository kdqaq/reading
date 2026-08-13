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
