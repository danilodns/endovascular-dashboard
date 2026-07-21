'use client';

import styles from './table.module.css';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

/**
 * Shimmer placeholder that visually mirrors the `Table` component
 * (toolbar + header + rows) so loading state doesn't cause layout shift.
 */
export function TableSkeleton({ rows = 6, columns = 4 }: TableSkeletonProps) {
  return (
    <div className={styles.tableContainer}>
      <div className={styles.toolbar}>
        <div
          className="skeleton"
          style={{ height: '2.25rem', width: '100%', maxWidth: 300, borderRadius: 'var(--radius-md)' }}
        />
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i}>
                  <div className="skeleton" style={{ height: '0.875rem', width: '55%' }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: columns }).map((_, c) => (
                  <td key={c}>
                    <div
                      className="skeleton"
                      style={{ height: '0.875rem', width: c === columns - 1 ? '35%' : '75%' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
