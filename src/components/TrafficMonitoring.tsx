
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CarFront } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useDetection } from "@/context/DetectionContext";

interface TrafficMonitoringProps {
  isEnabled: boolean;
  videoElement?: HTMLVideoElement | null;
  onHighRiskVehicleDetected?: (vehicle: any) => void;
}

const TrafficMonitoring = ({ 
  isEnabled,
  videoElement,
  onHighRiskVehicleDetected
}: TrafficMonitoringProps) => {
  const { detectedVehicles } = useDetection();
  
  // Check for high risk vehicles and trigger callback when needed
  useEffect(() => {
    if (!isEnabled) return;
    
    // Find high risk vehicles
    const highRiskVehicles = detectedVehicles.filter(v => v.collisionRisk > 0.7);
    
    // Trigger callback for each high risk vehicle
    highRiskVehicles.forEach(vehicle => {
      onHighRiskVehicleDetected?.(vehicle);
    });
  }, [detectedVehicles, isEnabled, onHighRiskVehicleDetected]);

  if (!isEnabled) {
    return null;
  }

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">3D Traffic Monitoring</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 mb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Monitoring Status:</span>
            <span className="flex items-center">
              <span className={`h-2 w-2 rounded-full ${detectedVehicles.length > 0 ? 'bg-green-500' : 'bg-yellow-500'} mr-1.5`}></span>
              {detectedVehicles.length > 0 ? 'Active' : 'Standby'}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {detectedVehicles.length} vehicles currently tracked
          </div>
        </div>
        
        <div className="space-y-3">
          {detectedVehicles.length === 0 ? (
            <div className="text-center py-3 text-sm text-muted-foreground">
              No vehicles currently detected
            </div>
          ) : (
            detectedVehicles.map(vehicle => (
              <div key={vehicle.id} className="bg-accent/20 rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <CarFront size={16} className="mr-1" />
                    <span className="text-sm font-medium capitalize">{vehicle.type}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    vehicle.trajectory === "approaching" ? "bg-yellow-500/20 text-yellow-500" : 
                    vehicle.trajectory === "departing" ? "bg-green-500/20 text-green-500" : 
                    "bg-blue-500/20 text-blue-500"
                  }`}>
                    {vehicle.trajectory}
                  </span>
                </div>
                <div className="text-xs flex justify-between mb-1">
                  <span>Distance: {vehicle.distance.toFixed(1)}m</span>
                  <span>Speed: {vehicle.speed.toFixed(1)} km/h</span>
                </div>
                <div className="text-xs mb-1">Collision Risk:</div>
                <Progress 
                  value={vehicle.collisionRisk * 100} 
                  className={`h-1 ${
                    vehicle.collisionRisk > 0.7 ? "bg-red-500" : 
                    vehicle.collisionRisk > 0.4 ? "bg-yellow-500" : 
                    "bg-green-500"
                  }`} 
                />
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrafficMonitoring;
