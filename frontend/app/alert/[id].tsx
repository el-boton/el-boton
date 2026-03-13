import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Alert as RNAlert,
  Animated,
  View,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Linking,
  Pressable,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLocalSearchParams, router } from 'expo-router';
import { YStack, XStack, Text, Button, ScrollView } from 'tamagui';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Globe,
  Eye,
  Car,
  Check,
  ArrowLeft,
  Send,
  Users,
  MessageSquare,
  Navigation,
  ChevronDown,
  ChevronUp,
} from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import {
  cancelAlert,
  resolveAlert,
  expandToNearby,
  respondToAlert,
  subscribeToAlert,
  subscribeToResponses,
  subscribeToMessages,
  sendMessage,
  getMessages,
  getAlertById,
  getResponses,
  MessageWithSender,
} from '@/lib/alerts';
import { Alert, AlertResponse } from '@/lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ResponseWithProfile = AlertResponse & {
  responder: { display_name: string | null };
};

// Deep Ink & Copper tokens
const c = {
  bgDeep: '#080808',
  bgPrimary: '#0E0E0E',
  bgElevated: '#1A1A1A',
  bgCard: '#212121',
  emergency: '#DC3030',
  emergencyDark: '#A82020',
  sage: '#5C8A6E',
  sageBright: '#7AAE8C',
  amber: '#D4913B',
  signal: '#D4734A',
  textPrimary: '#E8E4E0',
  textSecondary: '#8A8580',
  textMuted: '#5C5955',
  border: '#252525',
};

type TabType = 'responders' | 'messages';

export default function AlertScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [alert, setAlert] = useState<Alert | null>(null);
  const [responses, setResponses] = useState<ResponseWithProfile[]>([]);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSender, setIsSender] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('responders');
  const [mapExpanded, setMapExpanded] = useState(false);

  const scrollRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const refetchAll = useCallback(async () => {
    const [a, r, m] = await Promise.all([
      getAlertById(id!),
      getResponses(id!),
      getMessages(id!),
    ]);
    if (a) setAlert(a);
    if (r) setResponses(r);
    if (m.length) setMessages(m);
  }, [id]);

  useEffect(() => {
    fetchAlert();
    const alertSub = subscribeToAlert(id!, setAlert);
    const responseSub = subscribeToResponses(id!, setResponses);
    const messageSub = subscribeToMessages(id!, (newMessages) => {
      setMessages(newMessages);
      if (activeTab === 'messages') {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });

    // Poll as safety net in case channel drops
    const poll = setInterval(refetchAll, 30000);

    return () => {
      alertSub.unsubscribe();
      responseSub.unsubscribe();
      messageSub.unsubscribe();
      clearInterval(poll);
    };
  }, [id]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const fetchAlert = async () => {
    const alertData = await getAlertById(id!);
    if (alertData) {
      setAlert(alertData);
      setIsSender(alertData.sender_id === user?.id);
    }
    const responseData = await getResponses(id!);
    if (responseData) setResponses(responseData);
    const messagesData = await getMessages(id!);
    setMessages(messagesData);
    setLoading(false);
  };

  const handleCancel = () => {
    RNAlert.alert(t('alert.cancelAlert'), t('alert.cancelConfirm'), [
      { text: t('alert.no'), style: 'cancel' },
      { text: t('alert.yes'), style: 'destructive', onPress: async () => { await cancelAlert(id!); router.back(); }},
    ]);
  };

  const handleResolve = async () => { await resolveAlert(id!); router.back(); };

  const handleExpand = () => {
    RNAlert.alert(t('alert.expandTitle'), t('alert.expandMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('alert.expand'), onPress: async () => { await expandToNearby(id!); }},
    ]);
  };

  const handleRespond = async (status: 'acknowledged' | 'en_route' | 'arrived') => {
    await respondToAlert(id!, status);
    const r = await getResponses(id!);
    if (r) setResponses(r);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || sending) return;
    setSending(true);
    Keyboard.dismiss();
    const success = await sendMessage(id!, messageText);
    if (success) setMessageText('');
    setSending(false);
  };

  const openMaps = useCallback(() => {
    if (!alert?.latitude || !alert?.longitude) return;
    const { latitude, longitude } = alert;
    const url = Platform.select({
      ios: `maps:?daddr=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(Emergency)`,
    });
    if (url) {
      Linking.openURL(url).catch(() => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
      });
    }
  }, [alert]);

  if (loading || !alert) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Animated.View style={{ opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }}>
          <AlertTriangle size={32} color={c.emergency} />
        </Animated.View>
        <Text style={styles.loadingText}>{t('alert.loadingAlert')}</Text>
      </View>
    );
  }

  const isActive = alert.status === 'active';
  const isResolved = alert.status === 'resolved' || alert.status === 'cancelled';
  const statusColor = isActive ? c.emergency : alert.status === 'resolved' ? c.sage : c.textMuted;
  const StatusIcon = isActive ? AlertTriangle : alert.status === 'resolved' ? CheckCircle : XCircle;

  const getResponderIcon = (status: string) => {
    switch (status) {
      case 'acknowledged': return { Icon: Eye, color: c.emergency };
      case 'en_route': return { Icon: Car, color: c.amber };
      default: return { Icon: Check, color: c.sage };
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={18} color={c.textSecondary} />
        </Pressable>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {isActive ? t('alert.activeEmergency') : alert.status === 'resolved' ? t('alert.resolved') : t('alert.cancelled')}
          </Text>
        </View>
        <View style={styles.spacer} />
      </View>

      <ScrollView ref={scrollRef} style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Map */}
        <Pressable onPress={() => setMapExpanded(!mapExpanded)}>
          <View style={[styles.mapWrapper, mapExpanded && styles.mapExpanded]}>
            <MapView
              style={styles.map}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              initialRegion={{
                latitude: alert.latitude,
                longitude: alert.longitude,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              }}
              scrollEnabled={mapExpanded}
              zoomEnabled={mapExpanded}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              <Marker coordinate={{ latitude: alert.latitude, longitude: alert.longitude }}>
                <View style={styles.marker}>
                  <View style={styles.markerInner} />
                </View>
              </Marker>
            </MapView>

            <View style={styles.mapControls}>
              <Pressable style={styles.directionsBtn} onPress={openMaps}>
                <Navigation size={16} color="#FFF" />
                <Text style={styles.directionsBtnText}>{t('alert.directions')}</Text>
              </Pressable>
              <View style={styles.expandIndicator}>
                {mapExpanded ? <ChevronUp size={16} color={c.textMuted} /> : <ChevronDown size={16} color={c.textMuted} />}
              </View>
            </View>

            <View style={styles.timeBadge}>
              <Text style={styles.timeText}>
                {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Expanded to Nearby Banner */}
        {alert.expand_to_nearby && (
          <View style={styles.expandedBanner}>
            <Globe size={14} color={c.sage} />
            <Text style={styles.expandedText}>{t('alert.expandedBanner')}</Text>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tab, activeTab === 'responders' && styles.tabActive]}
            onPress={() => setActiveTab('responders')}
          >
            <Users size={16} color={activeTab === 'responders' ? c.textPrimary : c.textMuted} />
            <Text style={[styles.tabText, activeTab === 'responders' && styles.tabTextActive]}>
              {t('alert.responders', { count: responses.length })}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'messages' && styles.tabActive]}
            onPress={() => setActiveTab('messages')}
          >
            <MessageSquare size={16} color={activeTab === 'messages' ? c.textPrimary : c.textMuted} />
            <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextActive]}>
              {t('alert.messages')} ({messages.length})
            </Text>
          </Pressable>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'responders' ? (
            responses.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={24} color={c.textMuted} />
                <Text style={styles.emptyText}>
                  {isActive ? t('alert.waitingForResponders') : t('alert.noResponders')}
                </Text>
              </View>
            ) : (
              responses.map((r) => {
                const { Icon, color } = getResponderIcon(r.status);
                return (
                  <View key={r.responder_id} style={styles.responderRow}>
                    <View style={[styles.responderIcon, { backgroundColor: color + '20' }]}>
                      <Icon size={16} color={color} />
                    </View>
                    <View style={styles.responderInfo}>
                      <Text style={styles.responderName}>{r.responder.display_name || t('alert.circleMember')}</Text>
                      <Text style={styles.responderStatus}>
                        {r.status === 'acknowledged' ? t('alert.acknowledged') : r.status === 'en_route' ? t('alert.onTheWay') : t('alert.arrived')}
                      </Text>
                    </View>
                  </View>
                );
              })
            )
          ) : (
            messages.length === 0 ? (
              <View style={styles.emptyState}>
                <MessageSquare size={24} color={c.textMuted} />
                <Text style={styles.emptyText}>{t('alert.noMessages')}</Text>
              </View>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.sender_id === user?.id;
                return (
                  <View key={msg.id} style={[styles.message, isOwn && styles.messageOwn]}>
                    <View style={[styles.messageBubble, isOwn && styles.messageBubbleOwn]}>
                      <Text style={styles.messageSender}>
                        {isOwn ? t('alert.you') : (msg.sender?.display_name || t('alert.circleMember'))}
                      </Text>
                      <Text style={styles.messageText}>{msg.message}</Text>
                      <Text style={styles.messageTime}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                );
              })
            )
          )}
        </View>

        <View style={{ height: 200 }} />
      </ScrollView>

      {/* Message Input */}
      {activeTab === 'messages' && (
        <View style={styles.messageInputBar}>
          <TextInput
            style={styles.messageInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder={t('alert.typeMessage')}
            placeholderTextColor={c.textMuted}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[styles.sendBtn, messageText.trim() && styles.sendBtnActive]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sending}
          >
            <Send size={18} color={messageText.trim() ? '#FFF' : c.textMuted} />
          </Pressable>
        </View>
      )}

      {/* Action Bar */}
      {!isResolved && (
        <View style={styles.actionBar}>
          {isSender ? (
            <YStack gap="$3" width="100%">
              <Button width="100%" height={50} bg={c.sage} borderRadius={12} pressStyle={{ opacity: 0.9 }} onPress={handleResolve}>
                <CheckCircle size={16} color="#FFF" />
                <Text color="#FFF" fontWeight="700" fontSize={14} ml="$2">{t('alert.imSafe')}</Text>
              </Button>
              <XStack gap="$3" width="100%">
                <Button flex={1} height={44} bg={c.bgCard} borderColor={c.border} borderWidth={1} borderRadius={12} onPress={handleCancel}>
                  <XCircle size={16} color={c.textMuted} />
                  <Text color={c.textMuted} fontWeight="600" fontSize={13} ml="$2">{t('common.cancel')}</Text>
                </Button>
                {!alert.expand_to_nearby && (
                  <Button flex={1} height={44} bg={c.bgCard} borderColor={c.border} borderWidth={1} borderRadius={12} onPress={handleExpand}>
                    <Globe size={16} color={c.sage} />
                    <Text color={c.sage} fontWeight="600" fontSize={13} ml="$2">{t('alert.expandToNearby')}</Text>
                  </Button>
                )}
              </XStack>
            </YStack>
          ) : (
            <YStack gap="$3" width="100%">
              <Button width="100%" height={56} bg={c.emergency} borderRadius={14} pressStyle={{ opacity: 0.9 }} onPress={() => handleRespond('acknowledged')}>
                <Eye size={20} color="#FFF" />
                <Text color="#FFF" fontWeight="700" fontSize={15} ml="$2">{t('alert.iSeeThis')}</Text>
              </Button>
              <XStack gap="$3" width="100%">
                <Button flex={1} height={48} bg={c.amber} borderRadius={12} pressStyle={{ opacity: 0.9 }} onPress={() => handleRespond('en_route')}>
                  <Car size={18} color="#FFF" />
                  <Text color="#FFF" fontWeight="600" fontSize={13} ml="$2">{t('alert.enRouteButton', { defaultValue: 'EN ROUTE' })}</Text>
                </Button>
                <Button flex={1} height={48} bg={c.sage} borderRadius={12} pressStyle={{ opacity: 0.9 }} onPress={() => handleRespond('arrived')}>
                  <Check size={18} color="#FFF" />
                  <Text color="#FFF" fontWeight="600" fontSize={13} ml="$2">{t('alert.arrivedButton')}</Text>
                </Button>
              </XStack>
            </YStack>
          )}
        </View>
      )}

      {isResolved && (
        <View style={styles.actionBar}>
          <Button width="100%" height={50} bg={c.bgCard} borderColor={c.border} borderWidth={1} borderRadius={12} onPress={() => router.back()}>
            <ArrowLeft size={16} color={c.textSecondary} />
            <Text color={c.textSecondary} fontWeight="600" ml="$2">{t('alert.backToHome')}</Text>
          </Button>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bgPrimary,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: c.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 8,
    backgroundColor: c.bgDeep,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    zIndex: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bgElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  spacer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  mapWrapper: {
    height: 180,
    margin: 12,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: c.bgElevated,
  },
  mapExpanded: {
    height: 320,
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(220, 48, 48, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: c.emergency,
  },
  mapControls: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.signal,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  directionsBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  expandIndicator: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
    borderRadius: 8,
  },
  timeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  expandedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(92, 138, 110, 0.1)',
    marginHorizontal: 12,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(92, 138, 110, 0.3)',
  },
  expandedText: {
    color: c.sage,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 10,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 12,
    backgroundColor: c.bgElevated,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  tabActive: {
    backgroundColor: c.bgCard,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textMuted,
  },
  tabTextActive: {
    color: c.textPrimary,
  },
  tabContent: {
    marginTop: 12,
    paddingHorizontal: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: c.bgElevated,
    borderRadius: 12,
  },
  emptyText: {
    color: c.textMuted,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  responderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bgElevated,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  responderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  responderInfo: {
    marginLeft: 12,
    flex: 1,
  },
  responderName: {
    color: c.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  responderStatus: {
    color: c.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  message: {
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  messageOwn: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    backgroundColor: c.bgElevated,
    padding: 12,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    maxWidth: '85%',
  },
  messageBubbleOwn: {
    backgroundColor: 'rgba(212, 115, 74, 0.15)',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 4,
  },
  messageSender: {
    color: c.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    color: c.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    color: c.textMuted,
    fontSize: 10,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  messageInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: c.bgDeep,
    borderTopWidth: 1,
    borderTopColor: c.border,
    gap: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: c.bgElevated,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: c.textPrimary,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: c.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  sendBtnActive: {
    backgroundColor: c.signal,
    borderColor: c.signal,
  },
  actionBar: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: c.bgDeep,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
});
