---
title: "ICGCNN 阅读笔记"
published: 2026-10-25
description: "Developing an improved crystal graph convolutional neural network framework for accelerated materials discovery：CGCNN 的缺点与三点改进。"
tags: ["图神经网络", "晶体", "材料"]
category: "文献"
slug: icgcnn
---

## CGCNN 的缺点

1. 寻找的近邻数目是固定的，导致有可能找到比较远的第三甚至第四层的邻居，导致关键的近邻信息被远邻信息所干扰。虽然有用 $\sigma$ 充当权重，但是比明确地指出关系差——使用 Voronoi 面可以更好地表示边的关系。
2. CGCNN 一次卷积只考虑到一层邻居的关系，但是一个原子可能和多个原子有共同作用（如键角、三原子的几何结构）。虽然多层卷积能够间接捕捉到这个信息，但是依然存在信息缺失的问题。
3. 边在训练期间不会更新。

## 改进

**1. 针对[1]：使用 Voronoi 面确定邻居以及边和键的关系**（参考 Ward 的 Voronoi 面改进法）。

**2. 针对[2]：卷积函数的改进**，在
$$
v_{i}^{(t+1)} = v_{i}^{(t)} + \sum_{j,k} \sigma\bigl( z_{(i,j)_{k}}^{(t)} W_{1}^{(t)} + b_{1}^{(t)} \bigr) \odot g \bigl( z_{(i,j)_{k}}^{(t)} W_{2}^{(t)} + b_{2}^{(t)} \bigr)
$$
中加入邻居的邻居卷积，即加入函数：
$$
\sum_{j,l,k,k'} \sigma \left( z'^{(t)}_{(i, j, l)_{k,k'}} W'^{(t)}_{1} + b'^{(t)}_{1} \right) \odot g \left( z'^{(t)}_{(i, j, l)_{k,k'}} W'^{(t)}_{2} + b'^{(t)}_{2} \right)
$$
其中 $z'^{(t)}_{(i, j, l)_{k,k'}} = v^{(t)}_{i} \oplus v^{(t)}_{j} \oplus v^{(t)}_{l} \oplus u^{(t)}_{(i, j)_k} \oplus u^{(t)}_{(i, l)_{k'}}$。

**3. 针对[3]：构造边的卷积**
$$
\begin{aligned} u_{(i,j)_k}^{(t+1)} ={}& u_{i}^{(t)} + \sigma\bigl( z_{(i,j)_{k}}^{(t)} W_{1}^{(t)} + b_{1}^{(t)} \bigr) \odot g \bigl( z_{(i,j)_{k}}^{(t)} W_{2}^{(t)} + b_{2}^{(t)} \bigr) \\ &+ \sum_{l,k'} \sigma \left( z'^{(t)}_{(i, j, l)_{k,k'}} W'^{(t)}_{1} + b'^{(t)}_{1} \right) \odot g \left( z'^{(t)}_{(i, j, l)_{k,k'}} W'^{(t)}_{2} + b'^{(t)}_{2} \right) \end{aligned}
$$

## 实验

主要通过与 CGCNN 对比，预测热力学稳定性，以及高通量筛选稳定的 $ThCr_2Si_2$ 材料实验。
