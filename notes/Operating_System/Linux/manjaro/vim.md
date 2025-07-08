## 1. vim模式

normal->insert：
i 光标前插入
I 行首插入
a 光标后插入
A 行尾插入
o 下一行插入
O 上一行插入


insert->normal：

ESC

normal<->visual：

v

normal->命令：`:` 比如15会跳转到15行


## 2. 光标移动
上下左右：
hjkl
15G 跳到15行
5J 往下跳5行

行内：

f 往后查找字符，
F 往前查找字符
配合； 下一个和，上一个 

单词：
w 下一个单词首部，
e 下一个单词尾部，
b 上一个单词开头

行首行尾：
^ 本行末尾 
$ 本行末尾


G 最后一行
gg 第一行





## 3. 操作符与动作
### 3.1. 操作符

d：删除

y：复制

c：修改

v：选中进入visual

### 3.2. 动作

i：inner
a：around
### 3.3. 配合

iwXXX XXX之内
awXXX XXX之内（包含XXX）
cs"' 把"改成'
ds" 删除"
ysiw" 添加”
～ 转换大小写


## 4. 其他功能
### 4.1. 大小写
~：大写


### 4.2. 跳转

ge 跳转到定义
gh 显示hover


alt+o alt+i 后退 前进

alt+1 文件栏，按`L`到编辑器栏
alt+2搜索
alt+3大纲
alt+4终端，按住`ctrl+1`进入编辑器栏


ctrl+1第一个分屏的tab，ctrl+2第二个分屏的tab

### 4.3. 查找
/查找
n 下一个
N 上一个 
zc 折叠括号 zo 展开括号

## 5. 插件

### 5.1. easymotion

space space 进入easy motion模式

### 5.2. surround
这个插件增加了个动作`s`，即surround
`'test aaa'`想把单引号改成双引号，那么`cs'" `，即change surround 单引号 双引号

## 6. 参考
[vscode \+ vim 高效开发\_D之光的博客\-CSDN博客\_vscode vim](https://blog.csdn.net/li520_fei/article/details/122780195)