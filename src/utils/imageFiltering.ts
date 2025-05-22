
import * as tf from "@tensorflow/tfjs";

export interface HSVFilterParams {
  hueMin: number;
  hueMax: number;
  satMin: number;
  satMax: number;
  valMin: number;
  valMax: number;
}

export interface DetectionWithHistory {
  id: number;
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
  trackId?: number;
  framesDetected: number;
  lastSeen: number;
}

// Apply HSV color filtering to a video frame
export const applyHSVFilter = async (
  frame: HTMLVideoElement | HTMLImageElement,
  params: HSVFilterParams
): Promise<tf.Tensor3D> => {
  // Convert to tensor
  const imageTensor = tf.browser.fromPixels(frame);
  
  // Split RGB channels
  const [r, g, b] = tf.split(imageTensor, 3, 2);
  
  // Convert RGB to HSV using TensorFlow operations
  const rNorm = tf.div(r, 255);
  const gNorm = tf.div(g, 255);
  const bNorm = tf.div(b, 255);
  
  const max = tf.maximum(tf.maximum(rNorm, gNorm), bNorm);
  const min = tf.minimum(tf.minimum(rNorm, gNorm), bNorm);
  const delta = tf.sub(max, min);
  
  // Calculate Hue
  const rDelta = tf.div(tf.sub(max, rNorm), delta);
  const gDelta = tf.div(tf.sub(max, gNorm), delta);
  const bDelta = tf.div(tf.sub(max, bNorm), delta);
  
  const zeros = tf.zerosLike(rDelta);
  const ones = tf.onesLike(rDelta);
  const sixes = tf.mul(ones, 6);
  
  const rMask = tf.equal(max, rNorm);
  const gMask = tf.equal(max, gNorm);
  const bMask = tf.equal(max, bNorm);
  
  const hueR = tf.mul(tf.sub(bDelta, gDelta), rMask);
  const hueG = tf.mul(tf.add(tf.mul(tf.sub(rDelta, bDelta), 2), sixes), gMask);
  const hueB = tf.mul(tf.add(tf.mul(tf.sub(gDelta, rDelta), 4), sixes), bMask);
  
  const hueUnnorm = tf.add(hueR, tf.add(hueG, hueB));
  
  // Normalize hue to [0, 180] for OpenCV compatibility
  const hue = tf.mul(tf.div(hueUnnorm, sixes), 180);
  
  // Saturation and Value
  const sat = tf.mul(tf.div(delta, tf.add(max, 1e-7)), 255);
  const val = tf.mul(max, 255);
  
  // Apply the mask for the HSV ranges
  const hueMask = tf.logicalAnd(
    tf.greaterEqual(hue, params.hueMin),
    tf.lessEqual(hue, params.hueMax)
  );
  const satMask = tf.logicalAnd(
    tf.greaterEqual(sat, params.satMin),
    tf.lessEqual(sat, params.satMax)
  );
  const valMask = tf.logicalAnd(
    tf.greaterEqual(val, params.valMin),
    tf.lessEqual(val, params.valMax)
  );
  
  // Combine all masks
  const mask = tf.logicalAnd(tf.logicalAnd(hueMask, satMask), valMask);
  
  // Apply mask to original image
  const maskedImage = tf.mul(imageTensor, tf.cast(tf.expandDims(mask, -1), 'int32'));
  
  // Clean up tensors
  [
    imageTensor, r, g, b, rNorm, gNorm, bNorm, max, min, delta, 
    rDelta, gDelta, bDelta, zeros, ones, sixes, 
    rMask, gMask, bMask, hueR, hueG, hueB, hueUnnorm, hue,
    sat, val, hueMask, satMask, valMask, mask
  ].forEach(tensor => tensor.dispose());
  
  return maskedImage as tf.Tensor3D;
};

// Perform contour analysis
export const performContourAnalysis = (
  filteredImage: tf.Tensor3D,
  minArea: number = 100,
  maxArea: number = 10000
): tf.Tensor1D[] => {
  // This is a simplified version as TensorFlow.js doesn't have direct contour finding
  // In a real implementation, you would use a more sophisticated approach
  
  // For now, we'll just create some synthetic contours based on the filtered image
  // In a real app, you'd implement contour finding algorithms or use a library
  
  // Convert filtered image to grayscale
  const grayscale = tf.mean(filteredImage, -1);
  
  // Threshold the image to get binary mask
  const threshold = 50;
  const binary = tf.greater(grayscale, tf.scalar(threshold));
  
  // In a real implementation, next steps would be:
  // 1. Find connected components
  // 2. Extract contours
  // 3. Filter contours by area
  
  // For demo purposes, return empty array
  // A real implementation would return contours found in the image
  
  grayscale.dispose();
  binary.dispose();
  
  return [];
};

// Track detections across frames
export const trackDetections = (
  currentDetections: DetectionWithHistory[],
  previousDetections: DetectionWithHistory[],
  maxAge: number = 5, // frames
  iouThreshold: number = 0.5
): DetectionWithHistory[] => {
  const now = Date.now();
  let nextTrackId = 1;
  
  // Get the highest track ID from previous detections
  previousDetections.forEach(det => {
    if (det.trackId && det.trackId >= nextTrackId) {
      nextTrackId = det.trackId + 1;
    }
  });
  
  // Process current detections
  const trackedDetections: DetectionWithHistory[] = currentDetections.map(detection => {
    // Try to match with previous detections
    let bestMatch: DetectionWithHistory | null = null;
    let bestIoU = 0;
    
    previousDetections.forEach(prevDet => {
      const iou = calculateIoU(detection.bbox, prevDet.bbox);
      if (iou > iouThreshold && iou > bestIoU) {
        bestMatch = prevDet;
        bestIoU = iou;
      }
    });
    
    if (bestMatch) {
      // Update existing track
      return {
        ...detection,
        trackId: bestMatch.trackId,
        framesDetected: bestMatch.framesDetected + 1,
        lastSeen: now
      };
    } else {
      // Create new track
      return {
        ...detection,
        trackId: nextTrackId++,
        framesDetected: 1,
        lastSeen: now
      };
    }
  });
  
  // Add previous detections that weren't matched but are still valid (not too old)
  previousDetections.forEach(prevDet => {
    const wasMatched = trackedDetections.some(det => 
      det.trackId === prevDet.trackId
    );
    
    if (!wasMatched && now - prevDet.lastSeen < maxAge * 1000/30) { // assuming 30fps
      trackedDetections.push({
        ...prevDet,
        framesDetected: prevDet.framesDetected,
        lastSeen: prevDet.lastSeen
      });
    }
  });
  
  return trackedDetections;
};

// Calculate Intersection over Union (IoU)
const calculateIoU = (
  bbox1: [number, number, number, number],
  bbox2: [number, number, number, number]
): number => {
  // Extract coordinates
  const [x1, y1, w1, h1] = bbox1;
  const [x2, y2, w2, h2] = bbox2;
  
  // Calculate corner coordinates
  const x1min = x1;
  const y1min = y1;
  const x1max = x1 + w1;
  const y1max = y1 + h1;
  
  const x2min = x2;
  const y2min = y2;
  const x2max = x2 + w2;
  const y2max = y2 + h2;
  
  // Calculate intersection area
  const xmin = Math.max(x1min, x2min);
  const ymin = Math.max(y1min, y2min);
  const xmax = Math.min(x1max, x2max);
  const ymax = Math.min(y1max, y2max);
  
  // Check if boxes overlap
  if (xmax < xmin || ymax < ymin) {
    return 0;
  }
  
  const intersectionArea = (xmax - xmin) * (ymax - ymin);
  const area1 = w1 * h1;
  const area2 = w2 * h2;
  
  // Calculate IoU
  return intersectionArea / (area1 + area2 - intersectionArea);
};
