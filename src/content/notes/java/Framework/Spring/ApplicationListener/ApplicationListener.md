---
title: "2.28 ApplicationListener"
description: "1. ApplicationListener是什么 就是观察者模式。生产者发布事件，多个消费者监听这个事件处理各自的逻辑，如此解耦了生产者消费者。后续如果还有消费者需要处理这个事件再增加一个Listener即可 2. 如何使用事件监听机制 比如我们有个需要上报工单后需要写邮件、写日志，取消工单后也需"
sourcePath: "Java/Framework/Spring/ApplicationListener/ApplicationListener.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 30
tags: ["Java"]
createdAt: "2020-02-13T12:23:54Z"
updatedAt: "2020-02-13T12:53:54Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. ApplicationListener是什么
就是观察者模式。生产者发布事件，多个消费者监听这个事件处理各自的逻辑，如此解耦了生产者消费者。后续如果还有消费者需要处理这个事件再增加一个Listener即可


## 2. 如何使用事件监听机制

比如我们有个需要上报工单后需要写邮件、写日志，取消工单后也需要写邮件、写日志。
我们可以把写邮件放到一个Service里，写日志放到另一个Service里，然后上报和取消的逻辑复用这两个Service。但是如果后续增加了一个需求，工单流转后需要通过站内信通知给用户，那么就需要再上报工单和取消工单的逻辑里修改代码，这样子不好。

为了解决这个问题，我们可以使用ApplicationListener机制。EmailListener、LogListener、MsgListener都监听工单事件即可


### 2.1. Model
- Ticket

```java
public class Ticket
{
    private Integer id;
    private String creater;
    private String handler;
    private Timestamp timestamp;

    private String operation;


    public String getHandler()
    {
        return handler;
    }

    public void setHandler(String handler)
    {
        this.handler = handler;
    }

    public String getOperation()
    {
        return operation;
    }

    public void setOperation(String operation)
    {
        this.operation = operation;
    }

    public Integer getId()
    {
        return id;
    }

    public void setId(Integer id)
    {
        this.id = id;
    }

    public String getCreater()
    {
        return creater;
    }

    public void setCreater(String creater)
    {
        this.creater = creater;
    }

    public Timestamp getTimestamp()
    {
        return timestamp;
    }

    public void setTimestamp(Timestamp timestamp)
    {
        this.timestamp = timestamp;
    }

    @Override
    public String toString()
    {
        return "Ticket{" + "id=" + id + ", creater='" + creater + '\'' + ", timestamp=" + timestamp + '}';
    }
}
```

### 2.2. 发布者
- TicketService

```java
@Service
public class TicketService
{
    public static final String REPORT = "REPORT";
    public static final String CANCEL = "CANCEL";


    @Autowired
    private ApplicationContext applicationContext;

    public void report()
    {
        Ticket ticket = new Ticket();
        ticket.setId(1);
        ticket.setTimestamp(new Timestamp(1L));
        ticket.setCreater("ZSK");

        System.out.println(Thread.currentThread().getName() + ": 上报Ticket成功");

        ticket.setOperation(REPORT);
        applicationContext.publishEvent(new TicketEvent(ticket));
    }

    public void cancel()
    {
        Ticket ticket = new Ticket();
        ticket.setId(1);
        ticket.setTimestamp(new Timestamp(1L));
        ticket.setCreater("ZSK");
        ticket.setHandler("WSY");

        System.out.println(Thread.currentThread().getName() + ": 取消Ticket成功");

        ticket.setOperation(CANCEL);
        applicationContext.publishEvent(new TicketEvent(ticket));
    }


}
```

### 2.3. 事件

- TicketEvent

```java
public class TicketEvent extends ApplicationEvent
{
    private Ticket ticket;

    /**
     * Create a new ApplicationEvent.
     *
     * @param source the object on which the event initially occurred (never {@code null})
     */
    public TicketEvent(Ticket source)
    {
        super(source);
        this.ticket = source;
    }

    public Ticket getTicket()
    {
        return ticket;
    }
}

```

### 2.4. 事件监听者

- EmailListener

```java
@Component
public class TicketEmailListener implements ApplicationListener<TicketEvent>
{
    @Override
    public void onApplicationEvent(TicketEvent event)
    {
        Ticket ticket = event.getTicket();

        List<String> toUms = new LinkedList<>();
        if (TicketService.REPORT.equals(ticket.getOperation()))
        {
            toUms.add(ticket.getCreater());
        }
        else if(TicketService.CANCEL.equals(ticket.getOperation()))
        {
            toUms.add(ticket.getCreater());
            toUms.add(ticket.getHandler());
        }


        this.doSendEmails(ticket,toUms);
    }

    private void doSendEmails(Ticket ticket, List<String> toUms)
    {
        System.out.println("发送邮件，收件人：" + toUms + "，工单：" + ticket);
    }
}

```

- LogListener

```java
@Component
public class TicketLogListener implements ApplicationListener<TicketEvent>
{
    @Override
    public void onApplicationEvent(TicketEvent event)
    {
        Ticket ticket = event.getTicket();

        String desc = null;
        if (TicketService.REPORT.equals(ticket.getOperation()))
        {
            desc = "上报";
        }
        else if(TicketService.CANCEL.equals(ticket.getOperation()))
        {
            desc = "取消";
        }


        this.doSendEmails(ticket,desc);
    }

    private void doSendEmails(Ticket ticket, String desc)
    {
        System.out.println("写日志，描述：" + desc + "，工单：" + ticket);
    }
}

```


### 2.5. 注意

Listener是跟Publisher运行在同一个线程中，也就是同步的。如果需要异步执行可以再`onApplicationEvent`方法上加上`@Async`注解


## 3. 参考
- [Spring中使用@Async注解使Even监听事件之间的执行变为异步 \- 贺小五的个人空间 \- OSCHINA](https://my.oschina.net/u/2278977/blog/794868?utm_source=debugrun&utm_medium=referral)
- [ApplicationContext发布事件和处理事件\_舞动de人生\-CSDN博客](https://blog.csdn.net/dongwujing/article/details/89339680)
