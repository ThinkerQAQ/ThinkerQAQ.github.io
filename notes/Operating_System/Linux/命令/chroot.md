## 1. 什么是chroot
Linux系统中的一个chroot，用于修改根目录
Linux系统中，默认的目录结构是以/开始，以指定的位置作为 / 位置
## 2. 为什么需要chroot
### 2.1. 安全
限制用户的权力
### 2.2. 隔离
建立一个与原系统隔离的系统目录结构，方便用户的开发：
## 3. 如何使用chroot

```cmd
mkdir -p new_root/bin
cp /bin/bash new_root/bin
cp -r /lib new_root
cp -r /lib64 new_root
sudo chroot new_root
```
## 4. chroot原理

## 5. 参考
- [linux chroot 命令 \- sparkdev \- 博客园](https://www.cnblogs.com/sparkdev/p/8556075.html)