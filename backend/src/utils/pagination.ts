export type PaginationParams = {
  page?: number;
  limit?: number;
};

export function getPagination({ page = 1, limit = 10 }: PaginationParams) {
  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    skip: (normalizedPage - 1) * normalizedLimit,
    take: normalizedLimit
  };
}
