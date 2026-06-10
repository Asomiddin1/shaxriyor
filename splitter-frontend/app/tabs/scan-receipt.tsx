import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { YStack, XStack, Button, Paragraph, Input, Text, Spinner } from 'tamagui';
import { ChevronLeft, AlertTriangle, Camera as CameraIcon, Image as GalleryIcon, QrCode, ScanLine } from '@tamagui/lucide-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import {
  useReceiptSessionStore,
  CapturedReceiptImage,
} from '@/features/receipt/model/receipt-session.store';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { DEFAULT_LANGUAGE } from '@/shared/config/languages';

type ScanMode = 'camera' | 'qr';

const getDefaultSessionName = () => {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return `${date} ${time}`;
};

// Check if scanned URL looks like a receipt QR (soliq.uz or similar fiscal URLs)
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
  // QR scan state
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const [qrScanning, setQrScanning] = useState(true); // prevent double-scan

  const language = appLanguage || DEFAULT_LANGUAGE;

  useEffect(() => {
    if (isFocused && !perm?.granted) requestPerm();
  }, [isFocused, perm?.granted, requestPerm]);

  useEffect(() => {
    if (storedSessionName) {
      setIsAutoName(false);
      setSessionName((prev) => (prev === storedSessionName ? prev : storedSessionName));
    } else {
      setIsAutoName(true);
    }
  }, [storedSessionName]);

  useFocusEffect(
    useCallback(() => {
      if (storedSessionName) return;
      if (!isAutoName) return;
      const freshName = getDefaultSessionName();
      setSessionName((prev) => (prev === freshName ? prev : freshName));
    }, [storedSessionName, isAutoName])
  );

  useEffect(() => () => clearCapture(), [clearCapture]);

  // Reset QR state when switching modes
  useEffect(() => {
    setScannedUrl(null);
    setQrScanning(true);
    setLocalError(null);
  }, [scanMode]);

  // --- Camera (photo) scan ---
  const handleParse = useCallback(async () => {
    if (!cameraRef.current || parsing) return;

    try {
      setLocalError(null);
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
        skipProcessing: true,
      });

      if (!picture?.uri) {
        throw new Error('Could not capture the receipt photo. Please try again.');
      }

      const targetWidth = picture.width ? Math.min(picture.width, 1280) : undefined;
      const manipResult = await manipulateAsync(
        picture.uri,
        targetWidth ? [{ resize: { width: targetWidth } }] : [],
        { compress: 0.45, format: SaveFormat.JPEG, base64: true }
      );

      if (!manipResult?.base64) {
        throw new Error('Failed to prepare the receipt photo for upload.');
      }

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
      const message = error instanceof Error ? error.message : 'Something went wrong while sending the receipt';
      setLocalError(message);
    }
  }, [cameraRef, parsing, sessionName, setSessionNameStore, setCapture, parseReceipt, language, router]);

  // --- Gallery pick ---
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

      if (!manipResult?.base64) throw new Error('Failed to prepare the selected image for upload.');

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
      const message = error instanceof Error ? error.message : 'Something went wrong while processing the image';
      setLocalError(message);
    }
  }, [parsing, sessionName, setSessionNameStore, setCapture, parseReceipt, language, router]);

  // --- QR code scanned ---
  const handleQrScanned = useCallback(async ({ data }: BarcodeScanningResult) => {
    if (!qrScanning || parsing) return;
    if (!looksLikeReceiptUrl(data)) return; // ignore non-URL QRs

    setQrScanning(false); // lock — prevent re-trigger
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
      const message = error instanceof Error ? error.message : 'Failed to load receipt from QR';
      setLocalError(message);
      setQrScanning(true); // re-enable scanning on error
      setScannedUrl(null);
    }
  }, [qrScanning, parsing, sessionName, setSessionNameStore, parseReceiptFromQr, language, router]);

  const goBack = useCallback(() => router.back(), [router]);

  const handleSessionNameChange = useCallback((value: string) => {
    setIsAutoName(false);
    setSessionName(value);
  }, []);

  const useMock = useCallback(() => {
    router.push({ pathname: '/tabs/sessions/participants', params: { receiptId: 'mock-001' } } as never);
  }, [router]);

  const disableAction = parsing || !perm?.granted;
  const errorMessage = localError || parseError;

  return (
    <View style={S.root}>
      {/* Header */}
      <View style={S.headerAbs}>
        <XStack ai="center" jc="space-between" px="$3" py="$2">
          <Button size="$2" h={28} chromeless onPress={goBack}
            icon={<ChevronLeft size={18} color="white" />} color="white">
            Back
          </Button>
          <Paragraph fow="700" fos="$6" col="white">Scan receipt</Paragraph>
          <YStack w={54} />
        </XStack>

        {/* Mode switcher */}
        <XStack ai="center" jc="center" gap="$2" px="$4" pb="$2">
          <TouchableOpacity
            onPress={() => setScanMode('camera')}
            style={[S.modeTab, scanMode === 'camera' && S.modeTabActive]}
          >
            <XStack ai="center" gap={6}>
              <CameraIcon size={14} color={scanMode === 'camera' ? '#fff' : 'rgba(255,255,255,0.6)'} />
              <Text fontSize={13} fontWeight="600"
                color={scanMode === 'camera' ? 'white' : 'rgba(255,255,255,0.6)'}>
                Photo
              </Text>
            </XStack>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setScanMode('qr')}
            style={[S.modeTab, scanMode === 'qr' && S.modeTabActive]}
          >
            <XStack ai="center" gap={6}>
              <QrCode size={14} color={scanMode === 'qr' ? '#fff' : 'rgba(255,255,255,0.6)'} />
              <Text fontSize={13} fontWeight="600"
                color={scanMode === 'qr' ? 'white' : 'rgba(255,255,255,0.6)'}>
                QR Code
              </Text>
            </XStack>
          </TouchableOpacity>
        </XStack>
      </View>

      {/* Camera view */}
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
          <YStack f={1} ai="center" jc="center">
            {!perm
              ? <ActivityIndicator color="white" />
              : <Paragraph col="$gray1">Allow camera access</Paragraph>
            }
          </YStack>
        )}

        {/* QR viewfinder overlay */}
        {scanMode === 'qr' && (
          <View style={S.qrOverlay} pointerEvents="none">
            <View style={S.qrFrame}>
              {/* Corner decorations */}
              <View style={[S.corner, S.cornerTL]} />
              <View style={[S.corner, S.cornerTR]} />
              <View style={[S.corner, S.cornerBL]} />
              <View style={[S.corner, S.cornerBR]} />
            </View>
            <Text style={S.qrHint}>
              {parsing
                ? 'Processing receipt...'
                : scannedUrl
                ? 'QR found! Loading...'
                : 'Point camera at receipt QR code'}
            </Text>
          </View>
        )}

        {/* Parsing overlay */}
        {parsing && (
          <View style={S.overlay}>
            <Spinner size="large" color="white" />
            <Paragraph mt="$2" col="white">
              {scanMode === 'qr' ? 'Loading receipt from QR...' : 'Uploading receipt...'}
            </Paragraph>
          </View>
        )}
      </View>

      {/* Bottom actions panel */}
      <View style={S.actions}>
        <YStack gap="$3">
          {/* Session name input */}
          <YStack gap={8}>
            <Paragraph color="$gray1" fontSize={12}>Session name</Paragraph>
            <Input
              value={sessionName}
              onChangeText={handleSessionNameChange}
              placeholder="e.g. Cafe on October"
              height={41}
              borderRadius={10}
              px={16}
              backgroundColor="rgba(255,255,255,0.1)"
              color="white"
              borderWidth={1}
              borderColor="rgba(255,255,255,0.25)"
            />
          </YStack>

          <Paragraph color="$gray1" fontSize={12}>
            language: <Text fontWeight="700" color="white">{language}</Text>
          </Paragraph>

          {/* Scanned URL preview */}
          {scanMode === 'qr' && scannedUrl && !parsing && (
            <XStack ai="center" gap="$2" bg="rgba(46,204,113,0.15)"
              px="$2" py="$2" borderRadius={8} borderWidth={1} borderColor="rgba(46,204,113,0.3)">
              <QrCode size={14} color="#2ECC71" />
              <Text color="#2ECC71" fontSize={11} flexShrink={1} numberOfLines={2}>
                {scannedUrl}
              </Text>
            </XStack>
          )}

          {storedCapture?.uri && scanMode === 'camera' && (
            <XStack ai="center" gap="$2">
              <Image source={{ uri: storedCapture.uri }} style={S.preview} resizeMode="cover" />
              <Paragraph color="$gray1" fontSize={12}>
                Last photo stored; capturing again will overwrite it.
              </Paragraph>
            </XStack>
          )}

          {errorMessage && (
            <XStack ai="center" gap="$2" bg="rgba(255,99,71,0.18)"
              px="$2" py="$2" borderRadius={8}>
              <AlertTriangle size={16} color="#FF6B6B" />
              <Paragraph color="#FF6B6B" flexShrink={1}>{errorMessage}</Paragraph>
            </XStack>
          )}

          {/* Action buttons — Camera mode */}
          {scanMode === 'camera' && (
            <XStack ai="center" jc="space-between" gap="$3">
              <Button size="$3" borderRadius="$3" theme="gray" onPress={goBack}
                disabled={parsing} opacity={parsing ? 0.6 : 1}>
                Cancel
              </Button>
              <Button size="$3" borderRadius="$3" theme="gray" onPress={handlePickFromGallery}
                disabled={parsing} opacity={parsing ? 0.6 : 1}
                icon={<GalleryIcon size={18} color="white" />}>
                Gallery
              </Button>
              <Button size="$3" borderRadius="$3" theme="active" onPress={handleParse}
                disabled={disableAction}
                icon={parsing ? undefined : <CameraIcon size={18} color="white" />}>
                {parsing ? 'Processing...' : 'Scan'}
              </Button>
            </XStack>
          )}

          {/* Action buttons — QR mode */}
          {scanMode === 'qr' && (
            <XStack ai="center" jc="space-between" gap="$3">
              <Button size="$3" borderRadius="$3" theme="gray" onPress={goBack}
                disabled={parsing} opacity={parsing ? 0.6 : 1}>
                Cancel
              </Button>
              {!parsing && scannedUrl === null && (
                <XStack ai="center" gap="$2" f={1} jc="center">
                  <ScanLine size={16} color="rgba(255,255,255,0.7)" />
                  <Text color="rgba(255,255,255,0.7)" fontSize={13}>
                    Scanning...
                  </Text>
                </XStack>
              )}
              {!parsing && scannedUrl !== null && (
                <Button size="$3" borderRadius="$3" theme="gray"
                  onPress={() => { setScannedUrl(null); setQrScanning(true); setLocalError(null); }}>
                  Scan again
                </Button>
              )}
            </XStack>
          )}

          <Button size="$2" borderRadius="$3" theme="gray" variant="outlined"
            onPress={useMock} disabled={parsing}>
            Use mock receipt
          </Button>
        </YStack>
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;
const CORNER_COLOR = '#2ECC71';

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  headerAbs: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    paddingTop: 8, backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modeTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modeTabActive: {
    backgroundColor: 'rgba(46,204,113,0.25)',
    borderColor: '#2ECC71',
  },
  cameraWrap: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // QR viewfinder
  qrOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrFrame: {
    width: 240,
    height: 240,
    position: 'relative',
  },
  qrHint: {
    marginTop: 20,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: CORNER_COLOR,
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 4,
  },

  actions: {
    position: 'absolute',
    bottom: 24, left: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 16,
    borderRadius: 16,
  },
  preview: {
    width: 56, height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
});
