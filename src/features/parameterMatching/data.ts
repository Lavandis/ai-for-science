export const parameterInputGroups = [
  {
    label: "研究目标",
    value: "在稳定性与效率之间寻找更均衡的实验参数组合"
  },
  {
    label: "输入参数",
    value: "温度区间、样本浓度、反应时长、观测指标权重"
  },
  {
    label: "约束条件",
    value: "总时长不超过 8 小时，关键指标波动低于 5%"
  },
  {
    label: "匹配策略",
    value: "优先保留高可解释性候选，再按综合评分排序"
  }
];

export const recommendedSet = {
  title: "推荐参数组合",
  score: "91%",
  description: "候选 A 在稳定性、效率与约束满足度之间更均衡，适合作为下一轮实验起点。"
};

export const candidates = [
  {
    name: "候选 A",
    match: "91%",
    stability: "高",
    efficiency: "中高",
    note: "综合表现最均衡"
  },
  {
    name: "候选 B",
    match: "86%",
    stability: "中高",
    efficiency: "高",
    note: "效率更高，波动略大"
  },
  {
    name: "候选 C",
    match: "82%",
    stability: "高",
    efficiency: "中",
    note: "更保守的稳定方案"
  }
];
