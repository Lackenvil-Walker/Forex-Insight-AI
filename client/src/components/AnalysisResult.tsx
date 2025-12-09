import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, Target, Zap, Shield, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface AnalysisResultProps {
  data: {
    symbol: string;
    timeframe: string;
    trend: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    entry: string;
    stopLoss: string;
    takeProfit: string[];
    reasoning: string[];
  } | null;
}

export function AnalysisResult({ data }: AnalysisResultProps) {
  if (!data) return null;

  const isBullish = data.trend === 'bullish';
  const TrendIcon = isBullish ? TrendingUp : TrendingDown;
  const trendColor = isBullish ? 'text-green-500' : 'text-red-500';
  const badgeVariant = isBullish ? 'default' : 'destructive'; // Using default for green (primary), destructive for red

  // Typing effect for reasoning
  const [visibleReasoning, setVisibleReasoning] = useState<string[]>([]);

  useEffect(() => {
    setVisibleReasoning([]);
    let i = 0;
    const interval = setInterval(() => {
      if (i < data.reasoning.length) {
        setVisibleReasoning(prev => [...prev, data.reasoning[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 800);
    return () => clearInterval(interval);
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto mt-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Signal Card */}
        <Card className="md:col-span-2 border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden relative">
          <div className={`absolute top-0 left-0 w-1 h-full ${isBullish ? 'bg-primary' : 'bg-destructive'}`} />
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground font-mono mb-1">AI SIGNAL DETECTED</p>
                <CardTitle className="text-3xl font-bold flex items-center gap-3">
                  {data.symbol} <span className="text-muted-foreground text-lg font-normal">{data.timeframe}</span>
                </CardTitle>
              </div>
              <Badge variant="outline" className={`text-lg px-4 py-1 ${trendColor} border-current`}>
                {data.confidence}% CONFIDENCE
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className={`p-4 rounded-full ${isBullish ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <TrendIcon className={`w-8 h-8 ${trendColor}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Market Structure</p>
                <p className={`text-2xl font-bold ${trendColor} uppercase tracking-wide`}>
                  Strong {data.trend}
                </p>
              </div>
            </div>

            <Separator className="my-6 bg-border/50" />

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="w-4 h-4" /> Entry Zone
                </div>
                <p className="text-xl font-mono font-bold">{data.entry}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4 text-destructive" /> Stop Loss
                </div>
                <p className="text-xl font-mono font-bold text-destructive">{data.stopLoss}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="w-4 h-4 text-primary" /> Take Profit
                </div>
                <div className="flex flex-col">
                  {data.takeProfit.map((tp, idx) => (
                    <span key={idx} className="text-lg font-mono font-bold text-primary">{tp}</span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Reasoning Panel */}
        <Card className="bg-black border-border font-mono text-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
          <CardHeader className="pb-2 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              AI REASONING ENGINE
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-[300px] overflow-y-auto custom-scrollbar">
            <ul className="space-y-4">
              {visibleReasoning.map((reason, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2 text-muted-foreground"
                >
                  <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{reason}</span>
                </motion.li>
              ))}
              {visibleReasoning.length < data.reasoning.length && (
                 <li className="flex items-center gap-2 text-primary animate-pulse">
                   <span className="w-1.5 h-4 bg-primary" />
                   Processing...
                 </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}