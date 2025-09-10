
import React from 'react';
import { GoogleIcon } from './icons/GoogleIcon';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-800 shadow-2xl rounded-2xl p-8 text-center flex flex-col items-center">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">מערכת ניהול כולל</h1>
      <p className="text-slate-600 dark:text-slate-300 mb-8">ברוכים הבאים! אנא התחברו כדי להמשיך.</p>
      <button
        onClick={onLogin}
        className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:scale-105"
      >
        <GoogleIcon className="w-6 h-6" />
        <span>התחברות עם גוגל</span>
      </button>
      <p className="text-xs text-slate-400 mt-8">
        על ידי התחברות, אתם מסכימים לתנאי השימוש ומדיניות הפרטיות.
      </p>
    </div>
  );
};

export default Login;
