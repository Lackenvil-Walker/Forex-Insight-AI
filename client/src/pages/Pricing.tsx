import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Check, Zap, Crown, Sparkles, ArrowLeft, Loader2, Smartphone, Upload, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface MobilePayment {
  id: string;
  packageId: string | null;
  amount: number;
  credits: number;
  phoneNumber: string;
  screenshotUrl: string | null;
  status: string;
  createdAt: string;
}

const AIRTEL_MONEY_NUMBER = "0978264084";

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

  const [mobilePaymentDialog, setMobilePaymentDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);

  const { data: packages, isLoading } = useQuery<CreditPackage[]>({
    queryKey: ["/api/credit-packages"],
    queryFn: async () => {
      const res = await fetch("/api/credit-packages");
      if (!res.ok) throw new Error("Failed to fetch packages");
      return res.json();
    },
  });

  const { data: myPayments } = useQuery<MobilePayment[]>({
    queryKey: ["/api/mobile-payments"],
    queryFn: async () => {
      const res = await fetch("/api/mobile-payments");
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
    enabled: !!user && !user.isGuest,
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

  const mobilePaymentMutation = useMutation({
    mutationFn: async (data: { packageId: string; phoneNumber: string; screenshotUrl?: string }) => {
      const res = await fetch("/api/mobile-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit payment");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Submitted!",
        description: "Your payment is pending verification. Credits will be added at 10am, 12pm, or 4pm.",
      });
      setMobilePaymentDialog(false);
      setPhoneNumber("");
      setScreenshotBase64(null);
      setSelectedPackage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/mobile-payments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
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

  const handleMobilePayment = (pkg: CreditPackage) => {
    if (!user || user.isGuest) {
      setLocation("/login");
      return;
    }
    setSelectedPackage(pkg);
    setMobilePaymentDialog(true);
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitMobilePayment = () => {
    if (!selectedPackage || !phoneNumber) return;
    mobilePaymentMutation.mutate({
      packageId: selectedPackage.id,
      phoneNumber,
      screenshotUrl: screenshotBase64 || undefined,
    });
  };

  const formatPriceZAR = (priceInCents: number) => {
    const zarAmount = priceInCents / 100;
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 0,
    }).format(zarAmount);
  };

  const formatPriceUSD = (priceInCents: number) => {
    const zarAmount = priceInCents / 100;
    const usdAmount = zarAmount / 18;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(usdAmount);
  };

  const pendingPayments = myPayments?.filter(p => p.status === 'pending') || [];

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

        {pendingPayments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 max-w-2xl mx-auto"
          >
            <Card className="bg-yellow-900/20 border-yellow-600/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-yellow-500 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300 mb-2">
                  You have {pendingPayments.length} payment(s) awaiting verification. Credits are added at 10am, 12pm, and 4pm daily.
                </p>
                <ul className="space-y-1 text-sm text-slate-400">
                  {pendingPayments.map(p => (
                    <li key={p.id} className="flex justify-between">
                      <span>{p.credits} credits</span>
                      <span>{formatPriceZAR(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}

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
                        <span className="text-4xl font-bold text-white" data-testid={`text-price-${pkg.id}`}>
                          {formatPriceZAR(pkg.priceZar)}
                        </span>
                        <p className="text-sm text-slate-500 mt-1">
                          {formatPriceUSD(pkg.priceZar)} USD
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
                    <CardFooter className="flex flex-col gap-2">
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
                          `Pay with Card`
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        onClick={() => handleMobilePayment(pkg)}
                        data-testid={`button-mobile-${pkg.id}`}
                      >
                        <Smartphone className="mr-2 h-4 w-4" />
                        Pay with Airtel Money
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
          <p>Secure payments powered by Paystack & Airtel Money</p>
          <p className="mt-2">
            Questions?{" "}
            <a href="mailto:support@forexai.com" className="text-purple-400 hover:underline">
              Contact us
            </a>
          </p>
        </motion.div>
      </div>

      <Dialog open={mobilePaymentDialog} onOpenChange={setMobilePaymentDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-red-500" />
              Pay with Airtel Money
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Send payment to complete your purchase
            </DialogDescription>
          </DialogHeader>

          {selectedPackage && (
            <div className="space-y-6">
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400">Package:</span>
                  <span className="font-medium">{selectedPackage.name}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400">Credits:</span>
                  <span className="font-medium">{selectedPackage.credits}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Amount:</span>
                  <span className="text-xl font-bold text-green-400">{formatPriceZAR(selectedPackage.priceZar)}</span>
                </div>
              </div>

              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <h4 className="font-medium text-red-400 mb-2">Step 1: Send Payment</h4>
                <p className="text-sm text-slate-300 mb-2">
                  Send <span className="font-bold text-white">{formatPriceZAR(selectedPackage.priceZar)}</span> to:
                </p>
                <div className="bg-slate-800 rounded p-3 text-center">
                  <p className="text-2xl font-mono font-bold text-white">{AIRTEL_MONEY_NUMBER}</p>
                  <p className="text-xs text-slate-400 mt-1">Airtel Money</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone" className="text-slate-300">Your Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="e.g. 0978123456"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white mt-1"
                    data-testid="input-phone"
                  />
                </div>

                <div>
                  <Label className="text-slate-300">Payment Screenshot (Optional)</Label>
                  <div className="mt-1">
                    {screenshotBase64 ? (
                      <div className="relative">
                        <img
                          src={screenshotBase64}
                          alt="Payment screenshot"
                          className="w-full h-32 object-cover rounded-lg border border-slate-600"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={() => setScreenshotBase64(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-slate-500 transition-colors">
                        <Upload className="h-6 w-6 text-slate-400 mb-1" />
                        <span className="text-sm text-slate-400">Upload screenshot</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotUpload}
                          className="hidden"
                          data-testid="input-screenshot"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                <p className="text-xs text-blue-300">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Credits are verified and added at <strong>10am, 12pm, and 4pm</strong> daily.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMobilePaymentDialog(false)}
              className="border-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={submitMobilePayment}
              disabled={!phoneNumber || mobilePaymentMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-submit-mobile-payment"
            >
              {mobilePaymentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
