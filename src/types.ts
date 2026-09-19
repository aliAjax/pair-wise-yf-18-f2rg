export type GemStatus = "registered" | "passed" | "pending";
export type BatchStatus = "open" | "rejected" | "submitted";

export interface Gem {
  id: string; // 登记编号
  batchId: string; // 所属批次
  category: string; // 品类
  shape: string; // 轮廓
  weight: number; // 档案克重(ct)
  dimL: number; // 尺寸 长 mm
  dimW: number; // 尺寸 宽 mm
  dimH: number; // 尺寸 高 mm
  clarity: string; // 净度
  color: string; // 颜色
  cut: string; // 切工
  position: string; // 拟镶嵌位(待复核时不占位)
  status: GemStatus;
  reweigh: number | null; // 最近复称值(ct)
  final: number | null; // 计重:复称合格/复核放行后的采用值
  createdAt: string;
  history: string[];
}

export type GemDraft = Omit<
  Gem,
  "batchId" | "status" | "reweigh" | "final" | "createdAt" | "history"
>;

export interface RejectRecord {
  time: string;
  reasons: string[];
}

export interface Batch {
  id: string;
  status: BatchStatus;
  createdAt: string;
  submittedAt: string | null;
  rejects: RejectRecord[];
}

export interface LogEntry {
  time: string;
  text: string;
}

export interface AppState {
  gems: Gem[];
  batches: Batch[];
  logs: LogEntry[];
  orderLimit: number; // 订单总重上限(ct)
  seq: number; // 编号序列
  batchSeq: number;
}

export const UNASSIGNED = "未分配";

export const CATEGORIES = [
  "钻石",
  "红宝石",
  "蓝宝石",
  "祖母绿",
  "尖晶石",
  "帕拉伊巴",
  "其他",
];

export const SHAPES = [
  "圆形",
  "椭圆形",
  "梨形",
  "马眼形",
  "公主方",
  "祖母绿形",
  "垫形",
  "心形",
  "雷迪恩形",
  "阿斯切形",
];

export const CLARITIES = [
  "FL",
  "IF",
  "VVS1",
  "VVS2",
  "VS1",
  "VS2",
  "SI1",
  "SI2",
  "I1",
  "肉眼干净",
  "微瑕",
  "明显包体",
];

export const CUTS = ["EX", "VG", "G", "F", "P"];

export const COLOR_SUGGEST = [
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "鸽血红",
  "皇家蓝",
  "矢车菊蓝",
  "沃顿绿",
  "艳粉",
  "帕帕拉恰",
  "金黄",
];

export const POSITIONS = [
  "主石",
  "副石1",
  "副石2",
  "副石3",
  "副石4",
  "副石5",
  "副石6",
  "副石7",
  "副石8",
  "臂石·左1",
  "臂石·左2",
  "臂石·右1",
  "臂石·右2",
];

export const POS_COORDS: Record<string, { x: number; y: number; r: number }> = {
  主石: { x: 300, y: 150, r: 46 },
  副石1: { x: 300, y: 64, r: 16 },
  副石2: { x: 361, y: 89, r: 16 },
  副石3: { x: 386, y: 150, r: 16 },
  副石4: { x: 361, y: 211, r: 16 },
  副石5: { x: 300, y: 236, r: 16 },
  副石6: { x: 239, y: 211, r: 16 },
  副石7: { x: 214, y: 150, r: 16 },
  副石8: { x: 239, y: 89, r: 16 },
  "臂石·左1": { x: 177, y: 214, r: 12 },
  "臂石·左2": { x: 159, y: 249, r: 12 },
  "臂石·右1": { x: 423, y: 214, r: 12 },
  "臂石·右2": { x: 441, y: 249, r: 12 },
};

export const CAT_COLORS: Record<string, string> = {
  钻石: "#dbe7f5",
  红宝石: "#e0455a",
  蓝宝石: "#3b6fd4",
  祖母绿: "#2fae6f",
  尖晶石: "#b04fd0",
  帕拉伊巴: "#35c4c9",
  其他: "#c9a24b",
};

export const STATUS_LABEL: Record<GemStatus, string> = {
  registered: "已登记",
  passed: "复称合格",
  pending: "待复核",
};

export const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  open: "登记中",
  rejected: "已拒绝",
  submitted: "已提交",
};
