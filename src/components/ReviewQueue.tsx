import type { AppState } from "../types";
import { UNASSIGNED } from "../types";
import { fmt3, fmtDiff } from "../store";

interface Props {
  state: AppState;
  onRelease: (id: string, mode: "adopt" | "keep") => void;
  onGotoReweigh: (id: string) => void;
}

export default function ReviewQueue({ state, onRelease, onGotoReweigh }: Props) {
  const pendings = state.gems.filter((g) => g.status === "pending");

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>PENDING REVIEW</p>
          <h2>待复核队列</h2>
        </div>
        <span className={`badge ${pendings.length ? "bad" : "good"}`}>
          {pendings.length} 颗待复核
        </span>
      </div>
      <p className="hint">
        复称差值超过 0.005ct 的宝石在此等待复核;待复核期间不占用镶嵌位、不计入订单总重。复核放行后,尺寸筛选、镶嵌示意图与订单清单将同步更新。
      </p>
      {pendings.length === 0 ? (
        <div className="empty">✓ 没有待复核的差值,批次可正常提交。</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>编号</th>
                <th>品类 / 轮廓</th>
                <th>档案克重</th>
                <th>复称值</th>
                <th>差值</th>
                <th>拟镶嵌位</th>
                <th>复核处理</th>
              </tr>
            </thead>
            <tbody>
              {pendings.map((g) => {
                const diff = (g.reweigh ?? g.weight) - g.weight;
                return (
                  <tr key={g.id}>
                    <td><b>{g.id}</b></td>
                    <td>{g.category} / {g.shape}</td>
                    <td>{fmt3(g.weight)} ct</td>
                    <td>{g.reweigh != null ? `${fmt3(g.reweigh)} ct` : "—"}</td>
                    <td><span className="badge bad">{fmtDiff(diff)} ct</span></td>
                    <td>
                      {g.position === UNASSIGNED ? UNASSIGNED : g.position}
                      <span className="badge warn" style={{ marginLeft: 6 }}>已释放</span>
                    </td>
                    <td className="row-actions">
                      <button
                        className="primary small"
                        onClick={() => onRelease(g.id, "adopt")}
                        title="以复称值作为计重放行"
                      >
                        放行·采用复称值
                      </button>
                      <button
                        className="small"
                        onClick={() => onRelease(g.id, "keep")}
                        title="维持档案克重放行"
                      >
                        放行·维持档案值
                      </button>
                      <button className="small ghost" onClick={() => onGotoReweigh(g.id)}>
                        重新复称
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
