
## 1. 是什么
- 基于Redis实现的限流
## 2. 计数器算法


### 2.1. 接口
#### 2.1.1. 访问次数加一
- 参数：key
- 返回：
    - 当前访问次数
    - 访问次数重置的剩余时长
#### 2.1.2. 获取当前访问次数
- 参数：key
- 返回：
    - 当前访问次数
    - 访问次数重置的剩余时长
### 2.2. 逻辑

- 访问次数加一
    ```lua
    local freqKey = KEYS[1]
    local freqTTL = tonumber(ARGV[1])

    local function isFreqKeyExists()
      return redis.call("EXISTS", freqKey)
    end

    local function incrFreqCount()
        return redis.call("INCR", freqKey)
    end

    local function getFreqTTL()
        return redis.call("TTL", freqKey)
    end

    local function initFreqKey()
        return redis.call("SET", freqKey, 1, "EX", freqTTL)
    end

    local function main()
        if isFreqKeyExists() == 1 then
          local freqCount = incrFreqCount()
          local freqTTL = getFreqTTL()
          return {freqCount, freqTTL}
        else
          initFreqKey()
          return {1, freqTTL}
        end
    end

    return main()
    ```

- 获取当前访问次数
    ```lua
    local freqKey = KEYS[1]

    local function getFreqCount()
        return redis.call("GET", freqKey)
    end

    local function getFreqTTL()
        return redis.call("TTL", freqKey)
    end

    local function main()
        local freqCount = getFreqCount()
        if not freqCount then
          return {0, 0}
        else 
          local freqTTL = getFreqTTL()
          return {freqCount, freqTTL}
        end
    end

    return main()
    ```

#### 2.2.1. 为什么需要使用Lua脚本封装
- 多条命令封装到一起避免多次往返服务器以提升效率
    - 当然这个用pipeline也可以实现
- 防止并发问题
    - 比如以下的场景就会让业务方很迷惑，明明访问次数为0，为什么下次重置的时间却是60s
    1. 获取当前访问次数：get得到访问次数为0
    2. 访问次数加一：incr次数为1
    3. 访问次数加一：expire超时时间为60s
    4. 获取当前访问次数：pttl返回为60s



```lua
-- appid_业务key_当前时间类型下的当前时间
local freqKey = KEYS[1]
-- 逻辑过期时间戳:1651420800
local freqExpireTs = tonumber(ARGV[1])
-- 实际过期时间戳:ttl的基础上+7天：ttl+604800
local freqTTL = tonumber(ARGV[2])
-- 当前时间戳
local currentTimeTs = tonumber(ARGV[3])

local function isFreqKeyExists(freqKey)
  local isExists = redis.call("EXISTS", freqKey)
  return isExists == 1
end

local function getFreqExpireTs()
  return tonumber(redis.call("HGET", freqKey, "expire"))
end

local function incrFreqCount()
    return redis.call("HINCRBY", freqKey, "count", 1)
end

local function initFreqKey(freqKey, freqExpireTs, freqTTL)
    redis.call("HMSET", freqKey, "count", 1, "expire", freqExpireTs)
    redis.call("EXPIRE", freqKey, freqTTL)
end

local function isFreqExpired(freqExpireTs, currentTimeTs)
    return currentTimeTs >= freqExpireTs
end

local function main()
    if isFreqKeyExists(freqKey) then
        local freqExpireTs = getFreqExpireTs(freqKey)
        if isFreqExpired(freqExpireTs, currentTimeTs)==false then
            local freqCount = incrFreqCount()
            return {freqCount, freqExpireTs}
        end
    end
    initFreqKey(freqKey, freqExpireTs, freqTTL)
    return {1, freqExpireTs}
end

return main()
```

```lua
local freqKey = KEYS[1]
local currentTimeTs = tonumber(ARGV[1])

local function isFreqKeyExists(freqKey)
  local isExists = redis.call("EXISTS", freqKey)
  return isExists == 1
end

local function getFreq(freqKey)
    local freq = redis.call("HMGET", freqKey, "count", "expire")
    return tonumber(freq[1]), tonumber(freq[2])
end

local function isFreqAlived(freqExpireTs, currentTimeTs)
    return currentTimeTs < freqExpireTs
end

local function main()
    if isFreqKeyExists(freqKey) then
        local freqCount, freqExpireTs = getFreq(freqKey)
        if isFreqAlived(freqExpireTs, currentTimeTs) then
            return {freqCount, freqExpireTs}
        end
    end
    return {0, currentTimeTs}
end

return main()
```
## 3. 参考
- [如何设计一个限流系统.md](../../System_Design/如何设计一个限流系统.md)
- [基于Redis的限流系统的设计 \- 简书](https://www.jianshu.com/p/a3d068f2586d)
- [基于Redis的分布式令牌桶限流器\_Jason\_LiuMeng的博客\-CSDN博客](https://blog.csdn.net/a314368439/article/details/84026680)
- [spring cloud gateway 之限流篇 \- 方志朋的专栏 \- 博客园](https://www.cnblogs.com/forezp/p/10140316.html)
- [基于Redis和Lua的分布式限流 \- 个人文章 \- SegmentFault 思否](https://segmentfault.com/a/1190000018783729)

