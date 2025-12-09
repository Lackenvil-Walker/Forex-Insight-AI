import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Check, Zap, Crown, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Price {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
  active: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  active: boolean;
  metadata: { tier?: string; analysesPerDay?: string };
  prices: Price[];
}

const tierIcons: Record<string, React.ReactNode> = {
  starter: <Zap className="h-8 w-8 text-blue-500" />,
  pro: <Sparkles className="h-8 w-8 text-purple-500" />,
  unlimited: <Crown className="h-8 w-8 text-yellow-500" />,
};

const tierFeatures: Record<string, string[]> = {
  starter: [
    "1 chart analysis per day",
    "Basic trading signals",
    "Email support",
  ],
  pro: [
    "10 chart analyses per day",
    "Advanced trading signals",
    "Entry, exit & stop-loss levels",
    "Priority email support",
    "Analysis history",
  ],
  unlimited: [
    "Unlimited chart analyses",
    "Institutional-grade signals",
    "Real-time market insights",
    "24/7 priority support",
    "Full analysis history",
    "API access",
  ],
};

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [isYearly, setIsYearly] = useState(false);
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const { data: productsData, isLoading } = useQuery<{ data: Product[] }>({
    queryKey: ["/api/stripe/products"],
    queryFn: async () => {
      const res = await fetch("/api/stripe/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      if (!res.ok) throw new Error("Failed to create checkout session");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (priceId: string) => {
    if (!user) {
      window.location.href = "/api/login";
      return;
    }
    checkoutMutation.mutate(priceId);
  };

  const products = productsData?.data || [];
  
  const sortedProducts = [...products].sort((a, b) => {
    const order = { starter: 0, pro: 1, unlimited: 2 };
    const tierA = a.metadata?.tier || "";
    const tierB = b.metadata?.tier || "";
    return (order[tierA as keyof typeof order] || 99) - (order[tierB as keyof typeof order] || 99);
  });

  const getPrice = (product: Product) => {
    const interval = isYearly ? "year" : "month";
    return product.prices.find((p) => p.recurring?.interval === interval);
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="text-slate-400 hover:text-white mb-8"
          onClick={() => setLocation("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Get AI-powered forex chart analysis with institutional-grade trading signals
          </p>

          <div className="flex items-center justify-center gap-4 mt-8">
            <Label htmlFor="billing-toggle" className="text-slate-400">
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
              data-testid="switch-billing"
            />
            <Label htmlFor="billing-toggle" className="text-slate-400">
              Yearly
              <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                Save 17%
              </span>
            </Label>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">
              No pricing plans available yet. Please check back later.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {sortedProducts.map((product, index) => {
              const price = getPrice(product);
              const tier = product.metadata?.tier || "starter";
              const isPopular = tier === "pro";
              const isStarter = tier === "starter";

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className={`relative h-full bg-slate-900/50 border-slate-800 ${
                      isPopular ? "border-purple-500 shadow-lg shadow-purple-500/20" : ""
                    }`}
                    data-testid={`card-plan-${tier}`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="bg-purple-500 text-white text-sm font-medium px-4 py-1 rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}
                    <CardHeader className="text-center pb-2">
                      <div className="flex justify-center mb-4">
                        {tierIcons[tier] || tierIcons.starter}
                      </div>
                      <CardTitle className="text-2xl text-white">
                        {product.name}
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        {product.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="mb-6">
                        {isStarter ? (
                          <span className="text-4xl font-bold text-white">Free</span>
                        ) : price ? (
                          <>
                            <span className="text-4xl font-bold text-white">
                              {formatPrice(price.unit_amount)}
                            </span>
                            <span className="text-slate-400">
                              /{isYearly ? "year" : "month"}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400">Contact us</span>
                        )}
                      </div>
                      <ul className="space-y-3 text-left">
                        {(tierFeatures[tier] || []).map((feature, i) => (
                          <li key={i} className="flex items-center gap-3">
                            <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                            <span className="text-slate-300 text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      {isStarter ? (
                        <Button
                          variant="outline"
                          className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                          onClick={() => setLocation("/dashboard")}
                          data-testid="button-get-started"
                        >
                          Get Started Free
                        </Button>
                      ) : (
                        <Button
                          className={`w-full ${
                            isPopular
                              ? "bg-purple-600 hover:bg-purple-700"
                              : "bg-slate-700 hover:bg-slate-600"
                          }`}
                          onClick={() => price && handleSubscribe(price.id)}
                          disabled={!price || checkoutMutation.isPending}
                          data-testid={`button-subscribe-${tier}`}
                        >
                          {checkoutMutation.isPending ? "Loading..." : "Subscribe"}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-16 text-slate-400 text-sm"
        >
          <p>All plans include a 7-day money-back guarantee</p>
          <p className="mt-2">
            Questions?{" "}
            <a href="mailto:support@forexai.com" className="text-purple-400 hover:underline">
              Contact us
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
