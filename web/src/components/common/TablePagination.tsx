import React from 'react';

interface TablePaginationProps {
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
  };
}

export function TablePagination({ pagination }: TablePaginationProps) {
  const totalPages = Math.ceil(pagination.totalItems / pagination.pageSize);
  
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Table pagination">
      <ul className="pagination justify-content-center">
        <li className={`page-item ${pagination.currentPage === 1 ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
          >
            Previous
          </button>
        </li>
        
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <li key={page} className={`page-item ${page === pagination.currentPage ? 'active' : ''}`}>
            <button
              className="page-link"
              onClick={() => pagination.onPageChange(page)}
            >
              {page}
            </button>
          </li>
        ))}
        
        <li className={`page-item ${pagination.currentPage === totalPages ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === totalPages}
          >
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}