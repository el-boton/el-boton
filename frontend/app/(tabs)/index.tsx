import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { YStack, XStack, Text, styled } from 'tamagui';
import { Users, Shield } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { BigRedButton } from '@/components/BigRedButton';
import { createAlert } from '@/lib/alerts';
import { updateMyLocation } from '@/lib/api/profile';
import { useAuth } from '@/contexts/AuthContext';
import { getLocationWithFallback } from '@/lib/location';
import { getCirclesWithRole, CircleWithRole } from '@/lib/circles';

const Container = styled(YStack, {
  flex: 1,
  backgroundColor: '$bgDeep',
});

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user, profile, profileLoading } = useAuth();
  const cachedLocation = useRef<Location.LocationObject | null>(null);
  const lastGeohashUpdate = useRef<number>(0);
  const [circles, setCircles] = useState<CircleWithRole[]>([]);

  const isOnboardingComplete = !profileLoading && !!profile?.display_name;

  const fetchCircles = useCallback(async () => {
    if (!user?.id) return;
    const data = await getCirclesWithRole(user.id);
    setCircles(data);
  }, [user?.id]);

  const updateProfileGeohash = async (location: Location.LocationObject) => {
    if (!user?.id) return;
    const now = Date.now();
    if (now - lastGeohashUpdate.current < 5 * 60 * 1000) return;
    try {
      await updateMyLocation(location.coords.latitude, location.coords.longitude);
      lastGeohashUpdate.current = now;
    } catch {}
  };

  useEffect(() => {
    if (!isOnboardingComplete) return;
    fetchCircles();

    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('home.locationRequired'), t('home.locationPermissionMessage'));
        return;
      }
      try {
        const location = await getLocationWithFallback();
        cachedLocation.current = location;
        updateProfileGeohash(location);
      } catch {}
    })();
  }, [user?.id, isOnboardingComplete]);

  useEffect(() => {
    if (!isOnboardingComplete) return;
    const interval = setInterval(async () => {
      try {
        const location = await getLocationWithFallback();
        cachedLocation.current = location;
        updateProfileGeohash(location);
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [user?.id, isOnboardingComplete]);

  const handleActivate = async () => {
    try {
      let location = cachedLocation.current;
      const cacheAge = location ? Date.now() - location.timestamp : Infinity;

      if (!location || cacheAge > 60000) {
        location = await getLocationWithFallback();
      }

      const result = await createAlert(
        location.coords.latitude,
        location.coords.longitude
      );

      if (result.success) {
        router.push(`/alert/${result.alert.id}`);
      } else if (result.error === 'cooldown') {
        const minutes = Math.ceil((result.cooldownRemaining || 0) / 60000);
        Alert.alert(
          t('home.cooldownActive'),
          t('home.cooldownMessage', { minutes }),
          [
            { text: t('common.ok'), style: 'cancel' },
            {
              text: t('home.sendAnyway'),
              style: 'destructive',
              onPress: () => sendWithOverride(location),
            },
          ]
        );
      } else {
        Alert.alert(t('common.error'), result.error);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('home.locationError'));
    }
  };

  const sendWithOverride = async (location: Location.LocationObject) => {
    const result = await createAlert(
      location.coords.latitude,
      location.coords.longitude,
      true
    );

    if (result.success) {
      router.push(`/alert/${result.alert.id}`);
    } else {
      Alert.alert(t('common.error'), result.error);
    }
  };

  const totalMembers = circles.reduce((sum, c) => sum + (c.memberCount || 0), 0);

  return (
    <Container>
      {/* Status area */}
      <YStack paddingTop="$14" paddingHorizontal="$6" alignItems="center">
        <XStack alignItems="center" gap="$2" opacity={0.6}>
          <Shield size={14} color="$sage" />
          <Text color="$sage" fontSize={12} fontWeight="600" letterSpacing={1}>
            {t('home.systemReady')}
          </Text>
        </XStack>
        {circles.length > 0 && (
          <XStack alignItems="center" gap="$2" marginTop="$2">
            <Users size={12} color="$textTertiary" />
            <Text color="$textTertiary" fontSize={11}>
              {t('home.circleCount', { count: circles.length })} · {t('home.memberCount', { count: totalMembers })}
            </Text>
          </XStack>
        )}
      </YStack>

      {/* Button */}
      <BigRedButton onActivate={handleActivate} />

      {/* Bottom info */}
      <YStack paddingBottom="$6" paddingHorizontal="$6" alignItems="center">
        {profile?.display_name && (
          <Text color="$textTertiary" fontSize={12}>
            {profile.display_name}
          </Text>
        )}
        <Text color="$textDisabled" fontSize={11} marginTop="$1">
          {t('home.noAlertHistory')}
        </Text>
      </YStack>
    </Container>
  );
}
