---
title: "PyTorch 张量形状操作：完整笔记与易错点（10.27）"
published: 2026-10-27
description: "reshape / view / permute、索引与 squeeze、NumPy 互转、GPU 搬运：完整笔记，末尾附易错点清单。"
tags: ["Python", "PyTorch", "学习笔记", "易错点"]
category: "Python"
---

接着 [昨天那篇张量基础](../python-tensor-basics/)，今天这部分全是在"改形状、换轴、搬数据"。

这篇分两部分：前半把当天笔记完整整理一遍，保留原来的例子，把当时略写的地方补全；后半把容易记混的地方单独列出来。

## 一、完整笔记

### 1. reshape 与 view

```python
torch.reshape(input, shape)
x.view(shape)
```

- `reshape`：返回指定形状的张量。能共享底层数据时返回视图，不能时复制一份。
- `view`：返回一个不同 shape 的原始张量视图，与原始张量共享同一块内存，所以修改视图会改变原张量。
- `view` 的前提是原张量内存连续（新形状能用原 strides 表达），做不到就报错；这时改用 `reshape`。

```python
x = torch.arange(12)
y = x.view(3, 4)      # (3, 4)，和 x 共享内存
y[0, 0] = 100
print(x[0])           # tensor(100)
```

### 2. stack：沿新维度堆叠

```python
torch.stack(tensors, dim=0)
```

沿**新维度** `dim` 堆叠，所有 `tensors` 必须具有相同的大小。结果比每个输入张量多一维。

```python
a = torch.tensor([1, 2, 3])
torch.stack([a, a], dim=0).shape   # (2, 3)
torch.stack([a, a], dim=1).shape   # (3, 2)
```

### 3. squeeze 与 unsqueeze

```python
torch.squeeze(input)          # 移除所有值为 1 的维度
torch.squeeze(input, dim)     # 只删指定的那一维（长度必须是 1）
torch.unsqueeze(input, dim)   # 在 dim 处插入一个长度为 1 的维度
```

`squeeze` 例如 `[1, 7]` 矩阵变为 `[7]`。`unsqueeze` 返回视图，与原张量共享内存。

```python
x = torch.rand(1, 3, 1, 5)
x.squeeze().shape        # (3, 5)
x.unsqueeze(1).shape     # (1, 1, 3, 1, 5)
```

### 4. permute：重排维度

```python
torch.permute(input, dims)
x_permuted = x_original.permute(2, 0, 1)  # shifts axis 0->1, 1->2, 2->0
```

返回原始 `input` 的一个视图，维度按 `dims` 重新排列，与原张量共享内存。

`dims` 的意思是"新张量的第 i 维来自原张量的第 `dims[i]` 维"：

- `permute(2, 0, 1)`：新 0 轴 = 原 2 轴，新 1 轴 = 原 0 轴，新 2 轴 = 原 1 轴；
- 反过来看，原来的 0 轴跑到位置 1，1 轴跑到位置 2，2 轴跑到位置 0。

```python
x = torch.rand(2, 3, 4)
x.permute(2, 0, 1).shape   # (4, 2, 3)
```

### 5. 索引

```python
x = torch.arange(1, 10).reshape(1, 3, 3)
# x = [[[1, 2, 3],
#       [4, 5, 6],
#       [7, 8, 9]]]

x[:, 0]      # tensor([[1, 2, 3]])，shape (1, 3)
x[:, :, 1]   # tensor([[2, 5, 8]])，shape (1, 3)
```

规则：

- 整数索引会**消掉**那一维；
- 切片（`:` 或 `a:b`）会**保留**那一维；
- 没写的位置等同于全取；
- 所有维都用整数时，得到 0 维张量：`x[0, 1, 2]` -> `tensor(6)`。

想保留维度就写切片，比如 `x[:, 0:1]` 的形状是 `(1, 1, 3)`。

### 6. 与 NumPy 互转

```python
torch.from_numpy(ndarray)   # NumPy 数组 -> PyTorch 张量
torch.Tensor.numpy()        # PyTorch 张量 -> NumPy 数组（仅 CPU）
```

两者**共享同一块内存**，改一个另一个也会变。

```python
import numpy as np

a = np.array([1.0, 2.0, 3.0])
t = torch.from_numpy(a)
a[0] = 99
print(t)   # tensor([99., 2., 3.], dtype=torch.float64)
```

默认情况下，NumPy 数组会以 `float64` 创建，转成 PyTorch 后保持相同的 dtype。很多 PyTorch 计算默认使用 `float32`，需要时用 `.type(torch.float32)` / `.float()` / `.to(torch.float32)` 转换。类型转换会复制数据，转换后的张量不再与原数组共享内存。

### 7. 随机数与种子

```python
torch.rand(3, 4)    # 0-1 均匀分布
torch.randn(3, 4)   # 标准正态分布（均值 0、方差 1）
torch.manual_seed(0)
```

`manual_seed(seed)` 设置随机种子。设一次之后，后续所有随机调用都可复现；需要两段互不影响的序列时才再设一次。

### 8. 在 GPU 上运行

```python
device = "cuda" if torch.cuda.is_available() else "cpu"
torch.cuda.device_count()   # PyTorch 可以访问的 GPU 数量
x = x.to(device)
```

`to(device)` 返回**新张量**，不会修改原张量，所以必须重新赋值。

移回 CPU：

```python
x.cpu()
```

会把张量复制到 CPU 内存，原张量仍保留在 GPU 上——是复制，不是移动。若张量本来就在 CPU 上，`.cpu()` 返回同一个对象。

## 二、易错点

下面每条都是当时做错、或者容易想当然的地方。解释尽量写透：错在哪、为什么错、正确的认识、边界在哪。

### 1. `view` 的前提是内存连续，不是"元素个数相同"

**易错点**：以为只要元素个数对得上，想改成什么形状都能 `view`。

```python
x = torch.arange(24).reshape(2, 3, 4)
y = x.permute(2, 0, 1)   # (4, 2, 3)，元素还是 24 个
y.view(24)
# RuntimeError: view size is not compatible with input tensor's size and stride ...
```

**错在哪**：24 个元素没变，改成一维看起来顺理成章，结果报错；报错信息提到 size 和 stride，却没解释为什么，于是只能靠猜。

**为什么**：`view` 不复制数据，只重新解释同一块内存，所以新形状必须能用**原来的 strides** 表示。`x` 是连续的，strides 为 `(12, 4, 1)`——沿每一维往前迈一步要跳过多少元素。`permute` 之后形状变成 `(4, 2, 3)`，strides 变成 `(1, 12, 4)`：现在第一维的元素在内存里才是相邻的，最后一个维度的 stride 反而是 4。想展平成 24 个连续元素，就得按内存顺序逐个走，可当前 strides 描述的访问顺序是乱的，重排索引做不到。

**正确认识**：`view` 要求新形状与原 strides 兼容；不兼容就用 `reshape`。

**边界与变体**：

- 连续张量 `view(-1)` 可以直接展平。
- 非连续张量也不是一定不能 `view`（见第 3 条）。
- `reshape` 在不能共享时会复制，所以它总能成功。

**怎么用**：不确定就 `reshape`；要求"不复制"才用 `view`，并且确认之前没做过 `permute` / `transpose`。

### 2. `permute` 返回的是视图，不是副本

**易错点**：以为换轴会产生一个新张量，改它不会影响原张量。

```python
x = torch.arange(24).reshape(2, 3, 4)
y = x.permute(2, 0, 1)
y[0, 0, 0] = 999
print(x[0, 0, 0])   # tensor(999)，原张量被改了
```

**错在哪**：`permute` 之后形状完全变了，直觉上像是"新建了一个张量"。如果拿它当副本用，后面修改 `y` 做实验，原数据会被悄悄污染，排查起来很难想到是这里出的问题。

**为什么**：`permute` 只改 shape 和 stride，数据一个字节都没动，`y` 和 `x` 指向同一块内存。可以用 `x.data_ptr() == y.data_ptr()` 验证。转置类操作本质上就是"换一种方式读同一段内存"，复制反而违背了它的设计目的。

**正确认识**：`permute`、`transpose`、`.T`、`.mT`、`squeeze`、`unsqueeze`、`expand`、基本切片都是视图。

**边界与变体**：

- 要独立副本用 `y = x.permute(...).clone()`，或者 `.contiguous()`（不连续时会复制）。
- `detach()` 也共享内存，它只切断计算图，不复制数据。
- `reshape` 视情况：能 view 时共享，不能时复制。

**怎么用**：判断是否共享用 `data_ptr()`；需要独立就 `clone()`。

### 3. `permute` 之后 `view` 不是一定失败

**易错点**：记住"非连续就不能 view"之后，以为 permute 后任何形状都 view 不了，于是无脑换成 reshape；反过来也有人以为总能 view。

```python
x = torch.arange(24).reshape(2, 3, 4)
y = x.permute(2, 0, 1)   # (4, 2, 3), strides (1, 12, 4)

y.view(24)    # 失败
y.view(4, 6)  # 成功：后两维 (2, 3) 能用 strides 合并
```

**错在哪**：把"连续"当成 view 的唯一判据。实际上 `is_contiguous() == False` 只说明"不能随意改形状"，并不等于"任何新形状都不行"。

**为什么**：真正的判据是"新形状能否用原 strides 表达"。合并相邻两维要求 `stride[i] == stride[i+1] * size[i+1]`。这里第 1 维的 stride 是 12，第 2 维 stride 4 乘长度 3 也是 12，所以 `(2, 3)` 能合并成 6；但第 0 维的 stride 是 1，和后面的 12 接不上，所以没法再合并成 `(24,)`。

**正确认识**：能不能 view 取决于"新形状和 strides 是否兼容"，不是简单的连续与否。

**边界与变体**：

- 同一个 `y`：`view(4, 6)` 成功，`view(24)`、`view(2, 12)`、`view(6, 4)` 失败。
- `reshape` 在以上所有情况都能成功，必要时复制。

**怎么用**：别背规则，直接用 `reshape`；只有性能敏感、必须零拷贝时才去研究 strides。

### 4. 整数索引会消掉维度，切片会保留

**易错点**：以为"取了一部分"只是选值，维度结构不变。

```python
x = torch.arange(1, 10).reshape(1, 3, 3)

x[:, 0].shape     # (1, 3)           不是 (1, 1, 3)
x[:, :, 1].shape  # (1, 3)           不是 (1, 3, 1)
x[0, 1, 2].shape  # torch.Size([])   0 维
```

**错在哪**：直觉上 `x[:, 0]` 是"在第二维挑一个"，形状应该留着那一维、长度为 1。实际它在第二维上选中了一个位置，那一维被消费掉了，结果少一维。后面接 `torch.cat`、`matmul` 时形状对不上，就会莫名其妙报错。

**为什么**：索引表达式里每个位置对应张量的一个轴：写整数表示"在这一轴上选一个位置"，该轴被消费；写切片表示"保留这一轴的一部分"，轴仍然存在；不写等同于全取。所以 `x[:, 0]` 依次是：切片保留 dim0（长度 1）、整数消费 dim1、省略保留 dim2（长度 3），得到 `(1, 3)`。

**正确认识**：整数索引消维，切片保维。

**边界与变体**：

- `x[0]` → `(3, 3)`；`x[0, 0]` → `(3,)`；`x[0, 0, 0]` → 0 维 `tensor(1)`。
- 想保留维度就写切片：`x[:, 0:1]` → `(1, 1, 3)`。
- `x[:, [0]]` 是花式索引，同样保留那一维，但会复制数据。

**怎么用**：数一下索引表达式里有几个整数；每有一个，结果的维度就少一维。

### 5. `from_numpy` 和 `.numpy()` 共享内存

**易错点**：以为"转成另一种类型"必然复制了一份，改一边不会影响另一边。

```python
a = np.array([1.0, 2.0, 3.0])
t = torch.from_numpy(a)
a[0] = 99
print(t)   # tensor([99., 2., 3.], dtype=torch.float64)
```

**错在哪**：预处理时先用 NumPy 改数据，再转成张量，发现张量里的值也跟着变了；或者反过来，在 Python 里改了张量，保存的 `.npy` 文件内容不对。更隐蔽的是 dtype：数组是 `float64`，张量也是 `float64`，和平时习惯的 `float32` 不一样。

**为什么**：`from_numpy` 不拷贝，直接把 NumPy 的 buffer 包成张量；`.numpy()` 同理。两者看到的是同一块内存。dtype 也原样保留，所以 `float64` 的数组变成 `float64` 的张量，而不是 PyTorch 常用的 `float32`。

**正确认识**：互转默认共享内存，只有类型转换才会复制。

**边界与变体**：

- `.type(torch.float32)` / `.float()` 会复制，转换后不再共享。
- `.to("cuda")` 会复制（跨设备必须复制）。
- 对 `requires_grad=True` 的张量调用 `.numpy()` 会直接报错，要先 `.detach()`。

**怎么用**：不想互相影响就 `a.copy()` 或 `t.clone()`；转完顺手确认 dtype 是不是预期的 `float32`。

### 6. `.to(device)` 不会就地修改

**易错点**：以为 `x.to(device)` 会把 `x` 搬到 GPU，之后 `x` 就在 GPU 上了。

```python
x = torch.rand(3, 4)
x.to("cuda")
print(x.device)   # cpu —— 没有变化
x = x.to("cuda")  # 正确
```

**错在哪**：调用之后不报错，后续计算也能跑，只是全在 CPU 上，训练速度完全没变。因为返回值被丢掉了，原变量还指向 CPU 上的张量。

**为什么**：张量所在的设备是它的一部分属性，移动到另一台设备意味着在新设备上分配内存、复制数据、新建一个张量对象。`Tensor.to()` 返回这个新张量，不会修改原来的对象。如果目标设备和 dtype 都相同，它直接返回 `self`，所以本地 CPU 测试时"看起来没问题"。

**正确认识**：`Tensor.to()` 返回新张量，必须重新赋值；`.cpu()` 同理。

**边界与变体**：

- `nn.Module.to(device)` 是**原地修改**模块参数，不需要重新赋值，返回值就是同一个模块。
- 张量本来就在 CPU 上时，`.cpu()` 返回同一个对象，不复制。
- `.to("cuda")` 会在 GPU 上创建新存储，原 CPU 张量仍然占着内存。

**怎么用**：张量一律 `x = x.to(device)`；模型用 `model.to(device)`；在关键节点 `print(x.device)` 确认一次。

### 7. `squeeze(dim)` 只在那一维长度为 1 时才生效

**易错点**：以为 `squeeze(1)` 一定能把第 1 维删掉。

```python
x = torch.rand(1, 3, 1, 5)
x.squeeze(1).shape   # (1, 3, 1, 5) —— 没变
x.squeeze(0).shape   # (3, 1, 5)
```

**错在哪**：想用它去掉"多余的维度"，传了 dim 却发现形状没变，也不报错，于是怀疑自己数错了维。

**为什么**：`squeeze` 的语义是"删除长度为 1 的维"。第 1 维长度是 3，删掉就会丢失数据，所以它什么都不做，原样返回。不传 `dim` 时才会扫一遍，把所有长度为 1 的维都删掉。

**正确认识**：`squeeze(dim)` 只在目标维长度为 1 时生效；不传参数则删除所有长度为 1 的维。

**边界与变体**：

- `(1, 3, 1, 5).squeeze()` → `(3, 5)`。
- 全是 1 的张量 `.squeeze()` 会变成 0 维：`(1, 1).squeeze()` → `torch.Size([])`。
- `squeeze()` 和 `unsqueeze(dim)` 都返回视图，共享内存。

**怎么用**：想确定地去掉某一维，用索引 `x[0]` 或 `reshape`；`squeeze(dim)` 用在不关心该维长度、只想"能删就删"的场景。

### 8. 哪些操作共享内存，哪些复制

**易错点**：靠函数名猜会不会复制，结果在 `view`、`reshape`、`to` 这些"视情况而定"的函数上判断错。

```python
x = torch.arange(24).reshape(2, 3, 4)
y = x.permute(2, 0, 1)
y.data_ptr() == x.data_ptr()   # True，视图
z = y.reshape(24)
z.data_ptr() == x.data_ptr()   # False，复制了
```

**错在哪**：比如以为 `reshape` 一定复制（因为常被推荐用来替代 view），或者以为 `to()` 一定复制（同设备同 dtype 时它返回自己）。判断错要么误改数据，要么白白多占一份显存。

**为什么**：视图类操作只改元数据（shape、stride、offset），底层 buffer 不变；复制类操作会分配新内存。有些函数看情况：`reshape` / `contiguous` 能共享就共享，不能才复制；`to` 在目标和当前一致时直接返回 `self`。名字本身不携带这个信息，只能看语义。

**正确认识**：改 stride 的通常是视图；改 dtype 或设备的必须复制；`reshape`、`contiguous`、`to` 视情况。

**边界与变体**：

| 共享（视图） | 复制 |
| --- | --- |
| `view`、`permute`、`transpose`、`.T`、`.mT` | `clone` |
| `squeeze`、`unsqueeze`、`expand` | `.type()` / `.float()` / `.long()` |
| 基本索引（切片、整数索引）、`detach` | `.to()` 跨设备或跨 dtype |
| `from_numpy`、`.numpy()` | 花式索引 `x[[0, 1]]`、布尔索引 |

**怎么用**：不确定时比 `a.data_ptr() == b.data_ptr()`；要独立就 `clone()`。

### 9. `rand` 和 `randn` 不是一回事

**易错点**：以为 `randn` 也是 0–1 之间的随机数；以为 `manual_seed` 只对下一个随机调用有效。

```python
torch.manual_seed(0)
a = torch.rand(3, 4)    # [0, 1) 均匀分布，非负
b = torch.randn(3, 4)   # 标准正态：有负数，也可能大于 1
```

**错在哪**：用 `randn` 初始化权重没感觉，但拿它当"随机比例"或"概率"就会出错——它会给出负数，也可能大于 1。种子的问题则相反：以为只对一个调用生效，于是每个调用前都重设，结果每次拿到相同的随机数。

**为什么**：`rand` 从 `[0, 1)` 均匀分布采样；`randn` 从均值 0、方差 1 的正态分布采样，约 68% 的值落在 ±1 内，约 32% 在 ±1 外。`manual_seed` 设置的是全局随机数生成器的状态，之后**所有**随机调用都沿着这条序列走；重复设同一个种子会重新开始同一条序列。

**正确认识**：`rand` 是均匀分布，`randn` 是标准正态；种子设一次即可复现后续整条序列。

**边界与变体**：

- 实验可复现：在脚本开头设一次 `torch.manual_seed(seed)`。
- 需要两段互不影响的序列时，才再设一次（或使用独立的 `torch.Generator`）。
- GPU 上还有 `torch.cuda.manual_seed_all`。

**怎么用**：要"0 到 1 的比例"用 `rand`；要"近似高斯"用 `randn`；每个实验脚本开头固定种子。

## 三、速查

| 想做的事 | 写法 |
| --- | --- |
| 换形状，保证成功 | `x.reshape(...)` |
| 换形状，且要求不复制 | `x.view(...)` |
| 换轴 | `x.permute(...)` / `x.transpose(a, b)` |
| 去掉长度 1 的维 | `x.squeeze()` / `x.squeeze(dim)` |
| 加一维 | `x.unsqueeze(dim)` / `x[None]` |
| 搬到 GPU | `x = x.to(device)` |
| 判断是否共享内存 | `a.data_ptr() == b.data_ptr()` |

## 参考

- [torch.Tensor 官方文档](https://docs.pytorch.org/docs/2.14/tensors.html) —— 张量属性、视图与索引
- [PyTorch 快速入门](https://pytorch.org/tutorials/beginner/basics/intro.html) —— 设备与 dtype 的基础用法
