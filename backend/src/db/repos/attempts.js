/**
 * Per-attempt scrape log lines.
 */
export async function logAttempt(client, row) {
  const { rows } = await client.query(
    `insert into scrape_attempts (
      run_id, attempt_no, duration_ms, outcome, http_status, error_type, detail
    ) values ($1, $2, $3, $4, $5, $6, $7)
    returning *`,
    [
      row.runId,
      row.attemptNo,
      row.durationMs ?? null,
      row.outcome,
      row.httpStatus ?? null,
      row.errorType ?? null,
      row.detail ?? null,
    ]
  );
  return rows[0];
}

export async function listAttemptsForRuns(pool, runIds) {
  if (!runIds.length) return [];
  const { rows } = await pool.query(
    `select * from scrape_attempts
     where run_id = any($1::bigint[])
     order by run_id desc, attempt_no asc`,
    [runIds]
  );
  return rows;
}
