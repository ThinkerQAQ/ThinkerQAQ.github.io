## 1. 是什么
调用远程服务失败，重新调用一次有可能就成功了

## 2. 什么时候需要重试
- 网络错误能重试，逻辑错误没必要
- 当网络错误长时间持续的时候不能使用重试，防止进一步压垮服务
- 不是幂等请求，不能重试

## 3. 重试策略
- 快速失败和重试的权衡
- 如果重试多次之后还是失败，那么不应该继续重试。参考断路器模式
## 4. Golang重试

### 4.1. retry
相当于golang版本的ribbon，定义重试策略


```go
const (
	defaultDelay    = time.Millisecond * 100
	defaultMaxDelay = time.Second * 1
	defaultAttempts = uint(3)
)

// GetRetryOptions 获取重试参数
func GetRetryOptions(ctx context.Context, funcName string) []retry.Option {
	delay := defaultDelay
	maxDelay := defaultMaxDelay
	attempts := defaultAttempts
	deadline, ok := ctx.Deadline()
	//如果上游设置了deadline，那么根据这个deadline来决定重试次数
	if ok {
		remainTime := deadline.Sub(time.Now())
		if remainTime < defaultDelay {
			return []retry.Option{
				retry.Context(ctx),
				retry.Attempts(1),
			}
		}
		attempts = uint(remainTime / defaultDelay)
		maxDelay = remainTime
	}
	return []retry.Option{
		retry.Context(ctx),
		retry.Attempts(attempts),
		retry.Delay(delay),
		retry.MaxDelay(maxDelay),
		retry.RetryIf(func(err error) bool {
			return constant.IsNetworkError(err)
		}),
		retry.OnRetry(func(n uint, err error) {
			log.InfoContextf(ctx, "%s第%v次请求,  err:%v", funcName, n+1,
				err)
			if err != nil {
				metrics.Counter(fmt.Sprintf("%s第%v次请求失败", funcName,
					n+1)).Incr()
			}
		}),
	}
}



const (
	// 成功
	Suc = 0
	// 不可重试
	NonRetry = 1
	// 可重试
	Retry = 2
)

func TestGetRetryOptions(t *testing.T) {
	convey.Convey("Retry", t, func() {
		convey.Convey("【成功】请求一次", func() {
			ctx := trpc.BackgroundContext()
			requestTimes := 0
			err := retry.Do(func() error {
				return logic(ctx, Suc, &requestTimes)
			}, GetRetryOptions(ctx, "logic")...)
			convey.So(requestTimes == 1, convey.ShouldBeTrue)
			convey.So(err, convey.ShouldBeNil)
		})
		convey.Convey("【失败】不可重试错误-只请求一次", func() {
			ctx := trpc.BackgroundContext()
			requestTimes := 0
			err := retry.Do(func() error {
				return logic(ctx, NonRetry, &requestTimes)
			}, GetRetryOptions(ctx, "logic")...)
			convey.So(requestTimes == 1, convey.ShouldBeTrue)
			convey.So(err, convey.ShouldNotBeNil)
		})
		convey.Convey("【失败】可重试错误且上游未设置超时-默认请求3次", func() {
			ctx := trpc.BackgroundContext()
			requestTimes := 0
			err := retry.Do(func() error {
				return logic(ctx, Retry, &requestTimes)
			}, GetRetryOptions(ctx, "logic")...)
			convey.So(requestTimes == 3, convey.ShouldBeTrue)
			convey.So(err, convey.ShouldNotBeNil)
		})
		convey.Convey("【失败】可重试错误且上游设置超时-根据上游时间计算请求次数", func() {
			ctx, cancel := context.WithTimeout(trpc.BackgroundContext(), time.Millisecond*200)
			defer cancel()
			requestTimes := 0
			err := retry.Do(func() error {
				return logic(ctx, Retry, &requestTimes)
			}, GetRetryOptions(ctx, "logic")...)
			convey.So(requestTimes == 2, convey.ShouldBeTrue)
			convey.So(err, convey.ShouldNotBeNil)
		})
		convey.Convey("【失败】可重试错误且上游设置超时-根据上游时间计算请求次数至少一次", func() {
			ctx, cancel := context.WithTimeout(trpc.BackgroundContext(), time.Millisecond*100)
			defer cancel()
			requestTimes := 0
			err := retry.Do(func() error {
				return logic(ctx, Retry, &requestTimes)
			}, GetRetryOptions(ctx, "logic")...)
			convey.So(requestTimes == 1, convey.ShouldBeTrue)
			convey.So(err, convey.ShouldNotBeNil)
		})
		convey.Convey("【失败】可重试错误且上游设置超时-context取消直接返回error请求0次", func() {
			ctx, cancel := context.WithTimeout(trpc.BackgroundContext(), time.Millisecond*100)
			cancel()
			requestTimes := 0
			err := retry.Do(func() error {
				return logic(ctx, Retry, &requestTimes)
			}, GetRetryOptions(ctx, "logic")...)
			convey.So(requestTimes == 0, convey.ShouldBeTrue)
			convey.So(err, convey.ShouldNotBeNil)
		})
	})
}

func logic(ctx context.Context, t int, requestTimes *int) error {
	*requestTimes++
	log.InfoContextf(ctx, "doing logic...")
	switch t {
	case Retry:
		return errs.NewFrameError(errs.RetClientNetErr, "可重试错误")
	case NonRetry:
		return errs.New(-1, "不可重试错误")
	default:
		return nil
	}
}


// IsNetworkError 网络错误
func IsNetworkError(e error) bool {
	if e == nil {
		return false
	}
	var code int
	err, ok := e.(*errs.Error)
	if ok {
		code = errs.Code(err)
	} else {
		code = errors.Code(e)
	}
	return code == errs.RetClientNetErr || code == errs.RetClientTimeout ||
		code == errs.RetClientConnectFail || code == errs.RetServerTimeout || code == errs.RetServerSystemErr
}

```

## 5. 参考
- [avast/retry\-go: Simple golang library for retry mechanism](https://github.com/avast/retry-go)
- [重试机制 \| 大专栏](https://www.dazhuanlan.com/2019/11/23/5dd93d0f774e6/?__cf_chl_jschl_tk__=43a9b3c20549089f40b83db0887ca854a3b432ef-1601005697-0-AbyF84yCPn4uPh87ZyCml_xpT4IhhJDfkZYvaLR6FGhwHeVbKylYrnkK-QixOZVMc5lDdpVln3pMuYDzZempyYPuPloAN8fP_ZNVEgDdaz1PGamLAIvesvkfkkZc5WtPfJGse6Dx9-TaNEb1v3cx26KYVK4qdDCFZ01fMh3ETEgKV9ZmkT-oHQcqKuG7vE_CbtgsZeHAcnxeo1GATeyEwF-kGL4qGlnKV5Rmi_pejtLv0Rv5O6YUghcGYgWyROfVHyxBSu235wCq3wr64XhJ--yHFxRY0ipCtjCvxVZjCE60qWTY5qhtpih7U4JRiJ41yA)