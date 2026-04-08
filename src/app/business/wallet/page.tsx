'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FunLoader } from '@/components/FunLoader';
import Link from 'next/link';
import { 
    Wallet, 
    CreditCard, 
    Plus, 
    TrendingUp, 
    TrendingDown,
    DollarSign,
    Calendar,
    Eye,
    EyeOff,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    X
} from 'lucide-react';

interface WalletData {
    id: string;
    balance: number;
    currency: string;
    created_at: string;
    updated_at: string;
}

interface Transaction {
    id: string;
    transaction_type: 'CREDIT' | 'DEBIT' | 'REFUND';
    amount: number;
    description: string;
    reference_type?: string;
    status: string;
    created_at: string;
    metadata?: any;
}

interface PaymentMethod {
    id: string;
    method_type: string;
    last_four?: string;
    card_brand?: string;
    expiry_month?: number;
    expiry_year?: number;
    is_default: boolean;
}

export default function BusinessWallet() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [showBalance, setShowBalance] = useState(true);
    const [showAddCredits, setShowAddCredits] = useState(false);
    const [showPaymentMethods, setShowPaymentMethods] = useState(false);
    const [amount, setAmount] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        try {
            const res = await fetch('/api/business/wallet');
            const data = await res.json();
            
            if (data.success) {
                setWallet(data.wallet);
                setTransactions(data.transactions || []);
                setPaymentMethods(data.paymentMethods || []);
                
                if (data.isNewWallet) {
                    setSuccess('Welcome! $10 free credits have been added to your wallet');
                }
            } else {
                setError(data.error || 'Failed to load wallet');
            }
        } catch (err) {
            setError('Network error loading wallet');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCredits = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        try {
            const res = await fetch('/api/business/wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    description: 'Manual credit addition',
                    referenceType: 'manual_add'
                })
            });

            const data = await res.json();

            if (data.success) {
                setSuccess(`$${amount} added to wallet successfully`);
                setAmount('');
                setShowAddCredits(false);
                fetchWalletData();
            } else {
                setError(data.error || 'Failed to add credits');
            }
        } catch (err) {
            setError('Network error adding credits');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'CREDIT': return <TrendingUp size={16} color="#10B981" />;
            case 'DEBIT': return <TrendingDown size={16} color="#EF4444" />;
            case 'REFUND': return <RefreshCw size={16} color="#3B82F6" />;
            default: return <DollarSign size={16} color="#6B7280" />;
        }
    };

    const getTransactionColor = (type: string) => {
        switch (type) {
            case 'CREDIT': return '#10B981';
            case 'DEBIT': return '#EF4444';
            case 'REFUND': return '#3B82F6';
            default: return '#6B7280';
        }
    };

    if (loading) {
        return (
            <FunLoader />
        );
    }

    if (!wallet) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <AlertCircle size={48} style={{ color: '#EF4444', marginBottom: '16px' }} />
                <h3 style={{ marginBottom: '8px' }}>Wallet Not Found</h3>
                <p style={{ color: 'var(--color-muted)' }}>Your wallet could not be loaded. Please try refreshing.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 700 }}>
                        Business Wallet
                    </h1>
                    <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
                        Manage your advertising credits and payment methods
                    </p>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={() => setShowPaymentMethods(!showPaymentMethods)}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <CreditCard size={18} />
                        Payment Methods
                    </button>
                    <button 
                        onClick={() => setShowAddCredits(!showAddCredits)}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Plus size={18} />
                        Add Credits
                    </button>
                </div>
            </div>

            {/* Balance Card */}
            <div style={{ 
                background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
                padding: '32px',
                borderRadius: '16px',
                color: 'white',
                marginBottom: '32px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', opacity: 0.9 }}>
                            Available Balance
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ fontSize: '48px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                {showBalance ? formatCurrency(wallet.balance) : '••••••'}
                            </div>
                            <button 
                                onClick={() => setShowBalance(!showBalance)}
                                style={{ 
                                    background: 'rgba(255,255,255,0.1)', 
                                    border: 'none',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                {showBalance ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <div style={{ marginTop: '12px', fontSize: '14px', opacity: 0.7 }}>
                            Last updated: {formatDate(wallet.updated_at)}
                        </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '4px' }}>Currency</div>
                        <div style={{ fontSize: '18px', fontWeight: 600 }}>{wallet.currency}</div>
                    </div>
                </div>
            </div>

            {/* Add Credits Modal */}
            {showAddCredits && (
                <div style={{ 
                    background: 'var(--color-surface)', 
                    padding: '24px', 
                    borderRadius: '12px', 
                    border: '1px solid var(--color-border)',
                    marginBottom: '32px'
                }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Add Credits</h3>
                    
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                                Amount (USD)
                            </label>
                            <input 
                                type="number"
                                min="1"
                                step="0.01"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="10.00"
                                className="input"
                                style={{ width: '100%' }}
                            />
                        </div>
                        <button 
                            onClick={handleAddCredits}
                            disabled={!amount || parseFloat(amount) <= 0}
                            className="btn btn-primary"
                        >
                            Add Credits
                        </button>
                        <button 
                            onClick={() => setShowAddCredits(false)}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Payment Methods */}
            {showPaymentMethods && (
                <div style={{ 
                    background: 'var(--color-surface)', 
                    padding: '24px', 
                    borderRadius: '12px', 
                    border: '1px solid var(--color-border)',
                    marginBottom: '32px'
                }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Payment Methods</h3>
                    
                    {paymentMethods.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {paymentMethods.map(method => (
                                <div key={method.id} style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    padding: '16px',
                                    background: '#F9FAFB',
                                    borderRadius: '8px',
                                    border: method.is_default ? '2px solid #3B82F6' : '1px solid var(--color-border)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <CreditCard size={20} style={{ color: '#6B7280' }} />
                                        <div>
                                            <div style={{ fontWeight: 600 }}>
                                                {method.card_brand} •••• {method.last_four}
                                            </div>
                                            {method.is_default && (
                                                <span style={{ 
                                                    fontSize: '12px', 
                                                    color: '#3B82F6',
                                                    background: '#EFF6FF',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px'
                                                }}>
                                                    Default
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
                                        {method.expiry_month}/{method.expiry_year}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)' }}>
                            <CreditCard size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                            <p>No payment methods added</p>
                        </div>
                    )}
                </div>
            )}

            {/* Transactions */}
            <div style={{ 
                background: 'var(--color-surface)', 
                padding: '24px', 
                borderRadius: '12px', 
                border: '1px solid var(--color-border)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Transaction History</h3>
                    <button 
                        onClick={fetchWalletData}
                        disabled={refreshing}
                        className="btn btn-ghost btn-sm"
                    >
                        <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                    </button>
                </div>

                {transactions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {transactions.map(transaction => (
                            <div key={transaction.id} style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: '16px',
                                background: '#F9FAFB',
                                borderRadius: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {getTransactionIcon(transaction.transaction_type)}
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>
                                            {transaction.description}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                                            {formatDate(transaction.created_at)}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ 
                                        fontSize: '16px', 
                                        fontWeight: 700, 
                                        color: getTransactionColor(transaction.transaction_type)
                                    }}>
                                        {transaction.transaction_type === 'CREDIT' ? '+' : '-'}
                                        {formatCurrency(transaction.amount)}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                                        {transaction.reference_type}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)' }}>
                        <Calendar size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                        <p>No transactions yet</p>
                    </div>
                )}
            </div>

            {/* Notifications */}
            {error && (
                <div style={{ 
                    position: 'fixed', 
                    bottom: '20px', 
                    right: '20px',
                    background: '#FEE2E2',
                    color: '#991B1B',
                    padding: '16px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    maxWidth: '400px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                    <AlertCircle size={20} />
                    <div>
                        <div style={{ fontWeight: 600 }}>Error</div>
                        <div style={{ fontSize: '14px' }}>{error}</div>
                    </div>
                    <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {success && (
                <div style={{ 
                    position: 'fixed', 
                    bottom: '20px', 
                    right: '20px',
                    background: '#D1FAE5',
                    color: '#065F46',
                    padding: '16px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    maxWidth: '400px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                    <CheckCircle size={20} />
                    <div>
                        <div style={{ fontWeight: 600 }}>Success</div>
                        <div style={{ fontSize: '14px' }}>{success}</div>
                    </div>
                    <button onClick={() => setSuccess(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
