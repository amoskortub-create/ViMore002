"use client";

import { useState, useMemo, useRef } from "react";
import { 
  X, 
  Search, 
  Check, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Camera,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePosts, Connection } from "@/context/PostContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function CreateClusterModal({ children }: { children: React.ReactNode }) {
  const { connections, createCluster, triggerHaptic } = usePosts();
  const { toast } = useToast();

  const [isOpen,         setIsOpen]         = useState(false);
  const [step,           setStep]           = useState<"members" | "identity">("members");
  const [selectedNodes,  setSelectedNodes]  = useState<Connection[]>([]);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [clusterName,    setClusterName]    = useState("");
  const [isCreating,     setIsCreating]     = useState(false);
  const [logoFile,       setLogoFile]       = useState<File | null>(null);
  const [logoPreview,    setLogoPreview]    = useState("");

  const logoInputRef = useRef<HTMLInputElement>(null);

  const filteredNodes = useMemo(() => {
    return connections.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [connections, searchQuery]);

  const toggleNode = (node: Connection) => {
    triggerHaptic(10);
    setSelectedNodes(prev => {
      const exists = prev.find(n => n.username === node.username);
      if (exists) return prev.filter(n => n.username !== node.username);
      return [...prev, node];
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    if (e.target) e.target.value = "";
  };

  const handleCreate = async () => {
    if (!clusterName.trim()) return;
    setIsCreating(true);
    try {
      await createCluster(clusterName, selectedNodes, logoFile ?? undefined);
      toast({ title: "Cluster Materialized", description: `${clusterName} is now live.` });
      setIsOpen(false);
      reset();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to create cluster", description: err.message });
    } finally {
      setIsCreating(false);
    }
  };

  const reset = () => {
    setStep("members");
    setSelectedNodes([]);
    setSearchQuery("");
    setClusterName("");
    setLogoFile(null);
    setLogoPreview("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if (!val) reset(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="rounded-t-[3rem] p-0 border-primary/10 bg-white/95 dark:bg-[#050505]/95 backdrop-blur-3xl h-[85vh] flex flex-col top-auto bottom-0 translate-y-0 translate-x-[-50%] overflow-hidden">
        <div className="mx-auto w-12 h-1.5 bg-primary/20 rounded-full mt-4 mb-2 shrink-0" />

        <DialogHeader className="px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step === 'identity' && (
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-secondary/40" onClick={() => setStep('members')}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">
                {step === 'members' ? 'Select Nodes' : 'Cluster Identity'}
              </DialogTitle>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => setIsOpen(false)}>
              <X className="h-6 w-6" />
            </Button>
          </div>
        </DialogHeader>

        {step === 'members' ? (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="px-6 pb-4 space-y-4 shrink-0">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary" />
                <Input
                  placeholder="Search network nodes..."
                  className="pl-11 h-12 bg-secondary/30 border-none rounded-2xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3 pb-2">
                  {selectedNodes.map(node => (
                    <div key={node.username} className="relative shrink-0 animate-in zoom-in duration-300">
                      <Avatar className="h-12 w-12 border-2 border-primary shadow-lg">
                        <AvatarImage src={node.avatar} />
                      </Avatar>
                      <button
                        onClick={() => toggleNode(node)}
                        className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 shadow-md"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {selectedNodes.length === 0 && (
                    <div className="h-12 flex items-center px-4 border border-dashed border-primary/20 rounded-xl text-[10px] font-black uppercase text-muted-foreground/40">
                      No nodes selected
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <ScrollArea className="flex-1 px-6">
              <div className="space-y-3 pb-6">
                {filteredNodes.map((node) => {
                  const isSelected = selectedNodes.some(n => n.username === node.username);
                  return (
                    <button
                      key={node.username}
                      onClick={() => toggleNode(node)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-[1.75rem] transition-all border",
                        isSelected ? "bg-primary/10 border-primary/20" : "bg-secondary/20 border-transparent hover:bg-secondary/40"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border border-primary/5">
                          <AvatarImage src={node.avatar} />
                        </Avatar>
                        <div className="text-left">
                          <p className="font-bold text-sm leading-none">{node.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-black mt-1">@{node.username}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected ? "bg-primary border-primary text-white" : "border-primary/20"
                      )}>
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="p-6 bg-white dark:bg-[#050505] border-t border-primary/5 shrink-0">
              <Button
                className="w-full h-14 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest gap-2 shadow-2xl disabled:opacity-50"
                disabled={selectedNodes.length < 2}
                onClick={() => { triggerHaptic(20); setStep('identity'); }}
              >
                Next Step <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-10 py-6 pb-10 animate-in slide-in-from-right-4 duration-500">

                {/* ── Logo upload ── */}
                <div className="flex flex-col items-center gap-6">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleLogoChange}
                  />

                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="h-32 w-32 rounded-[2.5rem] overflow-hidden border-2 border-dashed border-primary/30 group-hover:border-primary/70 transition-all relative block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {logoPreview ? (
                        /* Selected logo preview */
                        <img
                          src={logoPreview}
                          alt="Cluster logo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        /* Default: stacked member faces */
                        <div className="w-full h-full bg-secondary/40 relative">
                          {selectedNodes.slice(0, 3).map((node, i) => (
                            <div
                              key={node.username}
                              className="absolute border-2 border-white dark:border-card rounded-full overflow-hidden shadow-xl"
                              style={{
                                width: '64px', height: '64px',
                                left: i === 0 ? '10%' : i === 1 ? '40%' : '25%',
                                top: i === 2 ? '40%' : '15%',
                                zIndex: 10 - i,
                              }}
                            >
                              <img src={node.avatar} alt="Member" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Hover overlay with camera icon */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1">
                          <Camera className="h-7 w-7 text-white drop-shadow-lg" />
                          <span className="text-white text-[9px] font-black uppercase tracking-widest drop-shadow">
                            {logoPreview ? 'Change' : 'Upload'}
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Badge button */}
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 bg-primary hover:bg-primary/90 text-white p-2.5 rounded-xl shadow-lg ring-4 ring-white dark:ring-[#050505] transition-colors"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Caption */}
                  <div className="text-center space-y-1">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">Collective Signature</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {selectedNodes.length} Nodes · {logoPreview ? 'Logo set ✓' : 'Tap to set a logo'}
                    </p>
                  </div>
                </div>

                {/* ── Cluster name ── */}
                <div className="space-y-6">
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1 group-focus-within:text-primary transition-colors">
                      Cluster Label
                    </label>
                    <Input
                      placeholder="Project Aura, Design Hub..."
                      className="h-16 rounded-2xl bg-secondary/30 border-none px-6 font-black italic uppercase text-2xl tracking-tighter focus-visible:ring-primary/20 transition-all shadow-inner"
                      value={clusterName}
                      onChange={(e) => setClusterName(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="bg-primary/5 border border-primary/10 rounded-[2rem] p-6 flex gap-4">
                    <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium leading-relaxed uppercase tracking-tighter text-muted-foreground">
                        Clusters are specialized nodes for high-velocity text and media collaboration.
                      </p>
                      <div className="border-t border-primary/10 pt-2 space-y-1">
                        <p className="text-[10px] font-black text-primary/70 uppercase tracking-widest">Collection attributes needed</p>
                        <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                          name · admin_id · admin_username<br/>
                          is_add_locked · avatar_id · cover_id
                        </p>
                        <p className="text-[10px] font-black text-primary/70 uppercase tracking-widest mt-1">Storage bucket</p>
                        <p className="text-[10px] font-mono text-muted-foreground">avatars (reused for cluster logos)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="p-6 space-y-4 bg-white dark:bg-[#050505] border-t border-primary/5 shrink-0">
              <Button
                className="w-full h-16 rounded-2xl bg-primary text-white font-black italic uppercase tracking-[0.2em] text-lg shadow-2xl disabled:opacity-50"
                disabled={!clusterName.trim() || isCreating}
                onClick={handleCreate}
              >
                {isCreating ? "Materializing..." : "Materialize Cluster"}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground font-black uppercase text-[10px] tracking-widest h-10"
                onClick={() => setStep('members')}
              >
                Back to Selection
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
