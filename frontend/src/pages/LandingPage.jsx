import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, Brain, Mic, History, Check } from "lucide-react";

const features = [
  { icon: FileText, title: "Resume Analyzer", desc: "Get an ATS score and suggestions to improve your resume content." },
  { icon: Brain, title: "Quiz Practice", desc: "Practice technical and aptitude MCQs to test your knowledge." },
  { icon: Mic, title: "Mock Interview", desc: "Simulate technical and behavioral interviews with structured questions." },
  { icon: History, title: "Progress Tracking", desc: "Keep track of your performance over time with a simple dashboard." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-surface sticky top-0 z-50">
        <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-bold text-xl">PlacementGuide</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost"><Link to="/login">Log in</Link></Button>
            <Button asChild><Link to="/register">Sign up</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto leading-tight">
            Prepare for Your Campus <br />
            <span className="text-primary">Placements with Confidence.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            A simple, practical platform for students to practice quizzes, analyze resumes, and prepare for interviews.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Button asChild size="lg" className="px-8 font-semibold">
              <Link to="/register">Get Started for Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-8">
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Everything You Need</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <div key={i} className="p-6 border rounded-lg bg-surface">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-surface text-sm text-muted-foreground">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>© 2026 PlacementGuide · Student Project</div>
          <div className="flex gap-6">
            <span>Built with React & FastAPI</span>
            <span>MongoDB Database</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
