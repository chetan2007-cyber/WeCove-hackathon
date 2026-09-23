import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageSelector({ className = "" }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={`flex items-center gap-2 bg-[#F1F6F4] px-3 py-2 rounded-xl border border-[#DCE5E3] ${className}`}>
      <Globe className="w-4 h-4 text-[#0F7673]" />
      <select 
        value={lang} 
        onChange={(e) => setLang(e.target.value)}
        className="bg-transparent text-xs font-bold text-[#162D3D] focus:outline-none cursor-pointer"
      >
        <option value="en">English</option>
        <option value="as">অসমীয়া (Assamese)</option>
        <option value="bn">বাংলা (Bengali)</option>
        <option value="mni">মৈতৈলোন্ (Manipuri)</option>
        <option value="lus">Mizo</option>
        <option value="kha">Khasi</option>
      </select>
    </div>
  );
}