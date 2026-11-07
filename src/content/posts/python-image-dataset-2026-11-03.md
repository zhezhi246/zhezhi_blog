---
title: "PyTorch 图像分类：Dataset、数据增强与 TinyVGG（11.3）"
published: 2026-11-03
description: "从 ImageFolder、自定义 Dataset 到 TinyVGG 和训练评估函数，整理维度变化、数据增强和易错点。"
tags: ["Python", "PyTorch", "图像分类", "学习笔记", "易错点"]
category: "Python"
---

今天把图像分类的主要环节串起来：图片先经过变换，由 Dataset 提供单样本，再由 DataLoader 组成批次，最后送入模型训练和评估。下面先整理知识点，再保留自己的记忆提示；整理时发现的问题单列纠正。

## 一、今天学到的知识点

### 1. 图像变换与 ImageFolder

图像任务常用 `torchvision.datasets` 和 `torchvision.transforms`。`Compose` 把多个变换按顺序组合起来。

```python
from torchvision import datasets, transforms
from torch.utils.data import DataLoader

train_transform = transforms.Compose([
    transforms.Resize((64, 64)),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.ToTensor(),
])
eval_transform = transforms.Compose([
    transforms.Resize((64, 64)),
    transforms.ToTensor(),
])

# 数据路径按实际目录修改
train_data = datasets.ImageFolder("food_images/train", transform=train_transform)
test_data = datasets.ImageFolder("food_images/test", transform=eval_transform)
assert train_data.class_to_idx == test_data.class_to_idx
print(train_data.classes)
print(train_data.class_to_idx)
print(len(train_data), len(test_data))
```

目录按类别组织，例如 `train/pizza/a.jpg`、`train/steak/b.jpg`。`ImageFolder` 建立类别列表和名称到整数的映射，`len(dataset)` 返回样本数量。原笔记中的 225、75 是示例数据集规模，不是固定要求。

对这里的普通 RGB 8 位图像，`ToTensor()` 将 HWC 图像转换为 CHW 浮点张量，并把像素值缩放到 `[0, 1]`。其他输入类型不能一概假设也会这样缩放，见 [ToTensor 官方文档](https://docs.pytorch.org/vision/stable/generated/torchvision.transforms.ToTensor.html)。

显示图片时常要反过来转换维度：

```python
image, label = train_data[0]     # image: [C, H, W]
image_for_plot = image.permute(1, 2, 0)  # [H, W, C]
```

### 2. DataLoader：把单样本组成批次

```python
train_loader = DataLoader(train_data, batch_size=32, shuffle=True, num_workers=0)
test_loader = DataLoader(test_data, batch_size=32, shuffle=False, num_workers=0)
images, labels = next(iter(train_loader))
print(images.shape, labels.shape)  # 通常为 [N, 3, 64, 64]、[N]
```

`batch_size` 控制每批数量，`shuffle` 控制抽取顺序，`num_workers` 控制加载数据的子进程数量。原笔记用 batch size 1，这里用 32 展示批次维度；最后一批可能不足 32。

训练通常打乱顺序，评估通常保持固定顺序。这里先用 `num_workers=0` 方便在 Windows 中调试；改为多进程时，应将启动入口放在 `if __name__ == "__main__":` 下。

### 3. 自定义 Dataset：路径、类别、长度与索引

自定义数据组织方式时，可以继承 `Dataset`，实现按索引取得样本，并提供长度。下面保留原笔记的结构，补全导入、RGB 转换和常见图片后缀。

```python
from pathlib import Path
from PIL import Image
from torch.utils.data import Dataset

def find_classes(directory):
    classes = sorted(path.name for path in Path(directory).iterdir() if path.is_dir())
    if not classes:
        raise FileNotFoundError(f"No class directories: {directory}")
    return classes, {name: index for index, name in enumerate(classes)}

class ImageFolderCustom(Dataset):
    def __init__(self, directory, transform=None):
        self.classes, self.class_to_idx = find_classes(directory)
        self.paths = sorted(
            path for path in Path(directory).glob("*/*")
            if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg", ".png"}
        )
        if not self.paths:
            raise FileNotFoundError(f"No supported images: {directory}")
        self.transform = transform

    def __len__(self):
        return len(self.paths)

    def __getitem__(self, index):
        path = self.paths[index]
        with Image.open(path) as source:
            image = source.convert("RGB")
        label = self.class_to_idx[path.parent.name]
        if self.transform is not None:
            image = self.transform(image)
        return image, label
```

`__getitem__` 返回 `(image, label)`；`path.parent.name` 取得类别文件夹名。未提供变换时返回 PIL 图像，直接交给默认批处理器未必合适，训练时应提供转张量的变换。这是教学版实现，不等同于完整复制 `ImageFolder` 的所有功能。

### 4. 数据增强：训练与评估分开

`TrivialAugmentWide` 可以作为训练时的数据增强方案之一：

```python
augmented_transform = transforms.Compose([
    transforms.Resize((64, 64)),
    transforms.TrivialAugmentWide(num_magnitude_bins=31),
    transforms.ToTensor(),
])
```

这里使用 PIL 图像先增强，再转浮点张量。`num_magnitude_bins` 表示可选强度值的数量，不是“31 就是最高强度的高概率”，也不要把 0 理解成关闭增强。输入要求和参数含义见 [官方文档](https://docs.pytorch.org/vision/stable/generated/torchvision.transforms.TrivialAugmentWide.html)。增强是否有效需要用验证结果判断。

### 5. TinyVGG 与 shape 的变化

原笔记学习了两个卷积块，每个块由卷积、ReLU 和池化组成，最后展平并接线性层。下面延续 [CNN Explainer](https://poloclub.github.io/cnn-explainer/) 所展示的小型卷积网络思路。

```python
import torch
from torch import nn

class TinyVGG(nn.Module):
    def __init__(self, input_channels, hidden_units, num_classes):
        super().__init__()
        self.block1 = nn.Sequential(
            nn.Conv2d(input_channels, hidden_units, 3, padding=1),
            nn.ReLU(),
            nn.Conv2d(hidden_units, hidden_units, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
        )
        self.block2 = nn.Sequential(
            nn.Conv2d(hidden_units, hidden_units, 3, padding=1),
            nn.ReLU(),
            nn.Conv2d(hidden_units, hidden_units, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(hidden_units * 16 * 16, num_classes),
        )

    def forward(self, x):
        x = self.block1(x)
        x = self.block2(x)
        return self.classifier(x)
```

这里固定输入为 `[N, 3, 64, 64]`。卷积核为 3、padding 为 1、stride 为 1 时保持空间尺寸；两次 2 倍池化让 `64 → 32 → 16`，因此线性层输入为 `hidden_units × 16 × 16`。

可以通过中间打印 shape，或安装 `torchinfo` 后查看：

```python
from torchinfo import summary
model = TinyVGG(3, 10, len(train_data.classes))
summary(model, input_size=(1, 3, 64, 64))
```

### 6. 训练和评估函数化

原笔记将流程拆为 `train_step()`、`test_step()`、`train()`。整理版显式传入设备，并按样本数累计指标，避免最后一批较小时出现无意的等权批次平均。

```python
def train_step(model, loader, loss_fn, optimizer, device):
    model.train()
    total_loss, correct, total = 0.0, 0, 0
    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        logits = model(images)
        loss = loss_fn(logits, labels)
        loss.backward()
        optimizer.step()
        n = labels.size(0)
        total_loss += loss.item() * n
        correct += (logits.argmax(dim=1) == labels).sum().item()
        total += n
    if total == 0:
        raise ValueError("Empty training loader")
    return total_loss / total, correct / total

def test_step(model, loader, loss_fn, device):
    model.eval()
    total_loss, correct, total = 0.0, 0, 0
    with torch.inference_mode():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            logits = model(images)
            loss = loss_fn(logits, labels)
            n = labels.size(0)
            total_loss += loss.item() * n
            correct += (logits.argmax(dim=1) == labels).sum().item()
            total += n
    if total == 0:
        raise ValueError("Empty evaluation loader")
    return total_loss / total, correct / total

def train(model, train_loader, test_loader, optimizer, loss_fn, device, epochs=5):
    results = {key: [] for key in ("train_loss", "train_acc", "test_loss", "test_acc")}
    for epoch in range(epochs):
        train_loss, train_acc = train_step(model, train_loader, loss_fn, optimizer, device)
        test_loss, test_acc = test_step(model, test_loader, loss_fn, device)
        for key, value in zip(results, (train_loss, train_acc, test_loss, test_acc)):
            results[key].append(value)
        print(f"Epoch {epoch + 1}: train_loss={train_loss:.4f}, test_acc={test_acc:.4f}")
    return results

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = TinyVGG(3, 10, len(train_data.classes)).to(device)
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
loss_fn = nn.CrossEntropyLoss()
# 准备好图片后调用：
# results = train(model, train_loader, test_loader, optimizer, loss_fn, device)
```

上述损失累计对应这里默认、未加类别权重且没有忽略标签的 `CrossEntropyLoss`。输出是原始 logits，预测类别直接 `argmax(dim=1)`；只为了取最大类别，不必先算 softmax。

如果在每轮用同一份数据比较模型并调参，它实际承担的是验证集角色；最终测试集应留到方案确定后使用。这里保留笔记的 `test_step` 命名。

## 二、我的心得与注意事项

- **先记清数据链路：图片 → Dataset 的单样本 → DataLoader 的批次 → 模型。**
- **图片张量常是 CHW，matplotlib 显示 RGB 图像需要 HWC；`permute(1, 2, 0)` 是把维度顺序改成 H、W、C。**
- **`shuffle=True` 让训练样本重新打乱，减少固定排列带来的影响；评估通常不用打乱。**
- **自定义 Dataset 重点看三个位置：初始化整理路径和类别，`__len__` 返回数量，`__getitem__` 返回一个样本和标签。**
- **池化后还需要 Flatten，把每个样本的特征展平成向量，方便接线性层；它保留批次维度。**
- **线性层的输入维度不是猜出来的，沿着卷积和池化逐层计算 shape。**
- **训练、评估、多个 epoch 的调度分成函数，之后复用更方便。**

## 三、整理时补充的纠错与提醒

- **原笔记让训练和测试共用随机翻转，这里已拆开：评估使用确定性预处理，便于比较。**
- **原增强示例使用 224×224，模型却固定按 64×64 的输出尺寸建线性层，两者直接拼接会维度不匹配。本文统一成 64×64。**
- **增强的强度档位数不等于增强强度本身；自动增强也不保证对所有任务更好。**
- **`model.eval()` 改变部分层的行为，`inference_mode()` 关闭相关自动求导开销，二者用途不同。**
- **把嵌套函数调用写成一行不会自动保证算子融合。** 原笔记的这条代码注释不应作为性能结论。

这些代码是按笔记整理的教学示例，文章没有据此报告训练准确率或训练成功结果。
