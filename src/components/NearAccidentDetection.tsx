
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface NearAccidentDetectionProps {
  videoData?: HTMLVideoElement | null;
  isEnabled: boolean;
  onNearAccidentDetected?: () => void;
}

const NearAccidentDetection = ({
  videoData,
  isEnabled,
  onNearAccidentDetected,
}: NearAccidentDetectionProps) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [nearAccidentDetected, setNearAccidentDetected] = useState(false);

  // Simulate the dual-stream CNN processing
  useEffect(() => {
    if (!isEnabled || !videoData) {
      setIsDetecting(false);
      return;
    }

    setIsDetecting(true);
    
    // This would be replaced with actual dual-stream CNN model
    // For now, we'll simulate with random values
    const detectionInterval = setInterval(() => {
      // Simulate detection (would be replaced with actual ML model)
      const simulatedConfidence = Math.random();
      setDetectionConfidence(simulatedConfidence);
      
      if (simulatedConfidence > 0.75) {
        setNearAccidentDetected(true);
        onNearAccidentDetected?.();
        
        // Reset after alert
        setTimeout(() => {
          setNearAccidentDetected(false);
        }, 5000);
      }
    }, 3000);
    
    return () => {
      clearInterval(detectionInterval);
      setIsDetecting(false);
    };
  }, [isEnabled, videoData, onNearAccidentDetected]);

  if (!isEnabled) {
    return null;
  }

  return (
    <Card className={`dashboard-card ${nearAccidentDetected ? 'border-red-500' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Near-Accident Detection</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Detection Status:</span>
            <span className="flex items-center">
              <span className={`h-2 w-2 rounded-full ${isDetecting ? 'bg-green-500' : 'bg-yellow-500'} mr-1.5`}></span>
              {isDetecting ? 'Active' : 'Standby'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Risk Level:</span>
            <span 
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                detectionConfidence > 0.7 ? 'bg-red-500/20 text-red-500' : 
                detectionConfidence > 0.4 ? 'bg-yellow-500/20 text-yellow-500' : 
                'bg-green-500/20 text-green-500'
              }`}
            >
              {detectionConfidence > 0.7 ? 'High' : 
               detectionConfidence > 0.4 ? 'Medium' : 'Low'}
            </span>
          </div>
        </div>
        
        {nearAccidentDetected && (
          <Alert variant="destructive" className="mt-3 animate-pulse">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Near-Accident Detected!</AlertTitle>
            <AlertDescription>
              Potential collision risk detected. Please exercise caution.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default NearAccidentDetection;
