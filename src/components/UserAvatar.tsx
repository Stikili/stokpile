import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface UserAvatarProps {
  name: string;
  email?: string;
  profilePictureUrl?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function UserAvatar({ name, email, profilePictureUrl, className, size = 'md' }: UserAvatarProps) {
  // Generate initials from name
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Generate consistent color from email/name
  const getAvatarColor = (seed: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-cyan-500',
    ];
    
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const initials = getInitials(name);
  const colorClass = getAvatarColor(email || name);
  
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base'
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className || ''}`}>
      {profilePictureUrl && <AvatarImage src={profilePictureUrl} alt={name} />}
      <AvatarFallback className={`${colorClass} text-white`}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
