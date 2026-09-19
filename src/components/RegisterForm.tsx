import { useEffect, useState } from "react";
import type { AppState, GemDraft } from "../types";
import {
  CATEGORIES,
  CLARITIES,
  COLOR_SUGGEST,
  CUTS,
  POSITIONS,
  SHAPES,
  UNASSIGNED,
} from "../types";
import { currentBatch, positionTakenBy } from "../store";

interface Props {
  state: AppState;
  onRegister: (draft: GemDraft) => void;
  notify: (msg: string) => void;
}

export default function RegisterForm({ state, onRegister, notify }: Props) {
  const nextId = `G${String(state.seq).padStart(4, "0")}`;
  const [id, setId] = useState(nextId);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [shape, setShape] = useState(SHAPES[0]);
  const [weight, setWeight] = useState("");
  const [dimL, setDimL] = useState("");
  const [dimW, setDimW] = useState("");
  const [dimH, setDimH] = useState("");
  const [clarity, setClarity] = useState(CLARITIES[4]);
  const [color, setColor] = useState("");
  const [cut, setCut] = useState(CUTS[0]);
  const [position, setPosition] = useState(UNASSIGNED);

  useEffect(() => setId(nextId), [nextId]);

  const batch = currentBatch(state);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const gid = id.trim();
    const w = parseFloat(weight);
    const l = parseFloat(dimL);
    const wd = parseFloat(dimW);
    const h = parseFloat(dimH);
    if (!gid) return notify("请填写登记编号");
    if (!/^[A-Za-z0-9-]+$/.test(gid)) return notify("编号仅支持字母、数字、短横线");
    if (!(w > 0)) return notify("档案克重必须大于 0");
    if (!(l > 0) || !(wd > 0) || !(h > 0)) return notify("尺寸(长/宽/高)必须大于 0");
    if (!color.trim()) return notify("请填写颜色");
    onRegister({
      id: gid,
      category,
      shape,
      weight: Math.round(w * 1000) / 1000,
      dimL: l,
      dimW: wd,
      dimH: h,
      clarity,
      color: color.trim(),
      cut,
      position,
    });
    setWeight("");
    setDimL("");
    setDimW("");
    setDimH("");
    setColor("");
    setPosition(UNASSIGNED);
  };

  return (
    <form className="panel" onSubmit={submit}>
      <div className="heading">
        <div>
          <p>GEM REGISTRATION</p>
          <h2>登记宝石</h2>
        </div>
        <span className="badge info">当前批次:{batch?.id ?? "-"}</span>
      </div>
      <div className="field-grid cols-4">
        <label>
          <span>登记编号 *</span>
          <input value={id} onChange={(e) => setId(e.target.value)} />
        </label>
        <label>
          <span>品类 *</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          <span>轮廓 *</span>
          <select value={shape} onChange={(e) => setShape(e.target.value)}>
            {SHAPES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          <span>档案克重 (ct) *</span>
          <input
            type="number"
            step="0.001"
            min="0"
            placeholder="如 1.020"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </label>
        <label>
          <span>尺寸 · 长 (mm) *</span>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={dimL}
            onChange={(e) => setDimL(e.target.value)}
          />
        </label>
        <label>
          <span>尺寸 · 宽 (mm) *</span>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={dimW}
            onChange={(e) => setDimW(e.target.value)}
          />
        </label>
        <label>
          <span>尺寸 · 高 (mm) *</span>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={dimH}
            onChange={(e) => setDimH(e.target.value)}
          />
        </label>
        <label>
          <span>净度 *</span>
          <select value={clarity} onChange={(e) => setClarity(e.target.value)}>
            {CLARITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          <span>颜色 *</span>
          <input
            list="color-suggest"
            placeholder="色级或描述"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <datalist id="color-suggest">
            {COLOR_SUGGEST.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label>
          <span>切工 *</span>
          <select value={cut} onChange={(e) => setCut(e.target.value)}>
            {CUTS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          <span>拟镶嵌位</span>
          <select value={position} onChange={(e) => setPosition(e.target.value)}>
            <option>{UNASSIGNED}</option>
            {POSITIONS.map((p) => {
              const taker = positionTakenBy(state, p);
              return (
                <option key={p} value={p} disabled={!!taker}>
                  {p}
                  {taker ? `(被 ${taker.id} 占用)` : ""}
                </option>
              );
            })}
          </select>
        </label>
        <label>
          <span>批次状态</span>
          <input value={batch ? `${batch.id} · 登记中` : "-"} disabled />
        </label>
      </div>
      <div className="actions">
        <button type="submit" className="primary">
          登记入批次
        </button>
        <span className="hint">
          带 * 为必填;登记后进入「复称台」逐颗复称,差值 &gt; 0.005ct 将自动转入待复核。
        </span>
      </div>
    </form>
  );
}
