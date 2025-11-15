import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateGoalDto } from './dto/create-goal.dto';

@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  create(@Req() req: any, @Body() body: CreateGoalDto) {
    return this.goalsService.create(req.user.id, body);
  }

  // IMPORTANTE: Las rutas específicas (sin parámetros) deben ir ANTES de las rutas con parámetros
  @Get('user')
  findByUser(@Req() req: any) {
    return this.goalsService.findByUser(req.user.id);
  }

  // Rutas con parámetros específicos deben ir antes de rutas genéricas
  @Get('progress/:goalId')
  getProgress(@Req() req: any, @Param('goalId') goalId: string) {
    return this.goalsService.getProgress(goalId, req.user.id);
  }

  @Get('wallet/:walletId')
  findByWallet(@Req() req: any, @Param('walletId') walletId: string) {
    return this.goalsService.findByWallet(walletId, req.user.id);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: { name?: string; targetAmount?: number; deadline?: string; status?: string; description?: string }) {
    return this.goalsService.update(req.user.id, id, body);
  }

  @Patch(':id/achieve')
  markAsAchieved(@Req() req: any, @Param('id') id: string) {
    return this.goalsService.markAsAchieved(req.user.id, id);
  }

  @Get('achieved')
  getAchievedGoals(@Req() req: any, @Query('walletId') walletId?: string) {
    return this.goalsService.getAchievedGoals(req.user.id, walletId);
  }

  @Get('pending')
  getPendingGoals(@Req() req: any, @Query('walletId') walletId?: string) {
    return this.goalsService.getPendingGoals(req.user.id, walletId);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.goalsService.delete(req.user.id, id);
  }
}

