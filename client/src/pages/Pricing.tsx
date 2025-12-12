import { motion } from "framer-motion";
import { Check, Zap, Crown, Sparkles, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";

const plans = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for getting started",
    price: "Free",
    icon: <Zap className="h-8 w-8 text-blue-500" />,
    features: [
      "1 chart analysis per day",
      "Basic trading signals",
      "Email support",
    ],
    buttonText: "Get Started Free",
    buttonVariant: "outline" as const,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For active traders",
    price: "Contact Admin",
    icon: <Sparkles className="h-8 w-8 text-purple-500" />,
    features: [
      "10 chart analyses per day",
      "Advanced trading signals",
      "Entry, exit & stop-loss levels",
      "Priority email support",
      "Analysis history",
    ],
    buttonText: "Contact for Credits",
    buttonVariant: "default" as const,
    isPopular: true,
  },
  {
    id: "unlimited",
    name: "Unlimited",
    description: "For professional traders",
    price: "Contact Admin",
    icon: <Crown className="h-8 w-8 text-yellow-500" />,
    features: [
      "Unlimited chart analyses",
      "Institutional-grade signals",
      "Real-time market insights",
      "24/7 priority support",
      "Full analysis history",
      "API access",
    ],
    buttonText: "Contact for Credits",
    buttonVariant: "default" as const,
  },
];

export default function Pricing() {
  const [, setLocation] = useLocation();

  const handleContact = () => {
    window.location.href = "mailto:support@forexai.com?subject=Credit%20Purchase%20Inquiry";
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
          <p className="text-sm text-slate-500 mt-4">
            Contact our admin to purchase credits for premium features
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`relative h-full bg-slate-900/50 border-slate-800 ${
                  plan.isPopular ? "border-purple-500 shadow-lg shadow-purple-500/20" : ""
                }`}
                data-testid={`card-plan-${plan.id}`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-purple-500 text-white text-sm font-medium px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-4">
                    {plan.icon}
                  </div>
                  <CardTitle className="text-2xl text-white">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                  </div>
                  <ul className="space-y-3 text-left">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span className="text-slate-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {plan.id === "starter" ? (
                    <Button
                      variant="outline"
                      className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                      onClick={() => setLocation("/dashboard")}
                      data-testid="button-get-started"
                    >
                      {plan.buttonText}
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${
                        plan.isPopular
                          ? "bg-purple-600 hover:bg-purple-700"
                          : "bg-slate-700 hover:bg-slate-600"
                      }`}
                      onClick={handleContact}
                      data-testid={`button-contact-${plan.id}`}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      {plan.buttonText}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-16 text-slate-400 text-sm"
        >
          <p>Credits are managed by our admin team</p>
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
