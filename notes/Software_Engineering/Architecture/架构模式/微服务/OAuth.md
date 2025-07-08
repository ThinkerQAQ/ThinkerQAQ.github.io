## 1. OAuth是什么
- 一种授权协议
- 用来授权第三方应用，获取用户数据。
## 2. 为什么需要OAuth
- 以使用微博登录简书，简书需要用到微博的头像昵称
- 传统的作法是输入微博的用户名+密码获取，这种有几个问题
    - 微博用户名密码暴露给了简书，可能会泄露
    - 只想获取微博头像昵称，但是简书有了微博用户名密码什么都能做
- 于是就有了OAuth
## 3. OAuth流程
![](https://raw.githubusercontent.com/TDoct/images/master/1598181102_20200620201807082_7743.png)

- 在微博账号登录简书的场景中
    - Client就是简书；
    - Resource Owner是用户；
    - Authorization Server是微博的授权服务器；
    - Resource Server是微博的API服务器
- 具体流程如下
    - A：简书请求User授权访问微博
    - B：User同意授权
    - C：简书请求微博颁发access token
    - D：微博返回access token
    - E：简书带上access token访问微博API
    - F：微博API返回头像昵称
### 3.1. OAuth如何解决授权问题
- 如何解决用户名+密码暴露给第三方的问题
    - 通过access token。这种token有效期短，可以随时撤销，且只能访问一部分资源
- 如何解决访问权限过大的问题
    - 通过access token。这种token有效期短，可以随时撤销，且只能访问一部分资源
- 为什么需要用户同意
    - 也许用户突然不想让简书获取微信的个人信息
- 为什么需要访问Authorization Server获取access token
    - 本质就是授权。没有token的话那么其他恶意用户也能获取用户信息了
- Application是怎么获取Resource Server的信息的
    - 通过微博开放API






### 3.2. 颁发Token的模式
就是OAuth流程种的C、D流程

#### 3.2.1. 授权码（authorization-code）
- 第三方应用先申请一个授权码，然后再用该码获取令牌
- 一般前端获取授权码，传递给后台，由后台通过授权码获取令牌
- 适用于由后端的Web场景
- ![](https://www.wangbase.com/blogimg/asset/201904/bg2019040905.jpg)

#### 3.2.2. 隐藏式（implicit）
- 不需要获取授权码，直接返回token给前端
- 适用于纯前端应用，没有后端
- ![](https://www.wangbase.com/blogimg/asset/201904/bg2019040906.jpg)
#### 3.2.3. 密码式（password）
- 把用户名和密码直接告诉第三方引用
- 适用于高度信任的应用
#### 3.2.4. 客户端凭证（client credentials）
适用于没有前端的命令行应用，即在命令行下请求令牌
#### 3.2.5. 模式选型
![](https://raw.githubusercontent.com/TDoct/images/master/1595754598_20200725105437092_1796.png)
### 3.3. 如何更新Token
Token的有效期到了，如何更新？
一种是再走一遍颁发Token的流程
另一种是一次性颁发两个令牌，一个用于获取数据，另一个用于获取新的令牌（refresh token 字段）。令牌到期前，用户使用 refresh token 发一个请求，去更新令牌



### 3.4. scope
[[Article] How to Use OAuth 2.0 Scopes to Provide Role-Based Authorization to APIs Exposed via WSO2 API Manager](https://wso2.com/library/articles/2015/12/article-role-based-access-control-for-apis-exposed-via-wso2-api-manager-using-oauth-2.0-scopes/)
[Role-Based Access Control with OAuth Scopes - WSO2 API Manager Documentation 3.2.0](https://apim.docs.wso2.com/en/3.2.0/learn/api-security/oauth2/oauth2-scopes/fine-grained-access-control-with-oauth-scopes/)
[如何设计权限系统.md](../../../../System_Design/技术组件/如何设计权限系统.md)

## 4. 参考
- [OAuth2\.0简介 — QQ互联WIKI](https://wiki.connect.qq.com/oauth2-0%E7%AE%80%E4%BB%8B)
- [OAuth 2\.0 的一个简单解释 \- 阮一峰的网络日志](http://www.ruanyifeng.com/blog/2019/04/oauth_design.html)
- [OAuth 2\.0 的四种方式 \- 阮一峰的网络日志](https://www.ruanyifeng.com/blog/2019/04/oauth-grant-types.html)
- [理解OAuth 2\.0 \- 阮一峰的网络日志](http://www.ruanyifeng.com/blog/2014/05/oauth_2_0.html)
- [任务7： oAuth2介绍\_哔哩哔哩 \(゜\-゜\)つロ 干杯~\-bilibili](https://www.bilibili.com/video/av455590662/)
- [Spring Security Oauth2\.0认证授权专题\_哔哩哔哩 \(゜\-゜\)つロ 干杯~\-bilibili](https://www.bilibili.com/video/BV14z4y1d7eY?p=29)
- [授权机制说明 \- 微博API](https://open.weibo.com/wiki/%E6%8E%88%E6%9D%83%E6%9C%BA%E5%88%B6%E8%AF%B4%E6%98%8E)
- [OAuth那些事儿 \| 火丁笔记](https://blog.huoding.com/2010/10/10/8)
- [OpenID 和 OAuth 有什么区别？ \- 知乎](https://www.zhihu.com/question/19628327)
- [wx\.login\(Object object\) \| 微信开放文档](https://developers.weixin.qq.com/miniprogram/dev/api/open-api/login/wx.login.html)
- [OAuth 2\.0 — OAuth](https://oauth.net/2/)