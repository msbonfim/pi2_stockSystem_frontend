// frontend/src/services/pushNotifications.ts

import { api } from "@/lib/axios";

class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private isInitialized = false;

  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log("Push notifications já inicializadas.");
      return true;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("Push notifications não são suportadas neste navegador.");
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.ready;
      console.log("✅ Service Worker pronto!");

      this.subscription = await this.registration.pushManager.getSubscription();

      if (this.subscription) {
        console.log("✅ Subscription já existe:", this.subscription.endpoint);
        this.isInitialized = true;
        return true;
      }

      // Verificar se a chave VAPID está configurada antes de solicitar permissão
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey || vapidPublicKey.trim() === '') {
        console.warn("⚠️ VITE_VAPID_PUBLIC_KEY não está configurada. Push notifications desabilitadas.");
        this.isInitialized = true; // Marcar como inicializado para não tentar novamente
        return false;
      }

      console.log(
        "⚠️ Nenhuma subscription encontrada. Solicitando permissão..."
      );
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        console.warn("❌ Permissão para notificações foi negada.");
        this.isInitialized = true; // Marcar como inicializado para não tentar novamente
        return false;
      }

      await this.subscribeUser();
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("❌ Erro ao inicializar push notifications:", error);
      // Marcar como inicializado para evitar tentativas infinitas
      this.isInitialized = true;
      return false;
    }
  }

  private async subscribeUser(): Promise<void> {
    if (!this.registration) {
      console.error("Service Worker não está pronto para criar subscription.");
      return;
    }

    // Verificar se a chave VAPID está configurada
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey || vapidPublicKey.trim() === '') {
      console.warn("⚠️ VITE_VAPID_PUBLIC_KEY não está configurada. Push notifications desabilitadas.");
      return;
    }

    try {
      const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);

      // Ao inscrever-se, passe um ArrayBuffer (fazendo cast explícito)
      const applicationServerKeyBuffer =
        applicationServerKey.buffer as ArrayBuffer;

      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKeyBuffer,
      });

      console.log(
        "✅ Subscription criada localmente:",
        this.subscription.endpoint
      );
      await this.sendSubscriptionToBackend(this.subscription);
    } catch (error) {
      console.error("❌ Erro ao criar subscription:", error);
      // Não re-throw o erro para evitar loops infinitos
    }
  }

  private async sendSubscriptionToBackend(
    sub: PushSubscription
  ): Promise<void> {
    const subData = sub.toJSON();
    const payload = {
      endpoint: subData.endpoint,
      p256dh: subData.keys?.p256dh,
      auth: subData.keys?.auth,
    };

    console.log("📤 Enviando subscription para o backend:", payload.endpoint);

    try {
      const response = await api.post("/push-subscriptions/", payload);
      if (response.status === 201 || response.status === 200) {
        console.log("✅ Subscription salva no backend!");
      } else {
        console.error(
          "❌ Falha ao salvar subscription no backend. Status:",
          response.status
        );
      }
    } catch (error) {
      console.error("❌ Erro de rede ao enviar subscription:", error);
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    if (!base64String || typeof base64String !== 'string') {
      throw new Error('Invalid base64 string provided');
    }
    
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// --- LINHA DA CORREÇÃO ---
// Exporta uma única instância da classe para ser usada em todo o app.
export const pushNotificationService = new PushNotificationService();
