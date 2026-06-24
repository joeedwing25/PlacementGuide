import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Brain, Mic, History, ArrowRight } from "lucide-react";

const quickActions = [
  { to: "/resume", icon: FileText, label: "Resume Analyzer", desc: "Get feedback on your resume", color: "bg-blue-50 text-blue-600" },
  { to: "/quiz", icon: Brain, label: "Quiz Practice", desc: "Practice technical MCQs", color: "bg-green-50 text-green-600" },
  { to: "/interview", icon: Mic, label: "Mock Interview", desc: "Simulate a real interview", color: "bg-purple-50 text-purple-600" },
  { to: "/progress", icon: History, label: "Progress Tracker", desc: "Check your past performance", color: "bg-orange-50 text-orange-600" },
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(" ")[0] || "Student"}!
        </h1>
        <p className="mt-2 text-muted-foreground text-lg">
          Ready for today's placement preparation? Choose an activity to get started.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quickActions.map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="group block"
          >
            <Card className="h-full p-6 hover:border-primary transition-colors border-2 border-transparent bg-surface shadow-sm hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${q.color}`}>
                  <q.icon className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{q.label}</h3>
                  <p className="text-muted-foreground mt-1">{q.desc}</p>
                  <div className="mt-4 inline-flex items-center gap-1 font-semibold text-primary">
                    Start Now <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-8 bg-muted/30 border-dashed">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold">Preparation Tip</h2>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            Consistency is key! Spend at least 30 minutes every day on a mix of technical quizzes and mock interview sessions to build confidence for your actual placements.
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/profile">Complete Your Profile</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
