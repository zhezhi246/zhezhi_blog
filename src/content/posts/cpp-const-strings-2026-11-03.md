---
title: "C++ 常量与字符串：getline、string_view 和求值顺序（11.3）"
published: 2026-11-03
description: "整理 const、字符串输入、string_view 的生命周期和函数参数求值顺序，保留自己的记忆提示与注意事项。"
tags: ["C++", "学习笔记", "字符串", "易错点"]
category: "C++"
---

今天主要学习常量和字符串，最后接触到运算符与函数参数的求值顺序。最值得记住的是：看起来简短的写法，也可能隐藏输入流状态、对象生命周期或求值顺序的问题。

## 一、今天学到的知识点

### 1. const：初始化以后不再修改

```cpp
const double gravity{9.8};
int age{5};
const int savedAge{age};
```

常量需要初始化，但初始化值可以在运行时取得。`const int` 与 `int const` 都合法；这里统一使用前一种风格。命名仍使用 `savedAge` 这样的普通变量命名。

不需要修改的对象可以优先声明为 `const`，让意图更清楚。简单常量也优先于文本替换宏。`const` 不代表初始化一定发生在编译期。

按值参数上的 `const` 只限制函数内部的副本；普通标量按值返回类型上的顶层 `const` 没有实用价值。不能把这条经验扩展成“所有参数都不要 const”，后续 `const` 引用参数非常重要。

### 2. string 与整行输入

使用 `std::string` 需要包含 `<string>`，字符串可以赋新值、改变长度，也可以直接输出。

```cpp
#include <iostream>
#include <string>

int main()
{
    int choice{};
    std::cin >> choice;
    std::string name{};
    std::getline(std::cin >> std::ws, name);
    std::cout << name << " chose " << choice << '\n';
}
```

`std::cin >> name` 读取到空白就停止，所以 `John Doe` 不会一次读成完整姓名。`std::getline` 按行读取，但若前一次 `>>` 留下了换行，直接调用会读到空行。

`std::ws` 消耗前导空白，适合上面的姓名输入。它也会消耗有意义的前导空格和空行；如果这些需要保留，就应该根据输入协议清理上一次遗留的行尾，而不是机械地加 `std::ws`。

### 3. 成员函数与长度

```cpp
std::string name{"Alex"};
auto length{name.length()};
```

`name.length()` 是通过对象调用成员函数，普通函数则常写作 `function(object)`。`length()` 返回 `std::string::size_type`，是无符号类型。仅在确认长度能由 `int` 表示、且接口确实要求 `int` 时，再做显式转换。

### 4. string_view：查看已有字符，不负责保存字符

```cpp
#include <iostream>
#include <string>
#include <string_view>

void printText(std::string_view text)
{
    std::cout << text << '\n';
}

int main()
{
    std::string owner{"Hello"};
    std::string_view view{owner};
    printText(owner);
    printText("world");
    std::string copy{view};
}
```

`string_view` 可查看字符串字面量、`string` 或另一个视图，复制视图通常无需复制字符。需要拥有独立内容时，可以用 `std::string copy{view}` 显式创建字符串。

视图不能通过自己的接口修改字符，但底层字符串仍可能被其他代码改变。给视图赋值是让它查看另一段字符，不是修改原字符串。

### 5. 生命周期：视图不能比数据活得更久

```cpp
std::string_view view{};
{
    std::string text{"Hello"};
    view = text;
}
// 此后通过 view 读取字符不安全：text 已经销毁。
```

同样，若 `getName()` 按值返回 `std::string`，`std::string_view name{getName()};` 会在语句结束后留下悬空视图。应先用 `std::string` 接住返回值，再按需要建立视图。

### 6. 参数位置确定，参数求值先后不确定

```cpp
printCalculation(getValue(), getValue(), getValue());
```

这里的第一、第二、第三个参数表达式分别对应固定的形参，但三个 `getValue()` 不保证从左向右执行。如果函数里有交互输入，读入顺序可能不符合预期。

```cpp
int a{getValue()};
int b{getValue()};
int c{getValue()};
printCalculation(a, b, c);
```

拆成连续语句后，输入顺序就明确了。括号能表达运算分组，却不能凭空规定函数参数的求值顺序。

## 二、我的心得与注意事项

- **使用 std::string 时，先记得包含 `<string>`。**
- **姓名含空格时用 getline；混用 `>>` 和 getline 时，先想一想流里是否还留着换行。**
- **普通函数记作 `function(object)`，成员函数记作 `object.function()`。**
- **string_view 可以记作“借来看，不替我保存”；数据销毁以后，视图不会自动获知。**
- **函数参数的对应关系不会乱，不能依赖的是计算这些参数表达式的先后顺序。**
- **多个输入有顺序要求时，先分别存入变量，再调用函数。**

## 三、整理时补充的纠错

**不要记成“某编译器永远从左到右、另一种永远从右到左”。** 观察到的行为不是语言保证，版本、选项和上下文都可能影响它。

**string 并非一律很慢，string_view 也并非一律更合适。** 是否复制、字符串长度、是否需要保存数据，才是选择时要考虑的问题。

参考：[LearnCpp：字符串视图](https://www.learncpp.com/cpp-tutorial/introduction-to-stdstring_view/)、[函数求值与运算符](https://www.learncpp.com/cpp-tutorial/operator-precedence-and-associativity/)。
