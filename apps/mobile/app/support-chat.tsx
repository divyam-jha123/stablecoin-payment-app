import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { router, Stack } from 'expo-router';
import { launchImageLibraryAsync } from 'expo-image-picker';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { DashboardNav } from '../src/components/dashboard-nav';
import { colors } from '../src/components/payment-ui';
import { useProfileDetails } from '../src/features/account/profile-details-store';
import { walletStore } from '../src/features/account/metamask';
import { useExplorer } from '../src/features/account/use-explorer';
import { useSimulatedPayments } from '../src/features/payment/simulated-payment-store';
import {
  formatPaymentTime,
  type SimulatedPayment,
} from '../src/features/payment/simulated-payments';
import {
  greeting,
  OPTION_LABELS,
  OPTION_MESSAGES,
  replyToOption,
  replyToText,
  type BotAction,
  type BotOptionId,
  type BotPayment,
  type BotReply,
} from '../src/features/support/support-bot';
import { previewDashboardWith } from '../src/preview-data';
import { uiPreviewEnabled } from '../src/ui-preview';

const BLUE = '#2f6bff';
const INK = '#0b0f1f';
const NAVY = '#13214d';
const REPLY_DELAY = 600;

type Message =
  | ({ id: number; from: 'bot' } & BotReply)
  | { id: number; from: 'user'; text: string; imageUri?: string };

function Glyph({
  d,
  color,
  size = 22,
  strokeWidth = 2,
}: {
  d: string;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function BotFace({ size }: { size: number }) {
  return (
    <View
      style={[
        styles.botFace,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24">
        <Path d="M12 2.5v2.5" stroke={NAVY} strokeWidth={2} />
        <Circle cx={12} cy={2.5} r={1.4} fill={NAVY} />
        <Path
          d="M6.5 6h11a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z"
          fill={NAVY}
        />
        <Circle cx={9} cy={11.3} r={1.6} fill="#ffffff" />
        <Circle cx={15} cy={11.3} r={1.6} fill="#ffffff" />
        <Path
          d="M7 20.5c1.4-1.6 3.1-2.3 5-2.3s3.6.7 5 2.3"
          stroke={BLUE}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

function paymentStatus(payment: SimulatedPayment) {
  return payment.txHash
    ? 'It was sent on the Tempo testnet; the INR payout to the merchant is simulated.'
    : 'It was a demo payment, so nothing was sent on-chain.';
}

function toBotPayment(payment: SimulatedPayment): BotPayment {
  return {
    id: payment.id,
    name: payment.merchantName,
    amount: Number(payment.inrAmount),
    time: formatPaymentTime(payment.createdAt),
    status: paymentStatus(payment),
    receiptId: payment.id,
  };
}

export default function SupportChat() {
  const { profile: googleProfile } = useExplorer();
  const address = useSyncExternalStore(
    walletStore.subscribe,
    () => walletStore.getSnapshot().account?.address,
  );
  const details = useProfileDetails(address);
  const name = details?.name || googleProfile?.name || 'Traveller';
  const firstName = name.trim().split(/\s+/)[0] || 'Traveller';

  const payments = useSimulatedPayments(uiPreviewEnabled ? null : address);
  const botPayments: BotPayment[] = uiPreviewEnabled
    ? previewDashboardWith(payments)
        .transactions.filter((item) => item.direction === 'Sent')
        .map((item) => {
          const saved = payments.find((payment) => payment.id === item.id);
          return saved
            ? toBotPayment(saved)
            : {
                id: item.id,
                name: item.name,
                amount: item.amount,
                time: item.time,
                status: 'It is a sample payment in the UI preview.',
                receiptId: null,
              };
        })
    : payments.map(toBotPayment);

  const nextId = useRef(1);
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: 0, from: 'bot', ...greeting(firstName) },
  ]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const scroll = useRef<ScrollView>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const lastBotId = [...messages].reverse().find((m) => m.from === 'bot')?.id;

  function say(userText: string, reply: () => BotReply, imageUri?: string) {
    if (typing) return;
    setMessages((current) => [
      ...current,
      {
        id: nextId.current++,
        from: 'user',
        text: userText,
        ...(imageUri ? { imageUri } : {}),
      },
    ]);
    setTyping(true);
    timer.current = setTimeout(() => {
      setTyping(false);
      setMessages((current) => [
        ...current,
        { id: nextId.current++, from: 'bot', ...reply() },
      ]);
    }, REPLY_DELAY);
  }

  function choose(option: BotOptionId) {
    say(OPTION_MESSAGES[option], () => replyToOption(option, botPayments));
  }

  function send() {
    const text = draft.trim().slice(0, 500);
    if (!text) return;
    setDraft('');
    say(text, () => replyToText(text));
  }

  async function attach() {
    try {
      const picked = await launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      const uri = picked.canceled ? null : picked.assets[0]?.uri;
      if (uri)
        say(
          'Screenshot',
          () => ({
            text: 'Thanks! I can’t read screenshots in chat. Add it to a support ticket so it stays with your report.',
            actions: [
              { label: 'Raise a Support Ticket', route: '/support-ticket' },
            ],
          }),
          uri,
        );
    } catch {
      Alert.alert('Could not open photos', 'Please try again.');
    }
  }

  function run(action: BotAction) {
    if ('receiptId' in action)
      router.push({ pathname: '/receipt', params: { id: action.receiptId } });
    else router.push(action.route);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/help')
          }
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Glyph d="M15 18l-6-6 6-6" color={BLUE} size={26} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.identity}>
          <View>
            <BotFace size={48} />
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text accessibilityRole="header" style={styles.botName}>
              Support Bot
            </Text>
            <Text style={styles.online}>Online</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scroll}
          style={styles.flex}
          contentContainerStyle={styles.thread}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scroll.current?.scrollToEnd()}
        >
          {messages.map((message) =>
            message.from === 'user' ? (
              <View key={message.id} style={styles.userBubble}>
                <Text style={styles.userName}>{name}</Text>
                {message.imageUri ? (
                  <Image
                    accessibilityLabel="Screenshot"
                    source={{ uri: message.imageUri }}
                    style={styles.userImage}
                  />
                ) : (
                  <Text style={styles.userText}>{message.text}</Text>
                )}
              </View>
            ) : (
              <BotMessage
                key={message.id}
                message={message.id === 0 ? greeting(firstName) : message}
                active={message.id === lastBotId && !typing}
                onChoose={choose}
                onAction={run}
              />
            ),
          )}
          {typing ? (
            <View style={styles.botRow}>
              <BotFace size={30} />
              <View style={[styles.botBubble, styles.typing]}>
                <Text style={styles.typingText}>Typing…</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            disabled={typing}
            onPress={() => choose('human')}
            style={({ pressed }) => [styles.agent, pressed && styles.pressed]}
          >
            <Text style={styles.agentText}>Talk to an Agent</Text>
          </Pressable>
          <View style={styles.composer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Attach a screenshot"
              hitSlop={8}
              onPress={() => void attach()}
              style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
            >
              <Glyph
                d="M20 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"
                color="#37445c"
                size={22}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voice message"
              hitSlop={8}
              onPress={() =>
                Alert.alert(
                  'Voice messages',
                  'Voice messages are not available yet. Type your question instead.',
                )
              }
              style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
            >
              <Glyph
                d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z M5.5 11a6.5 6.5 0 0 0 13 0 M12 17.5V21"
                color="#37445c"
                size={22}
              />
            </Pressable>
            <View style={styles.inputWrap}>
              <TextInput
                accessibilityLabel="Message"
                value={draft}
                onChangeText={setDraft}
                placeholder="Message..."
                placeholderTextColor="#7d8aa3"
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={send}
                style={styles.input}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send"
                accessibilityState={{ disabled: !draft.trim() || typing }}
                disabled={!draft.trim() || typing}
                onPress={send}
                style={({ pressed }) => [
                  styles.send,
                  (!draft.trim() || typing) && styles.sendDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path d="M4 4l17 8-17 8 3-8z" fill="#ffffff" />
                </Svg>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      <DashboardNav current="/profile" />
    </SafeAreaView>
  );
}

function BotMessage({
  message,
  active,
  onChoose,
  onAction,
}: {
  message: BotReply;
  active: boolean;
  onChoose: (option: BotOptionId) => void;
  onAction: (action: BotAction) => void;
}) {
  const { options, actions } = message;
  return (
    <View style={styles.botRow}>
      <BotFace size={30} />
      <View style={styles.botColumn}>
        <Text style={styles.botLabel}>Support Bot</Text>
        <View style={styles.botBubble}>
          <Text style={styles.botText}>{message.text}</Text>
        </View>
        {options?.style === 'menu' ? (
          <View style={styles.menu}>
            {options.items.map((option, index) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ disabled: !active }}
                disabled={!active}
                onPress={() => onChoose(option)}
                style={({ pressed }) => [
                  styles.menuRow,
                  index > 0 && styles.menuDivider,
                  !active && styles.inactive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.menuText}>{OPTION_LABELS[option]}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {options?.style === 'pills' ? (
          <View style={styles.pills}>
            {options.items.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ disabled: !active }}
                disabled={!active}
                onPress={() => onChoose(option)}
                style={({ pressed }) => [
                  styles.pill,
                  !active && styles.inactive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.menuText}>{OPTION_LABELS[option]}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {actions?.length ? (
          <View style={styles.pills}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                onPress={() => onAction(action)}
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.actionText}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const shadow = {
  shadowColor: '#0b2a6b',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f2f6fc' },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e3e9f3',
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    width: 84,
  },
  backText: { color: BLUE, fontSize: 18 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  botFace: {
    backgroundColor: '#e3edff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#22a35a',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  botName: { color: INK, fontSize: 20, fontWeight: '800' },
  online: { color: colors.muted, fontSize: 14 },
  thread: { padding: 16, gap: 14 },
  botRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  botColumn: { flex: 1, alignItems: 'flex-start', gap: 6, maxWidth: '86%' },
  botLabel: { color: colors.muted, fontSize: 13, marginLeft: 4 },
  botBubble: {
    ...shadow,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e3e9f3',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  botText: { color: INK, fontSize: 16, lineHeight: 22 },
  typing: { marginTop: 2 },
  typingText: { color: colors.muted, fontSize: 15 },
  menu: {
    ...shadow,
    alignSelf: 'stretch',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e3e9f3',
    borderRadius: 16,
  },
  menuRow: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 },
  menuDivider: { borderTopWidth: 1, borderTopColor: '#e3e9f3' },
  menuText: { color: INK, fontSize: 16 },
  inactive: { opacity: 0.55 },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
    gap: 8,
  },
  pill: {
    ...shadow,
    minHeight: 40,
    minWidth: 56,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e3e9f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: BLUE,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
  },
  actionText: { color: BLUE, fontSize: 15, fontWeight: '600' },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '78%',
    backgroundColor: NAVY,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 2,
  },
  userName: {
    color: '#c9d4ec',
    fontSize: 12,
    textAlign: 'right',
  },
  userText: { color: '#ffffff', fontSize: 16, lineHeight: 22 },
  userImage: { width: 180, height: 180, borderRadius: 10, marginTop: 4 },
  footer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e3e9f3',
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
  },
  agent: { alignSelf: 'flex-end', minHeight: 32, justifyContent: 'center' },
  agentText: { color: BLUE, fontSize: 16, fontWeight: '500' },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tool: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingLeft: 16,
    paddingRight: 4,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#dbe3ef',
    backgroundColor: '#f7f9fd',
  },
  input: { flex: 1, color: INK, fontSize: 16, paddingVertical: 8 },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.45 },
});
