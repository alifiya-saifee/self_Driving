
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface ProximityAlertProps {
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

const ProximityAlert = ({ onRecordingStart, onRecordingStop }: ProximityAlertProps) => {
  // In a real app, this would receive data from proximity sensors or video analysis
  const [distance, setDistance] = useState(150); // Distance in cm
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [collisionWarning, setCollisionWarning] = useState(false);
  
  // Simulating changing distances with more realistic patterns
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate distance changes with more realistic patterns
      setDistance(prev => {
        // More sophisticated distance simulation
        let change;
        
        // Sometimes make bigger changes to simulate a vehicle passing by
        if (Math.random() < 0.2) {
          change = (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 30);
        } else {
          // Smaller changes most of the time
          change = (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 15);
        }
        
        // Occasionally bring object very close to trigger recording
        if (Math.random() < 0.15 && prev > 20) {
          return Math.max(5, Math.min(10, prev - 20));
        }
        
        // Normal distance change
        const newDistance = prev + change;
        return Math.max(5, Math.min(200, newDistance));
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Auto recording based on proximity - triggered exactly at 10cm
  useEffect(() => {
    if (distance <= 10 && !isRecording) {
      setIsRecording(true);
      setRecordingDuration(0);
      console.log("Started recording due to proximity");
      
      // Notify user with toast
      toast.warning("Collision risk detected! Recording started", {
        duration: 3000,
      });
      
      // Call parent component handler if provided
      onRecordingStart?.();
      
      // Show collision warning
      setCollisionWarning(true);
      setTimeout(() => setCollisionWarning(false), 2000);
      
      // At exactly 10cm, save the recording automatically
      if (distance === 10) {
        toast.success(`Critical distance (10cm) reached! Recording saved automatically`, {
          duration: 5000,
        });
      }
    } else if (distance > 10 && isRecording) {
      // Stop recording when object moves away from critical distance
      setIsRecording(false);
      console.log("Stopped recording - safe distance reached");
      
      // Notify user
      toast.success(`Recording saved: ${recordingDuration}s safety event`, {
        duration: 5000,
      });
      
      // Call parent component handler if provided
      onRecordingStop?.();
    }
  }, [distance, isRecording, onRecordingStart, onRecordingStop, recordingDuration]);
  
  // Recording duration counter
  useEffect(() => {
    let timer: number | null = null;
    
    if (isRecording) {
      timer = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);
  
  // Determine safety level
  const getSafetyLevel = () => {
    if (distance <= 10) return "Critical";
    if (distance <= 50) return "Warning";
    if (distance <= 100) return "Caution";
    return "Safe";
  };
  
  // Get color based on safety level
  const getColorForSafetyLevel = () => {
    if (distance <= 10) return "bg-dashboard-red";
    if (distance <= 50) return "bg-dashboard-orange";
    if (distance <= 100) return "bg-yellow-500";
    return "bg-dashboard-green";
  };
  
  // Calculate progress percentage (inverse - closer = higher percentage)
  const proximityPercentage = Math.max(0, Math.min(100, (1 - distance / 200) * 100));
  
  return (
    <Card className={`dashboard-card ${collisionWarning ? 'animate-pulse border-dashboard-red' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span>Proximity Alert</span>
          {isRecording && (
            <span className="flex items-center text-xs font-normal text-dashboard-red">
              <span className="h-2 w-2 rounded-full bg-dashboard-red animate-pulse mr-1"></span>
              Recording: {recordingDuration}s
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex items-center justify-between">
          <span className="data-label">Nearest Object</span>
          <span className={`font-medium ${distance <= 50 ? "text-dashboard-orange" : ""}`}>
            {distance} cm
          </span>
        </div>
        <Progress value={proximityPercentage} className={`h-2 ${getColorForSafetyLevel()}`} />
        <div className="mt-4 text-center">
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium
            ${getSafetyLevel() === "Safe" ? "bg-green-500/20 text-green-500" :
              getSafetyLevel() === "Caution" ? "bg-yellow-500/20 text-yellow-500" :
              getSafetyLevel() === "Warning" ? "bg-dashboard-orange/20 text-dashboard-orange" :
              "bg-dashboard-red/20 text-dashboard-red"
            }`}
          >
            {getSafetyLevel()}
          </div>
        </div>
        
        {distance <= 30 && (
          <div className="mt-3 text-center">
            <p className={`text-xs ${distance <= 10 ? 'text-dashboard-red font-medium' : 'text-dashboard-orange'}`}>
              {distance <= 10 
                ? "Critical: Automatic recording activated" 
                : "Warning: Maintain safe distance"}
            </p>
          </div>
        )}
        
        {distance === 10 && (
          <div className="mt-3 text-center bg-dashboard-red/10 p-2 rounded-md">
            <p className="text-xs text-dashboard-red font-medium">
              ⚠️ 10cm threshold reached - Recording saved automatically
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProximityAlert;
