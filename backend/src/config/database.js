'use strict';

const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

pool.on('connect', () => logger.debug('PostgreSQL: new client connected'));
pool.on('error', (err) => logger.error('PostgreSQL pool error', { error: err.message }));

/**
 * Execute a parameterized SQL query.
 * @param {string} text  - SQL statement with $1, $2 … placeholders
 * @param {Array}  params - Parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    logger.debug('SQL query executed', { duration: `${Date.now() - start}ms`, rows: result.rowCount });
    return result;
  } catch (err) {
    logger.error('SQL query failed', { error: err.message, query: text });
    throw err;
  }
};

/** Check database connectivity. */
const healthCheck = async () => {
  const result = await query('SELECT NOW()');
  return result.rows[0];
};

module.exports = { pool, query, healthCheck };
