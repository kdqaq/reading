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
