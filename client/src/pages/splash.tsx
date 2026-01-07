import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Bot, FileText, Sparkles, ArrowRight, GitCompareArrows, FileCheck } from "lucide-react";

export default function Splash() {
  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Background with gradient light effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] via-background to-background" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/[0.03] to-transparent" />
      {/* Dot texture pattern - more visible with light behind it */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
        backgroundSize: '32px 32px'
      }} />
      {/* Glowing orbs */}
      <div className="absolute top-0 left-1/2 w-[1000px] h-[600px] bg-primary/[0.08] rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/[0.04] rounded-full blur-3xl -translate-y-1/4 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/[0.03] rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-16 min-h-[calc(100vh-120px)]">
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
