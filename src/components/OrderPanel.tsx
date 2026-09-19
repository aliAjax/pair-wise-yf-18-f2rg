import { useState } from "react";
import type { AppState } from "../types";
import { BATCH_STATUS_LABEL, STATUS_LABEL } from "../types";
import { currentBatch, effWeight, fmt3 } from "../store";

interface Props {
  state: AppState;
  onSubmitBatch: () => void;
  onSetLimit: (v: number) => void;
  notify: (msg: string) => void;
}

export default function OrderPanel({ state, onSubmitBatch, onSetLimit, notify }: Props) {
  const batch = currentBatch(state);
  const gems = state.gems.filter((g) => g.batchId === batch?.id);
  const included = gems.filter((g) => g.status !== "pending");
  const excluded = gems.filter((g) => g.status === "pending");
  const total = included.reduce((s, g) => s + effWeight(g), 0);
  const over = total > state.orderLimit + 1e-9;
  const pct = state.orderLimit > 0 ? Math.min(100, (total / state.orderLimit) * 100) : 0;

  const [limitInput, setLimitInput] = useState(String(state.orderLimit));

  const commitLimit = () => {
    const v = parseFloat(limitInput);
    if (!(v > 0)) {
      notify("上限必须大于 0");
      setLimitInput(String(state.orderLimit));
      return;
    }
    onSetLimit(Math.round(v * 1000) / 1000);
  };

  return (
    <div className="order-layout">
      <section className="panel">
        <div className="heading">
          <div>
            <p>ORDER LIST</p>
            <h2>订单清单 · 批次 {batch?.id ?? "-"}</h2>
          </div>
          <span className={`badge bs-${batch?.status}`}>
            {batch ? BATCH_STATUS_LABEL[batch.status] : "-"}
          </span>
        </div>

        <div className="limit-bar">
          <label>
            <span>订单总重上限 (ct)</span>
            <input
              type="number"
              step="0.001"
              min="0"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              onBlur={commitLimit}
              onKeyDown={(e) => e.key === "Enter" && commitLimit()}
            />
          </label>
          <div className="progress-wrap">
            <div className="progress-info">
              <b className={over ? "neg" : ""}>{fmt3(total)} ct</b>
              <span> / 上限 {fmt3(state.orderLimit)} ct</span>
              {over && <span className="badge bad">超限</span>}
            </div>
            <div className="progress">
              <div
                className={`progress-fill ${over ? "over" : ""}`}
                style={{ width: `${over ? 100 : pct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>编号</th><th>品类</th><th>轮廓</th><th>尺寸</th>
                <th>净度</th><th>颜色</th><th>切工</th>
                <th>镶嵌位</th><th>状态</th><th>计重 (ct)</th>
              </tr>
            </thead>
            <tbody>
              {included.length === 0 && (
                <tr><td colSpan={10} className="empty">当前批次暂无可计入订单的宝石</td></tr>
              )}
              {included.map((g) => (
                <tr key={g.id}>
                  <td><b>{g.id}</b></td>
                  <td>{g.category}</td>
                  <td>{g.shape}</td>
                  <td>{g.dimL}×{g.dimW}×{g.dimH}</td>
                  <td>{g.clarity}</td>
                  <td>{g.color}</td>
                  <td>{g.cut}</td>
                  <td>{g.position}</td>
                  <td><span className={`badge st-${g.status}`}>{STATUS_LABEL[g.status]}</span></td>
                  <td>{fmt3(effWeight(g))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={9}>订单总重(不含待复核)</td>
                <td><b className={over ? "neg" : ""}>{fmt3(total)}</b></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {excluded.length > 0 && (
          <div className="diff-banner bad">
            {excluded.length} 颗待复核未计入订单、不占镶嵌位:
            {excluded.map((g) => g.id).join("、")}
          </div>
        )}

        <div className="actions">
          <button className="primary" onClick={onSubmitBatch} disabled={!batch}>
            提交批次审核
          </button>
          <span className="hint">
            提交校验:① 无未复核差值;② 订单总重 ≤ 上限。任一不满足将整批拒绝,宝石记录保持不变。
          </span>
        </div>
      </section>

      <aside className="panel">
        <div className="heading">
          <div>
            <p>BATCH HISTORY</p>
            <h2>批次记录</h2>
          </div>
        </div>
        <div className="batch-list">
          {[...state.batches].reverse().map((b) => (
            <div className="batch-item" key={b.id}>
              <div>
                <b>{b.id}</b>
                <span className={`badge bs-${b.status}`}>{BATCH_STATUS_LABEL[b.status]}</span>
              </div>
              <small>
                创建于 {b.createdAt}
                {b.submittedAt ? ` · 提交于 ${b.submittedAt}` : ""}
                {` · ${state.gems.filter((g) => g.batchId === b.id).length} 颗`}
              </small>
              {b.rejects.map((r, i) => (
                <div className="reject-box" key={i}>
                  <time>{r.time} 整批拒绝:</time>
                  <ul>
                    {r.reasons.map((x, j) => <li key={j}>{x}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
