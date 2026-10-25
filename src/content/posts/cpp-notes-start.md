---
title: "C++ 学习笔记：从这里开始"
published: 2026-10-25
description: "C++ 分类的第一篇笔记，顺便整理一套自己惯用的笔记格式。"
tags: ["C++", "学习笔记"]
category: "C++"
---

这个分类用来记录 C++ 的学习笔记：语言特性、标准库、踩过的坑、读过的源码。

## 笔记会怎么写

每篇笔记尽量遵循同一个结构，方便以后回溯：

- **结论先行**：先把这次学到的核心结论写出来，再展开细节；
- **代码说话**：每个知识点配一段能跑的最小示例；
- **记录坑点**：编译报错、未定义行为、平台差异，单独列出来。

## 一个最小的例子

以 `std::unique_ptr` 为例，记录一下最基础的用法：

```cpp
#include <memory>
#include <iostream>

struct Task {
    ~Task() { std::cout << "Task released\n"; }
    void run() const { std::cout << "running...\n"; }
};

int main() {
    // 独占所有权，离开作用域自动释放
    auto task = std::make_unique<Task>();
    task->run();

    // 所有权转移后，task 变为 nullptr
    auto taken = std::move(task);
    return 0;
}
```

## 坑点备忘

> [!WARNING]
> `std::move` 之后原指针已经为空，再解引用就是未定义行为。编译器不一定会提醒。

> [!TIP]
> 遇到看不懂的报错模板，优先看错误信息的**最后几行**，往往才是根因所在。

## 参考

- [cppreference](https://cppreference.com) —— 查标准库行为的第一站
- 《Effective Modern C++》—— 条目式的好书，适合当作笔记索引
