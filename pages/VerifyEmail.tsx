
import React, { useState } from 'react';

interface VerifyEmailProps {
  onConfirmed: () => void;
}

const VerifyEmail: React.FC<VerifyEmailProps> = ({ onConfirmed }) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onConfirmed();
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-8 max-w-md mx-auto shadow-xl items-center justify-center text-center">
      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-8 text-blue-600 animate-bounce">
        <i className="fas fa-paper-plane text-2xl"></i>
      </div>
      <h2 className="text-3xl font-bold text-slate-900 mb-4">Check Your Inbox</h2>
      <p className="text-slate-500 mb-10">
        A "Confirm email address" message has been sent to your email. Click the link to activate your security profile.
      </p>
      
      <button
        onClick={handleConfirm}
        disabled={loading}
        className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 disabled:opacity-50 transition-all"
      >
        {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : 'I Have Confirmed My Email'}
      </button>

      <button className="mt-6 text-slate-400 font-bold hover:text-blue-600 transition-colors">
        Resend Confirmation
      </button>
    </div>
  );
};

export default VerifyEmail;
