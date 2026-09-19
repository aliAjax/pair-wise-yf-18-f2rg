import type { AppState, Batch, Gem, GemDraft } from "./types";
import { UNASSIGNED } from "./types";

/** 复称允差:超过 0.005 ct 必须进入待复核 */
export const TOL = 0.005;
export const LS_KEY = "gemRecheckStation.v1";

export const now = () => new Date().toLocaleString("zh-CN", { hour12: false });
export const fmt3 = (n: number) => n.toFixed(3);
export const fmtDiff = (d: number) => (d > 0 ? "+" : "") + d.toFixed(3);
/** 订单计重:复称合格/放行后采用 final,否则用档案克重 */
export const effWeight = (g: Gem) => g.final ?? g.weight;

const clone = <T,>(v: T): T => structuredClone(v);

function addLog(s: AppState, text: string) {
  s.logs.unshift({ time: now(), text });
  if (s.logs.length > 120) s.logs.length = 120;
}

function batchIdOf(seq: number): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `B${ymd}-${String(seq).padStart(2, "0")}`;
}

function createBatch(s: AppState): Batch {
  const b: Batch = {
    id: batchIdOf(s.batchSeq),
    status: "open",
    createdAt: now(),
    submittedAt: null,
    rejects: [],
  };
  s.batchSeq += 1;
  s.batches.push(b);
  return b;
}

/** 当前作业批次:最后一个未提交的批次(登记中或已拒绝待整改) */
export function currentBatch(s: AppState): Batch | undefined {
  for (let i = s.batches.length - 1; i >= 0; i--) {
    if (s.batches[i].status !== "submitted") return s.batches[i];
  }
  return undefined;
}

export function ensureBatch(s: AppState): Batch {
  return currentBatch(s) ?? createBatch(s);
}

export function batchOf(s: AppState, id: string): Batch | undefined {
  return s.batches.find((b) => b.id === id);
}

/** 镶嵌位占用者:待复核不占位;已提交批次的宝石锁定其位置 */
export function positionTakenBy(
  s: AppState,
  pos: string,
  excludeId?: string,
): Gem | undefined {
  if (pos === UNASSIGNED) return undefined;
  return s.gems.find(
    (g) => g.id !== excludeId && g.position === pos && g.status !== "pending",
  );
}

export interface Result {
  state: AppState;
  ok: boolean;
  msg: string;
}

export function registerGem(prev: AppState, draft: GemDraft): Result {
  const s = clone(prev);
  if (s.gems.some((g) => g.id === draft.id))
    return { state: prev, ok: false, msg: `编号 ${draft.id} 已存在` };
  const taker = positionTakenBy(s, draft.position);
  if (taker)
    return {
      state: prev,
      ok: false,
      msg: `镶嵌位「${draft.position}」已被 ${taker.id} 占用`,
    };
  const batch = ensureBatch(s);
  const gem: Gem = {
    ...draft,
    batchId: batch.id,
    status: "registered",
    reweigh: null,
    final: null,
    createdAt: now(),
    history: [`${now()} 登记入批次 ${batch.id}`],
  };
  s.gems.push(gem);
  s.seq = Math.max(s.seq, parseInt(draft.id.replace(/\D/g, "") || "0", 10) + 1);
  addLog(s, `登记 ${gem.id}(${gem.category}/${gem.shape} ${fmt3(gem.weight)}ct)→ 批次 ${batch.id}`);
  return { state: s, ok: true, msg: `${gem.id} 登记成功,已入 ${batch.id}` };
}

export function reweighGem(prev: AppState, id: string, value: number): Result {
  const s = clone(prev);
  const g = s.gems.find((x) => x.id === id);
  if (!g) return { state: prev, ok: false, msg: "未找到该宝石" };
  const b = batchOf(s, g.batchId);
  if (b?.status === "submitted")
    return { state: prev, ok: false, msg: "所属批次已提交锁定,不能复称" };
  const diff = value - g.weight;
  g.reweigh = value;
  if (Math.abs(diff) > TOL + 1e-9) {
    g.status = "pending";
    g.final = null;
    g.history.push(
      `${now()} 复称 ${fmt3(value)}ct,差值 ${fmtDiff(diff)}ct 超差,转入待复核,镶嵌位「${g.position}」释放`,
    );
    addLog(s, `复称 ${g.id}:${fmt3(value)}ct,差值 ${fmtDiff(diff)}ct → 待复核`);
    return {
      state: s,
      ok: true,
      msg: `${g.id} 差值 ${fmtDiff(diff)}ct 超过 ${fmt3(TOL)}ct,已进入待复核,不再占用镶嵌位`,
    };
  }
  g.status = "passed";
  g.final = value;
  g.history.push(`${now()} 复称 ${fmt3(value)}ct,差值 ${fmtDiff(diff)}ct 在允差内,合格`);
  addLog(s, `复称 ${g.id}:${fmt3(value)}ct,差值 ${fmtDiff(diff)}ct → 合格`);
  return { state: s, ok: true, msg: `${g.id} 复称合格(差值 ${fmtDiff(diff)}ct)` };
}

export function releaseGem(
  prev: AppState,
  id: string,
  mode: "adopt" | "keep",
): Result {
  const s = clone(prev);
  const g = s.gems.find((x) => x.id === id);
  if (!g || g.status !== "pending" || g.reweigh == null)
    return { state: prev, ok: false, msg: "该宝石不在待复核状态" };
  let warn = "";
  if (mode === "adopt") {
    g.final = g.reweigh;
    g.history.push(
      `${now()} 复核放行:采用复称值 ${fmt3(g.reweigh)}ct(档案 ${fmt3(g.weight)}ct)`,
    );
  } else {
    g.final = g.weight;
    g.history.push(
      `${now()} 复核放行:维持档案值 ${fmt3(g.weight)}ct(复称 ${fmt3(g.reweigh)}ct 作废)`,
    );
  }
  g.status = "passed";
  if (g.position !== UNASSIGNED) {
    const taker = positionTakenBy(s, g.position, g.id);
    if (taker) {
      g.history.push(`${now()} 原镶嵌位「${g.position}」已被 ${taker.id} 占用,改为未分配`);
      g.position = UNASSIGNED;
      warn = `;原镶嵌位已被 ${taker.id} 占用,已改为未分配`;
    }
  }
  addLog(
    s,
    `复核放行 ${g.id}:${mode === "adopt" ? `采用复称值 ${fmt3(g.final!)}ct` : "维持档案值"}`,
  );
  return { state: s, ok: true, msg: `${g.id} 已复核放行${warn}` };
}

export function changePosition(prev: AppState, id: string, pos: string): Result {
  const s = clone(prev);
  const g = s.gems.find((x) => x.id === id);
  if (!g) return { state: prev, ok: false, msg: "未找到该宝石" };
  if (g.status === "pending")
    return { state: prev, ok: false, msg: "待复核宝石不能占用镶嵌位" };
  const taker = positionTakenBy(s, pos, id);
  if (taker)
    return { state: prev, ok: false, msg: `镶嵌位「${pos}」已被 ${taker.id} 占用` };
  g.position = pos;
  g.history.push(`${now()} 镶嵌位调整为「${pos}」`);
  return { state: s, ok: true, msg: `${g.id} 镶嵌位已调整为「${pos}」` };
}

export function deleteGem(prev: AppState, id: string): Result {
  const s = clone(prev);
  const g = s.gems.find((x) => x.id === id);
  if (!g) return { state: prev, ok: false, msg: "未找到该宝石" };
  const b = batchOf(s, g.batchId);
  if (b?.status === "submitted")
    return { state: prev, ok: false, msg: "所属批次已提交锁定,不能删除" };
  s.gems = s.gems.filter((x) => x.id !== id);
  addLog(s, `删除 ${id}(${g.category} ${fmt3(g.weight)}ct)`);
  return { state: s, ok: true, msg: `${id} 已删除` };
}

/** 批次提交:存在未复核差值或订单总重超限 → 整批拒绝,宝石记录不变 */
export function submitBatch(prev: AppState): {
  state: AppState;
  ok: boolean;
  reasons: string[];
  batchId: string;
} {
  const s = clone(prev);
  const b = ensureBatch(s);
  const gems = s.gems.filter((g) => g.batchId === b.id);
  const pendings = gems.filter((g) => g.status === "pending");
  const total = gems
    .filter((g) => g.status !== "pending")
    .reduce((sum, g) => sum + effWeight(g), 0);

  const reasons: string[] = [];
  if (pendings.length > 0)
    reasons.push(
      `存在 ${pendings.length} 颗未复核差值:${pendings.map((g) => g.id).join("、")}`,
    );
  if (total > s.orderLimit + 1e-9)
    reasons.push(
      `订单总重 ${fmt3(total)}ct 超过上限 ${fmt3(s.orderLimit)}ct`,
    );

  if (reasons.length > 0) {
    b.status = "rejected";
    b.rejects.unshift({ time: now(), reasons });
    addLog(s, `批次 ${b.id} 提交被拒绝:${reasons.join(";")}`);
    return { state: s, ok: false, reasons, batchId: b.id };
  }

  b.status = "submitted";
  b.submittedAt = now();
  gems.forEach((g) => g.history.push(`${now()} 随批次 ${b.id} 提交,记录锁定`));
  addLog(s, `批次 ${b.id} 提交成功,共 ${gems.length} 颗,总重 ${fmt3(total)}ct`);
  createBatch(s);
  return { state: s, ok: true, reasons: [], batchId: b.id };
}

export function setOrderLimit(prev: AppState, v: number): AppState {
  const s = clone(prev);
  s.orderLimit = v;
  addLog(s, `订单总重上限调整为 ${fmt3(v)}ct`);
  return s;
}

/* ---------- 持久化 ---------- */

export function emptyState(): AppState {
  const s: AppState = {
    gems: [],
    batches: [],
    logs: [],
    orderLimit: 5,
    seq: 1,
    batchSeq: 1,
  };
  createBatch(s);
  return s;
}

export function seedState(): AppState {
  const s = emptyState();
  s.orderLimit = 5;
  const batch = s.batches[0];
  const t = now();
  const mk = (partial: Partial<Gem> & Omit<GemDraft, "id"> & { id: string }): Gem => ({
    batchId: batch.id,
    status: "registered",
    reweigh: null,
    final: null,
    createdAt: t,
    history: [`${t} 登记入批次 ${batch.id}`],
    ...partial,
  });
  s.gems = [
    mk({
      id: "G0001", category: "钻石", shape: "圆形", weight: 1.02,
      dimL: 6.4, dimW: 6.4, dimH: 4.0, clarity: "VVS1", color: "F", cut: "EX",
      position: "主石", status: "passed", reweigh: 1.021, final: 1.021,
    }),
    mk({
      id: "G0002", category: "蓝宝石", shape: "椭圆形", weight: 0.86,
      dimL: 6.0, dimW: 4.0, dimH: 3.1, clarity: "VS1", color: "皇家蓝", cut: "VG",
      position: "副石1",
    }),
    mk({
      id: "G0003", category: "红宝石", shape: "椭圆形", weight: 0.74,
      dimL: 5.8, dimW: 4.1, dimH: 2.9, clarity: "VS2", color: "鸽血红", cut: "VG",
      position: "副石2", status: "pending", reweigh: 0.728,
    }),
    mk({
      id: "G0004", category: "钻石", shape: "圆形", weight: 0.08,
      dimL: 2.7, dimW: 2.7, dimH: 1.6, clarity: "VS2", color: "G", cut: "EX",
      position: "副石3", status: "passed", reweigh: 0.08, final: 0.08,
    }),
    mk({
      id: "G0005", category: "祖母绿", shape: "祖母绿形", weight: 0.95,
      dimL: 6.1, dimW: 4.6, dimH: 3.4, clarity: "微瑕", color: "沃顿绿", cut: "G",
      position: "副石4",
    }),
    mk({
      id: "G0006", category: "钻石", shape: "圆形", weight: 0.05,
      dimL: 2.3, dimW: 2.3, dimH: 1.4, clarity: "SI1", color: "H", cut: "VG",
      position: "臂石·左1",
    }),
    mk({
      id: "G0007", category: "尖晶石", shape: "垫形", weight: 0.66,
      dimL: 5.2, dimW: 4.8, dimH: 3.0, clarity: "肉眼干净", color: "艳粉", cut: "VG",
      position: UNASSIGNED,
    }),
    mk({
      id: "G0008", category: "钻石", shape: "圆形", weight: 0.12,
      dimL: 3.1, dimW: 3.1, dimH: 1.9, clarity: "VVS2", color: "E", cut: "EX",
      position: "副石5", status: "pending", reweigh: 0.114,
    }),
  ];
  s.gems.find((g) => g.id === "G0003")!.history.push(
    `${t} 复称 0.728ct,差值 -0.012ct 超差,转入待复核,镶嵌位「副石2」释放`,
  );
  s.gems.find((g) => g.id === "G0008")!.history.push(
    `${t} 复称 0.114ct,差值 -0.006ct 超差,转入待复核,镶嵌位「副石5」释放`,
  );
  s.seq = 9;
  addLog(s, `复称 G0008:0.114ct,差值 -0.006ct → 待复核`);
  addLog(s, `复称 G0003:0.728ct,差值 -0.012ct → 待复核`);
  addLog(s, `复称 G0001:1.021ct,差值 +0.001ct → 合格`);
  return s;
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const s = JSON.parse(raw) as AppState;
      if (s && Array.isArray(s.gems) && Array.isArray(s.batches)) {
        if (!currentBatch(s)) createBatch(s);
        return s;
      }
    }
  } catch {
    /* 数据损坏时回退到示例 */
  }
  return seedState();
}

export function saveState(s: AppState) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}
