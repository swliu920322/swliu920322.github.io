---
title: "Astro 博客"
description: "Astro blog"
pubDate: "2024-8-19"
postImage: "/post_img.webp"
tags: [ "前端" ]
---

终于把Astro博客雏形和部署弄好了。之前用的ssr方式在deno上部署，对于ssr的理解不深，很难把ssr模式做好，就一直拖着。

### 介绍

Astro 是一个渐进式框架，使用很简单，官网中文翻译的也好。
如果你需要极致性能的，你就可以考虑使用Astro重构。

- 简单易用：会html、js就可以使用
- 群岛架构：性能卓越，就blog而言，比nextjs加载快40%，js包体积小90%(不过nextjs App Router新架构也在做优化)
- UI无关：兼容Vue，React...主流框架
- 内容输出：渲染markdown很容易
- 服务器优先:兼容老设备，更少的js
- 可定制：支持tailwind、MDX等内容

### 基础

- .astro文件分为三部分
    - 服务端js脚本，用--- ---包围，可以导入js、进行js操作，最后值是静态的
    - astro模板，介于html和jsx之间，支持script前端脚本
    - style样式，类似Vue
- .astro 支持嵌套其他UI框架组件，类似React,Vue，如果有客户端操作，需要定义在客户端使用
- 适合内容丰富的网站，包括营销、出版、文档、博客、个人作品、社区和电子商务网站。
- 内容分两部分
  - 一部分是 /src/pages中，对于Astro和md后缀的文件会直接生成路由访问
  - 一部分是 /src/content中，在astro文件中需要通过getCollection来获取,会得到content内部的所有内容
  
### 路由

和nextjs类似，路由匹配会有[file]和[...file]的形式

- file 匹配任何路由 特定路由 /blog.astro 匹配/blog
- [file] 匹配任何路由 /\*.astro 匹配 /*
- [...file]通用匹配 /*.astro, /\*/\*.astro 都可以匹配

### 什么时候使用
理论上来说，所有网站都适合，因为网站无非就是静态+动态，静态的优化ssr更适合，动态的适合将js包单独拎出来按需加载。
传统SPA方式是可以通过懒加载、按需加载等方式来减少js包，而且框架层面的优化也很多，毕竟是要计算的。
nextjs 的RSC方式也开始做这种优化了，这是一个ssr框架发展的趋势。

### 文档
[Astro官方文档](https://astro.build/)