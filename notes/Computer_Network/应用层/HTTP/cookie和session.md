[toc]
 


## 1. cookie+session工作机制

浏览器访问服务端，
服务端生成session代表会话，生成sessionid标识这个会话并把sessionid设置到cookie中返回给浏览器
浏览器每次访问服务器都会带上cookie，其中有sessionid
服务器拿到sessionid后就能知道是哪个用户访问的

## 2. cookie vs session
|     |  cookie   | session    |
| --- | --- | --- |
|   位置  |   保存在浏览器  |  保存在服务器   |
|  格式   |    文本文件 |  内存   |


## 3. 参考
- [HTTP是一个无状态的协议。这句话里的无状态是什么意思？ \- 知乎](https://www.zhihu.com/question/23202402)
- [COOKIE和SESSION有什么区别？ \- 知乎](https://www.zhihu.com/question/19786827)
- [禁止了浏览器 cookie，session 还可以用吗？ \- 知乎](https://www.zhihu.com/question/35307626)
- [HTTP cookies 详解 \- 云\+社区 \- 腾讯云](https://cloud.tencent.com/developer/article/1116298)