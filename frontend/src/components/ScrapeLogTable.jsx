/**
 * Expandable scrape runs + attempts log.
 */
import { Fragment, useState } from 'react';
import StatusBadge from './StatusBadge.jsx';

export default function ScrapeLogTable({ runs }) {
  const [open, setOpen] = useState({});
  return (
    <div className="table-wrap">
      <h3>Scrape log</h3>
      <table>
        <thead>
          <tr>
            <th />
            <th>Started</th>
            <th>Trigger</th>
            <th>Outcome</th>
            <th>Attempts</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <Fragment key={run.id}>
              <tr>
                <td>
                  <button type="button" onClick={() => setOpen((o) => ({ ...o, [run.id]: !o[run.id] }))}>
                    {open[run.id] ? '−' : '+'}
                  </button>
                </td>
                <td>{new Date(run.startedAt).toLocaleString()}</td>
                <td>{run.trigger}</td>
                <td>
                  <StatusBadge outcome={run.outcome} />
                </td>
                <td>{run.attempts}</td>
              </tr>
              {open[run.id] &&
                run.attemptRows.map((a) => (
                  <tr key={a.id} className="attempt-row">
                    <td />
                    <td colSpan={4}>
                      #{a.attemptNo} · {a.outcome} · {a.durationMs ?? '—'}ms · {a.errorType || '—'}{' '}
                      {a.detail ? `· ${a.detail}` : ''}
                    </td>
                  </tr>
                ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
