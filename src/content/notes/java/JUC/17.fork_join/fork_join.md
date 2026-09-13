---
title: "6.17 fork_join"
description: "1. 是什么 并行执行的框架。把一个大任务分成多个小任务，每个小任务计算结果，最后汇总每个小任务的结果得到大任务的结果 1.1. 为什么出现 简单地使用线程池实现fork join需要考虑当前线程也跟着干活，而不是变成监工 2. 使用场景 计算密集型的任务 3. 如何使用 4. 原理分析 4.1. "
sourcePath: "Java/JUC/17.fork_join/fork_join.md"
category: "java"
categoryLabel: "Java"
topic: "JUC"
topicLabel: "6.JUC"
order: 167
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2025-06-27T13:53:42Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---






## 1. 是什么

并行执行的框架。把一个大任务分成多个小任务，每个小任务计算结果，最后汇总每个小任务的结果得到大任务的结果

### 1.1. 为什么出现
简单地使用线程池实现fork join需要考虑当前线程也跟着干活，而不是变成监工
```java
public class CustomForkJoin
{
    private static class CountTask implements Callable<Integer>
    {
        private static final int THRESHOLD = 1000;
        private int start;
        private int end;
        private ExecutorService executorService;

        public CountTask(int start, int end, ExecutorService executorService)
        {
            this.start = start;
            this.end = end;
            this.executorService = executorService;
        }

        @Override
        public Integer call() throws Exception
        {
            System.out.println(Thread.currentThread().getName() + " working for start:" + start + " end:" + end);
            int sum = 0;
            //如果已经到了阈值，那么直接计算，不用再拆分了
            boolean canCompute = (end - start) <= THRESHOLD;
            if (canCompute)
            {
                for (int i = start; i <= end; i++)
                {
                    sum += i;
                }
            }
            else
            {
                int middle = (start + end) / 2;
                CountTask leftTask = new CountTask(start, middle, executorService);
                CountTask rightTask = new CountTask(middle + 1, end, executorService);

                Future<Integer> leftResult = executorService.submit(leftTask);
                Future<Integer> rightResult = executorService.submit(rightTask);

                return leftResult.get() + rightResult.get();
            }
            return sum;
        }
    }



    public static void main(String[] args) throws Exception
    {
//        ExecutorService executorService = Executors.newFixedThreadPool(10);//线程数不够，阻塞住
        ExecutorService executorService = Executors.newCachedThreadPool();

        CountTask countTask = new CountTask(1, 1000000, executorService);
        Integer val = executorService.submit(countTask).get();
        executorService.shutdown();
        System.out.println(val);

    }

}
```


## 2. 使用场景

计算密集型的任务

## 3. 如何使用

```java
public class ForkJoinTest
{
    private static class CountTask extends RecursiveTask<Integer>//有返回值的Task，重写compute方法
    {
        private static final int THRESHOLD = 2;
        private int start;
        private int end;

        public CountTask(int start, int end)
        {
            this.start = start;
            this.end = end;
        }

        @Override
        protected Integer compute()
        {
            int sum = 0;
            //如果已经到了阈值，那么直接计算，不用再拆分了
            boolean canCompute = (end - start) <= THRESHOLD;
            if (canCompute)
            {
                for (int i = start; i <= end; i++)
                {
                    sum += i;
                }
            }
            else
            {
                int middle = (start + end) / 2;
                CountTask leftTask = new CountTask(start, middle);
                CountTask rightTask = new CountTask(middle + 1, end);

                invokeAll(leftTask, rightTask);//让当前线程也跟着干活，而不是变成监工
                //分成两个任务执行
                leftTask.fork();
                rightTask.fork();

                //汇总结果
                int leftResult = leftTask.join();
                int rightResult = rightTask.join();

                sum = leftResult + rightResult;
            }
            return sum;

        }
    }

    public static void main(String[] args) throws ExecutionException, InterruptedException
    {
        ForkJoinPool forkJoinPool = new ForkJoinPool();
        //计算1+2+3+4
        CountTask task = new CountTask(1,4);
        Future<Integer> result = forkJoinPool.submit(task);
        System.out.println(result.get());
    }
}
```


## 4. 原理分析


### 4.1. 工作窃取
每个线程都有自己的工作队列，有的线程已经执行完了所有任务，那么它可以从其他线程的工作队列中窃取任务执行
![](https://raw.githubusercontent.com/TDoct/images/master/img/20191230160936.png)

## 5. 参考链接

- [聊聊并发（八）——Fork/Join框架介绍\-InfoQ](https://www.infoq.cn/article/fork-join-introduction)
- [Java的Fork/Join任务，你写对了吗？ \- 廖雪峰的官方网站](https://www.liaoxuefeng.com/article/1146802219354112)
