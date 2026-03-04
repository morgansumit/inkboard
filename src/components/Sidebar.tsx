'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Plus, Bell, MessageCircle, Settings, User, Megaphone } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function Sidebar() {
    const pathname = usePathname();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
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

    const navItems = [
        { href: '/', icon: <Home size={24} />, label: 'Home', public: true },
        { href: '/explore', icon: <Compass size={24} />, label: 'Explore', public: true },
        { href: '/compose', icon: <Plus size={24} />, label: 'Create', public: false },
        { href: '/ads', icon: <Megaphone size={24} />, label: 'Ads Center', public: false },
        { href: '/notifications', icon: <Bell size={24} />, label: 'Notifications', public: false },
        { href: '/messages', icon: <MessageCircle size={24} />, label: 'Messages', public: false },
        { href: '/profile', icon: <User size={24} />, label: 'Profile', public: false },
    ];

    const displayItems = navItems.filter(item => item.public || isLoggedIn);

    return (
        <aside className="sidebar">
            <Link href="/" className="sidebar-logo">
                I
            </Link>

            <div className="sidebar-nav">
                {displayItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={item.label}
                            className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="sidebar-icon">{item.icon}</span>
                            <span className="sidebar-label">{item.label}</span>
                        </Link>
                    );
                })}
            </div>

            <Link href="/settings" title="Settings" className="sidebar-settings">
                <Settings size={24} />
            </Link>
        </aside>
    );
}
