---
title: "5.1 Cloneable"
description: "1. Cloneable接口是什么 一个标识性接口。实现了这个接口的对象可以调用 Object.clone 方法复制一份当前对象，这里复制的是 属性 2. 什么是对象克隆 将一个对象的属性拷贝到另一个有着相同类类型的对象中去 3. 如何实现对象克隆 3.1. 浅克隆 如果属性是基本类型，拷贝的就是基"
sourcePath: "Java/JDK/Cloneable/Cloneable.md"
category: "java"
categoryLabel: "Java"
topic: "JDK"
topicLabel: "5.JDK"
order: 123
tags: ["Java"]
createdAt: "2020-02-08T08:47:32Z"
updatedAt: "2020-03-03T02:32:35Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. Cloneable接口是什么
一个标识性接口。实现了这个接口的对象可以调用`Object.clone`方法复制一份当前对象，这里复制的是**属性**


## 2. 什么是对象克隆
将一个对象的属性拷贝到另一个有着相同类类型的对象中去
## 3. 如何实现对象克隆
### 3.1. 浅克隆
如果属性是基本类型，拷贝的就是基本类型的值；如果属性是内存地址（引用类型），拷贝的就是内存地址 ，因此如果其中一个对象改变了这个地址，就会影响到另一个对象


#### 3.1.1. 实现

##### 3.1.1.1. Cloneable接口默认就是浅克隆

重写的clone方法只需直接调用父类的方法即可

```java
public class ShallowCopy
{
    public static void main(String[] args) throws CloneNotSupportedException
    {
        School school = new School("金山");
        Student student = new Student("ZSK", 26,school);
        Student cloneStudent = (Student) student.clone();

        System.out.println(student == cloneStudent);//false

        System.out.println(student.getSchool() == cloneStudent.getSchool());//true
    }

    static class School
    {
        private String schoolName;

        public School(String schoolName)
        {
            this.schoolName = schoolName;
        }



    }


    static class Student implements Cloneable
    {
        private String studentName;
        private Integer age;
        private School school;

        public Student(String studentName, Integer age, School school)
        {
            this.studentName = studentName;
            this.age = age;
            this.school = school;
        }

        @Override
        protected Object clone() throws CloneNotSupportedException
        {
            return super.clone();
        }

        public School getSchool()
        {
            return school;
        }
    }
}
```


### 3.2. 深克隆
如果属性是基本类型，拷贝的就是基本类型的值；如果属性是内存地址（引用类型），那么不是拷贝引用而是并拷贝属性指向的动态分配的内存

#### 3.2.1. 实现
##### 3.2.1.1. 序列化

##### 3.2.1.2. 实现Cloneable接口重写clone方法

重写的clone方法需要继续调用引用类型的clone方法

```java
public class DeepCopy
{
    public static void main(String[] args) throws CloneNotSupportedException
    {
        School school = new School("金山");
        Student student = new Student("ZSK", 26,school);
        Student cloneStudent = (Student) student.clone();

        System.out.println(student == cloneStudent);//false

        System.out.println(student.getSchool() == cloneStudent.getSchool());//false
    }

    static class School implements Cloneable
    {
        private String schoolName;

        public School(String schoolName)
        {
            this.schoolName = schoolName;
        }

        @Override
        protected Object clone() throws CloneNotSupportedException
        {
            return super.clone();
        }
    }


    static class Student implements Cloneable
    {
        private String studentName;
        private Integer age;
        private School school;

        public Student(String studentName, Integer age, School school)
        {
            this.studentName = studentName;
            this.age = age;
            this.school = school;
        }

        @Override
        protected Object clone() throws CloneNotSupportedException
        {
            Student cloneStudent = (Student) super.clone();
            cloneStudent.school = (School) cloneStudent.school.clone();
            return cloneStudent;
        }

        public School getSchool()
        {
            return school;
        }
    }
}


```

## 4. 参考
- [Java深拷贝和浅拷贝 \- 掘金](https://juejin.im/post/5c988a7ef265da6116246d11)
- [Java如何对一个对象进行深拷贝？ \- 后端 \- 掘金](https://juejin.im/entry/5bc3db04f265da0aaa053baa)
