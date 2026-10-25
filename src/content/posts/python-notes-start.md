---
title: "Python 学习笔记：从这里开始"
published: 2026-10-25
description: "Python 分类的第一篇笔记，记录环境、语法与常用技巧。"
tags: ["Python", "学习笔记"]
category: "Python"
---

这个分类用来记录 Python 相关的学习笔记：语法细节、标准库、第三方库、脚本与工程化实践。

## 环境备忘

每次新开项目先固定环境，避免"在我电脑上能跑"的问题：

```bash
# 创建并激活虚拟环境
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# 固定依赖
pip freeze > requirements.txt
```

## 一个值得记的语法点

海象运算符 `:=`（Python 3.8+），在表达式内部赋值，适合"取值再判断"的场景：

```python
# 以前要写两次 line
# line = f.readline()
# while line:
#     ...

# 现在一步到位
while (line := f.readline()):
    process(line)
```

## 坑点备忘

> [!WARNING]
> 可变对象做默认参数是经典陷阱：`def f(items=[])` 的列表会在多次调用间共享。

> [!TIP]
> 调试时 `print` 之外可以试试 `breakpoint()`，直接进入交互式调试器。

## 参考

- [Python 官方文档](https://docs.python.org/zh-cn/3/)
- 《流畅的 Python》—— 理解 Python 设计的第二阶段读物
