import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSupportTicketStore } from './support';

export const supportTicketStore = createSupportTicketStore(AsyncStorage);
void supportTicketStore.hydrate();
