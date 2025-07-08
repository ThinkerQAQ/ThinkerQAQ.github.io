## 1. 什么是开放接口
一般的API只对内部系统开放
而开放API则是对外部系统开放，其他系统或者软件可以调用这个API获取本系统的数据

## 2. 如何设计开放接口
### 2.1. 安全问题
对于开放接口，主要面临3个安全问题：

- 请求身份是否可信任--认证
- 请求的参数是否被篡改--签名
- 请求是否唯一--防止重放攻击

#### 2.1.1. 认证
- 用于解决身份信任问题
- 线下下发appid+secret给第三方
- 通过appid+secret换取token，之后接口请求通过token认证
    - 使用token的原因在于让用户暴露的明文密码次数越少越好

#### 2.1.2. 签名
- 用于防止参数篡改
- 过程
    1. 对于sign之外的所有参数按照参数名升序排序
    2. 排序后的参数列表组合成`key1=value1&key2=value2…`的字符串, 
    3. MD5计算sign


#### 2.1.3. 防止重放攻击
- timestamp+nonce
    - timestamp一般表示参数在15分钟内有效
    - nonce指唯一的随机字符串，用来标识每个被签名的请求。通过为每个请求提供一个唯一的标识符，服务器能够防止请求被多次使用
    - 为了防止这两个参数被篡改需要加入参数签名
- 也可以只用nonce+redis expire

### 2.2. 限流
- 计数器
- 漏桶
- 令牌桶

[如何设计一个限流系统.md](如何设计一个限流系统.md)
### 2.3. IP白名单
- 对接入方的IP使用白名单进行控制
## 3. 例子
### 3.1. 腾讯云人脸核身实例
- 获取参数

    ```go
    // 使用app_id、secret请求腾讯云获取access_token
    // 使用app_id、access_token、user_id请求腾讯云获取NONCE ticket
    // 获取32位随机数
    // 使用app_id、user_id、NONCE ticket、随机数+签名算法获取SIGN
    // 通过Redis自增生成orderNo
    // 记录uid和orderNo到redis
    // 使用app_id、orderNo、姓名、身份证号码、user_id、SIGN请求腾讯云获取faceId

    ```

- 获取认证结果

    ```go

    // 使用app_id、secret请求腾讯云获取access_token
    // 使用app_id、access_token、user_id请求腾讯云获取SIGN ticket
    // 获取32位随机数
    // 使用app_id、user_id、SIGN ticket、随机数+签名算法获取SIGN
    // 使用app_id、nonce、order_no、sign从腾讯云获取认证结果

    ```
## 4. 参考
- [开放API接口签名验证，让你的接口从此不再裸奔 \- 知乎](https://zhuanlan.zhihu.com/p/220033777)
- [开放API接口验证机制设计与应用](https://juejin.cn/post/6844903665384292366)
- [开放平台的运营模式到底是什么样的？ \- 知乎](https://www.zhihu.com/question/19966005)