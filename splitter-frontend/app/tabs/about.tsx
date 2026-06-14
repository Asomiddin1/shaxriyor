// app/tabs/about.tsx
import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, Text } from 'tamagui';
import { useTranslation } from 'react-i18next';

import { ScreenContainer } from '@/shared/ui/ScreenContainer';

export default function AboutScreen() {
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
              {t('navigation.about', 'Dastur haqida')}
            </Text>
            <Text fontSize={15} color="$gray11" lineHeight={22}>
              {t(
                'about.description',
                'Splitter — bu do\'stlar va guruhlar bilan xarajatlarni oson bo\'lishish uchun ilova. Cheklarni skanerlang, ishtirokchilarni qo\'shing va kim kimga qancha qarzdor ekanini avtomatik hisoblang.'
              )}
            </Text>
            <Text fontSize={13} color="$gray9">
              {t('about.version', 'Versiya')}: 1.0.0
            </Text>
          </YStack>
        </ScreenContainer>
      </ScrollView>
    </SafeAreaView>
  );
}
