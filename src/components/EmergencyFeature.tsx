
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Navigation, Hospital, Fuel } from "lucide-react";
import { toast } from "sonner";

interface EmergencyLocation {
  id: string;
  name: string;
  type: 'hospital' | 'fuel';
  distance: string;
  address: string;
}

interface EmergencyFeatureProps {
  onNavigateToEmergency?: (location: EmergencyLocation) => void;
  onDeactivateEmergency?: () => void;
}

const EmergencyFeature = ({ 
  onNavigateToEmergency,
  onDeactivateEmergency
}: EmergencyFeatureProps = {}) => {
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [locations, setLocations] = useState<EmergencyLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<EmergencyLocation | null>(null);
  
  const activateEmergency = () => {
    // In a real app, this would use geolocation and mapping services to find nearest emergency services
    setIsEmergencyActive(true);
    toast.warning("Emergency mode activated!", {
      description: "Locating nearest emergency services...",
      duration: 5000,
    });
    
    // Simulate finding nearest services
    setTimeout(() => {
      const mockLocations: EmergencyLocation[] = [
        {
          id: 'h1',
          name: 'City General Hospital',
          type: 'hospital',
          distance: '1.2 km',
          address: '123 Medical Drive'
        },
        {
          id: 'h2',
          name: 'St. Mary Medical Center',
          type: 'hospital',
          distance: '3.5 km',
          address: '456 Health Boulevard'
        },
        {
          id: 'f1',
          name: 'Shell Petrol Station',
          type: 'fuel',
          distance: '0.8 km',
          address: '789 Energy Lane'
        },
        {
          id: 'f2',
          name: 'BP Gas Station',
          type: 'fuel',
          distance: '1.5 km',
          address: '101 Fuel Avenue'
        }
      ];
      
      setLocations(mockLocations);
      
      toast.success("Emergency services located!", {
        description: "Navigate to the nearest services using the directions below",
        duration: 5000,
      });
    }, 2000);
  };
  
  const deactivateEmergency = () => {
    setIsEmergencyActive(false);
    setLocations([]);
    setSelectedLocation(null);
    
    // Call the callback to revert navigation if provided
    onDeactivateEmergency?.();
    
    toast.info("Emergency mode deactivated", {
      duration: 3000,
    });
  };
  
  const handleNavigate = (location: EmergencyLocation) => {
    setSelectedLocation(location);
    
    // Call the callback with location data
    onNavigateToEmergency?.(location);
    
    toast.success(`Navigating to ${location.name}`, {
      description: `Distance: ${location.distance}`,
      duration: 3000,
    });
  };
  
  return (
    <Card className={`dashboard-card ${isEmergencyActive ? 'border-red-500' : ''}`}>
      <CardHeader className={`pb-2 ${isEmergencyActive ? 'bg-red-500/10' : ''}`}>
        <CardTitle className="text-lg font-semibold flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5" />
          Emergency Services
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isEmergencyActive ? (
          <div className="text-center py-2">
            <p className="text-muted-foreground mb-3">
              Activate emergency mode to locate the nearest hospital and fuel station
            </p>
            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={activateEmergency}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Activate Emergency Mode
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {locations
                .filter(loc => loc.type === 'hospital')
                .map(hospital => (
                  <div 
                    key={hospital.id} 
                    className={`bg-muted p-3 rounded-md flex flex-col ${
                      selectedLocation?.id === hospital.id ? 'border-2 border-primary' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Hospital className="text-red-500 mt-1 shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium">{hospital.name}</h4>
                        <p className="text-sm">{hospital.distance}</p>
                        <p className="text-xs text-muted-foreground">{hospital.address}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant={selectedLocation?.id === hospital.id ? "default" : "outline"} 
                      className="mt-2 w-full"
                      onClick={() => handleNavigate(hospital)}
                    >
                      <Navigation className="mr-1 h-3 w-3" />
                      {selectedLocation?.id === hospital.id ? "Currently Navigating" : "Navigate"}
                    </Button>
                  </div>
                ))}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {locations
                .filter(loc => loc.type === 'fuel')
                .map(station => (
                  <div 
                    key={station.id} 
                    className={`bg-muted p-3 rounded-md flex flex-col ${
                      selectedLocation?.id === station.id ? 'border-2 border-primary' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Fuel className="text-blue-500 mt-1 shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium">{station.name}</h4>
                        <p className="text-sm">{station.distance}</p>
                        <p className="text-xs text-muted-foreground">{station.address}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant={selectedLocation?.id === station.id ? "default" : "outline"} 
                      className="mt-2 w-full"
                      onClick={() => handleNavigate(station)}
                    >
                      <Navigation className="mr-1 h-3 w-3" />
                      {selectedLocation?.id === station.id ? "Currently Navigating" : "Navigate"}
                    </Button>
                  </div>
                ))}
            </div>
            
            <Button 
              variant="outline" 
              className="w-full border-red-500 text-red-500 hover:bg-red-500/10" 
              onClick={deactivateEmergency}
            >
              Deactivate Emergency Mode
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmergencyFeature;
