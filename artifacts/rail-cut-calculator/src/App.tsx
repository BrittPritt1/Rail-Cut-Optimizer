import { type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Calculator,
  Info,
  Plus,
  RefreshCw,
  Ruler,
  Scissors,
  Trash2,
  X,
} from 'lucide-react';
import {
  getListDimensionsQueryKey,
  useCalculateCutPlan,
  useCreateDimension,
  useDeleteDimension,
  useListDimensions,
  type CutPlan,
  type Dimension,
} from '@workspace/api-client-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

const STOCK_LENGTH = 6;

function formatLength(length: number) {
  return `${length.toFixed(3).replace(/\.?0+$/, '')} m`;
}

function formatDate(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'Saved dimension';
  return `Saved ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function LoadingRows() {
  return (
    <div className="space-y-3" aria-label="Loading saved dimensions" data-testid="loading-dimensions">
      {[1, 2, 3].map((item) => (
        <div className="flex items-center gap-4 rounded-xl border border-border/70 bg-card/70 p-4" key={item}>
          <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3 w-36 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-10 w-20 animate-pulse rounded-lg bg-muted" />
        </div>
      ))}
    </div>
  );
}

function BrandMark() {
  return (
    <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-[0_5px_0_hsl(43_55%_43%)]">
      <Ruler className="h-5 w-5 -rotate-45" strokeWidth={2.5} />
      <span className="absolute bottom-1 left-2 h-1 w-1 rounded-full bg-primary-foreground" />
      <span className="absolute bottom-1 left-4 h-1 w-1 rounded-full bg-primary-foreground" />
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="hidden min-h-[100dvh] w-[248px] shrink-0 flex-col bg-sidebar px-5 py-6 text-sidebar-foreground md:flex">
      <div className="flex items-center gap-3 px-2">
        <BrandMark />
        <div>
          <div className="text-[15px] font-extrabold tracking-[-0.03em]">Rail Cut</div>
          <div className="mono mt-0.5 text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/50">Workshop utility</div>
        </div>
      </div>

      <div className="mt-14 px-2">
        <div className="mono mb-3 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/40">Workspace</div>
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent px-3 py-3 text-sm font-semibold text-sidebar-accent-foreground">
          <Calculator className="h-4 w-4 text-sidebar-primary" />
          Cut calculator
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
        </div>
      </div>

      <div className="mt-auto px-2">
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sidebar-primary" />
          <p className="text-[11px] leading-5 text-sidebar-foreground/65">
            All lengths are in metres. Stock rails are fixed at 6 m.
          </p>
        </div>
        <div className="mono border-t border-sidebar-border pt-4 text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/35">
          Precision planning / 01
        </div>
      </div>
    </aside>
  );
}

function MobileHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-sidebar px-5 py-4 text-sidebar-foreground md:hidden">
      <div className="flex items-center gap-3">
        <BrandMark />
        <div className="text-sm font-extrabold tracking-[-0.03em]">Rail Cut</div>
      </div>
      <div className="mono text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/55">6 m stock</div>
    </header>
  );
}

function DimensionRow({
  dimension,
  quantity,
  onQuantityChange,
  onDelete,
  deleting,
}: {
  dimension: Dimension;
  quantity: string;
  onQuantityChange: (value: string) => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="group flex flex-wrap items-center gap-3 rounded-xl border border-border/75 bg-card px-3 py-3 transition-colors hover:border-primary/50 sm:flex-nowrap sm:gap-4 sm:px-4" data-testid={`row-dimension-${dimension.id}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <span className="mono text-[11px] font-medium">{String(dimension.id).padStart(2, '0')}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mono text-[15px] font-medium text-foreground" data-testid={`text-dimension-length-${dimension.id}`}>{formatLength(dimension.length)}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(dimension.createdAt)}</div>
      </div>
      <label className="flex items-center gap-2 sm:ml-auto" htmlFor={`quantity-${dimension.id}`}>
        <span className="mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Qty</span>
        <input
          id={`quantity-${dimension.id}`}
          className="h-10 w-[76px] rounded-lg border border-input bg-background px-3 text-center text-sm font-semibold outline-none transition-[border,box-shadow] placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
          data-testid={`input-quantity-${dimension.id}`}
          inputMode="numeric"
          min="0"
          onChange={(event) => onQuantityChange(event.target.value)}
          placeholder="0"
          type="number"
          value={quantity}
        />
      </label>
      <button
        aria-label={`Delete ${formatLength(dimension.length)} dimension`}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
        data-testid={`button-delete-dimension-${dimension.id}`}
        disabled={deleting}
        onClick={onDelete}
        title="Delete dimension"
        type="button"
      >
        {deleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

function RailVisual({ rail }: { rail: CutPlan['rails'][number] }) {
  const stockLength = STOCK_LENGTH;
  return (
    <div className="rounded-xl border border-border/75 bg-card p-4" data-testid={`card-rail-${rail.railNumber}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="mono flex h-6 w-6 items-center justify-center rounded-md bg-sidebar text-[10px] text-sidebar-foreground">{String(rail.railNumber).padStart(2, '0')}</span>
          <span className="text-sm font-bold">Rail {rail.railNumber}</span>
        </div>
        <span className="mono text-xs text-muted-foreground">{formatLength(rail.waste)} waste</span>
      </div>
      <div className="relative h-9 overflow-hidden rounded-md border border-border bg-muted/60">
        <div className="absolute inset-y-0 left-0 flex" style={{ width: `${Math.min((rail.used / stockLength) * 100, 100)}%` }}>
          {rail.pieces.map((piece, index) => (
            <div
              className="metal-sheen relative flex h-full items-center justify-center border-r border-background/70 text-[9px] font-bold text-foreground/70"
              key={`${piece.dimensionId}-${index}`}
              style={{ width: `${(piece.length / rail.used) * 100}%` }}
              title={`${formatLength(piece.length)} cut`}
            >
              <span className="hidden sm:inline">{formatLength(piece.length)}</span>
            </div>
          ))}
        </div>
        <div className="absolute inset-y-0 right-2 flex items-center">
          <span className="mono text-[9px] text-muted-foreground">{formatLength(STOCK_LENGTH)}</span>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{rail.pieces.length} {rail.pieces.length === 1 ? 'piece' : 'pieces'} placed</span>
        <span className="mono text-foreground">{formatLength(rail.used)} used</span>
      </div>
    </div>
  );
}

function Home() {
  const queryClient = useQueryClient();
  const dimensionsQuery = useListDimensions({ query: { queryKey: getListDimensionsQueryKey() } });
  const createDimension = useCreateDimension();
  const deleteDimension = useDeleteDimension();
  const calculateCutPlan = useCalculateCutPlan();
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [newLength, setNewLength] = useState('');
  const [dimensionError, setDimensionError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const dimensions = dimensionsQuery.data ?? [];
  const requests = useMemo(
    () =>
      dimensions.flatMap((dimension) => {
        const quantity = Number(quantities[dimension.id] ?? 0);
        return Number.isInteger(quantity) && quantity > 0
          ? [{ dimensionId: dimension.id, length: dimension.length, quantity }]
          : [];
      }),
    [dimensions, quantities],
  );

  const totalPieces = requests.reduce((sum, request) => sum + request.quantity, 0);
  const totalRequested = requests.reduce((sum, request) => sum + request.length * request.quantity, 0);
  const plan = calculateCutPlan.data;

  const addDimension = () => {
    const length = Number(newLength);
    if (!newLength || !Number.isFinite(length) || length <= 0 || length > STOCK_LENGTH) {
      setDimensionError('Enter a length greater than 0 and no longer than 6 m.');
      return;
    }
    setDimensionError('');
    setSuccessMessage('');
    createDimension.mutate(
      { data: { length } },
      {
        onSuccess: () => {
          setNewLength('');
          setSuccessMessage('Dimension saved to your workshop set.');
          queryClient.invalidateQueries({ queryKey: getListDimensionsQueryKey() });
        },
        onError: () => setDimensionError('That dimension could not be saved. Try again.'),
      },
    );
  };

  const removeDimension = (dimension: Dimension) => {
    if (!window.confirm(`Delete the ${formatLength(dimension.length)} dimension?`)) return;
    setDeletingId(dimension.id);
    deleteDimension.mutate(
      { id: dimension.id },
      {
        onSuccess: () => {
          setQuantities((current) => {
            const next = { ...current };
            delete next[dimension.id];
            return next;
          });
          setDeletingId(null);
          setSuccessMessage('Dimension removed.');
          queryClient.invalidateQueries({ queryKey: getListDimensionsQueryKey() });
        },
        onError: () => {
          setDeletingId(null);
          setDimensionError('The dimension could not be removed. Try again.');
        },
      },
    );
  };

  const calculate = () => {
    setRequestError('');
    setSuccessMessage('');
    if (dimensions.length === 0) {
      setRequestError('Add at least one saved dimension before calculating.');
      return;
    }
    if (requests.length === 0) {
      setRequestError('Enter a quantity for at least one dimension.');
      return;
    }
    if (totalRequested > 0 && totalRequested > STOCK_LENGTH * 500) {
      setRequestError('This request is larger than the planning limit. Split it into smaller batches.');
      return;
    }
    calculateCutPlan.mutate(
      { data: { requests } },
      {
        onSuccess: () => setSuccessMessage('A lower-waste plan is ready below.'),
        onError: () => setRequestError('The plan could not be calculated. Check your quantities and try again.'),
      },
    );
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="flex min-h-[100dvh]">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <MobileHeader />
          <main className="paper-grid min-h-[calc(100dvh-73px)] px-4 py-6 sm:px-7 sm:py-8 lg:px-10 xl:px-14">
            <div className="mx-auto max-w-[1320px]">
              <header className="fade-up flex flex-col justify-between gap-5 border-b border-border/80 pb-7 lg:flex-row lg:items-end">
                <div>
                  <div className="mono mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Workshop / Cut plan
                  </div>
                  <h1 className="max-w-[700px] text-[clamp(2rem,4vw,3.6rem)] font-extrabold leading-[0.98] tracking-[-0.065em] text-foreground">
                    Cut with a little less guesswork.
                  </h1>
                  <p className="mt-4 max-w-[540px] text-sm leading-6 text-muted-foreground">
                    Load your usual dimensions, set the quantities, and get a clean plan for fixed 6 m aluminium stock.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 self-start lg:self-auto">
                  <div className="rounded-xl border border-border bg-card/80 px-4 py-3">
                    <div className="mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Stock length</div>
                    <div className="mono mt-1 text-lg font-medium">6.000 m</div>
                  </div>
                  <div className="hidden h-14 w-14 items-center justify-center rounded-xl bg-sidebar text-sidebar-foreground sm:flex">
                    <Scissors className="h-6 w-6 text-sidebar-primary" />
                  </div>
                </div>
              </header>

              <section className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                <div className="fade-up fade-up-delay-1 rounded-2xl border border-border bg-card/90 p-5 shadow-[0_14px_36px_hsl(202_32%_17%/0.06)] sm:p-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/25 text-primary-foreground">
                          <Ruler className="h-4 w-4 text-foreground" />
                        </div>
                        <h2 className="text-lg font-extrabold tracking-[-0.04em]">Your dimensions</h2>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">Reusable lengths you reach for on the shop floor.</p>
                    </div>
                    <div className="mono rounded-full bg-muted px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground" data-testid="text-dimension-count">
                      {dimensions.length} saved
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-dashed border-border bg-background/60 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <Plus className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
                        <input
                          aria-label="New dimension length"
                          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
                          data-testid="input-new-dimension"
                          inputMode="decimal"
                          max={STOCK_LENGTH}
                          min="0"
                          onChange={(event) => {
                            setNewLength(event.target.value);
                            setDimensionError('');
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') addDimension();
                          }}
                          placeholder="Add a length, e.g. 2.400"
                          step="0.001"
                          type="number"
                          value={newLength}
                        />
                        <span className="mono text-xs text-muted-foreground">metres</span>
                      </div>
                      <button
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sidebar px-4 text-xs font-bold text-sidebar-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                        data-testid="button-add-dimension"
                        disabled={createDimension.isPending}
                        onClick={addDimension}
                        type="button"
                      >
                        {createDimension.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Add dimension
                      </button>
                    </div>
                    {dimensionError && (
                      <div className="mt-2 flex items-center gap-2 px-1 text-xs text-destructive" data-testid="status-dimension-error">
                        <AlertTriangle className="h-3.5 w-3.5" /> {dimensionError}
                      </div>
                    )}
                  </div>

                  <div className="mt-5">
                    {dimensionsQuery.isLoading ? <LoadingRows /> : dimensionsQuery.isError ? (
                      <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-5" data-testid="status-dimensions-error">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                          <div>
                            <div className="text-sm font-bold">Saved dimensions are unavailable</div>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">Check the connection to your workshop library and retry.</p>
                            <button
                              className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-destructive hover:underline"
                              data-testid="button-retry-dimensions"
                              onClick={() => dimensionsQuery.refetch()}
                              type="button"
                            >
                              <RefreshCw className="h-3.5 w-3.5" /> Retry loading
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : dimensions.length === 0 ? (
                      <div className="rounded-xl border border-border bg-background/70 px-5 py-9 text-center" data-testid="status-dimensions-empty">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
                          <Ruler className="h-5 w-5" />
                        </div>
                        <div className="mt-3 text-sm font-bold">Your cut list starts here</div>
                        <p className="mx-auto mt-1 max-w-[300px] text-xs leading-5 text-muted-foreground">Save a dimension above once, then reuse it for every plan.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5" data-testid="list-dimensions">
                        {dimensions.map((dimension) => (
                          <DimensionRow
                            deleting={deletingId === dimension.id}
                            dimension={dimension}
                            key={dimension.id}
                            onDelete={() => removeDimension(dimension)}
                            onQuantityChange={(value) => {
                              setQuantities((current) => ({ ...current, [dimension.id]: value }));
                              setRequestError('');
                            }}
                            quantity={quantities[dimension.id] ?? ''}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="fade-up fade-up-delay-2 flex flex-col rounded-2xl bg-sidebar p-5 text-sidebar-foreground shadow-[0_16px_36px_hsl(202_35%_12%/0.16)] sm:p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="mono text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">Plan brief</div>
                      <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.06em]">Ready when you are.</h2>
                    </div>
                    <ClipboardList className="h-5 w-5 text-sidebar-primary" />
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-sidebar-border bg-sidebar-border">
                    <div className="bg-sidebar-accent/60 p-4">
                      <div className="mono text-2xl font-medium text-sidebar-primary" data-testid="text-request-piece-count">{totalPieces}</div>
                      <div className="mt-1 text-[11px] text-sidebar-foreground/55">pieces requested</div>
                    </div>
                    <div className="bg-sidebar-accent/60 p-4">
                      <div className="mono text-2xl font-medium text-sidebar-primary" data-testid="text-request-length">{formatLength(totalRequested)}</div>
                      <div className="mt-1 text-[11px] text-sidebar-foreground/55">total length</div>
                    </div>
                  </div>
                  <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-sidebar-foreground/60">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sidebar-primary" />
                    Set a quantity beside each dimension. The planner will group cuts to keep offcuts useful.
                  </div>
                  <div className="mt-auto pt-9">
                    <button
                      className="group flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-sidebar-primary px-4 text-sm font-extrabold text-sidebar-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                      data-testid="button-calculate-plan"
                      disabled={calculateCutPlan.isPending || dimensionsQuery.isLoading}
                      onClick={calculate}
                      type="button"
                    >
                      {calculateCutPlan.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
                      {calculateCutPlan.isPending ? 'Finding the fit…' : 'Calculate cut plan'}
                      {!calculateCutPlan.isPending && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                    </button>
                    {requestError && (
                      <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-red-200" data-testid="status-request-error">
                        <X className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {requestError}
                      </div>
                    )}
                    {successMessage && (
                      <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-sidebar-primary" data-testid="status-success">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {successMessage}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="fade-up fade-up-delay-3 mt-7" data-testid="section-cut-plan">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Output / Cut plan</div>
                    <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.055em]">The cleanest arrangement.</h2>
                  </div>
                  {plan && (
                    <div className="hidden items-center gap-2 text-xs font-semibold text-accent-foreground sm:flex">
                      <CheckCircle2 className="h-4 w-4" /> Plan calculated
                    </div>
                  )}
                </div>
                {!plan ? (
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-card/65 p-7 sm:p-9" data-testid="status-plan-empty">
                    <div className="absolute right-8 top-8 hidden h-20 w-20 rounded-full border border-primary/20 sm:block" />
                    <div className="absolute right-14 top-14 hidden h-8 w-8 rounded-full bg-primary/20 sm:block" />
                    <div className="max-w-[540px]">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Scissors className="h-5 w-5" />
                      </div>
                      <h3 className="mt-5 text-xl font-extrabold tracking-[-0.04em]">Your rails will appear here.</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">Add quantities to the dimensions above, then calculate. You’ll see every rail, cut, and remaining offcut laid out clearly.</p>
                    </div>
                  </div>
                ) : (
                  <div className="fade-up">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-border bg-card px-4 py-4">
                        <div className="mono text-2xl font-medium" data-testid="text-plan-rail-count">{plan.railCount}</div>
                        <div className="mt-1 text-xs text-muted-foreground">stock rails needed</div>
                      </div>
                      <div className="rounded-xl border border-border bg-card px-4 py-4">
                        <div className="mono text-2xl font-medium" data-testid="text-plan-total-requested">{formatLength(plan.totalRequested)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">material in cuts</div>
                      </div>
                      <div className="rounded-xl border border-primary/40 bg-primary/15 px-4 py-4">
                        <div className="mono text-2xl font-medium" data-testid="text-plan-total-waste">{formatLength(plan.totalWaste)}</div>
                        <div className="mt-1 text-xs text-foreground/65">total offcut</div>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {plan.rails.map((rail) => <RailVisual key={rail.railNumber} rail={rail} />)}
                    </div>
                  </div>
                )}
              </section>

              <footer className="mt-12 flex flex-col gap-2 border-t border-border/80 py-6 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>Built for the quiet part before the saw starts.</span>
                <span className="mono uppercase tracking-[0.12em]">Rail Cut / 6 m stock</span>
              </footer>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
