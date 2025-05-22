
import React, { createContext, useState, useContext, ReactNode } from 'react';

export interface DetectedVehicle {
  id: number;
  type: "car" | "truck" | "motorcycle" | "bus" | "bicycle";
  distance: number; // in meters
  speed: number; // in km/h
  trajectory: "approaching" | "departing" | "parallel";
  collisionRisk: number; // 0-1
  bbox: [number, number, number, number]; // [x, y, width, height]
}

export interface LaneData {
  position: 'left' | 'centered' | 'right';
  confidence: number; // 0-1
  deviation: number; // deviation from lane center in pixels
  idealPosition: 'left' | 'centered' | 'right';
  score: number; // 0-100
}

interface DetectionContextType {
  detectedVehicles: DetectedVehicle[];
  setDetectedVehicles: React.Dispatch<React.SetStateAction<DetectedVehicle[]>>;
  laneData: LaneData;
  setLaneData: React.Dispatch<React.SetStateAction<LaneData>>;
}

const DetectionContext = createContext<DetectionContextType | undefined>(undefined);

export const useDetection = () => {
  const context = useContext(DetectionContext);
  if (context === undefined) {
    throw new Error('useDetection must be used within a DetectionProvider');
  }
  return context;
};

interface DetectionProviderProps {
  children: ReactNode;
}

export const DetectionProvider = ({ children }: DetectionProviderProps) => {
  const [detectedVehicles, setDetectedVehicles] = useState<DetectedVehicle[]>([]);
  const [laneData, setLaneData] = useState<LaneData>({
    position: 'centered',
    confidence: 0.8,
    deviation: 0,
    idealPosition: 'centered',
    score: 100
  });

  return (
    <DetectionContext.Provider 
      value={{ 
        detectedVehicles, 
        setDetectedVehicles,
        laneData,
        setLaneData
      }}
    >
      {children}
    </DetectionContext.Provider>
  );
};
