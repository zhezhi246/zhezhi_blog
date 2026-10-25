---
title: "Discrete Flow Matching 阅读笔记"
published: 2026-10-25
description: "离散序列上的流匹配：概率路径与 CTMC、连续性方程、边际速度的构造、训练损失与训练/采样流程。"
tags: ["流匹配", "生成模型", "离散序列"]
category: "文献"
slug: discrete-flow-matching
---

## 基础定义

1. 在离散序列建模中，序列 $x=(x^1,x^2,\dots,x^N)$，$x^i \in [d]$。所有可能序列的集合表示为 $\mathcal{D}=[d]^N$，$x \in \mathcal{D}$。

2. $p(x^i)=\sum_{x^{\bar{i}}}p(x,x^{\bar{i}})$，简写为 $\sum_{x^{\bar{i}}}p(x)$，其中 $x^{\bar{i}}=(\dots,x^{i-1},x^{i+1},\dots)\in[d]^{N-1}$。

3. δ 函数的定义：
$$
\delta_{x_t}(x) = \prod_{i=1}^N \delta_{x_t^i}(x^i), \quad \text{其中} \quad \delta_{x_t^i}(x^i) = \begin{cases} 1 & x^i = x_t^i \\ 0 & x^i \neq x_t^i \end{cases}
$$

4. $\delta_y(x^i)=\delta_{y^i}(x^i)$。

5. $\delta_{x_t}(x^{\bar{i}}) =\delta_{x_t^{\bar{i}}}(x^{\bar{i}})=\prod_{j\neq i}\delta_{x_t^j}(x^j)$。

6. $p_t(x)=\sum_{x_0,x_1\in\mathcal{D}}p_t(x|x_0,x_1)\,\pi(x_0,x_1)$，$(X_0,X_1)\sim\pi(X_0,X_1)$。

7. $p_t(x|x_0,x_1)=\prod_{i=1}^Np_t(x^i|x_0,x_1)$，且 $p_t(x^i|x_0,x_1)$ 需要满足 $p_0(x^i|x_0,x_1)=\delta_{x_0}(x^i)$，$p_1(x^i|x_0,x_1)=\delta_{x_1}(x^i)$。

8. 作者规定概率路径为混合形式：
$$
p_t(x^i|x_0,x_1)=\sum_{j=1}^m\kappa_t^{i,j}\,w^j(x^i|x_0,x_1)
$$
其中 $\sum_j\kappa_t^{i,j}=1$ 且 $\kappa_t^{i,j}\geq 0$。$\kappa_t^{i,j}$ 为设定的关于 $t$ 的函数，控制 $t$ 时刻 $x^i$ 取第 $j$ 个调节器（mixing agent）的权重。常用的形式是：
$$
p_t(x^i|x_0,x_1)=(1-\kappa_t)\,\delta_{x_0}(x^i)+\kappa_t\,\delta_{x_1}(x^i),\quad \kappa_0=0,\ \kappa_1=1
$$

9. 一个连续时间离散马尔可夫链（CTMC）中，对 $X_t\sim p_t$，$t+h$ 时刻的采样为：
$$
X_{t+h}^{i}\sim\delta_{X_{t}^{i}}(\cdot)+h\,u_{t}^{i}(\cdot,X_{t})
$$
为保证采样的概率和为 1，规定 $\sum_{x^i\in[d]}u_t^i(x^i,z)=0$，且对所有 $i\in[N]$、$x^i\neq z^i$ 有 $u_t^i(x^i,z)\geq 0$（即 $x^i=z^i$ 时向量场为负）。$z$ 表示 $t$ 时刻 $X_t$ 的所有可能取值。

10. $\dot{p}_t(x|x_0,x_1)$ 表示对 $t$ 的导数：
$$
\dot{p}_t(x|x_0,x_1)=\sum_{i=1}^N\left[\dot{p}_t(x^i|x_0,x_1)\cdot\prod_{j\neq i}p_t(x^j|x_0,x_1)\right]=\sum_{i=1}^Np_t(x^{\bar{i}}|x_0,x_1)\,\dot{p}_t(x^i|x_0,x_1)
$$
（原稿此处有一条被划掉的式子 $\dot{p}_t(x^i|x_0,x_1)=\sum_{z\in\mathcal{D}}\delta_{x}(z^i)\,u_t^i(x_t^i|x_0,x_1)$，不成立，已废弃。）

11. 利用 δ 函数的筛选性质：
$$
p_t(x|x_0,x_1)= \sum _z\delta _x( z)\, p_t( z| x_0, x_1)=\sum _z\delta _x( z^{\bar{i} })\, \delta _x( z^i)\, p_t( z| x_0, x_1)
$$
因为 $\delta_x(z^{\bar{i}})\delta_x(z^i)=\delta_x(z)$。

12. 可以证明 10 与 11 的定义互通，只是表述不同：
$$
\dot{p}_t(x|x_0,x_1)= \sum _{z\in \mathcal{D}}\delta _x( z)\, \dot{p}_t( z| x_0, x_1) =\sum _{z\in \mathcal{D}}\delta _x( z)\left[\sum_{i=1}^Np_t(z^{\bar{i}}|x_0,x_1)\,\dot{p}_t(z^i|x_0,x_1)\right]
$$
又 $\delta _x( z)=\prod_{j}\delta_{x}(z^j)$，故
$$
\dot{p}_t(x|x_0,x_1)=\sum _{z\in \mathcal{D}}\sum_{i=1}^N \left[\delta _x( z^{\bar{i}})\,p_t(z^{\bar{i}}|x_0,x_1)\right]\left[\delta _x( z^{i})\,\dot{p}_t(x^i|x_0,x_1)\right]
$$

## 主体思想

### 1. 连续性方程

通过连续性方程得到（方程 19）：
$$
\dot{p}_t(x|x_0,x_1)=\sum_{z\in\mathcal{D}}p_t(z|x_0,x_1)\left[\sum_{i=1}^N\delta_z(x^i)\,u_t^i(x^i,z|x_0,x_1)\right]
$$

证明（E.1）中需要注意：只有当两个状态 $x$ 和 $z$ 只在第 $i$ 个 token 上不同时，才有非零的通量，因此使用 δ 筛选：
$$
\begin{aligned}\mathrm{div}_{x}(p_{t}u_{t})&=\sum_{z\in\mathcal{D}}[v(z,x)-v(x,z)]\\&=\sum_{z\in\mathcal{D}}\left[p_t(z)u_t^i(x^i,z)-p_t(x)u_t^i(z^i,x)\right]\\&=\sum_{z\in\mathcal{D}}\sum_{i=1}^N\delta_x(z^{\bar{i}})\begin{bmatrix}p_t(z)u_t^i(x^i,z)-p_t(x)u_t^i(z^i,x)\end{bmatrix}\end{aligned}
$$

### 2. DF1：串联 $u_t$ 与 $p_t$

DF1 串联起 $u_t$ 与 $p_t$ 的关系，表明 $X_{t+h}$ 的采样是符合逻辑的。

> Definition 1. Probability velocity $u_t$ generates the probability path $p_t$ if, for all $t \in [0,1)$ and given a sample $X_t \sim p_t$, the sample $X_{t+h}$ defined in $X_{t+h}^{i}\sim\delta_{X_{t}^{i}}(\cdot)+h\,u_{t}^{i}(\cdot,X_{t})$ satisfies $X_{t+h} \sim p_{t+h} + o(h)$.

**Q：为什么这么定义合理？**
**A：** 满足连续性方程，证明为方程 20。

### 3. 从条件向量场到边际向量场

类似 FM 中的思想：既然边缘向量场不好求，那就转为计算条件向量场。

**Theorem 2**：给定一个条件概率速度 $u_t^i(x^i,z|x_0,x_1)$ 生成一个条件概率路径 $p_t(x|x_0,x_1)$，由以下定义的边际速度
$$
u_t^i(x^i,z)=\sum_{x_0,x_1\in\mathcal{D}}u_t^i(x^i,z|x_0,x_1)\,p_t(x_0,x_1|z)
$$
生成边际概率路径 $p_t(x)$。根据贝叶斯法则：
$$
p_t(x_0,x_1|z)=\frac{p_t(z|x_0,x_1)\,\pi(x_0,x_1)}{p_t(z)}
$$
证明类似 CFM，通过连续性方程证明边际构造合理。

**Theorem 3**：给出边际向量场的构造：
$$
u_t^i(x^i,X_t|x_0,x_1)=\sum_{j=1}^m\overbrace{\left[\dot{\kappa}_t^{i,j}-\kappa_t^{i,j}\frac{\dot{\kappa}_t^{i,\ell}}{\kappa_t^{i,\ell}}\right]}^{a_t^{i,j}}w^j(x^i|x_0,x_1)+\overbrace{\left[\frac{\dot{\kappa}_t^{i,\ell}}{\kappa_t^{i,\ell}}\right]}^{b_t^i}\delta_{X_t}(x^i)
$$
其中 $\ell=\ell(i,t)\overset{\mathrm{def}}{=}\arg\min_{j\in[m]}\left[\dot{\kappa}_t^{i,j}/\kappa_t^{i,j}\right]$。

证明主要分两个方面说明构造的合理性：一是流通量和为零，二是满足连续性方程。

令 
$$
\hat{w}_t^j(x^i,z)=\sum_{x_0,x_1\in\mathcal{D}}w^j(x^i|x_0,x_1)\,p_t(x_0,x_1|z)
$$
则 
$$
u_t^i(x^i,z)=\sum_{j=1}^ma_t^{i,j}\,\hat{w}_t^j(x^i,z)+b_t^{i,j}\,\delta_z(x^i)
$$

### 4. 最简单的路径

类似 CFM，最简单的路径取：
$$
w^1(x^i|x_0,x_1)=\delta_{x_1}(x^i),\quad w^2(x^i|x_0,x_1)=\delta_{x_0}(x^i),\quad \kappa_t^{i,1}=\kappa_t,\ \kappa_t^{i,2}=1-\kappa_t,\ \dot{\kappa}_t\geq 0
$$
$$
u_t^i(x^i,z)=\frac{\dot{\kappa}_t}{1-\kappa_t}\left[p_{1|t}(x^i|z)-\delta_z(x^i)\right],\quad p_{1|t}(x^i|z)=\sum_{x_0,x_1}\delta_{x_1}(x^i)\,p_t(x_0,x_1|z)
$$

### 5. 反向采样与修正器

反向采样：
$$
u_t^i(x^i,z)=\frac{\dot{\kappa}_t}{\kappa_t}\left[\delta_z(x^i)-p_{0|t}(x^i|z)\right]
$$
（独立同分布情况下 $\check{u}_t^i(x^i,z)=\frac{\dot{\kappa}_t}{\kappa_t}\left[\delta_z(x^i)-p(x^i)\right]$。）

以及前后相结合的采样形式（Combining the forward-time $\hat{u}_{t}$（equation 24）and backward-time $\check{u}_{t}$（equation 25））：
$$
\bar{u}_{t}^{i}(x^{i},z)=\alpha_{t}\,\hat{u}_{t}^{i}(x^{i},z)-\beta_{t}\,\check{u}_{t}^{i}(x^{i},z)
$$

好处：通过调整 $\alpha$ 与 $\beta$ 可以完成前进的同时"倒退"，从而考虑更多的噪声，减少误差累积（因为 $t+h$ 的采样还包含 $o(h)$）。Theorem 4 提供了数学保证：修正采样确实能产生正确的分布。

### 6. 损失函数

$$
\mathcal{L}(\theta) = - \frac{1}{N} \sum_{i=1}^{N} \sum_{j=1}^{m} \mathbb{E}_{t \sim p(t),\, X_t \sim q(X_t|X_0^i, X_1^i)} \left[ \log p_\theta(Y_j^i \mid X_t) \right]
$$

其中 $t$ 在 $[0,1]$ 上按某个分布采样（文中使用均匀分布）；$(X_0,X_1)\sim\pi(X_0,X_1)$；$X_t\sim p_t(X_t|X_0,X_1)$；$Y_i^i\sim w^j(Y_i^i|X_0,X_1)$；$\theta\in\mathbb{R}^p$ 表示可学习参数。

可以证明最小化损失函数学到的就是 $\hat{w}_t^j(x^i|X_t)$。

## 操作流程

### A. 训练阶段

**目标**：训练一个神经网络（通常是 Transformer）来学习概率去噪器 $p_{1|t}(x^{i}|X_{t})$，即给定一个带噪声的中间状态 $X_{t}$，预测目标序列 $X_{1}$ 的概率分布。

流程如下：

1. **准备训练数据对**：
   - 从训练集中取一个真实样本（目标序列）$X_{1}$，例如一句文本或一段代码；
   - 根据设定的耦合方式生成对应的源序列 $X_{0}$：独立耦合时 $X_{0}$ 通常为全 `[MASK]` 序列；条件耦合时 $X_{0}$ 是 $X_{1}$ 的部分掩码版本。
2. **采样时间点**：随机采样一个时间 $t \sim \mathrm{Uniform}(0, 1)$。
3. **构造噪声样本**：根据定义的概率路径（如公式 9），生成时刻 $t$ 的噪声样本 $X_{t}$。对于最简单的路径 $p_{t}(x^{i}|x_{0},x_{1}) = (1-\kappa_{t})\,\delta_{x_{0}}(x^{i}) + \kappa_{t}\,\delta_{x_{1}}(x^{i})$：对序列中的每个位置 $i$，以概率 $\kappa_{t}$ 将 token 设置为目标 token $X_{1}^{i}$，以概率 $(1-\kappa_{t})$ 设置为源 token $X_{0}^{i}$（即 `[MASK]`）。这样得到的 $X_{t}$ 就是一些位置是真实单词、一些位置是 `[MASK]` 的混合序列。
4. **网络前向传播与损失计算**：将噪声样本 $X_{t}$ 和时间 $t$（可选）输入神经网络；网络为每个位置 $i$ 输出一个在整个词表上的概率分布，即预测的 $p_{1|t}(x^{i}|X_{t};\theta)$；计算损失：使用交叉熵损失函数，让网络的预测分布尽可能接近真实的目标 token $X_{1}^{i}$：$\mathcal{L} = -\sum_{i=1}^{N}\log p_{1|t}(X_{1}^{i}|X_{t};\theta)$。

### B. 采样（生成）阶段

**目标**：从一个全 `[MASK]` 的序列 $X_{0}$ 开始，逐步生成一个来自目标数据分布 $q(X_{1})$ 的样本 $X_{1}$。

流程如下（基于欧拉采样）：

1. **初始化**：从源分布采样初始状态。通常 $X_{t=0} = ([MASK], [MASK], \dots, [MASK])$。
2. **迭代去噪**：对于从 $t = 0$ 到 $t = 1$ 的多个时间步（例如 256 步）：
   - **a. 计算速度场**：将当前状态 $X_{t}$ 输入已训练好的网络，得到每个位置的后验分布 $p_{1|t}(x^{i}|X_{t})$。
   - **b. 计算更新量**：根据生成速度场公式（如 24）计算概率速度 $u^{i}_{t}(\cdot, X_{t})$：$u^{i}_{t}(x^{i}, X_{t}) = \frac{\kappa_{t}}{1-\kappa_{t}}\left[p_{1|t}(x^{i}|X_{t}) - \delta_{X_{t}}(x^{i})\right]$。
   - **c. 更新状态**：根据采样规则（公式 12）更新每个位置的 token：$X^{i}_{t+h} \sim \delta_{X^{i}_{t}}(\cdot) + h \cdot u^{i}_{t}(\cdot, X_{t})$。这实际上是一个分类分布：以很高的概率保持当前 token $X^{i}_{t}$ 不变，以一个较小的概率 $h \cdot \frac{\kappa_{t}}{1-\kappa_{t}} p_{1|t}(x^{i}|X_{t})$ 将其采样为其他 token $x^{i}$（特别是网络认为最可能的目标 token）。
   - **d.**（可选）应用修正器：根据 Theorem 4，可以插入修正步骤来提升样本质量。
   - **e.**（对于条件生成）在每一步后，将条件部分（如提示前缀）的 token 重置回原始值。
3. **终止**：当 $t \approx 1$ 时，$X_{t}$ 即为生成的结果 $X_{1}$。
