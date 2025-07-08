## 1. OpenID Connect是什么

- 一种认证协议
    - OAuth只是用于授权，没有定义认证的规范
- 基于OAuth2
    - 只是多了个标准化的UserInfo Endpoint




## 2. OpenID Connect流程
- 跟[OAuth.md](OAuth.md)一样。
- 区别在于
    - 再在OAuth第一步请求的时候多了一个OpenId
    - 获取access token的时候还获取了ID Token【一般使用JWT格式】

## 3. 参考
- [An Illustrated Guide to OAuth and OpenID Connect \| Okta Developer](https://developer.okta.com/blog/2019/10/21/illustrated-guide-to-oauth-and-oidc)
- [OpenID Connect简介 \- 知乎](https://zhuanlan.zhihu.com/p/95064385)
- [细说API – 认证、授权和凭证 \- 知乎](https://zhuanlan.zhihu.com/p/60522006)
- [OpenID Connect \| OpenID](https://openid.net/connect/)