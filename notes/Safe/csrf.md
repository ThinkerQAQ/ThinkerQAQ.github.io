[toc]
 

## 1. CSRF攻击是什么
一种Web攻击
比如淘宝付款是get请求
用户登陆了淘宝，获取了cookie保存在本地。
用户访问了危险网站，危险网站发送了一个get请求到淘宝付款链接。
浏览器会带上淘宝的cookie去访问淘宝付款链接
ok，最后真的付款了
## 2. 为什么有跨域限制还会发生CSRF
[浏览器同源策略以及跨域.md](../Computer_Network/应用层/HTTP/浏览器同源策略以及跨域.md)
1. 同源策略对cookie的限制只是针对js，不能读写非同源的cookie。但是无论是否同源，浏览器都会带上相应的cookie访问服务器。
2. 同源策略允许跨域提交表单
## 3. 如何防止CSRF攻击
token校验。步骤如下：

1. 前端请求后端
2. 后端生成唯一的token保存起来，并返回给前端，有两种方式
    - 把token渲染到html中。
    - 把token写到cookie中。
3. 前端取出token拼接到请求参数中访问后端，有两种方式
    - js DOM操作取出html中的token（同源策略会限制脚本 API 操作）
    - js读取cookie中的token（同源策略限制 cookie 操作）
4. 后端从请求参数中取出token，检验token一致性



## 4. 实例
### 4.1. trpc-filter-bkn
1. 前端使用js从cookie中读取skey(登录态)，计算g_tk，放入http url参数中
2. 后端从http url参数中取出g_tk，然后从从cookie中读取skey(登录态)，计算g_tk，对比两个g_tk是否一致

可以看出g_tk是每个用户登录周期内是唯一的，但是不是每个请求是唯一的，这个g_tk一旦泄露那么还有有风险的，比如通过referrer外泄，所以得加上以下代码：
```html
<meta name="referrer" content="origin">
```
## 5. 参考
- [Cross\-Site Request Forgery\(CSRF\) \- Tutorialspoint](https://www.tutorialspoint.com/security_testing/cross_site_request_forgery.htm)
- [浅谈CSRF攻击方式 \- hyddd \- 博客园](https://www.cnblogs.com/hyddd/archive/2009/04/09/1432744.html)
- [XSS攻击及防御\_高爽\|Coder\-CSDN博客](https://blog.csdn.net/ghsau/article/details/17027893)
- [关于跨域与 csrf 的那些小事](https://juejin.cn/post/6844903934310498312)
- [浏览器同源策略以及跨域.md](../Computer_Network/应用层/HTTP/浏览器同源策略以及跨域.md)
- [CSRF protection with custom headers \(and without validating token\) \- Information Security Stack Exchange](https://security.stackexchange.com/questions/23371/csrf-protection-with-custom-headers-and-without-validating-token)
- [web application \- Should I use CSRF protection on Rest API endpoints? \- Information Security Stack Exchange](https://security.stackexchange.com/questions/166724/should-i-use-csrf-protection-on-rest-api-endpoints)
- [谈谈Json格式下的CSRF攻击 \- 云\+社区 \- 腾讯云](https://cloud.tencent.com/developer/article/1458194?utm_source=pocket_mylist)
- [tRPC bkn插件，框架级CSRF漏洞对抗机制 \- 安全平台部 \- KM平台](https://km.woa.com/group/11796/articles/show/413805?kmref=search&from_page=1&no=1)

