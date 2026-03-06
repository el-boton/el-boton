import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshControl, Animated } from 'react-native';
import { router } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  ScrollView,
  styled,
} from 'tamagui';
import { Clock, AlertTriangle, CheckCircle, XCircle, Plus } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { getInvolvedAlerts, subscribeToInvolvedAlerts, AlertWithSender } from '@/lib/alertHistory';
import { ScreenContainer, ScreenHeader, ScreenTitle, ScreenSubtitle, SectionLabel } from '@/components/ScreenLayout';
import { EmptyState } from '@/components/EmptyState';

const AlertCard = styled(XStack, {
  backgroundColor: '$bgCard',
  borderRadius: '$4',
  padding: '$4',
  marginBottom: '$3',
  borderWidth: 1,
  borderColor: '$borderSubtle',
  alignItems: 'center',

  pressStyle: {
    backgroundColor: '$bgCardHover',
    borderColor: '$borderDefault',
  },
});

const StatusDot = styled(YStack, {
  width: 10,
  height: 10,
  borderRadius: 5,
  marginRight: '$2',
});

function PulsingDot() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#DC3030',
        marginRight: 8,
        transform: [{ scale: pulseAnim }],
      }}
    />
  );
}

function getRelativeTime(dateString: string, t: (key: string, opts?: any) => string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('history.justNow');
  if (diffMins < 60) return t('history.minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('history.hoursAgo', { count: diffHours });
  if (diffDays === 1) return t('history.yesterday');
  if (diffDays < 7) return t('history.daysAgo', { count: diffDays });
  return date.toLocaleDateString();
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();

  if (status === 'active') {
    return (
      <XStack alignItems="center">
        <PulsingDot />
        <Text color="$emergency" fontSize={13} fontWeight="600">
          {t('history.statusActive')}
        </Text>
      </XStack>
    );
  }

  if (status === 'resolved') {
    return (
      <XStack alignItems="center">
        <StatusDot backgroundColor="$sage" />
        <Text color="$sage" fontSize={13} fontWeight="600">
          {t('history.statusResolved')}
        </Text>
      </XStack>
    );
  }

  return (
    <XStack alignItems="center">
      <StatusDot backgroundColor="$textTertiary" />
      <Text color="$textTertiary" fontSize={13} fontWeight="600">
        {t('history.statusCancelled')}
      </Text>
    </XStack>
  );
}

function AlertCardItem({
  alert,
  isOwn,
  onPress,
}: {
  alert: AlertWithSender;
  isOwn: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const senderName = isOwn ? t('history.you') : (alert.sender?.display_name || t('history.unknown'));

  const iconColor = alert.status === 'active'
    ? '$emergency'
    : alert.status === 'resolved'
    ? '$sage'
    : '$textTertiary';

  const StatusIcon = alert.status === 'active'
    ? AlertTriangle
    : alert.status === 'resolved'
    ? CheckCircle
    : XCircle;

  return (
    <AlertCard onPress={onPress}>
      {/* Timeline accent */}
      <YStack
        width={3}
        alignSelf="stretch"
        borderRadius={2}
        backgroundColor={alert.status === 'active' ? '$emergency' : alert.status === 'resolved' ? '$sage' : '$borderSubtle'}
        marginRight="$3"
      />
      <YStack
        width={44}
        height={44}
        borderRadius="$3"
        backgroundColor={alert.status === 'active' ? '$emergencySubtle' : '$bgElevated'}
        borderWidth={1}
        borderColor={alert.status === 'active' ? '$emergencyBorder' : '$borderSubtle'}
        alignItems="center"
        justifyContent="center"
        marginRight="$4"
      >
        <StatusIcon size={22} color={iconColor} />
      </YStack>
      <YStack flex={1}>
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$1">
          <StatusBadge status={alert.status} />
          <Text color="$textTertiary" fontSize={12}>
            {getRelativeTime(alert.created_at, t)}
          </Text>
        </XStack>
        <Text color="$textSecondary" fontSize={14}>
          {t('history.from')}: {senderName}
        </Text>
      </YStack>
    </AlertCard>
  );
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    const data = await getInvolvedAlerts(user.id);
    setAlerts(data);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (!user) return;
    const channel = subscribeToInvolvedAlerts(user.id, fetchAlerts);
    return () => { channel.unsubscribe(); };
  }, [user, fetchAlerts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAlerts();
  }, [fetchAlerts]);

  const activeAlerts = alerts.filter((a) => a.status === 'active');
  const pastAlerts = alerts.filter((a) => a.status !== 'active');

  return (
    <ScreenContainer>
      <ScreenHeader>
        <ScreenTitle>{t('history.title')}</ScreenTitle>
        <ScreenSubtitle>{t('history.subtitle')}</ScreenSubtitle>
      </ScreenHeader>

      <ScrollView
        flex={1}
        paddingHorizontal="$6"
        paddingTop="$5"
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8A8580"
          />
        }
      >
        {loading ? (
          <YStack padding="$8" alignItems="center">
            <Text color="$textTertiary">{t('common.loading')}</Text>
          </YStack>
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={<Clock size={32} color="$textTertiary" />}
            title={t('history.noAlerts')}
            hint={t('history.noAlertsHint')}
          />
        ) : (
          <YStack paddingBottom="$8">
            {activeAlerts.length > 0 && (
              <YStack marginBottom="$5">
                <SectionLabel>
                  {t('history.active', { count: activeAlerts.length })}
                </SectionLabel>
                {activeAlerts.map((alert) => (
                  <AlertCardItem
                    key={alert.id}
                    alert={alert}
                    isOwn={alert.sender_id === user?.id}
                    onPress={() => router.push(`/alert/${alert.id}`)}
                  />
                ))}
              </YStack>
            )}

            {pastAlerts.length > 0 && (
              <YStack>
                <SectionLabel>{t('history.past')}</SectionLabel>
                {pastAlerts.map((alert) => (
                  <AlertCardItem
                    key={alert.id}
                    alert={alert}
                    isOwn={alert.sender_id === user?.id}
                    onPress={() => router.push(`/alert/${alert.id}`)}
                  />
                ))}
              </YStack>
            )}
          </YStack>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
