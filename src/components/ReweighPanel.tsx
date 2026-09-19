import { useEffect, useMemo, useState } from "react";
import type { AppState } from "../types";
import { STATUS_LABEL } from "../types";
import { TOL, batchOf, fmt3, fmtDiff } from "../store";

interface Props {
  state: AppState;
  preselect: string | null;
  onReweigh: (id: string, value: number) => void;
  notify: (msg: string) => void;
}

export default function ReweighPanel({ state, preselect, onReweigh, notify }: Props) {
  const candidates = useMemo(
    () =>
      state.gems.filter((g) => {
        const b = batchOf(state, g.batchId);
        return b?.status !== "submitted";
      }),
    [state],
  );
  const [selId, setSelId] = useState("");
  const [value, setValue] = useState("");

  useEffect(() => {
    if (preselect) {
      setSelId(preselect);
      setValue("");
    }
  }, [preselect]);

  const gem = candidates.find((g) => g.id === selId);
  const v = parseFloat(value);
  const diff = gem && !isNaN(v) ? v - gem.weight : null;
  const over = diff != null && Math.abs(diff) > TOL + 1e-9;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gem) return notify("请先选择要复称的宝石");
    if (!(v > 0)) return notify("请输入有效的复称值(ct)");
    onReweigh(gem.id, Math.round(v * 1000) / 1000);
    setValue("");
  };

  return (
    <div className="two-col">
      <form className="panel" onSubmit={submit}>
        <div className="heading">
          <div>
            <p>RE-WEIGHING</p>
            <h2>复称台</h2>
          </div>
          <span className="badge warn">允差 ±{fmt3(TOL)} ct</span>
        </div>

        <label>
          <span>选择宝石(仅未提交批次)</span>
          <select value={selId} onChange={(e) => setSelId(e.target.value)}>
            <option value="">— 请选择 —</option>
            {candidates.map((g) => (
              <option key={g.id} value={g.id}>
                {g.id} · {g.category} · 档案 {fmt3(g.weight)}ct ·{" "}
                {STATUS_LABEL[g.status]}
              </option>
            ))}
          </select>
        </label>

        {gem && (
          <div className="gem-card">
            <div>
              <b>{gem.id}</b> {gem.category} / {gem.shape}
            </div>
            <div className="gem-card-grid">
              <span>档案克重:{fmt3(gem.weight)} ct</span>
              <span>
                尺寸:{gem.dimL}×{gem.dimW}×{gem.dimH} mm
              </span>
              <span>净度/颜色/切工:{gem.clarity} / {gem.color} / {gem.cut}</span>
              <span>拟镶嵌位:{gem.position}</span>
              <span>
                当前状态:
                <i className={`badge st-${gem.status}`}>{STATUS_LABEL[gem.status]}</i>
              </span>
              <span>
                上次复称:{gem.reweigh != null ? `${fmt3(gem.reweigh)} ct` : "—"}
              </span>
            </div>
          </div>
        )}

        <label>
          <span>复称值 (ct)</span>
          <input
            type="number"
            step="0.001"
            min="0"
            placeholder="读取电子秤数值,如 1.021"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>

        {diff != null && gem && (
          <div className={`diff-banner ${over ? "bad" : "good"}`}>
            差值 {fmtDiff(diff)} ct{over
              ? `,超过 ${fmt3(TOL)} ct → 提交后将进入待复核,并释放镶嵌位`
              : ",在允差内 → 复称合格"}
          </div>
        )}

        <div className="actions">
          <button type="submit" className="primary" disabled={!gem}>
            录入复称结果
          </button>
        </div>
      </form>

      <section className="panel">
        <div className="heading">
          <div>
            <p>RECENT LOG</p>
            <h2>操作日志</h2>
          </div>
        </div>
        <div className="log-list">
          {state.logs.length === 0 && <p className="hint">暂无日志</p>}
          {state.logs.slice(0, 18).map((l, i) => (
            <div className="log-item" key={i}>
              <time>{l.time}</time>
              <span>{l.text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
