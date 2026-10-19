```bash
# 创建文档
mkdir docs && echo '# Hello GemBook!' > docs/readme.md

# 启动本地服务打开文档站，修改文档后自动刷新
npx gem-book docs

# 指定标题
npx gem-book docs -t MyApp

# 构建网站，输出到 dist/web
npx gem-book build docs

```
