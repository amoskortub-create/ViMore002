"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { databases, DATABASE_ID, COL, Query } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, QrCode, Camera, CameraOff, CheckCircle2, XCircle, Ticket, RefreshCcw } from "lucide-react";
import jsQR from "jsqr";

type ScanResult =
  | { status: 'valid'; message: string; ticket: any }
  | { status: 'used'; message: string; ticket: any }
  | { status: 'not_found'; message: string }
  | null;

export function AdminCheckTicketTab() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [manualSerial, setManualSerial] = useState('');
  const [cameraError, setCameraError] = useState('');

  const stopCamera = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = async () => {
    setCameraError('');
    setScanResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsScanning(true);
      intervalRef.current = setInterval(scanFrame, 300);
    } catch (e: any) {
      setCameraError('Camera access denied. Please allow camera permissions.');
    }
  };

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code?.data) {
      stopCamera();
      checkSerial(code.data);
    }
  };

  const checkSerial = async (serial: string) => {
    const cleaned = serial.trim().toUpperCase();
    if (!cleaned) return;
    setIsChecking(true);
    setScanResult(null);
    try {
      const res = await databases.listDocuments(DATABASE_ID, COL.TICKETS, [
        Query.equal('serial_number', cleaned),
        Query.limit(1),
      ]);

      if (res.documents.length === 0) {
        setScanResult({ status: 'not_found', message: `No ticket found with serial number "${cleaned}".` });
        return;
      }

      const ticket = res.documents[0] as any;
      const ownerName = ticket.owner_name || 'Guest';

      if (ticket.is_used) {
        setScanResult({
          status: 'used',
          message: `Sorry ${ownerName}, You have already used this Ticket. You can still Buy a New one.`,
          ticket,
        });
      } else {
        await databases.updateDocument(DATABASE_ID, COL.TICKETS, ticket.$id, {
          is_used: true,
          used_at: new Date().toISOString(),
        });
        setScanResult({
          status: 'valid',
          message: `Welcome ${ownerName}, Enjoy the Event!`,
          ticket,
        });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Check failed', description: e.message });
    } finally {
      setIsChecking(false);
    }
  };

  const handleManualCheck = () => {
    if (!manualSerial.trim()) return;
    checkSerial(manualSerial);
    setManualSerial('');
  };

  const reset = () => {
    setScanResult(null);
    setManualSerial('');
    stopCamera();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="px-2 space-y-1">
        <h3 className="text-3xl font-black italic uppercase tracking-tighter">Check Ticket</h3>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Scan QR Code to Verify Entry</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/40 border-border rounded-[2.5rem] overflow-hidden shadow-xl">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-black italic uppercase tracking-tighter">Camera Scanner</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Point at ticket QR code</p>
              </div>
            </div>

            <div className="relative aspect-video bg-black rounded-3xl overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${isScanning ? 'block' : 'hidden'}`}
              />
              <canvas ref={canvasRef} className="hidden" />
              {!isScanning && (
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                  <QrCode className="h-16 w-16 text-muted-foreground/40" />
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Camera inactive</p>
                  {cameraError && <p className="text-xs text-destructive">{cameraError}</p>}
                </div>
              )}
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-primary rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary/60 animate-pulse" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {!isScanning ? (
                <Button onClick={startCamera} className="flex-1 h-12 rounded-2xl font-black uppercase text-[10px] bg-primary hover:bg-primary/90">
                  <Camera className="h-4 w-4 mr-2" /> Start Scanner
                </Button>
              ) : (
                <Button onClick={stopCamera} variant="outline" className="flex-1 h-12 rounded-2xl font-black uppercase text-[10px] border-destructive/30 text-destructive">
                  <CameraOff className="h-4 w-4 mr-2" /> Stop
                </Button>
              )}
              {scanResult && (
                <Button onClick={reset} variant="ghost" className="h-12 px-4 rounded-2xl font-black uppercase text-[10px]">
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-card/40 border-border rounded-[2.5rem] overflow-hidden shadow-xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-secondary/50 flex items-center justify-center">
                  <Ticket className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-black italic uppercase tracking-tighter">Manual Entry</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Enter serial number</p>
                </div>
              </div>
              <input
                value={manualSerial}
                onChange={e => setManualSerial(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleManualCheck()}
                placeholder="e.g. A1B2C3D4E5F6G7H"
                maxLength={15}
                className="w-full bg-secondary/30 border-none rounded-2xl h-12 px-4 text-sm font-mono font-bold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <Button
                onClick={handleManualCheck}
                disabled={isChecking || !manualSerial.trim()}
                className="w-full h-12 rounded-2xl font-black uppercase text-[10px]"
              >
                {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify Ticket'}
              </Button>
            </CardContent>
          </Card>

          {isChecking && (
            <Card className="bg-card/40 border-border rounded-[2.5rem] p-6 text-center">
              <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-3" />
              <p className="font-black italic uppercase tracking-tighter">Verifying ticket...</p>
            </Card>
          )}

          {scanResult && !isChecking && (
            <Card className={`border rounded-[2.5rem] overflow-hidden shadow-xl ${
              scanResult.status === 'valid' ? 'bg-green-500/10 border-green-500/30' :
              scanResult.status === 'used' ? 'bg-red-500/10 border-red-500/30' :
              'bg-yellow-500/10 border-yellow-500/30'
            }`}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  {scanResult.status === 'valid' ? (
                    <div className="h-14 w-14 rounded-2xl bg-green-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-red-500/20 flex items-center justify-center shrink-0">
                      <XCircle className="h-8 w-8 text-red-500" />
                    </div>
                  )}
                  <div>
                    <p className={`font-black italic uppercase tracking-tighter text-lg leading-tight ${
                      scanResult.status === 'valid' ? 'text-green-400' :
                      scanResult.status === 'used' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {scanResult.status === 'valid' ? 'Access Granted' :
                       scanResult.status === 'used' ? 'Already Used' : 'Not Found'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{scanResult.message}</p>
                  </div>
                </div>

                {(scanResult.status === 'valid' || scanResult.status === 'used') && scanResult.ticket && (
                  <div className="bg-black/10 rounded-2xl p-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <p className="font-black uppercase text-muted-foreground tracking-widest">Event</p>
                        <p className="font-bold mt-0.5">{scanResult.ticket.event_title}</p>
                      </div>
                      <div>
                        <p className="font-black uppercase text-muted-foreground tracking-widest">Serial</p>
                        <p className="font-mono font-bold mt-0.5">{scanResult.ticket.serial_number}</p>
                      </div>
                      <div>
                        <p className="font-black uppercase text-muted-foreground tracking-widest">Owner</p>
                        <p className="font-bold mt-0.5">{scanResult.ticket.owner_name}</p>
                      </div>
                      <div>
                        <p className="font-black uppercase text-muted-foreground tracking-widest">Price Paid</p>
                        <p className="font-bold mt-0.5 text-primary">💎 {scanResult.ticket.price_paid}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Button onClick={reset} variant="ghost" className="w-full h-10 rounded-2xl font-black uppercase text-[10px]">
                  Scan Another Ticket
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
