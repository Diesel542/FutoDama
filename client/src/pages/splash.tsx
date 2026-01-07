import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Bot, FileText, Sparkles, ArrowRight, GitCompareArrows, FileCheck } from "lucide-react";

export default function Splash() {
  return (
    <div className="flex-1 relative overflow-hidden bg-[#050508]">
      {/* Base dark gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, #0a0d14 0%, #050508 100%)'
        }}
      />
      
      {/* Primary spotlight - bright blue glow from top */}
      <div 
        className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[1400px] h-[900px]"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at center, rgba(59, 130, 246, 0.35) 0%, rgba(59, 130, 246, 0.15) 25%, rgba(99, 102, 241, 0.05) 50%, transparent 70%)'
        }}
      />
      
      {/* Secondary accent glow - right side */}
      <div 
        className="absolute top-0 -right-[200px] w-[800px] h-[600px]"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.08) 40%, transparent 70%)'
        }}
      />
      
      {/* Tertiary accent - bottom left */}
      <div 
        className="absolute -bottom-[100px] -left-[200px] w-[600px] h-[400px]"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.15) 0%, transparent 60%)'
        }}
      />
      
      {/* Grid texture overlay - more visible */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 0%, transparent 70%)'
        }}
      />
      
      {/* Subtle noise texture for depth */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
      
      {/* Vignette - subtle darkening at edges */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 80% at center, transparent 30%, rgba(0,0,0,0.5) 100%)'
        }}
      />
      
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

          <p className="pt-8 text-xs text-muted-foreground/50">
            FUTODAMA Prototype - Copyright 2026 Privateers
          </p>
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
