## 1. Lua入门
[Lua.md](../Lua/Lua.md)

## 2. Redis Lua使用
### 2.1. 执行Lua脚本
```lua
redis-cli  --eval test4.lua  shop_point shop_id_list , 1 1600482998753
```
其中shop_point和shop_id_list是KEYS，1和1600482998753是ARGV，KEYS和ARGV之间使用` , `分开


### 2.2. 调试Lua脚本

- 默认开启新的session，意味着服务器不会阻塞；脚本调试会话完成后回滚
```lua
redis-cli  --ldb --eval test4.lua  shop_point shop_id_list , 1 1600482998753
```
- 如果需要使用同步模式，那么加上`--ldb-sync-mode`。此模式下Redis服务器将无法访问
#### 2.2.1. 常用命令
- `quit`终止会话
- `restart`调试会话将从头开始，从文件中重新加载脚本的新版本
- `help`帮助列表
- 会话中
    - `redis.debug()`相当于watch，`print`则是输出变量到控制台
    - `b 行号`打断点，`b -行号`取消断点，`b 0`删除所有断点
        - 动态断点：`if counter > 10 then redis.breakpoint() end`





### 2.3. Lua中执行Redis命令
- `redis.call` vs `redis.pcall`
区别在于如果redis命令执行出错，`redis.call`会往外抛出error给调用方处理，而`redis.pcall`则只是把错误抛给Lua脚本处理

### 2.4. Redis和Lua数据类型转换
规则：Redis类型->Lua类型->Redis类型，如果初始值和最终值是一样的，那么就可以转换
#### 2.4.1. Redis->Lua

Redis integer reply -> Lua number
Redis bulk reply -> Lua string
Redis multi bulk reply -> Lua table (may have other Redis data types nested)
Redis status reply -> Lua table with a single ok field containing the status
Redis error reply -> Lua table with a single err field containing the error
Redis Nil bulk reply and Nil multi bulk reply -> Lua false boolean type
#### 2.4.2. Lua->Redis

Lua number -> Redis integer reply (the number is converted into an integer)
Lua string -> Redis bulk reply
Lua table (array) -> Redis multi bulk reply (truncated to the first nil inside the Lua array if any)
Lua table with a single ok field -> Redis status reply
Lua table with a single err field -> Redis error reply
Lua boolean false -> Redis Nil bulk reply.

### 2.5. Redis Lua支持的库
- `base` lib.
- `table` lib.
- `string` lib.
- `math` lib.
- `struct` lib.
- `cjson` lib.
- `cmsgpack` lib.
- `bitop` lib.
- `redis.sha1hex` function.
- `redis.breakpoint` and `redis.debug` function in the context of the Redis Lua debugger.
### 2.6. Redis Lua打印日志
- redis.conf里面配置日志路径和日志级别

```redis
# 2. Specify the server verbosity level.
# 3. This can be one of:
# 4. debug (a lot of information, useful for development/testing)
# 5. verbose (many rarely useful info, but not a mess like the debug level)
# 6. notice (moderately verbose, what you want in production probably)
# 7. warning (only very important / critical messages are logged)
loglevel notice

# 8. Specify the log file name. Also 'stdout' can be used to force
# 9. Redis to log on the standard output. 
logfile "redis.log"
```
- 使用`redis.log(loglevel,message)`打印日志
    - 日志级别：
    ```
    redis.LOG_DEBUG
    redis.LOG_VERBOSE
    redis.LOG_NOTICE
    redis.LOG_WARNING
    ```
    - message：可以使用`string.format`格式化输出
### 2.7. Redis Lua执行时间
- Lua脚本一般在ms级别执行完，最长时间默认为5s。可以在`redis.conf`中配置`lua-time-limit`
- 到达5s后redis并不会终止Lua脚本，而是仅记录到日志中


### 2.8. EVAL vs EVALSHA
由于Redis不保证Lua脚本的持久化、复制能力，Redis在部分场景下仍会清除Lua脚本缓存（例如实例迁移、变配等），这要求您的客户端需具备处理该错误的能力
[Lua脚本使用规范](https://help.aliyun.com/document_detail/92942.html)
## 3. Redis Lua IDE
### 3.1. ZeroBrain
[ZeroBrane Studio \- Lua IDE/editor/debugger for Windows, Mac OSX, and Linux](https://studio.zerobrane.com/)
## 4. Redis Lua实例
### 4.1. 打点

- 使用string记录打点列表

```lua
local shopPointKey = KEYS[1]
local shopIdListKey = KEYS[2]
local currentShopId = ARGV[1]
local ts = ARGV[2]

--checkSetCurrentPoint
local function checkCurrentPoint()
    local shopJson = redis.call("HGET", shopPointKey, currentShopId)
    redis.log(redis.LOG_NOTICE, "checkCurrentPoint: get point for shopPointKey=", shopPointKey, ", currentShopId=", currentShopId, "result=", shopJson)
    if shopJson then
        local shop = cjson.decode(shopJson)
        if shop.start_time ~= 0 then
            return 10001
        end
    end
    return 0
end

--checkSetPrevPoint
local function checkSetPrevPoint()
    local newShopList = {}
    local shopIdList = {}
    local preShopIndex = 0

    local shopIdListjson = redis.call("GET", shopIdListKey)
    redis.log(redis.LOG_NOTICE, "checkSetPrevPoint: get shop id list for shopIdListKey=", shopIdListKey, "result=", shopIdListjson)

    if shopIdListjson then
        shopIdList = cjson.decode(shopIdListjson)
        preShopIndex = table.getn(shopIdList)
        for i, v in pairs(shopIdList) do
            if v ~= currentShopId then
                table.insert(newShopList, v)
            end
        end
    end

    table.insert(newShopList, currentShopId)

    if preShopIndex ~= 0 then
        local preShopId = shopIdList[preShopIndex]
        local preShopJson = redis.call("HGET", shopPointKey, preShopId)
        redis.log(redis.LOG_NOTICE, "checkSetPrevPoint: get pre shop for shopPointKey=", shopPointKey, "preShopId=", preShopId, "result=", preShopJson)
        if preShopJson then
            local preShop = cjson.decode(preShopJson)
            if (preShop.end_time == nil) or (preShop.end_time == 0) then
                preShop.end_time = ts
                local preShopJsonNew = cjson.encode(preShop)
                redis.call("HSET", shopPointKey, preShopId, preShopJsonNew)
                redis.log(redis.LOG_NOTICE, "checkSetPrevPoint: set pre shop end time for shopPointKey=", shopPointKey, "preShopId=", preShopId, "result=", preShopJsonNew)

            end
        end
    end

    return newShopList, 0
end

-- setCurrentPoint
local function setCurrentPoint()
    local currentShopPoint = {
        start_time = ts
    }
    local currentShopPointJson = cjson.encode(currentShopPoint)
    redis.call("HSET", shopPointKey, currentShopId, currentShopPointJson)
    redis.log(redis.LOG_NOTICE, "setCurrentPoint: set current shop start time for shopPointKey=", shopPointKey, "currentShopId=", currentShopId, "result=", currentShopPointJson)
    return 0
end

-- setShopList
local function setShopList(newShopList)
    local newShopListJson = cjson.encode(newShopList)
    redis.call("SET", shopIdListKey, newShopListJson)
    redis.log(redis.LOG_NOTICE, "setShopList: update shop list for shopIdListKey=", shopIdListKey, "newShopListJson=", newShopListJson)
end

local function main()

    redis.log(redis.LOG_NOTICE, "set point: request. keys=", shopPointKey, shopIdListKey, ", argv=", currentShopId, ts)

    --local ret = checkCurrentPoint()
    --if ret ~= 0 then
    --    redis.log(redis.LOG_WARNING, "set point: checkCurrentPoint error. ret=", ret)
    --    return ret
    --end

    local newShopList, ret = checkSetPrevPoint()
    if ret ~= 0 then
        redis.log(redis.LOG_WARNING, "set point: checkCurrcheckSetPrevPointentPoint error. ret=", ret)
        return ret
    end

    ret = setCurrentPoint()
    if ret ~= 0 then
        redis.log(redis.LOG_WARNING, "set point: setCurrentPoint error. ret=", ret)
        return ret
    end

    setShopList(newShopList)

    return 0

end

return main()
```


- 使用list记录打点列表

```lua
local shopPointKey = KEYS[1]
local shopIdListKey = KEYS[2]
local currentShopId = ARGV[1]
local ts = ARGV[2]

--checkSetCurrentPoint
local function checkCurrentPoint()
    local shopJson = redis.call("HGET", shopPointKey, currentShopId)
    redis.log(redis.LOG_NOTICE,
            string.format("checkCurrentPoint: get current point. keys=%s,%s, result=%s",
                    shopPointKey, currentShopId, shopJson))
    if shopJson then
        local shop = cjson.decode(shopJson)
        if shop.start_time ~= 0 then
            return 10001
        end
    end
    return 0
end

--checkSetPrevPoint
local function checkSetPrevPoint()

    local preShopId = redis.call("LINDEX", shopIdListKey, -1)
    redis.log(redis.LOG_NOTICE, string.format("checkSetPrevPoint: get pre shop id. key=%s, result=%s",
            shopIdListKey, preShopId))
    if preShopId then
        local preShopJson = redis.call("HGET", shopPointKey, preShopId)
        redis.log(redis.LOG_NOTICE, string.format("checkSetPrevPoint: get pre shop. key=%s,%s, result=%s",
                shopPointKey, preShopId, preShopJson))
        if preShopJson then
            local preShop = cjson.decode(preShopJson)
            if (preShop.end_time == nil) or (preShop.end_time == 0) then
                preShop.end_time = ts
                local preShopJsonNew = cjson.encode(preShop)
                redis.call("HSET", shopPointKey, preShopId, preShopJsonNew)
                redis.log(redis.LOG_NOTICE,
                        string.format("checkSetPrevPoint: set pre shop end time. key=%s,%s, result=%s",
                        shopPointKey, preShopId, preShopJsonNew))
            end
        end
    end

    return 0
end

-- setCurrentPoint
local function setCurrentPoint()
    local currentShopPoint = {
        start_time = ts
    }
    local currentShopPointJson = cjson.encode(currentShopPoint)
    redis.call("HSET", shopPointKey, currentShopId, currentShopPointJson)
    redis.log(redis.LOG_NOTICE,
            string.format("setCurrentPoint: set current shop start time. key=%s,%s, result=%s",
            shopPointKey, currentShopId, currentShopPointJson))
    return 0
end

-- updateShopList
local function updateShopList()
    redis.call("LREM", shopIdListKey, 1, currentShopId)
    redis.call("RPUSH", shopIdListKey, currentShopId)
    redis.log(redis.LOG_NOTICE, string.format("updateShopList: update shop list. key=%s,%s",
            shopIdListKey, currentShopId))
end

local function main()

    redis.log(redis.LOG_NOTICE, string.format("set point: request params: keys=%s, %s, argv=%s, %s",
            shopPointKey, shopIdListKey, currentShopId, ts))

    --local ret = checkCurrentPoint()
    --if ret ~= 0 then
    --    redis.log(redis.LOG_WARNING,
    --            string.format("set point: checkCurrentPoint error: ret=%d", ret))
    --    return ret
    --end

    local ret = checkSetPrevPoint()
    if ret ~= 0 then
        redis.log(redis.LOG_WARNING,
                string.format("set point: checkCurrcheckSetPrevPointentPoint error: ret=%d", ret))
        return ret
    end

    ret = setCurrentPoint()
    if ret ~= 0 then
        redis.log(redis.LOG_WARNING,
                string.format("set point: setCurrentPoint error: ret=%d", ret))
        return ret
    end

    updateShopList()

    return 0

end

return main()
```

### 4.2. 添加key
```lua
local wantToSeeKeysKey = KEYS[1]
local wantToSeeKey = KEYS[2]

-- existsKey
local function existsKey()
    local existsFlag = false
    local res = redis.call("LRANGE", wantToSeeKeysKey, 0, -1)
    redis.log(redis.LOG_NOTICE, "existsKey: wantToSeeKeysKey=", wantToSeeKeysKey, "res=", res)

    if res then
        for i, v in pairs(res) do
            if v == wantToSeeKey then
                existsFlag = true
                break
            end
        end
    end

    return existsFlag
end

-- main
local function main()
    redis.log(redis.LOG_NOTICE, "addWantToSeeKeys: req params: keys=", wantToSeeKeysKey, wantToSeeKey)

    if existsKey() then
        redis.log(redis.LOG_WARNING, "addWantToSeeKeys: key exitst")
        return 10001
    end

    redis.call("RPUSH", wantToSeeKeysKey, wantToSeeKey)
    redis.log(redis.LOG_NOTICE, "addWantToSeeKeys: add", wantToSeeKey, "to", wantToSeeKeysKey)

    return 0
end

return main()

```


### 4.3. 初始化秒杀人数

```lua
local activityKey = KEYS[1]
local goodsId = ARGV[1]
local participants = tonumber(ARGV[2])
local expireTs = tonumber(ARGV[3])

local function isActivityKeyExists()
    return redis.call("EXISTS", activityKey)
end

local function setActivityKeyExpireTs()
    return redis.call("EXPIRE", activityKey, expireTs)
end

local function incrGoodsParticipant()
    return redis.call("HINCRBY", activityKey, goodsId, participants)
end

local function getGoodsParticipant()
    return redis.call("HGET", activityKey, goodsId)
end

local function main()
    if isActivityKeyExists() == 0 then
        local goodsParticipants = incrGoodsParticipant()
        setActivityKeyExpireTs()
        return goodsParticipants
    end

    local goodsParticipants = getGoodsParticipant()
    if goodsParticipants and goodsParticipants ~= 0 then
        return goodsParticipants
    else
        return incrGoodsParticipant()
    end
end

return main()

```
## 5. QA
### 5.1. CROSSSLOT Keys in request don't hash to the same slot
[集群.md](../Redis高可用机制/集群.md)
## 6. 参考
- [Write Redis Lua Script with ZeroBrane Studio \| Blackie's Failed Notes](https://blackie1019.github.io/2018/05/01/Write-Redis-Lua-Script-with-ZeroBrane-Studio/index.html)
- [Redis Lua scripts debugger – Redis](https://redis.io/topics/ldb)
- [Develop and debug Redis Lua scripts with ZeroBrane Studio \- YouTube](https://www.youtube.com/watch?v=7mlajCj4QPw)
- [Redis中lua脚本的调试 \- zlAdmin \- 博客园](https://www.cnblogs.com/code-sayhi/articles/10574995.html)
- [A Speed Guide To Redis Lua Scripting \- Compose Articles](https://www.compose.com/articles/a-quick-guide-to-redis-lua-scripting/)
- [lua\-脚本尝试创建全局变量\-代码日志](https://stackoverflow.com/questions/19997647/script-attempted-to-create-global-variable)
- [Lua 脚本 — Redis 设计与实现](https://redisbook.readthedocs.io/en/latest/feature/scripting.html)
- [EVAL – Redis](https://redis.io/commands/eval)
- [Redis Lua scripts debugger – Redis](https://redis.io/topics/ldb)
- [zeroBrane 调试lua脚本 选择redis解释器才debug弹出url和输入密码password\_百物易用是苏生\-CSDN博客](https://blog.csdn.net/u010720408/article/details/114582468)
- [Lua脚本使用规范](https://help.aliyun.com/document_detail/92942.html)