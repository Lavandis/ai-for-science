export const templateInputGroups = [
  {
    label: "目标模板",
    value: "在标准实验模板库中寻找与当前观测最接近的流程模板"
  },
  {
    label: "输入样本特征",
    value: "关键点位置、形态摘要、实验阶段标签、观测指标"
  },
  {
    label: "约束条件",
    value: "优先保留解释性强、历史复现率高的模板"
  },
  {
    label: "匹配策略",
    value: "先按核心特征过滤，再按综合相似度排序"
  }
];

export const recommendedTemplate = {
  title: "推荐模板",
  score: "91%",
  description: "模板 A 在结构相似性与实验适配性之间最均衡，适合作为当前样本的首选模板。"
};

export const candidates = [
  {
    name: "模板 A",
    match: "91%",
    similarity: "高",
    fitness: "中高",
    note: "综合表现最均衡"
  },
  {
    name: "模板 B",
    match: "87%",
    similarity: "高",
    fitness: "中",
    note: "形态相近，但约束适配略弱"
  },
  {
    name: "模板 C",
    match: "83%",
    similarity: "中高",
    fitness: "高",
    note: "适合保守方案对照"
  }
];
