'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserPlus, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing?: boolean;
  showCounts?: boolean;
  followerCount?: number;
  followingCount?: number;
  className?: string;
}

export default function FollowButton({
  targetUserId,
  initialIsFollowing = false,
  showCounts = false,
  followerCount = 0,
  followingCount = 0,
  className,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [counts, setCounts] = useState({ 
    followers: followerCount, 
    following: followingCount 
  });

  // Check follow status on mount
  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        const res = await fetch(`/api/follows/check?userId=${targetUserId}`);
        const data = await res.json();
        if (data.success) {
          setIsFollowing(data.isFollowing);
          setCounts({
            followers: data.followerCount || followerCount,
            following: data.followingCount || followingCount,
          });
        }
      } catch (err) {
        console.error('Failed to check follow status:', err);
      }
    };
    checkFollowStatus();
  }, [targetUserId, followerCount, followingCount]);

  const handleFollow = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIdToFollow: targetUserId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsFollowing(true);
        setCounts((prev) => ({ ...prev, followers: prev.followers + 1 }));
      } else if (res.status === 400 && data.error === 'Already following this user') {
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Follow error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, isLoading]);

  const handleUnfollow = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/follows?userId=${targetUserId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsFollowing(false);
        setCounts((prev) => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
      }
    } catch (err) {
      console.error('Unfollow error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, isLoading]);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Button
        onClick={isFollowing ? handleUnfollow : handleFollow}
        disabled={isLoading}
        variant={isFollowing ? 'outline' : 'default'}
        className={cn(
          'h-10 px-6 text-sm font-medium gap-2 rounded-lg transition-all w-full',
          isFollowing 
            ? 'border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900' 
            : 'bg-black text-white hover:bg-gray-800'
        )}
      >
        {isLoading ? (
          <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
        ) : isFollowing ? (
          <>
            <UserMinus className="w-3.5 h-3.5" />
            <span>Following</span>
          </>
        ) : (
          <>
            <UserPlus className="w-3.5 h-3.5" />
            <span>Follow</span>
          </>
        )}
      </Button>

      {showCounts && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-semibold text-gray-700">{counts.followers.toLocaleString()}</span>
          <span>followers</span>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-700">{counts.following.toLocaleString()}</span>
          <span>following</span>
        </div>
      )}
    </div>
  );
}
