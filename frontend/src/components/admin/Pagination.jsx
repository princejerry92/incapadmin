import React from 'react';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronDoubleLeftIcon,
    ChevronDoubleRightIcon
} from '@heroicons/react/24/outline';

const Pagination = ({
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    onPageChange,
    onPageSizeChange
}) => {
    if (totalPages <= 1 && totalCount <= pageSize) {
        return (
            <div className="pagination-info">
                Showing {totalCount} results
            </div>
        );
    }

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalCount);

    const getPageNumbers = () => {
        const pages = [];
        const maxPagesToShow = 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="admin-pagination">
            <div className="pagination-info">
                Showing <span>{startItem}-{endItem}</span> of <span>{totalCount}</span> results
            </div>

            <div className="pagination-controls">
                <div className="page-size-selector">
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    >
                        <option value={10}>10 / page</option>
                        <option value={20}>20 / page</option>
                        <option value={50}>50 / page</option>
                        <option value={100}>100 / page</option>
                    </select>
                </div>

                <div className="page-navigation">
                    <button
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        title="First Page"
                    >
                        <ChevronDoubleLeftIcon className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        title="Previous Page"
                    >
                        <ChevronLeftIcon className="h-4 w-4" />
                    </button>

                    <div className="page-numbers">
                        {getPageNumbers().map(number => (
                            <button
                                key={number}
                                onClick={() => onPageChange(number)}
                                className={currentPage === number ? 'active' : ''}
                            >
                                {number}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        title="Next Page"
                    >
                        <ChevronRightIcon className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        title="Last Page"
                    >
                        <ChevronDoubleRightIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
