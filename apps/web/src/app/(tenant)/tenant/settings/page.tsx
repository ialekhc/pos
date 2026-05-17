'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api/client';
import { resolveCurrencyCode } from '@/lib/utils/currency';

const FIXED_VAT_PERCENT = 13;
const MAX_LOGO_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_LOGO_DIMENSION = 420;
const LOGO_MIME_TYPE_FALLBACK = 'image/png';

type SettingsForm = {
  businessName: string;
  taxRate: number;
  currency: string;
  timezone: string;
  receiptFooter: string;
  logoUrl: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  headerNote: string;
  panVatNumber: string;
};

type SettingsResponse = {
  businessName?: string;
  taxRate?: number;
  currency?: string;
  timezone?: string;
  receiptFooter?: string;
  logoUrl?: string | null;
  receiptConfig?: Record<string, unknown> | null;
};

function readConfigString(config: Record<string, unknown> | null | undefined, key: string) {
  const value = config?.[key];
  return typeof value === 'string' ? value : '';
}

function parseRequestError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Request failed';
  }

  const fallback = error.message || 'Request failed';
  try {
    const parsed = JSON.parse(error.message) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join(', ');
    }
    if (typeof parsed.message === 'string') {
      return parsed.message;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Unable to read selected file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Selected file is not a valid image.'));
    image.src = dataUrl;
  });
}

async function optimizeLogoFile(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file.');
  }

  if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
    throw new Error('Please upload a logo image under 2 MB.');
  }

  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    return originalDataUrl;
  }

  const scale = Math.min(1, MAX_LOGO_DIMENSION / Math.max(width, height));
  if (scale >= 1) {
    return originalDataUrl;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');

  if (!context) {
    return originalDataUrl;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const outputType = file.type === 'image/png' ? 'image/png' : file.type || LOGO_MIME_TYPE_FALLBACK;
  const optimizedDataUrl = canvas.toDataURL(outputType, 0.9);
  return optimizedDataUrl.length < originalDataUrl.length ? optimizedDataUrl : originalDataUrl;
}

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>({
    businessName: '',
    taxRate: FIXED_VAT_PERCENT,
    currency: 'NPR',
    timezone: 'UTC',
    receiptFooter: 'Thank you for shopping with us!',
    logoUrl: '',
    contactPhone: '',
    contactEmail: '',
    contactAddress: '',
    headerNote: '',
    panVatNumber: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiRequest<SettingsResponse>('/settings')
      .then((data) => {
        if (!data) {
          return;
        }

        const receiptConfig =
          data.receiptConfig && typeof data.receiptConfig === 'object' ? data.receiptConfig : null;

        setForm({
          businessName: data.businessName ?? '',
          taxRate: FIXED_VAT_PERCENT,
          currency: resolveCurrencyCode(data.currency),
          timezone: data.timezone ?? 'UTC',
          receiptFooter: data.receiptFooter ?? '',
          logoUrl: data.logoUrl ?? '',
          contactPhone: readConfigString(receiptConfig, 'contactPhone'),
          contactEmail: readConfigString(receiptConfig, 'contactEmail'),
          contactAddress: readConfigString(receiptConfig, 'contactAddress'),
          headerNote: readConfigString(receiptConfig, 'headerNote'),
          panVatNumber: readConfigString(receiptConfig, 'panVatNumber')
        });
      })
      .catch((requestError) => {
        setError(parseRequestError(requestError));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiRequest('/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          ...form,
          taxRate: FIXED_VAT_PERCENT,
          currency: form.currency.trim().toUpperCase(),
          timezone: form.timezone.trim(),
          businessName: form.businessName.trim(),
          receiptFooter: form.receiptFooter.trim(),
          logoUrl: form.logoUrl.trim(),
          receiptConfig: {
            contactPhone: form.contactPhone.trim(),
            contactEmail: form.contactEmail.trim(),
            contactAddress: form.contactAddress.trim(),
            headerNote: form.headerNote.trim(),
            panVatNumber: form.panVatNumber.trim()
          }
        })
      });

      setMessage('Settings saved successfully.');
    } catch (requestError) {
      setError(parseRequestError(requestError));
    } finally {
      setSaving(false);
    }
  };

  const onLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setUploadingLogo(true);
    setError(null);
    setMessage(null);

    try {
      const dataUrl = await optimizeLogoFile(file);
      setForm((state) => ({ ...state, logoUrl: dataUrl }));
      setMessage('Logo uploaded. Save settings to apply this logo in bills.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to process logo file.');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading settings...</p>;
  }

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p> : null}
      {message ? <p className="rounded-md bg-primary/10 p-2 text-sm text-primary">{message}</p> : null}

      <form className="space-y-4" onSubmit={submit}>
        <Card>
          <CardHeader>
            <CardTitle>Business Profile</CardTitle>
            <CardDescription>Core business information shown across the workspace and receipts.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Business Name</label>
              <Input
                placeholder="Sunrise Mart"
                value={form.businessName}
                onChange={(event) =>
                  setForm((state) => ({ ...state, businessName: event.target.value }))
                }
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tax & Region</CardTitle>
            <CardDescription>Configure tax behavior, currency, and local time settings.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">VAT Rate (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.taxRate || ''}
                readOnly
                disabled
              />
              <p className="text-[11px] text-muted-foreground">
                VAT rate is fixed at 13%. During billing, you can choose With VAT or Without VAT per bill.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Currency Code</label>
              <Input
                placeholder="NPR"
                value={form.currency}
                onChange={(event) =>
                  setForm((state) => ({ ...state, currency: event.target.value.toUpperCase() }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Timezone</label>
              <Input
                placeholder="UTC"
                value={form.timezone}
                onChange={(event) => setForm((state) => ({ ...state, timezone: event.target.value }))}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receipt Settings</CardTitle>
            <CardDescription>Customize how your printed bills look for customers.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Logo URL (Optional)</label>
                <Input
                  placeholder="https://example.com/logo.png"
                  value={form.logoUrl}
                  onChange={(event) => setForm((state) => ({ ...state, logoUrl: event.target.value }))}
                />
                <p className="text-[11px] text-muted-foreground">
                  You can paste a logo URL or upload a local image.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Upload Logo</label>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  onChange={onLogoUpload}
                  disabled={uploadingLogo}
                />
                <p className="text-[11px] text-muted-foreground">
                  Max 2 MB. We auto-resize larger logos for clean bill printing.
                </p>
              </div>
            </div>
            {form.logoUrl ? (
              <div className="flex items-center gap-3 rounded-md border bg-muted/20 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.logoUrl}
                  alt="Receipt logo preview"
                  className="h-14 w-14 rounded-md border bg-white object-contain p-1"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">Logo Preview</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {form.logoUrl.startsWith('data:image/') ? 'Uploaded image' : form.logoUrl}
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => setForm((state) => ({ ...state, logoUrl: '' }))}>
                  Clear Logo
                </Button>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Header Note</label>
              <Input
                placeholder="Authorized dealer of genuine parts"
                value={form.headerNote}
                onChange={(event) => setForm((state) => ({ ...state, headerNote: event.target.value }))}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Contact Phone</label>
                <Input
                  placeholder="+977-98XXXXXXXX"
                  value={form.contactPhone}
                  onChange={(event) =>
                    setForm((state) => ({ ...state, contactPhone: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Contact Email</label>
                <Input
                  placeholder="support@yourstore.com"
                  value={form.contactEmail}
                  onChange={(event) =>
                    setForm((state) => ({ ...state, contactEmail: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Vendor PAN / VAT Number</label>
                <Input
                  placeholder="PAN/VAT No."
                  value={form.panVatNumber}
                  onChange={(event) =>
                    setForm((state) => ({ ...state, panVatNumber: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Contact Address</label>
              <Textarea
                rows={2}
                placeholder="Kalanki, Kathmandu, Nepal"
                value={form.contactAddress}
                onChange={(event) =>
                  setForm((state) => ({ ...state, contactAddress: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Receipt Footer</label>
              <Textarea
                rows={3}
                placeholder="Thank you for shopping with us!"
                value={form.receiptFooter}
                onChange={(event) =>
                  setForm((state) => ({ ...state, receiptFooter: event.target.value }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Button disabled={saving || uploadingLogo}>
          {saving ? 'Saving...' : uploadingLogo ? 'Processing Logo...' : 'Save Settings'}
        </Button>
      </form>
    </div>
  );
}
