---
title: "Python 类与 nn.Module：完整笔记与易错点（10.28）"
published: 2026-10-28
description: "用 unsqueeze 准备数据、类的属性与方法、继承与 super()、nn.Module 与 nn.Parameter、__call__ 与 forward：完整笔记，末尾附易错点清单。"
tags: ["Python", "PyTorch", "学习笔记", "易错点"]
category: "Python"
---

今天的内容从一行数据准备代码，转到 Python 的类，最后落到 PyTorch 的 `nn.Module`。前半是完整笔记，后半是易错点。

## 一、完整笔记

### 1. 用 unsqueeze 准备线性回归数据

```python
weight = 0.7
bias = 0.3

start = 0
end = 1
step = 0.02

X = torch.arange(start, end, step).unsqueeze(dim=1)
y = weight * X + bias
```

- `torch.arange(0, 1, 0.02)` 生成 0 到 0.98 共 50 个数，形状 `(50,)`。
- `unsqueeze(dim=1)` 在第 1 维插入长度为 1 的维，变成列向量 `(50, 1)`。效果等价于 `.reshape(50, 1)`，更省事的写法是 `.reshape(-1, 1)`。
- `weight * X + bias` 是逐元素运算，形状仍是 `(50, 1)`。

索引：

```python
X[:10]      # 前十个样本，shape (10, 1)
X[:, 10]    # 取索引 10 的那一列（第 11 列）—— 会报 IndexError，因为第 1 维长度只有 1
```

### 2. 类与实例

```python
class Dog:
    pass
```

类名采用大写单词表示法（CapWords）。`pass` 用来占位，什么也不做。

用 `__init__` 定义每个对象必须拥有的属性：

```python
class Dog:
    def __init__(self, name, age):
        self.name = name
        self.age = age
```

- `__init__` 必须缩进在类里面。
- 第一个参数固定是 `self`，代表"正在创建的实例"。
- `self.name = name` 创建了一个名为 `name` 的属性，并把参数的值赋给它。
- 在 `__init__` 里创建的属性称为**实例属性**，每个实例各有一份。

定义在类体里、`__init__` 外面的是**类属性**，所有实例共享：

```python
class Dog:
    species = "Canis familiaris"

    def __init__(self, name, age):
        self.name = name
        self.age = age
```

现在每个 Dog 能访问三个属性：`species` 是固定的，`name`、`age` 各不相同。实例化时只传 `name` 和 `age`，因为 `self` 由 Python 自动传入。

实例化：

```python
a = Dog()
b = Dog()
a == b      # False
```

这段用的是**上面没有 `__init__` 的 Dog**；一旦定义了 `__init__(self, name, age)`，`Dog()` 就会因为缺少参数而报错。`a == b` 为 `False`，因为它们是内存里两个独立对象。

### 3. 实例方法与 `__str__`

```python
class Dog:
    species = "Canis familiaris"

    def __init__(self, name, age):
        self.name = name
        self.age = age

    def description(self):
        return f"{self.name} is {self.age} years old"

    def speak(self, sound):
        return f"{self.name} says {sound}"
```

```python
dog1 = Dog("小黄", 3)
dog1.description()      # 小黄 is 3 years old
dog1.speak("woof")      # 小黄 says woof
```

`__str__` 控制 `print` 的输出：

```python
def __str__(self):
    return f"{self.name} is {self.age} years old"
```

不定义时 `print(dog1)` 打印对象地址；定义后打印返回的字符串。

### 4. 继承

```python
class Parent:
    hair_color = "brown"

class Child(Parent):
    pass
```

- 子类继承父类的所有属性和方法，`Child.hair_color` 就是 `"brown"`，不需要重新定义。
- 子类也可以定义自己的属性、方法，或者重写父类的方法：

```python
class JackRussellTerrier(Dog):
    def speak(self, sound="Arf"):
        return f"{self.name} says {sound}"
```

这样 `dog1 = JackRussellTerrier(name, age)` 就自带默认叫声，`dog1.speak("grr")` 也能改。

- `super()` 在子类方法里访问父类：

```python
class JackRussellTerrier(Dog):
    def speak(self, sound="Arf"):
        return super().speak(sound)
```

- 父类被修改后，只要子类没有重写、实例也没有同名的实例属性遮蔽，修改会传递给子类，包括已经创建好的实例。

### 5. nn.Module 与 nn.Parameter

```python
class LinearRegressionModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.weights = nn.Parameter(torch.randn(1, dtype=torch.float), requires_grad=True)
        self.bias = nn.Parameter(torch.randn(1, dtype=torch.float), requires_grad=True)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.weights * x + self.bias
```

- 继承 `nn.Module`，PyTorch 里几乎所有模型都这么做。
- `super().__init__()` 必须调用，它建好模块的内部结构（参数、缓冲区、子模块的登记表）。
- `nn.Parameter` 把张量标记成"可训练参数"，赋值给 `self` 属性时自动注册。
- `requires_grad=True` 表示梯度下降会更新它。
- `torch.randn(1)` 的形状是 `(1,)`，就是一个标量参数；换成 `(1, 1)` 也能靠广播得到同样结果，`(1,)` 只是惯例。

### 6. `__call__` 与 `forward`

`nn.Module` 重写了 `__call__`：

```python
model = LinearRegressionModel()
model(x)            # 推荐
model.forward(x)    # 能跑，但绕过了一些机制
```

`model(x)` 内部会先做额外处理（hooks、autograd 上下文等），再调用 `forward`。直接写 `.forward(x)` 会跳过这些，在 forward hook、混合精度、分布式等场景下可能出问题。

`__call__` 里写死了调用 `self.forward(...)`，所以其他方法必须显式调用：

```python
model.predict(x, 0.5)   # 可以
model(x, 0.5)           # 报 TypeError，不会去调 predict
```

### 7. parameters 与 state_dict

```python
list(model.parameters())   # 所有可训练参数
model.state_dict()         # 名字 -> 张量的字典
```

- `parameters()` 返回参数张量的迭代器，适合交给优化器。
- `state_dict()` 返回 `OrderedDict`，键是参数名（`weights`、`bias`），适合保存和加载。

## 二、易错点

下面每条都是当时做错、或者容易想当然的地方。解释尽量写透：错在哪、为什么错、正确的认识、边界在哪。

### 1. 类属性属于类，实例属性属于实例

**易错点**：看到 `species`、`name`、`age` 都能通过 `dog1.xxx` 访问，就以为它们是一类东西。

**错在哪**：把两者的归属搞反，就会误解"改一个实例的属性会不会影响别人"。`species` 定义在 `__init__` 外面，是类属性；`name`、`age` 在 `__init__` 里用 `self.` 创建，是实例属性。

**为什么**：`__init__` 里的 `self.xxx = ...` 写进的是实例自己的 `__dict__`；类体里的赋值写进类的命名空间。

**正确认识**：定义位置决定归属。实例的 `__dict__` 里只有 `name`、`age`，`species` 是访问时去类里找的。

**边界与变体**：

```python
dog1.species = "狼"   # 给 dog1 新建实例属性，不是改类属性
Dog.species = "狼"    # 这才是改类属性
```

**怎么用**：所有实例共享的常量放类体里；每个实例不同的值放 `__init__`。

### 2. 给实例赋值不会修改类属性

**易错点**：以为 `dog1.species = "狼"` 会改掉所有狗的种类。

**错在哪**：这一行在 `dog1` 自己的 `__dict__` 里新建了 `species`，**遮蔽**（shadow）了类属性。`Dog.species` 还是 `"Canis familiaris"`，所以 `dog2.species` 不变。

**为什么**：Python 的属性查找顺序是"实例 `__dict__` → 类 → 父类"，赋值只作用于最左边的那个对象。

**正确认识**：实例赋值只影响该实例；改类属性要写 `Dog.species = ...`。

**边界与变体**：`del dog1.species` 会删掉那个实例属性，之后又读回类属性。

**怎么用**：想统一改所有实例就改类；想单独改一只就改实例。

### 3. self 是调用这个方法的实例

**易错点**：把 `self` 当成特殊关键字，或者以为方法定义时要手动传它。

**错在哪**：`def description():` 漏写 `self` 时，`dog1.description()` 会报 `TypeError: description() takes 0 positional arguments but 1 was given`。因为 `dog1.description()` 等价于 `Dog.description(dog1)`，实例被自动当成第一个参数传进去。

**为什么**：方法定义在类上，所有实例共用同一份代码；调用时 Python 把实例绑定到第一个参数，方法才知道操作哪个对象。

**正确认识**：`self` 只是第一个参数的惯例名字，指向调用者；调用时不需要手动传。

**边界与变体**：`@classmethod` 的第一个参数是类 `cls`；`@staticmethod` 不自动接收任何参数。

**怎么用**：方法用到实例属性就写 `self`；忘了写会在调用时报参数个数错误。

### 4. `__str__` 必须返回字符串

**易错点**：以为 `__str__` 里 `return 42` 会自动变成 `"42"`。

**错在哪**：`print(dog1)` 会报 `TypeError: __str__ returned non-string (type int)`。`__str__` 的返回值必须已经是 `str`。

**为什么**：`print` 直接使用 `__str__` 的返回值，不做类型转换；协议要求返回字符串。

**正确认识**：返回 `str(42)` 或 f-string。

**边界与变体**：`__repr__` 也要求返回字符串；没有 `__str__` 时 `print` 会退回 `__repr__`。

**怎么用**：`__str__` 里始终返回 f-string，最省心。

### 5. 父类的修改会传给已创建的实例

**易错点**：以为"对象创建时就把属性拷贝了一份"，所以父类后来改了，已有实例不会变。

**错在哪**：Python 的属性查找是**每次访问时**沿 MRO 向上找，不是提前拷贝。所以只要没被重写、没被实例属性遮蔽，父类后来改了，已经存在的实例也能看到新值。

```python
class Parent: color = "brown"
class Child(Parent): pass

c = Child()
Parent.color = "black"
print(c.color)   # black
```

**为什么**：实例只存自己的 `__dict__`，其余属性靠查找链在访问时解析。

**正确认识**：决定看到什么的是"访问时的查找结果"，不是"创建时的快照"。

**边界与变体**：子类重写 `Child.color = ...` 后，父类的改动不再影响子类；实例自己赋过值后，父类的改动也看不到。

**怎么用**：要固定住某个值就显式赋值；要跟随父类就保持不重写、不遮蔽。

### 6. `super().__init__()` 不能省

**易错点**：以为 `super().__init__()` 只是一句可选的样板代码。

**错在哪**：不写会直接报 `AttributeError: cannot assign parameters before Module.__init__() call`，因为 `nn.Module` 的内部登记表还没建好，`self.weights = nn.Parameter(...)` 无处登记。

**为什么**：`nn.Module.__init__` 负责创建 `_parameters`、`_buffers`、`_modules` 这些内部字典，后面所有参数注册都依赖它们。

**正确认识**：继承 `nn.Module` 时，`__init__` 的第一行必须是 `super().__init__()`。

**边界与变体**：多层继承时 `super()` 指向 MRO 中的下一个类，不一定是直接父类。

**怎么用**：复制模型模板时，先确认这一行在。

### 7. `nn.Parameter` 是注册机制，普通 tensor 不算参数

**易错点**：以为随便写 `self.x = torch.randn(1)` 就会被当成模型参数。

**错在哪**：普通 tensor 赋给属性只是普通属性，`list(model.parameters())` 里没有它，优化器也不会更新它。

**为什么**：`nn.Parameter` 是 `Tensor` 的子类，被赋值给模块属性时，`nn.Module.__setattr__` 会把它登记进 `_parameters`；普通 tensor 不会触发登记。

**正确认识**：要训练的量必须包成 `nn.Parameter`；`requires_grad=True` 决定是否计算梯度。

**边界与变体**：`register_buffer` 用于不需要梯度的状态（例如 BatchNorm 的 running stats）；`Parameter` 默认 `requires_grad=True`。

**怎么用**：建完模型用 `print(list(model.parameters()))` 确认参数个数和形状。

### 8. weights 写 `(1,)` 还是 `(1, 1)` 都能用

**易错点**：以为 `torch.randn(1)` 是"少写了一个维度"，会导致形状不匹配。

**错在哪**：`(1,)` 和 `(1, 1)` 与 `(50, 1)` 的 `x` 相乘，广播后**都能**得到 `(50, 1)`，不存在维度不匹配。

**为什么**：广播从最后一维对齐：`(1,)` 视作 `(1, 1)` 参与计算；`(1, 1)` 与 `(50, 1)` 逐元素相乘，结果 `(50, 1)`。

**正确认识**：`(1,)` 表示"一个标量参数"，是线性回归的惯例；`(1, 1)` 也能跑。

**边界与变体**：如果输入是多个特征 `(50, 3)`，权重就要写 `(3, 1)` 或 `(3,)`，结果才是 `(50, 1)`。

**怎么用**：单特征单输出用 `(1,)`；多特征时形状跟着特征数走。

### 9. `model(x)` 与 `model.forward(x)`：结果一样，过程不同

**易错点**：以为两种写法结果不同，或者以为 `.forward()` 才是标准调用方式。

**错在哪**：两者**返回结果相同**，但 `model(x)` 会先执行 `nn.Module.__call__` 里的额外逻辑（hooks、autocast 等），再调用 `forward`。直接 `.forward(x)` 绕过这些，在 forward hook、混合精度、分布式场景可能出问题。

**为什么**：`nn.Module` 重写了 `__call__`，把"调用模型"定义成一整套流程；`forward` 只是其中的计算部分。

**正确认识**：永远写 `model(x)`；`__call__` 只调用 `forward`，其他方法要显式调用。

**边界与变体**：`model(x, 0.5)` 不会去调 `predict`，而是报 `TypeError: forward() takes 2 positional arguments but 3 were given`；`model.predict(x, 0.5)` 才可以。

**怎么用**：模型调用统一用 `model(...)`；要调别的自定义方法，直接点名。

### 10. `parameters()` 与 `state_dict()` 不是一回事

**易错点**：以为两者可以随便替换。

**错在哪**：`parameters()` 只给**参数张量**，没有名字，适合交给优化器；`state_dict()` 给的是**名字 → 张量**的 `OrderedDict`，适合保存和加载。混淆了就会在需要键名的时候拿到一个迭代器。

**为什么**：一个是迭代器，一个是映射；用途不同。

**正确认识**：训练时用 `parameters()`，存盘时用 `state_dict()`。

**边界与变体**：`state_dict()` 里还包括 buffer（不需要梯度的状态），不只是参数。

**怎么用**：`torch.optim.SGD(model.parameters(), lr=...)`；保存用 `torch.save(model.state_dict(), path)`。

## 三、速查

| 想做的事 | 写法 |
| --- | --- |
| 变成列向量 | `x.unsqueeze(1)` / `x.reshape(-1, 1)` |
| 所有实例共享的值 | 写在类体里（类属性） |
| 每个实例自己的值 | 在 `__init__` 里 `self.x = ...` |
| 打印对象 | 定义 `__str__`，返回字符串 |
| 调用父类方法 | `super().method(...)` |
| 模型初始化 | `super().__init__()` + `nn.Parameter` |
| 调用模型 | `model(x)` |
| 交给优化器 | `model.parameters()` |
| 保存模型 | `model.state_dict()` |

## 参考

- [Python 官方教程：类](https://docs.python.org/zh-cn/3/tutorial/classes.html)
- [PyTorch nn.Module](https://pytorch.org/docs/stable/generated/torch.nn.Module.html)
