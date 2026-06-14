// app/tabs/privacy-policy.tsx
import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, Text } from 'tamagui';
import { useTranslation } from 'react-i18next';

import { ScreenContainer } from '@/shared/ui/ScreenContainer';

export default function PrivacyPolicyScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      >
        <ScreenContainer>
          <YStack space="$4" mt="$4">
            <Text fontSize={22} fontWeight="700">
              {t('navigation.privacy', 'Maxfiylik siyosati')}
            </Text>
            <Text fontSize={15} color="$gray11" lineHeight={22}>
              {t(
                'privacy.description',
                'Biz sizning shaxsiy ma\'lumotlaringizni himoya qilamiz. Ma\'lumotlaringiz faqat ilova ishlashi uchun ishlatiladi va uchinchi shaxslarga berilmaydi.'
              )}
            </Text>
          </YStack>
        </ScreenContainer>
      </ScrollView>
    </SafeAreaView>
  );
}
