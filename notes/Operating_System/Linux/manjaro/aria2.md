## 1. 下载
```bash
yay -S aria2 
```
## 2. 配置

vim /etc/aria2c.conf

```conf
## '#'开头为注释内容, 选项都有相应的注释说明, 根据需要修改 ##
## 被注释的选项填写的是默认值, 建议在需要修改时再取消注释  ##

## 文件保存相关 ##

# 文件的保存路径(可使用绝对路径或相对路径), 默认: 当前启动位置
dir=/home/zsk/Downloads
# 启用磁盘缓存, 0为禁用缓存, 需1.16以上版本, 默认:16M
disk-cache=32M
# 文件预分配方式, 能有效降低磁盘碎片, 默认:prealloc
# 预分配所需时间: none < falloc ? trunc < prealloc
# falloc和trunc则需要文件系统和内核支持
# NTFS建议使用falloc, EXT3/4建议trunc, MAC 下需要注释此项
file-allocation=falloc
# 断点续传
continue=true

## 下载连接相关 ##

# 最大同时下载任务数, 运行时可修改, 默认:5
max-concurrent-downloads=5
# 同一服务器连接数, 添加时可指定, 默认:1
max-connection-per-server=8
# 最小文件分片大小, 添加时可指定, 取值范围1M -1024M, 默认:20M
# 假定size=10M, 文件为20MiB 则使用两个来源下载; 文件为15MiB 则使用一个来源下载
min-split-size=10M
# 单个任务最大线程数, 添加时可指定, 默认:5
split=16
# 整体下载速度限制, 运行时可修改, 默认:0
#max-overall-download-limit=0
# 单个任务下载速度限制, 默认:0
#max-download-limit=0
# 整体上传速度限制, 运行时可修改, 默认:0
#max-overall-upload-limit=0
# 单个任务上传速度限制, 默认:0
#max-upload-limit=0
# 禁用IPv6, 默认:false
disable-ipv6=false

## 进度保存相关 ##

# 从会话文件中读取下载任务
input-file=/home/zsk/Downloads/.aria2/aria2.session
# 在Aria2退出时保存`错误/未完成`的下载任务到会话文件
save-session=/home/zsk/Downloads/.aria2/aria2.session
# 定时保存会话, 0为退出时才保存, 需1.16.1以上版本, 默认:0
save-session-interval=60

## RPC相关设置 ##

# 启用RPC, 默认:false
enable-rpc=true
# 允许所有来源, 默认:false
rpc-allow-origin-all=true
# 允许非外部访问, 默认:false
rpc-listen-all=true
# 事件轮询方式, 取值:[epoll, kqueue, port, poll, select], 不同系统默认值不同
#event-poll=select
# RPC监听端口, 端口被占用时可以修改, 默认:6800
#rpc-listen-port=6800
# 设置的RPC授权令牌, v1.18.4新增功能, 取代 --rpc-user 和 --rpc-passwd 选项
rpc-secret=5465b1ce8c01712ad89e57fbe522fd01
## BT/PT下载相关 ##

# 当下载的是一个种子(以.torrent结尾)时, 自动开始BT任务, 默认:true
#follow-torrent=true
# BT监听端口, 当端口被屏蔽时使用, 默认:6881-6999
listen-port=51413
# 单个种子最大连接数, 默认:55
#bt-max-peers=55
# 打开DHT功能, PT需要禁用, 默认:true
enable-dht=true
# 打开IPv6 DHT功能, PT需要禁用
#enable-dht6=true
# DHT网络监听端口, 默认:6881-6999
#dht-listen-port=6881-6999
# 本地节点查找, PT需要禁用, 默认:false
#bt-enable-lpd=true
# 种子交换, PT需要禁用, 默认:true
enable-peer-exchange=true
# 每个种子限速, 对少种的PT很有用, 默认:50K
#bt-request-peer-speed-limit=50K
# 客户端伪装, PT需要
peer-id-prefix=-TR2770-
user-agent=Transmission/2.77
# 当种子的分享率达到这个数时, 自动停止做种, 0为一直做种, 默认:1.0
seed-ratio=0
# 强制保存会话, 话即使任务已经完成, 默认:false
# 较新的版本开启后会在任务完成后依然保留.aria2文件
#force-save=false
# BT校验相关, 默认:true
#bt-hash-check-seed=true
# 继续之前的BT任务时, 无需再次校验, 默认:false
bt-seed-unverified=true
# 保存磁力链接元数据为种子文件(.torrent文件), 默认:false
bt-save-metadata=true
# bt-tracker 更新，解决Aria2 BT下载速度慢没速度的问题
bt-tracker=http://107.152.127.9:6969/announce,http://1337.abcvg.info:80/announce,http://159.69.65.157:6969/announce,http://163.172.170.127:6969/announce,http://172.105.163.54:2052/announce,http://184.105.151.166:6969/announce,http://185.148.3.231:80/announce,http://185.185.40.42:6969/announce,http://212.6.3.67:80/announce,http://51.222.84.64:1337/announce,http://51.79.71.167:80/announce,http://51.81.200.170:6699/announce,http://60-fps.org:80/bt:80/announce.php,http://78.30.254.12:2710/announce,http://93.158.213.92:1337/announce,http://95.107.48.115:80/announce,http://[2001:1b10:1000:8101:0:242:ac11:2]:6969/announce,http://[2001:470:1:189:0:1:2:3]:6969/announce,http://[2a04:ac00:1:3dd8::1:2710]:2710/announce,http://all4nothin.net:80/announce.php,http://anidex.moe:6969/announce,http://atrack.pow7.com:80/announce,http://baibako.tv:80/announce,http://bluebird-hd.org:80/announce.php,http://bt.ali213.net:8080/announce,http://bt.okmp3.ru:2710/announce,http://bt.rghost.net:80/announce,http://bt.unionpeer.org:777/announce,http://bttracker.debian.org:6969/announce,http://btx.anifilm.tv:80/announce.php,http://data-bg.net:80/announce.php,http://explodie.org:6969/announce,http://fxtt.ru:80/announce,http://googer.cc:1337/announce,http://h4.trakx.nibba.trade:80/announce,http://ipv4announce.sktorrent.eu:6969/announce,http://irrenhaus.dyndns.dk:80/announce.php,http://masters-tb.com:80/announce.php,http://mediaclub.tv:80/announce,http://mixfiend.com:80/announce.php,http://ns349743.ip-91-121-106.eu:80/announce,http://nyaa.tracker.wf:7777/announce,http://open.acgnxtracker.com:80/announce,http://openbittorrent.com:80/announce,http://p4p.arenabg.com:1337/announce,http://pow7.com:80/announce,http://retracker.hotplug.ru:2710/announce,http://retracker.spark-rostov.ru:80/announce,http://secure.pow7.com:80/announce,http://share.camoe.cn:8080/announce,http://siambit.com:80/announce.php,http://sukebei.tracker.wf:8888/announce,http://t.acg.rip:6699/announce,http://t.nyaatracker.com:80/announce,http://t.overflow.biz:6969/announce,http://t1.pow7.com:80/announce,http://torrent-team.net:80/announce.php,http://torrent.fedoraproject.org:6969/announce,http://torrent.mp3quran.net:80/announce.php,http://torrent.resonatingmedia.com:6969/announce,http://torrent.rus.ec:2710/announce,http://torrent.unix-ag.uni-kl.de:80/announce,http://torrentsmd.com:8080/announce,http://torrenttracker.nwc.acsalaska.net:6969/announce,http://torrentzilla.org:80/announce.php,http://tr.cili001.com:8070/announce,http://tr.kxmp.cf:80/announce,http://tracker.ali213.net:8080/announce,http://tracker.anirena.com:80/announce,http://tracker.birkenwald.de:6969/announce,http://tracker.bittor.pw:1337/announce,http://tracker.breizh.pm:6969/announce,http://tracker.bt4g.com:2095/announce,http://tracker.corpscorp.online:80/announce,http://tracker.dler.org:6969/announce,http://tracker.files.fm:6969/announce,http://tracker.frozen-layer.net:6969/announce.php,http://tracker.gbitt.info:80/announce,http://tracker.gigatorrents.ws:2710/announce,http://tracker.grepler.com:6969/announce,http://tracker.ipv6tracker.ru:80/announce,http://tracker.lelux.fi:80/announce,http://tracker.minglong.org:8080/announce,http://tracker.moeking.me:6969/announce,http://tracker.nighthawk.pw:2052/announce,http://tracker.nighthawk.pw:4201/announce,http://tracker.noobsubs.net:80/announce,http://tracker.opentrackr.org:1337/announce,http://tracker.pow7.com:80/announce,http://tracker.pussytorrents.org:3000/announce,http://tracker.tambovnet.org:80/announce.php,http://tracker.tasvideos.org:6969/announce,http://tracker.tfile.me:80/announce,http://tracker.torrentbytes.net:80/announce.php,http://tracker.torrentyorg.pl:80/announce,http://tracker.trackerfix.com:80/announce,http://tracker.trancetraffic.com:80/announce.php,http://tracker.uw0.xyz:6969/announce,http://tracker.xdvdz.com:2710/announce,http://tracker.xn--vzyr4p.top:80/announce,http://tracker.yoshi210.com:6969/announce,http://tracker.zerobytes.xyz:1337/announce,http://tracker1.bt.moack.co.kr:80/announce,http://tracker2.dler.org:80/announce,http://tracker3.dler.org:2710/announce,http://vps02.net.orel.ru:80/announce,http://www.all4nothin.net:80/announce.php,http://www.mvgroup.org:2710/announce,http://www.thetradersden.org/forums/tracker:80/announce.php,http://www.tribalmixes.com:80/announce.php,http://www.xwt-classics.net:80/announce.php,http://www.zone-torrent.net:80/announce.php,http://xtremewrestlingtorrents.net:80/announce.php,https://1337.abcvg.info:443/announce,https://bittorrent.gongt.net:443/announce,https://carbon-bonsai-621.appspot.com:443/announce,https://mytracker.fly.dev:443/announce,https://open.acgnxtracker.com:443/announce,https://open.kickasstracker.com:443/announce,https://opentracker.acgnx.se:443/announce,https://torrent.ubuntu.com:443/announce,https://tr.ready4.icu:443/announce,https://tr.torland.ga:443/announce,https://tracker.bt-hash.com:443/announce,https://tracker.coalition.space:443/announce,https://tracker.foreverpirates.co:443/announce,https://tracker.gbitt.info:443/announce,https://tracker.imgoingto.icu:443/announce,https://tracker.iriseden.eu:443/announce,https://tracker.iriseden.fr:443/announce,https://tracker.kuroy.me:443/announce,https://tracker.lelux.fi:443/announce,https://tracker.lilithraws.cf:443/announce,https://tracker.nanoha.org:443/announce,https://tracker.nitrix.me:443/announce,https://tracker.shittyurl.org:443/announce,https://tracker.tamersunion.org:443/announce,https://trakx.herokuapp.com:443/announce,https://w.wwwww.wtf:443/announce,udp://103.196.36.31:6969/announce,udp://104.244.72.77:1337/announce,udp://144.76.35.202:6969/announce,udp://144.76.82.110:6969/announce,udp://148.251.53.72:6969/announce,udp://149.28.47.87:1738/announce,udp://156.234.201.18:80/announce,udp://157.90.169.123:80/announce,udp://159.69.208.124:6969/announce,udp://176.123.8.121:3391/announce,udp://185.181.60.67:80/announce,udp://185.21.216.185:6969/announce,udp://185.8.156.2:6969/announce,udp://195.201.94.195:6969/announce,udp://198.100.149.66:6969/announce,udp://208.83.20.20:6969/announce,udp://209.141.59.16:6969/announce,udp://212.1.226.176:2710/announce,udp://213.108.129.160:6969/announce,udp://217.12.218.177:2710/announce,udp://37.59.48.81:6969/announce,udp://46.148.18.252:2710/announce,udp://5.181.49.163:6969/announce,udp://51.15.2.221:6969/announce,udp://52.58.128.163:6969/announce,udp://62.168.229.166:6969/announce,udp://65.21.48.148:6969/announce,udp://67.224.119.27:6969/announce,udp://6ahddutb1ucc3cp.ru:6969/announce,udp://78.30.254.12:2710/announce,udp://82.65.37.128:6969/announce,udp://84.252.74.35:6969/announce,udp://89.234.156.205:451/announce,udp://89.36.216.8:6969/announce,udp://9.rarbg.com:2810/announce,udp://9.rarbg.com:2900/announce,udp://9.rarbg.me:2710/announce,udp://9.rarbg.to:2710/announce,udp://91.149.192.31:6969/announce,udp://91.216.110.52:451/announce,udp://93.104.214.40:6969/announce,udp://95.217.161.135:6969/announce,udp://[2001:1b10:1000:8101:0:242:ac11:2]:6969/announce,udp://[2001:470:1:189:0:1:2:3]:6969/announce,udp://[2a03:7220:8083:cd00::1]:451/announce,udp://[2a04:ac00:1:3dd8::1:2710]:2710/announce,udp://[2a0f:e586:f:f::220]:6969/announce,udp://abufinzio.monocul.us:6969/announce,udp://admin.videoenpoche.info:6969/announce,udp://anidex.moe:6969/announce,udp://bms-hosxp.com:6969/announce,udp://bt.100.pet:2711/announce,udp://bubu.mapfactor.com:6969/announce,udp://code2chicken.nl:6969/announce,udp://concen.org:6969/announce,udp://cutiegirl.ru:6969/announce,udp://discord.heihachi.pw:6969/announce,udp://edu.uifr.ru:6969/announce,udp://engplus.ru:6969/announce,udp://exodus.desync.com:6969/announce,udp://explodie.org:6969/announce,udp://fe.dealclub.de:6969/announce,udp://inferno.demonoid.is:3391/announce,udp://ipv4.tracker.harry.lu:80/announce,udp://ipv6.tracker.zerobytes.xyz:16661/announce,udp://mail.realliferpg.de:6969/announce,udp://movies.zsw.ca:6969/announce,udp://mts.tvbit.co:6969/announce,udp://open.demonii.com:1337/announce,udp://open.publictracker.xyz:6969/announce,udp://open.stealth.si:80/announce,udp://openbittorrent.com:80/announce,udp://opentor.org:2710/announce,udp://opentrackr.org:1337/announce,udp://p4p.arenabg.com:1337/announce,udp://peerfect.org:6969/announce,udp://pow7.com:80/announce,udp://public.publictracker.xyz:6969/announce,udp://public.tracker.vraphim.com:6969/announce,udp://retracker.hotplug.ru:2710/announce,udp://retracker.lanta-net.ru:2710/announce,udp://retracker.netbynet.ru:2710/announce,udp://retracker.nts.su:2710/announce,udp://retracker.sevstar.net:2710/announce,udp://sugoi.pomf.se:80/announce,udp://thetracker.org:80/announce,udp://tr.bangumi.moe:6969/announce,udp://tr2.ysagin.top:2710/announce,udp://tracker-de.ololosh.space:6969/announce,udp://tracker.0x.tf:6969/announce,udp://tracker.aletorrenty.pl:2710/announce,udp://tracker.altrosky.nl:6969/announce,udp://tracker.army:6969/announce,udp://tracker.beeimg.com:6969/announce,udp://tracker.birkenwald.de:6969/announce,udp://tracker.bitsearch.to:1337/announce,udp://tracker.bittor.pw:1337/announce,udp://tracker.blacksparrowmedia.net:6969/announce,udp://tracker.breizh.pm:6969/announce,udp://tracker.coppersurfer.tk:6969/announce,udp://tracker.cyberia.is:6969/announce,udp://tracker.dler.com:6969/announce,udp://tracker.dler.org:6969/announce,udp://tracker.eddie4.nl:6969/announce,udp://tracker.filemail.com:6969/announce,udp://tracker.flashtorrents.org:6969/announce,udp://tracker.halfchub.club:6969/announce,udp://tracker.kuroy.me:5944/announce,udp://tracker.leech.ie:1337/announce,udp://tracker.leechers-paradise.org:6969/announce,udp://tracker.lelux.fi:6969/announce,udp://tracker.loadbt.com:6969/announce,udp://tracker.moeking.eu.org:6969/announce,udp://tracker.moeking.me:6969/announce,udp://tracker.monitorit4.me:6969/announce,udp://tracker.nighthawk.pw:2052/announce,udp://tracker.nrx.me:6969/announce,udp://tracker.ololosh.space:6969/announce,udp://tracker.open-internet.nl:6969/announce,udp://tracker.openbittorrent.com:6969/announce,udp://tracker.opentrackr.org:1337/announce,udp://tracker.sbsub.com:2710/announce,udp://tracker.skyts.net:6969/announce,udp://tracker.swateam.org.uk:2710/announce,udp://tracker.theoks.net:6969/announce,udp://tracker.tiny-vps.com:6969/announce,udp://tracker.torrent.eu.org:451/announce,udp://tracker.tricitytorrents.com:2710/announce,udp://tracker.tvunderground.org.ru:3218/announce,udp://tracker.uw0.xyz:6969/announce,udp://tracker.vanitycore.co:6969/announce,udp://tracker.xn--vzyr4p.top:80/announce,udp://tracker.zerobytes.xyz:1337/announce,udp://tracker0.ufibox.com:6969/announce,udp://tracker1.bt.moack.co.kr:80/announce,udp://tracker2.christianbro.pw:6969/announce,udp://tracker2.dler.com:80/announce,udp://tracker2.dler.org:80/announce,udp://tracker4.itzmx.com:2710/announce,udp://u.wwwww.wtf:1/announce,udp://udp-tracker.shittyurl.org:6969/announce,udp://vibe.community:6969/announce,udp://vibe.sleepyinternetfun.xyz:1738/announce,udp://wassermann.online:6969/announce,udp://www.torrent.eu.org:451/announce,ws://hub.bugout.link:80/announce,wss://tracker.openwebtorrent.com:443/announce

```

## 3. 后台服务
vim ~/.config/systemd/user/aria2.service

```service
[Unit]
Description=Aria2 Daemon

[Service]
ExecStart=/usr/bin/aria2c --conf-path=/etc/aria2c.conf

[Install]
WantedBy=default.target
```


启动

```linux
systemctl --user enable aria2
systemctl --user start aria2
```



## 4. 参考

- [aria2 \- ArchWiki](https://wiki.archlinux.org/title/Aria2?utm_source=pocket_mylist)
- [GitHub \- sjh0020/aria2: 这是一个懒人合集包，参考自知乎](https://github.com/sjh0020/aria2?utm_source=pocket_mylist)
- [Aria2 & YAAW 使用说明](https://aria2c.com/usage.html?utm_source=pocket_mylist)