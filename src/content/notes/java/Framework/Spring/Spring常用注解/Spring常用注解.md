---
title: "2.47 Spring常用注解"
description: "注解作用 @Configuration 相当于之前的applicationContext.xml，就是一个配置文件 @ComponentScan 配置扫描包，如果有@Controller，@Service，@Repositiry，@Component修饰的，则把它加入ioc容器中 @Bean 配合@"
sourcePath: "Java/Framework/Spring/Spring常用注解/Spring常用注解.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 49
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-17T13:06:57Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---






## 注解作用


### @Configuration
相当于之前的applicationContext.xml，就是一个配置文件

### @ComponentScan
配置扫描包，如果有@Controller，@Service，@Repositiry，@Component修饰的，则把它加入ioc容器中

### @Bean
配合@Configuration一起使用，相当于之前的bean标签
#### 生命周期
[Bean生命周期.md](/notes/java/Framework/Spring/Bean/Bean%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F/)


### @Scope
指定作用域。
- prototype表示每次用到都会创建新的对象，不会在ioc容器启动时创建
- singleton表示只有一个对象，并且ioc容器一启动就会创建
#### 作用域
[Bean作用域.md](/notes/java/Framework/Spring/Bean/Bean%E4%BD%9C%E7%94%A8%E5%9F%9F/)
### @Lazy
配置@Bean使用，不是在ioc容器启动之时创建对象，而是在第一次使用时创建

### @Conditional
满足一定条件才生效
- Condition类
```java
public class LinuxCondition implements Condition
{
    @Override
    public boolean matches(ConditionContext conditionContext, AnnotatedTypeMetadata annotatedTypeMetadata)
    {
        Environment environment = conditionContext.getEnvironment();
        String osName = environment.getProperty("os.name");
        if (osName.contains("Linux"))
        {
            return true;
        }
        return false;
    }
}
```

- Config

```java
@Configuration
public class EnvConfig
{
    @Conditional(value = {WindowsCondition.class})
    @Bean
    public Windows windows()
    {
        return new Windows();
    }

    @Conditional(value = {LinuxCondition.class})
    @Bean
    public Linux linux()
    {
        return new Linux();
    }
}

```


### @Import
- 类似于Bean，可以快速导入无参bean
#### 导入一个
@Import(Linux.class)

#### 导入多个
##### 实现ImportSelector

```java
public class MyImportSelector implements ImportSelector
{
    //返回的是所有要生成的bean的全类名数组
    @Override
    public String[] selectImports(AnnotationMetadata annotationMetadata)
    {
        return new String[]{"com.zsk.context.os.Windows"};
    }
}

```

- Config
```java
@Configuration
@Import(value = {MyImportSelector.class})
public class EnvConfig
{...}
```
##### 实现ImportBeanDefinitionRegistrar

```java
public class MyImportBeanDefinitionRegistrar implements ImportBeanDefinitionRegistrar
{
    @Override
    //注解信息
    //bean注册中心
    public void registerBeanDefinitions(AnnotationMetadata annotationMetadata, BeanDefinitionRegistry beanDefinitionRegistry)
    {
        boolean containsLinux = beanDefinitionRegistry.containsBeanDefinition("linux");
        if (containsLinux)
        {
            RootBeanDefinition rootBeanDefinition = new RootBeanDefinition(Linux.class);
            beanDefinitionRegistry.registerBeanDefinition("linux", rootBeanDefinition);
        }

    }
}
```

### @Value
注入属性值

### @Autowire
自动注入依赖

### @Qulifier
配合Autowired使用，注入某个名字的bean

### @Primary
配合@Autowired使用，如果有多个bean但是又没有Qulifire制定名字，那么默认使用@Primary修饰的那个

### @Profile
指定什么环境下配置生效

### Aware类
可以把spring底层的一些组件，例如ApplicationContext都注入到bean中
#### 类体系
![](https://raw.githubusercontent.com/TDoct/images/master/img/20200102232343.png)
#### 使用
```java
@Component
public class AwareTest implements ApplicationContextAware
{
    private ApplicationContext applicationContext;

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException
    {
        System.out.println("自动注入ApplicationContext");
        this.applicationContext = applicationContext;
    }
}
```

#### 原理
XXXAware的功能是通过XXXAwareProcessor实现的
比如ApplicationContextAware是通过ApplicationContextAwareProcessor
```java
class ApplicationContextAwareProcessor implements BeanPostProcessor {
	@Override
	public Object postProcessBeforeInitialization(final Object bean, String beanName) throws BeansException {
		AccessControlContext acc = null;

		if (System.getSecurityManager() != null &&
				(bean instanceof EnvironmentAware || bean instanceof EmbeddedValueResolverAware ||
						bean instanceof ResourceLoaderAware || bean instanceof ApplicationEventPublisherAware ||
						bean instanceof MessageSourceAware || bean instanceof ApplicationContextAware)) {
			acc = this.applicationContext.getBeanFactory().getAccessControlContext();
		}

		if (acc != null) {
			//权限判断
			AccessController.doPrivileged(new PrivilegedAction<Object>() {
				@Override
				public Object run() {
					invokeAwareInterfaces(bean);
					return null;
				}
			}, acc);
		}
		else {
			//判断bean类型并调用相应的方法
			invokeAwareInterfaces(bean);
		}

		return bean;
	}

	private void invokeAwareInterfaces(Object bean) {
		if (bean instanceof Aware) {
			if (bean instanceof EnvironmentAware) {
				((EnvironmentAware) bean).setEnvironment(this.applicationContext.getEnvironment());
			}
			if (bean instanceof EmbeddedValueResolverAware) {
				((EmbeddedValueResolverAware) bean).setEmbeddedValueResolver(this.embeddedValueResolver);
			}
			if (bean instanceof ResourceLoaderAware) {
				((ResourceLoaderAware) bean).setResourceLoader(this.applicationContext);
			}
			if (bean instanceof ApplicationEventPublisherAware) {
				((ApplicationEventPublisherAware) bean).setApplicationEventPublisher(this.applicationContext);
			}
			if (bean instanceof MessageSourceAware) {
				((MessageSourceAware) bean).setMessageSource(this.applicationContext);
			}
			//如果是ApplicationContextAware类型
			if (bean instanceof ApplicationContextAware) {
				//强转成ApplicationContextAware并调用setApplicationContext方法
				((ApplicationContextAware) bean).setApplicationContext(this.applicationContext);
			}
		}
	}	
}
```
