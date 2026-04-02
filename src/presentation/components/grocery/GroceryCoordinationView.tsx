import { useEffect, useState } from 'react';
import type { GroceryItem } from '@/domain/types';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { Textarea } from '@/presentation/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Badge } from '@/presentation/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/ui/select';
import { ConfirmationDialog } from '@/presentation/shared/ConfirmationDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/presentation/ui/table';
import { Plus, ShoppingCart, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/export';

interface GroceryCoordinationViewProps {
  groupId: string;
  isAdmin: boolean;
  userEmail: string;
}

type GroceryStatus = 'needed' | 'sourced' | 'purchased';
type StatusFilter = 'all' | GroceryStatus;

const STATUS_CYCLE: Record<GroceryStatus, GroceryStatus> = {
  needed: 'sourced',
  sourced: 'purchased',
  purchased: 'needed',
};

const STATUS_LABELS: Record<GroceryStatus, string> = {
  needed: 'Needed',
  sourced: 'Sourced',
  purchased: 'Purchased',
};

const STATUS_BADGE_CLASS: Record<GroceryStatus, string> = {
  needed: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  sourced: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  purchased: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
};

const UNITS = ['kg', 'g', 'L', 'ml', 'units', 'packs', 'boxes', 'bottles', 'cans', 'loaves'];

interface ItemFormState {
  name: string;
  quantity: string;
  unit: string;
  estimatedCost: string;
  assignedTo: string;
  notes: string;
}

const DEFAULT_FORM: ItemFormState = {
  name: '',
  quantity: '1',
  unit: 'units',
  estimatedCost: '',
  assignedTo: '',
  notes: '',
};

export function GroceryCoordinationView({ groupId, isAdmin, userEmail }: GroceryCoordinationViewProps) {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GroceryItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  const [form, setForm] = useState<ItemFormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [groupId]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.getGroceryItems(groupId);
      setItems(data.items || []);
    } catch {
      toast.error('Failed to load grocery list');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => setForm(DEFAULT_FORM);

  const openEdit = (item: GroceryItem) => {
    setEditTarget(item);
    setForm({
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit,
      estimatedCost: String(item.estimatedCost),
      assignedTo: item.assignedTo ?? '',
      notes: item.notes ?? '',
    });
  };

  const closeEdit = () => {
    setEditTarget(null);
    resetForm();
  };

  const setField = (key: keyof ItemFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    quantity: parseFloat(form.quantity) || 1,
    unit: form.unit,
    estimatedCost: parseFloat(form.estimatedCost) || 0,
    assignedTo: form.assignedTo.trim() || undefined,
    notes: form.notes.trim() || undefined,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createGroceryItem(groupId, buildPayload());
      toast.success('Item added to list');
      setCreateOpen(false);
      resetForm();
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await api.updateGroceryItem(groupId, editTarget.id, buildPayload());
      toast.success('Item updated');
      closeEdit();
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await api.deleteGroceryItem(groupId, deleteConfirm.id);
      toast.success('Item removed');
      setDeleteConfirm({ open: false, id: null });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  const handleToggleStatus = async (item: GroceryItem) => {
    const nextStatus = STATUS_CYCLE[item.status];
    setTogglingId(item.id);
    try {
      await api.updateGroceryItem(groupId, item.id, { status: nextStatus });
      toast.success(`Marked as ${STATUS_LABELS[nextStatus]}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = statusFilter === 'all' ? items : items.filter((i) => i.status === statusFilter);
  const totalCost = items.reduce((sum, i) => sum + (i.estimatedCost || 0), 0);

  const ItemForm = ({
    onSubmit,
    submitLabel,
  }: {
    onSubmit: (e: React.FormEvent) => void;
    submitLabel: string;
  }) => (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="gi-name">Item Name</Label>
        <Input
          id="gi-name"
          value={form.name}
          onChange={(e) => setField('name', e.target.value)}
          placeholder="e.g. Bread"
          required
          disabled={submitting}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="gi-qty">Quantity</Label>
          <Input
            id="gi-qty"
            type="number"
            min="0"
            step="any"
            value={form.quantity}
            onChange={(e) => setField('quantity', e.target.value)}
            required
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gi-unit">Unit</Label>
          <Select value={form.unit} onValueChange={(v) => setField('unit', v)} disabled={submitting}>
            <SelectTrigger id="gi-unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="gi-cost">Estimated Cost (R)</Label>
        <Input
          id="gi-cost"
          type="number"
          min="0"
          step="0.01"
          value={form.estimatedCost}
          onChange={(e) => setField('estimatedCost', e.target.value)}
          placeholder="0.00"
          disabled={submitting}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gi-assigned">Assigned To</Label>
        <Input
          id="gi-assigned"
          value={form.assignedTo}
          onChange={(e) => setField('assignedTo', e.target.value)}
          placeholder="Name or email (optional)"
          disabled={submitting}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gi-notes">Notes</Label>
        <Textarea
          id="gi-notes"
          value={form.notes}
          onChange={(e) => setField('notes', e.target.value)}
          rows={2}
          placeholder="Brand preference, store, etc. (optional)"
          disabled={submitting}
        />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Grocery Coordination
          </CardTitle>
          <Badge variant="outline" className="text-sm font-semibold">
            Total: {formatCurrency(totalCost)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            {(['all', 'needed', 'sourced', 'purchased'] as StatusFilter[]).map((f) => (
              <Button
                key={f}
                variant={statusFilter === f ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs capitalize"
                onClick={() => setStatusFilter(f)}
              >
                {f === 'all' ? 'All' : STATUS_LABELS[f as GroceryStatus]}
              </Button>
            ))}
          </div>

          <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </DialogTrigger>
            {createOpen && (
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Grocery Item</DialogTitle>
                  <DialogDescription>Add an item to the group shopping list</DialogDescription>
                </DialogHeader>
                <ItemForm onSubmit={handleCreate} submitLabel="Add Item" />
              </DialogContent>
            )}
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Loading grocery list...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            {items.length === 0
              ? 'No items yet. Add something to the shopping list.'
              : `No items with status "${statusFilter}".`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty / Unit</TableHead>
                  <TableHead>Est. Cost</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate" title={item.notes}>
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {item.estimatedCost > 0 ? formatCurrency(item.estimatedCost) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.assignedTo || '—'}
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleToggleStatus(item)}
                            disabled={togglingId === item.id}
                            className="focus:outline-none"
                            aria-label={`Status: ${STATUS_LABELS[item.status]}. Click to advance`}
                          >
                            <Badge
                              variant="outline"
                              className={`text-xs cursor-pointer gap-1 transition-opacity ${STATUS_BADGE_CLASS[item.status]} ${togglingId === item.id ? 'opacity-50' : 'hover:opacity-80'}`}
                            >
                              {STATUS_LABELS[item.status]}
                              <ChevronRight className="h-3 w-3 opacity-60" />
                            </Badge>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Click to advance to "{STATUS_LABELS[STATUS_CYCLE[item.status]]}"</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(item)}
                              aria-label="Edit item"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        {isAdmin && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteConfirm({ open: true, id: item.id })}
                                aria-label="Delete item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) closeEdit(); }}>
        {editTarget && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
              <DialogDescription>Update the details for "{editTarget.name}"</DialogDescription>
            </DialogHeader>
            <ItemForm onSubmit={handleUpdate} submitLabel="Save Changes" />
          </DialogContent>
        )}
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmationDialog
        open={deleteConfirm.open}
        onOpenChange={(v) => setDeleteConfirm({ open: v, id: deleteConfirm.id })}
        title="Remove Item"
        description="This item will be permanently removed from the shopping list."
        onConfirm={handleDelete}
        confirmText="Remove"
        variant="destructive"
      />
    </Card>
  );
}
