import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Skeleton } from './ui/skeleton';
import { User, Upload, Loader2 } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import type { Session, Profile } from '../types';

interface ProfileDialogProps {
  session: Session;
  onProfileUpdate?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProfileDialog({ session: _session, onProfileUpdate, open: controlledOpen, onOpenChange }: ProfileDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadProfile();
    }
  }, [open]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await api.getProfile();
      setProfile(data);
      setFullName(data.fullName || '');
      setSurname(data.surname || '');
      setEmail(data.email || '');
      setProfilePictureUrl(data.profilePictureUrl || null);
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await api.uploadProfilePicture(formData);
      setProfilePictureUrl(data.url);
      toast.success('Profile picture uploaded successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.updateProfile({
        fullName,
        surname,
        profilePictureUrl
      });

      toast.success('Profile updated successfully');
      setOpen(false);
      if (onProfileUpdate) onProfileUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string, surname: string) => {
    if (surname) {
      return (name.charAt(0) + surname.charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button variant="ghost" className="w-full justify-start">
            <User className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information and picture
          </DialogDescription>
        </DialogHeader>

        {loading && !profile ? (
          <div className="space-y-4 pt-4">
            <div className="flex justify-center">
              <Skeleton className="h-24 w-24 rounded-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            {/* Profile Picture Upload */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profilePictureUrl || undefined} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getInitials(fullName, surname)}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col items-center gap-2">
                <Label htmlFor="profile-picture" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span>{uploading ? 'Uploading...' : 'Upload Picture'}</span>
                  </div>
                </Label>
                <Input
                  id="profile-picture"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Max size: 5MB • PNG, JPG, GIF
                </p>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">First Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Enter your first name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="surname">Last Name</Label>
                <Input
                  id="surname"
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading || uploading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
