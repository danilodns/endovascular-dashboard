'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import styles from './table.module.css';

export interface Column<T> {
  header: string;
  accessorKey: keyof T | string;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  searchPlaceholder?: string;
  itemsPerPage?: number;
  emptyMessage?: string;
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  searchKeys,
  searchPlaceholder = 'Buscar...',
  itemsPerPage = 10,
  emptyMessage = 'Nenhum registro encontrado',
}: TableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedData = useMemo(() => {
    let result = [...data];

    if (searchable && searchTerm && searchKeys && searchKeys.length > 0) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(item =>
        searchKeys.some(key => {
          const val = item[key];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(lowerSearch);
        })
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, sortConfig, searchKeys, searchable]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = processedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className={styles.tableContainer}>
      {searchable && (
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={18} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.searchInput}
              aria-label="Buscar na tabela"
            />
          </div>
        </div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col, idx) => {
                const isSortable = col.sortable !== false;
                const isActiveSort = isSortable && sortConfig?.key === col.accessorKey;
                return (
                  <th
                    key={idx}
                    scope="col"
                    className={isSortable ? styles.sortableHeader : ''}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        className={styles.headerBtn}
                        onClick={() => handleSort(col.accessorKey as string)}
                        aria-label={`Ordenar por ${col.header}${
                          isActiveSort
                            ? sortConfig?.direction === 'asc'
                              ? ' (decrescente)'
                              : ' (crescente)'
                            : ''
                        }`}
                      >
                        <span className={styles.headerContent}>
                          {col.header}
                          {isActiveSort && (
                            <span className={styles.sortIcon}>
                              {sortConfig?.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </span>
                          )}
                        </span>
                      </button>
                    ) : (
                      <span className={styles.headerContent}>{col.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {columns.map((col, colIdx) => (
                    <td key={colIdx}>
                      {col.cell ? col.cell(row) : row[col.accessorKey as keyof T]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className={styles.emptyState}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <Inbox size={28} aria-hidden="true" />
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a{' '}
            {Math.min(currentPage * itemsPerPage, processedData.length)} de{' '}
            {processedData.length} registros
          </span>
          <div className={styles.pageControls}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={styles.pageBtn}
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className={styles.pageCurrent}>Página {currentPage} de {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={styles.pageBtn}
              aria-label="Próxima página"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
