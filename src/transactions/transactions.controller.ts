import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateTransactionDto, CreateTransferDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly svc: TransactionsService) {}

  // Rutas específicas deben ir antes de la ruta genérica @Get()
  @Get('daily-expenses')
  getDailyExpenses(@Req() req: any, @Query('days') days?: string, @Query('groupBy') groupBy?: string) {
    const daysNum = days ? parseInt(days, 10) : 90;
    const groupByType = (groupBy === 'week' || groupBy === 'month') ? groupBy : 'day';
    return this.svc.getDailyExpenses(req.user.id, daysNum, groupByType as 'day' | 'week' | 'month');
  }

  @Get('chart-data')
  getChartData(@Req() req: any, @Query('days') days?: string, @Query('groupBy') groupBy?: string) {
    const daysNum = days ? parseInt(days, 10) : 90;
    const groupByType = (groupBy === 'week' || groupBy === 'month') ? groupBy : 'day';
    return this.svc.getDailyExpensesAndIncome(req.user.id, daysNum, groupByType as 'day' | 'week' | 'month');
  }

  @Get('history')
  getHistory(@Req() req: any, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.svc.getHistory(req.user.id, limitNum);
  }

  @Get()
  list(@Req() req: any, @Query('walletId') walletId: string) {
    if (!walletId) {
      throw new BadRequestException('walletId es requerido');
    }
    return this.svc.listByWallet(req.user.id, walletId);
  }

  @Post()
  create(@Req() req: any, @Body() body: CreateTransactionDto) {
    return this.svc.create(req.user.id, body);
  }

  @Post('cleanup')
  cleanupOldTransactions(@Req() req: any) {
    // Solo permitir limpieza manual por ahora
    // En producción, esto debería ser un cron job
    return this.svc.cleanupOldTransactions();
  }

  @Get('streak')
  getStreak(@Req() req: any) {
    return this.svc.getStreak(req.user.id);
  }

  @Post('transfer')
  transfer(@Req() req: any, @Body() body: CreateTransferDto) {
    return this.svc.transferToUser(req.user.id, body);
  }
}
