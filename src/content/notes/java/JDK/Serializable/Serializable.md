---
title: "5.7 Serializable"
description: "1. 序列化与反序列化 序列化：把内存中的对象以某个格式保存在磁盘中或者在网络上传输 反序列化：把磁盘中保存的或者从网络上传输过来的数据按照某个格式转换成内存中的对象 2. 如何使用 2.1. 实现Serializable接口 2.2. 使用ObjectInputStream、ObjectOutpu"
sourcePath: "Java/JDK/Serializable/Serializable.md"
category: "java"
categoryLabel: "Java"
topic: "JDK"
topicLabel: "5.JDK"
order: 129
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-18T12:36:24Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---




## 1. 序列化与反序列化

![](https://raw.githubusercontent.com/TDoct/images/master/img/20191230141355.png)
序列化：把内存中的对象以某个格式保存在磁盘中或者在网络上传输
反序列化：把磁盘中保存的或者从网络上传输过来的数据按照某个格式转换成内存中的对象

## 2. 如何使用

### 2.1. 实现Serializable接口
```java
class User implements Serializable
{
    private String name;
    private Integer age;
	...	
}
```

### 2.2. 使用ObjectInputStream、ObjectOutputStream进行反序列化、序列化
```java
User user = new User();
user.setName("zsk");
user.setAge(24);

System.out.println(user);

ObjectOutputStream oos = null;

...try
    //序列化
    oos = new ObjectOutputStream(new FileOutputStream("tempFile"));
    oos.writeObject(user);
...

File file = new File("tempFile");
ObjectInputStream ois = null;

...try
    //反序列化
    ois = new ObjectInputStream(new FileInputStream(file));
    User newUser = (User) ois.readObject();
    System.out.println(newUser);
...
```


## 3. 如何自定义序列化和反序列化

序列化：实现writeObject方法。默认是ObjectOutputStream 的 defaultWriteObject
反序列化：实现readObject方法。默认是ObjectInputStream 的 defaultReadObject

## 4. Java中的序列化怎么实现的

只需要实现java.io.Serializable类即可，让我们看看这个类
```java
//什么都没有
public interface Serializable {
}
```

其实我们想想序列化既然是**内存<->磁盘or网络之间**的传输，这不就是IO么？所以找找在IO类中找找或许就有答案了。

### 4.1. ObjectInputStream
调用栈：
` readObject > readObject0 > readOrdinaryObject > readSerialData
 readObject > defaultReadObject
 readSerialData`
```java
private void readSerialData(Object obj, ObjectStreamClass desc)
        throws IOException
    {
        ObjectStreamClass.ClassDataSlot[] slots = desc.getClassDataLayout();
        for (int i = 0; i < slots.length; i++) {
            ObjectStreamClass slotDesc = slots[i].desc;

            if (slots[i].hasData) {
                if (obj == null || handles.lookupException(passHandle) != null) {
                    defaultReadFields(null, slotDesc); // skip field values
                //自定义了反序列化接口
                } else if (slotDesc.hasReadObjectMethod()) {
                    ThreadDeath t = null;
                    boolean reset = false;
                    SerialCallbackContext oldContext = curContext;
                    if (oldContext != null)
                        oldContext.check();
                    try {
                        curContext = new SerialCallbackContext(obj, slotDesc);

                        bin.setBlockDataMode(true);
                    	//通过反射的方式调用
                        slotDesc.invokeReadObject(obj, this);
                    } catch (ClassNotFoundException ex) {
                        /*
                         * In most cases, the handle table has already
                         * propagated a CNFException to passHandle at this
                         * point; this mark call is included to address cases
                         * where the custom readObject method has cons'ed and
                         * thrown a new CNFException of its own.
                         */
                        handles.markException(passHandle, ex);
                    } finally {
                        do {
                            try {
                                curContext.setUsed();
                                if (oldContext!= null)
                                    oldContext.check();
                                curContext = oldContext;
                                reset = true;
                            } catch (ThreadDeath x) {
                                t = x;  // defer until reset is true
                            }
                        } while (!reset);
                        if (t != null)
                            throw t;
                    }

                    /*
                     * defaultDataEnd may have been set indirectly by custom
                     * readObject() method when calling defaultReadObject() or
                     * readFields(); clear it to restore normal read behavior.
                     */
                    defaultDataEnd = false;
                } else {
                    defaultReadFields(obj, slotDesc);
                    }

                if (slotDesc.hasWriteObjectData()) {
                    skipCustomData();
                } else {
                    bin.setBlockDataMode(false);
                }
            } else {
                if (obj != null &&
                    slotDesc.hasReadObjectNoDataMethod() &&
                    handles.lookupException(passHandle) == null)
                {
                    slotDesc.invokeReadObjectNoData(obj);
                }
            }
        }
            }
```


### 4.2. ObjectOutPutStream
调用栈：
`writeObject > writeObject0（抛出未实现序列化接口的异常） >writeOrdinaryObject>writeSerialData>invokeWriteObject（调用自定义的序列化方法）
writeObject > defaultWriteObject`
 writeObject0
```java
 // remaining cases
if (obj instanceof String) {
    writeString((String) obj, unshared);
} else if (cl.isArray()) {
    writeArray(obj, desc, unshared);
} else if (obj instanceof Enum) {
    writeEnum((Enum<?>) obj, desc, unshared);
    //实现了Serializable接口
} else if (obj instanceof Serializable) {
    writeOrdinaryObject(obj, desc, unshared);
    //没有则抛出异常
} else {
    if (extendedDebugInfo) {
        throw new NotSerializableException(
            cl.getName() + "\n" + debugInfoStack.toString());
    } else {
        throw new NotSerializableException(cl.getName());
    }
}
```

 writeSerialData
```java
private void writeSerialData(Object obj, ObjectStreamClass desc)
        throws IOException
    {
        ObjectStreamClass.ClassDataSlot[] slots = desc.getClassDataLayout();
        for (int i = 0; i < slots.length; i++) {
            ObjectStreamClass slotDesc = slots[i].desc;
        	//如果自定义了writeObject方法
            if (slotDesc.hasWriteObjectMethod()) {
                PutFieldImpl oldPut = curPut;
                curPut = null;
                SerialCallbackContext oldContext = curContext;

                if (extendedDebugInfo) {
                    debugInfoStack.push(
                        "custom writeObject data (class \"" +
                        slotDesc.getName() + "\")");
                }
                try {
                    curContext = new SerialCallbackContext(obj, slotDesc);
                    bout.setBlockDataMode(true);
                	//则通过反射调用
                    slotDesc.invokeWriteObject(obj, this);
                    bout.setBlockDataMode(false);
                    bout.writeByte(TC_ENDBLOCKDATA);
                } finally {
                    curContext.setUsed();
                    curContext = oldContext;
                    if (extendedDebugInfo) {
                        debugInfoStack.pop();
                    }
                }

                curPut = oldPut;
            } else {
            	//否则
                defaultWriteFields(obj, slotDesc);
            }
        }
    }
```


## 5. 总结

- 只会关注实例的数据，不会关注类的static变量
- serialVersionUID
    - 这个字段是用来验证版本一致性的。
    - 在进行反序列化时，JVM 会把传来的字节流中的 serialVersionUID 与本地相应实体（类）的 serialVersionUID 进行比较
    - 如果相同就认为是一致的，可以进行反序列化
    - 否则就会出现序列化版本不一致的异常
-  序列化算法
     - 将对象实例相关的类元数据输出。
     - 递归地输出类的超类描述直到不再有超类。
     - 类元数据完了以后，开始从最顶层的超类开始输出对象实例的实际数据值。
     - 从上至下递归输出实例的数据


## 6. 参考链接
- [Java序列化机制和原理 \- redcreen \- 博客园](https://www.cnblogs.com/redcreen/articles/1955307.html)
- [深入分析Java的序列化与反序列化\-HollisChuang's Blog](https://www.hollischuang.com/archives/1140)
