/**
 * 设备控制控制器
 * 处理设备控制相关的API请求
 */

import { Request, Response } from 'express';
import { DeviceControlService } from '../services/device-control.service';
import { MockDatabase } from '../mock/mock-database';

const controlService = new DeviceControlService();

export class DeviceControlController {
  /**
   * 控制单个路灯
   * POST /api/devices/:deviceId/control
   */
  static async controlDevice(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const { command } = req.body;

      // 参数验证
      if (!command || !['on', 'off'].includes(command)) {
        res.status(400).json({
          code: 400,
          message: '无效的控制命令，必须是on或off',
          data: null
        });
        return;
      }

      // 验证设备是否存在
      const device = MockDatabase.getDevice(deviceId);
      if (!device) {
        res.status(404).json({
          code: 404,
          message: '设备不存在',
          data: null
        });
        return;
      }

      // 获取当前用户信息（从JWT中提取，这里先mock）
      const operatorId = (req as any).user?.id || 1;
      const operatorName = (req as any).user?.name || '测试用户';

      // 执行控制
      const result = await controlService.controlDevice({
        deviceId,
        command,
        operatorId,
        operatorName
      });

      // 根据结果返回不同的状态码
      if (result.status === 'failed') {
        const statusCode = result.message.includes('不可用') ? 503 : 500;
        res.status(statusCode).json({
          code: statusCode,
          message: result.message,
          data: null
        });
        return;
      }

      if (result.status === 'timeout') {
        res.status(408).json({
          code: 408,
          message: result.message,
          data: null
        });
        return;
      }

      // 成功
      res.status(200).json({
        code: 200,
        message: '控制成功',
        data: {
          deviceId: result.deviceId,
          command: result.command,
          status: result.status,
          executedAt: result.executedAt
        }
      });
    } catch (error) {
      console.error('Control device error:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 批量控制路灯
   * POST /api/devices/batch-control
   */
  static async batchControl(req: Request, res: Response): Promise<void> {
    try {
      const { deviceIds, command } = req.body;

      // 参数验证
      if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
        res.status(400).json({
          code: 400,
          message: 'deviceIds必须是非空数组',
          data: null
        });
        return;
      }

      if (!command || !['on', 'off'].includes(command)) {
        res.status(400).json({
          code: 400,
          message: '无效的控制命令，必须是on或off',
          data: null
        });
        return;
      }

      // 获取当前用户信息
      const operatorId = (req as any).user?.id || 1;
      const operatorName = (req as any).user?.name || '测试用户';

      // 执行批量控制
      const result = await controlService.batchControl(
        deviceIds,
        command,
        operatorId,
        operatorName
      );

      res.status(200).json({
        code: 200,
        message: '批量控制完成',
        data: result
      });
    } catch (error) {
      console.error('Batch control error:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取设备控制历史
   * GET /api/devices/:deviceId/control-logs
   */
  static async getControlLogs(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const { page = 1, pageSize = 20 } = req.query;

      const limit = Math.min(parseInt(pageSize as string, 10) || 20, 100);
      const logs = controlService.getControlHistory(deviceId, limit);

      res.status(200).json({
        code: 200,
        message: 'success',
        data: {
          logs,
          pagination: {
            page: parseInt(page as string, 10),
            pageSize: limit,
            total: logs.length,
            totalPages: Math.ceil(logs.length / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get control logs error:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取设备阈值配置
   * GET /api/devices/:deviceId/threshold
   */
  static async getThreshold(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;

      const threshold = MockDatabase.getThreshold(deviceId);

      if (!threshold) {
        res.status(404).json({
          code: 404,
          message: '设备阈值配置不存在',
          data: null
        });
        return;
      }

      res.status(200).json({
        code: 200,
        message: 'success',
        data: threshold
      });
    } catch (error) {
      console.error('Get threshold error:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 设置设备阈值配置
   * POST /api/devices/:deviceId/threshold
   */
  static async setThreshold(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const { lightThresholdOn, lightThresholdOff } = req.body;

      // 参数验证
      if (typeof lightThresholdOn !== 'number' || typeof lightThresholdOff !== 'number') {
        res.status(400).json({
          code: 400,
          message: '阈值必须是数字',
          data: null
        });
        return;
      }

      if (lightThresholdOn >= lightThresholdOff) {
        res.status(400).json({
          code: 400,
          message: '开灯阈值必须小于关灯阈值',
          data: null
        });
        return;
      }

      // 保存配置
      const threshold = MockDatabase.setThreshold({
        deviceId,
        lightThresholdOn,
        lightThresholdOff
      });

      res.status(200).json({
        code: 200,
        message: '阈值设置成功',
        data: threshold
      });
    } catch (error) {
      console.error('Set threshold error:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 获取设备控制模式
   * GET /api/devices/:deviceId/mode
   */
  static async getMode(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;

      const device = MockDatabase.getDevice(deviceId);

      if (!device) {
        res.status(404).json({
          code: 404,
          message: '设备不存在',
          data: null
        });
        return;
      }

      res.status(200).json({
        code: 200,
        message: 'success',
        data: {
          deviceId: device.id,
          mode: device.mode,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Get mode error:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }

  /**
   * 切换设备控制模式
   * PUT /api/devices/:deviceId/mode
   */
  static async setMode(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const { mode } = req.body;

      // 参数验证
      if (!mode || !['auto', 'manual'].includes(mode)) {
        res.status(400).json({
          code: 400,
          message: '无效的模式，必须是auto或manual',
          data: null
        });
        return;
      }

      const success = MockDatabase.updateDeviceMode(deviceId, mode);

      if (!success) {
        res.status(404).json({
          code: 404,
          message: '设备不存在',
          data: null
        });
        return;
      }

      res.status(200).json({
        code: 200,
        message: '模式切换成功',
        data: {
          deviceId,
          mode,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Set mode error:', error);
      res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        data: null
      });
    }
  }
}
