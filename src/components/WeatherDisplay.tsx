
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudSun, CloudRain, CloudSnow } from "lucide-react";
import { toast } from "sonner";

interface WeatherData {
  temperature: number;
  humidity: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  location: string;
  windSpeed?: number;
  visibility?: number;
}

const WeatherDisplay = () => {
  const [weather, setWeather] = useState<WeatherData>({
    temperature: 22,
    humidity: 65,
    condition: 'sunny',
    location: 'Current Location',
    windSpeed: 12,
    visibility: 8
  });

  const [environmentalImpact, setEnvironmentalImpact] = useState({
    co2Saved: 0,
    fuelEfficiencyImpact: 'Good'
  });
  
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Get user's geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          
          toast.success("Retrieved your location for weather updates");
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast.error("Could not retrieve your location. Using default weather data.");
        }
      );
    } else {
      toast.error("Geolocation is not supported by your browser");
    }
  }, []);

  // Fetch weather data based on user location
  useEffect(() => {
    const fetchWeather = async () => {
      // In a real app, we'd use user's location to fetch real weather data
      // For this demo, simulate with random data that changes less frequently
      
      setTimeout(() => {
        const conditions: ('sunny' | 'cloudy' | 'rainy' | 'snowy')[] = ['sunny', 'cloudy', 'rainy', 'snowy'];
        const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
        
        // Add some randomness but ensure values don't change too much
        const newWeather = {
          temperature: Math.floor(Math.random() * 10) + 15, // 15-25°C
          humidity: Math.floor(Math.random() * 20) + 60, // 60-80%
          condition: randomCondition,
          location: userLocation ? 'Your Current Location' : 'Default Location',
          windSpeed: Math.floor(Math.random() * 10) + 5, // 5-15 km/h
          visibility: Math.floor(Math.random() * 5) + 5 // 5-10 km
        };
        
        setWeather(newWeather);
        
        // Calculate environmental impact based on weather conditions
        calculateEnvironmentalImpact(newWeather);
      }, 2000);
    };
    
    fetchWeather();
    
    // Refresh weather every 5 minutes
    const interval = setInterval(fetchWeather, 300000);
    
    return () => clearInterval(interval);
  }, [userLocation]);
  
  const calculateEnvironmentalImpact = (weatherData: WeatherData) => {
    // This would be a more complex calculation in a real app
    // Based on weather conditions, vehicle type, driving habits, etc.
    
    let baseCo2Saved = 2.5; // Base CO2 savings (kg) for eco-driving
    
    // Adjust based on weather conditions
    if (weatherData.condition === 'rainy' || weatherData.condition === 'snowy') {
      baseCo2Saved *= 0.8; // Reduced efficiency in bad weather
    }
    
    // Adjust based on temperature (moderate temperatures are more efficient)
    const tempFactor = 1 - Math.abs(weatherData.temperature - 20) / 30;
    baseCo2Saved *= Math.max(0.7, tempFactor);
    
    // Adjust based on wind (headwind reduces efficiency)
    if (weatherData.windSpeed && weatherData.windSpeed > 15) {
      baseCo2Saved *= 0.85;
    }
    
    // Round to 2 decimal places
    const co2Saved = Math.round(baseCo2Saved * 100) / 100;
    
    // Determine qualitative efficiency impact
    let fuelEfficiencyImpact = 'Good';
    if (co2Saved < 1.5) {
      fuelEfficiencyImpact = 'Poor';
    } else if (co2Saved < 2.2) {
      fuelEfficiencyImpact = 'Moderate';
    }
    
    setEnvironmentalImpact({
      co2Saved,
      fuelEfficiencyImpact
    });
  };

  const renderWeatherIcon = () => {
    switch (weather.condition) {
      case 'rainy':
        return <CloudRain size={48} className="text-blue-400" />;
      case 'snowy':
        return <CloudSnow size={48} className="text-gray-200" />;
      default:
        return <CloudSun size={48} className="text-yellow-400" />;
    }
  };

  const getWeatherConditionText = () => {
    switch (weather.condition) {
      case 'sunny':
        return 'Clear & Sunny';
      case 'cloudy':
        return 'Cloudy';
      case 'rainy':
        return 'Rainy';
      case 'snowy':
        return 'Snowy';
      default:
        return 'Unknown';
    }
  };
  
  // Get driving recommendation based on weather
  const getDrivingRecommendation = () => {
    switch (weather.condition) {
      case 'rainy':
        return 'Slow down and increase following distance';
      case 'snowy':
        return 'Use extreme caution and avoid sudden maneuvers';
      case 'cloudy':
        return 'Drive normally with standard precautions';
      case 'sunny':
        return 'Be aware of potential glare on windshield';
      default:
        return 'Drive according to conditions';
    }
  };

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Weather & Environmental</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            {renderWeatherIcon()}
            <div className="ml-4">
              <h3 className="text-2xl font-bold">{weather.temperature}°C</h3>
              <p className="text-muted-foreground">{getWeatherConditionText()}</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="data-label">Humidity</p>
            <p className="data-value">{weather.humidity}%</p>
            <p className="text-xs text-muted-foreground mt-1">{weather.location}</p>
          </div>
        </div>
        
        {/* Driving recommendation */}
        <div className={`mb-3 p-2 rounded-md text-sm ${
          weather.condition === 'snowy' ? 'bg-blue-500/10 text-blue-500' :
          weather.condition === 'rainy' ? 'bg-blue-400/10 text-blue-400' :
          'bg-yellow-500/10 text-yellow-500'
        }`}>
          <strong>Driving tip:</strong> {getDrivingRecommendation()}
        </div>
        
        <div className="border-t border-border pt-3 mt-1">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">Wind Speed</p>
              <p className="text-muted-foreground text-sm">{weather.windSpeed} km/h</p>
            </div>
            <div>
              <p className="text-sm font-medium">Visibility</p>
              <p className="text-muted-foreground text-sm">{weather.visibility} km</p>
            </div>
            <div>
              <p className="text-sm font-medium">CO₂ Saved</p>
              <p className="text-green-500 text-sm font-medium">{environmentalImpact.co2Saved} kg/h</p>
            </div>
          </div>
          <div className="mt-2 bg-muted/50 rounded-full px-3 py-1 text-center">
            <p className="text-xs">
              Current driving conditions are <span className={`font-medium ${
                environmentalImpact.fuelEfficiencyImpact === 'Good' ? 'text-green-500' : 
                environmentalImpact.fuelEfficiencyImpact === 'Moderate' ? 'text-yellow-500' : 'text-orange-500'
              }`}>{environmentalImpact.fuelEfficiencyImpact}</span> for fuel efficiency
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeatherDisplay;
