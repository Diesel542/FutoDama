import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Bot, FileText, Sparkles, ArrowRight, GitCompareArrows, FileCheck } from "lucide-react";

export default function Splash() {
  return (
    <div className="flex-1 relative overflow-hidden bg-[#0a0a12]">
      {/* Base mesh gradient - deep navy to charcoal with blue accent */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 100% 0%, rgba(99, 102, 241, 0.12) 0%, transparent 40%),
            radial-gradient(ellipse 50% 30% at 0% 100%, rgba(59, 130, 246, 0.08) 0%, transparent 40%),
            linear-gradient(to bottom, #0d1117 0%, #0a0a12 50%, #080810 100%)
          `
        }}
      />
      
      {/* Diagonal light beam / aurora effect */}
      <div 
        className="absolute inset-0 opacity-60"
        style={{
          background: `
            linear-gradient(135deg, transparent 0%, transparent 40%, rgba(59, 130, 246, 0.03) 45%, rgba(99, 102, 241, 0.05) 50%, rgba(59, 130, 246, 0.03) 55%, transparent 60%, transparent 100%)
          `
        }}
      />
      
      {/* Grid texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
      
      {/* Spotlight glow from top center */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px]"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.05) 30%, transparent 70%)'
        }}
      />
      
      {/* Vignette effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.4) 100%)'
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
