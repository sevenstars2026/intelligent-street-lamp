/**
 * Mock MQTT服务
 * 模拟MQTT通信，方便独立开发和测试
 */

export interface MqttMessage {
  topic: string;
  payload: any;
  timestamp: Date;
}

type MessageHandler = (topic: string, message: any) => void;

export class MockMqttClient {
  private subscribers: Map<string, MessageHandler[]> = new Map();
  private isConnected: boolean = false;
  private messageHistory: MqttMessage[] = [];

  /**
   * 连接到MQTT Broker（模拟）
   */
  async connect(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.isConnected = true;
        console.log('[MockMQTT] Connected to broker');
        resolve();
      }, 100);
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.isConnected = false;
    console.log('[MockMQTT] Disconnected from broker');
  }

  /**
   * 订阅Topic
   */
  subscribe(topic: string, handler: MessageHandler): void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }

    this.subscribers.get(topic)!.push(handler);
    console.log(`[MockMQTT] Subscribed to topic: ${topic}`);
  }

  /**
   * 发布消息
   */
  async publish(topic: string, message: any): Promise<boolean> {
    if (!this.isConnected) {
      console.error('[MockMQTT] Not connected to broker');
      return false;
    }

    const mqttMessage: MqttMessage = {
      topic,
      payload: message,
      timestamp: new Date()
    };

    this.messageHistory.push(mqttMessage);

    console.log(`[MockMQTT] Published to ${topic}:`, message);

    // 模拟硬件响应（延迟1-3秒）
    const delay = 1000 + Math.random() * 2000;
    setTimeout(() => {
      this.simulateHardwareResponse(topic, message);
    }, delay);

    return true;
  }

  /**
   * 模拟硬件响应
   */
  private simulateHardwareResponse(topic: string, message: any): void {
    // 如果是控制指令，模拟硬件反馈
    if (topic.includes('/control')) {
      const deviceId = this.extractDeviceId(topic);
      const responseTopic = `devices/${deviceId}/control/response`;

      // 90%成功率
      const isSuccess = Math.random() > 0.1;

      const responseMessage = {
        deviceId: deviceId,
        requestId: message.requestId || 'mock_request_id',
        status: isSuccess ? 'success' : 'failed',
        result: message.value,
        message: isSuccess ? '控制成功' : '控制失败',
        timestamp: Date.now()
      };

      console.log(`[MockMQTT] Simulating hardware response for ${deviceId}:`, responseMessage);

      // 触发响应回调
      this.triggerSubscribers(responseTopic, responseMessage);
    }
  }

  /**
   * 触发订阅者回调
   */
  private triggerSubscribers(topic: string, message: any): void {
    // 检查精确匹配和通配符匹配
    this.subscribers.forEach((handlers, pattern) => {
      if (this.topicMatches(pattern, topic)) {
        console.log(`[MockMQTT] Received message on ${topic}:`, message);

        handlers.forEach(handler => {
          try {
            handler(topic, message);
          } catch (error) {
            console.error('[MockMQTT] Error in message handler:', error);
          }
        });
      }
    });
  }

  /**
   * 检查topic是否匹配模式
   */
  private topicMatches(pattern: string, topic: string): boolean {
    // 精确匹配
    if (pattern === topic) {
      return true;
    }

    // 通配符匹配
    // + 匹配单个层级
    // # 匹配多个层级
    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    if (patternParts.length !== topicParts.length && !pattern.includes('#')) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '#') {
        return true; // # 匹配剩余所有层级
      }

      if (patternParts[i] === '+') {
        continue; // + 匹配任意单个层级
      }

      if (patternParts[i] !== topicParts[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * 从Topic中提取设备ID
   */
  private extractDeviceId(topic: string): string {
    const match = topic.match(/devices\/([^/]+)\//);
    return match ? match[1] : 'unknown';
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
   * 模拟接收硬件上报的数据（用于测试）
   */
  simulateDataUpload(deviceId: string, lightIntensity: number): void {
    const topic = `devices/${deviceId}/data`;
    const message = {
      deviceId,
      lightIntensity,
      status: 'on',
      timestamp: Date.now()
    };

    this.triggerSubscribers(topic, message);
  }

  /**
   * 模拟接收硬件心跳（用于测试）
   */
  simulateHeartbeat(deviceId: string): void {
    const topic = `devices/${deviceId}/heartbeat`;
    const message = {
      deviceId,
      timestamp: Date.now()
    };

    this.triggerSubscribers(topic, message);
  }
}

// 单例模式
export const mockMqttClient = new MockMqttClient();
