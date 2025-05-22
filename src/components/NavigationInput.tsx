
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Navigation } from "lucide-react";
import { toast } from "sonner";

const NavigationInput = () => {
  const [currentLocation, setCurrentLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [isRouting, setIsRouting] = useState(false);
  
  // In a real app, this would use the device's geolocation
  useEffect(() => {
    // Simulate getting current location
    setCurrentLocation("Dubai Mall");
  }, []);
  
  const handleRouteCalculation = () => {
    if (!destination.trim()) {
      toast.error("Please enter a destination");
      return;
    }
    
    setIsRouting(true);
    
    // Log routing for demonstration
    console.info(`Routing from ${currentLocation} to ${destination}`);
    
    // Simulate route calculation
    setTimeout(() => {
      setIsRouting(false);
      toast.success("Route calculated successfully", {
        description: `From ${currentLocation} to ${destination}`,
      });
      
      // In a real app, this would update the map and navigation guidance
    }, 1500);
  };
  
  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Navigation className="mr-2 h-5 w-5" />
          Navigation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <label htmlFor="current-location" className="text-sm font-medium">
              Current Location
            </label>
            <Input
              id="current-location"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              placeholder="Enter current location"
              className="mt-1"
            />
          </div>
          
          <div>
            <label htmlFor="destination" className="text-sm font-medium">
              Destination
            </label>
            <Input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Enter destination"
              className="mt-1"
            />
          </div>
          
          <Button 
            className="w-full" 
            onClick={handleRouteCalculation}
            disabled={isRouting}
          >
            {isRouting ? "Calculating Route..." : "Calculate Route"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NavigationInput;
