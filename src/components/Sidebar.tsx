'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Plus, Bell, MessageCircle, User, LogIn, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function Sidebar() {
    const pathname = usePathname();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsLoggedIn(!!session);
        };
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
            setIsLoggedIn(!!session);
        });

        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    useEffect(() => {
        const handleResize = () => {
            if (typeof window === 'undefined') return;
            setIsMobile(window.innerWidth <= 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const desktopItems = [
        { href: '/', icon: <Home size={22} />, label: 'Home', public: true },
        { href: '/explore', icon: <Compass size={22} />, label: 'Explore', public: true },
        { href: '/compose', icon: <Plus size={22} />, label: 'Create', public: false },
        { href: '/messages', icon: <MessageCircle size={22} />, label: 'Messages', public: false },
        { href: '/notifications', icon: <Bell size={22} />, label: 'Alerts', public: false },
        { href: '/profile', icon: <User size={22} />, label: 'Profile', public: false },
    ];

    const mobileItemsAuthed = [
        { href: '/', icon: <Home size={22} />, label: 'Home' },
        { href: '/explore', icon: <Compass size={22} />, label: 'Explore' },
        { href: '/compose', icon: <Plus size={26} />, label: 'Write', kind: 'write' },
        { href: '/notifications', icon: <Bell size={22} />, label: 'Alerts' },
        { href: '/profile', icon: <User size={22} />, label: 'Profile' },
    ];

    const mobileItemsGuest = [
        { href: '/', icon: <Home size={22} />, label: 'Home' },
        { href: '/explore', icon: <Compass size={22} />, label: 'Explore' },
        { href: '/login', icon: <LogIn size={22} />, label: 'Log in' },
        { href: '/register', icon: <UserPlus size={22} />, label: 'Sign up' },
    ];

    return (
        <aside className="sidebar">
            <Link href="/" className="sidebar-logo">
                I
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
