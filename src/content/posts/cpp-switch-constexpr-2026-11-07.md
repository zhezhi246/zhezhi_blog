---
title: "C++ if constexpr 与 switch：分支、贯穿执行和作用域（11.7）"
published: 2026-11-07
description: "整理 LearnCpp 8.4–8.6：编译期条件、switch 的匹配规则、break、fallthrough 和 case 中的局部变量。"
tags: ["C++", "学习笔记", "控制流", "易错点"]
category: "C++"
---

今天学习 LearnCpp 8.4–8.6。重点是两种不同的分支选择：`if constexpr` 在编译期选择分支，`switch` 根据一个值选择执行入口。

## 一、今天学到的知识点

### 1. if constexpr：条件必须能在编译期确定

```cpp
#include <iostream>

int main()
{
    constexpr int maxBatchSize{64};
    if constexpr (maxBatchSize > 32)
    {
        std::cout << "large batch\n";
    }
    else
    {
        std::cout << "small batch\n";
    }
}
```

`constexpr` 函数可以在条件满足时参与编译期求值，也可以在运行时调用；`if constexpr` 则要求条件满足相应的编译期常量要求。普通 `if` 能使用运行时条件。

### 2. switch 适合一个值对应多个固定选项

```cpp
int mode{1};
switch (mode)
{
case 0:
    std::cout << "FP32\n";
    break;
case 1:
    std::cout << "FP16\n";
    break;
case 2:
    std::cout << "INT8\n";
    break;
default:
    std::cout << "Unknown\n";
    break;
}
```

上面的结果是 FP16。`switch` 的条件使用整数、枚举或能按规则转换的类型，不能直接用 `double` 或 `std::string`。

`case` 标签需要编译期常量，普通运行时变量不能用作标签；合适的 `constexpr` 整数可以。`default` 在没有匹配标签时提供入口，不是语法上必须，但很适合处理意外取值。

判断范围、多个变量组合条件时，通常仍用 `if`；同一个整数或枚举对应多个固定值时，`switch` 更清楚。

### 3. 找到 case，只决定从哪里开始

```cpp
int mode{1};
switch (mode)
{
case 0: std::cout << 'A';
case 1: std::cout << 'B';
case 2: std::cout << 'C';
default: std::cout << 'D';
}
```

这里输出 BCD。进入 `case 1` 后，程序会继续往下执行，不会在下一条 `case` 标签自动停止。这叫贯穿执行。

有意贯穿时，可以用 C++17 的 `[[fallthrough]];` 表达意图：

```cpp
switch (mode)
{
case 1:
    std::cout << "Start\n";
    [[fallthrough]];
case 2:
    std::cout << "Process\n";
    break;
default:
    break;
}
```

这个标记帮助读代码的人和工具理解意图，不会改变执行顺序。多个连续标签可以共享代码，例如 `case 1: case 2: case 3:`，这种写法不需要在标签之间加 `[[fallthrough]]`。

### 4. case 标签不自动创建作用域

```cpp
switch (mode)
{
case 1:
{
    int value{10};
    std::cout << value;
    break;
}
case 2:
    std::cout << "Mode 2";
    break;
default:
    break;
}
```

这里给第一项加了大括号。如果移除它们，`value` 的作用域会延伸到后续标签，程序存在跳过初始化直接进入后续标签的路径，因此不合法。

即使眼下 `mode` 被写成 1，也不能用“实际只走第一项”绕过这条语言规则。

## 二、我的心得与注意事项

- **constexpr 函数是“满足条件时可以编译期调用”；if constexpr 是“条件必须在编译期确定”。**
- **if constexpr 不是让错误代码自动变合法的机制。**
- **switch 先定位入口，再顺序执行；想停下来要用 break 或 return 等控制语句。**
- **在这里 break 离开 switch，return 离开整个函数。**
- **`[[fallthrough]];` 结尾有分号，它表达有意贯穿，不负责阻止贯穿。**
- **case 后面不是天然的独立作用域；需要局部变量时，给这一项加大括号。**

## 三、整理时补充的边界

在普通非模板代码中，被 `if constexpr` 丢弃的分支仍需要通过相应检查。它在模板实例化中的规则更细，之后学模板时再展开，不要把它当作条件预处理器。

下一步从循环继续；完整安排见 [LearnCpp 学习计划](../learncpp-guide/)。

参考：[LearnCpp：if constexpr](https://www.learncpp.com/cpp-tutorial/constexpr-if-statements/)、[switch 的贯穿与作用域](https://www.learncpp.com/cpp-tutorial/switch-fallthrough-and-scoping/)。
