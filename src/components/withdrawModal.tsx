import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, doc, increment, serverTimestamp, writeBatch } from 'firebase/firestore';
import { X, Building2, AlertCircle, CheckCircle2, Save, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

export default function WithdrawModal({ user, userData, onClose }: { user: any, userData: any, onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState(userData.accountNumber || '');
  const [ifscCode, setIfscCode] = useState(userData.ifscCode || '');
  const [accountHolderName, setAccountHolderName] = useState(userData.accountHolderName || '');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saveDetails, setSaveDetails] = useState(true);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    if (withdrawAmount > userData.earnings) {
      setError('Insufficient funds.');
      return;
    }

    if (withdrawAmount < 10) {
      setError('Minimum withdrawal amount is ₹10.');
      return;
    }

    if (!accountNumber.trim() || !ifscCode.trim() || !accountHolderName.trim()) {
      setError('Please fill in all bank details.');
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      // Create withdrawal request
      const withdrawalRef = doc(collection(db, 'withdrawals'));
      batch.set(withdrawalRef, {
        userId: user.uid,
        amount: withdrawAmount,
        status: 'pending',
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim(),
        accountHolderName: accountHolderName.trim(),
        createdAt: serverTimestamp()
      });

      // Deduct from user earnings and optionally save bank details
      const userRef = doc(db, 'users', user.uid);
      const userUpdates: any = {
        earnings: increment(-withdrawAmount)
      };
      
      if (saveDetails) {
        userUpdates.accountNumber = accountNumber.trim();
        userUpdates.ifscCode = ifscCode.trim();
        userUpdates.accountHolderName = accountHolderName.trim();
      }
      
      batch.update(userRef, userUpdates);

      await batch.commit();

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Error withdrawing:", err);
      setError('Failed to process withdrawal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDetailsOnly = async () => {
    if (!accountNumber.trim() || !ifscCode.trim() || !accountHolderName.trim()) {
      setError('Please fill in all bank details to save.');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const userRef = doc(db, 'users', user.uid);
      const batch = writeBatch(db);
      batch.update(userRef, {
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim(),
        accountHolderName: accountHolderName.trim()
      });
      await batch.commit();
      
      // Show temporary success message
      const prevError = error;
      setError('Bank details saved successfully!');
      setTimeout(() => setError(prevError), 3000);
    } catch (err) {
      console.error("Error saving details:", err);
      setError('Failed to save bank details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="p-4 sm:p-6 border-b border-neutral-800 flex items-center gap-3 shrink-0 bg-neutral-900 z-10">
          <button 
            onClick={onClose}
            className="p-2 -ml-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Withdraw Funds
          </h3>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Withdrawal Requested</h4>
              <p className="text-neutral-400">
                Your request for ₹{amount} has been submitted and is pending approval.
              </p>
            </div>
          ) : (
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="bg-neutral-800/50 rounded-xl p-4 mb-6 border border-neutral-800 flex justify-between items-center">
                <div>
                  <p className="text-sm text-neutral-400 mb-1">Available Balance</p>
                  <p className="text-2xl font-bold text-green-400 font-mono">₹{userData.earnings.toFixed(2)}</p>
                </div>
              </div>

              {error && (
                <div className={`border rounded-lg p-3 flex items-start gap-2 text-sm ${error.includes('successfully') ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                  {error.includes('successfully') ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                  <p>{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="10"
                  max={userData.earnings}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                  placeholder="Minimum ₹10"
                  required
                />
              </div>

              <div className="pt-4 border-t border-neutral-800">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Bank Details</h4>
                  <button 
                    type="button" 
                    onClick={handleSaveDetailsOnly}
                    className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <Save className="w-3 h-3" /> Save Details
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                      placeholder="e.g. 1234567890"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow uppercase"
                      placeholder="e.g. SBIN0001234"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="saveDetails" 
                  checked={saveDetails}
                  onChange={(e) => setSaveDetails(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-neutral-900"
                />
                <label htmlFor="saveDetails" className="text-sm text-neutral-400 cursor-pointer">
                  Save bank details for future withdrawals
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors mt-6"
              >
                {loading ? 'Processing...' : 'Submit Request'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
