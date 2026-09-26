import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/infrastructure/api';
import { queryKeys } from '@/application/hooks/queries';
import { bookSummary } from '@/domain/loans';

/** The group's loan book plus the actions on it; every change refreshes the book. */
export function useLoanBook(groupId: string) {
  const qc = useQueryClient();
  const key = queryKeys.loans(groupId);
  const query = useQuery({ queryKey: key, queryFn: () => api.getLoans(groupId), staleTime: 30_000 });
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  const request = useMutation({
    mutationFn: (data: Parameters<typeof api.requestLoan>[1]) => api.requestLoan(groupId, data),
    onSuccess: refresh,
  });
  const approve = useMutation({ mutationFn: (loanId: string) => api.approveLoan(loanId), onSuccess: refresh });
  const decline = useMutation({
    mutationFn: ({ loanId, reason }: { loanId: string; reason?: string }) => api.declineLoan(loanId, reason),
    onSuccess: refresh,
  });
  const repay = useMutation({
    mutationFn: ({ loanId, ...data }: { loanId: string; amount: number; paidOn?: string; method?: string }) =>
      api.recordLoanRepayment(loanId, data),
    onSuccess: refresh,
  });

  const loans = query.data?.loans ?? [];
  return {
    loans,
    summary: bookSummary(loans),
    ratePercent: query.data?.ratePercent ?? null,
    activeAdminCount: query.data?.activeAdminCount ?? 1,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    request, approve, decline, repay,
  };
}
