import type { AppState, Gem } from "../types";
import { CAT_COLORS, POSITIONS, POS_COORDS, UNASSIGNED } from "../types";
import { batchOf, fmt3 } from "../store";

interface Props {
  state: AppState;
}

/** 戒指俯视示意:主石 + 8 围石 + 4 臂石;待复核宝石不占位 */
export default function SettingDiagram({ state }: Props) {
  const occupant = (pos: string): Gem | undefined =>
    state.gems.find(
      (g) => g.position === pos && g.status !== "pending",
    );
  const pendings = state.gems.filter(
    (g) => g.status === "pending" && g.position !== UNASSIGNED,
  );

  return (
    <div className="two-col diagram-layout">
      <section className="panel">
        <div className="heading">
          <div>
            <p>SETTING MAP</p>
            <h2>镶嵌位置示意图</h2>
          </div>
          <span className="badge info">
            {POSITIONS.filter((p) => occupant(p)).length} / {POSITIONS.length} 位已占
          </span>
        </div>
        <svg viewBox="0 0 600 380" className="diagram" role="img">
          {/* 戒臂 */}
          <circle cx="300" cy="300" r="150" fill="none" stroke="#c8d3e2" strokeWidth="26" />
          <circle cx="300" cy="300" r="150" fill="none" stroke="#8fa1bd" strokeWidth="2" />
          <circle cx="300" cy="300" r="163" fill="none" stroke="#e3eaf4" strokeWidth="2" />
          <circle cx="300" cy="300" r="137" fill="none" stroke="#e3eaf4" strokeWidth="2" />
          {/* 镶口底座 */}
          <circle cx="300" cy="150" r="104" fill="#f2f6fb" stroke="#c8d3e2" strokeWidth="2" />

          {POSITIONS.map((pos) => {
            const c = POS_COORDS[pos];
            const g = occupant(pos);
            const locked = g ? batchOf(state, g.batchId)?.status === "submitted" : false;
            const fill = g ? CAT_COLORS[g.category] ?? "#c9a24b" : "#ffffff";
            return (
              <g key={pos} opacity={locked ? 0.55 : 1}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={c.r}
                  fill={fill}
                  stroke={g ? "#33415c" : "#9db0ca"}
                  strokeWidth={g ? 2 : 1.5}
                  strokeDasharray={g ? undefined : "5 4"}
                />
                {g && (
                  <circle
                    cx={c.x - c.r * 0.3}
                    cy={c.y - c.r * 0.3}
                    r={c.r * 0.28}
                    fill="#ffffff"
                    opacity="0.45"
                  />
                )}
                <text
                  x={c.x}
                  y={c.y + (g ? 3 : 3)}
                  textAnchor="middle"
                  fontSize={pos === "主石" ? 13 : 9}
                  fontWeight={700}
                  fill={g ? "#1f2a3d" : "#8fa1bd"}
                >
                  {g ? g.id : pos}
                </text>
                {g && pos === "主石" && (
                  <text x={c.x} y={c.y + 18} textAnchor="middle" fontSize={10} fill="#526071">
                    {g.category} {fmt3(g.weight)}ct
                  </text>
                )}
                {locked && (
                  <text x={c.x} y={c.y - c.r - 4} textAnchor="middle" fontSize={10} fill="#64748b">
                    🔒
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {pendings.length > 0 && (
          <div className="diff-banner bad">
            待复核不占位:{pendings.map((g) => `${g.id}(原拟 ${g.position})`).join("、")}
            ——复核放行后自动回到示意图。
          </div>
        )}
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>POSITIONS</p>
            <h2>镶位清单</h2>
          </div>
        </div>
        <div className="legend">
          {POSITIONS.map((pos) => {
            const g = occupant(pos);
            return (
              <div className={`legend-item ${g ? "filled" : ""}`} key={pos}>
                <span
                  className="dot"
                  style={{ background: g ? CAT_COLORS[g.category] ?? "#c9a24b" : "#e3eaf4" }}
                />
                <b>{pos}</b>
                <span>
                  {g
                    ? `${g.id} · ${g.category} · ${fmt3(g.weight)}ct`
                    : "空闲"}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
