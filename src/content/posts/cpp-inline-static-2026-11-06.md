---
title: "C++ inline、static 与命名空间：把相似的名字分清（11.6）"
published: 2026-11-06
description: "整理 inline 的多定义规则、跨文件共享常量、静态局部变量、using 与内联命名空间，以及悬空 else。"
tags: ["C++", "学习笔记", "链接", "易错点"]
category: "C++"
---

今天继续学习作用域和链接，重点是 `inline`、`static` 和命名空间。原始文件名误写为 `10.6.txt`，这篇按实际学习日期 11 月 6 日整理。

## 一、今天学到的知识点

### 1. 翻译单元与重复定义

假设 `math.h` 定义了普通函数 `square`，`main.cpp` 和 `other.cpp` 都包含这个头文件。预处理后，两个翻译单元中都会出现该函数的定义。如果它是普通的外部链接函数，就违反单一定义规则，常见表现是链接器报告重复定义。

`#pragma once` 或头文件保护只能防止同一翻译单元内的重复包含，不能阻止不同 `.cpp` 各包含一次。

```cpp
// math.h
#pragma once

inline int square(int value)
{
    return value * value;
}
```

这里的 `inline` 允许符合单一定义规则条件的定义出现在多个翻译单元中。它不是允许任意不同实现使用同一个名字。

### 2. inline 与内联展开是两个概念

| 概念 | 本阶段需要理解的含义 |
| --- | --- |
| `inline` 函数 | 允许符合要求的跨翻译单元多份定义 |
| 内联展开 | 编译器把函数调用替换成函数体相关操作的优化 |

编译器可能展开没有写 `inline` 的函数，也可能不展开写了 `inline` 的函数。所以 `inline` 不能保证速度提升。

### 3. constexpr 与 inline constexpr

```cpp
// config.h，C++17
#pragma once
namespace config
{
    inline constexpr int maxBatchSize{64};
}
```

在普通命名空间作用域，没有额外声明改变链接属性时，单独的 `constexpr int x{64};` 默认具有内部链接。多个翻译单元包含它，会各有自己的对象实体。

`inline constexpr int x{64};` 则可在多个翻译单元中定义，并表示同一个外部链接实体。两种写法都可能正常使用，区别不只是“会不会报错”。

`const` 表示不能通过普通方式修改对象；`constexpr` 变量的初始化必须满足常量表达式要求。运行时输入的配置不适合硬写成编译期常量。

### 4. static 局部变量：保留状态，不扩大作用域

```cpp
#include <iostream>

void countCalls()
{
    static int count{0};
    ++count;
    std::cout << count << '\n';
}

int main()
{
    countCalls();
    countCalls();
    countCalls();
}
```

程序依次输出 1、2、3。局部静态对象跨调用存活，不会每次进入函数都重新初始化；名字仍只在所在局部作用域中可用。

`static` 放在不同位置要分别理解：命名空间作用域的函数加 `static`，主要影响链接属性；局部变量加 `static`，主要改变存储期。

### 5. using 声明与 using 指令

```cpp
using std::cout;       // using 声明，引入指定名字
// using namespace std; // using 指令，让命名空间中的名字参与查找
```

前者范围更明确。特别是在头文件中，应避免随意使用 `using namespace std;`，否则会影响所有包含它的代码。

### 6. inline namespace

```cpp
namespace math
{
    inline namespace v1
    {
        int calculate() { return 100; }
    }
    namespace v2
    {
        int calculate() { return 200; }
    }
}
```

这个例子中，`math::calculate()` 与 `math::v1::calculate()` 都返回 100，`math::v2::calculate()` 返回 200。这里的 `inline` 影响名称查找，与函数内联展开无关。

### 7. 悬空 else 与多余的分号

```cpp
int x{25};
if (x > 0)
    if (x < 10)
        std::cout << "small\n";
    else
        std::cout << "not positive\n";
```

`else` 匹配最近尚未匹配的 `if`，所以这里会打印 `not positive`，即使这句文字不符合外层条件的实际含义。缩进不决定控制流，明确加大括号才可靠。

`if (x > 0);` 中的分号构成空语句，后续 `{ ... }` 成为独立代码块，不再受这个条件控制。

## 二、我的心得与注意事项

- **把 inline 关键字与“编译器内联展开”分开记；加了 inline 不代表一定展开。**
- **普通小函数需要定义在头文件中、供多个源文件使用时，可以考虑 inline。**
- **static 局部变量是“对象一直在，名字仍局部”；它不会变成全局可访问变量。**
- **using 声明指定一个名字，using 指令让整个命名空间参与名字查找。**
- **inline 函数、inline 变量、inline namespace 虽然共用关键字，解决的问题并不相同。**
- **else 找最近尚未匹配的 if；if 后面不要误加分号。**

## 三、还需要动手验证的地方

原笔记在 `constexpr` 与 `inline constexpr` 的区别处写了“这部分没看懂”。整理后的解释是：前者默认在各翻译单元有各自实体，后者可以共享同一个实体。**下一步需要用两个 `.cpp` 文件验证，不能仅因为看过解释就当作已经掌握。**

参考：[LearnCpp：inline 函数与变量](https://www.learncpp.com/cpp-tutorial/inline-functions-and-variables/)、[跨文件共享常量](https://www.learncpp.com/cpp-tutorial/sharing-global-constants-across-multiple-files-using-inline-variables/)。
