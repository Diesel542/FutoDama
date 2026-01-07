import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Bot, FileText, Users, Sparkles, ArrowRight, Briefcase, GitCompareArrows, FileCheck } from "lucide-react";

export default function Splash() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl mx-auto text-center space-y-12">
          <div className="space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
              <Bot className="w-10 h-10 text-primary" />
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground" data-testid="splash-title">
              FUTODAMA
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              AI-Powered Consultancy Brokering System
            </p>
            
            <p className="text-base text-muted-foreground/80 max-w-xl mx-auto">
              Transform job descriptions and resumes into structured, comparable data. 
              Match candidates intelligently with explainable AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <FeatureCard
              icon={FileText}
              title="Smart Extraction"
              description="Upload job descriptions and resumes. AI extracts key requirements and skills automatically."
            />
            <FeatureCard
              icon={GitCompareArrows}
              title="Intelligent Matching"
              description="Compare candidates against job requirements with semantic skill matching."
            />
            <FeatureCard
              icon={FileCheck}
              title="Resume Tailoring"
              description="Generate tailored resumes optimized for specific job descriptions."
            />
          </div>

          <div className="pt-4">
            <Link href="/workspace">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 h-auto group"
                data-testid="button-get-started"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Get Started
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-8 pt-8 text-sm text-muted-foreground/60">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              <span>Job Processing</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Profile Management</span>
            </div>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <span>AI-Powered</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: typeof FileText; 
  title: string; 
  description: string; 
}) {
  return (
    <div className="p-6 rounded-xl bg-card/50 border border-border/50 text-left space-y-3 hover:border-primary/30 transition-colors">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
