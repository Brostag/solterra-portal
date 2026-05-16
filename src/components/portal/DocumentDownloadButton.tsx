"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface Props {
  docId: string;
}

export default function DocumentDownloadButton({ docId }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/documentos/${docId}`);
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) return;
      window.open(json.url, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDownload}
      disabled={loading}
      className="h-8 w-8 p-0 text-gray-400 hover:text-[#253158]"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    </Button>
  );
}
