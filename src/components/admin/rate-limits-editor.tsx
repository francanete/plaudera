"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateFeatureRateLimit,
  addFeatureRateLimit,
  deleteFeatureRateLimit,
} from "@/actions/admin";
import type { TierConfig, FeatureRateLimit } from "@/lib/db/schema";

interface RateLimitsEditorProps {
  tiers: TierConfig[];
  limits: FeatureRateLimit[];
}

type EditingState = {
  plan: string;
  feature: string;
  requestsPerDay: number | null;
} | null;

export function RateLimitsEditor({ tiers, limits }: RateLimitsEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<EditingState>(null);
  const [adding, setAdding] = useState(false);
  const [newLimit, setNewLimit] = useState({
    plan: "FREE",
    feature: "",
    requestsPerDay: 50 as number | null,
  });

  // Group limits by feature
  const features = [...new Set(limits.map((l) => l.feature))];

  function handleEdit(limit: FeatureRateLimit) {
    setEditing({
      plan: limit.plan,
      feature: limit.feature,
      requestsPerDay: limit.requestsPerDay,
    });
  }

  function handleSave() {
    if (!editing) return;

    startTransition(async () => {
      const result = await updateFeatureRateLimit(
        editing.plan,
        editing.feature,
        {
          requestsPerDay: editing.requestsPerDay,
        }
      );

      if (result.success) {
        toast.success("Rate limit updated");
        setEditing(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleToggleActive(limit: FeatureRateLimit) {
    startTransition(async () => {
      const result = await updateFeatureRateLimit(limit.plan, limit.feature, {
        isActive: !limit.isActive,
      });

      if (result.success) {
        toast.success(`Rate limit ${limit.isActive ? "disabled" : "enabled"}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(plan: string, feature: string) {
    if (!confirm("Are you sure you want to delete this rate limit?")) return;

    startTransition(async () => {
      const result = await deleteFeatureRateLimit(plan, feature);

      if (result.success) {
        toast.success("Rate limit deleted");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleAdd() {
    if (!newLimit.feature.trim()) {
      toast.error("Feature name is required");
      return;
    }

    startTransition(async () => {
      const result = await addFeatureRateLimit(
        newLimit.plan,
        newLimit.feature.trim().toLowerCase(),
        newLimit.requestsPerDay
      );

      if (result.success) {
        toast.success("Rate limit added");
        setAdding(false);
        setNewLimit({
          plan: "FREE",
          feature: "",
          requestsPerDay: 50,
        });
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">AI Rate Limits</h2>
          <p className="text-muted-foreground text-sm">
            Configure daily AI request limits per plan
          </p>
        </div>
        <Button onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="mr-2 h-4 w-4" />
          Add Rate Limit
        </Button>
      </div>

      {adding && (
        <div className="bg-muted/50 rounded-lg border p-4">
          <h3 className="mb-4 font-medium">Add New Rate Limit</h3>
          <div className="grid grid-cols-4 gap-4">
            <Select
              value={newLimit.plan}
              onValueChange={(v: string) =>
                setNewLimit({ ...newLimit, plan: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiers.map((tier) => (
                  <SelectItem key={tier.plan} value={tier.plan}>
                    {tier.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Feature name (e.g., ai)"
              value={newLimit.feature}
              onChange={(e) =>
                setNewLimit({ ...newLimit, feature: e.target.value })
              }
            />

            <Input
              type="number"
              placeholder="Per day (empty = unlimited)"
              value={newLimit.requestsPerDay ?? ""}
              onChange={(e) =>
                setNewLimit({
                  ...newLimit,
                  requestsPerDay: e.target.value
                    ? parseInt(e.target.value)
                    : null,
                })
              }
            />

            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={isPending}>
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={() => setAdding(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {features.map((feature) => (
        <div key={feature} className="rounded-lg border">
          <div className="bg-muted/50 border-b px-4 py-2">
            <Badge variant="outline" className="text-sm font-medium">
              {feature}
            </Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Plan</TableHead>
                <TableHead>Requests/Day</TableHead>
                <TableHead className="w-24">Active</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((tier) => {
                const limit = limits.find(
                  (l) => l.plan === tier.plan && l.feature === feature
                );
                const isEditing =
                  editing?.plan === tier.plan && editing?.feature === feature;

                if (!limit) return null;

                return (
                  <TableRow key={`${tier.plan}-${feature}`}>
                    <TableCell className="font-medium">
                      {tier.displayName}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          className="w-24"
                          placeholder="Unlimited"
                          value={editing.requestsPerDay ?? ""}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              requestsPerDay: e.target.value
                                ? parseInt(e.target.value)
                                : null,
                            })
                          }
                        />
                      ) : limit.requestsPerDay ? (
                        limit.requestsPerDay
                      ) : (
                        <span className="text-muted-foreground">Unlimited</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={limit.isActive}
                        onCheckedChange={() => handleToggleActive(limit)}
                        disabled={isPending}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={handleSave}
                              disabled={isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditing(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(limit)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                handleDelete(limit.plan, limit.feature)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ))}

      {features.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No rate limits configured yet. Add one to get started.
          </p>
        </div>
      )}
    </div>
  );
}
