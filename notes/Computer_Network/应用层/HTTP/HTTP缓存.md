[toc]

## 1. 什么是HTTP缓存
- 浏览器端的缓存
## 2. 为什么需要HTTP缓存
- HTTP是无状态的，优点在于可扩展，缺点在于需要发送重复数据导致网络性能降低
## 3. HTTP缓存分类

### 3.1. 状态缓存
- 不经过服务器，直接根据缓存信息对目标网络的状态判断
#### 3.1.1. 301/302
- 缺点：通过301/302跳转HTTPS时可能产生的降级中间人劫持
#### 3.1.2. HSTS
### 3.2. 强制缓存
- 不发请求到服务器，因此性能好但是一致性差点
- 在浏览器的地址输入、页面链接跳转、新开窗口、前进和后退中均可生效，但在用户主动刷新页面时应当自动失效
#### 3.2.1. Expires
- HTTP1.0提供的header
    ```http
    Expires: Wed, 8 Apr 2020 07:28:00 GMT
    ```
- 缺点
    - 受限于客户端本地时间
    - 没有不缓存的语义
#### 3.2.2. Cache-Control
- HTTP/1.1提供的header
    ```http
    Cache-Control: max-age=600
    ```
- 如果Expire和Cache-Control冲突，那么以Cache-Control为准
### 3.3. 协商缓存
- 需要发请求给服务器，因此一致性好但是性能低点
- 在浏览器的地址输入、页面链接跳转、新开窗口、前进、后退中生效，而且在用户主动刷新页面（F5）时也同样是生效的，只有用户强制刷新（Ctrl+F5）或者明确禁用缓存（譬如在 DevTools 中设定）时才会失效，此时客户端向服务端发出的请求会自动带有“Cache-Control: no-cache”
#### 3.3.1. Last-Modified 和 If-Modified-Since
- 告诉客户端这个资源的最后修改时间
    ```http
    HTTP/1.1 304 Not Modified
    Cache-Control: public, max-age=600
    Last-Modified: Wed, 8 Apr 2020 15:31:30 GMT
    ```
- 缺点
    - 最后修改只能精确到秒级
#### 3.3.2. Etag 和 If-None-Match
- 用于告诉客户端这个资源的唯一标识
    ```http
    HTTP/1.1 304 Not Modified
    Cache-Control: public, max-age=600
    ETag: "28c3f612-ceb0-4ddc-ae35-791ca840c5fa"
    ```
- 缺点：
    - 性能差，每次需要服务器对资源进行哈希计算

## 4. 协商缓存和强制缓存同时存在的场景
1. 当强制缓存存在时，直接从强制缓存中返回资源，无须进行变动检查；
2. 而当强制缓存超过时效，或者被禁止（no-cache / must-revalidate），协商缓存仍可以正常地工作
- ![1](https://user-images.githubusercontent.com/25027560/38223505-d8ab53da-371d-11e8-9263-79814b6971a5.png)
## 5. 参考
- [你应该知道的浏览器缓存知识 \- 韩小平的博客](https://excaliburhan.com/post/things-you-should-know-about-browser-cache.html)
- [八一八浏览器缓存 // Grey Times](http://kangkona.github.io/818-browser-caching/)
- [浏览器缓存，状态码200与304 \- 简书](https://www.jianshu.com/p/75ff40c61665)
- [如何优雅的谈论HTTP／1\.0／1\.1／2\.0 \- 简书](https://www.jianshu.com/p/52d86558ca57)
- [客户端缓存 \| 凤凰架构](http://icyfenix.cn/architect-perspective/general-architecture/diversion-system/client-cache.html)
- [缓存（二）——浏览器缓存机制：强缓存、协商缓存 · Issue \#41 · amandakelake/blog](https://github.com/amandakelake/blog/issues/41)

