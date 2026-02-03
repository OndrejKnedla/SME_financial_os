'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  FileImage,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface ReceiptUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type ProcessingState = 'idle' | 'uploading' | 'processing' | 'review' | 'saving' | 'error';

interface ExtractedData {
  date?: string;
  amount?: number;
  currency?: 'CZK' | 'PLN' | 'EUR';
  taxRate?: number;
  taxAmount?: number;
  vendorName?: string;
  vendorTaxId?: string;
  description?: string;
  invoiceNumber?: string;
}

export function ReceiptUploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: ReceiptUploadDialogProps) {
  const [state, setState] = useState<ProcessingState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Editable form data
  const [formData, setFormData] = useState<ExtractedData>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories } = trpc.expense.getCategories.useQuery();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  const processOcrMutation = trpc.expense.processOcr.useMutation({
    onSuccess: (result) => {
      setExtractedData(result.extractedData as ExtractedData);
      setFormData(result.extractedData as ExtractedData);
      setConfidence(result.confidence);
      setWarnings(result.warnings);
      setState('review');
    },
    onError: (err) => {
      setError(err.message);
      setState('error');
    },
  });

  const createFromOcrMutation = trpc.expense.createFromOcr.useMutation({
    onSuccess: () => {
      onSuccess();
      handleClose();
    },
    onError: (err) => {
      setError(err.message);
      setState('error');
    },
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }
      // Validate size (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setState('idle');
      setError(null);
    }
  }, []);

  const handleProcess = async () => {
    if (!file) return;

    setState('processing');
    setError(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        processOcrMutation.mutate({
          imageData: base64 || '',
          mimeType: file.type,
          language: 'auto',
        });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to read file');
      setState('error');
    }
  };

  const handleSave = () => {
    if (!formData.amount || !formData.vendorName || !formData.date) {
      setError('Amount, vendor name, and date are required');
      return;
    }

    setState('saving');

    createFromOcrMutation.mutate({
      date: new Date(formData.date),
      amount: formData.amount,
      currency: formData.currency || 'CZK',
      taxRate: formData.taxRate,
      taxAmount: formData.taxAmount,
      vendorName: formData.vendorName,
      vendorTaxId: formData.vendorTaxId,
      description: formData.description,
      categoryId: selectedCategory,
      ocrConfidence: confidence,
    });
  };

  const handleClose = () => {
    setState('idle');
    setFile(null);
    setPreview(null);
    setExtractedData(null);
    setFormData({});
    setConfidence(0);
    setWarnings([]);
    setError(null);
    setSelectedCategory(undefined);
    onOpenChange(false);
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency,
    }).format(amount / 100);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Scan Receipt
          </DialogTitle>
          <DialogDescription>
            Upload a receipt or invoice image and our AI will extract the details.
          </DialogDescription>
        </DialogHeader>

        {/* Upload Area */}
        {state === 'idle' && !file && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors border-muted-foreground/25 hover:border-primary/50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Click to select a receipt image
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Supports JPEG, PNG, GIF, WebP (max 10MB)
            </p>
          </div>
        )}

        {/* Preview */}
        {file && preview && state !== 'review' && (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={preview}
                alt="Receipt preview"
                className="max-h-64 mx-auto rounded-lg border"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileImage className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{file.name}</span>
                <Badge variant="outline" className="text-xs">
                  {(file.size / 1024).toFixed(1)} KB
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Processing State */}
        {state === 'processing' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">
              Analyzing receipt with AI...
            </p>
          </div>
        )}

        {/* Review State */}
        {state === 'review' && (
          <div className="space-y-4">
            {/* Confidence Badge */}
            <div className="flex items-center gap-2">
              <Badge
                variant={confidence > 0.8 ? 'default' : confidence > 0.5 ? 'secondary' : 'destructive'}
              >
                {Math.round(confidence * 100)}% confidence
              </Badge>
              {warnings.length > 0 && (
                <Badge variant="outline" className="text-yellow-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {warnings.length} warning{warnings.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm">
                <ul className="list-disc list-inside text-yellow-800">
                  {warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Editable Form */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date?.split('T')[0] || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (smallest unit) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                />
                {formData.amount && formData.currency && (
                  <p className="text-xs text-muted-foreground">
                    = {formatAmount(formData.amount, formData.currency)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency || 'CZK'}
                  onValueChange={(value) => setFormData({ ...formData, currency: value as 'CZK' | 'PLN' | 'EUR' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CZK">CZK</SelectItem>
                    <SelectItem value="PLN">PLN</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxRate">VAT Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  value={formData.taxRate || ''}
                  onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || undefined })}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="vendorName">Vendor Name *</Label>
                <Input
                  id="vendorName"
                  value={formData.vendorName || ''}
                  onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendorTaxId">Vendor Tax ID</Label>
                <Input
                  id="vendorTaxId"
                  value={formData.vendorTaxId || ''}
                  onChange={(e) => setFormData({ ...formData, vendorTaxId: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            {error}
          </div>
        )}

        {/* Saving State */}
        {state === 'saving' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">
              Saving expense...
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>

          {state === 'idle' && file && (
            <Button onClick={handleProcess}>
              <Sparkles className="mr-2 h-4 w-4" />
              Analyze with AI
            </Button>
          )}

          {state === 'review' && (
            <Button onClick={handleSave} disabled={createFromOcrMutation.isPending}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Save Expense
            </Button>
          )}

          {state === 'error' && file && (
            <Button onClick={handleProcess}>
              Retry
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
