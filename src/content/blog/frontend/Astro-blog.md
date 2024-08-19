---
title: "Astro 博客"
description: "Astro blog"
pubDate: "2024-8-19"
heroImage: "/post_img.webp"
tags: [ "前端" ]
---

终于把Astro博客雏形和部署弄好了。之前用的ssr方式在deno上部署，对于ssr的理解不深，很难把ssr模式做好，就一直拖着。

### 介绍

Astro 是一个渐进式框架，使用很简单，官网中文翻译的也好

- 简单易用：会html、js就可以使用
- 群岛架构：性能卓越
- UI无关：兼容Vue，React...主流框架
- 内容输出：渲染markdown很容易
- 服务器优先:兼容老设备，更少的js

### 动态路由

和nextjs类似，路由匹配会有[file]和[...file]的形式

- file 匹配任何路由 特定路由 /blog.astro 匹配/blog
- [file] 匹配任何路由 /\*.astro 匹配 /*
- [...file]通用匹配 /*.astro, /\*/\*.astro 都可以匹配
