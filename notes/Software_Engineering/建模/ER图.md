## 1. 是什么
- 提供了表示实体类型、属性和联系的方法，用来描述现实世界的概念模型
## 2. 例子

```puml
@startuml

skinparam linetype ortho

entity "tbl_user" as user {
  用户表
  ==
  #id : bigint(20) <<generated>>
  --
  *type : tinyint(4) <<default:0>> --用户类型：0-PC用户,1-移动端用户
  *name : varchar(50) <<default:'anonymous'>> --用户名
  *description : varchar(200) <<default:'some string'>> --用户描述
}

entity "tbl_order" as order {
  订单表
  ==
  #id : bigint(20) <<generated>>
  --
  *order_number : varchar(20)  <<default:'0'>> -- 订单号
  *user_id : bigint(20) <<FK>> <<default:0>> -- 用户id
  *item_id: bigint(20) <<FK>> <<default:0>> -- 商品id
}

entity "tbl_item" as item {
  商品表
  ==
  #id : bigint(20)  <<generated>>
  --
  *title : varchar(50)  <<default: 'wahaha'>> <<notnull>> -- 商品标题
  *price : int(11) <<default: 0>> -- 商品价格
}

user }o-- order:0-n
item }|-- order:1-n

@enduml
```

## 3. 参考
- [Entity Relationship diagram syntax and features](https://plantuml.com/zh/ie-diagram)
- [抽象思维实践——ddl2plantuml开发记录](https://juejin.cn/post/6844904016271376398)
