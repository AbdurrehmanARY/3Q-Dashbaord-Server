import { analyticsRepository } from "../repositories/analytics.repository";

export class AnalyticsService {
  async getKpis() {
    const totalWorkOrders = await analyticsRepository.countWorkOrders();
    const submittedWorkOrders = await analyticsRepository.countSubmittedWorkOrders();
    const totalProductionProgress = await analyticsRepository.countProductionProgress();
    const activeProductionProgress = await analyticsRepository.countActiveProductionProgress();
    const completedProductionProgress = await analyticsRepository.countCompletedProductionProgress();
    const totalMaterials = await analyticsRepository.countMaterials();
    const lowStockCount = await analyticsRepository.countLowStock();
    const totalBalanceRolls = await analyticsRepository.sumBalanceRolls();
    const totalIssuedRolls = await analyticsRepository.sumIssuedRolls();

    return {
      totalWorkOrders,
      submittedWorkOrders,
      totalProductionProgress,
      activeProductionProgress,
      completedProductionProgress,
      totalMaterials,
      lowStockCount,
      totalBalanceRolls,
      totalIssuedRolls,
    };
  }

}

export const analyticsService = new AnalyticsService();
