## 1. 是什么

- 可以简单的使用http.Get、http.Post、http.PostForm，底层调用的都是 `client.Do`
- client是线程安全的
- constant预设了状态码和method
- 使用NewRequest构造Request，这个对象有各种方法可以设置header、param、request body等；使用Client发起请求；返回的是Response，Response有各种属性
## 2. 使用
### 2.1. http builder

```go
package builder

import (
	"bytes"
	"context"
	"net/http"
	"time"
)

const DefaultTimeout = 5

type HttpBuilder struct {
	method      string
	url         string
	headers     map[string]string
	queryParams map[string]string
	body        string
	timeout     int
}

func NewHttpBuilder() *HttpBuilder {
	return &HttpBuilder{
		headers:     make(map[string]string),
		queryParams: make(map[string]string),
	}
}

func (h *HttpBuilder) Method(method string) *HttpBuilder {
	h.method = method
	return h
}

func (h *HttpBuilder) Url(url string) *HttpBuilder {
	h.url = url
	return h
}

func (h *HttpBuilder) QueryParam(key string, value string) *HttpBuilder {
	h.queryParams[key] = value
	return h
}

func (h *HttpBuilder) Body(body string) *HttpBuilder {
	h.body = body
	return h
}

func (h *HttpBuilder) Timeout(timeout int) *HttpBuilder {
	h.timeout = timeout
	return h
}

//构造http client并且请求目标地址
//error不为nil时返回的resposne、CancelFunc在使用完毕后记得用defer释放资源
func (h *HttpBuilder) DoRequest() (*http.Response, context.CancelFunc, error) {
	req, err := http.NewRequest(h.method, h.url, bytes.NewBuffer([]byte(h.body)))
	if err != nil {
		return nil, nil, err
	}

	//组装header
	for k, v := range h.headers {
		req.Header.Set(k, v)
	}

	//组装query params
	query := req.URL.Query()
	for k, v := range h.queryParams {
		query.Add(k, v)
	}
	req.URL.RawQuery = query.Encode()

	//设置timeout
	timeout := DefaultTimeout
	if h.timeout > 0 {
		timeout = h.timeout
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeout)*time.Second)
	req = req.WithContext(ctx)

	//构造client发起请求
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		defer cancel()
		return nil, nil, err
	}

	return resp, cancel, nil
}

```

- 测试

```go
func main() {
	resp, cancel, err := builder.NewHttpBuilder().
		Method(http.MethodGet).
		Url("https://www.baidu.com/s").
		QueryParam("wd", "test").
		DoRequest()
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()
	defer cancel()

	fmt.Println("response Status:", resp.Status)
	fmt.Println("response Headers:", resp.Header)
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		panic(err)
	}
	ioutil.WriteFile("test.html", body, 0644)
}

```

## 3. HTTP原理分析
http.Client包含了Transport，结构如下：
```go
type Transport struct {
```
默认构造的`&http.Client{}`使用的`Transport`是`DefaultTransport`，
```go
var DefaultTransport RoundTripper = &Transport{
	Proxy: ProxyFromEnvironment,
	DialContext: (&net.Dialer{
		Timeout:   30 * time.Second,
		KeepAlive: 30 * time.Second,
		DualStack: true,
	}).DialContext,
	ForceAttemptHTTP2:     true,
	MaxIdleConns:          100,
	IdleConnTimeout:       90 * time.Second,
	TLSHandshakeTimeout:   10 * time.Second,
	ExpectContinueTimeout: 1 * time.Second,
}
```
DisableKeepAlives没有设置，默认为false，表示开启了HTTP KeepAlive。即开启了HTTP长连接
MaxIdleConns为100表示连接池中空闲连接数目最多100个；MaxIdleConnsPerHost为0则默认使用`DefaultMaxIdleConnsPerHost=2`，表示连接池中对每个Host（`IP:Port`）的空闲连接数为2。即开启了HTTP连接池
MaxConnsPerHost为0表示连接数无限制。即发起新的HTTP Request如果没有空闲连接，那么创建新的连接，高并发下会出现TIME_WAIT
像trpc的http client使用的transport是这样的
```go
var StdHTTPTransport = &stdhttp.Transport{
	Proxy: stdhttp.ProxyFromEnvironment,
	DialContext: (&net.Dialer{
		Timeout:   30 * time.Second,
		KeepAlive: 30 * time.Second,
		DualStack: true,
	}).DialContext,
	ForceAttemptHTTP2:     true,
	MaxIdleConns:          200,
	IdleConnTimeout:       90 * time.Second,
	TLSHandshakeTimeout:   10 * time.Second,
	MaxIdleConnsPerHost:   100,
	MaxConnsPerHost:       200,
	ExpectContinueTimeout: time.Second,
}
```
HTTP连接池和HTTP长连接是不同的概念
HTTP长链接指的是HTTP Request和HTTP SubRequest复用同一个TCP连接
HTTP连接池指的是把HTTP连接放入连接池中复用，这个连接只能是长连接，原因在于短连接用完就关闭了底层的TCP Connection，然后放进池子，再从池子中取的就是关闭了的Connection，根本用不了。所以只能把HTTP长连接放入连接池中复用
## 4. 参考
- [http \- The Go Programming Language](https://golang.org/pkg/net/http/)
- [Golang 你一定要懂的连接池 \- SegmentFault 思否](https://segmentfault.com/a/1190000023676010)
- [HTTP短连接连接池？ · Issue \#6 · swlib/saber · GitHub](https://github.com/swlib/saber/issues/6)
- [实验说明 Golang HTTP 连接池参数](https://xujiahua.github.io/posts/20200723-golang-http-reuse/#%e6%80%bb%e7%bb%93)