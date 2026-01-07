import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Splash from "@/pages/splash";
import Home from "@/pages/home";
import MatchWorkspacePage from "@/pages/MatchWorkspacePage";
import TailorWorkspacePage from "@/pages/TailorWorkspacePage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Splash} />
      <Route path="/workspace" component={Home} />
      <Route path="/jobs/:jobId/match" component={MatchWorkspacePage} />
      <Route path="/jobs/:jobId/tailor/:profileId" component={TailorWorkspacePage} />
      <Route path="/tailor" component={TailorWorkspacePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground flex flex-col">
          <Toaster />
          <main className="flex-1">
            <Router />
          </main>
          <footer className="py-4 text-center text-xs text-muted-foreground/60 border-t border-border/20 bg-background/50 backdrop-blur-sm">
            FUTODAMA Prototype v.0.3.2 - Copyright 2026 PRIVATEERS
          </footer>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
