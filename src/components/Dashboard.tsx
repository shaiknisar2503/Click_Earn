import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { Coins, LogOut, Wallet, MousePointerClick, PlayCircle, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import WithdrawModal from './withdrawModal';

export default function Dashboard({ user }: { user: any }) {
  const [userData, setUserData] = useState<any>(null);
  const [showAd, setShowAd] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [localClicks, setLocalClicks] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setUserData(doc.data());
        setLocalClicks(doc.data().clicks);
      }
    });
    return () => unsub();
  }, [user]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        // Resize image using canvas to save space
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG
        const base64String = canvas.toDataURL('image/jpeg', 0.7);

        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            photoURL: base64String
          });
        } catch (error) {
          console.error("Error updating profile image:", error);
          alert("Failed to update profile image.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleClick = async () => {
    if (!userData) return;
    
    const newClicks = localClicks + 1;
    setLocalClicks(newClicks);

    try {
      const userRef = doc(db, 'users', user.uid);
      
      if (newClicks % 50 === 0) {
        setShowAd(true);
        // We update earnings after the ad finishes
      } else {
        await updateDoc(userRef, {
          clicks: increment(1)
        });
      }
    } catch (error) {
      console.error("Error updating clicks:", error);
    }
  };

  const handleAdComplete = async () => {
    setShowAd(false);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        clicks: increment(1),
        earnings: increment(0.1) // 10 paise
      });
    } catch (error) {
      console.error("Error completing ad:", error);
    }
  };

  if (!userData) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const displayPhoto = userData.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`;

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <img 
                src={displayPhoto} 
                alt="Avatar" 
                className="w-10 h-10 rounded-full border border-neutral-700 object-cover" 
              />
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-4 h-4 text-white" />
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            <div className="flex items-center gap-2 hidden sm:flex">
              <Coins className="text-yellow-500 w-5 h-5" />
              <span className="font-bold text-lg tracking-tight">ClickEarn</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-neutral-400 text-sm">
              <span className="font-medium text-white">{userData.name}</span>
            </div>
            <button 
              onClick={() => auth.signOut()}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <p className="text-neutral-400 text-sm font-medium mb-1">Total Clicks</p>
              <p className="text-4xl font-bold text-white font-mono">{userData.clicks.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
              <MousePointerClick className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
          
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-neutral-400 text-sm font-medium mb-1">Total Earnings</p>
                <p className="text-4xl font-bold text-green-400 font-mono">₹{userData.earnings.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <button 
              onClick={() => setIsWithdrawing(true)}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              Withdraw Funds
            </button>
          </div>
        </div>

        {/* Clicker Area */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1)_0,transparent_50%)]"></div>
          
          <div className="z-10 text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Keep Clicking!</h2>
            <p className="text-neutral-400">
              {50 - (userData.clicks % 50)} clicks until your next reward.
            </p>
            <div className="w-full max-w-xs bg-neutral-800 rounded-full h-2 mt-4 mx-auto overflow-hidden">
              <div 
                className="bg-indigo-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${((userData.clicks % 50) / 50) * 100}%` } as React.CSSProperties}
              ></div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClick}
            className="z-10 w-48 h-48 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-[0_0_40px_rgba(99,102,241,0.4)] flex items-center justify-center border-4 border-indigo-400/30"
          >
            <MousePointerClick className="w-16 h-16 text-white" />
          </motion.button>
        </div>
      </main>

      {/* Ad Modal */}
      <AnimatePresence>
        {showAd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 text-center"
            >
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <PlayCircle className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Advertisement</h3>
              <p className="text-neutral-400 mb-6">
                Watching this ad supports the app and earns you ₹0.10!
              </p>
              <div className="bg-neutral-800 rounded-xl p-8 mb-6 border border-neutral-700">
                <p className="text-neutral-500 italic">Simulated Ad Content</p>
              </div>
              <button
                onClick={handleAdComplete}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Claim Reward
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {isWithdrawing && (
          <WithdrawModal 
            user={user} 
            userData={userData} 
            onClose={() => setIsWithdrawing(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
