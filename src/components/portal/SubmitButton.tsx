"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
  label: string;
  loadingLabel?: string;
  className?: string;
}

export function SubmitButton({ label, loadingLabel, className }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className={className ?? "bg-[#253158] hover:bg-[#1e305e] text-white"}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingLabel ?? "Guardando..."}
        </>
      ) : (
        label
      )}
    </Button>
  );
}
