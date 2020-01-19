[toc]

 

## 1. 两个问题

1. 这个场景需要使用的依赖是什么
2. 如何编写自动配置

- AutoConfiguration
```java
@Configuration
@ConditionalOnXXX
@AutoConfigAfter
@EnableConfigurationProperties(HelloProperties.class)
{
    @Bean
    //...
```

- Properites
```java
@ConfigurationProperties(prefix = "hello")
{
}
```

- 其他Service Bean

## 2. 实战


### 2.1. 创建empty project
![](https://raw.githubusercontent.com/TDoct/images/master/img/20191230101126.png)

### 2.2. 在project settings中添加两个maven project
![](https://raw.githubusercontent.com/TDoct/images/master/img/20191230101136.png)

### 2.3. hello-spring-boot-starter
#### 2.3.1. pom.xml依赖hello-spring-boot-starter-autoconfigure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
<modelVersion>4.0.0</modelVersion>

<groupId>com.zsk</groupId>
<artifactId>hello-spring-boot-starter</artifactId>
<version>1.0-SNAPSHOT</version>

<dependencies>
    <dependency>
        <groupId>com.zsk</groupId>
        <artifactId>hello-spring-boot-autoconfigure</artifactId>
        <version>1.0-SNAPSHOT</version>
    </dependency>
</dependencies>

</project>

```

### 2.4. hello-spring-boot-starter-autoconfigure
#### 2.4.1. pom.xml依赖spring-boot-starter

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
<modelVersion>4.0.0</modelVersion>

<groupId>com.zsk</groupId>
<artifactId>hello-spring-boot-autoconfigure</artifactId>
<version>1.0-SNAPSHOT</version>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter</artifactId>
        <version>1.5.20.RELEASE</version>
    </dependency>
</dependencies>
</project>
```

#### 2.4.2. 编写业务类
##### 2.4.2.1. HelloProperties

```java
package com.zsk.hello;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
* @description:
* @author: zsk
* @create: 2019-07-13 13:43
**/
@ConfigurationProperties(prefix = "hello")
public class HelloProperties
{
private String prefix;
private String suffix;

public String getPrefix()
{
    return prefix;
}

public void setPrefix(String prefix)
{
    this.prefix = prefix;
}

public String getSuffix()
{
    return suffix;
}

public void setSuffix(String suffix)
{
    this.suffix = suffix;
}
}


```
##### 2.4.2.2. HelloService

```java
package com.zsk.hello.service;

import com.zsk.hello.HelloProperties;

/**
 * @description:
 * @author: zsk
 * @create: 2019-07-13 13:45
 **/
public class HelloService
{
	private HelloProperties helloProperties;

	public HelloProperties getHelloProperties()
	{
		return helloProperties;
	}

	public void setHelloProperties(HelloProperties helloProperties)
	{
		this.helloProperties = helloProperties;
	}

	public void sayHello(String name)
	{
		System.out.println(helloProperties.getPrefix() + "name" + helloProperties.getSuffix());
	}
}
```


##### 2.4.2.3. HelloAutoConfiguration

```java
package com.zsk.hello;

import com.zsk.hello.service.HelloService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
* @description:
* @author: zsk
* @create: 2019-07-13 13:45
**/
@Configuration
@ConditionalOnWebApplication
@EnableConfigurationProperties(HelloProperties.class)
public class HelloAutoConfiguration
{

@Autowired
private HelloProperties helloProperties;

@Bean
public HelloService helloService()
{
    HelloService helloService = new HelloService();
    helloService.setHelloProperties(helloProperties);
    return helloService;
}
}


```
#### 2.4.3. 创建resouces/META-INF/spring.factories文件
```properties
# Auto Configure
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
com.zsk.hello.HelloAutoConfiguration
```

