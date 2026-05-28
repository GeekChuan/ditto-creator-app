#!/bin/bash

set -e


# 确保 pnpm 已安装（优先使用 corepack，其次全局安装）
if ! command -v pnpm >/dev/null 2>&1 || ! pnpm -v >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable || true
    corepack prepare pnpm@10 --activate || true
  fi
fi
if ! command -v pnpm >/dev/null 2>&1 || ! pnpm -v >/dev/null 2>&1; then
  npm i -g pnpm@10
fi

pnpm -v

# 安装项目依赖
echo "安装项目依赖..."
pnpm install --frozen-lockfile --production=false

# 批准并执行依赖的构建脚本（非交互）
echo "重建本地模块..."
pnpm rebuild -r || true

# 检查环境变量是否已定义
if [ -z "$FAAS_ENV_TYPE" ]; then
  echo "环境变量 FAAS_ENV_TYPE 未设置"
  exit 1
fi

# 解析环境
case "$FAAS_ENV_TYPE" in
  0)
    EFFECTIVE_ENV="dev"
    ;;
  1)
    EFFECTIVE_ENV="prod"
    ;;
  *)
    echo "无效的 FAAS_ENV_TYPE 值: $FAAS_ENV_TYPE"
    exit 1
    ;;
esac

echo "运行构建命令: pnpm run build:${EFFECTIVE_ENV}"
pnpm run build:${EFFECTIVE_ENV}
