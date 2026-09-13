---
title: "2.37 MyBatis自动配置"
description: "1. 开启MyBatis自动配置 spring boot自动配置mybatis是通过@MybatisAutoConfiguration注解开启的，如下 实现了InitializingBean，在spring实例化MybatisAutoConfiguration这个bean之后会调用其afterPro"
sourcePath: "Java/Framework/SpringBoot/MyBatis自动配置/MyBatis自动配置.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 39
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-19T03:19:55Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---




## 1. 开启MyBatis自动配置

spring boot自动配置mybatis是通过@MybatisAutoConfiguration注解开启的，如下
```java
@org.springframework.context.annotation.Configuration
@ConditionalOnClass({ SqlSessionFactory.class, SqlSessionFactoryBean.class })
@ConditionalOnSingleCandidate(DataSource.class)
@EnableConfigurationProperties(MybatisProperties.class)
@AutoConfigureAfter(DataSourceAutoConfiguration.class)
public class MybatisAutoConfiguration implements InitializingBean {
 @Override
  public void afterPropertiesSet() {
	//如果开启了配置文件校验，那么校验配置文件是否存在
	//默认不开启
    checkConfigFileExists();
  }
}
```

实现了InitializingBean，在spring实例化MybatisAutoConfiguration这个bean之后会调用其afterPropertiesSet方法，会校验mybatis.config配置文件是否存在
初次之外，这个类最底下还有一个@Configuration
```Java
@org.springframework.context.annotation.Configuration
@Import({ AutoConfiguredMapperScannerRegistrar.class })//导入了AutoConfiguredMapperScannerRegistrar
@ConditionalOnMissingBean(MapperFactoryBean.class)
public static class MapperScannerRegistrarNotFoundConfiguration implements InitializingBean {

	@Override
	public void afterPropertiesSet() {
	  logger.debug("No {} found.", MapperFactoryBean.class.getName());
	}
}
```

这个类的作用在于导入了AutoConfiguredMapperScannerRegistrar，我们继续研究他

## 2. 如何确定扫描的包
AutoConfiguredMapperScannerRegistrar的会从@MybatisAutoConfiguration所在的package开始扫描，将所有有@Mapper注解的类都加入容器中
```java
public void registerBeanDefinitions(AnnotationMetadata importingClassMetadata, BeanDefinitionRegistry registry) {

  if (!AutoConfigurationPackages.has(this.beanFactory)) {
    logger.debug("Could not determine auto-configuration package, automatic mapper scanning disabled.");
    return;
  }

  logger.debug("Searching for mappers annotated with @Mapper");

	//packages为MybatisAutoConfiguration所在的包:com.zsk.template
  List<String> packages = AutoConfigurationPackages.get(this.beanFactory);
  if (logger.isDebugEnabled()) {
    packages.forEach(pkg -> logger.debug("Using auto-configuration base package '{}'", pkg));
  }

  ClassPathMapperScanner scanner = new ClassPathMapperScanner(registry);
  if (this.resourceLoader != null) {
    scanner.setResourceLoader(this.resourceLoader);
  }
//扫描所有@Mapper注解
  scanner.setAnnotationClass(Mapper.class);
  scanner.registerFilters();
  scanner.doScan(StringUtils.toStringArray(packages));

}
```
