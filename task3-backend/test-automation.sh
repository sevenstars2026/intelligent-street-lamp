#!/bin/bash
# 自动化规则引擎测试脚本

echo "=== 测试自动化规则引擎 ==="
echo ""
echo "当前配置："
echo "- 设备: lamp_001"
echo "- 模式: auto"
echo "- 开灯阈值: 200 lux"
echo "- 关灯阈值: 300 lux"
echo "- 规则: 5次采样中4次满足条件才触发"
echo ""

# 使用Node.js脚本模拟MQTT数据上报
node << 'EOF'
const http = require('http');

// 模拟MQTT发布光照数据的函数
function simulateLightData(deviceId, lightIntensity) {
  console.log(`📊 模拟光照数据: ${deviceId} = ${lightIntensity} lux`);

  // 这里实际上应该通过MQTT发布，但为了测试我们需要直接调用Mock MQTT的方法
  // 由于无法直接访问运行中的服务，我们打印日志观察
}

async function runTest() {
  console.log('📝 测试场景1: 光照逐渐变暗，触发开灯');
  console.log('发送5次低于200的光照数据...');

  const darkValues = [180, 190, 185, 175, 170];
  for (let i = 0; i < darkValues.length; i++) {
    console.log(`   采样${i+1}: ${darkValues[i]} lux`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('✅ 预期: 应该触发开灯（4/5次 < 200）');
  console.log('');

  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('📝 测试场景2: 光照逐渐变亮，触发关灯');
  console.log('发送5次高于300的光照数据...');

  const brightValues = [320, 310, 330, 325, 315];
  for (let i = 0; i < brightValues.length; i++) {
    console.log(`   采样${i+1}: ${brightValues[i]} lux`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('✅ 预期: 应该触发关灯（5/5次 > 300）');
  console.log('');

  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('📝 测试场景3: 光照不稳定，不触发');
  console.log('发送5次波动的光照数据...');

  const unstableValues = [180, 250, 190, 280, 170];
  for (let i = 0; i < unstableValues.length; i++) {
    console.log(`   采样${i+1}: ${unstableValues[i]} lux`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('✅ 预期: 不应该触发（只有3/5次 < 200）');
  console.log('');
}

runTest().then(() => {
  console.log('');
  console.log('=== 测试完成 ===');
  console.log('');
  console.log('💡 提示: 由于Mock MQTT的限制，这是一个理论测试');
  console.log('实际测试需要通过MQTT客户端发送消息到 devices/lamp_001/data');
  console.log('');
  console.log('消息格式:');
  console.log(JSON.stringify({
    deviceId: 'lamp_001',
    lightIntensity: 180,
    status: 'on',
    timestamp: Date.now()
  }, null, 2));
});
EOF
