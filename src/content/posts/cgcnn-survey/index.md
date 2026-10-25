---
title: "CGCNN 综述阅读笔记"
published: 2026-10-25
description: "Deep learning in-depth analysis of crystal graph convolutional neural networks: A new era in materials discovery and its applications——新的图网络与未来方向。"
tags: ["图神经网络", "晶体", "综述"]
category: "文献"
slug: cgcnn-survey
---

## 新的图网络

- **注意力图神经网络（GAT）**：注意力用于学习相邻粒子的关系以及整体晶体的结构性质。
- **iCGCNN**：node 特征考虑了键角；判断邻居时使用 Voronoi 分解，两个原子如果共享一个 Voronoi 面，它们就被认为是邻居；增强边的特征。
- **mCGCNN**：在晶体结构属性基础上融合材料的物理或化学性质。
- **轨道图神经网络（orbital GCNN, OGCNN）**：通过轨道场矩阵（orbital field matrix, OFM）整合原子轨道信息，OFM 包含键合细节、电子摆布和临近原子的立体角。
- **材料图网络（materials graph network, MEGNET）**：通过整合全局状态变量预测分子特性——可引入迁移学习在小批量或者不同数据集上学习。
- **SchNet**。
- **多任务 CGCNN（MTCGCNN）**。
- **HydraGNN**：采用特殊的卷积层，有助于分类任务。

## 未来方向

- 池化机制，如 eigen pooling；
- 新材料的性能预测；
- CGCNN 与生成模型相结合：生成晶体结构交给 CGCNN 评估特性；
- CGCNN 作为先验整合到生成模型的架构中——问题：生成有用、稳定且对称的晶体难；数据对齐困难，CGCNN 为监督学习，生成式为无监督或者半监督；优化问题矛盾；
- 可解释性；
- 部分性质的预测上不足，比如带隙的体积/剪切模量；
- 引入物理约束与原理将领域知识整合到模型中，物理信息机器学习混合方法；
- 材料性质的高通量筛选；
- 学科交叉，与密度泛函或者分子动力学耦合；
- CGCNN 与不确定性量化方法（贝叶斯推断或者集成学习）结合，提供概率预测并量化模型预测置信度。
