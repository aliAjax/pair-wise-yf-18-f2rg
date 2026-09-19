import { useMemo, useState } from "react";
import type { AppState, Gem } from "../types";
import {
  BATCH_STATUS_LABEL,
  CATEGORIES,
  POSITIONS,
  SHAPES,
  STATUS_LABEL,
  UNASSIGNED,
} from "../types";
import { batchOf, effWeight, fmt3, fmtDiff, positionTakenBy } from "../store";

interface Props {
  state: AppState;
  onChangePosition: (id: string, pos: string) => void;
  onDelete: (id: string) => void;
  onGotoReweigh: (id: string) => void;
}

interface Filters {
  q: string;
  category: string;
  shape: string;
  status: string;
  batch: string;
  lMin: string;
  lMax: string;
  wMin: string;
  wMax: string;
  hMin: string;
  hMax: string;
}

const EMPTY: Filters = {
  q: "", category: "", shape: "", status: "", batch: "",
  lMin: "", lMax: "", wMin: "", wMax: "", hMin: "", hMax: "",
};

const inRange = (v: number, min: string, max: string) => {
  if (min !== "" && v < parseFloat(min)) return false;
  if (max !== "" && v > parseFloat(max)) return false;
  return true;
};

export default function GemTable({ state, onChangePosition, onDelete, onGotoReweigh }: Props) {
  const [f, setF] = useState<Filters>(EMPTY);
  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  const rows = useMemo(
    () =>
      state.gems.filter((g) => {
        if (f.q && !g.id.toLowerCase().includes(f.q.toLowerCase())) return false;
        if (f.category && g.category !== f.category) return false;
        if (f.shape && g.shape !== f.shape) return false;
        if (f.status && g.status !== f.status) return false;
        if (f.batch && g.batchId !== f.batch) return false;
        if (!inRange(g.dimL, f.lMin, f.lMax)) return false;
        if (!inRange(g.dimW, f.wMin, f.wMax)) return false;
        if (!inRange(g.dimH, f.hMin, f.hMax)) return false;
        return true;
      }),
    [state.gems, f],
  );

  const posSelect = (g: Gem) => {
    const locked = batchOf(state, g.batchId)?.status === "submitted";
    const disabled = g.status === "pending" || locked;
    return (
      <select
        value={g.position}
        disabled={disabled}
        title={g.status === "pending" ? "待复核宝石不能占用镶嵌位" : locked ? "批次已提交锁定" : ""}
        onChange={(e) => onChangePosition(g.id, e.target.value)}
      >
        <option>{UNASSIGNED}</option>
        {POSITIONS.map((p) => {
          const taker = positionTakenBy(state, p, g.id);
          return (
            <option key={p} value={p} disabled={!!taker}>
              {p}
              {taker ? `(被 ${taker.id} 占用)` : ""}
            </option>
          );
        })}
      </select>
    );
  };

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>LEDGER &amp; SIZE FILTER</p>
          <h2>宝石台账 · 尺寸筛选</h2>
        </div>
        <span className="badge info">{rows.length} / {state.gems.length} 颗</span>
      </div>

      <div className="filter-bar">
        <input placeholder="搜索编号…" value={f.q} onChange={set("q")} />
        <select value={f.category} onChange={set("category")}>
          <option value="">全部品类</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={f.shape} onChange={set("shape")}>
          <option value="">全部轮廓</option>
          {SHAPES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={f.status} onChange={set("status")}>
          <option value="">全部状态</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={f.batch} onChange={set("batch")}>
          <option value="">全部批次</option>
          {state.batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.id}({BATCH_STATUS_LABEL[b.status]})
            </option>
          ))}
        </select>
        <button className="ghost small" onClick={() => setF(EMPTY)}>重置筛选</button>
      </div>

      <div className="filter-bar size-filter">
        <span className="filter-label">尺寸筛选 (mm)</span>
        {(["l", "w", "h"] as const).map((axis) => (
          <span className="range-pair" key={axis}>
            <em>{{ l: "长", w: "宽", h: "高" }[axis]}</em>
            <input
              type="number" step="0.01" placeholder="最小"
              value={f[`${axis}Min` as keyof Filters]} onChange={set(`${axis}Min` as keyof Filters)}
            />
            <i>–</i>
            <input
              type="number" step="0.01" placeholder="最大"
              value={f[`${axis}Max` as keyof Filters]} onChange={set(`${axis}Max` as keyof Filters)}
            />
          </span>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>编号</th><th>批次</th><th>品类</th><th>轮廓</th>
              <th>档案克重</th><th>复称值</th><th>差值</th><th>计重</th>
              <th>尺寸 L×W×H</th><th>净度</th><th>颜色</th><th>切工</th>
              <th>镶嵌位</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={15} className="empty">没有符合条件的宝石</td></tr>
            )}
            {rows.map((g) => {
              const b = batchOf(state, g.batchId);
              const locked = b?.status === "submitted";
              const diff = g.reweigh != null ? g.reweigh - g.weight : null;
              return (
                <tr key={g.id} className={g.status === "pending" ? "row-pending" : ""}>
                  <td><b>{g.id}</b></td>
                  <td>
                    {g.batchId}
                    <span className={`badge bs-${b?.status}`} style={{ marginLeft: 4 }}>
                      {b ? BATCH_STATUS_LABEL[b.status] : "-"}
                    </span>
                  </td>
                  <td>{g.category}</td>
                  <td>{g.shape}</td>
                  <td>{fmt3(g.weight)}</td>
                  <td>{g.reweigh != null ? fmt3(g.reweigh) : "—"}</td>
                  <td className={diff != null && Math.abs(diff) > 0.005 ? "neg" : ""}>
                    {diff != null ? fmtDiff(diff) : "—"}
                  </td>
                  <td>{fmt3(effWeight(g))}</td>
                  <td>{g.dimL}×{g.dimW}×{g.dimH}</td>
                  <td>{g.clarity}</td>
                  <td>{g.color}</td>
                  <td>{g.cut}</td>
                  <td>{posSelect(g)}</td>
                  <td><span className={`badge st-${g.status}`}>{STATUS_LABEL[g.status]}</span></td>
                  <td className="row-actions">
                    {!locked && (
                      <>
                        <button className="small ghost" onClick={() => onGotoReweigh(g.id)}>复称</button>
                        <button className="small danger" onClick={() => onDelete(g.id)}>删除</button>
                      </>
                    )}
                    {locked && <span className="hint">已锁定</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
