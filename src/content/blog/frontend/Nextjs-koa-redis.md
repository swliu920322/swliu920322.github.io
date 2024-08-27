---
title: "Nextjs(App Router) + tailwind"
description: "nextjs项目学习"
pubDate: "2024-8-26"
postImage: "/nextjs.png"
tags: [ "前端" ]
---

最近跟着做了一个Nextjs + koa + redis的项目，nextjs和5年前比变化很大。

- 新增AppRouter架构，通过React Server Component,性能更强了
- 增加了Route的API处理方式，可以在Router Handle做请求中间件
- koa早期处理数据库redis访问和前端请求代理加授权。现在直接在Router Handle中做。
- redis通过库来配合session自动处理，只存用户信息和授权数据，现在使用服务端cookie。
  因为视频内容是5年前的，nextjs变化很大，新的架构性能很很快。

## 项目部署地址 https://next-github-pied.vercel.app/  

## 介绍

Nextjs是React的一个SSR框架，新升级了App router模式通过RSC进一步做了js加载的优化。

主要就是将RSC组件拆出js bundle，然后传输html，js，css，先将html，css传输给浏览器渲染，等待js传输后，注水使页面可交互。

极大的减少了js传递体积，从而优化了性能。


## 开发遇到的坑

由于nextjs 区分 server component 和 client component。很多方法服务端可以用，客户端不能用。

传统的开发方式思路比较同意，用hooks解决。但是新架构提倡的是尽可能减少js，来加速渲染

顺便将router部分翻译了一遍。

### 报错
对原来纯use client的改造时发现大量报错，核心是需要考虑如何匹配App router。

### 服务端

服务端组件分为两种，一种是layout，一种是page

#### Layout
layout本身是共享页面，所以不接受任何可变化的内容，通常做为静态页面渲染。
- 不接受 searchParams pathname，所以也不能传给子组件。
  - 通常有共享交互组件如Search，需要标记为client组件来进行处理。
#### Page(RSC)
服务端组件核心就是做静态渲染，将客户端功能拆出来。

- 可以用 动态方法会导入进入动态渲染
    - cookies
    - headers
    - searchParams prop属性
    - unstable_noStore()
    - unstable_after():
    - 做一些静态数据来渲染页面
    - fetch API
    - orm 或 database
    - Route Handle
    - 其他的网络请求库
    - Suspense来做顺序渲染，对于useSearchParams需要包裹防止整页变成客户端渲染
    - preload 预先触发方法，就是提前调用服务端的加载方法，再在return 时渲染出来
- 不能用
    - useState
    - useEffect
    - 传递方法给客户端(可以传递Server Action)

#### RCC client Component
就是正常的React 文件，常用的都可以
- 不能用
  - 访问cookie header什么
- 可以用
  - 可以从RSC 组件接受Server Action来优化请求

### 开发心得
- 开发总览
  - RSC的fetch目前是不走middleware的，需要保持和middleware类似的封装
  - 尽可能减少client 组件，影响js包的大小
  - 尽可能使用服务端的Server Action来发起网络请求

- Layout(RSC)
  - 纯静态开发，可以从cookie来取值
- Page(RSC)
  - 纯静态开发，可以从cookie,searchParams取值
  - 可以使用Suspend与fetch请求结合取值
  - 可以传递Server Action给 RCC
- Component(RCC)
  - 对于存在交互内容的组件，使用client组件来解决
  - 客户端组件，使用React特性开发，尽量小
  - 取值有两种
    - 从Page传递Server Action，在本页面用SWR(推荐)
    - 直接使用自己的请求

- Image 代替img渲染，会有更好的性能，可以设置渲染优先级
- 
- Error
  - useSearchParams的client 组件必须包含在Suspense里，不然会导致整个页面变为客户端渲染

### 部署

在 https://vercel.com/ 上可以直接部署

## 总结
做几个页面后很快适应了，最后lighthouse测下来性能也不错，做不同架构的项目，心态一定要转变。
<img src="https://raw.githubusercontent.com/swliu920322/next-github/master/docs/img/index.png">
<img src="https://raw.githubusercontent.com/swliu920322/next-github/master/docs/img/query.png">
<img src="https://raw.githubusercontent.com/swliu920322/next-github/master/docs/img/detail.png">
<img src="https://raw.githubusercontent.com/swliu920322/next-github/master/docs/img/issue.png">

### 参考文档
- nextjs官网 https://nextjs.org/ react ssr库
- tailwindcss官网 https://tailwindcss.com/ 原子化css，易于使用 修改
- koa官网 https://koajs.com/ 轻量的node服务端框架，易于拓展。
- Antd官网 https://ant-design.antgroup.com/index-cn
- prettier官网 https://prettier.io/ 代码美化
- redux官网 https://redux.js.org/ 状态管理，在nextjs提倡模块管理，而不是集中
- swr官网 https://swr.vercel.app/zh-CN 一个react请求渲染库