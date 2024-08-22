---
title: "Nextjs+koa+redis"
description: "nextjs项目学习"
pubDate: "2024-7-12"
heroImage: "/post_img.webp"
tags: [ "前端" ]
---

上个月跟着做了一个Nextjs + koa + redis的项目，和5年前比变化很大。

- 新增AppRouter架构，通过React Server Component,性能更强了
- 增加了Route的API处理方式，偏向全栈框架了。
- koa早期处理数据库redis访问和前端请求代理加授权。
- redis通过库来配合session自动处理，只存用户信息和授权数据
  因为视频内容是5年前的，nextjs变化很大，新的架构性能很很快。

### 介绍

Nextjs是React的一个SSR框架，新升级了App router模式通过RSC进一步做了js加载的优化。
主要就是将RSC组件拆出js bundle，然后传输html，js，css，先将html，css传输给浏览器渲染，等待js传输后，注水使页面可交互。
极大的减少了js传递体积，从而优化了性能。

### App router的不同

特定文件名

- layout.tsx 布局文件，路由跳转时会重用，
- page.tsx 页面文件
- loading.tsx 加载时UI渲染
- not-found.tsx 找不到时渲染
- error.tsx 错误时的渲染，找不到向上寻找
- global-error.tsx 根级错误渲染
- route.ts Api接口层
- template.tsx 与布局相关，但每次会重新生成实例
- default.tsx 对于平行页面找不到的时候默认的fallback 页面
  所有其他的文件会自动被路由过滤掉，意味着你可以将相关的代码组织起来，便于迁移。

### 开发遇到的坑

由于nextjs 区分 server component 和 client component,很多方法服务端可以用，客户端不能用
传统的开发方式就是统一的思路，hooks全部解决，

#### 报错

对原来纯use client的改造时发现大量报错，核心是需要考虑如何匹配App router。

#### 服务端

服务端核心就是做静态渲染，将客户端功能拆出来。

- 可以用 动态方法会导入进入动态渲染
    - cookies
    - headers
    - searchParams prop属性
    - unstable_noStore()
    - unstable_after():
    - 做一些静态数据来渲染页面
    - fetch API
    - orm 或 database
    - route Handle
    - 其他的网络请求库
    - Suspense来做顺序渲染
    - preload 预先触发方法，就是提前调用服务端的加载方法，再在return 时渲染出来
- 不能用
    - useState
    - useEffect
    - 传递方法给客户端

### 参考文档

- nextjs官网 https://nextjs.org/ react ssr库
- tailwindcss官网 https://tailwindcss.com/ 原子化css，易于使用 修改
- koa官网 https://koajs.com/ 轻量的node服务端框架，易于拓展。
- Antd官网 https://ant-design.antgroup.com/index-cn
- prettier官网 https://prettier.io/ 代码美化
- redux官网 https://redux.js.org/ 状态管理，在nextjs提倡模块管理，而不是集中
- swr官网 https://swr.vercel.app/zh-CN 一个react请求渲染库