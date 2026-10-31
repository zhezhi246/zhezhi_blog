---
title: "PyTorch 二分类实战：make_moons、BCELoss 与踩坑记录（10.31）"
published: 2026-10-31
description: "用 make_moons 训练一个小型二分类网络：数据构造、模型、训练循环、验证与准确率，并记录我自己踩过的 7 个坑和还能改进的地方。"
tags: ["Python", "PyTorch", "二分类", "学习笔记", "易错点"]
category: "Python"
---

这篇是我自己写的实践：用 `make_moons` 造数据，训练一个小 MLP 做二分类。前半部分是完整流程，后半部分是我在 `study2_classfy.py` 里踩过的坑和还能改的地方。**加粗的是我自己写的注释/心得。**

## 一、完整笔记

### 1. 数据：make_moons

```python
from sklearn.datasets import make_moons
from sklearn.model_selection import train_test_split
import torch

n_samples = 1000
random_seed = 42

x, y = make_moons(
    n_samples,
    noise=0.03,
    random_state=random_seed,
)

x = torch.from_numpy(x).float()
y = torch.from_numpy(y).float().unsqueeze(dim=1)

x_train, x_val, y_train, y_val = train_test_split(
    x, y,
    train_size=0.8,
    random_state=random_seed,
)
```

`make_moons` 生成两个交错的半月形，`x` 是 `(1000, 2)`，`y` 是 `(1000,)` 的 0/1 标签。转成张量后：

- `x` 用 `float()`，因为 `nn.Linear` 要吃浮点；
- `y` 用 `float()`，并且 `unsqueeze(1)` 变成 `(1000, 1)`，和模型输出 `(N, 1)` 对齐；
- 80% 训练、20% 验证，`random_state` 保证可复现。

### 2. 模型：两层 Linear + Sigmoid

```python
from torch import nn

class ClassificationModule(nn.Module):
    def __init__(self, in_dim, out_dim, hidden_dim=10):
        super().__init__()
        self.layer_stacks = nn.Sequential(
            nn.Linear(in_features=in_dim, out_features=hidden_dim),
            nn.ReLU(),
            nn.Linear(in_features=hidden_dim, out_features=out_dim),
            nn.Sigmoid(),
        )

    def forward(self, x):
        return self.layer_stacks(x)
```

二分类只需要一个输出，所以 `out_dim=1`。最后一层 `Sigmoid` 把 logit 压到 0–1，配合 `BCELoss` 使用。

原文件里的类名是 `cassificationModule`、变量是 `layer_satcks`，这里顺手改了拼写，方便读。

### 3. 训练函数

```python
def train_one_epoch(model, x_train, y_train, loss_fn, optimizer):
    model.train()
    y_pred = model(x_train)
    loss = loss_fn(y_pred, y_train)

    optimizer.zero_grad()
    loss.backward()
    optimizer.step()
```

训练函数只负责一个 epoch 的训练：切训练模式、前向、算 loss、清梯度、反向、更新参数。

原文件里的 `train` 还接收了 `x_val`，但函数体里没有用到；最后 `return 0` 也没有意义。把验证拆到外面会更清楚。

### 4. 损失函数和优化器

```python
loss_fn = nn.BCELoss()
optimizer = torch.optim.SGD(params=model.parameters(), lr=0.01)
```

模型最后有 `Sigmoid`，输出是 0–1 概率，所以配 `BCELoss` 是对的。

更稳的写法是：模型最后一层不要 `Sigmoid`，改用 `nn.BCEWithLogitsLoss()`。它内部自带 Sigmoid，数值上更稳定；预测时再手动 sigmoid。

### 5. 训练循环与记录

```python
train_losses, val_losses = [], []
val_accuracies = []

for epoch in range(1000):
    train_one_epoch(model, x_train, y_train, loss_fn, optimizer)

    model.eval()
    with torch.inference_mode():
        train_pred = model(x_train)
        val_pred = model(x_val)
        train_loss = loss_fn(train_pred, y_train)
        val_loss = loss_fn(val_pred, y_val)

        train_acc = torch.eq(train_pred.round(), y_train).float().mean().item()
        val_acc = torch.eq(val_pred.round(), y_val).float().mean().item()

    train_losses.append(train_loss.item())
    val_losses.append(val_loss.item())
    val_accuracies.append(val_acc)

    if epoch % 100 == 0:
        print(
            f"{epoch} | train loss {train_loss.item():.4f} | "
            f"val loss {val_loss.item():.4f} | "
            f"train acc {train_acc:.4f} | val acc {val_acc:.4f}"
        )
```

关键点是：**训练 loss 和验证 loss 都在 `optimizer.step()` 之后算**，这样两边看到的是同一个模型状态。

原文件里 `acc_train_record.append(acc_val)` 是个小 bug：训练准确率列表里存了验证准确率。这里没有保留那个列表；如果要记录，应该是 `train_acc`。

### 6. 完整代码（整理后）

```python
from sklearn.datasets import make_moons
from sklearn.model_selection import train_test_split
import matplotlib.pyplot as plt
import torch
from torch import nn

plt.rcParams["font.sans-serif"] = ["SimHei"]
plt.rcParams["axes.unicode_minus"] = False


class ClassificationModule(nn.Module):
    def __init__(self, in_dim, out_dim, hidden_dim=10):
        super().__init__()
        self.layer_stacks = nn.Sequential(
            nn.Linear(in_features=in_dim, out_features=hidden_dim),
            nn.ReLU(),
            nn.Linear(in_features=hidden_dim, out_features=out_dim),
            nn.Sigmoid(),
        )

    def forward(self, x):
        return self.layer_stacks(x)


def train_one_epoch(model, x_train, y_train, loss_fn, optimizer):
    model.train()
    y_pred = model(x_train)
    loss = loss_fn(y_pred, y_train)
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()


def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    random_seed = 42

    x, y = make_moons(1000, noise=0.03, random_state=random_seed)
    x = torch.from_numpy(x).float().to(device)
    y = torch.from_numpy(y).float().to(device).unsqueeze(dim=1)

    x_train, x_val, y_train, y_val = train_test_split(
        x, y, train_size=0.8, random_state=random_seed
    )

    torch.manual_seed(42)
    model = ClassificationModule(
        in_dim=x.shape[1],
        out_dim=y.shape[1],
        hidden_dim=10,
    ).to(device)

    loss_fn = nn.BCELoss()
    optimizer = torch.optim.SGD(params=model.parameters(), lr=0.01)

    train_losses, val_losses = [], []
    val_accuracies = []

    for epoch in range(1000):
        train_one_epoch(model, x_train, y_train, loss_fn, optimizer)

        model.eval()
        with torch.inference_mode():
            train_pred = model(x_train)
            val_pred = model(x_val)
            train_loss = loss_fn(train_pred, y_train)
            val_loss = loss_fn(val_pred, y_val)

            train_acc = torch.eq(train_pred.round(), y_train).float().mean().item()
            val_acc = torch.eq(val_pred.round(), y_val).float().mean().item()

        train_losses.append(train_loss.item())
        val_losses.append(val_loss.item())
        val_accuracies.append(val_acc)

        if epoch % 100 == 0:
            print(
                f"{epoch} | train loss {train_loss.item():.4f} | "
                f"val loss {val_loss.item():.4f} | "
                f"train acc {train_acc:.4f} | val acc {val_acc:.4f}"
            )

    plt.figure(figsize=(10, 5))
    plt.plot(train_losses, label="train loss")
    plt.plot(val_losses, label="val loss")
    plt.legend()
    plt.show()


if __name__ == "__main__":
    main()
```

## 二、我在 study2_classfy.py 里踩过的坑

**1. `__init__(self, ...)` 总是容易忘记写 `self`。**

实例方法的第一个参数永远是 `self`。少了它，Python 会把第一个实参当成 `self`，调用时参数数量就对不上，或者报 `TypeError`。`__init__`、`forward`、`train` 都一样。

**2. `loss.backward()` 写成了 `loss.backforward()`。**

正确的是 `backward`，不是 `backforward`。拼错会直接 `AttributeError: 'Tensor' object has no attribute 'backforward'`。

**3. `nn.BCELoss()` 忘记加括号。**

`nn.BCELoss` 是类，`nn.BCELoss()` 才是实例。把类直接当函数用，会报 `TypeError`，或者得到一个不是损失函数的东西。

**4. 优化器忘记传 `params=model.parameters()`。**

`torch.optim.SGD` 必须知道要更新哪些参数。不传 `params`，要么直接报缺少参数，要么优化器里空空如也，训练时参数不动。

**5. `list.append()` 不是赋值。**

`loss_train_record.append(loss_train)` 原地修改列表，返回 `None`。如果写成：

```python
loss_train_record = loss_train_record.append(loss_train)
```

列表就变成 `None` 了，下一次再 append 就会报错。记住：`append` 只调用，不接收返回值。

**6. `torch.eq(...).float().mean()` 需要 `.float()`。**

`torch.eq` 返回 bool 张量。bool 张量不能直接 `.mean()` 得到小数，会报：

```text
RuntimeError: mean(): could not infer output dtype. Input dtype must be either a floating point or complex dtype. Got: Bool
```

先 `.float()` 再 `.mean()`，或者用 `.sum().item() / len(...)`。

**7. detach 只对带梯度的张量有必要。**

原始数据 `x_train`、`x_val` 不需要 detach；`inference_mode` 里算出的预测和 loss 也不需要，因为它们不带梯度。

只有从参数运算出来、带 `grad_fn` 的张量才需要 detach，比如：

```python
w = nn.Parameter(torch.randn(2))
x_train = w * 2 + 1  # 这个 x_train 带 grad_fn
```

要把这种张量存进列表或转 numpy 时，先 `.detach()`，否则计算图和中间激活值会一直被引用。

## 三、还能改的地方

- **`acc_train_record.append(acc_val)` 是 bug。** 变量名是“训练准确率”，存的却是验证准确率。要么改成 `train_acc`，要么把变量名改成 `val_accuracies`。
- **`Sigmoid + BCELoss` 可以再稳一点。** 去掉模型的 `Sigmoid`，用 `nn.BCEWithLogitsLoss()`；预测时再 `torch.sigmoid(...)`。这样数值上更稳定，也少一次手动激活。
- **`train` 函数里的 `x_val` 没用到，`return 0` 也没用到。** 训练函数只做训练，验证放到循环里更清楚。
- **`loss_train_record` 里存的是 tensor。** 画图前用 `.item()` 转成 Python 数字，列表更轻，也不会一直持有张量。
- **`in_dim=len(x[0])`、`out_dim=len(y[0])` 能跑，但有点脆。** 用 `x.shape[1]`、`y.shape[1]` 更直观；二分类也可以直接写 `out_dim=1`。
- **拼写**：`cassificationModule` → `ClassificationModule`，`layer_satcks` → `layer_stacks`，`rain loss` → `train loss`。这些不影响运行，但读起来会卡一下。

## 速查表

| 想做的事 | 写法 |
| --- | --- |
| 构造二分类数据 | `make_moons(n_samples, noise=0.03, random_state=42)` |
| 转成张量 | `torch.from_numpy(x).float()` |
| 对齐形状 | `y.unsqueeze(1)` |
| 二分类模型 | `Linear → ReLU → Linear → Sigmoid` |
| 二分类 loss | `nn.BCELoss()`（配 Sigmoid） |
| 更稳的 loss | `nn.BCEWithLogitsLoss()`（不接 Sigmoid） |
| 准确率 | `torch.eq(pred.round(), y).float().mean()` |

## 参考

- [scikit-learn: make_moons](https://scikit-learn.org/stable/modules/generated/sklearn.datasets.make_moons.html)
- [PyTorch Docs: BCELoss](https://pytorch.org/docs/stable/generated/torch.nn.BCELoss.html)
- [PyTorch Docs: BCEWithLogitsLoss](https://pytorch.org/docs/stable/generated/torch.nn.BCEWithLogitsLoss.html)
