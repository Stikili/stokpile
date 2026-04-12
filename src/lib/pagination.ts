/**
 * Client-side pagination helper.
 *
 * Until the Edge Function supports server-side pagination (?page=1&limit=50),
 * this lets components paginate locally from cached data.
 */

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function paginate<T>(
  data: T[],
  page: number = 1,
  pageSize: number = 50,
): PaginatedResult<T> {
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const safePage = Math.max(1, Math.min(page, totalPages || 1));
  const start = (safePage - 1) * pageSize;
  const items = data.slice(start, start + pageSize);

  return {
    items,
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}
