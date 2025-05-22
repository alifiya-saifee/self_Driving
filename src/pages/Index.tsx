import { useState, useRef } from "react";
import VideoFeed from "@/components/VideoFeed";
import NavigationMap from "@/components/NavigationMap";
import WeatherDisplay from "@/components/WeatherDisplay";
import LanePositionIndicator from "@/components/LanePositionIndicator";
import ProximityAlert from "@/components/ProximityAlert";
import RecordingsList from "@/components/RecordingsList";
import EmergencyFeature from "@/components/EmergencyFeature";
import NearAccidentDetection from "@/components/NearAccidentDetection";
import TrafficMonitoring from "@/components/TrafficMonitoring";
import { AlertTriangle, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DetectionProvider } from "@/context/DetectionContext";

// Types
interface EmergencyLocation {
  id: string;
  name: string;
  type: 'hospital' | 'fuel';
  distance: string;
  address: string;
}

interface NavigationState {
  origin: string;
  destination: string;
  previousDestination?: string;
}

interface Vehicle {
  id: number;
  type: "car" | "truck" | "motorcycle" | "bus" | "bicycle";
  distance: number;
  speed: number;
  trajectory: "approaching" | "departing" | "parallel";
  collisionRisk: number;
}

const Index = () => {
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [emergencyNavigationActive, setEmergencyNavigationActive] = useState(false);
  const [navigationState, setNavigationState] = useState<NavigationState>({
    origin: "",
    destination: ""
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Handlers for proximity-based recording
  const handleProximityRecordingStart = () => {
    setIsRecordingActive(true);
    toast.warning("Proximity recording activated");
    // In a real application, this would trigger the VideoFeed component to start recording
  };
  
  const handleProximityRecordingStop = () => {
    setIsRecordingActive(false);
    toast.info("Proximity recording stopped and saved");
    // In a real application, this would trigger the VideoFeed component to stop and save recording
  };

  // Handler for near accidents
  const handleNearAccidentDetected = () => {
    toast.error("Near accident detected! Exercise extreme caution.", {
      duration: 5000,
    });
    // Start recording on near accident
    setIsRecordingActive(true);
  };
  
  // Handler for high risk vehicles
  const handleHighRiskVehicleDetected = (vehicle: Vehicle) => {
    toast.warning(`High risk vehicle detected: ${vehicle.type} at ${vehicle.distance.toFixed(1)}m`, {
      description: `Speed: ${vehicle.speed.toFixed(1)} km/h, Trajectory: ${vehicle.trajectory}`,
      duration: 4000
    });
  };
  
  // Handler for emergency navigation
  const handleNavigateToEmergency = (location: EmergencyLocation) => {
    // Save previous destination if there was one
    if (navigationState.destination && !emergencyNavigationActive) {
      setNavigationState(prev => ({
        ...prev,
        previousDestination: prev.destination
      }));
    }
    
    // Update navigation to emergency location
    setNavigationState(prev => ({
      ...prev,
      destination: `${location.name}, ${location.address}`
    }));
    
    setEmergencyNavigationActive(true);
    
    // Dispatch an event for the NavigationMap to update
    window.dispatchEvent(new CustomEvent('emergency:navigate', { 
      detail: {
        destination: `${location.name}, ${location.address}`
      }
    }));
  };
  
  // Handler for deactivating emergency
  const handleDeactivateEmergency = () => {
    if (emergencyNavigationActive) {
      if (navigationState.previousDestination) {
        // Revert to previous destination
        setNavigationState(prev => ({
          ...prev,
          destination: prev.previousDestination || ""
        }));
        
        // Dispatch an event for the NavigationMap to update
        window.dispatchEvent(new CustomEvent('emergency:navigate', { 
          detail: {
            destination: navigationState.previousDestination
          }
        }));
      } else {
        // Clear destination if there wasn't one before
        setNavigationState(prev => ({
          ...prev,
          destination: ""
        }));
        
        // Dispatch an event for the NavigationMap to clear
        window.dispatchEvent(new CustomEvent('emergency:clear'));
      }
    }
    
    setEmergencyNavigationActive(false);
  };

  return (
    <DetectionProvider>
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border">
          <div className="container py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Smart Route Vision Pilot</h1>
            
            {/* Emergency button in header for easier access */}
            <Button 
              variant="destructive" 
              className="flex items-center gap-2"
              onClick={() => {
                document.getElementById('emergency-section')?.scrollIntoView({
                  behavior: 'smooth'
                });
              }}
            >
              <AlertTriangle className="h-4 w-4" />
              Emergency
            </Button>
          </div>
        </header>
        
        <main className="container py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video feed takes up 2/3 of the space on large screens */}
            <div className="lg:col-span-2">
              <VideoFeed ref={videoRef} isRecording={isRecordingActive} />
            </div>
            
            {/* Right column with navigation section and weather */}
            <div className="space-y-6">
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Navigation className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Navigation Center</h2>
                </div>
                <NavigationMap 
                  navigationState={navigationState}
                  setNavigationState={setNavigationState}
                />
              </div>
              <WeatherDisplay />
            </div>
            
            {/* Advanced features section */}
            <div>
              <NearAccidentDetection 
                videoData={videoRef.current}
                isEnabled={true}
                onNearAccidentDetected={handleNearAccidentDetected}
              />
            </div>
            <div>
              <TrafficMonitoring 
                isEnabled={true}
                videoElement={videoRef.current}
                onHighRiskVehicleDetected={handleHighRiskVehicleDetected}
              />
            </div>
            
            {/* Bottom row split into sections */}
            <div>
              <LanePositionIndicator />
            </div>
            <div>
              <ProximityAlert 
                onRecordingStart={handleProximityRecordingStart}
                onRecordingStop={handleProximityRecordingStop}
              />
            </div>
            <div id="emergency-section">
              <EmergencyFeature 
                onNavigateToEmergency={handleNavigateToEmergency}
                onDeactivateEmergency={handleDeactivateEmergency}
              />
            </div>
            <div>
              <RecordingsList />
            </div>
          </div>
        </main>
        
        <footer className="border-t border-border mt-8">
          <div className="container py-4">
            <p className="text-sm text-muted-foreground text-center">
              Smart Route Vision Pilot v1.0 - Vehicle Navigation & Safety System
            </p>
          </div>
        </footer>
      </div>
    </DetectionProvider>
  );
};

export default Index;
