[toc]
## 1. XSS攻击是什么
一种Web攻击
比如用户A输入`<script>alert(1)</script>`，如果后台没有将`<>`转译为`&lt; 和 &gt`的话，用户B打开就会一直弹窗

## 2. 为什么会发生XSS攻击
构成XSS的首要条件是：响应`Content-Type`类型为`text/html`，然后把用户的非法输入当作代码执行。
## 3. 如何防范XSS攻击

1. 方案1：对用户输入的内容进行escape
2. 方案2：`Content-Type`排除`text/html`+`X-Content-Type-Options: nosniff`

## 4. 实例
### 4.1. trpc-go
1. Content-Type排除text/html，这样浏览器就不会以text/html方式来解析response，但是由于部分浏览器有Content-Sniff特性，仍会将该类接口作为HTML页面解析，所以得在http响应时加上header`X-Content-Type-Options: nosniff`
## 5. 参考
- [Cross\-Site Request Forgery\(CSRF\) \- Tutorialspoint](https://www.tutorialspoint.com/security_testing/cross_site_request_forgery.htm)
- [浅谈CSRF攻击方式 \- hyddd \- 博客园](https://www.cnblogs.com/hyddd/archive/2009/04/09/1432744.html)
- [XSS攻击及防御\_高爽\|Coder\-CSDN博客](https://blog.csdn.net/ghsau/article/details/17027893)
- [sunwu51/WebSecurity](https://github.com/sunwu51/WebSecurity)


