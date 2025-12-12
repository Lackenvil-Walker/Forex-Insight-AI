import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Check, Zap, Crown, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceZar: number;
  description: string | null;
  isActive: boolean;
}

const tierIcons: Record<string, React.ReactNode> = {
  Starter: <Zap className="h-8 w-8 text-blue-500" />,
  Pro: <Sparkles className="h-8 w-8 text-purple-500" />,
  Enterprise: <Crown className="h-8 w-8 text-yellow-500" />,
};

export default function Pricing() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: packages, isLoading } = useQuery<CreditPackage[]>({
    queryKey: ["/api/credit-packages"],
    queryFn: async () => {
      const res = await fetch("/api/credit-packages");
      if (!res.ok) throw new Error("Failed to fetch packages");
      return res.json();
    },
  });

  const initializeMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to initialize payment");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (reference: string) => {
      const res = await fetch(`/api/paystack/verify/${reference}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to verify payment");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Successful!",
        description: `${data.credits} credits have been added to your account.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/pricing");
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const reference = params.get("reference");
    if (reference && user && !user.isGuest) {
      verifyMutation.mutate(reference);
    }
  }, [searchString, user]);

  const handlePurchase = (packageId: string) => {
    if (!user || user.isGuest) {
      setLocation("/login");
      return;
    }
    initializeMutation.mutate(packageId);
  };

  const formatPrice = (priceInCents: number) => {
    const zarAmount = priceInCents / 100;
    const zarFormatted = new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 0,
    }).format(zarAmount);
    
    // Approximate USD conversion (1 USD ≈ 18 ZAR)
    const usdAmount = zarAmount / 18;
    const usdFormatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(usdAmount);
    
    return { zar: zarFormatted, usd: usdFormatted };
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
            Buy Credits
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Purchase analysis credits to unlock AI-powered forex chart analysis
          </p>
          {user && !user.isGuest && (
            <p className="text-sm text-purple-400 mt-4" data-testid="text-current-credits">
              Current balance: {user.credits || 0} credits
            </p>
          )}
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : !packages || packages.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">
              No credit packages available yet. Please check back later.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {packages.map((pkg, index) => {
              const isPopular = pkg.name === "Pro";

              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className={`relative h-full bg-slate-900/50 border-slate-800 ${
                      isPopular ? "border-purple-500 shadow-lg shadow-purple-500/20" : ""
                    }`}
                    data-testid={`card-package-${pkg.id}`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="bg-purple-500 text-white text-sm font-medium px-4 py-1 rounded-full">
                          Best Value
                        </span>
                      </div>
                    )}
                    <CardHeader className="text-center pb-2">
                      <div className="flex justify-center mb-4">
                        {tierIcons[pkg.name] || <Zap className="h-8 w-8 text-blue-500" />}
                      </div>
                      <CardTitle className="text-2xl text-white">
                        {pkg.name}
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        {pkg.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="mb-6">
                        <span className="text-4xl font-bold text-white">
                          {formatPrice(pkg.priceZar).zar}
                        </span>
                        <p className="text-sm text-slate-400 mt-1">
                          ~{formatPrice(pkg.priceZar).usd} USD
                        </p>
                      </div>
                      <ul className="space-y-3 text-left">
                        <li className="flex items-center gap-3">
                          <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                          <span className="text-slate-300 text-sm">
                            {pkg.credits} chart analyses
                          </span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                          <span className="text-slate-300 text-sm">
                            Entry, exit & stop-loss levels
                          </span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                          <span className="text-slate-300 text-sm">
                            Detailed trading insights
                          </span>
                        </li>
                        <li className="flex items-center gap-3">
                          <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                          <span className="text-slate-300 text-sm">
                            Never expires
                          </span>
                        </li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className={`w-full ${
                          isPopular
                            ? "bg-purple-600 hover:bg-purple-700"
                            : "bg-slate-700 hover:bg-slate-600"
                        }`}
                        onClick={() => handlePurchase(pkg.id)}
                        disabled={initializeMutation.isPending || verifyMutation.isPending}
                        data-testid={`button-buy-${pkg.id}`}
                      >
                        {initializeMutation.isPending || verifyMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          `Buy ${pkg.credits} Credits`
                        )}
                      </Button>
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
          <p>Secure payments powered by Paystack</p>
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
