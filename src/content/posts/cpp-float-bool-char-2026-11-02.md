---
title: "C++ 浮点数、布尔值与字符：类型转换的第一步（11.2）"
published: 2026-11-02
description: "整理科学计数法、浮点精度与输出、布尔输入、字符读取及 static_cast，区分笔记心得和补充纠错。"
tags: ["C++", "学习笔记", "数据类型", "易错点"]
category: "C++"
---

今天从整数继续学到浮点数、布尔值和字符。它们不只是存储方式不同，输入、输出和类型转换的规则也各有区别。前半部分整理知识点，后半部分保留原笔记中的记忆提示；补充纠错另行说明。

## 一、今天学到的知识点

### 1. 科学计数法与类型大小

`8.70e1` 表示 `8.70 × 10¹`，也就是 87.0。测量记录中的末尾零可能表达有效数字，例如 `87.000` 可记作 `8.7000e1`；但 C++ 不会据此保存“测量精度”元数据。没有背景信息时，`2100` 的有效数字数量存在歧义。

原笔记记录的环境中，`bool/char` 为 1 字节，`short` 为 2 字节，`int/long/float` 为 4 字节，`long long/double/long double` 为 8 字节。这是该环境的结果，其他编译器或平台应重新用 `sizeof` 检查。

### 2. 浮点字面量与输出精度

```cpp
#include <iomanip>
#include <iostream>

int main()
{
    int count{5};
    double value{5.0};
    float weight{5.0f};
    std::cout << count << ' ' << value << ' ' << weight << '\n';
    std::cout << std::setprecision(17) << 0.1 << '\n';
}
```

无后缀的 `5.0` 默认是 `double`，`5.0f` 是 `float`。默认浮点输出通常显示 6 位有效数字；`std::setprecision` 配合默认格式控制有效数字数，配合 `std::fixed` 时控制小数位数。

常见二进制浮点格式下，`float` 约有 6–9 位十进制精度，`double` 约有 15–17 位。这里不能理解成“所有这些位数以内的十进制小数都能精确存储”。例如 `0.1` 通常仍是近似值。详见 [LearnCpp 浮点数说明](https://www.learncpp.com/cpp-tutorial/floating-point-numbers/)。

支持相应 IEEE 754 特性的环境还有正负无穷、NaN 和正负零。NaN 表示无法作为普通数值解释的结果。日常程序应检查输入和计算条件，不把除以零当作产生特殊值的常规写法。

### 3. bool 的转换、输出和输入

`bool` 有 `true`、`false` 两个值，逻辑非 `!` 会取反。输出时默认显示 `1/0`，加 `std::boolalpha` 后显示文字。

```cpp
#include <iostream>

int main()
{
    bool enabled{true};
    std::cout << enabled << '\n';             // 1
    std::cout << std::boolalpha << !enabled;   // false
}
```

整数转换到 `bool` 时，零变成 `false`，非零变成 `true`；但花括号初始化不允许一般的窄化转换：`bool flag{2};` 不合法，`bool flag = 2;` 则允许转换。

输入的规则需要单独记：默认 `std::cin >> flag` 期待 `0/1`。输入其他整数可能把值设为 `true`，同时让输入流进入失败状态，因此不能把它当作正常输入。启用 `std::boolalpha` 后，默认环境下使用小写 `true/false`，不再使用 `0/1`。

### 4. if 与提前返回

```cpp
int absoluteSmallInt(int value)
{
    if (value < 0)
        return -value;
    return value;
}
```

`if` 根据条件执行分支，整数条件也会转换为布尔值。提前 `return` 会直接结束当前函数。这里的示例只用于可安全取负的小整数；最小的 `int` 无法用同类型表示其相反数。

### 5. char 与输入中的空格

`char` 保存一个字符编码单元。常见环境使用兼容 ASCII 的基本字符编码，但不能把所有字符集都当作 ASCII，也不能用一个 `char` 保存任意中文字符。

```cpp
char ch{};
std::cin >> ch;       // 跳过前导空白，提取一个字符
std::cin.get(ch);     // 提取下一个字符，包括空格或换行
```

输入 `abcd` 时，一次 `>> ch` 只取出 `a`，其余字符留在流中。常见转义符包括 `\n`（换行）、`\t`（制表符）、`\\`（反斜杠）、`\'` 和 `\"`。

### 6. static_cast：显式表达转换意图

```cpp
double value{5.5};
int whole{static_cast<int>(value)}; // 5，舍弃小数部分
char letter{'a'};
int code{static_cast<int>(letter)};
```

转换产生目标类型的值，不会改变源变量的声明类型。给接受 `double` 的函数传入整数时，也会先进行相应转换。

## 二、我的心得与注意事项

- **写浮点字面量时保留小数点；需要 float 时记得加 f 后缀。**
- **显示出来只有六位，不代表变量内部只保存了六位；输出格式和存储精度要分开记。**
- **bool 的普通整数转换规则，与从 cin 读取 bool 的规则不是一回事。**
- **读字符时，`>>` 会跳过前导空白；希望读到空格就用 `get()`。**
- **`static_cast<int>(value)` 得到一个转换后的值，原来的 value 仍然是 double。**

## 三、整理时补充的纠错

**“能保留若干位有效数字”不等于“能精确表示任意有限小数”。** 这是理解后续浮点比较的前提。

**显式转换不会自动保证安全。** 转换前仍要考虑范围，尤其是浮点转整数、较宽整数转较窄整数、有符号与无符号之间的转换。
