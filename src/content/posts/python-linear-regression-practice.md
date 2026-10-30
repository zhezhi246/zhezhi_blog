---
title: "PyTorch 线性回归实战：完整笔记与易错点（10.29）"
published: 2026-10-29
description: "用 study.py 串起 PyTorch 线性回归的完整流程——造数据、80/20 划分、nn.Linear、训练/验证循环、device 与画图，并拆解 6 个初学者容易犯的错误。"
tags: ["Python", "PyTorch", "线性回归", "学习笔记", "易错点"]
category: "Python"
---

这篇用 `study.py` 把上一篇的训练循环落到一个线性回归例子上：从 `y = 0.3x + 0.9` 造数据，按 80/20 切分，训练一个 `nn.Linear(1, 1)`，最后画 loss 和预测。完整笔记按代码顺序展开，后半只保留 6 个初学者容易犯、值得改的错点。上一篇是 [PyTorch 训练循环与推理模式](../python-torch-training-loop/)。

## 一、完整笔记

### 1. 造数据：把一维 x 变成 (N, 1)

```python
def create_data(weight, bias):
    x = torch.arange(0., 100)          # (100,), float32
    y = weight * x + bias              # (100,)
    return x.unsqueeze(dim=1), y.unsqueeze(dim=1)
```

`torch.arange(0., 100)` 生成 0 到 99 的 `float32` 张量。`unsqueeze(dim=1)` 在最后加一维，把 `(100,)` 变成 `(100, 1)`。

`nn.Linear(1, 1)` 要求输入的最后一维等于 `in_features`，前面的维度都当 batch。直接送 `(100,)` 会把它当成 100 个特征，报形状不匹配；`(100, 1)` 才是「100 个样本，每个 1 个特征」。

### 2. 划分数据：80/20

```python
def split_data(x, y):
    split_num = int(len(x) * 0.8)
    train_x, train_y = x[:split_num], y[:split_num]
    val_x, val_y = x[split_num:], y[split_num:]
    return train_x, train_y, val_x, val_y
```

`len(x)` 是 100，`split_num` 是 80。这里按顺序切分，验证集是 x=80..99 的尾部。

### 3. 模型：一个线性层

```python
class LinearModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.linear_layer = nn.Linear(in_features=1, out_features=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.linear_layer(x)
```

`super().__init__()` 必须调用，否则 `nn.Module` 的内部结构没有建好，后面注册参数会出问题。`forward` 定义计算；调用时用 `model(x)`，不要直接 `model.forward(x)`，后面易错点会讲原因。

### 4. 训练 + 验证：step 之后统一评估

```python
def train_one_epoch(model, loss_fn, optimizer, train_x, train_y, val_x, val_y):
    model.train()
    y_pred = model(train_x)
    loss = loss_fn(y_pred, train_y)

    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

    model.eval()
    with torch.inference_mode():
        train_eval_loss = loss_fn(model(train_x), train_y)
        val_eval_loss = loss_fn(model(val_x), val_y)

    return train_eval_loss, val_eval_loss
```

训练部分和上一篇的五步一样：forward → loss → zero_grad → backward → step。step 之后，把模型切到 `eval()`，用**同一个模型状态**分别算训练集和验证集的 loss。这样两个数才可以直接比较。

验证 loss 放在 `inference_mode()` 里，避免为验证数据建计算图。

### 5. 优化器与 device

```python
device = "cuda" if torch.cuda.is_available() else "cpu"

model = LinearModel().to(device)
train_x, train_y = train_x.to(device), train_y.to(device)
val_x, val_y = val_x.to(device), val_y.to(device)

optimizer = torch.optim.SGD(params=model.parameters(), lr=0.001)
loss_fn = nn.L1Loss()
```

模型和数据必须在同一个设备上。`model.parameters()` 返回模型里所有需要更新的参数，直接交给优化器。

`lr=0.001` 对没有归一化的 x（0..99）偏大，训练时参数可能在最优点两侧来回跳。这个现象和修法放在易错点 4 里讲。

### 6. 训练循环与记录

```python
train_losses, val_losses, epoch_record = [], [], []

for epoch in range(1000):
    train_eval_loss, val_eval_loss = train_one_epoch(
        model, loss_fn, optimizer,
        train_x, train_y, val_x, val_y,
    )

    if epoch % 100 == 0:
        epoch_record.append(epoch)
        train_losses.append(train_eval_loss.item())
        val_losses.append(val_eval_loss.item())
        print(f"{epoch} | train {train_eval_loss.item():.4f} | val {val_eval_loss.item():.4f}")
```

用 `.item()` 把标量取成 Python 数字再存进列表。直接把带梯度的 tensor 存进列表，会一直引用计算图和中间激活值，内存不会释放。

### 7. 画 loss

```python
plt.figure(figsize=(14, 7))
plt.plot(epoch_record, train_losses, label="train loss", marker="o")
plt.plot(epoch_record, val_losses, label="val loss", marker="o")
plt.legend()
plt.show()
```

两条曲线都来自 step 之后的评估，才可以直接比较。

### 8. 预测与散点图

```python
model.eval()
with torch.inference_mode():
    prediction = model(val_x).detach().cpu()

train_x_cpu = train_x.detach().cpu()
train_y_cpu = train_y.detach().cpu()
val_x_cpu = val_x.detach().cpu()
val_y_cpu = val_y.detach().cpu()

plt.figure(figsize=(14, 7))
plt.scatter(train_x_cpu.squeeze(1), train_y_cpu.squeeze(1), s=4, label="train")
plt.scatter(val_x_cpu.squeeze(1), val_y_cpu.squeeze(1), s=4, label="val")
plt.scatter(val_x_cpu.squeeze(1), prediction.squeeze(1), s=4, label="prediction")
plt.legend()
plt.show()
```

画图前把 tensor 搬回 CPU，并用 `squeeze(1)` 把 `(N, 1)` 变成 `(N,)`，matplotlib 处理起来更直接。

### 9. 写代码时容易忽略的细节（study.py 底部清单）

这些是写 `study.py` 时在文件末尾记下的注意点，按代码顺序整理，顺便把几处说法修正一下：

1. **`arange` 出来是一维，`nn.Linear` 要的是最后一维等于 `in_features`。** `x = torch.arange(0., 100)` 是 `(100,)`；`x.unsqueeze(1)` 变成 `(100, 1)`，表示 100 个样本、每个 1 个特征。`nn.Linear(1, 1)` 内部做的是 `x @ W.T + b`（仿射变换），不是单纯的矩阵乘法。
2. **`nn.Module` 的拼写和类名规范。** `nn.Module` 是类，`nn.modules.module` 是模块对象；`nn.Module == nn.modules.module` 是 `False`，`nn.Module == nn.modules.module.Module` 才是 `True`。类名按 PEP 8 用 `LinearModel`，不要写 `linear_model`。`__init__(self)`、`super().__init__()`、`nn.Linear` 的大小写都别写错；`forward(self, x: torch.Tensor) -> torch.Tensor` 的类型标注不是必须的，但 IDE 会给提示。
3. **训练五步的顺序。** `forward → loss → zero_grad → backward → step`。`zero_grad()` 放在 `backward()` 前；放到 `backward()` 后、`step()` 前会把刚算的梯度清掉。
4. **`train()` / `eval()` / `inference_mode()` 各管什么。** `train()` 和 `eval()` 只切换 dropout、batchnorm 等层的行为，不管梯度；推理时还要加 `with torch.inference_mode():`。`eval()` 不是「关闭训练相关的参数」，参数和 `requires_grad` 都不变。
5. **device 要统一，画图前搬回 CPU。** 模型、`train_x`、`train_y`、`val_x`、`val_y` 放在同一个 device；`plt` 和 numpy 只能处理 CPU 数据，画图前 `.detach().cpu()`。
6. **及时 `detach()`。** 记录 loss、转 numpy、存进列表之前，先 `.detach()` 切断计算图；否则计算图和中间激活值会一直被引用，内存不释放。
7. **`.item()` 取标量。** 它只适用于元素个数为 1 的张量（`numel() == 1`），返回 Python 数字，并且会隐式 detach、把值取到 CPU；效果上等同于 `detach().cpu().item()`。
8. **模型也要 `.to(device)`。** 只把数据搬到 GPU、模型还在 CPU，会报 device mismatch；模型和数据必须在同一设备。
9. **用列表 + `append()` 记录训练过程。** 每个 epoch 记录 `epoch`、训练 loss、验证 loss；存 `.item()` 后的标量，不要存带梯度的 tensor。
10. **优化器写法。** 优化器来自 `torch.optim`，写成 `torch.optim.SGD(params=model.parameters(), lr=1e-3)`；`params` 接收 `model.parameters()` 这个生成器，`lr` 必填。`params=` 可以省略，但写上更清楚。

## 二、易错点

### `optimizer.step()` 更新参数，不是梯度

**易错点**：以为 `loss.backward()` 算完梯度后，`optimizer.step()` 更新的是梯度。

```python
loss.backward()
print(model.linear_layer.weight.grad)   # 有值，例如 -4.1866
optimizer.step()
print(model.linear_layer.weight.grad)   # 还是 -4.1866
print(model.linear_layer.weight)        # 变了
```

**错在哪**：如果 `step()` 更新的是梯度，参数就永远不变，训练不会发生。反过来，如果在 `backward()` 之后、`step()` 之前调用 `zero_grad()`，刚算出来的梯度会被清掉，`step()` 就没有东西可用。

**为什么**：`backward()` 计算损失对每个参数的偏导，结果写进 `param.grad`；`optimizer.step()` 读取这个 `.grad`，按优化器的规则更新 `param`。以 SGD 为例，更新式是 `param = param - lr * param.grad`。`zero_grad()` 负责把 `.grad` 清零，现代 PyTorch 默认还会把它设成 `None`。

**正确认识**：`backward()` 算梯度，`step()` 改参数，`zero_grad()` 清梯度。

**边界与变体**：如果要做梯度累积，可以连续多次 `backward()` 再 `step()`，这时不能每次都 `zero_grad()`。如果只想更新部分参数，可以把那些参数单独传给优化器；没传进去的参数，`step()` 不会动。

**怎么用**：训练循环固定写成「forward → loss → zero_grad → backward → step」。看到 loss 不下降，先检查 `zero_grad()` 和 `step()` 的顺序。

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

**错在哪**：只调用 `eval()` 时，前向传播仍然会建计算图，中间激活值仍然会被保存，只是 dropout、batchnorm 的行为变了。推理数据量大时，这会白白多占内存；如果误对 `y` 调用 `backward()`，还会真的算梯度。

**为什么**：`train()` / `eval()` 只修改模块的 `self.training` 标志。dropout 和 batchnorm 读这个标志决定自己的行为，但 autograd 是否追踪由全局的 grad mode 控制，和 `self.training` 是两套机制。

**正确认识**：`eval()` 管「层的行为」，`inference_mode()` / `no_grad()` 管「要不要梯度」。推理时两者都要。

**边界与变体**：`inference_mode()` 比 `no_grad()` 更强，里面创建的 tensor 不能再参与 autograd；如果输出后面还要继续求导，用 `no_grad()`。另外，`eval()` 不会改变 `requires_grad`，参数的 `requires_grad` 仍然是 `True`。

**怎么用**：把推理固定写成三步——`model.eval()`、`with torch.inference_mode():`、确认数据和模型在同一设备。

### dtype 不一致时，先看预测和目标的类型

**易错点**：看到预测是 `float`，就无条件把目标也转成 `float`。

```python
print(y_pred.dtype, train_y.dtype)
# torch.float32 torch.float32 -> 不用转
# torch.float32 torch.int64   -> 需要转
```

**错在哪**：无条件转换可能掩盖真正的问题。如果目标是分类标签（`long`），把它转成 `float` 再送进 `CrossEntropyLoss`，反而会报错；如果两个 dtype 本来一致，转换是多余的。另外，`.type(torch.float)` 是旧写法，不如 `.float()` 直观。

**为什么**：损失函数内部要做逐元素运算，预测和目标的 dtype 必须兼容。模型输出 dtype 跟随参数和输入，默认是 `float32`；回归目标通常也是 `float32`，分类目标则通常是 `long`。

**正确认识**：先打印两个 dtype，再决定转谁。回归任务用 `.float()`；分类任务保持 `long`。

**边界与变体**：`CrossEntropyLoss` 要求 target 是 `long` 且形状通常是 `(N,)`；`MSELoss` / `L1Loss` 要求浮点 target。混合精度训练时，dtype 还会受 autocast 影响，转换前先看当前上下文。

**怎么用**：遇到 dtype 报错，第一行先 `print(pred.dtype, target.dtype)`；确认谁是 `long`、谁是 `float`，再做针对性转换。

### 训练 loss 和验证 loss 必须来自同一个模型状态

**易错点**：把 `step()` 之前算的训练 loss 和 `step()` 之后算的验证 loss 直接放在一起比较。

```python
model.train()
y_pred = model(train_x)
loss = loss_fn(y_pred, train_y)
optimizer.zero_grad()
loss.backward()
optimizer.step()

model.eval()
with torch.inference_mode():
    y_test = model(val_x)
loss_test = loss_fn(y_test, val_y)   # 这是 step 之后的模型
# loss 是 step 之前的模型，两者不是同一个状态
```

**错在哪**：一次 `optimizer.step()` 就会改变所有参数。`loss` 描述的是更新前的模型，`loss_test` 描述的是更新后的模型。把它们画在同一张图上，看起来像「训练很好、验证突然很差」，其实只是两个不同的模型。

实际跑这段代码时，参数在最优解两侧来回跳：

```text
985  w=0.2976  train=1.4106  val=0.2732
986  w=0.3371  train=0.1514  val=3.2631
987  w=0.2976  train=1.4117  val=0.2709
```

第 986 行的 `train=0.1514` 是在上一个状态 `w=0.2976` 上算的，`val=3.2631` 是在新状态 `w=0.3371` 上算的。两个数根本不能直接比较。

这里的抖动还有一个放大因素：`x` 没有归一化，范围是 0..99，`lr=0.001` 偏大，SGD 每一步会冲过最优点。归一化 `x`（例如 `x = x / 100`）或降低学习率（例如 `lr=1e-4`）之后，参数会平稳很多。

**为什么**：loss 是参数状态的函数。参数变了，loss 就变了；只有在同一个参数状态下算出来的训练 loss 和验证 loss，才能用来判断「模型在训练集和验证集上差多少」。

**正确认识**：先 `step()`，再用同一个模型状态分别算训练集和验证集的 loss。训练 loss 也用 step 之后的版本，不要用 step 之前的。

**边界与变体**：如果确实想记录 step 之前的训练 loss，就不要把它和 step 之后的验证 loss 放在同一张图里；要么统一到 step 之后，要么在图上明确标注「pre-step / post-step」。另外，验证集按顺序取尾部时，验证 loss 本身会包含外推误差，这属于数据划分的问题，和这里的「状态不同步」是两件事。

**怎么用**：把评估写成一个独立函数，在 `optimizer.step()` 之后调用；训练和验证都用它，保证两边看到的是同一个模型。

### `model.forward(...)` 改成 `model(...)`

**易错点**：以为 `model.forward(x)` 和 `model(x)` 完全等价。

```python
pred = model(val_x)          # 推荐
pred = model.forward(val_x)  # 能跑，但绕过了 __call__
```

**错在哪**：`nn.Module` 重写了 `__call__`。直接调用 `forward()` 会跳过 `__call__` 里的预处理和后处理，包括 forward hook、backward hook 等。简单脚本里结果看起来一样，但用到 hook、混合精度、分布式训练或调试工具时，行为可能和预期不同。

**为什么**：`nn.Module.__call__` 实际调用 `_call_impl`，后者负责运行注册的 hook，再调用 `forward()`。`forward()` 只是网络定义本身。

**正确认识**：对外一律用 `model(x)`；只有明确想绕过 hook 时，才直接调用 `.forward()`。

**边界与变体**：`model(x)` 只会把参数传给 `forward`。如果自定义方法需要额外参数，必须显式调用，例如 `model.predict(x, threshold)`；`model(x, threshold)` 会因为 `forward` 只接受一个参数而报 `TypeError`。

**怎么用**：在代码里搜索 `.forward(`，把模型调用统一换成 `model(...)`；自定义方法保留显式调用。

### 验证 loss 要放进 `inference_mode` 上下文

**易错点**：`y_test` 已经在 `inference_mode` 里算出来了，就把 loss 放到上下文外面算。

```python
with torch.inference_mode():
    y_test = model(val_x)
loss_test = loss_fn(y_test, val_y)   # 不推荐
```

**错在哪**：`y_test` 是 inference tensor。把它拿到上下文外面继续做运算，虽然这次因为没有梯度需求可能不报错，但一旦 `val_y` 带梯度、或者你后面想复用这张计算图，就会出问题。验证 loss 本来就不需要梯度，放在同一个上下文里最干净。

**为什么**：`inference_mode` 的保证只覆盖上下文内部创建的 tensor 和运算。`eval()` 只切换层的行为，不会关掉 autograd；真正关掉梯度的是 `inference_mode` / `no_grad`。

**正确认识**：整个验证过程——前向、loss、甚至指标计算——都放进同一个 `with torch.inference_mode():` 里。

```python
with torch.inference_mode():
    val_pred = model(val_x)
    val_loss = loss_fn(val_pred, val_y)
```

**边界与变体**：如果 loss 后面还需要 `backward()`（例如某些元学习或对抗训练场景），不能用 `inference_mode`；这时用 `no_grad()` 或不加梯度上下文。

**怎么用**：把验证写成一个函数，函数体第一行就是 `model.eval()`，然后用 `with torch.inference_mode():` 包住整个前向和 loss。

## 速查表

| 想做的事 | 写法 |
| --- | --- |
| 把 `(N,)` 变成 `(N, 1)` | `x.unsqueeze(1)` |
| 80/20 切分 | `split = int(len(x) * 0.8)` |
| 训练一步 | forward → loss → zero_grad → backward → step |
| step 后统一评估 | `train_eval_loss` / `val_eval_loss` |
| 推理 | `model.eval()` + `with torch.inference_mode():` |
| 记录标量 | `.item()` |
| 画图前回 CPU | `.detach().cpu()` |

## 参考

- [PyTorch 官方教程：优化模型参数](https://pytorch.org/tutorials/beginner/basics/optimization_tutorial.html)
- [PyTorch Docs: torch.inference_mode](https://pytorch.org/docs/stable/generated/torch.inference_mode.html)
- [Matplotlib: pyplot.scatter](https://matplotlib.org/stable/api/_as_gen/matplotlib.pyplot.scatter.html)
