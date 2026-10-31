#!/usr/bin/env bash
set -euo pipefail
# Each GOOS/GOARCH can have different dependencies; collect a safe union.
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
tool=".build/tools/go-licenses"
if [[ ! -x "$tool" ]]; then
  echo "missing $tool; install github.com/google/go-licenses/v2@v2.0.1" >&2
  exit 1
fi
out=".build/out/publish-licenses"
per_target=".build/out/publish-licenses-by-target"
rm -rf "$out" "$per_target"
mkdir -p "$out" "$per_target"
for target in windows-amd64 windows-arm64 darwin-amd64 darwin-arm64 linux-amd64 linux-arm64; do
  IFS=- read -r os arch <<<"$target"
  echo "Collect licenses for $os/$arch"
  GOOS="$os" GOARCH="$arch" CGO_ENABLED=0 "$tool" save ./tools/blogctl/cmd \
    --ignore=github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl \
    --save_path="$per_target/$target"
  # go-licenses writes read-only files; enable overwrites for the next target.
  chmod -R u+w "$out"
  cp -R "$per_target/$target/." "$out/"
done
if ! find "$out" -type f -print -quit | grep -q .; then
  echo "third-party license collection produced no files" >&2
  exit 1
fi
echo "Cross-platform third-party license collection passed"
