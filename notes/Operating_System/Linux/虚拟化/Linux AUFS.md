## 1. Linux AUFS历史
由于UnionFS可靠性和性能不高，AUFS相当于是UnionFS的重写版
## 2. 什么是Linux AUFS
advanced multi-layered unification filesystem，是Linux文件系统union mount的一种实现。
所谓的union mount就是将多个目录组合成一个目录的方法，这个目录对外表现为包含了所有目录的内容
## 3. 为什么需要Linux AUFS


## 4. 如何使用Linux AUFS
1. 创建目录和文件
    ```cmd
    mkdir aufs
    mkdir aufs/mnt
    mkdir aufs/container-layer
    echo "I am container layer" > aufs/container-layer/container-layer.txt
    mkdir aufs/{image-layer1,image-layer2,image-layer3}
    echo "I am image layer 1" > aufs/image-layer1/image-layer1.txt
    echo "I am image layer 2" > aufs/image-layer2/image-layer2.txt
    echo "I am image layer 3" > aufs/image-layer3/image-layer3.txt
    ```
2. 挂载为AUFS
    ```cmd
    cd aufs
    sudo mount -t aufs -o dirs=./container-layer:./image-layer1:./image-layer2:./image-layer3 none ./mnt
    ```
3. 查看挂载的目录内容
    ```cmd
    tree mnt
    ```
4. 修改mnt下的文件内容
    ```cmd
    echo "I changed mnt/image-layer2.txt" >> mnt/image-layer2.txt
    ```
5. 查看mnt下的文件内容和image-layer2下的文件内容
    ```cmd
    #有变化
    cat mnt/image-layer2.txt
    #没有变化
    cat image-layer2/image-layer2.txt
    ```
6. 查看container-layer目录
    ```cmd
    tree container-layer
    ```
## 5. Linux AUFS原理
### 5.1. Copy-on-Write
如果一个资源是重复的，在没有对资源做出修改前，并不需要立即复制出一个新的资源实例，这个资源被不同的所有者共享使用。
当任何一个所有者要对该资源做出修改时，复制出一个新的资源实例给该所有者进行修改，修改后的资源成为其所有者的私有资源。
通过这种资源共享的方式，可以显著地减少复制相同资源带来的消耗，但是这样做也会在进行资源的修改时增加一部分开销。
## 6. 参考
- [aufs \- Wikipedia](https://en.wikipedia.org/wiki/Aufs)
- [Union mount \- Wikipedia](https://en.wikipedia.org/wiki/Union_mount)
