import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ChevronRight, ChevronLeft, User, Dog, Briefcase, Car, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input, Select } from '../components/ui/Input';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { db, auth } from '../lib/firebase';
import { ref, update, push, serverTimestamp } from 'firebase/database';
import { extractFeatures } from '../lib/cvHelper';

export default function ProfileCreation() {
    const [step, setStep] = useState(1);
    const [category, setCategory] = useState(null);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        // People
        name: '', bloodGroup: '', healthIssues: '', allergies: '', emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '', doctorContact: '',
        // Pets
        petName: '', petType: '', ownerContact: '', vaccinationInfo: '', reward: '',
        // Valuables
        itemName: '', message: '',
        // Vehicles
        ownerName: '', vehicleNumber: '', contactNumber: '', emergencyContact: '',
        // Scanner Type
        scannerType: 'qr', // 'qr' or 'facial'
        facialImage: null
    });

    const categories = [
        { id: 'people', title: 'People', icon: <User />, color: 'bg-red-500', desc: 'Emergency ID Profile' },
        { id: 'pets', title: 'Pets', icon: <Dog size={32} />, color: 'bg-emerald-500', desc: 'Lost pet identification' },
        { id: 'valuables', title: 'Valuables', icon: <Briefcase size={32} />, color: 'bg-blue-500', desc: 'Lost & found bags, laptops' },
        { id: 'vehicles', title: 'Vehicles', icon: <Car size={32} />, color: 'bg-yellow-500', desc: 'Owner contact, parking alerts' }
    ];

    const handleCategorySelect = (id) => {
        setCategory(id);
        setStep(2);
    };

    const handleNext = async () => {
        if (step === 2) {
            // Validation
            if (category === 'people' && !formData.name) return toast.error('Name is required');
            if (category === 'pets' && !formData.petName) return toast.error('Pet Name is required');
            if (category === 'valuables' && !formData.itemName) return toast.error('Item Name is required');
            if (category === 'vehicles' && !formData.vehicleNumber) return toast.error('Vehicle Number is required');
            setStep(3);
        } else if (step === 3) {
            // Validation for facial image if selected
            if (formData.scannerType === 'facial' && !formData.facialImage) {
                return toast.error('Facial scan image is required for Facial Scanner');
            }
            setStep(4);
        } else if (step === 4) {
            try {
                const user = auth.currentUser;
                if (!user) {
                    toast.success('Profile drafted. Please login to secure your item.');
                    localStorage.setItem('resqr_pending_profile', JSON.stringify({ category, data: formData }));
                    navigate('/login?redirect_to=/dashboard');
                    return;
                }

                const profileId = `${user.uid}_${Date.now()}`;
                
                let descriptors = null;
                if (formData.scannerType === 'facial' && formData.facialImage) {
                    const t = toast.loading("Analyzing Facial Node...");
                    try {
                        const features = await extractFeatures(formData.facialImage);
                        descriptors = features.descriptors;
                        toast.success("Facial Node Mapped", { id: t });
                    } catch (e) {
                        toast.error("Facial mapping failed. Try a clearer photo.", { id: t });
                        return;
                    }
                }

                const profileData = {
                    category,
                    data: formData,
                    scannerType: formData.scannerType,
                    facialImage: formData.facialImage || null,
                    descriptors: descriptors,
                    price: formData.scannerType === 'facial' ? 149 : 99,
                    createdAt: serverTimestamp(),
                    payment_status: 'pending',
                    uid: user.uid,
                    email: user.email
                };

                const profileRef = ref(db, `users/${user.uid}/profiles/${profileId}`);
                await update(profileRef, profileData);

                // Set as active slug for legacy support or dashboard default
                localStorage.setItem('resqr_active_slug', profileId);
                
                toast.success('Step 1 Complete: Profile Created');
                navigate('/payment');

            } catch (error) {
                console.error("Error creating profile:", error);
                toast.error('System synchronization failed. Retrying...');
            }
        }
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const renderPeopleForm = () => (
        <div className="space-y-6">
            <h3 className="text-xl font-black uppercase tracking-widest text-white italic mb-4">Emergency Passport</h3>
            <Input name="name" label="Full Name" placeholder="e.g. John Doe" value={formData.name} onChange={handleChange} />
            <Select 
                name="bloodGroup" 
                label="Blood Group" 
                value={formData.bloodGroup} 
                onChange={handleChange}
                options={[
                    { label: 'Select Group', value: '' },
                    { label: 'A+', value: 'A+' }, { label: 'A-', value: 'A-' },
                    { label: 'B+', value: 'B+' }, { label: 'B-', value: 'B-' },
                    { label: 'AB+', value: 'AB+' }, { label: 'AB-', value: 'AB-' },
                    { label: 'O+', value: 'O+' }, { label: 'O-', value: 'O-' },
                ]}
            />
            <Input name="healthIssues" label="Health Issues" placeholder="Diabetes, Hypertension, etc." value={formData.healthIssues} onChange={handleChange} />
            <Input name="allergies" label="Allergies (Critical)" placeholder="Penicillin, Peanuts, etc." value={formData.allergies} onChange={handleChange} />
            <div className="grid grid-cols-2 gap-4">
                <Input name="emergencyContactName" label="Emergency Contact Name" value={formData.emergencyContactName} onChange={handleChange} />
                <Input name="emergencyContactRelation" label="Relation (e.g. Father)" value={formData.emergencyContactRelation} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Input name="emergencyContactPhone" label="Emergency Phone No." value={formData.emergencyContactPhone} onChange={handleChange} />
                <Input name="doctorContact" label="Doctor Contact No. (Optional)" value={formData.doctorContact} onChange={handleChange} />
            </div>
        </div>
    );

    const renderPetsForm = () => (
        <div className="space-y-6">
            <h3 className="text-xl font-black uppercase tracking-widest text-white italic mb-4">Pet Safety Tag</h3>
            <Input name="petName" label="Pet Name" placeholder="e.g. Max, Bella" value={formData.petName} onChange={handleChange} />
            <Input name="petType" label="Pet Type / Breed" placeholder="e.g. Golden Retriever, Siamese Cat" value={formData.petType} onChange={handleChange} />
            <Input name="ownerContact" label="Owner Phone Number" placeholder="+91 00000 00000" value={formData.ownerContact} onChange={handleChange} />
            <Input name="vaccinationInfo" label="Vaccination Info" placeholder="e.g. Fully Vaccinated (Rabies: 2026)" value={formData.vaccinationInfo} onChange={handleChange} />
            <Input name="reward" label="Reward Message (Optional)" placeholder="e.g. ₹5000 Reward for safe return" value={formData.reward} onChange={handleChange} />
        </div>
    );

    const renderValuablesForm = () => (
        <div className="space-y-6">
            <h3 className="text-xl font-black uppercase tracking-widest text-white italic mb-4">Valuables Recovery Label</h3>
            <Input name="itemName" label="Item Name & Description" placeholder="e.g. Black Dell XPS 15 Laptop" value={formData.itemName} onChange={handleChange} />
            <Input name="ownerContact" label="Your Phone Number" placeholder="+91 00000 00000" value={formData.ownerContact} onChange={handleChange} />
            <Input name="message" label="Display Message" placeholder="e.g. If found, please return to me. Important data inside." value={formData.message} onChange={handleChange} />
            <Input name="reward" label="Reward Offered (Optional)" placeholder="e.g. ₹2000 Reward" value={formData.reward} onChange={handleChange} />
        </div>
    );

    const renderVehiclesForm = () => (
        <div className="space-y-6">
            <h3 className="text-xl font-black uppercase tracking-widest text-white italic mb-4">Vehicle Secure ID</h3>
            <Input name="vehicleNumber" label="Vehicle Registration Number" placeholder="e.g. MH 01 AB 1234" value={formData.vehicleNumber} onChange={handleChange} />
            <Input name="ownerName" label="Owner Name" placeholder="e.g. Rohit Sharma" value={formData.ownerName} onChange={handleChange} />
            <Input name="contactNumber" label="Primary Contact Number" placeholder="+91 00000 00000" value={formData.contactNumber} onChange={handleChange} />
            <Input name="emergencyContact" label="Emergency Backup Contact (Optional)" placeholder="+91 00000 00000" value={formData.emergencyContact} onChange={handleChange} />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 py-20 px-4 text-white font-manrope selection:bg-primary/30">
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-16">
                    <Badge className="bg-primary/20 text-primary border-none mb-6 px-6 py-1 font-black italic tracking-widest">MULTI-CATEGORY PLATFORM</Badge>
                    <h1 className="text-5xl md:text-7xl font-black text-white italic uppercase tracking-tighter leading-none font-poppins mb-6">
                        CREATE <span className="text-primary italic-display">SECURE</span> NODE
                    </h1>
                </header>

                <Card className="p-10 md:p-16 bg-slate-900 border-white/5 shadow-2xl rounded-[50px] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                <div className="text-center mb-10">
                                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter font-poppins">Select Category</h2>
                                    <p className="text-slate-500 font-bold text-sm italic mt-2">Choose the type of profile you want to generate a tag for.</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {categories.map((c) => (
                                        <button 
                                            key={c.id} 
                                            onClick={() => handleCategorySelect(c.id)}
                                            className="bg-slate-950 border border-white/5 p-8 rounded-[30px] flex flex-col items-center justify-center text-center group hover:border-white/20 transition-all hover:-translate-y-2 relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className={`${c.color} w-20 h-20 rounded-[24px] flex items-center justify-center text-white mb-6 shadow-2xl relative z-10 transition-transform group-hover:scale-110`}>
                                                {c.icon}
                                            </div>
                                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic relative z-10">{c.title}</h3>
                                            <p className="text-slate-500 text-sm font-bold mt-2 relative z-10">{c.desc}</p>
                                            <div className="mt-6 bg-white/5 text-white font-black px-5 py-2 rounded-full text-xs uppercase tracking-widest relative z-10 group-hover:bg-primary group-hover:text-white transition-colors border border-white/10 group-hover:border-primary">
                                                ₹99 PER TAG
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                <div className="text-center mb-10">
                                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter font-poppins">Select Scanner Type</h2>
                                    <p className="text-slate-500 font-bold text-sm italic mt-2">Choose how your identity will be scanned in an emergency.</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <button 
                                        onClick={() => { setFormData(prev => ({ ...prev, scannerType: 'qr' })); setStep(3); }}
                                        className={`bg-slate-950 border p-8 rounded-[30px] flex flex-col items-center justify-center text-center group transition-all hover:-translate-y-2 relative overflow-hidden ${formData.scannerType === 'qr' ? 'border-primary' : 'border-white/5'}`}
                                    >
                                        <div className="w-20 h-20 rounded-[24px] bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-2xl">
                                            <QrCode size={40} />
                                        </div>
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">QR Scanner</h3>
                                        <p className="text-slate-500 text-sm font-bold mt-2">Standard high-definition QR code tag.</p>
                                        <div className="mt-6 bg-primary text-white font-black px-5 py-2 rounded-full text-xs uppercase tracking-widest border border-primary">
                                            ₹99
                                        </div>
                                    </button>

                                    <button 
                                        onClick={() => { setFormData(prev => ({ ...prev, scannerType: 'facial' })); setStep(3); }}
                                        className={`bg-slate-950 border p-8 rounded-[30px] flex flex-col items-center justify-center text-center group transition-all hover:-translate-y-2 relative overflow-hidden ${formData.scannerType === 'facial' ? 'border-primary' : 'border-white/5'}`}
                                    >
                                        <div className="w-20 h-20 rounded-[24px] bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6 shadow-2xl">
                                            <Shield size={40} />
                                        </div>
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Facial Scanner</h3>
                                        <p className="text-slate-500 text-sm font-bold mt-2">AI-powered facial recognition technology.</p>
                                        <div className="mt-6 bg-emerald-500 text-white font-black px-5 py-2 rounded-full text-xs uppercase tracking-widest border border-emerald-500">
                                            ₹149
                                        </div>
                                    </button>
                                </div>
                                <div className="mt-10 flex justify-center">
                                    <button onClick={handleBack} className="text-slate-500 font-black uppercase italic tracking-widest text-xs flex items-center gap-2 hover:text-white transition-colors">
                                        <ChevronLeft size={16} /> BACK TO CATEGORIES
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                <div className="mb-10 flex items-center gap-4">
                                    <button onClick={handleBack} className="w-12 h-12 rounded-full bg-slate-950 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                                        <ChevronLeft size={24} />
                                    </button>
                                    <div>
                                        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter font-poppins">Enter Details</h2>
                                        <p className="text-slate-500 font-bold text-sm italic uppercase tracking-widest mt-1">Category: <span className="text-primary">{category}</span></p>
                                    </div>
                                </div>
                                
                                {category === 'people' && renderPeopleForm()}
                                {category === 'pets' && renderPetsForm()}
                                {category === 'valuables' && renderValuablesForm()}
                                {category === 'vehicles' && renderVehiclesForm()}

                                {formData.scannerType === 'facial' && (
                                    <div className="mt-8 p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[30px] space-y-6">
                                        <h3 className="text-xl font-black uppercase tracking-widest text-emerald-500 italic">Facial Registration</h3>
                                        <p className="text-slate-500 text-sm font-bold italic">Upload a clear photo of the person/pet to enable facial recognition scanning.</p>
                                        <div className="flex flex-col items-center justify-center">
                                            {formData.facialImage ? (
                                                <div className="relative group">
                                                    <img src={formData.facialImage} alt="Facial preview" className="w-48 h-48 object-cover rounded-3xl border-2 border-emerald-500 shadow-2xl" />
                                                    <button onClick={() => setFormData(prev => ({ ...prev, facialImage: null }))} className="absolute -top-2 -right-2 bg-red-600 text-white p-2 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Plus className="rotate-45" size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="w-full h-48 border-2 border-dashed border-emerald-500/20 rounded-[30px] flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-500/5 transition-all">
                                                    <Plus className="text-emerald-500 mb-2" size={32} />
                                                    <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Upload Facial Profile</span>
                                                    <input 
                                                        type="file" 
                                                        className="hidden" 
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files[0];
                                                            if (file) {
                                                                const reader = new FileReader();
                                                                reader.onload = (ev) => setFormData(prev => ({ ...prev, facialImage: ev.target.result }));
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-12">
                                    <Button onClick={handleNext} className="w-full text-xl font-black h-16 rounded-[24px] bg-primary text-white border-none uppercase italic tracking-tighter">
                                        REVIEW & PROCEED <ChevronRight size={24} className="ml-2" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div key="step4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                <div className="text-center mb-10">
                                    <Shield size={48} className="text-emerald-500 mx-auto mb-6 opacity-80" />
                                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter font-poppins">
                                        Identity Preview
                                    </h2>
                                </div>

                                <div className="bg-slate-950 border border-white/5 rounded-[30px] p-8 mb-10 space-y-6">
                                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                        <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest italic">
                                            Scanner Type
                                        </span>
                                        <span className="text-white font-black uppercase italic">
                                            {formData.scannerType} Scanner
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                        <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest italic">
                                            Category
                                        </span>
                                        <span className="text-white font-black uppercase italic">
                                            {category}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest italic">
                                            Registration Fee
                                        </span>
                                        <span className="text-emerald-500 font-black uppercase italic text-2xl">
                                            ₹{formData.scannerType === "facial" ? 149 : 99}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center gap-4">
                                    <Button
                                        onClick={handleBack}
                                        variant="outline"
                                        className="flex-1 text-slate-400 border-white/10 h-16 rounded-[24px] font-black italic uppercase"
                                    >
                                        Back
                                    </Button>

                                    <Button
                                        onClick={handleNext}
                                        className="flex-[2] h-16 rounded-[24px] bg-emerald-500 text-white border-none uppercase italic text-xl font-black tracking-tighter shadow-xl shadow-emerald-500/20"
                                    >
                                        <CheckCircle2 size={24} className="mr-2" />
                                        CREATE PROFILE
                                    </Button>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </Card>
                </div>
            </div>
        );
    }
