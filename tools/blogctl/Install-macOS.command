#!/bin/sh
set -eu

host_name='com.thinkerqaq.blogctl'
extension_id='kbenbblolndleojbmcjcfmkkgfhljmbe'
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)

case "$(uname -m)" in
  x86_64|amd64) architecture='amd64' ;;
  arm64|aarch64) architecture='arm64' ;;
  *)
    printf 'BlogCTL 不支持当前 CPU 架构：%s\n' "$(uname -m)" >&2
    exit 1
    ;;
esac

blogctl_path="$script_dir/blogctl-darwin-$architecture"
if [ ! -f "$blogctl_path" ]; then
  printf '找不到 BlogCTL：%s\n' "$blogctl_path" >&2
  exit 1
fi
chmod +x "$blogctl_path"

escaped_path=$(printf '%s' "$blogctl_path" | sed 's/\\/\\\\/g; s/"/\\"/g')
manifest=$(printf '%s\n' \
  '{' \
  "  \"name\": \"$host_name\"," \
  '  "description": "BlogCTL local bridge launcher",' \
  "  \"path\": \"$escaped_path\"," \
  '  "type": "stdio",' \
  '  "allowed_origins": [' \
  "    \"chrome-extension://$extension_id/\"" \
  '  ]' \
  '}')

installed=0
for native_dir in \
  "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts" \
  "$HOME/Library/Application Support/Chromium/NativeMessagingHosts" \
  "$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts"
do
  mkdir -p "$native_dir"
  manifest_path="$native_dir/$host_name.json"
  printf '%s\n' "$manifest" > "$manifest_path"
  chmod 600 "$manifest_path"
  printf '已注册：%s\n' "$manifest_path"
  installed=$((installed + 1))
done

printf 'BlogCTL macOS 安装完成，共写入 %s 个浏览器清单。\n' "$installed"
printf '加载 extension 后，打开扩展即可按需自动启动 Bridge。\n'
