import { Progress } from './ui/progress';
import { useEffect, useState } from 'react';
import { Logo } from './Logo';

interface LoadingProgressProps {
  message?: string;
}

export function LoadingProgress({ message = 'Loading...' }: LoadingProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      <div className="flex justify-center mb-4 animate-pulse">
        <Logo showText={false} />
      </div>
      <Progress value={progress} className="h-1.5" />
      <p className="text-center text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
