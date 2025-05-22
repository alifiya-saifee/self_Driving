import React, { useState, useRef, useEffect, forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VideoOff, Video, Play, Pause, Camera, ArrowRight, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import * as tf from "@tensorflow/tfjs";
import { toast } from "sonner";
import { NavigationStep } from "@/components/NavigationMap";
import { useDetection, DetectedVehicle, LaneData } from "@/context/DetectionContext";

// Load COCO-SSD model (in a real implementation, we would use YOLOv10)
import * as cocoSsd from "@tensorflow-models/coco-ssd";

// Import lane detection utilities
import { performContourAnalysis } from "@/utils/imageFiltering";

interface Detection {
  id: number;
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

interface WeatherInfo {
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  temperature: number;
}

interface TrafficFlow {
  density: number; // 0-1
  speed: number; // average in km/h
  congestion: 'low' | 'medium' | 'high';
}

interface VideoFeedProps {
  isRecording?: boolean;
}

const VideoFeed = forwardRef<HTMLVideoElement, VideoFeedProps>(({ isRecording = false }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [modelType, setModelType] = useState<'coco-ssd' | 'yolo'>('coco-ssd');
  
  // Traffic flow information
  const [trafficFlow, setTrafficFlow] = useState<TrafficFlow>({
    density: 0.3,
    speed: 45,
    congestion: 'low'
  });
  
  // Navigation and environmental info
  const [currentNavStep, setCurrentNavStep] = useState<NavigationStep | null>(null);
  const [navigationSteps, setNavigationSteps] = useState<NavigationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [co2Saved, setCo2Saved] = useState(0);
  const [weatherInfo, setWeatherInfo] = useState<WeatherInfo>({
    condition: 'sunny',
    temperature: 22
  });
  
  // New state to track if a route has been calculated
  const [hasActiveRoute, setHasActiveRoute] = useState(false);
  
  // Model reference
  const model = useRef<cocoSsd.ObjectDetection | null>(null);
  
  // Animation frame reference
  const requestAnimationFrameRef = useRef<number | null>(null);
  
  // Get the detection context
  const { setDetectedVehicles, setLaneData } = useDetection();
  
  // Expose videoRef via forwardRef
  React.useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(videoRef.current);
      } else {
        ref.current = videoRef.current;
      }
    }
  }, [ref]);
  
  // Listen for external recording trigger
  React.useEffect(() => {
    if (isRecording) {
      toast.info("Recording triggered externally");
      // In a real app, this would handle recording logic
    }
  }, [isRecording]);
  
  // Load object detection model on component mount
  useEffect(() => {
    const loadModel = async () => {
      try {
        toast.info("Loading object detection model...");
        // Make sure TensorFlow backend is initialized
        await tf.ready();
        
        // Load the model based on selected type
        if (modelType === 'yolo') {
          // In a real app, we would load YOLOv10 here
          toast.info("Using YOLOv10 model for enhanced detection");
          // Simulate loading YOLO (using COCO-SSD as a placeholder)
          model.current = await cocoSsd.load();
        } else {
          // Load standard COCO-SSD model
          model.current = await cocoSsd.load();
        }
        
        setIsModelLoaded(true);
        toast.success("Object detection model loaded successfully!");
      } catch (error) {
        console.error("Failed to load model:", error);
        toast.error("Failed to load object detection model. Please try again later.");
      }
    };

    loadModel();

    // Cleanup
    return () => {
      if (requestAnimationFrameRef.current) {
        cancelAnimationFrame(requestAnimationFrameRef.current);
      }
    };
  }, [modelType]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Stop webcam if active
      if (isWebcamActive && videoRef.current && videoRef.current.srcObject) {
        stopWebcam();
      }
      
      const url = URL.createObjectURL(file);
      setVideoSource(url);
      setIsWebcamActive(false);
      
      // Reset playing state
      setIsPlaying(false);
    }
  };

  const activateWebcam = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Your browser doesn't support webcam access");
        return;
      }
      
      // Stop existing video playback if any
      if (videoRef.current) {
        videoRef.current.pause();
      }
      
      // Get webcam stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      
      // Set stream as video source
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        setIsWebcamActive(true);
        setIsPlaying(true);
        setVideoSource(null); // Clear previous file source
        
        // Start detection
        startObjectDetection();
      }
    } catch (error) {
      console.error("Error accessing webcam:", error);
      toast.error("Couldn't access webcam. Please check permissions.");
    }
  };
  
  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsWebcamActive(false);
      setIsPlaying(false);
      
      // Stop detection loop
      if (requestAnimationFrameRef.current) {
        cancelAnimationFrame(requestAnimationFrameRef.current);
        requestAnimationFrameRef.current = null;
      }
    }
  };

  // Enhanced function to detect objects and lanes in current video frame
  const detectObjects = async () => {
    if (!videoRef.current || !canvasRef.current || 
        videoRef.current.paused || videoRef.current.ended || 
        !isPlaying) {
      return;
    }
    
    const video = videoRef.current;
    
    try {
      // Only run detection if video is ready
      if (video.readyState === 4) {
        let detectedObjects: Detection[] = [];
        
        // Try primary model first
        if (model.current && isModelLoaded) {
          const predictions = await model.current.detect(video);
          
          // Process and filter predictions
          detectedObjects = predictions
            .filter(pred => pred.score >= 0.5) // Confidence threshold
            .map((pred, index) => ({
              id: index,
              class: pred.class,
              confidence: pred.score,
              bbox: [pred.bbox[0], pred.bbox[1], pred.bbox[2], pred.bbox[3]]
            }));
        }
        
        // Update detections state with results
        setDetections(detectedObjects);
        
        // Extract vehicle data and calculate risk
        const vehicleDetections = detectedObjects
          .filter(obj => ['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(obj.class.toLowerCase()))
          .map(obj => {
            // Calculate distance based on object size (larger = closer)
            const boxArea = obj.bbox[2] * obj.bbox[3];
            const frameArea = video.videoWidth * video.videoHeight;
            const relativeSizeRatio = boxArea / frameArea;
            
            // Estimate distance based on size (smaller objects are further away)
            // This is a simplified model - in reality would need camera calibration
            const distance = Math.max(5, 50 * (1 - Math.sqrt(relativeSizeRatio)));
            
            // Calculate speed based on relative position change (not implemented in this demo)
            const speed = Math.random() * 40 + 30; // Simulated between 30-70km/h
            
            // Determine if vehicle is approaching based on position in frame
            // Objects lower in the frame are typically closer to the camera
            const yCenter = obj.bbox[1] + obj.bbox[3]/2;
            const frameHeight = video.videoHeight;
            const verticalPosition = yCenter / frameHeight;
            
            // Objects in lower half of frame are closer, thus "approaching"
            const trajectory = verticalPosition > 0.5 ? "approaching" : 
                           verticalPosition > 0.3 ? "parallel" : "departing";
            
            // Calculate collision risk
            // Higher risk for larger objects (closer), approaching trajectory
            let collisionRisk = relativeSizeRatio * 2.5; // Basic risk based on size
            
            if (trajectory === "approaching") {
              collisionRisk *= 1.5; // Increase risk for approaching vehicles
            }
            
            // Ensure risk is between 0-1
            collisionRisk = Math.min(1, Math.max(0, collisionRisk));
            
            return {
              id: obj.id,
              type: obj.class.toLowerCase() as "car" | "truck" | "motorcycle" | "bus" | "bicycle",
              distance,
              speed,
              trajectory: trajectory as "approaching" | "departing" | "parallel",
              collisionRisk,
              bbox: obj.bbox
            };
          });
        
        // Update the context with detected vehicles
        setDetectedVehicles(vehicleDetections);
        
        // Calculate traffic flow metrics based on detections
        analyzeTrafficFlow(detectedObjects);
        
        // Detect lane position
        detectLanePosition(video);
        
        // Draw on canvas
        drawDetections(detectedObjects);
      }
    } catch (error) {
      console.error("Detection error:", error);
    }
    
    // Continue detection loop
    requestAnimationFrameRef.current = requestAnimationFrame(detectObjects);
  };

  // Function to detect lane markings and calculate position
  const detectLanePosition = async (video: HTMLVideoElement) => {
    try {
      // In a real implementation, this would use computer vision to detect lanes
      // For this demo, we'll create a more advanced simulation based on detected objects
      
      // Create a video snapshot for processing
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0);
      
      // Convert to grayscale for lane detection (simplified)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imageData;
      
      // Scan the bottom quarter of the image for lane-like features
      // This is a simplified lane detection algorithm
      const scanHeight = Math.floor(canvas.height * 0.75);
      
      // Check for bright vertical regions (potential lane markings)
      let leftLaneStrength = 0;
      let centerLaneStrength = 0;
      let rightLaneStrength = 0;
      
      // Divide the image into three regions
      const leftRegion = Math.floor(canvas.width * 0.3);
      const rightRegion = Math.floor(canvas.width * 0.7);
      
      // Scan for bright pixels that could be lane markings
      for (let x = 0; x < canvas.width; x++) {
        const idx = ((scanHeight * canvas.width) + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        // High brightness could indicate lane marking
        if (brightness > 200) {
          if (x < leftRegion) {
            leftLaneStrength++;
          } else if (x > rightRegion) {
            rightLaneStrength++;
          } else {
            centerLaneStrength++;
          }
        }
      }
      
      // Normalize strengths
      const totalStrength = Math.max(1, leftLaneStrength + centerLaneStrength + rightLaneStrength);
      const leftConfidence = leftLaneStrength / totalStrength;
      const centerConfidence = centerLaneStrength / totalStrength;
      const rightConfidence = rightLaneStrength / totalStrength;
      
      // Determine vehicle's position within lane
      // In a real system, this would be much more sophisticated
      let position: 'left' | 'centered' | 'right';
      let confidence = 0.7; // Base confidence
      let deviation = 0;
      
      // Simple position algorithm based on detected lane strengths
      if (leftConfidence > centerConfidence && leftConfidence > rightConfidence) {
        position = 'left';
        deviation = Math.floor(Math.random() * 10) - 5; // slight random deviation
      } else if (rightConfidence > centerConfidence && rightConfidence > leftConfidence) {
        position = 'right';
        deviation = Math.floor(Math.random() * 10) - 5; // slight random deviation
      } else {
        position = 'centered';
        deviation = Math.floor(Math.random() * 6) - 3; // smaller deviation when centered
      }
      
      // Determine ideal position based on context
      // In real implementation, this would consider traffic, obstacles, route, etc.
      let idealPosition: 'left' | 'centered' | 'right' = 'centered';
      
      // Check for vehicles in our lane
      const vehiclesAhead = detections
        .filter(d => ['car', 'truck', 'bus', 'motorcycle'].includes(d.class.toLowerCase()))
        .filter(d => {
          // Check if this vehicle is roughly in our lane
          const centerX = d.bbox[0] + d.bbox[2]/2;
          const relativeX = centerX / video.videoWidth;
          
          // Check position relative to our current lane
          if (position === 'left' && relativeX < 0.4) return true;
          if (position === 'centered' && relativeX > 0.3 && relativeX < 0.7) return true;
          if (position === 'right' && relativeX > 0.6) return true;
          return false;
        });
      
      if (vehiclesAhead.length > 0) {
        // If vehicles ahead in our lane, suggest changing lanes
        if (position === 'left') {
          idealPosition = 'centered';
        } else if (position === 'right') {
          idealPosition = 'centered';
        } else {
          // If we're in center lane with vehicles ahead, check which side has fewer vehicles
          const leftVehicles = detections.filter(d => {
            const centerX = d.bbox[0] + d.bbox[2]/2;
            const relativeX = centerX / video.videoWidth;
            return relativeX < 0.4;
          }).length;
          
          const rightVehicles = detections.filter(d => {
            const centerX = d.bbox[0] + d.bbox[2]/2;
            const relativeX = centerX / video.videoWidth;
            return relativeX > 0.6;
          }).length;
          
          idealPosition = leftVehicles <= rightVehicles ? 'left' : 'right';
        }
      } else {
        // No vehicles ahead, suggest rightmost lane as ideal (common driving practice)
        idealPosition = 'right';
      }
      
      // Calculate score based on position vs ideal position
      let score = 100;
      if (position !== idealPosition) {
        score = Math.max(60, 100 - Math.floor(Math.random() * 30));
      }
      
      // Update lane data in context
      setLaneData({
        position,
        confidence,
        deviation,
        idealPosition,
        score
      });
      
    } catch (error) {
      console.error("Lane detection error:", error);
    }
  };
  
  // Analyze traffic flow based on detections
  const analyzeTrafficFlow = (detections: Detection[]) => {
    // Count vehicles
    const vehicleClasses = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];
    const vehicleCount = detections.filter(d => vehicleClasses.includes(d.class.toLowerCase())).length;
    
    // Calculate density based on vehicle count and frame size
    let density = Math.min(1, vehicleCount / 10);
    
    // In a real implementation, we would calculate actual speeds
    // For demo, we'll use an inverse relationship with density
    const avgSpeed = Math.max(10, 80 - (density * 70));
    
    // Determine congestion level
    let congestion: 'low' | 'medium' | 'high' = 'low';
    if (density > 0.7) congestion = 'high';
    else if (density > 0.3) congestion = 'medium';
    
    // Add some randomness for the demo
    density = Math.min(1, Math.max(0, density + (Math.random() - 0.5) * 0.1));
    
    setTrafficFlow({
      density,
      speed: avgSpeed,
      congestion
    });
  };
  
  // Function to draw bounding boxes on canvas
  const drawDetections = (detects: Detection[]) => {
    const canvas = canvasRef.current;
    if (!canvas || !videoRef.current) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions to match video
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw each detection
    detects.forEach(detection => {
      const [x, y, width, height] = detection.bbox;
      
      // Set color based on object class
      let color;
      const lowerClass = detection.class.toLowerCase();
      
      switch (lowerClass) {
        case 'car':
        case 'truck':
        case 'bus':
          color = '#0EA5E9'; // blue
          break;
        case 'person':
          color = '#F97316'; // orange
          break;
        case 'bicycle':
        case 'motorcycle':
          color = '#A855F7'; // purple
          break;
        case 'traffic light':
        case 'traffic sign':
        case 'stop sign':
          color = '#EF4444'; // red
          break;
        default:
          color = '#10B981'; // green
      }
      
      // Draw rectangle
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
      
      // Draw label background
      ctx.fillStyle = color;
      const confidenceText = `${Math.round(detection.confidence * 100)}%`;
      const label = `${detection.class} ${confidenceText}`;
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(x, y - 25, textWidth + 10, 25);
      
      // Draw label text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px monospace';
      ctx.fillText(label, x + 5, y - 7);
    });
  };

  // Start object detection loop
  const startObjectDetection = () => {
    if (requestAnimationFrameRef.current) {
      cancelAnimationFrame(requestAnimationFrameRef.current);
    }
    requestAnimationFrameRef.current = requestAnimationFrame(detectObjects);
  };

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        
        // Stop detection loop
        if (requestAnimationFrameRef.current) {
          cancelAnimationFrame(requestAnimationFrameRef.current);
          requestAnimationFrameRef.current = null;
        }
      } else {
        videoRef.current.play();
        
        // Start detection loop
        startObjectDetection();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  // When video is playing and model is loaded, run object detection
  useEffect(() => {
    if (isPlaying && !requestAnimationFrameRef.current) {
      startObjectDetection();
    }
    
    return () => {
      if (requestAnimationFrameRef.current) {
        cancelAnimationFrame(requestAnimationFrameRef.current);
        requestAnimationFrameRef.current = null;
      }
    };
  }, [isPlaying]);
  
  // Subscribe to custom events from NavigationMap component to know when a route has been calculated
  useEffect(() => {
    const handleRouteCalculated = (event: CustomEvent<{steps: NavigationStep[]}>) => {
      setHasActiveRoute(true);
      
      // Get navigation steps from the event if available
      if (event.detail && event.detail.steps) {
        setNavigationSteps(event.detail.steps);
        if (event.detail.steps.length > 0) {
          setCurrentNavStep(event.detail.steps[0]);
          setCurrentStepIndex(0);
        }
      }
    };

    const handleRouteCancelled = () => {
      setHasActiveRoute(false);
      setCurrentNavStep(null);
      setNavigationSteps([]);
      setCurrentStepIndex(0);
      setCo2Saved(0);
    };

    const handleEmergencyNavigate = (event: CustomEvent<{ destination: string, steps?: NavigationStep[] }>) => {
      setHasActiveRoute(true);
      toast.info(`Emergency navigation set to: ${event.detail.destination}`);
      
      // Get navigation steps if available
      if (event.detail && event.detail.steps) {
        setNavigationSteps(event.detail.steps);
        if (event.detail.steps.length > 0) {
          setCurrentNavStep(event.detail.steps[0]);
          setCurrentStepIndex(0);
        }
      }
    };
    
    const handleEmergencyClear = () => {
      setHasActiveRoute(false);
      setCurrentNavStep(null);
      setNavigationSteps([]);
      setCurrentStepIndex(0);
    };
    
    window.addEventListener('navigation:route-calculated', handleRouteCalculated as EventListener);
    window.addEventListener('navigation:route-cancelled', handleRouteCancelled);
    window.addEventListener('emergency:navigate', handleEmergencyNavigate as EventListener);
    window.addEventListener('emergency:clear', handleEmergencyClear);
    
    return () => {
      window.removeEventListener('navigation:route-calculated', handleRouteCalculated as EventListener);
      window.removeEventListener('navigation:route-cancelled', handleRouteCancelled);
      window.removeEventListener('emergency:navigate', handleEmergencyNavigate as EventListener);
      window.removeEventListener('emergency:clear', handleEmergencyClear);
    };
  }, []);
  
  // Navigation step updates - only when there's an active route and we have navigation steps
  useEffect(() => {
    if (isPlaying && hasActiveRoute && navigationSteps.length > 0) {
      // Only create an interval if we have valid navigation steps
      // Reset CO2 calculation to avoid duplicating
      setCo2Saved(0);
      
      // Set initial step
      setCurrentNavStep(navigationSteps[0]);
      setCurrentStepIndex(0);
      
      // Update navigation step every 10 seconds
      const navInterval = setInterval(() => {
        setCurrentStepIndex(prevIndex => {
          // Ensure we don't go beyond our steps array
          if (prevIndex < navigationSteps.length - 1) {
            const nextIndex = prevIndex + 1;
            const nextStep = navigationSteps[nextIndex];
            
            // Update current step
            setCurrentNavStep(nextStep);
            
            // Calculate CO2 savings based on this step
            const distance = parseFloat(nextStep.distance.replace(" km", "")) || 0;
            setCo2Saved(prev => prev + distance * 0.12);
            
            // Update weather randomly sometimes
            if (Math.random() > 0.7) {
              const conditions: ('sunny' | 'cloudy' | 'rainy' | 'snowy')[] = ['sunny', 'cloudy', 'rainy', 'snowy'];
              setWeatherInfo({
                condition: conditions[Math.floor(Math.random() * conditions.length)],
                temperature: Math.floor(Math.random() * 15) + 15 // 15-30°C
              });
            }
            
            return nextIndex;
          }
          return prevIndex; // Stay at the last step
        });
      }, 10000);
      
      return () => clearInterval(navInterval);
    } else if (!hasActiveRoute || navigationSteps.length === 0) {
      // Reset navigation step when no route is active or no steps
      setCurrentNavStep(null);
      setCurrentStepIndex(0);
      setCo2Saved(0);
    }
  }, [isPlaying, hasActiveRoute, navigationSteps]);

  // Render the navigation guidance overlay - only when there's an active route
  const renderNavigationOverlay = () => {
    if (!currentNavStep || !hasActiveRoute) return null;
    
    return (
      <div className="absolute top-4 left-4 right-4 bg-black/70 rounded-lg p-3 text-white backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-primary rounded-full p-1.5">
            <ArrowRight size={18} />
          </div>
          <div className="flex-1">
            <p className="font-medium">{currentNavStep.instruction}</p>
            <div className="flex text-xs text-gray-300 mt-0.5 space-x-3">
              <span>{currentNavStep.distance}</span>
              <span>•</span>
              <span>{currentNavStep.time}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render the traffic flow information
  const renderTrafficFlowInfo = () => {
    if (!isPlaying) return null;
    
    return (
      <div className="absolute bottom-16 right-4 bg-black/70 p-2 rounded text-white text-xs">
        <div className="font-medium mb-1">Traffic Flow Analysis</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <div>Density:</div>
          <div>{Math.round(trafficFlow.density * 100)}%</div>
          
          <div>Avg Speed:</div>
          <div>{Math.round(trafficFlow.speed)} km/h</div>
          
          <div>Congestion:</div>
          <div className={
            trafficFlow.congestion === 'low' ? 'text-green-400' : 
            trafficFlow.congestion === 'medium' ? 'text-yellow-400' : 
            'text-red-400'
          }>
            {trafficFlow.congestion.charAt(0).toUpperCase() + trafficFlow.congestion.slice(1)}
          </div>
        </div>
      </div>
    );
  };
  
  // Render the CO2 savings and weather info - only when there's an active route
  const renderEnvironmentalInfo = () => {
    if (!hasActiveRoute) return null;
    
    return (
      <div className="mt-4 grid grid-cols-2 gap-3">
        {/* CO2 Savings */}
        <div className="bg-card rounded-lg p-3 border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Leaf className="text-green-400 mr-2" size={18} />
              <h3 className="font-medium">CO₂ Savings</h3>
            </div>
            <div className="text-green-400 font-bold">{co2Saved.toFixed(2)} kg</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            <p>Equivalent to {(co2Saved / 21 * 100).toFixed(1)}% of a tree's yearly CO₂ absorption</p>
          </div>
        </div>
        
        {/* Weather Info */}
        <div className="bg-card rounded-lg p-3 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Weather</h3>
              <p className="capitalize text-xs">{weatherInfo.condition}</p>
            </div>
            <div className="text-right">
              <span className="font-bold text-xl">{weatherInfo.temperature}°</span>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Toggle between model types
  const toggleModelType = () => {
    // In a real app, this would switch between actual COCO-SSD and YOLOv10
    setModelType(prev => prev === 'coco-ssd' ? 'yolo' : 'coco-ssd');
    
    toast.info(`Switching to ${modelType === 'coco-ssd' ? 'YOLOv10' : 'COCO-SSD'} model...`);
    
    // Reload model
    if (requestAnimationFrameRef.current) {
      cancelAnimationFrame(requestAnimationFrameRef.current);
      requestAnimationFrameRef.current = null;
    }
    
    setIsModelLoaded(false);
    model.current = null;
  };

  return (
    <Card className="dashboard-card h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Video Feed & Detection</CardTitle>
        <div className="flex items-center space-x-2">
          {(isRecording || isRecording) && (
            <span className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-destructive animate-pulse mr-1"></span>
              Recording
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleModelType}
          >
            {modelType === 'yolo' ? 'Using YOLOv10' : 'Using COCO-SSD'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-2 relative">
        {!videoSource && !isWebcamActive ? (
          <div className="flex flex-col items-center justify-center h-[400px] bg-muted rounded-md">
            <VideoOff size={48} className="text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No video source selected</p>
            <div className="flex gap-2">
              <label htmlFor="video-upload" className="cursor-pointer">
                <div className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md">
                  Select Video File
                </div>
                <input 
                  id="video-upload" 
                  type="file" 
                  accept="video/*" 
                  onChange={handleFileSelect}
                  className="hidden" 
                />
              </label>
              <Button onClick={activateWebcam} variant="secondary">
                <Camera className="mr-2 h-4 w-4" />
                Use Webcam
              </Button>
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {isModelLoaded ? 
                <p className="text-green-500">
                  {modelType === 'yolo' ? 'YOLOv10' : 'Object detection'} model loaded and ready
                </p> : 
                <p>Loading {modelType === 'yolo' ? 'YOLOv10' : 'object detection'} model...</p>}
            </div>
          </div>
        ) : (
          <div className="relative">
            <video 
              ref={videoRef} 
              src={!isWebcamActive ? videoSource || undefined : undefined}
              className="w-full h-[400px] object-cover rounded-md bg-black"
              playsInline
            />
            <canvas 
              ref={canvasRef} 
              className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-md"
            />
            {/* Navigation overlay - only displayed when there's an active route */}
            {isPlaying && renderNavigationOverlay()}
            
            {/* Traffic flow overlay */}
            {isPlaying && renderTrafficFlowInfo()}
            
            <div className="absolute bottom-4 right-4 flex space-x-2">
              <Button 
                variant="secondary" 
                size="icon" 
                onClick={togglePlayback}
                disabled={isWebcamActive}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </Button>
              {isWebcamActive && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={stopWebcam}
                >
                  Stop Camera
                </Button>
              )}
            </div>
            <div className="absolute top-4 right-4 flex flex-col space-y-2">
              <div className="bg-black/50 text-white text-xs px-2 py-1 rounded">
                {detections.length} objects detected
              </div>
            </div>
          </div>
        )}
        
        {/* Environmental info - only displayed when there's an active route */}
        {isPlaying && renderEnvironmentalInfo()}
        
        {!hasActiveRoute && isPlaying && (
          <div className="mt-4 bg-muted p-3 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Enter a destination in the Navigation Center to see route directions and environmental data.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

VideoFeed.displayName = "VideoFeed";
export default VideoFeed;
