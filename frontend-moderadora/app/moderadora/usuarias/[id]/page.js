'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useRef, useState } from 'react';
import Shell from '@/components/Shell';
import { Panel, Notice, GradientButton } from '@/components/Panel';
import AstroLoader from '@/components/AstroLoader';
import { getUsuaria, setBanimento } from '@/lib/api';
import { useAdminResource } from '@/lib/useAdminResource';
const date = (v) => (v ? new Date(v).toLocaleString('pt-BR') : '—');
export default function Usuaria() {
  const { id } = useParams(),
    r = useAdminResource(() => getUsuaria(id), id),
    dialog = useRef();
  const [motivo, setMotivo] = useState(''),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [busy, setBusy] = useState(false),
    [target, setTarget] = useState(null);
  const u = r.data;
  function confirm(e) {
    e.preventDefault();
    if (!u || busy) return;
    setTarget(!u.banida);
    setError('');
    setSuccess('');
    dialog.current.showModal();
  }
  async function apply() {
    if (busy || target === null) return;
    setBusy(true);
    setError('');
    try {
      await setBanimento(id, target, motivo);
      dialog.current.close();
      setMotivo('');
      setSuccess(
        target
          ? 'Conta banida. Todas as sessões foram revogadas.'
          : 'Banimento revertido. A usuária pode fazer um novo login.',
      );
      r.reload();
    } catch (e) {
      dialog.current.close();
      setError(e.message);
      r.reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell>
      <Panel title="Detalhes da usuária">
        <Link href="/moderadora/usuarias">Voltar para usuárias</Link>
        <Notice message={error || r.error} />
        <Notice type="success" message={success} />
        {r.loading ? (
          <AstroLoader label="Carregando usuária…" />
        ) : (
          u && (
            <>
              <div className="user-summary">
                <h3>{u.nome}</h3>
                <p>ID: {u.id}</p>
                <span
                  className={'account-status ' + (u.banida ? 'is-banned' : '')}
                >
                  {u.banida ? 'Banida' : 'Permitida'}
                </span>
                <p>
                  {u.verificada ? 'Conta verificada' : 'Conta não verificada'}
                </p>
              </div>
              {u.banimento?.data && (
                <div className="text-card">
                  <h3>Último banimento</h3>
                  <p>{u.banimento.motivo}</p>
                  <p>
                    {date(u.banimento.data)} ·{' '}
                    {u.banimento.responsavel?.nome || 'Moderação'}
                  </p>
                </div>
              )}
              <form className="ban-form" onSubmit={confirm}>
                <label className="form-label">
                  {u.banida ? 'Motivo da reversão' : 'Motivo do banimento'}
                  <textarea
                    required
                    maxLength={1000}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    disabled={busy}
                  />
                </label>
                <GradientButton disabled={busy || !motivo.trim()}>
                  {u.banida ? 'Reverter banimento' : 'Banir usuária'}
                </GradientButton>
              </form>
              <h3>Histórico administrativo</h3>
              {u.historico.length ? (
                u.historico.map((a) => (
                  <article className="text-card" key={a.id}>
                    <strong>
                      {a.acao === 'BANIMENTO_USUARIA'
                        ? 'Banimento'
                        : 'Reversão do banimento'}
                    </strong>
                    <p>{a.descricao}</p>
                    <small>
                      {date(a.data)} · {a.responsavel}
                    </small>
                  </article>
                ))
              ) : (
                <p>Nenhuma ação de banimento registrada.</p>
              )}
            </>
          )
        )}
        <dialog
          ref={dialog}
          className="admin-dialog"
          aria-labelledby="ban-title"
          onCancel={(e) => {
            if (busy) e.preventDefault();
          }}
        >
          <h2 id="ban-title">
            {target ? 'Confirmar banimento' : 'Confirmar reversão'}
          </h2>
          <p>
            {target
              ? 'A conta de ' +
                (u?.nome || 'esta usuária') +
                ' perderá acesso às funcionalidades protegidas e todas as suas sessões serão revogadas. Os históricos serão preservados.'
              : 'A conta poderá acessar o aplicativo após um novo login. As sessões antigas continuarão revogadas.'}
          </p>
          <p className="dialog-reason">Motivo: {motivo}</p>
          <div className="dialog-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => dialog.current.close()}
            >
              Cancelar
            </button>
            <GradientButton
              type="button"
              disabled={busy}
              onClick={() => void apply()}
            >
              {busy ? 'Aplicando…' : 'Confirmar'}
            </GradientButton>
          </div>
        </dialog>
      </Panel>
    </Shell>
  );
}
