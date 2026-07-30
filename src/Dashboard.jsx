import { useState, useEffect, useMemo } from "react";
import { Lock, RefreshCw, AlertTriangle, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { C, STATUS } from "./App";

const AUTH_KEY = "mjc-dashboard-auth";

function nrOrder(nrNumero) {
  const m = /NR-(\d+)/.exec(nrNumero || "");
  return m ? parseInt(m[1], 10) : 999;
}

function formatarData(valor) {
  if (!valor) return "—";
  const d = new Date(valor);
  return isNaN(d) ? valor : d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

// Todas as linhas de um mesmo envio compartilham o mesmo "recebido_em"
// (gravado uma única vez por chamada de doPost), então isso serve como
// identificador de uma inspeção inteira.
function agruparEnvios(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = r.recebido_em;
    if (!map.has(key)) {
      map.set(key, {
        recebidoEm: key,
        empresa: r.empresa,
        unidade: r.unidade,
        inspetor: r.inspetor,
        dataInspecao: r.data_inspecao,
        atende: 0,
        parcial: 0,
        naoAtende: 0,
      });
    }
    const envio = map.get(key);
    if (r.tipo === "item") {
      if (r.status === STATUS.ATENDE) envio.atende++;
      else if (r.status === STATUS.PARCIAL) envio.parcial++;
      else if (r.status === STATUS.NAO_ATENDE) envio.naoAtende++;
    }
  }
  return Array.from(map.values()).sort((a, b) => new Date(b.recebidoEm) - new Date(a.recebidoEm));
}

export default function Dashboard() {
  const [pass, setPass] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [rows, setRows] = useState(null);

  async function carregar(senha) {
    if (!senha) return;
    setLoading(true);
    setErro("");
    try {
      const resp = await fetch(`/api/dashboard?pass=${encodeURIComponent(senha)}`);
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setErro(data.erro || "Não foi possível carregar os dados.");
        setAuthed(false);
        sessionStorage.removeItem(AUTH_KEY);
        return;
      }
      setRows(data.rows);
      setAuthed(true);
      sessionStorage.setItem(AUTH_KEY, senha);
    } catch (e) {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const salva = sessionStorage.getItem(AUTH_KEY);
    if (salva) carregar(salva);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e) {
    e.preventDefault();
    if (!pass.trim()) return;
    carregar(pass);
  }

  const envios = useMemo(() => (rows ? agruparEnvios(rows) : []), [rows]);

  const itensRows = useMemo(() => (rows ? rows.filter((r) => r.tipo === "item" && r.status) : []), [rows]);

  const overall = useMemo(() => {
    let atende = 0,
      parcial = 0,
      naoAtende = 0;
    for (const r of itensRows) {
      if (r.status === STATUS.ATENDE) atende++;
      else if (r.status === STATUS.PARCIAL) parcial++;
      else if (r.status === STATUS.NAO_ATENDE) naoAtende++;
    }
    const total = atende + parcial + naoAtende;
    return {
      totalInspecoes: envios.length,
      totalItens: total,
      pctConformidade: total ? Math.round((atende / total) * 100) : 0,
    };
  }, [itensRows, envios]);

  const porNR = useMemo(() => {
    const map = new Map();
    for (const r of itensRows) {
      if (!map.has(r.nr_numero)) map.set(r.nr_numero, { nr: r.nr_numero, atende: 0, parcial: 0, naoAtende: 0 });
      const e = map.get(r.nr_numero);
      if (r.status === STATUS.ATENDE) e.atende++;
      else if (r.status === STATUS.PARCIAL) e.parcial++;
      else if (r.status === STATUS.NAO_ATENDE) e.naoAtende++;
    }
    return Array.from(map.values())
      .map((e) => {
        const total = e.atende + e.parcial + e.naoAtende;
        return { ...e, total, pctAtende: total ? Math.round((e.atende / total) * 100) : 0 };
      })
      .sort((a, b) => nrOrder(a.nr) - nrOrder(b.nr));
  }, [itensRows]);

  const rankingEmpresas = useMemo(() => {
    const map = new Map();
    for (const r of itensRows) {
      const key = `${r.empresa || "Sem empresa"} · ${r.unidade || "—"}`;
      if (!map.has(key)) map.set(key, { nome: key, naoAtende: 0, total: 0 });
      const e = map.get(key);
      e.total++;
      if (r.status === STATUS.NAO_ATENDE) e.naoAtende++;
    }
    return Array.from(map.values())
      .filter((e) => e.naoAtende > 0)
      .sort((a, b) => b.naoAtende - a.naoAtende)
      .slice(0, 10);
  }, [itensRows]);

  const recentes = envios.slice(0, 10);

  if (!authed) {
    return (
      <div className="max-w-md mx-auto px-5 py-14">
        <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8 }} className="p-6 text-center">
          <div
            style={{ background: C.navy, borderRadius: 999 }}
            className="w-12 h-12 flex items-center justify-center mx-auto mb-3"
          >
            <Lock size={20} color="#fff" />
          </div>
          <h2 className="mjc-display text-lg mb-1" style={{ color: C.navy, fontWeight: 600 }}>
            Área do administrador
          </h2>
          <p className="text-[13px] mb-4" style={{ color: C.inkMuted }}>
            Digite a senha para ver os dados consolidados das inspeções.
          </p>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              autoFocus
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Senha"
              className="mjc-input text-[14px] px-3 py-2.5 rounded text-center"
              style={{ border: `1px solid ${C.line}`, background: C.paperAlt, color: C.ink }}
            />
            <button
              type="submit"
              disabled={loading}
              className="text-[13px] px-4 py-2.5 rounded"
              style={{ background: C.orange, color: "#fff", fontWeight: 600 }}
            >
              {loading ? "Verificando…" : "Entrar"}
            </button>
          </form>
          {erro && (
            <p className="text-[12.5px] mt-3 flex items-center justify-center gap-1.5" style={{ color: C.red }}>
              <AlertTriangle size={13} /> {erro}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-6">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <h2 className="mjc-display text-lg" style={{ color: C.navy, fontWeight: 600 }}>
          Dashboard — dados consolidados
        </h2>
        <button
          onClick={() => carregar(sessionStorage.getItem(AUTH_KEY))}
          disabled={loading}
          className="flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded"
          style={{ border: `1px solid ${C.line}`, color: C.inkMuted }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>

      {rows && rows.length === 0 ? (
        <p className="text-[13.5px]" style={{ color: C.inkMuted }}>
          Nenhuma inspeção enviada ainda.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <SummaryCard label="Inspeções enviadas" value={overall.totalInspecoes} color={C.navy} />
            <SummaryCard label="Itens avaliados" value={overall.totalItens} color={C.navy} />
            <SummaryCard
              label="Conformidade geral"
              value={`${overall.pctConformidade}%`}
              color={overall.pctConformidade >= 80 ? C.green : overall.pctConformidade >= 50 ? C.amber : C.red}
              bg={overall.pctConformidade >= 80 ? C.greenBg : overall.pctConformidade >= 50 ? C.amberBg : C.redBg}
            />
          </div>

          <section style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8 }} className="p-4 md:p-5 mb-6">
            <h3 className="mjc-display text-[13px] uppercase tracking-wider mb-3" style={{ color: C.navy, fontWeight: 600 }}>
              % de conformidade ("Atende") por Norma Regulamentadora
            </h3>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={porNR} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
                  <XAxis dataKey="nr" tick={{ fontSize: 11, fill: C.inkMuted }} interval={0} angle={-45} textAnchor="end" height={60} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: C.inkMuted }} />
                  <Tooltip
                    formatter={(v) => [`${v}%`, "Atende"]}
                    labelFormatter={(label) => `Norma ${label}`}
                    contentStyle={{ fontSize: 12, borderRadius: 6, border: `1px solid ${C.line}` }}
                  />
                  <Bar dataKey="pctAtende" radius={[3, 3, 0, 0]}>
                    {porNR.map((d, i) => (
                      <Cell key={i} fill={d.pctAtende >= 80 ? C.green : d.pctAtende >= 50 ? C.amber : C.red} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8 }} className="p-4 md:p-5 mb-6">
            <h3 className="mjc-display text-[13px] uppercase tracking-wider mb-3" style={{ color: C.navy, fontWeight: 600 }}>
              Empresas com mais itens "Não atende"
            </h3>
            {rankingEmpresas.length === 0 ? (
              <p className="text-[13px]" style={{ color: C.inkMuted }}>
                Nenhum item "Não atende" registrado ainda.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {rankingEmpresas.map((e) => (
                  <div key={e.nome} className="flex items-center gap-3">
                    <div
                      className="flex items-center gap-1.5 text-[12.5px] w-52 shrink-0 truncate"
                      style={{ color: C.ink }}
                      title={e.nome}
                    >
                      <Building2 size={12} style={{ color: C.inkFaint }} /> {e.nome}
                    </div>
                    <div className="flex-1 h-4 rounded overflow-hidden" style={{ background: C.paperAlt }}>
                      <div
                        style={{
                          width: `${Math.min(100, (e.naoAtende / rankingEmpresas[0].naoAtende) * 100)}%`,
                          background: C.red,
                          height: "100%",
                        }}
                      />
                    </div>
                    <span className="mjc-mono text-[12px] w-6 text-right" style={{ color: C.red, fontWeight: 700 }}>
                      {e.naoAtende}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8 }} className="p-4 md:p-5 overflow-x-auto">
            <h3 className="mjc-display text-[13px] uppercase tracking-wider mb-3" style={{ color: C.navy, fontWeight: 600 }}>
              Inspeções recentes
            </h3>
            <table className="w-full text-[12.5px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: C.inkMuted, textAlign: "left" }}>
                  <th className="pb-2 pr-3 font-medium">Empresa</th>
                  <th className="pb-2 pr-3 font-medium">Unidade</th>
                  <th className="pb-2 pr-3 font-medium">Inspetor</th>
                  <th className="pb-2 pr-3 font-medium">Data</th>
                  <th className="pb-2 pr-2 font-medium text-center">Atende</th>
                  <th className="pb-2 pr-2 font-medium text-center">Parcial</th>
                  <th className="pb-2 font-medium text-center">Não atende</th>
                </tr>
              </thead>
              <tbody>
                {recentes.map((e, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td className="py-2 pr-3" style={{ color: C.ink }}>
                      {e.empresa || "—"}
                    </td>
                    <td className="py-2 pr-3" style={{ color: C.ink }}>
                      {e.unidade || "—"}
                    </td>
                    <td className="py-2 pr-3" style={{ color: C.ink }}>
                      {e.inspetor || "—"}
                    </td>
                    <td className="py-2 pr-3 mjc-mono" style={{ color: C.inkMuted }}>
                      {formatarData(e.dataInspecao)}
                    </td>
                    <td className="py-2 pr-2 text-center mjc-mono" style={{ color: C.green, fontWeight: 700 }}>
                      {e.atende}
                    </td>
                    <td className="py-2 pr-2 text-center mjc-mono" style={{ color: C.amber, fontWeight: 700 }}>
                      {e.parcial}
                    </td>
                    <td className="py-2 text-center mjc-mono" style={{ color: C.red, fontWeight: 700 }}>
                      {e.naoAtende}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, bg }) {
  return (
    <div style={{ background: bg || C.paper, border: `1px solid ${C.line}`, borderRadius: 8 }} className="px-3 py-3 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider" style={{ color: C.inkMuted, fontWeight: 600 }}>
        {label}
      </span>
      <span className="mjc-display text-xl" style={{ color, fontWeight: 700 }}>
        {value}
      </span>
    </div>
  );
}
