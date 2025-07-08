
## 1. 是什么
高效的序列化、反序列化方式

### 1.1. 普通序列化

- Teacher
```java
public class Teacher implements Serializable
{
    private Long teacherId;
    private Integer age;
    private String name;
    private List<String> courses = new ArrayList<>();

    public Long getTeacherId()
    {
        return teacherId;
    }

    public void setTeacherId(Long teacherId)
    {
        this.teacherId = teacherId;
    }

    public Integer getAge()
    {
        return age;
    }

    public void setAge(Integer age)
    {
        this.age = age;
    }

    public String getName()
    {
        return name;
    }

    public void setName(String name)
    {
        this.name = name;
    }

    public List<String> getCourses()
    {
        return courses;
    }

    public void setCourses(List<String> courses)
    {
        this.courses = courses;
    }

    @Override
    public String toString()
    {
        return "Teacher{" + "teacherId=" + teacherId + ", age=" + age + ", name='" + name + '\'' + ", courses=" + courses + '}';
    }
}
```

- Test

```java
public class Test
{
    public static void main(String[] args) throws IOException, ClassNotFoundException
    {
        Teacher teacher = new Teacher();
        teacher.setTeacherId(1L);
        teacher.setAge(32);
        teacher.setName("张飞");
        teacher.getCourses().add("java");


        byte[] bytes = serialize(teacher);
        System.out.println(Arrays.toString(bytes));

        Teacher teacher1 = deserialize(bytes);

        System.out.println(teacher1);

    }

    private static Teacher deserialize(byte[] bytes) throws IOException, ClassNotFoundException
    {
        ObjectInputStream objectInputStream = new ObjectInputStream(new ByteArrayInputStream(bytes));
        return (Teacher) objectInputStream.readObject();
    }

    private static byte[] serialize(Teacher teacher) throws IOException
    {
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        ObjectOutputStream outputStream = new ObjectOutputStream(byteArrayOutputStream);
        outputStream.writeObject(teacher);
        return byteArrayOutputStream.toByteArray();
    }


}

```


- 结果
可以看出字节数挺大的

```
[-84, -19, 0, 5, 115, 114, 0, 29, 99, 111, 109, 46, 122, 115, 107, 46, 116, 101, 115, 116, 46, 112, 114, 111, 116, 111, 98, 117, 102, 46, 84, 101, 97, 99, 104, 101, 114, 94, 99, 107, -78, -117, -101, -64, 60, 2, 0, 4, 76, 0, 3, 97, 103, 101, 116, 0, 19, 76, 106, 97, 118, 97, 47, 108, 97, 110, 103, 47, 73, 110, 116, 101, 103, 101, 114, 59, 76, 0, 7, 99, 111, 117, 114, 115, 101, 115, 116, 0, 16, 76, 106, 97, 118, 97, 47, 117, 116, 105, 108, 47, 76, 105, 115, 116, 59, 76, 0, 4, 110, 97, 109, 101, 116, 0, 18, 76, 106, 97, 118, 97, 47, 108, 97, 110, 103, 47, 83, 116, 114, 105, 110, 103, 59, 76, 0, 9, 116, 101, 97, 99, 104, 101, 114, 73, 100, 116, 0, 16, 76, 106, 97, 118, 97, 47, 108, 97, 110, 103, 47, 76, 111, 110, 103, 59, 120, 112, 115, 114, 0, 17, 106, 97, 118, 97, 46, 108, 97, 110, 103, 46, 73, 110, 116, 101, 103, 101, 114, 18, -30, -96, -92, -9, -127, -121, 56, 2, 0, 1, 73, 0, 5, 118, 97, 108, 117, 101, 120, 114, 0, 16, 106, 97, 118, 97, 46, 108, 97, 110, 103, 46, 78, 117, 109, 98, 101, 114, -122, -84, -107, 29, 11, -108, -32, -117, 2, 0, 0, 120, 112, 0, 0, 0, 32, 115, 114, 0, 19, 106, 97, 118, 97, 46, 117, 116, 105, 108, 46, 65, 114, 114, 97, 121, 76, 105, 115, 116, 120, -127, -46, 29, -103, -57, 97, -99, 3, 0, 1, 73, 0, 4, 115, 105, 122, 101, 120, 112, 0, 0, 0, 1, 119, 4, 0, 0, 0, 1, 116, 0, 4, 106, 97, 118, 97, 120, 116, 0, 6, -27, -68, -96, -23, -93, -98, 115, 114, 0, 14, 106, 97, 118, 97, 46, 108, 97, 110, 103, 46, 76, 111, 110, 103, 59, -117, -28, -112, -52, -113, 35, -33, 2, 0, 1, 74, 0, 5, 118, 97, 108, 117, 101, 120, 113, 0, 126, 0, 7, 0, 0, 0, 0, 0, 0, 0, 1]
Teacher{teacherId=1, age=32, name='张飞', courses=[java]}

```

### 1.2. protobuf序列化

- TearchSerializer.proto

```proto
syntax = "proto3";

option java_package = "com.zsk.test.protobuf.proto";
option java_outer_classname = "TearcherSerializer";

message Teacher {
    int64 tearcherId = 1;
    int32 age = 2;
    string name = 3;
    repeated string courses = 4;
}
```


- 生成Java
```
protoc .\TeacherSerializer.proto --java_out=.\
```


- Test

```java
public class TestSerializer
{
    public static void main(String[] args) throws InvalidProtocolBufferException
    {
        byte[] bytes = serialize();

        System.out.println(Arrays.toString(bytes));

        TearcherSerializer.Teacher teacher = deserialize(bytes);

        System.out.println(teacher.getTearcherId());
        System.out.println(teacher.getName());
        System.out.println(teacher.getAge());
        System.out.println(teacher.getCoursesList());


    }

    private static TearcherSerializer.Teacher deserialize(byte[] bytes) throws InvalidProtocolBufferException
    {
        return TearcherSerializer.Teacher.parseFrom(bytes);
    }

    private static byte[] serialize()
    {
        TearcherSerializer.Teacher.Builder builder = TearcherSerializer.Teacher.newBuilder();
        builder.setTearcherId(1L).setAge(22).setName("张飞").addCourses("java");
        TearcherSerializer.Teacher build = builder.build();

        return build.toByteArray();
    }
}

```

- 结果
可以看出生成的字节数小
```
[8, 1, 16, 22, 26, 6, -27, -68, -96, -23, -93, -98, 34, 4, 106, 97, 118, 97]
1
张飞
22
[java]
```

### 1.3. 对比
protobuf序列化的时候减少了一些额外的信息
比如int占用4个字节，而protobuf则是根据长度占用1-5个字节

#### 1.3.1. 普通的序列化反序列化

```java
public class TestInteger
{
    public static void main(String[] args)
    {
        byte[] bytes = intToBytes(11);
        System.out.println(Arrays.toString(bytes));

        int value = bytesToInt(bytes);
        System.out.println(value);
    }

    private static int bytesToInt(byte[] bytes)
    {
        return (bytes[0] & 0xFF) |
                ((bytes[1] << 8) & 0xFF00) |
                ((bytes[2] << 16) & 0xFF0000) |
                ((bytes[3] << 24) & 0xFF000000);
    }

    //大端：高字节位在低地址。小端：低字节位在低地址
    private static byte[] intToBytes(int value)
    {
        byte[] bytes = new byte[4];

        //与上0xFF000000表示只保留最高字节，同时右移3*8表示把这个字节移到最后，强转成byte才能取出这个字节
        bytes[3] = (byte)((value & 0xFF000000) >> 3*8);
        bytes[2] = (byte)((value & 0x00FF0000) >> 2*8);
        bytes[1] = (byte)((value & 0x0000FF00) >> 1*8);
        bytes[0] = (byte)((value & 0x000000FF)); //这里采用小端法

        return bytes;
    }
}
```

#### 1.3.2. protobuf源码
- `com.google.protobuf.AbstractMessageLite#toByteArray`->`com.zsk.test.protobuf.proto.TearcherSerializer.Teacher#writeTo`

```java
public void writeTo(com.google.protobuf.CodedOutputStream output)
                    throws java.io.IOException {
  if (tearcherId_ != 0L) {
    output.writeInt64(1, tearcherId_);//可以看出按照顺序写的，这里是1
  }
  if (age_ != 0) {
    //我们追这个源码：com.google.protobuf.CodedOutputStream.ArrayEncoder#writeInt32
    output.writeInt32(2, age_);//可以看出按照顺序写的，这里是2
  }
  if (!getNameBytes().isEmpty()) {
    com.google.protobuf.GeneratedMessageV3.writeString(output, 3, name_);//可以看出按照顺序写的，这里是3
  }
  for (int i = 0; i < courses_.size(); i++) {
    com.google.protobuf.GeneratedMessageV3.writeString(output, 4, courses_.getRaw(i));//可以看出按照顺序写的，这里是4
  }
  unknownFields.writeTo(output);
}
```

- com.google.protobuf.CodedOutputStream.ArrayEncoder#writeInt32

```java
public final void writeInt32(final int fieldNumber, final int value) throws IOException {
  writeTag(fieldNumber, WireFormat.WIRETYPE_VARINT);
  //这个com.google.protobuf.CodedOutputStream.ArrayEncoder#writeInt32NoTag
  writeInt32NoTag(value);
}
```
- com.google.protobuf.CodedOutputStream.ArrayEncoder#writeInt32NoTag

```java
public final void writeInt32NoTag(int value) throws IOException {
  if (value >= 0) {
    //这个com.google.protobuf.CodedOutputStream.ArrayEncoder#writeUInt32NoTag
    writeUInt32NoTag(value);
  } else {
    // Must sign-extend.
    writeUInt64NoTag(value);
  }
}

```


- com.google.protobuf.CodedOutputStream.ArrayEncoder#writeUInt32NoTag

```java
public final void writeUInt32NoTag(int value) throws IOException {
  if (HAS_UNSAFE_ARRAY_OPERATIONS
      && !Android.isOnAndroidDevice()
      && spaceLeft() >= MAX_VARINT32_SIZE) {
    if ((value & ~0x7F) == 0) {
      UnsafeUtil.putByte(buffer, position++, (byte) value);
      return;
    }
    UnsafeUtil.putByte(buffer, position++, (byte) (value | 0x80));
    value >>>= 7;
    if ((value & ~0x7F) == 0) {
      UnsafeUtil.putByte(buffer, position++, (byte) value);
      return;
    }
    UnsafeUtil.putByte(buffer, position++, (byte) (value | 0x80));
    value >>>= 7;
    if ((value & ~0x7F) == 0) {
      UnsafeUtil.putByte(buffer, position++, (byte) value);
      return;
    }
    UnsafeUtil.putByte(buffer, position++, (byte) (value | 0x80));
    value >>>= 7;
    if ((value & ~0x7F) == 0) {
      UnsafeUtil.putByte(buffer, position++, (byte) value);
      return;
    }
    UnsafeUtil.putByte(buffer, position++, (byte) (value | 0x80));
    value >>>= 7;
    UnsafeUtil.putByte(buffer, position++, (byte) value);
  } else {
    try {
    //关键代码在这里，使用小端法
    //每个循环都是处理一个字节
      while (true) {
         //0x7F取反与上value，得到的结果为高（32-7）=25位
         //如果为0那么没有高字节位需要处理了
         //或者说数字的范围在一个字节内，即<=127
        if ((value & ~0x7F) == 0) {
          buffer[position++] = (byte) value;
          return;
        } else {
           //0x7F与上value，取出的结果是低7bit，或上0x80得到的结果是第8位为1
           //凑够一个字节存入buffer
          buffer[position++] = (byte) ((value & 0x7F) | 0x80);
          //继续下一个7bit
          value >>>= 7;
        }
      }
    } catch (IndexOutOfBoundsException e) {
      throw new OutOfSpaceException(
          String.format("Pos: %d, limit: %d, len: %d", position, limit, 1), e);
    }
  }
}
```

## 2. 安装

### 2.1. 安装protobuf

- 下载
[Releases · protocolbuffers/protobuf](https://github.com/protocolbuffers/protobuf/releases)
- 解压配置好环境变量
![](https://raw.githubusercontent.com/TDoct/images/master/1587804042_20200425152821644_21674.png)
![](https://raw.githubusercontent.com/TDoct/images/master/1587804043_20200425152913702_32188.png)


### 2.2. 安装protoc-gen-go

- 前提是配置好GOBIN环境变量
![](https://raw.githubusercontent.com/TDoct/images/master/1587803942_20200425163852285_17674.png)

- 下载源码
```
go get -v github.com/golang/protobuf/{proto,protoc-gen-go}
```

- 把可执行文件放在protoc的安装目录下
![](https://raw.githubusercontent.com/TDoct/images/master/1587804044_20200425153233350_15400.png)
- 也可以安装到GOBIN中
```
cd $GOPATH/src/github.com/golang/protobuf/protoc-gen-go
go install
cd $GOBIN
ls
```


## 3. 使用

- proto1.proto
```proto
syntax = "proto3"; //指定版本信息，不指定会报错
option go_package = ".;pb"; //后期生成go文件的包名
//message为关键字，作用为定义一种消息类型
message Person {
    //    名字
    string name = 1;
    //    年龄
    int32 age = 2;
    //    邮箱
    repeated string emalis = 3;
    //    手机
    repeated string phones = 4;
    // repeated为关键字，作用为重复使用 一般在go语言中用切片表示
}
```

- 生成go文件

```proto
protoc --go_out=./ *.proto
```

- 测试生成的go文件

```go
import (
	"fmt"
	"github.com/golang/protobuf/proto"
	pb "my_demo/proto_test"
)

func main() {
	p := &pb.Person{
		Name:   "zsk",
		Age:    25,
		Emalis: []string{"shengkunz@foxmail.com"},
		Phones: []string{"18813290443"},
	}
	fmt.Println(p)
	//json序列化为字节
	data, err := proto.Marshal(p)
	if err != nil {
		fmt.Println("Marshal error")
	}
	fmt.Println(data)

    //json反序列化为对象
	p2 := &pb.Person{}
	proto.Unmarshal(data, p2)
	fmt.Println(p2)
}
```

## 4. 参考

- [windows 下使用 protobuf\_运维\_挖坑埋你\-CSDN博客](https://blog.csdn.net/liupeifeng3514/article/details/78985575)
- [配置终端代理解决 go get 命令国内无法使用 \| Keep Coding \| 苏易北](https://abelsu7.top/2019/05/22/go-get-using-proxy/index.html)
- [WEHousing/04protobuf讲义\.md at master · MineCoinChain/WEHousing](https://github.com/MineCoinChain/WEHousing/blob/master/Document/material/04protobuf%E8%AE%B2%E4%B9%89.md)
- [golang/protobuf: Go support for Google's protocol buffers](https://github.com/golang/protobuf)
- [protobuf的Required,Optional,Repeated限定修饰符\_c/c\+\+\_我是guyue，guyue就是我O\(∩\_∩\)O\-CSDN博客](https://blog.csdn.net/guyue35/article/details/51181845)