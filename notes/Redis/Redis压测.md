
## 1. 压测Lua脚本
1. redis-cli加载Lua
```
redis-cli -h 127.0.0.1 -p 6379 -a "xxx" -x script load < test.lua
```
2. redis-benchmark压测Lua
```
# 1表示key的数量
redis-benchmark -h 127.0.0.1 -p 6379 -a "xxx" -c 1000 -n 1000000 evalsha d72ab028ab5ff319cf0979291745f98c099cecb2 1 test 10
```
3. redis-benchmark压测pipeline
```
redis-benchmark -h 127.0.0.1 -p 6379 -a "xxx" -c 1000 -n 1000000  -P 5 evalsha d72ab028ab5ff319cf0979291745f98c099cecb2 1 test 10
```
这个命令会把`evalsha d72ab028ab5ff319cf0979291745f98c099cecb2 1 test 10`5条5条的批量发送，最终的QPS要除以5
## 2. 压测注意事项
1. 首先在本地压测Redis，可以忽略网络瓶颈（带宽+延迟）
2. redis-benchmark也是单线程的，如果CPU100%了，那么可以开启多个redis-benchmark来压测，然后累加QPS
3. 有其他问题可以用tcpdump抓包用wireshark分析下

## 3. 参考
- [Redis benchmark \| Redis](https://redis.io/docs/reference/optimization/benchmarks/?utm_source=pocket_mylist)
- [understand the redis benchmark](https://groups.google.com/g/redis-db/c/UFO2iA7M2Zw?pli=1&utm_source=pocket_mylist)
- [Redis性能压测工具 redis\-benchmark\_Bill\-Zhang的博客\-CSDN博客](https://blog.csdn.net/zlfprogram/article/details/74338685)
- [Redis网络瓶颈-脉脉](https://maimai.cn/web/gossip_detail?gid=28885969&egid=d3a7f663a0bd11eb951fe4434b3cb1b0)