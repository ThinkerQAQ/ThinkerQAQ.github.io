---
title: "2.36 Spring Boot Jar启动原理"
description: "1. 实验 - pom.xml - com.zsk.test.Application - 打jar包 - 解压后，使用tree命令查看结构 2. 可执行Jar的结构 - 包含 - Jar描述：META-INF/MANIFEST.MF - Spring Boot Loader：org/springfr"
sourcePath: "Java/Framework/SpringBoot/jar包启动原理/Spring Boot Jar启动原理.md"
category: "java"
categoryLabel: "Java"
topic: "Framework"
topicLabel: "2.Framework"
order: 38
tags: ["Java"]
createdAt: "2020-02-27T09:18:20Z"
updatedAt: "2020-03-15T03:34:30Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---
## 1. 实验

- pom.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.zsk.test</groupId>
    <artifactId>test</artifactId>
    <version>1.0-SNAPSHOT</version>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>1.5.20.RELEASE</version>
    </parent>

    <dependencies>
        <!-- https://mvnrepository.com/artifact/commons-io/commons-io -->
        <dependency>
            <groupId>commons-io</groupId>
            <artifactId>commons-io</artifactId>
            <version>2.6</version>
        </dependency>
        <!-- aop -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-aop</artifactId>
        </dependency>
        <!--test-->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <version>1.5.20.RELEASE</version>
            </plugin>
        </plugins>
    </build>
</project>
```

- com.zsk.test.Application

```java
package com.zsk.test;

import com.zsk.test.controller.TestController;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * @description:
 * @author: zsk
 * @create: 2019-11-26 22:59
 **/
@EnableCaching
@EnableAsync
@SpringBootApplication()
public class Application
{
    public static void main(String[] args)
    {
        ConfigurableApplicationContext context = SpringApplication.run(Application.class, args);
        System.out.println("==================================服务已启动==================================");
        TestController bean = context.getBean(TestController.class);
        bean.test();

    }
}

```

- 打jar包

```bat
mvn clean package -Dmaven.test.skip=true
```

- 解压后，使用tree命令查看结构

```java
C:.
├─BOOT-INF
│  ├─classes
│  │  └─com
│  │      └─zsk
│  │          └─test
│  │              ├─bean
│  │              ├─config
│  │              │  └─event
│  │              ├─controller
│  │              └─service
│  └─lib
├─META-INF
│  └─maven
│      └─com.zsk.test
│          └─test
└─org
    └─springframework
        └─boot
            └─loader
                ├─archive
                ├─data
                ├─jar
                └─util
```

## 2. 可执行Jar的结构

- 包含
    - Jar描述：META-INF/MANIFEST.MF
    - Spring Boot Loader：org/springframework/boot/loader
    - 项目内容：BOOT-INF/classes
    - 项目依赖：BOOT-INF/lib
- 不包含
    - JDK
    - JRE
## 3. 如何找到程序的入口

```yaml
Manifest-Version: 1.0
Implementation-Title: test
Implementation-Version: 1.0-SNAPSHOT
Archiver-Version: Plexus Archiver
Built-By: zsk
Implementation-Vendor-Id: com.zsk.test
Spring-Boot-Version: 1.5.20.RELEASE
Implementation-Vendor: Pivotal Software, Inc.
Main-Class: org.springframework.boot.loader.JarLauncher
Start-Class: com.zsk.test.Application
Spring-Boot-Classes: BOOT-INF/classes/
Spring-Boot-Lib: BOOT-INF/lib/
Created-By: Apache Maven 3.6.2
Build-Jdk: 1.8.0_231
Implementation-URL: https://projects.spring.io/spring-boot/test/


```

1. META-INF/MANIFEST.MF指定了Jar的启动类，即Main-Class：org.springframework.boot.loader.JarLauncher
2. META-INF/MANIFEST.MF指定了项目的主类，即Start-Class：我们@SpringBootApplication修饰的那个类


## 4. 不需要java -jar命令就可以启动的jar包

- pom.xml

```xml
<build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <version>1.5.20.RELEASE</version>
                <configuration>
                    <executable>true</executable>
                </configuration>
            </plugin>
        </plugins>
    </build>
```

- 可以自定义配置
同一个目录下创建同步文件.conf

- test.conf

```java
JAVA_OPTS="Xmx1024m -Xms1024m -Xmn384m"

```

- 使用jinfo -flags PID查看jvm参数
### 4.1. 原理
- 使用head -n 280 jar文件查看可以看出是一个bat文件

```bat
#!/bin/bash
#
#    .   ____          _            __ _ _
#   /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
#  ( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
#   \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
#    '  |____| .__|_| |_|_| |_\__, | / / / /
#   =========|_|==============|___/=/_/_/_/
#   :: Spring Boot Startup Script ::
#

### BEGIN INIT INFO
# Provides:          test
# Required-Start:    $remote_fs $syslog $network
# Required-Stop:     $remote_fs $syslog $network
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: test
# Description:       Parent pom providing dependency and plugin management for applications built with Maven
# chkconfig:         2345 99 01
### END INIT INFO

[[ -n "$DEBUG" ]] && set -x

# Initialize variables that cannot be provided by a .conf file
WORKING_DIR="$(pwd)"
# shellcheck disable=SC2153
[[ -n "$JARFILE" ]] && jarfile="$JARFILE"
[[ -n "$APP_NAME" ]] && identity="$APP_NAME"

# Follow symlinks to find the real jar and detect init.d script
cd "$(dirname "$0")" || exit 1
[[ -z "$jarfile" ]] && jarfile=$(pwd)/$(basename "$0")
while [[ -L "$jarfile" ]]; do
  [[ "$jarfile" =~ init\.d ]] && init_script=$(basename "$jarfile")
  jarfile=$(readlink "$jarfile")
  cd "$(dirname "$jarfile")" || exit 1
  jarfile=$(pwd)/$(basename "$jarfile")
done
jarfolder="$( (cd "$(dirname "$jarfile")" && pwd -P) )"
cd "$WORKING_DIR" || exit 1

# Source any config file
configfile="$(basename "${jarfile%.*}.conf")"

# Initialize CONF_FOLDER location defaulting to jarfolder
[[ -z "$CONF_FOLDER" ]] && CONF_FOLDER="${jarfolder}"

# shellcheck source=/dev/null
[[ -r "${CONF_FOLDER}/${configfile}" ]] && source "${CONF_FOLDER}/${configfile}"

# Initialize PID/LOG locations if they weren't provided by the config file
[[ -z "$PID_FOLDER" ]] && PID_FOLDER="/var/run"
[[ -z "$LOG_FOLDER" ]] && LOG_FOLDER="/var/log"
! [[ "$PID_FOLDER" == /* ]] && PID_FOLDER="$(dirname "$jarfile")"/"$PID_FOLDER"
! [[ "$LOG_FOLDER" == /* ]] && LOG_FOLDER="$(dirname "$jarfile")"/"$LOG_FOLDER"
! [[ -x "$PID_FOLDER" ]] && PID_FOLDER="/tmp"
! [[ -x "$LOG_FOLDER" ]] && LOG_FOLDER="/tmp"

# Set up defaults
[[ -z "$MODE" ]] && MODE="auto" # modes are "auto", "service" or "run"
[[ -z "$USE_START_STOP_DAEMON" ]] && USE_START_STOP_DAEMON="true"

# Create an identity for log/pid files
if [[ -z "$identity" ]]; then
  if [[ -n "$init_script" ]]; then
    identity="${init_script}"
  else
    identity=$(basename "${jarfile%.*}")_${jarfolder//\//}
  fi
fi

# Initialize log file name if not provided by the config file
[[ -z "$LOG_FILENAME" ]] && LOG_FILENAME="${identity}.log"

# Initialize stop wait time if not provided by the config file
[[ -z "$STOP_WAIT_TIME" ]] && STOP_WAIT_TIME="60"

# ANSI Colors
echoRed() { echo $'\e[0;31m'"$1"$'\e[0m'; }
echoGreen() { echo $'\e[0;32m'"$1"$'\e[0m'; }
echoYellow() { echo $'\e[0;33m'"$1"$'\e[0m'; }

# Utility functions
checkPermissions() {
  touch "$pid_file" &> /dev/null || { echoRed "Operation not permitted (cannot access pid file)"; return 4; }
  touch "$log_file" &> /dev/null || { echoRed "Operation not permitted (cannot access log file)"; return 4; }
}

isRunning() {
  ps -p "$1" &> /dev/null
}

await_file() {
  end=$(date +%s)
  let "end+=10"
  while [[ ! -s "$1" ]]
  do
    now=$(date +%s)
    if [[ $now -ge $end ]]; then
      break
    fi
    sleep 1
  done
}

# Determine the script mode
action="run"
if [[ "$MODE" == "auto" && -n "$init_script" ]] || [[ "$MODE" == "service" ]]; then
  action="$1"
  shift
fi

# Build the pid and log filenames
PID_FOLDER="$PID_FOLDER/${identity}"
pid_file="$PID_FOLDER/${identity}.pid"
log_file="$LOG_FOLDER/$LOG_FILENAME"

# Determine the user to run as if we are root
# shellcheck disable=SC2012
[[ $(id -u) == "0" ]] && run_user=$(ls -ld "$jarfile" | awk '{print $3}')

# Find Java
if [[ -n "$JAVA_HOME" ]] && [[ -x "$JAVA_HOME/bin/java" ]]; then
    javaexe="$JAVA_HOME/bin/java"
elif type -p java > /dev/null 2>&1; then
    javaexe=$(type -p java)
elif [[ -x "/usr/bin/java" ]];  then
    javaexe="/usr/bin/java"
else
    echo "Unable to find Java"
    exit 1
fi

arguments=(-Dsun.misc.URLClassPath.disableJarChecking=true $JAVA_OPTS -jar "$jarfile" $RUN_ARGS "$@")

# Action functions
start() {
  if [[ -f "$pid_file" ]]; then
    pid=$(cat "$pid_file")
    isRunning "$pid" && { echoYellow "Already running [$pid]"; return 0; }
  fi
  do_start "$@"
}

do_start() {
  working_dir=$(dirname "$jarfile")
  pushd "$working_dir" > /dev/null
  if [[ ! -e "$PID_FOLDER" ]]; then
    mkdir -p "$PID_FOLDER" &> /dev/null
    if [[ -n "$run_user" ]]; then
      chown "$run_user" "$PID_FOLDER"
    fi
  fi
  if [[ ! -e "$log_file" ]]; then
    touch "$log_file" &> /dev/null
    if [[ -n "$run_user" ]]; then
      chown "$run_user" "$log_file"
    fi
  fi
  if [[ -n "$run_user" ]]; then
    checkPermissions || return $?
    if [ $USE_START_STOP_DAEMON = true ] && type start-stop-daemon > /dev/null 2>&1; then
      start-stop-daemon --start --quiet \
        --chuid "$run_user" \
        --name "$identity" \
        --make-pidfile --pidfile "$pid_file" \
        --background --no-close \
        --startas "$javaexe" \
        --chdir "$working_dir" \
        -- "${arguments[@]}" \
        >> "$log_file" 2>&1
      await_file "$pid_file"
    else
      su -s /bin/sh -c "$javaexe $(printf "\"%s\" " "${arguments[@]}") >> \"$log_file\" 2>&1 & echo \$!" "$run_user" > "$pid_file"
    fi
    pid=$(cat "$pid_file")
  else
    checkPermissions || return $?
    "$javaexe" "${arguments[@]}" >> "$log_file" 2>&1 &
    pid=$!
    disown $pid
    echo "$pid" > "$pid_file"
  fi
  [[ -z $pid ]] && { echoRed "Failed to start"; return 1; }
  echoGreen "Started [$pid]"
}

stop() {
  working_dir=$(dirname "$jarfile")
  pushd "$working_dir" > /dev/null
  [[ -f $pid_file ]] || { echoYellow "Not running (pidfile not found)"; return 0; }
  pid=$(cat "$pid_file")
  isRunning "$pid" || { echoYellow "Not running (process ${pid}). Removing stale pid file."; rm -f "$pid_file"; return 0; }
  do_stop "$pid" "$pid_file"
}

do_stop() {
  kill "$1" &> /dev/null || { echoRed "Unable to kill process $1"; return 1; }
  for i in $(seq 1 $STOP_WAIT_TIME); do
    isRunning "$1" || { echoGreen "Stopped [$1]"; rm -f "$2"; return 0; }
    [[ $i -eq STOP_WAIT_TIME/2 ]] && kill "$1" &> /dev/null
    sleep 1
  done
  echoRed "Unable to kill process $1";
  return 1;
}

force_stop() {
  [[ -f $pid_file ]] || { echoYellow "Not running (pidfile not found)"; return 0; }
  pid=$(cat "$pid_file")
  isRunning "$pid" || { echoYellow "Not running (process ${pid}). Removing stale pid file."; rm -f "$pid_file"; return 0; }
  do_force_stop "$pid" "$pid_file"
}

do_force_stop() {
  kill -9 "$1" &> /dev/null || { echoRed "Unable to kill process $1"; return 1; }
  for i in $(seq 1 $STOP_WAIT_TIME); do
    isRunning "$1" || { echoGreen "Stopped [$1]"; rm -f "$2"; return 0; }
    [[ $i -eq STOP_WAIT_TIME/2 ]] && kill -9 "$1" &> /dev/null
    sleep 1
  done
  echoRed "Unable to kill process $1";
  return 1;
}

restart() {
  stop && start
}

force_reload() {
  working_dir=$(dirname "$jarfile")
  pushd "$working_dir" > /dev/null
  [[ -f $pid_file ]] || { echoRed "Not running (pidfile not found)"; return 7; }
  pid=$(cat "$pid_file")
  rm -f "$pid_file"
  isRunning "$pid" || { echoRed "Not running (process ${pid} not found)"; return 7; }
  do_stop "$pid" "$pid_file"
  do_start
}

status() {
  working_dir=$(dirname "$jarfile")
  pushd "$working_dir" > /dev/null
  [[ -f "$pid_file" ]] || { echoRed "Not running"; return 3; }
  pid=$(cat "$pid_file")
  isRunning "$pid" || { echoRed "Not running (process ${pid} not found)"; return 1; }
  echoGreen "Running [$pid]"
  return 0
}

run() {
  pushd "$(dirname "$jarfile")" > /dev/null
  "$javaexe" "${arguments[@]}"
  result=$?
  popd > /dev/null
  return "$result"
}

# Call the appropriate action function
case "$action" in
start)
  start "$@"; exit $?;;
stop)
  stop "$@"; exit $?;;
force-stop)
  force_stop "$@"; exit $?;;
restart)
  restart "$@"; exit $?;;
force-reload)
  force_reload "$@"; exit $?;;
status)
  status "$@"; exit $?;;
run)
  run "$@"; exit $?;;
*)
  echo "Usage: $0 {start|stop|force-stop|restart|force-reload|status|run}"; exit 1;
esac

exit 0
```
## 5. 参考
- [彻底透析SpringBoot jar可执行原理 \- 掘金](https://juejin.im/post/5d2d6812e51d45777b1a3e5a)
