import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg z-50"
        >
          <Card className="border-primary shadow-[0_0_50px_rgba(0,227,150,0.15)] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
            
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Unlock Full Analysis</CardTitle>
              <CardDescription className="text-base mt-2">
                You've hit your daily limit on the Starter Plan.
                Upgrade to Pro for unlimited AI-powered signals.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-6">
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-muted-foreground">Pro Trader Plan</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-primary">$29</span>
                    <span className="text-xs text-muted-foreground">/mo</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Unlimited Daily Analyses</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Advanced Entry & Exit Zones</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Risk Management Calculator</span>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-3">
              <Button className="w-full h-12 text-lg font-bold" onClick={() => window.location.href = '/pricing'}>
                <Zap className="w-4 h-4 mr-2 fill-current" />
                Upgrade Now
              </Button>
              <Button variant="ghost" className="text-xs text-muted-foreground hover:text-foreground" onClick={onClose}>
                Maybe Later
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}