import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ChartUploader } from '@/components/ChartUploader';
import { AnalysisResult } from '@/components/AnalysisResult';
import { Layout } from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { History, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [_, setLocation] = useLocation();

  const handleAnalyze = async (file: File) => {
    setIsAnalyzing(true);
    setAnalysisData(null);
    
    // Simulate AI delay
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisData({
        symbol: 'EUR/USD',
        timeframe: '4H',
        trend: 'bullish',
        confidence: 87,
        entry: '1.0845',
        stopLoss: '1.0810',
        takeProfit: ['1.0890', '1.0950'],
        reasoning: [
          'Double bottom formation detected on 4H timeframe indicating reversal.',
          'RSI showing bullish divergence at oversold levels.',
          'Price action rejected from key support zone at 1.0820.',
          'Moving Average cross (EMA 20/50) impending.',
        ]
      });
    }, 3000);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Market Analysis</h1>
            <p className="text-muted-foreground">Upload your chart to get AI-powered trading insights.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-1 rounded-full border border-border">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            System Online: GPT-4o Model Active
          </div>
        </div>

        <ChartUploader onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
        
        <AnalysisResult data={analysisData} />

        {/* Recent History Section */}
        {!analysisData && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Recent Analyses
              </h2>
              <Button variant="link" className="text-primary">View All</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="hover:border-primary/50 transition-colors cursor-pointer group">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">GBP/JPY</CardTitle>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 2h ago
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-red-500">BEARISH SIGNAL</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}