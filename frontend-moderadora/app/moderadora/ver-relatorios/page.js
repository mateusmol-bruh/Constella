'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ClipboardList, Eye, FilePlus2, FileText, RefreshCw, Search, X } from 'lucide-react';
import Shell from '@/components/Shell';
import AstroLoader from '@/components/AstroLoader';
import { withVisibleLoading } from '@/lib/loading';
import { Notice, Panel } from '@/components/Panel';
import { useSession } from '@/components/SessionProvider';
import { getRelatorios } from '@/lib/api';
import { formatDate } from '@/lib/format';

// A API de moderação utiliza o campo "acao" para identificar o registro.
// A separação é somente visual e não exige mudanças no backend.
const actionNames = {
  RELATORIO_MANUAL: 'Relatório manual',
  ALTERACAO_STATUS_DENUNCIA: 'Atualização de denúncia',
  CRIACAO_CONTEUDO: 'Criação de conteúdo',
  CRIACAO_CONTEUDO_PRO: 'Criação de conteúdo PRO',
  EDICAO_FORUM: 'Edição de fórum',
  EXCLUSAO_FORUM: 'Exclusão de fórum',
};

function actionLabel(acao) {
  if (!acao) return 'Ação de moderação';
  if (actionNames[acao]) return actionNames[acao];
  const words = String(acao).replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function isManualReport(report) {
  return report.acao === 'RELATORIO_MANUAL' || (!report.acao && Boolean(report.titulo));
}

function reportDisplay(report) {
  const description = String(report.descricao || '');
  const manual = isManualReport(report);
  // A API concatena o título e o conteúdo dos relatórios manuais com duas quebras de linha.
  const separator = description.indexOf('\n\n');
  if (manual && report.titulo) return { title: report.titulo, content: description };
  if (manual && separator > 0 && separator <= 100) {
    return {
      title: description.slice(0, separator).trim() || 'Relatório manual',
      content: description.slice(separator + 2).trim(),
    };
  }
  return {
    title: report.auditPending ? 'Ação sem confirmação no servidor' : (manual ? 'Relatório manual' : actionLabel(report.acao)),
    content: description,
  };
}

function RecordSection({ id, title, description, icon: Icon, records, onSelect, emptyMessage }) {
  return (
    <section className="reports-section" aria-labelledby={id}>
      <header className="reports-section-header">
        <span className="reports-section-icon" aria-hidden="true"><Icon size={19} /></span>
        <div className="reports-section-copy">
          <h3 id={id}>{title}</h3>
          <p>{description}</p>
        </div>
        <span className="reports-section-count" aria-label={`${records.length} registros`}>{records.length}</span>
      </header>
      <div className="reports-section-list" role="group" aria-label={title}>
        {records.length === 0 ? (
          <p className="reports-section-empty">{emptyMessage}</p>
        ) : records.map((record) => {
          const display = reportDisplay(record);
          return (
            <button
              key={record.id}
              type="button"
              className={`report-list-entry${record.auditPending ? ' report-list-entry--pending' : ''}`}
              onClick={(event) => onSelect(String(record.id), event.currentTarget)}
              aria-haspopup="dialog"
              aria-label={`Ver detalhes: ${display.title}`}
            >
              <span className="report-entry-body">
                <strong className="report-entry-title">{display.title}</strong>
                <span className="report-entry-date">{formatDate(record.data)}{record.auditPending ? ' · Não confirmado na API' : ''}</span>
              </span>
              <Eye size={18} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ReportModal({ record, onClose }) {
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const display = reportDisplay(record);
  const manual = isManualReport(record);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  function onDialogKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const elements = [...dialogRef.current.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter((element) => element.getClientRects().length > 0);
    if (!elements.length) return;
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="reports-modal-backdrop"
      onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}
    >
      <section
        ref={dialogRef}
        className="reports-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reports-modal-title"
        aria-describedby="reports-modal-date"
        onKeyDown={onDialogKeyDown}
      >
        <header className="reports-modal-heading">
          <div className="reports-modal-heading-copy">
            <span className="reports-modal-kind">{manual ? 'Relatório Manual' : 'Ação de Moderação'}</span>
            <h3 id="reports-modal-title">{display.title}</h3>
            <p id="reports-modal-date">Registrado em {formatDate(record.data)}</p>
          </div>
          <button ref={closeButtonRef} type="button" className="reports-modal-close" onClick={onClose} aria-label="Fechar detalhes do relatório" title="Fechar">
            <X size={21} aria-hidden="true" />
          </button>
        </header>
        <div className="reports-modal-body">
          <div className="reports-modal-meta">
            <span>{manual ? 'Relatório elaborado pela moderadora' : actionLabel(record.acao)}</span>
            <span className="reports-modal-record-id">Registro #{record.id}</span>
          </div>
          <div className="reports-modal-description">
            <h4>Descrição</h4>
            <p>{display.content || 'Sem descrição cadastrada.'}</p>
          </div>
          {record.auditPending && (
            <p className="reports-modal-warning" role="status">
              Este registro está pendente de confirmação. Ele ainda não foi encontrado no histórico retornado pela API.
            </p>
          )}
        </div>
        <footer className="reports-modal-footer">
          <button type="button" className="gradient-button reports-modal-dismiss" onClick={onClose}>Fechar</button>
        </footer>
      </section>
    </div>,
    document.body
  );
}

export default function VerRelatorios() {
  const { session } = useSession();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [reload, setReload] = useState(0);
  const sourceButtonRef = useRef(null);

  const openReport = useCallback((id, sourceButton) => {
    sourceButtonRef.current = sourceButton;
    setSelectedId(id);
  }, []);
  const closeReport = useCallback(() => {
    setSelectedId(null);
    // O foco retorna ao ícone "Ver" depois que o modal é removido.
    requestAnimationFrame(() => sourceButtonRef.current?.isConnected && sourceButtonRef.current.focus());
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    setLoading(true);
    setError('');
    withVisibleLoading(() => getRelatorios(session))
      .then((records) => { if (active) setReports(records); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session, reload]);

  // Atualiza o histórico ao retornar à aba após resolver uma denúncia.
  useEffect(() => {
    if (!session) return;
    const onReturn = () => {
      if (document.visibilityState === 'visible') setReload((value) => value + 1);
    };
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    return () => {
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, [session]);

  const { manualReports, moderationActions } = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const matched = reports.filter((record) => {
      if (!term) return true;
      const display = reportDisplay(record);
      return [display.title, display.content, actionLabel(record.acao), formatDate(record.data)]
        .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(term));
    }).sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
    return {
      manualReports: matched.filter(isManualReport),
      moderationActions: matched.filter((record) => !isManualReport(record)),
    };
  }, [reports, search]);

  const selectedReport = selectedId == null ? null : reports.find((record) => String(record.id) === selectedId);

  return (
    <Shell>
      <Panel title="Ver Relatórios" className="details-panel reports-panel">
        <div className="reports-toolbar">
          <label className="reports-search">
            <Search size={18} aria-hidden="true" />
            <span className="visually-hidden">Pesquisar relatórios e ações</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar relatórios e ações..."
            />
          </label>
          <button
            type="button"
            className="reports-refresh"
            onClick={() => setReload((value) => value + 1)}
            disabled={loading}
            aria-label="Atualizar relatórios e ações"
            title="Atualizar registros"
          >
            <RefreshCw size={18} aria-hidden="true" />
          </button>
        </div>

        <Notice message={error} />
        {loading ? (
          <AstroLoader label="Carregando relatórios e histórico de moderação…" />
        ) : error && reports.length === 0 ? (
          <div className="reports-empty">
            <p>Não foi possível carregar os registros.</p>
            <button type="button" className="reports-try-again" onClick={() => setReload((value) => value + 1)}>Tentar novamente</button>
          </div>
        ) : (
          <>
            {reports.some((record) => record.auditPending) && (
              <p className="audit-alert" role="status">
                Existem ações atualizadas na denúncia, mas ainda não confirmadas pelo histórico retornado pela API.
                Esses avisos são locais desta sessão e não representam registros comprovadamente salvos no banco.
                Use Atualizar para consultar novamente o servidor.
              </p>
            )}
            <div className="reports-sections">
              <RecordSection
                id="reports-manual-title"
                title="Relatórios Manuais"
                description="Documentos elaborados pela moderadora"
                icon={FileText}
                records={manualReports}
                onSelect={openReport}
                emptyMessage={search ? 'Nenhum relatório corresponde à pesquisa.' : 'Ainda não há relatórios manuais.'}
              />
              <RecordSection
                id="reports-actions-title"
                title="Ações de Moderação"
                description="Histórico das ações registradas pela API"
                icon={ClipboardList}
                records={moderationActions}
                onSelect={openReport}
                emptyMessage={search ? 'Nenhuma ação corresponde à pesquisa.' : 'Ainda não há ações registradas para esta moderadora.'}
              />
            </div>
          </>
        )}
        <div className="reports-footer">
          <Link href="/moderadora/painel" className="reports-back">Voltar ao painel</Link>
          <Link href="/moderadora/gerar-relatorio" className="reports-new"><FilePlus2 size={16} /> Gerar novo relatório</Link>
        </div>
      </Panel>
      {selectedReport && <ReportModal record={selectedReport} onClose={closeReport} />}
    </Shell>
  );
}
