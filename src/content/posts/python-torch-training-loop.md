---
title: "PyTorch 训练循环与推理模式：完整笔记与易错点（10.29）"
published: 2026-10-29
description: "整理 10.29 的 PyTorch 训练与推理笔记：nn.Module / nn.Parameter、训练循环、train/eval、inference_mode、loss 记录和 state_dict，并拆解 6 个容易错的地方。"
tags: ["Python", "PyTorch", "训练循环", "学习笔记", "易错点"]
category: "Python"
---

今天把 PyTorch 的训练流程串了一遍：模型怎么搭、怎么训练、怎么推理、怎么保存。前半部分是完整笔记，后半部分是这次真正容易错的点。

## 一、完整笔记

### 1. nn.Module 和 nn.Parameter 的分工

`nn.Module` 是层和模型的基类，负责管理子模块、参数、`train/eval` 状态和 `state_dict`。`nn.Parameter` 是一个 `Tensor` 子类，默认 `requires_grad=True`；把它赋给模块属性时，它会自动注册到 `model.parameters()` 里。

| 概念 | 作用 | 是否会被优化器更新 |
| --- | --- | --- |
| `nn.Module` | 层/模型的基类，管理子模块、参数和状态 | 本身不是参数 |
| `nn.Parameter` | `Tensor` 子类，默认需要梯度；赋给模块属性时自动注册 | 会 |
| `nn.Linear` | 内置模块，内部包含 weight 和 bias 两个 `Parameter` | 会 |

最小例子：

```python
import torch
from torch import nn

class LinearRegressionModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.weights = nn.Parameter(torch.randn(1))
        self.bias = nn.Parameter(torch.randn(1))

    def forward(self, x):
        return self.weights * x + self.bias
```

关键在 `nn.Module.__setattr__`：它检测到赋进来的是 `nn.Parameter`，就把它注册进参数表。如果直接赋一个普通 tensor：

```python
self.weights = torch.randn(1)  # 只是普通属性，optimizer 看不到
```

`model.parameters()` 会递归收集所有子模块和当前模块里的 `Parameter`，优化器就是从这里拿到要更新的张量。

### 2. 用 torch.inference_mode() 做推理

```python
with torch.inference_mode():
    y_preds = model_0(X_test)
```

推理不需要梯度。`torch.inference_mode()` 会关闭 autograd 的追踪，减少内存占用和计算开销。

正常的前向传播会把每个运算记录进计算图，中间结果（激活值）也会保存下来，以备将来 `backward()` 使用。推理不调用 `backward()`，这些记录都是多余的。

`inference_mode` 比 `no_grad` 更强：它不仅关闭梯度追踪，还会关闭 version counter，并且里面创建的 tensor 之后不能再参与 autograd。纯推理用它；如果输出还要继续求导，用 `no_grad`。

### 3. state_dict：只保存参数，不保存结构

```python
torch.save(model.state_dict(), "model.pth")
```

`state_dict` 是一个字典，保存的是参数和 buffer，不包含类的定义。所以加载前必须先实例化同一个类，再把字典装进去。保存/加载的完整流程放在第 10 节。

### 4. 训练循环的五步

```python
for epoch in range(epochs):
    model_0.train()

    # 1. 前向传播
    y_pred = model_0(X_train)
    # 2. 计算损失
    loss = loss_fn(y_pred, y_train)
    # 3. 清空上一轮梯度
    optimizer.zero_grad()
    # 4. 反向传播，计算梯度
    loss.backward()
    # 5. 用梯度更新参数
    optimizer.step()

    model_0.eval()
    with torch.inference_mode():
        test_pred = model_0(X_test)
        test_loss = loss_fn(test_pred, y_test.type(torch.float))

    if epoch % 10 == 0:
        epoch_count.append(epoch)
        train_loss_values.append(loss.detach().numpy())
        test_loss_values.append(test_loss.detach().numpy())
        print(f"Epoch: {epoch} | MAE Train Loss: {loss} | MAE Test Loss: {test_loss}")
```

五步的职责：

| 步骤 | 做什么 |
| --- | --- |
| `y_pred = model(x)` | 前向传播，算预测值 |
| `loss = loss_fn(y_pred, y)` | 计算预测和真实值的误差 |
| `optimizer.zero_grad()` | 清掉上一轮留下的梯度 |
| `loss.backward()` | 反向传播，把梯度写进每个参数的 `.grad` |
| `optimizer.step()` | 根据 `.grad` 更新参数 |

`zero_grad()` 放在 `backward()` 之前即可。放在 `backward()` 之后、`step()` 之前，会把刚算出来的梯度清掉，`step()` 就没有梯度可用。

### 5. train() 和 eval() 管什么

`model.train()` 和 `model.eval()` 改变的是模块的 `training` 标志，影响 dropout、batchnorm 等层的行为。它们不改变参数值，也不关闭梯度。

| 操作 | 改变什么 | 不改变什么 |
| --- | --- | --- |
| `model.train()` | dropout 开启；batchnorm 使用当前 batch 的统计量 | 参数值、梯度 |
| `model.eval()` | dropout 关闭；batchnorm 使用 running 统计量 | 参数值、梯度 |
| `torch.inference_mode()` | 关闭 autograd 和 version counter | 参数值、dropout 行为 |

很多初学者以为 `eval()` 会关闭梯度，所以推理时只写 `eval()`。实际上还要配合 `inference_mode()` 或 `no_grad()`，才能真正省掉 autograd 的开销。

### 6. 为什么推理时不需要 autograd

前向传播的每个运算都会被记录进 autograd 计算图，中间结果会被保存下来，以备 `backward()` 使用。测试时不做反向传播，这些记录是多余的。

不用 `inference_mode` 也能跑，只是测试数据的前向也会建图，多占一些内存。因为测试 loss 不做 `backward`，这张图最后会被释放，但它在前向期间仍然占着内存。

注意：`model.eval()` 不会关掉 autograd，它只切换层的行为。

### 7. dtype 要匹配

```python
test_loss = loss_fn(test_pred, y_test.type(torch.float))
```

损失函数通常要求预测和目标的 dtype 兼容。`test_pred` 的 dtype 由模型参数和输入决定，默认是 `float32`；`y_test` 如果本来也是 `float32`，就不需要转换。需要转时用：

```python
y_test.float()
# 或
y_test.to(torch.float32)
```

`.type(torch.float)` 是旧写法，能用，但现代代码更常用 `.float()`。

分类任务的 target 通常是 `long`（`CrossEntropyLoss` 需要），回归任务的 target 是浮点。不要把两者混在一起。

### 8. 记录 loss：detach、numpy、item

```python
train_loss_values.append(loss.detach().numpy())
test_loss_values.append(test_loss.detach().numpy())
```

`loss` 是带梯度的张量。直接 `loss.numpy()` 会报 `RuntimeError`；在 GPU 上，`loss.detach().numpy()` 还会报 `TypeError`，因为 numpy 只接受 CPU 张量。安全写法是：

```python
loss.detach().cpu().numpy()
# 单个元素也可以直接
loss.item()
```

为什么要 `detach()`：把带梯度的 `loss` 存进列表，会一直引用计算图和中间激活值，内存不释放。`detach()` 切断计算图，只保留数值，图就可以释放。

`.item()` 适合单个元素，返回 Python 标量；`detach().cpu().numpy()` 适合需要数组的情况。

### 9. 推理的三个检查项

用 PyTorch 模型做预测时，记住三件事：

1. 把模型切换到评估模式：`model.eval()`；
2. 用推理模式包住前向：`with torch.inference_mode():`；
3. 数据和模型放在同一个设备上（都在 CPU，或都在同一块 GPU）。

```python
model.eval()
with torch.inference_mode():
    y_preds = model(X_test)
```

如果模型在 GPU、数据在 CPU，会报 device mismatch。推理前先确认两者在同一设备。

### 10. 保存和加载

```python
# 保存
torch.save(model.state_dict(), "model.pth")

# 加载
model = TheModelClass(*args, **kwargs)
model.load_state_dict(torch.load("model.pth", map_location="cpu"))
model.eval()
```

`state_dict` 只保存参数，不保存模型结构，所以加载前要先实例化同一个类。`map_location` 用来处理保存和加载设备不同的情况。加载后调用 `eval()`，因为保存时的模型可能还处在训练模式。

如果只需要跨设备加载，`map_location` 也可以写成 `"cuda"` 或具体的设备号。

## 二、易错点

### `optimizer.step()` 更新参数，不是梯度

**易错点**：以为 `backward()` 算完梯度后，`step()` 更新的是梯度。

```python
loss.backward()
print(param.grad)   # -4.1866
print(param)        # 0.3591

optimizer.step()
print(param.grad)   # -4.1866，没变
print(param)        # 0.7777，变了
```

**错在哪**：如果 `step()` 更新的是梯度，参数就永远不变，训练根本不会发生。反过来，`zero_grad()` 之后梯度会被清空，`step()` 就更没有东西可更新了。

**为什么**：`backward()` 计算的是损失对每个参数的偏导，结果写进 `param.grad`；`optimizer.step()` 读取这个 `.grad`，按优化器的规则更新 `param`。以 SGD 为例，更新式是 `param = param - lr * param.grad`。`zero_grad()` 负责把 `.grad` 清零，现代 PyTorch 默认还会把它设成 `None`。

**正确认识**：三句话分工——`backward()` 算梯度，`step()` 改参数，`zero_grad()` 清梯度。

**边界与变体**：如果要做梯度累积，可以连续多次 `backward()` 再 `step()`，这时不能每次都 `zero_grad()`。反过来，如果把 `zero_grad()` 放在 `backward()` 之后、`step()` 之前，刚算出来的梯度会被清掉，`step()` 会让参数原地不动。

**怎么用**：训练循环固定按「forward → loss → zero_grad → backward → step」写；看到 loss 不下降，先检查是不是 `step()` 和 `zero_grad()` 的顺序出了问题。

### `model.eval()` 不等于关闭梯度

**易错点**：推理时调用 `model.eval()`，就以为 autograd 已经关掉了。

```python
model.eval()
y = model(x)
print(y.requires_grad)   # True（参数需要梯度时）

with torch.inference_mode():
    y2 = model(x)
print(y2.requires_grad)  # False
```

**错在哪**：只调用 `eval()` 时，前向传播仍然会建计算图，中间激活值仍然会被保存，只是 dropout、batchnorm 的行为变了。推理数据量大时，这会白白多占内存；如果误对 `y` 调用了 `backward()`，还会真的算梯度。

**为什么**：`train()` / `eval()` 只修改模块的 `self.training` 标志。dropout 和 batchnorm 在读这个标志决定自己的行为，但 autograd 是否追踪由全局的 grad mode 控制，和 `self.training` 是两套机制。

**正确认识**：`eval()` 管“层的行为”，`inference_mode()` / `no_grad()` 管“要不要梯度”。推理时两者都要。

**边界与变体**：`inference_mode()` 比 `no_grad()` 更强，里面创建的 tensor 不能再参与 autograd；如果输出后面还要继续求导，用 `no_grad()`。另外，`eval()` 不会改变 `requires_grad`，参数的 `requires_grad` 仍然是 `True`。

**怎么用**：把推理固定写成三步——`model.eval()`、`with torch.inference_mode():`、确认数据和模型在同一设备。

### `loss.numpy()` 之前要先 detach 并移到 CPU

**易错点**：把 `loss` 当成普通 Python 数字，直接调用 `.numpy()`。

```python
loss.numpy()
# RuntimeError: Can't call numpy() on Tensor that requires grad.

loss.detach().numpy()        # CPU 上可以
loss.detach().cpu().numpy()  # GPU/CPU 都安全
loss.item()                  # 单个元素最方便
```

**错在哪**：numpy 不能直接处理“需要梯度”的张量，也不能直接处理 CUDA 张量。直接存带梯度的 `loss` 还会让计算图和中间激活值一直被引用，内存不释放。

**为什么**：`Tensor.numpy()` 要求张量不需要梯度、并且位于 CPU。`detach()` 返回一个共享存储但切断计算图的新张量；`.cpu()` 把数据从 GPU 复制到主机内存。

**正确认识**：记录标量用 `loss.item()`；记录数组用 `loss.detach().cpu().numpy()`。不要直接 `loss.numpy()`，也不要只 `detach()` 不 `cpu()`。

**边界与变体**：`item()` 要求元素个数正好 1 个，多元素张量会报错；这时用 `detach().cpu().numpy()`。`detach()` 不复制数据，只是不再带 `grad_fn`，所以它不会释放底层存储，但会释放对计算图的引用。

**怎么用**：训练日志里统一用 `.item()`；需要把整批张量存成 numpy 时，统一用 `.detach().cpu().numpy()`。

### `nn.Parameter` 赋给模块属性才会被优化器看到

**易错点**：以为只要把 tensor 放进模型里，优化器就能更新它。

```python
class BadModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.w = torch.randn(1)          # 普通 tensor

list(BadModel().parameters())             # []
```

**错在哪**：普通 tensor 不会出现在 `model.parameters()` 里，`optimizer` 拿不到它，自然也不会更新。训练时 loss 可能下降，但那是别的参数在动，这个 `self.w` 一直停在初始值。

**为什么**：`nn.Module.__setattr__` 会检查赋进来的对象。如果是 `nn.Parameter`，就把它注册进参数表；如果是普通 `Tensor`，只当成普通属性。`nn.Linear` 内部的 weight 和 bias 之所以能被优化，就是因为它们是 `nn.Parameter`。

**正确认识**：需要学习的张量用 `nn.Parameter`；不需要学习、但要跟着模型保存的状态（例如 batchnorm 的 running stats）用 `register_buffer`。

**边界与变体**：`nn.Parameter(..., requires_grad=False)` 仍然会被注册，但不会参与梯度更新；`register_buffer` 会进 `state_dict`，但不会进 `parameters()`，所以优化器不会更新它。

**怎么用**：自定义层时，权重、偏置用 `nn.Parameter`；统计量、常量用 `register_buffer`；写完打印一次 `list(model.parameters())` 确认没有漏。

### `state_dict` 只保存参数，不保存模型结构

**易错点**：以为 `torch.save(model.state_dict(), ...)` 保存了整个模型，加载时不用再定义类。

```python
# 保存
torch.save(model.state_dict(), "model.pth")

# 加载：必须先有同一个类
model = TheModelClass(*args, **kwargs)
model.load_state_dict(torch.load("model.pth", map_location="cpu"))
model.eval()
```

**错在哪**：`state_dict` 只是一个从参数名到张量的字典，不包含类的定义、`forward()` 的代码，也不包含你新增的方法。加载时如果类结构不一致，会出现 missing keys 或 unexpected keys；如果根本不实例化模型，就没有对象可以接收这些参数。

**为什么**：PyTorch 把“模型结构”和“模型参数”分开保存。结构由 Python 类定义，参数由 `state_dict` 保存。这样同一个类可以用不同的参数文件，也更安全。

**正确认识**：保存 `state_dict`；加载前实例化同一个类；`load_state_dict`；最后 `eval()`。

**边界与变体**：保存和加载设备不同时，用 `map_location`；只加载部分参数时可以用 `strict=False`，但要自己确认缺了哪些 key；不要把一个模型的 `state_dict` 硬塞进结构不同的另一个模型。

**怎么用**：把保存/加载写成固定模板，和模型类放在一起；加载后先打印 `model.state_dict().keys()` 对一遍。

### dtype 不一致时，先看预测和目标的类型

**易错点**：看到 `test_pred` 是 `float`，就无条件把 `y_test` 转成 `float`。

```python
print(test_pred.dtype, y_test.dtype)
# torch.float32 torch.float32 -> 不用转
# torch.float32 torch.int64   -> 需要转
```

**错在哪**：无条件转换可能掩盖真正的问题。如果 `y_test` 是分类标签（`long`），把它转成 `float` 再送进 `CrossEntropyLoss`，反而会报错；如果两个 dtype 本来一致，转换是多余的。另外，`.type(torch.float)` 是旧写法，不如 `.float()` 直观。

**为什么**：损失函数内部要做逐元素运算，预测和目标的 dtype 必须兼容。模型输出 dtype 跟随参数和输入，默认是 `float32`；回归目标通常也是 `float32`，分类目标则通常是 `long`。

**正确认识**：先打印两个 dtype，再决定转谁。回归任务用 `.float()`；分类任务保持 `long`。不要凭“预测是 float”就机械转换。

**边界与变体**：`CrossEntropyLoss` 要求 target 是 `long` 且形状通常是 `(N,)`；`MSELoss` / `L1Loss` 要求浮点 target。混合精度训练时，dtype 还会受 autocast 影响，转换前先看当前上下文。

**怎么用**：遇到 dtype 报错，第一行先 `print(pred.dtype, target.dtype)`；确认谁是 `long`、谁是 `float`，再做针对性转换。

## 速查表

| 想做的事 | 写法 |
| --- | --- |
| 切换训练/评估模式 | `model.train()` / `model.eval()` |
| 推理时不建计算图 | `with torch.inference_mode():` |
| 清空上一轮梯度 | `optimizer.zero_grad()` |
| 反向传播算梯度 | `loss.backward()` |
| 用梯度更新参数 | `optimizer.step()` |
| 取单个 loss 数值 | `loss.item()` |
| 保存/加载参数 | `torch.save(model.state_dict(), path)` / `model.load_state_dict(torch.load(path))` |

## 参考

- [PyTorch 官方教程：优化模型参数](https://pytorch.org/tutorials/beginner/basics/optimization_tutorial.html)
- [PyTorch Docs: torch.inference_mode](https://pytorch.org/docs/stable/generated/torch.inference_mode.html)
- [PyTorch 官方教程：保存和加载模型](https://pytorch.org/tutorials/beginner/saving_loading_models.html)

---

下一篇：[PyTorch 线性回归实战：完整笔记与易错点（10.29）](../python-linear-regression-practice/)
