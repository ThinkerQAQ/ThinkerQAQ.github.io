---
title: "2.85 Spring_AOP源码分析总结"
description: "创建日期 星期一 22 七月 2019 源码分析 ---- 1. @EnableAspectJAutoProxy @Target(ElementType.TYPE) @Retention(RetentionPolicy.RUNTIME) @Documented @Import(AspectJAuto"
sourcePath: "Java/Framework/Spring/Spring_AOP/源码分析/3.总结/Spring_AOP源码分析总结.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 87
tags: ["Java"]
createdAt: "2020-01-17T13:06:57Z"
updatedAt: "2020-01-18T13:17:58Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---


创建日期 星期一 22 七月 2019



源码分析
----

### 1. @EnableAspectJAutoProxy
	@Target(ElementType.TYPE)
	@Retention(RetentionPolicy.RUNTIME)
	@Documented
	@Import(AspectJAutoProxyRegistrar.class)//导入了AspectJAutoProxyRegistrar组件
	public @interface EnableAspectJAutoProxy {

		boolean proxyTargetClass() default false;
		boolean exposeProxy() default false;

	}


### 2. AspectJAutoProxyRegistrar
	//实现了ImportBeanDefinitionRegistrar接口，可以向ioc容器导入bean
	class AspectJAutoProxyRegistrar implements ImportBeanDefinitionRegistrar {

		@Override
		public void registerBeanDefinitions(
				AnnotationMetadata importingClassMetadata, BeanDefinitionRegistry registry) {

			//向容器中注册AnnotationAwareAspectJAutoProxyCreator bean
			AopConfigUtils.registerAspectJAnnotationAutoProxyCreatorIfNecessary(registry);

			AnnotationAttributes enableAspectJAutoProxy =
					AnnotationConfigUtils.attributesFor(importingClassMetadata, EnableAspectJAutoProxy.class);
			if (enableAspectJAutoProxy.getBoolean("proxyTargetClass")) {
				AopConfigUtils.forceAutoProxyCreatorToUseClassProxying(registry);
			}
			if (enableAspectJAutoProxy.getBoolean("exposeProxy")) {
				AopConfigUtils.forceAutoProxyCreatorToExposeProxy(registry);
			}
		}

	}


### 3. AopConfigUtils

#### 3.1. registerAspectJAnnotationAutoProxyCreatorIfNecessary
	public static BeanDefinition registerAspectJAnnotationAutoProxyCreatorIfNecessary(BeanDefinitionRegistry registry, Object source) {
			//导入AnnotationAwareAspectJAutoProxyCreator
			return registerOrEscalateApcAsRequired(AnnotationAwareAspectJAutoProxyCreator.class, registry, source);
		}



#### 3.2. registerOrEscalateApcAsRequired
	private static BeanDefinition registerOrEscalateApcAsRequired(Class<?> cls, BeanDefinitionRegistry registry, Object source) {
			Assert.notNull(registry, "BeanDefinitionRegistry must not be null");

			//已经存在org.springframework.aop.config.internalAutoProxyCreator的bean
			if (registry.containsBeanDefinition(AUTO_PROXY_CREATOR_BEAN_NAME)) {
				BeanDefinition apcDefinition = registry.getBeanDefinition(AUTO_PROXY_CREATOR_BEAN_NAME);
				if (!cls.getName().equals(apcDefinition.getBeanClassName())) {
					int currentPriority = findPriorityForClass(apcDefinition.getBeanClassName());
					int requiredPriority = findPriorityForClass(cls);
					if (currentPriority < requiredPriority) {
						apcDefinition.setBeanClassName(cls.getName());
					}
				}
				return null;
			}

			//不存在则创建该AnnotationAwareAspectJAutoProxyCreator bean，放入ioc容器
			RootBeanDefinition beanDefinition = new RootBeanDefinition(cls);
			beanDefinition.setSource(source);
			beanDefinition.getPropertyValues().add("order", Ordered.HIGHEST_PRECEDENCE);
			beanDefinition.setRole(BeanDefinition.ROLE_INFRASTRUCTURE);
			registry.registerBeanDefinition(AUTO_PROXY_CREATOR_BEAN_NAME, beanDefinition);
			return beanDefinition;
		}


### 4. AnnotationAwareAspectJAutoProxyCreator

#### 4.1. 类体系
由下图可看出AnnotationAwareAspectJAutoProxyCreator主要实现了
BeanFactoryAware接口。setBeanFactory方法（为bean注入BeanFactory）
以及BeanPostProcessor接口。postProcessBeforeInitialization方法（bean初始化之前做一些事情）和postProcessAfterInitialization方法（bean初始化之后做一些事情））
图片未迁移

### 5. 流程分析

#### 5.1. 调试
为AnnotationAwareAspectJAutoProxyCreator类体系的关键方法加上断点，运行。
1）、传入配置类，创建ioc容器
2）、注册配置类，调用refresh()刷新容器
3）、registerBeanPostProcessors(beanFactory)；注册bean的后置处理器拦截bean的创建
1）、先获取ioc容器中的所有BeanPostProcessor
2）、给容器中加入别的BeanPostProcessor
3）、优先注册实现了PriorityOrdered接口的BeanPostProcessor
4）、然后注册实现了Ordered接口的BeanPostProcessor
5）、接着注册没实现接口的BeanPostProcessor
6）、注册BeanPostProcessor，实际上就是创建BeanPostProcessor保存在容器中
创建internalAutoProxyCreator的BeanPostProcessor[]
1）、创建Bean的实例
2）、populateBean，给bean的各种属性赋值
3）、initializeBean，初始化bean
1）、invokeAwareMethods()，处理Aware接口的方法回调
2）、applyBeanPostProcessorsBeforeInitialization()
3）、invokeInitMethods()，执行自定义的初始化方法
4）、applyBeanPostProcessorsAfterInitialization()
4）、BeanPostProcessor（AnnotationAwareAspecJAutoProxyCreater）
7）、把BeanPostProcessor注册到BeanFactory中
beanFactory.addBeanPostProcessor(processor)
======================通过以上过程就把AnnotationAwareAspecJAutoProxyCreater注册进容器中=======================================

#### 5.2. AbstractAutoProxyCreator

##### 5.2.1. postProcessBeforeInstantiation
	public Object postProcessBeforeInstantiation(Class<?> beanClass, String beanName) throws BeansException {
			//获取缓存key
			Object cacheKey = getCacheKey(beanClass, beanName);


			if (beanName == null || !this.targetSourcedBeans.contains(beanName)) {
				//判断是否在已经增强的bean里
				if (this.advisedBeans.containsKey(cacheKey)) {
					//是的话说明已经增强过，直接返回
					return null;
				}
				//调用AnnotationAwareAspectJAutoProxyCreator的isInfrastructureClass方法以及shouldSkip方法
				if (isInfrastructureClass(beanClass) || shouldSkip(beanClass, beanName)) {
					this.advisedBeans.put(cacheKey, Boolean.FALSE);
					return null;
				}
			}

			// Create proxy here if we have a custom TargetSource.
			// Suppresses unnecessary default instantiation of the target bean:
			// The TargetSource will handle target instances in a custom fashion.
			if (beanName != null) {
				TargetSource targetSource = getCustomTargetSource(beanClass, beanName);
				if (targetSource != null) {
					this.targetSourcedBeans.add(beanName);
					Object[] specificInterceptors = getAdvicesAndAdvisorsForBean(beanClass, beanName, targetSource);
					Object proxy = createProxy(beanClass, beanName, specificInterceptors, targetSource);
					this.proxyTypes.put(cacheKey, proxy.getClass());
					return proxy;
				}
			}

			return null;
		}


##### 5.2.2. isInfrastructureClass
	protected boolean isInfrastructureClass(Class<?> beanClass) {
			//判断是否是Advice、Pointcut、Advisor、AopInfrastructureBean类
			boolean retVal = Advice.class.isAAopInfrastructureBeanssignableFrom(beanClass) ||
					Pointcut.class.isAssignableFrom(beanClass) ||
					Advisor.class.isAssignableFrom(beanClass) ||
					AopInfrastructureBean.class.isAssignableFrom(beanClass);
			if (retVal && logger.isTraceEnabled()) {
				logger.trace("Did not attempt to auto-proxy infrastructure class [" + beanClass.getName() + "]");
			}
			return retVal;
		}


##### 5.2.3. postProcessAfterInitialization
	//创建完Calc对象后会调用这个方法
	public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
			if (bean != null) {
				Object cacheKey = getCacheKey(bean.getClass(), beanName);
				if (this.earlyProxyReferences.remove(cacheKey) != bean) {
					//必要时包装Calc
					return wrapIfNecessary(bean, beanName, cacheKey);
				}
			}
			return bean;
		}


##### 5.2.4. wrapIfNecessary
	protected Object wrapIfNecessary(Object bean, String beanName, Object cacheKey) {
			if (beanName != null && this.targetSourcedBeans.contains(beanName)) {
				return bean;
			}
			if (Boolean.FALSE.equals(this.advisedBeans.get(cacheKey))) {
				return bean;
			}
			if (isInfrastructureClass(bean.getClass()) || shouldSkip(bean.getClass(), beanName)) {
				this.advisedBeans.put(cacheKey, Boolean.FALSE);
				return bean;
			}

			// Create proxy if we have advice.
			//获取Calc所有的增强器
			Object[] specificInterceptors = getAdvicesAndAdvisorsForBean(bean.getClass(), beanName, null);
			if (specificInterceptors != DO_NOT_PROXY) {
				this.advisedBeans.put(cacheKey, Boolean.TRUE);
				//创建代理类增强当前bean
				Object proxy = createProxy(
						bean.getClass(), beanName, specificInterceptors, new SingletonTargetSource(bean));
				this.proxyTypes.put(cacheKey, proxy.getClass());
				return proxy;
			}

			this.advisedBeans.put(cacheKey, Boolean.FALSE);
			return bean;
		}


##### 5.2.5. createProxy
	protected Object createProxy(
				Class<?> beanClass, String beanName, Object[] specificInterceptors, TargetSource targetSource) {

			if (this.beanFactory instanceof ConfigurableListableBeanFactory) {
				AutoProxyUtils.exposeTargetClass((ConfigurableListableBeanFactory) this.beanFactory, beanName, beanClass);
			}

			ProxyFactory proxyFactory = new ProxyFactory();
			proxyFactory.copyFrom(this);

			if (!proxyFactory.isProxyTargetClass()) {
				if (shouldProxyTargetClass(beanClass, beanName)) {
					proxyFactory.setProxyTargetClass(true);
				}
				else {
					evaluateProxyInterfaces(beanClass, proxyFactory);
				}
			}

			Advisor[] advisors = buildAdvisors(beanName, specificInterceptors);
			proxyFactory.addAdvisors(advisors);
			proxyFactory.setTargetSource(targetSource);
			customizeProxyFactory(proxyFactory);

			proxyFactory.setFrozen(this.freezeProxy);
			if (advisorsPreFiltered()) {
				proxyFactory.setPreFiltered(true);
			}

			//用ProxyFactory代理工厂创建对象
			return proxyFactory.getProxy(getProxyClassLoader());
		}


#### 5.3. AnnotationAwareAspectJAutoProxyCreator

##### 5.3.1. isInfrastructureClass
	protected boolean isInfrastructureClass(Class<?> beanClass) {
			//AbstractAutoProxyCreator.isInfrastructureClass || AbstractAspectJAdvisorFactory.isAspect
			return (super.isInfrastructureClass(beanClass) || this.aspectJAdvisorFactory.isAspect(beanClass));
		}


##### 5.3.2. isAspect
	public boolean isAspect(Class<?> clazz) {
			//有@Aspect注解 并且 没有以ajc$开头的属性
			return (hasAspectAnnotation(clazz) && !compiledByAjc(clazz));
		}


#### 5.4. AspectJAwareAdvisorAutoProxyCreator

##### 5.4.1. shouldSkip
	protected boolean shouldSkip(Class<?> beanClass, String beanName) {
			// TODO: Consider optimization by caching the list of the aspect names
			//找到所有增强的切面：就是LogAspect中的增强方法
			List<Advisor> candidateAdvisors = findCandidateAdvisors();
			for (Advisor advisor : candidateAdvisors) {
				//只要有一个增强器是AspectJPointcutAdvisor类型的并且增强器修饰的bean就是beanName，那么返回true
				if (advisor instanceof AspectJPointcutAdvisor) {
					if (((AbstractAspectJAdvice) advisor.getAdvice()).getAspectName().equals(beanName)) {
						return true;
					}
				}
			}
			return super.shouldSkip(beanClass, beanName);
		}


#### 5.5. AbstractAdvisorAutoProxyCreator

##### 5.5.1. getAdvicesAndAdvisorsForBean
	protected Object[] getAdvicesAndAdvisorsForBean(Class<?> beanClass, String beanName, TargetSource targetSource) {
			List<Advisor> advisors = findEligibleAdvisors(beanClass, beanName);
			if (advisors.isEmpty()) {
				return DO_NOT_PROXY;
			}
			return advisors.toArray();
		}


##### 5.5.2. findEligibleAdvisors
	protected List<Advisor> findEligibleAdvisors(Class<?> beanClass, String beanName) {
			//获取所有的增强器
			List<Advisor> candidateAdvisors = findCandidateAdvisors();
			//筛选出能应用到当前bean上的增强器
			List<Advisor> eligibleAdvisors = findAdvisorsThatCanApply(candidateAdvisors, beanClass, beanName);
			extendAdvisors(eligibleAdvisors);
			if (!eligibleAdvisors.isEmpty()) {
				eligibleAdvisors = sortAdvisors(eligibleAdvisors);
			}
			return eligibleAdvisors;
		}


##### 5.5.3. findAdvisorsThatCanApply
	protected List<Advisor> findAdvisorsThatCanApply(
				List<Advisor> candidateAdvisors, Class<?> beanClass, String beanName) {

			ProxyCreationContext.setCurrentProxiedBeanName(beanName);
			try {
				//调用AopUtils获取能应用的增强器
				return AopUtils.findAdvisorsThatCanApply(candidateAdvisors, beanClass);
			}
			finally {
				ProxyCreationContext.setCurrentProxiedBeanName(null);
			}
		}


#### 5.6. AopUtils

##### 5.6.1. findAdvisorsThatCanApply
	public static List<Advisor> findAdvisorsThatCanApply(List<Advisor> candidateAdvisors, Class<?> clazz) {
			if (candidateAdvisors.isEmpty()) {
				return candidateAdvisors;
			}
			List<Advisor> eligibleAdvisors = new LinkedList<Advisor>();
			//遍历所有增强器，最后调用的都是getClassFilter().matches()方法判断的
			for (Advisor candidate : candidateAdvisors) {
				if (candidate instanceof IntroductionAdvisor && canApply(candidate, clazz)) {
					eligibleAdvisors.add(candidate);
				}
			}
			boolean hasIntroductions = !eligibleAdvisors.isEmpty();
			for (Advisor candidate : candidateAdvisors) {
				if (candidate instanceof IntroductionAdvisor) {
					// already processed
					continue;
				}
				if (canApply(candidate, clazz, hasIntroductions)) {
					eligibleAdvisors.add(candidate);
				}
			}
			return eligibleAdvisors;
		}



#### 5.7. ProxyFactory

##### 5.7.1. getProxy
	public Object getProxy(ClassLoader classLoader) {
			//ProxyCreatorSupport的createAopProxy
			return createAopProxy().getProxy(classLoader);
		}


#### 5.8. ProxyCreatorSupport

##### 5.8.1. createAopProxy
	protected final synchronized AopProxy createAopProxy() {
			if (!this.active) {
				activate();
			}
			//调用DefaultAopProxyFactory的createAopProxy方法	
			return getAopProxyFactory().createAopProxy(this);
		}


#### 5.9. DefaultAopProxyFactory

##### 5.9.1. createAopProxy
	public AopProxy createAopProxy(AdvisedSupport config) throws AopConfigException {
			if (config.isOptimize() || config.isProxyTargetClass() || hasNoUserSuppliedProxyInterfaces(config)) {
				Class<?> targetClass = config.getTargetClass();
				if (targetClass == null) {
					throw new AopConfigException("TargetSource cannot determine target class: " +
							"Either an interface or a target is required for proxy creation.");
				}
				if (targetClass.isInterface() || Proxy.isProxyClass(targetClass)) {
					return new JdkDynamicAopProxy(config);
				}
				//没有的话使用cglib继承
				return new ObjenesisCglibAopProxy(config);
			}
			else {
				//有接口的话使用jdk代理
				return new JdkDynamicAopProxy(config);
			}
		}



### 6. 目标方法执行

#### 6.1. CglibAopProxy

##### 6.1.1. intercept
	//拦截目标方法的执行
	public Object intercept(Object proxy, Method method, Object[] args, MethodProxy methodProxy) throws Throwable {
			Object oldProxy = null;
			boolean setProxyContext = false;
			Class<?> targetClass = null;
			Object target = null;
			try {
				if (this.advised.exposeProxy) {
					// Make invocation available if necessary.
					oldProxy = AopContext.setCurrentProxy(proxy);
					setProxyContext = true;
				}
				// May be null. Get as late as possible to minimize the time we
				// "own" the target, in case it comes from a pool...
				target = getTarget();
				if (target != null) {
					targetClass = target.getClass();
				}
				//获取目标方法的拦截器链:AdvisedSupportAdvisedSupport.getInterceptorsAndDynamicInterceptionAdvice()
				List<Object> chain = this.advised.getInterceptorsAndDynamicInterceptionAdvice(method, targetClass);
				Object retVal;
				// Check whether we only have one InvokerInterceptor: that is,
				// no real advice, but just reflective invocation of the target.
				//没有拦截器链
				if (chain.isEmpty() && Modifier.isPublic(method.getModifiers())) {
					// We can skip creating a MethodInvocation: just invoke the target directly.
					// Note that the final invoker must be an InvokerInterceptor, so we know
					// it does nothing but a reflective operation on the target, and no hot
					// swapping or fancy proxying.
					//直接执行目标方法
					Object[] argsToUse = AopProxyUtils.adaptArgumentsIfNecessary(method, args);
					retVal = methodProxy.invoke(target, argsToUse);
				}
				else {
					// We need to create a method invocation...
					//把需要执行的目标对象，目标方法，拦截器链等信息传入创建CglibMethodInvocation
					//接着执行这个对象的proceed方法
					retVal = new CglibMethodInvocation(proxy, target, method, args, targetClass, chain, methodProxy).proceed();
				}
				retVal = processReturnType(proxy, target, method, retVal);
				return retVal;
			}
			finally {
				if (target != null) {
					releaseTarget(target);
				}
				if (setProxyContext) {
					// Restore old proxy.
					AopContext.setCurrentProxy(oldProxy);
				}
			}
		}



#### 6.2. AdvisedSupportAdvisedSupport

##### 6.2.1. getInterceptorsAndDynamicInterceptionAdvice
	public List<Object> getInterceptorsAndDynamicInterceptionAdvice(Method method, Class<?> targetClass) {
			MethodCacheKey cacheKey = new MethodCacheKey(method);
			List<Object> cached = this.methodCache.get(cacheKey);
			if (cached == null) {
			//#### DefaultAdvisorChainFactory##### getInterceptorsAndDynamicInterceptionAdvice
				cached = this.advisorChainFactory.getInterceptorsAndDynamicInterceptionAdvice(
						this, method, targetClass);
				this.methodCache.put(cacheKey, cached);
			}
			return cached;
		}


#### 6.3. DefaultAdvisorChainFactory

##### 6.3.1. getInterceptorsAndDynamicInterceptionAdvice
	public List<Object> getInterceptorsAndDynamicInterceptionAdvice(
				Advised config, Method method, Class<?> targetClass) {

			// This is somewhat tricky... We have to process introductions first,
			// but we need to preserve order in the ultimate list.
			List<Object> interceptorList = new ArrayList<Object>(config.getAdvisors().length);
			Class<?> actualClass = (targetClass != null ? targetClass : method.getDeclaringClass());
			boolean hasIntroductions = hasMatchingIntroductions(config, actualClass);
			AdvisorAdapterRegistry registry = GlobalAdvisorAdapterRegistry.getInstance();

			//获取所有的增强器，封装成Interceptor
			for (Advisor advisor : config.getAdvisors()) {
				if (advisor instanceof PointcutAdvisor) {
					// Add it conditionally.
					PointcutAdvisor pointcutAdvisor = (PointcutAdvisor) advisor;
					if (config.isPreFiltered() || pointcutAdvisor.getPointcut().getClassFilter().matches(actualClass)) {
						MethodMatcher mm = pointcutAdvisor.getPointcut().getMethodMatcher();
						if (MethodMatchers.matches(mm, method, actualClass, hasIntroductions)) {
							//调用DefaultAdvisorAdapterRegistry的getInterceptors方法
							MethodInterceptor[] interceptors = registry.getInterceptors(advisor);
							if (mm.isRuntime()) {
								// Creating a new object instance in the getInterceptors() method
								// isn't a problem as we normally cache  
								for (MethodInterceptor interceptor : interceptors) {
									interceptorList.add(new InterceptorAndDynamicMethodMatcher(interceptor, mm));
								}
							}
							else {
								interceptorList.addAll(Arrays.asList(interceptors));
							}
						}
					}
				}
				else if (advisor instanceof IntroductionAdvisor) {
					IntroductionAdvisor ia = (IntroductionAdvisor) advisor;
					if (config.isPreFiltered() || ia.getClassFilter().matches(actualClass)) {
						Interceptor[] interceptors = registry.getInterceptors(advisor);
						interceptorList.addAll(Arrays.asList(interceptors));
					}
				}
				else {
					Interceptor[] interceptors = registry.getInterceptors(advisor);
					interceptorList.addAll(Arrays.asList(interceptors));
				}
			}

			return interceptorList;
		}


#### 6.4. DefaultAdvisorAdapterRegistry

##### 6.4.1. getInterceptors
	public MethodInterceptor[] getInterceptors(Advisor advisor) throws UnknownAdviceTypeException {
			List<MethodInterceptor> interceptors = new ArrayList<MethodInterceptor>(3);
			Advice advice = advisor.getAdvice();
			//如果是MethodInterceptor，直接加入进去
			if (advice instanceof MethodInterceptor) {
				interceptors.add((MethodInterceptor) advice);
			}
			for (AdvisorAdapter adapter : this.adapters) {
				//使用适配器
				if (adapter.supportsAdvice(advice)) {
					interceptors.add(adapter.getInterceptor(advisor));
				}
			}
			if (interceptors.isEmpty()) {
				throw new UnknownAdviceTypeException(advisor.getAdvice());
			}
			return interceptors.toArray(new MethodInterceptor[interceptors.size()]);
		}


#### 6.5. ReflectiveMethodInvocation

##### 6.5.1. proceed
	public Object proceed() throws Throwable {
			//	We start with an index of -1 and increment early.
			//如果没有拦截器链或者执行到最后一个拦截器
			if (this.currentInterceptorIndex == this.interceptorsAndDynamicMethodMatchers.size() - 1) {
				//通过反射执行目标方法method.invoke(target, args);
				return invokeJoinpoint();
			}

			//获取第n个拦截器
			Object interceptorOrInterceptionAdvice =
					this.interceptorsAndDynamicMethodMatchers.get(++this.currentInterceptorIndex);
			if (interceptorOrInterceptionAdvice instanceof InterceptorAndDynamicMethodMatcher) {
				// Evaluate dynamic method matcher here: static part will already have
				// been evaluated and found to match.
				InterceptorAndDynamicMethodMatcher dm =
						(InterceptorAndDynamicMethodMatcher) interceptorOrInterceptionAdvice;
				if (dm.methodMatcher.matches(this.method, this.targetClass, this.arguments)) {
					return dm.interceptor.invoke(this);
				}
				else {
					// Dynamic matching failed.
					// Skip this interceptor and invoke the next in the chain.
					return proceed();
				}
			}
			else {
				// It's an interceptor, so we just invoke it: The pointcut will have
				// been evaluated statically before this object was constructed.
				//调用ExposeInvocationInterceptor的invoke方法
				//最后一次会调用MethodBeforeAdviceInterceptor.invoke方法
				return ((MethodInterceptor) interceptorOrInterceptionAdvice).invoke(this);
			}
		}


#### 6.6. ExposeInvocationInterceptor

##### 6.6.1. invoke
	public Object invoke(MethodInvocation mi) throws Throwable {
			//private static final ThreadLocal<MethodInvocation> invocation = new NamedThreadLocal<MethodInvocation>("Current AOP method invocation");
			MethodInvocation oldInvocation = invocation.get();
			//设置当前ThreadLocal关联的拦截器
			invocation.set(mi);
			try {
				//继续调用ReflectiveMethodInvocation.proceed方法
				return mi.proceed();
			}
			finally {
				invocation.set(oldInvocation);
			}
		}



#### 6.7. MethodBeforeAdviceInterceptor

##### 6.7.1. invoke
	public Object invoke(MethodInvocation mi) throws Throwable {
			//1.执行前置通知
			this.advice.before(mi.getMethod(), mi.getArguments(), mi.getThis());
			//2.继续调用ReflectiveMethodInvocation.proceed方法此时执行的是目标方法
			return mi.proceed();
		}


#### 6.8. AspectJAfterAdvice

##### 6.8.1. invoke
	public Object invoke(MethodInvocation mi) throws Throwable {
			try {
				//4.执行proceed
				return mi.proceed();
			}
			finally {
				//3.执行后置通知
				invokeAdviceMethod(getJoinPointMatch(), null, null);
			}
		}


#### 6.9. AfterReturningAdviceInterceptor

##### 6.9.1. invoke
	public Object invoke(MethodInvocation mi) throws Throwable {
			//先执行方法
			Object retVal = mi.proceed();
			//没有任何问题才执行afterReturning
			this.advice.afterReturning(retVal, mi.getMethod(), mi.getArguments(), mi.getThis());
			return retVal;
		}



#### 6.10. ThrowsAdviceInterceptor

##### 6.10.1. invoke
	public Object invoke(MethodInvocation mi) throws Throwable {
			try {
				return mi.proceed();
			}
			catch (Throwable ex) {
				Method handlerMethod = getExceptionHandler(ex);
				if (handlerMethod != null) {
					//执行异常处理方法
					invokeHandlerMethod(mi, ex, handlerMethod);
				}
				throw ex;
			}
		}

![](https://raw.githubusercontent.com/TDoct/images/master/img/20200102214459.png)
