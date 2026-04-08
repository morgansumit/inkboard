'use client';
import { useEffect } from 'react';

export function SupabaseErrorHandler() {
    useEffect(() => {
        // Suppress Supabase refresh token errors
        const originalConsoleError = console.error;
        
        console.error = (...args: any[]) => {
            const errorMessage = args.join(' ');
            
            // Suppress specific Supabase auth errors
            if (
                errorMessage.includes('Invalid Refresh Token') ||
                errorMessage.includes('Refresh Token Not Found') ||
                errorMessage.includes('AuthApiError') ||
                errorMessage.includes('refresh_token_not_found') ||
                errorMessage.includes('LockManager lock') ||
                errorMessage.includes('timed out waiting')
            ) {
                // Silently ignore these errors
                return;
            }
            
            // Log all other errors normally
            originalConsoleError.apply(console, args);
        };

        // Handle unhandled promise rejections
        const handleRejection = (event: PromiseRejectionEvent) => {
            const error = event.reason;
            const errorMessage = error?.message || String(error);
            
            if (
                errorMessage.includes('Invalid Refresh Token') ||
                errorMessage.includes('Refresh Token Not Found') ||
                errorMessage.includes('AuthApiError') ||
                errorMessage.includes('refresh_token_not_found') ||
                errorMessage.includes('LockManager lock') ||
                errorMessage.includes('timed out waiting')
            ) {
                event.preventDefault();
                return;
            }
        };

        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            console.error = originalConsoleError;
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, []);

    return null;
}
