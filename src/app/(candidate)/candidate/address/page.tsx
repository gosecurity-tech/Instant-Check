'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
// Date formatting helper (no date-fns needed)
function formatMonthYear(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormField, FormSection, FormActions, FormError } from '@/components/forms/FormField';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';

import { addressSchema } from '@/lib/validators/domain';
import type { z } from 'zod';

type AddressFormData = z.input<typeof addressSchema>;
import { validateAddressTimeline } from '@/lib/timeline';

import {
  getMyAddresses,
  getSubmissionStatus,
  saveAddress,
  deleteAddress,
} from '../actions';

// ============================================================
// Types
// ============================================================

interface Address {
  id: string;
  candidate_id: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  county: string | null;
  postcode: string;
  country: string;
  date_from: string;
  date_to: string | null;
  is_current: boolean;
  created_at: string;
}

// ============================================================
// Main Component
// ============================================================

export default function CandidateAddressPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
  });

  const isCurrent = watch('isCurrent');

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [addressesData, statusData] = await Promise.all([
          getMyAddresses(),
          getSubmissionStatus(),
        ]);
        setAddresses(addressesData);
        setHasSubmitted(statusData.hasSubmitted);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Handle form submission
  const onSubmit = async (data: AddressFormData) => {
    setSubmitting(true);
    try {
      const result = await saveAddress({
        ...(data as import('@/lib/validators/domain').AddressInput),
        ...(editingId && { id: editingId }),
      });

      if (result.error) {
        alert(`Error: ${result.error}`);
      } else {
        // Refresh addresses list
        const updatedAddresses = await getMyAddresses();
        setAddresses(updatedAddresses);
        reset();
        setIsEditing(false);
        setEditingId(null);
      }
    } catch (err) {
      console.error('Error saving address:', err);
      alert('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setSubmitting(true);
    try {
      const result = await deleteAddress(deleteConfirm);

      if (result.error) {
        alert(`Error: ${result.error}`);
      } else {
        setAddresses(addresses.filter((a) => a.id !== deleteConfirm));
      }
    } catch (err) {
      console.error('Error deleting address:', err);
      alert('An unexpected error occurred');
    } finally {
      setSubmitting(false);
      setDeleteConfirm(null);
    }
  };

  // Handle edit
  const handleEdit = (address: Address) => {
    setEditingId(address.id);
    reset({
      addressLine1: address.address_line_1,
      addressLine2: address.address_line_2 || '',
      city: address.city,
      county: address.county || '',
      postcode: address.postcode,
      country: address.country,
      dateFrom: address.date_from,
      dateTo: address.date_to,
      isCurrent: address.is_current,
    });
    setIsEditing(true);
  };

  // Calculate timeline coverage
  const timeline = validateAddressTimeline(addresses);

  // Read-only view if submitted
  if (hasSubmitted) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Address History</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your submission has been completed. No further changes are allowed.
          </p>
        </div>

        <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-700">
          Your vetting submission is now under review. You will be notified of the outcome via email.
        </div>

        <div className="space-y-4">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardContent className="pt-6">
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-semibold">{address.address_line_1}</span>
                    {address.address_line_2 && (
                      <>
                        <br />
                        <span>{address.address_line_2}</span>
                      </>
                    )}
                  </p>
                  <p>
                    {address.city}
                    {address.county && `, ${address.county}`}
                  </p>
                  <p className="font-mono text-gray-600">{address.postcode}</p>
                  <p className="text-gray-600">{address.country}</p>
                  <p className="text-gray-500">
                    {formatMonthYear(address.date_from)}
                    {' - '}
                    {address.is_current
                      ? 'Present'
                      : formatMonthYear(address.date_to!)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Address History</h1>
        <p className="mt-2 text-sm text-gray-600">
          Provide all addresses for the last 5 years. BS7858 requires a complete history with no gaps.
        </p>
      </div>

      {/* Timeline Coverage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">5-Year Coverage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Coverage Progress</span>
              <span className="font-semibold text-gray-900">{timeline.coveragePercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full transition-all ${
                  timeline.coveragePercent === 100 ? 'bg-green-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${timeline.coveragePercent}%` }}
              />
            </div>
          </div>

          {timeline.gaps.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-600">Gaps detected:</p>
              {timeline.gaps.map((gap, idx) => (
                <p key={idx} className="text-sm text-red-600">
                  {gap.days} days from {gap.from} to {gap.to}
                </p>
              ))}
            </div>
          )}

          {timeline.gaps.length === 0 && addresses.length > 0 && (
            <p className="text-sm text-green-600">Complete 5-year history!</p>
          )}

          {addresses.length === 0 && (
            <p className="text-sm text-gray-500">Add addresses to get started.</p>
          )}
        </CardContent>
      </Card>

      {/* Existing Addresses */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2 text-sm">
                    <p className="font-semibold text-gray-900">{address.address_line_1}</p>
                    {address.address_line_2 && (
                      <p className="text-gray-600">{address.address_line_2}</p>
                    )}
                    <p className="text-gray-600">
                      {address.city}
                      {address.county && `, ${address.county}`}
                    </p>
                    <p className="font-mono text-gray-500">{address.postcode}</p>
                    <p className="text-gray-500">{address.country}</p>
                    <p className="pt-2 text-xs text-gray-500">
                      {formatMonthYear(address.date_from)}
                      {' - '}
                      {address.is_current
                        ? 'Present'
                        : formatMonthYear(address.date_to!)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(address)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteConfirm(address.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      <Card className={!isEditing ? 'border-dashed' : ''}>
        <CardHeader>
          <CardTitle className="text-base">
            {isEditing ? 'Edit Address' : 'Add Address'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormSection title="Address Details">
              <FormField
                label="Address Line 1"
                required
                error={errors.addressLine1?.message}
              >
                <Input
                  placeholder="e.g., 123 Main Street"
                  {...register('addressLine1')}
                />
              </FormField>

              <FormField label="Address Line 2" error={errors.addressLine2?.message}>
                <Input
                  placeholder="e.g., Apartment 4B (optional)"
                  {...register('addressLine2')}
                />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="City" required error={errors.city?.message}>
                  <Input placeholder="e.g., London" {...register('city')} />
                </FormField>

                <FormField label="County" error={errors.county?.message}>
                  <Input placeholder="e.g., Greater London (optional)" {...register('county')} />
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Postcode" required error={errors.postcode?.message}>
                  <Input placeholder="e.g., SW1A 1AA" {...register('postcode')} />
                </FormField>

                <FormField label="Country" required error={errors.country?.message}>
                  <Input
                    placeholder="United Kingdom"
                    defaultValue="United Kingdom"
                    {...register('country')}
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Date Range">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="From" required error={errors.dateFrom?.message}>
                  <Input type="date" {...register('dateFrom')} />
                </FormField>

                <FormField
                  label="To"
                  error={errors.dateTo?.message}
                  description={isCurrent ? 'Not applicable for current address' : undefined}
                >
                  <Input
                    type="date"
                    disabled={isCurrent}
                    {...register('dateTo')}
                  />
                </FormField>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isCurrent"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  {...register('isCurrent')}
                />
                <label htmlFor="isCurrent" className="text-sm font-medium text-gray-700">
                  This is my current address
                </label>
              </div>
            </FormSection>

            <FormActions>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditingId(null);
                  reset();
                }}
              >
                {isEditing ? 'Cancel' : 'Clear'}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? 'Saving...'
                  : editingId
                    ? 'Update Address'
                    : 'Add Address'}
              </Button>
            </FormActions>
          </form>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-6">
        <Link
          href="/candidate/identity"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back
        </Link>

        <Link
          href="/candidate/activity"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Next: Activity History →
        </Link>
      </div>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Address"
        description="Are you sure you want to delete this address? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
