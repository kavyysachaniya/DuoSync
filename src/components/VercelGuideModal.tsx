import React, { useState } from 'react';
import {
  Check,
  Cloud,
  Copy,
  ExternalLink,
  Globe,
  ShieldCheck,
  Smartphone,
  Terminal,
  X,
} from 'lucide-react';

interface VercelGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VercelGuideModal: React.FC<VercelGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => {
      setCopiedCmd((prev) => (prev === id ? null : prev));
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#12141C] border border-white/10 p-5 sm:p-6 text-zinc-100 shadow-2xl space-y-5">
        {/* Mobile Sheet Handle */}
        <div className="w-10 h-1.5 bg-zinc-700 rounded-full mx-auto sm:hidden" />

        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Host DuoPulse on Vercel</h2>
              <p className="text-xs text-zinc-400">
                Pre-configured with vercel.json & Firebase Cloud Sync
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5"
            aria-label="Close Vercel Deployment Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-zinc-300">
          {/* Step 1 */}
          <div className="rounded-2xl bg-[#090A0F] border border-white/8 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Terminal className="w-4 h-4 text-rose-400" />
              <span>Step 1 · Deploy to Vercel (GitHub or CLI)</span>
            </div>
            <p className="text-zinc-400">
              This repository already includes <code className="text-zinc-200 font-mono">vercel.json</code> (SPA routing, <code className="text-zinc-200 font-mono">npm run build</code>, output <code className="text-zinc-200 font-mono">dist</code>). Push to GitHub and import at <span className="text-white font-medium">vercel.com/new</span>, or deploy directly with the Vercel CLI:
            </p>
            <div className="flex items-center justify-between bg-[#12141C] border border-white/10 rounded-xl px-3 py-2.5 font-mono text-xs text-zinc-100">
              <span>npx vercel --prod</span>
              <button
                type="button"
                onClick={() => copyText('npx vercel --prod', 'cli')}
                className="min-h-[32px] px-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs flex items-center gap-1"
              >
                {copiedCmd === 'cli' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl bg-[#090A0F] border border-emerald-500/25 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Step 2 · Whitelist Your Vercel Domain in Firebase</span>
            </div>
            <p className="text-zinc-400">
              So Google Login & Google Fit OAuth popups work on your live <code className="text-zinc-200 font-mono">.vercel.app</code> domain, add your deployed domain in Firebase Console:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-zinc-300">
              <li>
                Open Firebase Project:{' '}
                <code className="font-mono text-white">lofty-destiny-23kqt</code>
              </li>
              <li>
                Go to <strong className="text-white">Authentication → Settings → Authorized domains</strong>
              </li>
              <li>
                Click <strong className="text-white">Add domain</strong> and enter your{' '}
                <code className="font-mono text-emerald-300">your-app.vercel.app</code> URL.
              </li>
            </ol>
            <a
              href="https://console.firebase.google.com/project/lofty-destiny-23kqt/authentication/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              <span>Open Firebase Authorized Domains</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Step 3 */}
          <div className="rounded-2xl bg-[#090A0F] border border-white/8 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sky-300 font-semibold">
              <Smartphone className="w-4 h-4 text-sky-400" />
              <span>Step 3 · Add to Phone Home Screen (Mobile App Mode)</span>
            </div>
            <p className="text-zinc-400">
              Once hosted on Vercel, open the URL on your iPhone (Safari → Share → <strong className="text-white">Add to Home Screen</strong>) or Android (Chrome → <strong className="text-white">Install App</strong>) for a full-screen dark mobile experience.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <span className="text-[11px] text-zinc-500 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5" />
            <span>Full guide saved in /VERCEL_DEPLOYMENT_GUIDE.md</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
