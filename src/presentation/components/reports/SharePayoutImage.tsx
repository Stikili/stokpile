// Generate a share-ready 1080x1080 PNG of a group's cycle/year summary,
// using native Canvas — no external libraries. Treasurer downloads and
// posts in the WhatsApp group.

import { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/ui/dialog';
import { Button } from '@/presentation/ui/button';
import { Download, Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SharePayoutImageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    groupName: string;
    period: string; // e.g. "2026" or "Cycle 3 · Jan–Dec 2026"
    totalContributedZar: number;
    totalPaidOutZar: number;
    memberCount: number;
    topContributor?: string;
    headline?: string; // optional celebratory line
  };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const test = current ? current + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else current = test;
  }
  if (current) lines.push(current);
  return lines;
}

function drawCard(canvas: HTMLCanvasElement, data: SharePayoutImageProps['data']) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;

  // Background — warm gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b5b3f');
  bg.addColorStop(1, '#062f20');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Decorative arc
  ctx.beginPath();
  ctx.arc(W - 120, -80, 420, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fill();

  // Brand mark
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 34px "Inter", system-ui, sans-serif';
  ctx.fillText('Stokpile', 72, 110);

  // Period pill
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  const pillW = ctx.measureText(data.period).width + 40;
  ctx.beginPath();
  ctx.roundRect(72, 150, pillW, 48, 24);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px "Inter", system-ui, sans-serif';
  ctx.fillText(data.period, 92, 182);

  // Group name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 58px "Inter", system-ui, sans-serif';
  const nameLines = wrap(ctx, data.groupName, W - 144);
  nameLines.forEach((line, i) => ctx.fillText(line, 72, 280 + i * 68));

  let y = 280 + nameLines.length * 68 + 40;

  // Headline
  if (data.headline) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '24px "Inter", system-ui, sans-serif';
    const headlineLines = wrap(ctx, data.headline, W - 144);
    headlineLines.forEach((line, i) => ctx.fillText(line, 72, y + i * 36));
    y += headlineLines.length * 36 + 40;
  }

  // Stats grid
  const fmt = (n: number) => 'R ' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const stats = [
    { label: 'Contributed', value: fmt(data.totalContributedZar) },
    { label: 'Paid out',    value: fmt(data.totalPaidOutZar) },
    { label: 'Members',     value: String(data.memberCount) },
  ];
  if (data.topContributor) stats.push({ label: 'Top contributor', value: data.topContributor });

  const gridStart = 620;
  const statH = 140;
  stats.forEach((s, i) => {
    const yy = gridStart + i * statH;
    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(72, yy);
    ctx.lineTo(W - 72, yy);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '20px "Inter", system-ui, sans-serif';
    ctx.fillText(s.label.toUpperCase(), 72, yy + 44);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(s.value, W - 72, yy + 56);
    ctx.textAlign = 'left';
  });

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '18px "Inter", system-ui, sans-serif';
  ctx.fillText('stokpile.app', 72, H - 60);
  ctx.textAlign = 'right';
  ctx.fillText(new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long' }), W - 72, H - 60);
  ctx.textAlign = 'left';
}

export function SharePayoutImage({ open, onOpenChange, data }: SharePayoutImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    setLoading(true);
    // Defer to ensure fonts are ready
    const t = setTimeout(() => {
      drawCard(canvasRef.current!, data);
      setLoading(false);
    }, 50);
    return () => clearTimeout(t);
  }, [open, data]);

  const getBlob = async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      canvasRef.current?.toBlob((b) => resolve(b), 'image/png');
    });
  };

  const handleDownload = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.groupName.replace(/\s+/g, '-').toLowerCase()}-${data.period.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Saved');
  };

  const handleShare = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const file = new File([blob], `${data.groupName}-${data.period}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${data.groupName} · ${data.period}`,
          text: `${data.groupName} — ${data.period}`,
        });
      } catch { /* user cancelled */ }
    } else {
      await handleDownload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share your cycle summary</DialogTitle>
          <DialogDescription>
            Download or share directly to WhatsApp, Instagram, or anywhere else.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl overflow-hidden border bg-muted/30 relative">
          <canvas
            ref={canvasRef}
            width={1080}
            height={1080}
            className="w-full h-auto aspect-square"
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleDownload} disabled={loading}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download
          </Button>
          <Button className="flex-1" onClick={handleShare} disabled={loading}>
            <Share2 className="h-3.5 w-3.5 mr-1.5" />
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
