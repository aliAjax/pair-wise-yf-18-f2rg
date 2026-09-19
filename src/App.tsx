import { useEffect, useRef, useState } from "react";
import "./styles.css";
import type { AppState, GemDraft } from "./types";
import { BATCH_STATUS_LABEL } from "./types";
import {
  currentBatch,
  deleteGem,
  changePosition,
  effWeight,
  emptyState,
  fmt3,
  loadState,
  registerGem,
  releaseGem,
  reweighGem,
  saveState,
  seedState,
  setOrderLimit,
  submitBatch,
} from "./store";
import RegisterForm from "./components/RegisterForm";
import ReweighPanel from "./components/ReweighPanel";
import ReviewQueue from "./components/ReviewQueue";
import GemTable from "./components/GemTable";
import SettingDiagram from "./components/SettingDiagram";
import OrderPanel from "./components/OrderPanel";

type TabKey = "register" | "reweigh" | "review" | "gems" | "diagram" | "order";

const TABS: { k: TabKey; label: string }[] = [
  { k: "register", label: "登记" },
  { k: "reweigh", label: "复称台" },
  { k: "review", label: "待复核" },
  { k: "gems", label: "台账·尺寸筛选" },
  { k: "diagram", label: "镶嵌示意" },
  { k: "order", label: "订单清单" },
];

interface Modal {
  title: string;
  ok: boolean;
  lines: string[];
}

function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [tab, setTab] = useState<TabKey>("register");
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const [reweighPre, setReweighPre] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => saveState(state), [state]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = (msg: string) => setToast(msg);

  const apply = (r: { state: AppState; ok: boolean; msg: string }) => {
    if (r.ok) setState(r.state);
    notify(r.msg);
  };

  const onRegister = (draft: GemDraft) => apply(registerGem(state, draft));
  const onReweigh = (id: string, v: number) => apply(reweighGem(state, id, v));
  const onRelease = (id: string, mode: "adopt" | "keep") =>
    apply(releaseGem(state, id, mode));
  const onChangePosition = (id: string, pos: string) =>
    apply(changePosition(state, id, pos));
  const onDelete = (id: string) => {
    if (window.confirm(`确认删除 ${id}?该操作不可撤销。`))
      apply(deleteGem(state, id));
  };
  const onGotoReweigh = (id: string) => {
    setReweighPre(id);
    setTab("reweigh");
  };

  const onSubmitBatch = () => {
    const r = submitBatch(state);
    setState(r.state);
    if (r.ok) {
      setModal({
        title: `批次 ${r.batchId} 提交成功`,
        ok: true,
        lines: ["全部差值已复核,订单总重未超限。", "该批次记录已锁定,新登记将进入下一批次。"],
      });
    } else {
      setModal({
        title: `批次 ${r.batchId} 已整批拒绝`,
        ok: false,
        lines: [...r.reasons, "所有宝石记录保持不变,整改后可重新提交。"],
      });
    }
  };

  const onExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gem-recheck-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    notify("已导出 JSON 备份");
  };

  const onImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const s = JSON.parse(String(reader.result)) as AppState;
        if (!Array.isArray(s.gems) || !Array.isArray(s.batches))
          throw new Error("bad");
        setState(s);
        notify("导入成功");
      } catch {
        notify("导入失败:文件格式不正确");
      }
    };
    reader.readAsText(file);
  };

  const batch = currentBatch(state);
  const pendingCount = state.gems.filter((g) => g.status === "pending").length;
  const batchGems = state.gems.filter((g) => g.batchId === batch?.id);
  const orderTotal = batchGems
    .filter((g) => g.status !== "pending")
    .reduce((s, g) => s + effWeight(g), 0);

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>宝石分拣复称台</h1>
          <p>纯前端 · 数据仅保存在本机浏览器(localStorage)</p>
        </div>
        <div className="top-actions">
          <button className="ghost" onClick={() => {
            if (window.confirm("载入示例数据将覆盖当前全部数据,继续?")) {
              setState(seedState());
              notify("已载入示例数据");
            }
          }}>示例数据</button>
          <button className="ghost" onClick={onExport}>导出</button>
          <button className="ghost" onClick={() => fileRef.current?.click()}>导入</button>
          <button className="danger" onClick={() => {
            if (window.confirm("清空全部数据?该操作不可撤销。")) {
              setState(emptyState());
              notify("已清空,新建空批次");
            }
          }}>清空</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      <section className="metrics">
        <article>
          <small>当前批次</small>
          <strong className="metric-batch">{batch?.id ?? "-"}</strong>
          <em className={`badge bs-${batch?.status}`}>
            {batch ? BATCH_STATUS_LABEL[batch.status] : "-"}
          </em>
        </article>
        <article>
          <small>批次宝石</small>
          <strong>{batchGems.length}</strong>
          <em>颗</em>
        </article>
        <article className={pendingCount ? "metric-alert" : ""}>
          <small>待复核差值</small>
          <strong>{pendingCount}</strong>
          <em>颗(超 0.005ct)</em>
        </article>
        <article>
          <small>订单计重 / 上限</small>
          <strong>{fmt3(orderTotal)}</strong>
          <em>/ {fmt3(state.orderLimit)} ct</em>
        </article>
      </section>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.k}
            className={tab === t.k ? "active" : ""}
            onClick={() => setTab(t.k)}
          >
            {t.label}
            {t.k === "review" && pendingCount > 0 && (
              <i className="tab-badge">{pendingCount}</i>
            )}
          </button>
        ))}
      </nav>

      {tab === "register" && (
        <RegisterForm state={state} onRegister={onRegister} notify={notify} />
      )}
      {tab === "reweigh" && (
        <ReweighPanel
          state={state}
          preselect={reweighPre}
          onReweigh={onReweigh}
          notify={notify}
        />
      )}
      {tab === "review" && (
        <ReviewQueue state={state} onRelease={onRelease} onGotoReweigh={onGotoReweigh} />
      )}
      {tab === "gems" && (
        <GemTable
          state={state}
          onChangePosition={onChangePosition}
          onDelete={onDelete}
          onGotoReweigh={onGotoReweigh}
        />
      )}
      {tab === "diagram" && <SettingDiagram state={state} />}
      {tab === "order" && (
        <OrderPanel
          state={state}
          onSubmitBatch={onSubmitBatch}
          onSetLimit={(v) => setState(setOrderLimit(state, v))}
          notify={notify}
        />
      )}

      {toast && <div className="toast">{toast}</div>}

      {modal && (
        <div className="modal-mask" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className={modal.ok ? "ok" : "bad"}>{modal.title}</h3>
            <ul>
              {modal.lines.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
            <button className="primary" onClick={() => setModal(null)}>知道了</button>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
