---
title: "PyTorch 分类基础：二分类、多分类与 logits（10.31）"
published: 2026-10-31
description: "整理 10.31 的分类笔记：make_circles 二分类、损失函数选择、logits/sigmoid/round、make_blobs 多分类、softmax 与 argmax，并标出自己加的批注。"
tags: ["Python", "PyTorch", "分类", "学习笔记", "易错点"]
category: "Python"
---

今天开始学分类：先用 `make_circles` 做二分类，再看损失函数、logits、sigmoid、round，最后用 `make_blobs` 做多分类，走到 softmax 和 argmax。笔记大部分是教程的整理，**加粗的是我自己写的理解/补充**。

## 一、完整笔记

### 1. 二分类数据：make_circles

```python
from sklearn.datasets import make_circles

n_samples = 1000
X, y = make_circles(
    n_samples,
    noise=0.03,
    random_state=42,
)
```

`make_circles` 生成两个交错的圆环，`X` 是 `(1000, 2)` 的坐标，`y` 是 `(1000,)` 的标签，取值 0 或 1。

### 2. 先放进 DataFrame 看一眼

```python
import pandas as pd

circles = pd.DataFrame({
    "X1": X[:, 0],
    "X2": X[:, 1],
    "label": y,
})
circles.head(10)
```

每对 `(X1, X2)` 对应一个 0/1 标签，所以这是一个二分类问题。

### 3. 转成张量并切分

```python
import torch

X = torch.from_numpy(X).type(torch.float)
y = torch.from_numpy(y).type(torch.float)

from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
)
```

80% 训练、20% 测试，`random_state=42` 保证每次切分结果一样。

这里 `y` 的形状是 `(N,)`。如果模型输出是 `(N, 1)`，后面算 loss 和 accuracy 时要先把形状对齐：要么 `y.unsqueeze(1)`，要么把预测 `squeeze(1)`。

### 4. 模型：两层 Linear

```python
from torch import nn

class CircleModelV0(nn.Module):
    def __init__(self):
        super().__init__()
        self.layer_1 = nn.Linear(in_features=2, out_features=5)
        self.layer_2 = nn.Linear(in_features=5, out_features=1)

    def forward(self, x):
        return self.layer_2(self.layer_1(x))
```

输入 2 个特征，先升到 5 个，再压到 1 个输出。二分类只输出一个 logit，配合 `BCEWithLogitsLoss` 使用。

也可以用 `nn.Sequential` 写同样的结构：

```python
model_0 = nn.Sequential(
    nn.Linear(in_features=2, out_features=5),
    nn.Linear(in_features=5, out_features=1),
).to(device)
```

`nn.Sequential` 适合这种简单的顺序计算；如果中间要做分支、残差、多个输入输出，就自定义 `nn.Module`。

### 5. 损失函数与优化器怎么选

| 任务 | 损失函数 |
| --- | --- |
| 二分类 | `nn.BCEWithLogitsLoss`（推荐）或 `nn.BCELoss` |
| 多分类 | `nn.CrossEntropyLoss` |
| 回归 | `nn.L1Loss` / `nn.MSELoss` |

优化器常用 `torch.optim.SGD` 和 `torch.optim.Adam`，分类和回归都能用。

`BCEWithLogitsLoss` 相当于在 `BCELoss` 前面内置了一个 Sigmoid，数值上更稳定。用 `BCELoss` 的话，模型输出必须先过 `Sigmoid`。

### 6. 从 logits 到标签

模型最后一层的原始输出叫 logits：

```python
y_logits = model_0(X_test.to(device))[:5]
```

二分类时，先过 `sigmoid` 变成 0–1 的概率，再四舍五入成 0 或 1：

```python
y_pred_labels = torch.round(torch.sigmoid(y_logits))
```

**`torch.round` 可以四舍五入；前五个预测结果经过 sigmoid 变成 0–1，再四舍五入成 0 或 1。**

如果用的是 `BCEWithLogitsLoss`，loss 直接吃 logits，不要再手动 sigmoid；只有做预测、看概率的时候才 sigmoid。

### 7. 准确率：torch.eq

```python
correct = torch.eq(y_true, y_pred).sum().item()
```

**`torch.eq` 逐元素比较，再做 `sum()`，最后 `.item()` 变成 Python 数字，得到相等的数量。**

这里有一个坑：`y_true` 和 `y_pred` 的形状必须一致。如果一个是 `(N,)`、另一个是 `(N, 1)`，`torch.eq` 会广播成 `(N, N)`，得到的不是逐样本比较，准确率会完全不对。

### 8. 多分类数据：make_blobs

```python
from sklearn.datasets import make_blobs

NUM_CLASSES = 4
NUM_FEATURES = 2
RANDOM_SEED = 42

X_blob, y_blob = make_blobs(
    n_samples=1000,
    n_features=NUM_FEATURES,
    centers=NUM_CLASSES,
    cluster_std=1.5,
    random_state=RANDOM_SEED,
)

X_blob = torch.from_numpy(X_blob).type(torch.float)
y_blob = torch.from_numpy(y_blob).type(torch.LongTensor)

X_blob_train, X_blob_test, y_blob_train, y_blob_test = train_test_split(
    X_blob, y_blob,
    test_size=0.2,
    random_state=RANDOM_SEED,
)
```

多分类的标签是类别索引（0、1、2、3），所以 `y_blob` 用 `LongTensor`，因为 `CrossEntropyLoss` 要求 target 是 `long`。

### 9. 多分类模型：BlobModel

```python
class BlobModel(nn.Module):
    def __init__(self, input_features, output_features, hidden_units=8):
        super().__init__()
        self.linear_layer_stack = nn.Sequential(
            nn.Linear(input_features, hidden_units),
            nn.ReLU(),
            nn.Linear(hidden_units, hidden_units),
            nn.ReLU(),
            nn.Linear(hidden_units, output_features),
        )

    def forward(self, x):
        return self.linear_layer_stack(x)
```

**可以统一设置 `hidden_units=8`，方便修改；`input_features` 可以设为 `NUM_FEATURES`，`out_features` 可以设为 `NUM_CLASSES`。**

多分类最后一层输出 `NUM_CLASSES` 个 logits，不接 softmax；`CrossEntropyLoss` 内部会做 log-softmax。

### 10. logits → softmax → argmax

```python
y_logits = model_4(X_blob_test.to(device))
y_pred_probs = torch.softmax(y_logits, dim=1)
```

**因为 `y_logits` 的输出维度是 `[samples, NUM_CLASSES]`，我们是对 `NUM_CLASSES` 取归一化，看看模型把样本分到哪一类的概率最高。**

**可以用 `torch.argmax()` 检查哪个索引的值最高，注意返回的是索引，不是值。**

```python
model_4.eval()
with torch.inference_mode():
    test_logits = model_4(X_blob_test)
    test_pred = torch.softmax(test_logits, dim=1).argmax(dim=1)
```

**`.argmax(dim=1)` 返回每个样本在类别维上的最大索引。**

### 11. 三维时 argmax(dim=1) 怎么走

**`.argmax(dim=1)` 是在 `dim=1` 找最大；三维时 `argmax(dim=1)` 的规则是：固定其余维度 `(i, k)`，沿着 `j` 方向找最大值的索引，`out[i][k] = argmax_j x[i][j][k]`。**

```python
x = torch.arange(24).reshape(2, 3, 4)
a = torch.argmax(x, dim=1)
print(a.shape)  # torch.Size([2, 4])
```

输出把原来的 `dim=1` 去掉了，剩下的 `(2, 4)` 里每个位置是沿 `j` 方向的最大索引。

## 二、易错点

### 二分类和多分类的损失函数不要混

二分类只有一个输出，用 `BCEWithLogitsLoss`（推荐）或 `BCELoss`；多分类有 `NUM_CLASSES` 个输出，用 `CrossEntropyLoss`。

我一开始容易把 `BCELoss` 和 `CrossEntropyLoss` 当成“随便选一个”。实际上它们的输入形状、target 类型、内部激活都不一样：

- `BCELoss`：输入是 0–1 概率，target 是 float，形状要一致；
- `BCEWithLogitsLoss`：输入是 logits，内部自带 sigmoid；
- `CrossEntropyLoss`：输入是 `(N, C)` logits，target 是 `(N,)` 的 `long` 类别索引。

用错的话，要么直接报错，要么 loss 看起来在降但预测完全不对。

### logits 不要提前做 softmax/sigmoid

```python
# 多分类：不要这样
probs = torch.softmax(logits, dim=1)
loss = nn.CrossEntropyLoss()(probs, y)  # 错：CrossEntropyLoss 要 logits

# 正确
loss = nn.CrossEntropyLoss()(logits, y)
```

`CrossEntropyLoss` 内部已经做了 log-softmax，再手动 softmax 等于做了两遍，数值和梯度都会出问题。

二分类同理：`BCEWithLogitsLoss` 吃 logits；如果模型已经接了 `Sigmoid`，就要用 `BCELoss`，不要两个都上。

### 形状不对，loss 和 accuracy 都会骗人

`make_circles` 的 `y` 是 `(N,)`，而模型输出通常是 `(N, 1)`。直接送进 `BCELoss` 会报：

```text
ValueError: Using a target size (torch.Size([N])) that is different to the input size (torch.Size([N, 1])) is deprecated.
```

更隐蔽的是 accuracy：

```python
y = torch.tensor([0., 1., 1.])
pred = torch.tensor([[0.], [1.], [0.]])
torch.eq(y, pred).shape  # torch.Size([3, 3])，不是 (3,)
```

`(N,)` 和 `(N,1)` 会广播成 `(N,N)`，你以为在逐样本比较，其实比较了所有组合。统一形状就好：`y.unsqueeze(1)` 或 `pred.squeeze(1)`，二选一，前后保持一致。

### argmax 返回的是索引，不是值

```python
x = torch.tensor([[4, 9, 1],
                  [7, 2, 8]])
torch.argmax(x, dim=1)  # tensor([1, 2])
```

`argmax` 返回最大值所在的位置。要拿最大值本身，用 `x.max(dim=1)`，它返回 `(values, indices)`。

另外别忘了 `dim`：多分类的 logits 是 `(N, C)`，要对类别维取最大，所以是 `dim=1`；对 batch 维取最大没有意义。

### sigmoid、softmax、argmax 的分工

- 二分类：`sigmoid` 把单个 logit 压到 0–1，再 `round` 成 0/1；
- 多分类：`softmax(dim=1)` 把 C 个 logits 变成概率分布，再 `argmax(dim=1)` 取类别；
- `argmax` 只负责取索引，不负责算概率。

不要在多分类里用 sigmoid，也不要在二分类里用 softmax 再取 argmax——数学上能跑，但语义和损失函数会对不上。

## 速查表

| 想做的事 | 写法 |
| --- | --- |
| 二分类 loss | `nn.BCEWithLogitsLoss()` |
| 多分类 loss | `nn.CrossEntropyLoss()` |
| 二分类预测 | `torch.sigmoid(logits).round()` |
| 多分类预测 | `torch.softmax(logits, dim=1).argmax(dim=1)` |
| 准确率 | `torch.eq(pred, target).float().mean()` |
| 对齐形状 | `y.unsqueeze(1)` / `pred.squeeze(1)` |
| 取最大值和索引 | `x.max(dim=1)` |

## 参考

- [PyTorch 官方教程：训练一个分类器](https://pytorch.org/tutorials/beginner/basics/intro.html)
- [PyTorch Docs: CrossEntropyLoss](https://pytorch.org/docs/stable/generated/torch.nn.CrossEntropyLoss.html)
- [scikit-learn: make_circles](https://scikit-learn.org/stable/modules/generated/sklearn.datasets.make_circles.html)
