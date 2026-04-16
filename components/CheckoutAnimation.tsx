'use client';

import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  state: 'idle' | 'processing' | 'success';
};

export default function CheckoutAnimation({ state }: Props) {
  return (
    <div className="flex h-56 items-center justify-center rounded-xl border border-slate-300/30 bg-slate-950/70">
      <AnimatePresence mode="wait">
        {state === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <motion.div
              className="mx-auto mb-4 h-14 w-14 rounded-full border-4 border-slate-500 border-t-valorant-mint"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            />
            <p className="text-lg uppercase tracking-widest text-slate-100">Processing payment...</p>
          </motion.div>
        )}

        {state === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <motion.svg
              width="88"
              height="88"
              viewBox="0 0 52 52"
              className="mx-auto mb-4"
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
            >
              <circle cx="26" cy="26" r="25" fill="none" stroke="#3bf0d0" strokeWidth="2" />
              <motion.path
                fill="none"
                stroke="#3bf0d0"
                strokeWidth="4"
                d="M14 27l8 8 16-18"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.55 }}
              />
            </motion.svg>
            <p className="text-xl uppercase text-valorant-mint">Payment Successful</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
