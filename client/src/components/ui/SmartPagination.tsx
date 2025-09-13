import React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

export interface SmartPaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  siblingCount?: number; // pages on each side
  showFirstLast?: boolean;
  className?: string;
}

export const SmartPagination: React.FC<SmartPaginationProps> = ({
  page,
  totalPages,
  onChange,
  siblingCount = 1,
  showFirstLast = false,
  className,
}) => {
  if (totalPages <= 1) return null;

  const createHandler = (p: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (p !== page && p >= 1 && p <= totalPages) onChange(p);
  };

  const pages: (number | 'ellipsis')[] = [];
  const start = Math.max(2, page - siblingCount);
  const end = Math.min(totalPages - 1, page + siblingCount);

  pages.push(1);
  if (start > 2) pages.push('ellipsis');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages - 1) pages.push('ellipsis');
  if (totalPages > 1) pages.push(totalPages);

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={createHandler(page - 1)}
            className={page === 1 ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>
        {pages.map((p, idx) => (
          <PaginationItem key={idx}>
            {p === 'ellipsis' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink href="#" isActive={p === page} onClick={createHandler(p)}>
                {p}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={createHandler(page + 1)}
            className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
