import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/hooks/useTheme";
import { updateArtistPolicy, getArtistPolicy, type ArtistPolicy } from "@/api";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";

type Props = {
  artistId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function DepositPolicyModal({ artistId, open, onClose, onSuccess }: Props) {
  const { getToken } = useAuth();
  const { theme } = useTheme();
  const isLightTheme = theme === "light";
  
  const [loading, setLoading] = useState(false);
  const [policy, setPolicy] = useState<NonNullable<ArtistPolicy["deposit"]>>({
    mode: "percent",
    percent: 0.2,
    amountCents: 5000,
    minCents: 5000,
    maxCents: 30000,
    nonRefundable: true,
    cutoffHours: 48,
  });

  const loadPolicy = useCallback(async () => {
    try {
      const current = await getArtistPolicy(artistId);
      if (current?.deposit) {
        setPolicy(current.deposit as NonNullable<ArtistPolicy["deposit"]>);
      }
    } catch (err) {
      console.error("Failed to load policy:", err);
    }
  }, [artistId]);

  useEffect(() => {
    if (open) {
      loadPolicy();
    }
  }, [open, loadPolicy]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      await updateArtistPolicy(artistId, policy, undefined, token);
      toast.success("Deposit policy saved successfully");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save deposit policy");
    } finally {
      setLoading(false);
    }
  };

  const depositConfigured = 
    (policy.mode === "flat" && (policy.amountCents ?? 0) > 0) ||
    (policy.mode === "percent" && (policy.percent ?? 0) > 0 && (policy.minCents ?? 0) > 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md"
        style={{
          background: isLightTheme ? "#ffffff" : "var(--card)",
          color: isLightTheme ? "#000000" : "var(--fg)",
        }}
      >
        <DialogHeader>
          <DialogTitle>Set Deposit Policy</DialogTitle>
          <DialogDescription>
            Configure your deposit requirements before offering appointments to clients.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Deposit Type</Label>
            <Select
              value={policy.mode}
              onValueChange={(value: "percent" | "flat") => {
                setPolicy({ ...policy, mode: value });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percentage</SelectItem>
                <SelectItem value="flat">Flat Fee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {policy.mode === "percent" ? (
            <>
              <div className="space-y-2">
                <Label>Percentage (0-100%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={policy.percent ? (policy.percent * 100) : ""}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setPolicy({ ...policy, percent: Math.min(1, Math.max(0, val / 100)) });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Minimum Deposit ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={policy.minCents ? (policy.minCents / 100) : ""}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setPolicy({ ...policy, minCents: Math.max(0, Math.round(val * 100)) });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Maximum Deposit ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={policy.maxCents ? (policy.maxCents / 100) : ""}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setPolicy({ ...policy, maxCents: Math.max(0, Math.round(val * 100)) });
                  }}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Flat Deposit Amount ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={policy.amountCents ? (policy.amountCents / 100) : ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setPolicy({ ...policy, amountCents: Math.max(0, Math.round(val * 100)) });
                }}
              />
            </div>
          )}

          {!depositConfigured && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Please configure deposit settings to enable appointments.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !depositConfigured}>
            {loading ? "Saving..." : "Save Policy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}