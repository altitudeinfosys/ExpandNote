import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export interface ImageAsset {
  uri: string;
  width: number;
  height: number;
  fileName?: string;
  type?: string;
}

interface UseImagePickerResult {
  isLoading: boolean;
  pickImage: () => Promise<ImageAsset | null>;
  takePhoto: () => Promise<ImageAsset | null>;
  showImageOptions: () => void;
  lastImage: ImageAsset | null;
}

export function useImagePicker(onImageSelected?: (image: ImageAsset) => void): UseImagePickerResult {
  const [isLoading, setIsLoading] = useState(false);
  const [lastImage, setLastImage] = useState<ImageAsset | null>(null);

  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera access is needed to take photos. Please enable it in your device settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const requestGalleryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Photo library access is needed to select images. Please enable it in your device settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const pickImage = useCallback(async (): Promise<ImageAsset | null> => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return null;

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const image: ImageAsset = {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          fileName: asset.fileName || `image-${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        };
        setLastImage(image);
        onImageSelected?.(image);
        return image;
      }
      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [onImageSelected]);

  const takePhoto = useCallback(async (): Promise<ImageAsset | null> => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return null;

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const image: ImageAsset = {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          fileName: `photo-${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        };
        setLastImage(image);
        onImageSelected?.(image);
        return image;
      }
      return null;
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [onImageSelected]);

  const showImageOptions = useCallback(() => {
    Alert.alert(
      'Add Image',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: 'Choose from Library',
          onPress: pickImage,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }, [pickImage, takePhoto]);

  return {
    isLoading,
    pickImage,
    takePhoto,
    showImageOptions,
    lastImage,
  };
}
