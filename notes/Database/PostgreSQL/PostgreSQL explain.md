[toc]
## 1. 不加where
 

### 1.1. 普通的explain

```
explain select * from foo;
```

- 结果
```
Seq Scan on foo  (cost=0.00..18918.18 rows=1058418 width=36)
```


#### 1.1.1. 解析
- 读取的方式
    - 顺序扫描，一块块读取
- 统计信息
    - cost
        - 获取第一行的时间
        - 获取所有行的时间
        - 单位是page unit，不是毫秒
- rows
    - 扫描的行数
- width
    - 所有行的平均长度
    - 单位是byte
    - 36bytes是因为uuid字符串占用32byte，id int占用4byte


### 1.2. ananyze

```
	analyse foo;
	explain select * from foo;
```

- 结果
```
	Seq Scan on foo  (cost=0.00..18334.00 rows=1000000 width=37)
```


#### 1.2.1. 解析
使用analyse表示后续之分析foo表
- rows
确实是10000行了
- cost
比原来的小一点（因为只读了10000行）
- width
比原来多了1byte
	

### 1.3. analyze是怎么运行的

ananlyze随机读取指定表的一部分数据，并读取一定的次数。
这个次数由default_statistics_target参数指定，并且读取300次
然后将统计的信息存入pg_statistic表。这个表可读性太差。一般我们分析用的是pg_stats表

#### 1.3.1. 例子
- width
```
	SELECT sum(avg_width) AS width
	FROM pg_stats
	WHERE tablename='foo';
	
	//37
```

width的信息是由pg_stats中的avg_width加和求出来的

- rows
```
	SELECT reltuples FROM pg_class WHERE relname='foo';
	
	//1000000
```

rows的信息是由pg_class的reltuples得出的。
ps_class是所有关系tables, indexes, sequences的目录表。保存了他们的元信息

- cost
```
	SELECT relpages*current_setting('seq_page_cost')::float4
	+ reltuples*current_setting('cpu_tuple_cost')::float4
	AS total_cost
	FROM pg_class
	WHERE relname='foo';
	
	//18334
```

postgre查询的时候需要做两件事
- 读取这张表所有block
block数量（relpages） * 每个block时间（/var/lib/postgres/data/postgresql.conf里面的seq_page_cost）
- 检查每一行是否满足条件
行数（reltuples） * 每行的时间（/var/lib/postgres/data/postgresql.conf里面的cpu_tuple_cost）


### 1.4. 查询实际是怎么执行的

```
	explain analyse SELECT * FROM foo;
```

- 结果
```
	Seq Scan on foo  (cost=0.00..18334.00 rows=1000000 width=37) (actual time=0.034..295.673 rows=1000000 loops=1)
	Planning Time: 0.088 ms
	Execution Time: 419.848 ms
```


#### 1.4.1. 解析
多出了真实执行的情况
- actual time
    - 实际时间
    - 单位毫秒
- rows
    - 实际读取的行数
- loop
    - 循环的次数







## 2. 不加where调大buffer
 

### 2.1. 清空buffer后查看buffer信息

- 清空buffer，重启postgre
```
	 3281  sudo systemctl stop postgresql.service
	 3284  sudo sync
	 3285  sudo echo 3 > /proc/sys/vm/drop_caches
	 3287  sudo systemctl start postgresql
```

- sql
```
	EXPLAIN (ANALYZE,BUFFERS) SELECT * FROM foo;
```

- 结果
```
	Seq Scan on foo  (cost=0.00..18334.00 rows=1000000 width=37) (actual time=42.229..869.556 rows=1000000 loops=1)
	  Buffers: shared read=8334
	Planning Time: 182.176 ms
	Execution Time: 999.686 ms
```
	


#### 2.1.1. 解析
加上buffers选项后出现了buffer相关信息
- Buffers shared read=8334 
    - 重启后没有缓存，需要把8443个blocks读进postgresql


### 2.2. cache预热后再执行一次

```
	Seq Scan on foo  (cost=0.00..18334.00 rows=1000000 width=37) (actual time=0.149..396.740 rows=1000000 loops=1)
	  Buffers: shared hit=32 read=8302
	Planning Time: 0.084 ms
	Execution Time: 566.195 ms
	
```


#### 2.2.1. 解析
这次从postgre的cache中读了32个block，其他8302个block仍需从磁盘读取
之所以不是全部在buffer中读取原因有两个
- 主要原因是postgre缓存机制是ring buffer optimization，不会把一张表的所有数据加载入cache中
- 次要原因是postgre buffer区比较小
```
	SELECT current_setting('shared_buffers') AS shared_buffers,
	pg_size_pretty(pg_table_size('foo')) AS table_size;
	
	//128MB,65 MB
	
```


### 2.3. 修改shared_buffers大小再执行

- /var/lib/postgres/data/postgresql.conf
```
	shared_buffers=300MB
```

- 重启
```
	sudo systemctl restart postgresql
```

- 再次执行
```
	Seq Scan on foo  (cost=0.00..18334.00 rows=1000000 width=37) (actual time=0.078..582.985 rows=1000000 loops=1)
	  Buffers: shared read=8334
	Planning Time: 1.452 ms
	Execution Time: 767.469 ms
```
	

```
	Seq Scan on foo  (cost=0.00..18334.00 rows=1000000 width=37) (actual time=0.042..320.293 rows=1000000 loops=1)
	  Buffers: shared hit=8334
	Planning Time: 0.110 ms
	Execution Time: 486.366 ms
```
	

调高缓存后从767.469 ms降到486.366 ms


## 3. 加上where
 

### 3.1. 使用where后的explain

	explain select * from foo where c1 > 500;

- 结果
```
	Seq Scan on foo  (cost=0.00..20834.00 rows=999575 width=37)
	  Filter: (c1 > 500)
```


#### 3.1.1. 解析
- cost
变大了，因为需要检查条件是否满足
- rows
扫描的行数表少了
	
	

### 3.2. 如何计算的

- cost
```
	SELECT
	relpages*current_setting('seq_page_cost')::float4
	+ reltuples*current_setting('cpu_tuple_cost')::float4
	+ reltuples*current_setting('cpu_operator_cost')::float4
	AS total_cost
	FROM pg_class
	WHERE relname='foo';
```


#### 3.2.1. 解析
- 需要扫描所有block
- 检查每一行的可见性
- 对每行的某个列进行操作


- rows
```
	SELECT histogram_bounds
	FROM pg_stats
	WHERE tablename='foo' AND attname='c1';
	
	SELECT round(
	(
	(10590.0-500)/(10590-57)
	+
	(current_setting('default_statistics_target')::int4-1)
	)
	* 10000.0
	) AS rows;
```

- 结果
```
	999579
```


- 解析
使用直方图里获取的数据。
首先把所有行分成100份（default_statistics_target指定），即每份包含10000行

### 3.3. 加上索引
```
	CREATE INDEX ON foo(c1);
	EXPLAIN SELECT * FROM foo WHERE c1 > 500;
```

- 结果
```
	Seq Scan on foo  (cost=0.00..20834.00 rows=999556 width=37)
	  Filter: (c1 > 500)
```


#### 3.3.1. 解析
索引之所以没有起作用是因为总共有1000000，而我们只过滤了500行，与其使用索引还不如直接使用cpu过滤
### 3.4. 强制使用索引

- 原有结果
```
	Seq Scan on foo  (cost=0.00..20834.00 rows=999556 width=37) (actual time=0.255..636.487 rows=999500 loops=1)
	  Filter: (c1 > 500)
	  Rows Removed by Filter: 500
	Planning Time: 0.279 ms
	Execution Time: 811.279 ms
```
	

- 使用索引后
```
	SET enable_seqscan TO off;
	EXPLAIN (ANALYZE) SELECT * FROM foo WHERE c1 > 500;
	SET enable_seqscan TO on;
```

- 结果
```
	Index Scan using foo_c1_idx on foo  (cost=0.42..36802.65 rows=999556 width=37) (actual time=0.163..706.747 rows=999500 loops=1)
	  Index Cond: (c1 > 500)
	Planning Time: 0.204 ms
	Execution Time: 818.279 ms
```


#### 3.4.1. 解析
706 > 636，果然更慢了

### 3.5. 另一个查询

```
	EXPLAIN  SELECT * FROM foo WHERE c1 < 500;
```

- 结果

```
	Index Scan using foo_c1_idx on foo  (cost=0.42..23.18 rows=443 width=37)
	  Index Cond: (c1 < 500)
	
```

## 4. where后面like
 

### 4.1. 使用like

	EXPLAIN  SELECT * FROM foo WHERE c1 < 500 and c2 LIKE 'abcd%';

- 结果
```
	Index Scan using foo_c1_idx on foo  (cost=0.42..24.29 rows=1 width=37)
	  Index Cond: (c1 < 500)
	  Filter: (c2 ~~ 'abcd%'::text)
```


#### 4.1.1. 分析
既使用了c1索引，Index Cond
又使用了Filter

### 4.2. 单纯的like

```
	EXPLAIN analyse 
	SELECT * FROM foo WHERE c2 LIKE 'abcd%';
```

- 结果

```
	Gather  (cost=1000.00..14552.33 rows=100 width=37) (actual time=16.195..250.626 rows=22 loops=1)
	  Workers Planned: 2
	  Workers Launched: 2
	  ->  Parallel Seq Scan on foo  (cost=0.00..13542.33 rows=42 width=37) (actual time=44.509..232.877 rows=7 loops=3)
	        Filter: (c2 ~~ 'abcd%'::text)
	        Rows Removed by Filter: 333326
	Planning Time: 0.139 ms
	Execution Time: 250.692 ms
	
```


#### 4.2.1. 解析
顺序扫描
删除了333326行，最后只有42行

### 4.3. 加上索引

```
	CREATE INDEX ON foo(c2);
	EXPLAIN (ANALYZE) SELECT * FROM foo
	WHERE c2 LIKE 'abcd%'
```

- 结果

```
	Gather  (cost=1000.00..14552.33 rows=100 width=37) (actual time=28.965..296.905 rows=22 loops=1)
	  Workers Planned: 2
	  Workers Launched: 2
	  ->  Parallel Seq Scan on foo  (cost=0.00..13542.33 rows=42 width=37) (actual time=81.060..271.243 rows=7 loops=3)
	        Filter: (c2 ~~ 'abcd%'::text)
	        Rows Removed by Filter: 333326
	Planning Time: 0.194 ms
	Execution Time: 296.967 ms
	
```


#### 4.3.1. 分析
没有利用索引，原因在于c2列使用UTF8保存的，但是默认的索引是使用的不是UTF8

#### 4.3.2. 解决
强制使用某种类型的索引
```
	CREATE INDEX ON foo(c2 text_pattern_ops);
	EXPLAIN SELECT * FROM foo WHERE c2 LIKE 'abcd%';
```

- 结果

```
	Index Scan using foo_c2_idx1 on foo  (cost=0.42..8.45 rows=100 width=37)
	  Index Cond: ((c2 ~>=~ 'abcd'::text) AND (c2 ~<~ 'abce'::text))
	  Filter: (c2 ~~ 'abcd%'::text)

```
## 5. 使用覆盖索引
 

### 5.1. 使用覆盖索引查询

```
	EXPLAIN SELECT c1 FROM foo WHERE c1 < 500;
```

- 结果

```
	Index Only Scan using foo_c1_idx on foo  (cost=0.42..23.18 rows=443 width=4)
	  Index Cond: (c1 < 500)
	
```


#### 5.1.1. 解析
select后面的和where后面的字段是索引中的字段，这样出现Index Only Scan


## 6. limit
 



### 6.1. 没有limit
```
	EXPLAIN (ANALYZE,BUFFERS)
	SELECT * FROM foo WHERE c2 LIKE 'ab%';
```

- 结果

```
	Gather  (cost=1000.00..15552.43 rows=10101 width=37) (actual time=0.917..232.718 rows=3927 loops=1)
	  Workers Planned: 2
	  Workers Launched: 2
	  Buffers: shared hit=8334
	  ->  Parallel Seq Scan on foo  (cost=0.00..13542.33 rows=4209 width=37) (actual time=0.315..212.488 rows=1309 loops=3)
	        Filter: (c2 ~~ 'ab%'::text)
	        Rows Removed by Filter: 332024
	        Buffers: shared hit=8334
	Planning Time: 0.202 ms
	Execution Time: 233.915 ms
	

```

### 6.2. 加了limit
```
	EXPLAIN (ANALYZE,BUFFERS)
	SELECT * FROM foo WHERE c2 LIKE 'ab%' limit 10;
```

- 结果

```
	Limit  (cost=0.00..20.63 rows=10 width=37) (actual time=0.148..0.761 rows=10 loops=1)
	  Buffers: shared hit=21
	  ->  Seq Scan on foo  (cost=0.00..20834.00 rows=10101 width=37) (actual time=0.145..0.754 rows=10 loops=1)
	        Filter: (c2 ~~ 'ab%'::text)
	        Rows Removed by Filter: 2496
	        Buffers: shared hit=21
	Planning Time: 0.175 ms
	Execution Time: 0.796 ms
	
```


如上很明显的Rows Removed by Filter: 2496少了很多







## 7. HashJoin
 

### 7.1. 没有加索引的join查询

```
	EXPLAIN (ANALYZE)
	SELECT * FROM foo JOIN bar ON foo.c1=bar.c1;
```

- 结果

```
	Hash Join  (cost=13463.00..40547.00 rows=500000 width=42) (actual time=564.550..2044.566 rows=500000 loops=1)
	  Hash Cond: (foo.c1 = bar.c1)
	  ->  Seq Scan on foo  (cost=0.00..18334.00 rows=1000000 width=37) (actual time=0.034..336.830 rows=1000000 loops=1)
	  ->  Hash  (cost=7213.00..7213.00 rows=500000 width=5) (actual time=563.583..563.583 rows=500000 loops=1)
	        Buckets: 524288  Batches: 1  Memory Usage: 22163kB
	        ->  Seq Scan on bar  (cost=0.00..7213.00 rows=500000 width=5) (actual time=0.054..213.412 rows=500000 loops=1)
	Planning Time: 0.791 ms
	Execution Time: 2132.985 ms
	
```


#### 7.1.1. 解析
join查询的方式有很多，HashJoin用于相等join。
首先顺序扫描bar，计算每一行的hash值，存到hash表里
然后顺序扫描foo，计算每一行的hash值，在bar的hash表查询是否存在，是则join
当内存充足的时候这种join工作的很好

## 8. MergeJoin
 

适合大表

### 8.1. 加了索引后的join查询

```
	CREATE INDEX ON bar(c1);
	EXPLAIN (ANALYZE)
	SELECT * FROM foo JOIN bar ON foo.c1=bar.c1;
```

- 结果

```
	Merge Join  (cost=1.57..39912.55 rows=500000 width=42) (actual time=0.074..1174.615 rows=500000 loops=1)
	  Merge Cond: (foo.c1 = bar.c1)
	  ->  Index Scan using foo_c1_idx on foo  (cost=0.42..34317.43 rows=1000000 width=37) (actual time=0.035..287.165 rows=500001 loops=1)
	  ->  Index Scan using bar_c1_idx on bar  (cost=0.42..15212.42 rows=500000 width=5) (actual time=0.026..326.117 rows=500000 loops=1)
	Planning Time: 1.654 ms
	Execution Time: 1230.054 ms
	
```


#### 8.1.1. 解析
join的key是索引的话（已排序）会使用mergejoin

### 8.2. 内存充足的left join

```
	EXPLAIN (ANALYZE)
	SELECT * FROM foo LEFT JOIN bar ON foo.c1=bar.c1;

```
- 结果

```
	Hash Left Join  (cost=13463.00..40547.00 rows=1000000 width=42) (actual time=478.235..1674.451 rows=1000000 loops=1)
	  Hash Cond: (foo.c1 = bar.c1)
	  ->  Seq Scan on foo  (cost=0.00..18334.00 rows=1000000 width=37) (actual time=0.038..258.173 rows=1000000 loops=1)
	  ->  Hash  (cost=7213.00..7213.00 rows=500000 width=5) (actual time=477.280..477.281 rows=500000 loops=1)
	        Buckets: 524288  Batches: 1  Memory Usage: 22163kB
	        ->  Seq Scan on bar  (cost=0.00..7213.00 rows=500000 width=5) (actual time=0.054..177.797 rows=500000 loops=1)
	Planning Time: 0.852 ms
	Execution Time: 1776.768 ms
	
```



#### 8.2.1. 解析
结果居然跟没建立索引一样

### 8.3. 内存不充足的left join
```
	SET work_mem TO '1MB';
	
	EXPLAIN (ANALYZE)
	SELECT * FROM foo LEFT JOIN bar ON foo.c1=bar.c1;

```
- 结果

```
	Merge Left Join  (cost=1.57..58279.85 rows=1000000 width=42) (actual time=0.074..1556.423 rows=1000000 loops=1)
	  Merge Cond: (foo.c1 = bar.c1)
	  ->  Index Scan using foo_c1_idx on foo  (cost=0.42..34317.43 rows=1000000 width=37) (actual time=0.035..527.201 rows=1000000 loops=1)
	  ->  Index Scan using bar_c1_idx on bar  (cost=0.42..15212.42 rows=500000 width=5) (actual time=0.026..277.211 rows=500000 loops=1)
	Planning Time: 0.679 ms
	Execution Time: 1663.584 ms
	
```


#### 8.3.1. 解析
这回使用的是merge join，并且时间少了100ms

### 8.4. 删除索引，并且查询大部分数据
```
	DELETE FROM bar WHERE c1>500;
	DROP INDEX bar_c1_idx;
	ANALYZE bar;
	EXPLAIN (ANALYZE)
	SELECT * FROM foo JOIN bar ON foo.c1=bar.c1;

```
- 结果

```
	Merge Join  (cost=2240.95..2264.69 rows=500 width=42) (actual time=66.961..68.302 rows=500 loops=1)
	  Merge Cond: (foo.c1 = bar.c1)
	  ->  Index Scan using foo_c1_idx on foo  (cost=0.42..34317.43 rows=1000000 width=37) (actual time=0.016..0.442 rows=501 loops=1)
	  ->  Sort  (cost=2240.41..2241.66 rows=500 width=5) (actual time=66.928..67.058 rows=500 loops=1)
	        Sort Key: bar.c1
	        Sort Method: quicksort  Memory: 48kB
	        ->  Seq Scan on bar  (cost=0.00..2218.00 rows=500 width=5) (actual time=0.026..66.804 rows=500 loops=1)
	Planning Time: 0.492 ms
	Execution Time: 68.443 ms
	
```


#### 8.4.1. 解析
首先对bar表快排，
然后使用merge join
## 9. NestedLoop
 

适合小表

### 9.1. 删掉了大部分数据后

```
	DELETE FROM foo WHERE c1>1000;
	ANALYZE foo;
	EXPLAIN (ANALYZE)
	SELECT * FROM foo JOIN bar ON foo.c1=bar.c1;

```

- 结果

```
	Nested Loop  (cost=9.84..6939.13 rows=500 width=42) (actual time=0.073..6.593 rows=500 loops=1)
	  ->  Seq Scan on bar  (cost=0.00..8.00 rows=500 width=5) (actual time=0.023..0.155 rows=500 loops=1)
	  ->  Bitmap Heap Scan on foo  (cost=9.84..13.85 rows=1 width=37) (actual time=0.007..0.007 rows=1 loops=500)
	        Recheck Cond: (c1 = bar.c1)
	        Heap Blocks: exact=500
	        ->  Bitmap Index Scan on foo_c1_idx  (cost=0.00..9.84 rows=1 width=0) (actual time=0.005..0.005 rows=1 loops=500)
	              Index Cond: (c1 = bar.c1)
	Planning Time: 0.996 ms
	Execution Time: 6.785 ms
	
```


#### 9.1.1. 解析
使用的嵌套循环
首先顺序扫描bar表

### 9.2. 清空表数据后

```
	TRUNCATE bar;
	ANALYZE bar;
	EXPLAIN (ANALYZE)
	SELECT * FROM foo JOIN bar ON foo.c1>bar.c1;
```

- 结果

```
	Nested Loop  (cost=0.40..34657.73 rows=823333 width=42) (actual time=0.012..0.012 rows=0 loops=1)
	  ->  Seq Scan on bar  (cost=0.00..34.70 rows=2470 width=5) (actual time=0.011..0.011 rows=0 loops=1)
	  ->  Index Scan using foo_c1_idx on foo  (cost=0.40..10.69 rows=333 width=37) (never executed)
	        Index Cond: (c1 > bar.c1)
	Planning Time: 0.297 ms
	Execution Time: 0.056 ms
	
```


#### 9.2.1. 解析
清空表数据后postre仍认为有数据，使用的还是Nested Loop


### 9.3. cross join
```
	EXPLAIN SELECT * FROM foo CROSS JOIN bar ;
```

- 结果

```
	Nested Loop  (cost=0.00..30931.20 rows=2470000 width=42)
	  ->  Seq Scan on bar  (cost=0.00..34.70 rows=2470 width=5)
	  ->  Materialize  (cost=0.00..24.00 rows=1000 width=37)
	        ->  Seq Scan on foo  (cost=0.00..19.00 rows=1000 width=37)
	
```


#### 9.3.1. 解析
使用的是Nested Loop



## 10. order by
 

### 10.1. 使用order by查询

```
	DROP INDEX foo_c1_idx;
	EXPLAIN (ANALYZE) SELECT * FROM foo ORDER BY c1;
```

- 结果
```
	Gather Merge  (cost=63789.50..161018.59 rows=833334 width=37) (actual time=531.824..1616.504 rows=1000000 loops=1)
	  Workers Planned: 2
	  Workers Launched: 2
	  ->  Sort  (cost=62789.48..63831.15 rows=416667 width=37) (actual time=521.651..786.417 rows=333333 loops=3)
	        Sort Key: c1
	        Sort Method: external merge  Disk: 12568kB
	        Worker 0:  Sort Method: external merge  Disk: 16968kB
	        Worker 1:  Sort Method: external merge  Disk: 16576kB
	        ->  Parallel Seq Scan on foo  (cost=0.00..12500.67 rows=416667 width=37) (actual time=0.029..182.951 rows=333333 loops=3)
	Planning Time: 0.447 ms
	Execution Time: 1794.824 ms
```



#### 10.1.1. 解析
首先是顺序扫描整张表，时间182ms
然后按照c1字段排序，排序方法使用的是外部排序（由于空间12568+16968+16576=46M比较大，所以没有在内存中排序）

### 10.2. 确定是否真的在磁盘读写

```
	EXPLAIN (ANALYZE,BUFFERS) SELECT * FROM foo ORDER BY c1;
```

- 结果
```
	Gather Merge  (cost=63789.50..161018.59 rows=833334 width=37) (actual time=438.141..1391.189 rows=1000000 loops=1)
	  Workers Planned: 2
	  Workers Launched: 2
	"  Buffers: shared hit=8428, temp read=5763 written=5786"
	  ->  Sort  (cost=62789.48..63831.15 rows=416667 width=37) (actual time=429.588..646.041 rows=333333 loops=3)
	        Sort Key: c1
	        Sort Method: external merge  Disk: 19184kB
	        Worker 0:  Sort Method: external merge  Disk: 14352kB
	        Worker 1:  Sort Method: external merge  Disk: 12568kB
	"        Buffers: shared hit=8428, temp read=5763 written=5786"
	        ->  Parallel Seq Scan on foo  (cost=0.00..12500.67 rows=416667 width=37) (actual time=0.023..145.298 rows=333333 loops=3)
	              Buffers: shared hit=8334
	Planning Time: 0.134 ms
	Execution Time: 1586.986 ms
```
	


#### 10.2.1. 解析
Buffers: shared hit=8428, temp read=5763 written=5786
这里临时读了5763 blocks，写了5786blocks，每个block 8K算的话，总共(5763)*8=45M


### 10.3. 尝试使用更大的内存

```
	SET work_mem TO '200MB';
	EXPLAIN (ANALYZE) SELECT * FROM foo ORDER BY c1;
```

- 结果

```
	Sort  (cost=117991.84..120491.84 rows=1000000 width=37) (actual time=813.293..1026.148 rows=1000000 loops=1)
	  Sort Key: c1
	  Sort Method: quicksort  Memory: 102702kB
	  ->  Seq Scan on foo  (cost=0.00..18334.00 rows=1000000 width=37) (actual time=0.040..356.703 rows=1000000 loops=1)
	Planning Time: 0.166 ms
	Execution Time: 1183.975 ms
	

```

#### 10.3.1. 解析
把工作内存调整为200M，在查询使用的quick sort

### 10.4. 为排序列建立索引

```
	CREATE INDEX ON foo(c1);
	EXPLAIN (ANALYZE) SELECT * FROM foo ORDER BY c1;
```

- 结果

```
	Index Scan using foo_c1_idx on foo  (cost=0.42..34317.43 rows=1000000 width=37) (actual time=0.096..566.817 rows=1000000 loops=1)
	Planning Time: 0.554 ms
	Execution Time: 682.179 ms
	
```


#### 10.4.1. 解析
读取索引排序比工作内存中快排更快，所以postgre倾向使用的是索引而不是内存快排


### 10.5. 聚合
 

### 10.6. count

	EXPLAIN SELECT count(*) FROM foo;

- 结果
	Aggregate  (cost=21.50..21.51 rows=1 width=8)
	  ->  Seq Scan on foo  (cost=0.00..19.00 rows=1000 width=0)
	


#### 10.6.1. 解析
count用的顺序扫描

### 10.7. max

	
	DROP INDEX foo_c2_idx;
	EXPLAIN (ANALYZE) SELECT max(c2) FROM foo;

- 结果
	Aggregate  (cost=21.50..21.51 rows=1 width=32) (actual time=0.701..0.702 rows=1 loops=1)
	  ->  Seq Scan on foo  (cost=0.00..19.00 rows=1000 width=33) (actual time=0.015..0.216 rows=1000 loops=1)
	Planning Time: 0.319 ms
	Execution Time: 0.747 ms
	


#### 10.7.1. 解析
顺序扫描获取最大值

### 10.8. 使用了索引后
```
	CREATE INDEX ON foo(c2);
	EXPLAIN (ANALYZE) SELECT max(c2) FROM foo;

```
- 结果

```
	Result  (cost=0.33..0.34 rows=1 width=32) (actual time=0.146..0.146 rows=1 loops=1)
	  InitPlan 1 (returns $0)
	    ->  Limit  (cost=0.28..0.33 rows=1 width=33) (actual time=0.134..0.136 rows=1 loops=1)
	          ->  Index Only Scan Backward using foo_c2_idx on foo  (cost=0.28..57.77 rows=1000 width=33) (actual time=0.131..0.132 rows=1 loops=1)
	                Index Cond: (c2 IS NOT NULL)
	                Heap Fetches: 0
	Planning Time: 0.674 ms
	Execution Time: 0.200 ms
	
```


#### 10.8.1. 解析
Index Only Scan

### 10.9. group by

```
	DROP INDEX foo_c2_idx;
	EXPLAIN (ANALYZE)
	SELECT c2, count(*) FROM foo GROUP BY c2;
```

- 结果

```
	HashAggregate  (cost=24.00..34.00 rows=1000 width=41) (actual time=1.022..1.529 rows=1000 loops=1)
	  Group Key: c2
	  ->  Seq Scan on foo  (cost=0.00..19.00 rows=1000 width=33) (actual time=0.019..0.226 rows=1000 loops=1)
	Planning Time: 0.224 ms
	Execution Time: 1.716 ms
	
```


#### 10.9.1. 解析
使用的顺序扫描

### 10.10. 调大内存使用quick sort

### 10.11. 建立索引则使用索引



## 11. 参考链接
- <https://thoughtbot.com/blog/reading-an-explain-analyze-query-plan>	
- <http://www.dalibo.org/_media/understanding_explain.pdf>
- <https://www.postgresql.org/docs/current/using-explain.html>
- [https://public.dalibo.com/exports/conferences/_archives/_2012/201211_explain/understanding_explain.pdf](https://public.dalibo.com/exports/conferences/_archives/_2012/201211_explain/understanding_explain.pdf)

