/**
 * MQTT服务
 * 连接到真实MQTT Broker进行通信
 */

import mqtt, { MqttClient as RealMqttClient } from 'mqtt';

export interface MqttMessage {
  topic: string;
  payload: any;
  timestamp: Date;
}

type MessageHandler = (topic: string, message: any) => void;

export class MockMqttClient {
  private client: RealMqttClient | null = null;
  private subscribers: Map<string, MessageHandler[]> = new Map();
  private subscribedTopics: Set<string> = new Set();
  private isConnected: boolean = false;
  private messageHistory: MqttMessage[] = [];

  /**
   * 连接到MQTT Broker（真实连接）
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';

      const options: mqtt.IClientOptions = {
        clientId: `backend_${Math.random().toString(16).slice(2, 10)}`,
        username: process.env.MQTT_USERNAME || undefined,
        password: process.env.MQTT_PASSWORD || undefined,
        clean: true,
        reconnectPeriod: 5000, // 断线5秒后自动重连
      };

      console.log(`[MQTT] Connecting to ${brokerUrl}...`);

      this.client = mqtt.connect(brokerUrl, options);

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log(`[MQTT] ✅ Connected to broker: ${brokerUrl}`);
        console.log(`[MQTT] Hardware simulation: ${this.isSimulateEnabled() ? 'ENABLED' : 'DISABLED'}`);

        // 重新订阅所有之前注册的 topic
        this.subscribedTopics.forEach((topic) => {
          this.doSubscribe(topic);
        });
        console.log(`[MQTT] Resubscribed to ${this.subscribedTopics.size} topic(s)`);

        resolve();
      });

      this.client.on('error', (err) => {
        console.error('[MQTT] Connection error:', err.message);
        if (!this.isConnected) {
          reject(err);
        }
      });

      this.client.on('message', (topic: string, payload: Buffer) => {
        // 只处理本组 lamp_ 设备的消息，忽略其他组
        const deviceId = this.extractDeviceId(topic);
        if (!deviceId.startsWith('lamp_')) return;

        let parsed: any;
        try {
          parsed = JSON.parse(payload.toString());
        } catch {
          parsed = payload.toString();
        }

        console.log(`[MQTT] 📩 Received [${topic}]:`, JSON.stringify(parsed).slice(0, 200));

        this.messageHistory.push({
          topic,
          payload: parsed,
          timestamp: new Date(),
        });
        if (this.messageHistory.length > 1000) this.messageHistory.shift();
        // 分发给匹配的订阅者
        this.triggerSubscribers(topic, parsed);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        console.log('[MQTT] Disconnected from broker');
      });

      this.client.on('reconnect', () => {
        console.log('[MQTT] Reconnecting...');
      });

      this.client.on('offline', () => {
        console.log('[MQTT] Client offline');
      });
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
      console.log('[MQTT] Disconnected from broker');
    }
  }

  /**
   * 订阅Topic
   */
  subscribe(topic: string, handler: MessageHandler): void {
    // 记录topic，连接成功后统一向 Broker 订阅
    this.subscribedTopics.add(topic);

    // 如果已连接，立即向 Broker 订阅
    if (this.client && this.isConnected) {
      this.doSubscribe(topic);
    }

    // 注册本地处理器
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    this.subscribers.get(topic)!.push(handler);
  }

  /**
   * 向真实 Broker 执行订阅
   */
  private doSubscribe(topic: string): void {
    if (!this.client) return;
    this.client.subscribe(topic, (err) => {
      if (err) {
        console.error(`[MQTT] Failed to subscribe to ${topic}:`, err);
      } else {
        console.log(`[MQTT] Subscribed to topic: ${topic}`);
      }
    });
  }

  /**
   * 发布消息
   */
  async publish(topic: string, message: any): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      console.error('[MQTT] Not connected to broker');
      return false;
    }

    const payload = JSON.stringify(message);

    return new Promise((resolve) => {
      this.client!.publish(topic, payload, (err) => {
        if (err) {
          console.error(`[MQTT] Failed to publish to ${topic}:`, err);
          resolve(false);
        } else {
          console.log(`[MQTT] 📤 Published to ${topic}:`, JSON.stringify(message).slice(0, 200));

          this.messageHistory.push({
            topic,
            payload: message,
            timestamp: new Date(),
          });
          if (this.messageHistory.length > 1000) this.messageHistory.shift();
          // 模拟硬件控制反馈（仅在开启模拟模式时）
          if (topic.includes('/control') && this.isSimulateEnabled()) {
            this.simulateHardwareResponse(topic, message);
          }

          resolve(true);
        }
      });
    });
  }

  /**
   * 模拟硬件控制响应
   */
  private simulateHardwareResponse(topic: string, message: any): void {
    const deviceId = this.extractDeviceId(topic);
    const responseTopic = `devices/${deviceId}/control/response`;

    // 90%成功率
    const isSuccess = Math.random() > 0.1;
    const delay = 1000 + Math.random() * 2000;

    const responseMessage = {
      deviceId,
      requestId: message.requestId || 'mock_request_id',
      status: isSuccess ? 'success' : 'failed',
      result: message.value,
      message: isSuccess ? '控制成功' : '控制失败',
      timestamp: Date.now(),
    };

    setTimeout(() => {
      console.log(`[MQTT] Simulating hardware response for ${deviceId}:`, responseMessage);
      this.triggerSubscribers(responseTopic, responseMessage);
    }, delay);
  }

  /**
   * 触发匹配的订阅者回调
   */
  private triggerSubscribers(topic: string, message: any): void {
    this.subscribers.forEach((handlers, pattern) => {
      if (this.topicMatches(pattern, topic)) {
        handlers.forEach((handler) => {
          try {
            handler(topic, message);
          } catch (error) {
            console.error('[MQTT] Error in message handler:', error);
          }
        });
      }
    });
  }

  /**
   * Topic模式匹配（支持 + 和 # 通配符）
   */
  private topicMatches(pattern: string, topic: string): boolean {
    if (pattern === topic) return true;

    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '#') return true; // 匹配剩余所有层级
      if (patternParts[i] === '+') continue;    // 匹配任意单个层级
      if (i >= topicParts.length || patternParts[i] !== topicParts[i]) return false;
    }

    return patternParts.length === topicParts.length;
  }

  /**
   * 从Topic中提取设备ID
   */
  private extractDeviceId(topic: string): string {
    const match = topic.match(/devices\/([^/]+)\//);
    return match ? match[1] : 'unknown';
  }

  /**
   * 是否启用硬件模拟（从环境变量读取）
   */
  private isSimulateEnabled(): boolean {
    const val = process.env.MQTT_SIMULATE_HARDWARE;
    // 默认开启模拟，仅当明确设为 'false' 或 '0' 时关闭
    return val !== 'false' && val !== '0';
  }

  /**
   * 获取连接状态
   */
  isConnectedStatus(): boolean {
    return this.isConnected;
  }

  /**
   * 获取消息历史
   */
  getMessageHistory(): MqttMessage[] {
    return [...this.messageHistory];
  }

  /**
   * 清空消息历史
   */
  clearHistory(): void {
    this.messageHistory = [];
  }

  /**
   * 模拟硬件上传光照数据（用于测试，直接发布到真实Broker）
   */
  simulateDataUpload(deviceId: string, lightIntensity: number): void {
    const topic = `devices/${deviceId}/data`;
    const message = {
      deviceId,
      lightIntensity,
      status: 'on',
      timestamp: Date.now(),
    };

    console.log(`[MQTT] Simulating data upload for ${deviceId}: ${lightIntensity} lux`);

    // 发布到真实 Broker（MQTTX 可见）
    if (this.isConnected && this.client) {
      this.client.publish(topic, JSON.stringify(message));
    }

    // 同时触发本地处理器
    this.triggerSubscribers(topic, message);
  }

  /**
   * 模拟接收硬件心跳（用于测试，直接发布到真实Broker）
   */
  simulateHeartbeat(deviceId: string): void {
    const topic = `devices/${deviceId}/heartbeat`;
    const message = {
      deviceId,
      timestamp: Date.now(),
    };

    console.log(`[MQTT] Simulating heartbeat for ${deviceId}`);

    // 发布到真实 Broker（MQTTX 可见）
    if (this.isConnected && this.client) {
      this.client.publish(topic, JSON.stringify(message));
    }

    // 同时触发本地处理器
    this.triggerSubscribers(topic, message);
  }
}

// 单例模式
export const mockMqttClient = new MockMqttClient();
