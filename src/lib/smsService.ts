import { soundEngine } from './audio';

export interface SmsNotification {
  id: string;
  patientPhone: string;
  patientName: string;
  queueNumber: number;
  clinicName: string;
  message: string;
  sentAt: string;
  status: 'simulated' | 'unconfigured' | 'delivered' | 'sending' | 'failed';
}

class SmsService {
  private notificationsHistory: SmsNotification[] = [];
  private listeners: ((history: SmsNotification[]) => void)[] = [];

  /**
   * Returns whether a real external SMS gateway provider (e.g. Twilio, Unifonic, etc.)
   * is configured in production. In this environment, returns false (simulation mode).
   */
  public isConfigured(): boolean {
    return false;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dawrak_sms_history');
      if (saved) {
        try {
          this.notificationsHistory = JSON.parse(saved);
        } catch {
          this.notificationsHistory = [];
        }
      }
    }
  }

  private persist() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dawrak_sms_history', JSON.stringify(this.notificationsHistory.slice(0, 30)));
    }
    this.listeners.forEach((l) => l([...this.notificationsHistory]));
  }

  public subscribe(listener: (history: SmsNotification[]) => void) {
    this.listeners.push(listener);
    listener([...this.notificationsHistory]);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Simulates sending an SMS alert to a patient when their turn is approaching
   */
  public async sendTurnApproachingSms(params: {
    patientPhone: string;
    patientName: string;
    queueNumber: number;
    clinicName: string;
    peopleAhead: number;
  }): Promise<SmsNotification> {
    const { patientPhone, patientName, queueNumber, clinicName, peopleAhead } = params;

    const peopleText = peopleAhead <= 1 
      ? 'أنت التالي مباشرة الآن!' 
      : `بقي ${peopleAhead} فقط أمامك في الطابور.`;

    const message = 
      `دورك لايف | ${clinicName} 🏥:\n` +
      `مرحباً ${patientName}، نود إحاطتكم بأن دوركم يقترب! رقمكم: (${queueNumber}).\n` +
      `${peopleText}\n` +
      `يرجى التواجد في قاعة الانتظار والاستعداد للدخول.`;

    const notif: SmsNotification = {
      id: `SMS_${Date.now().toString(36).toUpperCase()}`,
      patientPhone,
      patientName,
      queueNumber,
      clinicName,
      message,
      sentAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: this.isConfigured() ? 'delivered' : 'simulated'
    };

    // Simulate network transmission delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Play subtle incoming SMS chime
    soundEngine.playSmsChime();

    this.notificationsHistory.unshift(notif);
    this.persist();

    return notif;
  }
}

export const smsService = new SmsService();
