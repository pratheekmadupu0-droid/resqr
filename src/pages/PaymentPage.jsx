import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ShieldCheck, Lock, ChevronRight, Zap, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { ref, onValue, update, get } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';

export default function PaymentPage() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const DEFAULT_PRODUCTS = [
        { id: 'digital', title: 'Digital QR', price: 99, best: true },
        { id: 'band', title: 'QR Band', price: 299, best: false },
        { id: 'bracelet', title: 'QR Bracelet', price: 399, best: false },
        { id: 'keychain', title: 'Key Chain', price: 199, base: false }
    ];

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                toast.error("Please login to proceed to payment.");
                navigate('/login?redirect_to=/payment');
            } else {
                const pendingProfileJson = localStorage.getItem('resqr_pending_profile');
                if (pendingProfileJson) {
                    try {
                        const formData = JSON.parse(pendingProfileJson);
                        const nameSlug = localStorage.getItem('resqr_active_slug') ||
                            formData.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

                        const profileData = {
                            ...formData,
                            email: user.email,
                            uid: user.uid,
                            payment_status: 'pending',
                            last_updated: new Date().toISOString()
                        };

                        await update(ref(db, `profiles/${nameSlug}`), profileData);
                        await update(ref(db, `users/${user.uid}/profiles/${nameSlug}`), profileData);

                        localStorage.removeItem('resqr_pending_profile');
                        localStorage.setItem('resqr_active_slug', nameSlug);
                    } catch (err) {
                        console.error("Failed to sync pending profile:", err);
                    }
                }
            }
        });

        const prodRef = ref(db, 'config/products');
        const unsub = onValue(prodRef, (snapshot) => {
            const data = snapshot.val();
            let list = [];
            if (data) {
                list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
            } else {
                list = DEFAULT_PRODUCTS;
            }
            setProducts(list.length > 0 ? list : DEFAULT_PRODUCTS);
            const finalProducts = list.length > 0 ? list : DEFAULT_PRODUCTS;
            const best = finalProducts.find(p => p.best) || finalProducts[0];
            setSelectedProduct(best);
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            unsub();
        };
    }, [navigate]);

    const handlePayment = async () => {
        if (!selectedProduct) {
            toast.error("Please select a product first.");
            return;
        }

        const isDemo = true; // DEMO MODE ACTIVE

        if (isDemo) {
            const t = toast.loading("Processing tactical demo payment...");
            setTimeout(async () => {
                try {
                    const currentUser = auth.currentUser;
                    let activeSlug = localStorage.getItem('resqr_active_slug');

                    if (activeSlug || currentUser) {
                        const finalPaymentData = {
                            payment_status: 'paid',
                            payment_id: "demo_" + Math.random().toString(36).substr(2, 9),
                            payment_date: new Date().toISOString(),
                            last_updated: new Date().toISOString()
                        };

                        if (activeSlug) {
                            await update(ref(db, `profiles/${activeSlug}`), finalPaymentData);
                            const uid = activeSlug.includes('_') ? activeSlug.split('_')[0] : (currentUser?.uid);
                            if (uid) {
                                await update(ref(db, `users/${uid}/profiles/${activeSlug}`), finalPaymentData);
                            }
                        }
                    }

                    toast.success('Demo Payment Success! Identity Activated.', { id: t });
                    navigate('/success');
                } catch (error) {
                    console.error("Demo payment error:", error);
                    toast.error("Demo sequence failed.", { id: t });
                }
            }, 1500);
            return;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="text-primary animate-spin" size={48} />
            </div>
        );
    }

    if (!selectedProduct) return null;

    const subtotal = selectedProduct.price / 1.18;
    const gst = selectedProduct.price - subtotal;

    return (
        <div className="min-h-screen bg-medical-bg py-24 px-4 text-white font-manrope">
            <div className="max-w-6xl mx-auto">
                <header className="mb-16 text-center">
                    <Badge className="bg-primary/20 text-primary border-none mb-4 px-6 py-1 font-black italic tracking-widest">DEMO MODE ACTIVE</Badge>
                    <h1 className="text-5xl md:text-7xl font-black text-white italic uppercase tracking-tighter leading-none font-poppins">
                        Checkout <span className="text-primary">Preview.</span>
                    </h1>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-8">
                        <Card className="p-10 bg-medical-card border-white/5 rounded-[40px] shadow-2xl">
                            <h2 className="text-2xl font-black italic uppercase mb-8">Selected Plan</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {products.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedProduct(p)}
                                        className={`p-6 rounded-3xl border-2 transition-all ${selectedProduct.id === p.id ? 'border-primary bg-primary/5' : 'border-white/5'}`}
                                    >
                                        <p className="text-[10px] font-black uppercase mb-2">{p.title}</p>
                                        <p className="text-xl font-black italic">₹{p.price}</p>
                                    </button>
                                ))}
                            </div>

                            <div className="mt-12">
                                <Button className="w-full py-10 text-2xl font-black italic rounded-[30px] bg-primary text-white border-none uppercase tracking-tighter shadow-2xl shadow-primary/20" onClick={handlePayment}>
                                    PROCESS DEMO PAYMENT <ChevronRight size={24} className="ml-2" />
                                </Button>
                            </div>
                        </Card>
                    </div>

                    <div className="lg:col-span-4">
                        <Card className="p-10 bg-medical-card border-white/5 rounded-[40px] shadow-2xl">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-8">Order Summary</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between font-black italic text-xl">
                                    <span>{selectedProduct.title}</span>
                                    <span>₹{selectedProduct.price}</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500 uppercase tracking-widest">
                                    <span>Tax (Demo)</span>
                                    <span>₹0.00</span>
                                </div>
                                <div className="pt-4 border-t border-white/5 flex justify-between font-black text-3xl text-primary">
                                    <span>Total</span>
                                    <span>₹{selectedProduct.price}</span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
