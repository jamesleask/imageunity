# ImageUnity - Project Overview

## Summary

ImageUnity is a lightweight Python web application designed to streamline the preparation of images for LoRA (Low-Rank Adaptation) training. It provides an intuitive browser-based interface for viewing, navigating, scaling, and cropping images to common training dimensions.

## Problem Statement

When preparing datasets for LoRA training, images often need to be:
- Scaled to specific resolutions (512x512, 768x768, 1024x1024, etc.)
- Cropped to standard aspect ratios while preserving the subject
- Reviewed and curated, with unwanted images removed

Currently, this process requires using multiple tools (image editors, file managers) and is time-consuming. ImageUnity consolidates these tasks into a single, focused interface.

## Target Users

- AI artists and hobbyists training custom LoRA models
- Data scientists preparing image datasets
- Anyone needing batch image processing with visual feedback

## Key Features

| Feature | Description |
|---------|-------------|
| **Local Web Server** | Runs on localhost by default, optional binding to all interfaces |
| **Image Navigation** | Browse through images in a folder with previous/next controls |
| **Scaling** | One-click scaling to common training resolutions |
| **Interactive Cropping** | Visual crop tool with preset aspect ratios, user selects focus area |
| **Trash Management** | Optional trash folder for soft-deleting unwanted images |
| **Destructive by Default** | Edits overwrite originals; optional `--copy` flag for non-destructive mode |

## Technology Stack

- **Backend**: Python with Flask
- **Frontend**: HTML5, CSS3, JavaScript (vanilla)
- **Image Processing**: Pillow (PIL)
- **No External Dependencies**: Runs entirely offline

## Success Criteria

1. User can launch the app and view images from a specified directory
2. User can navigate between images
3. User can scale images to preset dimensions
4. User can crop images with visual selection of the retained area
5. User can move unwanted images to a trash folder
6. All operations complete in under 2 seconds for typical images
