
import * as tf from '@tensorflow/tfjs';
import { toast } from 'sonner';

export interface CustomModelConfig {
  modelUrl: string | null;
  labelsUrl: string | null;
  isLoaded: boolean;
  name: string;
}

export interface CustomModel {
  model: tf.GraphModel | null;
  labels: string[];
  inputShape: [number, number] | null;
}

export const loadCustomModel = async (config: CustomModelConfig): Promise<CustomModel> => {
  if (!config.modelUrl || !config.labelsUrl) {
    throw new Error('Model or labels URL is missing');
  }

  try {
    // Load the model
    const model = await tf.loadGraphModel(config.modelUrl);
    
    // Load the labels
    const labelsResponse = await fetch(config.labelsUrl);
    const labelsData = await labelsResponse.json();
    
    // Extract labels array
    let labels: string[] = [];
    if (Array.isArray(labelsData)) {
      labels = labelsData;
    } else if (labelsData.labels && Array.isArray(labelsData.labels)) {
      labels = labelsData.labels;
    } else {
      console.warn('Labels format not recognized, using empty array');
    }
    
    // Get input shape
    const inputTensor = model.inputs[0];
    const shape = inputTensor.shape;
    
    // Typically the shape is [batch, height, width, channels]
    // We want [height, width]
    let inputShape: [number, number] | null = null;
    if (shape && shape.length >= 3) {
      // If batch dimension is -1 (dynamic), use the next dimensions
      const heightIndex = shape[0] === -1 ? 1 : 0;
      inputShape = [
        shape[heightIndex] as number,
        shape[heightIndex + 1] as number
      ];
    }
    
    return {
      model,
      labels,
      inputShape
    };
  } catch (error) {
    console.error('Failed to load custom model:', error);
    toast.error('Error loading custom model');
    throw error;
  }
};

export const runCustomModelInference = async (
  customModel: CustomModel,
  image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageBitmap | tf.Tensor3D
): Promise<Array<{ bbox: [number, number, number, number], class: string, confidence: number }>> => {
  if (!customModel.model) {
    return [];
  }
  
  try {
    // Convert input to tensor if it's not already
    let imageTensor: tf.Tensor3D | tf.Tensor4D;
    let shouldCleanupImageTensor = false;
    
    if (image instanceof tf.Tensor) {
      imageTensor = image as tf.Tensor3D;
      shouldCleanupImageTensor = false; // Don't dispose it as it was passed in
    } else {
      imageTensor = tf.browser.fromPixels(image);
      shouldCleanupImageTensor = true; // We created this tensor, so we should clean it up
    }
    
    // Prepare input tensor based on model requirements
    let processedTensor: tf.Tensor4D;
    
    if (customModel.inputShape) {
      // Resize to expected input shape
      const [height, width] = customModel.inputShape;
      const resized = tf.image.resizeBilinear(imageTensor, [height, width]);
      
      // Normalize to [0,1]
      const normalized = tf.div(resized, 255);
      
      // Add batch dimension
      processedTensor = tf.expandDims(normalized, 0);
      
      // Clean up intermediate tensors
      resized.dispose();
      normalized.dispose();
    } else {
      // If input shape is unknown, make best guess
      const resized = tf.image.resizeBilinear(imageTensor, [224, 224]);
      const normalized = tf.div(resized, 255);
      processedTensor = tf.expandDims(normalized, 0);
      
      resized.dispose();
      normalized.dispose();
    }
    
    // Run inference
    const result = await customModel.model.executeAsync(processedTensor) as tf.Tensor | tf.Tensor[];
    
    // Process results (this depends on the model output format)
    // Here we'll assume output format similar to COCO-SSD with [1, N, 6] shape
    // where each detection is [y1, x1, y2, x2, score, class]
    
    let detections: Array<{ 
      bbox: [number, number, number, number],
      class: string,
      confidence: number 
    }> = [];
    
    // Handle different output formats
    if (Array.isArray(result)) {
      // Multiple output tensors (common in models like YOLO)
      const boxes = result[0].arraySync() as number[][][];
      const scores = result[1].arraySync() as number[][];
      const classes = result[2].arraySync() as number[][];
      
      // Get image dimensions for scaling boxes
      let imageWidth = 0;
      let imageHeight = 0;
      
      if (image instanceof tf.Tensor) {
        imageHeight = image.shape[0];
        imageWidth = image.shape[1];
      } else {
        imageWidth = image.width;
        imageHeight = image.height;
      }
      
      // Convert to our detection format
      if (boxes && boxes[0] && scores && scores[0] && classes && classes[0]) {
        for (let i = 0; i < scores[0].length; i++) {
          const score = scores[0][i];
          if (score > 0.5) { // Threshold
            // Normalize box coordinates
            const y1 = boxes[0][i][0] * imageHeight;
            const x1 = boxes[0][i][1] * imageWidth;
            const y2 = boxes[0][i][2] * imageHeight;
            const x2 = boxes[0][i][3] * imageWidth;
            
            const width = x2 - x1;
            const height = y2 - y1;
            
            // Get class index and map to label
            const classIndex = classes[0][i];
            const className = customModel.labels[classIndex] || `Class ${classIndex}`;
            
            detections.push({
              bbox: [x1, y1, width, height],
              class: className,
              confidence: score
            });
          }
        }
      }
    } else {
      // Single output tensor
      const resultArray = await result.array() as number[][][];
      
      // Get image dimensions
      let imageWidth = 0;
      let imageHeight = 0;
      
      if (image instanceof tf.Tensor) {
        imageHeight = image.shape[0];
        imageWidth = image.shape[1];
      } else {
        imageWidth = image.width;
        imageHeight = image.height;
      }
      
      for (const detection of resultArray[0]) {
        const score = detection[4];
        if (score > 0.5) { // Confidence threshold
          // For some models, the format is [y1, x1, y2, x2, score, class]
          const y1 = detection[0] * imageHeight;
          const x1 = detection[1] * imageWidth;
          const y2 = detection[2] * imageHeight;
          const x2 = detection[3] * imageWidth;
          
          const width = x2 - x1;
          const height = y2 - y1;
          
          // Get class label
          const classIndex = Math.round(detection[5]);
          const className = customModel.labels[classIndex] || `Class ${classIndex}`;
          
          detections.push({
            bbox: [x1, y1, width, height],
            class: className,
            confidence: score
          });
        }
      }
    }
    
    // Clean up tensors
    if (shouldCleanupImageTensor) {
      imageTensor.dispose();
    }
    
    processedTensor.dispose();
    
    if (Array.isArray(result)) {
      result.forEach(tensor => tensor.dispose());
    } else {
      result.dispose();
    }
    
    return detections;
  } catch (error) {
    console.error('Error running custom model inference:', error);
    return [];
  }
};
