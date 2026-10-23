#!/usr/bin/env bash
# 强制退出所有「会议记录」相关进程
pkill -9 -f "meeting-recorder" 2>/dev/null || true
pkill -9 -f "会议纪要工具/node_modules/electron" 2>/dev/null || true
pkill -9 -f "会议记录.app" 2>/dev/null || true
pkill -9 -f "transcribe_service.py" 2>/dev/null || true
pkill -9 -f "transcribe.py" 2>/dev/null || true
echo "已尝试结束会议记录相关进程。"
