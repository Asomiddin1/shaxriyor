import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { YStack, XStack, Paragraph, Text, Spinner } from 'tamagui';
import {
  AlertTriangle,
  Camera as CameraIcon,
  Image as GalleryIcon,
  QrCode,
  ScanLine,
  ArrowLeft,
  Edit3,
  Check,
  X,
} from '@tamagui/lucide-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';

import {
  useReceiptSessionStore,
  CapturedReceiptImage,
} from '@/features/receipt/model/receipt-session.store';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { DEFAULT_LANGUAGE } from '@/shared/config/languages';

type ScanMode = 'camera' | 'qr';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const getDefaultSessionName = () => {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

function looksLikeReceiptUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function ScanReceiptScreen() {
  const [perm, requestPerm] = useCameraPermissions();
  const isFocused = useIsFocused();
  const router = useRouter();

  const cameraRef = useRef<CameraView | null>(null);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const captureFlash = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.9)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const parsing = useReceiptSessionStore((s) => s.parsing);
  const parseReceipt = useReceiptSessionStore((s) => s.parseReceipt);
  const parseReceiptFromQr = useReceiptSessionStore((s) => s.parseReceiptFromQr);
  const parseError = useReceiptSessionStore((s) => s.parseError);
  const setCapture = useReceiptSessionStore((s) => s.setCapture);
  const clearCapture = useReceiptSessionStore((s) => s.clearCapture);
  const storedCapture = useReceiptSessionStore((s) => s.capture);
  const setSessionNameStore = useReceiptSessionStore((s) => s.setSessionName);
  const storedSessionName = useReceiptSessionStore((s) => s.session?.sessionName);
  const appLanguage = useAppStore((s) => s.language);

  const [scanMode, setScanMode] = useState<ScanMode>('camera');
  const [sessionName, setSessionName] = useState(() => storedSessionName || getDefaultSessionName());
  const [isAutoName, setIsAutoName] = useState(() => !storedSessionName);
  const [localError, setLocalError] = useState<string | null>(null);
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const [qrScanning, setQrScanning] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSessionName, setEditSessionName] = useState(sessionName);

  const language = appLanguage || DEFAULT_LANGUAGE;

  // QR scan line animation
  useEffect(() => {
    if (scanMode === 'qr' && qrScanning) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [scanMode, qrScanning]);

  // Modal animations
  useEffect(() => {
    if (showEditModal) {
      setEditSessionName(sessionName);
      Animated.parallel([
        Animated.spring(modalScale, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } else {
      Animated.parallel([
        Animated.timing(modalScale, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showEditModal]);

  useEffect(() => {
    if (isFocused && !perm?.granted) requestPerm();
  }, [isFocused, perm?.granted, requestPerm]);

  useEffect(() => {
    if (storedSessionName) {
      setIsAutoName(false);
      setSessionName(storedSessionName);
    } else {
      setIsAutoName(true);
    }
  }, [storedSessionName]);

  useFocusEffect(
    useCallback(() => {
      if (storedSessionName) return;
      if (!isAutoName) return;
      setSessionName(getDefaultSessionName());
    }, [storedSessionName, isAutoName])
  );

  useEffect(() => () => clearCapture(), [clearCapture]);

  useEffect(() => {
    setScannedUrl(null);
    setQrScanning(true);
    setLocalError(null);
  }, [scanMode]);

  const flashAnimation = () => {
    Animated.sequence([
      Animated.timing(captureFlash, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(captureFlash, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSaveSessionName = () => {
    const trimmedName = editSessionName.trim();
    if (trimmedName) {
      setSessionName(trimmedName);
      setIsAutoName(false);
      setSessionNameStore(trimmedName);
    }
    setShowEditModal(false);
    Keyboard.dismiss();
  };

  const handleResetSessionName = () => {
    const freshName = getDefaultSessionName();
    setEditSessionName(freshName);
    setSessionName(freshName);
    setIsAutoName(true);
    setShowEditModal(false);
    Keyboard.dismiss();
  };

  const handleParse = useCallback(async () => {
    if (!cameraRef.current || parsing) return;

    try {
      setLocalError(null);
      flashAnimation();

      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
        skipProcessing: true,
      });

      if (!picture?.uri) throw new Error('Could not capture the receipt photo.');

      const targetWidth = picture.width ? Math.min(picture.width, 1280) : undefined;
      const manipResult = await manipulateAsync(
        picture.uri,
        targetWidth ? [{ resize: { width: targetWidth } }] : [],
        { compress: 0.45, format: SaveFormat.JPEG, base64: true }
      );

      if (!manipResult?.base64) throw new Error('Failed to prepare image.');

      const preparedName = sessionName.trim() || getDefaultSessionName();
      const capture: CapturedReceiptImage = {
        uri: manipResult.uri ?? picture.uri,
        base64: manipResult.base64,
        mimeType: 'image/jpeg',
        width: manipResult.width ?? picture.width,
        height: manipResult.height ?? picture.height,
      };

      setSessionNameStore(preparedName);
      setCapture(capture);

      await parseReceipt({
        sessionName: preparedName,
        language,
        image: { data: capture.base64, mimeType: capture.mimeType },
      });

      router.push('/tabs/sessions/participants');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      setLocalError(message);
    }
  }, [cameraRef, parsing, sessionName, setSessionNameStore, setCapture, parseReceipt, language, router]);

  const handlePickFromGallery = useCallback(async () => {
    if (parsing) return;

    try {
      setLocalError(null);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: false,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const asset = result.assets[0];
      const targetWidth = asset.width ? Math.min(asset.width, 1280) : undefined;
      const manipResult = await manipulateAsync(
        asset.uri,
        targetWidth ? [{ resize: { width: targetWidth } }] : [],
        { compress: 0.45, format: SaveFormat.JPEG, base64: true }
      );

      if (!manipResult?.base64) throw new Error('Failed to prepare image.');

      const preparedName = sessionName.trim() || getDefaultSessionName();
      const capture: CapturedReceiptImage = {
        uri: manipResult.uri ?? asset.uri,
        base64: manipResult.base64,
        mimeType: 'image/jpeg',
        width: manipResult.width ?? asset.width,
        height: manipResult.height ?? asset.height,
      };

      setSessionNameStore(preparedName);
      setCapture(capture);

      await parseReceipt({
        sessionName: preparedName,
        language,
        image: { data: capture.base64, mimeType: capture.mimeType },
      });

      router.push('/tabs/sessions/participants');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      setLocalError(message);
    }
  }, [parsing, sessionName, setSessionNameStore, setCapture, parseReceipt, language, router]);

  const handleQrScanned = useCallback(async ({ data }: BarcodeScanningResult) => {
    if (!qrScanning || parsing) return;
    if (!looksLikeReceiptUrl(data)) return;

    setQrScanning(false);
    setScannedUrl(data);
    setLocalError(null);

    const preparedName = sessionName.trim() || getDefaultSessionName();
    try {
      setSessionNameStore(preparedName);
      await parseReceiptFromQr({
        sessionName: preparedName,
        language,
        url: data,
      });
      router.push('/tabs/sessions/participants');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load receipt';
      setLocalError(message);
      setQrScanning(true);
      setScannedUrl(null);
    }
  }, [qrScanning, parsing, sessionName, setSessionNameStore, parseReceiptFromQr, language, router]);

  const goBack = useCallback(() => router.back(), [router]);

  const useMock = useCallback(() => {
    router.push({ pathname: '/tabs/sessions/participants', params: { receiptId: 'mock-001' } } as never);
  }, [router]);

  const disableAction = parsing || !perm?.granted;
  const errorMessage = localError || parseError;

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 220],
  });

  return (
    <View style={S.root}>
      {/* Camera View */}
      <View style={S.cameraWrap}>
        {isFocused && perm?.granted ? (
          scanMode === 'qr' ? (
            <CameraView
              ref={cameraRef}
              style={S.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={qrScanning && !parsing ? handleQrScanned : undefined}
            />
          ) : (
            <CameraView ref={cameraRef} style={S.camera} facing="back" />
          )
        ) : (
          <View style={S.permissionContainer}>
            {!perm ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <YStack ai="center" gap="$3">
                <CameraIcon size={40} color="rgba(255,255,255,0.4)" />
                <Text style={S.permissionText}>Allow camera access</Text>
              </YStack>
            )}
          </View>
        )}

        {/* Minimal QR Frame */}
        {scanMode === 'qr' && (
          <View style={S.qrOverlay} pointerEvents="none">
            <View style={S.qrFrameMinimal}>
              <View style={[S.qrCornerMinimal, { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 }]} />
              <View style={[S.qrCornerMinimal, { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 }]} />
              <View style={[S.qrCornerMinimal, { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
              <View style={[S.qrCornerMinimal, { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 }]} />
              
              {qrScanning && (
                <Animated.View
                  style={[
                    S.scanLine,
                    {
                      transform: [{ translateY: scanLineTranslateY }],
                    },
                  ]}
                />
              )}
            </View>
            <Text style={S.qrHint}>
              {scannedUrl ? 'Found!' : 'Point at QR code'}
            </Text>
          </View>
        )}

        {/* Camera Frame Guides */}
        {scanMode === 'camera' && (
          <View style={S.cameraGuides} pointerEvents="none">
            <View style={[S.guideLine, { top: '30%' }]} />
            <View style={[S.guideLine, { bottom: '30%' }]} />
          </View>
        )}

        {/* Flash Effect */}
        <Animated.View style={[S.flashEffect, { opacity: captureFlash }]} />
      </View>

      {/* Minimal Top Bar */}
      <View style={S.topBar}>
        <TouchableOpacity onPress={goBack} style={S.backBtn}>
          <ArrowLeft size={20} color="#fff" />
        </TouchableOpacity>
        
        {/* Session Name with Edit Icon */}
        <TouchableOpacity 
          style={S.sessionNameContainer}
          onPress={() => setShowEditModal(true)}
          activeOpacity={0.7}
        >
          <Text style={S.sessionNameTopText} numberOfLines={1}>
            {sessionName || getDefaultSessionName()}
          </Text>
          <Edit3 size={13} color="rgba(255,255,255,0.5)" style={S.editIcon} />
        </TouchableOpacity>
        
        {/* Mode Toggle */}
        <View style={S.modeToggle}>
          <TouchableOpacity
            onPress={() => setScanMode('camera')}
            style={[S.modeOption, scanMode === 'camera' && S.modeActive]}
          >
            <CameraIcon size={16} color={scanMode === 'camera' ? '#000' : '#fff'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setScanMode('qr')}
            style={[S.modeOption, scanMode === 'qr' && S.modeActive]}
          >
            <QrCode size={16} color={scanMode === 'qr' ? '#000' : '#fff'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Language Badge - Top Right */}
      <View style={S.languageBadgeTop}>
        <Text style={S.languageBadgeText}>{language.toUpperCase()}</Text>
      </View>

      {/* Processing State */}
      {parsing && (
        <View style={S.processingOverlay}>
          <BlurView intensity={30} tint="dark" style={S.processingBlur}>
            <YStack ai="center" gap="$3">
              <Spinner size="large" color="#fff" />
              <Text style={S.processingText}>
                {scanMode === 'qr' ? 'Loading receipt...' : 'Processing image...'}
              </Text>
            </YStack>
          </BlurView>
        </View>
      )}

      {/* Status & Error - Floating */}
      {(scannedUrl || errorMessage) && (
        <View style={S.floatingStatus}>
          {scannedUrl && (
            <BlurView intensity={20} tint="dark" style={S.statusBlur}>
              <XStack ai="center" gap="$2">
                <QrCode size={12} color="rgba(255,255,255,0.6)" />
                <Text style={S.urlText} numberOfLines={1}>{scannedUrl}</Text>
              </XStack>
            </BlurView>
          )}
          {errorMessage && (
            <BlurView intensity={20} tint="dark" style={[S.statusBlur, S.errorBlur]}>
              <XStack ai="center" gap="$2">
                <AlertTriangle size={12} color="#FF6B6B" />
                <Text style={S.errorText} numberOfLines={2}>{errorMessage}</Text>
              </XStack>
            </BlurView>
          )}
        </View>
      )}

      {/* Bottom Capture Area */}
      <View style={S.bottomCaptureArea}>
        <BlurView intensity={30} tint="dark" style={S.captureBlur}>
          {scanMode === 'camera' ? (
            <XStack ai="center" jc="space-between" px="$6">
              {/* Gallery Button */}
              <TouchableOpacity
                onPress={handlePickFromGallery}
                disabled={parsing}
                style={[S.sideBtn, parsing && S.btnDisabled]}
              >
                <GalleryIcon size={22} color="#fff" />
              </TouchableOpacity>
              
              {/* Capture Button */}
              <TouchableOpacity
                onPress={handleParse}
                disabled={disableAction}
                style={[S.captureBtnContainer, disableAction && S.btnDisabled]}
                activeOpacity={0.8}
              >
                <View style={S.captureBtnOuter}>
                  <View style={S.captureBtnInner}>
                    <View style={S.captureBtnCore} />
                  </View>
                </View>
              </TouchableOpacity>
              
              {/* Cancel Button */}
              <TouchableOpacity
                onPress={goBack}
                disabled={parsing}
                style={[S.sideBtn, parsing && S.btnDisabled]}
              >
                <X size={22} color="#fff" />
              </TouchableOpacity>
            </XStack>
          ) : (
            <XStack ai="center" jc="center" px="$6" py="$2">
              {scannedUrl ? (
                <TouchableOpacity
                  onPress={() => {
                    setScannedUrl(null);
                    setQrScanning(true);
                    setLocalError(null);
                  }}
                  style={S.qrRescanBtn}
                >
                  <ScanLine size={18} color="#fff" />
                  <Text style={S.qrRescanText}>Scan Again</Text>
                </TouchableOpacity>
              ) : (
                <XStack ai="center" gap="$2">
                  <View style={[S.dot, qrScanning ? S.dotActive : S.dotInactive]} />
                  <Text style={S.qrWaitingText}>
                    {qrScanning ? 'Scanning QR code...' : 'Ready to scan'}
                  </Text>
                </XStack>
              )}
            </XStack>
          )}
        </BlurView>
      </View>

      {/* Edit Session Name Modal - Higher Position */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={() => {
            Keyboard.dismiss();
            setShowEditModal(false);
          }}>
            <View style={S.modalOverlay}>
              <Animated.View 
                style={[
                  S.modalContent,
                  {
                    opacity: modalOpacity,
                    transform: [{ scale: modalScale }],
                  },
                ]}
              >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                  <View>
                    {/* Modal Header */}
                    <XStack jc="space-between" ai="center" mb="$4">
                      <Text style={S.modalTitle}>Session Name</Text>
                      <TouchableOpacity 
                        onPress={() => setShowEditModal(false)}
                        style={S.modalCloseBtn}
                      >
                        <X size={18} color="rgba(255,255,255,0.6)" />
                      </TouchableOpacity>
                    </XStack>

                    {/* Input Field */}
                    <View style={S.modalInputContainer}>
                      <TextInput
                        ref={inputRef}
                        value={editSessionName}
                        onChangeText={setEditSessionName}
                        style={S.modalInput}
                        placeholder="Enter session name"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        selectionColor="rgba(255,255,255,0.5)"
                        onSubmitEditing={handleSaveSessionName}
                        returnKeyType="done"
                      />
                      {editSessionName.length > 0 && (
                        <TouchableOpacity 
                          onPress={() => setEditSessionName('')}
                          style={S.modalClearBtn}
                        >
                          <X size={16} color="rgba(255,255,255,0.4)" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Character Count */}
                    <Text style={S.charCount}>
                      {editSessionName.length} characters
                    </Text>

                    {/* Actions */}
                    <XStack gap="$3" mt="$4">
                      <TouchableOpacity
                        onPress={handleResetSessionName}
                        style={S.modalResetBtn}
                      >
                        <Text style={S.modalResetText}>Auto Name</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={handleSaveSessionName}
                        style={[
                          S.modalSaveBtn,
                          !editSessionName.trim() && S.modalSaveBtnDisabled,
                        ]}
                        disabled={!editSessionName.trim()}
                      >
                        <Check size={18} color="#000" />
                        <Text style={S.modalSaveText}>Save</Text>
                      </TouchableOpacity>
                    </XStack>
                  </View>
                </TouchableWithoutFeedback>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraWrap: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
  },

  // Top Bar
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxWidth: '60%',
  },
  sessionNameTopText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
    marginRight: 6,
  },
  editIcon: {
    marginLeft: 4,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 3,
  },
  modeOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeActive: {
    backgroundColor: '#fff',
  },

  // Language Badge Top
  languageBadgeTop: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 10,
  },
  languageBadgeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // QR Frame
  qrOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  qrFrameMinimal: {
    width: 240,
    height: 240,
    position: 'relative',
  },
  qrCornerMinimal: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#fff',
  },
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  qrHint: {
    marginTop: 20,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // Camera Guides
  cameraGuides: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  guideLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // Flash
  flashEffect: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
  },

  // Processing
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  processingBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '500',
  },

  // Floating Status
  floatingStatus: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 140 : 115,
    left: 16,
    right: 16,
    zIndex: 10,
    gap: 8,
  },
  statusBlur: {
    borderRadius: 10,
    overflow: 'hidden',
    padding: 10,
  },
  errorBlur: {
    backgroundColor: 'rgba(255,107,107,0.15)',
  },
  urlText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    flex: 1,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    flex: 1,
  },

  // Bottom Capture Area
  bottomCaptureArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  captureBlur: {
    paddingVertical: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sideBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnCore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#4ADE80',
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  qrRescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  qrRescanText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  qrWaitingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 200 : 160,
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  modalInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalClearBtn: {
    padding: 12,
  },
  charCount: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  modalResetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  modalResetText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalSaveBtnDisabled: {
    opacity: 0.4,
  },
  modalSaveText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
});