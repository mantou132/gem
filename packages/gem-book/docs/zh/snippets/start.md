```bash
# 创建文档
mkdir docs && echo '# Hello GemBook!' > docs/readme.md

# 启动本地服务打开文档站，修改文档将自动更新
npx gem-book docs

# 指定标题
npx gem-book docs -t MyApp

# 指定图标
npx gem-book docs -t MyApp -i logo.png

# 将 readme.md/index.md 渲染成文档站首页
npx gem-book docs -t MyApp -i logo.png --home-mode

# 构建前端资源
npx gem-book docs -t MyApp -i logo.png --home-mode --build

```
