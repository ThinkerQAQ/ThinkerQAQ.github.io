## 1. JWT是什么
- 用户认证成功后，服务器给用户发放的一种token
    - token是一定时间内有效的令牌，表明用户已经认证
## 2. 为什么需要JWT
- 用于跨域认证
    - 所谓跨域认证：指如果一个公司有两个域名A和B，那么用户在A域名认证后，访问B域名不用再次认证了
    - 传统的跨域认证是cookie+session机制，cookie中保存session-id，服务端持久化session
    - 而JWT是客户端方案，所有数据都保存在客户端，每次请求都发回服务器

### 2.1. JWT vs session
- JWT是客户端方案，session是服务端方案
    - 服务端更安全
    - 服务端可以随时吊销session
    - 服务端是有状态的，扩展较麻烦
- JWT是自解释的token
    - 传统的token：资源服务拿到token之后需要向授权服务器发起请求校验token
    - JWT：资源服务拿到token之后，可以自己校验【因为有签名】
## 3. JWT原理
1. 客户端请求服务端认证
2. 服务端认证用户之后，把不敏感的数据写入JWT，返回给客户端
    - JWT结构如下
    ```
    Header.Payload.Signature
    ```
    - Header： 一个 JSON 对象，描述 JWT 的元数据。使用 Base64URL 算法转成字符串。
        ```json
        {
          "alg": "HS256",
          "typ": "JWT"
        }
        ```
    - Payload： 一个 JSON 对象，用来存放实际需要传递的数据。使用 Base64URL 算法转成字符串。
        ```json
        iss (issuer)：签发人
        exp (expiration time)：过期时间
        sub (subject)：主题
        aud (audience)：受众
        nbf (Not Before)：生效时间
        iat (Issued At)：签发时间
        jti (JWT ID)：编号
        ```
    - Signature：对前两部分的签名，防止数据篡改
        ```json
        HMACSHA256(
          base64UrlEncode(header) + "." +
          base64UrlEncode(payload),
          secret)
        ```
3. 客户端请求服务端会带上JWT
4. 服务端从JWT中获取用户数据，而不用去数据库查询用户数据
## 4. 参考
- [JSON Web Token 入门教程 \- 阮一峰的网络日志](http://www.ruanyifeng.com/blog/2018/07/json_web_token-tutorial.html)