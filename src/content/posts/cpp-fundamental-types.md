---
title: "C++ 基本数据类型与整数：完整笔记与易错点（10.31）"
published: 2026-10-31
description: "整理 10.31 的基本类型笔记：语法/语义错误、void、各类型大小、sizeof、有符号整数、溢出和整数除法，并补上容易混的边界。"
tags: ["C++", "数据类型", "整数", "学习笔记", "易错点"]
category: "C++"
---

今天的笔记基本是 learncpp 的类型表整理，自己的批注不多，所以这篇没有额外加粗；前半部分是笔记，后半部分是我补的容易混的点。

## 一、完整笔记

### 1. 语法错误与语义错误

语法错误是指代码不符合 C++ 的语法规则，比如缺少分号、括号或花括号不匹配。编译器一般会直接报错。

语义错误是指代码语法上合法，但含义不对：可能违反了语言的其他规则，或者没有达到程序员想要的效果。比如用了未初始化的变量、类型不匹配、数组越界，编译不一定拦得住。

### 2. 基本数据类型

| 类别 | 类型 | 含义 | 例子 |
| --- | --- | --- | --- |
| 浮点 | `float`、`double`、`long double` | 带小数部分的数 | `3.14159` |
| 布尔 | `bool` | `true` / `false` | `true` |
| 字符 | `char`、`wchar_t`、`char8_t`、`char16_t`、`char32_t` | 单个字符 | `'c'` |
| 整数 | `short int`、`int`、`long int`、`long long int` | 正整数、负整数和 0 | `64` |
| 空指针 | `std::nullptr_t` | 空指针 | `nullptr` |
| 无类型 | `void` | 没有类型 | 无 |

新版 C++ 里很多类型带 `_t` 后缀，比如 `std::nullptr_t`。`_t` 表示“type”，是现代类型常用的命名法。不过这不是统一规则，很多类型没有这个后缀。

### 3. void

`void` 的意思是“无类型”。常见用法有三种：

1. 函数不返回值：

```cpp
void printHello()
{
    std::cout << "Hello!\n";
}
```

如果在这种函数里写 `return 值;`，会编译错误；写 `return;` 可以，但通常多余。

2. 表示函数不接受参数：

```cpp
int getValue(void) // 这里的 void 表示没有参数
{
    int x{};
    std::cin >> x;
    return x;
}
```

这种写法在 C++ 中已经弃用，推荐写成 `int getValue()`。

3. `void*` 无类型指针，后面讲指针时再看。

### 4. 基本假设

下面的类型大小表基于一些现代平台的合理假设：

- 一个字节等于 8 位；
- 内存按字节寻址；
- 浮点运算符合 IEEE-754；
- 采用 32 位或 64 位架构。

这些不是 C++ 标准对所有平台的保证，但在常见的现代机器上基本成立。

### 5. 类型大小

| 类别 | 类型 | 最小大小 | 常见大小 |
| --- | --- | --- | --- |
| 布尔 | `bool` | 1 byte | 1 byte |
| 字符 | `char` | 1 byte（固定） | 1 byte |
| 字符 | `wchar_t` | 1 byte | 2 或 4 bytes |
| 字符 | `char8_t` | 1 byte | 1 byte |
| 字符 | `char16_t` | 2 bytes | 2 bytes |
| 字符 | `char32_t` | 4 bytes | 4 bytes |
| 整数 | `short` | 2 bytes | 2 bytes |
| 整数 | `int` | 2 bytes | 4 bytes |
| 整数 | `long` | 4 bytes | 4 或 8 bytes |
| 整数 | `long long` | 8 bytes | 8 bytes |
| 浮点 | `float` | 4 bytes | 4 bytes |
| 浮点 | `double` | 8 bytes | 8 bytes |
| 浮点 | `long double` | 8 bytes | 8、12 或 16 bytes |
| 指针 | `std::nullptr_t` | 4 bytes | 4 或 8 bytes |

C++ 只保证整数变量具有最小大小，实际可能更大，具体取决于目标系统。

### 6. sizeof

`sizeof` 运算符返回类型或对象的大小，单位是字节。它可以用于类型，也可以用于变量。

```cpp
std::cout << std::left; // 让输出左对齐
std::cout << "bool: " << sizeof(bool) << " bytes\n";
std::cout << "short: " << sizeof(short) << " bytes\n";
std::cout << "int: " << sizeof(int) << " bytes\n";
```

### 7. 有符号整数

C++ 里的整数默认是有符号的，符号会作为数值的一部分存储。因此有符号整数可以表示正数、负数（以及 0）。

推荐的写法：

```cpp
short s;      // 不要写 short int
int i;
long l;       // 不要写 long int
long long ll; // 不要写 long long int
```

尽量使用不带 `int` 后缀、不带 `signed` 前缀的简写类型。

#### 有符号整数的范围

| 大小 / 类型 | 范围 |
| --- | --- |
| 8-bit signed | -128 到 127 |
| 16-bit signed | -32,768 到 32,767 |
| 32-bit signed | -2,147,483,648 到 2,147,483,647 |
| 64-bit signed | -9,223,372,036,854,775,808 到 9,223,372,036,854,775,807 |

规律：一个 n 位有符号整数的范围是 `-(2^(n-1))` 到 `2^(n-1)-1`。

### 8. 整数溢出

如果算术运算（比如加法或乘法）试图创建一个超出整数表示范围的值，就叫整数溢出。

对于有符号整数，溢出是未定义行为；溢出还会导致信息丢失，结果不可靠。

### 9. 整数除法

两个整数相除时，结果始终是整数，小数部分会被直接舍弃，而不是四舍五入。

```cpp
-13 / 5 = -2 余 -3
```

C++11 起，整数除法向零截断，所以 `-13 / 5` 得到 `-2`，不是 `-3`。

## 二、易错点

### `int` 不保证是 4 字节

很多人默认 `int` 就是 4 字节、32 位，但标准只保证它至少 2 字节。`long` 也可能是 4 或 8 字节，`long double`、`wchar_t` 的大小也不固定。

```cpp
std::cout << sizeof(int) << '\n'; // 你的机器上可能是 4，也可能是 2
```

如果只是日常计数，`int` 够用；如果要跨平台、要固定宽度，用 `<cstdint>` 里的 `int32_t`、`uint64_t` 这类类型，或者用 `sizeof` 先确认。

### 有符号整数溢出是未定义行为

```cpp
int x = std::numeric_limits<int>::max();
x = x + 1; // 未定义行为
```

有符号溢出不是“变成最小值”这么简单，而是 UB：编译器可以假设它不会发生，从而做出各种优化。不要依赖回绕结果。

无符号整数溢出是另外一回事：它按 `2^n` 取模，行为是定义的。但这也不代表你应该拿它来做普通的数值计算。

需要处理大范围时，换 `long long`、`unsigned` 或检查边界；调试时打开 UBSan 一类的工具。

### 整数除法向零截断，不是向下取整

```cpp
std::cout <<  13 / 5 << '\n'; // 2
std::cout << -13 / 5 << '\n'; // -2，不是 -3
```

C++11 起，整数除法向零截断；余数的符号跟随被除数，所以 `-13 % 5` 是 `-3`。

如果你要的是“向下取整”的除法，不能直接用 `/`；负数时要么用浮点 + `std::floor`，要么自己调整商和余数。

### `sizeof` 返回的是 `size_t`，无符号

```cpp
if (sizeof(int) - 5 < 0) // 这个条件永远为假
{
    // ...
}
```

`sizeof` 的结果类型是 `size_t`，通常是无符号的。`sizeof(int) - 5` 会按无符号运算，负数会变成一个很大的正数，所以 `< 0` 永远不成立。

比较 `size_t` 和 `int` 时先统一类型，比如 `static_cast<int>(sizeof(int))` 或直接用 `std::ssize`。

### `char` 有没有符号由实现决定

`char` 可能是 signed，也可能是 unsigned，标准没有规定。不要把 `char` 当成“一定是 -128 到 127”或“一定是 0 到 255”。

```cpp
char c = 255; // 可能是 -1，也可能是 255
```

存字符用 `char`；存数值字节用 `unsigned char` / `uint8_t`；需要明确有符号就用 `signed char`。`char`、`signed char`、`unsigned char` 是三种不同的类型。

### `void` 函数不能 `return 值;`

```cpp
void f()
{
    // return 0; // compile error
    return;     // 可以，但没必要
}
```

`void` 函数没有返回值，不能用在需要值的地方，比如 `std::cout << f();`。`void f(void)` 这种“无参数”的写法也已经弃用，直接写 `void f()`。

## 速查表

| 想做的事 | 写法 |
| --- | --- |
| 查类型大小 | `sizeof(T)` / `sizeof(x)` |
| 固定宽度整数 | `<cstdint>` 的 `int32_t` / `uint64_t` |
| 有符号最小值/最大值 | `std::numeric_limits<int>::min()` / `max()` |
| 整数除法 | `/`，向零截断 |
| 无类型函数 | `void f()` |
| 无类型指针 | `void*`（后面讲） |

## 参考

- [learncpp: Fundamental data types](https://www.learncpp.com/cpp-tutorial/introduction-to-fundamental-data-types/)
- [learncpp: Object sizes and the sizeof operator](https://www.learncpp.com/cpp-tutorial/object-sizes-and-the-sizeof-operator/)
- [cppreference: Arithmetic operators](https://en.cppreference.com/w/cpp/language/operator_arithmetic)
