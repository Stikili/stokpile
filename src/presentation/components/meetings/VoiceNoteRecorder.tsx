import { useState, useRef } from 'react';
import { Button } from '@/presentation/ui/button';
import { Mic, Square, Play, Pause, Trash2, Loader2, Upload } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

interface VoiceNoteRecorderProps {
  meetingId: string;
  onUploaded?: () => void;
}

export function VoiceNoteRecorder({ meetingId, onUploaded }: VoiceNoteRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [playing, setPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      mr.start();
      setRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (e) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const reset = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setDuration(0);
    setPlaying(false);
  };

  const upload = async () => {
    if (!audioBlob) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          await api.uploadVoiceNote(meetingId, base64);
          toast.success('Voice note uploaded');
          reset();
          onUploaded?.();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Upload failed');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch {
      toast.error('Upload failed');
      setUploading(false);
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      {!audioUrl ? (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant={recording ? 'destructive' : 'default'}
            onClick={recording ? stopRecording : startRecording}
          >
            {recording ? (
              <><Square className="h-4 w-4 mr-2" />Stop</>
            ) : (
              <><Mic className="h-4 w-4 mr-2" />Record</>
            )}
          </Button>
          {recording && (
            <span className="text-sm text-destructive font-mono flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              {fmt(duration)}
            </span>
          )}
          {!recording && <span className="text-xs text-muted-foreground">Tap record to add a voice note (max 60 seconds).</span>}
        </div>
      ) : (
        <div className="space-y-2">
          <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} className="hidden" />
          <div className="flex items-center gap-2">
            <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={togglePlay}>
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <span className="text-xs text-muted-foreground flex-1">Recorded · {fmt(duration)}</span>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={reset}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button type="button" size="sm" onClick={upload} disabled={uploading} className="w-full">
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload Voice Note
          </Button>
        </div>
      )}
    </div>
  );
}
