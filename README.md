# 🚦 Arabic Traffic Sign Recognition (24-Class Classifier)

This project focuses on building an intelligent system for recognizing Arabic traffic signs using deep learning techniques. It is designed to classify 24 different types of traffic signs commonly found in the Middle East region, especially in Arabic-speaking countries. The system is capable of detecting signs in real-time video streams and labeling them with high accuracy.

The recognition system leverages a Convolutional Neural Network (CNN) trained on a custom dataset consisting of labeled Arabic traffic sign images. It also includes a robust filtering pipeline to reduce false positives caused by non-sign objects such as car headlights or other bright and irregular shapes.

## 🎯 Objectives

1.Build a classifier capable of recognizing 24 Arabic traffic sign classes.
2. Train and validate a deep learning model using a structured image dataset.
3. Implement a real-time detection system that can process video input.
4. Reduce false positives using color, shape, and brightness filtering.

## 📁 Dataset Overview

The dataset used for this project includes:
1. Thousands of labeled traffic sign images.
2. An Excel file mapping each image to its respective class label.
3. A wide range of sign categories with different shapes, colors, and orientations.
4. The dataset was manually organized and augmented to ensure balanced representation across all 24 classes.

## 🧠 Model Highlights

1. Built using Keras with a CNN architecture optimized for multi-class classification.
2. Trained with image normalization, augmentation, and early stopping for best results.
3. Achieves reliable accuracy across both training and unseen test data.

## Real-Time Detection System
The detection module:
1. Processes video frames using OpenCV.
2. Applies HSV-based color filtering to highlight traffic signs.
3. Uses shape and brightness constraints to eliminate irrelevant objects.
4. Classifies signs using the trained model and displays labels and confidence scores on screen.
This makes the system suitable for potential real-world integration into autonomous driving solutions or traffic monitoring tools.

##  🚧 Future Improvements
1. Expand dataset to include more sign classes and weather conditions.
2. Optimize model for deployment on edge devices like Raspberry Pi.
3. Integrate into larger driver assistance or navigation systems.

## 📌 Project Scope
This project serves as a foundational step toward Arabic traffic sign recognition, contributing to localized AI development in transportation. It is ideal for students, researchers, or developers working in the fields of computer vision, intelligent transport systems, or smart city projects.
