---
title: "模型复用与预训练：讲座笔记"
published: 2026-10-25
description: "A Unifying Perspective on Model Reuse: From Small to Large Pre-Trained Models——模型选择与模型适配的统一视角。"
tags: ["预训练", "迁移学习", "讲座笔记"]
category: "文献"
slug: model-reuse
---

> 原文：*A Unifying Perspective on Model Reuse: From Small to Large Pre-Trained Models*（讲座）

模型库：<https://huggingface.co/>

**大模型**：在多样化数据上训练的通用模型，具有跨领域的强大零样本泛化能力。

**小模型**：定义为相对紧凑、专用的模型。

预训练主要考虑**模型的选择**与**模型的适配**。

## 模型选择

- **a. 语义/规则匹配**：通过模型的名字、标签、说明文字来选择。
- **b. 度量匹配**：简单来说就是跑一遍，看看效果怎么样。
- **c. 学习方法**：思想是将模型与数据集映射到同一空间，然后根据定义的距离进行相似度匹配。例如 Task2Vec，识别任务与任务之间的关联性。

## 模型适配

- **a. 预训练模型生成数据**。

- **b. 训练期间**：选定的预训练模型直接作为目标模型的初始化参数；

  - 微调或者正则化：
    $$
    \arg\min_\theta\ \mathcal{L}(f_{\theta_0}\mid\mathcal{D},g_\Theta^m)+\lambda\,\mathcal{R}(f_\theta,g_\Theta^m)
    $$
    其中 $\mathcal{R}$ 为模型的相似性；
  - 知识蒸馏：
    $$
    \arg\min_\theta\ \mathcal{L}(f_{\theta_0}\mid\mathcal{D},g_{\Theta}^m)-\lambda\sum_{x\in\mathcal{D}}\mathrm{Sim}\big(f_\theta(x),g_{\Theta}^m(x)\big)
    $$
    $\mathrm{Sim}$ 为相似度，传统通过 KL 散度或者 JS 散度，现在还有考虑隐藏层的散度。

- **c. 使用期间**：这时候不改变参数，通过一些外部技巧，让它输出得更好。
