'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MapPin, Plus, Bell, MessageCircle, User, LogIn, UserPlus } from 'lucide-react';
import { createClient, getCachedUserProfile } from '@/lib/supabase/client';

type NavItem = {
    href: string;
    icon: React.ReactElement;
    label: string;
    public?: boolean;
    kind?: 'write';
};

interface SidebarProps {
    initialSession?: any;
}

export function Sidebar({ initialSession }: SidebarProps) {
    const pathname = usePathname();
    // Start with initialSession state for instant render, then hydrate
    const hasSession = !!initialSession?.user;
    const [isLoggedIn, setIsLoggedIn] = useState(hasSession);
    const [isMobile, setIsMobile] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        // Check cache first for instant state, then listen for changes
        const cached = getCachedUserProfile();
        if (cached) setIsLoggedIn(true);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setIsLoggedIn(!!session);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (typeof window === 'undefined') return;
            setIsMobile(window.innerWidth <= 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const root = document.documentElement;

        const updateMobileBottomGap = () => {
            if (window.innerWidth > 768) {
                root.style.setProperty('--mobile-bottom-gap', '0px');
                return;
            }

            const viewport = window.visualViewport;
            if (!viewport) {
                root.style.setProperty('--mobile-bottom-gap', '0px');
                return;
            }

            const availableHeight = viewport.height + viewport.offsetTop;
            const gap = Math.max(0, window.innerHeight - availableHeight);
            root.style.setProperty('--mobile-bottom-gap', `${Math.round(gap)}px`);
        };

        updateMobileBottomGap();
        const viewport = window.visualViewport;
        window.addEventListener('resize', updateMobileBottomGap);
        window.addEventListener('orientationchange', updateMobileBottomGap);
        viewport?.addEventListener('resize', updateMobileBottomGap);
        viewport?.addEventListener('scroll', updateMobileBottomGap);

        return () => {
            window.removeEventListener('resize', updateMobileBottomGap);
            window.removeEventListener('orientationchange', updateMobileBottomGap);
            viewport?.removeEventListener('resize', updateMobileBottomGap);
            viewport?.removeEventListener('scroll', updateMobileBottomGap);
        };
    }, []);

    const desktopItems: NavItem[] = [
        { href: '/', icon: <Home size={22} />, label: 'Home', public: true },
        { href: '/explore', icon: <MapPin size={22} />, label: 'Nearby', public: true },
        { href: '/compose', icon: <Plus size={22} />, label: 'Create', public: false },
        { href: '/messages', icon: <MessageCircle size={22} />, label: 'Messages', public: false },
        { href: '/notifications', icon: <Bell size={22} />, label: 'Alerts', public: false },
        { href: '/profile', icon: <User size={22} />, label: 'Profile', public: false },
    ];

    const mobileItemsAuthed: NavItem[] = [
        { href: '/', icon: <Home size={22} />, label: 'Home' },
        { href: '/explore', icon: <MapPin size={22} />, label: 'Nearby' },
        { href: '/compose', icon: <Plus size={26} />, label: 'Write', kind: 'write' },
        { href: '/notifications', icon: <Bell size={22} />, label: 'Alerts' },
        { href: '/profile', icon: <User size={22} />, label: 'Profile' },
    ];

    const mobileItemsGuest: NavItem[] = [
        { href: '/', icon: <Home size={22} />, label: 'Home' },
        { href: '/explore', icon: <MapPin size={22} />, label: 'Nearby' },
        { href: '/login', icon: <LogIn size={22} />, label: 'Log in' },
        { href: '/register', icon: <UserPlus size={22} />, label: 'Sign up' },
    ];

    if (pathname.startsWith('/admin')) {
        return null;
    }

    return (
        <aside className="sidebar">
            <Link href="/" className="sidebar-logo">
                P
            </Link>

            <div className={`sidebar-nav ${isMobile ? 'mobile-nav' : ''}`}>
                {(isMobile ? (isLoggedIn ? mobileItemsAuthed : mobileItemsGuest) : desktopItems.filter(item => item.public || isLoggedIn)).map(item => {
                    const isActive = pathname === item.href;
                    const extraClass = item.kind === 'write' ? 'write-cta' : '';
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={item.label}
                            className={`sidebar-nav-item ${extraClass} ${isActive ? 'active' : ''}`}
                        >
                            <span className="sidebar-icon">{item.icon}</span>
                            <span className="sidebar-label">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </aside>
    );
}
